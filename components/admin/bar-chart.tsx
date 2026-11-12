import { cn } from "@/lib/utils";

type Point = { day: string; count: number };

const W = 600;
const H = 140;
const GAP = 2;

/**
 * Daily counts as thin bars (single series: the heading names it, so no legend). Server-rendered
 * SVG; each day has a full-height hover target with a native tooltip, and a table view below
 * gives the same numbers without relying on the chart.
 */
export function BarChart({
  data,
  label,
  formatDay,
  tableLabel,
  className,
}: {
  data: Point[];
  label: string;
  formatDay: (day: string) => string;
  tableLabel: string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const step = W / data.length;
  const barW = Math.max(step - GAP, 1);
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <figure className={cn("flex flex-col gap-2", className)}>
      <svg
        viewBox={`0 0 ${W} ${H + 1}`}
        role="img"
        aria-label={label}
        className="h-36 w-full"
        preserveAspectRatio="none"
      >
        <line x1={0} x2={W} y1={H} y2={H} className="stroke-line" strokeWidth={1} />
        {data.map((point, i) => {
          const h = point.count ? Math.max((point.count / max) * (H - 8), 3) : 0;
          const x = i * step + GAP / 2;
          const tip = `${formatDay(point.day)}: ${point.count}`;
          return (
            <g key={point.day} className="group">
              <title>{tip}</title>
              <rect
                x={i * step}
                y={0}
                width={step}
                height={H}
                className="fill-transparent group-hover:fill-brand-50"
              />
              {h ? (
                <path
                  d={`M${x},${H} V${H - h + 2} q0,-2 2,-2 h${barW - 4} q2,0 2,2 V${H} Z`}
                  className="fill-brand-700 group-hover:fill-brand-900"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <figcaption className="flex justify-between text-small text-muted-foreground">
        <span>{data[0] ? formatDay(data[0].day) : null}</span>
        <span className="font-semibold text-ink tabular-nums">{total}</span>
        <span>{data.at(-1) ? formatDay(data.at(-1)!.day) : null}</span>
      </figcaption>
      <details className="text-small">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
          {tableLabel}
        </summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {data
              .filter((d) => d.count)
              .map((d) => (
                <tr key={d.day} className="border-b border-line">
                  <th scope="row" className="py-1 font-normal text-ink">
                    {formatDay(d.day)}
                  </th>
                  <td className="py-1 text-right text-ink tabular-nums">{d.count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
