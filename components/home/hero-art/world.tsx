import { LineArt, type Accent, type Stroke } from "./line-art";

/**
 * Global and any country without its own panorama: a globe with meridians, and arcs linking
 * people across the map (what EiB is about). Country-neutral by design.
 */
const strokes: Stroke[] = [
  { d: "M0 236 C 300 222, 900 222, 1200 236" },
  // Globe and meridians
  { d: "M600 220 A 100 100 0 1 1 600 20 A 100 100 0 1 1 600 220", faint: true },
  { d: "M600 20 C 550 70, 550 170, 600 220 M600 20 C 650 70, 650 170, 600 220", faint: true },
  { d: "M508 85 C 570 96, 630 96, 692 85 M508 155 C 570 144, 630 144, 692 155", faint: true },
  // Connection arcs between people
  { d: "M90 200 Q 260 40 470 150" },
  { d: "M730 120 Q 920 10 1110 190" },
  { d: "M240 210 Q 600 -10 960 210" },
  { d: "M380 200 Q 470 120 560 190 M640 190 Q 740 110 840 200" },
];

const accents: Accent[] = [
  { x: 90, y: 200, r: 10 },
  { x: 470, y: 150, r: 8 },
  { x: 730, y: 120, r: 8 },
  { x: 1110, y: 190, r: 10 },
];

export function WorldArt({ className }: { className?: string }) {
  return <LineArt label="world" strokes={strokes} accents={accents} className={className} />;
}
