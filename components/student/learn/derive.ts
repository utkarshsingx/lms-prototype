import { courseById, type Course, type Lesson, type LessonState, type Module } from "@/lib/data";
import {
  ACCA_TODAY,
  PAPER_CODES,
  STRATEGIC_OPTIONS,
  PAPER_STATUS_LABELS,
  accaPapers,
  bankQuestions,
  classesForStudent,
  cohortById,
  cohortWeakTopics,
  contentById,
  daysBetween,
  doubtSessions,
  epsm,
  examSessionById,
  formatAccaDate,
  formatINR,
  liveClasses,
  mentoringSessions,
  paperByCode,
  paperName,
  roadmapForUniversity,
  staffName,
  syllabusAreaTitle,
  universityCalendarEvents,
  type LiveClass,
  type PaperCode,
  type PaperStatus,
  type Student,
} from "@/lib/data/acca";
import type { StatusTone } from "@/components/ui/status";

/* The prototype's clock. Dates come from ACCA_TODAY; the time of day is fixed so
   "join opens 15 minutes before" behaves the same for every viewer. */
export const DEMO_NOW = `${ACCA_TODAY}T13:50`;

export type LearnCode = PaperCode | "EPSM";

export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

export function plural(n: number, word: string, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

/** Minutes from `a` to `b`, both "YYYY-MM-DDTHH:MM". */
export function minutesBetween(a: string, b: string) {
  const days = daysBetween(a.slice(0, 10), b.slice(0, 10));
  const mins = (iso: string) => (iso.length > 10 ? Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16)) : 0);
  return days * 1440 + mins(b) - mins(a);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function weekdayIndex(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** "Sat 19 Sep". */
export function dayLabel(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${WEEKDAYS[weekdayIndex(iso)]} ${d} ${MONTHS_LONG[m - 1].slice(0, 3)}`;
}

/** "Saturday 19 September". */
export function longDayLabel(iso: string) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${WEEKDAYS_LONG[weekdayIndex(iso)]} ${d} ${MONTHS_LONG[m - 1]}`;
}

/** "in 21 days", "tomorrow", "today", "3 days ago". */
export function relativeDays(iso: string) {
  const n = daysBetween(ACCA_TODAY, iso.slice(0, 10));
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

/* ------------------------------------------------------------------ papers */

export type PaperGroupId = "now" | "next" | "done" | "later";

export type PaperEntry = {
  code: LearnCode;
  name: string;
  levelLabel: string;
  status: PaperStatus;
  statusLabel: string;
  group: PaperGroupId;
  progress: number;
  course: Course | undefined;
  areas: { code: string; title: string }[];
  /** One line about the exam: "Booked Dec 2026", "Passed Mar 2026 · 58%". */
  examLine: string;
  semester?: string;
  readiness?: number;
};

const NOW_ORDER: Partial<Record<PaperStatus, number>> = { current: 0, failed: 1, "in-progress": 2, "results-pending": 3 };

export function courseForCode(code: LearnCode) {
  if (code === "EPSM") return courseById(epsm.courseId);
  const p = paperByCode(code);
  return p ? courseById(p.courseId) : undefined;
}

export function semesterFor(s: Student, code: LearnCode): string | undefined {
  if (s.type !== "undergraduate" || !s.universityId || code === "EPSM") return undefined;
  const stages = roadmapForUniversity(s.universityId);
  const study = stages.find((r) => r.papers.includes(code));
  const exam = stages.find((r) => r.examWindowPapers.includes(code));
  if (!study && STRATEGIC_OPTIONS.includes(code)) return "After graduation";
  if (!study) return exam ? `${exam.label} exam` : undefined;
  if (exam && exam.id !== study.id) return `${study.label} · exam ${exam.label}`;
  return study.label;
}

function examLine(s: Student, code: PaperCode) {
  const p = s.papers[code];
  const last = p.attempts[p.attempts.length - 1];
  const booking = s.examBookings.find((b) => b.paper === code && (b.status === "booked" || b.status === "planned"));
  switch (p.status) {
    case "exempt": {
      const ex = s.exemptions.find((e) => e.paper === code);
      return ex?.decidedOn ? `Exempt · ACCA-approved ${formatAccaDate(ex.decidedOn).slice(3)}` : "Exempt";
    }
    case "passed":
      return last ? `Passed ${last.label} · ${last.score}%` : "Passed";
    case "failed":
      return last ? `Failed ${last.label} · ${last.score}%` : "Failed";
    case "current":
    case "in-progress":
      if (booking?.status === "booked") return `Exam booked · ${booking.entryWindow === "on-demand" ? formatAccaDate(booking.date) : booking.label}`;
      return p.plannedLabel ? `Exam planned · ${p.plannedLabel}` : "Exam not booked";
    case "results-pending":
      return "Results pending";
    case "upcoming":
      return p.plannedLabel ? `Planned · ${p.plannedLabel}` : "Planned";
    default:
      return code === "SBL" || code === "SBR" ? "After Applied Skills" : "Option paper · choose two";
  }
}

export function paperEntries(s: Student): PaperEntry[] {
  const list: PaperEntry[] = accaPapers.map((paper) => {
    const p = s.papers[paper.code];
    const group: PaperGroupId =
      NOW_ORDER[p.status] != null ? "now" : p.status === "upcoming" ? "next" : p.status === "passed" || p.status === "exempt" ? "done" : "later";
    return {
      code: paper.code,
      name: paper.name,
      levelLabel: paper.option ? "Strategic Professional · Option" : paper.levelLabel,
      status: p.status,
      statusLabel: p.status === "failed" && p.plannedLabel ? `Reattempt ${p.plannedLabel}` : PAPER_STATUS_LABELS[p.status],
      group,
      progress: p.progress,
      course: courseById(paper.courseId),
      areas: paper.syllabusAreas,
      examLine: examLine(s, paper.code),
      semester: semesterFor(s, paper.code),
      readiness: s.readiness.byPaper[paper.code],
    };
  });
  const epsmStatus: PaperStatus = s.epsm.status === "complete" ? "passed" : s.epsm.status === "in-progress" ? "in-progress" : "upcoming";
  list.push({
    code: "EPSM",
    name: epsm.name,
    levelLabel: "Required for membership",
    status: epsmStatus,
    statusLabel: s.epsm.status === "complete" ? "Complete" : s.epsm.status === "in-progress" ? "In progress" : "Not started",
    group: s.epsm.status === "complete" ? "done" : s.epsm.status === "in-progress" ? "now" : "next",
    progress: s.epsm.progress,
    course: courseById(epsm.courseId),
    areas: epsm.units.map((u, i) => ({ code: String(i + 1), title: u.title })),
    examLine: s.epsm.completedOn ? `Completed ${formatAccaDate(s.epsm.completedOn)}` : "Recommended before Strategic Professional",
  });
  const rank = (e: PaperEntry) =>
    e.group === "now" ? 0 + (NOW_ORDER[e.status] ?? 0) / 10 : e.group === "next" ? 1 : e.group === "done" ? 2 : 3;
  return list
    .map((e, i) => ({ e, i }))
    .sort((a, b) => rank(a.e) - rank(b.e) || a.i - b.i)
    .map((x) => x.e);
}

/* ------------------------------------------------------------------ lessons */

export type LessonRef = { lesson: Lesson; module: Module; moduleIndex: number; number: number; total: number };

/** Lesson states for this student. The course data carries Anaya's states; any
    other progress is spread across the lessons in order. */
export function lessonModules(s: Student, code: LearnCode): Module[] {
  const course = courseForCode(code);
  if (!course) return [];
  const progress = code === "EPSM" ? s.epsm.progress : s.papers[code].progress;
  if (course.progress != null && course.progress === progress && s.id === "s-anaya") return course.modules;
  const total = course.modules.reduce((n, m) => n + m.lessons.length, 0);
  const done = Math.floor((progress / 100) * total);
  let i = 0;
  return course.modules.map((m) => ({
    ...m,
    lessons: m.lessons.map((l) => {
      const idx = i++;
      const state: LessonState =
        progress >= 100 || idx < done ? "completed" : idx === done && progress > 0 ? "in_progress" : "not_started";
      return { ...l, state };
    }),
  }));
}

export function nextLesson(s: Student, code: LearnCode): LessonRef | undefined {
  const modules = lessonModules(s, code);
  const flat = modules.flatMap((m, mi) => m.lessons.map((l) => ({ lesson: l, module: m, moduleIndex: mi })));
  if (!flat.length) return undefined;
  const at =
    flat.findIndex((x) => x.lesson.state === "in_progress") >= 0
      ? flat.findIndex((x) => x.lesson.state === "in_progress")
      : flat.findIndex((x) => x.lesson.state === "not_started");
  const idx = at >= 0 ? at : flat.length - 1;
  return { ...flat[idx], number: idx + 1, total: flat.length };
}

export function completedLessons(s: Student, code: LearnCode) {
  return lessonModules(s, code).reduce((n, m) => n + m.lessons.filter((l) => l.state === "completed").length, 0);
}

/** Share of each syllabus area covered, spread around the paper's progress. */
const AREA_FACTORS = [1.45, 1.2, 0.7, 1.05, 0.8, 1.3, 0.9, 1];
export function areaCoverage(progress: number, index: number) {
  if (progress >= 100) return 100;
  return clamp(Math.round(progress * AREA_FACTORS[index % AREA_FACTORS.length]));
}

/* ------------------------------------------------------------------ classes */

export type JoinState = "live" | "later" | "ended" | "cancelled";

export function joinState(c: LiveClass, now = DEMO_NOW): JoinState {
  if (c.status === "cancelled") return "cancelled";
  const toStart = minutesBetween(now, c.start);
  if (toStart <= 15 && toStart > -c.durationMins) return "live";
  return toStart > 15 ? "later" : "ended";
}

/** Classes for the student's own batch or section, soonest first, not yet over. */
export function upcomingClasses(s: Student) {
  return classesForStudent(s.id).filter((c) => c.status !== "completed" && joinState(c) !== "ended");
}

/** Recordings across the student's cohorts: every batch and section shares them. */
export function cohortRecordings(s: Student) {
  return liveClasses
    .filter((c) => s.cohortIds.includes(c.cohortId) && c.recording && c.status === "completed")
    .sort((a, b) => b.start.localeCompare(a.start));
}

export function batchName(c: LiveClass) {
  const cohort = cohortById(c.cohortId);
  return cohort?.sections.find((x) => x.id === c.sectionId)?.name ?? cohort?.name ?? "";
}

/** Runner assessments for mock exams, by paper. */
export const MOCK_RUNNER: Partial<Record<PaperCode, string>> = { FR: "a-fr-mock", PM: "a-pm-mock", FA: "a-fa-mock" };

/** Mock percentile against the cohort, derived from the score. */
export function mockPercentile(score: number) {
  return clamp(Math.round(score * 1.3 - 12), 1, 99);
}

/* ------------------------------------------------------------------ coming up */

export type UpcomingItem = {
  id: string;
  at: string;
  title: string;
  kind: string;
  meta: string;
  href: string;
  tone: StatusTone;
};

export function upcomingFor(s: Student, limit = 6): UpcomingItem[] {
  const out: UpcomingItem[] = [];
  const nextClass = upcomingClasses(s).find((c) => c.status !== "cancelled");
  if (nextClass) {
    out.push({
      id: nextClass.id,
      at: nextClass.start,
      title: `${nextClass.paper} live class · ${nextClass.title}`,
      kind: "Live class",
      meta: `${nextClass.start.slice(11, 16)} IST · ${staffName(nextClass.facultyId)}`,
      href: "/classes",
      tone: "info",
    });
  }
  const doubt = doubtSessions.find((d) => s.cohortIds.includes(d.cohortId) && d.status !== "completed");
  if (doubt) {
    out.push({ id: doubt.id, at: doubt.start, title: doubt.title, kind: "Doubt-clearing", meta: `${doubt.start.slice(11, 16)} IST · ${staffName(doubt.facultyId)}`, href: "/classes", tone: "violet" });
  }
  const mentor = mentoringSessions
    .filter((m) => m.studentId === s.id && m.status === "scheduled" && m.start.slice(0, 10) >= ACCA_TODAY)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  if (mentor) {
    out.push({ id: mentor.id, at: mentor.start, title: `Mentor session with ${staffName(mentor.mentorId)}`, kind: "Mentor session", meta: `${mentor.start.slice(11, 16)} IST · ${mentor.mode}`, href: "/my-mentor", tone: "jade" });
  }
  const fee = s.fees.instalments.find((i) => (i.status === "due" || i.status === "overdue") && daysBetween(ACCA_TODAY, i.dueDate) <= 45);
  if (fee) {
    out.push({ id: `fee-${fee.n}`, at: fee.dueDate, title: `Instalment ${fee.n} due`, kind: "Payment", meta: `${formatINR(fee.amount)} · fee plan`, href: "/payments", tone: fee.status === "overdue" ? "rose" : "amber" });
  }
  const planned = s.examBookings.find((b) => b.status === "planned" && b.entryClosesOn && b.entryClosesOn >= ACCA_TODAY);
  if (planned?.entryClosesOn) {
    const session = planned.sessionId ? examSessionById(planned.sessionId) : undefined;
    out.push({ id: `entry-${planned.id}`, at: planned.entryClosesOn, title: `${session?.label ?? planned.label} ${planned.entryWindow} entry closes`, kind: "Exam entry", meta: `Book ${planned.paper} to keep the ${planned.entryWindow} fee`, href: "/exams", tone: "amber" });
  }
  if (s.universityId) {
    const uni = universityCalendarEvents.find((e) => e.universityId === s.universityId && e.date > ACCA_TODAY && e.kind !== "holiday");
    if (uni) out.push({ id: uni.id, at: uni.date, title: uni.title, kind: "University calendar", meta: uni.endDate ? `Until ${formatAccaDate(uni.endDate)}` : "University", href: "/my-university", tone: "neutral" });
  }
  const mock = s.mocks.filter((m) => m.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date))[0];
  if (mock) {
    out.push({ id: mock.id, at: mock.date, title: mock.title, kind: "Mock exam", meta: `${paperName(mock.paper)} · CBE format`, href: "/mocks", tone: "cta" });
  }
  const exam = s.examBookings.filter((b) => b.status === "booked" && b.date >= ACCA_TODAY).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (exam) {
    out.push({ id: exam.id, at: exam.date, title: `${exam.paper} exam · ${exam.entryWindow === "on-demand" ? "on-demand CBE" : `${exam.label} session`}`, kind: "ACCA exam", meta: exam.centre, href: "/exams", tone: "rose" });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at)).slice(0, limit);
}

/* ------------------------------------------------------------------ readiness */

export const READINESS_TARGET = 70;

export const READINESS_WEIGHTS = [
  { id: "mocks", label: "Mock exam scores", weight: 40 },
  { id: "practice", label: "Practice coverage", weight: 25 },
  { id: "attendance", label: "Attendance", weight: 15 },
  { id: "syllabus", label: "Syllabus completion", weight: 20 },
] as const;

export type ReadinessPart = { id: string; label: string; weight: number; value: number; points: number; note: string };

export function readinessPapers(s: Student) {
  return (Object.keys(s.readiness.byPaper) as PaperCode[]).filter((c) => PAPER_CODES.includes(c));
}

/** Breaks a paper's readiness score into its four drivers. Practice coverage is
    the balancing figure so the parts always add up to the recorded score. */
export function readinessDrivers(s: Student, code: PaperCode): { score: number; parts: ReadinessPart[] } {
  const score = s.readiness.byPaper[code] ?? s.readiness.overall;
  const mockScores = s.mocks.filter((m) => m.paper === code && m.status === "completed" && m.score != null).map((m) => m.score as number);
  const mocks = mockScores.length ? Math.round(mockScores.reduce((a, b) => a + b, 0) / mockScores.length) : clamp(score - 12);
  const attendance = s.attendance.total ? s.attendance.pct : score;
  const syllabus = s.papers[code].progress;
  const fixed = mocks * 0.4 + attendance * 0.15 + syllabus * 0.2;
  const practice = clamp(Math.round((score - fixed) / 0.25));
  const pts = [Math.round(mocks * 0.4), 0, Math.round(attendance * 0.15), Math.round(syllabus * 0.2)];
  pts[1] = Math.max(0, score - pts[0] - pts[2] - pts[3]);
  return {
    score,
    parts: [
      { id: "mocks", label: "Mock exam scores", weight: 40, value: mocks, points: pts[0], note: mockScores.length ? `Average of ${plural(mockScores.length, "mock")} and progress tests` : "No mock sat yet: estimated from quizzes" },
      { id: "practice", label: "Practice coverage", weight: 25, value: practice, points: pts[1], note: "Question bank topics attempted with 60% or more" },
      { id: "attendance", label: "Attendance", weight: 15, value: attendance, points: pts[2], note: `${s.attendance.attended} of ${s.attendance.total} live classes attended` },
      { id: "syllabus", label: "Syllabus completion", weight: 20, value: syllabus, points: pts[3], note: "Lessons completed in the paper" },
    ],
  };
}

export type WeakArea = { id: string; paper: PaperCode; area: string; areaTitle: string; topic: string; score: number; recommendation: string; contentId?: string };

export function weakAreasFor(s: Student): WeakArea[] {
  const out: WeakArea[] = [];
  for (const code of readinessPapers(s)) {
    const adj = Math.round(((s.readiness.byPaper[code] ?? 60) - 60) / 2);
    const cohortTopics = cohortWeakTopics.filter((w) => w.paper === code && s.cohortIds.includes(w.cohortId)).flatMap((w) => w.topics);
    if (cohortTopics.length) {
      // The cohort analysis is written for faculty; the student sees what to study.
      cohortTopics.forEach((t) => {
        const item = t.contentId ? contentById(t.contentId) : undefined;
        out.push({
          id: `${code}-${t.area}-${t.topic}`,
          paper: code,
          area: t.area,
          areaTitle: syllabusAreaTitle(code, t.area) ?? "",
          topic: t.topic,
          score: clamp(t.avgScore + adj),
          recommendation: item
            ? `Study "${item.title}", then practise area ${t.area} questions in the question bank.`
            : `Practise area ${t.area} questions in the question bank, then retake the topic test.`,
          contentId: t.contentId,
        });
      });
      continue;
    }
    // No cohort analysis for this paper yet: use the hardest bank questions.
    bankQuestions
      .filter((q) => q.paper === code && q.facilityIndex != null)
      .sort((a, b) => (a.facilityIndex ?? 1) - (b.facilityIndex ?? 1))
      .slice(0, 2)
      .forEach((q) =>
        out.push({ id: `${code}-${q.id}`, paper: code, area: q.syllabusArea, areaTitle: syllabusAreaTitle(code, q.syllabusArea) ?? "", topic: q.topic, score: clamp(Math.round((q.facilityIndex ?? 0.5) * 100) + adj - 8), recommendation: `Work through the ${q.topic.toLowerCase()} questions in the question bank, then retake the topic test.` }),
      );
  }
  return out.sort((a, b) => a.score - b.score);
}
