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

const canonical = fs.readFileSync(path.join(ROOT, "skills/talk-normal/SKILL.md"));
const cursorCopy = fs.readFileSync(path.join(ROOT, ".cursor/skills/talk-normal/SKILL.md"));
if (!canonical.equals(cursorCopy)) {
  fail(".cursor/skills/talk-normal/SKILL.md differs from skills/talk-normal/SKILL.md");
} else {
  ok("cursor skill copy in sync");
}

{
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "talk-normal-hook-"));
  const env = { ...process.env, CLAUDE_CONFIG_DIR: scratch };
  const byDefault = run("node", ["hooks/always-on.mjs"], { env });
  if (byDefault.status !== 0 || !byDefault.stdout.startsWith("TALK-NORMAL ACTIVE")) {
    fail("hook by default: expected TALK-NORMAL ACTIVE on stdout, exit 0");
  }
  fs.writeFileSync(path.join(scratch, ".talk-normal-off"), "");
  const optedOut = run("node", ["hooks/always-on.mjs"], { env });
  if (optedOut.status !== 0 || optedOut.stdout !== "") {
    fail("hook with .talk-normal-off: expected empty stdout, exit 0");
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  ok("hook dry-run (on by default, silent when opted out)");
}

{
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "talk-normal-codex-"));
  const env = { ...process.env, HOME: scratch };
  const byDefault = run("node", ["hooks/codex-session-start.mjs"], { env });
  if (byDefault.status !== 0 || !byDefault.stdout.startsWith("TALK-NORMAL ACTIVE")) {
    fail("codex hook by default: expected TALK-NORMAL ACTIVE on stdout, exit 0");
  }
  const tokenEstimate = Math.ceil(byDefault.stdout.length / 4);
  if (tokenEstimate > 2300) {
    fail(`codex hook output near Codex's 2500-token cap: ~${tokenEstimate} tokens`);
  }
  fs.mkdirSync(path.join(scratch, ".codex"), { recursive: true });
  fs.writeFileSync(path.join(scratch, ".codex", ".talk-normal-off"), "");
  const optedOut = run("node", ["hooks/codex-session-start.mjs"], { env });
  if (optedOut.status !== 0 || optedOut.stdout !== "") {
    fail("codex hook with .talk-normal-off: expected empty stdout, exit 0");
  }
  fs.rmSync(scratch, { recursive: true, force: true });
  ok(`codex hook dry-run (on by default, opt-out works, ~${tokenEstimate} tokens)`);
}

{
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "talk-normal-badge-"));
  const env = { ...process.env, CLAUDE_CONFIG_DIR: scratch };
  const onLabel = `TALK-NORMAL:${readJson(".claude-plugin/plugin.json").version}`;
  const badgeFor = (sessionId) =>
    run("node", ["statusline/badge.mjs"], { env, input: JSON.stringify({ session_id: sessionId }) }).stdout;

  run("node", ["hooks/track-state.mjs"], {
    env,
    input: JSON.stringify({ session_id: "s1", user_prompt_raw: "/talk-normal" }),
  });
  if (!badgeFor("s1").includes(onLabel)) fail("badge: /talk-normal should read ON with the installed version");

  run("node", ["hooks/track-state.mjs"], {
    env,
    input: JSON.stringify({ session_id: "s1", user_prompt_raw: "stop talk-normal" }),
  });
  if (!badgeFor("s1").includes("TALK-NORMAL:OFF")) fail("badge: stop phrase should read OFF");

  if (!badgeFor("unknown").includes(onLabel)) fail("badge: unknown session should read ON by default");
  fs.writeFileSync(path.join(scratch, ".talk-normal-off"), "");
  if (!badgeFor("unknown").includes("TALK-NORMAL:OFF")) fail("badge: unknown session with opt-out flag should read OFF");
  fs.rmSync(path.join(scratch, ".talk-normal-off"));

  run("node", ["hooks/track-state.mjs"], {
    env,
    input: JSON.stringify({ session_id: "s1", user_prompt_raw: "/talk-normal:talk-normal" }),
  });
  if (!badgeFor("s1").includes(onLabel)) fail("badge: namespaced command should read ON");

  run("node", ["hooks/track-state.mjs"], {
    env,
    input: JSON.stringify({ session_id: "s3", hook_event_name: "UserPromptExpansion", command_name: "talk-normal:talk-normal" }),
  });
  if (!badgeFor("s3").includes(onLabel)) fail("badge: expansion event (namespaced) should read ON");

  run("node", ["hooks/track-state.mjs"], {
    env,
    input: JSON.stringify({ session_id: "s4", hook_event_name: "UserPromptExpansion", command_name: "talk-normal" }),
  });
  if (!badgeFor("s4").includes(onLabel)) fail("badge: expansion event (bare) should read ON");

  fs.writeFileSync(path.join(scratch, ".talk-normal-off"), "");
  run("node", ["hooks/always-on.mjs"], { env, input: JSON.stringify({ session_id: "s2", source: "startup" }) });
  if (!badgeFor("s2").includes("TALK-NORMAL:OFF")) fail("badge: startup with opt-out flag should read OFF");
  fs.rmSync(path.join(scratch, ".talk-normal-off"));

  fs.rmSync(scratch, { recursive: true, force: true });
  ok("state tracker + badge round-trip");
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
