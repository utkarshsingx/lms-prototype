"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardPen,
  Download,
  Gauge,
  MessageSquareQuote,
  Mic,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer,
} from "lucide-react";
import { addDays, formatAccaDate, staffName, type CompanyReadiness, type Student } from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, LineChart, Sparkline } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Drawer } from "@/components/ui/modal";
import { Progress } from "@/components/ui/progress";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { formatCalendarDate } from "@/components/ui/calendar";
import { COMPETENCIES, INTERVIEW_TRACKS, QUESTION_BANK, trackFor, type InterviewTrack } from "./question-bank";
import { CareerBadges, Guard, READ_ONLY_REASON, ReadOnlyNotice, useCareerScope, type CareerScope } from "./scope";
import { MiniLabel, SECTION, StudentCell, average, primaryCohort, typeLabel } from "./shared";
import { TODAY, applyInterviewScore, updateCareers, useCareers, type CareerInterview } from "./store";

const TABS = [
  { id: "conduct", label: "Conduct mock interviews" },
  { id: "feedback", label: "Record interview feedback" },
  { id: "crs", label: "Track Company Readiness Scores" },
];

const TREND_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

const RECOMMENDATIONS = [
  "Ready for recruiter interviews",
  "One more mock interview before shortlisting",
  "Not ready yet: focus on ACCA papers first",
];

const CRS_BUCKETS = [
  { id: "lt45", label: "Below 45", test: (v: number) => v < 45 },
  { id: "45", label: "45 to 54", test: (v: number) => v >= 45 && v < 55 },
  { id: "55", label: "55 to 69", test: (v: number) => v >= 55 && v < 70 },
  { id: "70", label: "70 to 84", test: (v: number) => v >= 70 && v < 85 },
  { id: "85", label: "85 and above", test: (v: number) => v >= 85 },
];

function sortKey(i: CareerInterview) {
  return `${i.date}T${i.time ?? "00:00"}`;
}

function when(i: CareerInterview) {
  return `${formatCalendarDate(i.date, "day")}${i.time ? `, ${i.time}` : ""}`;
}

function interviewer(i: CareerInterview) {
  return i.kind === "ai" ? "AI interviewer" : staffName(i.interviewerId);
}

function mmss(sec: number) {
  return `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
}

export function MockInterviewsPage() {
  const scope = useCareerScope();
  const store = useCareers();
  const [tab, setTab] = useState("conduct");
  const [scheduleFor, setScheduleFor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; notes: string } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [crsStudent, setCrsStudent] = useState("");

  const interviews = useMemo(() => store.interviews.filter((i) => scope.ids.has(i.studentId)), [store.interviews, scope.ids]);
  const readiness = useMemo(() => store.readiness.filter((c) => scope.ids.has(c.studentId)), [store.readiness, scope.ids]);
  const upcoming = interviews.filter((i) => i.status === "scheduled").sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
  const awaiting = interviews.filter((i) => i.status === "awaiting-feedback");
  const completed = interviews.filter((i) => i.status === "completed");
  const recent = completed.filter((i) => i.date >= addDays(TODAY, -30));
  const avgCrs = average(readiness.map((c) => c.score));
  const avgCrsApr = average(readiness.map((c) => c.trend[0]));

  const studentOf = (id: string) => scope.students.find((s) => s.id === id);
  const openFeedback = (id: string, notes = "") => setFeedback({ id, notes });

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow={SECTION}
        title="Mock interviews"
        sub="Conduct mock interviews from a role-based question bank, record interview feedback against four competencies and track Company Readiness Scores."
        badge={<CareerBadges scope={scope} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Report queued: mock-interviews.csv", tone: "info" })}>
              <Download className="size-4" />
              Export
            </Button>
            <Guard allowed={scope.canEdit}>
              <Button disabled={!scope.canEdit} onClick={() => setScheduleFor("")}>
                <CalendarPlus className="size-4" />
                Schedule mock interview
              </Button>
            </Guard>
          </>
        }
      />

      <ReadOnlyNotice scope={scope} what="Mock interviews and interview feedback" />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Upcoming mock interviews"
          value={upcoming.length}
          icon={<Mic />}
          sub={upcoming[0] ? `Next: ${studentOf(upcoming[0].studentId)?.name} · ${when(upcoming[0])}` : "None scheduled"}
        />
        <KpiTile label="Completed in the last 30 days" value={recent.length} tone="jade" icon={<ClipboardPen />} sub={`${awaiting.length} awaiting feedback`} />
        <KpiTile label="Average interview score" value={average(recent.map((i) => i.score ?? 0))} tone="info" icon={<MessageSquareQuote />} sub="Last 30 days, AI and mentor" />
        <KpiTile
          label="Average Company Readiness Score"
          value={avgCrs}
          tone="amber"
          icon={<Gauge />}
          delta={`${avgCrs - avgCrsApr >= 0 ? "+" : ""}${avgCrs - avgCrsApr} since Apr`}
          trend={avgCrs >= avgCrsApr ? "up" : "down"}
        />
      </KpiRow>

      <Tabs
        items={TABS.map((t) => ({ ...t, count: t.id === "conduct" ? upcoming.length : t.id === "feedback" ? awaiting.length || undefined : undefined }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "conduct" ? (
        <ConductTab
          scope={scope}
          upcoming={upcoming}
          awaiting={awaiting}
          activeId={activeId ?? awaiting[0]?.id ?? upcoming[0]?.id ?? null}
          onSelect={setActiveId}
          onSchedule={() => setScheduleFor("")}
          onEnd={(id, notes) => {
            setActiveId(id);
            openFeedback(id, notes);
          }}
          onFeedback={(id) => openFeedback(id)}
          studentOf={studentOf}
        />
      ) : null}

      {tab === "feedback" ? (
        <FeedbackTab
          scope={scope}
          interviews={interviews}
          awaiting={awaiting}
          onRecord={(id) => openFeedback(id)}
          onView={setDetailId}
          studentOf={studentOf}
        />
      ) : null}

      {tab === "crs" ? (
        <ReadinessTab
          scope={scope}
          readiness={readiness}
          interviews={interviews}
          selected={crsStudent || readiness[0]?.studentId || ""}
          onSelect={setCrsStudent}
          onSchedule={(id) => setScheduleFor(id)}
        />
      ) : null}

      <ScheduleDrawer scope={scope} studentId={scheduleFor} onClose={() => setScheduleFor(null)} interviews={interviews} />

      <FeedbackDrawer
        scope={scope}
        target={feedback}
        interviews={interviews}
        readiness={readiness}
        onClose={() => setFeedback(null)}
        onSaved={() => setTab("feedback")}
      />

      <InterviewDetail interview={interviews.find((i) => i.id === detailId)} onClose={() => setDetailId(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ conduct */

function ConductTab({
  scope,
  upcoming,
  awaiting,
  activeId,
  onSelect,
  onSchedule,
  onEnd,
  onFeedback,
  studentOf,
}: {
  scope: CareerScope;
  upcoming: CareerInterview[];
  awaiting: CareerInterview[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onSchedule: () => void;
  onEnd: (id: string, notes: string) => void;
  onFeedback: (id: string) => void;
  studentOf: (id: string) => Student | undefined;
}) {
  const list = [...awaiting, ...upcoming];
  const active = list.find((i) => i.id === activeId) ?? list[0];

  return (
    <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <Card className="min-w-0 self-start">
        <CardHeader
          title="Scheduled mock interviews"
          sub={`${upcoming.length} upcoming with the career team`}
          action={
            <Guard allowed={scope.canEdit}>
              <Button size="xs" variant="outline" disabled={!scope.canEdit} onClick={onSchedule}>
                <CalendarPlus className="size-3.5" />
                Schedule
              </Button>
            </Guard>
          }
        />
        <ul className="space-y-1.5 px-3 pb-3">
          {list.length === 0 ? (
            <li className="rounded-[12px] border border-dashed border-line-strong px-3 py-6 text-center text-[12.5px] text-ink-3">
              No mock interviews scheduled for learners in your scope.
            </li>
          ) : (
            list.map((i) => {
              const s = studentOf(i.studentId);
              const on = i.id === active?.id;
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onSelect(i.id)}
                    className={cn(
                      "flex w-full min-w-0 items-start gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition-colors",
                      on ? "border-cta bg-cta-soft" : "border-transparent hover:bg-surface-2",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{s?.name}</span>
                      <span className="block truncate text-[12px] text-ink-3">{i.role}</span>
                      <span className="mt-1 block text-[12px] font-semibold text-ink-2 tnum">
                        {when(i)} · {i.durationMins} min
                      </span>
                    </span>
                    <StatusPill status={i.status} size="sm" dot={false} />
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </Card>

      {active ? (
        <InterviewConsole
          key={active.id}
          interview={active}
          scope={scope}
          studentName={studentOf(active.studentId)?.name ?? ""}
          studentSub={(() => {
            const s = studentOf(active.studentId);
            return s ? `${typeLabel(s.type)} · ${primaryCohort(s)}` : "";
          })()}
          onEnd={onEnd}
          onFeedback={onFeedback}
        />
      ) : (
        <EmptyState title="No interview selected" sub="Schedule a mock interview to open the interview panel." />
      )}
    </div>
  );
}

function InterviewConsole({
  interview,
  scope,
  studentName,
  studentSub,
  onEnd,
  onFeedback,
}: {
  interview: CareerInterview;
  scope: CareerScope;
  studentName: string;
  studentSub: string;
  onEnd: (id: string, notes: string) => void;
  onFeedback: (id: string) => void;
}) {
  const [track, setTrack] = useState<InterviewTrack>(trackFor(interview.role));
  const [started, setStarted] = useState(false);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [index, setIndex] = useState(0);
  const [asked, setAsked] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(t);
  }, [running]);

  const questions = QUESTION_BANK[track];
  const q = questions[Math.min(index, questions.length - 1)];
  const target = interview.durationMins * 60;
  const awaiting = interview.status === "awaiting-feedback";
  const canRun = scope.canEdit && !awaiting;

  const go = (next: number) => {
    const bounded = Math.max(0, Math.min(questions.length - 1, next));
    if (started && !asked.includes(q.id)) setAsked((a) => [...a, q.id]);
    setIndex(bounded);
    setFollowUp(false);
  };

  const start = () => {
    setStarted(true);
    setRunning(true);
    updateCareers((st) => ({
      interviews: st.interviews.map((i) => (i.id === interview.id ? { ...i, date: TODAY } : i)),
    }));
    toast({ title: "Mock interview started", body: `${studentName} · ${track} question bank`, tone: "info" });
  };

  const end = () => {
    setRunning(false);
    const summary = questions
      .filter((x) => notes[x.id]?.trim())
      .map((x) => `${x.competency}: ${notes[x.id].trim()}`)
      .join("\n");
    updateCareers((st) => ({
      interviews: st.interviews.map((i) =>
        i.id === interview.id ? { ...i, status: "awaiting-feedback", date: TODAY, role: track, durationMins: Math.max(5, Math.round(elapsed / 60)) } : i,
      ),
    }));
    toast({
      title: "Interview ended",
      body: `${studentName} · ${mmss(elapsed)} · ${asked.length + (asked.includes(q.id) ? 0 : 1)} of ${questions.length} questions asked. Record feedback next.`,
    });
    onEnd(interview.id, summary);
  };

  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4.5 pb-3.5">
        <div className="min-w-0">
          <MiniLabel>Interview panel</MiniLabel>
          <p className="mt-1 font-display text-[21px] leading-tight tracking-[var(--display-tracking)] text-ink">{studentName}</p>
          <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
            {studentSub} · {interview.role} · {when(interview)} · {interview.mode ?? "Video"} · {interviewer(interview)}
          </p>
        </div>
        <StatusPill status={started && running ? "In progress" : started ? "Paused" : interview.status} />
      </div>

      <div className="grid gap-4 border-t border-line px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <Field label="Question bank by role">
          <Select
            value={track}
            disabled={started}
            onChange={(e) => {
              setTrack(e.target.value as InterviewTrack);
              setIndex(0);
              setFollowUp(false);
            }}
          >
            {INTERVIEW_TRACKS.map((t) => (
              <option key={t} value={t}>
                {t} · {QUESTION_BANK[t].length} questions
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-live="polite"
            className={cn(
              "inline-flex h-10.5 items-center gap-2 rounded-[var(--radius-md)] border px-3 font-mono text-[18px] font-semibold tnum",
              elapsed > target ? "border-rose text-rose" : "border-line text-ink",
            )}
          >
            <Timer aria-hidden className="size-4 text-ink-3" />
            {mmss(elapsed)}
            <span className="text-[12px] font-medium text-ink-3">/ {interview.durationMins}:00</span>
          </span>
          {!started ? (
            <Guard allowed={canRun} reason={awaiting ? "This interview has ended. Record the feedback." : READ_ONLY_REASON}>
              <Button disabled={!canRun} onClick={start}>
                <Play className="size-4" />
                Start interview
              </Button>
            </Guard>
          ) : (
            <>
              <Button variant="outline" onClick={() => setRunning((r) => !r)}>
                {running ? <Pause className="size-4" /> : <Play className="size-4" />}
                {running ? "Pause" : "Resume"}
              </Button>
              <Button variant="ghost" onClick={() => setElapsed(0)} aria-label="Reset timer">
                <RotateCcw className="size-4" />
              </Button>
            </>
          )}
        </div>
        <Progress value={Math.min(100, (elapsed / target) * 100)} tone={elapsed > target ? "rose" : "cta"} className="md:col-span-2" />
      </div>

      <div className="grid gap-5 border-t border-line p-5 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <div className="min-w-0 space-y-4">
          <div className="rounded-[16px] border border-line bg-surface-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Badge tone="dark">{q.competency}</Badge>
              <span className="text-[12px] font-semibold text-ink-3 tnum">
                Question {index + 1} of {questions.length}
              </span>
            </div>
            <p className="mt-3 text-[16px] leading-snug font-semibold text-ink">{q.text}</p>
            {followUp ? (
              <p className="mt-3 rounded-r-[10px] border-l-[3px] border-cta bg-cta-soft px-3 py-2 text-[13.5px] text-ink">
                Follow-up: {q.followUp}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => go(index - 1)} disabled={index === 0}>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <Button size="sm" variant="outline" onClick={() => setFollowUp((f) => !f)}>
                {followUp ? "Hide follow-up" : "Ask follow-up"}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => go(index + 1)} disabled={index === questions.length - 1}>
                Next question
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <Field label="Interviewer notes for this question" hint="Carried into the feedback form">
            <Textarea
              rows={3}
              value={notes[q.id] ?? ""}
              disabled={!scope.canEdit}
              onChange={(e) => setNotes((n) => ({ ...n, [q.id]: e.target.value }))}
              placeholder="e.g. Correct NCI method, needed a prompt on the fair value uplift."
            />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line px-4 py-3">
            <p className="text-[12.5px] text-ink-3">
              {awaiting ? "Interview ended. Feedback is due." : started ? `${asked.length} of ${questions.length} questions asked` : "Start the interview to run the timer."}
            </p>
            {awaiting ? (
              <Guard allowed={scope.canEdit}>
                <Button size="sm" disabled={!scope.canEdit} onClick={() => onFeedback(interview.id)}>
                  <ClipboardPen className="size-3.5" />
                  Record interview feedback
                </Button>
              </Guard>
            ) : (
              <Guard allowed={started} reason="Start the interview first.">
                <Button size="sm" variant="danger" disabled={!started} onClick={end}>
                  <Square className="size-3.5" />
                  End and record feedback
                </Button>
              </Guard>
            )}
          </div>
        </div>

        <aside className="min-w-0">
          <MiniLabel>{track} question bank</MiniLabel>
          <ol className="mt-2 space-y-1.5">
            {questions.map((x, i) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-current={i === index ? "step" : undefined}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-[10px] border px-2.5 py-2 text-left text-[12.5px] leading-snug transition-colors",
                    i === index ? "border-ink bg-surface-inv text-ink-inv" : "border-line text-ink-2 hover:bg-cta-soft",
                  )}
                >
                  <span className="font-mono font-semibold tnum">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2">{x.text}</span>
                    <span className={cn("mt-0.5 block text-[11px]", i === index ? "text-ink-inv/70" : "text-ink-3")}>
                      {x.competency}
                      {asked.includes(x.id) ? " · asked" : ""}
                      {notes[x.id]?.trim() ? " · notes" : ""}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ feedback */

function FeedbackTab({
  scope,
  interviews,
  awaiting,
  onRecord,
  onView,
  studentOf,
}: {
  scope: CareerScope;
  interviews: CareerInterview[];
  awaiting: CareerInterview[];
  onRecord: (id: string) => void;
  onView: (id: string) => void;
  studentOf: (id: string) => Student | undefined;
}) {
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [track, setTrack] = useState("");

  const tracks = Array.from(new Set(interviews.map((i) => i.role))).sort();
  const visible = interviews.filter((i) => (!status || i.status === status) && (!kind || i.kind === kind) && (!track || i.role === track));

  const columns: DataTableColumn<CareerInterview>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (i) => studentOf(i.studentId)?.name ?? "",
      render: (i) => {
        const s = studentOf(i.studentId);
        return s ? <StudentCell student={s} sub={i.role} /> : null;
      },
    },
    { key: "interviewer", header: "Interviewer", sortable: true, sortValue: interviewer, render: (i) => <span className="text-ink-2">{interviewer(i)}</span> },
    { key: "date", header: "Date", sortable: true, sortValue: sortKey, render: (i) => <span className="text-ink-2 tnum">{i.status === "scheduled" ? when(i) : formatAccaDate(i.date)}</span> },
    { key: "status", header: "Status", sortable: true, sortValue: (i) => i.status, render: (i) => <StatusPill status={i.status} size="sm" /> },
    {
      key: "score",
      header: "Interview score",
      sortable: true,
      sortValue: (i) => i.score ?? -1,
      render: (i) => (i.score != null ? <ScoreBar value={i.score} className="w-24" height={6} /> : <span className="text-ink-3">Not scored</span>),
    },
    {
      key: "competencies",
      header: "Competency ratings",
      render: (i) =>
        i.competencies ? (
          <span className="flex gap-1">
            {i.competencies.map((c) => (
              <span key={c.label} title={`${c.label}: ${c.rating} of 5`} className="rounded-[6px] border border-line bg-surface-2 px-1.5 py-px font-mono text-[11.5px] text-ink-2">
                {c.label.split(" ")[0].slice(0, 4)} {c.rating}
              </span>
            ))}
          </span>
        ) : i.rubric.length ? (
          <span className="text-[12px] text-ink-3">{i.rubric.map((r) => `${r.label.split(" ")[0]} ${r.score}`).join(" · ")}</span>
        ) : (
          <span className="text-ink-3">Not recorded</span>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (i) =>
        i.status === "completed" ? (
          <Button size="xs" variant="ghost" onClick={() => onView(i.id)}>
            View feedback
          </Button>
        ) : (
          <Guard allowed={scope.canEdit}>
            <Button size="xs" variant={i.status === "awaiting-feedback" ? "primary" : "outline"} disabled={!scope.canEdit} onClick={() => onRecord(i.id)}>
              Record feedback
            </Button>
          </Guard>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      {awaiting.length ? (
        <Card className="border-cta">
          <CardHeader title="Awaiting feedback" sub="Interviews ended in this session. Feedback updates the Company Readiness Score." />
          <ul className="divide-y divide-line border-t border-line">
            {awaiting.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <span className="min-w-0 text-[13.5px]">
                  <span className="font-semibold text-ink">{studentOf(i.studentId)?.name}</span>
                  <span className="text-ink-3"> · {i.role} · {i.durationMins} min</span>
                </span>
                <Guard allowed={scope.canEdit}>
                  <Button size="sm" disabled={!scope.canEdit} onClick={() => onRecord(i.id)}>
                    <ClipboardPen className="size-3.5" />
                    Record interview feedback
                  </Button>
                </Guard>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <DataTable
        caption="Interview feedback"
        rows={visible}
        columns={columns}
        getRowId={(i) => i.id}
        initialSort={{ key: "date", dir: "desc" }}
        onRowClick={(i) => (i.status === "completed" ? onView(i.id) : scope.canEdit ? onRecord(i.id) : onView(i.id))}
        rowLabel={(i) => `Open the interview with ${studentOf(i.studentId)?.name}`}
        search={{ placeholder: "Search learner or role", match: (i, q) => (studentOf(i.studentId)?.name.toLowerCase().includes(q) ?? false) || i.role.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(status || kind || track)}
            onClear={() => {
              setStatus("");
              setKind("");
              setTrack("");
            }}
          >
            <FilterSelect
              label="Status"
              allLabel="Any status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "scheduled", label: "Scheduled" },
                { value: "awaiting-feedback", label: "Awaiting feedback" },
                { value: "completed", label: "Completed" },
              ]}
            />
            <FilterSelect
              label="Interviewer"
              allLabel="AI and mentor"
              value={kind}
              onChange={setKind}
              options={[
                { value: "mentor", label: "Career team" },
                { value: "ai", label: "AI interviewer" },
              ]}
            />
            <FilterSelect label="Role" allLabel="All roles" value={track} onChange={setTrack} options={tracks} />
          </FilterBar>
        }
      />
    </div>
  );
}

function RatingRow({ label, name, defaultValue, disabled }: { label: string; name: string; defaultValue: number; disabled: boolean }) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="mb-1.5 text-[12.5px] font-semibold text-ink-2">{label}</legend>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="relative">
            <input type="radio" name={name} value={n} defaultChecked={n === defaultValue} className="peer sr-only" />
            <span className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-line bg-surface font-mono text-[13px] font-semibold text-ink-2 transition-colors peer-checked:border-nav-active peer-checked:bg-nav-active peer-checked:text-nav-active-ink peer-focus-visible:shadow-[0_0_0_3px_var(--ring-cta)] hover:bg-cta-soft">
              {n}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function ratingsFrom(form: FormData) {
  return COMPETENCIES.map((label, i) => ({ label, rating: Number(form.get(`rating-${i}`) ?? 3) }));
}

function FeedbackDrawer({
  scope,
  target,
  interviews,
  readiness,
  onClose,
  onSaved,
}: {
  scope: CareerScope;
  target: { id: string; notes: string } | null;
  interviews: CareerInterview[];
  readiness: CompanyReadiness[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { persona } = useRole();
  const [preview, setPreview] = useState<{ key: string; score: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const interview = interviews.find((i) => i.id === target?.id);
  if (!interview) return null;

  const student = scope.students.find((s) => s.id === interview.studentId);
  const cr = readiness.find((c) => c.studentId === interview.studentId);
  const defaults = [3, 3, 3, 3];
  const score = preview && preview.key === interview.id ? preview.score : 60;
  const nextCr = cr ? applyInterviewScore(cr, score) : null;

  const recompute = () => {
    const form = bodyRef.current?.closest("form");
    if (!form) return;
    const r = ratingsFrom(new FormData(form));
    setPreview({ key: interview.id, score: Math.round((r.reduce((n, x) => n + x.rating, 0) / r.length) * 20) });
  };

  const close = () => {
    setPreview(null);
    onClose();
  };

  return (
    <FormDrawer
      open={Boolean(target)}
      onClose={close}
      title="Record interview feedback"
      sub={`${student?.name ?? ""} · ${interview.role} · ${interviewer(interview)}`}
      submitLabel="Save feedback"
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      footerNote="Updates the Company Readiness Score"
      onSubmit={(data) => {
        const competencies = ratingsFrom(data);
        const finalScore = Math.round((competencies.reduce((n, x) => n + x.rating, 0) / competencies.length) * 20);
        const lines = (key: string) =>
          String(data.get(key) ?? "")
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        const recommendation = String(data.get("recommendation"));
        const shared = data.get("shared") === "on";
        updateCareers((st) => ({
          interviews: st.interviews.map((i) =>
            i.id === interview.id
              ? {
                  ...i,
                  status: "completed",
                  kind: "mentor",
                  interviewerId: i.interviewerId ?? scope.staffId,
                  date: i.date > TODAY ? TODAY : i.date,
                  score: finalScore,
                  competencies,
                  rubric: competencies.map((c) => ({ label: c.label, score: c.rating * 20 })),
                  strengths: lines("strengths"),
                  improvements: lines("improvements"),
                  feedback: String(data.get("notes") ?? "").trim() || recommendation,
                  recommendation,
                  recordedBy: persona.name,
                  sharedWithStudent: shared,
                }
              : i,
          ),
          readiness: st.readiness.map((c) => (c.studentId === interview.studentId ? applyInterviewScore(c, finalScore) : c)),
        }));
        const after = cr ? applyInterviewScore(cr, finalScore).score : null;
        toast({
          title: "Interview feedback recorded",
          body: `${student?.name} · interview score ${finalScore}${cr && after != null ? ` · Company Readiness Score ${cr.score} to ${after}` : ""}${shared ? " · shared with the student" : ""}`,
        });
        close();
        onSaved();
      }}
    >
      <div ref={bodyRef} key={interview.id} onChange={recompute} className="space-y-5">
        <div className="flex items-center gap-4 rounded-[16px] border border-line bg-surface-2 p-4">
          <ScoreRing value={score} size={64} stroke={6} label="Interview score" />
          <div className="min-w-0 text-[12.5px] text-ink-3">
            <p className="text-[13px] font-semibold text-ink">Interview score {score}</p>
            {cr && nextCr ? (
              <p className="mt-0.5">
                Company Readiness Score {cr.score} to <span className="font-semibold text-ink">{nextCr.score}</span> ({nextCr.band})
              </p>
            ) : (
              <p className="mt-0.5">No Company Readiness Score on record yet</p>
            )}
          </div>
        </div>

        <div>
          <MiniLabel>Competency ratings · 1 to 5</MiniLabel>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {COMPETENCIES.map((c, i) => (
              <RatingRow key={c} label={c} name={`rating-${i}`} defaultValue={defaults[i]} disabled={!scope.canEdit} />
            ))}
          </div>
        </div>

        <Field label="Strengths" hint="One per line">
          <Textarea name="strengths" rows={3} disabled={!scope.canEdit} defaultValue={interview.strengths.join("\n")} placeholder="e.g. Explained goodwill with NCI at fair value clearly" />
        </Field>
        <Field label="Areas to improve" hint="One per line">
          <Textarea name="improvements" rows={3} disabled={!scope.canEdit} defaultValue={interview.improvements.join("\n")} placeholder="e.g. Use the STAR format for behavioural answers" />
        </Field>
        <Field label="Interviewer notes">
          <Textarea name="notes" rows={4} disabled={!scope.canEdit} defaultValue={target?.notes ?? ""} placeholder="Notes captured during the interview" />
        </Field>
        <Field label="Recommendation">
          <Select name="recommendation" defaultValue={RECOMMENDATIONS[1]} disabled={!scope.canEdit}>
            {RECOMMENDATIONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
        </Field>
        <Checkbox name="shared" defaultChecked disabled={!scope.canEdit} label="Share feedback with the student in their Career centre" />
      </div>
    </FormDrawer>
  );
}

function InterviewDetail({ interview, onClose }: { interview?: CareerInterview; onClose: () => void }) {
  const store = useCareers();
  const s = interview ? store.profiles.find((p) => p.studentId === interview.studentId) : undefined;
  return (
    <Drawer open={Boolean(interview)} onClose={onClose} title="Interview feedback" sub={interview ? `${interview.role} · ${formatAccaDate(interview.date)} · ${interviewer(interview)}` : undefined}>
      {interview && interview.status !== "completed" ? (
        <div className="space-y-4 px-5 py-5">
          <StatusPill status={interview.status} />
          <dl className="grid grid-cols-2 gap-3 rounded-[14px] border border-line bg-surface-2 p-4">
            <div className="min-w-0">
              <dt className="text-[11.5px] font-semibold text-ink-3">When</dt>
              <dd className="mt-0.5 text-[13.5px] font-semibold text-ink tnum">{when(interview)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11.5px] font-semibold text-ink-3">Duration</dt>
              <dd className="mt-0.5 text-[13.5px] font-semibold text-ink">{interview.durationMins} min · {interview.mode ?? "Video"}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11.5px] font-semibold text-ink-3">Interviewer</dt>
              <dd className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">{interviewer(interview)}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11.5px] font-semibold text-ink-3">Question bank</dt>
              <dd className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">{trackFor(interview.role)}</dd>
            </div>
          </dl>
          <p className="text-[13px] text-ink-3">Feedback and competency ratings appear here once the career team records them.</p>
        </div>
      ) : interview ? (
        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-4">
            <ScoreRing value={interview.score ?? 0} size={96} stroke={8} showBand label="Interview score" />
            <div className="min-w-0 text-[12.5px] text-ink-3">
              <p className="text-[14px] font-semibold text-ink">{s?.headline ?? "Career profile not built yet"}</p>
              <p className="mt-1">
                {interview.durationMins} min · {interview.kind === "ai" ? "AI mock interview taken by the student" : "Mock interview with the career team"}
              </p>
              {interview.recommendation ? <p className="mt-1 font-semibold text-ink-2">{interview.recommendation}</p> : null}
            </div>
          </div>
          <div className="space-y-3">
            <MiniLabel>{interview.competencies ? "Competency ratings" : "Rubric"}</MiniLabel>
            {(interview.competencies
              ? interview.competencies.map((c) => ({ label: `${c.label} · ${c.rating} of 5`, score: c.rating * 20 }))
              : interview.rubric
            ).map((r) => (
              <ScoreBar key={r.label} label={r.label} value={r.score} height={6} />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <MiniLabel>Strengths</MiniLabel>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-2">
                {interview.strengths.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
            <div>
              <MiniLabel>Areas to improve</MiniLabel>
              <ul className="mt-2 space-y-1 text-[13px] text-ink-2">
                {interview.improvements.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          </div>
          {interview.feedback ? (
            <div className="rounded-[14px] border border-line bg-surface-2 p-4 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{interview.feedback}</div>
          ) : null}
        </div>
      ) : null}
    </Drawer>
  );
}

/* ------------------------------------------------------------------ Company Readiness Scores */

function ReadinessTab({
  scope,
  readiness,
  interviews,
  selected,
  onSelect,
  onSchedule,
}: {
  scope: CareerScope;
  readiness: CompanyReadiness[];
  interviews: CareerInterview[];
  selected: string;
  onSelect: (id: string) => void;
  onSchedule: (studentId: string) => void;
}) {
  const [cohort, setCohort] = useState("");
  const [bucket, setBucket] = useState("");

  type Row = { id: string; cr: CompanyReadiness; student: Student; cohort: string };
  const rows: Row[] = readiness.flatMap((cr) => {
    const student = scope.students.find((s) => s.id === cr.studentId);
    return student ? [{ id: cr.studentId, cr, student, cohort: primaryCohort(student) }] : [];
  });
  const cohorts = Array.from(new Set(rows.map((r) => r.cohort))).sort();
  const inCohort = cohort ? rows.filter((r) => r.cohort === cohort) : rows;
  const counts = CRS_BUCKETS.map((b) => inCohort.filter((r) => b.test(r.cr.score)).length);
  const test = CRS_BUCKETS.find((b) => b.id === bucket)?.test;
  const visible = test ? inCohort.filter((r) => test(r.cr.score)) : inCohort;

  const current = rows.find((r) => r.id === selected) ?? rows[0];
  const avgTrend = TREND_LABELS.map((_, i) => average(inCohort.map((r) => r.cr.trend[i] ?? r.cr.score)));
  const bands = (["Ready", "Nearly ready", "Developing"] as const).map((b) => ({ band: b, n: inCohort.filter((r) => r.cr.band === b).length }));

  const lastInterview = (id: string) =>
    interviews.filter((i) => i.studentId === id && i.status === "completed").sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextInterview = (id: string) =>
    interviews.filter((i) => i.studentId === id && i.status === "scheduled").sort((a, b) => sortKey(a).localeCompare(sortKey(b)))[0];

  const columns: DataTableColumn<Row>[] = [
    { key: "student", header: "Student", sortable: true, sortValue: (r) => r.student.name, render: (r) => <StudentCell student={r.student} sub={r.cohort} /> },
    { key: "score", header: "Company Readiness Score", sortable: true, sortValue: (r) => r.cr.score, render: (r) => <ScoreBar value={r.cr.score} className="w-28" height={6} /> },
    {
      key: "band",
      header: "Band",
      sortable: true,
      sortValue: (r) => r.cr.band,
      render: (r) => <StatusPill status={r.cr.band} tone={r.cr.band === "Ready" ? "jade" : r.cr.band === "Nearly ready" ? "amber" : "rose"} size="sm" />,
    },
    {
      key: "change",
      header: "Since Apr",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (r) => r.cr.score - r.cr.trend[0],
      render: (r) => {
        const d = r.cr.score - r.cr.trend[0];
        return <span className={d >= 0 ? "text-jade" : "text-rose"}>{d >= 0 ? `+${d}` : d}</span>;
      },
    },
    { key: "trend", header: "Trend", render: (r) => <Sparkline data={r.cr.trend} tone="cta-strong" height={26} className="w-24" /> },
    {
      key: "interviews",
      header: "Mock interviews component",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (r) => r.cr.components.find((c) => c.label === "Mock interviews")?.score ?? 0,
      render: (r) => r.cr.components.find((c) => c.label === "Mock interviews")?.score ?? 0,
    },
    {
      key: "last",
      header: "Last mock interview",
      render: (r) => {
        const l = lastInterview(r.id);
        return l ? <span className="text-ink-2 tnum">{formatAccaDate(l.date)} · {l.score}</span> : <span className="text-ink-3">None yet</span>;
      },
    },
    {
      key: "next",
      header: "Next mock interview",
      render: (r) => {
        const n = nextInterview(r.id);
        return n ? (
          <span className="text-ink-2 tnum">{when(n)}</span>
        ) : (
          <Guard allowed={scope.canEdit}>
            <Button size="xs" variant="outline" disabled={!scope.canEdit} onClick={() => onSchedule(r.id)}>
              Schedule
            </Button>
          </Guard>
        );
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        <Card className="min-w-0">
          <CardHeader title="Cohort distribution" sub={`${inCohort.length} learners with a Company Readiness Score`} />
          <div className="px-5 pb-5">
            <FilterSelect label="Cohort" allLabel="All cohorts" value={cohort} onChange={setCohort} options={cohorts} className="mb-4" />
            <BarChart data={counts} labels={CRS_BUCKETS.map((b) => b.label)} tone="cta" height={140} highlight={bucket ? CRS_BUCKETS.findIndex((b) => b.id === bucket) : undefined} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {CRS_BUCKETS.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={bucket === b.id}
                  onClick={() => setBucket((cur) => (cur === b.id ? "" : b.id))}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                    bucket === b.id ? "border-nav-active bg-nav-active text-nav-active-ink" : "border-line text-ink-2 hover:bg-cta-soft",
                  )}
                >
                  {b.label} · {counts[i]}
                </button>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-4">
              {bands.map((b) => (
                <div key={b.band} className="min-w-0">
                  <p className="truncate text-[12px] text-ink-3">{b.band}</p>
                  <p className="font-display text-[22px] leading-none font-bold text-ink tnum">{b.n}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {current ? (
          <Card className="min-w-0">
            <CardHeader
              title="Company Readiness Score trend"
              sub={`${current.student.name} against the ${cohort ? "cohort" : "scope"} average, Apr to Sep 2026`}
            />
            <div className="px-5 pb-3">
              <FilterSelect
                label="Student"
                value={current.id}
                onChange={onSelect}
                options={rows.map((r) => ({ value: r.id, label: r.student.name }))}
              />
            </div>
            <div className="grid gap-5 px-5 pb-5 md:grid-cols-[minmax(0,1fr)_14rem]">
              <LineChart
                labels={TREND_LABELS}
                min={0}
                max={100}
                height={170}
                series={[
                  { label: current.student.name, values: current.cr.trend, tone: "cta-strong" },
                  { label: cohort ? "Cohort average" : "Scope average", values: avgTrend, tone: "ink-3" },
                ]}
              />
              <div className="min-w-0 space-y-2.5">
                <div className="flex items-center gap-3">
                  <ScoreRing value={current.cr.score} size={56} stroke={5} label="Company Readiness Score" />
                  <StatusPill status={current.cr.band} tone={current.cr.band === "Ready" ? "jade" : current.cr.band === "Nearly ready" ? "amber" : "rose"} />
                </div>
                {current.cr.components.map((c) => (
                  <ScoreBar key={c.label} label={`${c.label} · ${c.weight}%`} value={c.score} height={5} />
                ))}
              </div>
            </div>
          </Card>
        ) : (
          <EmptyState title="No Company Readiness Scores" sub="Scores appear once a learner has a resume and a mock interview." />
        )}
      </div>

      <DataTable
        caption="Company Readiness Scores"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ key: "score", dir: "asc" }}
        onRowClick={(r) => onSelect(r.id)}
        rowLabel={(r) => `Show the Company Readiness Score trend for ${r.student.name}`}
        rowClassName={(r) => (r.id === current?.id ? "bg-cta-soft" : undefined)}
        search={{ placeholder: "Search learner", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ schedule */

function ScheduleDrawer({
  scope,
  studentId,
  interviews,
  onClose,
}: {
  scope: CareerScope;
  studentId: string | null;
  interviews: CareerInterview[];
  onClose: () => void;
}) {
  const [picked, setPicked] = useState("");
  const store = useCareers();
  const withoutUpcoming = scope.students.find((s) => !interviews.some((i) => i.studentId === s.id && i.status === "scheduled"));
  const activeId = picked || studentId || withoutUpcoming?.id || scope.students[0]?.id || "";
  const student = scope.students.find((s) => s.id === activeId);

  const close = () => {
    setPicked("");
    onClose();
  };

  if (!student) return null;
  const role = store.profiles.find((p) => p.studentId === student.id)?.targetRoles[0] ?? student.career.targetRole;

  return (
    <FormDrawer
      open={studentId !== null}
      onClose={close}
      title="Schedule mock interview"
      sub="Conducted by the career team. The student gets a calendar invite and the question bank track."
      submitLabel="Schedule interview"
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      onSubmit={(data) => {
        const date = String(data.get("date") || addDays(TODAY, 3));
        const time = String(data.get("time"));
        const track = String(data.get("track"));
        const interviewerId = String(data.get("interviewer"));
        const id = `mi-${String(store.interviews.length + 1).padStart(3, "0")}`;
        updateCareers((st) => ({
          interviews: [
            ...st.interviews,
            {
              id,
              studentId: student.id,
              kind: "mentor",
              interviewerId,
              role: track,
              date,
              time,
              durationMins: Number(data.get("duration")),
              mode: String(data.get("mode")) as CareerInterview["mode"],
              status: "scheduled",
              score: null,
              rubric: [],
              strengths: [],
              improvements: [],
              feedback: "",
            },
          ],
        }));
        toast({
          title: "Mock interview scheduled",
          body: `${student.name} · ${track} · ${formatCalendarDate(date, "day")}, ${time} with ${staffName(interviewerId)}${data.get("notify") === "on" ? " · invite sent" : ""}`,
        });
        close();
      }}
    >
      <div key={activeId} className="space-y-4">
        <Field label="Student">
          <Select value={activeId} onChange={(e) => setPicked(e.target.value)}>
            {scope.students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {typeLabel(s.type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role track" hint="Sets the question bank">
          <Select name="track" defaultValue={trackFor(role)}>
            {INTERVIEW_TRACKS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Interviewer">
          <Select name="interviewer" defaultValue={student.type === "undergraduate" ? "st-meera" : "st-rahul"}>
            <option value="st-rahul">Rahul Verma · Placement Lead</option>
            <option value="st-meera">Meera Pillai · Internship Coordinator</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input name="date" type="date" min={TODAY} defaultValue={addDays(TODAY, 4)} required />
          </Field>
          <Field label="Time (IST)">
            <Select name="time" defaultValue="18:00">
              {["10:00", "11:30", "14:00", "16:30", "18:00", "19:30"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Duration">
            <Select name="duration" defaultValue="45">
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </Select>
          </Field>
          <Field label="Mode">
            <Select name="mode" defaultValue="Video">
              <option>Video</option>
              <option>In person</option>
              <option>Phone</option>
            </Select>
          </Field>
        </div>
        <Checkbox name="notify" defaultChecked label="Send the calendar invite and preparation notes to the student" />
      </div>
    </FormDrawer>
  );
}
