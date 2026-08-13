// Statusline badge. Reads the statusline stdin JSON, looks the session up in
// the state file that hooks/track-state.mjs maintains, and prints a colored
// [TALK-NORMAL:<installed version>] when on or [TALK-NORMAL:OFF] when off.
// A session with no recorded state follows the default: on, unless the
// .talk-normal-off opt-out flag exists. Prints nothing on any error.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OFF = "\x1b[2m[TALK-NORMAL:OFF]\x1b[0m";
const STATE_NAME = ".talk-normal-state.json";

function onBadge() {
  let label = "ON";
  try {
    const manifest = join(dirname(fileURLToPath(import.meta.url)), "..", ".claude-plugin", "plugin.json");
    const version = JSON.parse(readFileSync(manifest, "utf8")).version;
    if (typeof version === "string" && version !== "") label = version;
  } catch {
    // Version is decoration; ON is still correct.
  }
  return `\x1b[38;5;114m[TALK-NORMAL:${label}]\x1b[0m`;
}

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
  if (typeof on !== "boolean") on = !existsSync(join(configDir, ".talk-normal-off"));

  process.stdout.write(on ? onBadge() : OFF);
}

try {
  main();
} catch {
  // A statusline helper never breaks the statusline.
}
