// Turns docs/test-evidence/qa-sweep.json into markdown tables and a stats object.
//   node scripts/qa-analyze.mjs  → writes docs/test-evidence/sweep-summary.md and prints stats JSON
import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("docs/test-evidence/qa-sweep.json", "utf8"));
const { results, access } = data;

const isRedirected = (r) =>
  r.finalPath &&
  !r.finalPath.endsWith(r.path.replace(/^\/(pl|uk)/, "").replace(/^$/, "/")) &&
  r.finalPath !== r.path;
const problems = [];
for (const r of results) {
  const issues = [];
  if (r.error) issues.push(`error: ${r.error}`);
  if (r.status && r.status >= 400) issues.push(`HTTP ${r.status}`);
  if (r.axe?.length) issues.push(`axe: ${r.axe.join("; ")}`);
  if (r.consoleErrors?.length) issues.push(`console: ${r.consoleErrors.slice(0, 2).join(" | ")}`);
  if (r.failedRequests?.length)
    issues.push(`requests: ${[...new Set(r.failedRequests)].slice(0, 3).join(", ")}`);
  if (r.overflow > 1) issues.push(`horizontal overflow ${r.overflow}px`);
  if (r.h1 !== undefined && r.h1 !== 1 && r.status < 400) issues.push(`h1 count ${r.h1}`);
  if (r.textLength !== undefined && r.textLength < 80 && r.status < 400)
    issues.push(`nearly empty (${r.textLength} chars)`);
  if (r.status < 400 && isRedirected(r) && r.persona !== "visitor")
    issues.push(`redirected to ${r.finalPath}`);
  if (issues.length) problems.push({ r, issues });
}

const measured = results.filter((r) => !r.error && r.status);
const stats = {
  sweep_pages: results.length,
  sweep_routes: new Set(results.map((r) => r.path.replace(/^\/(pl|uk)/, ""))).size,
  axe_clean: measured.filter((r) => !r.axe?.length).length,
  access_total: access.length,
  access_pass: access.filter((a) => a.pass).length,
  problem_pages: problems.length,
  status_ok: measured.filter((r) => r.status < 400).length,
};

const lines = [];
lines.push(`Sweep of ${data.base} at ${data.when}.`, "");
lines.push(`| Metric | Value |`, `| --- | --- |`);
for (const [k, v] of Object.entries(stats)) lines.push(`| ${k} | ${v} |`);
lines.push(
  "",
  "### Access-control matrix",
  "",
  "| Path | Who | Expected | Got | Result |",
  "| --- | --- | --- | --- | --- |",
);
for (const a of access)
  lines.push(
    `| \`${a.path}\` | ${a.persona} | ${a.expect} | ${a.status}${a.location ? ` → ${a.location}` : ""} | ${a.pass ? "pass" : "**FAIL**"} |`,
  );
lines.push("", "### Pages with findings", "");
if (!problems.length) lines.push("None.");
else {
  lines.push("| Page | Who | Width | Findings |", "| --- | --- | --- | --- |");
  for (const { r, issues } of problems)
    lines.push(`| \`${r.path}\` | ${r.persona} | ${r.viewport} | ${issues.join("<br>")} |`);
}
writeFileSync("docs/test-evidence/sweep-summary.md", lines.join("\n") + "\n");
console.info(JSON.stringify(stats, null, 2));
