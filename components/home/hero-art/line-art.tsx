import { cn } from "@/lib/utils";

/**
 * Shared building blocks for the country hero panoramas: single-weight strokes that draw in with
 * a CSS stagger (the "skyline" animation exception: SVG line drawing, 1.6 s overall) and folk-style
 * accents that pop in (transform + opacity). All on first paint, no JavaScript; prefers-reduced-motion
 * shows the finished drawing. Decorative only (aria-hidden).
 */

export type Stroke = {
  d: string;
  /** Position of a landmark drawn in local coordinates (base line at y = 0). */
  at?: [number, number];
  /** Back layer (mountains, distant shapes) is drawn lighter. */
  faint?: boolean;
};

export type Accent = { x: number; y: number; r: number };

/** Folk motif for the accents: Polish paper-cut rosette, or an Indian rangoli lotus. */
export type Motif = "rosette" | "lotus";

const DRAW_START_MS = 150;
const DRAW_STEP_MS = 70;

export function drawDelay(index: number) {
  return { animationDelay: `${DRAW_START_MS + index * DRAW_STEP_MS}ms` };
}

/** Folk paper-cut rosette (8 petals, a ring of dots): in Poland the Łowicz "wycinanki" tradition. */
function Rosette({ x, y, r, index }: Accent & { index: number }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="[transform-origin:center] animate-pop [transform-box:fill-box]"
        style={{ animationDelay: `${900 + index * 120}ms` }}
      >
        {petals.map((angle) => (
          <ellipse
            key={angle}
            cx={0}
            cy={-r * 0.62}
            rx={r * 0.2}
            ry={r * 0.38}
            transform={`rotate(${angle})`}
          />
        ))}
        {petals.map((angle) => (
          <circle
            key={`dot-${angle}`}
            cx={0}
            cy={-r}
            r={r * 0.07}
            transform={`rotate(${angle + 22.5})`}
          />
        ))}
        <circle r={r * 0.22} className="fill-surface" />
        <circle r={r * 0.12} />
      </g>
    </g>
  );
}

/** Rangoli lotus: 8 pointed petals around two rings of dots (India). */
function Lotus({ x, y, r, index }: Accent & { index: number }) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45);
  const petal = `M0 ${-r * 0.2} Q ${r * 0.22} ${-r * 0.62} 0 ${-r} Q ${-r * 0.22} ${-r * 0.62} 0 ${-r * 0.2} Z`;
  return (
    <g transform={`translate(${x} ${y})`}>
      <g
        className="[transform-origin:center] animate-pop [transform-box:fill-box]"
        style={{ animationDelay: `${900 + index * 120}ms` }}
      >
        {petals.map((angle) => (
          <path key={angle} d={petal} transform={`rotate(${angle})`} />
        ))}
        {petals.map((angle) => (
          <circle
            key={`dot-${angle}`}
            cx={0}
            cy={-r * 1.12}
            r={r * 0.06}
            transform={`rotate(${angle + 22.5})`}
          />
        ))}
        <circle r={r * 0.24} className="fill-surface" />
        <circle r={r * 0.13} />
      </g>
    </g>
  );
}

type LineArtProps = {
  strokes: Stroke[];
  accents?: Accent[];
  motif?: Motif;
  className?: string;
  label: string;
};

export function LineArt({
  strokes,
  accents = [],
  motif = "rosette",
  className,
  label,
}: LineArtProps) {
  const Accent = motif === "lotus" ? Lotus : Rosette;
  return (
    <svg
      viewBox="0 0 1200 260"
      aria-hidden="true"
      focusable="false"
      data-hero-art={label}
      // Wide screens show the whole panorama; narrow ones crop to the centre at a readable size.
      preserveAspectRatio="xMidYMax slice"
      className={cn("h-44 w-full md:h-60 lg:h-72", className)}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {strokes.map((stroke, index) => (
          <path
            key={`${index}-${stroke.d.slice(0, 16)}`}
            d={stroke.d}
            transform={stroke.at ? `translate(${stroke.at[0]} ${stroke.at[1]})` : undefined}
            pathLength={1}
            strokeDasharray={1}
            vectorEffect="non-scaling-stroke"
            className={cn("animate-draw", stroke.faint && "opacity-45")}
            style={drawDelay(index)}
          />
        ))}
      </g>
      <g className="fill-ember-500/80">
        {accents.map((accent, index) => (
          <Accent key={`${accent.x}-${accent.y}`} {...accent} index={index} />
        ))}
      </g>
    </svg>
  );
}
