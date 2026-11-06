// Placeholder for npm scripts whose feature arrives in a later milestone. Always exits 0.
// Usage: node scripts/stub.mjs <script-name> <milestone-number>
const [name = "this script", milestone = "?"] = process.argv.slice(2);
console.info(
  `"npm run ${name}" is not implemented yet: it arrives in Milestone ${milestone}. Nothing to do.`,
);
process.exit(0);
