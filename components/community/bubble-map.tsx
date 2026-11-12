import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import { shadeStep } from "@/lib/community/rules";
import { MAP_HEIGHT, MAP_WIDTH, worldShapes } from "@/lib/community/world-map";

type MapBubble = { slug: string; name: string; countryCode: string; count: number | null };

const FILL = [
  "fill-brand-50",
  "fill-brand-200",
  "fill-brand-500",
  "fill-brand-700",
  "fill-brand-900",
] as const;

/**
 * World map of Cultural Bubbles. Countries with a Bubble are links (keyboard focusable, named by
 * aria-label); shading never carries meaning alone: the legend and the list beside it say the same.
 */
export async function BubbleMap({ bubbles }: { bubbles: MapBubble[] }) {
  const [t, locale, shapes] = await Promise.all([
    getTranslations("bubbles"),
    getLocale(),
    worldShapes(),
  ]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const byCode = new Map(bubbles.map((b) => [b.countryCode, b]));
  const max = Math.max(0, ...bubbles.map((b) => b.count ?? 0));

  return (
    <figure className="flex flex-col gap-3" data-testid="bubble-map">
      <div className="overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-card sm:p-4">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          role="group"
          aria-label={t("map")}
          className="h-auto w-full"
        >
          {shapes.map((shape, i) => {
            const bubble = shape.iso2 ? byCode.get(shape.iso2) : undefined;
            if (!bubble) {
              return (
                <path
                  key={`${shape.name}-${i}`}
                  d={shape.d}
                  className="fill-canvas stroke-line"
                  strokeWidth={0.5}
                  aria-hidden="true"
                />
              );
            }
            const country = regions.of(bubble.countryCode) ?? shape.name;
            const label =
              bubble.count === null
                ? t("hoverHidden", { country })
                : t("hover", { country, count: bubble.count });
            return (
              <Link
                key={bubble.slug}
                href={`/bubbles/${bubble.slug}`}
                aria-label={label}
                className="group outline-none"
              >
                <title>{label}</title>
                <path
                  d={shape.d}
                  strokeWidth={0.75}
                  className={cn(
                    bubble.count === null ? "fill-ember-50" : FILL[shadeStep(bubble.count, max)],
                    "stroke-brand-950 transition-opacity duration-(--duration-micro) group-hover:opacity-80 group-focus-visible:stroke-ember-700 group-focus-visible:[stroke-width:2.5]",
                  )}
                />
              </Link>
            );
          })}
        </svg>
      </div>
      <figcaption className="flex flex-col gap-2 text-small text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>{t("legend")}</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          <span>{t("legendFew")}</span>
          {FILL.slice(1).map((fill) => (
            <svg key={fill} viewBox="0 0 16 16" className="size-4">
              <rect width="16" height="16" rx="3" className={cn(fill, "stroke-brand-950")} />
            </svg>
          ))}
          <span>{t("legendMany")}</span>
        </span>
      </figcaption>
    </figure>
  );
}
