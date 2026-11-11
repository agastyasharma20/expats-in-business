import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { MIN_PUBLIC_GROUP_SIZE } from "@/lib/home/queries";

import {
  averageRating,
  PAGE_SIZE,
  type BusinessFilters,
  type MemberFilters,
  type ProviderFilters,
} from "./filters";

/** Listed members: public profiles of accounts not scheduled for deletion. */
const listed: Prisma.ProfileWhereInput = { isPublic: true, user: { deletionRequestedAt: null } };

/**
 * Member search. Filters only match fields the member shows (filtering on a hidden field would
 * reveal it), and visitors can filter only by name, chapter and coffee. Name search uses ILIKE on
 * trigram-indexed columns.
 */
export async function searchMembers(filters: MemberFilters, signedIn: boolean) {
  const and: Prisma.ProfileWhereInput[] = [listed];
  if (filters.q) {
    and.push({
      OR: [
        { user: { name: { contains: filters.q, mode: "insensitive" } } },
        { headline: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }
  if (filters.chapter) and.push({ homeChapter: { slug: filters.chapter } });
  if (filters.coffee) and.push({ openToCoffee: true });
  if (signedIn) {
    if (filters.industry) and.push({ showIndustry: true, industry: { slug: filters.industry } });
    if (filters.skill) and.push({ showSkills: true, skills: { has: filters.skill } });
    if (filters.language) and.push({ showLanguages: true, languages: { has: filters.language } });
    if (filters.origin) and.push({ showOrigin: true, originCountryCode: filters.origin });
  }
  const where = { AND: and };
  const db = getDb();
  const [total, rows] = await Promise.all([
    db.profile.count({ where }),
    db.profile.findMany({
      where,
      orderBy: [{ foundingNumber: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        slug: true,
        headline: true,
        openToCoffee: true,
        isDemo: true,
        originCountryCode: true,
        languages: true,
        skills: true,
        showOrigin: true,
        showLanguages: true,
        showIndustry: true,
        showSkills: true,
        user: { select: { name: true } },
        industry: { select: { name: true } },
        homeChapter: { select: { name: true } },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(Math.ceil(total / PAGE_SIZE), 1) };
}

/** Filter options. Origins appear only for groups of 5+ visible members (no singling anyone out). */
export async function memberFilterOptions() {
  "use cache";
  cacheLife("hours");
  cacheTag("directory");
  const db = getDb();
  const [industries, chapters, origins, languages] = await Promise.all([
    db.industry.findMany({ orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } }),
    db.chapter.findMany({
      where: { status: { in: ["live", "launching"] } },
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    db.profile.groupBy({
      by: ["originCountryCode"],
      where: { ...listed, showOrigin: true, originCountryCode: { not: null } },
      _count: { _all: true },
      having: { originCountryCode: { _count: { gte: MIN_PUBLIC_GROUP_SIZE } } },
    }),
    db.$queryRaw<{ code: string }[]>`
      SELECT DISTINCT unnest(p.languages) AS code FROM "Profile" p
      JOIN "user" u ON u.id = p."userId"
      WHERE p."isPublic" AND p."showLanguages" AND u."deletionRequestedAt" IS NULL ORDER BY 1`,
  ]);
  return {
    industries,
    chapters,
    origins: origins.map((o) => o.originCountryCode as string).sort(),
    languages: languages.map((l) => l.code),
  };
}

const providerCard = {
  id: true,
  slug: true,
  name: true,
  description: true,
  services: true,
  languages: true,
  responseTimeHours: true,
  verificationStatus: true,
  isDemo: true,
  category: { select: { slug: true, name: true } },
  chapter: { select: { name: true } },
  reviews: { select: { rating: true } },
} satisfies Prisma.ProviderSelect;

export type ProviderCardData = Omit<
  Prisma.ProviderGetPayload<{ select: typeof providerCard }>,
  "reviews"
> & {
  rating: number | null;
  reviewCount: number;
};

function toProviderCard(
  row: Prisma.ProviderGetPayload<{ select: typeof providerCard }>,
): ProviderCardData {
  const { reviews, ...rest } = row;
  return {
    ...rest,
    rating: averageRating(reviews.map((r) => r.rating)),
    reviewCount: reviews.length,
  };
}

export async function searchProviders(filters: ProviderFilters) {
  const where: Prisma.ProviderWhereInput = {
    ...(filters.q && {
      OR: [
        { name: { contains: filters.q, mode: "insensitive" } },
        { services: { has: filters.q } },
      ],
    }),
    ...(filters.category && { category: { slug: filters.category } }),
    ...(filters.language && { languages: { has: filters.language } }),
    ...(filters.verified && { verificationStatus: "verified" }),
  };
  const db = getDb();
  const [total, rows] = await Promise.all([
    db.provider.count({ where }),
    db.provider.findMany({
      where,
      // Verified first (the badge means checked), then by name.
      orderBy: [{ verificationStatus: "desc" }, { name: "asc" }],
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: providerCard,
    }),
  ]);
  return {
    total,
    rows: rows.map(toProviderCard),
    pages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
  };
}

export async function searchBusinesses(filters: BusinessFilters) {
  const where: Prisma.BusinessWhereInput = {
    owner: { deletionRequestedAt: null },
    ...(filters.q && { name: { contains: filters.q, mode: "insensitive" } }),
    ...(filters.category && { category: { slug: filters.category } }),
  };
  const db = getDb();
  const [total, rows] = await Promise.all([
    db.business.count({ where }),
    db.business.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (filters.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        description: true,
        website: true,
        isDemo: true,
        category: { select: { name: true } },
        chapter: { select: { name: true } },
        owner: { select: { name: true, profile: { select: { slug: true, isPublic: true } } } },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(Math.ceil(total / PAGE_SIZE), 1) };
}

export function listCategories() {
  return getDb().providerCategory.findMany({
    orderBy: { sortOrder: "asc" },
    select: { slug: true, name: true },
  });
}

export async function getProvider(slug: string) {
  const row = await getDb().provider.findUnique({
    where: { slug },
    select: {
      ...providerCard,
      ownerId: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          rating: true,
          body: true,
          createdAt: true,
          isDemo: true,
          author: { select: { name: true } },
        },
      },
      _count: { select: { reviews: true } },
    },
  });
  if (!row) return null;
  return { ...row, rating: averageRating(row.reviews.map((r) => r.rating)) };
}
