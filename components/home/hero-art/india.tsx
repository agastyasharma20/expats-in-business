import { LineArt, type Accent, type Stroke } from "./line-art";

/**
 * India, original line drawing made for EiB (not traced from photos or other artwork), read left
 * to right: the Himalaya ridge under a rising sun, India Gate in New Delhi (the war memorial arch:
 * stepped plinth, one great central arch between two piers with small side arches, the cornice
 * and the stepped attic crowned by its shallow bowl), the Lotus Temple's petals, a flight of birds
 * and the Ganga below. Rangoli lotus accents replace Poland's paper-cut rosettes.
 */
const GROUND = 214;

const strokes: Stroke[] = [
  // Ganga, two strokes
  { d: "M0 228 C 160 216, 320 240, 480 228 S 780 216, 940 228 S 1120 238, 1200 226" },
  { d: "M60 246 C 220 234, 380 254, 540 244 S 840 234, 1000 246 S 1150 252, 1200 244" },
  // Himalaya ridge (back layer) with snow lines
  {
    d: "M0 196 L42 150 L70 162 L112 104 L140 124 L178 70 L204 92 L236 58 L266 96 L292 86 L326 128 L352 140 L380 176",
    faint: true,
  },
  { d: "M178 70 L192 92 L204 88 M236 58 L248 80 L262 74 M112 104 L124 122", faint: true },
  // India Gate: stepped plinth and ground line
  { d: "M-118 0 H118 M-110 0 V-8 H110 V0 M-102 -8 V-14 H102 V-8", at: [600, GROUND] },
  // Two piers and the great central arch
  {
    d: "M-96 -14 V-132 M96 -14 V-132 M-38 -14 V-94 Q -38 -130 0 -132 Q 38 -130 38 -94 V-14",
    at: [600, GROUND],
  },
  // Small arches on the piers
  {
    d: "M-82 -14 V-46 Q -82 -62 -67 -62 Q -52 -62 -52 -46 V-14 M52 -14 V-46 Q 52 -62 67 -62 Q 82 -62 82 -46 V-14",
    at: [600, GROUND],
  },
  // Entablature, cornice and inscription band
  { d: "M-102 -132 H102 V-146 H-102 Z M-108 -152 H108 M-64 -140 H64", at: [600, GROUND] },
  // Stepped attic and the shallow bowl on top
  {
    d: "M-80 -152 V-178 H80 V-152 M-58 -178 V-194 H58 V-178 M-34 -194 Q 0 -218 34 -194 M-48 -166 H48",
    at: [600, GROUND],
  },
  // Lotus Temple: three tiers of petals on a low base
  {
    d: "M-96 0 H96 M-80 0 Q -66 -58 -30 -84 Q -18 -40 0 -98 Q 18 -40 30 -84 Q 66 -58 80 0",
    at: [930, GROUND],
  },
  {
    d: "M-58 0 Q -50 -44 -22 -62 M58 0 Q 50 -44 22 -62 M-30 -84 Q -6 -66 0 -98 Q 6 -66 30 -84",
    at: [930, GROUND],
  },
  // Birds in flight
  { d: "M0 0 Q 10 -10 22 -2 Q 34 -12 46 -2", at: [380, 64] },
  { d: "M0 0 Q 8 -8 17 -2 Q 26 -9 35 -2", at: [432, 40] },
  { d: "M0 0 Q 7 -7 14 -2 Q 21 -8 28 -2", at: [1070, 72] },
  { d: "M0 0 Q 9 -9 19 -2 Q 29 -10 39 -2", at: [1112, 52] },
];

const accents: Accent[] = [
  { x: 236, y: 30, r: 20 }, // rising sun over the Himalayas
  { x: 760, y: 78, r: 13 },
  { x: 1150, y: 132, r: 15 },
];

export function IndiaArt({ className }: { className?: string }) {
  return (
    <LineArt label="IN" strokes={strokes} accents={accents} motif="lotus" className={className} />
  );
}
