// Codex SessionStart hook. Prints the talk-normal ruleset as plain text —
// Codex adds hook stdout to the session as developer context. Untrust the
// hook or remove the plugin to turn the rules off. Exits 0 on every path.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTMATTER = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

try {
  const here = dirname(fileURLToPath(import.meta.url));
  const rules = readFileSync(join(here, "..", "skills", "talk-normal", "SKILL.md"), "utf8")
    .replace(FRONTMATTER, "")
    .trim();
  if (rules) {
    console.log(`TALK-NORMAL ACTIVE. Apply the ruleset below to every response.\n\n${rules}`);
  }
} catch {
  // A hook failure must never block a session.
}
process.exit(0);
