// Pi extension: talk-normal as an always-on output mode. Installing the
// package turns the rules on; removing it turns them off.
//
// The ruleset enters the conversation as a single hidden custom message.
// Compaction drops that message from the live context, so the extension
// injects it again when needed.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

const SKILL_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "skills",
  "talk-normal",
  "SKILL.md",
);
const RULES_ENTRY = "talk-normal-rules";
const ON_HEADER = "TALK-NORMAL ACTIVE. Apply the ruleset below to every response.";

function readRules(): string {
  const raw = readFileSync(SKILL_FILE, "utf8");
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  if (!body) throw new Error(`No rules found in ${SKILL_FILE}`);
  return body;
}

/** Whether the rules message survives in the context the model actually sees. */
function rulesLive(ctx: ExtensionContext): boolean {
  for (const entry of ctx.sessionManager.buildContextEntries()) {
    if (entry.type === "custom_message" && entry.customType === RULES_ENTRY) return true;
  }
  return false;
}

export default function talkNormal(pi: ExtensionAPI) {
  const rules = readRules();

  const sync = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus("talk-normal", "● TALK NORMAL");
    if (rulesLive(ctx)) return;
    pi.sendMessage(
      { customType: RULES_ENTRY, content: `${ON_HEADER}\n\n${rules}`, display: false },
      { triggerTurn: false },
    );
  };

  pi.on("session_start", async (_event, ctx) => sync(ctx));
  pi.on("session_tree", async (_event, ctx) => sync(ctx));
  pi.on("session_compact", async (_event, ctx) => sync(ctx));
}
