import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MANIFESTS } from "./manifests.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OTHER_JSON = [".claude-plugin/marketplace.json", "hooks/hooks.json", "hooks/codex.json", "tsconfig.json"];

let failures = 0;

function fail(message) {
  failures += 1;
  console.error(`FAIL ${message}`);
}

function ok(message) {
  console.log(`ok   ${message}`);
}

function readJson(relPath) {
  const value = JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("expected a JSON object");
  }
  return value;
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { cwd: ROOT, encoding: "utf8", ...options });
}

for (const relPath of [...MANIFESTS, ...OTHER_JSON]) {
  try {
    readJson(relPath);
  } catch (error) {
    fail(`${relPath}: ${error.message}`);
  }
}
if (failures > 0) process.exit(1);
ok("all JSON manifests parse");

try {
  const before = failures;
  const base = readJson(MANIFESTS[0]);
  if (typeof base.name !== "string" || !base.name) fail("package.json must have a name");
  if (typeof base.version !== "string" || !base.version) fail("package.json must have a version");
  for (const relPath of MANIFESTS) {
    const manifest = readJson(relPath);
    if (manifest.name !== base.name) fail(`${relPath}: name ${manifest.name} != ${base.name}`);
    if (manifest.version !== base.version) {
      fail(`${relPath}: version ${manifest.version} != ${base.version}`);
    }
  }
  if (failures === before) ok(`name/version lockstep: ${base.name}@${base.version}`);
} catch (error) {
  fail(`lockstep check errored: ${error.message}`);
}

const canonical = fs.readFileSync(path.join(ROOT, "skills/talk-normal/SKILL.md"), "utf8");
const frontmatter = canonical.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
if (!frontmatter || !canonical.slice(frontmatter[0].length).trim()) {
  fail("SKILL.md must contain frontmatter followed by instructions");
  process.exit(1);
}

{
  const description = frontmatter[1].match(/^description: '(.*)'\r?$/m)?.[1];
  if (!description) {
    fail("SKILL.md frontmatter: description not found in expected single-quoted form");
  } else if (description.length > 1024) {
    fail(`SKILL.md description is ${description.length} chars; the skill limit is 1024`);
  } else {
    ok(`skill description within the limit (${description.length}/1024 chars)`);
  }
}

const body = canonical.slice(frontmatter[0].length).trim();
const expectedPrompt = `TALK-NORMAL ACTIVE. Apply the ruleset below to every response.\n\n${body}\n`;
const escaped = `${expectedPrompt}\n{{args}}\n`.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
const copies = new Map([
  [".cursor/skills/talk-normal/SKILL.md", canonical],
  ["skills/talk-normal/agents/gemini.toml", [
    "# Generated from skills/talk-normal/SKILL.md by pnpm check --sync.",
    'description = "Plain, unambiguous, action-first output."',
    "",
    `prompt = """\n${escaped}"""`,
    "",
  ].join("\n")],
]);
const readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
const start = "<!-- talk-normal:instructions:start -->";
const end = "<!-- talk-normal:instructions:end -->";
const before = readme.split(start);
const after = readme.split(end);
if (before.length !== 2 || after.length !== 2 || readme.indexOf(end) < readme.indexOf(start)) {
  fail("README must contain one ordered pair of instruction markers");
} else {
  copies.set("README.md", `${before[0]}${start}\n\n\`\`\`\`markdown\n${expectedPrompt}\`\`\`\`\n\n${end}${after[1]}`);
}
for (const [file, expected] of copies) {
  const target = path.join(ROOT, file);
  if (fs.existsSync(target) && fs.readFileSync(target, "utf8") === expected) {
    ok(`${file} contains the complete skill`);
  } else if (process.argv.includes("--sync")) {
    fs.writeFileSync(target, expected);
    ok(`updated ${file}`);
  } else {
    fail(`${file} differs from the full skill; run pnpm check --sync`);
  }
}

for (const file of ["hooks/always-on.mjs", "hooks/codex-session-start.mjs"]) {
  const hook = run(process.execPath, [file]);
  if (hook.status !== 0 || hook.stdout !== expectedPrompt) {
    fail(`${file}: expected the full canonical prompt and exit 0`);
  } else {
    ok(`${file} prints the complete rules`);
  }
}

{
  const tokenEstimate = Math.ceil(expectedPrompt.length / 4);
  if (tokenEstimate > 2300) {
    fail(`codex hook output near Codex's 2500-token cap: ~${tokenEstimate} tokens`);
  } else {
    ok(`hook output size estimate within budget (~${tokenEstimate} tokens)`);
  }
}

try {
  const before = failures;
  const manifest = readJson(".codex-plugin/plugin.json");
  const listing = manifest.interface;
  const limits = { displayName: 30, shortDescription: 30, longDescription: 4000, developerName: 80 };
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof listing?.[field] !== "string" || !listing[field].trim() || listing[field].length > limit) {
      fail(`OpenAI interface.${field} must contain 1–${limit} characters`);
    }
  }
  if (manifest.author?.name !== listing?.developerName) fail("OpenAI author and developer names differ");
  if (/[\r\n]/.test(listing?.shortDescription)) fail("OpenAI short description must fit on one line");
  const prompts = listing?.defaultPrompt;
  if (!Array.isArray(prompts) || prompts.length > 3 || prompts.some(value =>
    typeof value !== "string" || !value.trim() || value.length > 128 || /[\r\n]/.test(value)
  )) {
    fail("OpenAI starter prompts must contain at most three non-empty lines of up to 128 characters each");
  } else if (new Set(prompts.map(value => value.normalize("NFKC").trim().replace(/\s+/g, " "))).size !== prompts.length) {
    fail("OpenAI starter prompts must be unique after Unicode and whitespace normalization");
  }
  if (manifest.hooks !== "./hooks/codex.json") fail("OpenAI must select its own hook configuration");
  if (manifest.skills !== "./skills/") fail("OpenAI must load the canonical skills directory");
  for (const file of ["qwen-extension.json", "kimi.plugin.json"]) {
    const skills = readJson(file).skills;
    if (typeof skills !== "string" || path.resolve(ROOT, skills) !== path.resolve(ROOT, "skills")) {
      fail(`${file} does not point to the canonical skills directory`);
    }
  }
  const gemini = readJson("gemini-extension.json");
  const context = fs.readFileSync(path.join(ROOT, gemini.contextFileName), "utf8");
  if (!/^@\.\/skills\/talk-normal\/SKILL\.md\r?$/m.test(context)) fail("Gemini context does not import the canonical skill");
  if (failures === before) ok("platform paths and OpenAI listing limits checked");
} catch (error) {
  fail(`platform metadata: ${error.message}`);
}

{
  const onLabel = `TALK-NORMAL:${readJson(".claude-plugin/plugin.json").version}`;
  const badge = run(process.execPath, ["statusline/badge.mjs"]);
  if (badge.status !== 0 || !badge.stdout.includes(onLabel)) {
    fail(`badge: expected ${onLabel} on stdout`);
  } else {
    ok("badge prints the installed version");
  }
}

{
  const tsc = run("pnpm", ["exec", "tsc", "--noEmit"]);
  if (tsc.status !== 0) {
    fail(`typecheck: ${tsc.error?.message ?? ""}${tsc.stdout}${tsc.stderr}`);
  } else {
    ok("typecheck");
  }
}

{
  const marketplace = run("claude", ["plugin", "validate", ".", "--strict"]);
  if (marketplace.status !== 0) {
    fail(`claude plugin validate (marketplace): ${marketplace.error?.message ?? ""}${marketplace.stdout}${marketplace.stderr}`);
  } else {
    ok("claude plugin validate --strict (marketplace manifest)");
  }

  // `claude plugin validate` only checks marketplace.json when both manifests
  // exist, so validate the plugin manifest on a copy without marketplace.json.
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "talk-normal-plugin-"));
  try {
    fs.cpSync(ROOT, scratch, {
      recursive: true,
      filter: (src) => !path.relative(ROOT, src).split(path.sep).some(part => ["node_modules", ".git", ".pnpm-store"].includes(part)),
    });
    fs.rmSync(path.join(scratch, ".claude-plugin/marketplace.json"));
    const plugin = run("claude", ["plugin", "validate", scratch, "--strict"]);
    if (plugin.status !== 0) {
      fail(`claude plugin validate (plugin): ${plugin.error?.message ?? ""}${plugin.stdout}${plugin.stderr}`);
    } else {
      ok("claude plugin validate --strict (plugin manifest)");
    }
  } catch (error) {
    fail(`plugin check: ${error.message}`);
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
