// The single list of manifests that carry the plugin version. check.mjs
// verifies the lockstep; release.mjs writes the bump. One list, two readers.

export const MANIFESTS = [
  "package.json",
  ".claude-plugin/plugin.json",
  ".codex-plugin/plugin.json",
  "gemini-extension.json",
  "qwen-extension.json",
  "kimi.plugin.json",
];
