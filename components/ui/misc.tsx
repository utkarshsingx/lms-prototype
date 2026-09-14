import { cn } from "@/lib/cn";
import { Sparkline } from "./charts";

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
  badge,
  className,
}: {
  /** Nav section name, set as an uppercase label above the title. */
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  /** Sits beside the title: a scope chip, "View-only access", a status. */
  badge?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
        className,
      )}
    >
      <div className="min-w-0 max-w-3xl">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="min-w-0 font-display text-[clamp(1.75rem,1.35rem+1.5vw,2.375rem)] leading-[1.08] tracking-[var(--display-tracking)] text-ink">
            {title}
          </h1>
          {badge ? (
            <div className="flex flex-wrap items-center gap-2">{badge}</div>
          ) : null}
        </div>
        {sub ? (
          <p className="mt-2.5 max-w-2xl text-[14px] leading-relaxed text-ink-2">
            {sub}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}

type StatTone = "brand" | "jade" | "ember" | "violet" | "amber" | "rose";

/* Literal class names so Tailwind can see them; `bg-${tone}-soft` would not
   be generated. */
const CHIP: Record<StatTone, string> = {
  brand: "bg-brand-soft text-brand",
  jade: "bg-jade-soft text-jade",
  ember: "bg-ember-soft text-ember",
  violet: "bg-violet-soft text-violet",
  amber: "bg-amber-soft text-amber",
  rose: "bg-rose-soft text-rose",
};

export function StatTile({
  label,
  value,
  delta,
  spark,
  tone = "brand",
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; up?: boolean };
  spark?: number[];
  tone?: StatTone;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-4.5 shadow-[var(--shadow-e1)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 pt-0.5 text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">
          {label}
        </p>
        {icon ? (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] [&>svg]:size-[18px]",
              CHIP[tone],
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 gap-y-1",
          icon ? "mt-1.5" : "mt-3",
        )}
      >
        <span className="font-display text-[30px] leading-none tracking-[var(--display-tracking)] text-ink tnum">
          {value}
        </span>
        {delta ? (
          <span
            className={cn(
              "text-[12px] font-semibold tnum",
              delta.up === false ? "text-rose" : "text-jade",
            )}
          >
            {/* An arrow only where a direction is actually meant. "6h faster"
                carries its own sign; an up-arrow beside a falling line does not. */}
            {typeof delta.up === "boolean" ? (delta.up ? "↑ " : "↓ ") : ""}
            {delta.value}
          </span>
        ) : null}
      </div>
      {spark ? (
        <div className="mt-3 -mb-1">
          <Sparkline data={spark} tone={tone} height={30} />
        </div>
      ) : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  sub,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  sub?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid place-items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3.5 grid size-12 place-items-center rounded-full bg-cta-soft text-ink [&>svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {sub ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-3">
          {sub}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-ink-3 shadow-[0_1px_0_var(--line-strong)]">
      {children}
    </kbd>
  );
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-line" />;
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-line" />
      <span className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
        {label}
      </span>
      <hr className="flex-1 border-line" />
    </div>
  );
}

/** Definition row used in detail panes: label left, value right. */
export function DataRow({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
      <dt className="text-[12.5px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-semibold text-ink">
        {children}
      </dd>
    </div>
  );
}
