// npm run demo:reset: restores the exact demo state in one go (target < 30 s, timing logged).
// Removes the demo layer and everything members created during a demo, then reseeds.
import { createSeedClient, runSeed } from "../prisma/seed/index";

const TARGET_SECONDS = 30;
const db = createSeedClient();
const started = performance.now();

try {
  // Rows that demos create without an isDemo flag (sessions, logs, rate limits, consents...).
  await db.$executeRawUnsafe(
    'TRUNCATE "session", "verification", "ConciergeQuery", "AuditLog", "RateLimit", "UserTask", "PointsEntry" RESTART IDENTITY',
  );
  await runSeed(db);
  const seconds = (performance.now() - started) / 1000;
  const verdict = seconds <= TARGET_SECONDS ? "within" : "OVER";
  console.info(
    `demo:reset finished in ${seconds.toFixed(1)} s (${verdict} the ${TARGET_SECONDS} s target)`,
  );
  if (seconds > TARGET_SECONDS) process.exitCode = 1;
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
