import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Scanner } from "@/components/checkin/scanner";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";

type Props = PageProps<"/[locale]/admin/events/[id]/check-in">;

export const instant = false;
export const metadata: Metadata = { robots: { index: false } };

async function CheckInView({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/admin/events/${id}/check-in`);
  const event = await getDb().event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      chapterId: true,
      tickets: {
        where: { status: "confirmed" },
        orderBy: { user: { name: "asc" } },
        select: {
          id: true,
          quantity: true,
          user: { select: { name: true } },
          checkIn: { select: { id: true } },
        },
      },
    },
  });
  if (!event) notFound();
  if (!can(user, "event.scan", { chapterId: event.chapterId })) forbidden();
  const t = await getTranslations("scanner");
  const attendees = event.tickets.map((tk) => ({
    ticketId: tk.id,
    name: tk.quantity > 1 ? `${tk.user.name} (×${tk.quantity})` : tk.user.name,
    checkedIn: Boolean(tk.checkIn),
  }));
  return (
    <>
      <h1 className="text-h2">{t("title", { event: event.title })}</h1>
      <Scanner eventId={event.id} attendees={attendees} confirmed={attendees.length} />
    </>
  );
}

export default function CheckInPage(props: Props) {
  return (
    <div className="container-page flex flex-col gap-6 py-10">
      <Suspense fallback={<Skeleton className="h-[30rem] w-full" />}>
        <CheckInView {...props} />
      </Suspense>
    </div>
  );
}
