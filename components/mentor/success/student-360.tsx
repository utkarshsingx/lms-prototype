"use client";

import { useState } from "react";
import { CalendarPlus, ListChecks, Send } from "lucide-react";
import {
  EXAMS_TO_QUALIFY,
  activityWeekLabels,
  attemptHistory,
  classesForStudent,
  cohortById,
  formatAccaDate,
  formatShortDate,
  formatTime,
  isoDaysAgo,
  paperName,
  per as perRule,
  staffName,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BarChart, LineChart } from "@/components/ui/charts";
import { Drawer } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { Stepper } from "@/components/ui/stepper";
import { Tabs } from "@/components/ui/tabs";
import {
  MiniLabel,
  TypePill,
  ago,
  clearedCount,
  completedMocks,
  journeySteps,
  nextClassFor,
  nextMock,
  plural,
} from "./shared";

export type Student360Tab = "journey" | "attendance" | "activity" | "mocks" | "readiness" | "attempts";

export type Student360Action = "session" | "reminder" | "plan";

const TABS: { id: Student360Tab; label: string }[] = [
  { id: "journey", label: "ACCA journey" },
  { id: "attendance", label: "Attendance" },
  { id: "activity", label: "Learning activity" },
  { id: "mocks", label: "Mock performance" },
  { id: "readiness", label: "Readiness scores" },
  { id: "attempts", label: "Attempts and results" },
];

/** The last six readiness readings are monthly, ending this month. */
const TREND_MONTHS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

export function Student360Drawer({
  student,
  onClose,
  initialTab = "journey",
  showMentor = false,
  onAction,
}: {
  student: Student | null;
  onClose: () => void;
  initialTab?: Student360Tab;
  /** Placement users see learners of several mentors. */
  showMentor?: boolean;
  onAction?: (action: Student360Action, student: Student) => void;
}) {
  return (
    <Drawer
      open={student != null}
      onClose={onClose}
      width="w-full max-w-2xl"
      title={student ? student.name : "Student"}
      sub={student ? `${student.accaId ? `ACCA ID ${student.accaId}` : "Not registered with ACCA"} · ${student.city}` : undefined}
      footer={
        student && onAction ? (
          <>
            <Button type="button" variant="ghost" size="sm" onClick={() => onAction("reminder", student)}>
              <Send className="size-4" /> Send reminder
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onAction("plan", student)}>
              <ListChecks className="size-4" /> Create action plan
            </Button>
            <Button type="button" size="sm" onClick={() => onAction("session", student)}>
              <CalendarPlus className="size-4" /> Schedule session
            </Button>
          </>
        ) : null
      }
    >
      {student ? <Body key={student.id} s={student} initialTab={initialTab} showMentor={showMentor} /> : null}
    </Drawer>
  );
}

function Body({ s, initialTab, showMentor }: { s: Student; initialTab: Student360Tab; showMentor: boolean }) {
  const [tab, setTab] = useState<Student360Tab>(initialTab);
  const readiness = s.currentPaper ? (s.readiness.byPaper[s.currentPaper] ?? s.readiness.overall) : s.readiness.overall;
  return (
    <div>
      <div className="space-y-4 px-5 pt-5">
        <div className="flex items-start gap-3.5">
          <Avatar name={s.name} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <TypePill student={s} />
              <RiskBadge level={s.risk.level} />
              {s.currentPaper ? (
                <StatusPill status="current" dot={false}>
                  Current paper {s.currentPaper}
                </StatusPill>
              ) : (
                <StatusPill status="onboarding">Onboarding</StatusPill>
              )}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-ink-3">
              {s.cohortIds.map((id) => cohortById(id)?.name).filter(Boolean).join(" · ") || "No cohort yet"}
              {s.semester ? ` · Semester ${s.semester}${s.section ? `, section ${s.section}` : ""}` : ""}
              {showMentor ? ` · Mentor ${staffName(s.mentorId)}` : ""}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Attendance", value: s.attendance.total ? `${s.attendance.pct}%` : "Not started" },
            { label: "Readiness score", value: String(readiness) },
            { label: "Last active", value: ago(isoDaysAgo(s.lastActiveDaysAgo)) },
            { label: "Papers cleared", value: `${clearedCount(s)} of ${EXAMS_TO_QUALIFY}` },
          ].map((k) => (
            <div key={k.label} className="min-w-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5">
              <dt className="truncate text-[11.5px] text-ink-3">{k.label}</dt>
              <dd className="mt-0.5 truncate font-display text-[18px] leading-tight font-bold tracking-[-0.02em] text-ink tnum">{k.value}</dd>
            </div>
          ))}
        </dl>
        {s.risk.reasons.length ? (
          <ul className="flex flex-wrap gap-1.5">
            {s.risk.reasons.map((r) => (
              <li key={r}>
                <StatusPill status="at risk" tone={s.risk.level === "high" ? "rose" : "amber"} size="sm">
                  {r}
                </StatusPill>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Tabs items={TABS} value={tab} onChange={(id) => setTab(id as Student360Tab)} className="mt-4 px-3" />

      <div className="px-5 py-5">
        {tab === "journey" ? <JourneyTab s={s} /> : null}
        {tab === "attendance" ? <AttendanceTab s={s} /> : null}
        {tab === "activity" ? <ActivityTab s={s} /> : null}
        {tab === "mocks" ? <MocksTab s={s} /> : null}
        {tab === "readiness" ? <ReadinessTab s={s} /> : null}
        {tab === "attempts" ? <AttemptsTab s={s} /> : null}
      </div>
    </div>
  );
}

function JourneyTab({ s }: { s: Student }) {
  const upcoming = s.examBookings.filter((b) => b.status !== "sat" && b.status !== "cancelled");
  return (
    <div className="space-y-5">
      <Stepper steps={journeySteps(s)} orientation="vertical" aria-label={`${s.name} ACCA journey`} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[var(--radius-md)] border border-line p-3.5">
          <div className="flex items-center justify-between gap-2">
            <MiniLabel>Ethics and Professional Skills Module</MiniLabel>
            <StatusPill status={s.epsm.status} size="sm" />
          </div>
          <Progress value={s.epsm.progress} tone="jade" className="mt-3" />
          <p className="mt-1.5 text-[12px] text-ink-3">
            {s.epsm.completedOn ? `Completed ${formatAccaDate(s.epsm.completedOn)}` : `${s.epsm.progress}% complete`}
          </p>
        </div>
        <div className="rounded-[var(--radius-md)] border border-line p-3.5">
          <div className="flex items-center justify-between gap-2">
            <MiniLabel>Practical Experience Requirement</MiniLabel>
            <StatusPill status={s.per.status} size="sm" />
          </div>
          <Progress value={(s.per.months / perRule.monthsRequired) * 100} tone="brand" className="mt-3" />
          <p className="mt-1.5 text-[12px] text-ink-3">
            {s.per.months} of {perRule.monthsRequired} months · {s.per.objectives.length} of {perRule.objectivesRequired} objectives
            {s.per.employer ? ` · ${s.per.employer}` : ""}
          </p>
        </div>
      </div>
      {upcoming.length ? (
        <div>
          <MiniLabel className="mb-2">Exam bookings</MiniLabel>
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {upcoming.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="min-w-0 text-[13px] text-ink">
                  <span className="font-mono font-semibold">{b.paper}</span> · {b.label}
                  <span className="text-ink-3"> · {b.entryWindow === "on-demand" ? "On-demand CBE" : `${b.entryWindow} entry`}</span>
                </span>
                <StatusPill status={b.status} size="sm" />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function AttendanceTab({ s }: { s: Student }) {
  if (!s.attendance.total) {
    return <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">Not started. Classes begin with the learner&apos;s first cohort.</p>;
  }
  const past = classesForStudent(s.id)
    .filter((c) => c.status === "completed")
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, 6);
  // Mark the recorded last miss, then spread the learner's miss rate over the rest of the list.
  const missShare = Math.round((past.length * s.attendance.missedClasses) / s.attendance.total);
  const missed = new Set<string>();
  const last = past.find((c) => c.start.slice(0, 10) === s.attendance.lastMissed);
  if (last) missed.add(last.id);
  for (let i = past.length - 1; i >= 0 && missed.size < missShare; i -= 2) missed.add(past[i].id);
  const next = nextClassFor(s);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <ScoreRing value={s.attendance.pct} size={92} stroke={8} label="Attendance in ACCA sessions" showBand />
        <div className="min-w-0 space-y-3">
          <ScoreBar value={s.attendance.pct} marker={75} label="Attendance in live classes · 75% expected" />
          <p className="text-[13px] text-ink-2">
            Attended {s.attendance.attended} of {s.attendance.total} classes · {plural(s.attendance.missedClasses, "class", "classes")} missed
            {s.attendance.lastMissed ? ` · last missed ${formatAccaDate(s.attendance.lastMissed)}` : ""}
          </p>
        </div>
      </div>
      <div>
        <MiniLabel className="mb-2">Recent classes</MiniLabel>
        <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
          {past.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">
                  {c.paper} · {c.title}
                </span>
                <span className="block text-[12px] text-ink-3">
                  {formatShortDate(c.start.slice(0, 10))}, {formatTime(c.start)} · {staffName(c.facultyId)}
                </span>
              </span>
              <StatusPill status={missed.has(c.id) ? "missed" : "attended"} size="sm" />
            </li>
          ))}
        </ul>
        {next ? (
          <p className="mt-2 text-[12.5px] text-ink-3">
            Next class: {next.paper} · {next.title} · {formatShortDate(next.start.slice(0, 10))}, {formatTime(next.start)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ActivityTab({ s }: { s: Student }) {
  const hours = s.activityHours;
  const recent = hours.slice(-4).reduce((a, b) => a + b, 0);
  const earlier = hours.slice(0, 4).reduce((a, b) => a + b, 0);
  const avg = Math.round((hours.reduce((a, b) => a + b, 0) / hours.length) * 10) / 10;
  const change = recent - earlier;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Last week", value: `${hours[hours.length - 1]}h` },
          { label: "8-week average", value: `${avg}h` },
          { label: "Last active", value: ago(isoDaysAgo(s.lastActiveDaysAgo)) },
        ].map((k) => (
          <div key={k.label} className="min-w-0 rounded-[var(--radius-md)] border border-line px-3 py-2.5">
            <p className="truncate text-[11.5px] text-ink-3">{k.label}</p>
            <p className="mt-0.5 truncate font-display text-[18px] font-bold tracking-[-0.02em] text-ink tnum">{k.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-[var(--radius-md)] border border-line p-4">
        <MiniLabel className="mb-3">Study hours per week</MiniLabel>
        <BarChart data={hours} labels={activityWeekLabels} tone={s.lastActiveDaysAgo >= 14 ? "rose" : "brand"} height={130} />
      </div>
      <p className={cn("text-[13px]", change < 0 ? "text-rose" : "text-ink-2")}>
        {change === 0
          ? "Study time is steady across the last eight weeks."
          : change > 0
            ? `Up ${change} hours over the last four weeks compared with the four before.`
            : `Down ${-change} hours over the last four weeks compared with the four before.`}
      </p>
    </div>
  );
}

function MocksTab({ s }: { s: Student }) {
  const done = completedMocks(s);
  const upcoming = nextMock(s);
  const sorted = [...s.mocks].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="space-y-5">
      {done.length > 1 ? (
        <div className="rounded-[var(--radius-md)] border border-line p-4">
          <MiniLabel className="mb-3">Mock and progress test scores</MiniLabel>
          <LineChart
            series={[{ label: "Score", values: done.map((m) => m.score ?? 0), tone: "brand" }]}
            labels={done.map((m) => `${m.paper} ${formatShortDate(m.date)}`)}
            min={0}
            max={100}
            unit="%"
            height={150}
          />
        </div>
      ) : null}
      <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
        {sorted.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-ink">{m.title}</span>
              <span className="block text-[12px] text-ink-3">{formatAccaDate(m.date)} · {paperName(m.paper)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {m.score != null ? (
                <span className={cn("font-mono text-[13px] font-bold tnum", m.score >= 50 ? "text-jade" : "text-rose")}>{m.score}%</span>
              ) : null}
              <StatusPill status={m.status} size="sm" />
            </span>
          </li>
        ))}
      </ul>
      {upcoming ? (
        <p className="text-[12.5px] text-ink-3">
          Next: {upcoming.title} on {formatAccaDate(upcoming.date)}. {s.missedMocks ? `${plural(s.missedMocks, "mock")} missed this cycle.` : ""}
        </p>
      ) : null}
    </div>
  );
}

function ReadinessTab({ s }: { s: Student }) {
  const byPaper = Object.entries(s.readiness.byPaper) as [PaperCode, number][];
  const trend = s.readinessTrend;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <div className="grid justify-items-center gap-1.5">
          <ScoreRing value={s.readiness.overall} size={104} stroke={9} label="Overall readiness score" showBand />
          <span className="text-[12px] text-ink-3">Overall</span>
        </div>
        <div className="min-w-0 space-y-3">
          {byPaper.map(([code, v]) => (
            <ScoreBar key={code} value={v} marker={50} label={`${code} · ${paperName(code)}`} />
          ))}
          <p className="text-[12px] text-ink-3">The tick marks the ACCA pass mark of 50. Exam entry is recommended at 70.</p>
        </div>
      </div>
      {trend.length > 1 ? (
        <div className="rounded-[var(--radius-md)] border border-line p-4">
          <MiniLabel className="mb-3">Readiness trend · monthly</MiniLabel>
          <LineChart
            series={[{ label: "Readiness score", values: trend, tone: "brand" }]}
            labels={TREND_MONTHS.slice(-trend.length)}
            min={0}
            max={100}
            height={140}
          />
        </div>
      ) : (
        <p className="text-[12.5px] text-ink-3">One reading so far: the trend builds as the learner sits practice tests.</p>
      )}
    </div>
  );
}

function AttemptsTab({ s }: { s: Student }) {
  const history = attemptHistory(s);
  const exempt = s.exemptions.filter((e) => e.state === "approved");
  return (
    <div className="space-y-5">
      {history.length ? (
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-line">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                <th className="px-3.5 py-2">Paper</th>
                <th className="px-3.5 py-2">Session</th>
                <th className="px-3.5 py-2 text-right">Score</th>
                <th className="px-3.5 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {history.map((a, i) => (
                <tr key={`${a.paper}-${a.date}-${i}`} className="border-t border-line">
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className="font-mono font-semibold">{a.paper}</span> <span className="text-ink-3">{a.paperName}</span>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap text-ink-2">{a.label}</td>
                  <td className="px-3.5 py-2.5 text-right font-mono tnum">{a.score != null ? `${a.score}%` : "·"}</td>
                  <td className="px-3.5 py-2.5">
                    <StatusPill status={a.result === "pending" ? "results pending" : a.result} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">
          No ACCA exam attempts yet.
        </p>
      )}
      {exempt.length ? (
        <div>
          <MiniLabel className="mb-2">ACCA-approved exemptions</MiniLabel>
          <div className="flex flex-wrap gap-1.5">
            {exempt.map((e) => (
              <StatusPill key={e.paper} status="exempt" size="sm">
                {e.paper} exempt
              </StatusPill>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
