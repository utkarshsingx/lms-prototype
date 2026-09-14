import { ACCA_TODAY, addDays, createRng } from "./types";
import type {
  CalendarEvent,
  DoubtSession,
  ExaminationCycle,
  ExamSessionId,
  LiveClass,
  PaperCode,
} from "./types";
import { cohortById, cohorts } from "./cohorts";
import { examSessions } from "./papers";
import { students } from "./students";
import { blackoutPeriods, universityCalendarEvents } from "./universities";

/* ------------------------------------------------------------------------------------------
 * Live classes: generated from each batch or section timetable, 24 Aug to 27 Sep 2026
 * ---------------------------------------------------------------------------------------- */

const TOPICS: Partial<Record<PaperCode, [string, string][]>> = {
  FR: [
    ["D", "Consolidated statement of financial position"],
    ["D", "Consolidated statement of profit or loss"],
    ["D", "Associates and the equity method"],
    ["B", "IFRS 16 Leases"],
    ["B", "IAS 37 Provisions and contingencies"],
    ["B", "IFRS 15 Revenue from contracts with customers"],
    ["C", "Ratio analysis and interpretation"],
    ["D", "Statement of cash flows"],
    ["B", "Financial instruments"],
    ["A", "Conceptual Framework revision"],
  ],
  PM: [
    ["B", "Relevant costing and limiting factors"],
    ["B", "Pricing decisions"],
    ["C", "Variance analysis: mix and yield"],
    ["C", "Planning and operational variances"],
    ["A", "Activity-based costing and target costing"],
    ["D", "Divisional performance and transfer pricing"],
    ["D", "Performance measurement in not-for-profit organisations"],
    ["B", "Risk and uncertainty in decisions"],
  ],
  AA: [
    ["B", "Audit risk and materiality"],
    ["C", "Internal control: sales and receivables"],
    ["C", "Internal control: purchases and payroll"],
    ["D", "Audit evidence and sampling"],
    ["D", "Auditing inventory and receivables"],
    ["E", "Subsequent events and going concern"],
    ["E", "Audit reports and modified opinions"],
    ["A", "Ethics and independence"],
  ],
  FM: [
    ["D", "NPV and IRR"],
    ["D", "Investment appraisal with inflation and tax"],
    ["C", "The working capital cycle"],
    ["C", "Inventory and receivables management"],
    ["E", "Sources of finance"],
    ["E", "Cost of capital and WACC"],
    ["F", "Business valuations"],
    ["G", "Foreign exchange risk"],
  ],
  SBR: [
    ["D", "Complex groups and changes in group structure"],
    ["C", "IFRS 9 Financial instruments"],
    ["C", "IAS 19 Employee benefits"],
    ["A", "Ethical issues in corporate reporting"],
    ["B", "The Conceptual Framework and fair value"],
  ],
  LW: [
    ["A", "Sources of law and the court system"],
    ["B", "Formation of contract: offer and acceptance"],
    ["B", "Consideration and terms of contract"],
    ["B", "Breach of contract and remedies"],
    ["B", "The law of torts and professional negligence"],
    ["C", "The contract of employment"],
    ["D", "Agency and partnership"],
    ["D", "Corporations and legal personality"],
  ],
  FA: [
    ["D", "Accruals and prepayments"],
    ["D", "Irrecoverable debts and allowances"],
    ["D", "Inventory under IAS 2"],
    ["D", "Tangible non-current assets and depreciation"],
    ["E", "Control accounts and reconciliations"],
    ["E", "Correction of errors and suspense accounts"],
    ["F", "Preparing a statement of financial position"],
    ["G", "Simple consolidation: the basics"],
  ],
  BT: [
    ["A", "Types of business organisation"],
    ["A", "Stakeholders and the macro environment"],
    ["B", "Organisational structure and culture"],
    ["B", "Corporate governance and social responsibility"],
    ["C", "Information technology and information systems"],
    ["D", "Leadership, management and supervision"],
    ["D", "Motivation and team working"],
    ["E", "Communication in business"],
  ],
};

type SlotRule = { sectionId: string; days: number[]; time: string; mins: number; paper: PaperCode; facultyId: string; from?: string };

// Day numbers: 0 Sun ... 6 Sat.
const RULES: SlotRule[] = [
  { sectionId: "bt-fr-dec26-sat", days: [6], time: "09:30", mins: 180, paper: "FR", facultyId: "st-marcus" },
  { sectionId: "bt-fr-dec26-sun", days: [0], time: "09:30", mins: 180, paper: "FR", facultyId: "st-marcus" },
  { sectionId: "bt-pm-dec26-sun", days: [0], time: "14:00", mins: 180, paper: "PM", facultyId: "st-farah" },
  { sectionId: "bt-aa-dec26-mwf", days: [1, 3, 5], time: "19:00", mins: 90, paper: "AA", facultyId: "st-hana" },
  { sectionId: "bt-fm-dec26-mtw", days: [1, 2, 3, 4], time: "18:00", mins: 90, paper: "FM", facultyId: "st-tomas" },
  { sectionId: "bt-sbr-mar27-sat", days: [6], time: "14:00", mins: 210, paper: "SBR", facultyId: "st-marcus", from: "2026-09-05" },
  { sectionId: "sec-bw-2025-s3-a", days: [1, 3], time: "14:00", mins: 120, paper: "LW", facultyId: "st-vikram" },
  { sectionId: "sec-bw-2025-s3-a", days: [5], time: "10:00", mins: 120, paper: "FA", facultyId: "st-grace" },
  { sectionId: "sec-bw-2025-s3-b", days: [2, 4], time: "14:00", mins: 120, paper: "FA", facultyId: "st-grace" },
  { sectionId: "sec-bw-2025-s3-b", days: [5], time: "14:00", mins: 120, paper: "LW", facultyId: "st-vikram" },
  { sectionId: "sec-bw-2026-s1-a", days: [2, 4], time: "10:00", mins: 120, paper: "BT", facultyId: "st-vikram" },
  { sectionId: "sec-bw-2026-s1-b", days: [3, 5], time: "10:00", mins: 120, paper: "BT", facultyId: "st-vikram" },
  { sectionId: "sec-cl-2025-s3-a", days: [1], time: "15:00", mins: 120, paper: "LW", facultyId: "st-grace" },
  { sectionId: "sec-cl-2025-s3-a", days: [3], time: "15:00", mins: 120, paper: "FA", facultyId: "st-grace" },
  { sectionId: "bt-fr-dec26-tth", days: [2, 4], time: "19:30", mins: 120, paper: "FR", facultyId: "st-marcus" },
  { sectionId: "bt-fr-mar27-sat", days: [6], time: "16:00", mins: 150, paper: "FR", facultyId: "st-marcus", from: "2026-10-03" },
];

const WINDOW_START = "2026-08-24";
const WINDOW_END = "2026-09-27";
const BW_CIA = { start: "2026-09-21", end: "2026-09-25" };

function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function buildLiveClasses(): LiveClass[] {
  const rng = createRng(1409);
  const sectionMeta = new Map(cohorts.flatMap((c) => c.sections.map((s) => [s.id, { cohort: c, section: s }] as const)));
  const topicCursor = new Map<string, number>();
  const out: LiveClass[] = [];
  for (let date = WINDOW_START; date <= WINDOW_END; date = addDays(date, 1)) {
    const dow = weekday(date);
    for (const rule of RULES) {
      if (!rule.days.includes(dow) || (rule.from && date < rule.from)) continue;
      const meta = sectionMeta.get(rule.sectionId);
      if (!meta) continue;
      const { cohort, section } = meta;
      const cursorKey = `${cohort.id}-${rule.paper}`;
      const n = topicCursor.get(cursorKey) ?? 0;
      topicCursor.set(cursorKey, n + 1);
      const topics = TOPICS[rule.paper]!;
      const [area, topic] = topics[n % topics.length];
      const start = `${date}T${rule.time}`;
      const past = date < ACCA_TODAY;
      const isToday = date === ACCA_TODAY;
      const daysAgo = past ? Math.round((Date.UTC(2026, 8, 14) - Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10))) / 86400000) : 0;
      const ciaCancelled = cohort.universityId === "u-brightwater" && date >= BW_CIA.start && date <= BW_CIA.end;
      const recent = past && daysAgo <= 2;
      const pct = rng.int(72, 94);
      const status: LiveClass["status"] = ciaCancelled ? "cancelled" : past ? "completed" : isToday ? "today" : "upcoming";
      const attendanceMarked = past && !(recent && section.facultyId === "st-marcus" && rule.sectionId === "bt-fr-dec26-sun");
      out.push({
        id: `lc-${rule.sectionId.replace(/^(bt|sec)-/, "")}-${date.replace(/-/g, "")}-${rule.paper.toLowerCase()}`,
        cohortId: cohort.id,
        sectionId: section.id,
        paper: rule.paper,
        title: topic,
        syllabusArea: area,
        facultyId: rule.facultyId,
        start,
        durationMins: rule.mins,
        delivery: section.room && cohort.delivery !== "Online live" ? "on-campus" : "online",
        room: section.room,
        link: section.onlineLink,
        status,
        attendance: status === "completed"
          ? { marked: attendanceMarked, present: attendanceMarked ? Math.round((section.size * pct) / 100) : 0, total: section.size, pct: attendanceMarked ? pct : 0 }
          : null,
        recording: status === "completed"
          ? recent
            ? { status: rule.sectionId === "bt-fr-dec26-sun" ? "not-uploaded" : "processing" }
            : { status: "published", durationMins: rule.mins - rng.int(5, 15), views: rng.int(8, section.size) }
          : null,
        notes: status === "completed" ? (recent ? "draft" : "published") : status === "cancelled" ? "not-started" : "not-started",
        resources:
          status === "cancelled"
            ? []
            : [
                { name: `${rule.paper} ${topic} slides.pdf`, kind: "slides" },
                ...(n % 2 === 0 ? [{ name: `${topic} question set`, kind: "question-set" as const }] : []),
              ],
        note: ciaCancelled ? "Moved to recording during Brightwater continuous internal assessment 1" : undefined,
      });
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export const liveClasses: LiveClass[] = buildLiveClasses();

export function liveClassById(id: string) {
  return liveClasses.find((c) => c.id === id);
}

export function classesForCohort(cohortId: string) {
  return liveClasses.filter((c) => c.cohortId === cohortId);
}

export function classesForFaculty(staffId: string) {
  return liveClasses.filter((c) => c.facultyId === staffId);
}

/** Classes for a student's cohorts and own section or batch. */
export function classesForStudent(studentId: string) {
  const s = students.find((x) => x.id === studentId);
  if (!s) return [];
  return liveClasses.filter((c) => {
    if (!s.cohortIds.includes(c.cohortId)) return false;
    const cohort = cohortById(c.cohortId);
    if (!cohort || cohort.sections.length < 2) return true;
    return !s.sectionId || c.sectionId === s.sectionId;
  });
}

export const todaysClasses = liveClasses.filter((c) => c.start.startsWith(ACCA_TODAY));
export const recordings = liveClasses.filter((c) => c.recording?.status === "published");

/* ------------------------------------------------------------------------------------------
 * Doubt-clearing sessions
 * ---------------------------------------------------------------------------------------- */

const DOUBT_RULES: { cohortId: string; paper: PaperCode; facultyId: string; dates: string[]; time: string }[] = [
  { cohortId: "co-fr-dec26-wkd", paper: "FR", facultyId: "st-marcus", dates: ["2026-09-02", "2026-09-09", "2026-09-16", "2026-09-23"], time: "20:00" },
  { cohortId: "co-pm-dec26-rev", paper: "PM", facultyId: "st-farah", dates: ["2026-09-03", "2026-09-10", "2026-09-17", "2026-09-24"], time: "20:00" },
  { cohortId: "co-aa-dec26-eve", paper: "AA", facultyId: "st-hana", dates: ["2026-09-05", "2026-09-12", "2026-09-19"], time: "11:00" },
  { cohortId: "co-fm-fast-dec26", paper: "FM", facultyId: "st-tomas", dates: ["2026-09-06", "2026-09-13", "2026-09-20"], time: "18:00" },
  { cohortId: "co-bw-2025-s3", paper: "FA", facultyId: "st-grace", dates: ["2026-09-05", "2026-09-12", "2026-09-26"], time: "10:00" },
  { cohortId: "co-cl-2025-s3", paper: "LW", facultyId: "st-grace", dates: ["2026-09-12", "2026-09-19"], time: "11:30" },
  { cohortId: "co-sbr-mar27-wkd", paper: "SBR", facultyId: "st-marcus", dates: ["2026-09-13", "2026-09-20"], time: "11:00" },
  { cohortId: "co-fr-dec26-eve", paper: "FR", facultyId: "st-marcus", dates: ["2026-09-14"], time: "21:30" },
];

function buildDoubtSessions(): DoubtSession[] {
  const rng = createRng(77);
  return DOUBT_RULES.flatMap((rule) =>
    rule.dates.map((date) => {
      const status: DoubtSession["status"] = date < ACCA_TODAY ? "completed" : date === ACCA_TODAY ? "today" : "upcoming";
      const cohort = cohortById(rule.cohortId)!;
      const special = rule.cohortId === "co-bw-2025-s3" && date === "2026-09-26";
      return {
        id: `ds-${rule.cohortId.slice(3)}-${date.replace(/-/g, "")}`,
        cohortId: rule.cohortId,
        paper: rule.paper,
        facultyId: rule.facultyId,
        start: `${date}T${rule.time}`,
        durationMins: 60,
        title: special ? "CIA week doubt-clearing hour" : `${rule.paper} doubt-clearing`,
        status,
        questionsQueued: status === "completed" ? 0 : rng.int(3, 11),
        attendees: status === "completed" ? rng.int(8, Math.min(30, cohort.size)) : 0,
        link: cohort.sections[0]?.onlineLink ?? "https://live.zskillup.com/doubts",
      };
    }),
  ).sort((a, b) => a.start.localeCompare(b.start));
}

export const doubtSessions: DoubtSession[] = buildDoubtSessions();

/* ------------------------------------------------------------------------------------------
 * Programme calendar (ACCA operations) and examination cycles
 * ---------------------------------------------------------------------------------------- */

export const programmeCalendarEvents: CalendarEvent[] = [
  { id: "pc-01", date: "2026-09-07", endDate: "2026-09-10", title: "ACCA exams · Sep 2026 session", kind: "acca-exam", tone: "violet" },
  { id: "pc-02", date: "2026-09-07", title: "September 2026 graduate intake opens", kind: "orientation", tone: "info", programmeId: "pr-graduate" },
  { id: "pc-03", date: "2026-09-19", title: "Orientation · September 2026 intake", kind: "orientation", tone: "info", programmeId: "pr-graduate" },
  { id: "pc-04", date: "2026-09-20", title: "Graduate Pathway instalment due", kind: "payment", tone: "amber", programmeId: "pr-graduate" },
  { id: "pc-05", date: "2026-10-05", title: "Dec 2026 early entry closes", kind: "entry-deadline", tone: "amber" },
  { id: "pc-06", date: "2026-10-03", title: "FR Reattempt · Mar 2027 cohort starts", kind: "class", tone: "info", cohortId: "co-fr-mar27-reat" },
  { id: "pc-07", date: "2026-10-05", title: "Northfield cohort starts", kind: "class", tone: "info", cohortId: "co-nf-2026-s1" },
  { id: "pc-08", date: "2026-10-12", title: "Sep 2026 results released", kind: "results", tone: "jade" },
  { id: "pc-09", date: "2026-10-24", title: "FR mock exam · Dec 2026", kind: "mock", tone: "violet", cohortId: "co-fr-dec26-wkd" },
  { id: "pc-10", date: "2026-10-31", title: "PM mock exam · Dec 2026", kind: "mock", tone: "violet", cohortId: "co-pm-dec26-rev" },
  { id: "pc-11", date: "2026-10-31", title: "FA mock exam 2 · Brightwater and Coastline", kind: "mock", tone: "violet", cohortId: "co-bw-2025-s3" },
  { id: "pc-12", date: "2026-11-02", title: "Dec 2026 standard entry closes", kind: "entry-deadline", tone: "amber" },
  { id: "pc-13", date: "2026-11-07", title: "AA mock exam · Dec 2026", kind: "mock", tone: "violet", cohortId: "co-aa-dec26-eve" },
  { id: "pc-14", date: "2026-11-08", title: "FM mock exam · Dec 2026", kind: "mock", tone: "violet", cohortId: "co-fm-fast-dec26" },
  { id: "pc-15", date: "2026-11-16", title: "Dec 2026 late entry closes", kind: "entry-deadline", tone: "rose" },
  { id: "pc-16", date: "2026-11-20", title: "Last FA on-demand slot before Brightwater blackout", kind: "entry-deadline", tone: "amber", cohortId: "co-bw-2025-s3" },
  { id: "pc-17", date: "2026-11-23", endDate: "2026-12-12", title: "Brightwater examination blackout", kind: "blackout", tone: "rose", cohortId: "co-bw-2025-s3" },
  { id: "pc-18", date: "2026-11-30", endDate: "2026-12-18", title: "Coastline examination blackout", kind: "blackout", tone: "rose", cohortId: "co-cl-2025-s3" },
  { id: "pc-19", date: "2026-12-07", endDate: "2026-12-10", title: "ACCA exams · Dec 2026 session", kind: "acca-exam", tone: "violet" },
  { id: "pc-20", date: "2027-01-01", title: "ACCA annual subscription due", kind: "subscription", tone: "amber" },
  { id: "pc-21", date: "2027-01-25", title: "Dec 2026 results released", kind: "results", tone: "jade" },
  { id: "pc-22", date: "2027-02-01", title: "Mar 2027 standard entry closes", kind: "entry-deadline", tone: "amber" },
  { id: "pc-23", date: "2027-03-01", endDate: "2027-03-04", title: "ACCA exams · Mar 2027 session", kind: "acca-exam", tone: "violet" },
];

/** Programme calendar plus every university calendar event, sorted by date. */
export const allCalendarEvents: CalendarEvent[] = [...programmeCalendarEvents, ...universityCalendarEvents].sort((a, b) =>
  a.date.localeCompare(b.date),
);

/** Blackout ranges in the shape MonthCalendar expects. */
export function blackoutRanges(universityId?: string) {
  return blackoutPeriods
    .filter((b) => !universityId || b.universityId === universityId)
    .map((b) => ({ start: b.start, end: b.end, label: b.label }));
}

function cycleStats(sessionId: ExamSessionId) {
  // A learner-paper counts as booked if a booking exists or an attempt was sat in the session.
  const booked = new Set<string>();
  let notBooked = 0;
  let recorded = 0;
  let passed = 0;
  const papers = new Set<PaperCode>();
  for (const s of students) {
    for (const b of s.examBookings) {
      if (b.sessionId !== sessionId) continue;
      papers.add(b.paper);
      if (b.status === "booked" || b.status === "sat") booked.add(`${s.id}-${b.paper}`);
      if (b.status === "not-booked" || b.status === "planned") notBooked++;
    }
    for (const p of Object.values(s.papers)) {
      for (const a of p.attempts) {
        if (a.sessionId !== sessionId) continue;
        papers.add(p.code);
        booked.add(`${s.id}-${p.code}`);
        if (a.result === "passed" || a.result === "failed") {
          recorded++;
          if (a.result === "passed") passed++;
        }
      }
    }
  }
  return { bookings: booked.size, notBooked, recorded, passRate: recorded ? Math.round((passed / recorded) * 100) : null, papers: [...papers] };
}

export const examinationCycles: ExaminationCycle[] = (
  [
    { sessionId: "es-2026-jun", status: "closed", mockDeadline: "2026-05-16", revisionCohortIds: [], note: "Results released 13 Jul 2026 and recorded for every learner." },
    { sessionId: "es-2026-sep", status: "results-pending", mockDeadline: "2026-08-15", revisionCohortIds: [], note: "Results due 12 Oct 2026. Record results within 48 hours of release." },
    { sessionId: "es-2026-dec", status: "entry-open", mockDeadline: "2026-11-08", revisionCohortIds: ["co-pm-dec26-rev"], note: "Early entry closes 5 Oct. Brightwater and Coastline learners warned about blackout overlap." },
    { sessionId: "es-2027-mar", status: "planning", mockDeadline: "2027-02-06", revisionCohortIds: ["co-fr-mar27-reat"], note: "FR reattempt cohort enrolling. Standard entry closes 1 Feb 2027." },
  ] as const
).map((c) => {
  const session = examSessions.find((s) => s.id === c.sessionId)!;
  const stats = cycleStats(c.sessionId);
  return {
    id: `ec-${c.sessionId.slice(3)}`,
    sessionId: c.sessionId,
    label: `${session.label} exam cycle`,
    status: c.status,
    papers: stats.papers,
    bookings: stats.bookings,
    notBooked: stats.notBooked,
    resultsRecorded: stats.recorded,
    passRate: stats.passRate,
    mockDeadline: c.mockDeadline,
    revisionCohortIds: [...c.revisionCohortIds],
    note: c.note,
  };
});
