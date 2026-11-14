import { z } from "zod";

import { getDb } from "@/lib/db";

const idSchema = z.string().trim().min(1).max(40);

/** Team and founder photos from the database. Hidden members' photos are not served. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = idSchema.safeParse((await params).id);
  if (!parsed.success) return new Response(null, { status: 404 });
  const db = getDb();
  const row =
    parsed.data === "founder"
      ? await db.founderMessage.findUnique({
          where: { key: "founder" },
          select: { photo: true, photoType: true },
        })
      : await db.teamMember.findFirst({
          where: { id: parsed.data, isVisible: true },
          select: { photo: true, photoType: true },
        });
  if (!row?.photo || !row.photoType) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(row.photo), {
    headers: {
      "Content-Type": row.photoType,
      // The URL carries a version, so a changed photo gets a new URL.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
