// Codex SessionStart hook. Prints the talk-normal ruleset as plain text —
// Codex adds hook stdout to the session as developer context — unless the
// user opted out with ~/.codex/.talk-normal-off. Exits 0 on every path.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

function main() {
  const offFlag = join(homedir(), ".codex", ".talk-normal-off");
  if (existsSync(offFlag)) return;

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
  // A hook failure must never block a session.
}
process.exit(0);
