import { createRng } from "./types";
import type {
  BankQuestion,
  BankQuestionType,
  CohortWeakTopic,
  Difficulty,
  EvaluationItem,
  EvaluationRubric,
  PaperAnalytics,
  PaperCode,
  QuestionBank,
  QuizOrMock,
  ReattemptRequest,
  ReEvaluationRequest,
} from "./types";
import { paperByCode } from "./papers";
import { studentsInCohort } from "./students";

export const QUESTION_TYPE_LABELS: Record<BankQuestionType, string> = {
  OT: "Objective test",
  MTQ: "Multi-task question",
  CR: "Constructed response",
  number: "Number entry",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  "exam-standard": "Exam standard",
};

/* ------------------------------------------------------------------------------------------
 * Question bank
 * ---------------------------------------------------------------------------------------- */

type QRow = [PaperCode, string, string, BankQuestionType, Difficulty, number, string, string, string?];

const Q: QRow[] = [
  ["FR", "D", "Goodwill on acquisition", "number", "intermediate", 2, "P acquired 80% of S for consideration of $5,200k. NCI is measured at fair value of $1,100k and S's net assets at acquisition were $4,800k. What is goodwill on acquisition?", "1,500", "$000"],
  ["FR", "B", "IFRS 16 Leases", "number", "intermediate", 2, "A lessee pays $10,000 a year in arrears for five years. The interest rate implicit in the lease is 8% and the five-year annuity factor is 3.993. What is the initial lease liability?", "39,930", "$"],
  ["FR", "B", "IAS 37 Provisions", "OT", "foundation", 2, "Which of the following gives rise to a provision under IAS 37 at the reporting date?", "A present obligation from a past event, where an outflow is probable and can be measured reliably"],
  ["FR", "C", "Interpretation of financial statements", "CR", "exam-standard", 20, "Using the extracts provided, analyse the financial performance and position of Lotus Co for the year ended 31 March 2026, with reference to the new contract won during the year.", "Up to 5 marks for relevant ratios, up to 13 for analysis of profitability, liquidity and gearing linked to the contract, 2 for a supported conclusion."],
  ["FR", "D", "Consolidated statement of financial position", "CR", "exam-standard", 20, "Prepare the consolidated statement of financial position for the Pinto group as at 30 June 2026.", "Marks for goodwill, NCI, group retained earnings, fair value adjustments, intra-group balances and unrealised profit, per rubric."],
  ["FR", "B", "IFRS 15 Revenue", "OT", "intermediate", 2, "Under IFRS 15, what is the third step of the five-step model for recognising revenue?", "Determine the transaction price"],
  ["FR", "A", "Conceptual Framework", "OT", "foundation", 2, "Which of the following is an enhancing, rather than fundamental, qualitative characteristic?", "Comparability"],
  ["FR", "D", "Associates", "OT", "exam-standard", 2, "Parent owns 30% of A and has significant influence. How is A accounted for in the consolidated financial statements?", "Equity method"],
  ["PM", "C", "Material price variance", "number", "foundation", 2, "The standard price of material is $4.00 per kg. 12,000 kg were bought for $45,600. What is the material price variance?", "2,400 favourable", "$"],
  ["PM", "B", "Relevant costing", "OT", "intermediate", 2, "Material in inventory has no other use and would cost $300 to dispose of. What is its relevant cost if used on a contract?", "Negative $300: using it saves the disposal cost"],
  ["PM", "B", "Limiting factors", "OT", "intermediate", 2, "Product X earns contribution of $12 per unit using 3 labour hours. Product Y earns $10 using 2 labour hours. Labour is the limiting factor. Which product ranks first?", "Product Y ($5 per labour hour against $4)"],
  ["PM", "C", "Planning and operational variances", "CR", "exam-standard", 20, "Calculate the planning and operational variances for material price and usage, and discuss whether the production manager should be held responsible for the adverse usage variance.", "Up to 8 marks for variances, up to 10 for discussion of controllability, 2 for recommendation."],
  ["PM", "D", "Divisional performance", "CR", "exam-standard", 20, "Calculate ROI and residual income for both divisions and discuss how the proposed investment affects the divisional manager's decision.", "Up to 6 marks for calculations, up to 12 for goal congruence discussion, 2 for recommendation."],
  ["PM", "A", "Activity-based costing", "OT", "foundation", 2, "Which of the following is the most suitable cost driver for machine set-up costs?", "Number of production runs"],
  ["PM", "D", "Return on investment", "number", "intermediate", 2, "Divisional profit is $180,000 and capital employed is $1,200,000. What is ROI?", "15", "%"],
  ["AA", "A", "Ethics and independence", "OT", "intermediate", 2, "An audit manager holds shares in an audit client. Which threat to independence arises?", "Self-interest threat"],
  ["AA", "B", "Materiality", "OT", "foundation", 2, "Which benchmark is most commonly used to set overall materiality for a profit-making entity?", "Profit before tax"],
  ["AA", "B", "Audit risk", "CR", "exam-standard", 20, "Using the information provided, describe eight audit risks and explain the auditor's response to each risk in planning the audit of Sunflower Co.", "Half a mark per risk identified, one per explanation, one per response, capped per rubric."],
  ["AA", "C", "Internal control deficiencies", "CR", "exam-standard", 20, "Identify and explain six deficiencies in the sales system of Magnolia Co, recommend a control for each and describe a test of control.", "One mark per deficiency, recommendation and test of control, up to 18, plus 2 for presentation."],
  ["AA", "D", "Audit evidence", "OT", "intermediate", 2, "Which is the most reliable evidence for the existence of trade receivables?", "External confirmation from customers"],
  ["AA", "E", "Audit reports", "OT", "intermediate", 2, "Financial statements contain a misstatement that is material but not pervasive. Which opinion should the auditor issue?", "Qualified opinion"],
  ["FM", "D", "Net present value", "number", "intermediate", 2, "A project costs $50,000 now and returns $20,000 a year for three years. The cost of capital is 10% and the three-year annuity factor is 2.487. What is the NPV?", "-260", "$"],
  ["FM", "C", "Working capital cycle", "number", "intermediate", 2, "Inventory days are 60, receivable days 45 and payable days 50. What is the cash operating cycle?", "55", "days"],
  ["FM", "E", "Weighted average cost of capital", "number", "exam-standard", 2, "Equity has a market value of $6m and a cost of 12%. Debt has a market value of $4m and a post-tax cost of 5%. What is the WACC?", "9.2", "%"],
  ["FM", "D", "Investment appraisal with inflation and tax", "CR", "exam-standard", 20, "Calculate the NPV of the proposed investment using nominal cash flows and advise whether it should be undertaken.", "Up to 12 marks for the NPV with inflation, tax and allowances, up to 8 for discussion and advice."],
  ["FM", "G", "Foreign exchange risk", "OT", "intermediate", 2, "Which of the following is an internal hedging technique?", "Leading and lagging"],
  ["FM", "F", "Business valuations", "number", "intermediate", 2, "A dividend of $0.40 has just been paid, growth is 4% a year and the cost of equity is 12%. What is the share value using the dividend growth model?", "5.20", "$"],
  ["FM", "E", "Sources of finance", "OT", "foundation", 2, "Which is usually the cheapest source of long-term finance for a company?", "Secured debt"],
  ["TX", "A", "Tax administration", "OT", "foundation", 2, "What is the filing date for a paper self-assessment tax return for the tax year 2025/26?", "31 October 2026"],
  ["TX", "E", "Corporation tax payment dates", "OT", "intermediate", 2, "A company that is not large has a 12-month accounting period. When is its corporation tax due?", "Nine months and one day after the end of the accounting period"],
  ["TX", "B", "Income tax computation", "CR", "exam-standard", 15, "Calculate Ravi's income tax liability for the tax year 2025/26, showing the treatment of his employment benefits and property income.", "Marks for employment income, benefits, property income, personal allowance and tax bands, per rubric."],
  ["TX", "G", "VAT returns", "OT", "intermediate", 2, "What is the normal filing deadline for a VAT return submitted under Making Tax Digital?", "One month and seven days after the end of the VAT period"],
  ["TX", "D", "Inheritance tax", "OT", "intermediate", 2, "Which lifetime gift is a potentially exempt transfer?", "A gift from one individual to another individual"],
  ["TX", "E", "Corporation tax liabilities", "CR", "exam-standard", 15, "Calculate the taxable total profits and corporation tax liability of Maple Ltd for the year ended 31 March 2026.", "Marks for adjustments to trading profit, capital allowances, property income and the tax calculation."],
  ["FA", "D", "Accruals", "OT", "foundation", 2, "Electricity of $900 for March 2026 was unpaid at the year end of 31 March 2026. Which entry records it?", "Dr Electricity expense $900, Cr Accruals $900"],
  ["FA", "D", "Depreciation", "number", "foundation", 2, "A machine cost $40,000, has a residual value of $4,000 and a useful life of six years. What is annual straight-line depreciation?", "6,000", "$"],
  ["FA", "E", "Suspense accounts", "OT", "intermediate", 2, "A sales invoice of $450 was posted to the receivables ledger control account only. What balance is needed in the suspense account?", "A credit balance of $450"],
  ["FA", "F", "Preparing financial statements", "MTQ", "exam-standard", 15, "From the trial balance and notes, prepare the statement of profit or loss and statement of financial position of Kite Co for the year ended 31 December 2025.", "Marks for each adjustment and correct line items, per rubric."],
  ["FA", "G", "Simple consolidation", "MTQ", "exam-standard", 15, "Prepare the consolidated statement of financial position of the Heron group, including goodwill and non-controlling interest.", "Marks for goodwill, NCI, retained earnings and cancellation of intra-group balances."],
  ["FA", "H", "Liquidity ratios", "number", "intermediate", 2, "Current assets are $84,000 and current liabilities are $60,000. What is the current ratio?", "1.4", ":1"],
  ["FA", "B", "Qualitative characteristics", "OT", "foundation", 2, "Which of the following is a fundamental qualitative characteristic?", "Faithful representation"],
  ["FA", "D", "Inventory", "OT", "intermediate", 2, "Under IAS 2, at what amount is inventory measured?", "Lower of cost and net realisable value"],
  ["LW", "B", "Offer and acceptance", "OT", "foundation", 2, "A price-tagged display of goods in a shop window is normally which of the following?", "An invitation to treat"],
  ["LW", "B", "Consideration", "OT", "intermediate", 2, "Which statement about consideration is correct?", "Consideration must be sufficient but need not be adequate"],
  ["LW", "C", "Employment status", "MTQ", "intermediate", 6, "Using the scenario, identify the tests used to decide whether Ali is an employee or an independent contractor, and the consequence for his claim.", "Control, integration and economic reality tests, and the effect on statutory employment rights."],
  ["LW", "D", "Separate legal personality", "OT", "intermediate", 2, "Which case established the separate legal personality of a company?", "Salomon v Salomon & Co Ltd (1897)"],
  ["LW", "E", "Share capital", "OT", "intermediate", 2, "Shares are issued at a premium. Where is the excess over nominal value credited?", "Share premium account"],
  ["LW", "G", "Insolvency", "OT", "exam-standard", 2, "In a liquidation, after fixed charge holders and liquidation expenses, which creditors are paid next?", "Preferential creditors"],
  ["LW", "H", "Insider dealing", "OT", "foundation", 2, "Which offence involves dealing in price-affected securities using inside information?", "Insider dealing"],
  ["MA", "C", "Overhead absorption", "number", "intermediate", 2, "Budgeted overheads are $120,000 and budgeted labour hours are 40,000. What is the overhead absorption rate?", "3", "$ per hour"],
  ["MA", "D", "Flexible budgets", "OT", "foundation", 2, "When activity changes, which costs does a flexible budget adjust?", "Variable costs and the variable part of semi-variable costs"],
  ["MA", "E", "Labour variances", "MTQ", "exam-standard", 10, "Calculate the labour rate and efficiency variances for the period and suggest one possible cause of each.", "Marks for each variance with direction, and one mark per valid cause."],
  ["MA", "B", "Averages", "OT", "intermediate", 2, "Which average is least affected by extreme values?", "Median"],
  ["MA", "F", "Non-financial indicators", "OT", "intermediate", 2, "Which of the following is a non-financial performance indicator?", "Customer complaints per 1,000 orders"],
  ["MA", "C", "Breakeven analysis", "number", "intermediate", 2, "Fixed costs are $60,000 and contribution is $15 per unit. What is the breakeven point in units?", "4,000", "units"],
  ["BT", "A", "Stakeholder mapping", "OT", "foundation", 2, "Mendelow's matrix classifies stakeholders by which two factors?", "Power and interest"],
  ["BT", "B", "Corporate governance", "OT", "intermediate", 2, "Which is a key role of independent non-executive directors?", "Independent oversight of the executive directors"],
  ["BT", "D", "Motivation theories", "OT", "foundation", 1, "Which of the following is a hygiene factor in Herzberg's theory?", "Salary"],
  ["BT", "C", "Purchasing controls", "MTQ", "intermediate", 4, "Match each control to the fraud risk it addresses in the purchasing function.", "Segregation of duties to fictitious suppliers, authorisation limits to over-ordering, three-way match to paying for goods not received, supplier master file review to duplicate suppliers."],
  ["BT", "F", "Fundamental principles", "OT", "intermediate", 1, "Which of the following is a fundamental principle in the ACCA Code of Ethics and Conduct?", "Objectivity"],
  ["BT", "E", "Communication", "OT", "foundation", 1, "Which method is most suitable for a complex negotiation?", "Face-to-face meeting"],
  ["SBR", "A", "Ethical issues", "CR", "exam-standard", 20, "Discuss the ethical issues arising from the finance director's proposal to reclassify the loan, and recommend actions for the financial controller.", "Up to 18 marks for ethical and accounting discussion, 2 professional marks."],
  ["SBR", "D", "Disposal of a subsidiary", "CR", "exam-standard", 30, "Explain, with calculations, the accounting treatment of the disposal of Kestrel Co in the consolidated financial statements.", "Marks for gain on disposal, NCI, retained interest and presentation, per rubric."],
  ["SBR", "C", "Expected credit losses", "CR", "exam-standard", 25, "Discuss how the expected credit loss model applies to the trade receivables and loan assets of Lark Co.", "Marks for simplified approach, three-stage model, significant increase in credit risk and presentation."],
];

function buildQuestions(): BankQuestion[] {
  const rng = createRng(5150);
  const counters = new Map<PaperCode, number>();
  return Q.map(([paper, area, topic, type, difficulty, marks, stem, answerKey, unit], i) => {
    const n = (counters.get(paper) ?? 0) + 1;
    counters.set(paper, n);
    const status: BankQuestion["status"] = i % 11 === 5 ? "draft" : i % 13 === 7 ? "in-review" : i === 17 ? "retired" : "published";
    const facility = status === "published" || status === "retired" ? Math.round((difficulty === "foundation" ? rng.int(68, 88) : difficulty === "intermediate" ? rng.int(48, 72) : rng.int(34, 58))) / 100 : null;
    return {
      id: `q-${paper.toLowerCase()}-${String(n).padStart(3, "0")}`,
      bankId: `qb-${paper.toLowerCase()}`,
      paper,
      syllabusArea: area,
      topic,
      difficulty,
      type,
      marks,
      status,
      authorId: paperByCode(paper)!.leadFacultyId,
      facilityIndex: facility,
      usedIn: facility === null ? 0 : rng.int(1, 9),
      stem,
      answerKey,
      unit,
      updated: `2026-0${rng.int(6, 9)}-${String(rng.int(1, 12)).padStart(2, "0")}`,
    };
  });
}

export const bankQuestions: BankQuestion[] = buildQuestions();

export function questionById(id: string) {
  return bankQuestions.find((q) => q.id === id);
}

const BANK_PAPERS: PaperCode[] = ["FR", "PM", "AA", "FM", "TX", "FA", "LW", "MA", "BT", "SBR"];

export const questionBanks: QuestionBank[] = BANK_PAPERS.map((paper) => ({
  id: `qb-${paper.toLowerCase()}`,
  name: `${paper} question bank`,
  paper,
  ownerId: paperByCode(paper)!.leadFacultyId,
  questionIds: bankQuestions.filter((q) => q.paper === paper).map((q) => q.id),
  status: "published" as const,
  updated: bankQuestions.filter((q) => q.paper === paper).reduce((m, q) => (q.updated > m ? q.updated : m), "2026-01-01"),
  description: `${paperByCode(paper)!.name} questions tagged by syllabus area, topic and difficulty.`,
}));

/* ------------------------------------------------------------------------------------------
 * Rubrics
 * ---------------------------------------------------------------------------------------- */

const BANDS = (top: string, mid: string, low: string) => [
  { band: "Strong", text: top },
  { band: "Adequate", text: mid },
  { band: "Weak", text: low },
];

export const evaluationRubrics: EvaluationRubric[] = [
  {
    id: "rb-fr-cr",
    name: "FR Section C constructed response",
    paper: "FR",
    appliesTo: "FR mock Section C and written case answers",
    createdBy: "st-marcus",
    updated: "2026-08-28",
    criteria: [
      { id: "calc", label: "Calculations and workings", marks: 8, descriptors: BANDS("Accurate, clearly referenced workings", "Mostly accurate, some workings missing", "Significant errors or no workings") },
      { id: "analysis", label: "Analysis and interpretation", marks: 10, descriptors: BANDS("Explains causes using scenario detail", "States movements with limited reasons", "Lists ratios without comment") },
      { id: "conclusion", label: "Conclusion", marks: 2, descriptors: BANDS("Supported and balanced", "Present but general", "Missing") },
    ],
  },
  {
    id: "rb-pm-cr",
    name: "PM Section C constructed response",
    paper: "PM",
    appliesTo: "PM mock Section C and variance analysis reports",
    createdBy: "st-farah",
    updated: "2026-08-30",
    criteria: [
      { id: "calc", label: "Variance and performance calculations", marks: 8, descriptors: BANDS("All variances correct with direction", "Most variances correct", "Method errors throughout") },
      { id: "discussion", label: "Discussion applied to the scenario", marks: 10, descriptors: BANDS("Specific to the business and its managers", "Generic but relevant points", "Theory without application") },
      { id: "recommendation", label: "Recommendation", marks: 2, descriptors: BANDS("Clear and justified", "Stated without justification", "Missing") },
    ],
  },
  {
    id: "rb-aa-cr",
    name: "AA Section C constructed response",
    paper: "AA",
    appliesTo: "AA risk, controls and evidence questions",
    createdBy: "st-hana",
    updated: "2026-08-21",
    criteria: [
      { id: "identify", label: "Identification from the scenario", marks: 6, descriptors: BANDS("Specific issues drawn from the scenario", "Some generic points", "Mostly generic") },
      { id: "explain", label: "Explanation of impact", marks: 8, descriptors: BANDS("Links to assertions and financial statement impact", "Partial impact explained", "No impact explained") },
      { id: "response", label: "Auditor response or procedures", marks: 6, descriptors: BANDS("Practical and specific", "Vague procedures", "Not relevant") },
    ],
  },
  {
    id: "rb-fm-cr",
    name: "FM Section C constructed response",
    paper: "FM",
    appliesTo: "FM investment appraisal and working capital questions",
    createdBy: "st-tomas",
    updated: "2026-08-24",
    criteria: [
      { id: "calc", label: "Calculations", marks: 12, descriptors: BANDS("Correct timing, inflation and tax", "Minor timing or rate errors", "Major method errors") },
      { id: "advice", label: "Discussion and advice", marks: 8, descriptors: BANDS("Advice follows from the figures and limitations", "Advice given, limited discussion", "No advice") },
    ],
  },
  {
    id: "rb-sbr-cr",
    name: "SBR constructed response with professional marks",
    paper: "SBR",
    appliesTo: "SBR Section A and B questions",
    createdBy: "st-marcus",
    updated: "2026-09-04",
    criteria: [
      { id: "principles", label: "Application of IFRS principles", marks: 14, descriptors: BANDS("Correct standard applied to the facts", "Correct standard, weak application", "Wrong or no standard") },
      { id: "ethics", label: "Ethical discussion", marks: 4, descriptors: BANDS("Identifies threats and actions", "Identifies threats only", "Not addressed") },
      { id: "professional", label: "Professional marks", marks: 2, descriptors: BANDS("Clear, logical, well structured", "Some structure", "Unstructured") },
    ],
  },
  {
    id: "rb-assignment",
    name: "Written assignment",
    paper: null,
    appliesTo: "Assignments across Applied Skills papers",
    createdBy: "st-marcus",
    updated: "2026-07-15",
    criteria: [
      { id: "technical", label: "Technical accuracy", marks: 40, descriptors: BANDS("Accurate throughout", "Minor errors", "Frequent errors") },
      { id: "application", label: "Application to the scenario", marks: 40, descriptors: BANDS("Consistently applied", "Partly applied", "Generic") },
      { id: "presentation", label: "Structure and presentation", marks: 20, descriptors: BANDS("Report format, clear headings", "Readable", "Hard to follow") },
    ],
  },
  {
    id: "rb-project",
    name: "Case study project",
    paper: null,
    appliesTo: "Projects such as the FR written case",
    createdBy: "st-marcus",
    updated: "2026-07-15",
    criteria: [
      { id: "research", label: "Use of evidence", marks: 30, descriptors: BANDS("Draws on all exhibits", "Uses some exhibits", "Little evidence") },
      { id: "analysis", label: "Analysis", marks: 50, descriptors: BANDS("Insightful and specific", "Sound but descriptive", "Superficial") },
      { id: "communication", label: "Communication", marks: 20, descriptors: BANDS("Professional and concise", "Adequate", "Unclear") },
    ],
  },
];

export function rubricByIdAcca(id: string) {
  return evaluationRubrics.find((r) => r.id === id);
}

/* ------------------------------------------------------------------------------------------
 * Quizzes and mock exams
 * ---------------------------------------------------------------------------------------- */

const ids = (paper: PaperCode, type?: BankQuestionType) =>
  bankQuestions.filter((q) => q.paper === paper && (!type || q.type === type) && q.status === "published").map((q) => q.id);

const appliedSkillsBlueprint = (paper: PaperCode, areasA: string[], areasC: string[]) => [
  { section: "Section A", format: "15 objective test questions, 2 marks each", marks: 30, areas: areasA, questionIds: ids(paper, "OT").concat(ids(paper, "number")).slice(0, 6) },
  { section: "Section B", format: "3 objective test cases, 5 questions each", marks: 30, areas: areasA },
  { section: "Section C", format: "2 constructed-response questions, 20 marks each", marks: 40, areas: areasC, questionIds: ids(paper, "CR") },
];

export const quizzesAndMocks: QuizOrMock[] = [
  { id: "qm-fr-mock-dec26", title: "FR mock exam · Dec 2026", kind: "mock", paper: "FR", assessmentId: "a-fr-mock", durationMins: 180, totalMarks: 100, blueprint: appliedSkillsBlueprint("FR", ["A", "B", "C", "D"], ["C", "D"]), rubricId: "rb-fr-cr", status: "scheduled", cohortIds: ["co-fr-dec26-wkd", "co-fr-dec26-eve"], opensOn: "2026-10-24", closesOn: "2026-10-25", attempts: 0, avgScore: null, createdBy: "st-marcus", proctored: true },
  { id: "qm-pm-mock-dec26", title: "PM mock exam · Dec 2026", kind: "mock", paper: "PM", assessmentId: "a-pm-mock", durationMins: 180, totalMarks: 100, blueprint: appliedSkillsBlueprint("PM", ["A", "B", "C", "D"], ["C", "D"]), rubricId: "rb-pm-cr", status: "scheduled", cohortIds: ["co-pm-dec26-rev"], opensOn: "2026-10-31", closesOn: "2026-11-01", attempts: 0, avgScore: null, createdBy: "st-farah", proctored: true },
  { id: "qm-aa-mock-dec26", title: "AA mock exam · Dec 2026", kind: "mock", paper: "AA", durationMins: 180, totalMarks: 100, blueprint: appliedSkillsBlueprint("AA", ["A", "B", "C", "D", "E"], ["B", "C"]), rubricId: "rb-aa-cr", status: "scheduled", cohortIds: ["co-aa-dec26-eve"], opensOn: "2026-11-07", closesOn: "2026-11-08", attempts: 0, avgScore: null, createdBy: "st-hana", proctored: true },
  { id: "qm-fm-mock-dec26", title: "FM mock exam · Dec 2026", kind: "mock", paper: "FM", durationMins: 180, totalMarks: 100, blueprint: appliedSkillsBlueprint("FM", ["A", "B", "C", "D", "E", "F", "G"], ["C", "D", "E"]), rubricId: "rb-fm-cr", status: "draft", cohortIds: ["co-fm-fast-dec26"], opensOn: "2026-11-08", closesOn: "2026-11-09", attempts: 0, avgScore: null, createdBy: "st-tomas", proctored: true },
  {
    id: "qm-fa-mock",
    title: "FA mock exam",
    kind: "mock",
    paper: "FA",
    assessmentId: "a-fa-mock",
    durationMins: 120,
    totalMarks: 100,
    blueprint: [
      { section: "Section A", format: "35 objective test questions, 2 marks each", marks: 70, areas: ["A", "B", "C", "D", "E", "F", "G", "H"], questionIds: ids("FA", "OT").concat(ids("FA", "number")) },
      { section: "Section B", format: "2 multi-task questions, 15 marks each", marks: 30, areas: ["F", "G"], questionIds: ids("FA", "MTQ") },
    ],
    status: "published",
    cohortIds: ["co-bw-2025-s3", "co-cl-2025-s3"],
    opensOn: "2026-09-01",
    closesOn: "2026-11-20",
    attempts: 96,
    avgScore: 63,
    createdBy: "st-grace",
    proctored: false,
  },
  {
    id: "qm-sbr-mock-mar27",
    title: "SBR mock exam · Mar 2027",
    kind: "mock",
    paper: "SBR",
    durationMins: 195,
    totalMarks: 100,
    blueprint: [
      { section: "Section A", format: "Two questions: group case (30 marks) and ethics (20 marks)", marks: 50, areas: ["A", "D"], questionIds: ids("SBR", "CR").slice(0, 2) },
      { section: "Section B", format: "Two 25-mark questions", marks: 50, areas: ["B", "C", "E", "F"] },
    ],
    rubricId: "rb-sbr-cr",
    status: "draft",
    cohortIds: ["co-sbr-mar27-wkd"],
    opensOn: "2027-02-06",
    closesOn: "2027-02-07",
    attempts: 0,
    avgScore: null,
    createdBy: "st-marcus",
    proctored: true,
  },
  { id: "qm-fr-groups", title: "Group accounts test", kind: "quiz", paper: "FR", assessmentId: "a-fr-groups", durationMins: 45, totalMarks: 30, blueprint: [{ section: "Test", format: "Mixed objective, number entry and short answers", marks: 30, areas: ["D"], questionIds: ids("FR").slice(0, 4) }], status: "published", cohortIds: ["co-fr-dec26-wkd", "co-fr-dec26-eve"], opensOn: "2026-08-15", closesOn: "2026-10-15", attempts: 54, avgScore: 61, createdBy: "st-marcus", proctored: true },
  { id: "qm-pm-budgeting", title: "Budgeting and standard costing check", kind: "quiz", paper: "PM", assessmentId: "a-pm-budgeting", durationMins: 30, totalMarks: 20, blueprint: [{ section: "Quiz", format: "10 objective test questions", marks: 20, areas: ["C"], questionIds: ids("PM", "OT") }], status: "published", cohortIds: ["co-pm-dec26-rev"], opensOn: "2026-08-20", closesOn: "2026-09-30", attempts: 19, avgScore: 57, createdBy: "st-farah", proctored: false },
  { id: "qm-fm-diagnostic", title: "Financial Management diagnostic", kind: "progress-test", paper: "FM", assessmentId: "a-fm-diagnostic", durationMins: 20, totalMarks: 8, blueprint: [{ section: "Diagnostic", format: "8 questions across the three FM modules", marks: 8, areas: ["C", "D", "E"] }], status: "published", cohortIds: ["co-fm-fast-dec26"], opensOn: "2026-08-17", closesOn: "2026-12-01", attempts: 22, avgScore: 58, createdBy: "st-tomas", proctored: false },
  { id: "qm-lw-contract", title: "Contract law quiz", kind: "quiz", paper: "LW", durationMins: 30, totalMarks: 20, blueprint: [{ section: "Quiz", format: "10 objective test questions", marks: 20, areas: ["B"], questionIds: ids("LW", "OT").slice(0, 3) }], status: "published", cohortIds: ["co-bw-2025-s3", "co-cl-2025-s3"], opensOn: "2026-08-24", closesOn: "2026-09-18", attempts: 102, avgScore: 66, createdBy: "st-vikram", proctored: false },
  { id: "qm-bt-progress-1", title: "BT progress test 1", kind: "progress-test", paper: "BT", durationMins: 60, totalMarks: 40, blueprint: [{ section: "Test", format: "30 objective test questions", marks: 40, areas: ["A", "B"], questionIds: ids("BT", "OT") }], status: "scheduled", cohortIds: ["co-bw-2026-s1"], opensOn: "2026-09-18", closesOn: "2026-09-19", attempts: 0, avgScore: null, createdBy: "st-vikram", proctored: false },
  { id: "qm-fr-progress-2", title: "FR progress test 2", kind: "progress-test", paper: "FR", durationMins: 60, totalMarks: 40, blueprint: [{ section: "Test", format: "Objective test questions on IFRS 15, IFRS 16 and IAS 37", marks: 40, areas: ["B"] }], status: "closed", cohortIds: ["co-fr-dec26-wkd"], opensOn: "2026-09-05", closesOn: "2026-09-06", attempts: 33, avgScore: 59, createdBy: "st-marcus", proctored: false },
];

export function quizOrMockById(id: string) {
  return quizzesAndMocks.find((q) => q.id === id);
}

/* ------------------------------------------------------------------------------------------
 * Evaluation queue, reattempts and re-evaluation
 * ---------------------------------------------------------------------------------------- */

function pickStudent(cohortId: string, n: number) {
  const list = studentsInCohort(cohortId);
  return list[n % list.length].id;
}

type EvalSeed = Omit<EvaluationItem, "id" | "studentId"> & { from: [string, number] };

const evalSeeds: EvalSeed[] = [
  { from: ["co-fr-dec26-wkd", 1], kind: "project", title: "Written case: interpreting financial statements", paper: "FR", cohortId: "co-fr-dec26-wkd", assessmentId: "a-fr-case", rubricId: "rb-project", question: "Analyse Lotus Co's performance and position for the board, using the exhibits.", answerExcerpt: "Gross margin fell from 34% to 29% because the new contract was priced to win market share. Receivable days rose to 58 as the contract customer has 60-day terms...", wordCount: 1480, submittedOn: "2026-09-11", dueOn: "2026-09-16", status: "to-grade", graderId: "st-marcus", marks: null, maxMarks: 100, plagiarism: { similarity: 8, flagged: false } },
  { from: ["co-fr-dec26-wkd", 2], kind: "project", title: "Written case: interpreting financial statements", paper: "FR", cohortId: "co-fr-dec26-wkd", assessmentId: "a-fr-case", rubricId: "rb-project", question: "Analyse Lotus Co's performance and position for the board, using the exhibits.", answerExcerpt: "Revenue increased by 22% mainly due to the new contract. The current ratio fell from 1.6 to 1.2, which suggests liquidity has weakened...", wordCount: 1320, submittedOn: "2026-09-12", dueOn: "2026-09-16", status: "flagged", graderId: "st-marcus", marks: null, maxMarks: 100, plagiarism: { similarity: 67, flagged: true, source: "Matches another learner's submission in the same cohort", misconduct: "Suspected collusion, under review" } },
  { from: ["co-fr-dec26-wkd", 3], kind: "descriptive", title: "FR progress test 2 · Question 3", paper: "FR", cohortId: "co-fr-dec26-wkd", rubricId: "rb-fr-cr", question: "Explain how IFRS 16 affects the gearing of Lotus Co.", answerExcerpt: "Recognising right-of-use assets and lease liabilities increases debt, so gearing rises from 32% to 41%...", wordCount: 410, submittedOn: "2026-09-06", dueOn: "2026-09-13", status: "in-progress", graderId: "st-marcus", marks: 12, maxMarks: 20, plagiarism: { similarity: 4, flagged: false } },
  { from: ["co-fr-dec26-wkd", 4], kind: "descriptive", title: "FR progress test 2 · Question 3", paper: "FR", cohortId: "co-fr-dec26-wkd", rubricId: "rb-fr-cr", question: "Explain how IFRS 16 affects the gearing of Lotus Co.", answerExcerpt: "Leases now go on the statement of financial position which increases liabilities...", wordCount: 260, submittedOn: "2026-09-06", dueOn: "2026-09-13", status: "graded", graderId: "st-marcus", marks: 9, maxMarks: 20, feedback: "Correct direction but no figures from the scenario. Quantify the change in gearing next time.", plagiarism: { similarity: 3, flagged: false } },
  { from: ["co-fr-dec26-eve", 0], kind: "descriptive", title: "FR progress test 2 · Question 3", paper: "FR", cohortId: "co-fr-dec26-eve", rubricId: "rb-fr-cr", question: "Explain how IFRS 16 affects the gearing of Lotus Co.", answerExcerpt: "Gearing increases because lease liabilities are debt-like. Interest cover also falls as depreciation and interest replace the lease expense...", wordCount: 380, submittedOn: "2026-09-08", dueOn: "2026-09-15", status: "to-grade", graderId: "st-marcus", marks: null, maxMarks: 20, plagiarism: { similarity: 11, flagged: false } },
  { from: ["co-pm-dec26-rev", 0], kind: "assignment", title: "Variance analysis report", paper: "PM", cohortId: "co-pm-dec26-rev", assessmentId: "a-pm-variance", rubricId: "rb-pm-cr", question: "Prepare a report for the production director explaining the material and labour variances for August.", answerExcerpt: "The adverse material usage variance of $6,400 arose mainly from the new supplier's lower-grade material...", wordCount: 1150, submittedOn: "2026-09-10", dueOn: "2026-09-17", status: "to-grade", graderId: "st-farah", marks: null, maxMarks: 20, plagiarism: { similarity: 9, flagged: false } },
  { from: ["co-pm-dec26-rev", 1], kind: "assignment", title: "Variance analysis report", paper: "PM", cohortId: "co-pm-dec26-rev", assessmentId: "a-pm-variance", rubricId: "rb-pm-cr", question: "Prepare a report for the production director explaining the material and labour variances for August.", answerExcerpt: "Planning variances are uncontrollable because the market price changed after the standard was set...", wordCount: 980, submittedOn: "2026-09-09", dueOn: "2026-09-17", status: "to-grade", graderId: "st-farah", marks: null, maxMarks: 20, plagiarism: { similarity: 41, flagged: true, source: "Close match to a published model answer", misconduct: "Model answer reproduced without attribution" } },
  { from: ["co-pm-dec26-rev", 2], kind: "assignment", title: "Variance analysis report", paper: "PM", cohortId: "co-pm-dec26-rev", assessmentId: "a-pm-variance", rubricId: "rb-pm-cr", question: "Prepare a report for the production director explaining the material and labour variances for August.", answerExcerpt: "Labour efficiency was adverse by 320 hours due to training new staff...", wordCount: 870, submittedOn: "2026-09-04", dueOn: "2026-09-10", status: "returned", graderId: "st-farah", marks: 11, maxMarks: 20, feedback: "Good calculations. Discussion needs to link each variance to who controls it.", plagiarism: { similarity: 6, flagged: false } },
  { from: ["co-aa-dec26-eve", 0], kind: "descriptive", title: "Audit risk scenario · Sunflower Co", paper: "AA", cohortId: "co-aa-dec26-eve", rubricId: "rb-aa-cr", question: "Describe eight audit risks and the auditor's response to each.", answerExcerpt: "Inventory is held at 12 branches, so there is a risk that counts are not attended and inventory existence is overstated...", wordCount: 920, submittedOn: "2026-09-12", dueOn: "2026-09-19", status: "to-grade", graderId: "st-hana", marks: null, maxMarks: 20, plagiarism: { similarity: 5, flagged: false } },
  { from: ["co-aa-dec26-eve", 1], kind: "descriptive", title: "Audit risk scenario · Sunflower Co", paper: "AA", cohortId: "co-aa-dec26-eve", rubricId: "rb-aa-cr", question: "Describe eight audit risks and the auditor's response to each.", answerExcerpt: "The new ERP system went live in March, so there is a risk of data loss on migration...", wordCount: 860, submittedOn: "2026-09-11", dueOn: "2026-09-19", status: "graded", graderId: "st-hana", marks: 15, maxMarks: 20, feedback: "Well applied risks. Responses should be more specific than 'discuss with management'.", plagiarism: { similarity: 7, flagged: false } },
  { from: ["co-fm-fast-dec26", 0], kind: "descriptive", title: "Investment appraisal with inflation", paper: "FM", cohortId: "co-fm-fast-dec26", rubricId: "rb-fm-cr", question: "Calculate the nominal NPV and advise whether the project should go ahead.", answerExcerpt: "Sales revenue inflated at 4% and variable costs at 5%. Tax allowable depreciation on a reducing balance...", wordCount: 640, submittedOn: "2026-09-13", dueOn: "2026-09-18", status: "to-grade", graderId: "st-tomas", marks: null, maxMarks: 20, plagiarism: { similarity: 3, flagged: false } },
  { from: ["co-sbr-mar27-wkd", 0], kind: "descriptive", title: "SBR ethics question · loan reclassification", paper: "SBR", cohortId: "co-sbr-mar27-wkd", rubricId: "rb-sbr-cr", question: "Discuss the ethical issues in the finance director's proposal.", answerExcerpt: "Reclassifying the loan as equity would breach IAS 32, and the pressure from the finance director is an intimidation threat...", wordCount: 720, submittedOn: "2026-09-12", dueOn: "2026-09-19", status: "to-grade", graderId: "st-marcus", marks: null, maxMarks: 20, plagiarism: { similarity: 12, flagged: false } },
  { from: ["co-bw-2025-s3", 2], kind: "assignment", title: "Company Law overlap assignment", paper: "LW", cohortId: "co-bw-2025-s3", rubricId: "rb-assignment", question: "Compare the rules on share capital maintenance in the LW syllabus with your Company Law subject.", answerExcerpt: "Both require distributions to be made only from distributable profits...", wordCount: 1040, submittedOn: "2026-09-08", dueOn: "2026-09-15", status: "in-progress", graderId: "st-vikram", marks: null, maxMarks: 100, plagiarism: { similarity: 14, flagged: false } },
];

export const evaluationQueue: EvaluationItem[] = evalSeeds.map(({ from, ...rest }, i) => ({
  ...rest,
  id: `ev-${String(i + 1).padStart(3, "0")}`,
  studentId: pickStudent(from[0], from[1]),
}));

export function evaluationsForGrader(staffId: string) {
  return evaluationQueue.filter((e) => e.graderId === staffId);
}

export const reattemptRequests: ReattemptRequest[] = [
  { id: "rt-01", studentId: pickStudent("co-fr-dec26-wkd", 5), paper: "FR", title: "Group accounts test", assessmentId: "a-fr-groups", attemptsUsed: 2, attemptsAllowed: 2, lastScore: 43, reason: "Internet dropped during attempt 2, proctoring log shows a 9-minute disconnection.", requestedOn: "2026-09-12", status: "pending" },
  { id: "rt-02", studentId: pickStudent("co-pm-dec26-rev", 3), paper: "PM", title: "Budgeting and standard costing check", assessmentId: "a-pm-budgeting", attemptsUsed: 1, attemptsAllowed: 1, lastScore: 35, reason: "Was unwell on the day, medical note uploaded.", requestedOn: "2026-09-11", status: "pending" },
  { id: "rt-03", studentId: pickStudent("co-fr-dec26-eve", 1), paper: "FR", title: "Group accounts test", assessmentId: "a-fr-groups", attemptsUsed: 2, attemptsAllowed: 2, lastScore: 47, reason: "Requesting a third attempt after completing the remedial goodwill workspace.", requestedOn: "2026-09-08", status: "approved", decidedBy: "st-marcus", decidedOn: "2026-09-09" },
  { id: "rt-04", studentId: pickStudent("co-aa-dec26-eve", 4), paper: "AA", title: "Audit risk scenario · Sunflower Co", attemptsUsed: 1, attemptsAllowed: 1, lastScore: 38, reason: "Submitted the wrong file.", requestedOn: "2026-09-05", status: "declined", decidedBy: "st-hana", decidedOn: "2026-09-06" },
  { id: "rt-05", studentId: pickStudent("co-fr-mar27-reat", 1), paper: "FR", title: "FR progress test 2", attemptsUsed: 1, attemptsAllowed: 1, lastScore: 41, reason: "Joined the reattempt cohort after the test window closed.", requestedOn: "2026-09-13", status: "pending" },
];

export const reEvaluationRequests: ReEvaluationRequest[] = [
  { id: "re-01", studentId: evaluationQueue[3].studentId, evaluationId: evaluationQueue[3].id, paper: "FR", title: "FR progress test 2 · Question 3", originalMarks: 9, maxMarks: 20, reason: "I referred to gearing in paragraph 2 but it was not credited.", requestedOn: "2026-09-14", status: "open", panelIds: ["st-marcus", "st-hana"] },
  { id: "re-02", studentId: evaluationQueue[7].studentId, evaluationId: evaluationQueue[7].id, paper: "PM", title: "Variance analysis report", originalMarks: 11, maxMarks: 20, reason: "Planning variance discussion was marked as missing but is in the appendix.", requestedOn: "2026-09-08", status: "revised", panelIds: ["st-farah", "st-marcus"], revisedMarks: 13 },
  { id: "re-03", studentId: evaluationQueue[9].studentId, evaluationId: evaluationQueue[9].id, paper: "AA", title: "Audit risk scenario · Sunflower Co", originalMarks: 15, maxMarks: 20, reason: "Asking for a second marker on responses to risk.", requestedOn: "2026-09-13", status: "under-review", panelIds: ["st-hana", "st-marcus"] },
];

/* ------------------------------------------------------------------------------------------
 * Paper-level analytics and weak topics
 * ---------------------------------------------------------------------------------------- */

function buildAnalytics(): PaperAnalytics[] {
  const rng = createRng(909);
  const base: Partial<Record<PaperCode, [number, number]>> = { FR: [61, 312], PM: [55, 188], AA: [63, 204], FM: [58, 176], TX: [64, 142], FA: [66, 286], LW: [67, 231], MA: [65, 198], BT: [71, 264], SBR: [57, 74] };
  return (Object.keys(base) as PaperCode[]).map((paper) => {
    const [avg, attempts] = base[paper]!;
    const p = paperByCode(paper)!;
    const byArea = p.syllabusAreas.map((a) => ({ area: a.code, title: a.title, avg: Math.max(35, Math.min(85, avg + rng.int(-12, 10))) }));
    const distribution = [0, 1, 3, 7, 12, 19, 24, 18, 11, 5].map((v) => Math.round((v * attempts) / 100 + rng.int(0, 2)));
    const trend = Array.from({ length: 6 }, (_, i) => Math.max(40, avg - 8 + i * 2 + rng.int(-2, 2)));
    return {
      paper,
      attempts,
      avgScore: avg,
      passRate: Math.min(92, Math.round(avg * 1.08 + rng.int(-4, 4))),
      medianTimeMins: Math.round(p.durationMins * (0.82 + rng.int(0, 12) / 100)),
      byArea,
      distribution,
      trend,
      hardestQuestionIds: bankQuestions
        .filter((q) => q.paper === paper && q.facilityIndex !== null)
        .sort((a, b) => (a.facilityIndex ?? 1) - (b.facilityIndex ?? 1))
        .slice(0, 3)
        .map((q) => q.id),
    };
  });
}

export const paperAnalytics: PaperAnalytics[] = buildAnalytics();

export function analyticsForPaper(paper: PaperCode) {
  return paperAnalytics.find((a) => a.paper === paper);
}

export const cohortWeakTopics: CohortWeakTopic[] = [
  {
    cohortId: "co-fr-dec26-wkd",
    paper: "FR",
    topics: [
      { area: "D", topic: "Unrealised profit on intra-group inventory", avgScore: 42, studentsBelow50: 17, recommendation: "Assign the goodwill and consolidation workspaces, then the group accounts test retake.", contentId: "ct-fr-03" },
      { area: "C", topic: "Interpretation linked to the scenario", avgScore: 47, studentsBelow50: 14, recommendation: "Ratio analysis practice activity plus the Jun 2026 examiner report notes.", contentId: "ct-fr-06" },
      { area: "B", topic: "IFRS 16 sale and leaseback", avgScore: 51, studentsBelow50: 11, recommendation: "Rewatch the IFRS 16 video from 18 minutes.", contentId: "ct-fr-04" },
    ],
  },
  {
    cohortId: "co-fr-dec26-eve",
    paper: "FR",
    topics: [
      { area: "D", topic: "Statement of cash flows", avgScore: 45, studentsBelow50: 12, recommendation: "Cash flows video once review is complete, and question set 4.", contentId: "ct-fr-11" },
      { area: "D", topic: "Associates and the equity method", avgScore: 52, studentsBelow50: 9, recommendation: "Group accounts revision notes, section 4.", contentId: "ct-fr-08" },
    ],
  },
  {
    cohortId: "co-pm-dec26-rev",
    paper: "PM",
    topics: [
      { area: "C", topic: "Mix and yield variances", avgScore: 38, studentsBelow50: 15, recommendation: "Mix and yield video after review, then a 10-question drill.", contentId: "ct-pm-01" },
      { area: "B", topic: "Relevant costing", avgScore: 46, studentsBelow50: 10, recommendation: "Relevant costing practice set.", contentId: "ct-pm-03" },
      { area: "D", topic: "Section C written discussion", avgScore: 44, studentsBelow50: 13, recommendation: "Transfer pricing model answer and the examiner report notes.", contentId: "ct-pm-05" },
    ],
  },
  {
    cohortId: "co-aa-dec26-eve",
    paper: "AA",
    topics: [
      { area: "C", topic: "Tests of control versus substantive procedures", avgScore: 48, studentsBelow50: 13, recommendation: "Sales cycle controls notes, section 3.", contentId: "ct-aa-02" },
      { area: "E", topic: "Modified opinions", avgScore: 53, studentsBelow50: 8, recommendation: "Audit reports revision notes once published.", contentId: "ct-aa-04" },
    ],
  },
  {
    cohortId: "co-fm-fast-dec26",
    paper: "FM",
    topics: [
      { area: "D", topic: "Tax-allowable depreciation timing", avgScore: 43, studentsBelow50: 11, recommendation: "NPV with inflation and tax video, then the diagnostic retake.", contentId: "ct-fm-01" },
      { area: "E", topic: "WACC with market values", avgScore: 50, studentsBelow50: 8, recommendation: "Cost of capital revision notes.", contentId: "ct-fm-03" },
    ],
  },
  {
    cohortId: "co-sbr-mar27-wkd",
    paper: "SBR",
    topics: [{ area: "A", topic: "Applying ethics to the reporting issue", avgScore: 49, studentsBelow50: 7, recommendation: "Ethical issues model answer once reviewed.", contentId: "ct-sbr-01" }],
  },
  {
    cohortId: "co-bw-2025-s3",
    paper: "FA",
    topics: [
      { area: "E", topic: "Suspense accounts and error correction", avgScore: 51, studentsBelow50: 24, recommendation: "Trial balance practice set before booking the FA exam.", contentId: "ct-fa-02" },
      { area: "G", topic: "Simple consolidation", avgScore: 47, studentsBelow50: 29, recommendation: "Brightwater Semester 3 bridging notes.", contentId: "ct-fa-04" },
    ],
  },
  {
    cohortId: "co-cl-2025-s3",
    paper: "FA",
    topics: [{ area: "D", topic: "Irrecoverable debts and allowances", avgScore: 49, studentsBelow50: 18, recommendation: "Accruals and prepayments video, then the FA mock exam.", contentId: "ct-fa-01" }],
  },
];
