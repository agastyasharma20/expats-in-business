import type { PrismaClient } from "../../../generated/prisma/client";

import {
  badges,
  eventFormats,
  goals,
  industries,
  plans,
  providerCategories,
  roadmapTasks,
} from "./catalogs";
import { chapters, countries } from "./geography";

/** Real configuration: upserted by key, never deleted by demo resets. */
export async function seedBase(db: PrismaClient) {
  for (const country of countries) {
    await db.country.upsert({ where: { code: country.code }, update: country, create: country });
  }
  for (const chapter of chapters) {
    const country = countries.find((c) => c.code === chapter.countryCode);
    if (!country) throw new Error(`Unknown country ${chapter.countryCode} for ${chapter.slug}`);
    const data = {
      ...chapter,
      timezone: country.defaultTimezone,
      currency: country.defaultCurrency,
      locales: country.locales,
    };
    await db.chapter.upsert({ where: { slug: chapter.slug }, update: data, create: data });
  }

  for (const [index, format] of eventFormats.entries()) {
    const data = {
      name: format.name,
      description: format.description,
      defaultDurationMin: format.minutes,
      sortOrder: index,
    };
    await db.eventFormat.upsert({
      where: { slug: format.slug },
      update: data,
      create: { slug: format.slug, ...data },
    });
  }
  for (const [index, name] of industries.entries()) {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")
      .replace(/(^-|-$)/g, "");
    await db.industry.upsert({
      where: { slug },
      update: { name, sortOrder: index },
      create: { slug, name, sortOrder: index },
    });
  }
  for (const [index, goal] of goals.entries()) {
    await db.goal.upsert({
      where: { slug: goal.slug },
      update: { name: goal.name, sortOrder: index },
      create: { ...goal, sortOrder: index },
    });
  }
  for (const [index, category] of providerCategories.entries()) {
    await db.providerCategory.upsert({
      where: { slug: category.slug },
      update: { name: category.name, sortOrder: index },
      create: { ...category, sortOrder: index },
    });
  }
  for (const badge of badges) {
    await db.badge.upsert({
      where: { slug: badge.slug },
      update: { name: badge.name },
      create: badge,
    });
  }

  const home = countries[0]!;
  for (const [index, plan] of plans.entries()) {
    const data = {
      tier: plan.tier,
      name: plan.name,
      interval: plan.interval,
      amountMinor: Math.round(plan.amount * 100),
      currency: home.defaultCurrency,
      perLeadFeeMinor: plan.perLeadFee ? Math.round(plan.perLeadFee * 100) : null,
      contactOnly: plan.contactOnly ?? false,
      features: plan.features,
      priceStatus: "proposal" as const,
      sortOrder: index,
    };
    await db.plan.upsert({
      where: { code: plan.code },
      update: data,
      create: { code: plan.code, ...data },
    });
  }

  const template = await db.roadmapTemplate.upsert({
    where: { slug: `${home.code.toLowerCase()}-newcomer` },
    update: {},
    create: {
      slug: `${home.code.toLowerCase()}-newcomer`,
      countryCode: home.code,
      name: "Landing Roadmap 30/60/90",
    },
  });
  for (const [index, task] of roadmapTasks.entries()) {
    const data = {
      title: task.title,
      description: task.guideSlug
        ? `See the "${task.guideSlug}" guide for the official steps and sources.`
        : "A step to help you feel at home in the community.",
      guideSlug: task.guideSlug,
      appliesTo: task.appliesTo,
      forGoals: task.forGoals,
      dependsOn: task.dependsOn,
      dueOffsetDays: task.due,
      sortOrder: index,
    };
    await db.roadmapTask.upsert({
      where: { templateId_slug: { templateId: template.id, slug: task.slug } },
      update: data,
      create: { templateId: template.id, slug: task.slug, ...data },
    });
  }
}
