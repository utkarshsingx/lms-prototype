"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CalendarPlus,
  Check,
  MapPin,
  Phone,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react";
import {
  RISK_ALERT_LABELS,
  actionPlans,
  formatAccaDate,
  formatTime,
  interventions,
  mentoringSessions,
  riskAlerts,
  staffName,
  studentById,
  type MentoringSession,
  type RiskAlert,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Donut } from "@/components/ui/charts";
import { HeroBand } from "@/components/ui/hero-band";
import { PageToolbar } from "@/components/ui/page-toolbar";
import { Progress } from "@/components/ui/progress";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { ScheduleSessionDrawer } from "./drawers";
import { MentorScopeChip, useMentorScope } from "./scope";
import { RISK_RANK, TODAY, TypePill, ago, dueLabel, plural, shortDate } from "./shared";

const WEEK_END = "2026-09-21";

const OUTCOME_LABEL = { improved: "Improved", "no-change": "No change", worsened: "Worsened", pending: "Awaiting outcome" } as const;

export function MentorDashboard() {
  const { persona } = useRole();
  return <DashboardView key={persona.id} />;
}

function DashboardView() {
  const scope = useMentorScope();
  const inScope = <T extends { studentId: string }>(list: T[]) => list.filter((x) => scope.ids.has(x.studentId));

  const [alerts, setAlerts] = useState<RiskAlert[]>(() => inScope(riskAlerts));
  const [sessions, setSessions] = useState<MentoringSession[]>(() => inScope(mentoringSessions));
  const [doneTasks, setDoneTasks] = useState<string[]>([]);
  const [scheduling, setScheduling] = useState<{ session?: MentoringSession } | null>(null);

  const students = scope.students;
  const high = students.filter((s) => s.risk.level === "high").length;
  const medium = students.filter((s) => s.risk.level === "medium").length;

  const newAlerts = alerts
    .filter((a) => a.status === "new")
    .sort((a, b) => RISK_RANK[b.severity] - RISK_RANK[a.severity] || b.raisedOn.localeCompare(a.raisedOn));

  const today = sessions.filter((m) => m.start.startsWith(TODAY)).sort((a, b) => a.start.localeCompare(b.start));
  const nextToday = today.find((m) => m.status === "scheduled");

  const tasksDue = inScope(actionPlans)
    .filter((p) => p.status === "active")
    .flatMap((p) =>
      p.tasks
        .filter((t) => t.owner === "mentor" && !t.done && t.due <= WEEK_END)
        .map((t) => ({ key: `${p.id}-${t.id}`, plan: p, task: t })),
    )
    .sort((a, b) => a.task.due.localeCompare(b.task.due));
  const openTasks = tasksDue.filter((t) => !doneTasks.includes(t.key));
  const myInterventions = inScope(interventions);
  const pendingOutcomes = myInterventions.filter((iv) => iv.outcome === "pending");
  const closed = myInterventions
    .filter((iv) => iv.outcome !== "pending")
    .sort((a, b) => (b.closedOn ?? "").localeCompare(a.closedOn ?? ""));
  const counts = {
    improved: closed.filter((iv) => iv.outcome === "improved").length,
    "no-change": closed.filter((iv) => iv.outcome === "no-change").length,
    worsened: closed.filter((iv) => iv.outcome === "worsened").length,
  };
  const interventionsDue = openTasks.length + pendingOutcomes.length;

  const acknowledge = (a: RiskAlert) => {
    setAlerts((list) => list.map((x) => (x.id === a.id ? { ...x, status: "acknowledged" } : x)));
    toast({ title: "Alert acknowledged", body: `${studentById(a.studentId)?.name} · ${a.title}` });
  };

  const join = (m: MentoringSession) => {
    const s = studentById(m.studentId);
    const body = m.mode === "Video" ? "meet.zskillup.com/mentoring" : m.mode === "Phone" ? s?.phone : "Mentoring room 2, ZSkillup Bengaluru";
    toast({ title: m.mode === "Video" ? `Opening video room with ${s?.name}` : m.mode === "Phone" ? `Calling ${s?.name}` : `Checked in with ${s?.name}`, body, tone: "info" });
  };

  const complete = (m: MentoringSession) => {
    setSessions((list) => list.map((x) => (x.id === m.id ? { ...x, status: "completed" } : x)));
    toast({ title: "Session marked completed", body: `${studentById(m.studentId)?.name} · record notes in Action plans & sessions` });
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <HeroBand
        eyebrow="Student success"
        title={`Welcome back, ${scope.firstName}`}
        sub={`Monday 14 September 2026 · ${plural(newAlerts.length, "new risk alert")}, ${plural(today.length, "mentoring session")} today and ${plural(interventionsDue, "intervention")} due.`}
        actions={
          <>
            <LinkButton href="/mentor/alerts">
              <TriangleAlert className="size-4" /> Review risk alerts
            </LinkButton>
            <Button variant="inverse" onClick={() => setScheduling({})}>
              <CalendarPlus className="size-4" /> Schedule session
            </Button>
          </>
        }
        stats={[
          {
            label: scope.placement ? "Placement-eligible learners" : "My students",
            value: students.length,
            hint: scope.placement ? `Across ${new Set(students.map((s) => s.mentorId)).size} mentors` : `Caseload of ${scope.capacity ?? 25}`,
          },
          { label: "High risk", value: high, hint: `${medium} medium risk` },
          { label: "Sessions today", value: today.length, hint: nextToday ? `Next at ${formatTime(nextToday.start)}` : "All done" },
          { label: "Interventions due", value: interventionsDue, hint: `${plural(openTasks.length, "task")} this week · ${plural(pendingOutcomes.length, "outcome")} to record` },
        ]}
        aside={
          <div className="w-full rounded-[16px] border border-ink-inv/15 bg-ink-inv/5 p-4 lg:w-64">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">{scope.placement ? "Placement scope" : "Caseload"}</p>
            <p className="mt-2 font-display text-[28px] leading-none font-bold text-cta tnum">
              {students.length}
              {!scope.placement && scope.capacity ? <span className="text-[16px] text-ink-inv/70"> of {scope.capacity}</span> : null}
            </p>
            {!scope.placement && scope.capacity ? (
              <Progress value={(students.length / scope.capacity) * 100} className="mt-3" />
            ) : null}
            <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-inv/75">
              <li className="flex justify-between gap-3">
                <span>High risk</span>
                <span className="font-semibold text-ink-inv tnum">{high}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Medium risk</span>
                <span className="font-semibold text-ink-inv tnum">{medium}</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Low risk</span>
                <span className="font-semibold text-ink-inv tnum">{students.length - high - medium}</span>
              </li>
            </ul>
          </div>
        }
      />

      <PageToolbar start={<MentorScopeChip scope={scope} />}>
        <LinkButton href="/mentor/students" variant="outline" size="sm">
          <Users className="size-4" /> My students
        </LinkButton>
        <LinkButton href="/mentor/plans" variant="outline" size="sm">
          <CalendarClock className="size-4" /> Action plans & sessions
        </LinkButton>
      </PageToolbar>

      {/* ------------------------------------------------------------ risk alerts strip */}
      <Card>
        <CardHeader
          title="Risk alerts"
          sub={newAlerts.length ? `${plural(newAlerts.length, "new alert")} · high severity first` : "No new alerts. Acknowledged alerts stay on the Risk alerts page."}
          action={
            <Link href="/mentor/alerts" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
              All risk alerts <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          }
        />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
          {newAlerts.slice(0, 4).map((a) => {
            const s = studentById(a.studentId)!;
            return (
              <div key={a.id} className="flex min-w-0 flex-col rounded-[var(--radius-md)] border border-line bg-surface p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <RiskBadge level={a.severity} label={a.severity === "high" ? "High" : a.severity === "medium" ? "Medium" : "Low"} />
                  <span className="text-[11.5px] font-semibold text-ink-3">{RISK_ALERT_LABELS[a.kind]}</span>
                </div>
                <p className="mt-2.5 truncate text-[14px] font-bold text-ink">{s.name}</p>
                <p className="text-[13px] font-semibold text-ink-2">{a.title}</p>
                <p className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-ink-3">{a.detail}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                  <span className="text-[12px] text-ink-3">{ago(a.raisedOn)}</span>
                  <Button size="xs" variant="outline" onClick={() => acknowledge(a)}>
                    <Check className="size-3.5" /> Acknowledge
                  </Button>
                </div>
              </div>
            );
          })}
          {newAlerts.length === 0 ? (
            <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-6 text-center text-[13px] text-ink-3 sm:col-span-2 xl:col-span-4">
              Every new alert has been acknowledged.
            </p>
          ) : null}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        {/* ------------------------------------------------------------ today's sessions */}
        <Card className="min-w-0">
          <CardHeader
            title="Today's mentoring sessions"
            sub={`Monday 14 September · ${plural(today.filter((m) => m.status === "scheduled").length, "session")} still to run`}
            action={
              <Button size="sm" variant="secondary" onClick={() => setScheduling({})}>
                <CalendarPlus className="size-4" /> Schedule
              </Button>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {today.map((m) => {
              const s = studentById(m.studentId)!;
              const ModeIcon = m.mode === "Video" ? Video : m.mode === "Phone" ? Phone : MapPin;
              return (
                <li key={m.id} className="flex flex-wrap items-start gap-x-4 gap-y-3 px-5 py-4">
                  <div className="w-14 shrink-0">
                    <p className="font-mono text-[15px] font-bold text-ink tnum">{formatTime(m.start)}</p>
                    <p className="text-[11.5px] text-ink-3">{m.durationMins} min</p>
                  </div>
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <Avatar name={s.name} size="xs" />
                      <span className="truncate text-[14px] font-bold text-ink">{s.name}</span>
                      <TypePill student={s} short />
                      <StatusPill status={m.status} size="sm" />
                    </div>
                    <p className="mt-1 text-[13px] text-ink-2">{m.agenda}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
                      <ModeIcon aria-hidden className="size-3.5" /> {m.mode}
                      {scope.placement ? ` · with ${staffName(m.mentorId)}` : ""}
                    </p>
                  </div>
                  {m.status === "scheduled" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="xs" variant="ghost" onClick={() => setScheduling({ session: m })}>
                        Reschedule
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => join(m)}>
                        <ModeIcon className="size-3.5" /> {m.mode === "Video" ? "Join" : m.mode === "Phone" ? "Call" : "Check in"}
                      </Button>
                      <Button size="xs" onClick={() => complete(m)}>
                        <Check className="size-3.5" /> Mark completed
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
            {today.length === 0 ? <li className="px-5 py-8 text-center text-[13px] text-ink-3">No sessions today.</li> : null}
          </ul>
        </Card>

        {/* ------------------------------------------------------------ interventions due */}
        <Card className="min-w-0">
          <CardHeader title="Interventions due" sub="Your action-plan tasks this week and outcomes still to record" />
          <ul className="divide-y divide-line border-t border-line">
            {openTasks.map(({ key, plan, task }) => {
              const s = studentById(plan.studentId)!;
              return (
                <li key={key} className="flex items-start gap-3 px-5 py-3">
                  <button
                    type="button"
                    aria-label={`Mark done: ${task.label}`}
                    onClick={() => {
                      setDoneTasks((d) => [...d, key]);
                      toast({ title: "Task marked done", body: `${s.name} · ${task.label}` });
                    }}
                    className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border border-line-strong bg-surface text-transparent transition-colors hover:border-ink hover:bg-cta-soft hover:text-ink"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">{task.label}</p>
                    <p className="text-[12px] text-ink-3">
                      {s.name} · {plan.title}
                    </p>
                  </div>
                  <StatusPill status={task.due <= TODAY ? "overdue" : "due"} size="sm">
                    {dueLabel(task.due)}
                  </StatusPill>
                </li>
              );
            })}
            {pendingOutcomes.map((iv) => {
              const s = studentById(iv.studentId)!;
              return (
                <li key={iv.id} className="flex items-start gap-3 px-5 py-3">
                  <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-amber" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-ink">Record outcome: {iv.action}</p>
                    <p className="text-[12px] text-ink-3">
                      {s.name} · {iv.metric} was {iv.before} on {shortDate(iv.startedOn)}
                    </p>
                  </div>
                  <LinkButton href="/mentor/plans?tab=outcomes" size="xs" variant="outline">
                    Record
                  </LinkButton>
                </li>
              );
            })}
            {interventionsDue === 0 ? <li className="px-5 py-8 text-center text-[13px] text-ink-3">Nothing due this week.</li> : null}
          </ul>
        </Card>
      </div>

      {/* ------------------------------------------------------------ recent outcomes */}
      <Card>
        <CardHeader
          title="Recent outcomes"
          sub="Interventions closed in the last month and what changed"
          action={
            <Link href="/mentor/plans?tab=outcomes" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
              Intervention outcomes <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          }
        />
        <div className="grid gap-5 px-5 pb-5 md:grid-cols-[auto_minmax(0,1fr)] md:items-start">
          <div className="flex items-center gap-4 md:flex-col md:items-start">
            <Donut
              size={116}
              stroke={14}
              segments={[
                { label: "Improved", value: counts.improved, tone: "jade" },
                { label: "No change", value: counts["no-change"], tone: "ink-3" },
                { label: "Worsened", value: counts.worsened, tone: "rose" },
              ]}
              center={
                <span>
                  <span className="block font-display text-[24px] leading-none font-bold text-ink tnum">{closed.length ? Math.round((counts.improved / closed.length) * 100) : 0}%</span>
                  <span className="text-[11px] text-ink-3">improved</span>
                </span>
              }
            />
            <ul className="space-y-1.5 text-[12.5px]">
              {(
                [
                  ["Improved", counts.improved, "bg-jade"],
                  ["No change", counts["no-change"], "bg-ink-3"],
                  ["Worsened", counts.worsened, "bg-rose"],
                ] as const
              ).map(([label, n, dot]) => (
                <li key={label} className="flex items-center gap-2 text-ink-2">
                  <span aria-hidden className={cn("size-2.5 rounded-full", dot)} />
                  {label}
                  <span className="font-semibold text-ink tnum">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <ul className="grid min-w-0 gap-2.5 sm:grid-cols-2">
            {closed.slice(0, 6).map((iv) => {
              const s = studentById(iv.studentId)!;
              const delta = (iv.after ?? iv.before) - iv.before;
              return (
                <li key={iv.id} className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13.5px] font-bold text-ink">{s.name}</span>
                    <StatusPill status={iv.outcome} size="sm">
                      {OUTCOME_LABEL[iv.outcome]}
                    </StatusPill>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12.5px] text-ink-2">{iv.action}</p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-2 text-[12px] text-ink-3">
                    <span>{iv.metric}</span>
                    <span className="font-mono font-semibold text-ink tnum">
                      {iv.before} to {iv.after}
                    </span>
                    <span className={cn("font-mono font-semibold tnum", delta > 0 ? "text-jade" : delta < 0 ? "text-rose" : "text-ink-3")}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                    {iv.closedOn ? <span>· closed {formatAccaDate(iv.closedOn)}</span> : null}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      </Card>

      <ScheduleSessionDrawer
        open={scheduling != null}
        onClose={() => setScheduling(null)}
        scope={scope}
        session={scheduling?.session}
        onSave={(next) =>
          setSessions((list) => (list.some((x) => x.id === next.id) ? list.map((x) => (x.id === next.id ? next : x)) : [...list, next]))
        }
      />
    </div>
  );
}
