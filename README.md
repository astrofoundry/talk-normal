# talk-normal

A skill that makes your coding agent write like a competent engineer who respects your time: answer first, plain words, whole sentences, nothing decorative.

## Why

Agent output fails in two independent ways. The *shape* fails — the answer comes last, the steps are mixed into prose, and every message ends with "Hope this helps!". And the *language* fails — synonyms rotate mid-explanation, passive voice removes the actor, and "leveraging robust solutions" has no meaning.

talk-normal fixes both at once:

- **Language rules**, adapted from ASD-STE100 — the controlled English the aerospace industry wrote so a maintenance instruction cannot be misread. One meaning per word. Active voice. Sentences stay under 20–25 words, and the articles stay: this is the opposite of telegram-style compression, because dropped words create ambiguity.
- **Delivery rules** — the point arrives in line one, work becomes numbered steps, progress is restated every turn, and the message stops when its job is done.

The rules follow the work: a prompt written for a subagent carries the ruleset, and the agent rewrites relayed subagent prose to conform while code and errors pass through unchanged.

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

Two activation models, depending on what the harness lets a plugin do:

- **On by default** — Claude Code, the Claude desktop app's Code tab, Pi, Gemini's extension route, and Codex CLI after a one-time hook trust. The rules apply from the first message of every session; disabling or removing the plugin turns them off.
- **Per session or per relevance** — claude.ai chat, ChatGPT surfaces, Qwen, Kimi, Copilot, Zed, Cursor, OpenCode. Those surfaces load skills on invocation or by relevance; the [instructions block](#the-instructions-block) is their always-on substitute.

<details>
<summary><strong>Claude Code</strong></summary>

### Install

Via the Astro Foundry marketplace:

```bash
claude plugin marketplace add astrofoundry/agent-skills
claude plugin install talk-normal@astrofoundry
```

Or directly from this repository:

```bash
claude plugin marketplace add astrofoundry/talk-normal
claude plugin install talk-normal@talk-normal
```

The rules apply from the first message of every new session. No further step.

### Turn it off

```bash
claude plugin disable talk-normal
```

Or uninstall below. Both apply to new sessions — a session that already loaded the rules keeps them until it ends.

### Verify

```bash
claude plugin list
```

### Update

```bash
claude plugin marketplace update astrofoundry   # or: talk-normal
```

### Uninstall

```bash
claude plugin uninstall talk-normal
claude plugin marketplace remove astrofoundry   # or: talk-normal
```

### Auto-update (optional)

Third-party marketplaces do not auto-update by default. Two ways to turn it on for this one:

- Open `/plugin`, select the marketplace you added (`astrofoundry` or `talk-normal`), and enable auto-update.
- Or set it in `~/.claude/settings.json` on your marketplace entry:

```json
{
  "extraKnownMarketplaces": {
    "astrofoundry": {
      "source": { "source": "github", "repo": "astrofoundry/agent-skills" },
      "autoUpdate": true
    }
  }
}
```

Claude Code then checks for updates in the background after each session starts. When an update arrives, it prompts you to run `/reload-plugins`, which switches skills and hooks to the new version without a restart. Without auto-update, run `claude plugin update talk-normal@astrofoundry` yourself. `claude plugin list` shows the installed version either way.

### Statusline badge (optional)

The plugin ships `statusline/badge.mjs`: it prints a green `[TALK-NORMAL:<installed version>]`. The block below runs it only while the plugin is enabled, so a disabled plugin shows no badge — the absence is the off state.

Add this block to your own statusline script (the one `statusLine.command` in settings.json points at), anywhere after it resolves `$proj` from the workspace JSON:

```bash
tn=""
for f in "$HOME/.claude/settings.json" "$proj/.claude/settings.json" "$proj/.claude/settings.local.json"; do
  [ -f "$f" ] || continue
  v=$(jq -r '(.enabledPlugins // {}) | if has("talk-normal@astrofoundry") then .["talk-normal@astrofoundry"] | tostring else empty end' "$f" 2>/dev/null)
  [ -n "$v" ] && tn=$v
done
if [ "$tn" = "true" ]; then
  ip=$(jq -r '.plugins["talk-normal@astrofoundry"][0].installPath // empty' "$HOME/.claude/plugins/installed_plugins.json" 2>/dev/null)
  [ -n "$ip" ] && badge=$(node "$ip/statusline/badge.mjs" 2>/dev/null) && [ -n "$badge" ] && printf ' %s' "$badge"
fi
```

The `enabledPlugins` gate reads the last settings file that mentions the plugin, so a project-level `false` wins over a user-level `true`, and the badge disappears when you disable the plugin. The install path comes from `installed_plugins.json` — the version Claude Code actually installed, not the newest directory in the cache. If you installed through the direct route, replace `astrofoundry` with `talk-normal` in the plugin key. If you have no statusline script, see the statusline page in the Claude Code docs for the two-line `statusLine` settings entry that creates one.

</details>

<details>
<summary><strong>Claude desktop app — Code tab</strong></summary>

The plugin works in the **Code** tab only; the Chat tab is the claude.ai chat surface — see the next section.

Install once with the commands from the Claude Code section above. Local and SSH Code sessions read the same configuration as the CLI, so the rules load at session start, and `/talk-normal:talk-normal` re-invokes the skill. The **+** button next to the prompt box lists installed plugins and their skills under **Plugins**.

Two documented limits: cloud sessions have no plugin browser — declare the plugin in the project's `.claude/settings.json` under `enabledPlugins` instead — and WSL sessions do not load plugins.

</details>

<details>
<summary><strong>claude.ai chat (web and the desktop Chat tab)</strong></summary>

The Chat surface has no plugin layer.

### Always on (recommended)

Open **Settings → Profile**, find **Instructions for Claude**, and paste [the instructions block](#the-instructions-block). It applies to every chat on the account; remove it to turn it off.

### The skill (per relevance, Pro/Max/Team/Enterprise)

Chat also runs the actual skill — the same `SKILL.md` the plugin ships — uploaded as a ZIP:

1. Download `talk-normal-skill.zip` from the [latest release](https://github.com/astrofoundry/talk-normal/releases/latest).
2. Open **Settings**, go to the **Skills** area — current app versions place it under **Customize**, and the Settings page links there. Enable prerequisites the page asks for (code execution, and on Enterprise an organization owner enables Skills first).
3. Upload the ZIP and toggle the skill on.

Claude then applies the skill when a chat matches its description, or when you ask for it by name. Chat ignores the plugin's explicit-invocation flag, so activation is relevance-driven — the instructions block remains the only guaranteed always-on.

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

On by default after a one-time step: the plugin bundles a `SessionStart` hook that loads the ruleset into every session, and Codex requires you to trust that hook once.

### Install

1. Register the marketplace: `codex plugin marketplace add astrofoundry/talk-normal`.
2. Start `codex` and open the plugin browser — the **Plugins** screen, listed in the `/` command menu. Select the `talk-normal` marketplace and install **talk-normal**. There is no CLI install command; installation goes through this screen.
3. Run `/hooks`, review the talk-normal `SessionStart` hook, and trust it. Codex skips untrusted plugin hooks by design.

From the next session, the rules load at start — the footer shows "Loading talk-normal ruleset" while the hook runs. Node.js must be on your PATH.

### Turn it off

Untrust or disable the hook in `/hooks`, or remove the plugin in the plugin browser.

Without the trusted hook, the plugin still works per session: type `$talk-normal` in the composer. Codex does not activate the skill on its own (`allow_implicit_invocation: false`).

### Verify

```bash
codex plugin marketplace list
grep -A2 talk-normal ~/.codex/config.toml
```

### Update

```bash
codex plugin marketplace upgrade talk-normal
```

### Uninstall

Remove the plugin in the plugin browser, then:

```bash
codex plugin marketplace remove talk-normal
```

### Enterprise setups where `marketplace add` fails (optional)

Managed Codex deployments can restrict marketplace sources (`requirements.toml`, `restrict_to_allowed_sources`), and the add then fails. The skill still installs without the marketplace, because Codex reads standalone skills from `~/.codex/skills/`:

```bash
git clone https://github.com/astrofoundry/talk-normal
mkdir -p ~/.codex/skills
cp -R talk-normal/skills/talk-normal ~/.codex/skills/
```

Codex detects the new skill automatically; restart it if `$talk-normal` does not appear. This route is per-session invocation — the plugin's always-on hook does not travel with a standalone skill. To rebuild always-on, point a user-level `SessionStart` hook in `~/.codex/hooks.json` at the copied skill, and trust it in `/hooks`; managed policy has the final word on non-managed hooks.

</details>

<details>
<summary><strong>ChatGPT desktop app and Chat mode</strong></summary>

Plugins run in Work mode and in Codex inside the ChatGPT desktop app — not in Chat mode, the IDE extension, or mobile. Skills activate per chat.

### Install (Work mode / Codex)

1. Register the marketplace once from a terminal: `codex plugin marketplace add astrofoundry/talk-normal`.
2. In the app, select **Codex** (or switch to Work mode), and open **Plugins**.
3. Select the `talk-normal` marketplace in the Plugins Directory and install **talk-normal**.

Type `@` in the composer and select the talk-normal skill, or ask for it by name. Uninstall from the **Installed** row of the Plugins Directory.

### Chat mode

Chat mode loads no plugins and no skills. The alternative is ChatGPT's custom-instructions field (Settings → Personalization): paste [the instructions block](#the-instructions-block) there, and it applies to your chats until you remove it.

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

The extension route is on by default: the extension loads `GEMINI.md`, which imports the full skill, so the rules apply from message one. The command route is the per-session alternative.

### Install (extension, on by default)

```bash
gemini extensions install https://github.com/astrofoundry/talk-normal
```

`git` must be installed.

### Install (command, per session)

```bash
mkdir -p ~/.gemini/commands
curl -fsSL https://raw.githubusercontent.com/astrofoundry/talk-normal/main/skills/talk-normal/agents/gemini.toml \
  -o ~/.gemini/commands/talk-normal.toml
```

Start a new session and type `/talk-normal` when you want the rules.

### Verify

```bash
gemini extensions list          # extension route
ls ~/.gemini/commands           # command route: talk-normal.toml present
```

### Update

```bash
gemini extensions update talk-normal    # extension route
# command route: re-run the curl above
```

### Uninstall

```bash
gemini extensions uninstall talk-normal    # extension route
rm ~/.gemini/commands/talk-normal.toml     # command route
```

</details>

<details>
<summary><strong>Qwen Code</strong></summary>

Qwen loads plugin skills on invocation. One command per session.

### Install

```bash
qwen extensions install astrofoundry/talk-normal
```

Type `/talk-normal` at the start of a session.

### Verify

```bash
qwen extensions list
```

Then start a new session, run `/skills`, and check that `talk-normal` appears.

### Update

```bash
qwen extensions update talk-normal
```

### Uninstall

```bash
qwen extensions uninstall talk-normal
```

</details>

<details>
<summary><strong>Kimi Code CLI</strong></summary>

Kimi loads plugin skills on invocation. One command per session.

### Install

Start a Kimi Code session, then:

1. Run `/plugins`.
2. Choose **Custom**.
3. Paste `https://github.com/astrofoundry/talk-normal` and press `Enter`.
4. Choose **Trust and install**.

Type `/skill:talk-normal` at the start of a session.

### Update

`/plugins` in a Kimi Code session, cursor to **Talk Normal**, press `R`.

### Uninstall

`/plugins` in a Kimi Code session, cursor to **Talk Normal**, press `D`.

</details>

<details>
<summary><strong>Pi</strong></summary>

Pi reads this repository as a native package, and the mode is on by default: the extension injects the ruleset at every new, resumed, forked, or reloaded session.

### Install

```bash
pi install https://github.com/astrofoundry/talk-normal
```

The footer shows `● TALK NORMAL` while the package is installed. The extension injects the ruleset into the conversation once — not on every request — and injects it again when compaction drops it.

### Turn it off

Remove the package (see Uninstall below).

### Verify

```bash
pi list
```

Check that the package is listed and that `● TALK NORMAL` appears in the footer of a new session.

### Update

```bash
pi update --extensions
```

Or update this package only: run `pi list`, copy the talk-normal source string, then `pi update --extension <source>`.

### Uninstall

Run `pi list`, copy the talk-normal source string, then:

```bash
pi remove <source>
```

</details>

<details>
<summary><strong>GitHub Copilot (VS Code and Copilot CLI)</strong></summary>

Copilot reads Agent Skills natively and loads them on invocation. One command per session.

### Install

```bash
npx skills add astrofoundry/talk-normal -a github-copilot        # this project
npx skills add astrofoundry/talk-normal -a github-copilot -g     # all projects
```

Without the CLI, copy the skill folder into any directory Copilot scans:

```bash
git clone https://github.com/astrofoundry/talk-normal
mkdir -p ~/.copilot/skills
cp -R talk-normal/skills/talk-normal ~/.copilot/skills/
```

Type `/talk-normal` at the start of a chat.

### Verify

Type `/` in the chat input and check that `talk-normal` appears. Or:

```bash
npx skills list
```

### Update

```bash
npx skills update talk-normal
```

### Uninstall

```bash
npx skills remove talk-normal
```

</details>

<details>
<summary><strong>Zed</strong></summary>

Zed's Agent reads Agent Skills natively and loads them on invocation. One command per chat.

### Install

In the Agent Panel, open the Skills manager and choose **Create skill from URL**, then paste:

```
https://github.com/astrofoundry/talk-normal/blob/main/skills/talk-normal/SKILL.md
```

Save it in **User** scope for every project, or **Project** scope for one. Then type `/talk-normal` in the Agent Panel.

Or clone and copy:

```bash
git clone https://github.com/astrofoundry/talk-normal
cp -R talk-normal/skills/talk-normal ~/.config/zed/skills/
```

### Verify

Open the Skills manager and check that `talk-normal` is listed.

### Update

Re-import from the same URL, or re-copy the folder after `git pull`.

### Uninstall

Remove `talk-normal` from the Skills manager, or delete `~/.config/zed/skills/talk-normal`.

</details>

<details>
<summary><strong>Cursor, OpenCode, and any other agent-skills harness</strong></summary>

These harnesses read Agent Skills and load them on invocation. One command per chat. Swap `-a <agent>` for yours.

### Install

```bash
npx skills add astrofoundry/talk-normal                  # this workspace
npx skills add astrofoundry/talk-normal -g               # all projects
npx skills add astrofoundry/talk-normal -a cursor -y     # one agent only
npx skills add astrofoundry/talk-normal -a opencode -y
```

New agent chat, type `/talk-normal`.

Without the CLI, copy the skill folder into whatever path your agent scans:

```bash
git clone https://github.com/astrofoundry/talk-normal
mkdir -p ~/.cursor/skills     # Cursor. Use .agents/skills for OpenCode, or your agent's own path
cp -R talk-normal/skills/talk-normal ~/.cursor/skills/
```

### Verify

```bash
npx skills list
npx skills ls -g    # if installed globally
```

### Update

```bash
npx skills update talk-normal
```

### Uninstall

```bash
npx skills remove talk-normal
```

</details>

## The instructions block

Chat surfaces without a plugin layer (claude.ai chat, ChatGPT Chat mode) use this block as their persistent instructions:

```markdown
Write the way a competent engineer talks to a colleague whose time is short.

Say it plainly: one meaning per word, one verb per action, no synonym rotation. Prefer everyday verbs (use, make sure, check, start, stop, show, fix, change, remove, need). Use the active voice and name the actor; simple tenses only. Sentences stay under 20 words in instructions and 25 in descriptions, one instruction each, articles kept — never compress words away. Rewrite multi-word nouns longer than three words. One topic per paragraph, six sentences maximum. Lead warnings with the danger.

Say it in a useful order: the first line carries the point; multi-step work becomes a numbered list of bounded actions; state where things stand every turn; close with one next move doable in under two minutes; errors get a location, a cause, and a fix; results are shown concretely; estimates come in units; lists cap at five items; tangents get one sentence at the end; no warm-up, no recap, no sign-off.

Banned in your own prose: delve, dive into, deep dive, leverage, seamless, seamlessly, robust/powerful/comprehensive as decoration, "it's worth noting", "great question", "as an AI", journey/landscape/ecosystem as metaphors, game-changing, cutting-edge, state-of-the-art, padding adverbs (basically, essentially, actually, simply, just), idioms and figures of speech. Code, commands, paths, identifiers, error text, and quotes pass through exactly. Precision outranks style: never drop a fact, a number, or a condition to shorten a sentence.

When you send work to a subagent, include these rules in its prompt; rewrite its prose (never its code or errors) when you relay it.

Bend only here: explanations and walkthroughs may run long, and the shape stays; a destructive step gets a full-sentence warning and a pause for confirmation; after three failed fixes, stop and name the doubtful assumption; an ambiguous request earns one short question; the harness's own rules always win — keep the spirit inside them.
```

## Customize

The full ruleset is one file: [skills/talk-normal/SKILL.md](skills/talk-normal/SKILL.md) — every harness reads or derives from it. Fork the repository, edit that file, then install your fork (Claude Code: `claude plugin marketplace add <you>/talk-normal`, then `claude plugin install talk-normal@talk-normal`).

## Troubleshooting

**The slash command is missing.** The command index builds at startup; open a fresh session after you install.

**The rules do not apply in a new Claude Code session.** The plugin is disabled, or an old version is loaded — check `claude plugin list`, update, and run `/reload-plugins` or restart.

**The rules do not load in Codex.** The bundled `SessionStart` hook is not trusted, and Codex skips untrusted plugin hooks by design; run `/hooks`, trust the talk-normal hook, and start a new session.

**`marketplace add` rejects a local path.** The path points inside the repository; point it at the directory that *contains* `.claude-plugin/`, not at `.claude-plugin/` itself.

**Output drifts back to slop mid-session.** Older instructions lose force in a long session; re-invoke the skill (`/talk-normal:talk-normal` in Claude Code). On-by-default surfaces re-load the rules at every new session and after compaction.

## Credits

The delivery layer adapts ideas from [i-have-adhd](https://github.com/ayghri/i-have-adhd) by Ayoub G. (MIT). The language layer derives from ASD-STE100 Simplified Technical English, Issue 9. ASD-STE100 is a copyright and trademark of ASD, Brussels — this skill is an independent adaptation, not certified STE.

## License

MIT.
