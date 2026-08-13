// Repo-wide checks: manifest syntax, version lockstep, cursor copy sync,
// hook behavior, typecheck, and Claude Code validation. Used locally by
// `pnpm check` / `pnpm release:*` and by CI.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const MANIFESTS = [
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "gemini-extension.json",
  "qwen-extension.json",
  "kimi.plugin.json",
  "package.json",
];
const OTHER_JSON = [".claude-plugin/marketplace.json", "hooks/hooks.json", "hooks/codex.json", "tsconfig.json"];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function ok(message) {
  console.log(`ok   ${message}`);
}

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8", ...options });
}

for (const relPath of [...MANIFESTS, ...OTHER_JSON]) {
  try {
    readJson(relPath);
  } catch (error) {
    fail(`${relPath} does not parse: ${error.message}`);
  }
}
if (failures === 0) ok("all JSON manifests parse");

try {
  const base = readJson(MANIFESTS[0]);
  for (const relPath of MANIFESTS) {
    const manifest = readJson(relPath);
    if (manifest.name !== base.name) fail(`${relPath}: name ${manifest.name} != ${base.name}`);
    if (manifest.version !== base.version) {
      fail(`${relPath}: version ${manifest.version} != ${base.version}`);
    }
  }
  ok(`name/version lockstep: ${base.name}@${base.version}`);
} catch (error) {
  fail(`lockstep check errored: ${error.message}`);
}

{
  const skill = fs.readFileSync(path.join(ROOT, "skills/talk-normal/SKILL.md"), "utf8");
  const description = skill.match(/^description: '(.*)'$/m)?.[1];
  if (!description) {
    fail("SKILL.md frontmatter: description not found in expected single-quoted form");
  } else if (description.length > 200) {
    fail(`SKILL.md description is ${description.length} chars; claude.ai caps it at 200`);
  } else {
    ok(`skill description within claude.ai cap (${description.length}/200 chars)`);
  }
}

const canonical = fs.readFileSync(path.join(ROOT, "skills/talk-normal/SKILL.md"));
const cursorCopy = fs.readFileSync(path.join(ROOT, ".cursor/skills/talk-normal/SKILL.md"));
if (!canonical.equals(cursorCopy)) {
  fail(".cursor/skills/talk-normal/SKILL.md differs from skills/talk-normal/SKILL.md");
} else {
  ok("cursor skill copy in sync");
}

{
  const hook = run("node", ["hooks/always-on.mjs"]);
  if (hook.status !== 0 || !hook.stdout.startsWith("TALK-NORMAL ACTIVE")) {
    fail("claude hook: expected TALK-NORMAL ACTIVE on stdout, exit 0");
  } else {
    ok("claude hook prints the ruleset");
  }
}

{
  const hook = run("node", ["hooks/codex-session-start.mjs"]);
  if (hook.status !== 0 || !hook.stdout.startsWith("TALK-NORMAL ACTIVE")) {
    fail("codex hook: expected TALK-NORMAL ACTIVE on stdout, exit 0");
  }
  const tokenEstimate = Math.ceil(hook.stdout.length / 4);
  if (tokenEstimate > 2300) {
    fail(`codex hook output near Codex's 2500-token cap: ~${tokenEstimate} tokens`);
  } else {
    ok(`codex hook prints the ruleset (~${tokenEstimate} tokens)`);
  }
}

{
  const onLabel = `TALK-NORMAL:${readJson(".claude-plugin/plugin.json").version}`;
  const badge = run("node", ["statusline/badge.mjs"]);
  if (badge.status !== 0 || !badge.stdout.includes(onLabel)) {
    fail(`badge: expected ${onLabel} on stdout`);
  } else {
    ok("badge prints the installed version");
  }
}

{
  const tsc = run("pnpm", ["exec", "tsc", "--noEmit"]);
  if (tsc.status !== 0) {
    fail(`typecheck: ${tsc.stdout}${tsc.stderr}`);
  } else {
    ok("typecheck");
  }
}

{
  const marketplace = run("claude", ["plugin", "validate", ".", "--strict"]);
  if (marketplace.status !== 0) {
    fail(`claude plugin validate (marketplace): ${marketplace.stdout}${marketplace.stderr}`);
  } else {
    ok("claude plugin validate --strict (marketplace manifest)");
  }

  // `claude plugin validate` only checks marketplace.json when both manifests
  // exist, so validate the plugin manifest on a copy without marketplace.json.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "talk-normal-plugin-"));
  fs.cpSync(ROOT, scratch, {
    recursive: true,
    filter: (src) => !src.includes(`${path.sep}node_modules`) && !src.includes(`${path.sep}.git${path.sep}`),
  });
  fs.rmSync(path.join(scratch, ".claude-plugin/marketplace.json"));
  const plugin = run("claude", ["plugin", "validate", scratch, "--strict"]);
  if (plugin.status !== 0) {
    fail(`claude plugin validate (plugin): ${plugin.stdout}${plugin.stderr}`);
  } else {
    ok("claude plugin validate --strict (plugin manifest)");
  }
  fs.rmSync(scratch, { recursive: true, force: true });
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
