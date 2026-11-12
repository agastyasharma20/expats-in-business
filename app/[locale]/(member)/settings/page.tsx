import { redirect } from "next/navigation";

// Session-bound page: blocking navigation is expected (no instant prerender).
export const instant = false;

export default function SettingsIndex() {
  redirect("/settings/profile");
}
