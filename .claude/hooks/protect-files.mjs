// PreToolUse hook: block edits to secrets, lockfiles and git internals.
// Exit code 2 blocks the edit and sends the reason back to Claude.
let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const file = String(input?.tool_input?.file_path || "").replace(/\\/g, "/");
    const blocked = [
      /(^|\/)\.env(\.(?!example$)[^/]*)?$/,
      /(^|\/)\.git\//,
      /(^|\/)package-lock\.json$/,
    ];
    if (blocked.some((re) => re.test(file))) {
      process.stderr.write(
        `Blocked edit to ${file}: secrets, lockfiles and .git are protected. ` +
          "Add new env names to .env.example; change dependencies with npm install.",
      );
      process.exit(2);
    }
  } catch {
    // if input can't be parsed, don't block
  }
  process.exit(0);
});
