"use client";

import {
  DEFAULT_UNIVERSITY_ID,
  students as allStudents,
  universityById,
  type University,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";

/** The signed-in university workspace. Prof. Lakshmi Rao has no `university:edit`, so she is view-only. */
export function useWorkspace() {
  const { persona, can } = useRole();
  const uni = (universityById(persona.universityId) ?? universityById(DEFAULT_UNIVERSITY_ID)) as University;
  const canEdit = can("university:edit");
  const reason = canEdit
    ? undefined
    : `View-only access: ${persona.name} can view ${uni.shortName} records but cannot add, change or publish. Ask your Programme Director to change access.`;
  return { uni, canEdit, reason, persona };
}

const MARK_SIZE = {
  xs: "size-5 rounded-[5px] text-[8.5px]",
  sm: "size-7 rounded-[7px] text-[10.5px]",
  md: "size-10 rounded-[10px] text-[13px]",
} as const;

/** The partner's logo initials on its own brand colour (data-driven, not a theme colour). */
export function UniversityMark({
  uni,
  size = "sm",
  className,
}: {
  uni: University;
  size?: keyof typeof MARK_SIZE;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-grid shrink-0 place-items-center font-bold tracking-normal text-white normal-case ring-1 ring-ink-inv/20",
        MARK_SIZE[size],
        className,
      )}
      style={{ backgroundColor: uni.branding.primary }}
    >
      {uni.branding.logoInitials}
    </span>
  );
}

/** Sub-page header: university-branded eyebrow with the nav section, and the view-only chip where it applies. */
export function WorkspaceHeader({
  section,
  title,
  sub,
  actions,
  badge,
}: {
  section: string;
  title: string;
  sub: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const { uni, canEdit, reason } = useWorkspace();
  return (
    <PageHeader
      eyebrow={
        <span className="inline-flex items-center gap-2">
          <UniversityMark uni={uni} size="xs" />
          <span>
            {uni.name} · {section}
          </span>
        </span>
      }
      title={title}
      sub={sub}
      badge={
        canEdit && !badge ? undefined : (
          <>
            {badge}
            {canEdit ? null : <ViewOnlyChip reason={reason} />}
          </>
        )
      }
      actions={actions}
    />
  );
}

/** A button that stays visible when not allowed: disabled, with its tooltip on a wrapper. */
export function Gated({
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
    <span title={off ? reason : undefined} className={cn("inline-flex", wrapperClassName)}>
      <Button type="button" variant={variant} size={size} disabled={off} className={className} {...props}>
        {children}
      </Button>
    </span>
  );
}

/** 11px uppercase label for groups inside cards and drawers. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** Bordered callout for scope and policy notes. */
export function Callout({
  icon,
  title,
  children,
  tone = "neutral",
  className,
}: {
  icon: React.ReactNode;
  title?: React.ReactNode;
  children: React.ReactNode;
  tone?: "neutral" | "info" | "amber" | "rose";
  className?: string;
}) {
  const chip = {
    neutral: "bg-surface-inv text-cta",
    info: "bg-info-soft text-info",
    amber: "bg-amber-soft text-amber",
    rose: "bg-rose-soft text-rose",
  }[tone];
  return (
    <div className={cn("flex min-w-0 items-start gap-3.5 rounded-[var(--radius-lg)] border border-line bg-surface p-4", className)}>
      <span aria-hidden className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] [&>svg]:size-4", chip)}>
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed text-ink-2">
        {title ? <p className="text-[14px] font-semibold text-ink">{title}</p> : null}
        <div className={title ? "mt-0.5" : undefined}>{children}</div>
      </div>
    </div>
  );
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function queueReport(fileName: string, body?: string) {
  toast({ title: `Report queued: ${fileName}`, body, tone: "info" });
}

export function intakeYear(intakeId: string) {
  return intakeId.slice(3, 7);
}

export function intakeShort(intakeId: string) {
  return `${intakeYear(intakeId)} intake`;
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Same assignment as the Students page (fixed order), so roll numbers agree across the workspace.
const ROLLS = (() => {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const s of [...allStudents].filter((x) => x.universityId).sort((a, b) => a.id.localeCompare(b.id))) {
    const prefix = universityById(s.universityId)?.branding.logoInitials ?? "UN";
    let n = 100 + (hash(s.id) % 900);
    let roll = `${prefix}-${intakeYear(s.intakeId)}-${String(n).padStart(4, "0")}`;
    while (used.has(roll)) {
      n += 1;
      roll = `${prefix}-${intakeYear(s.intakeId)}-${String(n).padStart(4, "0")}`;
    }
    used.add(roll);
    map.set(s.id, roll);
  }
  return map;
})();

/** University roll number in the workspace format BU-YYYY-NNNN, stable per student. */
export function rollNumber(studentId: string) {
  return ROLLS.get(studentId) ?? "Not on roll";
}

/** Fixed demo clock for SLA and age maths: Monday 14 Sep 2026, 15:00 IST. */
export const DEMO_NOW = "2026-09-14T15:00";

/** Whole hours between two IST datetime strings ("2026-09-14T15:00"). */
export function hoursBetween(from: string, to: string) {
  const toMin = (iso: string) => {
    const [d, t = "00:00"] = iso.split("T");
    const [y, m, day] = d.split("-").map(Number);
    const [hh, mm] = t.split(":").map(Number);
    return Date.UTC(y, m - 1, day, hh, mm) / 60000;
  };
  return Math.floor((toMin(to) - toMin(from)) / 60);
}

export function durationLabel(hours: number) {
  if (hours < 1) return "under 1h";
  if (hours < 24) return `${hours}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}
