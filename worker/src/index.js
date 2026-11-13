const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };
const MAX_BODY = 24 * 1024;
const MAX_TEXT = 5000;
const memoryRate = new Map();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowed = env.ALLOWED_ORIGIN || "";
    const cors = {
      "access-control-allow-origin": allowed && origin === allowed ? origin : allowed,
      "access-control-allow-methods": "GET, POST, PATCH, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
      "access-control-max-age": "86400",
      "vary": "Origin"
    };
    if (request.method === "OPTIONS") {
      if (allowed && origin && origin !== allowed) return json({ error: "Origin not allowed." }, 403);
      return new Response(null, { status: 204, headers: cors });
    }
    if (allowed && origin && origin !== allowed) return json({ error: "Origin not allowed." }, 403, cors);
    try {
      if (url.pathname === "/api/health" && request.method === "GET") return json({ ok: true, service: "Orbit Client Desk" }, 200, cors);
      if (url.pathname === "/api/requests" && request.method === "POST") return await createRequest(request, env, cors);
      if (url.pathname === "/api/requests" && request.method === "GET") {
        requireAdmin(request, env);
        return await listRequests(url, env, cors);
      }
      const match = url.pathname.match(/^\/api\/requests\/([a-f0-9-]{36})$/i);
      if (match && request.method === "PATCH") {
        requireAdmin(request, env);
        return await updateRequest(request, match[1], env, cors);
      }
      return json({ error: "Not found." }, 404, cors);
    } catch (error) {
      const status = error.status || 500;
      return json({ error: status >= 500 ? "The request could not be processed." : error.message }, status, cors);
    }
  }
};
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, ...headers } });
}
function fail(message, status = 400) { const e = new Error(message); e.status = status; throw e; }
function requireEnv(env, keys) {
  const missing = keys.filter(key => !env[key]);
  if (missing.length) fail("Worker setup is incomplete: " + missing.join(", "), 503);
}
function requireAdmin(request, env) {
  requireEnv(env, ["ADMIN_TOKEN"]);
  const auth = request.headers.get("Authorization") || "";
  const supplied = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeEqual(supplied, env.ADMIN_TOKEN)) fail("Unauthorized.", 401);
}
function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function clean(value, max = MAX_TEXT) {
  if (value == null) return "";
  if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") return "";
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
}
function rateCheck(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  const recent = (memoryRate.get(ip) || []).filter(t => now - t < 600000);
  if (recent.length >= 5) fail("Too many requests. Please try again later.", 429);
  recent.push(now);
  memoryRate.set(ip, recent);
  if (memoryRate.size > 2000) for (const [key, values] of memoryRate) if (!values.length || now - values[values.length - 1] > 600000) memoryRate.delete(key);
}
async function createRequest(request, env, cors) {
  requireEnv(env, ["GITHUB_TOKEN", "REQUESTS_REPO", "DISCORD_BOT_TOKEN", "DISCORD_CHANNEL_ID"]);
  rateCheck(request);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY) fail("Request is too large.", 413);
  const raw = await request.text();
  if (raw.length > MAX_BODY) fail("Request is too large.", 413);
  let input;
  try { input = JSON.parse(raw); } catch { fail("Invalid JSON body."); }
  if (clean(input.website, 200)) return json({ ok: true, message: "Request received." }, 200, cors);
  const fields = input.fields && typeof input.fields === "object" && !Array.isArray(input.fields) ? input.fields : {};
  const safeFields = {};
  for (const [key, value] of Object.entries(fields).slice(0, 40)) {
    const safeKey = clean(key, 80).replace(/[^a-zA-Z0-9_-]/g, "");
    if (safeKey) safeFields[safeKey] = clean(value);
  }
  const name = clean(safeFields.name || input.name, 120);
  const description = clean(safeFields.description || input.description, 4000);
  if (!name || !description) fail("Please provide your name and project description.");
  const contactValues = {};
  const submittedContacts = input.contactValues || input.contactMethods;
  if (submittedContacts && typeof submittedContacts === "object" && !Array.isArray(submittedContacts)) {
    for (const [key, value] of Object.entries(submittedContacts).slice(0, 20)) {
      const safeKey = clean(key, 50).replace(/[^a-zA-Z0-9_-]/g, "");
      if (safeKey) contactValues[safeKey] = clean(value, 300);
    }
  }
  const record = {
    id: crypto.randomUUID(), status: "new", createdAt: new Date().toISOString(),
    page: clean(input.page || input.site, 500), formId: clean(input.formId, 80),
    name, project: clean(safeFields.project, 200), category: clean(safeFields.category, 100),
    description, budget: clean(safeFields.budget, 100), deadline: clean(safeFields.deadline, 100),
    references: clean(safeFields.references, 1000), fields: safeFields,
    contactMethod: clean(input.contactMethod || input.preferredContact, 40),
    contactValues, preferredContact: clean(input.preferredContact, 40), adminNotes: ""
  };
  await githubPut(env, requestPath(record), record, "New Client Desk request " + record.id);
  let discordNotified = false;
  try { await notifyDiscord(env, record); discordNotified = true; }
  catch (error) { console.error("Discord notification failed:", error.message); }
  return json({ ok: true, id: record.id, discordNotified, message: "Request received." }, 201, cors);
}
function requestPath(record) {
  const d = new Date(record.createdAt);
  return "requests/" + d.getUTCFullYear() + "/" + String(d.getUTCMonth() + 1).padStart(2, "0") + "/" + record.id + ".json";
}
function githubHeaders(env) {
  return { authorization: "Bearer " + env.GITHUB_TOKEN, accept: "application/vnd.github+json", "content-type": "application/json", "x-github-api-version": "2022-11-28" };
}
function githubBase(env) { return "https://api.github.com/repos/" + env.REQUESTS_REPO; }
async function githubPut(env, path, record, message, sha) {
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(record, null, 2) + "\n")));
  const body = { message, content: encoded, branch: env.REQUESTS_BRANCH || "main" };
  if (sha) body.sha = sha;
  const response = await fetch(githubBase(env) + "/contents/" + path.split("/").map(encodeURIComponent).join("/"), { method: "PUT", headers: githubHeaders(env), body: JSON.stringify(body) });
  if (!response.ok) {
    console.error("GitHub write failed:", response.status, (await response.text()).slice(0, 500));
    fail("Private request storage is unavailable.", 502);
  }
  return response.json();
}
async function notifyDiscord(env, record) {
  const mention = env.DISCORD_MENTION_USER_ID ? "<@" + env.DISCORD_MENTION_USER_ID + ">" : "";
  const lines = [
    "**New OrbitOmen project request**", "**Name:** " + record.name,
    "**Project:** " + (record.project || "Not provided"), "**Category:** " + (record.category || "Not provided"),
    "**Contact:** " + (record.contactMethod || "Not specified"), "**Contact detail:** " + (record.contactValues[record.contactMethod] || "Not provided"), "**Description:** " + record.description.slice(0, 900),
    "**Request ID:** \`" + record.id + "\`"
  ];
  const response = await fetch("https://discord.com/api/v10/channels/" + env.DISCORD_CHANNEL_ID + "/messages", {
    method: "POST",
    headers: { authorization: "Bot " + env.DISCORD_BOT_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ content: mention, embeds: [{ title: "New project inquiry", description: lines.join("\n"), color: 11940082, timestamp: record.createdAt }], allowed_mentions: { users: env.DISCORD_MENTION_USER_ID ? [env.DISCORD_MENTION_USER_ID] : [] } })
  });
  if (!response.ok) throw new Error("Discord API returned " + response.status + ": " + (await response.text()).slice(0, 300));
}
async function githubGet(env, path) {
  const response = await fetch(githubBase(env) + "/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(env.REQUESTS_BRANCH || "main"), { headers: githubHeaders(env) });
  if (!response.ok) fail("Request record was not found.", response.status === 404 ? 404 : 502);
  const item = await response.json();
  const decoded = atob(item.content.replace(/\n/g, ""));
  return { record: JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, c => c.charCodeAt(0)))), sha: item.sha };
}
async function listRequests(url, env, cors) {
  requireEnv(env, ["GITHUB_TOKEN", "REQUESTS_REPO"]);
  const limit = Math.max(1, Math.min(50, Number(url.searchParams.get("limit") || 30)));
  const response = await fetch(githubBase(env) + "/git/trees/" + encodeURIComponent(env.REQUESTS_BRANCH || "main") + "?recursive=1", { headers: githubHeaders(env) });
  if (!response.ok) fail("Could not read private request records.", 502);
  const tree = await response.json();
  if (tree.truncated) fail("The request archive is too large for one listing.", 503);
  const paths = (tree.tree || []).filter(x => x.type === "blob" && /^requests\/\d{4}\/\d{2}\/[a-f0-9-]{36}\.json$/i.test(x.path)).map(x => x.path).sort().reverse().slice(0, limit);
  const records = await Promise.all(paths.map(async path => {
    const response = await fetch(githubBase(env) + "/contents/" + path.split("/").map(encodeURIComponent).join("/") + "?ref=" + encodeURIComponent(env.REQUESTS_BRANCH || "main"), { headers: githubHeaders(env) });
    if (!response.ok) return null;
    const item = await response.json(), decoded = atob(item.content.replace(/\n/g, ""));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(decoded, c => c.charCodeAt(0))));
  }));
  return json({ requests: records.filter(Boolean) }, 200, cors);
}
async function updateRequest(request, id, env, cors) {
  requireEnv(env, ["GITHUB_TOKEN", "REQUESTS_REPO"]);
  const input = await request.json(), status = clean(input.status, 30);
  if (status && !["new", "reviewing", "waiting", "accepted", "completed", "archived"].includes(status)) fail("Invalid request status.");
  const treeResponse = await fetch(githubBase(env) + "/git/trees/" + encodeURIComponent(env.REQUESTS_BRANCH || "main") + "?recursive=1", { headers: githubHeaders(env) });
  if (!treeResponse.ok) fail("Could not locate request record.", 502);
  const tree = await treeResponse.json(), item = (tree.tree || []).find(x => x.type === "blob" && x.path.endsWith("/" + id + ".json"));
  if (!item) fail("Request record was not found.", 404);
  const current = await githubGet(env, item.path);
  if (status) current.record.status = status;
  if (Object.prototype.hasOwnProperty.call(input, "adminNotes")) current.record.adminNotes = clean(input.adminNotes, 3000);
  current.record.updatedAt = new Date().toISOString();
  await githubPut(env, item.path, current.record, "Update Client Desk request " + id, current.sha);
  return json({ ok: true, request: current.record }, 200, cors);
}
