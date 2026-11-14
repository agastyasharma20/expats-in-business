import { headers } from "next/headers";
import { z } from "zod";

import { clientIp } from "@/lib/client-ip";
import { getDb } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";

const idSchema = z.string().trim().min(1).max(40);

/**
 * Reveals one team member's email, only if they opted in. POST only and rate-limited per IP, so the
 * address is never in the page HTML and simple scrapers do not collect it.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) return Response.json({ error: "invalid" }, { status: 400 });
  const ip = clientIp((await headers()).get("x-forwarded-for"), getEnv().TRUSTED_PROXY_HOPS);
  if (!(await rateLimit(`team-email:${ip ?? "unknown"}`, 20, 600)).ok) {
    return Response.json({ error: "rateLimited" }, { status: 429 });
  }
  const row = await getDb().teamMember.findFirst({
    where: { id: parsed.data, isVisible: true, showEmail: true, email: { not: null } },
    select: { email: true },
  });
  if (!row?.email) return Response.json({ error: "notFound" }, { status: 404 });
  return Response.json({ email: row.email }, { headers: { "Cache-Control": "no-store" } });
}
