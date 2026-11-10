import type { Prisma } from "../../../generated/prisma/client";
import { utcToZoned, zonedTimeToUtc } from "../../../lib/time";

import { createId, faker, insertMany, slugify, token, type SeedContext } from "./context";
import type { DemoPeople } from "./people";

const PAST = 24;
const UPCOMING = 6;
const PHOTO_PLACEHOLDER = "/images/placeholders/event-photo.svg";

export type DemoEvents = { pastEventIds: string[]; upcomingEventIds: string[] };

/** Fictional venues: clearly labelled, no real addresses. */
const venueNames = [
  "Demo venue: Old Town café",
  "Demo venue: riverside co-working",
  "Demo venue: business hub",
  "Demo venue: university hall",
];

export async function seedEvents(ctx: SeedContext, people: DemoPeople): Promise<DemoEvents> {
  const { db, chapters, today } = ctx;
  const chapter = chapters.live;
  const formats = await db.eventFormat.findMany({ orderBy: { sortOrder: "asc" } });

  const venues = venueNames.map((name) => ({
    id: createId(),
    chapterId: chapter.id,
    name,
    isDemo: true,
  }));
  await db.venue.createMany({ data: venues });

  const sponsors = [
    "Demo sponsor: coffee roaster",
    "Demo sponsor: co-working space",
    "Demo sponsor: language school",
  ].map((name) => ({
    id: createId(),
    name,
    isDemo: true,
  }));
  await db.sponsor.createMany({ data: sponsors });

  const events: Prisma.EventCreateManyInput[] = [];
  const ticketTypes: {
    id: string;
    eventId: string;
    name: string;
    priceMinor: number;
    currency: string;
    capacity: number | null;
  }[] = [];
  const pastEventIds: string[] = [];
  const upcomingEventIds: string[] = [];

  for (let i = 0; i < PAST + UPCOMING; i += 1) {
    const upcoming = i >= PAST;
    // Sessions every two weeks: 24 in the past, 6 ahead. Evenings, 18:00 in the chapter's zone.
    const offsetDays = upcoming ? 7 + (i - PAST) * 14 : -(PAST - i) * 14;
    const day = utcToZoned(new Date(today.getTime() + offsetDays * 86_400_000), chapter.timezone);
    const format = formats[i % formats.length]!;
    const online = format.slug === "virtual-connect";
    const startsAt = zonedTimeToUtc(
      { ...day, hour: online ? 19 : 18, minute: 0 },
      chapter.timezone,
    );
    const endsAt = new Date(startsAt.getTime() + format.defaultDurationMin * 60_000);
    const id = createId();
    const number = i + 1;
    events.push({
      id,
      slug: `${slugify(format.name)}-demo-${number}`,
      chapterId: chapter.id,
      formatId: format.id,
      title: `${format.name} · Demo session ${number}`,
      summary: `Demo data: a fictional ${format.name} session for the platform demo.`,
      description: `${format.description}\n\nDemo data: this event is fictional and exists to show how the platform works.`,
      startsAt,
      endsAt,
      venueId: online ? null : venues[i % venues.length]!.id,
      onlineUrl: online ? "https://example.com/demo-online-session" : null,
      capacity: online ? 100 : faker.helpers.arrayElement([30, 40, 50]),
      status: "published",
      createdById: people.byKey.lead,
      isDemo: true,
    });
    (upcoming ? upcomingEventIds : pastEventIds).push(id);
    const paid = format.slug === "business-development";
    ticketTypes.push({
      id: createId(),
      eventId: id,
      name: paid ? "Workshop seat (demo price)" : "Free entry",
      priceMinor: paid ? 3900 : 0,
      currency: chapter.currency,
      capacity: null,
    });
  }
  await db.event.createMany({ data: events });
  await db.ticketType.createMany({ data: ticketTypes });

  const tickets: {
    id: string;
    eventId: string;
    ticketTypeId: string;
    userId: string;
    status: "confirmed" | "waitlisted";
    qrToken: string;
    paidAt: Date | null;
    isDemo: boolean;
    createdAt: Date;
  }[] = [];
  const checkIns: {
    id: string;
    ticketId: string;
    eventId: string;
    userId: string;
    scannedById: string;
    method: "qr" | "manual";
    checkedInAt: Date;
  }[] = [];

  for (const event of events) {
    const type = ticketTypes.find((t) => t.eventId === event.id)!;
    const upcoming = upcomingEventIds.includes(event.id as string);
    const take = upcoming
      ? faker.number.int({ min: 8, max: Math.min(event.capacity as number, 28) })
      : faker.number.int({ min: 15, max: Math.min(event.capacity as number, 45) });
    const attendees = faker.helpers.arrayElements(people.userIds, take);
    if (upcoming && !attendees.includes(people.byKey.priya!)) attendees.push(people.byKey.priya!);
    for (const userId of attendees) {
      const ticketId = createId();
      const createdAt = new Date(
        (event.startsAt as Date).getTime() - faker.number.int({ min: 1, max: 20 }) * 86_400_000,
      );
      tickets.push({
        id: ticketId,
        eventId: event.id as string,
        ticketTypeId: type.id,
        userId,
        status: "confirmed",
        qrToken: token(32),
        paidAt: type.priceMinor > 0 ? createdAt : null,
        isDemo: true,
        createdAt,
      });
      if (!upcoming && faker.datatype.boolean({ probability: 0.82 })) {
        checkIns.push({
          id: createId(),
          ticketId,
          eventId: event.id as string,
          userId,
          scannedById: people.byKey.lead!,
          method: faker.datatype.boolean({ probability: 0.9 }) ? "qr" : "manual",
          checkedInAt: new Date(
            (event.startsAt as Date).getTime() + faker.number.int({ min: 0, max: 50 }) * 60_000,
          ),
        });
      }
    }
  }
  await insertMany(tickets, (chunk) => db.ticket.createMany({ data: chunk }));
  await insertMany(checkIns, (chunk) => db.checkIn.createMany({ data: chunk }));

  // Sponsors on every third past event, plus the next upcoming one (for the Pulse screen demo).
  const sponsored = [...pastEventIds.filter((_, i) => i % 3 === 0), upcomingEventIds[0]!];
  await db.sponsorship.createMany({
    data: sponsored.map((eventId, i) => ({
      id: createId(),
      sponsorId: sponsors[i % sponsors.length]!.id,
      eventId,
      tier: "Session partner (demo)",
      reportToken: token(40),
      isDemo: true,
    })),
  });
  await db.eventPhoto.createMany({
    data: pastEventIds.flatMap((eventId) =>
      [0, 1, 2].map((n) => ({
        id: createId(),
        eventId,
        url: PHOTO_PLACEHOLDER,
        alt: "Illustrated placeholder, not a real EiB photo",
        isPlaceholder: true,
        sortOrder: n,
      })),
    ),
  });

  return { pastEventIds, upcomingEventIds };
}
