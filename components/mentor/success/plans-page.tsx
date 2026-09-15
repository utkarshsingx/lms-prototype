"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck2,
  CalendarPlus,
  Check,
  CircleSlash,
  ClipboardList,
  Download,
  Lock,
  MapPin,
  NotebookPen,
  Pause,
  Phone,
  Play,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Target,
  TrendingUp,
  Video,
} from "lucide-react";
import {
  RISK_ALERT_LABELS,
  actionPlans,
  addDays,
  daysBetween,
  formatAccaDate,
  formatTime,
  interventions,
  mentorNotes,
  mentorReminders,
  mentoringSessions,
  riskAlerts,
  staffName,
  studentById,
  type ActionPlan,
  type Intervention,
  type MentoringSession,
  type MentorReminder,
  type MessageTemplate,
  type PaperCode,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MonthCalendar, formatCalendarDate, type CalendarEvent as UiCalendarEvent } from "@/components/ui/calendar";
import { Card, CardHeader } from "@/components/ui/card";
import { Donut, StackedBar } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { RiskBadge, StatusPill, type StatusTone } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  ActionPlanDrawer,
  NoteDrawer,
  ReminderDrawer,
  ScheduleSessionDrawer,
  VISIBILITY_LABEL,
  newId,
  seedVisibility,
  type NoteRow,
} from "./drawers";
import { MentorScopeChip, useMentorScope, type MentorScope } from "./scope";
import {
  CHANNEL_LABELS,
  MiniLabel,
  SectionIntro,
  StudentCell,
  TEMPLATE_OPTIONS,
  TODAY,
  TypePill,
  currentReadiness,
  dueLabel,
  plural,
  shortDate,
} from "./shared";

type TabId = "plans" | "sessions" | "notes" | "reminders" | "outcomes";
const TAB_IDS: TabId[] = ["plans", "sessions", "notes", "reminders", "outcomes"];

type ReminderRow = MentorReminder & { templateName?: string };
type Outcome = Intervention["outcome"] | "escalated";
type InterventionRow = Omit<Intervention, "outcome"> & { outcome: Outcome; note?: string };

const WEEK_END = addDays(TODAY, 6);

const OUTCOME_LABEL: Record<Outcome, string> = {
  improved: "Improved",
  "no-change": "No change",
  worsened: "Worsened",
  escalated: "Escalated",
  pending: "Awaiting outcome",
};

const OUTCOME_TONE: Record<Outcome, StatusTone> = {
  improved: "jade",
  "no-change": "neutral",
  worsened: "rose",
  escalated: "violet",
  pending: "amber",
};

const OUTCOME_DOT: Record<Outcome, string> = {
  improved: "bg-jade",
  "no-change": "bg-ink-3",
  worsened: "bg-rose",
  escalated: "bg-violet",
  pending: "bg-amber",
};

/** Chart colour for an outcome: "No change" reads as grey ink, not a status colour. */
function chartTone(o: Outcome) {
  return o === "no-change" ? "ink-3" : OUTCOME_TONE[o];
}

const PLAN_STATUS_LABEL: Record<ActionPlan["status"], string> = { active: "Active", paused: "Paused", completed: "Completed" };

export function MentorPlansPage({ initialTab }: { initialTab?: string }) {
  const { persona } = useRole();
  const tab = TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : "plans";
  return <PlansView key={persona.id} initialTab={tab} />;
}

function PlansView({ initialTab }: { initialTab: TabId }) {
  const scope = useMentorScope();
  const inScope = <T extends { studentId: string }>(list: T[]) => list.filter((x) => scope.ids.has(x.studentId));

  const [tab, setTab] = useState<TabId>(initialTab);
  const [plans, setPlans] = useState<ActionPlan[]>(() => inScope(actionPlans));
  const [sessions, setSessions] = useState<MentoringSession[]>(() => inScope(mentoringSessions));
  const [notes, setNotes] = useState<NoteRow[]>(() =>
    inScope(mentorNotes)
      .map((n) => ({ ...n, visibility: seedVisibility(n) }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  const [reminders, setReminders] = useState<ReminderRow[]>(() => inScope(mentorReminders).sort((a, b) => b.sentOn.localeCompare(a.sentOn)));
  const [ivs, setIvs] = useState<InterventionRow[]>(() => inScope(interventions));
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [planDrawer, setPlanDrawer] = useState<{ studentId?: string } | null>(null);
  const [sessionDrawer, setSessionDrawer] = useState<{ session?: MentoringSession; studentId?: string } | null>(null);
  const [noteDrawer, setNoteDrawer] = useState<{ studentId?: string; body?: string } | null>(null);
  const [reminderDrawer, setReminderDrawer] = useState<{ studentIds: string[]; templateId?: string } | null>(null);
  const [outcomeFor, setOutcomeFor] = useState<InterventionRow | null>(null);
  const [logging, setLogging] = useState(false);

  const activePlans = plans.filter((p) => p.status === "active");
  const openTasks = activePlans.reduce((n, p) => n + p.tasks.filter((t) => !t.done).length, 0);
  const weekSessions = sessions.filter((m) => m.status === "scheduled" && m.start.slice(0, 10) >= TODAY && m.start.slice(0, 10) <= WEEK_END);
  const todaySessions = sessions.filter((m) => m.start.startsWith(TODAY));
  const recentNotes = notes.filter((n) => daysBetween(n.date, TODAY) <= 30);
  const weekReminders = reminders.filter((r) => daysBetween(r.sentOn, TODAY) <= 7);
  const closedIvs = ivs.filter((iv) => iv.outcome !== "pending");
  const improved = closedIvs.filter((iv) => iv.outcome === "improved").length;
  const pendingIvs = ivs.filter((iv) => iv.outcome === "pending").length;

  const saveSession = (next: MentoringSession) =>
    setSessions((list) => (list.some((x) => x.id === next.id) ? list.map((x) => (x.id === next.id ? next : x)) : [...list, next]));

  const tabs = [
    { id: "plans", label: "Action plans", count: activePlans.length },
    { id: "sessions", label: "Mentoring sessions", count: weekSessions.length },
    { id: "notes", label: "Mentor notes", count: notes.length },
    { id: "reminders", label: "Authorised reminders", count: reminders.length },
    { id: "outcomes", label: "Intervention outcomes", count: pendingIvs },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student success"
        title="Action plans & sessions"
        sub="Create student action plans, schedule mentoring sessions, record mentor notes, send authorised reminders and track intervention outcomes."
        badge={<MentorScopeChip scope={scope} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => setSessionDrawer({})}>
              <CalendarPlus className="size-4" /> Schedule session
            </Button>
            <Button onClick={() => setPlanDrawer({})}>
              <Plus className="size-4" /> Create action plan
            </Button>
          </>
        }
      />

      <KpiRow cols={5}>
        <KpiTile hero label="Active action plans" value={activePlans.length} sub={`${plural(openTasks, "open task")}`} icon={<ClipboardList />} />
        <KpiTile label="Sessions this week" value={weekSessions.length} sub={`${plural(todaySessions.length, "session")} today`} tone="info" icon={<CalendarCheck2 />} />
        <KpiTile
          label="Mentor notes · 30 days"
          value={recentNotes.length}
          sub={`${recentNotes.filter((n) => n.visibility === "shared").length} shared with learners`}
          icon={<NotebookPen />}
        />
        <KpiTile
          label="Reminders sent · 7 days"
          value={weekReminders.length}
          sub={`${plural(weekReminders.filter((r) => r.status === "failed").length, "failed delivery", "failed deliveries")}`}
          tone={weekReminders.some((r) => r.status === "failed") ? "amber" : "neutral"}
          icon={<Send />}
        />
        <KpiTile
          label="Interventions improved"
          value={closedIvs.length ? `${Math.round((improved / closedIvs.length) * 100)}%` : "0%"}
          sub={`${improved} of ${closedIvs.length} closed · ${pendingIvs} awaiting`}
          tone="jade"
          icon={<TrendingUp />}
        />
      </KpiRow>

      <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === "plans" ? (
        <PlansTab
          scope={scope}
          plans={plans}
          setPlans={setPlans}
          selectedId={selectedPlanId}
          onSelect={setSelectedPlanId}
          sessions={sessions}
          notes={notes}
          onCreate={() => setPlanDrawer({})}
          onSchedule={(studentId) => setSessionDrawer({ studentId })}
          onRemind={(studentId) => setReminderDrawer({ studentIds: [studentId] })}
        />
      ) : null}

      {tab === "sessions" ? (
        <SessionsTab
          scope={scope}
          sessions={sessions}
          setSessions={setSessions}
          onSchedule={(studentId) => setSessionDrawer({ studentId })}
          onReschedule={(session) => setSessionDrawer({ session })}
          onNote={(studentId, body) => setNoteDrawer({ studentId, body })}
        />
      ) : null}

      {tab === "notes" ? (
        <NotesTab scope={scope} notes={notes} setNotes={setNotes} onRecord={(studentId) => setNoteDrawer({ studentId })} />
      ) : null}

      {tab === "reminders" ? (
        <RemindersTab
          reminders={reminders}
          setReminders={setReminders}
          onSend={(templateId) => setReminderDrawer({ studentIds: [], templateId })}
        />
      ) : null}

      {tab === "outcomes" ? (
        <OutcomesTab ivs={ivs} onRecord={setOutcomeFor} onLog={() => setLogging(true)} />
      ) : null}

      {/* ------------------------------------------------------------ drawers */}
      <ActionPlanDrawer
        open={planDrawer != null}
        onClose={() => setPlanDrawer(null)}
        scope={scope}
        studentId={planDrawer?.studentId}
        onCreate={(plan) => {
          setPlans((list) => [plan, ...list]);
          setSelectedPlanId(plan.id);
          setTab("plans");
        }}
      />
      <ScheduleSessionDrawer
        open={sessionDrawer != null}
        onClose={() => setSessionDrawer(null)}
        scope={scope}
        studentId={sessionDrawer?.studentId}
        session={sessionDrawer?.session}
        onSave={saveSession}
      />
      <NoteDrawer
        open={noteDrawer != null}
        onClose={() => setNoteDrawer(null)}
        scope={scope}
        studentId={noteDrawer?.studentId}
        defaultBody={noteDrawer?.body}
        onSave={(note) => setNotes((list) => [note, ...list])}
      />
      <ReminderDrawer
        open={reminderDrawer != null}
        onClose={() => setReminderDrawer(null)}
        scope={scope}
        studentIds={reminderDrawer?.studentIds ?? []}
        defaultTemplateId={reminderDrawer?.templateId}
        onSent={(rows: MentorReminder[], template: MessageTemplate) =>
          setReminders((list) => [...rows.map((r) => ({ ...r, templateName: template.name })), ...list])
        }
      />
      <OutcomeDrawer
        row={outcomeFor}
        onClose={() => setOutcomeFor(null)}
        onSave={(next) => setIvs((list) => list.map((iv) => (iv.id === next.id ? next : iv)))}
      />
      <LogInterventionDrawer
        open={logging}
        onClose={() => setLogging(false)}
        scope={scope}
        onSave={(row) => setIvs((list) => [row, ...list])}
      />
    </div>
  );
}

/* ================================================================== action plans */

function PlansTab({
  scope,
  plans,
  setPlans,
  selectedId,
  onSelect,
  sessions,
  notes,
  onCreate,
  onSchedule,
  onRemind,
}: {
  scope: MentorScope;
  plans: ActionPlan[];
  setPlans: React.Dispatch<React.SetStateAction<ActionPlan[]>>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  sessions: MentoringSession[];
  notes: NoteRow[];
  onCreate: () => void;
  onSchedule: (studentId: string) => void;
  onRemind: (studentId: string) => void;
}) {
  const [view, setView] = useState("active");

  const listed = plans
    .filter((p) => view === "all" || p.status === view)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  const selected = plans.find((p) => p.id === selectedId) ?? listed[0] ?? null;

  const patchPlan = (id: string, patch: (p: ActionPlan) => ActionPlan) => setPlans((list) => list.map((p) => (p.id === id ? patch(p) : p)));

  return (
    <section className="space-y-5">
      <SectionIntro
        title="Create student action plans"
        sub="Goals and dated tasks agreed with each learner. Learner tasks appear on their My mentor page; your tasks feed the dashboard."
        action={
          <Button variant="secondary" onClick={onCreate}>
            <Plus className="size-4" /> Create action plan
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <div className="border-b border-line px-4 py-3">
            <Segmented
              size="sm"
              value={view}
              onChange={setView}
              items={[
                { id: "active", label: "Active" },
                { id: "paused", label: "Paused" },
                { id: "completed", label: "Completed" },
                { id: "all", label: "All" },
              ]}
            />
          </div>
          <ul className="max-h-[36rem] divide-y divide-line overflow-y-auto">
            {listed.map((p) => {
              const s = studentById(p.studentId)!;
              const done = p.tasks.filter((t) => t.done).length;
              const active = selected?.id === p.id;
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(p.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "block w-full border-l-[3px] px-4 py-3 text-left transition-colors",
                      active ? "border-l-cta bg-cta-soft" : "border-l-transparent hover:bg-cta-soft",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={s.name} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-bold text-ink">{s.name}</span>
                        <span className="block truncate text-[12.5px] text-ink-2">{p.title}</span>
                      </span>
                    </span>
                    <span className="mt-2.5 flex items-center gap-2.5">
                      <Progress value={p.tasks.length ? (done / p.tasks.length) * 100 : 0} tone="brand" height={5} className="flex-1" />
                      <span className="shrink-0 font-mono text-[11.5px] text-ink-3 tnum">
                        {done}/{p.tasks.length}
                      </span>
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-3">
                      <StatusPill status={p.status} size="sm" />
                      <span>{p.status === "completed" ? `Due ${shortDate(p.dueOn)}` : dueLabel(p.dueOn)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {listed.length === 0 ? <li className="px-4 py-8 text-center text-[13px] text-ink-3">No {view} action plans.</li> : null}
          </ul>
        </Card>

        {selected ? (
          <PlanDetail
            key={selected.id}
            plan={selected}
            scope={scope}
            sessions={sessions}
            notes={notes}
            onPatch={(patch, title, body) => {
              patchPlan(selected.id, patch);
              toast({ title, body });
            }}
            onSchedule={() => onSchedule(selected.studentId)}
            onRemind={() => onRemind(selected.studentId)}
          />
        ) : (
          <Card className="grid min-w-0 place-items-center p-10 text-center text-[13px] text-ink-3">Choose a plan to see its tasks.</Card>
        )}
      </div>
    </section>
  );
}

function PlanDetail({
  plan,
  scope,
  sessions,
  notes,
  onPatch,
  onSchedule,
  onRemind,
}: {
  plan: ActionPlan;
  scope: MentorScope;
  sessions: MentoringSession[];
  notes: NoteRow[];
  onPatch: (patch: (p: ActionPlan) => ActionPlan, title: string, body?: string) => void;
  onSchedule: () => void;
  onRemind: () => void;
}) {
  const s = studentById(plan.studentId)!;
  const done = plan.tasks.filter((t) => t.done).length;
  const alerts = riskAlerts.filter((a) => plan.alertIds.includes(a.id));
  const nextSession = sessions
    .filter((m) => m.studentId === s.id && m.status === "scheduled" && m.start.slice(0, 10) >= TODAY)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const lastNote = notes.find((n) => n.studentId === s.id);
  const [taskLabel, setTaskLabel] = useState("");
  const [taskOwner, setTaskOwner] = useState<"student" | "mentor">("student");
  const [taskDue, setTaskDue] = useState(addDays(TODAY, 7));
  const paper = (s.currentPaper ?? undefined) as PaperCode | undefined;

  return (
    <Card className="min-w-0">
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={s.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[14px] font-bold text-ink">{s.name}</span>
                <TypePill student={s} />
                <RiskBadge level={s.risk.level} />
              </div>
              <h3 className="mt-1 font-display text-[21px] leading-tight font-bold tracking-[-0.03em] text-ink">{plan.title}</h3>
              {plan.goal ? <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">Goal: {plan.goal}</p> : null}
              <p className="mt-1.5 text-[12.5px] text-ink-3">
                Created {formatAccaDate(plan.createdOn)} by {staffName(plan.mentorId)} · due {formatAccaDate(plan.dueOn)}
                {paper ? ` · ${paper} readiness now ${currentReadiness(s)}` : ""}
              </p>
            </div>
          </div>
          <StatusPill status={plan.status}>{PLAN_STATUS_LABEL[plan.status]}</StatusPill>
        </div>

        <div className="flex flex-wrap gap-2">
          {plan.status === "active" ? (
            <>
              <Button
                size="sm"
                onClick={() => onPatch((p) => ({ ...p, status: "completed" }), "Action plan completed", `${s.name} · ${plan.title}`)}
              >
                <Check className="size-4" /> Mark completed
              </Button>
              <Button size="sm" variant="outline" onClick={() => onPatch((p) => ({ ...p, status: "paused" }), "Action plan paused", s.name)}>
                <Pause className="size-4" /> Pause plan
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPatch((p) => ({ ...p, status: "active" }), plan.status === "paused" ? "Action plan resumed" : "Action plan reopened", s.name)}
            >
              {plan.status === "paused" ? <Play className="size-4" /> : <RotateCcw className="size-4" />}
              {plan.status === "paused" ? "Resume plan" : "Reopen plan"}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onSchedule}>
            <CalendarPlus className="size-4" /> Schedule session
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemind}>
            <Send className="size-4" /> Send reminder
          </Button>
        </div>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <MiniLabel>Tasks</MiniLabel>
            <span className="font-mono text-[12px] text-ink-3 tnum">
              {done} of {plan.tasks.length} done
            </span>
          </div>
          <Progress value={plan.tasks.length ? (done / plan.tasks.length) * 100 : 0} tone="jade" />
        </div>

        <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
          {plan.tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-3.5 py-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={t.done}
                aria-label={t.label}
                onClick={() =>
                  onPatch(
                    (p) => ({ ...p, tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }),
                    t.done ? "Task reopened" : "Task marked done",
                    `${s.name} · ${t.label}`,
                  )
                }
                className={cn(
                  "mt-0.5 grid size-5 shrink-0 place-items-center rounded-[6px] border transition-colors",
                  t.done ? "border-nav-active bg-nav-active text-nav-active-ink" : "border-line-strong bg-surface text-transparent hover:bg-cta-soft",
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </button>
              <div className="min-w-0 flex-1">
                <p className={cn("text-[13.5px] font-semibold", t.done ? "text-ink-3 line-through decoration-ink-3" : "text-ink")}>{t.label}</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {t.owner === "student" ? `${s.name.split(" ")[0]}'s task` : "Your task"} · {formatAccaDate(t.due)}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={t.owner === "mentor" ? "dark" : "neutral"}>{t.owner === "mentor" ? "Mentor" : "Learner"}</Badge>
                {!t.done ? (
                  <span className={cn("text-[11.5px] font-semibold", t.due < TODAY ? "text-rose" : "text-ink-3")}>{dueLabel(t.due)}</span>
                ) : null}
              </span>
            </li>
          ))}
          {plan.tasks.length === 0 ? <li className="px-3.5 py-6 text-center text-[13px] text-ink-3">No tasks yet. Add the first one below.</li> : null}
        </ul>

        <form
          className="grid gap-2 rounded-[var(--radius-md)] border border-dashed border-line-strong p-3 sm:grid-cols-[minmax(0,1fr)_7.5rem_9.5rem_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const label = taskLabel.trim();
            if (!label) return;
            onPatch(
              (p) => ({ ...p, tasks: [...p.tasks, { id: newId("t"), label, due: taskDue, owner: taskOwner, done: false }] }),
              "Task added to action plan",
              `${s.name} · ${label} · ${formatAccaDate(taskDue)}`,
            );
            setTaskLabel("");
          }}
        >
          <Input value={taskLabel} onChange={(e) => setTaskLabel(e.target.value)} placeholder="Add a task, e.g. Sit PM progress test 2" aria-label="New task" />
          <Select value={taskOwner} onChange={(e) => setTaskOwner(e.target.value as "student" | "mentor")} aria-label="Task owner">
            <option value="student">Learner</option>
            <option value="mentor">Mentor</option>
          </Select>
          <Input type="date" value={taskDue} min={TODAY} onChange={(e) => setTaskDue(e.target.value)} aria-label="Task due date" />
          <Button type="submit" size="md" variant="secondary" disabled={!taskLabel.trim()}>
            <Plus className="size-4" /> Add task
          </Button>
        </form>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
            <MiniLabel>Linked risk alerts</MiniLabel>
            {alerts.length ? (
              <ul className="mt-2 space-y-1.5">
                {alerts.map((a) => (
                  <li key={a.id} className="flex min-w-0 items-center gap-2 text-[12.5px]">
                    <RiskBadge level={a.severity} label={RISK_ALERT_LABELS[a.kind]} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-3">Created without an alert.</p>
            )}
          </div>
          <div className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
            <MiniLabel>Next mentoring session</MiniLabel>
            {nextSession ? (
              <p className="mt-2 text-[13px] text-ink">
                <span className="font-semibold">
                  {formatCalendarDate(nextSession.start.slice(0, 10), "day")}, {formatTime(nextSession.start)}
                </span>
                <span className="block text-[12px] text-ink-3">
                  {nextSession.mode} · {nextSession.durationMins} min
                </span>
              </p>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-3">None booked.</p>
            )}
          </div>
          <div className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
            <MiniLabel>Latest mentor note</MiniLabel>
            {lastNote ? (
              <p className="mt-2 line-clamp-3 text-[12.5px] leading-snug text-ink-2">
                <span className="font-semibold text-ink">{shortDate(lastNote.date)}:</span> {lastNote.body}
              </p>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-3">No notes yet.</p>
            )}
          </div>
        </div>
        {scope.placement ? <p className="text-[12px] text-ink-3">Mentor for this learner: {staffName(s.mentorId)}.</p> : null}
      </div>
    </Card>
  );
}

/* ================================================================== mentoring sessions */

const SESSION_TONE: Record<MentoringSession["status"], StatusTone> = { scheduled: "info", completed: "jade", missed: "rose" };

function SessionsTab({
  scope,
  sessions,
  setSessions,
  onSchedule,
  onReschedule,
  onNote,
}: {
  scope: MentorScope;
  sessions: MentoringSession[];
  setSessions: React.Dispatch<React.SetStateAction<MentoringSession[]>>;
  onSchedule: (studentId?: string) => void;
  onReschedule: (session: MentoringSession) => void;
  onNote: (studentId: string, body: string) => void;
}) {
  const [day, setDay] = useState(TODAY);
  const [status, setStatus] = useState("");

  const events: UiCalendarEvent[] = useMemo(
    () =>
      sessions
        .filter((m) => !status || m.status === status)
        .map((m) => ({
          id: m.id,
          date: m.start.slice(0, 10),
          time: formatTime(m.start),
          title: `${formatTime(m.start)} ${studentById(m.studentId)?.name ?? ""}`,
          tone: SESSION_TONE[m.status],
          kind: `${m.mode} mentoring session`,
        })),
    [sessions, status],
  );

  const dayList = sessions.filter((m) => m.start.startsWith(day)).sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = sessions
    .filter((m) => m.status === "scheduled" && m.start.slice(0, 10) >= TODAY)
    .sort((a, b) => a.start.localeCompare(b.start));
  const nextAfter = upcoming.find((m) => m.start.slice(0, 10) > day);

  const setSessionStatus = (m: MentoringSession, next: MentoringSession["status"]) => {
    setSessions((list) => list.map((x) => (x.id === m.id ? { ...x, status: next } : x)));
    const name = studentById(m.studentId)?.name;
    toast({
      title: next === "completed" ? "Session marked completed" : "Session marked missed",
      body: next === "completed" ? `${name} · record what you agreed as a mentor note` : `${name} · a missed-session alert is added to their record`,
      tone: next === "completed" ? "success" : "warning",
    });
  };

  return (
    <section className="space-y-5">
      <SectionIntro
        title="Schedule mentoring sessions"
        sub="Video, phone or in-person sessions with your learners. Pick a day to see and run its sessions."
        action={
          <>
            <FilterSelect
              label="Status"
              allLabel="All"
              value={status}
              onChange={setStatus}
              options={[
                { value: "scheduled", label: "Scheduled" },
                { value: "completed", label: "Completed" },
                { value: "missed", label: "Missed" },
              ]}
            />
            <Button variant="secondary" onClick={() => onSchedule()}>
              <CalendarPlus className="size-4" /> Schedule mentoring session
            </Button>
          </>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
        <Card className="min-w-0 p-3 sm:p-5">
          <MonthCalendar month="2026-09" events={events} selected={day} onSelectDay={(d) => setDay(d)} />
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[12px] text-ink-3">
            {(["scheduled", "completed", "missed"] as const).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5">
                <span aria-hidden className={cn("size-2.5 rounded-full", k === "scheduled" ? "bg-info" : k === "completed" ? "bg-jade" : "bg-rose")} />
                {k.charAt(0).toUpperCase() + k.slice(1)} · {sessions.filter((m) => m.status === k).length}
              </span>
            ))}
          </div>
        </Card>

        <Card className="min-w-0 self-start">
          <CardHeader
            title={formatCalendarDate(day, "long")}
            sub={dayList.length ? plural(dayList.length, "mentoring session") : "No sessions on this day"}
            action={
              day !== TODAY ? (
                <Button size="xs" variant="ghost" onClick={() => setDay(TODAY)}>
                  Today
                </Button>
              ) : null
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {dayList.map((m) => {
              const s = studentById(m.studentId)!;
              const ModeIcon = m.mode === "Video" ? Video : m.mode === "Phone" ? Phone : MapPin;
              return (
                <li key={m.id} className="space-y-2.5 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="w-12 shrink-0">
                        <p className="font-mono text-[15px] font-bold text-ink tnum">{formatTime(m.start)}</p>
                        <p className="text-[11.5px] text-ink-3">{m.durationMins} min</p>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-bold text-ink">{s.name}</p>
                        <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                          <ModeIcon aria-hidden className="size-3.5" /> {m.mode}
                          {scope.placement ? ` · ${staffName(m.mentorId)}` : ""}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={m.status} size="sm" />
                  </div>
                  <p className="text-[13px] leading-snug text-ink-2">{m.agenda}</p>
                  <div className="flex flex-wrap gap-2">
                    {m.status === "scheduled" ? (
                      <>
                        <Button size="xs" onClick={() => setSessionStatus(m, "completed")}>
                          <Check className="size-3.5" /> Mark completed
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => onReschedule(m)}>
                          Reschedule
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setSessionStatus(m, "missed")}>
                          <CircleSlash className="size-3.5" /> Mark missed
                        </Button>
                      </>
                    ) : null}
                    {m.status === "completed" ? (
                      <Button size="xs" variant="outline" onClick={() => onNote(m.studentId, `${m.agenda}. `)}>
                        <NotebookPen className="size-3.5" /> Record note
                      </Button>
                    ) : null}
                    {m.status === "missed" ? (
                      <Button size="xs" variant="outline" onClick={() => onSchedule(m.studentId)}>
                        <CalendarPlus className="size-3.5" /> Rebook
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
            {dayList.length === 0 ? (
              <li className="space-y-3 px-5 py-6 text-center">
                <p className="text-[13px] text-ink-3">Nothing booked for this day.</p>
                {nextAfter ? (
                  <Button size="xs" variant="outline" onClick={() => setDay(nextAfter.start.slice(0, 10))}>
                    Next session: {formatCalendarDate(nextAfter.start.slice(0, 10), "day")}
                  </Button>
                ) : null}
              </li>
            ) : null}
          </ul>
        </Card>
      </div>
    </section>
  );
}

/* ================================================================== mentor notes */

function NotesTab({
  scope,
  notes,
  setNotes,
  onRecord,
}: {
  scope: MentorScope;
  notes: NoteRow[];
  setNotes: React.Dispatch<React.SetStateAction<NoteRow[]>>;
  onRecord: (studentId?: string) => void;
}) {
  const [visibility, setVisibility] = useState("all");
  const [student, setStudent] = useState("");

  const shown = notes.filter((n) => (visibility === "all" || n.visibility === visibility) && (!student || n.studentId === student));
  const withNotes = new Set(notes.filter((n) => daysBetween(n.date, TODAY) <= 30).map((n) => n.studentId));
  const gaps = scope.students
    .filter((s) => !withNotes.has(s.id) && s.enrolmentStatus !== "completed")
    .sort((a, b) => b.lastActiveDaysAgo - a.lastActiveDaysAgo)
    .slice(0, 6);
  const studentOptions = Array.from(new Set(notes.map((n) => n.studentId))).map((id) => ({ value: id, label: studentById(id)?.name ?? id }));

  const toggle = (n: NoteRow) => {
    const next = n.visibility === "private" ? "shared" : "private";
    setNotes((list) => list.map((x) => (x.id === n.id ? { ...x, visibility: next } : x)));
    toast({
      title: next === "shared" ? "Note shared with the learner" : "Note made private",
      body: `${studentById(n.studentId)?.name} · ${formatAccaDate(n.date)}`,
      tone: "info",
    });
  };

  return (
    <section className="space-y-5">
      <SectionIntro
        title="Record mentor notes"
        sub="Private notes stay with mentors and the programme team. Shared notes appear on the learner's My mentor page."
        action={
          <Button variant="secondary" onClick={() => onRecord()}>
            <NotebookPen className="size-4" /> Record mentor note
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              size="sm"
              value={visibility}
              onChange={setVisibility}
              items={[
                { id: "all", label: "All notes" },
                { id: "private", label: "Private" },
                { id: "shared", label: "Shared with learner" },
              ]}
            />
            <FilterBar active={Boolean(student)} onClear={() => setStudent("")}>
              <FilterSelect label="Student" allLabel="All students" value={student} onChange={setStudent} options={studentOptions} />
            </FilterBar>
          </div>
          <ul className="space-y-3">
            {shown.map((n) => {
              const s = studentById(n.studentId)!;
              return (
                <li key={n.id} className="min-w-0 rounded-[var(--radius-lg)] border border-line bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <StudentCell student={s} sub={`${formatAccaDate(n.date)} · by ${staffName(n.mentorId)}`} />
                    <StatusPill status={n.visibility} tone={n.visibility === "shared" ? "info" : "neutral"}>
                      {n.visibility === "private" ? <Lock aria-hidden className="size-3" /> : null}
                      {VISIBILITY_LABEL[n.visibility]}
                    </StatusPill>
                  </div>
                  <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{n.body}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {n.tags.map((t) => (
                        <span key={t} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-2">
                          {t}
                        </span>
                      ))}
                    </div>
                    <Button size="xs" variant="ghost" onClick={() => toggle(n)}>
                      {n.visibility === "private" ? "Share with learner" : "Make private"}
                    </Button>
                  </div>
                </li>
              );
            })}
            {shown.length === 0 ? (
              <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-6 py-10 text-center text-[13px] text-ink-3">
                No notes match this view.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="No note in 30 days" sub="Learners without a recent mentor note" />
            <ul className="divide-y divide-line border-t border-line">
              {gaps.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
                  <StudentCell student={s} sub={`Last active ${s.lastActiveDaysAgo === 0 ? "today" : `${s.lastActiveDaysAgo}d ago`}`} />
                  <Button size="xs" variant="outline" onClick={() => onRecord(s.id)} aria-label={`Record note for ${s.name}`}>
                    <Plus className="size-3.5" /> Note
                  </Button>
                </li>
              ))}
              {gaps.length === 0 ? <li className="px-4 py-6 text-center text-[13px] text-ink-3">Every learner has a recent note.</li> : null}
            </ul>
          </Card>
          <Card className="p-5">
            <MiniLabel>What to record</MiniLabel>
            <ul className="mt-2.5 space-y-2 text-[12.5px] leading-snug text-ink-2">
              <li>What the learner said about progress, workload and blockers.</li>
              <li>What you agreed, with dates, and who owns each step.</li>
              <li>Referrals made to faculty, finance or the programme team.</li>
            </ul>
            <p className="mt-3 text-[12px] text-ink-3">Keep health, family and financial details private.</p>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ================================================================== authorised reminders */

function RemindersTab({
  reminders,
  setReminders,
  onSend,
}: {
  reminders: ReminderRow[];
  setReminders: React.Dispatch<React.SetStateAction<ReminderRow[]>>;
  onSend: (templateId?: string) => void;
}) {
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");
  const rows = reminders.filter((r) => (!channel || r.channel === channel) && (!status || r.status === status));

  const columns: DataTableColumn<ReminderRow>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (r) => studentById(r.studentId)?.name ?? "",
      render: (r) => <StudentCell student={studentById(r.studentId)!} />,
    },
    {
      key: "message",
      header: "Message",
      wrap: true,
      render: (r) => (
        <span className="block max-w-md">
          {r.templateName ? <span className="block text-[12px] font-semibold text-ink-3">{r.templateName}</span> : null}
          <span className="line-clamp-2 text-[13px] text-ink">{r.message}</span>
        </span>
      ),
    },
    { key: "channel", header: "Channel", sortable: true, render: (r) => CHANNEL_LABELS[r.channel] ?? r.channel },
    { key: "sentOn", header: "Sent", sortable: true, render: (r) => formatAccaDate(r.sentOn) },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} size="sm" /> },
    {
      key: "action",
      header: "",
      align: "right",
      render: (r) =>
        r.status === "failed" ? (
          <Button
            size="xs"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setReminders((list) => list.map((x) => (x.id === r.id ? { ...x, status: "delivered", sentOn: TODAY, channel: x.channel === "whatsapp" ? "sms" : x.channel } : x)));
              toast({
                title: "Reminder resent",
                body: `${studentById(r.studentId)?.name} · ${r.channel === "whatsapp" ? "WhatsApp failed, sent by SMS" : `by ${CHANNEL_LABELS[r.channel]}`}`,
              });
            }}
          >
            <RotateCcw className="size-3.5" /> Resend
          </Button>
        ) : null,
    },
  ];

  return (
    <section className="space-y-5">
      <SectionIntro
        title="Send authorised reminders"
        sub="Mentors send approved templates only, filled from the learner's record. Free-text and fee messages go through the programme team."
        action={
          <Button variant="secondary" onClick={() => onSend()}>
            <Send className="size-4" /> Send authorised reminder
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <CardHeader title="Authorised templates" sub="Approved by the programme team for mentors" />
          <ul className="divide-y divide-line border-t border-line">
            {TEMPLATE_OPTIONS.map(({ template: t, allowed, reason }) => (
              <li key={t.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
                      {allowed ? <ShieldCheck aria-hidden className="size-3.5 shrink-0 text-jade" /> : <Lock aria-hidden className="size-3.5 shrink-0 text-ink-3" />}
                      <span className="truncate">{t.name}</span>
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {CHANNEL_LABELS[t.channel]} · {t.category}
                      {allowed ? "" : ` · ${reason}`}
                    </p>
                  </div>
                  {allowed ? (
                    <Button size="xs" variant="outline" onClick={() => onSend(t.id)}>
                      Use
                    </Button>
                  ) : (
                    <Badge tone="neutral">Locked</Badge>
                  )}
                </div>
                <p className={cn("mt-1.5 line-clamp-2 text-[12.5px] leading-snug", allowed ? "text-ink-2" : "text-ink-3")}>{t.body}</p>
              </li>
            ))}
          </ul>
        </Card>

        <DataTable
          className="min-w-0"
          caption="Reminders sent"
          rows={rows}
          columns={columns}
          getRowId={(r) => r.id}
          search={{
            placeholder: "Search student or message",
            match: (r, q) => (studentById(r.studentId)?.name ?? "").toLowerCase().includes(q) || r.message.toLowerCase().includes(q),
          }}
          filters={
            <FilterBar
              active={Boolean(channel || status)}
              onClear={() => {
                setChannel("");
                setStatus("");
              }}
            >
              <FilterSelect
                label="Channel"
                allLabel="All"
                value={channel}
                onChange={setChannel}
                options={Array.from(new Set(reminders.map((r) => r.channel))).map((c) => ({ value: c, label: CHANNEL_LABELS[c] ?? c }))}
              />
              <FilterSelect
                label="Status"
                allLabel="All"
                value={status}
                onChange={setStatus}
                options={[
                  { value: "delivered", label: "Delivered" },
                  { value: "read", label: "Read" },
                  { value: "failed", label: "Failed" },
                ]}
              />
            </FilterBar>
          }
          toolbar={
            <Button size="sm" variant="ghost" onClick={() => toast({ title: "Report queued: mentor-reminders.csv", tone: "info" })}>
              <Download className="size-4" /> Export
            </Button>
          }
        />
      </div>
    </section>
  );
}

/* ================================================================== intervention outcomes */

function OutcomesTab({ ivs, onRecord, onLog }: { ivs: InterventionRow[]; onRecord: (row: InterventionRow) => void; onLog: () => void }) {
  const [outcome, setOutcome] = useState("");
  const rows = ivs.filter((iv) => !outcome || iv.outcome === outcome);
  const count = (o: Outcome) => ivs.filter((iv) => iv.outcome === o).length;
  const closed = ivs.filter((iv) => iv.outcome !== "pending");
  const improved = count("improved");

  const byAction = useMemo(() => {
    const group = (iv: InterventionRow) =>
      iv.action.includes("recovery") ? "Recovery plan" : iv.action.includes("call") || iv.action.includes("Phone") ? "Call and restart" : iv.action.includes("Attendance") ? "Attendance contract" : "Other";
    const labels = Array.from(new Set(ivs.map(group)));
    return labels.map((label) => {
      const list = ivs.filter((iv) => group(iv) === label);
      return {
        label,
        parts: (["improved", "no-change", "worsened", "escalated", "pending"] as Outcome[]).map((o) => ({
          label: OUTCOME_LABEL[o],
          value: list.filter((iv) => iv.outcome === o).length,
          tone: chartTone(o),
        })),
      };
    });
  }, [ivs]);

  const columns: DataTableColumn<InterventionRow>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (iv) => studentById(iv.studentId)?.name ?? "",
      render: (iv) => <StudentCell student={studentById(iv.studentId)!} sub={`Started ${formatAccaDate(iv.startedOn)}`} />,
    },
    { key: "trigger", header: "Trigger", wrap: true, render: (iv) => <span className="block max-w-[14rem] text-[13px] text-ink-2">{iv.trigger}</span> },
    { key: "action", header: "Intervention", wrap: true, render: (iv) => <span className="block max-w-[16rem] text-[13px] text-ink">{iv.action}</span> },
    {
      key: "metric",
      header: "Before and after",
      sortable: true,
      sortValue: (iv) => (iv.after == null ? null : iv.after - iv.before),
      render: (iv) => {
        const delta = iv.after == null ? null : iv.after - iv.before;
        return (
          <span className="block">
            <span className="block text-[12px] text-ink-3">{iv.metric}</span>
            <span className="font-mono text-[13px] font-semibold text-ink tnum">
              {iv.before} to {iv.after ?? "·"}
            </span>
            {delta != null ? (
              <span className={cn("ml-2 font-mono text-[12px] font-semibold tnum", delta > 0 ? "text-jade" : delta < 0 ? "text-rose" : "text-ink-3")}>
                {delta > 0 ? `+${delta}` : delta}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: "outcome",
      header: "Outcome",
      sortable: true,
      render: (iv) => (
        <span className="block">
          <StatusPill status={iv.outcome} tone={OUTCOME_TONE[iv.outcome]} size="sm">
            {OUTCOME_LABEL[iv.outcome]}
          </StatusPill>
          {iv.closedOn ? <span className="mt-1 block text-[11.5px] text-ink-3">Closed {formatAccaDate(iv.closedOn)}</span> : null}
        </span>
      ),
    },
    {
      key: "record",
      header: "",
      align: "right",
      render: (iv) => (
        <Button
          size="xs"
          variant={iv.outcome === "pending" ? "primary" : "ghost"}
          onClick={(e) => {
            e.stopPropagation();
            onRecord(iv);
          }}
        >
          <Target className="size-3.5" /> {iv.outcome === "pending" ? "Record outcome" : "Update"}
        </Button>
      ),
    },
  ];

  return (
    <section className="space-y-5">
      <SectionIntro
        title="Track intervention outcomes"
        sub="Every intervention records a metric before and after, so you can see which actions move readiness and attendance."
        action={
          <Button variant="secondary" onClick={onLog}>
            <Plus className="size-4" /> Log intervention
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
        <Card className="min-w-0 p-5">
          <MiniLabel>Outcomes so far</MiniLabel>
          <div className="mt-3 flex flex-wrap items-center gap-5">
            <Donut
              size={120}
              stroke={14}
              segments={(["improved", "no-change", "worsened", "escalated", "pending"] as Outcome[]).map((o) => ({
                label: OUTCOME_LABEL[o],
                value: count(o),
                tone: chartTone(o),
              }))}
              center={
                <span>
                  <span className="block font-display text-[24px] leading-none font-bold text-ink tnum">
                    {closed.length ? Math.round((improved / closed.length) * 100) : 0}%
                  </span>
                  <span className="text-[11px] text-ink-3">improved</span>
                </span>
              }
            />
            <ul className="space-y-1.5 text-[12.5px]">
              {(["improved", "no-change", "worsened", "escalated", "pending"] as Outcome[]).map((o) => (
                <li key={o}>
                  <button
                    type="button"
                    onClick={() => setOutcome(outcome === o ? "" : o)}
                    className={cn("flex items-center gap-2 rounded-full px-1.5 text-ink-2 hover:bg-cta-soft", outcome === o && "bg-cta-soft font-semibold text-ink")}
                  >
                    <span aria-hidden className={cn("size-2.5 rounded-full", OUTCOME_DOT[o])} />
                    {OUTCOME_LABEL[o]}
                    <span className="font-semibold text-ink tnum">{count(o)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card className="min-w-0 p-5">
          <MiniLabel className="mb-3">Outcome by intervention type</MiniLabel>
          <StackedBar rows={byAction} />
        </Card>
      </div>

      <DataTable
        caption="Interventions"
        rows={rows}
        columns={columns}
        getRowId={(iv) => iv.id}
        initialSort={{ key: "outcome", dir: "desc" }}
        search={{
          placeholder: "Search student or intervention",
          match: (iv, q) => (studentById(iv.studentId)?.name ?? "").toLowerCase().includes(q) || iv.action.toLowerCase().includes(q),
        }}
        filters={
          <FilterSelect
            label="Outcome"
            allLabel="All outcomes"
            value={outcome}
            onChange={setOutcome}
            options={(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => ({ value: o, label: OUTCOME_LABEL[o] }))}
          />
        }
        onRowClick={(iv) => onRecord(iv)}
        rowLabel={(iv) => `Record outcome for ${studentById(iv.studentId)?.name}`}
      />
    </section>
  );
}

function OutcomeDrawer({ row, onClose, onSave }: { row: InterventionRow | null; onClose: () => void; onSave: (row: InterventionRow) => void }) {
  const s = row ? studentById(row.studentId) : undefined;
  return (
    <FormDrawer
      open={row != null}
      onClose={onClose}
      title="Record intervention outcome"
      sub={row && s ? `${s.name} · ${row.action}` : undefined}
      submitLabel="Save outcome"
      footerNote="Closes the intervention"
      onSubmit={(data) => {
        if (!row) return;
        const outcome = String(data.get("outcome")) as Outcome;
        const afterRaw = String(data.get("after") ?? "").trim();
        const after = afterRaw === "" ? null : Number(afterRaw);
        const next: InterventionRow = {
          ...row,
          outcome,
          after: outcome === "pending" ? null : after,
          closedOn: outcome === "pending" ? undefined : TODAY,
          note: String(data.get("note") ?? "").trim() || undefined,
        };
        onSave(next);
        toast({
          title: outcome === "pending" ? "Outcome left open" : `Outcome recorded: ${OUTCOME_LABEL[outcome]}`,
          body: `${s?.name} · ${row.metric} ${row.before} to ${after ?? "not measured"}`,
          tone: outcome === "worsened" || outcome === "escalated" ? "warning" : "success",
        });
        onClose();
      }}
    >
      {row ? <OutcomeFields row={row} /> : null}
    </FormDrawer>
  );
}

function OutcomeFields({ row }: { row: InterventionRow }) {
  const [after, setAfter] = useState(row.after == null ? "" : String(row.after));
  const suggested: Outcome =
    after === "" ? "pending" : Number(after) - row.before >= 3 ? "improved" : Number(after) - row.before <= -3 ? "worsened" : "no-change";
  const [outcome, setOutcome] = useState<Outcome>(row.outcome === "pending" ? suggested : row.outcome);
  const [touched, setTouched] = useState(row.outcome !== "pending");
  const value = touched ? outcome : suggested;
  return (
    <>
      <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5 text-[13px] text-ink-2">
        <p>
          <span className="font-semibold text-ink">Trigger:</span> {row.trigger}
        </p>
        <p className="mt-1">
          <span className="font-semibold text-ink">{row.metric}</span> was <span className="font-mono font-semibold text-ink">{row.before}</span> on{" "}
          {formatAccaDate(row.startedOn)}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={`${row.metric} now`} hint="Leave blank if not measured yet">
          <Input type="number" name="after" min={0} max={100} value={after} onChange={(e) => setAfter(e.target.value)} />
        </Field>
        <Field label="Outcome" hint={touched ? undefined : "Suggested from the change"}>
          <Select
            name="outcome"
            value={value}
            onChange={(e) => {
              setTouched(true);
              setOutcome(e.target.value as Outcome);
            }}
          >
            <option value="improved">Improved</option>
            <option value="no-change">No change</option>
            <option value="worsened">Worsened</option>
            <option value="escalated">Escalated</option>
            <option value="pending">Awaiting outcome</option>
          </Select>
        </Field>
      </div>
      {value === "escalated" ? (
        <p className="rounded-[var(--radius-md)] border border-violet/30 bg-violet-soft px-3.5 py-2.5 text-[12.5px] text-ink-2">
          Raise the escalation itself from Recovery & escalations so faculty or the programme team can act on it.
        </p>
      ) : null}
      <Field label="What happened">
        <Textarea name="note" rows={3} defaultValue={row.note} placeholder="What changed, and what you will do next." />
      </Field>
    </>
  );
}

function LogInterventionDrawer({
  open,
  onClose,
  scope,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  scope: MentorScope;
  onSave: (row: InterventionRow) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Log intervention"
      sub="Record what you are doing and the metric you expect it to move. Come back to record the outcome."
      submitLabel="Log intervention"
      onSubmit={(data) => {
        const sid = String(data.get("student"));
        const s = studentById(sid)!;
        const row: InterventionRow = {
          id: newId("iv"),
          studentId: sid,
          mentorId: s.mentorId,
          trigger: String(data.get("trigger")),
          action: String(data.get("action")).trim(),
          startedOn: TODAY,
          metric: String(data.get("metric")),
          before: Number(data.get("before")),
          after: null,
          outcome: "pending",
        };
        onSave(row);
        toast({ title: "Intervention logged", body: `${s.name} · ${row.metric} baseline ${row.before}` });
        onClose();
      }}
    >
      {open ? <LogFields scope={scope} /> : null}
    </FormDrawer>
  );
}

function LogFields({ scope }: { scope: MentorScope }) {
  const [sid, setSid] = useState(scope.students.find((s) => s.risk.level !== "low")?.id ?? scope.students[0]?.id ?? "");
  const s = studentById(sid);
  const metrics = s
    ? [
        ...(s.currentPaper ? [{ label: `${s.currentPaper} readiness`, value: currentReadiness(s) }] : []),
        { label: "Attendance %", value: s.attendance.pct },
        { label: "Study hours per week", value: s.activityHours[7] },
      ]
    : [];
  const [metric, setMetric] = useState(metrics[0]?.label ?? "Attendance %");
  const baseline = metrics.find((m) => m.label === metric)?.value ?? 0;
  return (
    <>
      <Field label="Student">
        <Select
          name="student"
          value={sid}
          onChange={(e) => {
            setSid(e.target.value);
            const next = studentById(e.target.value);
            setMetric(next?.currentPaper ? `${next.currentPaper} readiness` : "Attendance %");
          }}
        >
          {scope.students.map((x) => (
            <option key={x.id} value={x.id}>
              {x.name} · {x.risk.level} risk
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Trigger">
        <Select name="trigger" key={`tr-${sid}`} defaultValue={s?.risk.reasons[0] ?? "Mentor review"}>
          {Array.from(new Set([...(s?.risk.reasons ?? []), "Mentor review", "Learner request"])).map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      <Field label="Intervention">
        <Input name="action" key={`ac-${sid}`} required defaultValue={s?.lastActiveDaysAgo && s.lastActiveDaysAgo >= 14 ? "Phone call and restart plan" : "Weekly check-in and weak-topic practice set"} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Metric to move">
          <Select name="metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {metrics.map((m) => (
              <option key={m.label}>{m.label}</option>
            ))}
          </Select>
        </Field>
        <Field label="Baseline" hint="From the learner's record today">
          <Input type="number" name="before" key={`${sid}-${metric}`} defaultValue={baseline} min={0} required />
        </Field>
      </div>
    </>
  );
}
