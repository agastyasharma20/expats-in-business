import type { PrismaClient } from "@/generated/prisma/client";
import { actionEmail, sendEmail } from "@/lib/email";
import { emailTranslator, localizedUrl } from "@/lib/i18n/email";

/** Reminder window: steps due in 6 to 8 days from now (the job runs daily, so each lands once). */
export const REMINDER_DAYS = 7;
const WINDOW_DAYS = 1;

/**
 * Emails each member one reminder listing their open roadmap steps due about 7 days from now,
 * then marks those steps as reminded (never twice; a changed due date resets it). Returns counts.
 */
export async function sendRoadmapReminders(db: PrismaClient, appUrl: string, now = new Date()) {
  const from = new Date(now.getTime() + (REMINDER_DAYS - WINDOW_DAYS) * 86_400_000);
  const to = new Date(now.getTime() + (REMINDER_DAYS + WINDOW_DAYS) * 86_400_000);
  const due = await db.userTask.findMany({
    where: {
      doneAt: null,
      remindedAt: null,
      dueAt: { gte: from, lt: to },
      user: { deletionRequestedAt: null },
    },
    select: {
      id: true,
      dueAt: true,
      userId: true,
      user: { select: { email: true, locale: true } },
      task: { select: { title: true } },
    },
    orderBy: { dueAt: "asc" },
  });
  const byUser = new Map<string, typeof due>();
  for (const row of due) byUser.set(row.userId, [...(byUser.get(row.userId) ?? []), row]);

  let emails = 0;
  for (const rows of byUser.values()) {
    const { locale, t } = emailTranslator(rows[0]!.user.locale);
    const list = rows
      .map((r) => `• ${r.task.title} (${r.dueAt.toISOString().slice(0, 10)})`)
      .join("\n");
    const message = actionEmail({
      heading: t("reminders.heading"),
      body: `${t("reminders.intro")}\n\n${list}\n\n${t("reminders.outro")}`,
      cta: t("reminders.cta"),
      url: localizedUrl("/roadmap", locale, appUrl),
    });
    await sendEmail({ to: rows[0]!.user.email, subject: t("reminders.subject"), ...message });
    await db.userTask.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { remindedAt: now },
    });
    emails += 1;
  }
  return { emails, tasks: due.length };
}
