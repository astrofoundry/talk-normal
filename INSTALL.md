# How to install

Some harnesses below use this always-on snippet in a persistent rules file:

```markdown
## Output style

Write the way a competent engineer talks to a colleague whose time is short.

Say it plainly: one meaning per word, one verb per action, no synonym rotation. Prefer everyday verbs (use, make sure, check, start, stop, show, fix, change, remove, need). Put the actor in every sentence; simple tenses only. Sentences stay under 20 words in instructions and 25 in descriptions, one instruction each, articles kept. Rewrite multi-word nouns longer than three words. One topic per paragraph, six sentences maximum. Lead warnings with the danger.

Say it in a useful order: the first line carries the point; multi-step work becomes a numbered list of bounded actions; state where things stand every turn; close with one next move; errors get file, cause, fix; results are shown concretely; estimates come in units; lists cap at five items; tangents get one sentence at the end; no warm-up, no recap, no sign-off.

Banned in your own prose: delve, leverage, seamless, robust/powerful/comprehensive as decoration, "it's worth noting", journey/landscape/ecosystem as metaphors, padding adverbs (basically, essentially, actually, simply, just), idioms. Code, commands, error text, and quotes pass through exactly. Precision outranks style.

Bend only here: explanations may run long; a destructive step gets a full-sentence warning and a pause; after three failed fixes, name the doubtful assumption and ask one question; an ambiguous request earns one short question.
```

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

Type `/talk-normal:talk-normal` — Claude Code namespaces plugin skills, and autocomplete completes the full form from `/talk`.

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

To keep it installed but inactive: `claude plugin disable talk-normal`.

### Always-on (optional)

```bash
touch ~/.claude/.talk-normal-always
```

A `SessionStart` hook checks for this file and, when present, loads the full ruleset from the first message of every session. Delete the file to return to on-demand use. The hook reads `$CLAUDE_CONFIG_DIR` when you moved your config directory, and "stop talk-normal" still pauses the mode within a session.

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

The plugin ships `statusline/badge.mjs`: it reads the statusline JSON from stdin and prints a green `[TALK-NORMAL:<installed version>]` while the mode is on, or a dim `[TALK-NORMAL:OFF]` while it is off. State comes from what you type — `/talk-normal:talk-normal` records on, "stop talk-normal" records off — and sessions with no recorded choice follow the always-on flag file.

Add this block to your own statusline script (the one `statusLine.command` in settings.json points at), anywhere after it captures stdin into `$input` and resolves `$proj` from the workspace JSON:

```bash
tn=""
for f in "$HOME/.claude/settings.json" "$proj/.claude/settings.json" "$proj/.claude/settings.local.json"; do
  [ -f "$f" ] || continue
  v=$(jq -r '.enabledPlugins["talk-normal@astrofoundry"] // empty' "$f" 2>/dev/null)
  [ -n "$v" ] && tn=$v
done
if [ "$tn" = "true" ]; then
  b=$(ls -d "$HOME"/.claude/plugins/cache/astrofoundry/talk-normal/*/statusline/badge.mjs 2>/dev/null | sort -V | tail -1)
  [ -n "$b" ] && badge=$(printf '%s' "$input" | node "$b" 2>/dev/null) && [ -n "$badge" ] && printf ' %s' "$badge"
fi
```

The `enabledPlugins` gate makes the badge disappear immediately when you disable the plugin. If you installed through the direct route, replace `astrofoundry` with `talk-normal` in both the plugin key and the cache path. If you have no statusline script, see the statusline page in the Claude Code docs for the two-line `statusLine` settings entry that creates one.

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

### Install

Two phases: register the marketplace from the command line, then install the plugin in the plugin browser.

```bash
codex plugin marketplace add astrofoundry/talk-normal
```

Then start `codex` and open the plugin browser — the **Plugins** screen, listed in the `/` command menu. Select the `talk-normal` marketplace and install **talk-normal**. There is no CLI install command; installation goes through this screen.

### Use

Type `$talk-normal` in the composer. Codex does not activate the skill on its own (`allow_implicit_invocation: false`), and installed skills also appear in the `/` command list.

### Verify

```bash
codex plugin marketplace list
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

### Always-on (optional)

Add the snippet from the top of this file to `~/.codex/AGENTS.md`. Codex loads that file into every session, so the rules apply from message one without the plugin. The snippet and the plugin are two separate routes to the same rules; use one.

</details>

<details>
<summary><strong>ChatGPT desktop app</strong></summary>

Plugins run in Work mode and in Codex inside the ChatGPT desktop app — not in Chat mode, the IDE extension, or mobile.

### Install

1. Register the marketplace once from a terminal: `codex plugin marketplace add astrofoundry/talk-normal`.
2. In the app, select **Codex** (or switch to Work mode), and open **Plugins**.
3. Select the `talk-normal` marketplace in the Plugins Directory and install **talk-normal**.

### Use

Type `@` in the composer and select the talk-normal skill, or ask for it by name.

### Uninstall

Remove the plugin from the **Installed** row of the Plugins Directory.

</details>

<details>
<summary><strong>Claude desktop app</strong></summary>

The desktop app runs the same Claude Code engine and reads the same configuration as the CLI. Install once with the commands from the Claude Code section above — the plugin, the always-on flag, and "stop talk-normal" then work identically in desktop sessions. `/talk-normal:talk-normal` invokes the skill there too.

</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Two native routes: a **custom command** (opt-in, off until you invoke it) or an **extension** (always-on once installed). Pick the command route unless you want the rules on every session.

### Install (command, opt-in)

```bash
mkdir -p ~/.gemini/commands
curl -fsSL https://raw.githubusercontent.com/astrofoundry/talk-normal/main/skills/talk-normal/agents/gemini.toml \
  -o ~/.gemini/commands/talk-normal.toml
```

Start a new session, type `/talk-normal`. It stays on for that session.

### Install (extension, always-on)

```bash
gemini extensions install https://github.com/astrofoundry/talk-normal
```

The extension loads `GEMINI.md`, which imports the full skill, so the rules apply from message one. `git` must be installed.

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

### Install

```bash
qwen extensions install astrofoundry/talk-normal
```

Type `/talk-normal` to invoke the skill explicitly. Installing the extension changes nothing until you invoke the skill.

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

### Install

Start a Kimi Code session, then:

1. Run `/plugins`.
2. Choose **Custom**.
3. Paste `https://github.com/astrofoundry/talk-normal` and press `Enter`.
4. Choose **Trust and install**.

Use `/skill:talk-normal` to invoke the skill explicitly.

### Update

`/plugins` in a Kimi Code session, cursor to **Talk Normal**, press `R`.

### Uninstall

`/plugins` in a Kimi Code session, cursor to **Talk Normal**, press `D`.

</details>

<details>
<summary><strong>Pi</strong></summary>

Pi reads this repository as a native package: `extensions/` provides the session-persistent mode, `skills/` keeps the Agent Skills entry point available.

### Install

```bash
pi install https://github.com/astrofoundry/talk-normal
```

Start a new Pi session and toggle the mode:

```text
/talk-normal
```

The footer shows `● TALK NORMAL` while the mode is active. Run the command again to turn it off, or be explicit with `/talk-normal on`, `/talk-normal off`, or the phrase `stop talk-normal`.

The extension injects the ruleset into the conversation once — not on every request — and injects it again when compaction drops it. The Agent Skills command stays available as an alias: `/skill:talk-normal`. To start a session with the mode already on:

```bash
pi --talk-normal
```

### Verify

```bash
pi list
```

Check that the package is listed, then type `/talk-normal` and look for `● TALK NORMAL` in the footer.

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

### Always-on (optional)

```bash
touch ~/.pi/agent/.talk-normal-always
```

The extension reads the flag at every new, resumed, forked, or reloaded session. A choice already saved in the current session outranks the flag, so `stop talk-normal` keeps that session off. Delete the file to return to on-demand use. If `PI_CODING_AGENT_DIR` is set, put the flag there instead. Run `/reload` or open a new session after changing it.

</details>

<details>
<summary><strong>GitHub Copilot (VS Code and Copilot CLI)</strong></summary>

Copilot reads Agent Skills natively: the same `SKILL.md`, no conversion.

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

### Always-on (optional)

Add the snippet from the top of this file to `.github/copilot-instructions.md` in the project.

</details>

<details>
<summary><strong>Zed</strong></summary>

Zed's Agent reads Agent Skills natively.

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

### Always-on (optional)

Add the snippet from the top of this file to `~/.config/zed/AGENTS.md`.

</details>

<details>
<summary><strong>Cursor, OpenCode, and any other agent-skills harness</strong></summary>

Works with any harness that reads Agent Skills. Swap `-a <agent>` for yours.

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

### Always-on (optional)

Paste the snippet from the top of this file into your agent's persistent rules file. Cursor: **Settings → Rules → User Rules**, or a project rule under `.cursor/rules/` with `alwaysApply: true`. OpenCode: `~/.config/opencode/AGENTS.md`.

</details>

## Activation model

The skill has three states, and installing only reaches the first one:

1. **Installed.** Nothing changes yet. Claude Code and Qwen Code respect `disable-model-invocation: true` in the skill; Codex respects `allow_implicit_invocation: false`. (Harnesses outside this list may auto-activate skills they discover — check yours.)
2. **Invoked.** `/talk-normal:talk-normal` in Claude Code, `/talk-normal` in harnesses that read the skill directly, `$talk-normal` in Codex — the rules then apply for the rest of the session; "stop talk-normal" ends them.
3. **Always-on.** A flag file (Claude Code, Pi) or a pasted snippet (everything else) applies the rules from the first message of every session.

## Troubleshooting

**The slash command is missing.** The command index builds at startup — open a fresh session after you install.

**The always-on flag does nothing.** The flag is read by the plugin's hook, which is also loaded at startup: update the plugin, restart, and check the flag file's exact path (`$CLAUDE_CONFIG_DIR` overrides `~/.claude`).

**`marketplace add` rejects a local path.** Point it at the repository root — the directory that *contains* `.claude-plugin/`, not `.claude-plugin/` itself.

**Output drifts back to slop mid-session.** In a long session, older instructions have less effect on the model. Re-invoke the skill (`/talk-normal:talk-normal` in Claude Code), or switch to always-on so compaction and restarts re-load the rules.

**You want different rules.** The full ruleset is one file: `skills/talk-normal/SKILL.md`. Fork the repository, edit that file, then install your fork (Claude Code: `claude plugin marketplace add <you>/talk-normal`, then `claude plugin install talk-normal@talk-normal`).
