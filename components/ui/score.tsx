import { cn } from "@/lib/cn";

export type ScoreTone = "jade" | "amber" | "rose";

/** Bands used for readiness, ATS and Company Readiness Scores: ≥70 jade, 50 to 69 amber, <50 rose. */
export function scoreTone(value: number): ScoreTone {
  if (value >= 70) return "jade";
  if (value >= 50) return "amber";
  return "rose";
}

const BAND_LABEL: Record<ScoreTone, string> = {
  jade: "Strong",
  amber: "Borderline",
  rose: "At risk",
};

export function scoreBand(value: number): { tone: ScoreTone; label: string } {
  const tone = scoreTone(value);
  return { tone, label: BAND_LABEL[tone] };
}

const clamp = (v: number) => Math.max(0, Math.min(100, Number.isFinite(v) ? v : 0));

const fillClass: Record<ScoreTone, string> = {
  jade: "bg-jade",
  amber: "bg-amber",
  rose: "bg-rose",
};
const textClass: Record<ScoreTone, string> = {
  jade: "text-jade",
  amber: "text-amber",
  rose: "text-rose",
};

export function ScoreRing({
  value,
  size = 72,
  stroke = 7,
  label,
  showBand = false,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  /** Accessible name, e.g. "FR readiness score". */
  label?: string;
  /** Show "Strong / Borderline / At risk" under the figure (needs size ≥ 88). */
  showBand?: boolean;
  className?: string;
}) {
  const pct = clamp(value);
  const tone = scoreTone(pct);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const figure = Math.round(pct);
  return (
    <div
      role="meter"
      aria-valuenow={figure}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Score"}
      aria-valuetext={`${figure} out of 100, ${BAND_LABEL[tone]}`}
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
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
          stroke={`var(--${tone})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
          className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-quint)]"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-center">
        <span className="leading-none">
          <span
            className="block font-display font-bold tracking-[-0.03em] text-ink tnum"
            style={{ fontSize: Math.max(13, Math.round(size * 0.3)) }}
          >
            {figure}
          </span>
          {showBand ? (
            <span className={cn("mt-1 block text-[10.5px] font-semibold", textClass[tone])}>
              {BAND_LABEL[tone]}
            </span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

export function ScoreBar({
  value,
  label,
  showValue = true,
  marker,
  height = 8,
  className,
}: {
  value: number;
  label?: React.ReactNode;
  showValue?: boolean;
  /** Draw a tick at this value, e.g. 50 for the ACCA pass mark. */
  marker?: number;
  height?: number;
  className?: string;
}) {
  const pct = clamp(value);
  const tone = scoreTone(pct);
  const figure = Math.round(pct);
  return (
    <div className={cn("min-w-0", className)}>
      {label || showValue ? (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
          {label ? <span className="min-w-0 truncate text-[12.5px] text-ink-2">{label}</span> : <span />}
          {showValue ? (
            <span className={cn("font-mono text-[12.5px] font-semibold tnum", textClass[tone])}>
              {figure}
            </span>
          ) : null}
        </div>
      ) : null}
      <div
        role="meter"
        aria-valuenow={figure}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={typeof label === "string" ? label : "Score"}
        className="relative overflow-visible rounded-full bg-surface-3"
        style={{ height }}
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700 ease-[var(--ease-out-quint)]",
            fillClass[tone],
          )}
          style={{ width: `${pct}%` }}
        />
        {marker != null ? (
          <span
            aria-hidden
            title={`Mark at ${marker}`}
            className="absolute -top-1 -bottom-1 w-0.5 -translate-x-1/2 rounded-full bg-ink"
            style={{ left: `${clamp(marker)}%` }}
          />
        ) : null}
      </div>
    </div>
  );
}
