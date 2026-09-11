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
} catch {}
process.exit(0);
