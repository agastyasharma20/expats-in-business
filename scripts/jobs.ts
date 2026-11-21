/**
 * npm run jobs -- <name>: scheduled work, run by a cron or task scheduler (daily for reminders,
 * weekly for roulette). Each job is idempotent, so a repeated run sends nothing twice.
 *   reminders  roadmap steps due in about 7 days (M11)
 *   roulette   weekly Coffee Roulette matching (M12)
 *   purge      daily: removes data past its retention period (concierge 90 days, audit 1 year,
 *              accounts 30 days after a deletion request)
 */
import { sendRoadmapReminders } from "../lib/jobs/reminders";
import { createSeedClient } from "../prisma/seed/index";

type Job = (
  db: ReturnType<typeof createSeedClient>,
  appUrl: string,
) => Promise<Record<string, number>>;

const JOBS: Record<string, Job> = {
  reminders: (db, appUrl) => sendRoadmapReminders(db, appUrl),
  purge: async (db) => {
    const { purgeExpiredData } = await import("../lib/jobs/purge");
    return purgeExpiredData(db);
  },
  roulette: async (db, appUrl) => {
    const { runRoulette } = await import("../lib/jobs/roulette");
    return runRoulette(db, appUrl);
  },
};

async function main() {
  const name = process.argv[2];
  const job = name ? JOBS[name] : undefined;
  if (!job) {
    console.error(`Usage: npm run jobs -- <${Object.keys(JOBS).join("|")}>`);
    process.exit(2);
  }
  const db = createSeedClient();
  const started = Date.now();
  try {
    const result = await job(db, process.env.APP_URL ?? "http://localhost:3000");
    console.info(
      `jobs ${name}: ${JSON.stringify(result)} in ${((Date.now() - started) / 1000).toFixed(1)} s`,
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
