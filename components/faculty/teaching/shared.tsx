"use client";

import {
  ACCA_TODAY,
  cohortById,
  cohortsForFaculty,
  paperByCode,
  sectionById,
  staffById,
  studentsInCohort,
  type Cohort,
  type LiveClass,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { formatCalendarDate } from "@/components/ui/calendar";

/** Demo clock for the faculty workspace: Monday 14 September 2026, 10:00 IST. */
export const FACULTY_NOW = "2026-09-14T10:00";
export const WEEK_END = "2026-09-20";

/** The signed-in faculty member, their assigned papers and cohorts, and their permissions. */
export function useFaculty() {
  const { persona, can } = useRole();
  const own = persona.staffId ? staffById(persona.staffId) : undefined;
  const staffId = own && own.kind === "faculty" ? own.id : "st-marcus";
  const me = staffById(staffId)!;
  const papers: PaperCode[] = me.focusPapers;
  const cohorts: Cohort[] = cohortsForFaculty(staffId);
  return {
    persona,
    staffId,
    me,
    firstName: me.name.split(" ")[0],
    papers,
    cohorts,
    canGrade: can("faculty:grade"),
    canApprove: can("faculty:approve-reattempt"),
    canPublish: can("content:publish"),
  };
}

/** A button that stays visible when the role lacks a permission, disabled with a tooltip on a wrapper. */
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
  return (
    <span title={!allowed ? reason : undefined} className={cn("inline-flex", wrapperClassName)}>
      <Button type="button" variant={variant} size={size} disabled={!allowed || disabled} className={className} {...props}>
        {children}
      </Button>
    </span>
  );
}

/** 11px uppercase label for groups inside cards and drawers. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** Black paper-code tile with a yellow code, the faculty identity mark for a paper. */
export function PaperMark({ code, size = "md" }: { code: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[12px] bg-surface-inv font-display font-bold tracking-[-0.02em] text-cta",
        size === "sm" && "size-8 text-[11.5px]",
        size === "md" && "size-10 text-[13px]",
        size === "lg" && "size-14 text-[17px]",
      )}
    >
      {code}
    </span>
  );
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2026-09-15T19:30" → "Tue 15 Sep". */
export function dayLabel(iso: string) {
  return formatCalendarDate(iso.slice(0, 10), "day");
}

/** "2026-09-15T19:30" → "Tuesday 15 September 2026". */
export function longDay(iso: string) {
  return formatCalendarDate(iso.slice(0, 10), "long");
}

/** Clock time `mins` after an IST datetime. */
export function endTime(start: string, mins: number) {
  const h = Number(start.slice(11, 13));
  const m = Number(start.slice(14, 16));
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "Tue 15 Sep · 19:30 to 21:30". */
export function whenLabel(start: string, mins: number) {
  return `${dayLabel(start)} · ${start.slice(11, 16)} to ${endTime(start, mins)}`;
}

export function isToday(iso: string) {
  return iso.slice(0, 10) === ACCA_TODAY;
}

export function paperTitle(code: PaperCode) {
  return paperByCode(code)?.name ?? code;
}

export function areaTitle(paper: PaperCode, area: string) {
  return paperByCode(paper)?.syllabusAreas.find((a) => a.code === area)?.title ?? area;
}

/** Cohort and batch or section name, e.g. "FR · Dec 2026 · Weekend · Saturday batch". */
export function cohortBatchLabel(cohortId: string, sectionId?: string) {
  const cohort = cohortById(cohortId);
  if (!cohort) return cohortId;
  const section = sectionId ? sectionById(sectionId) : undefined;
  return section && cohort.sections.length > 1 ? `${cohort.name} · ${section.name}` : cohort.name;
}

/** The batch a learner sits in for a given cohort (a single-batch cohort has one for everybody). */
export function batchFor(student: Student, cohort: Cohort) {
  if (cohort.sections.length === 1) return cohort.sections[0];
  return cohort.sections.find((s) => s.id === student.sectionId);
}

/** Sample learner records attending a class: the cohort's records, narrowed to the class batch. */
export function rosterFor(c: Pick<LiveClass, "cohortId" | "sectionId">): Student[] {
  const cohort = cohortById(c.cohortId);
  const list = studentsInCohort(c.cohortId);
  if (!cohort || cohort.sections.length < 2 || !c.sectionId) return list;
  return list.filter((s) => s.sectionId === c.sectionId);
}

/** Headline size of the class batch, falling back to the cohort. */
export function batchSize(c: Pick<LiveClass, "cohortId" | "sectionId">) {
  const section = c.sectionId ? sectionById(c.sectionId) : undefined;
  return section?.size ?? cohortById(c.cohortId)?.size ?? 0;
}

/** Stable small integer from a string, for deterministic sample figures. */
export function hashOf(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function daysAgoLabel(days: number) {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function firstNameOf(name: string) {
  return name.split(" ")[0];
}
