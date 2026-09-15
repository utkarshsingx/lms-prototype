import {
  addDays,
  bankQuestions,
  examSessions,
  paperByCode,
  quizzesAndMocks,
  evaluationRubrics,
  type BankQuestion,
  type EvaluationRubric,
  type PaperCode,
  type QuizOrMock,
} from "@/lib/data/acca";

export type LocalQuiz = Omit<QuizOrMock, "status"> & {
  status: QuizOrMock["status"] | "in-review";
  attemptsAllowed?: number;
  sessionLabel?: string;
};

export type LocalRubric = EvaluationRubric & { status: "published" | "in-review" | "draft" };

export const KIND_LABELS: Record<QuizOrMock["kind"], string> = {
  quiz: "Quiz",
  mock: "Mock exam",
  "progress-test": "Progress test",
};

export function seedQuizzes(): LocalQuiz[] {
  return quizzesAndMocks.map((q) => ({ ...q, attemptsAllowed: q.kind === "mock" ? 1 : 2 }));
}

export function seedRubrics(): LocalRubric[] {
  return evaluationRubrics.map((r) => ({ ...r, status: "published" as const }));
}

/* ------------------------------------------------------------------ mock blueprint */

export type SectionFormat = "OT" | "OT-case" | "MTQ" | "CR";

export type BlueprintRow = {
  id: string;
  section: string;
  format: SectionFormat;
  questions: number;
  marksEach: number;
  areas: string[];
};

export const FORMAT_LABELS: Record<SectionFormat, { label: string; unit: string; units: string }> = {
  OT: { label: "Objective test questions", unit: "OT question", units: "OT questions" },
  "OT-case": { label: "Objective test cases", unit: "OT case", units: "OT cases" },
  MTQ: { label: "Multi-task questions", unit: "MTQ", units: "MTQs" },
  CR: { label: "Constructed-response questions", unit: "CR question", units: "CR questions" },
};

const row = (n: number, section: string, format: SectionFormat, questions: number, marksEach: number, areas: string[]): BlueprintRow => ({
  id: `bp-${n}`,
  section,
  format,
  questions,
  marksEach,
  areas,
});

const CR_AREAS: Partial<Record<PaperCode, string[]>> = {
  FR: ["C", "D"],
  PM: ["B", "C", "D"],
  AA: ["B", "C", "D"],
  FM: ["C", "D", "E"],
  TX: ["B", "E"],
};

/** The ACCA exam structure for the paper, as editable blueprint rows. */
export function blueprintTemplate(paper: PaperCode): BlueprintRow[] {
  const all = (paperByCode(paper)?.syllabusAreas ?? []).map((a) => a.code);
  switch (paper) {
    case "FR":
    case "PM":
    case "AA":
    case "FM":
      return [
        row(1, "Section A", "OT", 15, 2, all),
        row(2, "Section B", "OT-case", 3, 10, all),
        row(3, "Section C", "CR", 2, 20, CR_AREAS[paper] ?? all),
      ];
    case "TX":
      return [
        row(1, "Section A", "OT", 15, 2, all),
        row(2, "Section B", "OT-case", 3, 10, all),
        row(3, "Section C", "CR", 1, 10, ["B"]),
        row(4, "Section C", "CR", 2, 15, ["B", "E"]),
      ];
    case "FA":
      return [row(1, "Section A", "OT", 35, 2, all), row(2, "Section B", "MTQ", 2, 15, ["F", "G"])];
    case "MA":
      return [row(1, "Section A", "OT", 35, 2, all), row(2, "Section B", "MTQ", 3, 10, ["D", "E", "F"])];
    case "LW":
      return [row(1, "Section A", "OT", 25, 2, all), row(2, "Section A", "OT", 20, 1, all), row(3, "Section B", "MTQ", 5, 6, all)];
    case "BT":
      return [row(1, "Section A", "OT", 30, 2, all), row(2, "Section A", "OT", 16, 1, all), row(3, "Section B", "MTQ", 6, 4, all)];
    case "SBR":
      return [
        row(1, "Section A", "CR", 1, 30, ["D"]),
        row(2, "Section A", "CR", 1, 20, ["A"]),
        row(3, "Section B", "CR", 2, 25, ["B", "C", "E", "F"]),
      ];
    case "SBL":
      return [row(1, "Case study", "CR", 1, 100, all)];
    case "ATX":
      return [row(1, "Section A", "CR", 1, 35, all), row(2, "Section A", "CR", 1, 25, all), row(3, "Section B", "CR", 2, 20, all)];
    default:
      return [row(1, "Section A", "CR", 1, 50, all), row(2, "Section B", "CR", 2, 25, all)];
  }
}

export function rowMarks(r: BlueprintRow) {
  return (r.questions || 0) * (r.marksEach || 0);
}

export function blueprintTotal(rows: BlueprintRow[]) {
  return rows.reduce((n, r) => n + rowMarks(r), 0);
}

/** Published bank questions that could fill a blueprint row. */
export function poolFor(paper: PaperCode, r: Pick<BlueprintRow, "format" | "areas">, questions: readonly BankQuestion[] = bankQuestions) {
  const types = r.format === "CR" ? ["CR"] : r.format === "MTQ" ? ["MTQ"] : ["OT", "number"];
  return questions.filter(
    (q) => q.paper === paper && q.status === "published" && types.includes(q.type) && (r.areas.length === 0 || r.areas.includes(q.syllabusArea)),
  );
}

export function describeRow(r: BlueprintRow) {
  const f = FORMAT_LABELS[r.format];
  return `${r.questions} ${r.questions === 1 ? f.unit : f.units}, ${r.marksEach} ${r.marksEach === 1 ? "mark" : "marks"} each`;
}

/** Future exam sessions a mock can prepare learners for. */
export const MOCK_SESSIONS = examSessions.filter((s) => !s.past && (s.status === "entry-open" || s.status === "entry-not-open"));

/** A mock window about three and a half weeks before the exams: a Friday-Saturday for the sample calendar. */
export function defaultWindow(sessionId: string) {
  const s = examSessions.find((x) => x.id === sessionId);
  if (!s) return { opens: "2026-10-24", closes: "2026-10-25" };
  return { opens: addDays(s.examStart, -24), closes: addDays(s.examStart, -23) };
}

/* ------------------------------------------------------------------ rubric marks */

/** Mark range for level `i` (0 = top band) of `levels` bands on a criterion worth `marks`. */
export function bandRange(marks: number, i: number, levels: number) {
  const top = Math.round((marks * (levels - i)) / levels);
  const low = i === levels - 1 ? 0 : Math.round((marks * (levels - i - 1)) / levels) + 1;
  return low >= top ? `${top}` : `${low} to ${top}`;
}

/** A representative mark inside the band, for the preview's sample script. */
export function bandMark(marks: number, i: number, levels: number) {
  const top = Math.round((marks * (levels - i)) / levels);
  const low = i === levels - 1 ? 0 : Math.min(top, Math.round((marks * (levels - i - 1)) / levels) + 1);
  return Math.round((top + low) / 2);
}
