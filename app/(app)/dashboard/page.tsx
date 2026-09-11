import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  Flame,
  Play,
  Radio,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import {
  currentUser,
  enrolledCourses,
  lessonCount,
  lessonTypeLabel,
  upcoming,
  type UpcomingItem,
} from "@/lib/data";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LinkButton } from "@/components/ui/button";
import { LessonTypeIcon } from "@/components/course/lesson-icon";
import { MyLearningTabs } from "@/components/dashboard/my-learning-tabs";
import { cn } from "@/lib/cn";

export const metadata = { title: "Home" };

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

const kindIcon: Record<UpcomingItem["kind"], typeof Radio> = {
  "Live session": Radio,
  "Mentor session": UserRound,
  "Graded exam": ClipboardCheck,
  Assignment: CalendarClock,
  Compliance: ShieldCheck,
};

/* Home answers two questions and stops: what do I do next, and what is coming
   up. Everything else a learner might want to look at has its own page. */
export default function DashboardPage() {
  const hero = enrolledCourses
    .filter((c) => (c.progress ?? 0) < 100)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0];
  const lessons = hero.modules.flatMap((m) => m.lessons);
  const next = lessons.find((l) => l.state === "in_progress") ?? lessons[0];
  const done = lessons.filter((l) => l.state === "completed").length;

  return (
    <div className="mx-auto max-w-[76rem] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-[12px] font-medium tracking-[0.02em] text-ink-3">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="mt-1.5 font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
            {greeting()}, {currentUser.name.split(" ")[0]}
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[12.5px] font-medium text-ink shadow-[var(--shadow-e1)]">
          <Flame className="size-4 text-ember" />
          <span className="tnum">{currentUser.streak}</span>
          <span className="text-ink-3">day streak</span>
        </span>
      </header>

      {/* The one thing to do next */}
      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <span
          className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-md)]"
          style={{
            backgroundColor: `var(--${hero.accent}-soft)`,
            color: `var(--${hero.accent})`,
          }}
        >
          <LessonTypeIcon type={next.type} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
            Continue learning
          </p>
          <h2 className="mt-1.5 font-display text-[clamp(1.3rem,1.1rem+0.7vw,1.7rem)] leading-[1.15] tracking-[var(--display-tracking)] text-ink">
            {next.title}
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            {hero.title} · {lessonTypeLabel[next.type]} · {next.minutes} min
          </p>
          <div className="mt-3.5 flex items-center gap-3">
            <Progress value={hero.progress!} height={5} className="w-full max-w-72" />
            <span className="shrink-0 text-[12px] text-ink-3 tnum">
              {hero.progress}% · {done} of {lessonCount(hero)} lessons
            </span>
          </div>
        </div>
        <LinkButton href={`/learn/${hero.slug}`} size="lg" className="shrink-0">
          <Play className="size-4 fill-current" />
          Resume
        </LinkButton>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <MyLearningTabs />

        <Card className="overflow-hidden">
          <CardHeader title="Coming up" sub="Sessions and deadlines" />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {upcoming.slice(0, 4).map((u) => {
              const Icon = kindIcon[u.kind];
              const body = (
                <>
                  <span
                    className={cn(
                      "grid w-11 shrink-0 place-items-center rounded-[var(--radius-sm)] border py-1.5 leading-none",
                      u.urgent
                        ? "border-transparent bg-brand text-on-brand"
                        : "border-line bg-surface text-ink",
                    )}
                  >
                    <span className="text-[16px] font-semibold tnum">{u.day}</span>
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
                        u.urgent ? "text-on-brand/80" : "text-ink-3",
                      )}
                    >
                      {u.month}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink transition-colors group-hover:text-brand">
                      {u.title}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">
                        {u.kind} · {u.time}
                      </span>
                    </span>
                  </span>
                </>
              );
              return (
                <li key={u.id}>
                  {u.href ? (
                    <Link
                      href={u.href}
                      className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-surface-2"
                    >
                      {body}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-3.5 px-5 py-3.5">{body}</div>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <Link
              href="/progress"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"
            >
              Your progress report <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
