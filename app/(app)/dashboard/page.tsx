import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Clock,
  Flame,
  Play,
  Radio,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import {
  activityHeat,
  courses,
  currentUser,
  enrolledCourses,
  lessonCount,
  paths,
  upcoming,
} from "@/lib/data";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Progress, Ring } from "@/components/ui/progress";
import { LinkButton } from "@/components/ui/button";
import { HeatGrid } from "@/components/ui/charts";
import { StatTile } from "@/components/ui/misc";
import { CourseCover } from "@/components/course/course-card";
import { LessonTypeIcon } from "@/components/course/lesson-icon";
import { lessonTypeLabel } from "@/lib/data";

export const metadata = { title: "Home" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function DashboardPage() {
  const active = enrolledCourses
    .filter((c) => (c.progress ?? 0) < 100)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));

  const hero = active[0];
  const heroLesson =
    hero.modules.flatMap((m) => m.lessons).find((l) => l.state === "in_progress") ??
    hero.modules[0].lessons[0];
  const heroModule = hero.modules.find((m) =>
    m.lessons.some((l) => l.id === heroLesson.id),
  )!;
  const done = hero.modules
    .flatMap((m) => m.lessons)
    .filter((l) => l.state === "completed").length;

  const myPath = paths[0];
  const recommended = courses
    .filter((c) => c.progress == null && c.status === "published")
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <p className="text-[12px] font-medium tracking-[0.02em] text-ink-3">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-1.5 font-display text-[clamp(1.9rem,1.4rem+1.7vw,2.7rem)] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
            {greeting()}, {currentUser.name.split(" ")[0]}
          </h1>
          <p className="mt-2 max-w-lg text-[14px] leading-relaxed text-ink-2">
            One lab stands between you and the capstone. It takes about
            {" "}
            <span className="font-medium text-ink">
              {heroLesson.minutes} minutes
            </span>
            .
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-[var(--shadow-e1)]">
            <Flame className="size-4 text-ember" />
            <span className="tnum">{currentUser.streak}</span>
            <span className="text-ink-3">day streak</span>
          </span>
          <LinkButton href="/catalog" variant="secondary" size="sm">
            Browse catalog
          </LinkButton>
        </div>
      </div>

      {/* Continue — the single most important thing on this page */}
      <Card className="overflow-hidden">
        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_1fr]">
          <div className="relative flex flex-col justify-between gap-6 p-6 sm:p-7">
            <div>
              <div className="flex items-center gap-2.5">
                <Badge tone="brand" dot>
                  In progress
                </Badge>
                <span className="text-[12px] text-ink-3">
                  {heroModule.title}
                </span>
              </div>
              <h2 className="mt-3.5 font-display text-[clamp(1.5rem,1.2rem+1vw,2rem)] leading-[1.1] tracking-[var(--display-tracking)] text-ink">
                {heroLesson.title}
              </h2>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2">
                {hero.title} · {heroModule.summary}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <LinkButton href={`/learn/${hero.slug}`} size="lg">
                <Play className="size-4 fill-current" />
                Resume lesson
              </LinkButton>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                <LessonTypeIcon type={heroLesson.type} />
                {lessonTypeLabel[heroLesson.type]} · {heroLesson.minutes} min
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-5 border-t border-line bg-surface-2 p-6 sm:p-7 lg:border-t-0 lg:border-l">
            <div className="flex items-center gap-5">
              <Ring value={hero.progress!} size={72} stroke={6} />
              <div className="min-w-0">
                <p className="text-[14px] leading-snug font-semibold text-ink">
                  {hero.title}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-3 tnum">
                  {done} of {lessonCount(hero)} lessons · {hero.hours}h total
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {hero.modules.map((m) => {
                const total = m.lessons.length;
                const doneIn = m.lessons.filter(
                  (l) => l.state === "completed",
                ).length;
                return (
                  <div key={m.id} className="flex items-center gap-3">
                    <span
                      className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3"
                      title={m.title}
                    >
                      <span
                        className="block h-full rounded-full bg-brand"
                        style={{ width: `${(doneIn / total) * 100}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right text-[11px] text-ink-3 tnum">
                      {doneIn}/{total}
                    </span>
                  </div>
                );
              })}
            </div>

            <Link
              href={`/courses/${hero.slug}`}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"
            >
              Full curriculum <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Learning time, this month"
          value="14h 20m"
          delta={{ value: "3h vs last" }}
          spark={[120, 180, 96, 240, 210, 300, 280, 340, 380]}
          icon={<Clock />}
        />
        <StatTile
          label="Courses in progress"
          value={active.length}
          spark={[2, 2, 3, 3, 3, 4, 4, 3, 3]}
          tone="violet"
          icon={<Target />}
        />
        <StatTile
          label="Points earned"
          value={currentUser.points.toLocaleString()}
          delta={{ value: "620 this week" }}
          spark={[3100, 3400, 3550, 3700, 3980, 4100, 4300, 4620, 4820]}
          tone="ember"
          icon={<Trophy />}
        />
        <StatTile
          label="Path completion"
          value={`${Math.round((2 / myPath.steps.length) * 100)}%`}
          spark={[10, 14, 20, 20, 26, 32, 34, 38, 40]}
          tone="jade"
          icon={<Flame />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          {/* Active courses */}
          <div>
            <SectionTitle
              action={
                <Link
                  href="/my-learning"
                  className="text-[12.5px] font-medium text-brand hover:underline"
                >
                  All my learning
                </Link>
              }
            >
              Continue learning
            </SectionTitle>
            <Card className="divide-y divide-[var(--line)] overflow-hidden">
              {active.map((c) => {
                const next =
                  c.modules
                    .flatMap((m) => m.lessons)
                    .find((l) => l.state === "in_progress") ??
                  c.modules.flatMap((m) => m.lessons)[0];
                return (
                  <Link
                    key={c.id}
                    href={`/learn/${c.slug}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                  >
                    <span
                      className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)]"
                      style={{
                        backgroundColor: `var(--${c.accent}-soft)`,
                        color: `var(--${c.accent})`,
                      }}
                    >
                      <LessonTypeIcon type={next.type} className="size-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-ink transition-colors group-hover:text-brand">
                        {c.title}
                      </p>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                        Next: {next.title}
                      </p>
                      <Progress
                        value={c.progress!}
                        className="mt-2.5"
                        height={4}
                      />
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-[15px] font-semibold text-ink tnum">
                        {c.progress}%
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-3 tnum">
                        {next.minutes} min left
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                  </Link>
                );
              })}
            </Card>
          </div>

          {/* Recommended */}
          <div>
            <SectionTitle
              action={
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <Sparkles className="size-3.5 text-violet" />
                  Matched to your path and level
                </span>
              }
            >
              Recommended next
            </SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              {recommended.map((c) => (
                <Link
                  key={c.id}
                  href={`/courses/${c.slug}`}
                  className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e1)] transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[var(--shadow-e3)]"
                >
                  <CourseCover course={c} className="h-16" />
                  <div className="flex flex-1 flex-col p-3.5">
                    <p className="text-[13.5px] leading-snug font-semibold text-ink transition-colors group-hover:text-brand">
                      {c.title}
                    </p>
                    <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-3">
                      {c.subtitle}
                    </p>
                    <p className="mt-auto pt-3 text-[11.5px] text-ink-3 tnum">
                      {c.hours}h · {c.level}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          {/* This week */}
          <Card>
            <CardHeader
              title="This week"
              sub="Everything with a clock on it"
              action={<CalendarClock className="size-4 text-ink-3" />}
            />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {upcoming.map((u) => (
                <li key={u.id} className="flex items-start gap-3 px-5 py-3.5">
                  <span
                    className={
                      "mt-1 grid size-7 shrink-0 place-items-center rounded-full " +
                      (u.urgent
                        ? "bg-ember-soft text-ember"
                        : "bg-surface-2 text-ink-3")
                    }
                  >
                    {u.kind === "Live session" ? (
                      <Radio className="size-3.5" />
                    ) : (
                      <CalendarClock className="size-3.5" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug font-medium text-ink">
                      {u.title}
                    </p>
                    <p className="mt-0.5 truncate text-[12px] text-ink-3">
                      {u.course}
                    </p>
                  </div>
                  <span
                    className={
                      "shrink-0 text-[11.5px] font-medium whitespace-nowrap " +
                      (u.urgent ? "text-ember" : "text-ink-3")
                    }
                  >
                    {u.when}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Path */}
          <Card>
            <CardHeader
              title={myPath.title}
              sub={`${myPath.kind} path · owned by learning team`}
            />
            <div className="border-t border-line px-5 py-4">
              <ol className="relative space-y-3">
                <span className="absolute top-3 bottom-3 left-[11px] w-px bg-line" />
                {myPath.steps.map((s, i) => {
                  const c = courses.find((x) => x.id === s.courseId)!;
                  const state =
                    (c.progress ?? 0) === 100
                      ? "done"
                      : (c.progress ?? 0) > 0
                        ? "active"
                        : "todo";
                  return (
                    <li key={s.courseId} className="relative flex gap-3.5">
                      <span
                        className={
                          "relative z-10 mt-0.5 size-6 shrink-0 rounded-full border-2 " +
                          (state === "done"
                            ? "border-jade bg-jade"
                            : state === "active"
                              ? "border-brand bg-surface"
                              : "border-line bg-surface")
                        }
                      />
                      <div className="min-w-0 flex-1 pb-0.5">
                        <Link
                          href={`/courses/${c.slug}`}
                          className={
                            "block truncate text-[13px] font-medium hover:underline " +
                            (state === "todo" ? "text-ink-3" : "text-ink")
                          }
                        >
                          {c.title}
                        </Link>
                        <p className="mt-0.5 text-[11.5px] text-ink-3 tnum">
                          {s.required ? "Required" : "Optional"} · {s.weeks}w
                          {c.progress != null && c.progress < 100
                            ? ` · ${c.progress}%`
                            : ""}
                        </p>
                        {s.gate && i <= 2 ? (
                          <p className="mt-1 rounded-[var(--radius-xs)] border border-amber-soft bg-amber-soft px-2 py-1 text-[11px] text-amber">
                            Gate: {s.gate}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <Link
                href={`/paths/${myPath.slug}`}
                className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"
              >
                Open path <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>

          {/* Activity */}
          <Card>
            <CardHeader
              title="Activity"
              sub="26 weeks"
              action={
                <span className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <LiveDot tone="jade" /> Today counted
                </span>
              }
            />
            <div className="border-t border-line px-5 py-4">
              <HeatGrid values={activityHeat} weeks={22} />
              <div className="mt-3 flex items-center justify-between text-[11px] text-ink-3">
                <span>Less</span>
                <span className="flex items-center gap-1">
                  {[0, 0.24, 0.45, 0.7, 1].map((o, i) => (
                    <span
                      key={i}
                      className="size-2.5 rounded-[3px]"
                      style={{
                        backgroundColor:
                          o === 0 ? "var(--surface-3)" : "var(--brand)",
                        opacity: o === 0 ? 1 : o,
                      }}
                    />
                  ))}
                </span>
                <span>More</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
