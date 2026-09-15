"use client";

import { cn } from "@/lib/cn";
import { useRole, type Permission } from "@/lib/role";
import { ACCA_TODAY, daysBetween, formatAccaDate, type Student } from "@/lib/data/acca";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/**
 * ACCA operations and university coordination pages are editable with their permission.
 * p-deepa (finance operations) reads them only.
 */
export function useEditAccess(permission: Permission) {
  const { can, persona } = useRole();
  const canEdit = can(permission);
  const area = permission === "programme:universities" ? "University coordination" : "ACCA operations";
  const reason = canEdit
    ? undefined
    : `View-only: ${persona.name} does not have the ${area} permission. Ask a ZSkillup Super Admin to update the role.`;
  return { canEdit, reason, persona };
}

/** A button that stays visible for read-only personas, disabled with a tooltip on a wrapper. */
export function GatedButton({
  allowed,
  reason,
  variant = "primary",
  size = "md",
  className,
  wrapperClassName,
  disabled,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  allowed: boolean;
  reason?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  wrapperClassName?: string;
}) {
  const off = !allowed || disabled;
  return (
    <span title={!allowed ? reason : props.title} className={cn("inline-flex", wrapperClassName)}>
      <Button type="button" variant={variant} size={size} disabled={off} className={className} {...props}>
        {children}
      </Button>
    </span>
  );
}

/** 11px uppercase label used for groups inside cards and drawers. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "in 21 days" / "today" / "3 days ago", relative to the demo today. */
export function relativeDays(iso: string) {
  const n = daysBetween(ACCA_TODAY, iso);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n > 0) return `in ${n} days`;
  return n === -1 ? "yesterday" : `${-n} days ago`;
}

/** Lower-case, hyphenated file-name fragment. */
export function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const TODAY_LABEL = formatAccaDate(ACCA_TODAY);

/** Name plus a short second line used in student cells. */
export function StudentCell({ student, sub }: { student: Pick<Student, "name">; sub?: React.ReactNode }) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-semibold text-ink">{student.name}</span>
      {sub ? <span className="block truncate text-[12px] text-ink-3">{sub}</span> : null}
    </span>
  );
}

/** Small inline note with an icon, for rules and scope reminders. */
export function Note({
  icon,
  children,
  tone = "neutral",
  className,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "amber" | "rose" | "info" | "jade";
  className?: string;
}) {
  const tones = {
    neutral: "border-line bg-surface-2 text-ink-2",
    amber: "border-transparent bg-amber-soft text-ink",
    rose: "border-transparent bg-rose-soft text-ink",
    info: "border-transparent bg-info-soft text-ink",
    jade: "border-transparent bg-jade-soft text-ink",
  } as const;
  const iconTone = {
    neutral: "text-ink-3",
    amber: "text-amber",
    rose: "text-rose",
    info: "text-info",
    jade: "text-jade",
  } as const;
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-[12.5px] leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {icon ? (
        <span aria-hidden className={cn("mt-0.5 shrink-0 [&>svg]:size-4", iconTone[tone])}>
          {icon}
        </span>
      ) : null}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
