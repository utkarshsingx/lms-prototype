import { cn } from "@/lib/cn";

/* Hand-rolled SVG charts. No chart library: the shapes here are simple,
   and a dependency would ship 60kb to draw eleven rectangles. */

export function Sparkline({
  data,
  className,
  tone = "brand",
  height = 40,
  fill = true,
}: {
  data: number[];
  className?: string;
  tone?: "brand" | "jade" | "ember" | "violet";
  height?: number;
  fill?: boolean;
}) {
  const w = 100;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = height - 2 - ((d - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = `sp-${tone}-${data.length}-${Math.round(max)}`;
  const color = `var(--${tone})`;
  return (
    <svg
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill ? <path d={area} fill={`url(#${id})`} /> : null}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function BarChart({
  data,
  labels,
  tone = "brand",
  height = 140,
  highlight,
}: {
  data: number[];
  labels: string[];
  tone?: "brand" | "jade" | "ember" | "violet";
  height?: number;
  highlight?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div
        className="flex items-end gap-1.5"
        style={{ height }}
        role="img"
        aria-label="Bar chart"
      >
        {data.map((d, i) => {
          const active = highlight == null || highlight === i;
          return (
            <div key={i} className="group relative flex-1">
              <div
                className={cn(
                  "w-full rounded-t-[4px] transition-all duration-500 ease-[var(--ease-out-quint)]",
                  active ? `bg-${tone}` : "bg-surface-3",
                )}
                style={{
                  height: Math.max(2, (d / max) * height),
                  backgroundColor: active ? `var(--${tone})` : undefined,
                  opacity: active ? 0.9 : 1,
                }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 rounded-[var(--radius-xs)] bg-surface-inv px-1.5 py-0.5 text-[11px] font-medium text-ink-inv opacity-0 shadow-[var(--shadow-e3)] transition-opacity group-hover:opacity-100 tnum">
                {d}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10.5px] text-ink-3"
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Donut({
  segments,
  size = 132,
  stroke = 16,
  center,
}: {
  segments: { label: string; value: number; tone: string }[];
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
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
        {segments.map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`var(--${s.tone})`}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      {center ? (
        <div className="absolute grid place-items-center text-center">{center}</div>
      ) : null}
    </div>
  );
}

/** Github-style activity grid. Weeks run left to right. */
export function HeatGrid({
  values,
  weeks = 26,
}: {
  values: number[];
  weeks?: number;
}) {
  const cells = values.slice(-weeks * 7);
  const cols: number[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  const level = (v: number) =>
    v === 0 ? 0 : v < 2 ? 1 : v < 4 ? 2 : v < 6 ? 3 : 4;
  const opacity = [0, 0.24, 0.45, 0.7, 1];
  return (
    <div className="scrollbar-none flex gap-[3px] overflow-x-auto pb-1">
      {cols.map((col, i) => (
        <div key={i} className="flex flex-col gap-[3px]">
          {col.map((v, j) => {
            const l = level(v);
            return (
              <span
                key={j}
                title={`${v} activities`}
                className="size-2.5 shrink-0 rounded-[3px]"
                style={{
                  backgroundColor:
                    l === 0 ? "var(--surface-3)" : "var(--brand)",
                  opacity: l === 0 ? 1 : opacity[l],
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
