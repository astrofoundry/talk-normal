// UserPromptSubmit hook. Records the session's talk-normal state so the
// statusline badge can read it: typing /talk-normal records ON, typing the
// stop phrase records OFF. Prints nothing (UserPromptSubmit stdout would be
// injected into the conversation) and exits 0 on every path.

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STATE_NAME = ".talk-normal-state.json";
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

function readState(file) {
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function main() {
  if (process.stdin.isTTY) return;
  const event = JSON.parse(readFileSync(0, "utf8"));
  const sessionId = event.session_id;
  if (typeof sessionId !== "string" || sessionId === "") return;

  const text = String(event.user_prompt_raw ?? event.user_prompt ?? "")
    .trim()
    .toLowerCase();
  // The skill invokes as /talk-normal or, namespaced by the plugin, as
  // /talk-normal:talk-normal — both with optional arguments.
  const turnsOn = /^\/talk-normal(?::talk-normal)?(?:\s|$)/.test(text);
  const turnsOff = text === "stop talk-normal" || text === "stop talk normal";
  if (!turnsOn && !turnsOff) return;

  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const stateFile = join(configDir, STATE_NAME);
  const state = readState(stateFile);

  const now = Date.now();
  for (const [id, entry] of Object.entries(state)) {
    if (typeof entry?.t !== "number" || now - entry.t > KEEP_MS) delete state[id];
  }
  state[sessionId] = { on: turnsOn, t: now };
  writeFileSync(stateFile, `${JSON.stringify(state)}\n`);
}

try {
  main();
} catch {
  // Never block a prompt.
}
process.exit(0);
