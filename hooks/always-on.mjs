// Claude Code SessionStart hook. Two jobs:
//  1. Print the talk-normal ruleset when the opt-in flag file exists (and
//     print nothing otherwise) — stdout becomes session context.
//  2. Seed this session's entry in the state file the statusline badge reads:
//     a fresh session (startup/clear) takes the flag file's value; a resumed,
//     forked, or compacted session keeps whatever it already recorded.
// Exits 0 on every path: a hook must never block a session from starting.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FLAG_NAME = ".talk-normal-always";
const STATE_NAME = ".talk-normal-state.json";
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

function readEvent() {
  if (process.stdin.isTTY) return {};
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

function seedState(configDir, sessionId, source, flagOn) {
  if (typeof sessionId !== "string" || sessionId === "") return;
  const stateFile = join(configDir, STATE_NAME);
  let state = {};
  try {
    const parsed = JSON.parse(readFileSync(stateFile, "utf8"));
    if (typeof parsed === "object" && parsed !== null) state = parsed;
  } catch {
    // First write.
  }
  const now = Date.now();
  for (const [id, entry] of Object.entries(state)) {
    if (typeof entry?.t !== "number" || now - entry.t > KEEP_MS) delete state[id];
  }
  const fresh = source === "startup" || source === "clear";
  if (fresh || typeof state[sessionId]?.on !== "boolean") {
    state[sessionId] = { on: flagOn, t: now };
  }
  writeFileSync(stateFile, `${JSON.stringify(state)}\n`);
}

function main() {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const flagFile = join(configDir, FLAG_NAME);
  const flagOn = existsSync(flagFile);

  const event = readEvent();
  try {
    seedState(configDir, event.session_id, event.source, flagOn);
  } catch {
    // State is cosmetic; the ruleset below is the real payload.
  }

  if (!flagOn) return;

  const here = dirname(fileURLToPath(import.meta.url));
  const rules = readFileSync(join(here, "..", "skills", "talk-normal", "SKILL.md"), "utf8")
    .replace(FRONTMATTER, "")
    .trim();
  if (!rules) return;

  console.log(
    [
      "TALK-NORMAL ACTIVE (always-on). Apply the ruleset below to every response.",
      `"stop talk-normal" pauses it for this session; deleting ${flagFile} turns always-on off.`,
      "",
      rules,
    ].join("\n"),
  );
}

try {
  main();
} catch {
  // Fall through to the unconditional clean exit.
}
process.exit(0);
