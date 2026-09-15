import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Globe,
  Lock,
  MonitorCheck,
  Play,
  Quote,
  Star,
  Users,
} from "lucide-react";
import type { Course, LessonType } from "@/lib/data";
import {
  assessments,
  courseBySlug,
  courses,
  lessonCount,
  lessonTypeLabel,
  personById,
} from "@/lib/data";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge, Tag, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { LinkButton } from "@/components/ui/button";
import { DataRow } from "@/components/ui/misc";
import { CourseCover, CourseCard, paperCode } from "@/components/course/course-card";
import { LessonBullet } from "@/components/course/lesson-icon";

export async function generateStaticParams() {
  return courses.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = courseBySlug(slug);
  return { title: c?.title ?? "Paper" };
}

/* ACCA exam facts per paper (bible section 5). Session CBEs sit in March,
   June, September and December; Applied Knowledge and LW are on demand. */
type ExamFacts = {
  kind: string;
  duration: string;
  passMark?: string;
  booking: string;
  structure: string[];
  session?: boolean;
};

const APPLIED_SKILLS: string[] = [
  "Section A: 15 objective test questions, 30 marks",
  "Section B: 3 case scenarios of 5 objective test questions each, 30 marks",
  "Section C: 2 constructed response questions of 20 marks each, 40 marks",
];
const OPTIONS: string[] = [
  "Section A: 1 compulsory case question, 50 marks",
  "Section B: 2 compulsory questions of 25 marks each, 50 marks",
];
const ON_DEMAND = "On demand: book any available date at an ACCA CBE centre";
const SESSIONS = "Exam sessions in March, June, September and December";

const EXAMS: Record<string, ExamFacts> = {
  BT: {
    kind: "On-demand CBE",
    duration: "2 hours",
    passMark: "50%",
    booking: ON_DEMAND,
    structure: [
      "Section A: 46 objective test questions, 76 marks",
      "Section B: 6 multi-task questions of 4 marks each, 24 marks",
    ],
  },
  MA: {
    kind: "On-demand CBE",
    duration: "2 hours",
    passMark: "50%",
    booking: ON_DEMAND,
    structure: [
      "Section A: 35 objective test questions of 2 marks each, 70 marks",
      "Section B: 3 multi-task questions of 10 marks each, 30 marks",
    ],
  },
  FA: {
    kind: "On-demand CBE",
    duration: "2 hours",
    passMark: "50%",
    booking: ON_DEMAND,
    structure: [
      "Section A: 35 objective test questions of 2 marks each, 70 marks",
      "Section B: 3 multi-task questions of 10 marks each, 30 marks",
    ],
  },
  LW: {
    kind: "On-demand CBE",
    duration: "2 hours",
    passMark: "50%",
    booking: ON_DEMAND,
    structure: [
      "Section A: 45 objective test questions, 70 marks",
      "Section B: 5 multi-task questions of 6 marks each, 30 marks",
    ],
  },
  PM: { kind: "Session CBE", duration: "3 hours", passMark: "50%", booking: SESSIONS, structure: APPLIED_SKILLS, session: true },
  TX: { kind: "Session CBE", duration: "3 hours", passMark: "50%", booking: SESSIONS, structure: APPLIED_SKILLS, session: true },
  FR: { kind: "Session CBE", duration: "3 hours", passMark: "50%", booking: SESSIONS, structure: APPLIED_SKILLS, session: true },
  AA: { kind: "Session CBE", duration: "3 hours", passMark: "50%", booking: SESSIONS, structure: APPLIED_SKILLS, session: true },
  FM: { kind: "Session CBE", duration: "3 hours", passMark: "50%", booking: SESSIONS, structure: APPLIED_SKILLS, session: true },
  SBL: {
    kind: "Session CBE",
    duration: "4 hours",
    passMark: "50%",
    booking: SESSIONS,
    structure: [
      "One integrated case study with a series of tasks, 100 marks",
      "20 of the 100 marks are for professional skills",
    ],
    session: true,
  },
  SBR: {
    kind: "Session CBE",
    duration: "3 hours 15 minutes",
    passMark: "50%",
    booking: SESSIONS,
    structure: [
      "Section A: 2 compulsory scenario-based questions, 50 marks",
      "Section B: 2 compulsory questions of 25 marks each, 50 marks",
    ],
    session: true,
  },
  AFM: { kind: "Session CBE", duration: "3 hours 15 minutes", passMark: "50%", booking: SESSIONS, structure: OPTIONS, session: true },
  APM: { kind: "Session CBE", duration: "3 hours 15 minutes", passMark: "50%", booking: SESSIONS, structure: OPTIONS, session: true },
  AAA: { kind: "Session CBE", duration: "3 hours 15 minutes", passMark: "50%", booking: SESSIONS, structure: OPTIONS, session: true },
  ATX: {
    kind: "Session CBE",
    duration: "3 hours 15 minutes",
    passMark: "50%",
    booking: SESSIONS,
    structure: [
      "Section A: 2 compulsory questions of 35 and 25 marks",
      "Section B: 2 compulsory questions of 20 marks each",
    ],
    session: true,
  },
  EPSM: {
    kind: "Online module, no exam",
    duration: "Self-paced",
    booking: "No exam booking: complete it online in this workspace",
    structure: [
      "Ethics and Professional Skills Module, completed online",
      "Required for ACCA membership alongside the exams and the Practical Experience Requirement",
    ],
  },
  CBE: {
    kind: "Exam technique course, no ACCA exam",
    duration: "Timed practice at real exam lengths",
    booking: "Use it before any computer-based exam",
    structure: [
      "Practice in the CBE response areas, including the spreadsheet and word processor",
      "Timed mocks run from Mock exams",
    ],
  },
};

const GENERIC_REVIEWS = [
  {
    by: "Kavya Menon",
    role: "Graduate learner · Bengaluru",
    stars: 5,
    text: "The weekend live classes fit around my job, and the recording is in the lesson the same day. I rewatch the exam technique part before every mock.",
  },
  {
    by: "Siddharth Kulkarni",
    role: "B.Com (Hons) with ACCA · Brightwater",
    stars: 5,
    text: "Questions I post on a lesson get a faculty reply the same day, usually with a worked example rather than a page reference.",
  },
];

function reviewsFor(code: string) {
  const third: Record<string, string> = {
    FR: "The goodwill and consolidation workspaces are the reason group accounts finally clicked. Doing the working in a spreadsheet every week made the CBE response area feel normal.",
    PM: "My first PM attempt fell short in Section C. The variance workspace and the revision cohort showed me I was flexing budgets wrongly, and that is fixed now.",
  };
  return [
    ...GENERIC_REVIEWS,
    {
      by: "Ishita Shah",
      role: code === "PM" ? "Reattempt learner · Pune" : "Graduate learner · Pune",
      stars: 4,
      text:
        third[code] ??
        `The ${code} question bank and mocks are close to the real exam. I wanted more past-exam walkthroughs in the last module, but the readiness score showed exactly which areas to fix.`,
    },
  ];
}

const TONES: Tone[] = ["neutral", "brand", "jade", "ember", "amber", "rose", "violet"];
const toneOf = (accent: string): Tone =>
  TONES.includes(accent as Tone) ? (accent as Tone) : "neutral";

const average = (xs: Course[]) =>
  xs.length ? (xs.reduce((n, c) => n + c.rating, 0) / xs.length).toFixed(1) : null;

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();

  const code = paperCode(course);
  const exam = EXAMS[code];
  const instructor = personById(course.instructorId);
  const taught = instructor ? courses.filter((c) => c.instructorId === instructor.id) : [];
  const related = courses
    .filter((c) => c.id !== course.id && c.category === course.category)
    .slice(0, 3);
  // The diagnostic has its own card above the lessons, so it is not listed.
  const courseAssessments = assessments.filter(
    (a) => a.courseId === course.id && a.kind !== "Diagnostic",
  );
  const enrolled = course.progress != null;
  const diagnostic = enrolled
    ? undefined
    : assessments.find((a) => a.courseId === course.id && a.kind === "Diagnostic");
  const totalLessons = lessonCount(course);
  const reviews = reviewsFor(code);

  const typeBreakdown = course.modules
    .flatMap((m) => m.lessons)
    .reduce<Partial<Record<LessonType, number>>>((acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <nav className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-3">
        <Link href="/papers" className="font-medium hover:text-ink">
          Papers
        </Link>
        <span>/</span>
        <span>{course.category}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-10">
        <div className="min-w-0 space-y-9">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-inv px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-ink-inv">
                <span className="size-1.5 rounded-full bg-cta" />
                {code}
              </span>
              <Badge tone={toneOf(course.accent)}>{course.category}</Badge>
              {exam ? <Badge tone="neutral">{exam.kind}</Badge> : null}
              {course.status !== "published" ? (
                <Badge tone="amber">
                  {course.status === "in_review" ? "In review" : "Draft"}
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-[clamp(2rem,1.5rem+2vw,3.1rem)] leading-[1.04] font-extrabold tracking-[var(--display-tracking)] text-ink">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              {course.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-amber text-amber" />
                <span className="font-semibold text-ink tnum">{course.rating}</span>
                <span className="text-ink-3 tnum">
                  ({course.ratings.toLocaleString("en-IN")} ratings)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 tnum">
                <Users className="size-4 text-ink-3" />
                {course.enrolled.toLocaleString("en-IN")} learners
              </span>
              <span className="inline-flex items-center gap-1.5 tnum">
                <Clock className="size-4 text-ink-3" />
                {course.hours} study hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-ink-3" />
                Updated{" "}
                {new Date(course.updated).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  timeZone: "Asia/Kolkata",
                })}
              </span>
            </div>
          </header>

          <section>
            <p className="max-w-2xl text-[15px] leading-[1.75] text-ink-2">
              {course.summary}
            </p>
          </section>

          {course.outcomes.length ? (
            <section>
              <SectionTitle>What you will be able to do</SectionTitle>
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                {course.outcomes.map((o) => (
                  <div key={o} className="flex gap-2.5">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-jade" />
                    <p className="text-[13.5px] leading-relaxed text-ink-2">{o}</p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {diagnostic ? (
            <section>
              <Card className="overflow-hidden">
                <div className="flex flex-col gap-4 bg-surface-inv p-5 sm:flex-row sm:p-6">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-cta text-cta-ink">
                    <Compass className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold tracking-[-0.012em] text-ink-inv">
                      Start {code} with a diagnostic
                    </p>
                    <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-inv/70">
                      It takes about {diagnostic.minutes} minutes and you get one
                      attempt. It places you past the {code} modules you already
                      know, so you start where the paper is new to you. You can
                      also start from module 1.
                    </p>
                    <p className="mt-2 text-[12px] text-ink-inv/55 tnum">
                      {diagnostic.questions.length} questions ·{" "}
                      {course.modules.length} modules · not graded
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
                      <LinkButton href={`/assessments/${diagnostic.id}`}>
                        Start diagnostic <ArrowRight className="size-4" />
                      </LinkButton>
                      <Link
                        href={`/learn/${course.slug}`}
                        className="text-[13px] font-semibold text-ink-inv/80 underline decoration-cta decoration-2 underline-offset-4 hover:text-ink-inv"
                      >
                        Skip it and start from module 1
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          ) : null}

          <section>
            <SectionTitle
              action={
                <span className="text-[12px] text-ink-3 tnum">
                  {course.modules.length} modules · {totalLessons} lessons ·{" "}
                  {course.hours}h
                </span>
              }
            >
              Lessons
            </SectionTitle>
            <Card className="divide-y divide-[var(--line)] overflow-hidden">
              {diagnostic ? (
                <p className="flex items-start gap-2.5 bg-cta-soft px-5 py-3 text-[12.5px] leading-relaxed text-ink-2">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                  <span>
                    Lessons unlock after the diagnostic, which you can attempt
                    once, or as soon as you choose to start from module 1.
                    Preview lessons are open now.
                  </span>
                </p>
              ) : null}
              {course.modules.map((m, mi) => {
                const mins = m.lessons.reduce((n, l) => n + l.minutes, 0);
                const done = m.lessons.filter((l) => l.state === "completed").length;
                return (
                  <details key={m.id} open={mi === 0} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-cta-soft">
                      <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-inv text-[12.5px] font-bold text-ink-inv tnum">
                        {mi + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold tracking-[-0.01em] text-ink">
                          {m.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-3">
                          {m.summary}
                        </p>
                      </div>
                      <span className="hidden shrink-0 text-right text-[11.5px] text-ink-3 tnum sm:block">
                        {m.lessons.length} lessons · {mins} min
                        {enrolled ? (
                          <span className="mt-1 block font-semibold text-jade">
                            {done}/{m.lessons.length} done
                          </span>
                        ) : null}
                      </span>
                      {diagnostic ? (
                        <span className="inline-flex shrink-0 text-ink-3">
                          <Lock className="size-3.5" />
                          <span className="sr-only">Locked</span>
                        </span>
                      ) : null}
                      <svg
                        viewBox="0 0 12 12"
                        className="size-3 shrink-0 text-ink-3 transition-transform group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        aria-hidden
                      >
                        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" />
                      </svg>
                    </summary>
                    <ul className="border-t border-line bg-surface-2/40">
                      {m.lessons.map((l) => (
                        <li
                          key={l.id}
                          className="flex items-center gap-3.5 px-5 py-2.5 sm:pl-[4.25rem]"
                        >
                          <LessonBullet
                            type={l.type}
                            state={diagnostic && !l.preview ? "locked" : l.state}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
                            {l.title}
                          </span>
                          {l.preview && !enrolled ? (
                            <Badge tone="brand">Preview</Badge>
                          ) : null}
                          <span className="hidden shrink-0 text-[11.5px] text-ink-3 sm:inline">
                            {lessonTypeLabel[l.type]}
                          </span>
                          <span className="w-12 shrink-0 text-right text-[11.5px] text-ink-3 tnum">
                            {l.minutes} min
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                );
              })}
            </Card>
          </section>

          {exam ? (
            <section>
              <SectionTitle>The {code} exam</SectionTitle>
              <Card className="overflow-hidden">
                <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
                  {[
                    { label: "Format", value: exam.kind, icon: MonitorCheck },
                    { label: "Duration", value: exam.duration, icon: Clock },
                    { label: "Pass mark", value: exam.passMark ?? "Completion", icon: BadgeCheck },
                    {
                      label: exam.session ? "Next session" : "Booking",
                      value: exam.session ? "Dec 2026" : exam.passMark ? "On demand" : "Not needed",
                      icon: CalendarClock,
                    },
                  ].map((f) => (
                    <div key={f.label} className="min-w-0 bg-surface px-4 py-3.5">
                      <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                        <f.icon className="size-3.5" /> {f.label}
                      </p>
                      <p className="mt-1.5 text-[14px] leading-snug font-bold text-ink">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="border-t border-line px-5 py-4">
                  <ul className="space-y-2">
                    {exam.structure.map((s) => (
                      <li key={s} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-cta" />
                        {s}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 border-t border-line pt-3 text-[12.5px] leading-relaxed text-ink-3">
                    {exam.booking}
                    {exam.session
                      ? ". Dec 2026: standard entry closes 2 Nov 2026, exams 7 to 10 Dec 2026, results 25 Jan 2027."
                      : "."}
                  </p>
                </div>
              </Card>
            </section>
          ) : null}

          {courseAssessments.length ? (
            <section>
              <SectionTitle>Tests and mock exams</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {courseAssessments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.id}`}
                    className="group rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition-[border-color,transform] hover:-translate-y-0.5 hover:border-line-strong"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={a.autoGraded ? "brand" : "violet"}>{a.kind}</Badge>
                      {a.proctored ? <Tag>Proctored</Tag> : null}
                    </div>
                    <p className="mt-2.5 text-[14px] font-bold text-ink decoration-cta decoration-2 underline-offset-4 group-hover:underline">
                      {a.title}
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-ink-3 tnum">
                      {a.questions.length} questions ·{" "}
                      {a.minutes ? `${a.minutes} min · ` : ""}
                      pass at {a.passMark}% · {a.attempts}{" "}
                      {a.attempts === 1 ? "attempt" : "attempts"}
                    </p>
                    <p className="mt-2 text-[12px] text-ink-3">
                      {a.autoGraded
                        ? "Marked automatically on submit"
                        : `Marked by faculty against the ${a.rubricId ? "rubric" : "brief"}`}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle>Faculty</SectionTitle>
            {instructor ? (
              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar name={instructor.name} size="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-bold tracking-[-0.01em] text-ink">
                      {instructor.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-3">{instructor.title}</p>
                    <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-2">
                      {instructor.name.split(" ")[0]} leads {code} on ZSkillup as{" "}
                      {instructor.title.split("·")[0].trim().toLowerCase()}. Live
                      classes, answers to questions posted on lessons and the
                      marking of written work for this paper come from{" "}
                      {instructor.name.split(" ")[0]} and the {code} faculty team.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-ink-3 tnum">
                      <span>
                        <span className="font-bold text-ink">{taught.length}</span>{" "}
                        {taught.length === 1 ? "paper" : "papers"}
                      </span>
                      <span>
                        <span className="font-bold text-ink">
                          {taught.reduce((n, c) => n + c.enrolled, 0).toLocaleString("en-IN")}
                        </span>{" "}
                        learners
                      </span>
                      {average(taught) ? (
                        <span>
                          <span className="font-bold text-ink">{average(taught)}</span>{" "}
                          average rating
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </Card>
            ) : null}
          </section>

          <section>
            <SectionTitle
              action={
                <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
                  <Star className="size-3.5 fill-amber text-amber" />
                  <span className="tnum">
                    {course.rating} from {course.ratings.toLocaleString("en-IN")}
                  </span>
                </span>
              }
            >
              What ACCA students say
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {reviews.map((r) => (
                <Card key={r.by} className="flex flex-col p-4.5">
                  <Quote className="size-4 text-cta" />
                  <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-2">
                    {r.text}
                  </p>
                  <div className="mt-4 flex items-center gap-2.5 border-t border-line pt-3.5">
                    <Avatar name={r.by} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-semibold text-ink">{r.by}</p>
                      <p className="truncate text-[11.5px] text-ink-3">{r.role}</p>
                    </div>
                    <span className="flex shrink-0 gap-0.5" aria-label={`${r.stars} of 5 stars`}>
                      {Array.from({ length: r.stars }, (_, i) => (
                        <Star key={i} className="size-3 fill-amber text-amber" />
                      ))}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {related.length ? (
            <section>
              <SectionTitle>More in {course.category}</SectionTitle>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        {/* Enrolment rail */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <CourseCover course={course} className="h-28" />
            <div className="p-5">
              {enrolled ? (
                <>
                  <div className="mb-3.5 flex items-baseline justify-between">
                    <span className="text-[12.5px] font-semibold text-ink-2">
                      Your progress
                    </span>
                    <span className="text-[15px] font-bold text-ink tnum">
                      {course.progress}%
                    </span>
                  </div>
                  <Progress
                    value={course.progress ?? 0}
                    tone={course.progress === 100 ? "jade" : "brand"}
                    height={8}
                  />
                  <LinkButton href={`/learn/${course.slug}`} size="lg" className="mt-4 w-full">
                    <Play className="size-4 fill-current" />
                    {course.progress === 100 ? "Review paper" : "Continue studying"}
                  </LinkButton>
                </>
              ) : (
                <>
                  <p className="text-[14px] font-bold text-ink">
                    Included in your ZSkillup programme
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                    No extra fee for this paper. Starting it adds {code} to your
                    study plan, and your mentor sees your progress, not your
                    answers.
                  </p>
                  <LinkButton
                    href={diagnostic ? `/assessments/${diagnostic.id}` : `/learn/${course.slug}`}
                    size="lg"
                    className="mt-4 w-full"
                  >
                    {diagnostic ? "Start with the diagnostic" : "Start this paper"}
                  </LinkButton>
                  <LinkButton href="/papers" variant="secondary" size="lg" className="mt-2.5 w-full">
                    All papers
                  </LinkButton>
                </>
              )}

              <dl className="mt-5 border-t border-line pt-1">
                <DataRow label="Lessons">
                  <span className="tnum">{totalLessons}</span>
                </DataRow>
                <DataRow label="Study time">
                  <span className="tnum">{course.hours} hours</span>
                </DataRow>
                {exam ? (
                  <DataRow label="Exam">
                    <span className="tnum">
                      {exam.passMark ? `${exam.duration} · pass ${exam.passMark}` : exam.kind}
                    </span>
                  </DataRow>
                ) : null}
                <DataRow label="Certificate">
                  {course.certificate ? (
                    <span className="inline-flex items-center gap-1.5 text-jade">
                      <BadgeCheck className="size-3.5" /> On completion
                    </span>
                  ) : (
                    "Not issued"
                  )}
                </DataRow>
                <DataRow label="Language">
                  <span className="inline-flex items-center gap-1.5">
                    <Globe className="size-3.5 text-ink-3" /> English
                  </span>
                </DataRow>
              </dl>

              <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
                <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                  Study material in this paper
                </p>
                <ul className="space-y-1.5">
                  {(Object.entries(typeBreakdown) as [LessonType, number][])
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, n]) => (
                      <li key={t} className="flex items-baseline justify-between text-[12.5px]">
                        <span className="text-ink-2">{lessonTypeLabel[t]}</span>
                        <span className="text-ink-3 tnum">{n}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {course.requirements.length ? (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                    Before you start
                  </p>
                  <ul className="space-y-1.5">
                    {course.requirements.map((r) => (
                      <li key={r} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-3" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Card>

          {exam?.session ? (
            <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] bg-surface-inv px-4 py-3.5">
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-cta" />
              <p className="text-[12px] leading-relaxed text-ink-inv/70">
                <span className="font-bold text-ink-inv">Dec 2026 exam session</span>
                <br />
                Early entry closes 5 Oct 2026 · standard entry 2 Nov 2026 · exams
                7 to 10 Dec 2026
              </p>
            </div>
          ) : null}

          {course.certificate ? (
            <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3.5">
              <Award className="mt-0.5 size-4 shrink-0 text-amber" />
              <p className="text-[12px] leading-relaxed text-ink-3">
                Completing every lesson adds a ZSkillup certificate of completion
                to Certificates. It records your study here and is not an ACCA
                award.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
