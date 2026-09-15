"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEFAULT_UNIVERSITY_ID, universityById, type University } from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";

/** The signed-in university workspace. Prof. Lakshmi Rao has no `university:edit`: view-only. */
export function useUniversityWorkspace() {
  const { persona, can } = useRole();
  const uni = (universityById(persona.universityId) ?? universityById(DEFAULT_UNIVERSITY_ID)) as University;
  const canEdit = can("university:edit");
  const reason = canEdit
    ? undefined
    : `View-only access: ${persona.name} can view ${uni.shortName} records but cannot verify, update or send. Ask a ZSkillup Super Admin or your Programme Director to change access.`;
  const firstName = persona.name.replace(/^(Dr|Prof\.)\s+/, "").split(" ")[0];
  return { uni, canEdit, reason, persona, firstName };
}

const MARK_SIZE = {
  xs: "size-5 rounded-[5px] text-[8.5px]",
  sm: "size-7 rounded-[7px] text-[10.5px]",
  md: "size-10 rounded-[10px] text-[13px]",
  lg: "size-14 rounded-[14px] text-[17px]",
} as const;

/** The partner's logo initials on its own brand colour (data, not theme). */
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

/** Sub-page header for the university workspace: branded eyebrow, view-only chip for editors without edit. */
export function UniversityHeader({
  section,
  title,
  sub,
  actions,
  badge,
}: {
  section: string;
  title: string;
  sub: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  const { uni, canEdit, reason } = useUniversityWorkspace();
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

/** A button that stays visible for view-only personas, disabled with its tooltip on a wrapper. */
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

/** 11px uppercase label for groups inside cards and drawers. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** Underlined text link with the gold decoration used across the workspace. */
export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4 hover:decoration-cta-strong",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
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

/** Footnote where headline enrolment figures meet listed learner records. */
export function RecordsNote({ total, listed }: { total: number; listed: number }) {
  return (
    <p className="text-[12px] leading-relaxed text-ink-3">
      Enrolment and headline figures cover all {total} students. Tables list the {listed} learner records synced to this
      workspace.
    </p>
  );
}
