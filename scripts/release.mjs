// Release: run checks, bump the version in every manifest, commit, tag, push,
// and pin the agent-skills marketplace to the new tag.
// Usage: node scripts/release.mjs <patch|minor|major>

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFESTS } from "./manifests.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MARKETPLACE_REPO = path.join(ROOT, "..", "agent-skills");
const MARKETPLACE_FILE = path.join(MARKETPLACE_REPO, ".claude-plugin", "marketplace.json");

const bump = process.argv[2];
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: node scripts/release.mjs <patch|minor|major>");
  process.exit(1);
}

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

if (git(ROOT, "rev-parse", "--abbrev-ref", "HEAD").trim() !== "main") {
  console.error("Releases run from main only. Switch branches first.");
  process.exit(1);
}
if (git(ROOT, "status", "--porcelain").trim() !== "") {
  console.error("Working tree is not clean. Commit or stash first.");
  process.exit(1);
}
if (!fs.existsSync(MARKETPLACE_FILE)) {
  console.error(`Marketplace repo not found at ${MARKETPLACE_FILE}. Clone agent-skills next to this repo.`);
  process.exit(1);
}
if (git(MARKETPLACE_REPO, "status", "--porcelain").trim() !== "") {
  console.error("agent-skills working tree is not clean. Commit or stash there first.");
  process.exit(1);
}

execFileSync("node", ["scripts/check.mjs"], { cwd: ROOT, stdio: "inherit" });

const current = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8")).version;
if (!/^\d+\.\d+\.\d+$/.test(current)) {
  console.error(`Version "${current}" is not plain x.y.z; refusing to bump.`);
  process.exit(1);
}
const [major, minor, patch] = current.split(".").map(Number);
const next =
  bump === "major" ? `${major + 1}.0.0` : bump === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

for (const relPath of MANIFESTS) {
  const filePath = path.join(ROOT, relPath);
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  manifest.version = next;
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
}

git(ROOT, "add", ...MANIFESTS);
git(ROOT, "commit", "-m", `Release v${next}`);
git(ROOT, "tag", "-a", `v${next}`, "-m", `Release v${next}`);
git(ROOT, "push", "--follow-tags");
console.log(`Released v${next}`);

const marketplace = JSON.parse(fs.readFileSync(MARKETPLACE_FILE, "utf8"));
const entry = marketplace.plugins.find((p) => p.name === "talk-normal");
if (!entry) {
  console.error("talk-normal entry missing in agent-skills marketplace.json; pin it by hand.");
  process.exit(1);
}
entry.source.ref = `v${next}`;
fs.writeFileSync(MARKETPLACE_FILE, `${JSON.stringify(marketplace, null, 2)}\n`);
git(MARKETPLACE_REPO, "add", ".claude-plugin/marketplace.json");
git(MARKETPLACE_REPO, "commit", "-m", `Pin talk-normal to v${next}`);
git(MARKETPLACE_REPO, "push");
console.log(`Marketplace pinned to v${next}`);
