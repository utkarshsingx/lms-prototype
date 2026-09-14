import { ACCA_TODAY } from "./types";
import type {
  AccaPaper,
  EntryWindow,
  ExamSession,
  ExamSessionId,
  PaperCode,
  PaperLevel,
  PerObjective,
} from "./types";

export const PAPER_LEVEL_LABELS: Record<PaperLevel, string> = {
  "applied-knowledge": "Applied Knowledge",
  "applied-skills": "Applied Skills",
  "strategic-professional": "Strategic Professional",
};

const APPLIED_SKILLS_STRUCTURE =
  "Section A 15 objective test questions (30 marks) · Section B 3 objective test cases (30 marks) · Section C 2 constructed-response questions (40 marks)";

export const accaPapers: AccaPaper[] = [
  {
    code: "BT",
    name: "Business and Technology",
    level: "applied-knowledge",
    levelLabel: "Applied Knowledge",
    group: "Applied Knowledge",
    examFormat: "on-demand",
    durationMins: 120,
    durationLabel: "2h",
    passMark: 50,
    courseId: "c-bt",
    courseSlug: "business-and-technology-bt",
    leadFacultyId: "st-vikram",
    order: 1,
    examStructure:
      "On-demand CBE · Section A objective test questions · Section B six multi-task questions · 100 marks",
    syllabusAreas: [
      { code: "A", title: "Business organisation, stakeholders and environment" },
      { code: "B", title: "Organisational structure, governance and management" },
      { code: "C", title: "Business functions, regulation and technology" },
      { code: "D", title: "Leadership and management" },
      { code: "E", title: "Personal effectiveness and communication" },
      { code: "F", title: "Professional ethics" },
    ],
  },
  {
    code: "MA",
    name: "Management Accounting",
    level: "applied-knowledge",
    levelLabel: "Applied Knowledge",
    group: "Applied Knowledge",
    examFormat: "on-demand",
    durationMins: 120,
    durationLabel: "2h",
    passMark: 50,
    courseId: "c-ma",
    courseSlug: "management-accounting-ma",
    leadFacultyId: "st-tomas",
    order: 2,
    examStructure:
      "On-demand CBE · Section A 35 objective test questions (70 marks) · Section B 3 multi-task questions (30 marks)",
    syllabusAreas: [
      { code: "A", title: "Nature, source and purpose of management information" },
      { code: "B", title: "Data analysis and statistical techniques" },
      { code: "C", title: "Cost accounting techniques" },
      { code: "D", title: "Budgeting" },
      { code: "E", title: "Standard costing" },
      { code: "F", title: "Performance measurement" },
    ],
  },
  {
    code: "FA",
    name: "Financial Accounting",
    level: "applied-knowledge",
    levelLabel: "Applied Knowledge",
    group: "Applied Knowledge",
    examFormat: "on-demand",
    durationMins: 120,
    durationLabel: "2h",
    passMark: 50,
    courseId: "c-fa",
    courseSlug: "financial-accounting-fa",
    leadFacultyId: "st-grace",
    order: 3,
    examStructure:
      "On-demand CBE · Section A 35 objective test questions (70 marks) · Section B 2 multi-task questions (30 marks)",
    syllabusAreas: [
      { code: "A", title: "Context and purpose of financial reporting" },
      { code: "B", title: "Qualitative characteristics" },
      { code: "C", title: "Double entry and accounting systems" },
      { code: "D", title: "Recording transactions and events" },
      { code: "E", title: "Preparing a trial balance" },
      { code: "F", title: "Preparing basic financial statements" },
      { code: "G", title: "Simple consolidated financial statements" },
      { code: "H", title: "Interpretation of financial statements" },
    ],
  },
  {
    code: "LW",
    name: "Corporate and Business Law",
    level: "applied-skills",
    levelLabel: "Applied Skills",
    group: "Applied Skills",
    examFormat: "on-demand",
    durationMins: 120,
    durationLabel: "2h",
    passMark: 50,
    courseId: "c-lw",
    courseSlug: "corporate-and-business-law-lw",
    leadFacultyId: "st-vikram",
    order: 4,
    examStructure:
      "On-demand CBE · Section A objective test questions (70 marks) · Section B 5 multi-task questions (30 marks)",
    syllabusAreas: [
      { code: "A", title: "Essential elements of the legal system" },
      { code: "B", title: "The law of obligations" },
      { code: "C", title: "Employment law" },
      { code: "D", title: "Formation and constitution of business organisations" },
      { code: "E", title: "Capital and financing of companies" },
      { code: "F", title: "Management, administration and regulation of companies" },
      { code: "G", title: "Insolvency law" },
      { code: "H", title: "Corporate fraudulent and criminal behaviour" },
    ],
  },
  {
    code: "PM",
    name: "Performance Management",
    level: "applied-skills",
    levelLabel: "Applied Skills",
    group: "Applied Skills",
    examFormat: "session",
    durationMins: 180,
    durationLabel: "3h",
    passMark: 50,
    courseId: "c-pm",
    courseSlug: "performance-management-pm",
    leadFacultyId: "st-farah",
    order: 5,
    examStructure: `Session CBE · ${APPLIED_SKILLS_STRUCTURE}`,
    syllabusAreas: [
      { code: "A", title: "Specialist cost and management accounting techniques" },
      { code: "B", title: "Decision-making techniques" },
      { code: "C", title: "Budgeting and control" },
      { code: "D", title: "Performance measurement and control" },
    ],
  },
  {
    code: "TX",
    name: "Taxation (TX-UK)",
    level: "applied-skills",
    levelLabel: "Applied Skills",
    group: "Applied Skills",
    examFormat: "session",
    durationMins: 180,
    durationLabel: "3h",
    passMark: 50,
    courseId: "c-tx",
    courseSlug: "taxation-tx-uk",
    leadFacultyId: "st-grace",
    order: 6,
    examStructure:
      "Session CBE · Section A 15 objective test questions (30 marks) · Section B 3 objective test cases (30 marks) · Section C one 10-mark and two 15-mark constructed-response questions (40 marks)",
    syllabusAreas: [
      { code: "A", title: "UK tax system and its administration" },
      { code: "B", title: "Income tax and NIC liabilities" },
      { code: "C", title: "Chargeable gains for individuals" },
      { code: "D", title: "Inheritance tax" },
      { code: "E", title: "Corporation tax liabilities" },
      { code: "F", title: "Chargeable gains for companies" },
      { code: "G", title: "Value added tax" },
    ],
  },
  {
    code: "FR",
    name: "Financial Reporting",
    level: "applied-skills",
    levelLabel: "Applied Skills",
    group: "Applied Skills",
    examFormat: "session",
    durationMins: 180,
    durationLabel: "3h",
    passMark: 50,
    courseId: "c-fr",
    courseSlug: "financial-reporting-fr",
    leadFacultyId: "st-marcus",
    order: 7,
    examStructure: `Session CBE · ${APPLIED_SKILLS_STRUCTURE}`,
    syllabusAreas: [
      { code: "A", title: "Conceptual and regulatory framework" },
      { code: "B", title: "Accounting for transactions in financial statements" },
      { code: "C", title: "Analysing and interpreting financial statements" },
      { code: "D", title: "Preparation of financial statements" },
    ],
  },
  {
    code: "AA",
    name: "Audit and Assurance",
    level: "applied-skills",
    levelLabel: "Applied Skills",
    group: "Applied Skills",
    examFormat: "session",
    durationMins: 180,
    durationLabel: "3h",
    passMark: 50,
    courseId: "c-aa",
    courseSlug: "audit-and-assurance-aa",
    leadFacultyId: "st-hana",
    order: 8,
    examStructure: `Session CBE · ${APPLIED_SKILLS_STRUCTURE}`,
    syllabusAreas: [
      { code: "A", title: "Audit framework and regulation" },
      { code: "B", title: "Planning and risk assessment" },
      { code: "C", title: "Internal control" },
      { code: "D", title: "Audit evidence" },
      { code: "E", title: "Review and reporting" },
    ],
  },
  {
    code: "FM",
    name: "Financial Management",
    level: "applied-skills",
    levelLabel: "Applied Skills",
    group: "Applied Skills",
    examFormat: "session",
    durationMins: 180,
    durationLabel: "3h",
    passMark: 50,
    courseId: "c-fm",
    courseSlug: "financial-management-fm",
    leadFacultyId: "st-tomas",
    order: 9,
    examStructure: `Session CBE · ${APPLIED_SKILLS_STRUCTURE}`,
    syllabusAreas: [
      { code: "A", title: "Financial management function" },
      { code: "B", title: "Financial management environment" },
      { code: "C", title: "Working capital management" },
      { code: "D", title: "Investment appraisal" },
      { code: "E", title: "Business finance" },
      { code: "F", title: "Business valuations" },
      { code: "G", title: "Risk management" },
    ],
  },
  {
    code: "SBL",
    name: "Strategic Business Leader",
    level: "strategic-professional",
    levelLabel: "Strategic Professional",
    group: "Essentials",
    examFormat: "session",
    durationMins: 240,
    durationLabel: "4h",
    passMark: 50,
    courseId: "c-sbl",
    courseSlug: "strategic-business-leader-sbl",
    leadFacultyId: "st-hana",
    order: 10,
    examStructure:
      "Session CBE · integrated case study · 100 marks (80 technical marks, 20 professional skills marks)",
    syllabusAreas: [
      { code: "A", title: "Leadership" },
      { code: "B", title: "Governance" },
      { code: "C", title: "Strategy" },
      { code: "D", title: "Risk" },
      { code: "E", title: "Technology and data analytics" },
      { code: "F", title: "Organisational control and audit" },
      { code: "G", title: "Finance in planning and decision-making" },
      { code: "H", title: "Innovation, performance excellence and change management" },
    ],
  },
  {
    code: "SBR",
    name: "Strategic Business Reporting",
    level: "strategic-professional",
    levelLabel: "Strategic Professional",
    group: "Essentials",
    examFormat: "session",
    durationMins: 195,
    durationLabel: "3h 15m",
    passMark: 50,
    courseId: "c-sbr",
    courseSlug: "strategic-business-reporting-sbr",
    leadFacultyId: "st-marcus",
    order: 11,
    examStructure:
      "Session CBE · Section A two questions (50 marks) · Section B two questions (50 marks), including professional marks",
    syllabusAreas: [
      { code: "A", title: "Fundamental ethical and professional principles" },
      { code: "B", title: "Financial reporting framework" },
      { code: "C", title: "Reporting the financial performance of a range of entities" },
      { code: "D", title: "Financial statements of groups of entities" },
      { code: "E", title: "Interpret financial statements for different stakeholders" },
      { code: "F", title: "Impact of changes and potential changes in accounting regulation" },
    ],
  },
  {
    code: "AFM",
    name: "Advanced Financial Management",
    level: "strategic-professional",
    levelLabel: "Strategic Professional",
    group: "Options",
    option: true,
    examFormat: "session",
    durationMins: 195,
    durationLabel: "3h 15m",
    passMark: 50,
    courseId: "c-afm",
    courseSlug: "advanced-financial-management-afm",
    leadFacultyId: "st-tomas",
    order: 12,
    examStructure: "Session CBE · Section A one 50-mark question · Section B two 25-mark questions",
    syllabusAreas: [
      { code: "A", title: "Role of the senior financial adviser in the multinational organisation" },
      { code: "B", title: "Advanced investment appraisal" },
      { code: "C", title: "Acquisitions and mergers" },
      { code: "D", title: "Corporate reconstruction and reorganisation" },
      { code: "E", title: "Treasury and advanced risk management techniques" },
    ],
  },
  {
    code: "APM",
    name: "Advanced Performance Management",
    level: "strategic-professional",
    levelLabel: "Strategic Professional",
    group: "Options",
    option: true,
    examFormat: "session",
    durationMins: 195,
    durationLabel: "3h 15m",
    passMark: 50,
    courseId: "c-apm",
    courseSlug: "advanced-performance-management-apm",
    leadFacultyId: "st-farah",
    order: 13,
    examStructure: "Session CBE · Section A one 50-mark question · Section B two 25-mark questions",
    syllabusAreas: [
      { code: "A", title: "Strategic planning and control" },
      { code: "B", title: "Performance management information systems and developments in technology" },
      { code: "C", title: "Strategic performance measurement" },
      { code: "D", title: "Performance evaluation and corporate failure" },
    ],
  },
  {
    code: "ATX",
    name: "Advanced Taxation (ATX-UK)",
    level: "strategic-professional",
    levelLabel: "Strategic Professional",
    group: "Options",
    option: true,
    examFormat: "session",
    durationMins: 195,
    durationLabel: "3h 15m",
    passMark: 50,
    courseId: "c-atx",
    courseSlug: "advanced-taxation-atx",
    leadFacultyId: "st-grace",
    order: 14,
    examStructure: "Session CBE · Section A two questions (60 marks) · Section B two 20-mark questions (40 marks)",
    syllabusAreas: [
      { code: "A", title: "Knowledge and understanding of the UK tax system through advanced topics and stamp taxes" },
      { code: "B", title: "The impact of relevant taxes on various situations and courses of action" },
      { code: "C", title: "Minimising and deferring tax liabilities by the use of standard tax planning measures" },
      { code: "D", title: "Communicating with clients, HM Revenue and Customs and other professionals" },
    ],
  },
  {
    code: "AAA",
    name: "Advanced Audit and Assurance",
    level: "strategic-professional",
    levelLabel: "Strategic Professional",
    group: "Options",
    option: true,
    examFormat: "session",
    durationMins: 195,
    durationLabel: "3h 15m",
    passMark: 50,
    courseId: "c-aaa",
    courseSlug: "advanced-audit-and-assurance-aaa",
    leadFacultyId: "st-hana",
    order: 15,
    examStructure: "Session CBE · Section A one 50-mark question · Section B two 25-mark questions",
    syllabusAreas: [
      { code: "A", title: "Regulatory environment" },
      { code: "B", title: "Professional and ethical considerations" },
      { code: "C", title: "Quality management and practice management" },
      { code: "D", title: "Planning and conducting an audit of historical financial information" },
      { code: "E", title: "Completion, review and reporting" },
      { code: "F", title: "Other assignments" },
      { code: "G", title: "Current issues and developments" },
    ],
  },
];

export const PAPER_CODES: PaperCode[] = accaPapers.map((p) => p.code);
export const APPLIED_KNOWLEDGE: PaperCode[] = ["BT", "MA", "FA"];
export const APPLIED_SKILLS: PaperCode[] = ["LW", "PM", "TX", "FR", "AA", "FM"];
export const STRATEGIC_ESSENTIALS: PaperCode[] = ["SBL", "SBR"];
export const STRATEGIC_OPTIONS: PaperCode[] = ["AFM", "APM", "ATX", "AAA"];
/** The 13 exams a learner completes: 3 + 6 + 2 essentials + 2 options. */
export const EXAMS_TO_QUALIFY = 13;

const paperIndex = new Map(accaPapers.map((p) => [p.code, p]));

export function paperByCode(code: PaperCode | string): AccaPaper | undefined {
  return paperIndex.get(code as PaperCode);
}

export function paperName(code: PaperCode | string) {
  return paperIndex.get(code as PaperCode)?.name ?? code;
}

/** "FR · Financial Reporting". */
export function paperLabel(code: PaperCode | string) {
  const p = paperIndex.get(code as PaperCode);
  return p ? `${p.code} · ${p.name}` : code;
}

export function syllabusAreaTitle(code: PaperCode | string, area: string) {
  return paperIndex.get(code as PaperCode)?.syllabusAreas.find((a) => a.code === area)?.title ?? area;
}

export function papersByLevel(level: PaperLevel) {
  return accaPapers.filter((p) => p.level === level);
}

/* ------------------------------------------------------------------------------------------
 * EPSM and PER
 * ---------------------------------------------------------------------------------------- */

export const epsm = {
  code: "EPSM",
  name: "Ethics and Professional Skills Module",
  courseId: "c-epsm",
  courseSlug: "ethics-and-professional-skills",
  delivery: "Online, self-paced, completed through the ACCA learning platform",
  recommendation:
    "Complete before starting Strategic Professional. It is required for ACCA membership alongside the 13 exams and PER.",
  units: [
    { id: "epsm-1", title: "Ethics and professionalism" },
    { id: "epsm-2", title: "Personal effectiveness" },
    { id: "epsm-3", title: "Innovation and scepticism" },
    { id: "epsm-4", title: "Commercial awareness" },
    { id: "epsm-5", title: "Leadership and team working" },
    { id: "epsm-6", title: "Data analysis and decision support" },
    { id: "epsm-7", title: "Professional skills case study" },
  ],
};

export const per = {
  code: "PER",
  name: "Practical Experience Requirement",
  monthsRequired: 36,
  objectivesRequired: 9,
  essentialRequired: 5,
  technicalRequired: 4,
  summary:
    "36 months of relevant work experience and 9 performance objectives: all 5 essential objectives plus 4 technical objectives, signed off by a practical experience supervisor.",
};

export const perObjectives: PerObjective[] = [
  { id: "po1", code: "PO1", name: "Ethics and professionalism", kind: "essential" },
  { id: "po2", code: "PO2", name: "Stakeholder relationship management", kind: "essential" },
  { id: "po3", code: "PO3", name: "Strategy and innovation", kind: "essential" },
  { id: "po4", code: "PO4", name: "Governance, risk and control", kind: "essential" },
  { id: "po5", code: "PO5", name: "Leadership and management", kind: "essential" },
  { id: "po6", code: "PO6", name: "Record and process transactions and events", kind: "technical" },
  { id: "po7", code: "PO7", name: "Prepare external financial reports", kind: "technical" },
  { id: "po8", code: "PO8", name: "Analyse and interpret financial reports", kind: "technical" },
  { id: "po9", code: "PO9", name: "Evaluate investment and financing decisions", kind: "technical" },
  { id: "po10", code: "PO10", name: "Manage resources", kind: "technical" },
  { id: "po11", code: "PO11", name: "Identify and manage financial risk", kind: "technical" },
];

export function perObjectiveById(id: string) {
  return perObjectives.find((o) => o.id === id);
}

/* ------------------------------------------------------------------------------------------
 * Exam sessions (bible section 5)
 * ---------------------------------------------------------------------------------------- */

export const examSessions: ExamSession[] = [
  {
    id: "es-2025-sep",
    label: "Sep 2025",
    examStart: "2025-09-01",
    examEnd: "2025-09-04",
    resultsDate: "2025-10-13",
    status: "results-released",
    statusLabel: "Results released",
    past: true,
  },
  {
    id: "es-2025-dec",
    label: "Dec 2025",
    examStart: "2025-12-01",
    examEnd: "2025-12-04",
    resultsDate: "2026-01-26",
    status: "results-released",
    statusLabel: "Results released",
    past: true,
  },
  {
    id: "es-2026-mar",
    label: "Mar 2026",
    examStart: "2026-03-02",
    examEnd: "2026-03-05",
    resultsDate: "2026-04-20",
    status: "results-released",
    statusLabel: "Results released",
    past: true,
  },
  {
    id: "es-2026-jun",
    label: "Jun 2026",
    examStart: "2026-06-01",
    examEnd: "2026-06-04",
    resultsDate: "2026-07-13",
    status: "results-released",
    statusLabel: "Results released 13 Jul 2026, recorded",
    past: true,
  },
  {
    id: "es-2026-sep",
    label: "Sep 2026",
    examStart: "2026-09-07",
    examEnd: "2026-09-10",
    resultsDate: "2026-10-12",
    status: "results-pending",
    statusLabel: "Results pending",
    past: true,
  },
  {
    id: "es-2026-dec",
    label: "Dec 2026",
    examStart: "2026-12-07",
    examEnd: "2026-12-10",
    earlyEntryCloses: "2026-10-05",
    standardEntryCloses: "2026-11-02",
    lateEntryCloses: "2026-11-16",
    resultsDate: "2027-01-25",
    status: "entry-open",
    statusLabel: "Early entry open",
    past: false,
  },
  {
    id: "es-2027-mar",
    label: "Mar 2027",
    examStart: "2027-03-01",
    examEnd: "2027-03-04",
    standardEntryCloses: "2027-02-01",
    resultsDate: "2027-04-19",
    status: "entry-not-open",
    statusLabel: "Entry not yet open",
    past: false,
  },
  {
    id: "es-2027-jun",
    label: "Jun 2027",
    examStart: "2027-06-07",
    examEnd: "2027-06-10",
    standardEntryCloses: "2027-05-03",
    resultsDate: "2027-07-19",
    status: "entry-not-open",
    statusLabel: "Entry not yet open",
    past: false,
  },
];

/** The session learners are booking now. */
export const CURRENT_BOOKING_SESSION: ExamSessionId = "es-2026-dec";

export function examSessionById(id: string) {
  return examSessions.find((s) => s.id === id);
}

/** Sample ACCA exam fees in GBP by entry window, recorded for tracking. */
export const accaExamFeesGBP: Record<"applied-knowledge" | "lw" | "applied-skills" | "sbl" | "sbr-options", Record<EntryWindow, number>> = {
  "applied-knowledge": { "on-demand": 133, early: 133, standard: 133, late: 133 },
  lw: { "on-demand": 147, early: 147, standard: 147, late: 147 },
  "applied-skills": { early: 256, standard: 316, late: 453, "on-demand": 316 },
  sbl: { early: 317, standard: 392, late: 559, "on-demand": 392 },
  "sbr-options": { early: 283, standard: 350, late: 500, "on-demand": 350 },
};

export function examFeeGBP(code: PaperCode, window: EntryWindow) {
  if (APPLIED_KNOWLEDGE.includes(code)) return accaExamFeesGBP["applied-knowledge"][window];
  if (code === "LW") return accaExamFeesGBP.lw[window];
  if (code === "SBL") return accaExamFeesGBP.sbl[window];
  if (code === "SBR" || STRATEGIC_OPTIONS.includes(code)) return accaExamFeesGBP["sbr-options"][window];
  return accaExamFeesGBP["applied-skills"][window];
}

/** Sample ACCA fees in GBP, recorded for tracking (paid to ACCA, not ZSkillup). */
export const accaFeesGBP = {
  registration: 89,
  annualSubscription: 138,
  exemptionAppliedKnowledge: 104,
  exemptionAppliedSkills: 138,
};

export function exemptionFeeGBP(code: PaperCode) {
  return APPLIED_KNOWLEDGE.includes(code) ? accaFeesGBP.exemptionAppliedKnowledge : accaFeesGBP.exemptionAppliedSkills;
}

/** Which entry window is open today for a session, or null when none is. */
export function openEntryWindow(session: ExamSession, today = ACCA_TODAY): EntryWindow | null {
  if (session.status !== "entry-open") return null;
  if (session.earlyEntryCloses && today <= session.earlyEntryCloses) return "early";
  if (session.standardEntryCloses && today <= session.standardEntryCloses) return "standard";
  if (session.lateEntryCloses && today <= session.lateEntryCloses) return "late";
  return null;
}
