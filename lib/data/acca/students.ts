import {
  ACCA_TODAY,
  addDays,
  createRng,
  daysBetween,
  formatAccaDate,
  formatMonth,
  initialsOf,
  type Rng,
} from "./types";
import type {
  AttemptResult,
  EntryWindow,
  ExamBooking,
  ExamBookingStatus,
  ExamSessionId,
  ExemptionRecord,
  ExemptionState,
  Instalment,
  JointCertificateStatus,
  LeaderboardEntry,
  MockAttempt,
  PaperAttempt,
  PaperCode,
  PaperProgress,
  PlacementStage,
  RiskLevel,
  Student,
  StudentCareer,
  StudentType,
  University,
} from "./types";
import {
  APPLIED_KNOWLEDGE,
  PAPER_CODES,
  accaFeesGBP,
  examFeeGBP,
  examSessionById,
  exemptionFeeGBP,
  paperByCode,
} from "./papers";
import { feePlanById } from "./programmes";
import { blackoutOn, jointCertificateRule, universityById } from "./universities";

/** Week-start labels for `Student.activityHours` (oldest first). */
export const activityWeekLabels = ["20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"];

/* ------------------------------------------------------------------------------------------
 * Small builders shared by the demo students and the generator
 * ---------------------------------------------------------------------------------------- */

function emptyPapers(): Record<PaperCode, PaperProgress> {
  const out = {} as Record<PaperCode, PaperProgress>;
  for (const code of PAPER_CODES) out[code] = { code, status: "not-started", attempts: [], progress: 0 };
  return out;
}

function setPaper(papers: Record<PaperCode, PaperProgress>, code: PaperCode, patch: Partial<PaperProgress>) {
  papers[code] = { ...papers[code], ...patch };
}

function resultFor(score: number | null): AttemptResult {
  if (score === null) return "pending";
  return score >= 50 ? "passed" : "failed";
}

function sat(sessionId: ExamSessionId, score: number | null): PaperAttempt {
  const s = examSessionById(sessionId)!;
  return { sessionId, date: s.examStart, label: s.label, score, result: resultFor(score) };
}

/** Attempts before the sessions modelled in `examSessions` (label only). */
function satEarlier(label: string, date: string, score: number): PaperAttempt {
  return { date, label, score, result: resultFor(score) };
}

function satOnDemand(date: string, score: number): PaperAttempt {
  return { date, label: formatMonth(date.slice(0, 7)), score, result: resultFor(score) };
}

function feeWindowCloses(sessionId: ExamSessionId, window: EntryWindow) {
  const s = examSessionById(sessionId)!;
  if (window === "early") return s.earlyEntryCloses;
  if (window === "late") return s.lateEntryCloses;
  return s.standardEntryCloses;
}

function sessionBooking(
  key: string,
  code: PaperCode,
  sessionId: ExamSessionId,
  status: ExamBookingStatus,
  opts: { window?: EntryWindow; bookedOn?: string; centre: string },
): ExamBooking {
  const s = examSessionById(sessionId)!;
  const window = opts.window ?? (s.earlyEntryCloses ? "early" : "standard");
  const paid = status === "booked" || status === "sat";
  return {
    id: `eb-${key}-${code.toLowerCase()}-${sessionId.slice(3)}`,
    paper: code,
    sessionId,
    date: s.examStart,
    label: s.label,
    entryWindow: window,
    entryClosesOn: feeWindowCloses(sessionId, window),
    status,
    bookedOn: paid ? opts.bookedOn : undefined,
    feeGBP: examFeeGBP(code, window),
    feeStatus: paid ? "paid" : "unpaid",
    centre: opts.centre,
  };
}

function onDemandBooking(
  key: string,
  code: PaperCode,
  date: string,
  status: ExamBookingStatus,
  opts: { bookedOn?: string; centre: string; universityId?: string },
): ExamBooking {
  const blackout = opts.universityId ? blackoutOn(opts.universityId, date) : undefined;
  const paid = status === "booked" || status === "sat";
  return {
    id: `eb-${key}-${code.toLowerCase()}-${date.replace(/-/g, "")}`,
    paper: code,
    date,
    label: formatAccaDate(date),
    entryWindow: "on-demand",
    status,
    bookedOn: paid ? opts.bookedOn : undefined,
    feeGBP: examFeeGBP(code, "on-demand"),
    feeStatus: paid ? "paid" : "unpaid",
    centre: opts.centre,
    blackoutWarning: blackout
      ? `Falls inside ${universityById(blackout.universityId)?.shortName} university examinations (${formatAccaDate(blackout.start)} to ${formatAccaDate(blackout.end)}). Rebook before ${formatAccaDate(blackout.start)}.`
      : undefined,
  };
}

const DOCS_BASE = ["Degree certificate", "Consolidated mark sheets"];

function exemptionRecords(
  codes: PaperCode[],
  opts: {
    state: ExemptionState;
    estimatedOn: string;
    submittedOn?: string;
    decidedOn?: string;
    feePaidOn?: string;
    feeUnpaid?: boolean;
    docsPending?: boolean;
    basis: string;
  },
): ExemptionRecord[] {
  return codes.map((paper) => {
    const docs = [...DOCS_BASE, ...(paper === "LW" ? ["Law subject syllabus"] : [])];
    const feeDue = opts.state === "approved" || opts.state === "submitted";
    return {
      paper,
      state: opts.state,
      estimatedOn: opts.estimatedOn,
      submittedOn: opts.submittedOn,
      decidedOn: opts.decidedOn,
      basis: opts.basis,
      fee: {
        status: !feeDue ? "not-due" : opts.feeUnpaid ? "unpaid" : "paid",
        amountGBP: exemptionFeeGBP(paper),
        paidOn: feeDue && !opts.feeUnpaid ? opts.feePaidOn : undefined,
      },
      documents: docs.map((name, i) => ({
        name,
        status: opts.docsPending && i === docs.length - 1 ? "pending" : "verified",
      })),
    };
  });
}

function instalmentsFor(amount: number, schedule: string[], paidCount: number, rng: Rng): Instalment[] {
  return schedule.map((dueDate, i) => {
    if (i < paidCount) return { n: i + 1, amount, dueDate, status: "paid", paidOn: addDays(dueDate, -rng.int(0, 6)) };
    const days = daysBetween(ACCA_TODAY, dueDate);
    const status = days < 0 ? "overdue" : days <= 14 ? "due" : "upcoming";
    return { n: i + 1, amount, dueDate, status };
  });
}

function feesFor(planId: string, schedule: string[], paidCount: number, rng: Rng): Student["fees"] {
  const plan = feePlanById(planId)!;
  const instalments = instalmentsFor(plan.instalmentAmount, schedule, paidCount, rng);
  const paid = instalments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const due = instalments.filter((i) => i.status === "due" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);
  const next = instalments.find((i) => i.status !== "paid");
  const status = instalments.some((i) => i.status === "overdue")
    ? "overdue"
    : instalments.some((i) => i.status === "due")
      ? "due"
      : next
        ? "on-track"
        : "paid";
  return { planId, total: plan.total, paid, due, balance: plan.total - paid, status, nextDueDate: next?.dueDate ?? null, instalments };
}

function pastCount(schedule: string[]) {
  return schedule.filter((d) => d < ACCA_TODAY).length;
}

function attendanceOf(pct: number, total: number, lastMissed?: string): Student["attendance"] {
  const attended = Math.round((pct / 100) * total);
  return { pct: Math.round((attended / total) * 100), attended, total, missedClasses: total - attended, lastMissed };
}

function trendTo(end: number, rng: Rng, drift = 2) {
  const out: number[] = [];
  let v = end - drift * 5 + rng.int(-3, 3);
  for (let i = 0; i < 5; i++) {
    out.push(Math.max(20, Math.min(95, v)));
    v += drift + rng.int(-3, 3);
  }
  out.push(end);
  return out;
}

const PLACEMENT_ORDER: PlacementStage[] = ["applied", "shortlisted", "interview", "offer", "joined"];

function riskFor(s: Omit<Student, "risk">): Student["risk"] {
  const reasons: string[] = [];
  let severe = 0;
  if (s.enrolmentStatus === "completed") return { level: "low", reasons };
  if (s.lastActiveDaysAgo >= 14) {
    reasons.push(`Inactive for ${s.lastActiveDaysAgo} days`);
    severe++;
  }
  if (s.attendance.total > 0 && s.attendance.pct < 75) {
    reasons.push(`Attendance ${s.attendance.pct}%, ${s.attendance.missedClasses} classes missed`);
    severe++;
  }
  if (s.missedMocks > 0) reasons.push(`Missed ${s.missedMocks} mock${s.missedMocks > 1 ? "s" : ""}`);
  const cur = s.currentPaper;
  if (cur && s.enrolmentStatus === "active") {
    const score = s.readiness.byPaper[cur];
    if (score !== undefined && score < 50) {
      reasons.push(`Readiness ${score} for ${cur}`);
      severe++;
    }
  }
  for (const p of Object.values(s.papers)) {
    const last = p.attempts[p.attempts.length - 1];
    if (last && last.result === "failed" && last.date >= "2026-06-01") {
      reasons.push(`Failed ${p.code} in ${last.label} (${last.score}%)`);
    }
  }
  if (s.fees.status === "overdue") {
    reasons.push("Fee instalment overdue");
    severe++;
  }
  if (s.subscription.status === "overdue") reasons.push("ACCA annual subscription overdue");
  const level: RiskLevel = severe >= 2 || reasons.length >= 3 ? "high" : reasons.length > 0 ? "medium" : "low";
  return { level, reasons };
}

function jointCertFor(s: Omit<Student, "risk" | "jointCertificate">, verification: JointCertificateStatus["universityVerification"]): JointCertificateStatus {
  const cleared = (c: PaperCode) => s.papers[c].status === "passed" || s.papers[c].status === "exempt";
  const akMissing = APPLIED_KNOWLEDGE.filter((c) => !cleared(c));
  const lw = cleared("LW");
  const att = s.attendance.total === 0 || s.attendance.pct >= 75;
  const fees = s.fees.status !== "overdue";
  const checks: JointCertificateStatus["checks"] = [
    { id: "applied-knowledge", label: jointCertificateRule.criteria[0].label, met: akMissing.length === 0, detail: akMissing.length ? `Still to pass: ${akMissing.join(", ")}` : "BT, MA and FA cleared" },
    { id: "lw-passed", label: jointCertificateRule.criteria[1].label, met: lw, detail: lw ? "LW passed" : "LW not yet passed" },
    { id: "attendance", label: jointCertificateRule.criteria[2].label, met: att, detail: s.attendance.total === 0 ? "Classes not started" : `Attendance ${s.attendance.pct}%` },
    { id: "no-overdue-fees", label: jointCertificateRule.criteria[3].label, met: fees, detail: fees ? "No overdue fees" : "Instalment overdue" },
  ];
  const missing = [...akMissing, ...(lw ? [] : ["LW"]), ...(att ? [] : ["Attendance"]), ...(fees ? [] : ["Fees"])];
  const failedOutstanding = Object.values(s.papers).some((p) => p.status === "failed");
  const status = checks.every((c) => c.met) ? "eligible" : !att || !fees || failedOutstanding ? "at-risk" : "on-track";
  return { status, checks, missing, universityVerification: status === "eligible" ? verification : "not-started" };
}

/* ------------------------------------------------------------------------------------------
 * Demo student 1: Anaya Rao (graduate), bible section 6
 * ---------------------------------------------------------------------------------------- */

const GRAD_SCHEDULE_2026 = ["2026-01-20", "2026-03-20", "2026-05-20", "2026-07-20", "2026-09-20", "2026-11-20"];
const GRAD_SCHEDULE_2026_B = ["2026-02-05", "2026-04-05", "2026-06-05", "2026-08-05", "2026-10-05", "2026-12-05"];
const GRAD_SCHEDULE_SEP = ["2026-09-07", "2026-11-07", "2027-01-07", "2027-03-07", "2027-05-07", "2027-07-07"];
const FAST_SCHEDULE = ["2026-01-10", "2026-04-10", "2026-07-10", "2026-10-10"];
const STRATEGIC_SCHEDULE = ["2026-02-15", "2026-04-15", "2026-06-15", "2026-08-15", "2026-10-15"];
const STRATEGIC_SCHEDULE_2025 = ["2025-02-15", "2025-04-15", "2025-06-15", "2025-08-15", "2025-10-15"];
const BW_SCHEDULE_2025 = ["2025-08-01", "2026-01-15", "2026-08-01", "2027-01-15", "2027-08-01", "2028-01-15"];
const BW_SCHEDULE_2026 = ["2026-08-01", "2027-01-15", "2027-08-01", "2028-01-15", "2028-08-01", "2029-01-15"];
const CL_SCHEDULE_2025 = ["2025-08-05", "2026-01-20", "2026-08-05", "2027-01-20", "2027-08-05", "2028-01-20"];
const NF_SCHEDULE_2026 = ["2026-10-01", "2027-02-01", "2027-08-01", "2028-02-01", "2028-08-01", "2029-02-01"];

function buildAnaya(): Student {
  const rng = createRng(4382917);
  const papers = emptyPapers();
  for (const c of ["BT", "MA", "FA", "LW"] as PaperCode[]) setPaper(papers, c, { status: "exempt", progress: 100 });
  setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [sat("es-2026-mar", 58)] });
  setPaper(papers, "PM", {
    status: "failed",
    progress: 34,
    attempts: [sat("es-2026-jun", 46)],
    plannedSessionId: "es-2026-dec",
    plannedLabel: "Dec 2026",
    note: "Reattempt Dec 2026 in the PM Revision and Reattempt cohort",
  });
  setPaper(papers, "FR", { status: "current", progress: 62, plannedSessionId: "es-2026-dec", plannedLabel: "Dec 2026" });
  setPaper(papers, "AA", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
  setPaper(papers, "FM", { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027" });

  const centre = "CBE centre · Bengaluru";
  const base: Omit<Student, "risk"> = {
    id: "s-anaya",
    name: "Anaya Rao",
    initials: "AR",
    email: "anaya.rao@students.zskillup.com",
    phone: "+91 98451 22704",
    city: "Bengaluru",
    type: "graduate",
    programmeId: "pr-graduate",
    intakeId: "in-2025-jan",
    sectionId: "bt-fr-dec26-sat",
    cohortIds: ["co-fr-dec26-wkd", "co-pm-dec26-rev"],
    enrolmentStatus: "active",
    background: {
      qualification: "B.Com 2024",
      institution: "Lalbagh College of Commerce, Bengaluru (non-partner university)",
      occupation: "Accounts executive, Tidewater Shared Services",
    },
    accaId: "4382917",
    verification: { status: "not-required" },
    registration: { status: "registered", date: "2025-02-12" },
    subscription: { status: "paid", dueDate: "2027-01-01", amountGBP: accaFeesGBP.annualSubscription, paidOn: "2025-12-18" },
    exemptionClaim: {
      status: "decided",
      qualification: "B.Com 2024",
      note: "BT, MA, FA and LW estimated Jan 2025, ACCA-approved Mar 2025, fees paid.",
    },
    exemptions: exemptionRecords(["BT", "MA", "FA", "LW"], {
      state: "approved",
      estimatedOn: "2025-01-20",
      submittedOn: "2025-02-14",
      decidedOn: "2025-03-18",
      feePaidOn: "2025-03-24",
      basis: "B.Com 2024",
    }),
    papers,
    options: [],
    currentPaper: "FR",
    examBookings: [
      sessionBooking("anaya", "TX", "es-2026-mar", "sat", { bookedOn: "2025-12-02", centre }),
      sessionBooking("anaya", "PM", "es-2026-jun", "sat", { bookedOn: "2026-03-09", centre }),
      sessionBooking("anaya", "FR", "es-2026-dec", "booked", { window: "early", bookedOn: "2026-09-02", centre }),
      sessionBooking("anaya", "PM", "es-2026-dec", "planned", { window: "early", centre }),
      sessionBooking("anaya", "AA", "es-2027-mar", "planned", { centre }),
      sessionBooking("anaya", "FM", "es-2027-jun", "planned", { centre }),
    ],
    readiness: { overall: 61, byPaper: { FR: 64, PM: 58 } },
    attendance: attendanceOf(88, 26, "2026-08-30"),
    lastActiveDaysAgo: 1,
    activityHours: [7, 8, 6, 9, 10, 8, 11, 9],
    mocks: [
      { id: "mk-anaya-1", paper: "TX", title: "TX mock exam · Mar 2026", date: "2026-02-14", score: 67, status: "completed" },
      { id: "mk-anaya-2", paper: "PM", title: "PM mock exam · Jun 2026", date: "2026-05-16", score: 49, status: "completed" },
      { id: "mk-anaya-3", paper: "FR", title: "FR progress test 1", date: "2026-07-25", score: 58, status: "completed" },
      { id: "mk-anaya-4", paper: "FR", title: "FR mock exam 1", date: "2026-08-22", score: 61, status: "completed" },
      { id: "mk-anaya-5", paper: "PM", title: "PM revision test 1", date: "2026-08-29", score: 55, status: "completed" },
      { id: "mk-anaya-6", assessmentId: "a-fr-mock", paper: "FR", title: "FR mock exam · Dec 2026", date: "2026-10-24", score: null, status: "scheduled" },
      { id: "mk-anaya-7", assessmentId: "a-pm-mock", paper: "PM", title: "PM mock exam · Dec 2026", date: "2026-10-31", score: null, status: "scheduled" },
    ],
    missedMocks: 0,
    mentorId: "st-aisha",
    epsm: { status: "complete", progress: 100, completedOn: "2025-11-08" },
    per: {
      status: "in-progress",
      months: 14,
      objectives: ["po1", "po6", "po7"],
      employer: "Tidewater Shared Services",
      supervisor: "Kiran Desai, Finance Manager",
    },
    fees: feesFor("fp-graduate", GRAD_SCHEDULE_2026, 4, rng),
    career: {
      atsScore: 71,
      companyReadiness: 62,
      placementEligible: true,
      targetRole: "Audit associate",
      resume: { status: "in-review", updated: "2026-09-10" },
      internship: { status: "none" },
      placementStage: "applied",
      transitionGoal: "Accounts executive to audit associate",
    },
    readinessTrend: [49, 52, 55, 57, 60, 61],
    scenarioTags: ["demo", "failed-paper", "reattempt", "fee-due", "resume-in-review"],
  };
  return { ...base, risk: riskFor(base) };
}

/* ------------------------------------------------------------------------------------------
 * Demo student 2: Rohan Iyer (Brightwater undergraduate), bible section 6
 * ---------------------------------------------------------------------------------------- */

function buildRohan(): Student {
  const rng = createRng(5129044);
  const papers = emptyPapers();
  setPaper(papers, "BT", { status: "passed", progress: 100, attempts: [satOnDemand("2026-03-14", 71)] });
  setPaper(papers, "MA", { status: "passed", progress: 100, attempts: [satOnDemand("2026-06-20", 64)] });
  setPaper(papers, "FA", { status: "current", progress: 68, plannedLabel: "18 Nov 2026", note: "On-demand exam booked for 18 Nov 2026, before the university blackout" });
  setPaper(papers, "LW", { status: "in-progress", progress: 30, plannedLabel: "Jan 2027", note: "In progress this semester, exam planned Jan 2027" });
  setPaper(papers, "PM", { status: "upcoming", plannedLabel: "Semester 4" });
  setPaper(papers, "TX", { status: "upcoming", plannedLabel: "Semester 4" });
  setPaper(papers, "FR", { status: "upcoming", plannedLabel: "Semester 5" });
  setPaper(papers, "AA", { status: "upcoming", plannedLabel: "Semester 5" });
  setPaper(papers, "FM", { status: "upcoming", plannedLabel: "Semester 6" });

  const centre = "CBE centre · Pune";
  const base: Omit<Student, "risk" | "jointCertificate"> = {
    id: "s-rohan",
    name: "Rohan Iyer",
    initials: "RI",
    email: "rohan.iyer@students.zskillup.com",
    phone: "+91 98220 64318",
    city: "Pune",
    type: "undergraduate",
    programmeId: "pr-bw-bcom",
    intakeId: "in-2025-jul",
    universityId: "u-brightwater",
    semester: 3,
    section: "A",
    sectionId: "sec-bw-2025-s3-a",
    cohortIds: ["co-bw-2025-s3"],
    enrolmentStatus: "active",
    background: { qualification: "B.Com (Hons) with ACCA, 2025 to 2028", institution: "Brightwater University" },
    accaId: "5129044",
    verification: { status: "verified", by: "st-suresh", on: "2025-08-25" },
    registration: { status: "registered", date: "2025-08-18" },
    subscription: { status: "paid", dueDate: "2027-01-01", amountGBP: accaFeesGBP.annualSubscription, paidOn: "2025-12-22" },
    exemptionClaim: { status: "none", note: "None claimed. Papers are sat through the integrated route." },
    exemptions: [],
    papers,
    options: [],
    currentPaper: "FA",
    examBookings: [
      onDemandBooking("rohan", "BT", "2026-03-14", "sat", { bookedOn: "2026-02-20", centre }),
      onDemandBooking("rohan", "MA", "2026-06-20", "sat", { bookedOn: "2026-05-28", centre }),
      onDemandBooking("rohan", "FA", "2026-11-18", "booked", { bookedOn: "2026-09-04", centre, universityId: "u-brightwater" }),
      onDemandBooking("rohan", "LW", "2027-01-18", "planned", { centre, universityId: "u-brightwater" }),
    ],
    readiness: { overall: 72, byPaper: { FA: 72, LW: 55 } },
    attendance: attendanceOf(92, 38, "2026-08-21"),
    lastActiveDaysAgo: 0,
    activityHours: [5, 6, 6, 7, 8, 7, 9, 8],
    mocks: [
      { id: "mk-rohan-1", paper: "MA", title: "MA mock exam", date: "2026-06-06", score: 62, status: "completed" },
      { id: "mk-rohan-2", paper: "FA", title: "FA progress test 1", date: "2026-08-08", score: 66, status: "completed" },
      { id: "mk-rohan-3", assessmentId: "a-fa-mock", paper: "FA", title: "FA mock exam", date: "2026-09-05", score: 70, status: "completed" },
      { id: "mk-rohan-4", paper: "FA", title: "FA mock exam 2", date: "2026-10-31", score: null, status: "scheduled" },
    ],
    missedMocks: 0,
    mentorId: "st-nikhil",
    epsm: { status: "not-started", progress: 0 },
    per: { status: "not-started", months: 0, objectives: [] },
    fees: feesFor("fp-bw-bcom", BW_SCHEDULE_2025, 3, rng),
    career: {
      atsScore: 52,
      companyReadiness: 44,
      placementEligible: false,
      targetRole: "Audit intern",
      resume: { status: "draft", updated: "2026-08-12" },
      internship: { status: "planned", period: "Summer 2027" },
      placementStage: null,
    },
    leaderboard: { points: 4805, rank: 4, cohortSize: 71, streak: 12 },
    readinessTrend: [58, 61, 64, 67, 70, 72],
    scenarioTags: ["demo", "joint-certificate-on-track", "on-demand-booked"],
  };
  const withJc = { ...base, jointCertificate: jointCertFor(base, "not-started") };
  return { ...withJc, risk: riskFor(withJc) };
}

/* ------------------------------------------------------------------------------------------
 * Generated students (62): archetype specs + seeded details
 * ---------------------------------------------------------------------------------------- */

type Profile =
  | "fr-current"
  | "pm-reattempt"
  | "fr-reattempt"
  | "fr-weekday"
  | "aa-current"
  | "fm-fast"
  | "sbr-current"
  | "alumni"
  | "new-graduate"
  | "ug-bw25"
  | "ug-bw26"
  | "ug-cl25"
  | "ug-nf26";

type Flag =
  | "strong"
  | "unregistered"
  | "registration-pending"
  | "sub-overdue"
  | "docs-pending"
  | "exempt-estimated"
  | "exempt-submitted"
  | "exempt-rejected"
  | "exempt-fee-unpaid"
  | "unbooked"
  | "inactive"
  | "missed-classes"
  | "missed-mocks"
  | "low-readiness"
  | "fees-overdue"
  | "paid-upfront"
  | "refund"
  | "verify-pending"
  | "verify-mismatch"
  | "results-pending"
  | "failed-recent"
  | "intern-planned"
  | "intern-applied"
  | "intern-ongoing"
  | "intern-completed"
  | "blackout-booking"
  | "epsm-progress"
  | "jc-eligible";

type Spec = {
  profile: Profile;
  cohorts: string[];
  mentor: string;
  placement: boolean;
  stage?: PlacementStage;
  flags?: Flag[];
  section?: "A" | "B";
};

const FRW = "co-fr-dec26-wkd";
const PMR = "co-pm-dec26-rev";
const FRR = "co-fr-mar27-reat";
const FRE = "co-fr-dec26-eve";
const AAE = "co-aa-dec26-eve";
const FMF = "co-fm-fast-dec26";
const SBR = "co-sbr-mar27-wkd";
const BW25 = "co-bw-2025-s3";
const BW26 = "co-bw-2026-s1";
const CL25 = "co-cl-2025-s3";
const NF26 = "co-nf-2026-s1";

const SPECS: Spec[] = [
  // FR weekend · Aisha (with Anaya: 9)
  { profile: "fr-current", cohorts: [FRW], mentor: "st-aisha", placement: true, stage: "interview", flags: ["strong"] },
  { profile: "fr-current", cohorts: [FRW], mentor: "st-aisha", placement: true, stage: "shortlisted" },
  { profile: "fr-current", cohorts: [FRW], mentor: "st-aisha", placement: true, stage: "applied", flags: ["results-pending"] },
  { profile: "fr-current", cohorts: [FRW, PMR], mentor: "st-aisha", placement: true, flags: ["missed-classes", "missed-mocks"] },
  { profile: "fr-current", cohorts: [FRW], mentor: "st-aisha", placement: true, stage: "offer", flags: ["strong"] },
  { profile: "fr-current", cohorts: [FRW, PMR], mentor: "st-aisha", placement: true, stage: "rejected", flags: ["low-readiness"] },
  { profile: "fr-current", cohorts: [FRW], mentor: "st-aisha", placement: true, flags: ["inactive", "unbooked"] },
  { profile: "fr-current", cohorts: [FRW], mentor: "st-aisha", placement: false, flags: ["fees-overdue", "sub-overdue", "unbooked"] },
  // PM revision and reattempt · Aisha
  { profile: "pm-reattempt", cohorts: [PMR], mentor: "st-aisha", placement: true, stage: "applied" },
  { profile: "pm-reattempt", cohorts: [PMR], mentor: "st-aisha", placement: true, flags: ["missed-mocks"] },
  { profile: "pm-reattempt", cohorts: [PMR], mentor: "st-aisha", placement: false, flags: ["inactive", "low-readiness", "fees-overdue"] },
  { profile: "pm-reattempt", cohorts: [PMR], mentor: "st-aisha", placement: false, flags: ["exempt-fee-unpaid", "missed-classes", "unbooked"] },
  // FR reattempt Mar 2027 · Aisha
  { profile: "fr-reattempt", cohorts: [FRR], mentor: "st-aisha", placement: true, stage: "interview" },
  { profile: "fr-reattempt", cohorts: [FRR], mentor: "st-aisha", placement: false, flags: ["low-readiness", "refund"] },
  // FR weekday evening · Nikhil
  { profile: "fr-weekday", cohorts: [FRE], mentor: "st-nikhil", placement: true, stage: "joined" },
  { profile: "fr-weekday", cohorts: [FRE], mentor: "st-nikhil", placement: true, stage: "offer", flags: ["paid-upfront"] },
  { profile: "fr-weekday", cohorts: [FRE], mentor: "st-nikhil", placement: false, flags: ["exempt-rejected"] },
  // AA weekday evening · Nikhil
  { profile: "aa-current", cohorts: [AAE], mentor: "st-nikhil", placement: true, stage: "offer", flags: ["strong"] },
  { profile: "aa-current", cohorts: [AAE], mentor: "st-nikhil", placement: true, stage: "interview" },
  { profile: "aa-current", cohorts: [AAE], mentor: "st-nikhil", placement: true, stage: "shortlisted", flags: ["results-pending"] },
  { profile: "aa-current", cohorts: [AAE], mentor: "st-nikhil", placement: true, flags: ["intern-ongoing"] },
  { profile: "aa-current", cohorts: [AAE], mentor: "st-nikhil", placement: false, flags: ["sub-overdue", "missed-classes"] },
  // FM fast track · Sana
  { profile: "fm-fast", cohorts: [FMF], mentor: "st-sana", placement: true, stage: "applied", flags: ["intern-completed"] },
  { profile: "fm-fast", cohorts: [FMF], mentor: "st-sana", placement: true, stage: "shortlisted" },
  { profile: "fm-fast", cohorts: [FMF], mentor: "st-sana", placement: true, flags: ["results-pending"] },
  { profile: "fm-fast", cohorts: [FMF], mentor: "st-sana", placement: false, flags: ["docs-pending", "exempt-estimated", "intern-ongoing"] },
  { profile: "fm-fast", cohorts: [FMF], mentor: "st-sana", placement: false, flags: ["inactive", "missed-mocks", "low-readiness", "fees-overdue"] },
  // SBR Mar 2027 · Sana
  { profile: "sbr-current", cohorts: [SBR], mentor: "st-sana", placement: true, stage: "joined", flags: ["strong"] },
  { profile: "sbr-current", cohorts: [SBR], mentor: "st-sana", placement: true, stage: "offer" },
  { profile: "sbr-current", cohorts: [SBR], mentor: "st-sana", placement: true, stage: "interview", flags: ["epsm-progress"] },
  { profile: "sbr-current", cohorts: [SBR], mentor: "st-sana", placement: true, stage: "applied", flags: ["refund"] },
  // Alumni (completed exams) · Sana
  { profile: "alumni", cohorts: [], mentor: "st-sana", placement: true, stage: "joined", flags: ["strong"] },
  { profile: "alumni", cohorts: [], mentor: "st-sana", placement: true, stage: "joined" },
  // New September 2026 graduates, cohort not chosen yet
  { profile: "new-graduate", cohorts: [], mentor: "st-nikhil", placement: false, flags: ["unregistered", "docs-pending"] },
  { profile: "new-graduate", cohorts: [], mentor: "st-nikhil", placement: false, flags: ["registration-pending", "exempt-estimated"] },
  { profile: "new-graduate", cohorts: [], mentor: "st-sana", placement: false, flags: ["registration-pending", "exempt-submitted", "exempt-fee-unpaid"] },
  // Brightwater 2025 intake · Semester 3 (with Rohan: 15)
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["strong", "jc-eligible", "intern-applied"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["jc-eligible"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["strong", "intern-planned"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["blackout-booking"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["unbooked", "verify-pending"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["missed-classes", "intern-planned"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "A", flags: ["sub-overdue", "intern-applied"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "B", flags: ["fees-overdue"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "B", flags: ["verify-mismatch"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "B", flags: ["intern-planned"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-nikhil", placement: false, section: "B", flags: ["missed-mocks"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-aisha", placement: false, section: "B", flags: ["failed-recent", "low-readiness"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-aisha", placement: false, section: "B", flags: ["inactive", "missed-classes"] },
  { profile: "ug-bw25", cohorts: [BW25], mentor: "st-aisha", placement: false, section: "B", flags: ["failed-recent", "missed-mocks"] },
  // Brightwater 2026 intake · Semester 1
  { profile: "ug-bw26", cohorts: [BW26], mentor: "st-nikhil", placement: false, section: "A", flags: ["registration-pending", "verify-pending"] },
  { profile: "ug-bw26", cohorts: [BW26], mentor: "st-nikhil", placement: false, section: "A", flags: ["unregistered", "verify-pending"] },
  { profile: "ug-bw26", cohorts: [BW26], mentor: "st-nikhil", placement: false, section: "B" },
  { profile: "ug-bw26", cohorts: [BW26], mentor: "st-nikhil", placement: false, section: "B", flags: ["registration-pending"] },
  { profile: "ug-bw26", cohorts: [BW26], mentor: "st-nikhil", placement: false, section: "A", flags: ["missed-classes", "inactive"] },
  // Coastline 2025 intake · Semester 3
  { profile: "ug-cl25", cohorts: [CL25], mentor: "st-sana", placement: false, section: "A", flags: ["strong", "intern-completed"] },
  { profile: "ug-cl25", cohorts: [CL25], mentor: "st-sana", placement: false, section: "A" },
  { profile: "ug-cl25", cohorts: [CL25], mentor: "st-sana", placement: false, section: "A", flags: ["fees-overdue", "sub-overdue"] },
  { profile: "ug-cl25", cohorts: [CL25], mentor: "st-sana", placement: false, section: "A", flags: ["low-readiness", "failed-recent"] },
  { profile: "ug-cl25", cohorts: [CL25], mentor: "st-sana", placement: false, section: "A", flags: ["verify-pending", "intern-planned"] },
  // Northfield 2026 intake · onboarding
  { profile: "ug-nf26", cohorts: [NF26], mentor: "st-sana", placement: false, section: "A", flags: ["unregistered", "verify-pending"] },
  { profile: "ug-nf26", cohorts: [NF26], mentor: "st-sana", placement: false, section: "A", flags: ["registration-pending", "verify-pending"] },
];

const FIRST_NAMES = [
  "Kavya", "Ishaan", "Diya", "Aditya", "Meghna", "Karthik", "Sneha", "Varun", "Pooja", "Siddharth",
  "Tanvi", "Aman", "Ritika", "Harsh", "Nandini", "Kabir", "Shruti", "Yash", "Aditi", "Pranav",
  "Riya", "Dev", "Mehul", "Simran", "Tejas", "Nisha", "Rakesh", "Swati", "Gaurav", "Bhavna",
  "Arnav", "Pallavi", "Zoya", "Faisal", "Sahil", "Divya", "Manish", "Keerthi", "Abhishek", "Jyoti",
  "Vivek", "Lavanya", "Omkar", "Sanya", "Neel", "Ira", "Parth", "Tara", "Anjali", "Kunal",
  "Mansi", "Chirag", "Farhan", "Sakshi", "Devika", "Joel", "Rehan", "Maya", "Akash", "Esha",
  "Vihaan", "Gayatri", "Hari", "Nidhi", "Sameer", "Alina", "Ravi", "Shreya",
];

const LAST_NAMES = [
  "Sharma", "Menon", "Nair", "Kulkarni", "Deshpande", "Reddy", "Pillai", "Banerjee", "Chatterjee", "Gupta",
  "Agarwal", "Patel", "Shah", "Mehta", "Malhotra", "Bhat", "Hegde", "Das", "Ghosh", "Mukherjee",
  "Srinivasan", "Krishnan", "Varghese", "Thomas", "D'Souza", "Fernandes", "Khanna", "Saxena", "Chopra", "Sinha",
  "Mishra", "Pandey", "Naidu", "Gowda", "Kamath", "Pai", "Rajan", "Subramanian", "Ahmed", "Ansari",
  "Jacob", "George", "Chauhan", "Rathore", "Sen", "Dutta", "Paul", "Bhattacharya", "Kaur", "Gill",
];

const GRAD_CITIES = ["Bengaluru", "Hyderabad", "Chennai", "Mumbai", "Pune", "Kochi", "New Delhi", "Gurugram", "Ahmedabad", "Kolkata", "Jaipur", "Coimbatore", "Mysuru", "Indore", "Lucknow"];

const COLLEGES = [
  "Lakeside College of Commerce, Chennai",
  "Hillcrest College, Mumbai",
  "Riverbend Institute of Commerce, Hyderabad",
  "Maple Leaf College, Pune",
  "Sandalwood College of Commerce, Mysuru",
  "Ashoka Valley College, New Delhi",
  "Harbourview College, Kochi",
  "Deccan Plateau College, Hyderabad",
  "Banyan Tree College of Commerce, Kolkata",
  "Western Ghats College, Coimbatore",
];

const EMPLOYERS = [
  "Tidewater Shared Services",
  "Lumen Global Services",
  "Ashgrove Audit Partners",
  "Crescent Fintech",
  "Orchid Pharma Finance",
  "Marlow and Iyer Chartered Accountants",
  "Veda Capital Advisors",
  "Kestrel Logistics",
  "Silverline Retail",
  "Northstar Consulting",
];

const OCCUPATIONS = ["Accounts executive", "Accounts payable analyst", "Audit trainee", "Junior accountant", "Finance associate", "Reporting analyst", "Article assistant", "Tax associate"];

const PROFILE_ROLE: Record<Profile, string> = {
  "fr-current": "Financial reporting analyst",
  "pm-reattempt": "Management accountant",
  "fr-reattempt": "Financial reporting analyst",
  "fr-weekday": "Financial reporting analyst",
  "aa-current": "Audit associate",
  "fm-fast": "FP&A analyst",
  "sbr-current": "Senior financial reporting analyst",
  alumni: "Assistant manager, financial reporting",
  "new-graduate": "Finance associate",
  "ug-bw25": "Audit intern",
  "ug-bw26": "Finance intern",
  "ug-cl25": "Audit intern",
  "ug-nf26": "Finance intern",
};

function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const nameRng = createRng(20260914);
const firstPool = shuffled(FIRST_NAMES, nameRng);
const lastPool = shuffled(LAST_NAMES, nameRng);

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z]/g, "");
}

function buildGenerated(spec: Spec, index: number, usedAccaIds: Set<string>): Student {
  const rng = createRng(1000 + index * 7919);
  const flags = new Set(spec.flags ?? []);
  const has = (f: Flag) => flags.has(f);
  const first = firstPool[index];
  const last = lastPool[index % lastPool.length];
  const name = `${first} ${last}`;
  const key = slug(first);
  const id = `s-${key}`;
  const isUg = spec.profile.startsWith("ug-");
  const type: StudentType = isUg ? "undergraduate" : "graduate";

  const universityId: University["id"] | undefined =
    spec.profile === "ug-bw25" || spec.profile === "ug-bw26"
      ? "u-brightwater"
      : spec.profile === "ug-cl25"
        ? "u-coastline"
        : spec.profile === "ug-nf26"
          ? "u-northfield"
          : undefined;
  const uni = universityById(universityId);
  const city = uni ? uni.city : GRAD_CITIES[index % GRAD_CITIES.length];
  const centre = `CBE centre · ${city}`;

  const intakeId =
    spec.profile === "ug-bw25" || spec.profile === "ug-cl25"
      ? "in-2025-jul"
      : isUg
        ? "in-2026-jul"
        : spec.profile === "new-graduate"
          ? "in-2026-sep"
          : spec.profile === "aa-current" || spec.profile === "fr-reattempt" || spec.profile === "alumni" || (spec.profile === "pm-reattempt" && index % 2 === 0)
            ? "in-2025-jan"
            : spec.profile === "fr-current" && index % 3 === 0
              ? "in-2025-jan"
              : "in-2026-jan";
  const programmeId =
    spec.profile === "ug-bw25" || spec.profile === "ug-bw26"
      ? "pr-bw-bcom"
      : spec.profile === "ug-cl25"
        ? "pr-cl-bcom"
        : spec.profile === "ug-nf26"
          ? "pr-nf-bba"
          : spec.profile === "fm-fast"
            ? "pr-fasttrack"
            : spec.profile === "sbr-current" || spec.profile === "alumni"
              ? "pr-strategic"
              : "pr-graduate";

  const strong = has("strong");
  const passScore = () => (strong ? rng.int(64, 81) : rng.int(51, 70));
  const failScore = () => rng.int(38, 48);

  const papers = emptyPapers();
  const bookings: ExamBooking[] = [];
  let exemptions: ExemptionRecord[] = [];
  let options: PaperCode[] = [];
  let currentPaper: PaperCode | null = null;
  let secondary: PaperCode | null = null;
  const pendingResult = has("results-pending");

  const regYear = intakeId === "in-2025-jan" ? "2025" : intakeId === "in-2026-jan" ? "2026" : "2026";

  function graduateExemptions(estimatedOn: string, submittedOn: string, decidedOn: string) {
    const codes: PaperCode[] = ["BT", "MA", "FA", "LW"];
    const basis = "B.Com";
    if (has("exempt-rejected")) {
      const approved = exemptionRecords(["BT", "MA", "FA"], { state: "approved", estimatedOn, submittedOn, decidedOn, feePaidOn: addDays(decidedOn, 5), basis });
      const lw = exemptionRecords(["LW"], { state: "rejected", estimatedOn, submittedOn, decidedOn, basis });
      lw[0].note = "ACCA did not accept the law subjects as equivalent. LW to be sat as an on-demand exam.";
      lw[0].fee.status = "not-due";
      exemptions = [...approved, ...lw];
      for (const c of ["BT", "MA", "FA"] as PaperCode[]) setPaper(papers, c, { status: "exempt", progress: 100 });
      setPaper(papers, "LW", { status: "upcoming", progress: 20, plannedLabel: "Oct 2026", note: "Exemption rejected, sitting LW on demand" });
      bookings.push(onDemandBooking(key, "LW", "2026-10-17", "planned", { centre }));
      return;
    }
    if (has("exempt-estimated") && has("docs-pending")) {
      const approved = exemptionRecords(["BT", "MA", "FA"], { state: "approved", estimatedOn, submittedOn, decidedOn, feePaidOn: addDays(decidedOn, 4), basis });
      const lw = exemptionRecords(["LW"], { state: "estimated", estimatedOn: "2026-08-24", basis, docsPending: true });
      lw[0].note = "Law subject syllabus requested from the university before submission to ACCA.";
      exemptions = [...approved, ...lw];
      for (const c of ["BT", "MA", "FA"] as PaperCode[]) setPaper(papers, c, { status: "exempt", progress: 100 });
      setPaper(papers, "LW", { note: "Exemption estimated, documents pending" });
      return;
    }
    exemptions = exemptionRecords(codes, {
      state: "approved",
      estimatedOn,
      submittedOn,
      decidedOn,
      feePaidOn: addDays(decidedOn, 6),
      feeUnpaid: has("exempt-fee-unpaid"),
      basis,
    });
    for (const c of codes) setPaper(papers, c, { status: "exempt", progress: 100 });
  }

  const exemptionDates =
    intakeId === "in-2025-jan"
      ? (["2025-01-1" + rng.int(3, 9), "2025-02-0" + rng.int(2, 9), "2025-03-1" + rng.int(0, 9)] as const)
      : (["2026-01-1" + rng.int(3, 9), "2026-02-0" + rng.int(2, 9), "2026-03-1" + rng.int(0, 9)] as const);

  switch (spec.profile) {
    case "fr-current":
    case "fr-weekday": {
      graduateExemptions(...exemptionDates);
      const inPmRev = spec.cohorts.includes(PMR);
      if (pendingResult) {
        setPaper(papers, "TX", { status: "results-pending", progress: 100, attempts: [sat("es-2026-sep", null)], note: "Results due 12 Oct 2026" });
        bookings.push(sessionBooking(key, "TX", "es-2026-sep", "sat", { bookedOn: "2026-06-22", centre }));
      } else {
        setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [sat(index % 2 ? "es-2026-mar" : "es-2025-dec", passScore())] });
      }
      if (inPmRev) {
        const s = failScore();
        setPaper(papers, "PM", { status: "failed", progress: rng.int(25, 45), attempts: [sat("es-2026-jun", s)], plannedSessionId: "es-2026-dec", plannedLabel: "Dec 2026", note: "Reattempt Dec 2026 in the PM Revision and Reattempt cohort" });
        bookings.push(sessionBooking(key, "PM", "es-2026-dec", has("unbooked") ? "not-booked" : "planned", { window: "early", centre }));
        secondary = "PM";
      } else {
        setPaper(papers, "PM", { status: "passed", progress: 100, attempts: [sat(intakeId === "in-2025-jan" ? "es-2025-sep" : "es-2026-jun", passScore())] });
      }
      setPaper(papers, "FR", { status: "current", progress: rng.int(35, 72), plannedSessionId: "es-2026-dec", plannedLabel: "Dec 2026" });
      bookings.push(sessionBooking(key, "FR", "es-2026-dec", has("unbooked") ? "not-booked" : "booked", { window: "early", bookedOn: `2026-0${rng.int(8, 9)}-0${rng.int(1, 9)}`, centre }));
      setPaper(papers, "AA", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      setPaper(papers, "FM", { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027" });
      currentPaper = "FR";
      break;
    }
    case "pm-reattempt": {
      graduateExemptions(...exemptionDates);
      setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [sat("es-2025-dec", passScore())] });
      const attempts = index % 2 ? [sat("es-2025-dec", failScore()), sat("es-2026-jun", failScore())] : [sat("es-2026-jun", failScore())];
      setPaper(papers, "PM", { status: "current", progress: rng.int(40, 65), attempts, plannedSessionId: "es-2026-dec", plannedLabel: "Dec 2026", note: `Attempt ${attempts.length + 1} in Dec 2026` });
      bookings.push(sessionBooking(key, "PM", "es-2026-dec", has("unbooked") ? "not-booked" : "booked", { window: "early", bookedOn: "2026-08-2" + rng.int(0, 9), centre }));
      setPaper(papers, "FR", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      currentPaper = "PM";
      break;
    }
    case "fr-reattempt": {
      graduateExemptions(...exemptionDates);
      setPaper(papers, "PM", { status: "passed", progress: 100, attempts: [sat("es-2025-dec", passScore())] });
      setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [sat("es-2026-mar", passScore())] });
      setPaper(papers, "FR", { status: "current", progress: rng.int(30, 50), attempts: [sat("es-2026-jun", failScore())], plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027", note: "Reattempt Mar 2027 in the FR Reattempt cohort" });
      bookings.push(sessionBooking(key, "FR", "es-2027-mar", "planned", { centre }));
      setPaper(papers, "AA", { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027" });
      currentPaper = "FR";
      break;
    }
    case "aa-current": {
      graduateExemptions(...exemptionDates);
      setPaper(papers, "PM", { status: "passed", progress: 100, attempts: [sat("es-2025-sep", passScore())] });
      setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [sat("es-2025-dec", passScore())] });
      setPaper(papers, "FR", { status: "passed", progress: 100, attempts: index % 2 ? [sat("es-2026-mar", passScore())] : [sat("es-2025-dec", failScore()), sat("es-2026-mar", passScore())] });
      setPaper(papers, "AA", { status: "current", progress: rng.int(40, 70), plannedSessionId: "es-2026-dec", plannedLabel: "Dec 2026" });
      bookings.push(sessionBooking(key, "AA", "es-2026-dec", "booked", { window: "early", bookedOn: "2026-08-1" + rng.int(0, 9), centre }));
      if (pendingResult) {
        setPaper(papers, "FM", { status: "results-pending", progress: 100, attempts: [sat("es-2026-sep", null)], note: "Results due 12 Oct 2026" });
        bookings.push(sessionBooking(key, "FM", "es-2026-sep", "sat", { bookedOn: "2026-06-18", centre }));
      } else {
        setPaper(papers, "FM", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      }
      currentPaper = "AA";
      break;
    }
    case "fm-fast": {
      graduateExemptions(...exemptionDates);
      setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [sat("es-2026-jun", passScore())] });
      setPaper(papers, "FM", { status: "current", progress: rng.int(35, 66), plannedSessionId: "es-2026-dec", plannedLabel: "Dec 2026" });
      bookings.push(sessionBooking(key, "FM", "es-2026-dec", "booked", { window: "early", bookedOn: "2026-09-0" + rng.int(1, 9), centre }));
      if (pendingResult) {
        setPaper(papers, "PM", { status: "results-pending", progress: 100, attempts: [sat("es-2026-sep", null)], note: "Results due 12 Oct 2026" });
        bookings.push(sessionBooking(key, "PM", "es-2026-sep", "sat", { bookedOn: "2026-06-25", centre }));
      } else {
        setPaper(papers, "PM", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      }
      setPaper(papers, "FR", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      setPaper(papers, "AA", { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027" });
      currentPaper = "FM";
      break;
    }
    case "sbr-current": {
      exemptions = exemptionRecords(["BT", "MA", "FA"], { state: "approved", estimatedOn: "2022-09-12", submittedOn: "2022-09-30", decidedOn: "2022-10-21", feePaidOn: "2022-10-28", basis: "B.Com" });
      for (const c of ["BT", "MA", "FA"] as PaperCode[]) setPaper(papers, c, { status: "exempt", progress: 100 });
      setPaper(papers, "LW", { status: "passed", progress: 100, attempts: [satEarlier("Feb 2023", "2023-02-18", passScore())] });
      setPaper(papers, "PM", { status: "passed", progress: 100, attempts: [satEarlier("Jun 2023", "2023-06-05", passScore())] });
      setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [satEarlier("Dec 2023", "2023-12-04", passScore())] });
      setPaper(papers, "FR", { status: "passed", progress: 100, attempts: [satEarlier("Jun 2024", "2024-06-03", failScore()), satEarlier("Dec 2024", "2024-12-02", passScore())] });
      setPaper(papers, "AA", { status: "passed", progress: 100, attempts: [satEarlier("Mar 2025", "2025-03-03", passScore())] });
      setPaper(papers, "FM", { status: "passed", progress: 100, attempts: [sat("es-2025-sep", passScore())] });
      if (has("epsm-progress")) {
        setPaper(papers, "SBL", { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027", note: "After EPSM is complete" });
      } else {
        setPaper(papers, "SBL", { status: "passed", progress: 100, attempts: [sat("es-2026-jun", passScore())] });
      }
      setPaper(papers, "SBR", { status: "current", progress: rng.int(30, 55), plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      bookings.push(sessionBooking(key, "SBR", "es-2027-mar", "planned", { centre }));
      options = index % 2 ? ["AFM", "APM"] : ["AAA", "ATX"];
      for (const o of options) setPaper(papers, o, { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027" });
      currentPaper = "SBR";
      break;
    }
    case "alumni": {
      exemptions = exemptionRecords(["BT", "MA", "FA", "LW"], { state: "approved", estimatedOn: "2022-01-17", submittedOn: "2022-02-03", decidedOn: "2022-03-08", feePaidOn: "2022-03-14", basis: "B.Com" });
      for (const c of ["BT", "MA", "FA", "LW"] as PaperCode[]) setPaper(papers, c, { status: "exempt", progress: 100 });
      setPaper(papers, "PM", { status: "passed", progress: 100, attempts: [satEarlier("Sep 2022", "2022-09-05", passScore())] });
      setPaper(papers, "TX", { status: "passed", progress: 100, attempts: [satEarlier("Dec 2022", "2022-12-05", passScore())] });
      setPaper(papers, "FR", { status: "passed", progress: 100, attempts: [satEarlier("Mar 2023", "2023-03-06", passScore())] });
      setPaper(papers, "AA", { status: "passed", progress: 100, attempts: [satEarlier("Sep 2023", "2023-09-04", passScore())] });
      setPaper(papers, "FM", { status: "passed", progress: 100, attempts: [satEarlier("Mar 2024", "2024-03-04", passScore())] });
      setPaper(papers, "SBR", { status: "passed", progress: 100, attempts: [sat("es-2025-dec", passScore())] });
      setPaper(papers, "SBL", { status: "passed", progress: 100, attempts: [sat("es-2026-mar", passScore())] });
      options = index % 2 ? ["AFM", "APM"] : ["AAA", "APM"];
      for (const o of options) setPaper(papers, o, { status: "passed", progress: 100, attempts: [sat("es-2026-jun", passScore())] });
      break;
    }
    case "new-graduate": {
      const est = `2026-09-0${rng.int(8, 9)}`;
      const state: ExemptionState = has("exempt-submitted") ? "submitted" : "estimated";
      exemptions = exemptionRecords(["BT", "MA", "FA", "LW"], {
        state,
        estimatedOn: est,
        submittedOn: state === "submitted" ? "2026-09-11" : undefined,
        feeUnpaid: has("exempt-fee-unpaid"),
        docsPending: has("docs-pending"),
        basis: "B.Com",
      });
      for (const c of ["BT", "MA", "FA", "LW"] as PaperCode[]) {
        setPaper(papers, c, { note: state === "submitted" ? "Exemption submitted to ACCA" : "Exemption estimated" });
      }
      setPaper(papers, "PM", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      setPaper(papers, "TX", { status: "upcoming", plannedSessionId: "es-2027-mar", plannedLabel: "Mar 2027" });
      setPaper(papers, "FR", { status: "upcoming", plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027" });
      break;
    }
    case "ug-bw25":
    case "ug-cl25": {
      setPaper(papers, "BT", { status: "passed", progress: 100, attempts: [satOnDemand(`2026-0${rng.int(2, 3)}-${10 + rng.int(0, 18)}`, passScore())] });
      bookings.push(onDemandBooking(key, "BT", papers.BT.attempts[0].date, "sat", { bookedOn: addDays(papers.BT.attempts[0].date, -21), centre }));
      if (has("failed-recent")) {
        const failDate = `2026-07-${10 + rng.int(0, 15)}`;
        setPaper(papers, "MA", { status: "failed", progress: 80, attempts: [satOnDemand(failDate, failScore())], note: "Reattempt booked for 10 Oct 2026" });
        bookings.push(onDemandBooking(key, "MA", failDate, "sat", { bookedOn: addDays(failDate, -20), centre }));
        bookings.push(onDemandBooking(key, "MA", "2026-10-10", "booked", { bookedOn: "2026-08-12", centre, universityId }));
      } else {
        const maDate = `2026-06-${10 + rng.int(0, 18)}`;
        setPaper(papers, "MA", { status: "passed", progress: 100, attempts: [satOnDemand(maDate, passScore())] });
        bookings.push(onDemandBooking(key, "MA", maDate, "sat", { bookedOn: addDays(maDate, -18), centre }));
      }
      if (has("jc-eligible")) {
        setPaper(papers, "FA", { status: "passed", progress: 100, attempts: [satOnDemand(`2026-08-${10 + rng.int(0, 15)}`, passScore())] });
        setPaper(papers, "LW", { status: "passed", progress: 100, attempts: [satOnDemand(`2026-09-0${rng.int(1, 9)}`, passScore())] });
        setPaper(papers, "PM", { status: "current", progress: rng.int(10, 22), plannedSessionId: "es-2027-jun", plannedLabel: "Jun 2027", note: "Started Semester 4 paper early" });
        bookings.push(onDemandBooking(key, "FA", papers.FA.attempts[0].date, "sat", { bookedOn: addDays(papers.FA.attempts[0].date, -15), centre }));
        bookings.push(onDemandBooking(key, "LW", papers.LW.attempts[0].date, "sat", { bookedOn: addDays(papers.LW.attempts[0].date, -15), centre }));
        currentPaper = "PM";
      } else {
        const faDate = has("blackout-booking") ? "2026-12-02" : `2026-${rng.chance(0.5) ? "10" : "11"}-${10 + rng.int(0, 9)}`;
        setPaper(papers, "FA", { status: "current", progress: rng.int(45, 75), plannedLabel: has("unbooked") ? "Before 20 Nov 2026" : formatAccaDate(faDate) });
        bookings.push(
          onDemandBooking(key, "FA", faDate, has("unbooked") ? "not-booked" : "booked", { bookedOn: has("unbooked") ? undefined : `2026-0${rng.int(8, 9)}-1${rng.int(0, 2)}`, centre, universityId }),
        );
        setPaper(papers, "LW", { status: "in-progress", progress: rng.int(20, 38), plannedLabel: "Jan 2027", note: "In progress this semester, exam planned Jan 2027" });
        currentPaper = "FA";
        secondary = "LW";
      }
      for (const c of ["TX"] as PaperCode[]) setPaper(papers, c, { status: "upcoming", plannedLabel: "Semester 4" });
      if (papers.PM.status === "not-started") setPaper(papers, "PM", { status: "upcoming", plannedLabel: "Semester 4" });
      setPaper(papers, "FR", { status: "upcoming", plannedLabel: "Semester 5" });
      setPaper(papers, "AA", { status: "upcoming", plannedLabel: "Semester 5" });
      setPaper(papers, "FM", { status: "upcoming", plannedLabel: "Semester 6" });
      break;
    }
    case "ug-bw26": {
      setPaper(papers, "BT", { status: "current", progress: rng.int(28, 50), plannedLabel: "Jan 2027" });
      bookings.push(onDemandBooking(key, "BT", "2027-01-16", "planned", { centre, universityId }));
      setPaper(papers, "MA", { status: "upcoming", plannedLabel: "Semester 2" });
      setPaper(papers, "FA", { status: "upcoming", plannedLabel: "Semester 2" });
      currentPaper = "BT";
      break;
    }
    case "ug-nf26": {
      setPaper(papers, "BT", { status: "upcoming", progress: rng.int(0, 6), plannedLabel: "Semester 1" });
      currentPaper = "BT";
      break;
    }
  }

  // Registration, subscription, verification
  const registered = !has("unregistered") && !has("registration-pending");
  const regDate =
    spec.profile === "sbr-current" || spec.profile === "alumni"
      ? `20${spec.profile === "alumni" ? "21" : "22"}-0${rng.int(1, 9)}-1${rng.int(0, 9)}`
      : isUg
        ? `${intakeId === "in-2025-jul" ? "2025" : "2026"}-08-${10 + rng.int(0, 18)}`
        : spec.profile === "new-graduate"
          ? "2026-09-10"
          : `${regYear}-0${rng.int(1, 2)}-${10 + rng.int(0, 18)}`;
  let accaId: string | null = null;
  if (registered) {
    do {
      accaId = String((isUg ? 5100000 : 4100000) + rng.int(0, 899999));
    } while (usedAccaIds.has(accaId));
    usedAccaIds.add(accaId);
  }
  const registration: Student["registration"] = registered
    ? { status: "registered", date: regDate }
    : has("registration-pending")
      ? { status: "pending", date: regDate, note: isUg ? "Application submitted, awaiting ACCA confirmation" : "Awaiting ID proof upload before submission" }
      : { status: "not-registered", note: isUg ? "Registration documents not yet received" : "Registration starts after exemption documents are verified" };
  const subscription: Student["subscription"] = !registered
    ? { status: "not-applicable", dueDate: null, amountGBP: accaFeesGBP.annualSubscription }
    : has("sub-overdue")
      ? { status: "overdue", dueDate: "2026-01-01", amountGBP: accaFeesGBP.annualSubscription }
      : { status: "paid", dueDate: "2027-01-01", amountGBP: accaFeesGBP.annualSubscription, paidOn: `2025-12-${10 + rng.int(0, 19)}` };

  const verification: Student["verification"] = !isUg
    ? { status: "not-required" }
    : has("verify-mismatch")
      ? { status: "mismatch", note: "Date of birth differs from the university record" }
      : has("verify-pending") || spec.profile === "ug-nf26"
        ? { status: "pending", note: spec.profile === "ug-bw25" || spec.profile === "ug-cl25" ? "Semester 3 enrolment not yet confirmed by the university" : "New intake record awaiting university verification" }
        : { status: "verified", by: universityId === "u-coastline" ? "st-joseph" : "st-suresh", on: `${intakeId === "in-2025-jul" ? "2025" : "2026"}-08-2${rng.int(0, 9)}` };

  const exemptionClaim: Student["exemptionClaim"] = isUg
    ? { status: "none", note: "None claimed. Papers are sat through the integrated route." }
    : spec.profile === "new-graduate"
      ? {
          status: has("docs-pending") ? "documents-pending" : has("exempt-submitted") ? "submitted" : "estimated",
          qualification: "B.Com",
          note: has("docs-pending") ? "Consolidated mark sheets still to be uploaded" : has("exempt-submitted") ? "Submitted to ACCA on 11 Sep 2026" : "Estimated by the exemption team, ready to submit to ACCA",
        }
      : has("docs-pending")
        ? { status: "documents-pending", qualification: "B.Com", note: "LW exemption waiting for the law subject syllabus" }
        : { status: "decided", qualification: "B.Com", note: exemptions.some((e) => e.state === "rejected") ? "BT, MA and FA approved. LW rejected by ACCA." : `${exemptions.map((e) => e.paper).join(", ")} approved by ACCA` };

  // Engagement
  const onboarding = spec.profile === "new-graduate" || spec.profile === "ug-nf26";
  const completed = spec.profile === "alumni";
  const attendancePct = has("inactive") ? rng.int(56, 68) : has("missed-classes") ? rng.int(62, 73) : strong ? rng.int(93, 98) : rng.int(78, 92);
  const totalClasses = completed ? 58 : spec.profile === "ug-bw26" ? 20 : isUg ? 38 : 26;
  const lastMissedDay = rng.int(1, 9);
  // Onboarding learners have no classes yet: total 0 means "not applicable", never 0%.
  const attendance: Student["attendance"] = onboarding
    ? { pct: 0, attended: 0, total: 0, missedClasses: 0 }
    : attendanceOf(attendancePct, totalClasses, attendancePct < 90 && !completed ? `2026-09-0${lastMissedDay}` : undefined);
  const lastActiveDaysAgo = has("inactive") ? rng.int(15, 26) : has("missed-classes") || has("missed-mocks") ? rng.int(3, 8) : completed ? rng.int(20, 40) : rng.int(0, 3);

  const activityHours = Array.from({ length: 8 }, (_, w) => {
    if (onboarding) return w < 7 ? 0 : rng.int(1, 4);
    if (completed) return rng.int(0, 1);
    if (has("inactive")) return Math.max(0, 8 - w * 2 + rng.int(-1, 1));
    const base = strong ? 11 : has("missed-classes") ? 5 : 8;
    return Math.max(1, base + rng.int(-2, 3));
  });

  const readinessBase = onboarding ? rng.int(38, 48) : has("low-readiness") ? rng.int(34, 46) : strong ? rng.int(74, 85) : rng.int(52, 70);
  const byPaper: Partial<Record<PaperCode, number>> = {};
  if (currentPaper && !completed) byPaper[currentPaper] = readinessBase;
  if (secondary) byPaper[secondary] = Math.max(30, readinessBase - rng.int(4, 12));
  const readiness = { overall: completed ? 100 : readinessBase, byPaper };

  const mocks: MockAttempt[] = [];
  let missedMocks = 0;
  if (currentPaper && !onboarding && !completed && spec.profile !== "ug-bw26") {
    const s1 = Math.max(25, readinessBase - rng.int(2, 10));
    mocks.push({ id: `mk-${key}-1`, paper: currentPaper, title: `${currentPaper} progress test 1`, date: "2026-07-25", score: s1, status: "completed" });
    if (has("missed-mocks")) {
      missedMocks = index % 2 ? 2 : 1;
      mocks.push({ id: `mk-${key}-2`, paper: currentPaper, title: `${currentPaper} mock exam 1`, date: "2026-08-22", score: null, status: "missed" });
      if (missedMocks === 2) mocks.push({ id: `mk-${key}-3`, paper: currentPaper, title: `${currentPaper} progress test 2`, date: "2026-09-05", score: null, status: "missed" });
    } else {
      mocks.push({ id: `mk-${key}-2`, paper: currentPaper, title: `${currentPaper} mock exam 1`, date: "2026-08-22", score: Math.min(95, readinessBase + rng.int(-4, 5)), status: "completed" });
    }
    const decMock = papers[currentPaper].plannedSessionId === "es-2026-dec" && (currentPaper === "FR" || currentPaper === "PM");
    mocks.push({
      id: `mk-${key}-9`,
      assessmentId: decMock ? (currentPaper === "FR" ? "a-fr-mock" : "a-pm-mock") : undefined,
      paper: currentPaper,
      title: decMock ? `${currentPaper} mock exam · Dec 2026` : `${currentPaper} mock exam 2`,
      date: "2026-10-24",
      score: null,
      status: "scheduled",
    });
  }

  // EPSM and PER
  const epsm: Student["epsm"] = isUg
    ? strong
      ? { status: "in-progress", progress: rng.int(20, 40) }
      : { status: "not-started", progress: 0 }
    : has("epsm-progress") || spec.profile === "new-graduate"
      ? { status: spec.profile === "new-graduate" ? "not-started" : "in-progress", progress: spec.profile === "new-graduate" ? 0 : rng.int(55, 80) }
      : spec.profile === "fm-fast" && index % 2 === 0
        ? { status: "in-progress", progress: rng.int(30, 60) }
        : { status: "complete", progress: 100, completedOn: `2025-${10 + rng.int(0, 2)}-1${rng.int(0, 9)}` };

  const employer = EMPLOYERS[index % EMPLOYERS.length];
  const perOrder = ["po1", "po6", "po7", "po2", "po8", "po4", "po3", "po5", "po9"];
  const perMonths = isUg ? 0 : completed ? 36 : spec.profile === "sbr-current" ? rng.int(24, 34) : spec.profile === "new-graduate" ? rng.int(0, 4) : rng.int(6, 26);
  const perObjectivesCount = completed ? 9 : Math.min(8, Math.floor(perMonths / 4));
  const per: Student["per"] = isUg
    ? { status: "not-started", months: 0, objectives: [] }
    : {
        status: completed ? "complete" : perMonths === 0 ? "not-started" : "in-progress",
        months: perMonths,
        objectives: perOrder.slice(0, perObjectivesCount),
        employer: perMonths > 0 ? employer : undefined,
        supervisor: perMonths > 0 ? `${FIRST_NAMES[(index + 11) % FIRST_NAMES.length]} ${LAST_NAMES[(index + 7) % LAST_NAMES.length]}, Finance Manager` : undefined,
      };

  // Fees
  let fees: Student["fees"];
  const payFor = (planId: string, schedule: string[]) => {
    const past = pastCount(schedule);
    return feesFor(planId, schedule, has("fees-overdue") ? Math.max(0, past - 1) : past, rng);
  };
  if (has("paid-upfront")) fees = feesFor("fp-graduate-upfront", ["2026-01-12"], 1, rng);
  else if (spec.profile === "fm-fast") fees = payFor("fp-fasttrack", FAST_SCHEDULE);
  else if (spec.profile === "sbr-current") fees = payFor("fp-strategic", STRATEGIC_SCHEDULE);
  else if (completed) fees = feesFor("fp-strategic", STRATEGIC_SCHEDULE_2025, 5, rng);
  else if (spec.profile === "new-graduate") fees = feesFor("fp-graduate", GRAD_SCHEDULE_SEP, 1, rng);
  else if (spec.profile === "ug-bw25") fees = payFor("fp-bw-bcom", BW_SCHEDULE_2025);
  else if (spec.profile === "ug-bw26") fees = payFor("fp-bw-bcom", BW_SCHEDULE_2026);
  else if (spec.profile === "ug-cl25") fees = payFor("fp-cl-bcom", CL_SCHEDULE_2025);
  else if (spec.profile === "ug-nf26") fees = feesFor("fp-nf-bba", NF_SCHEDULE_2026, 0, rng);
  else fees = payFor("fp-graduate", index % 2 ? GRAD_SCHEDULE_2026_B : GRAD_SCHEDULE_2026);

  // Career
  const stage = spec.stage ?? null;
  const stageRank = stage ? PLACEMENT_ORDER.indexOf(stage) : -1;
  const ats = onboarding ? null : spec.placement ? Math.min(92, rng.int(58, 78) + (stageRank >= 3 ? 8 : 0) + (strong ? 4 : 0)) : isUg ? (spec.profile === "ug-bw26" ? null : rng.int(38, 60)) : rng.int(45, 62);
  const crs = onboarding ? null : spec.placement ? Math.min(90, rng.int(52, 72) + (stageRank >= 3 ? 10 : 0) + (strong ? 5 : 0)) : isUg ? (spec.profile === "ug-bw26" ? null : rng.int(35, 55)) : rng.int(40, 55);
  const internship: StudentCareer["internship"] = has("intern-completed")
    ? { status: "completed", company: EMPLOYERS[(index + 3) % EMPLOYERS.length], period: "May to Jul 2026" }
    : has("intern-ongoing")
      ? { status: "ongoing", company: EMPLOYERS[(index + 5) % EMPLOYERS.length], period: "Aug to Nov 2026" }
      : has("intern-applied")
        ? { status: "applied", company: EMPLOYERS[(index + 2) % EMPLOYERS.length], period: "Dec 2026 to Jan 2027" }
        : has("intern-planned")
          ? { status: "planned", period: "Summer 2027" }
          : { status: "none" };
  const career: StudentCareer = {
    atsScore: ats,
    companyReadiness: crs,
    placementEligible: spec.placement,
    targetRole: PROFILE_ROLE[spec.profile],
    resume: onboarding
      ? { status: "not-started" }
      : spec.placement
        ? { status: stageRank >= 1 || strong ? "approved" : index % 3 === 0 ? "changes-requested" : "in-review", updated: `2026-0${rng.int(7, 9)}-0${rng.int(1, 9)}` }
        : { status: ats === null ? "not-started" : "draft", updated: ats === null ? undefined : `2026-0${rng.int(6, 8)}-1${rng.int(0, 9)}` },
    internship,
    placementStage: stage,
  };

  const tags: string[] = [...flags, spec.profile];
  if (stage) tags.push(`placement-${stage}`);

  const semester = spec.profile === "ug-bw25" || spec.profile === "ug-cl25" ? 3 : isUg ? 1 : undefined;
  const cohortCode = spec.cohorts[0];
  const sectionId = isUg
    ? `sec-${cohortCode.slice(3)}-${(spec.section ?? "A").toLowerCase()}`
    : cohortCode
      ? GRAD_BATCH[cohortCode]?.[index % (GRAD_BATCH[cohortCode]?.length ?? 1)]
      : undefined;

  const base: Omit<Student, "risk" | "jointCertificate"> = {
    id,
    name,
    initials: initialsOf(name),
    email: `${key}.${slug(last)}@students.zskillup.com`,
    phone: `+91 9${String(8000 + index * 37).padStart(4, "0")} ${String(10000 + ((index * 7919) % 89999)).padStart(5, "0")}`,
    city,
    type,
    programmeId,
    intakeId,
    universityId,
    semester,
    section: isUg ? spec.section ?? "A" : undefined,
    sectionId,
    cohortIds: spec.cohorts,
    enrolmentStatus: completed ? "completed" : onboarding ? "onboarding" : "active",
    background: isUg
      ? { qualification: `${uni?.shortName === "Northfield" ? "BBA Finance" : "B.Com"} with ACCA, ${intakeId === "in-2025-jul" ? "2025 to 2028" : "2026 to 2029"}`, institution: uni!.name }
      : {
          qualification: `B.Com ${spec.profile === "alumni" ? 2020 : spec.profile === "sbr-current" ? 2021 : 2022 + (index % 3)}`,
          institution: COLLEGES[index % COLLEGES.length],
          occupation: completed ? `Assistant manager, ${employer}` : spec.profile === "new-graduate" && index % 2 ? undefined : `${OCCUPATIONS[index % OCCUPATIONS.length]}, ${employer}`,
        },
    accaId,
    verification,
    registration,
    subscription,
    exemptionClaim,
    exemptions,
    papers,
    options,
    currentPaper,
    examBookings: bookings,
    readiness,
    attendance,
    lastActiveDaysAgo,
    activityHours,
    mocks,
    missedMocks,
    mentorId: spec.mentor,
    epsm,
    per,
    fees,
    career,
    readinessTrend: onboarding ? [readinessBase] : trendTo(readiness.overall, rng, has("low-readiness") || has("inactive") ? -1 : 2),
    scenarioTags: tags,
  };

  if (!isUg) return { ...base, risk: riskFor(base) };
  const verificationForJc = index % 2 ? "verified" : "pending";
  const withJc = { ...base, jointCertificate: jointCertFor(base, verificationForJc) };
  return { ...withJc, risk: riskFor(withJc) };
}

/** Graduate cohort batch ids (see cohorts.ts `sections`). */
const GRAD_BATCH: Record<string, string[]> = {
  [FRW]: ["bt-fr-dec26-sat", "bt-fr-dec26-sun"],
  [PMR]: ["bt-pm-dec26-sun"],
  [FRR]: ["bt-fr-mar27-sat"],
  [FRE]: ["bt-fr-dec26-tth"],
  [AAE]: ["bt-aa-dec26-mwf"],
  [FMF]: ["bt-fm-dec26-mtw"],
  [SBR]: ["bt-sbr-mar27-sat"],
};

/* ------------------------------------------------------------------------------------------
 * Assemble, then rank undergraduate leaderboards
 * ---------------------------------------------------------------------------------------- */

function assemble(): Student[] {
  const used = new Set(["4382917", "5129044"]);
  const generated = SPECS.map((spec, i) => buildGenerated(spec, i, used));
  const all = [buildAnaya(), buildRohan(), ...generated];

  // Leaderboard ranks for sample undergraduates (Rohan is fixed at rank 4 of 71).
  const cohortSize: Record<string, number> = { [BW25]: 71, [BW26]: 71, [CL25]: 48, [NF26]: 64 };
  const slots: Record<string, number[]> = {
    [BW25]: [1, 2, 3, 6, 9, 13, 17, 22, 28, 34, 41, 48, 55, 63],
    [BW26]: [2, 8, 19, 33, 57],
    [CL25]: [1, 7, 15, 29, 40],
    [NF26]: [21, 38],
  };
  for (const cohortId of Object.keys(slots)) {
    const members = all
      .filter((s) => s.type === "undergraduate" && s.cohortIds[0] === cohortId && s.id !== "s-rohan")
      .map((s) => ({ s, score: s.readiness.overall * 0.6 + s.attendance.pct * 0.4 - (s.lastActiveDaysAgo >= 14 ? 20 : 0) + (s.scenarioTags.includes("jc-eligible") ? 30 : 0) }))
      .sort((a, b) => b.score - a.score);
    members.forEach(({ s }, i) => {
      const rank = slots[cohortId][i] ?? 40 + i;
      s.leaderboard = { points: leaderboardPoints(rank), rank, cohortSize: cohortSize[cohortId], streak: Math.max(0, 16 - Math.floor(rank / 4)) };
    });
  }
  return all;
}

function leaderboardPoints(rank: number) {
  return Math.round(5000 - rank * 48 - rank * rank * 0.2);
}

export const students: Student[] = assemble();

const studentIndex = new Map(students.map((s) => [s.id, s]));

export function studentById(id: string | null | undefined): Student | undefined {
  return id ? studentIndex.get(id) : undefined;
}

export function studentName(id: string | null | undefined) {
  return studentById(id)?.name ?? "Unknown learner";
}

export const DEMO_GRADUATE_ID = "s-anaya";
export const DEMO_UNDERGRADUATE_ID = "s-rohan";

export function studentsForMentor(mentorId: string) {
  return students.filter((s) => s.mentorId === mentorId);
}

export function placementEligibleStudents() {
  return students.filter((s) => s.career.placementEligible);
}

export function studentsForUniversity(universityId: string) {
  return students.filter((s) => s.universityId === universityId);
}

export function studentsInCohort(cohortId: string) {
  return students.filter((s) => s.cohortIds.includes(cohortId));
}

export function studentsByType(type: StudentType) {
  return students.filter((s) => s.type === type);
}

/** Papers passed or exempt. */
export function papersCleared(s: Student) {
  return Object.values(s.papers).filter((p) => p.status === "passed" || p.status === "exempt").length;
}

export function latestAttempt(s: Student, code: PaperCode) {
  const a = s.papers[code].attempts;
  return a[a.length - 1];
}

/** Every attempt across papers, newest first. */
export function attemptHistory(s: Student) {
  return Object.values(s.papers)
    .flatMap((p) => p.attempts.map((a) => ({ ...a, paper: p.code, paperName: paperByCode(p.code)?.name ?? p.code })))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export const PAPER_STATUS_LABELS: Record<PaperProgress["status"], string> = {
  exempt: "Exempt",
  passed: "Passed",
  current: "Current",
  "in-progress": "In progress",
  "results-pending": "Results pending",
  upcoming: "Upcoming",
  failed: "Failed",
  "not-started": "Not started",
};

/* ------------------------------------------------------------------------------------------
 * Full cohort leaderboards (sample students plus the rest of the headline cohort)
 * ---------------------------------------------------------------------------------------- */

export function leaderboardFor(cohortId: string): LeaderboardEntry[] {
  const size: Record<string, number> = { [BW25]: 71, [BW26]: 71, [CL25]: 48, [NF26]: 64 };
  const total = size[cohortId];
  if (!total) return [];
  const rng = createRng(cohortId.length * 101 + total);
  const byRank = new Map<number, Student>();
  for (const s of studentsInCohort(cohortId)) if (s.leaderboard) byRank.set(s.leaderboard.rank, s);
  const fillFirst = shuffled(FIRST_NAMES, rng);
  const fillLast = shuffled(LAST_NAMES, rng);
  const entries: LeaderboardEntry[] = [];
  let filler = 0;
  for (let rank = 1; rank <= total; rank++) {
    const s = byRank.get(rank);
    if (s && s.leaderboard) {
      entries.push({ rank, name: s.name, initials: s.initials, studentId: s.id, section: s.section ?? "A", points: s.leaderboard.points, streak: s.leaderboard.streak, change: rng.int(-2, 3) });
    } else {
      const name = `${fillFirst[filler % fillFirst.length]} ${fillLast[(filler * 3) % fillLast.length]}`;
      filler++;
      entries.push({ rank, name, initials: initialsOf(name), section: rank % 2 ? "A" : "B", points: leaderboardPoints(rank), streak: Math.max(0, 16 - Math.floor(rank / 4) + rng.int(-2, 2)), change: rng.int(-3, 3) });
    }
  }
  return entries;
}
