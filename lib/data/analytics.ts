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
export const weekLabels = ["W22", "W23", "W24", "W25", "W26", "W27", "W28", "W29", "W30", "W31", "W32", "W33"];

export const orgStats = {
  activeLearners: { value: 4218, delta: "12.4%", spark: [3410, 3520, 3488, 3690, 3742, 3880, 3960, 4102, 4218] },
  hoursThisMonth: { value: 9840, delta: "8.1%", spark: [7100, 7460, 7320, 8010, 8290, 8640, 9010, 9410, 9840] },
  completionRate: { value: 73, delta: "3.2%", spark: [63, 64, 66, 65, 68, 70, 71, 72, 73] },
  atRisk: { value: 186, delta: "9.0%", down: true, spark: [268, 254, 241, 236, 220, 214, 201, 194, 186] },
};

export const completionByDept = [
  { label: "Engineering", value: 78, headcount: 1420 },
  { label: "Data", value: 71, headcount: 310 },
  { label: "Design", value: 84, headcount: 190 },
  { label: "Product", value: 69, headcount: 240 },
  { label: "Revenue", value: 58, headcount: 880 },
  { label: "People", value: 92, headcount: 120 },
  { label: "Legal", value: 88, headcount: 60 },
];

export const enrolmentMix = [
  { label: "Self-enrolled", value: 2140, tone: "brand" },
  { label: "Path-assigned", value: 3480, tone: "violet" },
  { label: "Manager-assigned", value: 910, tone: "amber" },
  { label: "Compliance auto", value: 6120, tone: "rose" },
];

export const funnel = [
  { label: "Assigned", value: 6120 },
  { label: "Opened", value: 5488 },
  { label: "Started", value: 4972 },
  { label: "Halfway", value: 3910 },
  { label: "Completed", value: 4470 },
  { label: "Certified", value: 4110 },
];

export const channelStats = {
  assistant: {
    conversations7d: 1284,
    deflectionRate: 82,
    medianFirstReplySec: 2,
    escalations: 41,
    csat: 4.6,
    topics: [
      { label: "Deadlines and due dates", value: 318 },
      { label: "Where do I submit", value: 241 },
      { label: "Course content questions", value: 205 },
      { label: "Certificates", value: 168 },
      { label: "Access and login", value: 142 },
      { label: "Path and progression", value: 110 },
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
  { course: "Data Privacy and GDPR", issue: "Drop-off spike at lesson 4", severity: "high", detail: "41% of learners abandon during 'Cross-border transfer'. Median dwell 38s — they are bouncing, not reading." },
  { course: "Analytics Engineering With SQL", issue: "Assessment too easy", severity: "medium", detail: "Mean 94%, no question below 88% correct. The quiz is not discriminating." },
  { course: "Cloud Cost Engineering", issue: "Stale content", severity: "medium", detail: "Last updated 18 April. Three linked pricing pages now 404." },
  { course: "Kubernetes for Application Teams", issue: "Awaiting review 9 days", severity: "low", detail: "Submitted by Marcus Bell, no reviewer assigned." },
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

export const upcoming: UpcomingItem[] = [
  { id: "up-1", title: "Incident walkthrough", kind: "Live session", course: "Distributed Systems in Practice", day: "12", month: "Sep", time: "Sat · 16:00 IST", href: "/learn/distributed-systems-in-practice", urgent: true },
  { id: "up-2", title: "Consensus and replication", kind: "Graded exam", course: "Distributed Systems in Practice", day: "14", month: "Sep", time: "Due 23:59 IST", href: "/assessments/a-dist-consensus" },
  { id: "up-3", title: "Design review with Marcus Bell", kind: "Mentor session", course: "Distributed Systems in Practice", day: "15", month: "Sep", time: "Tue · 17:30 IST" },
  { id: "up-4", title: "Evaluation report", kind: "Assignment", course: "Building With Large Language Models", day: "19", month: "Sep", time: "Due 23:59 IST", href: "/assessments/a-llm-eval" },
  { id: "up-5", title: "Privacy certification 2026", kind: "Compliance", course: "Data Privacy and GDPR", day: "31", month: "Oct", time: "Due 23:59 IST", href: "/assessments/a-privacy-final" },
];

/* The learner's own progress report (/progress). Weekly minutes cover the last
   eight weeks, so the final four sum to the 30-day total shown beside them. */
export const learnerReport = {
  minutes30d: 860,
  minutesPrev30d: 680,
  weeklyMinutes: [120, 165, 150, 175, 205, 230, 190, 235],
  weekLabels: ["20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"],
  sessions: { attended: 7, scheduled: 9, hours: 11 },
  assessments: { passed: 7, taken: 8, averageScore: 88 },
};

export type CourseReport = {
  courseId: string;
  minutesSpent: number;
  sessions: { attended: number; scheduled: number };
  /** Course completion at the end of each of the last eight weeks. */
  completionByWeek: number[];
  /** Proficiency by skill, from quiz and lab results. Null until assessed. */
  skills: { name: string; score: number | null }[];
};

export const courseReports: CourseReport[] = [
  {
    courseId: "c-dist",
    minutesSpent: 640,
    sessions: { attended: 3, scheduled: 4 },
    completionByWeek: [8, 15, 22, 30, 38, 47, 55, 62],
    skills: [
      { name: "Failure models", score: 86 },
      { name: "Clocks and ordering", score: 78 },
      { name: "Consensus (Raft)", score: 64 },
      { name: "Consistency models", score: null },
      { name: "Operations", score: null },
    ],
  },
  {
    courseId: "c-privacy",
    minutesSpent: 85,
    sessions: { attended: 0, scheduled: 0 },
    completionByWeek: [0, 0, 0, 10, 18, 27, 36, 45],
    skills: [
      { name: "Lawful basis", score: 92 },
      { name: "Data subject rights", score: 70 },
      { name: "Breach response", score: null },
    ],
  },
  {
    courseId: "c-llm",
    minutesSpent: 310,
    sessions: { attended: 2, scheduled: 3 },
    completionByWeek: [0, 4, 9, 14, 20, 24, 30, 34],
    skills: [
      { name: "Model behaviour", score: 81 },
      { name: "Retrieval design", score: 94 },
      { name: "Evaluation", score: 38 },
      { name: "Agent safety", score: null },
    ],
  },
  {
    courseId: "c-design",
    minutesSpent: 70,
    sessions: { attended: 0, scheduled: 1 },
    completionByWeek: [0, 0, 0, 0, 0, 4, 8, 12],
    skills: [
      { name: "Diagnosing drift", score: 55 },
      { name: "Token architecture", score: null },
      { name: "Component APIs", score: null },
    ],
  },
];
