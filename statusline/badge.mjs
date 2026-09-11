import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

try {
  const manifest = join(dirname(fileURLToPath(import.meta.url)), "..", ".claude-plugin", "plugin.json");
  const version = JSON.parse(readFileSync(manifest, "utf8")).version;
  const label = typeof version === "string" && version !== "" ? version : "ON";
  process.stdout.write(`\x1b[38;5;114m[TALK-NORMAL:${label}]\x1b[0m`);
} catch {}
