import "server-only";

import { forbidden } from "next/navigation";

import { isAdmin } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/session";
import { withinLimits } from "@/lib/security/limits";

/** Every admin action: signed in, admin role (checked server-side), per-account rate limit. */
export async function requireAdminAction(bucket: "admin" | "broadcast" = "admin") {
  const user = await requirePermission("admin.access");
  if (!isAdmin(user)) forbidden();
  if (!(await withinLimits(user.id, bucket))) return { user, limited: true as const };
  return { user, limited: false as const };
}
