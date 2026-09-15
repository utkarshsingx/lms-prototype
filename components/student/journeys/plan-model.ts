import {
  ACCA_TODAY,
  APPLIED_SKILLS,
  STRATEGIC_OPTIONS,
  addDays,
  cohorts,
  daysBetween,
  examSessions,
  paperName,
  type Cohort,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { formatRange } from "@/components/ui/calendar";

export type PlanAttempt = {
  id: string;
  paper: PaperCode;
  session: string;
  date: string;
  score: number;
  result: "passed" | "failed";
  source: "acca-record" | "you";
};

export type PlanSession = { id: string; label: string; dates: string; published: boolean };

/** Sessions after today. The first three come from the exam calendar; later ones follow ACCA's March, June, September, December pattern. */
export const PLAN_SESSIONS: PlanSession[] = [
  ...examSessions
    .filter((s) => ["es-2026-dec", "es-2027-mar", "es-2027-jun"].includes(s.id))
    .map((s) => ({ id: s.id, label: s.label, dates: `Exams ${formatRange(s.examStart, s.examEnd)}`, published: true })),
  ...["Sep 2027", "Dec 2027", "Mar 2028", "Jun 2028", "Sep 2028", "Dec 2028", "Mar 2029"].map((label) => ({
    id: `future-${label.replace(" ", "-").toLowerCase()}`,
    label,
    dates: "Exam dates not yet published",
    published: false,
  })),
];

export const NEXT_SESSION = PLAN_SESSIONS[0];

/** Sessions a learner may have sat before (for previous-attempt recording). */
export const PAST_SESSIONS = ["Jun 2026", "Mar 2026", "Dec 2025", "Sep 2025", "Jun 2025", "Mar 2025", "Dec 2024"];

export const PAST_SESSION_DATES: Record<string, string> = {
  "Jun 2026": "2026-06-01",
  "Mar 2026": "2026-03-02",
  "Dec 2025": "2025-12-01",
  "Sep 2025": "2025-09-01",
  "Jun 2025": "2025-06-02",
  "Mar 2025": "2025-03-03",
  "Dec 2024": "2024-12-02",
};

const ORDER: PaperCode[] = [...APPLIED_SKILLS, "SBR", "SBL"];

export function hoursFor(code: PaperCode, reattempt: boolean) {
  if (reattempt) return 8;
  if (code === "SBL" || code === "SBR") return 12;
  return 10;
}

export type PlannedPaper = { code: PaperCode; reattempt: boolean; booked: boolean; hours: number };
export type PlanRow = { session: PlanSession; papers: PlannedPaper[]; hours: number };

export type PlanInput = {
  student: Student;
  attempts: PlanAttempt[];
  selection: PaperCode[];
  options: PaperCode[];
  fastTrack: boolean;
};

export function clearedPapers(student: Student, attempts: PlanAttempt[]) {
  const set = new Set<PaperCode>();
  for (const [code, p] of Object.entries(student.papers) as [PaperCode, Student["papers"][PaperCode]][]) {
    if (p.status === "exempt") set.add(code);
  }
  for (const a of attempts) if (a.result === "passed") set.add(a.paper);
  return set;
}

export function failedPapers(attempts: PlanAttempt[], cleared: Set<PaperCode>) {
  return new Set(attempts.filter((a) => a.result === "failed" && !cleared.has(a.paper)).map((a) => a.paper));
}

export function buildPlan({ student, attempts, selection, options, fastTrack }: PlanInput) {
  const cleared = clearedPapers(student, attempts);
  const failed = failedPapers(attempts, cleared);
  const booked = new Set(student.examBookings.filter((b) => b.status === "booked").map((b) => b.paper));
  const make = (code: PaperCode): PlannedPaper => ({
    code,
    reattempt: failed.has(code),
    booked: booked.has(code),
    hours: hoursFor(code, failed.has(code)),
  });

  const next = selection.filter((c) => !cleared.has(c));
  const queue = [...ORDER, ...options].filter((c) => !cleared.has(c) && !next.includes(c));
  const pace = fastTrack ? 2 : 1;

  const rows: PlanRow[] = [];
  if (next.length) rows.push({ session: PLAN_SESSIONS[0], papers: next.map(make), hours: 0 });
  let i = next.length ? 1 : 0;
  while (queue.length && i < PLAN_SESSIONS.length) {
    rows.push({ session: PLAN_SESSIONS[i], papers: queue.splice(0, pace).map(make), hours: 0 });
    i++;
  }
  for (const r of rows) r.hours = r.papers.reduce((s, p) => s + p.hours, 0);

  const perMonthsLeft = Math.max(0, 36 - student.per.months);
  const perDone = addDays(ACCA_TODAY, Math.round(perMonthsLeft * 30.44));
  const lastExam = rows[rows.length - 1]?.session;
  return {
    rows,
    cleared,
    failed,
    remaining: rows.reduce((s, r) => s + r.papers.length, 0),
    lastExam,
    peakHours: rows.reduce((m, r) => Math.max(m, r.hours), 0),
    perMonthsLeft,
    perDoneLabel: monthLabel(perDone),
    unscheduled: queue,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function monthLabel(iso: string) {
  const [y, m] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** "Jun 2028" → sortable number. */
export function sessionIndex(label: string) {
  const [m, y] = label.split(" ");
  return Number(y) * 12 + MONTHS.indexOf(m);
}

/* ------------------------------------------------------------ paper selection for the next session */

type Slot = { day: number; start: number; end: number };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function mins(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Parses cohort timetables such as "Mon, Wed, Fri 19:00 to 20:30" or "Mon to Thu 18:00 to 19:30". */
export function slotsFor(schedule: string): Slot[] {
  const m = schedule.match(/^(.*?)\s(\d{2}:\d{2}) to (\d{2}:\d{2})/);
  if (!m) return [];
  const [, dayPart, from, to] = m;
  let days: number[] = [];
  const range = dayPart.match(/^(\w{3}) to (\w{3})$/);
  if (range) {
    const a = DAYS.indexOf(range[1]);
    const b = DAYS.indexOf(range[2]);
    for (let d = a; d <= b; d++) days.push(d);
  } else {
    days = dayPart
      .split(/,\s*|\s+and\s+|\s+or\s+/)
      .map((d) => DAYS.indexOf(d.trim()))
      .filter((d) => d >= 0);
  }
  return days.map((day) => ({ day, start: mins(from), end: mins(to) }));
}

export type SelectionCandidate = {
  code: PaperCode;
  cohort: Cohort;
  schedule: string;
  batchName: string;
  reattempt: boolean;
  enrolled: boolean;
  weeksMissed: number;
};

/** Papers with a cohort sitting the next session that the learner has not cleared. */
export function selectionCandidates(student: Student, attempts: PlanAttempt[]): SelectionCandidate[] {
  const cleared = clearedPapers(student, attempts);
  const failed = failedPapers(attempts, cleared);
  const out: SelectionCandidate[] = [];
  for (const code of [...ORDER, ...STRATEGIC_OPTIONS]) {
    if (cleared.has(code)) continue;
    const options = cohorts.filter((c) => c.papers.includes(code) && c.examSessionId === NEXT_SESSION.id && c.selectable);
    if (!options.length) continue;
    const mine = options.find((c) => student.cohortIds.includes(c.id));
    const preferred = mine ?? options.find((c) => (failed.has(code) ? c.type === "revision" || c.type === "reattempt" : c.mode === "weekend")) ?? options[0];
    const batch = preferred.sections.find((s) => s.id === student.sectionId) ?? preferred.sections[0];
    out.push({
      code,
      cohort: preferred,
      schedule: batch?.schedule ?? preferred.schedule,
      batchName: batch?.name ?? preferred.name,
      reattempt: failed.has(code),
      enrolled: Boolean(mine),
      weeksMissed: mine ? 0 : Math.max(0, Math.floor(daysBetween(preferred.startDate, ACCA_TODAY) / 7)),
    });
  }
  return out;
}

export function clashesBetween(chosen: SelectionCandidate[]) {
  const out: { a: PaperCode; b: PaperCode; days: string[] }[] = [];
  for (let i = 0; i < chosen.length; i++) {
    for (let j = i + 1; j < chosen.length; j++) {
      const sa = slotsFor(chosen[i].schedule);
      const sb = slotsFor(chosen[j].schedule);
      const days = new Set<string>();
      for (const x of sa) for (const y of sb) if (x.day === y.day && x.start < y.end && y.start < x.end) days.add(DAYS[x.day]);
      if (days.size) out.push({ a: chosen[i].code, b: chosen[j].code, days: [...days] });
    }
  }
  return out;
}

export function paperTitle(code: PaperCode) {
  return `${code} · ${paperName(code)}`;
}
