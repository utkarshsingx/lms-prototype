import type { FeePlan, Intake, Programme } from "./types";

export const programmes: Programme[] = [
  {
    id: "pr-graduate",
    name: "ACCA Graduate Pathway",
    kind: "graduate",
    market: "Open market",
    deliveredBy: "ZSkillup direct",
    learners: 214,
    papers: ["LW", "PM", "TX", "FR", "AA", "FM", "SBL", "SBR", "AFM", "APM", "ATX", "AAA"],
    durationMonths: 30,
    structure: [
      { id: "ps-g-1", label: "Exemption evaluation", papers: ["BT", "MA", "FA", "LW"], detail: "Qualification documents evaluated, exemptions estimated, then confirmed by ACCA." },
      { id: "ps-g-2", label: "Applied Skills", papers: ["PM", "TX", "FR", "AA", "FM"], detail: "One or two papers per exam session in weekend or weekday cohorts." },
      { id: "ps-g-3", label: "Ethics and Professional Skills Module", papers: [], detail: "Completed online before Strategic Professional." },
      { id: "ps-g-4", label: "Strategic Professional", papers: ["SBL", "SBR", "AFM", "APM", "ATX", "AAA"], detail: "SBR and SBL plus two options." },
    ],
    feePlanIds: ["fp-graduate", "fp-graduate-upfront"],
    intakeIds: ["in-2025-jan", "in-2026-jan", "in-2026-sep"],
    leadId: "st-priya",
    status: "active",
    description: "Open-market ACCA programme for graduates and working professionals, with flexible weekend and weekday cohorts.",
  },
  {
    id: "pr-fasttrack",
    name: "ACCA Fast Track for B.Com graduates",
    kind: "fast-track",
    market: "Open market",
    deliveredBy: "ZSkillup direct",
    learners: 58,
    papers: ["PM", "TX", "FR", "AA", "FM"],
    durationMonths: 15,
    structure: [
      { id: "ps-f-1", label: "Exemptions", papers: ["BT", "MA", "FA", "LW"], detail: "B.Com graduates typically claim the four Applied Knowledge and LW exemptions." },
      { id: "ps-f-2", label: "Applied Skills sprint", papers: ["FM", "PM", "TX", "FR", "AA"], detail: "Two papers per session, weekday intensive cohorts." },
    ],
    feePlanIds: ["fp-fasttrack"],
    intakeIds: ["in-2026-jan", "in-2026-sep"],
    leadId: "st-priya",
    status: "active",
    description: "Intensive route through Applied Skills for recent B.Com graduates, two papers per exam session.",
  },
  {
    id: "pr-strategic",
    name: "Strategic Professional Track",
    kind: "strategic",
    market: "Open market",
    deliveredBy: "ZSkillup direct",
    learners: 36,
    papers: ["SBL", "SBR", "AFM", "APM", "ATX", "AAA"],
    durationMonths: 12,
    structure: [
      { id: "ps-s-1", label: "Essentials", papers: ["SBR", "SBL"], detail: "SBR first, SBL once EPSM is complete." },
      { id: "ps-s-2", label: "Options", papers: ["AFM", "APM", "ATX", "AAA"], detail: "Choose two options." },
    ],
    feePlanIds: ["fp-strategic"],
    intakeIds: ["in-2026-jan", "in-2026-sep"],
    leadId: "st-priya",
    status: "active",
    description: "SBL, SBR and two options for learners who have completed Applied Skills.",
  },
  {
    id: "pr-bw-bcom",
    name: "B.Com (Hons) with ACCA",
    kind: "university",
    market: "University partnership",
    deliveredBy: "ZSkillup with Brightwater University",
    universityId: "u-brightwater",
    learners: 142,
    papers: ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"],
    durationMonths: 36,
    structure: [
      { id: "ps-bw-1", label: "Year 1", papers: ["BT", "MA", "FA"], detail: "Semesters 1 and 2." },
      { id: "ps-bw-2", label: "Year 2", papers: ["LW", "PM", "TX"], detail: "Semesters 3 and 4, FA exam window in Semester 3." },
      { id: "ps-bw-3", label: "Year 3", papers: ["FR", "AA", "FM"], detail: "Semesters 5 and 6." },
    ],
    feePlanIds: ["fp-bw-bcom"],
    intakeIds: ["in-2025-jul", "in-2026-jul"],
    leadId: "st-priya",
    status: "active",
    description: "Integrated ACCA route inside Brightwater's B.Com (Hons). University subjects are delivered by the university.",
  },
  {
    id: "pr-cl-bcom",
    name: "B.Com with ACCA Pathway",
    kind: "university",
    market: "University partnership",
    deliveredBy: "ZSkillup with Coastline University",
    universityId: "u-coastline",
    learners: 96,
    papers: ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"],
    durationMonths: 36,
    structure: [
      { id: "ps-cl-1", label: "Year 1", papers: ["BT", "FA"], detail: "Semesters 1 and 2." },
      { id: "ps-cl-2", label: "Year 2", papers: ["MA", "LW", "TX", "PM"], detail: "Semesters 3 and 4." },
      { id: "ps-cl-3", label: "Year 3", papers: ["FR", "AA", "FM"], detail: "Semesters 5 and 6." },
    ],
    feePlanIds: ["fp-cl-bcom"],
    intakeIds: ["in-2025-jul", "in-2026-jul"],
    leadId: "st-priya",
    status: "active",
    description: "ACCA pathway alongside Coastline's B.Com, weekday afternoon delivery on campus and online.",
  },
  {
    id: "pr-nf-bba",
    name: "BBA Finance with ACCA",
    kind: "university",
    market: "University partnership",
    deliveredBy: "ZSkillup with Northfield University",
    universityId: "u-northfield",
    learners: 64,
    papers: ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"],
    durationMonths: 36,
    structure: [
      { id: "ps-nf-1", label: "Year 1 (draft)", papers: ["BT", "FA", "MA"], detail: "Roadmap in review with Northfield." },
    ],
    feePlanIds: ["fp-nf-bba"],
    intakeIds: ["in-2026-jul"],
    leadId: "st-priya",
    status: "onboarding",
    description: "New partnership. Workspace goes live on 1 October 2026.",
  },
];

export const intakes: Intake[] = [
  { id: "in-2025-jan", label: "January 2025 intake", kind: "graduate", start: "2025-01-06", programmeIds: ["pr-graduate"], students: 61, status: "closed" },
  { id: "in-2025-jul", label: "July 2025 intake", kind: "university", start: "2025-07-15", programmeIds: ["pr-bw-bcom", "pr-cl-bcom"], students: 119, status: "active" },
  { id: "in-2026-jan", label: "January 2026 intake", kind: "graduate", start: "2026-01-12", programmeIds: ["pr-graduate", "pr-fasttrack", "pr-strategic"], students: 148, status: "active" },
  { id: "in-2026-jul", label: "July 2026 intake", kind: "university", start: "2026-07-15", programmeIds: ["pr-bw-bcom", "pr-cl-bcom", "pr-nf-bba"], students: 183, status: "active" },
  { id: "in-2026-sep", label: "September 2026 intake", kind: "graduate", start: "2026-09-07", programmeIds: ["pr-graduate", "pr-fasttrack", "pr-strategic"], students: 54, status: "enrolling" },
];

const programmeIndex = new Map(programmes.map((p) => [p.id, p]));

export function programmeById(id: string | null | undefined): Programme | undefined {
  return id ? programmeIndex.get(id) : undefined;
}

export function intakeById(id: string | null | undefined): Intake | undefined {
  return id ? intakes.find((i) => i.id === id) : undefined;
}

export function programmeForUniversity(universityId: string) {
  return programmes.find((p) => p.universityId === universityId);
}

/* Fee plans live here (not finance.ts) because students.ts needs them and finance.ts imports students. */
export const feePlans: FeePlan[] = [
  { id: "fp-graduate", name: "Graduate Pathway · 6 instalments", programmeId: "pr-graduate", instalments: 6, instalmentAmount: 24500, total: 147000, schedule: "Every two months on the 20th", lateFeeINR: 500, graceDays: 7, active: true, note: "Most graduate learners use this plan." },
  { id: "fp-graduate-upfront", name: "Graduate Pathway · paid upfront", programmeId: "pr-graduate", instalments: 1, instalmentAmount: 139650, total: 139650, schedule: "Single payment at enrolment (5% discount)", lateFeeINR: 0, graceDays: 0, active: true, note: "Discount applied on full payment within 7 days of enrolment." },
  { id: "fp-fasttrack", name: "Fast Track · 4 instalments", programmeId: "pr-fasttrack", instalments: 4, instalmentAmount: 29500, total: 118000, schedule: "Quarterly on the 10th", lateFeeINR: 500, graceDays: 7, active: true, note: "" },
  { id: "fp-strategic", name: "Strategic Professional · 5 instalments", programmeId: "pr-strategic", instalments: 5, instalmentAmount: 32000, total: 160000, schedule: "Every two months on the 15th", lateFeeINR: 750, graceDays: 7, active: true, note: "" },
  { id: "fp-bw-bcom", name: "Brightwater ACCA component · per semester", programmeId: "pr-bw-bcom", instalments: 6, instalmentAmount: 38000, total: 228000, schedule: "Each semester, 1 Aug and 15 Jan", lateFeeINR: 1000, graceDays: 15, active: true, note: "ACCA tuition component only. University tuition is billed by Brightwater." },
  { id: "fp-cl-bcom", name: "Coastline ACCA Pathway · per semester", programmeId: "pr-cl-bcom", instalments: 6, instalmentAmount: 34000, total: 204000, schedule: "Each semester, 5 Aug and 20 Jan", lateFeeINR: 1000, graceDays: 15, active: true, note: "ACCA tuition component only." },
  { id: "fp-nf-bba", name: "Northfield ACCA component · per semester", programmeId: "pr-nf-bba", instalments: 6, instalmentAmount: 36000, total: 216000, schedule: "Each semester, 1 Oct and 1 Feb", lateFeeINR: 1000, graceDays: 15, active: true, note: "First instalment due at workspace go-live." },
];

export function feePlanById(id: string | null | undefined): FeePlan | undefined {
  return id ? feePlans.find((f) => f.id === id) : undefined;
}
