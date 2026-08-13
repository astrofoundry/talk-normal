// Release: run checks, bump the version in every manifest, commit, tag, push.
// Usage: node scripts/release.mjs <patch|minor|major>

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFESTS = [
  "package.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "gemini-extension.json",
  "qwen-extension.json",
  "kimi.plugin.json",
];

const bump = process.argv[2];
if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Usage: node scripts/release.mjs <patch|minor|major>");
  process.exit(1);
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });
}

if (git("status", "--porcelain").trim() !== "") {
  console.error("Working tree is not clean. Commit or stash first.");
  process.exit(1);
}

execFileSync("node", ["scripts/check.mjs"], { cwd: ROOT, stdio: "inherit" });

const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
const [major, minor, patch] = packageJson.version.split(".").map(Number);
const next =
  bump === "major" ? `${major + 1}.0.0` : bump === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;

for (const relPath of MANIFESTS) {
  const filePath = path.join(ROOT, relPath);
  const manifest = JSON.parse(fs.readFileSync(filePath, "utf8"));
  manifest.version = next;
  fs.writeFileSync(filePath, `${JSON.stringify(manifest, null, 2)}\n`);
}

git("add", ...MANIFESTS);
git("commit", "-m", `Release v${next}`);
git("tag", "-a", `v${next}`, "-m", `Release v${next}`);
git("push", "--follow-tags");
console.log(`Released v${next}`);
