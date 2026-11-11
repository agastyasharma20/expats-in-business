import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { PlanTier } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";

export type PricingPlan = {
  id: string;
  code: string;
  tier: PlanTier;
  name: string;
  interval: "month" | "year" | null;
  amountMinor: number;
  currency: string;
  perLeadFeeMinor: number | null;
  contactOnly: boolean;
  features: string[];
};

/** Active plans from the database (prices are data, never hard-coded). Cached; tag "plans". */
export async function getPlans(): Promise<PricingPlan[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");
  const rows = await getDb().plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      code: true,
      tier: true,
      name: true,
      interval: true,
      amountMinor: true,
      currency: true,
      perLeadFeeMinor: true,
      contactOnly: true,
      features: true,
    },
  });
  return rows;
}
