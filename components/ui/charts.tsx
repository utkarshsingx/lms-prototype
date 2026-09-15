import { cn } from "@/lib/cn";

/* Hand-rolled SVG and HTML charts. No chart library: the shapes here are
   simple, and a dependency would ship 60kb to draw eleven rectangles.
   Every colour is a theme token, so each chart follows the theme and mode.
   Hover layers are pure CSS (group-hover), so this module stays usable from
   server components; nothing here takes a function prop. */

/* ---------------------------------------------------------------- tones */

export type ChartTone =
  | "brand"
  | "cta"
  | "cta-strong"
  | "info"
  | "jade"
  | "ember"
  | "amber"
  | "rose"
  | "violet"
  | "ink"
  | "ink-2"
  | "ink-3"
  | "line-strong"
  | "surface-inv"
  | "nav-active";

const TONES = new Set<string>([
  "brand",
  "cta",
  "cta-strong",
  "info",
  "jade",
  "ember",
  "amber",
  "rose",
  "violet",
  "ink",
  "ink-2",
  "ink-3",
  "line-strong",
  "surface-inv",
  "nav-active",
]);

/* Status and badge vocabulary callers already use elsewhere. */
const ALIAS: Record<string, ChartTone> = {
  neutral: "ink-3",
  dark: "surface-inv",
  success: "jade",
  warning: "amber",
  danger: "rose",
};

/** Series order when a caller gives no tone. Fixed, so a colour follows position predictably. */
const SERIES_ORDER: ChartTone[] = ["brand", "info", "violet", "ember", "jade", "amber"];

/**
 * CSS colour for a tone name. An unknown name falls back rather than painting
 * an invisible `var(--nonsense)`.
 */
export function toneColor(tone?: string, fallback: ChartTone = "brand") {
  const t = tone ? (ALIAS[tone] ?? tone) : fallback;
  return `var(--${TONES.has(t) ? t : fallback})`;
}

/* ----------------------------------------------------------- formatting */

/** Indian digit grouping (1,48,000), one decimal at most. Deterministic on server and client. */
export function formatChartValue(n: number, unit = "") {
  if (!Number.isFinite(n)) return "";
  const neg = n < 0;
  const abs = Math.abs(n);
  const fixed = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  const [int, frac] = fixed.split(".");
  const last3 = int.slice(-3);
  let rest = int.slice(0, -3);
  const groups: string[] = [];
  while (rest.length > 2) {
    groups.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) groups.unshift(rest);
  const body = [...groups, last3].join(",");
  return `${neg ? "-" : ""}${body}${frac && frac !== "0" ? `.${frac}` : ""}${unit}`;
}

const oneDp = (x: number) => String(Math.round(x * 10) / 10);

/** Short axis ticks: 12k, 1.5L, 2Cr. */
function tickLabel(n: number, unit: string) {
  const a = Math.abs(n);
  if (a >= 1e7) return `${oneDp(n / 1e7)}Cr${unit}`;
  if (a >= 1e5) return `${oneDp(n / 1e5)}L${unit}`;
  if (a >= 1e4) return `${oneDp(n / 1e3)}k${unit}`;
  return formatChartValue(n, unit);
}

function niceStep(raw: number) {
  if (!(raw > 0)) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * exp;
}

/** A clean value axis: zero-based for non-negative data, rounded ends, about four intervals. */
function valueScale(values: number[], min?: number, max?: number) {
  const finite = values.filter(Number.isFinite);
  const dMin = finite.length ? Math.min(...finite) : 0;
  const dMax = finite.length ? Math.max(...finite) : 1;
  let lo = min ?? (dMin >= 0 ? 0 : dMin);
  let hi = max ?? dMax;
  if (hi <= lo) hi = lo + 1;
  const step = niceStep((hi - lo) / 4);
  if (min == null) lo = Math.floor(lo / step) * step;
  if (max == null) hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step * 1e-6; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  const last = ticks[ticks.length - 1];
  if (last < hi - 1e-9) {
    // A fixed max that is not on the step: keep it, drop a crowded neighbour.
    if (hi - last < step / 2) ticks.pop();
    ticks.push(hi);
  }
  return { lo, hi, ticks };
}

/* ------------------------------------------------------------ sparkline */

export function Sparkline({
  data,
  className,
  tone = "brand",
  height = 40,
  fill = true,
}: {
  data: number[];
  className?: string;
  tone?: ChartTone;
  height?: number;
  fill?: boolean;
}) {
  const w = 100;
  // A single reading (a learner who has just started) draws as a flat line.
  const series = data.length === 1 ? [data[0], data[0]] : data;
  if (!series.length) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((d, i) => {
    const x = (i / (series.length - 1)) * w;
    const y = height - 2 - ((d - min) / span) * (height - 6);
    return [x, y] as const;
  });
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(" ");
  const area = `${line} L${w},${height} L0,${height} Z`;
  const id = `sp-${tone}-${data.length}-${Math.round(max)}-${Math.round(min)}`;
  const color = toneColor(tone);
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
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* ------------------------------------------------------------ bar chart */

export function BarChart({
  data,
  labels,
  tone = "brand",
  height = 140,
  highlight,
}: {
  data: number[];
  labels: string[];
  tone?: ChartTone;
  height?: number;
  highlight?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div className="overflow-x-clip">
      <div
        className="flex items-end gap-1.5"
        style={{ height }}
        role="img"
        aria-label={`Bar chart: ${data
          .map((d, i) => `${labels[i] ?? i + 1} ${formatChartValue(d)}`)
          .join(", ")}`}
      >
        {data.map((d, i) => {
          const active = highlight == null || highlight === i;
          return (
            <div key={i} className="group relative flex min-w-0 flex-1 justify-center">
              <div
                className={cn(
                  "w-full max-w-6 rounded-t-[4px] transition-all duration-500 ease-[var(--ease-out-quint)]",
                  !active && "bg-surface-3",
                )}
                style={{
                  height: Math.max(2, (d / max) * height),
                  backgroundColor: active ? toneColor(tone) : undefined,
                }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 hidden -translate-x-1/2 rounded-[var(--radius-xs)] bg-surface-inv px-1.5 py-0.5 text-[11px] font-semibold text-ink-inv shadow-[var(--shadow-e3)] group-hover:block tnum">
                {formatChartValue(d)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {labels.map((l, i) => (
          <span
            key={i}
            className="min-w-0 flex-1 truncate text-center text-[11px] text-ink-3"
          >
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- donut */

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
  const arcs = segments.reduce<
    { seg: (typeof segments)[number]; len: number; offset: number }[]
  >((out, seg) => {
    const prev = out[out.length - 1];
    out.push({
      seg,
      len: (seg.value / total) * c,
      offset: prev ? prev.offset + prev.len : 0,
    });
    return out;
  }, []);
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
        {arcs.map(({ seg, len, offset }) => (
          <circle
            key={seg.label}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={toneColor(seg.tone)}
            strokeWidth={stroke}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
          >
            <title>{`${seg.label}: ${formatChartValue(seg.value)}`}</title>
          </circle>
        ))}
      </svg>
      {center ? (
        <div className="absolute grid place-items-center text-center">{center}</div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ heat grid */

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

/* ------------------------------------------------------------ line chart */

function Legend({
  items,
  shape,
}: {
  items: { label: string; color: string }[];
  shape: "line" | "rect";
}) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
      {items.map((it) => (
        <li key={it.label} className="inline-flex min-w-0 items-center gap-1.5">
          <span
            aria-hidden
            className={cn(
              "shrink-0",
              shape === "line" ? "h-0.5 w-3.5 rounded-full" : "size-2.5 rounded-[3px]",
            )}
            style={{ background: it.color }}
          />
          <span className="truncate">{it.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Which x labels to print so they never collide: about six, always the last. */
function thinLabels(n: number, target = 6) {
  if (n <= target + 1) return new Set(Array.from({ length: n }, (_, i) => i));
  const k = Math.ceil((n - 1) / target);
  const shown: number[] = [];
  for (let i = 0; i < n; i += k) shown.push(i);
  const last = n - 1;
  if (shown[shown.length - 1] !== last) {
    if (last - shown[shown.length - 1] < k * 0.6) shown.pop();
    shown.push(last);
  }
  return new Set(shown);
}

/**
 * One value axis, one to six series over shared x labels. Hovering anywhere
 * over an x position shows a hairline and a readout of every series there.
 */
export function LineChart({
  series,
  labels,
  height = 200,
  min,
  max,
  unit = "",
  className,
}: {
  series: { label: string; values: number[]; tone?: ChartTone | (string & {}) }[];
  labels: string[];
  /** Plot height in px, excluding legend and x labels. */
  height?: number;
  /** Fix the value axis, e.g. 0 and 100 for scores. */
  min?: number;
  max?: number;
  /** Appended to ticks and readouts, e.g. "%". */
  unit?: string;
  className?: string;
}) {
  const n = Math.max(labels.length, ...series.map((s) => s.values.length), 1);
  const { lo, hi, ticks } = valueScale(
    series.flatMap((s) => s.values),
    min,
    max,
  );
  const xAt = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const yAt = (v: number) =>
    100 - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * 100;
  const colors = series.map((s, i) =>
    toneColor(s.tone, SERIES_ORDER[i % SERIES_ORDER.length]),
  );

  const pathFor = (values: number[]) => {
    let d = "";
    let pen = false;
    values.forEach((v, i) => {
      if (!Number.isFinite(v)) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${xAt(i).toFixed(3)},${yAt(v).toFixed(3)} `;
      pen = true;
    });
    return d.trim();
  };

  const single = series.length === 1 ? series[0] : null;
  const area =
    single && single.values.length > 1 && single.values.every(Number.isFinite)
      ? `${pathFor(single.values)} L${xAt(single.values.length - 1)},100 L0,100 Z`
      : null;

  const tickText = ticks.map((t) => tickLabel(t, unit));
  const axisWidth = `calc(${Math.max(...tickText.map((t) => t.length))}ch + 2px)`;
  const shownLabels = thinLabels(labels.length);
  const colW = n === 1 ? 100 : 100 / (n - 1);

  return (
    <figure className={cn("w-full min-w-0", className)}>
      {series.length > 1 ? (
        <Legend
          shape="line"
          items={series.map((s, i) => ({ label: s.label, color: colors[i] }))}
        />
      ) : null}

      <div className="flex gap-2 pt-2">
        {/* value axis */}
        <div
          aria-hidden
          className="relative shrink-0 text-right text-[11px] text-ink-3 tnum"
          style={{ width: axisWidth, height }}
        >
          {ticks.map((t, i) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2 leading-none whitespace-nowrap"
              style={{ top: `${yAt(t)}%` }}
            >
              {tickText[i]}
            </span>
          ))}
        </div>

        {/* plot */}
        <div className="relative mr-1.5 min-w-0 flex-1" style={{ height }}>
          <svg
            aria-hidden
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 size-full overflow-visible"
          >
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={yAt(t)}
                y2={yAt(t)}
                stroke={t === lo ? "var(--line-strong)" : "var(--line)"}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {area ? (
              <path d={area} fill={colors[0]} fillOpacity="0.1" />
            ) : null}
            {series.map((s, i) => (
              <path
                key={s.label}
                d={pathFor(s.values)}
                fill="none"
                stroke={colors[i]}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          {/* end markers: 8px dot with a 2px surface ring */}
          {series.map((s, i) => {
            let last = -1;
            s.values.forEach((v, j) => {
              if (Number.isFinite(v)) last = j;
            });
            if (last < 0) return null;
            return (
              <span
                key={s.label}
                aria-hidden
                className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                style={{
                  left: `${xAt(last)}%`,
                  top: `${yAt(s.values[last])}%`,
                  background: colors[i],
                }}
              />
            );
          })}

          {/* hover layer: one column per x position, centred on it */}
          {Array.from({ length: n }, (_, i) => {
            const left = Math.max(0, xAt(i) - colW / 2);
            const right = Math.min(100, xAt(i) + colW / 2);
            const width = right - left || 100;
            const inner = ((xAt(i) - left) / width) * 100;
            const flip = xAt(i) > 55;
            return (
              <div
                key={i}
                className="group absolute inset-y-0"
                style={{ left: `${left}%`, width: `${width}%` }}
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 hidden w-px bg-line-strong group-hover:block"
                  style={{ left: `${inner}%` }}
                />
                {series.map((s, si) =>
                  Number.isFinite(s.values[i]) ? (
                    <span
                      key={s.label}
                      aria-hidden
                      className="pointer-events-none absolute hidden size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface group-hover:block"
                      style={{
                        left: `${inner}%`,
                        top: `${yAt(s.values[i])}%`,
                        background: colors[si],
                      }}
                    />
                  ) : null,
                )}
                <div
                  aria-hidden
                  className="pointer-events-none absolute top-0 z-20 hidden min-w-[7.5rem] rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-2 whitespace-nowrap shadow-[var(--shadow-e3)] group-hover:block"
                  style={{
                    left: `${inner}%`,
                    transform: flip
                      ? "translateX(calc(-100% - 10px))"
                      : "translateX(10px)",
                  }}
                >
                  {labels[i] ? (
                    <p className="text-[11px] font-semibold text-ink-3">
                      {labels[i]}
                    </p>
                  ) : null}
                  <ul className="mt-1 space-y-1">
                    {series.map((s, si) => (
                      <li
                        key={s.label}
                        className="flex items-center gap-2 text-[12px]"
                      >
                        <span
                          className="h-0.5 w-3 shrink-0 rounded-full"
                          style={{ background: colors[si] }}
                        />
                        <span className="font-bold text-ink tnum">
                          {Number.isFinite(s.values[i])
                            ? formatChartValue(s.values[i], unit)
                            : "No data"}
                        </span>
                        <span className="text-ink-3">{s.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* x labels, aligned under their points */}
      <div aria-hidden className="mt-2 flex gap-2">
        <div className="shrink-0 text-[11px]" style={{ width: axisWidth }} />
        <div className="relative mr-1.5 h-4 min-w-0 flex-1 text-[11px] text-ink-3">
          {labels.map((l, i) =>
            shownLabels.has(i) ? (
              <span
                key={i}
                className="absolute top-0 leading-none whitespace-nowrap"
                style={{
                  left: `${xAt(i)}%`,
                  transform:
                    n === 1
                      ? "translateX(-50%)"
                      : i === 0
                        ? "none"
                        : i === n - 1
                          ? "translateX(-100%)"
                          : "translateX(-50%)",
                }}
              >
                {l}
              </span>
            ) : null,
          )}
        </div>
      </div>

      {/* The same numbers for screen readers. sr-only sits on a wrapper, not the
          table: a table will not shrink to 1px, so it widened the page on phones. */}
      <div className="sr-only">
      <table>
        <thead>
          <tr>
            <th scope="col">Label</th>
            {series.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.label}>{formatChartValue(s.values[i], unit)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}

/* ----------------------------------------------------------- stacked bar */

/**
 * Horizontal stacked bars, one row per group. Bars share one scale (the
 * largest row total) unless `normalize`, which makes every row 100%. A part's
 * colour follows its label, so "Failed" is the same colour in every row.
 */
export function StackedBar({
  rows,
  normalize = false,
  unit = "",
  className,
}: {
  rows: {
    label: string;
    parts: { label: string; value: number; tone?: ChartTone | (string & {}) }[];
  }[];
  normalize?: boolean;
  unit?: string;
  className?: string;
}) {
  const colorOf = new Map<string, string>();
  for (const r of rows) {
    for (const p of r.parts) {
      if (!colorOf.has(p.label)) {
        colorOf.set(
          p.label,
          toneColor(p.tone, SERIES_ORDER[colorOf.size % SERIES_ORDER.length]),
        );
      }
    }
  }
  const legend = [...colorOf].map(([label, color]) => ({ label, color }));
  const totals = rows.map((r) =>
    r.parts.reduce((s, p) => s + Math.max(0, p.value), 0),
  );
  const maxTotal = Math.max(...totals, 1);

  return (
    <figure className={cn("w-full min-w-0", className)}>
      {legend.length > 1 ? <Legend shape="rect" items={legend} /> : null}
      <ul className="space-y-3">
        {rows.map((row, ri) => {
          const total = totals[ri];
          const parts = row.parts.filter((p) => p.value > 0);
          const mids = parts.map((p, pi) => {
            const before = parts
              .slice(0, pi)
              .reduce((sum, q) => sum + q.value, 0);
            return total ? ((before + p.value / 2) / total) * 100 : 0;
          });
          return (
            <li
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto]"
            >
              <span
                className="truncate text-[12.5px] font-semibold text-ink-2"
                title={row.label}
              >
                {row.label}
              </span>
              <span className="text-right text-[12px] font-bold text-ink tnum sm:order-last sm:min-w-12">
                {formatChartValue(total, unit)}
              </span>
              <div className="col-span-2 min-w-0 sm:col-span-1">
                {total === 0 ? (
                  <div className="h-5 rounded-[4px] bg-surface-2" />
                ) : (
                  <div
                    className="flex h-5 gap-[2px]"
                    style={{
                      width: normalize ? "100%" : `${(total / maxTotal) * 100}%`,
                    }}
                  >
                    {parts.map((p, pi) => {
                      const pct = (p.value / total) * 100;
                      const mid = mids[pi];
                      return (
                        <div
                          key={p.label}
                          className={cn(
                            "group relative h-full min-w-[3px] transition-[filter] duration-150 hover:brightness-110",
                            pi === parts.length - 1 && "rounded-r-[4px]",
                          )}
                          style={{
                            flexGrow: p.value,
                            flexBasis: 0,
                            background: colorOf.get(p.label),
                          }}
                        >
                          <span
                            className={cn(
                              "pointer-events-none absolute bottom-full z-20 mb-1.5 hidden rounded-[var(--radius-sm)] border border-line bg-surface px-2 py-1 text-[11.5px] whitespace-nowrap shadow-[var(--shadow-e3)] group-hover:block",
                              mid > 50 ? "right-0" : "left-0",
                            )}
                          >
                            <span className="font-bold text-ink tnum">
                              {formatChartValue(p.value, unit)}
                            </span>{" "}
                            <span className="text-ink-3">
                              {p.label} · {Math.round(pct)}%
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <span className="sr-only">
                {row.parts
                  .map((p) => `${p.label} ${formatChartValue(p.value, unit)}`)
                  .join(", ")}
              </span>
            </li>
          );
        })}
      </ul>
    </figure>
  );
}

/* ---------------------------------------------------------------- funnel */

/**
 * A conversion funnel. Bar width is the share of the first step; the
 * percentage beside each value compares it with the step before.
 */
export function Funnel({
  steps,
  tone = "brand",
  unit = "",
  className,
}: {
  steps: { label: string; value: number }[];
  tone?: ChartTone | (string & {});
  unit?: string;
  className?: string;
}) {
  const first = Math.max(steps[0]?.value ?? 0, 1);
  const color = toneColor(tone);
  return (
    <figure className={cn("w-full min-w-0", className)}>
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const prev = i > 0 ? steps[i - 1].value : null;
          const conv =
            prev != null && prev > 0 ? Math.round((s.value / prev) * 100) : null;
          const width = Math.max(0, Math.min(100, (s.value / first) * 100));
          return (
            <li key={`${s.label}-${i}`}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span
                  className="min-w-0 truncate text-[12.5px] font-semibold text-ink-2"
                  title={s.label}
                >
                  {s.label}
                </span>
                <span className="shrink-0 text-[12.5px] whitespace-nowrap">
                  <span className="font-bold text-ink tnum">
                    {formatChartValue(s.value, unit)}
                  </span>
                  {conv != null ? (
                    <span className="ml-1.5 text-ink-3 tnum">{conv}%</span>
                  ) : null}
                </span>
              </div>
              <div className="flex h-6 justify-center rounded-[4px] bg-surface-2">
                <div
                  className="h-full min-w-[3px] rounded-[4px]"
                  style={{ width: `${width}%`, background: color }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {steps.length > 1 ? (
        <figcaption className="mt-3 text-[11.5px] text-ink-3">
          Bar width is the share of the first step. Percentages compare each
          step with the one before it.
        </figcaption>
      ) : null}
    </figure>
  );
}
