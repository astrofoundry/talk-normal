# How to install

The plugin is on by default where the harness lets a plugin apply rules at session start: Claude Code, the Claude desktop app, Pi, and Gemini's extension route. Harnesses that load skills only on invocation (Codex, Qwen, Kimi, Copilot, Zed, Cursor, OpenCode) activate per session with one command. Every section below states which model applies.

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

- For the current session: say "stop talk-normal". Type `/talk-normal:talk-normal` to turn it back on (autocomplete completes it from `/talk`).
- For every session: `touch ~/.claude/.talk-normal-off`. Delete the file to return to on by default. The hook reads `$CLAUDE_CONFIG_DIR` when you moved your config directory.
- Completely: `claude plugin disable talk-normal`, or uninstall below.

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

The plugin ships `statusline/badge.mjs`: it reads the statusline JSON from stdin and prints a green `[TALK-NORMAL:<installed version>]` while the mode is on, or a dim `[TALK-NORMAL:OFF]` while it is off. Sessions follow the default (on, unless `.talk-normal-off` exists); "stop talk-normal" and `/talk-normal:talk-normal` record per-session changes.

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
<summary><strong>Claude desktop app</strong></summary>

The plugin works in the **Code** tab only. The Chat tab is a plain conversation surface without Claude Code features — no plugins apply there.

Install once with the commands from the Claude Code section above. Local and SSH Code sessions read the same configuration as the CLI, so the rules load at session start, "stop talk-normal" pauses them, and `/talk-normal:talk-normal` re-invokes the skill. The **+** button next to the prompt box lists installed plugins and their skills under **Plugins**.

Two documented limits: cloud sessions have no plugin browser — declare the plugin in the project's `.claude/settings.json` under `enabledPlugins` instead — and WSL sessions do not load plugins.

</details>

<details>
<summary><strong>Codex CLI</strong></summary>

Codex loads plugin skills on invocation; there is no plugin-owned always-on. One command per session.

### Install

Two phases: register the marketplace from the command line, then install the plugin in the plugin browser.

```bash
codex plugin marketplace add astrofoundry/talk-normal
```

Then start `codex` and open the plugin browser — the **Plugins** screen, listed in the `/` command menu. Select the `talk-normal` marketplace and install **talk-normal**. There is no CLI install command; installation goes through this screen.

### Use

Type `$talk-normal` in the composer at the start of a session. The rules then apply for that session; "stop talk-normal" ends them. Codex does not activate the skill on its own (`allow_implicit_invocation: false`).

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

</details>

<details>
<summary><strong>ChatGPT desktop app</strong></summary>

Plugins run in Work mode and in Codex inside the ChatGPT desktop app — not in Chat mode, the IDE extension, or mobile. Skills activate per chat.

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

The footer shows `● TALK NORMAL` while the mode is active.

### Turn it off

- For the current session: `/talk-normal off`, `/talk-normal` (toggle), or the phrase `stop talk-normal`. A saved choice for the session outranks the default.
- For every session: `touch ~/.pi/agent/.talk-normal-off`. Delete the file to return to on by default. If `PI_CODING_AGENT_DIR` is set, put the flag there instead. Run `/reload` or open a new session after changing it.

The extension injects the ruleset into the conversation once — not on every request — and injects it again when compaction drops it. The Agent Skills command stays available as an alias: `/skill:talk-normal`.

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

## Activation model

- **On by default** — Claude Code, the Claude desktop app, Pi, and Gemini's extension route. The plugin applies the rules from the first message; you opt out per session ("stop talk-normal") or for good (the `.talk-normal-off` flag, or uninstall).
- **Per session** — Codex, the ChatGPT desktop app, Qwen, Kimi, Copilot, Zed, Cursor, OpenCode. Those harnesses load skills only on invocation, so you type the command once per session.

## Troubleshooting

**The slash command is missing.** The command index builds at startup — open a fresh session after you install.

**The rules do not apply in a new session (Claude Code).** Check for a leftover opt-out: `ls ~/.claude/.talk-normal-off`. Also update the plugin and restart — hooks load at startup.

**`marketplace add` rejects a local path.** Point it at the repository root — the directory that *contains* `.claude-plugin/`, not `.claude-plugin/` itself.

**Output drifts back to slop mid-session.** In a long session, older instructions have less effect on the model. Re-invoke the skill (`/talk-normal:talk-normal` in Claude Code), and report the drift — the ruleset wording is tunable.

**You want different rules.** The full ruleset is one file: `skills/talk-normal/SKILL.md`. Fork the repository, edit that file, then install your fork (Claude Code: `claude plugin marketplace add <you>/talk-normal`, then `claude plugin install talk-normal@talk-normal`).
