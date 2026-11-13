// Values safe to import from client components (no database or request APIs).
export const GLOBAL_CHAPTER = "global";
export const CHAPTER_COOKIE = "eib-chapter";

export type ChapterOption = {
  slug: string;
  name: string;
  status: "live" | "launching";
  /** IANA zone used to show this chapter's dates and times. */
  timeZone: string;
};

/** Chapter slug from a raw Cookie header (pure; unknown or malformed values mean "global"). */
export function preferredChapterFromHeader(cookieHeader: string | null): string {
  if (!cookieHeader) return GLOBAL_CHAPTER;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index < 0 || part.slice(0, index).trim() !== CHAPTER_COOKIE) continue;
    let value = part.slice(index + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      return GLOBAL_CHAPTER;
    }
    return /^[a-z0-9-]{1,64}$/.test(value) ? value : GLOBAL_CHAPTER;
  }
  return GLOBAL_CHAPTER;
}
