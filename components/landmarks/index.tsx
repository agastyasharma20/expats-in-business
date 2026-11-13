import { IndiaArt } from "@/components/home/hero-art/india";
import { PolandArt } from "@/components/home/hero-art/poland";
import { WorldArt } from "@/components/home/hero-art/world";

import { IndoreArt } from "./indore";

/**
 * Landmark drawings by key (Country.landmark, Chapter.landmark). Adding a city or country is one
 * component and one line here; unknown keys fall back to the world drawing, never to a broken page.
 */
const LANDMARKS: Record<string, (props: { className?: string }) => React.ReactNode> = {
  poland: PolandArt,
  india: IndiaArt,
  indore: IndoreArt,
  world: WorldArt,
};

export function LandmarkArt({
  landmark,
  className,
}: {
  landmark: string | null;
  className?: string;
}) {
  const Art = (landmark && LANDMARKS[landmark]) || WorldArt;
  return <Art className={className} />;
}

export const LANDMARK_KEYS = Object.keys(LANDMARKS);
