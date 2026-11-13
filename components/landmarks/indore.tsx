import { LineArt, type Accent, type Stroke } from "@/components/home/hero-art/line-art";

/**
 * Indore, original line drawing made for EiB (not traced from photos or other artwork): Rajwada
 * Palace in the middle — the stone ground storey with its tall arched gateway, and the narrowing
 * upper storeys with rows of arched windows and jharokha balconies, flanked by corner towers with
 * small chhatri domes — on the old city's street line, with the chhatri pavilions by the river on
 * the left, a flight of birds and the river Khan below. Rangoli lotus accents.
 */
const GROUND = 214;
const CX = 600;

/** One storey: outline rectangle plus a row of small arched windows across its width. */
function storey(top: number, height: number, half: number, windows: number): Stroke[] {
  const outline = `M${-half} ${top + height} V${top} H${half} V${top + height}`;
  const step = (half * 2) / (windows + 1);
  const winTop = top + height * 0.28;
  const winBottom = top + height * 0.82;
  // The central bay carries the jharokha balconies, so its windows are left out.
  const row = Array.from({ length: windows }, (_, i) => -half + step * (i + 1))
    .filter((x) => Math.abs(x) > 30)
    .map((x) => {
      const w = Math.min(step * 0.28, 6);
      return `M${x - w} ${winBottom} V${winTop + w} Q ${x} ${winTop - w * 0.6} ${x + w} ${winTop + w} V${winBottom}`;
    })
    .join(" ");
  return [
    { d: outline, at: [CX, GROUND] },
    { d: row, at: [CX, GROUND] },
  ];
}

const palace: Stroke[] = [
  // Street line and the stone ground storey with the great arched gateway
  { d: "M-200 0 H200 M-150 0 V-62 H150 V0", at: [CX, GROUND] },
  {
    d: "M-30 0 V-50 Q -30 -86 0 -90 Q 30 -86 30 -50 V0 M-20 0 V-48 Q 0 -74 20 -48 V0",
    at: [CX, GROUND],
  },
  // Upper storeys narrowing upwards (wooden floors with window rows)
  ...storey(-86, 24, 140, 11),
  ...storey(-108, 22, 128, 10),
  ...storey(-128, 20, 116, 9),
  ...storey(-146, 18, 104, 8),
  ...storey(-162, 16, 92, 7),
  // Jharokha balconies on the central bay
  {
    d: "M-26 -86 V-96 H26 V-86 M-20 -108 V-116 H20 V-108 M-14 -128 V-134 H14 V-128",
    at: [CX, GROUND],
  },
  // Corner towers with chhatri domes and finials
  {
    d: "M-170 0 V-140 H-150 V0 M150 0 V-140 H170 V0 M-174 -140 H-146 M146 -140 H174 M-170 -140 Q -160 -160 -150 -140 M150 -140 Q 160 -160 170 -140 M-160 -156 V-166 M160 -156 V-166",
    at: [CX, GROUND],
  },
  // Roof chhatri over the centre
  {
    d: "M-92 -162 H92 M-22 -162 V-172 H22 V-162 M-18 -172 Q 0 -194 18 -172 M0 -190 V-200",
    at: [CX, GROUND],
  },
];

const strokes: Stroke[] = [
  // River Khan, two strokes
  { d: "M0 230 C 150 218, 300 242, 450 230 S 760 218, 920 230 S 1110 240, 1200 228" },
  { d: "M40 248 C 200 236, 360 256, 520 246 S 820 236, 980 248 S 1140 254, 1200 246" },
  // Chhatri pavilions by the river (back layer): domed kiosks on pillars
  {
    d: "M150 214 V184 M190 214 V184 M140 184 H200 M146 184 Q 170 150 194 184 M170 156 V146 M240 214 V192 M270 214 V192 M232 192 H278 M236 192 Q 255 166 274 192",
    faint: true,
  },
  // Old-city houses either side of the palace
  { d: "M360 214 V170 H410 V214 M372 170 L385 156 L398 170 M430 214 V184 H470 V214", faint: true },
  { d: "M730 214 V178 H780 V214 M800 214 V166 H850 V214 M812 166 L825 152 L838 166", faint: true },
  ...palace,
  // Birds
  { d: "M0 0 Q 10 -10 22 -2 Q 34 -12 46 -2", at: [930, 70] },
  { d: "M0 0 Q 8 -8 17 -2 Q 26 -9 35 -2", at: [980, 46] },
  { d: "M0 0 Q 7 -7 14 -2 Q 21 -8 28 -2", at: [330, 84] },
];

const accents: Accent[] = [
  { x: 1080, y: 56, r: 20 },
  { x: 120, y: 70, r: 14 },
  { x: 1160, y: 150, r: 12 },
];

export function IndoreArt({ className }: { className?: string }) {
  return (
    <LineArt
      label="IN-indore"
      strokes={strokes}
      accents={accents}
      motif="lotus"
      className={className}
    />
  );
}
