import type { LearningPath } from "./types";

export const paths: LearningPath[] = [
  {
    id: "p-backend",
    slug: "backend-engineer-l3-to-l4",
    title: "Backend Engineer, L3 → L4",
    purpose:
      "The promotion path. Everything the L4 rubric expects an engineer to have demonstrated, sequenced so each course builds on the last.",
    audience: "Backend engineers with 2+ years at level",
    kind: "Role",
    accent: "brand",
    owner: "u-marcus",
    enrolled: 148,
    completionRate: 61,
    weeks: 14,
    steps: [
      { courseId: "c-kube", required: true, weeks: 2 },
      {
        courseId: "c-dist",
        required: true,
        weeks: 6,
        gate: "Pass the consensus lab before continuing",
      },
      { courseId: "c-cloud", required: false, weeks: 2 },
      { courseId: "c-sec", required: true, weeks: 1 },
      {
        courseId: "c-comms",
        required: true,
        weeks: 3,
        gate: "Submit an RFC reviewed by a staff engineer",
      },
    ],
    outcomes: [
      "Design and defend a system that spans more than one service",
      "Operate what you build, including on-call",
      "Write the documents that carry a decision across teams",
    ],
  },
  {
    id: "p-ai",
    slug: "applied-ai-practitioner",
    title: "Applied AI Practitioner",
    purpose:
      "For engineers moving onto an AI-facing team. Ends with a graded, shipped assistant rather than a certificate.",
    audience: "Engineers joining an AI product team",
    kind: "Skill",
    accent: "violet",
    owner: "u-tomas",
    enrolled: 92,
    completionRate: 44,
    weeks: 10,
    steps: [
      { courseId: "c-data", required: true, weeks: 3 },
      {
        courseId: "c-llm",
        required: true,
        weeks: 5,
        gate: "Eval suite must gate on a golden set of 50+",
      },
      { courseId: "c-sec", required: true, weeks: 1 },
      { courseId: "c-comms", required: false, weeks: 1 },
    ],
    outcomes: [
      "Ship an LLM feature with an eval suite in CI",
      "Model and query the data behind it",
      "Explain the cost envelope to a finance partner",
    ],
  },
  {
    id: "p-onboarding",
    slug: "new-joiner-onboarding",
    title: "New Joiner Onboarding",
    purpose:
      "Auto-assigned on the first day. Compliance items are gated by date, everything else is self-paced.",
    audience: "Every new employee",
    kind: "Onboarding",
    accent: "jade",
    owner: "u-priya",
    enrolled: 780,
    completionRate: 88,
    weeks: 4,
    steps: [
      { courseId: "c-onboard", required: true, weeks: 1 },
      {
        courseId: "c-sec",
        required: true,
        weeks: 1,
        gate: "Must complete within 14 days of start date",
      },
      {
        courseId: "c-privacy",
        required: true,
        weeks: 1,
        gate: "Must complete within 30 days of start date",
      },
      { courseId: "c-comms", required: false, weeks: 1 },
    ],
    outcomes: [
      "Fully provisioned and compliant within thirty days",
      "Shipped one small change in the first month",
    ],
  },
  {
    id: "p-manager",
    slug: "new-manager-transition",
    title: "New Manager Transition",
    purpose:
      "Assigned at promotion. Pairs coursework with a live clinic every fortnight, so practice happens with peers rather than on a direct report.",
    audience: "Newly promoted managers",
    kind: "Role",
    accent: "ember",
    owner: "u-priya",
    enrolled: 41,
    completionRate: 72,
    weeks: 12,
    steps: [
      { courseId: "c-lead", required: true, weeks: 6 },
      { courseId: "c-comms", required: true, weeks: 3 },
      {
        courseId: "c-privacy",
        required: true,
        weeks: 1,
        gate: "Managers handle personnel data",
      },
    ],
    outcomes: [
      "Running effective one-to-ones within the first month",
      "A written growth plan for every direct report",
    ],
  },
  {
    id: "p-compliance",
    slug: "annual-compliance-2026",
    title: "Annual Compliance 2026",
    purpose:
      "Everything the whole company has to complete this year. Auto-assigned, auto-escalated, and reported to the board quarterly.",
    audience: "All employees",
    kind: "Compliance",
    accent: "rose",
    owner: "u-priya",
    enrolled: 6120,
    completionRate: 79,
    weeks: 6,
    steps: [
      {
        courseId: "c-sec",
        required: true,
        weeks: 2,
        gate: "Hard deadline: 31 October 2026",
      },
      {
        courseId: "c-privacy",
        required: true,
        weeks: 2,
        gate: "Hard deadline: 31 October 2026",
      },
      { courseId: "c-a11y", required: false, weeks: 2 },
    ],
    outcomes: ["Audit-ready evidence for every employee record"],
  },
  {
    id: "p-design",
    slug: "design-systems-track",
    title: "Design Systems Track",
    purpose:
      "For designers and front-end engineers who share ownership of the system. Deliberately mixed-discipline.",
    audience: "Designers and front-end engineers",
    kind: "Skill",
    accent: "amber",
    owner: "u-hana",
    enrolled: 57,
    completionRate: 53,
    weeks: 8,
    steps: [
      { courseId: "c-design", required: true, weeks: 5 },
      {
        courseId: "c-a11y",
        required: true,
        weeks: 2,
        gate: "Accessibility audit submitted",
      },
      { courseId: "c-comms", required: false, weeks: 1 },
    ],
    outcomes: [
      "A token architecture documented and adopted",
      "An accessibility baseline enforced in the component library",
    ],
  },
];

export const pathBySlug = (slug: string) => paths.find((p) => p.slug === slug);
