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

export const upcoming = [
  { id: "up-1", title: "Consensus and replication", kind: "Graded exam", course: "Distributed Systems in Practice", when: "Due in 9 days", urgent: false },
  { id: "up-2", title: "Incident walkthrough", kind: "Live session", course: "Distributed Systems in Practice", when: "Tomorrow, 16:00 IST", urgent: true },
  { id: "up-3", title: "Evaluation report", kind: "Assignment", course: "Building With Large Language Models", when: "Due in 14 days", urgent: false },
  { id: "up-4", title: "Privacy certification 2026", kind: "Compliance", course: "Data Privacy and GDPR", when: "Due 31 Oct", urgent: false },
];
