import { addDays, createRng } from "./types";
import type { ContentItem, ContentStatus, ContentType, PaperCode, ReviewRequest } from "./types";
import { paperByCode } from "./papers";

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  video: "Video",
  "study-material": "Study material",
  transcript: "Transcript",
  "examiner-report": "Examiner report",
  "model-answer": "Model answer",
  "revision-notes": "Revision notes",
  "practice-activity": "Practice activity",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Draft",
  "in-review": "In review",
  published: "Published",
  outdated: "Outdated",
};

type Row = {
  title: string;
  paper: PaperCode;
  module: string;
  lesson: string;
  type: ContentType;
  area: string;
  status: ContentStatus;
  author: string;
  reviewer: string | null;
  subjects?: string[];
  variant?: { universityId: string; label: string };
  size: string;
  outdatedReason?: string;
  updated: string;
};

const ROWS: Row[] = [
  // FR · Marcus Bell
  { title: "Goodwill on acquisition walkthrough", paper: "FR", module: "Group financial statements", lesson: "Workspace: calculate goodwill on acquisition", type: "video", area: "D", status: "published", author: "st-marcus", reviewer: "st-hana", subjects: ["sub-bw-301", "sub-cl-401"], size: "24 min", updated: "2026-08-18" },
  { title: "Goodwill on acquisition transcript", paper: "FR", module: "Group financial statements", lesson: "Workspace: calculate goodwill on acquisition", type: "transcript", area: "D", status: "published", author: "st-marcus", reviewer: "st-hana", size: "9 pages", updated: "2026-08-18" },
  { title: "Consolidated statement of financial position", paper: "FR", module: "Group financial statements", lesson: "Workspace: consolidated statement of financial position", type: "study-material", area: "D", status: "published", author: "st-marcus", reviewer: "st-hana", subjects: ["sub-bw-301"], size: "18 pages", updated: "2026-08-20" },
  { title: "IFRS 16 Leases: lessee accounting", paper: "FR", module: "Accounting for transactions", lesson: "IFRS 16 Leases", type: "video", area: "B", status: "published", author: "st-marcus", reviewer: "st-hana", size: "31 min", updated: "2026-07-02" },
  { title: "Leases summary sheet (IAS 17 references)", paper: "FR", module: "Accounting for transactions", lesson: "IFRS 16 Leases", type: "study-material", area: "B", status: "outdated", author: "st-marcus", reviewer: null, size: "4 pages", outdatedReason: "Still cites IAS 17 operating lease treatment. Replace with IFRS 16 right-of-use model.", updated: "2024-02-11" },
  { title: "FR examiner report notes · Jun 2026 session", paper: "FR", module: "Exam technique and revision", lesson: "Reference: IFRS standards quick reference", type: "examiner-report", area: "D", status: "published", author: "st-marcus", reviewer: "st-priya", size: "7 pages", updated: "2026-07-21" },
  { title: "Model answer: consolidated statement of profit or loss", paper: "FR", module: "Group financial statements", lesson: "Consolidated statement of profit or loss", type: "model-answer", area: "D", status: "published", author: "st-marcus", reviewer: "st-hana", size: "6 pages", updated: "2026-08-25" },
  { title: "Group accounts revision notes", paper: "FR", module: "Exam technique and revision", lesson: "Live class: group accounts exam technique", type: "revision-notes", area: "D", status: "published", author: "st-marcus", reviewer: "st-hana", size: "12 pages", updated: "2026-09-08" },
  { title: "Ratio analysis practice activity", paper: "FR", module: "Analysing and interpreting financial statements", lesson: "Ratio analysis and interpretation", type: "practice-activity", area: "C", status: "draft", author: "st-marcus", reviewer: null, size: "10 questions", updated: "2026-09-11" },
  { title: "Consolidation basics for Corporate Accounting students", paper: "FR", module: "Group financial statements", lesson: "Consolidated statement of financial position", type: "study-material", area: "D", status: "published", author: "st-marcus", reviewer: "st-grace", subjects: ["sub-bw-301"], variant: { universityId: "u-brightwater", label: "Brightwater B.Com bridge" }, size: "11 pages", updated: "2026-08-02" },
  { title: "Statement of cash flows: indirect method", paper: "FR", module: "Analysing and interpreting financial statements", lesson: "Statement of cash flows", type: "video", area: "D", status: "in-review", author: "st-marcus", reviewer: "st-hana", size: "27 min", updated: "2026-09-10" },
  // PM · Farah Siddiqui
  { title: "Variance analysis: mix and yield", paper: "PM", module: "Budgeting and control", lesson: "Mix and yield variances", type: "video", area: "C", status: "in-review", author: "st-farah", reviewer: "st-marcus", size: "28 min", updated: "2026-09-12" },
  { title: "Planning and operational variances", paper: "PM", module: "Budgeting and control", lesson: "Planning and operational variances", type: "study-material", area: "C", status: "published", author: "st-farah", reviewer: "st-marcus", subjects: ["sub-bw-401"], size: "14 pages", updated: "2026-08-09" },
  { title: "Relevant costing practice set", paper: "PM", module: "Decision-making techniques", lesson: "Relevant costing", type: "practice-activity", area: "B", status: "draft", author: "st-farah", reviewer: null, size: "12 questions", updated: "2026-09-13" },
  { title: "PM examiner report notes · Jun 2026 session", paper: "PM", module: "Exam technique and revision", lesson: "Section C technique", type: "examiner-report", area: "D", status: "in-review", author: "st-farah", reviewer: "st-marcus", size: "6 pages", updated: "2026-09-09" },
  { title: "Model answer: transfer pricing", paper: "PM", module: "Performance measurement and control", lesson: "Divisional performance and transfer pricing", type: "model-answer", area: "D", status: "published", author: "st-farah", reviewer: "st-marcus", size: "5 pages", updated: "2026-07-28" },
  { title: "Decision-making revision notes", paper: "PM", module: "Exam technique and revision", lesson: "Decision-making recap", type: "revision-notes", area: "B", status: "in-review", author: "st-farah", reviewer: "st-marcus", size: "9 pages", updated: "2026-09-05" },
  { title: "Learning curve formula sheet", paper: "PM", module: "Budgeting and control", lesson: "Learning curves", type: "study-material", area: "C", status: "outdated", author: "st-farah", reviewer: null, size: "2 pages", outdatedReason: "Notation does not match the current PM formulae sheet. Align before the Dec 2026 mocks.", updated: "2025-03-14" },
  // AA · Hana Suzuki
  { title: "Audit risk and materiality", paper: "AA", module: "Planning and risk assessment", lesson: "Audit risk", type: "video", area: "B", status: "published", author: "st-hana", reviewer: "st-marcus", subjects: ["sub-bw-501"], size: "26 min", updated: "2026-07-14" },
  { title: "Internal control deficiencies: sales cycle", paper: "AA", module: "Internal control", lesson: "Sales and receivables controls", type: "study-material", area: "C", status: "published", author: "st-hana", reviewer: "st-marcus", subjects: ["sub-bw-501", "sub-cl-502"], size: "16 pages", updated: "2026-08-04" },
  { title: "Model answer: audit risk scenario", paper: "AA", module: "Planning and risk assessment", lesson: "Audit risk", type: "model-answer", area: "B", status: "published", author: "st-hana", reviewer: "st-marcus", size: "4 pages", updated: "2026-08-11" },
  { title: "Audit reports revision notes", paper: "AA", module: "Review and reporting", lesson: "Modified opinions", type: "revision-notes", area: "E", status: "draft", author: "st-hana", reviewer: null, size: "8 pages", updated: "2026-09-12" },
  { title: "Going concern lecture transcript", paper: "AA", module: "Review and reporting", lesson: "Going concern", type: "transcript", area: "E", status: "published", author: "st-hana", reviewer: "st-marcus", size: "11 pages", updated: "2026-08-29" },
  { title: "Auditing for B.Com Auditing students", paper: "AA", module: "Audit framework and regulation", lesson: "Audit framework", type: "study-material", area: "A", status: "in-review", author: "st-hana", reviewer: "st-marcus", subjects: ["sub-cl-502"], variant: { universityId: "u-coastline", label: "Coastline B.Com bridge" }, size: "10 pages", updated: "2026-09-07" },
  // FM · Tomas Lindqvist
  { title: "NPV with inflation and tax", paper: "FM", module: "Investment appraisal", lesson: "Investment appraisal with inflation and tax", type: "video", area: "D", status: "published", author: "st-tomas", reviewer: "st-hana", subjects: ["sub-bw-601"], size: "33 min", updated: "2026-08-19" },
  { title: "Working capital cycle calculator", paper: "FM", module: "Working capital management", lesson: "The working capital cycle", type: "practice-activity", area: "C", status: "published", author: "st-tomas", reviewer: "st-hana", size: "8 questions", updated: "2026-08-26" },
  { title: "Cost of capital revision notes", paper: "FM", module: "Business finance and cost of capital", lesson: "WACC", type: "revision-notes", area: "E", status: "published", author: "st-tomas", reviewer: "st-hana", size: "10 pages", updated: "2026-09-02" },
  { title: "FM examiner report notes · Sep 2025 session", paper: "FM", module: "Business finance and cost of capital", lesson: "Exam technique", type: "examiner-report", area: "E", status: "outdated", author: "st-tomas", reviewer: null, size: "5 pages", outdatedReason: "Superseded by the Jun 2026 examiner report notes.", updated: "2025-11-03" },
  { title: "Model answer: business valuations", paper: "FM", module: "Business finance and cost of capital", lesson: "Business valuations", type: "model-answer", area: "F", status: "draft", author: "st-tomas", reviewer: null, size: "5 pages", updated: "2026-09-10" },
  // TX · Grace Whitfield
  { title: "Income tax computation walkthrough (FA2025)", paper: "TX", module: "Income tax and NIC", lesson: "Income tax computation", type: "video", area: "B", status: "published", author: "st-grace", reviewer: "st-marcus", size: "35 min", updated: "2026-05-30" },
  { title: "Chargeable gains revision notes", paper: "TX", module: "Chargeable gains", lesson: "Gains for individuals", type: "revision-notes", area: "C", status: "published", author: "st-grace", reviewer: "st-marcus", size: "9 pages", updated: "2026-06-12" },
  { title: "VAT registration and returns practice", paper: "TX", module: "Value added tax", lesson: "VAT administration", type: "practice-activity", area: "G", status: "in-review", author: "st-grace", reviewer: "st-marcus", size: "10 questions", updated: "2026-09-08" },
  { title: "Tax rates and allowances (FA2024)", paper: "TX", module: "UK tax system", lesson: "Rates and allowances", type: "study-material", area: "A", status: "outdated", author: "st-grace", reviewer: null, size: "3 pages", outdatedReason: "Exams from Jun 2026 to Mar 2027 use Finance Act 2025. Update rates and allowances.", updated: "2025-06-02" },
  // FA · Grace Whitfield
  { title: "Accruals and prepayments", paper: "FA", module: "Recording transactions and events", lesson: "Accruals and prepayments", type: "video", area: "D", status: "published", author: "st-grace", reviewer: "st-tomas", subjects: ["sub-bw-101", "sub-cl-101"], size: "22 min", updated: "2026-07-18" },
  { title: "Trial balance and suspense accounts practice", paper: "FA", module: "Preparing a trial balance", lesson: "Correction of errors", type: "practice-activity", area: "E", status: "published", author: "st-grace", reviewer: "st-tomas", subjects: ["sub-bw-101"], size: "15 questions", updated: "2026-08-07" },
  { title: "FA on-demand CBE revision notes", paper: "FA", module: "Preparing basic financial statements", lesson: "Exam readiness", type: "revision-notes", area: "F", status: "published", author: "st-grace", reviewer: "st-tomas", size: "14 pages", updated: "2026-09-01" },
  { title: "FA for Semester 3: bridging Corporate Accounting", paper: "FA", module: "Simple consolidated financial statements", lesson: "Consolidation basics", type: "study-material", area: "G", status: "published", author: "st-grace", reviewer: "st-marcus", subjects: ["sub-bw-101", "sub-bw-301"], variant: { universityId: "u-brightwater", label: "Brightwater Semester 3" }, size: "12 pages", updated: "2026-07-24" },
  { title: "Simple consolidation lecture transcript", paper: "FA", module: "Simple consolidated financial statements", lesson: "Consolidation basics", type: "transcript", area: "G", status: "draft", author: "st-grace", reviewer: null, size: "8 pages", updated: "2026-09-11" },
  // LW · Vikram Joshi
  { title: "Formation of contract", paper: "LW", module: "The law of obligations", lesson: "Offer and acceptance", type: "video", area: "B", status: "published", author: "st-vikram", reviewer: "st-hana", subjects: ["sub-bw-202", "sub-cl-202"], size: "25 min", updated: "2026-07-20" },
  { title: "Share capital and loan capital", paper: "LW", module: "Capital and financing of companies", lesson: "Share capital", type: "study-material", area: "E", status: "in-review", author: "st-vikram", reviewer: "st-hana", subjects: ["sub-bw-302"], size: "13 pages", updated: "2026-09-09" },
  { title: "Employment law multi-task questions", paper: "LW", module: "Employment law", lesson: "Contract of employment", type: "practice-activity", area: "C", status: "published", author: "st-vikram", reviewer: "st-hana", size: "6 MTQs", updated: "2026-08-14" },
  { title: "Company Law overlap guide", paper: "LW", module: "Formation and constitution of business organisations", lesson: "Corporations and legal personality", type: "revision-notes", area: "D", status: "published", author: "st-vikram", reviewer: "st-hana", subjects: ["sub-bw-302"], variant: { universityId: "u-brightwater", label: "Brightwater Company Law overlap" }, size: "7 pages", updated: "2026-08-21" },
  // BT · Vikram Joshi
  { title: "Stakeholders and the macro environment", paper: "BT", module: "Business organisation, stakeholders and environment", lesson: "Stakeholders", type: "video", area: "A", status: "published", author: "st-vikram", reviewer: "st-hana", subjects: ["sub-bw-102", "sub-nf-102"], size: "21 min", updated: "2026-07-10" },
  { title: "Corporate governance notes", paper: "BT", module: "Organisational structure, governance and management", lesson: "Corporate governance", type: "study-material", area: "B", status: "published", author: "st-vikram", reviewer: "st-hana", subjects: ["sub-bw-102"], size: "11 pages", updated: "2026-08-03" },
  { title: "Leadership theories practice set", paper: "BT", module: "Leadership and management", lesson: "Leadership theories", type: "practice-activity", area: "D", status: "draft", author: "st-vikram", reviewer: null, size: "20 questions", updated: "2026-09-12" },
  // MA · Tomas Lindqvist
  { title: "Standard costing and variances", paper: "MA", module: "Standard costing", lesson: "Basic variances", type: "video", area: "E", status: "published", author: "st-tomas", reviewer: "st-farah", subjects: ["sub-bw-401", "sub-cl-501"], size: "29 min", updated: "2026-03-02" },
  { title: "Budgeting revision notes", paper: "MA", module: "Budgeting", lesson: "Flexible budgets", type: "revision-notes", area: "D", status: "published", author: "st-tomas", reviewer: "st-farah", subjects: ["sub-bw-401"], size: "8 pages", updated: "2026-04-11" },
  // SBR · Marcus Bell
  { title: "Model answer: ethical issues in reporting", paper: "SBR", module: "Ethics and the reporting framework", lesson: "Ethical issues in corporate reporting", type: "model-answer", area: "A", status: "in-review", author: "st-marcus", reviewer: "st-priya", size: "6 pages", updated: "2026-09-06" },
  { title: "IFRS 9 expected credit losses", paper: "SBR", module: "Reporting financial performance", lesson: "IFRS 9 Financial instruments", type: "video", area: "C", status: "draft", author: "st-marcus", reviewer: null, size: "38 min", updated: "2026-09-13" },
];

function buildContent(): ContentItem[] {
  const rng = createRng(3107);
  const counters = new Map<string, number>();
  return ROWS.map((row) => {
    const n = (counters.get(row.paper) ?? 0) + 1;
    counters.set(row.paper, n);
    const major = row.status === "outdated" ? 1 : rng.int(1, 3);
    const minor = rng.int(0, 4);
    const version = `v${major}.${minor}`;
    const count = Math.min(3, major + (minor > 0 ? 1 : 0));
    const history = Array.from({ length: count }, (_, i) => {
      const arr = { length: count };
      const isLatest = i === count - 1;
      const v = isLatest ? version : `v${i + 1}.0`;
      return {
        version: v,
        date: isLatest ? row.updated : addDays(row.updated, -(arr.length - i) * rng.int(40, 120)),
        authorId: row.author,
        summary: isLatest
          ? row.status === "in-review"
            ? "Submitted for review with updated examples"
            : row.status === "draft"
              ? "Working draft"
              : row.status === "outdated"
                ? "Last published version, flagged outdated"
                : "Refreshed examples for the Dec 2026 session"
          : i === 0
            ? "First published version"
            : "Corrected figures and added practice links",
        status: isLatest ? row.status : ("published" as ContentStatus),
      };
    });
    return {
      id: `ct-${row.paper.toLowerCase()}-${String(n).padStart(2, "0")}`,
      title: row.title,
      paper: row.paper,
      courseId: paperByCode(row.paper)!.courseId,
      module: row.module,
      lesson: row.lesson,
      type: row.type,
      syllabusArea: row.area,
      universitySubjectIds: row.subjects ?? [],
      variant: row.variant ?? null,
      status: row.status,
      version,
      versions: history,
      authorId: row.author,
      reviewerId: row.reviewer,
      updated: row.updated,
      size: row.size,
      views: row.status === "published" ? rng.int(40, 620) : row.status === "outdated" ? rng.int(200, 900) : 0,
      outdatedReason: row.outdatedReason,
    };
  });
}

export const contentItems: ContentItem[] = buildContent();

export function contentById(id: string) {
  return contentItems.find((c) => c.id === id);
}

export function contentForPaper(paper: PaperCode) {
  return contentItems.filter((c) => c.paper === paper);
}

function byTitle(title: string) {
  return contentItems.find((c) => c.title === title)!;
}

const reviewSeeds: Omit<ReviewRequest, "id" | "contentId" | "paper" | "fromVersion" | "toVersion">[] = [
  {
    title: "Variance analysis: mix and yield",
    submittedBy: "st-farah",
    reviewerId: "st-marcus",
    submittedOn: "2026-09-12",
    dueOn: "2026-09-16",
    status: "pending",
    changeSummary: "Re-recorded the mix variance example with the revised standard mix and added a yield variance worked example.",
    changes: [
      { section: "Worked example 2", before: "Mix variance calculated on actual quantity at individual standard prices only", after: "Mix variance uses actual total quantity in standard mix, shown step by step" },
      { section: "Summary slide", before: "No yield variance", after: "Yield variance added with interpretation for Section C" },
    ],
    comments: [{ authorId: "st-farah", at: "2026-09-12T18:10", body: "Learners in the revision cohort asked for the yield variance before the 31 Oct mock." }],
  },
  {
    title: "PM examiner report notes · Jun 2026 session",
    submittedBy: "st-farah",
    reviewerId: "st-marcus",
    submittedOn: "2026-09-09",
    dueOn: "2026-09-15",
    status: "changes-requested",
    changeSummary: "Summarised examiner comments on Section C performance measurement answers.",
    changes: [{ section: "Common errors", before: "Listed errors without references", after: "Each error linked to the relevant syllabus area and a practice question" }],
    comments: [
      { authorId: "st-marcus", at: "2026-09-11T10:32", body: "Please paraphrase the examiner comments rather than quoting long passages, and add the ACCA source link." },
      { authorId: "st-farah", at: "2026-09-11T12:05", body: "Will update today." },
    ],
  },
  {
    title: "Decision-making revision notes",
    submittedBy: "st-farah",
    reviewerId: "st-marcus",
    submittedOn: "2026-09-05",
    dueOn: "2026-09-12",
    status: "pending",
    changeSummary: "Condensed relevant costing, limiting factors and pricing into a two-page revision sheet.",
    changes: [{ section: "Limiting factors", before: "Single limiting factor only", after: "Added multiple limiting factors pointer to linear programming" }],
    comments: [],
  },
  {
    title: "Statement of cash flows: indirect method",
    submittedBy: "st-marcus",
    reviewerId: "st-hana",
    submittedOn: "2026-09-10",
    dueOn: "2026-09-17",
    status: "pending",
    changeSummary: "New video replacing the 2024 recording, uses the current FR exam format.",
    changes: [{ section: "Whole video", before: "2024 recording, paper-based layout", after: "CBE spreadsheet workspace layout" }],
    comments: [],
  },
  {
    title: "VAT registration and returns practice",
    submittedBy: "st-grace",
    reviewerId: "st-marcus",
    submittedOn: "2026-09-08",
    dueOn: "2026-09-15",
    status: "pending",
    changeSummary: "Ten objective test questions on VAT registration thresholds and return deadlines, Finance Act 2025 figures.",
    changes: [{ section: "Question 4", before: "Registration threshold from Finance Act 2024", after: "Threshold updated for Finance Act 2025" }],
    comments: [],
  },
  {
    title: "Auditing for B.Com Auditing students",
    submittedBy: "st-hana",
    reviewerId: "st-marcus",
    submittedOn: "2026-09-07",
    dueOn: "2026-09-14",
    status: "changes-requested",
    changeSummary: "Coastline variant bridging the university Auditing subject to AA syllabus area A.",
    changes: [{ section: "Standards", before: "Refers to Standards on Auditing (India)", after: "Maps each SA to the equivalent ISA examined in AA" }],
    comments: [{ authorId: "st-marcus", at: "2026-09-10T16:40", body: "Add a note that AA examines ISAs, and keep SA references as context only." }],
  },
  {
    title: "Share capital and loan capital",
    submittedBy: "st-vikram",
    reviewerId: "st-hana",
    submittedOn: "2026-09-09",
    dueOn: "2026-09-16",
    status: "pending",
    changeSummary: "Expanded share capital notes with the Company Law overlap for Brightwater Semester 3.",
    changes: [{ section: "Maintenance of capital", before: "Brief overview", after: "Distributable profits rules with two worked examples" }],
    comments: [],
  },
  {
    title: "Model answer: ethical issues in reporting",
    submittedBy: "st-marcus",
    reviewerId: "st-priya",
    submittedOn: "2026-09-06",
    dueOn: "2026-09-13",
    status: "pending",
    changeSummary: "Model answer for the SBR ethics question used in the Mar 2027 cohort, including professional marks guidance.",
    changes: [{ section: "Professional marks", before: "Not covered", after: "Two professional marks explained with examples" }],
    comments: [],
  },
  {
    title: "Group accounts revision notes",
    submittedBy: "st-marcus",
    reviewerId: "st-hana",
    submittedOn: "2026-09-01",
    dueOn: "2026-09-08",
    status: "approved",
    changeSummary: "Added non-controlling interest at fair value and the goodwill impairment adjustment.",
    changes: [{ section: "NCI", before: "Proportionate method only", after: "Fair value and proportionate methods compared" }],
    comments: [{ authorId: "st-hana", at: "2026-09-07T11:20", body: "Approved. Clear and exam focused." }],
  },
];

export const reviewRequests: ReviewRequest[] = reviewSeeds.map((r, i) => {
  const item = byTitle(r.title);
  const prev = item.versions.length > 1 ? item.versions[item.versions.length - 2].version : "v0.9";
  return { ...r, id: `rv-${String(i + 1).padStart(2, "0")}`, contentId: item.id, paper: item.paper, fromVersion: prev, toVersion: item.version };
});

export const outdatedContent = contentItems.filter((c) => c.status === "outdated");
