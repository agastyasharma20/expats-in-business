import { connection } from "next/server";

import { isDatabaseReachable } from "@/lib/db";

/** Liveness and database check for local setup, CI and uptime monitors. */
export async function GET() {
  await connection();
  const db = await isDatabaseReachable();
  return Response.json({ status: "ok", db }, { headers: { "Cache-Control": "no-store" } });
}
