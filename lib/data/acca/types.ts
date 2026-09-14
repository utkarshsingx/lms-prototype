/**
 * ACCA LMS sample world: shared types, constants and pure helpers.
 * Leaf module (imports nothing) so every other data file can depend on it without cycles.
 */

/* ------------------------------------------------------------------------------------------
 * Constants and helpers
 * ---------------------------------------------------------------------------------------- */

/** Demo "today": Monday 14 September 2026, IST. */
export const ACCA_TODAY = "2026-09-14";

/** Semantic tone, a subset of the UI kit's StatusTone. */
export type Tone = "jade" | "amber" | "rose" | "neutral" | "info" | "violet";

/** Deterministic PRNG (mulberry32). Same seed, same sequence, on server and client. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
  };
}
export type Rng = ReturnType<typeof createRng>;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parseIsoDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return { y, m, d };
}

/** "2026-09-14" → "14 Sep 2026". Accepts datetimes too. */
export function formatAccaDate(iso: string) {
  const { y, m, d } = parseIsoDate(iso);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** "2026-09-14" → "14 Sep". */
export function formatShortDate(iso: string) {
  const { m, d } = parseIsoDate(iso);
  return `${d} ${MONTHS[m - 1]}`;
}

/** "2026-09-14T18:30" → "14 Sep 2026, 18:30". */
export function formatDateTime(iso: string) {
  const time = iso.length > 10 ? iso.slice(11, 16) : "";
  return time ? `${formatAccaDate(iso)}, ${time}` : formatAccaDate(iso);
}

/** "2026-09-14T18:30" → "18:30". */
export function formatTime(iso: string) {
  return iso.slice(11, 16);
}

/** "2026-09" → "Sep 2026". */
export function formatMonth(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

function toUtcDays(iso: string) {
  const { y, m, d } = parseIsoDate(iso);
  return Date.UTC(y, m - 1, d) / 86400000;
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string) {
  return Math.round(toUtcDays(to) - toUtcDays(from));
}

/** ISO date `n` days before ACCA_TODAY (negative n = after). */
export function isoDaysAgo(n: number) {
  return addDays(ACCA_TODAY, -n);
}

/** ISO date plus `n` days. */
export function addDays(iso: string, n: number) {
  const dt = new Date((toUtcDays(iso) + n) * 86400000);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

/** Indian digit grouping: 147000 → "1,47,000". */
export function groupIndian(n: number) {
  const negative = n < 0;
  const s = String(Math.round(Math.abs(n)));
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}` : last3;
  return negative ? `-${grouped}` : grouped;
}

/** 147000 → "₹1,47,000". */
export function formatINR(amount: number) {
  return `₹${groupIndian(amount)}`;
}

/** 89 → "£89"; 1234.5 → "£1,234.50". */
export function formatGBP(amount: number) {
  const whole = Number.isInteger(amount);
  const [int, dec] = Math.abs(amount).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${amount < 0 ? "-" : ""}£${grouped}${whole ? "" : `.${dec}`}`;
}

/** "Anaya Rao" → "AR". */
export function initialsOf(name: string) {
  const parts = name.replace(/^(Dr|Prof\.)\s+/, "").split(/\s+/);
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ------------------------------------------------------------------------------------------
 * ACCA structure
 * ---------------------------------------------------------------------------------------- */

export type PaperCode =
  | "BT"
  | "MA"
  | "FA"
  | "LW"
  | "PM"
  | "TX"
  | "FR"
  | "AA"
  | "FM"
  | "SBL"
  | "SBR"
  | "AFM"
  | "APM"
  | "ATX"
  | "AAA";

export type PaperLevel = "applied-knowledge" | "applied-skills" | "strategic-professional";
export type PaperGroup = "Applied Knowledge" | "Applied Skills" | "Essentials" | "Options";
export type ExamFormat = "on-demand" | "session";

export type SyllabusArea = { code: string; title: string };

export type AccaPaper = {
  code: PaperCode;
  name: string;
  level: PaperLevel;
  levelLabel: string;
  group: PaperGroup;
  /** True for the four Strategic Professional options (choose two). */
  option?: boolean;
  examFormat: ExamFormat;
  durationMins: number;
  /** "2h", "3h 15m". */
  durationLabel: string;
  passMark: 50;
  syllabusAreas: SyllabusArea[];
  /** lib/data/courses.ts id and slug (bible section 7). */
  courseId: string;
  courseSlug: string;
  /** Lead faculty staff id. */
  leadFacultyId: string;
  order: number;
  examStructure: string;
};

export type ExamSessionId =
  | "es-2025-sep"
  | "es-2025-dec"
  | "es-2026-mar"
  | "es-2026-jun"
  | "es-2026-sep"
  | "es-2026-dec"
  | "es-2027-mar"
  | "es-2027-jun";

export type ExamSessionStatus =
  | "results-released"
  | "results-pending"
  | "entry-open"
  | "entry-not-open";

export type ExamSession = {
  id: ExamSessionId;
  /** "Dec 2026". */
  label: string;
  examStart: string;
  examEnd: string;
  earlyEntryCloses?: string;
  standardEntryCloses?: string;
  lateEntryCloses?: string;
  resultsDate: string;
  status: ExamSessionStatus;
  /** "Results pending", "Early entry open". */
  statusLabel: string;
  past: boolean;
};

export type EntryWindow = "early" | "standard" | "late" | "on-demand";

export type PerObjective = {
  id: string;
  code: string;
  name: string;
  kind: "essential" | "technical";
};

/* ------------------------------------------------------------------------------------------
 * Organisation
 * ---------------------------------------------------------------------------------------- */

export type AccaRoleId =
  | "super-admin"
  | "programme-admin"
  | "university-admin"
  | "faculty"
  | "mentor"
  | "student";

export type StaffKind =
  | "super-admin"
  | "programme-admin"
  | "university-admin"
  | "faculty"
  | "mentor"
  | "career";

export type StaffMember = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  kind: StaffKind;
  /** Which of the six logins this person uses. */
  loginRole: AccaRoleId;
  title: string;
  /** Persona id in lib/personas.ts when this person is a demo login. */
  personaId?: string;
  universityId?: string;
  access?: "editor" | "view-only";
  focusPapers: PaperCode[];
  cohortIds: string[];
  location: string;
  joined: string;
  status: "active" | "invited" | "on-leave";
  allocation: {
    /** Mentors: allocated sample students. Career: learners in scope. */
    students?: number;
    weeklyTeachingHours?: number;
    capacity?: number;
    note: string;
  };
  bio: string;
};

export type WorkspaceConfig = {
  slug: string;
  domain: string;
  loginMethods: string[];
  enabledModules: string[];
  studentIdFormat: string;
  supportEmail: string;
  dataRegion: string;
  defaultTimezone: string;
  status: "Live" | "Onboarding";
  goLive: string;
};

export type UniversityBranding = {
  /** Hex brand colour (data-driven swatch, allowed in style). */
  primary: string;
  logoInitials: string;
  tagline: string;
  certificateSeal: string;
};

export type Semester = {
  id: string;
  universityId: string;
  intakeId: string;
  number: number;
  label: string;
  start: string;
  end: string;
  examStart: string;
  examEnd: string;
  status: "completed" | "in-progress" | "upcoming";
};

export type CalendarKind =
  | "semester"
  | "university-exam"
  | "blackout"
  | "holiday"
  | "acca-exam"
  | "entry-deadline"
  | "results"
  | "mock"
  | "class"
  | "orientation"
  | "subscription"
  | "payment"
  | "event";

export type CalendarEvent = {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  kind: CalendarKind;
  tone: Tone;
  universityId?: string;
  cohortId?: string;
  programmeId?: string;
  note?: string;
};

export type ExamPeriod = {
  id: string;
  universityId: string;
  label: string;
  start: string;
  end: string;
  semesters: number[];
  intakeIds: string[];
};

export type BlackoutPeriod = {
  id: string;
  universityId: string;
  start: string;
  end: string;
  label: string;
  reason: string;
  rules: string[];
  addedBy: string;
  addedOn: string;
};

export type Coverage = "full" | "partial" | "conceptual-only";

export type SubjectMapping = {
  paper: PaperCode;
  /** Syllabus area letters. Empty = paper-level (conceptual only). */
  areas: string[];
  coverage: Coverage;
};

export type UniversitySubject = {
  id: string;
  universityId: string;
  code: string;
  name: string;
  semester: number;
  credits: number;
  mappings: SubjectMapping[];
  mappingStatus: "mapped" | "in-review" | "not-mapped";
  note?: string;
  reviewedBy?: string;
};

export type RoadmapStage = {
  id: string;
  universityId: string;
  /** null = after graduation. */
  semester: number | null;
  label: string;
  window: string;
  papers: PaperCode[];
  focus: string;
  /** Paper whose on-demand exam window falls in this stage. */
  examWindowPapers: PaperCode[];
  overlapSubjectIds: string[];
};

export type JointCertificateRule = {
  title: string;
  issuers: string[];
  criteria: { id: JointCertCheckId; label: string }[];
  summary: string;
};

export type JointCertCheckId = "applied-knowledge" | "lw-passed" | "attendance" | "no-overdue-fees";

export type AnnouncementAudience = "all" | "programme" | "university" | "cohort";
export type Channel = "in-app" | "email" | "whatsapp" | "sms" | "push";

export type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  /** programmeId, universityId or cohortId depending on audience. */
  audienceId?: string;
  audienceLabel: string;
  authorId: string;
  publishedOn: string;
  status: "published" | "scheduled" | "draft";
  channels: Channel[];
  category: "Academic" | "Operations" | "Exams" | "University" | "Careers" | "Finance";
  pinned?: boolean;
  readPct?: number;
};

export type University = {
  id: "u-brightwater" | "u-coastline" | "u-northfield";
  name: string;
  shortName: string;
  city: string;
  state: string;
  programmeId: string;
  programmeName: string;
  status: "Live" | "Onboarding";
  /** Headline student count. */
  students: number;
  partnerSince: string;
  semesterSystem: { semesters: number; academicYear: string };
  branding: UniversityBranding;
  workspace: WorkspaceConfig;
  adminIds: string[];
  headline: {
    students: number;
    intakes: number;
    activeCohorts: number;
    sections: number;
    avgAttendance: number;
    avgReadiness: number;
    atRisk: number;
    registeredPct: number;
    jointCertOnTrackPct: number;
    internshipsPlanned: number;
  };
  contact: { name: string; email: string; phone: string };
};

/* ------------------------------------------------------------------------------------------
 * Programmes, intakes, cohorts
 * ---------------------------------------------------------------------------------------- */

export type ProgrammeKind = "graduate" | "fast-track" | "strategic" | "university";

export type Programme = {
  id: string;
  name: string;
  kind: ProgrammeKind;
  market: "Open market" | "University partnership";
  deliveredBy: string;
  universityId?: string;
  /** Headline learner count. */
  learners: number;
  papers: PaperCode[];
  durationMonths: number;
  structure: { id: string; label: string; papers: PaperCode[]; detail: string }[];
  feePlanIds: string[];
  intakeIds: string[];
  leadId: string;
  status: "active" | "onboarding" | "draft";
  description: string;
};

export type Intake = {
  id: string;
  label: string;
  kind: "university" | "graduate";
  start: string;
  programmeIds: string[];
  /** Headline enrolled count. */
  students: number;
  status: "active" | "enrolling" | "closed";
};

export type CohortType = "regular" | "revision" | "reattempt" | "fast-track" | "university";
export type CohortMode = "weekday" | "weekend";

export type CohortSection = {
  id: string;
  cohortId: string;
  kind: "section" | "batch";
  name: string;
  size: number;
  schedule: string;
  facultyId: string;
  room?: string;
  onlineLink?: string;
};

export type Cohort = {
  id: string;
  name: string;
  type: CohortType;
  mode: CohortMode;
  papers: PaperCode[];
  programmeId: string;
  universityId?: string;
  intakeId?: string;
  semester?: number;
  examSessionId?: ExamSessionId;
  facultyIds: string[];
  mentorId: string;
  /** Headline size (bible table). */
  size: number;
  capacity: number;
  /** Sample student records that exist in `students`. */
  studentIds: string[];
  sections: CohortSection[];
  schedule: string;
  delivery: "Online live" | "Hybrid" | "On campus";
  startDate: string;
  endDate: string;
  status: "running" | "enrolling" | "onboarding" | "completed";
  /** Shown to graduates choosing a cohort. */
  selectable: boolean;
};

/* ------------------------------------------------------------------------------------------
 * Students
 * ---------------------------------------------------------------------------------------- */

export type StudentType = "graduate" | "undergraduate";

export type PaperStatus =
  | "exempt"
  | "passed"
  | "current"
  | "in-progress"
  | "results-pending"
  | "upcoming"
  | "failed"
  | "not-started";

export type AttemptResult = "passed" | "failed" | "pending" | "absent";

export type PaperAttempt = {
  sessionId?: ExamSessionId;
  date: string;
  /** "Mar 2026" for sessions, "18 Nov 2026" style month label for on-demand. */
  label: string;
  score: number | null;
  result: AttemptResult;
};

export type PaperProgress = {
  code: PaperCode;
  status: PaperStatus;
  attempts: PaperAttempt[];
  /** Learning progress 0 to 100. */
  progress: number;
  plannedSessionId?: ExamSessionId;
  plannedLabel?: string;
  note?: string;
};

export type ExemptionState = "estimated" | "submitted" | "approved" | "rejected";
export type DocStatus = "verified" | "pending" | "rejected" | "missing";

export type ExemptionRecord = {
  paper: PaperCode;
  state: ExemptionState;
  estimatedOn: string;
  submittedOn?: string;
  decidedOn?: string;
  basis: string;
  fee: { status: "paid" | "unpaid" | "not-due"; amountGBP: number; paidOn?: string };
  documents: { name: string; status: DocStatus }[];
  note?: string;
};

export type ExamBookingStatus = "booked" | "planned" | "not-booked" | "sat" | "cancelled";

export type ExamBooking = {
  id: string;
  paper: PaperCode;
  sessionId?: ExamSessionId;
  /** On-demand exam date, or session exam start. */
  date: string;
  label: string;
  entryWindow: EntryWindow;
  entryClosesOn?: string;
  status: ExamBookingStatus;
  bookedOn?: string;
  feeGBP: number;
  feeStatus: "paid" | "unpaid";
  centre: string;
  blackoutWarning?: string;
};

export type MockAttempt = {
  id: string;
  /** lib/data/assessments.ts id when one exists. */
  assessmentId?: string;
  paper: PaperCode;
  title: string;
  date: string;
  score: number | null;
  status: "completed" | "missed" | "scheduled";
};

export type RiskLevel = "low" | "medium" | "high";

export type Instalment = {
  n: number;
  amount: number;
  dueDate: string;
  status: "paid" | "due" | "overdue" | "upcoming";
  paidOn?: string;
};

export type FeeStatus = "paid" | "on-track" | "due" | "overdue";

export type PlacementStage =
  | "applied"
  | "shortlisted"
  | "interview"
  | "offer"
  | "joined"
  | "rejected";

export type StudentCareer = {
  atsScore: number | null;
  companyReadiness: number | null;
  placementEligible: boolean;
  targetRole: string;
  resume: {
    status: "not-started" | "draft" | "in-review" | "changes-requested" | "approved";
    updated?: string;
  };
  internship: {
    status: "none" | "planned" | "applied" | "ongoing" | "completed";
    company?: string;
    period?: string;
  };
  placementStage: PlacementStage | null;
  transitionGoal?: string;
};

export type JointCertificateStatus = {
  status: "eligible" | "on-track" | "at-risk";
  checks: { id: JointCertCheckId; label: string; met: boolean; detail: string }[];
  missing: string[];
  universityVerification: "verified" | "pending" | "not-started";
};

export type Student = {
  id: string;
  name: string;
  initials: string;
  email: string;
  phone: string;
  city: string;
  type: StudentType;
  programmeId: string;
  intakeId: string;
  universityId?: University["id"];
  semester?: number;
  /** Section letter within a university cohort ("A"). */
  section?: string;
  sectionId?: string;
  cohortIds: string[];
  enrolmentStatus: "active" | "onboarding" | "completed";
  background: { qualification: string; institution: string; occupation?: string };
  /** 7-digit ACCA student ID, null until registered. */
  accaId: string | null;
  /** University record verification (undergraduates). */
  verification: {
    status: "verified" | "pending" | "mismatch" | "not-required";
    by?: string;
    on?: string;
    note?: string;
  };
  registration: { status: "registered" | "pending" | "not-registered"; date?: string; note?: string };
  subscription: {
    status: "paid" | "overdue" | "not-applicable";
    dueDate: string | null;
    amountGBP: number;
    paidOn?: string;
  };
  exemptionClaim: {
    status: "none" | "documents-pending" | "under-evaluation" | "estimated" | "submitted" | "decided";
    qualification?: string;
    note: string;
  };
  exemptions: ExemptionRecord[];
  papers: Record<PaperCode, PaperProgress>;
  /** Strategic Professional options chosen (two), when decided. */
  options: PaperCode[];
  currentPaper: PaperCode | null;
  examBookings: ExamBooking[];
  readiness: { overall: number; byPaper: Partial<Record<PaperCode, number>> };
  attendance: { pct: number; attended: number; total: number; missedClasses: number; lastMissed?: string };
  lastActiveDaysAgo: number;
  /** Study hours per week for the last 8 weeks, oldest first (see activityWeekLabels). */
  activityHours: number[];
  mocks: MockAttempt[];
  missedMocks: number;
  risk: { level: RiskLevel; reasons: string[] };
  mentorId: string;
  epsm: { status: "complete" | "in-progress" | "not-started"; progress: number; completedOn?: string };
  per: {
    status: "not-started" | "in-progress" | "complete";
    months: number;
    /** Achieved PER objective ids. */
    objectives: string[];
    employer?: string;
    supervisor?: string;
  };
  fees: {
    planId: string;
    total: number;
    paid: number;
    /** Amount currently due or overdue (not future instalments). */
    due: number;
    balance: number;
    status: FeeStatus;
    nextDueDate: string | null;
    instalments: Instalment[];
  };
  career: StudentCareer;
  /** Undergraduates only. */
  leaderboard?: { points: number; rank: number; cohortSize: number; streak: number };
  /** University students only. */
  jointCertificate?: JointCertificateStatus;
  /** Latest readiness trend, 6 points, oldest first. Onboarding learners have a single point. */
  readinessTrend: number[];
  /** Scenario tags the sample covers ("fees-overdue", "blackout-booking"), for filters and demos. */
  scenarioTags: string[];
};

export type LeaderboardEntry = {
  rank: number;
  name: string;
  initials: string;
  studentId?: string;
  section: string;
  points: number;
  streak: number;
  change: number;
};

/* ------------------------------------------------------------------------------------------
 * Schedule
 * ---------------------------------------------------------------------------------------- */

export type LiveClass = {
  id: string;
  cohortId: string;
  sectionId?: string;
  paper: PaperCode;
  title: string;
  syllabusArea: string;
  facultyId: string;
  /** "2026-09-14T18:30" IST. */
  start: string;
  durationMins: number;
  delivery: "online" | "on-campus";
  room?: string;
  link?: string;
  status: "completed" | "live" | "today" | "upcoming" | "cancelled";
  attendance: { marked: boolean; present: number; total: number; pct: number } | null;
  recording: { status: "published" | "processing" | "not-uploaded"; durationMins?: number; views?: number } | null;
  notes: "published" | "draft" | "not-started";
  resources: { name: string; kind: "slides" | "worksheet" | "notes" | "question-set" }[];
  note?: string;
};

export type DoubtSession = {
  id: string;
  cohortId: string;
  paper: PaperCode;
  facultyId: string;
  start: string;
  durationMins: number;
  title: string;
  status: "completed" | "upcoming" | "today";
  questionsQueued: number;
  attendees: number;
  link: string;
};

export type ExaminationCycle = {
  id: string;
  sessionId: ExamSessionId;
  label: string;
  status: "closed" | "results-pending" | "entry-open" | "planning";
  papers: PaperCode[];
  bookings: number;
  notBooked: number;
  resultsRecorded: number;
  passRate: number | null;
  mockDeadline: string;
  revisionCohortIds: string[];
  note: string;
};

/* ------------------------------------------------------------------------------------------
 * Content
 * ---------------------------------------------------------------------------------------- */

export type ContentType =
  | "video"
  | "study-material"
  | "transcript"
  | "examiner-report"
  | "model-answer"
  | "revision-notes"
  | "practice-activity";

export type ContentStatus = "draft" | "in-review" | "published" | "outdated";

export type ContentVersion = {
  version: string;
  date: string;
  authorId: string;
  summary: string;
  status: ContentStatus;
};

export type ContentItem = {
  id: string;
  title: string;
  paper: PaperCode;
  courseId: string;
  module: string;
  lesson: string;
  type: ContentType;
  syllabusArea: string;
  universitySubjectIds: string[];
  variant: { universityId: string; label: string } | null;
  status: ContentStatus;
  version: string;
  versions: ContentVersion[];
  authorId: string;
  reviewerId: string | null;
  updated: string;
  /** "42 min", "18 pages", "12 questions". */
  size: string;
  views: number;
  outdatedReason?: string;
};

export type ReviewRequest = {
  id: string;
  contentId: string;
  title: string;
  paper: PaperCode;
  submittedBy: string;
  reviewerId: string;
  submittedOn: string;
  dueOn: string;
  status: "pending" | "changes-requested" | "approved";
  fromVersion: string;
  toVersion: string;
  changeSummary: string;
  changes: { section: string; before: string; after: string }[];
  comments: { authorId: string; at: string; body: string }[];
};

/* ------------------------------------------------------------------------------------------
 * Assessment bank
 * ---------------------------------------------------------------------------------------- */

export type BankQuestionType = "OT" | "MTQ" | "CR" | "number";
export type Difficulty = "foundation" | "intermediate" | "exam-standard";

export type BankQuestion = {
  id: string;
  bankId: string;
  paper: PaperCode;
  syllabusArea: string;
  topic: string;
  difficulty: Difficulty;
  type: BankQuestionType;
  marks: number;
  status: "draft" | "in-review" | "published" | "retired";
  authorId: string;
  /** Share of learners answering correctly, 0 to 1. null until used. */
  facilityIndex: number | null;
  usedIn: number;
  stem: string;
  answerKey: string;
  unit?: string;
  updated: string;
};

export type QuestionBank = {
  id: string;
  name: string;
  paper: PaperCode;
  ownerId: string;
  questionIds: string[];
  status: "published" | "draft";
  updated: string;
  description: string;
};

export type BlueprintSection = {
  section: string;
  format: string;
  marks: number;
  areas: string[];
  questionIds?: string[];
};

export type QuizOrMock = {
  id: string;
  title: string;
  kind: "quiz" | "mock" | "progress-test";
  paper: PaperCode;
  assessmentId?: string;
  durationMins: number;
  totalMarks: number;
  blueprint: BlueprintSection[];
  rubricId?: string;
  status: "published" | "scheduled" | "draft" | "closed";
  cohortIds: string[];
  opensOn: string;
  closesOn: string;
  attempts: number;
  avgScore: number | null;
  createdBy: string;
  proctored: boolean;
};

export type EvaluationRubric = {
  id: string;
  name: string;
  paper: PaperCode | null;
  appliesTo: string;
  criteria: { id: string; label: string; marks: number; descriptors: { band: string; text: string }[] }[];
  createdBy: string;
  updated: string;
};

export type EvaluationItem = {
  id: string;
  kind: "descriptive" | "assignment" | "project";
  title: string;
  paper: PaperCode;
  studentId: string;
  cohortId: string;
  assessmentId?: string;
  rubricId: string;
  question: string;
  answerExcerpt: string;
  wordCount: number;
  submittedOn: string;
  dueOn: string;
  status: "to-grade" | "in-progress" | "graded" | "returned" | "flagged";
  graderId: string;
  marks: number | null;
  maxMarks: number;
  feedback?: string;
  plagiarism: { similarity: number; flagged: boolean; source?: string; misconduct?: string };
};

export type ReattemptRequest = {
  id: string;
  studentId: string;
  paper: PaperCode;
  title: string;
  assessmentId?: string;
  attemptsUsed: number;
  attemptsAllowed: number;
  lastScore: number;
  reason: string;
  requestedOn: string;
  status: "pending" | "approved" | "declined";
  decidedBy?: string;
  decidedOn?: string;
};

export type ReEvaluationRequest = {
  id: string;
  studentId: string;
  evaluationId: string;
  paper: PaperCode;
  title: string;
  originalMarks: number;
  maxMarks: number;
  reason: string;
  requestedOn: string;
  status: "open" | "under-review" | "upheld" | "revised";
  panelIds: string[];
  revisedMarks?: number;
};

export type PaperAnalytics = {
  paper: PaperCode;
  attempts: number;
  avgScore: number;
  passRate: number;
  medianTimeMins: number;
  byArea: { area: string; title: string; avg: number }[];
  /** Score distribution in 10-point bins, 0-9 ... 90-100. */
  distribution: number[];
  /** Average score across the last 6 mocks and tests. */
  trend: number[];
  hardestQuestionIds: string[];
};

export type CohortWeakTopic = {
  cohortId: string;
  paper: PaperCode;
  topics: {
    area: string;
    topic: string;
    avgScore: number;
    studentsBelow50: number;
    recommendation: string;
    contentId?: string;
  }[];
};

/* ------------------------------------------------------------------------------------------
 * Support
 * ---------------------------------------------------------------------------------------- */

export type TicketCategory =
  | "Registration"
  | "Exemption"
  | "Exam booking"
  | "Payments"
  | "Technical"
  | "Academic"
  | "Career";

export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in-progress" | "waiting-on-student" | "escalated" | "resolved";

export type Ticket = {
  id: string;
  subject: string;
  body: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  studentId: string;
  universityId?: string;
  assigneeId: string | null;
  channel: "portal" | "whatsapp" | "email" | "phone";
  created: string;
  updated: string;
  firstResponseMins: number | null;
  resolutionHours: number | null;
  slaHours: number;
  escalatedTo?: string;
  history: { id: string; at: string; actor: string; action: string; note?: string }[];
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  category: TicketCategory;
  audience: "all" | "graduate" | "undergraduate";
  views: number;
  helpfulPct: number;
  updated: string;
  status: "published" | "draft";
};

export type RecurringProblem = {
  id: string;
  title: string;
  category: TicketCategory;
  count30d: number;
  /** Weekly counts, last 6 weeks. */
  trend: number[];
  rootCause: string;
  ownerId: string;
  status: "investigating" | "fix-in-progress" | "monitoring" | "resolved";
  fix: string;
  linkedTicketIds: string[];
};

export type EscalationRule = {
  id: string;
  category: TicketCategory;
  trigger: string;
  levels: { level: 1 | 2 | 3; team: string; ownerId: string; slaHours: number }[];
};

/* ------------------------------------------------------------------------------------------
 * Finance
 * ---------------------------------------------------------------------------------------- */

export type FeePlan = {
  id: string;
  name: string;
  programmeId: string;
  instalments: number;
  instalmentAmount: number;
  total: number;
  schedule: string;
  lateFeeINR: number;
  graceDays: number;
  active: boolean;
  note: string;
};

export type PaymentKind =
  | "tuition"
  | "acca-registration"
  | "acca-subscription"
  | "acca-exemption"
  | "acca-exam";

export type Payment = {
  id: string;
  studentId: string;
  kind: PaymentKind;
  description: string;
  currency: "INR" | "GBP";
  amount: number;
  date: string;
  method: "UPI" | "Card" | "Net banking" | "Bank transfer" | "Cheque" | "Cash" | "Paid on ACCA portal";
  status: "paid" | "pending" | "failed" | "refunded";
  paidTo: "ZSkillup" | "ACCA";
  reference: string;
  offline: boolean;
  recordedBy: string;
  receiptId?: string;
  paper?: PaperCode;
  reconciliation: "matched" | "unmatched" | "pending" | "not-applicable";
};

export type Receipt = {
  id: string;
  paymentId: string;
  studentId: string;
  issuedOn: string;
  amount: number;
  issuedBy: string;
  description: string;
};

export type Refund = {
  id: string;
  studentId: string;
  paymentId?: string;
  amount: number;
  reason: string;
  requestedOn: string;
  status: "requested" | "approved" | "processed" | "rejected";
  approverId?: string;
  processedOn?: string;
};

export type PaymentReminder = {
  id: string;
  studentId: string;
  subject: string;
  amount: number;
  channel: Channel;
  sentOn: string;
  sentBy: string;
  templateId: string;
  status: "sent" | "delivered" | "read" | "failed" | "scheduled";
};

export type ReconciliationRow = {
  id: string;
  date: string;
  source: string;
  reference: string;
  amount: number;
  currency: "INR" | "GBP";
  matchedPaymentId?: string;
  status: "matched" | "unmatched" | "partial" | "investigating";
  note: string;
};

/* ------------------------------------------------------------------------------------------
 * Careers
 * ---------------------------------------------------------------------------------------- */

export type CareerProfile = {
  studentId: string;
  headline: string;
  targetRoles: string[];
  preferredCities: string[];
  skills: string[];
  experience: { role: string; organisation: string; period: string }[];
  completeness: number;
  updated: string;
  ownerId: string;
};

export type Resume = {
  id: string;
  studentId: string;
  version: string;
  updated: string;
  atsScore: number;
  status: "draft" | "in-review" | "changes-requested" | "approved";
  reviewerId?: string;
  breakdown: { label: string; score: number }[];
  feedback: string[];
  missingKeywords: string[];
};

export type MockInterview = {
  id: string;
  studentId: string;
  kind: "ai" | "mentor";
  interviewerId?: string;
  role: string;
  date: string;
  durationMins: number;
  status: "completed" | "scheduled";
  score: number | null;
  rubric: { label: string; score: number }[];
  strengths: string[];
  improvements: string[];
  feedback: string;
};

export type CompanyReadiness = {
  studentId: string;
  score: number;
  band: "Ready" | "Nearly ready" | "Developing";
  components: { label: string; weight: number; score: number }[];
  trend: number[];
};

export type Opportunity = {
  id: string;
  title: string;
  company: string;
  kind: "job" | "internship";
  location: string;
  workMode: "On-site" | "Hybrid" | "Remote";
  compensation: string;
  openings: number;
  postedOn: string;
  closesOn: string;
  postedBy: string;
  status: "open" | "closed" | "draft";
  eligibility: {
    studentTypes: StudentType[];
    minPapersCleared: number;
    requiredPapers: PaperCode[];
    minCompanyReadiness: number;
    minAts: number;
    placementEligibleOnly: boolean;
    note: string;
  };
  description: string;
  skills: string[];
};

export type Application = {
  id: string;
  opportunityId: string;
  studentId: string;
  stage: PlacementStage;
  appliedOn: string;
  updated: string;
  matchScore: number;
  shortlistedBy?: string;
  interview?: { date: string; round: string; mode: "Video" | "On-site" | "Phone"; panel: string };
  recruiterFeedback?: string;
  offer?: { ctcLPA: number; offeredOn: string; joiningDate: string; status: "offered" | "accepted" | "declined" | "joined" };
};

export type InternshipRecord = {
  id: string;
  studentId: string;
  company: string;
  role: string;
  start: string;
  end: string;
  status: "planned" | "ongoing" | "completed";
  hoursLogged: number;
  hoursRequired: number;
  supervisor: string;
  rating: number | null;
  certificate: "issued" | "pending" | "not-due";
};

export type AlumniOutcome = {
  id: string;
  name: string;
  studentId?: string;
  programmeId: string;
  universityId?: string;
  completedYear: number;
  accaStatus: "Affiliate" | "Member" | "Finalist";
  role: string;
  company: string;
  city: string;
  ctcLPA: number;
};

export type TransitionRoadmap = {
  studentId: string;
  from: string;
  to: string;
  targetDate: string;
  progressPct: number;
  milestones: { id: string; label: string; due: string; status: "done" | "current" | "upcoming"; detail: string }[];
  skillGaps: { skill: string; current: number; target: number }[];
  targetRoles: { title: string; fit: number; note: string }[];
};

/* ------------------------------------------------------------------------------------------
 * Mentoring
 * ---------------------------------------------------------------------------------------- */

export type RiskAlertKind =
  | "inactive"
  | "missed-class"
  | "missed-mock"
  | "low-readiness"
  | "failed-paper"
  | "payment-overdue";

export type RiskAlert = {
  id: string;
  studentId: string;
  mentorId: string;
  kind: RiskAlertKind;
  severity: RiskLevel;
  raisedOn: string;
  title: string;
  detail: string;
  status: "new" | "acknowledged" | "actioned" | "resolved";
};

export type ActionPlan = {
  id: string;
  studentId: string;
  mentorId: string;
  title: string;
  goal: string;
  createdOn: string;
  dueOn: string;
  status: "active" | "completed" | "paused";
  tasks: { id: string; label: string; due: string; owner: "student" | "mentor"; done: boolean }[];
  alertIds: string[];
};

export type MentoringSession = {
  id: string;
  studentId: string;
  mentorId: string;
  start: string;
  durationMins: number;
  mode: "Video" | "Phone" | "In person";
  agenda: string;
  status: "scheduled" | "completed" | "missed";
};

export type MentorNote = {
  id: string;
  studentId: string;
  mentorId: string;
  date: string;
  body: string;
  tags: string[];
};

export type MentorReminder = {
  id: string;
  studentId: string;
  mentorId: string;
  channel: Channel;
  message: string;
  sentOn: string;
  status: "delivered" | "read" | "failed";
};

export type Intervention = {
  id: string;
  studentId: string;
  mentorId: string;
  trigger: string;
  action: string;
  startedOn: string;
  metric: string;
  before: number;
  after: number | null;
  outcome: "improved" | "no-change" | "worsened" | "pending";
  closedOn?: string;
};

export type RecoveryPlan = {
  id: string;
  studentId: string;
  mentorId: string;
  facultyId: string;
  paper: PaperCode;
  failedSessionLabel: string;
  score: number;
  /** Session papers only; on-demand reattempts carry a date in `targetLabel`. */
  targetSessionId?: ExamSessionId;
  targetLabel: string;
  cohortId: string;
  weakAreas: string[];
  steps: { label: string; due: string; status: "done" | "current" | "upcoming" }[];
  status: "active" | "on-track" | "at-risk" | "completed";
};

export type Escalation = {
  id: string;
  studentId: string;
  kind: "academic" | "operational";
  subject: string;
  detail: string;
  raisedBy: string;
  raisedOn: string;
  toId: string;
  priority: TicketPriority;
  status: "open" | "in-progress" | "resolved";
  ticketId?: string;
};

/* ------------------------------------------------------------------------------------------
 * Communications
 * ---------------------------------------------------------------------------------------- */

export type StudentNotification = {
  id: string;
  studentId: string;
  title: string;
  body: string;
  at: string;
  kind: "class" | "exam" | "result" | "payment" | "mentor" | "doubt" | "announcement" | "career" | "exemption";
  read: boolean;
  href: string;
};

export type ChannelConfig = {
  id: Channel;
  name: string;
  provider: string;
  status: "connected" | "paused" | "not-configured";
  sender: string;
  quietHours: string;
  dailyCapPerStudent: number;
  sent30d: number;
  deliveryRate: number;
  useFor: string[];
};

export type MessageTemplate = {
  id: string;
  name: string;
  channel: Channel;
  category: "Payments" | "Exams" | "Classes" | "Mentoring" | "Exemptions" | "Careers" | "University";
  body: string;
  status: "approved" | "pending" | "rejected";
  lastUsed: string;
};

export type Doubt = {
  id: string;
  studentId: string;
  paper: PaperCode;
  cohortId: string;
  syllabusArea: string;
  topic: string;
  question: string;
  askedOn: string;
  source: "Live class" | "Lesson" | "Practice" | "AI tutor handoff" | "Mock review";
  status: "open" | "answered" | "scheduled-for-session" | "closed";
  assignedTo: string;
  answer?: string;
  answeredOn?: string;
  upvotes: number;
};

/* ------------------------------------------------------------------------------------------
 * Platform
 * ---------------------------------------------------------------------------------------- */

export type AccessLevel = "full" | "edit" | "view" | "none";

export type Capability = {
  id: string;
  label: string;
  group: string;
};

export type PlatformRole = {
  id: AccaRoleId;
  name: string;
  description: string;
  users: number;
  seatLimit?: number;
  scope: string;
};

export type PlatformUser = {
  id: string;
  name: string;
  email: string;
  role: AccaRoleId;
  title: string;
  organisation: string;
  staffId?: string;
  studentId?: string;
  status: "active" | "invited" | "suspended";
  lastActive: string;
  mfa: boolean;
  permissions: string[];
};

export type AuditLog = {
  id: string;
  at: string;
  actor: string;
  actorRole: AccaRoleId | "system";
  action: string;
  target: string;
  category: "Access" | "Users" | "Finance" | "ACCA records" | "Content" | "Configuration" | "Reports" | "Privacy";
  ip: string;
  result: "success" | "denied";
};

export type Integration = {
  id: string;
  name: string;
  category: "Video" | "Payments" | "Messaging" | "Identity" | "Storage" | "Proctoring" | "Data" | "Email";
  status: "connected" | "attention" | "not-connected";
  lastSync: string;
  detail: string;
  ownerId: string;
};

export type CertificateTemplate = {
  id: string;
  name: string;
  kind: "joint" | "paper" | "programme" | "internship" | "epsm-support";
  issuers: string[];
  universityId?: string;
  rule: string;
  signatories: string[];
  status: "active" | "draft";
  issued: number;
};

export type PaymentRule = {
  id: string;
  name: string;
  appliesTo: string;
  rule: string;
  value: string;
  status: "active" | "draft";
};

export type ExemptionRule = {
  id: string;
  qualification: string;
  body: string;
  exemptPapers: PaperCode[];
  conditions: string;
  status: "active" | "under-review";
  lastReviewed: string;
  claimsThisYear: number;
};

export type PrivacyPolicy = {
  id: string;
  title: string;
  category: "Retention" | "Consent" | "Access" | "Sharing" | "Rights" | "Security";
  setting: string;
  description: string;
  ownerId: string;
  updated: string;
  status: "enforced" | "draft";
};

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  category: "Cross-university" | "Progression" | "Careers" | "Finance" | "Support" | "Usage" | "University";
  formats: ("CSV" | "XLSX" | "PDF")[];
  authorisedRoles: AccaRoleId[];
  schedule: string;
  lastRun: string;
  containsPII: boolean;
};
