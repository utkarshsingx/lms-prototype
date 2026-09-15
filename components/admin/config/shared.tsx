"use client";

import { addDays, daysBetween } from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { RestrictedNotice } from "@/components/ui/restricted";
import { toast } from "@/components/ui/toast";

/** Demo "now" for timers: Monday 14 Sep 2026, 10:30 IST. */
export const DEMO_NOW = "2026-09-14T10:30";

function toMinutes(iso: string) {
  const days = daysBetween("2026-01-01", iso.slice(0, 10));
  const [h, m] = (iso.length > 10 ? iso.slice(11, 16) : "00:00").split(":").map(Number);
  return days * 1440 + h * 60 + m;
}

/** Whole hours from `from` to `to` (IST strings without offset). */
export function hoursBetween(from: string, to: string) {
  return Math.round((toMinutes(to) - toMinutes(from)) / 60);
}

/** IST datetime string plus `hours` (may be fractional of a day). */
export function addHoursIso(iso: string, hours: number) {
  const total = toMinutes(iso) + Math.round(hours * 60);
  const days = Math.floor(total / 1440);
  const mins = total - days * 1440;
  const hh = String(Math.floor(mins / 60)).padStart(2, "0");
  const mm = String(mins % 60).padStart(2, "0");
  return `${addDays("2026-01-01", days)}T${hh}:${mm}`;
}

/** "41h" under two days, "3d 5h" beyond. */
export function formatHours(hours: number) {
  const h = Math.abs(hours);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  const rest = h % 24;
  return rest ? `${d}d ${rest}h` : `${d}d`;
}

export function queueExport(fileName: string) {
  toast({ title: `Report queued: ${fileName}`, tone: "info" });
}

/** House page frame for Super Admin configuration pages; every page needs platform:all. */
export function AdminConfigFrame({ children }: { children: React.ReactNode }) {
  const { can } = useRole();
  if (!can("platform:all")) return <RestrictedNotice permission="platform:all" />;
  return <div className="mx-auto max-w-[86rem] space-y-7">{children}</div>;
}

/** Display-font heading for a block inside a page or tab panel. */
export function BlockHeading({
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
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-3", className)}>
      <div className="min-w-0 max-w-3xl">
        <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">{title}</h2>
        {sub ? <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Label and value pair for compact settings summaries. */
export function Fact({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">{label}</dt>
      <dd className="mt-1 text-[13.5px] font-semibold break-words text-ink">{children}</dd>
    </div>
  );
}

/** Small uppercase group label used inside cards and drawers. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** Monospace code chip, black with yellow text, for paper codes and IDs on cards. */
export function CodeChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid h-8 min-w-11 shrink-0 place-items-center rounded-[10px] bg-surface-inv px-2 font-mono text-[12.5px] font-bold text-cta",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Keeps a tooltip on a disabled control, which ignores pointer events itself. */
export function WithHint({ hint, children }: { hint?: string; children: React.ReactNode }) {
  return (
    <span title={hint} className="inline-flex">
      {children}
    </span>
  );
}
