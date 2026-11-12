import { randomBytes } from "node:crypto";

import { createId, faker, type SeedContext } from "./context";
import type { DemoPeople } from "./people";

const DAY = 86_400_000;
const HOUR = 3_600_000;

/**
 * One fictional festival for the demo (every name says "Demo"; partners are placeholders with
 * permission pending). Three weeks out, two days, tiers incl. an early bird and a family ticket,
 * programme on two stages, volunteer shifts, stall applications, FAQ and some group tickets.
 */
export async function seedFestival(ctx: SeedContext, people: DemoPeople) {
  const { db, chapters, today } = ctx;
  const { userIds, byKey } = people;
  const [venue, format] = await Promise.all([
    db.venue.findFirst({ where: { chapterId: chapters.live.id, isDemo: true } }),
    db.eventFormat.findFirst({ where: { slug: "cultural-exchange" } }),
  ]);
  if (!venue || !format) return;
  // Saturday about three weeks out, 12:00 to 22:00 local (stored in UTC; Warsaw is UTC+1 in winter).
  const day1 = new Date(today.getTime() + 21 * DAY + 11 * HOUR);
  const eventId = createId();
  const currency = chapters.live.currency;
  const tiers = {
    early: createId(),
    standard: createId(),
    family: createId(),
    supporter: createId(),
  };

  await db.event.create({
    data: {
      id: eventId,
      kind: "festival",
      slug: "demo-festival-of-cultures",
      chapterId: chapters.live.id,
      formatId: format.id,
      title: "Demo: Festival of Cultures",
      tagline:
        "Two days of food, music and stalls from the communities of our chapter (demo data).",
      summary: "Demo festival: a fictional two-day cultural festival created to show the platform.",
      description:
        "Demo data: this festival is fictional and exists to show how EiB runs large cultural events.\n\n" +
        "Each Cultural Bubble hosts a corner with food, music and stories from home. Workshops for " +
        "newcomers run alongside, and a family area keeps children busy. Buy one ticket for your whole " +
        "group: one QR code admits everyone.",
      startsAt: day1,
      endsAt: new Date(day1.getTime() + DAY + 10 * HOUR),
      venueId: venue.id,
      capacity: 600,
      maxPerOrder: 6,
      status: "published",
      volunteersOpen: true,
      stallsOpen: true,
      stallFeeMinor: null,
      createdById: byKey.lead,
      isDemo: true,
      ticketTypes: {
        create: [
          {
            id: tiers.early,
            name: "Early bird (demo)",
            priceMinor: 2900,
            currency,
            capacity: 100,
            sortOrder: 0,
            description: "Placeholder price for the demo.",
            salesEndAt: new Date(today.getTime() + 7 * DAY),
          },
          {
            id: tiers.standard,
            name: "Standard (demo)",
            priceMinor: 3900,
            currency,
            sortOrder: 1,
            description: "Placeholder price for the demo.",
          },
          {
            id: tiers.family,
            name: "Family day pass (demo)",
            priceMinor: 0,
            currency,
            capacity: 80,
            sortOrder: 2,
            description: "Free placeholder tier for families in the demo.",
          },
          {
            id: tiers.supporter,
            name: "Supporter (demo)",
            priceMinor: 9900,
            currency,
            capacity: 30,
            sortOrder: 3,
            description: "Placeholder: includes a thank-you on the supporters wall.",
          },
        ],
      },
    },
  });

  const slot = (dayOffset: number, hour: number, minutes: number) => {
    const start = new Date(day1.getTime() + dayOffset * DAY + (hour - 12) * HOUR);
    return { startsAt: start, endsAt: new Date(start.getTime() + minutes * 60_000) };
  };
  await db.eventProgrammeItem.createMany({
    data: [
      {
        title: "Opening and welcome (demo)",
        kind: "talk" as const,
        stage: "Main stage",
        ...slot(0, 12, 30),
      },
      {
        title: "Bubble food court opens (demo)",
        kind: "food" as const,
        stage: "Food court",
        ...slot(0, 12, 480),
      },
      {
        title: "Folk music set (demo performer)",
        kind: "performance" as const,
        stage: "Main stage",
        performer: "Demo ensemble",
        ...slot(0, 14, 60),
      },
      {
        title: "Workshop: first steps in Polish (demo)",
        kind: "workshop" as const,
        stage: "Workshop room",
        ...slot(0, 15, 60),
      },
      {
        title: "Kids' crafts corner (demo)",
        kind: "family" as const,
        stage: "Family area",
        ...slot(0, 13, 240),
      },
      {
        title: "Panel: building a business abroad (demo)",
        kind: "talk" as const,
        stage: "Main stage",
        ...slot(1, 13, 60),
      },
      {
        title: "Photo exhibition: our first year (demo)",
        kind: "exhibition" as const,
        stage: "Gallery",
        ...slot(1, 12, 480),
      },
      {
        title: "Closing concert (demo performer)",
        kind: "performance" as const,
        stage: "Main stage",
        performer: "Demo band",
        ...slot(1, 19, 90),
      },
    ].map((item) => ({ ...item, id: createId(), eventId })),
  });

  const shifts = [
    { role: "Welcome desk (demo)", ...slot(0, 11, 180), capacity: 4 },
    { role: "Food court helpers (demo)", ...slot(0, 13, 240), capacity: 6 },
    { role: "Family area crew (demo)", ...slot(1, 12, 240), capacity: 3 },
    { role: "Stage runner (demo)", ...slot(1, 18, 240), capacity: 2 },
  ].map((s) => ({ ...s, id: createId(), eventId }));
  await db.volunteerShift.createMany({ data: shifts });
  await db.volunteerSignup.createMany({
    data: faker.helpers.arrayElements(userIds.slice(50, 80), 6).map((userId, i) => ({
      shiftId: shifts[i % 3]!.id,
      userId,
    })),
    skipDuplicates: true,
  });

  await db.eventFaq.createMany({
    data: [
      {
        question: "Can I bring children? (demo)",
        answer: "Demo answer: yes, the family area runs both days.",
        sortOrder: 0,
      },
      {
        question: "Does one ticket cover my group? (demo)",
        answer: "Demo answer: yes, one order and one QR code admit your whole group (up to 6).",
        sortOrder: 1,
      },
      {
        question: "How do I become a volunteer? (demo)",
        answer: "Demo answer: pick a shift in the Volunteer section.",
        sortOrder: 2,
      },
    ].map((f) => ({ ...f, id: createId(), eventId })),
  });

  for (const [i, tier] of (["headline", "community"] as const).entries()) {
    const sponsor = await db.sponsor.create({
      data: { name: `Partner placeholder ${i + 1} (permission pending)`, isDemo: true },
    });
    await db.sponsorship.create({
      data: {
        sponsorId: sponsor.id,
        eventId,
        tier,
        reportToken: randomBytes(24).toString("base64url"),
        isDemo: true,
      },
    });
  }

  // Some group orders so the console shows sales, and two stall applications to review.
  const buyers = userIds.slice(10, 40);
  await db.ticket.createMany({
    data: buyers.map((userId, i) => ({
      id: createId(),
      eventId,
      userId,
      ticketTypeId: i % 3 === 0 ? tiers.family : i % 3 === 1 ? tiers.early : tiers.standard,
      quantity: (i % 4) + 1,
      status: "confirmed" as const,
      qrToken: randomBytes(18).toString("base64url"),
      paidAt: i % 3 === 0 ? null : today,
      isDemo: true,
    })),
  });
  await db.stallApplication.createMany({
    data: [
      { userId: userIds[45]!, businessName: "Demo stall: street food", category: "food" as const },
      {
        userId: userIds[46]!,
        businessName: "Demo stall: handmade jewellery",
        category: "crafts" as const,
      },
    ].map((s) => ({
      ...s,
      id: createId(),
      eventId,
      description:
        "Demo application: fictional stall created to show the review workflow in the festival console.",
      isDemo: true,
    })),
  });
}
