import { connection } from "next/server";
import { getTranslations } from "next-intl/server";

import { isDatabaseReachable } from "@/lib/db";

/** Request-time database check for the Milestone 1 home page. */
export async function DatabaseStatus() {
  await connection();
  const [reachable, t] = await Promise.all([isDatabaseReachable(), getTranslations("home")]);

  return (
    <p
      role="status"
      data-testid="db-status"
      data-db={reachable ? "up" : "down"}
      className={reachable ? "font-semibold text-success" : "font-semibold text-danger"}
    >
      {/* Text, not only colour, carries the meaning. */}
      {reachable ? t("dbUp") : t("dbDown")}
    </p>
  );
}
