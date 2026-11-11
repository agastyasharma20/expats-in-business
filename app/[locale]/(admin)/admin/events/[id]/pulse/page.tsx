import { Suspense } from "react";
import type { Metadata } from "next";
import { forbidden, notFound } from "next/navigation";

import { PulseScreen } from "@/components/checkin/pulse-screen";
import { Skeleton } from "@/components/ui/skeleton";
import { can } from "@/lib/auth/permissions";
import { requireUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { pulseSnapshot } from "@/lib/events/checkin";

type Props = PageProps<"/[locale]/admin/events/[id]/pulse">;

export const instant = false;
export const metadata: Metadata = { title: "Pulse", robots: { index: false } };

async function PulseView({ params }: Props) {
  const { id } = await params;
  const user = await requireUser(`/admin/events/${id}/pulse`);
  const event = await getDb().event.findUnique({
    where: { id },
    select: { slug: true, chapterId: true },
  });
  if (!event) notFound();
  if (!can(user, "event.pulse", { chapterId: event.chapterId })) forbidden();
  return <PulseScreen slug={event.slug} initial={await pulseSnapshot(id)} />;
}

export default function PulsePage(props: Props) {
  return (
    <div className="container-page py-8">
      <Suspense fallback={<Skeleton className="h-[80vh] w-full" />}>
        <PulseView {...props} />
      </Suspense>
    </div>
  );
}
