// Values safe to import from client components (no database or request APIs).
export const GLOBAL_CHAPTER = "global";
export const CHAPTER_COOKIE = "eib-chapter";

export type ChapterOption = {
  slug: string;
  name: string;
  status: "live" | "launching";
};
