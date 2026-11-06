// PostToolUse hook: format the file Claude just edited with Prettier.
// Cross-platform (no jq/bash needed on Windows). Never blocks: always exits 0.
import { execFileSync } from "node:child_process";

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const file = input?.tool_input?.file_path;
    if (!file || !/\.(ts|tsx|js|mjs|cjs|json|css|md|mdx|yml|yaml)$/i.test(file)) process.exit(0);
    execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prettier", "--write", file], {
      stdio: "ignore",
      shell: process.platform === "win32",
    });
  } catch {
    // formatting problems must never block Claude; lint will catch them
  }
  process.exit(0);
});
