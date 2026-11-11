import { redirect } from "next/navigation";

import { getDb } from "@/lib/db";
import { hashToken } from "@/lib/tokens";

/** Link from the verification email (an external caller). Single use, expires after 24 h. */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const db = getDb();
  const row = token
    ? await db.userEmail.findUnique({ where: { tokenHash: hashToken(token) } })
    : null;
  if (!row || !row.tokenExpiresAt || row.tokenExpiresAt < new Date())
    redirect("/settings/email?status=invalid");
  await db.userEmail.update({
    where: { id: row.id },
    data: { verifiedAt: new Date(), tokenHash: null, tokenExpiresAt: null },
  });
  redirect("/settings/email?status=verified");
}
