import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getChapterOptions, getPreferredChapterSlug } from "@/lib/chapters";

import { ChapterSwitcherMenu } from "./chapter-switcher-menu";

async function ChapterSwitcherData({ className }: { className?: string }) {
  const [options, current] = await Promise.all([getChapterOptions(), getPreferredChapterSlug()]);
  return <ChapterSwitcherMenu options={options} current={current} className={className} />;
}

/**
 * Reads the chapter list and the visitor's preference cookie at request time, so it streams in
 * behind a same-size placeholder and never blocks the rest of the page.
 */
export function ChapterSwitcher({ className }: { className?: string }) {
  return (
    <Suspense fallback={<Skeleton className="h-11 w-32 rounded-lg" />}>
      <ChapterSwitcherData className={className} />
    </Suspense>
  );
}
