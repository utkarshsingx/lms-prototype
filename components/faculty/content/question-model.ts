import {
  APPLIED_SKILLS,
  bankQuestions,
  type BankQuestion,
  type BankQuestionType,
  type PaperCode,
} from "@/lib/data/acca";
import type { StatusTone } from "@/components/ui/status";

/* Local, editable picture of a bank question: the data record plus what the authoring drawers write. */

export type MarkingPoint = { id: string; text: string; marks: number };
export type Requirement = { id: string; label: string; text: string; marks: number };

export type LocalQuestion = BankQuestion & {
  options?: string[];
  correct?: number;
  tolerance?: string;
  scenario?: string;
  requirements?: Requirement[];
  professionalMarks?: number;
  professionalSkill?: string;
  guide?: MarkingPoint[];
  rubricId?: string;
  explanation?: string;
};

export const TYPE_SHORT: Record<BankQuestionType, string> = {
  OT: "OT",
  MTQ: "MTQ",
  CR: "CR",
  number: "Number",
};

export const PROFESSIONAL_SKILLS = [
  "Analysis and evaluation",
  "Professional scepticism and judgement",
  "Commercial acumen",
  "Communication",
];

/** Marks a constructed-response question usually carries on this paper. */
export function expectedCrMarks(paper: PaperCode): number[] {
  if (paper === "SBR") return [20, 25, 30];
  if (paper === "SBL") return [50, 25];
  if ((APPLIED_SKILLS as readonly string[]).includes(paper)) return paper === "TX" ? [10, 15] : [20];
  return [10, 15];
}

export function needsGuide(type: BankQuestionType) {
  return type === "CR" || type === "MTQ";
}

export function guideTotal(guide?: MarkingPoint[]) {
  return (guide ?? []).reduce((n, p) => n + (Number.isFinite(p.marks) ? p.marks : 0), 0);
}

/**
 * Reads marking points out of an answer key written as prose:
 * "Up to 5 marks for ratios, up to 13 for analysis of profitability, liquidity and gearing, 2 for a conclusion."
 * Returns null when the key does not break its marks down.
 */
export function parseGuide(answerKey: string, marks: number): MarkingPoint[] | null {
  const points: MarkingPoint[] = [];
  const text = answerKey.trim().replace(/\.$/, "");
  const re = /(?:^|,\s*)(?:up to\s+)?(\d+)\s*(?:marks?\s+)?for\s+(.+?)(?=,\s*(?:up to\s+)?\d+\s*(?:marks?\s+)?(?:for|professional)\b|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    points.push({ id: `mp-${points.length + 1}`, text: capitalise(m[2].trim()), marks: Number(m[1]) });
  }
  const pro = /(\d+)\s+professional marks?/i.exec(text);
  if (pro) points.push({ id: `mp-${points.length + 1}`, text: "Professional marks", marks: Number(pro[1]) });
  if (points.length === 0) return null;
  return guideTotal(points) === marks ? points : null;
}

/** Suggested marking points from a key that lists what earns marks without the numbers. */
export function suggestPoints(answerKey: string): MarkingPoint[] {
  const body = answerKey
    .trim()
    .replace(/\.$/, "")
    .replace(/^marks for\s+/i, "")
    .replace(/,?\s*per rubric$/i, "");
  return body
    .split(/,\s*(?:and\s+)?|\s+and\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((t, i) => ({ id: `mp-${i + 1}`, text: capitalise(t), marks: 0 }));
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export type KeyState = "set" | "complete" | "needs-points" | "missing";

export function keyState(q: LocalQuestion): KeyState {
  if (!q.answerKey.trim()) return "missing";
  if (!needsGuide(q.type)) return "set";
  return q.guide && guideTotal(q.guide) === q.marks ? "complete" : "needs-points";
}

export const KEY_STATE: Record<KeyState, { label: string; tone: StatusTone; order: number }> = {
  missing: { label: "No answer key", tone: "rose", order: 0 },
  "needs-points": { label: "Needs marking points", tone: "amber", order: 1 },
  set: { label: "Answer key set", tone: "jade", order: 2 },
  complete: { label: "Marking guide complete", tone: "jade", order: 3 },
};

export function seedQuestions(): LocalQuestion[] {
  return bankQuestions.map((q) => {
    const guide = needsGuide(q.type) ? (parseGuide(q.answerKey, q.marks) ?? undefined) : undefined;
    const pro = guide?.find((p) => p.text === "Professional marks")?.marks ?? 0;
    return {
      ...q,
      guide,
      professionalMarks: pro || undefined,
      requirements: needsGuide(q.type) ? [{ id: "rq-1", label: "(a)", text: q.stem, marks: q.marks - pro }] : undefined,
    };
  });
}

/** Next id in the paper's sequence, e.g. q-fr-009. */
export function nextQuestionId(questions: { id: string }[], paper: PaperCode) {
  const prefix = `q-${paper.toLowerCase()}-`;
  const max = questions
    .filter((q) => q.id.startsWith(prefix))
    .reduce((n, q) => Math.max(n, Number(q.id.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(3, "0")}`;
}

export function answerKeyFromGuide(guide: MarkingPoint[]) {
  return guide
    .filter((p) => p.text.trim())
    .map((p) => `${p.marks} ${p.marks === 1 ? "mark" : "marks"} for ${p.text.trim().charAt(0).toLowerCase()}${p.text.trim().slice(1)}`)
    .join(", ");
}
