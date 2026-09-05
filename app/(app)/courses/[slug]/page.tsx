import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  BadgeCheck,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Globe,
  Play,
  Quote,
  Star,
  Users,
} from "lucide-react";
import {
  assessments,
  courseBySlug,
  courses,
  lessonCount,
  lessonTypeLabel,
  personById,
} from "@/lib/data";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge, Tag, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { DataRow } from "@/components/ui/misc";
import { CourseCover, CourseCard } from "@/components/course/course-card";
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
  return { title: c?.title ?? "Course" };
}

const REVIEWS = [
  {
    by: "Grace Whitfield",
    role: "Engineering Manager",
    stars: 5,
    text: "The labs are the course. I have read three books on consensus and understood less than I did after breaking the cluster on purpose in module one.",
  },
  {
    by: "Daniel Okonkwo",
    role: "Backend Engineer",
    stars: 5,
    text: "Pitched exactly right for someone who operates systems but did not build them. The runbook exercise alone paid for the time.",
  },
  {
    by: "Mei Chen",
    role: "Product Manager",
    stars: 4,
    text: "I am not an engineer and I still got value from modules one and four. Two and three went over my head, which is fair enough.",
  },
];

export default async function CoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = courseBySlug(slug);
  if (!course) notFound();

  const instructor = personById(course.instructorId);
  const related = courses
    .filter((c) => c.id !== course.id && c.category === course.category)
    .slice(0, 3);
  const courseAssessments = assessments.filter((a) => a.courseId === course.id);
  const enrolled = course.progress != null;
  const totalLessons = lessonCount(course);

  const typeBreakdown = course.modules
    .flatMap((m) => m.lessons)
    .reduce<Record<string, number>>((acc, l) => {
      acc[l.type] = (acc[l.type] ?? 0) + 1;
      return acc;
    }, {});

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <nav className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <Link href="/catalog" className="hover:text-ink">
          Catalog
        </Link>
        <span>/</span>
        <span>{course.category}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem] xl:gap-10">
        <div className="min-w-0 space-y-9">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={course.accent as Tone}>{course.category}</Badge>
              <Badge tone="neutral">{course.level}</Badge>
              {course.compliance?.mandatory ? (
                <Badge tone="rose" dot>
                  Required · recertify every {course.compliance.recertifyMonths || 12} months
                </Badge>
              ) : null}
              {course.status !== "published" ? (
                <Badge tone="amber">
                  {course.status === "in_review" ? "In review" : "Draft"}
                </Badge>
              ) : null}
            </div>

            <h1 className="mt-4 font-display text-[clamp(2rem,1.5rem+2vw,3.1rem)] leading-[1.04] tracking-[-0.022em] text-ink">
              {course.title}
            </h1>
            <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-ink-2">
              {course.subtitle}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-[13px] text-ink-2">
              <span className="inline-flex items-center gap-1.5">
                <Star className="size-4 fill-amber text-amber" />
                <span className="font-medium text-ink tnum">{course.rating}</span>
                <span className="text-ink-3 tnum">
                  ({course.ratings.toLocaleString()} ratings)
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5 tnum">
                <Users className="size-4 text-ink-3" />
                {course.enrolled.toLocaleString()} enrolled
              </span>
              <span className="inline-flex items-center gap-1.5 tnum">
                <Clock className="size-4 text-ink-3" />
                {course.hours} hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 text-ink-3" />
                Updated{" "}
                {new Date(course.updated).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </header>

          <section>
            <p className="max-w-2xl text-[15px] leading-[1.75] text-ink-2">
              {course.summary}
            </p>
          </section>

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

          <section>
            <SectionTitle
              action={
                <span className="text-[12px] text-ink-3 tnum">
                  {course.modules.length} modules · {totalLessons} lessons ·{" "}
                  {course.hours}h
                </span>
              }
            >
              Curriculum
            </SectionTitle>
            <Card className="divide-y divide-[var(--line)] overflow-hidden">
              {course.modules.map((m, mi) => {
                const mins = m.lessons.reduce((n, l) => n + l.minutes, 0);
                const done = m.lessons.filter(
                  (l) => l.state === "completed",
                ).length;
                return (
                  <details key={m.id} open={mi === 0} className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-2 text-[12.5px] font-semibold text-ink-2 tnum">
                        {mi + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                          {m.title}
                        </p>
                        <p className="mt-0.5 line-clamp-1 text-[12.5px] text-ink-3">
                          {m.summary}
                        </p>
                      </div>
                      <span className="hidden shrink-0 text-right text-[11.5px] text-ink-3 tnum sm:block">
                        {m.lessons.length} lessons · {mins} min
                        {enrolled ? (
                          <span className="mt-1 block text-jade">
                            {done}/{m.lessons.length} done
                          </span>
                        ) : null}
                      </span>
                      <svg
                        viewBox="0 0 12 12"
                        className="size-3 shrink-0 text-ink-3 transition-transform group-open:rotate-180"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" />
                      </svg>
                    </summary>
                    <ul className="border-t border-line bg-surface-2/40">
                      {m.lessons.map((l) => (
                        <li
                          key={l.id}
                          className="flex items-center gap-3.5 px-5 py-2.5 pl-[4.25rem]"
                        >
                          <LessonBullet type={l.type} state={l.state} />
                          <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
                            {l.title}
                          </span>
                          {l.preview && !enrolled ? (
                            <Badge tone="brand">Preview</Badge>
                          ) : null}
                          <span className="shrink-0 text-[11.5px] text-ink-3">
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

          {courseAssessments.length ? (
            <section>
              <SectionTitle>Assessment</SectionTitle>
              <div className="grid gap-4 sm:grid-cols-2">
                {courseAssessments.map((a) => (
                  <Link
                    key={a.id}
                    href={`/assessments/${a.id}`}
                    className="group rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-e1)] transition-all hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-e3)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge tone={a.autoGraded ? "brand" : "violet"}>
                        {a.kind}
                      </Badge>
                      {a.proctored ? <Tag>Proctored</Tag> : null}
                    </div>
                    <p className="mt-2.5 text-[14px] font-semibold text-ink transition-colors group-hover:text-brand">
                      {a.title}
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-ink-3 tnum">
                      {a.questions.length} questions ·{" "}
                      {a.minutes ? `${a.minutes} min · ` : ""}
                      pass at {a.passMark}% · {a.attempts} attempts
                    </p>
                    <p className="mt-2 text-[12px] text-ink-3">
                      {a.autoGraded
                        ? "Auto-graded on submit"
                        : `Graded against the ${a.rubricId ? "rubric" : "brief"} by an instructor`}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <SectionTitle>Instructor</SectionTitle>
            {instructor ? (
              <Card className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <Avatar name={instructor.name} size="xl" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {instructor.name}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {instructor.title} · {instructor.location}
                    </p>
                    <p className="mt-3 max-w-xl text-[13.5px] leading-relaxed text-ink-2">
                      Teaches from incidents rather than papers. Has been on the
                      wrong end of enough 3am pages to know which parts of the
                      theory actually change what you build.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-ink-3 tnum">
                      <span>
                        <span className="font-semibold text-ink">
                          {courses.filter((c) => c.instructorId === instructor.id).length}
                        </span>{" "}
                        courses
                      </span>
                      <span>
                        <span className="font-semibold text-ink">
                          {courses
                            .filter((c) => c.instructorId === instructor.id)
                            .reduce((n, c) => n + c.enrolled, 0)
                            .toLocaleString()}
                        </span>{" "}
                        learners
                      </span>
                      <span>
                        <span className="font-semibold text-ink">4.8</span> average
                        rating
                      </span>
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
                    {course.rating} from {course.ratings.toLocaleString()}
                  </span>
                </span>
              }
            >
              What learners say
            </SectionTitle>
            <div className="grid gap-4 md:grid-cols-3">
              {REVIEWS.map((r) => (
                <Card key={r.by} className="flex flex-col p-4.5">
                  <Quote className="size-4 text-ink-3" />
                  <p className="mt-3 flex-1 text-[13.5px] leading-relaxed text-ink-2">
                    {r.text}
                  </p>
                  <div className="mt-4 flex items-center gap-2.5 border-t border-line pt-3.5">
                    <Avatar name={r.by} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium text-ink">
                        {r.by}
                      </p>
                      <p className="truncate text-[11.5px] text-ink-3">{r.role}</p>
                    </div>
                    <span className="flex shrink-0 gap-0.5">
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
                    <span className="text-[12.5px] font-medium text-ink-2">
                      Your progress
                    </span>
                    <span className="text-[15px] font-semibold text-ink tnum">
                      {course.progress}%
                    </span>
                  </div>
                  <Progress
                    value={course.progress!}
                    tone={course.progress === 100 ? "jade" : "brand"}
                    height={8}
                  />
                  <LinkButton
                    href={`/learn/${course.slug}`}
                    size="lg"
                    className="mt-4 w-full"
                  >
                    <Play className="size-4 fill-current" />
                    {course.progress === 100 ? "Review course" : "Continue"}
                  </LinkButton>
                </>
              ) : (
                <>
                  <p className="text-[13px] leading-relaxed text-ink-2">
                    Free for everyone at Northwind. Your manager sees completion,
                    not your answers.
                  </p>
                  <LinkButton
                    href={`/learn/${course.slug}`}
                    size="lg"
                    className="mt-4 w-full"
                  >
                    Enrol and start
                  </LinkButton>
                  <Button variant="secondary" size="lg" className="mt-2.5 w-full">
                    Add to my list
                  </Button>
                </>
              )}

              <dl className="mt-5 border-t border-line pt-1">
                <DataRow label="Lessons">
                  <span className="tnum">{totalLessons}</span>
                </DataRow>
                <DataRow label="Total time">
                  <span className="tnum">{course.hours} hours</span>
                </DataRow>
                <DataRow label="Level">{course.level}</DataRow>
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
                <p className="mb-2.5 text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                  Content in this course
                </p>
                <ul className="space-y-1.5">
                  {Object.entries(typeBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([t, n]) => (
                      <li
                        key={t}
                        className="flex items-baseline justify-between text-[12.5px]"
                      >
                        <span className="text-ink-2">
                          {lessonTypeLabel[t as keyof typeof lessonTypeLabel]}
                        </span>
                        <span className="text-ink-3 tnum">{n}</span>
                      </li>
                    ))}
                </ul>
              </div>

              {course.requirements.length ? (
                <div className="mt-4">
                  <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                    Before you start
                  </p>
                  <ul className="space-y-1.5">
                    {course.requirements.map((r) => (
                      <li
                        key={r}
                        className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2"
                      >
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-3" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Card>

          <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface-2 px-4 py-3.5">
            <BarChart3 className="size-4 shrink-0 text-ink-3" />
            <p className="text-[12px] leading-relaxed text-ink-3">
              <span className="font-medium text-ink-2">
                {Math.round((course.enrolled / (course.enrolled + 400)) * 100)}%
              </span>{" "}
              of people who start this course finish it. The median takes{" "}
              {Math.ceil(course.hours / 2)} weeks.
            </p>
          </div>

          {course.certificate ? (
            <div className="mt-4 flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3.5 shadow-[var(--shadow-e1)]">
              <Award className="size-4 shrink-0 text-amber" />
              <p className="text-[12px] leading-relaxed text-ink-3">
                Completing every lesson and passing the assessment issues a
                verifiable certificate to your profile.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
