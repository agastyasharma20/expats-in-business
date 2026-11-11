import { getHeroCountry } from "@/lib/hero-country";

import { PolandArt } from "./poland";
import { WorldArt } from "./world";

/**
 * Country panoramas by ISO 3166-1 code. Adding a country = one file + one line here; any country
 * without art (and Global, when no hub has live chapters) gets the world design.
 */
const HERO_ART: Record<string, (props: { className?: string }) => React.ReactNode> = {
  PL: PolandArt,
};

/** Reads the visitor's chapter (cookie), so it renders inside <Suspense> under the static hero. */
export async function HeroArt({ className }: { className?: string }) {
  const country = await getHeroCountry();
  const Art = (country && HERO_ART[country]) || WorldArt;
  return <Art className={className} />;
}
