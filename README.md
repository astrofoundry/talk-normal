# talk-normal

A skill that makes your coding agent write like a competent engineer with somewhere to be: answer first, plain words, whole sentences, nothing decorative.

## Why

Agent output fails in two independent ways. The *shape* fails — the answer sits under a paragraph of warm-up, steps hide inside prose, and every message ends with "Hope this helps!". And the *language* fails — synonyms rotate mid-explanation, passives hide the actor, and "leveraging robust solutions" says nothing at all.

talk-normal fixes both at once:

- **Language rules**, adapted from ASD-STE100 — the controlled English the aerospace industry wrote so a maintenance instruction cannot be misread. One meaning per word. Active voice. Sentences capped at 20–25 words, with their articles intact: this is the opposite of telegram-style compression, because dropped words create ambiguity.
- **Delivery rules** — the point arrives in line one, work becomes numbered steps, progress is restated every turn, and the message stops when its job is done.

The rules follow the work: prompts written for subagents carry the ruleset, and relayed subagent prose is rewritten to conform while code and errors pass through untouched.

## See it

Without the skill:

> Sure! So looking into this, it seems like the issue you're experiencing might possibly be related to how the retry logic is being handled. There are several factors at play here worth unpacking. One robust approach would be to consider adjusting the backoff configuration, which should hopefully help. Let me know if you'd like me to elaborate on anything!

With it:

> Retries stop after one attempt because `maxRetries` reads from the wrong env var.
>
> 1. In `queue.config.ts:14`, change `RETRY_LIMIT` to `QUEUE_RETRY_LIMIT`.
> 2. Run `pnpm test queue`.
>
> Next: paste the test output if anything still fails.

## Install

Runs in Claude Code, Codex, Gemini CLI, Qwen Code, Kimi Code CLI, Pi, GitHub Copilot, Zed, Cursor, OpenCode, and any harness that reads Agent Skills. Full per-harness instructions: [INSTALL.md](INSTALL.md).

Claude Code:

```bash
claude plugin marketplace add astrofoundry/agent-skills
claude plugin install talk-normal@astrofoundry
```

## Use

- `/talk-normal` turns it on for the session.
- "stop talk-normal" turns it off.
- `touch ~/.claude/.talk-normal-always` makes it load on every session start (Claude Code); delete the file to stop.

The full ruleset lives in one file: [skills/talk-normal/SKILL.md](skills/talk-normal/SKILL.md). Fork and edit it to taste — every harness reads the same file.

## Credits

The delivery layer adapts ideas from [i-have-adhd](https://github.com/ayghri/i-have-adhd) by Ayoub G. (MIT). The language layer derives from ASD-STE100 Simplified Technical English, with a nod to [L1nefeed's adaptation](https://gist.github.com/L1nefeed/4164ecaaf77879e76dca3c06f142f1c2). ASD-STE100 is a copyright and trademark of ASD, Brussels — this skill is an independent adaptation, not certified STE.

## License

MIT.
