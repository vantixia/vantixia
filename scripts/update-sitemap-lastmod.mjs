#!/usr/bin/env node
/*
  Sets every <lastmod> in sitemap.xml to the date that page's content last
  changed, and checks the sitemap against the pages on disk.

    node scripts/update-sitemap-lastmod.mjs            update sitemap.xml
    node scripts/update-sitemap-lastmod.mjs --dry-run  print, write nothing

  "Content" means the <title>, the meta description and the <main> element,
  whitespace-normalised and with the ?v=rNN cache tokens stripped. A commit
  that only touched the shared header, footer, <head> assets or whitespace
  does not move a page's date. Uncommitted content changes and untracked
  pages get today's date. No dependencies beyond Node and git.

  Git is called a fixed handful of times (one log, one status, one batched
  cat-file) rather than once per page per commit, which took minutes.
*/
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITEMAP = join(ROOT, "sitemap.xml");
const ORIGIN = "https://vantixia.in";
const DRY_RUN = process.argv.includes("--dry-run");
const TODAY = new Date().toLocaleDateString("en-CA"); // local YYYY-MM-DD

// Folders that hold no public pages (tooling, sources, assets).
const SKIP_DIRS = new Set([".git", ".claude", ".well-known", "node_modules", "nextjs", "internal",
  "scripts", "content", "docs", "css", "js", "img", "data", "assets"]);
// Root-level HTML that is not a public page.
const SKIP_FILES = new Set(["402.html", "404.html", "vantixia-content-audit.html"]);

// Returns a string, or a Buffer when stdin input is given (cat-file sizes are in bytes).
function git(args, input) {
  const opts = { cwd: ROOT, input, maxBuffer: 1 << 30, stdio: ["pipe", "pipe", "ignore"] };
  if (input === undefined) opts.encoding = "utf8";
  return execFileSync("git", args, opts);
}

function fingerprint(html) {
  if (html == null) return null;
  const pick = (re) => (html.match(re) || ["", ""])[1];
  const title = pick(/<title>([\s\S]*?)<\/title>/i);
  const desc = pick(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const main = pick(/(<main\b[\s\S]*?<\/main>)/i) || html;
  return [title, desc, main].join("\n").replace(/\?v=r\d+/g, "").replace(/\s+/g, " ").trim();
}

// file -> [{ hash, date }], newest first
function commitsByFile() {
  const map = new Map();
  let current = null;
  for (const line of git(["log", "--format=@@%H %cs", "--name-only"]).split("\n")) {
    if (line.startsWith("@@")) {
      const [hash, date] = line.slice(2).split(" ");
      current = { hash, date };
    } else if (line.trim() && current) {
      if (!map.has(line)) map.set(line, []);
      map.get(line).push(current);
    }
  }
  return map;
}

// file -> porcelain status code ("??" untracked, " M" modified, ...)
function workingTreeStatus() {
  const map = new Map();
  const entries = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"]).split("\0");
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (!e) continue;
    map.set(e.slice(3), e.slice(0, 2));
    if (e[0] === "R" || e[0] === "C") i++; // renames carry the old path as an extra entry
  }
  return map;
}

// "rev:path" specs -> file contents (null when missing), in one git process
function readBlobs(specs) {
  const out = git(["cat-file", "--batch"], specs.join("\n") + "\n");
  const result = new Map();
  let pos = 0;
  for (const spec of specs) {
    const nl = out.indexOf(10, pos);
    const header = out.toString("utf8", pos, nl);
    pos = nl + 1;
    if (header.endsWith(" missing") || header.endsWith(" ambiguous")) {
      result.set(spec, null);
      continue;
    }
    const size = Number(header.split(" ")[2]);
    result.set(spec, out.toString("utf8", pos, pos + size));
    pos += size + 1; // contents are followed by a newline
  }
  return result;
}

function fileForUrl(loc) {
  const path = decodeURI(loc.replace(ORIGIN, ""));
  const rel = path.endsWith("/") ? `${path}index.html` : path;
  return rel.replace(/^\//, "");
}

function publicPages(dir = ROOT, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) publicPages(full, out);
    } else if (entry.name.endsWith(".html")) {
      const rel = relative(ROOT, full).split(sep).join("/");
      if (SKIP_FILES.has(rel)) continue;
      if (/<meta\s+name="robots"\s+content="[^"]*noindex/i.test(readFileSync(full, "utf8"))) continue;
      out.push(rel);
    }
  }
  return out;
}

const xml = readFileSync(SITEMAP, "utf8");
const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
const files = locs.map(fileForUrl).filter((rel) => existsSync(join(ROOT, rel)));

const history = commitsByFile();
const status = workingTreeStatus();
const specs = [];
for (const rel of files) {
  specs.push(`HEAD:${rel}`);
  for (const { hash } of history.get(rel) || []) specs.push(`${hash}:${rel}`, `${hash}^:${rel}`);
}
const blobs = readBlobs(specs);

function lastContentChange(rel) {
  const code = status.get(rel);
  if (code === "??") return { date: TODAY, why: "untracked" };
  if (code && fingerprint(readFileSync(join(ROOT, rel), "utf8")) !== fingerprint(blobs.get(`HEAD:${rel}`))) {
    return { date: TODAY, why: "uncommitted content change" };
  }
  const commits = history.get(rel) || [];
  for (const { hash, date } of commits) {
    if (fingerprint(blobs.get(`${hash}:${rel}`)) !== fingerprint(blobs.get(`${hash}^:${rel}`))) {
      return { date, why: `commit ${hash.slice(0, 7)}` };
    }
  }
  // Only ever touched by layout-wide commits: fall back to the plain last commit.
  if (commits.length) return { date: commits[0].date, why: "last commit (no content change found)" };
  return { date: TODAY, why: "no history" };
}

const missingFiles = [];
const listed = new Set();
const updated = xml.replace(/<url>([\s\S]*?)<\/url>/g, (block, inner) => {
  const loc = (inner.match(/<loc>([^<]+)<\/loc>/) || [])[1];
  if (!loc) return block;
  const rel = fileForUrl(loc.trim());
  listed.add(rel);
  if (!existsSync(join(ROOT, rel))) {
    missingFiles.push(`${loc} -> ${rel}`);
    return block;
  }
  const { date, why } = lastContentChange(rel);
  console.log(`${date}  ${rel}  (${why})`);
  if (/<lastmod>[^<]*<\/lastmod>/.test(inner)) {
    return block.replace(/<lastmod>[^<]*<\/lastmod>/, `<lastmod>${date}</lastmod>`);
  }
  return block.replace(/(<loc>[^<]+<\/loc>)(\s*)/, `$1$2<lastmod>${date}</lastmod>$2`);
});

const unlisted = publicPages().filter((rel) => !listed.has(rel));

console.log(`\n${listed.size} URLs in sitemap.xml`);
if (missingFiles.length) console.log(`URLs with no file on disk:\n  ${missingFiles.join("\n  ")}`);
if (unlisted.length) console.log(`Public pages missing from the sitemap:\n  ${unlisted.join("\n  ")}`);
if (!missingFiles.length && !unlisted.length) console.log("Every URL maps to a file and every public page is listed.");

if (!DRY_RUN && updated !== xml) {
  writeFileSync(SITEMAP, updated);
  console.log("sitemap.xml updated.");
} else if (!DRY_RUN) {
  console.log("sitemap.xml already up to date.");
}
process.exitCode = missingFiles.length ? 1 : 0;
