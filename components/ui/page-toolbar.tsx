import { Eye, Users } from "lucide-react";
import { cn } from "@/lib/cn";

/** Actions row: optional context on the left, actions right-aligned; wraps on phones. */
export function PageToolbar({
  children,
  start,
  className,
}: {
  children?: React.ReactNode;
  /** Left-side context: a ViewOnlyChip, a ScopeChip, a result count. */
  start?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-2.5",
        start ? "justify-between" : "justify-end",
        className,
      )}
    >
      {start ? <div className="flex min-w-0 flex-wrap items-center gap-2">{start}</div> : null}
      {children ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">{children}</div>
      ) : null}
    </div>
  );
}

/** Shown in the page header for view-only personas (e.g. Prof. Lakshmi Rao). */
export function ViewOnlyChip({
  label = "View-only access",
  reason = "Your role can view these records but cannot create, edit or upload.",
  className,
}: {
  label?: string;
  reason?: string;
  className?: string;
}) {
  return (
    <span
      title={reason}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ink",
        className,
      )}
    >
      <Eye aria-hidden className="size-3.5 text-amber" strokeWidth={2.2} />
      {label}
      <span className="sr-only">. {reason}</span>
    </span>
  );
}

/** Data-scope chip, e.g. "Showing your 18 allocated students". */
export function ScopeChip({
  children,
  icon,
  className,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border border-cta bg-cta-soft px-2.5 py-1 text-[12px] font-semibold text-ink [&>svg]:size-3.5 [&>svg]:shrink-0",
        className,
      )}
    >
      {icon ?? <Users aria-hidden strokeWidth={2.2} />}
      <span className="truncate">{children}</span>
    </span>
  );
}
