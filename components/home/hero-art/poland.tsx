import { LineArt, type Accent, type Stroke } from "./line-art";

/**
 * Poland, original line drawing made for EiB (not traced from photos or other artwork), read left
 * to right: the Tatra ridge under a folk-art sun, Kraków (Wawel hill with castle and cathedral
 * dome, St Mary's two unequal towers), Warsaw (the stepped Palace of Culture and Science), Gdańsk
 * (the medieval harbour crane on the Motława), white storks overhead and the Vistula below.
 */
const GROUND = 214;

const strokes: Stroke[] = [
  // Vistula, two strokes
  { d: "M0 226 C 150 214, 300 238, 450 226 S 750 214, 900 226 S 1100 236, 1200 224" },
  { d: "M40 244 C 200 232, 360 252, 520 242 S 820 232, 980 244 S 1140 250, 1200 242" },
  // Tatra ridge (back layer), with the Giewont-like "sleeping knight" shoulder on the left
  {
    d: "M0 200 L38 168 L62 176 L96 132 L118 146 L150 104 L168 116 L196 82 L214 98 L236 74 L258 106 L282 98 L306 134 L326 150 L340 170",
    faint: true,
  },
  { d: "M150 104 L160 124 M236 74 L244 96 M196 82 L188 104", faint: true },
  // Kraków: Wawel hill, castle with towers, cathedral dome and spire
  { d: "M300 218 Q 430 166 560 218" },
  {
    d: "M0 18 V-52 H20 V-70 L30 -84 L40 -70 V-52 H86 V-40 H126 V-62 L138 -78 L150 -62 V-34 H190 V16",
    at: [338, 190],
  },
  { d: "M88 -52 Q 104 -76 120 -52 M104 -76 V-92", at: [338, 190] },
  // Kraków: St Mary's Basilica, taller spired tower, shorter cupola tower, nave roof between
  {
    d: "M0 0 V-108 H20 V-128 L30 -162 L40 -128 V-108 H52 V0 M52 -48 L80 -70 L108 -48 M108 0 V-94 H130 V-106 Q 140 -122 150 -106 V-94 H158 V0",
    at: [596, GROUND],
  },
  // Warsaw: Palace of Culture and Science, stepped tower and spire, low wings
  {
    d: "M-84 0 V-30 H-42 V-62 H-30 V-96 H-20 V-122 H-12 V-150 H-6 V-164 L0 -196 L6 -164 V-150 H12 V-122 H20 V-96 H30 V-62 H42 V-30 H84 V0",
    at: [862, GROUND],
  },
  {
    d: "M-30 -96 V-106 M30 -96 V-106 M-20 -122 V-130 M20 -122 V-130 M-60 -30 V-38 M60 -30 V-38",
    at: [862, GROUND],
  },
  // Gdańsk: the harbour crane, two brick towers, timber housing jutting over the water, gable
  {
    d: "M0 0 V-70 H28 V0 M76 0 V-70 H104 V0 M28 -36 Q 52 -54 76 -36 M-8 -70 H118 V-108 H-8 Z M18 -108 L54 -140 L92 -108 M118 -100 H134 V-80 H118",
    at: [992, GROUND],
  },
  // White storks gliding (bocian), wing-and-neck strokes
  { d: "M0 0 Q 12 -12 26 -3 L34 -6 Q 46 -16 60 -6 M26 -3 L42 2 L54 1", at: [640, 58] },
  { d: "M0 0 Q 9 -9 20 -2 L26 -4 Q 35 -12 46 -4 M20 -2 L32 2 L41 1", at: [712, 34] },
  { d: "M0 0 Q 7 -7 15 -2 L20 -3 Q 27 -9 35 -3 M15 -2 L24 1 L31 0", at: [770, 72] },
];

const accents: Accent[] = [
  { x: 214, y: 46, r: 20 }, // folk sun over the Tatras
  { x: 520, y: 84, r: 12 },
  { x: 1150, y: 70, r: 14 },
];

export function PolandArt({ className }: { className?: string }) {
  return <LineArt label="PL" strokes={strokes} accents={accents} className={className} />;
}
