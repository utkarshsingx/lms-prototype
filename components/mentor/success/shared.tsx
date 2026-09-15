"use client";

import {
  ACCA_TODAY,
  APPLIED_KNOWLEDGE,
  APPLIED_SKILLS,
  STRATEGIC_ESSENTIALS,
  attemptHistory,
  classesForStudent,
  daysBetween,
  examSessionById,
  feePlanById,
  formatAccaDate,
  formatINR,
  formatMonth,
  formatShortDate,
  formatTime,
  messageTemplates,
  paperName,
  universityById,
  type MessageTemplate,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Step } from "@/components/ui/stepper";

export const TODAY = ACCA_TODAY;

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function firstNameOf(name: string) {
  return name.replace(/^(Dr|Prof\.)\s+/, "").split(" ")[0];
}

/** "Today", "Yesterday", "5 days ago" relative to the demo Monday. */
export function ago(iso: string) {
  const d = daysBetween(iso.slice(0, 10), TODAY);
  if (d <= 0) return "Today";
  if (d === 1) return "Yesterday";
  return `${d} days ago`;
}

/** "Today", "Tomorrow", "in 4 days", or "3 days late" for past dates. */
export function dueLabel(iso: string) {
  const d = daysBetween(TODAY, iso.slice(0, 10));
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  if (d > 1) return `Due in ${d} days`;
  return `${-d} ${-d === 1 ? "day" : "days"} late`;
}

export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** Heading for a tab body: the requirement wording as a title, one line of context, one action. */
export function SectionIntro({
  title,
  sub,
  action,
  className,
}: {
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0 max-w-2xl">
        <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.03em] text-ink">{title}</h2>
        {sub ? <p className="mt-1 text-[13.5px] leading-relaxed text-ink-3">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function TypePill({ student, short = false }: { student: Student; short?: boolean }) {
  if (student.type === "graduate") return <Badge tone="dark">Graduate</Badge>;
  const uni = universityById(student.universityId);
  return (
    <Badge tone="info">
      Undergraduate{!short && uni ? ` · ${uni.shortName}` : ""}
    </Badge>
  );
}

export function StudentCell({ student, sub }: { student: Student; sub?: React.ReactNode }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={student.name} size="sm" />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{student.name}</span>
        <span className="block truncate text-[12px] text-ink-3">
          {sub ?? (student.accaId ? `ACCA ID ${student.accaId}` : "Not registered with ACCA")}
        </span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ record readers */

export function completedMocks(s: Student) {
  return s.mocks.filter((m) => m.status === "completed" && m.score != null).sort((a, b) => a.date.localeCompare(b.date));
}

export function lastMock(s: Student) {
  const done = completedMocks(s);
  return done[done.length - 1];
}

export function nextMock(s: Student) {
  return s.mocks.filter((m) => m.status === "scheduled" && m.date >= TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
}

export function latestResult(s: Student) {
  return attemptHistory(s)[0];
}

export function clearedCount(s: Student) {
  return Object.values(s.papers).filter((p) => p.status === "passed" || p.status === "exempt").length;
}

export function currentReadiness(s: Student) {
  return s.currentPaper ? (s.readiness.byPaper[s.currentPaper] ?? s.readiness.overall) : s.readiness.overall;
}

export const RISK_RANK = { low: 0, medium: 1, high: 2 } as const;

/** ACCA journey as stepper rows: Applied Knowledge, Applied Skills, Essentials, then the options. */
export function journeySteps(s: Student): Step[] {
  const core: PaperCode[] = [...APPLIED_KNOWLEDGE, ...APPLIED_SKILLS, ...STRATEGIC_ESSENTIALS];
  const step = (code: PaperCode): Step => {
    const p = s.papers[code];
    const last = p.attempts[p.attempts.length - 1];
    const label = `${code} · ${paperName(code)}`;
    const strategic = !APPLIED_KNOWLEDGE.includes(code) && !APPLIED_SKILLS.includes(code);
    switch (p.status) {
      case "exempt": {
        const rec = s.exemptions.find((e) => e.paper === code);
        const sub =
          rec?.state === "approved" && rec.decidedOn
            ? `ACCA-approved exemption · ${formatMonth(rec.decidedOn.slice(0, 7))}`
            : rec
              ? `Exemption ${rec.state}`
              : "Exempt";
        return { id: code, label, sub, state: "exempt" };
      }
      case "passed":
        return { id: code, label, sub: last ? `Passed ${last.label} · ${last.score}%` : "Passed", state: "done" };
      case "failed":
        return {
          id: code,
          label,
          sub: `${last?.score ?? ""}% in ${last?.label ?? "last attempt"}${p.plannedLabel ? ` · reattempt ${p.plannedLabel}` : ""}`,
          state: "failed",
        };
      case "results-pending":
        return { id: code, label, sub: `Sat ${last?.label ?? "Sep 2026"} · results ${formatAccaDate(examSessionById("es-2026-sep")!.resultsDate)}`, state: "current" };
      case "current":
        return { id: code, label, sub: `Current paper · ${p.progress}% of lessons · exam ${p.plannedLabel ?? "to be booked"}`, state: "current" };
      case "in-progress":
        return { id: code, label, sub: `In progress · ${p.progress}% · exam ${p.plannedLabel ?? "to be planned"}`, state: "current" };
      case "upcoming":
        return { id: code, label, sub: p.plannedLabel ? `Planned ${p.plannedLabel}` : "Planned", state: "upcoming" };
      default:
        return { id: code, label, sub: strategic ? "Unlocks after Applied Skills" : "Not started", state: strategic ? "locked" : "upcoming" };
    }
  };
  const steps = core.map(step);
  if (s.options.length) {
    steps.push(...s.options.map(step));
  } else {
    steps.push({ id: "options", label: "Options · choose two", sub: "AFM, APM, ATX or AAA after the Essentials", state: "locked" });
  }
  return steps;
}

/* ------------------------------------------------------------------ authorised templates */

/** Approved templates a mentor may send. Fee templates belong to Finance Operations. */
export const MENTOR_TEMPLATE_IDS = ["tpl-mentor-checkin", "tpl-class-reminder", "tpl-recording-ready", "tpl-entry-deadline"];

export type TemplateOption = { template: MessageTemplate; allowed: boolean; reason?: string };

export const TEMPLATE_OPTIONS: TemplateOption[] = messageTemplates
  .filter((t) => MENTOR_TEMPLATE_IDS.includes(t.id) || ["Payments", "University"].includes(t.category))
  .map((t) => {
    if (t.status !== "approved") return { template: t, allowed: false, reason: "awaiting approval" };
    if (!MENTOR_TEMPLATE_IDS.includes(t.id)) return { template: t, allowed: false, reason: t.category === "Payments" ? "Finance Operations only" : "programme team only" };
    return { template: t, allowed: true };
  })
  .sort((a, b) => Number(b.allowed) - Number(a.allowed));

export const CHANNEL_LABELS: Record<string, string> = {
  "in-app": "In-app",
  email: "Email",
  whatsapp: "WhatsApp",
  sms: "SMS",
  push: "Mobile push",
};

export function nextClassFor(s: Student) {
  return classesForStudent(s.id)
    .filter((c) => c.start.slice(0, 10) >= TODAY && c.status !== "cancelled" && c.status !== "completed")
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

/** Fills a template with the learner's own record so the preview reads as the message sent. */
export function fillTemplate(body: string, s: Student, mentorName: string) {
  const paper = s.currentPaper ?? "ACCA";
  const cls = nextClassFor(s);
  const recent = classesForStudent(s.id)
    .filter((c) => c.status === "completed")
    .sort((a, b) => b.start.localeCompare(a.start))[0];
  const unbooked = s.examBookings.filter((b) => b.status === "planned" || b.status === "not-booked").map((b) => b.paper);
  const inst = s.fees.instalments.find((i) => i.status === "overdue" || i.status === "due");
  const isRecording = body.includes("recording");
  const values: Record<string, string> = {
    first_name: firstNameOf(s.name),
    mentor_name: mentorName,
    topic: isRecording && recent ? recent.title : s.risk.reasons.length ? `your ${paper} plan` : `${paper} exam preparation`,
    paper,
    time: cls ? formatTime(cls.start) : "18:30",
    link: cls?.link?.replace(/^https:\/\//, "") ?? "live.zskillup.com",
    session: "Dec 2026",
    window: "early",
    date: "5 Oct 2026",
    papers: unbooked.length ? unbooked.join(" and ") : paper,
    instalment_no: inst ? String(inst.n) : "5",
    amount: inst ? formatINR(inst.amount) : formatINR(24500),
    plan_name: feePlanById(s.fees.planId)?.name ?? "your fee plan",
    due_date: inst ? formatAccaDate(inst.dueDate) : "20 Sep 2026",
  };
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? key.replace(/_/g, " "));
}

export function shortDate(iso: string) {
  return formatShortDate(iso.slice(0, 10));
}
