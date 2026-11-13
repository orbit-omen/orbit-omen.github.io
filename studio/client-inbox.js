(() => {
  const $ = id => document.getElementById(id);
  let token = "";
  let endpoint = "";
  let requests = [];
  let expiresAt = "";

  function setStatus(message, error = false) {
    const node = $("orbit-inbox-auth-status");
    if (!node) return;
    node.textContent = message;
    node.style.color = error ? "#ff9fbd" : "";
  }
  function apiBase() {
    const value = endpoint.trim().replace(/\/+$/, "");
    if (!/^https:\/\/[^/]+(?:\/.*)?$/i.test(value)) throw new Error("Set a valid HTTPS Worker endpoint in Client Desk settings first.");
    if (/\/api\/requests$/i.test(value)) return value.replace(/\/api\/requests$/i, "");
    return value;
  }
  function requestsUrl() {
    const value = endpoint.trim().replace(/\/+$/, "");
    return /\/api\/requests$/i.test(value) ? value : apiBase() + "/api/requests";
  }
  async function api(path, options = {}) {
    const response = await fetch(apiBase() + path, {
      ...options,
      headers: { ...(options.headers || {}), ...(token ? { Authorization: "Bearer " + token } : {}) }
    });
    const data = await response.json().catch(() => ({}));
    if (response.status === 401) {
      token = "";
      $("orbit-inbox-tools").hidden = true;
      $("orbit-inbox-login").hidden = false;
      throw new Error("Session expired or unauthorized. Sign in again.");
    }
    if (!response.ok) throw new Error(data.error || "Worker request failed (" + response.status + ").");
    return data;
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function detail(label, value) {
    const box = element("div", "inbox-detail");
    box.append(element("b", "", label), element("span", "", value || "Not provided"));
    return box;
  }
  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
  }
  function render() {
    const host = $("orbit-inbox-list");
    if (!host) return;
    host.replaceChildren();
    const filter = $("orbit-inbox-filter").value;
    const visible = requests.filter(item => !filter || item.status === filter);
    if (!visible.length) {
      host.append(element("div", "activity", filter ? "No requests match this status." : "No client requests yet."));
      return;
    }
    for (const item of visible) {
      const card = element("article", "inbox-card");
      const head = element("div", "inbox-card-head");
      const title = element("div");
      title.append(element("h3", "", item.project || item.name || "Project inquiry"));
      title.append(element("small", "", item.name + " · " + formatDate(item.createdAt)));
      const status = document.createElement("select");
      status.className = "inbox-status";
      status.setAttribute("aria-label", "Request status");
      ["new", "reviewing", "waiting", "accepted", "completed", "archived"].forEach(value => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value.charAt(0).toUpperCase() + value.slice(1);
        status.append(option);
      });
      status.value = item.status || "new";
      head.append(title, status);
      card.append(head);
      const meta = element("div", "inbox-meta", [item.category, item.contactMethod ? "Preferred contact: " + item.contactMethod : "", item.page].filter(Boolean).join(" · "));
      card.append(meta);
      card.append(element("div", "inbox-body", item.description || ""));
      const details = element("div", "inbox-details");
      const fields = item.fields || {};
      for (const [key, value] of Object.entries(fields)) {
        if (["name", "description"].includes(key) || !String(value || "").trim()) continue;
        details.append(detail(key.replace(/[-_]/g, " "), String(value)));
      }
      for (const [key, value] of Object.entries(item.contactValues || {})) {
        if (value) details.append(detail("Contact · " + key, String(value)));
      }
      if (details.childElementCount) card.append(details);
      const notes = document.createElement("textarea");
      notes.className = "inbox-notes";
      notes.maxLength = 3000;
      notes.placeholder = "Private admin notes…";
      notes.value = item.adminNotes || "";
      notes.setAttribute("aria-label", "Private admin notes");
      card.append(notes);
      const actions = element("div", "inbox-actions");
      const save = element("button", "", "Save changes");
      const feedback = element("small", "");
      save.addEventListener("click", async () => {
        save.disabled = true;
        feedback.textContent = "Saving…";
        try {
          const data = await api("/api/requests/" + encodeURIComponent(item.id), {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: status.value, adminNotes: notes.value })
          });
          const index = requests.findIndex(x => x.id === item.id);
          if (index >= 0) requests[index] = data.request;
          feedback.textContent = "Saved.";
          render();
        } catch (error) {
          feedback.textContent = error.message;
        } finally {
          save.disabled = false;
        }
      });
      actions.append(save, feedback);
      card.append(actions);
      host.append(card);
    }
  }
  async function refresh() {
    const host = $("orbit-inbox-list");
    host.replaceChildren(element("div", "activity", "Loading private requests…"));
    try {
      const data = await api("/api/requests?limit=50");
      requests = Array.isArray(data.requests) ? data.requests : [];
      render();
      setStatus(requests.length + " request(s) loaded.");
    } catch (error) {
      host.replaceChildren(element("div", "activity", error.message));
      setStatus(error.message, true);
    }
  }
  async function login() {
    const button = $("orbit-inbox-login-button");
    const password = $("orbit-inbox-password").value;
    if (!password) return setStatus("Enter the admin password.", true);
    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      const response = await fetch(apiBase() + "/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Sign-in failed.");
      token = data.token;
      expiresAt = data.expiresAt || "";
      $("orbit-inbox-password").value = "";
      $("orbit-inbox-login").hidden = true;
      $("orbit-inbox-tools").hidden = false;
      $("orbit-inbox-session").textContent = "Signed in · expires " + formatDate(expiresAt) + " · session kept in memory";
      setStatus("Signed in securely.");
      await refresh();
    } catch (error) {
      token = "";
      setStatus(error.message, true);
    } finally {
      button.disabled = false;
      button.textContent = "Sign in securely";
    }
  }
  function logout() {
    token = "";
    requests = [];
    $("orbit-inbox-tools").hidden = true;
    $("orbit-inbox-login").hidden = false;
    $("orbit-inbox-list").replaceChildren(element("div", "activity", "Sign in and refresh to load requests."));
    setStatus("Signed out.");
  }
  function loadConfig(config) {
    endpoint = config?.clientDesk?.endpoint || "";
    const note = $("orbit-inbox-auth-status");
    if (note && !endpoint) setStatus("Add the Worker API endpoint in Client Desk settings, then save the configuration.", true);
  }
  $("orbit-inbox-login-button").addEventListener("click", login);
  $("orbit-inbox-password").addEventListener("keydown", event => { if (event.key === "Enter") login(); });
  $("orbit-inbox-refresh").addEventListener("click", refresh);
  $("orbit-inbox-logout").addEventListener("click", logout);
  $("orbit-inbox-filter").addEventListener("change", render);
  document.addEventListener("orbit:config-imported", () => loadConfig(window.OrbitGitHub?.getConfig()));
  if (window.OrbitGitHub?.getConfig()) loadConfig(window.OrbitGitHub.getConfig());
  else setStatus("Connect GitHub and import the portfolio configuration first.");
  window.OrbitClientInbox = { refresh, logout };
})();