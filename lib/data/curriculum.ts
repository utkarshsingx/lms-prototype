import type { Lesson, LessonType, Module } from "./types";

/* Curricula are written as titles only. Type, length and completion state are
   derived here so every course in the catalogue has a full, consistent tree
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

/** Type is inferred from the lesson title where it is obvious, else cycled. */
function inferType(title: string, index: number, isLast: boolean): LessonType {
  const t = title.toLowerCase();
  if (t.startsWith("quiz") || t.includes("knowledge check")) return "quiz";
  if (t.startsWith("lab") || t.includes("hands-on") || t.includes("workshop"))
    return "lab";
  if (t.includes("assignment") || t.includes("submit") || t.includes("brief"))
    return "assignment";
  if (t.includes("live") || t.includes("office hours")) return "live";
  if (t.includes("reference") || t.includes("cheat sheet") || t.includes("handbook"))
    return "pdf";
  if (t.includes("deck") || t.includes("slides")) return "slides";
  if (t.includes("simulation") || t.includes("scenario")) return "scorm";
  if (isLast) return "quiz";
  const cycle: LessonType[] = ["video", "video", "article", "video", "slides"];
  return cycle[index % cycle.length];
}

const MINUTES: Record<LessonType, [number, number]> = {
  video: [6, 22],
  article: [4, 12],
  pdf: [5, 15],
  slides: [8, 18],
  scorm: [15, 35],
  xapi: [12, 30],
  quiz: [8, 15],
  assignment: [45, 120],
  live: [45, 60],
  lab: [20, 50],
};

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
      const type = inferType(lt, li, li === lessons.length - 1);
      const [lo, hi] = MINUTES[type];
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
  live: "Live session",
  lab: "Lab",
};
