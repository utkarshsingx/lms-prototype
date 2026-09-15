import {
  FileText,
  FolderPlus,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { courseById, type LessonType } from "@/lib/data";
import { paperByCode, type ContentType, type PaperCode } from "@/lib/data/acca";
import { TYPE_ICONS } from "./shared";

/* Local, editable picture of a paper's structure: what the content studio creates into. */

export type OutlineLesson = { id: string; title: string; type: LessonType; minutes: number; area?: string; subjects?: string[] };
export type OutlineModule = { id: string; title: string; summary: string; areas: string[]; lessons: OutlineLesson[] };
export type PaperOutline = {
  id: string;
  code: PaperCode;
  title: string;
  /** Builder route slug; null for a paper created in this session. */
  slug: string | null;
  courseId: string;
  status: "published" | "in_review" | "draft";
  edition: string;
  modules: OutlineModule[];
};

export function outlineFromCourse(code: PaperCode): PaperOutline | null {
  const paper = paperByCode(code);
  const course = paper ? courseById(paper.courseId) : undefined;
  if (!paper || !course) return null;
  return {
    id: `ol-${code.toLowerCase()}`,
    code,
    title: course.title,
    slug: course.slug,
    courseId: course.id,
    status: course.status === "in_review" ? "in_review" : course.status === "draft" ? "draft" : "published",
    edition: "Full paper course · Sep 2026 to Aug 2027 syllabus",
    modules: course.modules.map((m, i) => ({
      id: m.id,
      title: m.title,
      summary: m.summary,
      areas: [guessArea(code, m.title, i, course.modules.length)],
      lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, minutes: l.minutes })),
    })),
  };
}

export type CreateKind = "paper" | "module" | "lesson" | ContentType;

export const CREATE_STRUCTURE: { kind: CreateKind; label: string; sub: string; icon: LucideIcon }[] = [
  { kind: "paper", label: "Create paper", sub: "A paper course or edition, outlined from its syllabus areas", icon: FolderPlus },
  { kind: "module", label: "Create module", sub: "Add a module to one of your papers", icon: Layers },
  { kind: "lesson", label: "Create lesson", sub: "Video, reading, quiz, CBE workspace or live class", icon: FileText },
];

export const CREATE_CONTENT: { kind: ContentType; label: string; sub: string; icon: LucideIcon }[] = [
  { kind: "video", label: "Upload videos", sub: "MP4 or MOV, captioned after upload", icon: TYPE_ICONS.video },
  { kind: "study-material", label: "Upload study material", sub: "Notes, slides, worked examples", icon: TYPE_ICONS["study-material"] },
  { kind: "transcript", label: "Add transcripts", sub: "VTT, SRT or text for a lesson video", icon: TYPE_ICONS.transcript },
  { kind: "examiner-report", label: "Add examiner reports", sub: "Session notes paraphrased for learners", icon: TYPE_ICONS["examiner-report"] },
  { kind: "model-answer", label: "Add model answers", sub: "Linked to a question bank question", icon: TYPE_ICONS["model-answer"] },
  { kind: "revision-notes", label: "Create revision notes", sub: "Short notes per syllabus area", icon: TYPE_ICONS["revision-notes"] },
  { kind: "practice-activity", label: "Create practice activities", sub: "Question sets drawn from the bank", icon: TYPE_ICONS["practice-activity"] },
];

export const LESSON_TYPE_OPTIONS: { value: LessonType; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "article", label: "Reading" },
  { value: "pdf", label: "PDF" },
  { value: "slides", label: "Slides" },
  { value: "quiz", label: "Quiz" },
  { value: "assignment", label: "Assignment" },
  { value: "lab", label: "CBE workspace" },
  { value: "live", label: "Live class" },
];

const STOP = new Set(["and", "the", "of", "for", "in", "a", "to", "exam", "technique", "current", "issues", "range", "entities", "changes", "potential"]);
const SYNONYMS: Record<string, string[]> = {
  group: ["prepa", "group", "conso"],
  inter: ["analy", "inter"],
  singl: ["accou", "trans"],
  ethic: ["ethic", "funda"],
};

function stems(text: string) {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.slice(0, 5));
}

/**
 * Best-matching syllabus area for a module title (synonym hits weigh double, so "Group accounts"
 * lands on preparation of financial statements). Falls back to the module's position.
 */
export function guessArea(code: PaperCode, moduleTitle: string, index: number, total = 0) {
  const areas = paperByCode(code)?.syllabusAreas ?? [];
  if (areas.length === 0) return "A";
  const direct = stems(moduleTitle);
  const synonyms = direct.flatMap((w) => SYNONYMS[w] ?? []);
  let best = -1;
  let bestScore = 0;
  areas.forEach((a, i) => {
    const target = stems(a.title);
    const score =
      direct.filter((w) => target.includes(w)).length + 2 * synonyms.filter((w) => target.includes(w)).length;
    if (score > bestScore) {
      best = i;
      bestScore = score;
    }
  });
  if (best >= 0) return areas[best].code;
  const last = total > 0 && index === total - 1;
  return areas[last ? areas.length - 1 : Math.min(index, areas.length - 1)].code;
}
