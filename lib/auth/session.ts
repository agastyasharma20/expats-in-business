import { ENTITLED_STATUSES } from "@/lib/billing/rules";
import { headers } from "next/headers";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";

import { getDb } from "@/lib/db";

import { auth } from "./auth";
import { can, type Action, type AuthUser, type PlanTier } from "./permissions";

export type SessionUser = AuthUser & { name: string; email: string; image: string | null };

/** The signed-in user with roles, plan tiers and capabilities; null for visitors. One query per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = await getDb().user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      roles: { select: { role: true, chapterId: true } },
      subscriptions: {
        where: { status: { in: [...ENTITLED_STATUSES] } },
        select: { plan: { select: { tier: true } } },
      },
      _count: { select: { providers: true } },
    },
  });
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    roles: user.roles,
    tiers: user.subscriptions.map((s) => s.plan.tier as PlanTier),
    ownsProvider: user._count.providers > 0,
  };
});

/** Signed-in user or a single redirect to /sign-in (with a return path). */
export async function requireUser(next = "/dashboard"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}

/** Signed-in user allowed to do `action`, otherwise the styled 403 (app/[locale]/forbidden.tsx). */
export async function requirePermission(
  action: Action,
  scope: { chapterId?: string } = {},
): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user, action, scope)) forbidden();
  return user;
}
