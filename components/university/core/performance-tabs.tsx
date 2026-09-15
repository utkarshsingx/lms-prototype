"use client";

import { useState } from "react";
import { AlertTriangle, CalendarClock, Gauge, HeartHandshake, MessageSquareShare, Siren, TrendingUp } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  alertsForStudent,
  escalations,
  formatAccaDate,
  formatDateTime,
  interventions,
  mentoringSessions,
  paperName,
  recoveryPlans,
  RISK_ALERT_LABELS,
  staffName,
  type Intervention,
  type Student,
} from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { ScoreBar, scoreBand } from "@/components/ui/score";
import { LineChart, Sparkline, StackedBar } from "@/components/ui/charts";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { Avatar } from "@/components/ui/avatar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { average, intakeShort, RISK_ORDER, type SectionInfo } from "./data";
import { GatedButton, MiniLabel, plural, useUniversityWorkspace } from "./shared";

const TREND_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

function currentReadiness(s: Student) {
  return s.currentPaper ? (s.readiness.byPaper[s.currentPaper] ?? s.readiness.overall) : s.readiness.overall;
}

/* ------------------------------------------------------------------ readiness */

export function ReadinessTab({ roster, sections }: { roster: Student[]; sections: SectionInfo[] }) {
  const [band, setBand] = useState("");
  const bandOf = (s: Student) => scoreBand(s.readiness.overall).label;
  const rows = band ? roster.filter((s) => bandOf(s) === band) : roster;

  const intakes = [...new Set(roster.map((s) => s.intakeId))].sort();
  const series = [
    ...intakes.map((id, i) => {
      const group = roster.filter((s) => s.intakeId === id && s.readinessTrend.length === TREND_LABELS.length);
      return {
        label: intakeShort(id),
        values: TREND_LABELS.map((_, w) => average(group.map((s) => s.readinessTrend[w]))),
        tone: i === 0 ? "info" : "violet",
      };
    }),
    { label: "Exam entry target", values: TREND_LABELS.map(() => 70), tone: "ink-3" },
  ];

  const columns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{s.name}</span>
          <span className="block text-[12px] text-ink-3">
            {intakeShort(s.intakeId)} · Section {s.section}
          </span>
        </span>
      ),
    },
    {
      key: "current",
      header: "Current paper readiness",
      sortable: true,
      sortValue: currentReadiness,
      render: (s) => (
        <span className="flex w-44 items-center gap-2">
          <span className="w-8 shrink-0 font-mono text-[12px] font-semibold text-ink">{s.currentPaper ?? "None"}</span>
          <ScoreBar value={currentReadiness(s)} marker={70} className="flex-1" height={6} />
        </span>
      ),
    },
    { key: "overall", header: "Overall", align: "center", mono: true, sortable: true, sortValue: (s) => s.readiness.overall, render: (s) => s.readiness.overall },
    {
      key: "trend",
      header: "Six-month trend",
      render: (s) => (
        <span className="block w-24">
          <Sparkline data={s.readinessTrend} tone={scoreBand(s.readiness.overall).tone} height={26} />
        </span>
      ),
    },
    {
      key: "change",
      header: "Change",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (s) => (s.readinessTrend.at(-1) ?? 0) - (s.readinessTrend[0] ?? 0),
      render: (s) => {
        const d = (s.readinessTrend.at(-1) ?? 0) - (s.readinessTrend[0] ?? 0);
        return <span className={cn("font-semibold", d > 0 ? "text-jade" : d < 0 ? "text-rose" : "text-ink-3")}>{d > 0 ? `+${d}` : d}</span>;
      },
    },
    {
      key: "band",
      header: "Band",
      sortable: true,
      sortValue: (s) => s.readiness.overall,
      render: (s) => {
        const b = scoreBand(s.readiness.overall);
        return (
          <StatusPill status={b.label} tone={b.tone}>
            {b.label}
          </StatusPill>
        );
      },
    },
  ];

  const count = (label: string) => roster.filter((s) => bandOf(s) === label).length;

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile hero label="Average ACCA readiness score" value={average(roster.map((s) => s.readiness.overall))} icon={<Gauge />} sub="Target 70 before exam entry" />
        <KpiTile label="Strong, 70 and above" value={count("Strong")} tone="jade" sub="Ready to book" />
        <KpiTile label="Borderline, 50 to 69" value={count("Borderline")} tone="amber" sub="Revision plan advised" />
        <KpiTile label="At risk, below 50" value={count("At risk")} tone="rose" sub="Mentor follow-up" goodWhen="down" />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Readiness bands by section</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">Learners in each band, overall readiness score</p>
          <StackedBar
            rows={sections.map((sec) => {
              const group = roster.filter((s) => s.sectionId === sec.id);
              const n = (label: string) => group.filter((s) => bandOf(s) === label).length;
              return {
                label: sec.short,
                parts: [
                  { label: "Strong", value: n("Strong"), tone: "jade" },
                  { label: "Borderline", value: n("Borderline"), tone: "amber" },
                  { label: "At risk", value: n("At risk"), tone: "rose" },
                ],
              };
            })}
          />
        </Card>
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Readiness trend</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">Average readiness score by intake against the exam entry target</p>
          <LineChart series={series} labels={TREND_LABELS} min={30} max={90} height={180} />
        </Card>
      </div>

      <DataTable
        caption="ACCA readiness scores"
        rows={rows}
        columns={columns}
        getRowId={(s) => s.id}
        pageSize={10}
        initialSort={{ key: "current", dir: "asc" }}
        search={{ placeholder: "Search name", match: (s, q) => s.name.toLowerCase().includes(q) }}
        filters={
          <FilterSelect label="Band" allLabel="All" value={band} onChange={setBand} options={["Strong", "Borderline", "At risk"]} />
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ at-risk students */

export function AtRiskTab({ roster }: { roster: Student[] }) {
  const { uni, canEdit, reason } = useUniversityWorkspace();
  const [level, setLevel] = useState("");
  const [requested, setRequested] = useState<string[]>([]);

  const atRisk = roster
    .filter((s) => s.risk.level !== "low" && (!level || s.risk.level === level))
    .sort((a, b) => RISK_ORDER[a.risk.level] - RISK_ORDER[b.risk.level] || a.readiness.overall - b.readiness.overall);
  const openAlerts = roster.flatMap((s) => alertsForStudent(s.id)).filter((a) => a.status === "new" || a.status === "acknowledged");

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile hero label="At-risk students" value={uni.headline.atRisk} icon={<AlertTriangle />} sub={`Across ${uni.shortName}`} />
        <KpiTile label="High risk" value={roster.filter((s) => s.risk.level === "high").length} tone="rose" sub="In the listed records" goodWhen="down" />
        <KpiTile label="Medium risk" value={roster.filter((s) => s.risk.level === "medium").length} tone="amber" sub="In the listed records" goodWhen="down" />
        <KpiTile label="Open risk alerts" value={openAlerts.length} tone="info" icon={<Siren />} sub="New or acknowledged by mentors" />
      </KpiRow>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FilterSelect
          label="Risk"
          allLabel="High and medium"
          value={level}
          onChange={setLevel}
          options={[
            { value: "high", label: "High" },
            { value: "medium", label: "Medium" },
          ]}
        />
        <p className="text-[12.5px] text-ink-3">Mentors own the follow-up. You can ask for an update on any learner.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {atRisk.map((s) => {
          const alerts = alertsForStudent(s.id).filter((a) => a.status !== "resolved");
          const next = mentoringSessions
            .filter((m) => m.studentId === s.id && m.status === "scheduled")
            .sort((a, b) => a.start.localeCompare(b.start))[0];
          const plan = recoveryPlans.find((r) => r.studentId === s.id);
          const asked = requested.includes(s.id);
          return (
            <Card key={s.id} className="flex min-w-0 flex-col p-5">
              <div className="flex items-start gap-3">
                <Avatar name={s.name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">{s.name}</p>
                  <p className="truncate text-[12.5px] text-ink-3">
                    {intakeShort(s.intakeId)} · Semester {s.semester} · Section {s.section}
                  </p>
                </div>
                <RiskBadge level={s.risk.level} />
              </div>

              <ul className="mt-3 space-y-1">
                {s.risk.reasons.map((r) => (
                  <li key={r} className="flex items-start gap-2 text-[13px] text-ink">
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", s.risk.level === "high" ? "bg-rose" : "bg-amber")} />
                    {r}
                  </li>
                ))}
              </ul>

              <dl className="mt-3 grid grid-cols-3 gap-2 rounded-[12px] bg-surface-2 px-3 py-2.5 text-center">
                <div>
                  <dt className="text-[11px] text-ink-3">Attendance</dt>
                  <dd className={cn("font-mono text-[14px] font-bold", s.attendance.pct < 75 ? "text-rose" : "text-ink")}>{s.attendance.pct}%</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-3">Readiness</dt>
                  <dd className={cn("font-mono text-[14px] font-bold", s.readiness.overall < 50 ? "text-rose" : "text-ink")}>{s.readiness.overall}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-3">Last active</dt>
                  <dd className={cn("font-mono text-[14px] font-bold", s.lastActiveDaysAgo >= 14 ? "text-rose" : "text-ink")}>
                    {s.lastActiveDaysAgo === 0 ? "Today" : `${s.lastActiveDaysAgo}d`}
                  </dd>
                </div>
              </dl>

              {alerts.length ? (
                <div className="mt-3">
                  <MiniLabel className="mb-1.5">Risk alerts</MiniLabel>
                  <ul className="space-y-1">
                    {alerts.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                        <span className="min-w-0 truncate text-ink-2">
                          {RISK_ALERT_LABELS[a.kind]} · {a.title}
                        </span>
                        <StatusPill status={a.status} size="sm" />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {plan ? (
                <p className="mt-3 rounded-[10px] border border-line px-3 py-2 text-[12.5px] text-ink-2">
                  <span className="font-semibold text-ink">Recovery plan:</span> {plan.paper} {plan.score}% in {plan.failedSessionLabel}, resit{" "}
                  {plan.targetLabel} · <StatusPill status={plan.status} size="sm" />
                </p>
              ) : null}

              <div className="mt-auto pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3.5">
                <p className="min-w-0 text-[12.5px] text-ink-3">
                  Mentor <span className="font-semibold text-ink">{staffName(s.mentorId)}</span>
                  {next ? ` · next session ${formatDateTime(next.start)}` : " · no session booked"}
                </p>
                {asked ? (
                  <StatusPill status="requested">Update requested</StatusPill>
                ) : (
                  <GatedButton
                    allowed={canEdit}
                    reason={reason}
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setRequested((list) => [...list, s.id]);
                      toast({ title: "Update requested", body: `${staffName(s.mentorId)} will reply on ${s.name}'s plan by ${formatAccaDate(addDays(ACCA_TODAY, 2))}.` });
                    }}
                  >
                    <MessageSquareShare className="size-4" />
                    Request mentor update
                  </GatedButton>
                )}
              </div>
              </div>
            </Card>
          );
        })}
      </div>
      {atRisk.length === 0 ? (
        <p className="rounded-[16px] border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-ink-3">
          No learners at this risk level in the selected section.
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ mentor interventions */

type IvRow = Intervention & { student: Student };

export function InterventionsTab({ roster }: { roster: Student[] }) {
  const [outcome, setOutcome] = useState("");
  const ids = new Set(roster.map((s) => s.id));
  const byId = new Map(roster.map((s) => [s.id, s]));
  const ivs: IvRow[] = interventions.filter((i) => ids.has(i.studentId)).map((i) => ({ ...i, student: byId.get(i.studentId)! }));
  const plans = recoveryPlans.filter((r) => ids.has(r.studentId));
  const sessions = mentoringSessions.filter((m) => ids.has(m.studentId));
  const upcoming = sessions.filter((m) => m.status === "scheduled").sort((a, b) => a.start.localeCompare(b.start));
  const weekEnd = addDays(ACCA_TODAY, 6);
  const thisWeek = upcoming.filter((m) => m.start.slice(0, 10) <= weekEnd);
  const esc = escalations.filter((e) => ids.has(e.studentId));
  const rows = outcome ? ivs.filter((i) => i.outcome === outcome) : ivs;

  const events: (TimelineItem & { at: string })[] = [
    ...ivs.map((i) => ({
      id: `iv-${i.id}`,
      at: i.closedOn ?? i.startedOn,
      title: `${i.student.name}: ${i.action.toLowerCase()}`,
      meta: `${formatAccaDate(i.closedOn ?? i.startedOn)} · ${staffName(i.mentorId)} · ${i.closedOn ? "closed" : "opened"}`,
      body: `${i.metric} ${i.before} to ${i.after ?? "open"}. Trigger: ${i.trigger}.`,
      tone: (i.outcome === "improved" ? "jade" : i.outcome === "worsened" ? "rose" : "amber") as TimelineItem["tone"],
      icon: <HeartHandshake />,
    })),
    ...sessions
      .filter((m) => m.status === "completed")
      .map((m) => ({
        id: `ms-${m.id}`,
        at: m.start.slice(0, 10),
        title: `Mentoring session with ${byId.get(m.studentId)?.name}`,
        meta: `${formatDateTime(m.start)} · ${staffName(m.mentorId)} · ${m.mode}`,
        body: m.agenda,
        tone: "info" as const,
        icon: <CalendarClock />,
      })),
    ...esc.map((e) => ({
      id: `esc-${e.id}`,
      at: e.raisedOn,
      title: `Escalated: ${e.subject}`,
      meta: `${formatAccaDate(e.raisedOn)} · ${staffName(e.raisedBy)} to ${staffName(e.toId)} · ${e.kind}`,
      body: `${byId.get(e.studentId)?.name}. ${e.detail}`,
      tone: (e.status === "resolved" ? "jade" : "rose") as TimelineItem["tone"],
      icon: <Siren />,
    })),
    ...plans.map((p) => ({
      id: `rec-${p.id}`,
      at: p.steps[0]?.due ?? ACCA_TODAY,
      title: `Recovery plan for ${byId.get(p.studentId)?.name}: ${p.paper}`,
      meta: `${formatAccaDate(p.steps[0]?.due ?? ACCA_TODAY)} · ${staffName(p.mentorId)} with ${staffName(p.facultyId)}`,
      body: `${paperName(p.paper)} ${p.score}% in ${p.failedSessionLabel}. Resit ${p.targetLabel}. Weak areas: ${p.weakAreas.join(", ")}.`,
      tone: (p.status === "at-risk" ? "rose" : "jade") as TimelineItem["tone"],
      icon: <TrendingUp />,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const columns: DataTableColumn<IvRow>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: (i) => i.student.name, render: (i) => <span className="font-semibold text-ink">{i.student.name}</span> },
    { key: "trigger", header: "Trigger", wrap: true, className: "min-w-44 text-ink-2" },
    { key: "action", header: "Intervention", wrap: true, className: "min-w-44" },
    { key: "mentor", header: "Mentor", sortable: true, sortValue: (i) => staffName(i.mentorId), render: (i) => staffName(i.mentorId) },
    { key: "startedOn", header: "Period", sortable: true, render: (i) => `${formatAccaDate(i.startedOn)}${i.closedOn ? ` to ${formatAccaDate(i.closedOn)}` : ""}` },
    {
      key: "metric",
      header: "Measure",
      render: (i) => {
        const d = i.after == null ? null : i.after - i.before;
        return (
          <span className="whitespace-nowrap">
            <span className="text-ink-3">{i.metric} </span>
            <span className="font-mono text-ink">
              {i.before} to {i.after ?? "open"}
            </span>
            {d != null ? <span className={cn("ml-1.5 font-mono font-semibold", d > 0 ? "text-jade" : d < 0 ? "text-rose" : "text-ink-3")}>{d > 0 ? `+${d}` : d}</span> : null}
          </span>
        );
      },
    },
    { key: "outcome", header: "Outcome", sortable: true, render: (i) => <StatusPill status={i.outcome} /> },
  ];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile label="Interventions recorded" value={ivs.length + plans.length} icon={<HeartHandshake />} sub={`${plural(plans.length, "failed-paper recovery plan")} included`} />
        <KpiTile label="Improved" value={ivs.filter((i) => i.outcome === "improved").length} tone="jade" sub="Measure moved the right way" />
        <KpiTile label="No change or worsened" value={ivs.filter((i) => i.outcome === "no-change" || i.outcome === "worsened").length} tone="rose" sub="Measure did not improve" goodWhen="down" />
        <KpiTile label="Mentoring sessions this week" value={thisWeek.length} tone="info" icon={<CalendarClock />} sub={`${sessions.filter((m) => m.status === "completed").length} completed this month`} />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Intervention timeline" sub="Interventions, sessions, escalations and recovery plans, newest first" />
          <div className="px-5 pb-5">
            <Timeline items={events} dense />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Upcoming mentoring sessions" sub={`${plural(upcoming.length, "session")} booked`} />
          <ul className="divide-y divide-line border-t border-line">
            {upcoming.map((m) => (
              <li key={m.id} className="flex items-start gap-3 px-5 py-3">
                <Avatar name={byId.get(m.studentId)?.name ?? ""} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{byId.get(m.studentId)?.name}</span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {formatDateTime(m.start)} · {m.mode} · {staffName(m.mentorId)}
                  </span>
                  <span className="block truncate text-[12px] text-ink-2">{m.agenda}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <DataTable
        caption="Mentor interventions"
        rows={rows}
        columns={columns}
        getRowId={(i) => i.id}
        empty={<p className="text-center text-[13px] text-ink-3">No interventions recorded for the selected section.</p>}
        filters={
          <FilterSelect
            label="Outcome"
            allLabel="All"
            value={outcome}
            onChange={setOutcome}
            options={[
              { value: "improved", label: "Improved" },
              { value: "no-change", label: "No change" },
              { value: "worsened", label: "Worsened" },
              { value: "pending", label: "Pending" },
            ]}
          />
        }
      />
    </div>
  );
}
