import { cn } from "@/lib/cn";

export type HeroStat = {
  label: string;
  value: React.ReactNode;
  /** Small line under the figure, e.g. "2 due this week". */
  hint?: React.ReactNode;
};

/** Black dashboard opener: greeting, 2 to 4 white headline figures, yellow CTA slot. */
export function HeroBand({
  eyebrow,
  title,
  sub,
  stats,
  actions,
  aside,
  titleAs: Title = "h1",
  className,
}: {
  eyebrow: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  stats?: HeroStat[];
  /** Put a primary (yellow) Button or LinkButton here. */
  actions?: React.ReactNode;
  /** Optional right column on wide screens (a ScoreRing, a persona card). */
  aside?: React.ReactNode;
  /** Heading level; dashboards keep h1. */
  titleAs?: "h1" | "h2";
  className?: string;
}) {
  const count = stats?.length ?? 0;
  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[var(--radius-xl)] bg-surface-inv px-5 py-6 text-ink-inv sm:px-8 sm:py-8",
        className,
      )}
    >
      {/* Yellow glow and rule: decoration only, token colours. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-cta opacity-[0.16] blur-3xl"
      />
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-cta" />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-2xl">
          <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">{eyebrow}</p>
          <Title className="mt-2 font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.45rem)] leading-[1.08] font-bold tracking-[-0.03em] text-ink-inv">
            {title}
          </Title>
          {sub ? (
            <p className="mt-2.5 max-w-xl text-[14px] leading-relaxed text-ink-inv/75">{sub}</p>
          ) : null}
          {actions ? <div className="mt-5 flex flex-wrap items-center gap-2.5">{actions}</div> : null}
        </div>
        {aside ? <div className="min-w-0 shrink-0">{aside}</div> : null}
      </div>

      {count > 0 ? (
        <dl
          className={cn(
            "mt-7 grid gap-x-6 gap-y-5 border-t border-ink-inv/15 pt-5",
            count === 1 && "grid-cols-1",
            count === 2 && "grid-cols-2",
            count === 3 && "grid-cols-2 sm:grid-cols-3",
            count >= 4 && "grid-cols-2 md:grid-cols-4",
          )}
        >
          {stats!.map((s) => (
            <div key={s.label} className="min-w-0">
              <dt className="text-[12px] font-medium text-ink-inv/65">{s.label}</dt>
              <dd className="mt-1 font-display text-[clamp(1.4rem,1.15rem+0.9vw,1.9rem)] leading-none font-bold tracking-[-0.03em] break-words text-ink-inv tnum">
                {s.value}
              </dd>
              {s.hint ? <dd className="mt-1.5 text-[12px] text-ink-inv/60">{s.hint}</dd> : null}
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}
