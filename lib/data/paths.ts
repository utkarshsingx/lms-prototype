import type { LearningPath } from "./types";

/* ACCA journeys. A step's `gate` is the condition shown before moving on. */
export const paths: LearningPath[] = [
  {
    id: "p-applied-knowledge",
    slug: "applied-knowledge",
    title: "Applied Knowledge",
    purpose:
      "The three introductory papers. Each is an on-demand CBE, so you can sit them one at a time and book a date as soon as your readiness score says you are ready.",
    audience: "New ACCA students without exemptions",
    kind: "Qualification",
    accent: "jade",
    owner: "u-vikram",
    enrolled: 284,
    completionRate: 71,
    weeks: 26,
    steps: [
      { courseId: "c-bt", required: true, weeks: 8 },
      { courseId: "c-ma", required: true, weeks: 9 },
      {
        courseId: "c-fa",
        required: true,
        weeks: 9,
        gate: "Score 50% or more on the FA mock exam before booking",
      },
    ],
    outcomes: [
      "BT, MA and FA passed or exempt",
      "Comfortable with the on-demand CBE format before Applied Skills",
    ],
  },
  {
    id: "p-applied-skills",
    slug: "applied-skills",
    title: "Applied Skills",
    purpose:
      "Six papers that build the technical core: law, performance management, tax, financial reporting, audit and financial management. LW is on-demand; the other five are session CBEs in March, June, September and December.",
    audience: "Students who have passed or are exempt from Applied Knowledge",
    kind: "Qualification",
    accent: "brand",
    owner: "u-priya",
    enrolled: 264,
    completionRate: 48,
    weeks: 78,
    steps: [
      { courseId: "c-lw", required: true, weeks: 8 },
      {
        courseId: "c-pm",
        required: true,
        weeks: 14,
        gate: "Enter for the session before the standard entry deadline",
      },
      { courseId: "c-tx", required: true, weeks: 14 },
      {
        courseId: "c-fr",
        required: true,
        weeks: 14,
        gate: "Sit the FR mock exam before the session",
      },
      { courseId: "c-aa", required: true, weeks: 14 },
      { courseId: "c-fm", required: true, weeks: 14 },
    ],
    outcomes: [
      "All six Applied Skills papers passed or exempt",
      "Ready for SBR and the Strategic Professional options",
    ],
  },
  {
    id: "p-strategic",
    slug: "strategic-professional",
    title: "Strategic Professional",
    purpose:
      "Two Essentials papers, SBR and SBL, plus two Options chosen from AFM, APM, ATX and AAA. SBL works best as one of your last exams.",
    audience: "Students who have completed Applied Skills",
    kind: "Qualification",
    accent: "violet",
    owner: "u-marcus",
    enrolled: 36,
    completionRate: 22,
    weeks: 62,
    steps: [
      {
        courseId: "c-sbr",
        required: true,
        weeks: 16,
        gate: "FR passed or exempt",
      },
      {
        courseId: "c-afm",
        required: false,
        weeks: 14,
        gate: "Option: choose two of AFM, APM, ATX and AAA",
      },
      { courseId: "c-apm", required: false, weeks: 14 },
      { courseId: "c-atx", required: false, weeks: 14 },
      { courseId: "c-aaa", required: false, weeks: 14 },
      {
        courseId: "c-sbl",
        required: true,
        weeks: 18,
        gate: "Recommended as one of your last exams",
      },
    ],
    outcomes: [
      "SBR, SBL and two Options passed",
      "All 13 exams complete, ready for membership once EPSM and PER are done",
    ],
  },
  {
    id: "p-dec-2026",
    slug: "december-2026-exam-sitting",
    title: "December 2026 exam sitting",
    purpose:
      "Everything between now and the December session: finish the syllabus, sit a timed mock, and enter before the deadline. Exams run 7 to 10 December 2026 and results are released on 25 January 2027.",
    audience: "Learners sitting FR, PM, AA or FM in December 2026",
    kind: "Exam prep",
    accent: "amber",
    owner: "u-priya",
    enrolled: 115,
    completionRate: 34,
    weeks: 12,
    steps: [
      {
        courseId: "c-cbe",
        required: true,
        weeks: 2,
        gate: "Early entry closes 5 October 2026",
      },
      {
        courseId: "c-fr",
        required: false,
        weeks: 10,
        gate: "Standard entry closes 2 November 2026",
      },
      {
        courseId: "c-pm",
        required: false,
        weeks: 10,
        gate: "Reattempt: sit the PM mock exam by 29 November",
      },
      {
        courseId: "c-aa",
        required: false,
        weeks: 10,
        gate: "Late entry closes 16 November 2026",
      },
      { courseId: "c-fm", required: false, weeks: 10 },
    ],
    outcomes: [
      "Entered for December before the early or standard deadline",
      "A timed mock exam sat and reviewed for every paper",
      "A readiness score of 70 or more before exam week",
    ],
  },
  {
    id: "p-onboarding",
    slug: "new-student-onboarding",
    title: "New student onboarding",
    purpose:
      "Assigned when you join. Add your ACCA student ID, upload your qualification documents for exemption evaluation, learn how CBEs work, and choose a batch.",
    audience: "Every new ZSkillup ACCA student",
    kind: "Onboarding",
    accent: "jade",
    owner: "u-imran",
    enrolled: 58,
    completionRate: 82,
    weeks: 4,
    steps: [
      {
        courseId: "c-cbe",
        required: true,
        weeks: 1,
        gate: "Add your ACCA student ID within 14 days of joining",
      },
      {
        courseId: "c-epsm",
        required: false,
        weeks: 2,
        gate: "Upload qualification documents within 30 days for exemption evaluation",
      },
      { courseId: "c-bt", required: false, weeks: 1 },
    ],
    outcomes: [
      "ACCA registration confirmed and student ID on record",
      "Exemptions estimated and a first paper chosen",
      "A weekend or weekday batch selected",
    ],
  },
  {
    id: "p-fast-track",
    slug: "fast-track-for-bcom-graduates",
    title: "Fast track",
    purpose:
      "For B.Com graduates. Exemptions depend on your degree and subjects, and often cover BT, MA, FA and LW, so you start at Applied Skills and sit two papers a session. The programme team estimates exemptions first; ACCA confirms them.",
    audience: "B.Com graduates with likely exemptions",
    kind: "Qualification",
    accent: "rose",
    owner: "u-priya",
    enrolled: 58,
    completionRate: 39,
    weeks: 40,
    steps: [
      {
        courseId: "c-fr",
        required: true,
        weeks: 8,
        gate: "Exemptions confirmed by ACCA and exemption fees paid",
      },
      { courseId: "c-pm", required: true, weeks: 8 },
      { courseId: "c-fm", required: true, weeks: 8 },
      { courseId: "c-aa", required: true, weeks: 8 },
      { courseId: "c-tx", required: true, weeks: 8 },
    ],
    outcomes: [
      "Applied Skills complete in three exam sessions",
      "Exemptions confirmed on your ACCA record before your first session",
    ],
  },
  {
    id: "p-requirements",
    slug: "ethics-and-experience-requirements",
    title: "Ethics and experience requirements",
    purpose:
      "The two requirements that sit alongside the exams: the Ethics and Professional Skills Module, and 36 months of relevant practical experience with 9 performance objectives (all 5 essential and 4 technical).",
    audience: "All ACCA students",
    kind: "Requirement",
    accent: "ember",
    owner: "u-aisha",
    enrolled: 412,
    completionRate: 57,
    weeks: 6,
    steps: [
      {
        courseId: "c-epsm",
        required: true,
        weeks: 6,
        gate: "PER: 36 months of experience and 9 performance objectives signed off by your supervisor",
      },
    ],
    outcomes: [
      "EPSM complete",
      "36 months of relevant experience recorded and 9 performance objectives signed off",
    ],
  },
];

export const pathBySlug = (slug: string) => paths.find((p) => p.slug === slug);
