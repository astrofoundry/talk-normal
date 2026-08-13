// Statusline badge. Reads the statusline stdin JSON, looks the session up in
// the state file that hooks/track-state.mjs maintains, and prints a colored
// [TALK-NORMAL:ON] or [TALK-NORMAL:OFF]. A session with no recorded state
// falls back to the always-on flag file. Prints nothing on any error.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ON = "\x1b[38;5;114m[TALK-NORMAL:ON]\x1b[0m";
const OFF = "\x1b[2m[TALK-NORMAL:OFF]\x1b[0m";
const STATE_NAME = ".talk-normal-state.json";

function main() {
  if (process.stdin.isTTY) return;
  const event = JSON.parse(readFileSync(0, "utf8"));
  const sessionId = event.session_id;
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");

  let on;
  try {
    const state = JSON.parse(readFileSync(join(configDir, STATE_NAME), "utf8"));
    on = state[sessionId]?.on;
  } catch {
    on = undefined;
  }
  if (typeof on !== "boolean") on = existsSync(join(configDir, ".talk-normal-always"));

  process.stdout.write(on ? ON : OFF);
}

try {
  main();
} catch {
  // A statusline helper never breaks the statusline.
}
