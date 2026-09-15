"use client";

import { cn } from "@/lib/cn";
import { useRole } from "@/lib/role";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";

/** Programme operations pages are editable with `programme:ops`; p-deepa reads them only. */
export function useOpsAccess() {
  const { can, persona } = useRole();
  const canEdit = can("programme:ops");
  const reason = canEdit
    ? undefined
    : `View-only: ${persona.name} does not have the Programme operations permission. Ask a ZSkillup Super Admin to update the role.`;
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
    <span title={!allowed ? reason : undefined} className={cn("inline-flex", wrapperClassName)}>
      <Button type="button" variant={variant} size={size} disabled={off} className={className} {...props}>
        {children}
      </Button>
    </span>
  );
}

/** 11px uppercase label used for groups inside cards and drawers. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>
  );
}

/** Plain "n things" with a singular form. */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Demo clock for the operations workspace: Monday 14 September 2026, 10:00 IST. */
export const OPS_NOW = "2026-09-14T10:00";

/** Whole hours between two IST datetimes ("2026-09-14T10:00"). */
export function hoursBetween(from: string, to: string) {
  const toMin = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
    const hh = Number(iso.slice(11, 13) || 0);
    const mm = Number(iso.slice(14, 16) || 0);
    return Date.UTC(y, m - 1, d) / 60000 + hh * 60 + mm;
  };
  return Math.floor((toMin(to) - toMin(from)) / 60);
}
