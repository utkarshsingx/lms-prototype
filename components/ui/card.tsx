import { cn } from "@/lib/cn";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e1)]",
        interactive &&
          "transition-[box-shadow,border-color,transform] duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-e3)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  sub,
  action,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 px-5 pt-4.5 pb-3.5",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="text-[14.5px] leading-tight font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h3>
        {sub ? (
          <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{sub}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Section heading used above bare content groups, outside a Card. */
export function SectionTitle({
  children,
  action,
  className,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3.5 flex items-end justify-between gap-4", className)}>
      <h2 className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}
