import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const output = path.join(root, "public");
const configPath = path.join(root, "data", "portfolio.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const sites = Array.isArray(config.sites) ? config.sites : [];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, ...options });
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`);
  return result;
}
function validSlug(value) {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && !["media", "studio", "blog", "assets", "data"].includes(value);
}
function validBranch(value) {
  return typeof value === "string" && /^[A-Za-z0-9._/-]{1,180}$/.test(value) && !value.startsWith("/") && !value.endsWith("/") && !value.includes("..") && !value.includes("@{");
}
function extractBranch(branch, destination, subpath = "") {
  if (!validBranch(branch)) throw new Error(`Unsafe branch name: ${branch}`);
  run("git", ["fetch", "--no-tags", "origin", branch]);
  const ref = `FETCH_HEAD`;
  const args = ["archive", "--format=tar", ref];
  if (subpath) args.push(subpath);
  const archive = run("git", args, { encoding: null }).stdout;
  fs.mkdirSync(destination, { recursive: true });
  const unpack = spawnSync("tar", ["-xf", "-", "-C", destination], { input: archive, cwd: root, maxBuffer: 256 * 1024 * 1024 });
  if (unpack.status !== 0) throw new Error(unpack.stderr?.toString() || `Could not extract ${branch}`);
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if ([".git", ".github", "node_modules", "public", "scripts"].includes(entry.name)) continue;
  fs.cpSync(path.join(root, entry.name), path.join(output, entry.name), { recursive: true, dereference: true });
}
if (sites.length) {
  const used = new Set();
  for (const site of sites) {
    const slug = site?.slug;
    const branch = site?.branch;
    const targetPath = site?.path || `/${slug}/`;
    if (!validSlug(slug) || !validBranch(branch) || branch === "main" || branch === "media") throw new Error(`Invalid or reserved site registration: ${JSON.stringify(site)}`);
    if (used.has(slug)) throw new Error(`Duplicate site slug: ${slug}`);
    if (targetPath !== `/${slug}/`) throw new Error(`Site ${slug} must deploy to /${slug}/`);
    used.add(slug);
    extractBranch(branch, path.join(output, slug));
    console.log(`Assembled ${branch} -> /${slug}/`);
  }
}
const mediaTarget = path.join(output, "media");
extractBranch("media", mediaTarget, "assets/media");
console.log(`Assembled media branch -> /media/ (${sites.length} additional sites)`);
