import { AdminNav } from "@/components/admin/admin-nav";
import { requirePermission } from "@/lib/auth/session";

export const instant = false;

/** Admins and chapter leads only; everyone else gets the styled 403. Sub-nav on every admin page. */
export default async function AdminLayout({ children }: LayoutProps<"/[locale]/admin">) {
  const user = await requirePermission("admin.access");
  return (
    <>
      <AdminNav user={user} />
      {children}
    </>
  );
}
