import { cn } from "@/lib/utils";

/**
 * Progress ring (SVG). Static: the value is shown as text too, so nothing relies on colour or
 * motion; the ring is a visual aid with an accessible label.
 */
export function ProgressRing({
  percent,
  label,
  size = 96,
  className,
}: {
  percent: number;
  label: string;
  size?: number;
  className?: string;
}) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const value = Math.min(Math.max(percent, 0), 100);
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
      data-testid="progress-ring"
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-brand-100"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - value / 100)}
          className="stroke-brand-700"
        />
      </svg>
      <span aria-hidden="true" className="absolute font-heading text-lg font-bold text-brand-950">
        {value}%
      </span>
    </div>
  );
}
