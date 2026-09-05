import { cn } from "@/lib/cn";
import { Sparkline } from "./charts";

export function PageHeader({
  eyebrow,
  title,
  sub,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-4",
        className,
      )}
    >
      <div className="min-w-0 max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="font-display text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-[1.08] tracking-[-0.015em] text-ink">
          {title}
        </h1>
        {sub ? (
          <p className="mt-2.5 text-[14px] leading-relaxed text-ink-2">{sub}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      ) : null}
    </header>
  );
}

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
  tone?: "brand" | "jade" | "ember" | "violet" | "amber" | "rose";
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
        <p className="text-[12px] font-medium tracking-[0.01em] text-ink-3">
          {label}
        </p>
        {icon ? (
          <span className={cn("[&>svg]:size-4", `text-${tone}`)} style={{ color: `var(--${tone})` }}>
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-[26px] leading-none font-semibold tracking-[-0.03em] text-ink tnum">
          {value}
        </span>
        {delta ? (
          <span
            className={cn(
              "text-[12px] font-medium tnum",
              delta.up === false ? "text-rose" : "text-jade",
            )}
          >
            {delta.up === false ? "↓" : "↑"} {delta.value}
          </span>
        ) : null}
      </div>
      {spark ? (
        <div className="mt-3 -mb-1">
          <Sparkline
            data={spark}
            tone={tone === "amber" || tone === "rose" ? "ember" : tone}
            height={30}
          />
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
        "grid place-items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface-2/50 px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="mb-3.5 grid size-11 place-items-center rounded-full border border-line bg-surface text-ink-3 shadow-[var(--shadow-e1)] [&>svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-[14.5px] font-semibold text-ink">{title}</p>
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
    <kbd className="inline-grid min-w-5 place-items-center rounded-[5px] border border-line bg-surface-2 px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-ink-3 shadow-[0_1px_0_var(--line-strong)]">
      {children}
    </kbd>
  );
}

export function Divider({ label }: { label?: string }) {
  if (!label) return <hr className="border-line" />;
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-line" />
      <span className="text-[11px] font-medium tracking-[0.08em] text-ink-3 uppercase">
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
      <dd className="text-right text-[13px] font-medium text-ink">{children}</dd>
    </div>
  );
}
