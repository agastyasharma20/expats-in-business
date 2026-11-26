/**
 * Decorative "no signal" illustration for the offline page. The Wi-Fi arcs draw themselves in
 * (SVG line drawing is one of the allowed animations) and the slash follows; reduced motion shows
 * the finished picture.
 */
export function OfflineArt({ label }: { label: string }) {
  const arcs = [
    { d: "M24 72 Q80 24 136 72", delay: 0 },
    { d: "M44 94 Q80 64 116 94", delay: 140 },
    { d: "M62 114 Q80 100 98 114", delay: 280 },
  ];
  return (
    <svg
      viewBox="0 0 160 160"
      role="img"
      aria-label={label}
      className="size-44 sm:size-52"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="80" cy="80" r="76" className="fill-brand-50 stroke-brand-100" strokeWidth="2" />
      {arcs.map((arc) => (
        <path
          key={arc.d}
          d={arc.d}
          pathLength="1"
          strokeDasharray="1"
          strokeWidth="9"
          className="animate-draw stroke-brand-700"
          style={{ animationDelay: `${arc.delay}ms` }}
        />
      ))}
      <circle cx="80" cy="132" r="7" className="origin-center animate-pop fill-brand-950" />
      <path
        d="M36 28 L124 140"
        pathLength="1"
        strokeDasharray="1"
        strokeWidth="9"
        className="animate-draw stroke-ember-500"
        style={{ animationDelay: "560ms" }}
      />
    </svg>
  );
}
