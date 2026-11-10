import { requireUser } from "@/lib/auth/session";

// Personalised area: blocking navigation is expected, so opt out of instant validation.
export const instant = false;

/** Guard for every member page: one redirect to /sign-in when signed out (no middleware chains). */
export default async function MemberLayout({ children }: LayoutProps<"/[locale]">) {
  await requireUser();
  return children;
}
