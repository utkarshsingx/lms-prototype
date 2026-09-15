import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export type KpiTone = "neutral" | "jade" | "amber" | "rose" | "violet" | "info" | "cta";
export type KpiTrend = "up" | "down" | "flat";

const iconChip: Record<KpiTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  jade: "bg-jade-soft text-jade",
  amber: "bg-amber-soft text-amber",
  rose: "bg-rose-soft text-rose",
  violet: "bg-violet-soft text-violet",
  info: "bg-info-soft text-info",
  cta: "bg-cta text-cta-ink",
};

export function KpiTile({
  label,
  value,
  delta,
  trend,
  goodWhen = "up",
  tone = "neutral",
  icon,
  hero = false,
  sub,
  href,
  className,
}: {
  label: string;
  value: React.ReactNode;
  /** Short change text, e.g. "+6 this week". */
  delta?: React.ReactNode;
  /** Direction of `delta`; picks the arrow. Colour follows `goodWhen`. */
  trend?: KpiTrend;
  /** For counts where rising is bad (open tickets, overdue fees) pass "down". */
  goodWhen?: "up" | "down";
  tone?: KpiTone;
  icon?: React.ReactNode;
  /** Black tile with a yellow figure: the one headline number on a page. */
  hero?: boolean;
  sub?: React.ReactNode;
  /** Makes the whole tile a link. */
  href?: string;
  className?: string;
}) {
  const good = trend === "flat" || trend == null ? null : trend === goodWhen;
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "min-w-0 text-[12.5px] leading-snug font-semibold",
            hero ? "text-ink-inv/75" : "text-ink-3",
          )}
        >
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-[10px] [&>svg]:size-4",
              hero ? "bg-ink-inv/10 text-cta" : iconChip[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-2 font-display text-[clamp(1.5rem,1.25rem+0.9vw,1.95rem)] leading-none font-bold tracking-[-0.03em] break-words tnum",
          hero ? "text-cta" : "text-ink",
        )}
      >
        {value}
      </p>
      {delta || sub ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-semibold tnum",
                // Light-theme jade and rose are too dark to read on the black tile.
                hero
                  ? "text-ink-inv/85"
                  : good === null
                    ? "text-ink-2"
                    : good
                      ? "text-jade"
                      : "text-rose",
              )}
            >
              {trend ? <TrendIcon aria-hidden className="size-3.5" strokeWidth={2.4} /> : null}
              {delta}
            </span>
          ) : null}
          {sub ? <span className={hero ? "text-ink-inv/60" : "text-ink-3"}>{sub}</span> : null}
        </div>
      ) : null}
    </>
  );

  const shell = cn(
    "relative block min-w-0 rounded-[var(--radius-lg)] border p-4 sm:p-4.5",
    hero ? "border-transparent bg-surface-inv text-ink-inv" : "border-line bg-surface",
    href &&
      "transition-[border-color,transform] duration-150 hover:-translate-y-px " +
        (hero ? "hover:border-cta" : "hover:border-line-strong"),
    className,
  );

  if (href) {
    return (
      <Link href={href} className={shell}>
        {body}
      </Link>
    );
  }
  return <div className={shell}>{body}</div>;
}

const COLS: Record<2 | 3 | 4 | 5 | 6, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
  6: "grid-cols-2 md:grid-cols-3 xl:grid-cols-6",
};

/** Responsive KPI grid: two up on phones, `cols` up on wide screens. */
export function KpiRow({
  children,
  cols = 4,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  return <div className={cn("grid gap-3", COLS[cols], className)}>{children}</div>;
}
