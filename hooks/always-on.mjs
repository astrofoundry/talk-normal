// Claude Code SessionStart hook. The plugin is on by default: this hook
// prints the talk-normal ruleset at every session start unless the user
// opted out with $CLAUDE_CONFIG_DIR/.talk-normal-off (default ~/.claude).
// It also seeds this session's entry in the state file the statusline badge
// reads. Exits 0 on every path: a hook must never block a session.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OFF_FLAG = ".talk-normal-off";
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

function seedState(configDir, sessionId, source, on) {
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
    state[sessionId] = { on, t: now };
  }
  writeFileSync(stateFile, `${JSON.stringify(state)}\n`);
}

function main() {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const offFlag = join(configDir, OFF_FLAG);
  const on = !existsSync(offFlag);

  const event = readEvent();
  try {
    seedState(configDir, event.session_id, event.source, on);
  } catch {
    // State is cosmetic; the ruleset below is the real payload.
  }

  if (!on) return;

  const here = dirname(fileURLToPath(import.meta.url));
  const rules = readFileSync(join(here, "..", "skills", "talk-normal", "SKILL.md"), "utf8")
    .replace(FRONTMATTER, "")
    .trim();
  if (!rules) return;

  console.log(
    [
      "TALK-NORMAL ACTIVE. Apply the ruleset below to every response.",
      `"stop talk-normal" pauses it for this session; create ${offFlag} to turn it off for every session.`,
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
