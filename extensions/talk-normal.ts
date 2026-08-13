// Pi extension: talk-normal as a session-persistent output mode, on by
// default. A .talk-normal-off flag in the Pi agent directory opts out.
//
// The ruleset enters the conversation as a single hidden custom message.
// Session entries record every on/off choice, so the mode survives reloads
// and branch switches, and compaction triggers a re-injection because the
// live context no longer contains the rules message.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getAgentDir,
  type ExtensionAPI,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const SKILL_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "skills",
  "talk-normal",
  "SKILL.md",
);
const OFF_FLAG_FILE = ".talk-normal-off";
const STATE_ENTRY = "talk-normal-state";
const RULES_ENTRY = "talk-normal-rules";
const OFF_ENTRY = "talk-normal-disabled";
const OFF_PHRASES = new Set(["stop talk-normal", "stop talk normal"]);
const ON_HEADER =
  'TALK-NORMAL ACTIVE. Apply the ruleset below to every response until it is turned off. "stop talk-normal" ends it for this session.';
const OFF_NOTICE =
  "TALK-NORMAL OFF. Disregard the talk-normal ruleset injected earlier and write in your default style again.";
const OFF_REPLY = "Talk-normal mode disabled.";

function readRules(): string {
  const raw = readFileSync(SKILL_FILE, "utf8");
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "").trim();
  if (!body) throw new Error(`No rules found in ${SKILL_FILE}`);
  return body;
}

/** Latest on/off choice persisted on this session branch, if any. */
function savedChoice(ctx: ExtensionContext): boolean | undefined {
  let choice: boolean | undefined;
  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type === "custom" && entry.customType === STATE_ENTRY) {
      const data = entry.data as { enabled?: unknown } | undefined;
      if (typeof data?.enabled === "boolean") choice = data.enabled;
    }
  }
  return choice;
}

/**
 * Whether the rules message survives in the context the model actually sees.
 * The newest marker decides; compaction drops summarized entries, which is
 * exactly when this returns false and a re-injection is due.
 */
function rulesLive(ctx: ExtensionContext): boolean {
  let live = false;
  for (const entry of ctx.sessionManager.buildContextEntries()) {
    if (entry.type !== "custom_message") continue;
    if (entry.customType === RULES_ENTRY) live = true;
    if (entry.customType === OFF_ENTRY) live = false;
  }
  return live;
}

export default function talkNormal(pi: ExtensionAPI) {
  const rules = readRules();
  const offFlagPath = join(getAgentDir(), OFF_FLAG_FILE);
  let enabled = false;

  const paint = (ctx: ExtensionContext): void => {
    ctx.ui.setStatus("talk-normal", enabled ? "● TALK NORMAL" : undefined);
  };

  const sync = (ctx: ExtensionContext): void => {
    if (enabled === rulesLive(ctx)) return;
    pi.sendMessage(
      enabled
        ? { customType: RULES_ENTRY, content: `${ON_HEADER}\n\n${rules}`, display: false }
        : { customType: OFF_ENTRY, content: OFF_NOTICE, display: false },
      { triggerTurn: false },
    );
  };

  const restore = (ctx: ExtensionContext): void => {
    enabled = savedChoice(ctx) ?? !existsSync(offFlagPath);
    paint(ctx);
    sync(ctx);
  };

  const choose = (next: boolean, ctx: ExtensionContext): void => {
    enabled = next;
    pi.appendEntry(STATE_ENTRY, { enabled });
    paint(ctx);
    sync(ctx);
    ctx.ui.notify(`Talk-normal mode ${next ? "enabled" : "disabled"}`, "info");
  };

  pi.registerCommand("talk-normal", {
    description: "Toggle talk-normal output for this session",
    handler: async (args, ctx) => {
      switch (args.trim().toLowerCase()) {
        case "":
          return choose(!enabled, ctx);
        case "on":
          return choose(true, ctx);
        case "off":
        case "stop":
          return choose(false, ctx);
        default:
          ctx.ui.notify("Usage: /talk-normal [on|off]", "warning");
      }
    },
  });

  pi.on("input", async (event, ctx) => {
    const text = event.text.trim().toLowerCase();

    // The built-in skill command stays usable as an alias, but routes through
    // this extension so the rules are not injected a second time.
    if (text === "/skill:talk-normal") {
      choose(true, ctx);
      return { action: "handled" };
    }

    if (enabled && OFF_PHRASES.has(text)) {
      choose(false, ctx);
      return ctx.hasUI
        ? { action: "handled" }
        : { action: "transform", text: `Reply with exactly: ${OFF_REPLY}` };
    }

    return { action: "continue" };
  });

  pi.on("session_start", async (_event, ctx) => restore(ctx));
  pi.on("session_tree", async (_event, ctx) => restore(ctx));
  pi.on("session_compact", async (_event, ctx) => sync(ctx));
}
