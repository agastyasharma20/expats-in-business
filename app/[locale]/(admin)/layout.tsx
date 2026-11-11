import { requirePermission } from "@/lib/auth/session";

export const instant = false;

/** Admins and chapter leads only; everyone else gets the styled 403. */
export default async function AdminLayout({ children }: LayoutProps<"/[locale]">) {
  await requirePermission("admin.access");
  return children;
}
