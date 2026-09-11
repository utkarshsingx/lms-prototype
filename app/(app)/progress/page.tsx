import Link from "next/link";
import { BookOpen, CheckCircle2, Clock, Flame, Radio } from "lucide-react";
import {
  activityHeat,
  courseById,
  courseReports,
  currentUser,
  learnerReport,
  paths,
} from "@/lib/data";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { BarChart, HeatGrid, Sparkline } from "@/components/ui/charts";
import { Progress } from "@/components/ui/progress";

export const metadata = { title: "Progress" };

const hm = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;

const skillTone = (score: number) =>
  score >= 75 ? "jade" : score >= 50 ? "brand" : "ember";

export default function ProgressPage() {
  const r = learnerReport;
  const myPath = paths[0];
  const pathRequired = myPath.steps.filter((s) => s.required);
  const pathValue = Math.round(
    pathRequired.reduce((n, s) => n + (courseById(s.courseId)?.progress ?? 0), 0) /
      pathRequired.length,
  );

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <PageHeader
        eyebrow="Progress"
        title="Your progress report"
        sub="Time spent, sessions attended and how each skill is moving. Your manager sees completion and pass or fail, never these details."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Learning time, last 30 days"
          value={hm(r.minutes30d)}
          delta={{ value: `${hm(r.minutes30d - r.minutesPrev30d)} more` }}
          spark={r.weeklyMinutes}
          icon={<Clock />}
        />
        <StatTile
          label="Live sessions attended"
          value={`${r.sessions.attended} of ${r.sessions.scheduled}`}
          delta={{ value: `${r.sessions.hours}h in sessions` }}
          tone="violet"
          icon={<Radio />}
        />
        <StatTile
          label="Assessments passed"
          value={`${r.assessments.passed} of ${r.assessments.taken}`}
          delta={{ value: `${r.assessments.averageScore}% average` }}
          tone="jade"
          icon={<CheckCircle2 />}
        />
        <StatTile
          label="Current streak"
          value={`${currentUser.streak} days`}
          delta={{ value: `${currentUser.points.toLocaleString()} points` }}
          tone="ember"
          icon={<Flame />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Learning time" sub="Minutes per week, last eight weeks" />
          <div className="border-t border-line px-5 pt-9 pb-4">
            <BarChart
              data={r.weeklyMinutes}
              labels={r.weekLabels}
              height={214}
              highlight={r.weeklyMinutes.length - 1}
            />
          </div>
        </Card>

        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Activity" sub="Last 22 weeks" />
            <div className="border-t border-line px-5 py-4">
              <HeatGrid values={activityHeat} weeks={22} />
            </div>
          </Card>

          <Card>
            <CardHeader
              title={myPath.title}
              sub={`${myPath.kind} path · required courses`}
              action={
                <span className="text-[15px] font-semibold text-ink tnum">{pathValue}%</span>
              }
            />
            <div className="border-t border-line px-5 py-4">
              <Progress value={pathValue} height={6} />
              <Link
                href={`/paths/${myPath.slug}`}
                className="mt-3 inline-flex text-[12.5px] font-medium text-brand hover:underline"
              >
                Open path
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <section>
        <SectionTitle>Course by course</SectionTitle>
        <div className="grid gap-5 lg:grid-cols-2">
          {courseReports.map((cr) => {
            const c = courseById(cr.courseId)!;
            return (
              <Card key={cr.courseId} className="overflow-hidden">
                <div className="flex items-start gap-3.5 px-5 pt-4.5 pb-4">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]"
                    style={{
                      backgroundColor: `var(--${c.accent}-soft)`,
                      color: `var(--${c.accent})`,
                    }}
                  >
                    <BookOpen className="size-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/learn/${c.slug}`}
                      className="block truncate text-[14.5px] font-semibold text-ink hover:text-brand"
                    >
                      {c.title}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-ink-3 tnum">
                      {c.progress}% complete · {c.level}
                    </p>
                  </div>
                </div>

                <dl className="grid grid-cols-3 divide-x divide-[var(--line)] border-y border-line bg-surface-2/50">
                  <div className="px-5 py-3">
                    <dt className="text-[11px] text-ink-3">Time spent</dt>
                    <dd className="mt-0.5 text-[14px] font-semibold text-ink tnum">
                      {hm(cr.minutesSpent)}
                    </dd>
                  </div>
                  <div className="px-5 py-3">
                    <dt className="text-[11px] text-ink-3">Sessions</dt>
                    <dd className="mt-0.5 text-[14px] font-semibold text-ink tnum">
                      {cr.sessions.scheduled
                        ? `${cr.sessions.attended}/${cr.sessions.scheduled}`
                        : "None"}
                    </dd>
                  </div>
                  <div className="px-5 py-3">
                    <dt className="text-[11px] text-ink-3">8-week trend</dt>
                    <dd className="mt-1.5">
                      <Sparkline
                        data={cr.completionByWeek}
                        height={22}
                        tone={c.accent === "violet" ? "violet" : "brand"}
                        fill={false}
                      />
                    </dd>
                  </div>
                </dl>

                <div className="px-5 py-4">
                  <p className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                    Skill proficiency
                  </p>
                  <ul className="space-y-2.5">
                    {cr.skills.map((s) => (
                      <li
                        key={s.name}
                        className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_2.5rem] items-center gap-3"
                      >
                        <span className="truncate text-[12.5px] text-ink-2">{s.name}</span>
                        {s.score == null ? (
                          <span className="truncate text-[11.5px] text-ink-3">
                            Not assessed yet
                          </span>
                        ) : (
                          <Progress value={s.score} height={5} tone={skillTone(s.score)} />
                        )}
                        <span className="text-right text-[12px] font-medium text-ink tnum">
                          {s.score ?? "–"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
