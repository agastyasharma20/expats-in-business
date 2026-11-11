import "server-only";

import { getDb } from "@/lib/db";

/**
 * In-app notifications. `type` selects a message (notifications.types.<type>) rendered in the
 * reader's language; `data` holds only the values that message needs (e.g. a first name).
 */
export type NotificationType =
  | "connectionRequest"
  | "connectionAccepted"
  | "quoteRequest"
  | "quoteAccepted"
  | "quoteDeclined"
  | "verificationApproved"
  | "verificationRejected";

export async function notify(
  userId: string,
  type: NotificationType,
  href: string,
  data: Record<string, string> = {},
) {
  await getDb().notification.create({ data: { userId, type, href, data } });
}

export function unreadCount(userId: string) {
  return getDb().notification.count({ where: { userId, readAt: null } });
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}
