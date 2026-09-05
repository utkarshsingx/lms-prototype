import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Clock,
  MessageSquareText,
  PhoneCall,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  channelStats,
  completionByDept,
  contentHealth,
  courses,
  enrolmentMix,
  funnel,
  orgStats,
  paths,
  weekLabels,
  weeklyMinutes,
} from "@/lib/data";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Donut } from "@/components/ui/charts";
import { Progress } from "@/components/ui/progress";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Overview" };

export default function ManagePage() {
  const maxFunnel = funnel[0].value;

  return (
    <div className="mx-auto max-w-[86rem] space-y-8">
      <PageHeader
        eyebrow="Organisation"
        title="Where learning actually stands"
        sub="Numbers here are counted the boring way. Completion means every required lesson and a passing assessment, not a percentage of pages opened."
        actions={
          <>
            <LinkButton href="/studio" variant="secondary" size="sm">
              Course studio
            </LinkButton>
            <LinkButton href="/grading" size="sm">
              Grading queue
            </LinkButton>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Active learners, 30 days"
          value={orgStats.activeLearners.value.toLocaleString()}
          delta={{ value: orgStats.activeLearners.delta }}
          spark={orgStats.activeLearners.spark}
          icon={<Users />}
        />
        <StatTile
          label="Learning hours, this month"
          value={orgStats.hoursThisMonth.value.toLocaleString()}
          delta={{ value: orgStats.hoursThisMonth.delta }}
          spark={orgStats.hoursThisMonth.spark}
          tone="violet"
          icon={<Clock />}
        />
        <StatTile
          label="Completion rate"
          value={`${orgStats.completionRate.value}%`}
          delta={{ value: orgStats.completionRate.delta }}
          spark={orgStats.completionRate.spark}
          tone="jade"
          icon={<TrendingUp />}
        />
        <StatTile
          label="At risk of missing a deadline"
          value={orgStats.atRisk.value}
          delta={{ value: orgStats.atRisk.delta, up: false }}
          spark={orgStats.atRisk.spark}
          tone="ember"
          icon={<AlertTriangle />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader
            title="Learning minutes per learner"
            sub="Weekly median, last 12 weeks"
            action={
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-jade">
                <ArrowUpRight className="size-3.5" /> 24% since W22
              </span>
            }
          />
          <div className="border-t border-line px-5 py-5">
            <BarChart data={weeklyMinutes} labels={weekLabels} height={168} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="How people get enrolled"
            sub="Compliance dominates, which is honest rather than flattering"
          />
          <div className="flex flex-wrap items-center gap-7 border-t border-line px-5 py-5">
            <Donut
              segments={enrolmentMix}
              center={
                <div>
                  <p className="text-[20px] leading-none font-semibold text-ink tnum">
                    12.6k
                  </p>
                  <p className="mt-1 text-[11px] text-ink-3">enrolments</p>
                </div>
              }
            />
            <ul className="min-w-0 flex-1 space-y-2.5">
              {enrolmentMix.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: `var(--${s.tone})` }}
                  />
                  <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-2">
                    {s.label}
                  </span>
                  <span className="shrink-0 text-[12.5px] font-medium text-ink tnum">
                    {s.value.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Completion by department"
            sub="Required courses only"
          />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {completionByDept
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((d) => (
                <li key={d.label} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-28 shrink-0 truncate text-[13px] text-ink-2">
                    {d.label}
                  </span>
                  <Progress
                    value={d.value}
                    className="flex-1"
                    height={6}
                    tone={d.value >= 80 ? "jade" : d.value >= 65 ? "brand" : "ember"}
                  />
                  <span className="w-9 shrink-0 text-right text-[12.5px] font-medium text-ink tnum">
                    {d.value}%
                  </span>
                  <span className="w-12 shrink-0 text-right text-[11.5px] text-ink-3 tnum">
                    {d.headcount}
                  </span>
                </li>
              ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Compliance funnel, 2026"
            sub="Where the 6,120 assigned people actually are"
          />
          <div className="space-y-3 border-t border-line px-5 py-5">
            {funnel.map((f, i) => {
              const pct = Math.round((f.value / maxFunnel) * 100);
              const drop =
                i > 0 ? funnel[i - 1].value - f.value : 0;
              return (
                <div key={f.label}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="text-[12.5px] text-ink-2">{f.label}</span>
                    <span className="text-[12.5px] text-ink-3 tnum">
                      {f.value.toLocaleString()}
                      {drop > 0 ? (
                        <span className="ml-2 text-ember">−{drop.toLocaleString()}</span>
                      ) : null}
                    </span>
                  </div>
                  <div className="h-6 overflow-hidden rounded-[var(--radius-xs)] bg-surface-3">
                    <div
                      className="flex h-full items-center rounded-[var(--radius-xs)] bg-brand px-2 transition-[width] duration-700"
                      style={{ width: `${pct}%` }}
                    >
                      <span className="text-[11px] font-medium text-on-brand tnum">
                        {pct}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            <p className="pt-1 text-[12px] leading-relaxed text-ink-3">
              Completed exceeds halfway because 560 people who stalled were
              recovered by the WhatsApp and voice campaigns. That recovery is
              the single largest source of completion this quarter.
            </p>
          </div>
        </Card>
      </div>

      <section>
        <SectionTitle
          action={
            <span className="text-[12px] text-ink-3">
              7-day window, all three channels
            </span>
          }
        >
          Support channels
        </SectionTitle>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-violet-soft text-violet">
                <Sparkles className="size-4" />
              </span>
              <p className="text-[14px] font-semibold text-ink">In-product assistant</p>
            </div>
            <p className="mt-4 text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink tnum">
              {channelStats.assistant.deflectionRate}%
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              resolved without a human
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12.5px]">
              {[
                ["Conversations", channelStats.assistant.conversations7d.toLocaleString()],
                ["Median first reply", `${channelStats.assistant.medianFirstReplySec}s`],
                ["Escalated to a person", `${channelStats.assistant.escalations}`],
                ["CSAT", `${channelStats.assistant.csat} / 5`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="font-medium text-ink tnum">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-jade-soft text-jade">
                <MessageSquareText className="size-4" />
              </span>
              <p className="text-[14px] font-semibold text-ink">WhatsApp</p>
            </div>
            <p className="mt-4 text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink tnum">
              {channelStats.whatsapp.readRate}%
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              read rate on utility templates
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12.5px]">
              {[
                ["Delivered", channelStats.whatsapp.delivered7d.toLocaleString()],
                ["Replied", `${channelStats.whatsapp.replyRate}%`],
                ["Learners reactivated", `${channelStats.whatsapp.reactivated}`],
                ["Opt-out rate", `${channelStats.whatsapp.optOut}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="font-medium text-ink tnum">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/channels/whatsapp"
              className="mt-3.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"
            >
              Open inbox <ArrowRight className="size-3.5" />
            </Link>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-full bg-ember-soft text-ember">
                <PhoneCall className="size-4" />
              </span>
              <p className="text-[14px] font-semibold text-ink">Voice agent</p>
            </div>
            <p className="mt-4 text-[30px] leading-none font-semibold tracking-[-0.03em] text-ink tnum">
              +{channelStats.voice.completionLift}%
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              completion lift versus email-only control
            </p>
            <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12.5px]">
              {[
                ["Calls placed", `${channelStats.voice.calls7d}`],
                ["Connect rate", `${channelStats.voice.connectRate}%`],
                ["Median length", `${channelStats.voice.avgSeconds}s`],
                ["Handled without a human", `${channelStats.voice.resolvedWithoutHuman}%`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="font-medium text-ink tnum">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/channels/voice"
              className="mt-3.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"
            >
              Open campaigns <ArrowRight className="size-3.5" />
            </Link>
          </Card>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Content that needs attention"
            sub="Flagged from learner behaviour, not from a review calendar"
          />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {contentHealth.map((c) => (
              <li key={c.course} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Badge
                    tone={
                      c.severity === "high"
                        ? "rose"
                        : c.severity === "medium"
                          ? "amber"
                          : "neutral"
                    }
                    dot
                  >
                    {c.issue}
                  </Badge>
                  <span className="text-[12.5px] font-medium text-ink">
                    {c.course}
                  </span>
                </div>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
                  {c.detail}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader
            title="Path performance"
            sub="Enrolment against finish rate"
            action={
              <Link
                href="/paths"
                className="text-[12.5px] font-medium text-brand hover:underline"
              >
                All paths
              </Link>
            }
          />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {paths.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-5 py-3.5">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--${p.accent})` }}
                />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/paths/${p.slug}`}
                    className="block truncate text-[13px] font-medium text-ink hover:text-brand hover:underline"
                  >
                    {p.title}
                  </Link>
                  <p className="mt-0.5 text-[11.5px] text-ink-3 tnum">
                    {p.enrolled.toLocaleString()} enrolled · {p.steps.length}{" "}
                    courses
                  </p>
                </div>
                <Progress
                  value={p.completionRate}
                  className="w-20 shrink-0"
                  height={5}
                  tone={p.completionRate >= 70 ? "jade" : "ember"}
                />
                <span className="w-9 shrink-0 text-right text-[12.5px] font-medium text-ink tnum">
                  {p.completionRate}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="p-5">
        <p className="text-[13px] leading-relaxed text-ink-2">
          <span className="font-medium text-ink">On these numbers.</span> Active
          means a session with at least one lesson interaction, not a login.
          Completion counts only required lessons plus a passing assessment
          where one exists. {courses.filter((c) => c.status !== "published").length}{" "}
          courses are excluded because they are not published. Any figure that
          cannot be defined this precisely is not on this page.
        </p>
      </Card>
    </div>
  );
}
