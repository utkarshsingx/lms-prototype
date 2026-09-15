import type { Lesson, LessonType, Module } from "./types";

/* Curricula are written as titles only. Type, length and completion state are
   derived here so every paper in the catalogue has a full, consistent tree
   without 2,000 lines of hand-written lesson objects. */

export type ModuleSpec = [title: string, summary: string, lessons: string[]];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** A title prefix fixes the lesson type. Prefixes only, never substrings:
 *  "delivery" must not become a live class because it contains "live". */
const PREFIX_TYPES: [prefix: string, type: LessonType][] = [
  ["workspace:", "lab"],
  ["live class:", "live"],
  ["mock exam", "quiz"],
  ["quiz", "quiz"],
  ["final assessment:", "quiz"],
  ["case study:", "scorm"],
  ["scenario:", "scorm"],
  ["interactive:", "xapi"],
  ["reference:", "pdf"],
  ["assignment:", "assignment"],
  ["reading:", "article"],
  ["slides:", "slides"],
];

/** Type comes from the title prefix where there is one, else it is cycled. */
export function inferLessonType(
  title: string,
  index: number,
  isLast: boolean,
): LessonType {
  const t = title.trim().toLowerCase();
  const hit = PREFIX_TYPES.find(([prefix]) => t.startsWith(prefix));
  if (hit) return hit[1];
  if (isLast) return "quiz";
  const cycle: LessonType[] = ["video", "video", "article", "video", "slides"];
  return cycle[index % cycle.length];
}

const MINUTES: Record<LessonType, [number, number]> = {
  video: [8, 24],
  article: [6, 15],
  pdf: [5, 15],
  slides: [10, 20],
  scorm: [20, 40],
  xapi: [12, 30],
  quiz: [10, 20],
  assignment: [60, 120],
  live: [90, 120],
  lab: [25, 50],
};

/** Mock exam lessons are timed sections, far longer than a topic quiz. */
const MOCK_MINUTES: [number, number] = [60, 90];

export function buildModules(
  courseId: string,
  specs: ModuleSpec[],
  progress = 0,
): Module[] {
  const flat: { m: number; l: number }[] = [];
  specs.forEach((s, m) => s[2].forEach((_, l) => flat.push({ m, l })));
  const done = Math.round((progress / 100) * flat.length);

  let counter = 0;
  return specs.map(([title, summary, lessons], mi) => ({
    id: `${courseId}-m${mi + 1}`,
    title,
    summary,
    lessons: lessons.map((lt, li): Lesson => {
      const idx = counter++;
      const type = inferLessonType(lt, li, li === lessons.length - 1);
      const [lo, hi] = lt.toLowerCase().startsWith("mock exam")
        ? MOCK_MINUTES
        : MINUTES[type];
      const minutes = lo + (hash(courseId + lt) % (hi - lo + 1));
      const state: Lesson["state"] =
        idx < done ? "completed" : idx === done && done > 0 ? "in_progress" : "not_started";
      return {
        id: `${courseId}-m${mi + 1}-l${li + 1}`,
        title: lt,
        type,
        minutes,
        state,
        preview: mi === 0 && li < 2,
        packageMeta:
          type === "scorm" || type === "xapi"
            ? {
                version: type === "scorm" ? "SCORM 2004 4th ed." : "xAPI 1.0.3",
                size: `${18 + (hash(lt) % 40)}.${hash(lt) % 9} MB`,
                completionRule:
                  type === "scorm"
                    ? "cmi.completion_status = completed"
                    : "verb: http://adlnet.gov/expapi/verbs/completed",
              }
            : undefined,
      };
    }),
  }));
}

export const lessonTypeLabel: Record<LessonType, string> = {
  video: "Video",
  article: "Reading",
  pdf: "PDF",
  slides: "Slides",
  scorm: "SCORM",
  xapi: "xAPI",
  quiz: "Quiz",
  assignment: "Assignment",
  live: "Live class",
  lab: "Workspace",
};
