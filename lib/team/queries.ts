import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { getDb } from "@/lib/db";

import type { TeamGroup } from "./schemas";

export type PublicMember = {
  id: string;
  name: string;
  designation: string;
  grp: TeamGroup;
  bio: string | null;
  photoUrl: string | null;
  photoAlt: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
  linkedinUrl: string | null;
  /** True when the person opted in; the address itself is fetched on demand (POST /api/team/email/[id]). */
  hasEmail: boolean;
};

export type PublicFounder = {
  title: string;
  body: string;
  founderName: string;
  designation: string;
  photoUrl: string | null;
  photoAlt: string | null;
  updatedAt: Date;
};

/** Photo bytes are never selected here; they are served by /api/team/photo/[id]. */
const memberSelect = {
  id: true,
  name: true,
  designation: true,
  grp: true,
  bio: true,
  photoType: true,
  photoAlt: true,
  photoVersion: true,
  startedAt: true,
  endedAt: true,
  linkedinUrl: true,
  email: true,
  showEmail: true,
  isVisible: true,
  sortOrder: true,
} as const;

export const photoUrl = (id: string, version: number) => `/api/team/photo/${id}?v=${version}`;

/** Public page data. Cached for hours; every team action calls updateTag("team"). */
export async function getTeamPage(): Promise<{
  founder: PublicFounder | null;
  members: PublicMember[];
}> {
  "use cache";
  cacheLife("hours");
  cacheTag("team");
  const db = getDb();
  const [founder, rows] = await Promise.all([
    db.founderMessage.findUnique({
      where: { key: "founder" },
      select: {
        title: true,
        body: true,
        founderName: true,
        designation: true,
        photoType: true,
        photoAlt: true,
        updatedAt: true,
      },
    }),
    db.teamMember.findMany({
      where: { isVisible: true },
      select: memberSelect,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return {
    founder: founder
      ? {
          ...founder,
          photoUrl: founder.photoType
            ? photoUrl("founder", Math.floor(founder.updatedAt.getTime() / 1000))
            : null,
        }
      : null,
    members: rows.map((m) => ({
      id: m.id,
      name: m.name,
      designation: m.designation,
      grp: m.grp as TeamGroup,
      bio: m.bio,
      photoUrl: m.photoType ? photoUrl(m.id, m.photoVersion) : null,
      photoAlt: m.photoAlt,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      linkedinUrl: m.linkedinUrl,
      hasEmail: m.showEmail && m.email !== null,
    })),
  };
}

/** Everything the admin editor shows (hidden members and private emails included, no photo bytes). */
export async function getTeamForAdmin() {
  const db = getDb();
  const [founder, members] = await Promise.all([
    db.founderMessage.findUnique({
      where: { key: "founder" },
      select: {
        title: true,
        body: true,
        founderName: true,
        designation: true,
        photoType: true,
        photoAlt: true,
        updatedAt: true,
      },
    }),
    db.teamMember.findMany({
      select: memberSelect,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);
  return { founder, members };
}
