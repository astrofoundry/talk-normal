// Claude Code SessionStart hook. Prints the talk-normal ruleset when the
// opt-in flag file exists and prints nothing otherwise. Exits 0 on every
// path, including errors: a hook must never block a session from starting.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FLAG_NAME = ".talk-normal-always";
const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

function main() {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude");
  const flagFile = join(configDir, FLAG_NAME);
  if (!existsSync(flagFile)) return;

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
