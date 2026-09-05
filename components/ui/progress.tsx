import { cn } from "@/lib/cn";

export function Progress({
  value,
  className,
  tone = "brand",
  height = 6,
}: {
  value: number;
  className?: string;
  tone?: "brand" | "jade" | "ember" | "ink";
  height?: number;
}) {
  const fill = {
    brand: "bg-brand",
    jade: "bg-jade",
    ember: "bg-ember",
    ink: "bg-ink",
  }[tone];
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      // No w-full here: a block div already fills its container, and hardcoding
      // it fought every caller that passes an explicit width like `w-20`.
      className={cn("overflow-hidden rounded-full bg-surface-3", className)}
      style={{ height }}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quint)]",
          fill,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({
  value,
  size = 44,
  stroke = 4,
  tone = "brand",
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: "brand" | "jade" | "ember" | "violet";
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = `var(--${tone})`;
  return (
    <div
      className="relative grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-quint)]"
        />
      </svg>
      <span className="absolute grid place-items-center text-[11px] font-semibold text-ink tnum">
        {children ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
