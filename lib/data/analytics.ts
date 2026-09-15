/* Figures here are deterministic so screenshots, tests and demos agree. */

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** 26 weeks of per-day learner activity, weekends deliberately quieter. */
export const activityHeat = (() => {
  const rnd = seeded(20260905);
  return Array.from({ length: 26 * 7 }, (_, i) => {
    const weekend = i % 7 >= 5;
    const r = rnd();
    if (weekend) return r < 0.55 ? 0 : Math.round(r * 3);
    if (r < 0.12) return 0;
    return 1 + Math.round(r * 6);
  });
})();

export const weeklyMinutes = [186, 240, 152, 305, 268, 341, 297, 412, 388, 356, 430, 470];
export const weekLabels = ["W26", "W27", "W28", "W29", "W30", "W31", "W32", "W33", "W34", "W35", "W36", "W37"];

/* Platform-wide learner figures. 610 learners are enrolled across the
   graduate, fast track, strategic and university programmes. */
export const orgStats = {
  activeLearners: { value: 548, delta: "6.4%", spark: [462, 474, 481, 497, 503, 512, 526, 539, 548] },
  hoursThisMonth: { value: 9840, delta: "8.1%", spark: [7100, 7460, 7320, 8010, 8290, 8640, 9010, 9410, 9840] },
  completionRate: { value: 73, delta: "3.2%", spark: [63, 64, 66, 65, 68, 70, 71, 72, 73] },
  atRisk: { value: 71, delta: "9.0%", down: true, spark: [96, 92, 88, 86, 82, 79, 76, 78, 71] },
};

/** Syllabus completion by cohort. `headcount` is the cohort's headline size. */
export const completionByDept = [
  { label: "FR · Dec 2026 · Weekend", value: 78, headcount: 38 },
  { label: "PM Revision and Reattempt · Dec 2026", value: 64, headcount: 22 },
  { label: "AA · Dec 2026 · Weekday evening", value: 71, headcount: 31 },
  { label: "FM Fast Track · Dec 2026", value: 69, headcount: 24 },
  { label: "SBR · Mar 2027 · Weekend", value: 58, headcount: 18 },
  { label: "Brightwater · 2025 intake · Semester 3", value: 84, headcount: 71 },
  { label: "Brightwater · 2026 intake · Semester 1", value: 88, headcount: 71 },
  { label: "Coastline · 2025 intake · Semester 3", value: 76, headcount: 48 },
];

export const enrolmentMix = [
  { label: "Graduate Pathway", value: 214, tone: "brand" },
  { label: "Fast Track", value: 58, tone: "violet" },
  { label: "Strategic Professional", value: 36, tone: "amber" },
  { label: "University-integrated", value: 302, tone: "rose" },
];

/** December 2026 session readiness, from planned paper to ready to sit. */
export const funnel = [
  { label: "Planned for Dec 2026", value: 412 },
  { label: "Exam entered", value: 318 },
  { label: "Revision started", value: 296 },
  { label: "Mock attempted", value: 241 },
  { label: "Mock passed", value: 176 },
  { label: "Readiness 70+", value: 152 },
];

export const channelStats = {
  assistant: {
    conversations7d: 1284,
    deflectionRate: 82,
    medianFirstReplySec: 2,
    escalations: 41,
    csat: 4.6,
    topics: [
      { label: "Deadlines and exam entry", value: 318 },
      { label: "Where do I submit", value: 241 },
      { label: "Paper content questions", value: 205 },
      { label: "Exemptions and registration", value: 168 },
      { label: "Access and sign-in", value: 142 },
      { label: "Fees and payments", value: 110 },
      { label: "Other", value: 100 },
    ],
  },
  whatsapp: {
    delivered7d: 2870,
    readRate: 89,
    replyRate: 31,
    optOut: 0.8,
    reactivated: 214,
    sessionsOpened: 640,
  },
  voice: {
    calls7d: 611,
    connectRate: 56,
    avgSeconds: 143,
    resolvedWithoutHuman: 68,
    escalated: 74,
    completionLift: 21,
  },
};

export const contentHealth = [
  { course: "Performance Management (PM)", issue: "Drop-off spike at lesson 8", severity: "high", detail: "41% of learners stop during 'Limiting factors and linear programming'. Median time on the lesson is 38 seconds, so they are skipping it, not studying it." },
  { course: "Business and Technology (BT)", issue: "Mock exam too easy", severity: "medium", detail: "Mean 94% on the BT on-demand practice, with no question below 88% correct. The mock is not separating ready learners from the rest." },
  { course: "Taxation (TX-UK)", issue: "Rates and allowances out of date", severity: "medium", detail: "The reference lesson still shows Finance Act 2024 figures. December 2026 and March 2027 exams are based on the Finance Act 2025." },
  { course: "Strategic Business Reporting (SBR)", issue: "Awaiting review 9 days", severity: "low", detail: "Submitted by Marcus Bell, no reviewer assigned." },
];

export type UpcomingItem = {
  id: string;
  title: string;
  kind: "Live session" | "Mentor session" | "Graded exam" | "Assignment" | "Compliance";
  course: string;
  /** Date tile, already formatted: absolute dates so a shared link never says "tomorrow" on the wrong day. */
  day: string;
  month: string;
  time: string;
  href?: string;
  urgent?: boolean;
};

/* Anaya's next items, from Monday 14 September 2026 to the December session.
   "Compliance" is used for ACCA deadlines, such as exam entry. */
export const upcoming: UpcomingItem[] = [
  { id: "up-1", title: "Mentor session with Aisha Khan · PM reattempt plan", kind: "Mentor session", course: "Performance Management (PM)", day: "14", month: "Sep", time: "Today · 19:30 IST" },
  { id: "up-2", title: "Live class: ratio analysis and interpretation", kind: "Live session", course: "Financial Reporting (FR)", day: "19", month: "Sep", time: "Sat · 09:30 IST", href: "/learn/financial-reporting-fr", urgent: true },
  { id: "up-3", title: "Group accounts test", kind: "Graded exam", course: "Financial Reporting (FR)", day: "20", month: "Sep", time: "Due 23:59 IST", href: "/assessments/a-fr-groups" },
  { id: "up-4", title: "Written case: interpreting financial statements", kind: "Assignment", course: "Financial Reporting (FR)", day: "04", month: "Oct", time: "Due 23:59 IST", href: "/assessments/a-fr-case" },
  { id: "up-5", title: "Early entry closes · December 2026 exams", kind: "Compliance", course: "PM reattempt not yet entered", day: "05", month: "Oct", time: "Enter on myACCA" },
  { id: "up-6", title: "FR mock exam · Dec 2026", kind: "Graded exam", course: "Financial Reporting (FR)", day: "24", month: "Oct", time: "Sat · 10:00 IST", href: "/assessments/a-fr-mock" },
  { id: "up-7", title: "December 2026 exam session", kind: "Compliance", course: "FR booked · PM reattempt", day: "07", month: "Dec", time: "7 to 10 Dec · results 25 Jan 2027" },
];

/* The learner's own progress report. Weekly minutes cover the last eight
   weeks, so the final four sum to the 30-day total shown beside them. */
export const learnerReport = {
  minutes30d: 2340,
  minutesPrev30d: 1875,
  weeklyMinutes: [420, 465, 510, 480, 540, 600, 570, 630],
  weekLabels: ["20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"],
  sessions: { attended: 7, scheduled: 8, hours: 18 },
  assessments: { passed: 7, taken: 8, averageScore: 68 },
};

export type CourseReport = {
  courseId: string;
  minutesSpent: number;
  sessions: { attended: number; scheduled: number };
  /** Course completion at the end of each of the last eight weeks. */
  completionByWeek: number[];
  /** Proficiency by syllabus area, from quiz and workspace results. Null until assessed. */
  skills: { name: string; score: number | null }[];
};

export const courseReports: CourseReport[] = [
  {
    courseId: "c-fr",
    minutesSpent: 1860,
    sessions: { attended: 5, scheduled: 6 },
    completionByWeek: [18, 24, 31, 38, 44, 50, 57, 62],
    skills: [
      { name: "A · Conceptual and regulatory framework", score: 78 },
      { name: "B · Accounting for transactions", score: 66 },
      { name: "D · Preparation of financial statements", score: 58 },
      { name: "C · Analysing and interpreting", score: null },
    ],
  },
  {
    courseId: "c-cbe",
    minutesSpent: 260,
    sessions: { attended: 0, scheduled: 1 },
    completionByWeek: [0, 0, 0, 12, 20, 28, 38, 45],
    skills: [
      { name: "CBE mechanics", score: 90 },
      { name: "Time allocation", score: 61 },
      { name: "Answer planning", score: null },
    ],
  },
  {
    courseId: "c-pm",
    minutesSpent: 940,
    sessions: { attended: 2, scheduled: 2 },
    completionByWeek: [0, 0, 4, 10, 16, 22, 28, 34],
    skills: [
      { name: "A · Specialist cost and management accounting techniques", score: 62 },
      { name: "B · Decision-making techniques", score: 48 },
      { name: "C · Budgeting and control", score: 55 },
      { name: "D · Performance measurement and control", score: null },
    ],
  },
  {
    courseId: "c-tx",
    minutesSpent: 2400,
    sessions: { attended: 6, scheduled: 6 },
    completionByWeek: [100, 100, 100, 100, 100, 100, 100, 100],
    skills: [
      { name: "B · Income tax and NIC liabilities", score: 64 },
      { name: "C · Chargeable gains for individuals", score: 57 },
      { name: "E · Corporation tax liabilities", score: 61 },
      { name: "G · Value added tax", score: 52 },
    ],
  },
];
