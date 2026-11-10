import { cn } from "@/lib/utils";

/**
 * Original line drawing of the Kraków skyline, drawn from scratch for EiB: Wawel hill and castle,
 * the cathedral dome, St Mary's two unequal towers, old-town roofs, a bridge, a mound and the
 * Vistula. Eight single-weight paths draw in with a CSS stagger (1.6 s overall) on first paint,
 * no JavaScript needed; prefers-reduced-motion shows it finished. Decorative (aria-hidden).
 */
const paths = [
  // Vistula, two strokes
  "M0 212 C 150 198, 300 226, 450 212 S 750 198, 900 212 S 1100 224, 1200 210",
  "M40 230 C 200 218, 360 240, 520 228 S 820 216, 980 230 S 1140 238, 1200 228",
  // Wawel hill
  "M50 204 Q 200 150 350 204",
  // Wawel castle with towers
  "M110 176 V 124 H 130 V 106 L 140 92 L 150 106 V 124 H 196 V 136 H 236 V 114 L 248 98 L 260 114 V 142 H 300 V 182",
  // Cathedral dome and spire
  "M198 124 Q 214 100 230 124 M214 100 V 84",
  // St Mary's: taller tower with spire, shorter tower with cupola, nave roof
  "M640 200 V 92 H 660 V 72 L 670 38 L 680 72 V 92 H 692 V 200 M692 152 L 720 130 L 748 152 M748 200 V 106 H 770 V 94 Q 780 78 790 94 V 106 H 798 V 200",
  // Old-town roofs
  "M420 200 V 162 L 440 148 L 460 162 V 200 M470 200 V 170 H 540 V 200 M550 200 V 158 L 568 142 L 586 158 V 200",
  // Bridge and a distant mound
  "M840 204 Q 920 170 1000 204 M820 204 H 1030 M1060 204 Q 1110 152 1160 204",
];

export function Skyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 240"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
      className={cn("h-auto w-full", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths.map((d, index) => (
        <path
          key={d}
          d={d}
          pathLength={1}
          strokeDasharray={1}
          vectorEffect="non-scaling-stroke"
          className="animate-draw"
          style={{ animationDelay: `${200 + index * 80}ms` }}
        />
      ))}
    </svg>
  );
}
