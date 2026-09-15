"use client";

import { useState } from "react";
import {
  AlertOctagon,
  BellRing,
  BookOpenCheck,
  CalendarPlus,
  Check,
  CircleDot,
  Download,
  GraduationCap,
  LifeBuoy,
  MessageSquarePlus,
  Pencil,
  RotateCcw,
  Send,
  Target,
  Users,
} from "lucide-react";
import {
  SLA_HOURS,
  addDays,
  classesForCohort,
  cohortById,
  cohorts,
  daysBetween,
  doubtSessions,
  escalations,
  examSessions,
  faculty as facultyStaff,
  formatAccaDate,
  formatTime,
  mentoringSessions,
  paperByCode,
  paperName,
  recoveryPlans,
  staffById,
  staffName,
  studentById,
  type Escalation,
  type MentoringSession,
  type RecoveryPlan,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/components/ui/calendar";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Drawer } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { ScoreBar } from "@/components/ui/score";
import { RiskBadge, StatusPill, type StatusTone } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { Timeline } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import {
  ACADEMIC_CATEGORIES,
  EscalationDrawer,
  OPERATIONAL_ROUTES,
  ReminderDrawer,
  ScheduleSessionDrawer,
  type EscalationKind,
  type EscalationRow,
} from "./drawers";
import { MentorScopeChip, useMentorScope, type MentorScope } from "./scope";
import { MiniLabel, SectionIntro, StudentCell, TODAY, TypePill, ago, dueLabel, plural } from "./shared";

type TabId = "recovery" | "academic" | "operational";
const TAB_IDS: TabId[] = ["recovery", "academic", "operational"];

type Step = RecoveryPlan["steps"][number];
type CaseRow = RecoveryPlan & { mockTarget: number; cadence: string; practiceMockOn?: string; remedialRequested?: boolean };

const CASE_STATUS_LABEL: Record<RecoveryPlan["status"], string> = {
  active: "Active",
  "on-track": "On track",
  "at-risk": "At risk",
  completed: "Completed",
};
const CASE_STATUS_TONE: Record<RecoveryPlan["status"], StatusTone> = {
  active: "info",
  "on-track": "jade",
  "at-risk": "rose",
  completed: "neutral",
};

const PRIORITY_TONE: Record<Escalation["priority"], StatusTone> = { urgent: "rose", high: "rose", medium: "amber", low: "neutral" };
const ESC_STATUS_LABEL: Record<Escalation["status"], string> = { open: "Open", "in-progress": "In progress", resolved: "Resolved" };

const SEED_CATEGORY: Record<string, string> = {
  "mesc-01": "Exam readiness decision",
  "mesc-02": "Concept clarification",
  "mesc-03": "Fees and payments",
  "mesc-04": "Exam booking",
  "mesc-05": "University record",
  "mesc-06": "Exam readiness decision",
  "mesc-07": "Remedial learning request",
  "mesc-08": "ACCA registration or subscription",
};

function seedCase(p: RecoveryPlan): CaseRow {
  return { ...p, mockTarget: 55, cadence: p.status === "at-risk" ? "Weekly" : "Fortnightly" };
}

function seedEscalation(e: Escalation): EscalationRow {
  const to = staffName(e.toId);
  const updates = [{ at: e.raisedOn, body: `Raised by ${staffName(e.raisedBy)}${e.ticketId ? ` · support ticket ${e.ticketId}` : ""}` }];
  if (e.status !== "open") {
    updates.push({
      at: addDays(e.raisedOn, 1),
      body:
        e.kind === "academic"
          ? `${to} replied: reviewing the learner's recent mocks and class attendance before advising.`
          : `${to} picked this up and is checking the learner's records.`,
    });
  }
  if (e.status === "resolved") updates.push({ at: addDays(e.raisedOn, 3), body: `Resolved by ${to}.` });
  return { ...e, category: SEED_CATEGORY[e.id] ?? (e.kind === "academic" ? ACADEMIC_CATEGORIES[0] : OPERATIONAL_ROUTES[0].category), updates };
}

function bookingFor(s: Student, paper: RecoveryPlan["paper"]) {
  return s.examBookings.find((b) => b.paper === paper && b.status !== "sat" && b.status !== "cancelled");
}

function paperReadiness(s: Student, paper: RecoveryPlan["paper"]) {
  return s.readiness.byPaper[paper] ?? s.readiness.overall;
}

function responseState(e: EscalationRow): { label: string; tone: StatusTone } {
  if (e.status === "resolved") return { label: "Resolved", tone: "jade" };
  if (e.status === "in-progress") return { label: "Responded", tone: "jade" };
  const elapsed = daysBetween(e.raisedOn, TODAY) * 24;
  const sla = SLA_HOURS[e.priority];
  if (elapsed > sla) return { label: `Reply overdue by ${plural(Math.ceil((elapsed - sla) / 24), "day")}`, tone: "rose" };
  return { label: `Reply due within ${sla - elapsed}h`, tone: "amber" };
}

export function MentorRecoveryPage({ initialTab }: { initialTab?: string }) {
  const { persona } = useRole();
  const tab = TAB_IDS.includes(initialTab as TabId) ? (initialTab as TabId) : "recovery";
  return <RecoveryView key={persona.id} initialTab={tab} />;
}

function RecoveryView({ initialTab }: { initialTab: TabId }) {
  const scope = useMentorScope();
  const inScope = <T extends { studentId: string }>(list: T[]) => list.filter((x) => scope.ids.has(x.studentId));

  const [tab, setTab] = useState<TabId>(initialTab);
  const [cases, setCases] = useState<CaseRow[]>(() => inScope(recoveryPlans).map(seedCase));
  const [escs, setEscs] = useState<EscalationRow[]>(() => inScope(escalations).map(seedEscalation));
  const [sessions, setSessions] = useState<MentoringSession[]>(() => inScope(mentoringSessions));
  const [reminded, setReminded] = useState<Record<string, string>>({});
  const [raisedIds, setRaisedIds] = useState<string[]>([]);

  const [escalating, setEscalatingState] = useState<{ kind: EscalationKind; studentId?: string; paper?: RecoveryPlan["paper"] } | null>(null);
  // The drawer keeps its last kind while it animates closed, so the title does not flip.
  const [escKind, setEscKind] = useState<EscalationKind>("academic");
  const setEscalating = (next: { kind: EscalationKind; studentId?: string; paper?: RecoveryPlan["paper"] } | null) => {
    if (next) setEscKind(next.kind);
    setEscalatingState(next);
  };
  const [editing, setEditing] = useState<CaseRow | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [reminding, setReminding] = useState<string | null>(null);
  const [openEscId, setOpenEscId] = useState<string | null>(null);

  const openCases = cases.filter((c) => c.status !== "completed");
  const atRisk = cases.filter((c) => c.status === "at-risk").length;
  const unbooked = openCases.filter((c) => bookingFor(studentById(c.studentId)!, c.paper)?.status !== "booked");
  const openEscs = escs.filter((e) => e.status !== "resolved");
  const byPaper = Array.from(new Set(openCases.map((c) => c.paper)))
    .map((p) => `${p} ${openCases.filter((c) => c.paper === p).length}`)
    .join(" · ");

  const patchCase = (id: string, patch: Partial<CaseRow>) => setCases((list) => list.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const patchEsc = (id: string, patch: (e: EscalationRow) => EscalationRow) => setEscs((list) => list.map((e) => (e.id === id ? patch(e) : e)));

  const tabs = [
    { id: "recovery", label: "Failed-paper recovery", count: openCases.length },
    { id: "academic", label: "Academic escalations", count: openEscs.filter((e) => e.kind === "academic").length },
    { id: "operational", label: "Operational escalations", count: openEscs.filter((e) => e.kind === "operational").length },
  ];

  const openEsc = escs.find((e) => e.id === openEscId) ?? null;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student success"
        title="Recovery & escalations"
        sub="Manage failed-paper recovery with a revision cohort, mock targets and sessions, and escalate academic issues to faculty or operational issues to the programme team."
        badge={<MentorScopeChip scope={scope} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => setEscalating({ kind: "operational" })}>
              <LifeBuoy className="size-4" /> Escalate operational issue
            </Button>
            <Button onClick={() => setEscalating({ kind: "academic" })}>
              <GraduationCap className="size-4" /> Escalate academic issue
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Failed-paper cases" value={openCases.length} sub={byPaper || "No open cases"} icon={<RotateCcw />} />
        <KpiTile label="At risk of a second fail" value={atRisk} tone="rose" sub="readiness below the pass mark" icon={<AlertOctagon />} />
        <KpiTile
          label="Reattempt not booked"
          value={unbooked.length}
          tone="amber"
          sub="Dec 2026 early entry closes 5 Oct"
          icon={<BellRing />}
        />
        <KpiTile
          label="Open escalations"
          value={openEscs.length}
          tone="info"
          sub={`${openEscs.filter((e) => e.kind === "academic").length} academic · ${openEscs.filter((e) => e.kind === "operational").length} operational`}
          icon={<LifeBuoy />}
        />
      </KpiRow>

      <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === "recovery" ? (
        <RecoveryTab
          scope={scope}
          cases={cases}
          escs={escs}
          sessions={sessions}
          reminded={reminded}
          onPatch={(c, patch, title, body) => {
            patchCase(c.id, patch);
            toast({ title, body });
          }}
          onEdit={setEditing}
          onSchedule={setScheduling}
          onRemind={setReminding}
          onEscalate={(kind, c) => setEscalating({ kind, studentId: c.studentId, paper: c.paper })}
          onOpenEscalation={setOpenEscId}
        />
      ) : (
        <EscalationsTab
          kind={tab}
          scope={scope}
          rows={escs.filter((e) => e.kind === tab)}
          raisedIds={raisedIds}
          onRaise={() => setEscalating({ kind: tab })}
          onOpen={(e) => setOpenEscId(e.id)}
        />
      )}

      {/* ------------------------------------------------------------ drawers */}
      <EscalationDrawer
        open={escalating != null}
        onClose={() => setEscalating(null)}
        scope={scope}
        kind={escKind}
        studentId={escalating?.studentId}
        paper={escalating?.paper}
        onRaise={(row) => {
          const next: EscalationRow = {
            ...row,
            updates: [{ at: TODAY, body: `Raised by ${scope.mentorName}${row.ticketId ? ` · support ticket ${row.ticketId}` : ""}` }],
          };
          setEscs((list) => [next, ...list]);
          setRaisedIds((ids) => [...ids, next.id]);
          if (!escalating?.studentId) setTab(row.kind);
        }}
      />
      <EditCaseDrawer
        row={editing}
        onClose={() => setEditing(null)}
        onSave={(id, patch) => {
          patchCase(id, patch);
          const c = cases.find((x) => x.id === id);
          toast({ title: "Recovery plan updated", body: `${studentById(c?.studentId)?.name} · ${c?.paper} · mock target ${patch.mockTarget}%` });
        }}
      />
      <ScheduleSessionDrawer
        open={scheduling != null}
        onClose={() => setScheduling(null)}
        scope={scope}
        studentId={scheduling ?? undefined}
        onSave={(m) => setSessions((list) => [...list, m])}
      />
      <ReminderDrawer
        open={reminding != null}
        onClose={() => setReminding(null)}
        scope={scope}
        studentIds={reminding ? [reminding] : []}
        defaultTemplateId="tpl-entry-deadline"
        onSent={(rows) =>
          setReminded((r) => {
            const next = { ...r };
            rows.forEach((x) => (next[x.studentId] = `Entry reminder sent ${formatCalendarDate(TODAY, "day")}`));
            return next;
          })
        }
      />
      <EscalationDetail
        row={openEsc}
        onClose={() => setOpenEscId(null)}
        onUpdate={(e, body) => {
          patchEsc(e.id, (x) => ({ ...x, updates: [...(x.updates ?? []), { at: TODAY, body }] }));
          toast({ title: "Update added", body: e.subject });
        }}
        onChase={(e) => {
          patchEsc(e.id, (x) => ({ ...x, updates: [...(x.updates ?? []), { at: TODAY, body: `Chased ${staffName(e.toId)} by ${scope.mentorName}` }] }));
          toast({ title: `Chased ${staffName(e.toId)}`, body: `${e.subject} · ${responseState(e).label.toLowerCase()}`, tone: "info" });
        }}
        onStatus={(e, status) => {
          patchEsc(e.id, (x) => ({
            ...x,
            status,
            updates: [...(x.updates ?? []), { at: TODAY, body: status === "resolved" ? `Marked resolved by ${scope.mentorName}` : `Reopened by ${scope.mentorName}` }],
          }));
          toast({ title: status === "resolved" ? "Escalation resolved" : "Escalation reopened", body: e.subject });
        }}
      />
    </div>
  );
}

/* ================================================================== failed-paper recovery */

function RecoveryTab({
  scope,
  cases,
  escs,
  sessions,
  reminded,
  onPatch,
  onEdit,
  onSchedule,
  onRemind,
  onEscalate,
  onOpenEscalation,
}: {
  scope: MentorScope;
  cases: CaseRow[];
  escs: EscalationRow[];
  sessions: MentoringSession[];
  reminded: Record<string, string>;
  onPatch: (c: CaseRow, patch: Partial<CaseRow>, title: string, body?: string) => void;
  onEdit: (c: CaseRow) => void;
  onSchedule: (studentId: string) => void;
  onRemind: (studentId: string) => void;
  onEscalate: (kind: EscalationKind, c: CaseRow) => void;
  onOpenEscalation: (id: string) => void;
}) {
  const [paper, setPaper] = useState("");
  const [status, setStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const order = { "at-risk": 0, active: 1, "on-track": 2, completed: 3 } as const;
  const listed = cases
    .filter((c) => (!paper || c.paper === paper) && (!status || c.status === status))
    .sort((a, b) => order[a.status] - order[b.status] || a.score - b.score);
  const selected = cases.find((c) => c.id === selectedId) ?? listed[0] ?? null;

  return (
    <section className="space-y-5">
      <SectionIntro
        title="Manage failed-paper recovery"
        sub="Learners who failed a paper in a recent session. Each case has a revision cohort, mock targets, recovery steps and sessions agreed with faculty."
        action={
          <>
            <FilterBar
              active={Boolean(paper || status)}
              onClear={() => {
                setPaper("");
                setStatus("");
              }}
            >
              <FilterSelect label="Paper" allLabel="All papers" value={paper} onChange={setPaper} options={Array.from(new Set(cases.map((c) => c.paper)))} />
              <FilterSelect
                label="Status"
                allLabel="All"
                value={status}
                onChange={setStatus}
                options={(Object.keys(CASE_STATUS_LABEL) as RecoveryPlan["status"][]).map((s) => ({ value: s, label: CASE_STATUS_LABEL[s] }))}
              />
            </FilterBar>
            <Button
              variant="ghost"
              onClick={() => toast({ title: "Report queued: failed-paper-recovery.csv", body: plural(listed.length, "case"), tone: "info" })}
            >
              <Download className="size-4" /> Export
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <ul className="max-h-[44rem] divide-y divide-line overflow-y-auto">
            {listed.map((c) => {
              const s = studentById(c.studentId)!;
              const done = c.steps.filter((x) => x.status === "done").length;
              const active = selected?.id === c.id;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
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
                        <span className="block truncate text-[12.5px] text-ink-2">
                          <span className="font-mono font-semibold">{c.paper}</span> {c.score}% in {c.failedSessionLabel} · reattempt {c.targetLabel}
                        </span>
                      </span>
                      <StatusPill status={c.status} tone={CASE_STATUS_TONE[c.status]} size="sm">
                        {CASE_STATUS_LABEL[c.status]}
                      </StatusPill>
                    </span>
                    <span className="mt-2.5 flex items-center gap-2.5">
                      <Progress value={(done / c.steps.length) * 100} tone="brand" height={5} className="flex-1" />
                      <span className="shrink-0 text-[11.5px] text-ink-3">
                        {done} of {c.steps.length} steps · readiness <span className="font-mono font-semibold text-ink tnum">{paperReadiness(s, c.paper)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {listed.length === 0 ? <li className="px-4 py-8 text-center text-[13px] text-ink-3">No cases match these filters.</li> : null}
          </ul>
        </Card>

        {selected ? (
          <CaseDetail
            key={selected.id}
            c={selected}
            scope={scope}
            escs={escs.filter((e) => e.studentId === selected.studentId)}
            sessions={sessions.filter((m) => m.studentId === selected.studentId)}
            reminded={reminded[selected.studentId]}
            onPatch={(patch, title, body) => onPatch(selected, patch, title, body)}
            onEdit={() => onEdit(selected)}
            onSchedule={() => onSchedule(selected.studentId)}
            onRemind={() => onRemind(selected.studentId)}
            onEscalate={(kind) => onEscalate(kind, selected)}
            onOpenEscalation={onOpenEscalation}
          />
        ) : (
          <Card className="grid min-w-0 place-items-center p-10 text-center text-[13px] text-ink-3">No failed-paper cases for these learners.</Card>
        )}
      </div>
    </section>
  );
}

function CaseDetail({
  c,
  scope,
  escs,
  sessions,
  reminded,
  onPatch,
  onEdit,
  onSchedule,
  onRemind,
  onEscalate,
  onOpenEscalation,
}: {
  c: CaseRow;
  scope: MentorScope;
  escs: EscalationRow[];
  sessions: MentoringSession[];
  reminded?: string;
  onPatch: (patch: Partial<CaseRow>, title: string, body?: string) => void;
  onEdit: () => void;
  onSchedule: () => void;
  onRemind: () => void;
  onEscalate: (kind: EscalationKind) => void;
  onOpenEscalation: (id: string) => void;
}) {
  const s = studentById(c.studentId)!;
  const cohort = cohortById(c.cohortId);
  const readiness = paperReadiness(s, c.paper);
  const booking = bookingFor(s, c.paper);
  const nextClass = classesForCohort(c.cohortId)
    .filter((x) => x.start.slice(0, 10) >= TODAY && x.status !== "cancelled" && x.status !== "completed" && x.paper === c.paper)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const nextDoubt = doubtSessions
    .filter((d) => d.cohortId === c.cohortId && d.start.slice(0, 10) >= TODAY)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const failedOn = [...s.papers[c.paper].attempts].reverse().find((a) => a.result === "failed")?.date ?? "2026-01-01";
  const mocks = s.mocks.filter((m) => m.paper === c.paper && m.date > failedOn).sort((a, b) => a.date.localeCompare(b.date));
  const sortedSessions = [...sessions].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 4);
  const facultyName = staffName(c.facultyId);

  const markStep = (index: number) => {
    const steps: Step[] = c.steps.map((x, i) => (i === index ? { ...x, status: "done" } : x));
    if (!steps.some((x) => x.status === "current")) {
      const nextIdx = steps.findIndex((x) => x.status === "upcoming");
      if (nextIdx >= 0) steps[nextIdx] = { ...steps[nextIdx], status: "current" };
    }
    const allDone = steps.every((x) => x.status === "done");
    onPatch(
      { steps, status: allDone ? "completed" : c.status },
      allDone ? "Recovery plan completed" : "Recovery step done",
      `${s.name} · ${c.steps[index].label}`,
    );
  };

  return (
    <Card className="min-w-0">
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <Avatar name={s.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[14px] font-bold text-ink">{s.name}</span>
                <TypePill student={s} />
                <RiskBadge level={s.risk.level} />
              </div>
              <h3 className="mt-1 font-display text-[22px] leading-tight font-bold tracking-[-0.03em] text-ink">
                {c.paper} · {paperName(c.paper)}
              </h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                Failed {c.failedSessionLabel} with <span className="font-mono font-semibold text-rose">{c.score}%</span>, {50 - c.score} marks below the pass mark of 50.
                Reattempt {c.targetLabel}.
              </p>
            </div>
          </div>
          <Field label="Recovery status" className="w-full sm:w-44">
            <Select
              value={c.status}
              onChange={(e) => {
                const next = e.target.value as RecoveryPlan["status"];
                onPatch({ status: next }, `Recovery status: ${CASE_STATUS_LABEL[next]}`, `${s.name} · ${c.paper}`);
              }}
            >
              {(Object.keys(CASE_STATUS_LABEL) as RecoveryPlan["status"][]).map((k) => (
                <option key={k} value={k}>
                  {CASE_STATUS_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="size-4" /> Edit recovery plan
          </Button>
          <Button size="sm" variant="outline" onClick={onSchedule}>
            <CalendarPlus className="size-4" /> Schedule recovery session
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEscalate("academic")}>
            <GraduationCap className="size-4" /> Escalate to faculty
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onEscalate("operational")}>
            <LifeBuoy className="size-4" /> Escalate operational issue
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-[var(--radius-md)] border border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <MiniLabel>Revision cohort</MiniLabel>
              <Users aria-hidden className="size-4 text-ink-3" />
            </div>
            <p className="mt-2 text-[14px] font-bold text-ink">{cohort?.name ?? "Not assigned"}</p>
            <p className="text-[12.5px] text-ink-3">
              {cohort?.schedule} · faculty {facultyName}
            </p>
            <ul className="mt-2.5 space-y-1.5 text-[12.5px] text-ink-2">
              <li>
                <span className="font-semibold text-ink">Next class:</span>{" "}
                {nextClass ? `${formatCalendarDate(nextClass.start.slice(0, 10), "day")}, ${formatTime(nextClass.start)} · ${nextClass.title}` : "Timetable to be published"}
              </li>
              {nextDoubt ? (
                <li>
                  <span className="font-semibold text-ink">Doubt-clearing:</span> {formatCalendarDate(nextDoubt.start.slice(0, 10), "day")},{" "}
                  {formatTime(nextDoubt.start)}
                </li>
              ) : null}
            </ul>
          </div>

          <div className="min-w-0 rounded-[var(--radius-md)] border border-line p-4">
            <div className="flex items-center justify-between gap-2">
              <MiniLabel>Reattempt booking</MiniLabel>
              {booking ? <StatusPill status={booking.status} size="sm" /> : <StatusPill status="not booked" size="sm" />}
            </div>
            <p className="mt-2 text-[14px] font-bold text-ink">
              {c.paper} · {booking?.label ?? c.targetLabel}
            </p>
            {booking ? (
              <p className="text-[12.5px] text-ink-3">
                {booking.entryWindow === "on-demand" ? `On-demand CBE on ${formatAccaDate(booking.date)}` : `${booking.entryWindow.charAt(0).toUpperCase()}${booking.entryWindow.slice(1)} entry`}
                {booking.entryClosesOn && booking.status !== "booked" ? ` · closes ${formatAccaDate(booking.entryClosesOn)}, ${dueLabel(booking.entryClosesOn).toLowerCase().replace("due ", "")}` : ""}
                {` · exam fee ${booking.feeStatus}`}
              </p>
            ) : (
              <p className="text-[12.5px] text-ink-3">No booking recorded yet.</p>
            )}
            {booking?.status !== "booked" ? (
              reminded ? (
                <StatusPill status="sent" size="sm" className="mt-3">
                  {reminded}
                </StatusPill>
              ) : (
                <Button size="xs" variant="outline" className="mt-3" onClick={onRemind}>
                  <Send className="size-3.5" /> Send entry deadline reminder
                </Button>
              )
            ) : (
              <p className="mt-3 text-[12px] text-jade">Booked. Keep the mock target in view.</p>
            )}
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MiniLabel>Mock targets</MiniLabel>
            <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <Target aria-hidden className="size-3.5" /> Target <span className="font-mono font-bold text-ink tnum">{c.mockTarget}%</span> · {c.cadence.toLowerCase()} mentoring check-ins
            </span>
          </div>
          <div className="mt-3 space-y-3">
            <ScoreBar value={readiness} marker={c.mockTarget} label={`${c.paper} readiness score now`} />
            {mocks.map((m) =>
              m.status === "completed" && m.score != null ? (
                <ScoreBar key={m.id} value={m.score} marker={c.mockTarget} label={`${m.title} · ${formatAccaDate(m.date)}`} />
              ) : (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
                  <span className="min-w-0 text-ink-2">
                    {m.title} · {formatAccaDate(m.date)}
                  </span>
                  <StatusPill status={m.status} size="sm">
                    {m.status === "scheduled" ? `Scheduled · target ${c.mockTarget}%` : "Missed"}
                  </StatusPill>
                </div>
              ),
            )}
            {mocks.length === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-ink-3">
                <span>{c.practiceMockOn ? `Practice mock booked for ${formatAccaDate(c.practiceMockOn)}.` : `No ${c.paper} mock sat since the result.`}</span>
                {!c.practiceMockOn ? (
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      onPatch({ practiceMockOn: addDays(TODAY, 12) }, "Practice mock booked", `${s.name} · ${c.paper} · ${formatAccaDate(addDays(TODAY, 12))}`)
                    }
                  >
                    <BookOpenCheck className="size-3.5" /> Book practice mock
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="min-w-0 rounded-[var(--radius-md)] border border-line p-4">
            <MiniLabel>Recovery steps</MiniLabel>
            <ol className="mt-2.5 space-y-2.5">
              {c.steps.map((step, i) => (
                <li key={step.label} className="flex items-start gap-2.5">
                  <span
                    aria-hidden
                    className={cn(
                      "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full",
                      step.status === "done" ? "bg-jade text-on-accent" : step.status === "current" ? "bg-cta text-cta-ink" : "border border-line-strong bg-surface text-ink-3",
                    )}
                  >
                    {step.status === "done" ? <Check className="size-3" strokeWidth={3} /> : step.status === "current" ? <CircleDot className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[13px] font-semibold", step.status === "done" ? "text-ink-3" : "text-ink")}>{step.label}</p>
                    <p className="text-[11.5px] text-ink-3">
                      {step.status === "done" ? "Done" : step.status === "current" ? "In progress" : "Upcoming"} · by {formatAccaDate(step.due)}
                    </p>
                  </div>
                  {step.status !== "done" ? (
                    <Button size="xs" variant={step.status === "current" ? "outline" : "ghost"} onClick={() => markStep(i)}>
                      Mark done
                    </Button>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>

          <div className="min-w-0 space-y-3">
            <div className="rounded-[var(--radius-md)] border border-line p-4">
              <MiniLabel>Weak syllabus areas</MiniLabel>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {c.weakAreas.map((a) => (
                  <span key={a} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">
                    {a}
                  </span>
                ))}
              </div>
              {c.remedialRequested ? (
                <p className="mt-3 text-[12px] font-semibold text-jade">Remedial set requested from {facultyName}</p>
              ) : (
                <Button
                  size="xs"
                  variant="ghost"
                  className="mt-2.5"
                  onClick={() => onPatch({ remedialRequested: true }, `Remedial set requested from ${facultyName}`, `${s.name} · ${c.weakAreas.join(", ")}`)}
                >
                  <MessageSquarePlus className="size-3.5" /> Request remedial set from faculty
                </Button>
              )}
            </div>

            <div className="rounded-[var(--radius-md)] border border-line p-4">
              <div className="flex items-center justify-between gap-2">
                <MiniLabel>Recovery sessions</MiniLabel>
                <Button size="xs" variant="ghost" onClick={onSchedule} aria-label="Schedule recovery session">
                  <CalendarPlus className="size-3.5" /> Add
                </Button>
              </div>
              <ul className="mt-2 space-y-1.5">
                {sortedSessions.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="min-w-0 truncate text-ink-2">
                      {formatCalendarDate(m.start.slice(0, 10), "day")}, {formatTime(m.start)} · {m.mode}
                    </span>
                    <StatusPill status={m.status} size="sm" />
                  </li>
                ))}
                {sortedSessions.length === 0 ? <li className="text-[12.5px] text-ink-3">No mentoring sessions yet.</li> : null}
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-line p-4">
          <MiniLabel>Escalations for this learner</MiniLabel>
          <ul className="mt-2 divide-y divide-line">
            {escs.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onOpenEscalation(e.id)} className="flex w-full flex-wrap items-center justify-between gap-2 py-2 text-left hover:bg-cta-soft">
                  <span className="min-w-0 text-[13px]">
                    <span className="font-semibold text-ink">{e.subject}</span>
                    <span className="block text-[12px] text-ink-3">
                      {e.kind === "academic" ? "Academic" : "Operational"} · to {staffName(e.toId)} · {formatAccaDate(e.raisedOn)}
                    </span>
                  </span>
                  <StatusPill status={e.status} size="sm" />
                </button>
              </li>
            ))}
            {escs.length === 0 ? <li className="py-2 text-[12.5px] text-ink-3">None raised.</li> : null}
          </ul>
        </div>
        {scope.placement ? <p className="text-[12px] text-ink-3">Mentor for this learner: {staffName(s.mentorId)}.</p> : null}
      </div>
    </Card>
  );
}

function EditCaseDrawer({ row, onClose, onSave }: { row: CaseRow | null; onClose: () => void; onSave: (id: string, patch: Partial<CaseRow>) => void }) {
  const s = row ? studentById(row.studentId) : undefined;
  const paper = row ? paperByCode(row.paper) : undefined;
  return (
    <FormDrawer
      open={row != null}
      onClose={onClose}
      title="Edit recovery plan"
      sub={row && s ? `${s.name} · ${row.paper} ${row.score}% in ${row.failedSessionLabel}` : undefined}
      submitLabel="Save recovery plan"
      footerNote="Shared with faculty and the learner"
      onSubmit={(data) => {
        if (!row || !paper) return;
        const cohortId = String(data.get("cohort"));
        const weakAreas = data.getAll("area").map(String);
        const patch: Partial<CaseRow> = {
          cohortId,
          mockTarget: Number(data.get("target")),
          cadence: String(data.get("cadence")),
          weakAreas: weakAreas.length ? weakAreas : row.weakAreas,
        };
        if (paper.examFormat === "session") {
          const sessionId = String(data.get("session"));
          const session = examSessions.find((x) => x.id === sessionId);
          patch.targetSessionId = session?.id;
          patch.targetLabel = session?.label ?? row.targetLabel;
        } else {
          const date = String(data.get("date"));
          if (date) patch.targetLabel = `${formatAccaDate(date)} (on-demand)`;
        }
        onSave(row.id, patch);
        onClose();
      }}
    >
      {row && s && paper ? (
        <>
          <Field label="Revision or reattempt cohort">
            <Select name="cohort" defaultValue={row.cohortId}>
              {cohorts
                .filter((co) => co.id === row.cohortId || (co.papers.includes(row.paper) && (co.type === "revision" || co.type === "reattempt")))
                .map((co) => (
                  <option key={co.id} value={co.id}>
                    {co.name} · {co.schedule}
                  </option>
                ))}
            </Select>
          </Field>
          {paper.examFormat === "session" ? (
            <Field label="Reattempt session" hint={`${row.paper} is a session CBE`}>
              <Select name="session" defaultValue={row.targetSessionId}>
                {examSessions
                  .filter((x) => !x.past && x.status !== "results-pending")
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label} · {x.statusLabel}
                    </option>
                  ))}
              </Select>
            </Field>
          ) : (
            <Field label="Reattempt date" hint={`${row.paper} is an on-demand CBE`}>
              <Input type="date" name="date" min={TODAY} defaultValue={bookingFor(s, row.paper)?.date ?? addDays(TODAY, 30)} />
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Mock target" hint="Pass mark is 50">
              <Select name="target" defaultValue={String(row.mockTarget)}>
                {[50, 55, 60, 65, 70].map((v) => (
                  <option key={v} value={v}>
                    {v}%
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mentoring check-ins">
              <Select name="cadence" defaultValue={row.cadence}>
                <option>Weekly</option>
                <option>Fortnightly</option>
                <option>Monthly</option>
              </Select>
            </Field>
          </div>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Weak syllabus areas</legend>
            <div className="space-y-2">
              {paper.syllabusAreas.map((a) => {
                const value = `${a.code} ${a.title}`;
                return (
                  <Checkbox
                    key={a.code}
                    name="area"
                    value={value}
                    defaultChecked={row.weakAreas.includes(value)}
                    label={
                      <span className="text-[13px] text-ink">
                        <span className="font-mono font-semibold">{a.code}</span> {a.title}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </fieldset>
        </>
      ) : null}
    </FormDrawer>
  );
}

/* ================================================================== escalations */

function EscalationsTab({
  kind,
  scope,
  rows,
  raisedIds,
  onRaise,
  onOpen,
}: {
  kind: EscalationKind;
  scope: MentorScope;
  rows: EscalationRow[];
  raisedIds: string[];
  onRaise: () => void;
  onOpen: (e: EscalationRow) => void;
}) {
  const academic = kind === "academic";
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const visible = rows.filter((e) => (!status || e.status === status) && (!priority || e.priority === priority));

  const columns: DataTableColumn<EscalationRow>[] = [
    {
      key: "subject",
      header: "Escalation",
      wrap: true,
      sortable: true,
      render: (e) => (
        <span className="block max-w-[20rem]">
          <span className="block text-[13.5px] font-semibold text-ink">{e.subject}</span>
          <span className="line-clamp-2 block text-[12.5px] text-ink-3">{e.detail}</span>
          <span className="mt-1 block text-[11.5px] font-semibold text-ink-2">{e.category}</span>
        </span>
      ),
    },
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (e) => studentById(e.studentId)?.name ?? "",
      render: (e) => <StudentCell student={studentById(e.studentId)!} sub={studentById(e.studentId)?.currentPaper ? `Current ${studentById(e.studentId)?.currentPaper}` : undefined} />,
    },
    {
      key: "to",
      header: academic ? "Faculty" : "Programme team",
      sortable: true,
      sortValue: (e) => staffName(e.toId),
      render: (e) => (
        <span className="block">
          <span className="block font-semibold text-ink">{staffName(e.toId)}</span>
          <span className="block max-w-[12rem] truncate text-[11.5px] text-ink-3">{staffById(e.toId)?.title}</span>
        </span>
      ),
    },
    {
      key: "priority",
      header: "Urgency",
      sortable: true,
      sortValue: (e) => ["low", "medium", "high", "urgent"].indexOf(e.priority),
      render: (e) => (
        <StatusPill status={e.priority} tone={PRIORITY_TONE[e.priority]} size="sm">
          {e.priority.charAt(0).toUpperCase() + e.priority.slice(1)}
        </StatusPill>
      ),
    },
    {
      key: "raisedOn",
      header: "Raised",
      sortable: true,
      render: (e) => (
        <span className="block whitespace-nowrap">
          <span className="block text-ink">{formatAccaDate(e.raisedOn)}</span>
          <span className="block text-[11.5px] text-ink-3">{ago(e.raisedOn)}</span>
        </span>
      ),
    },
    {
      key: "response",
      header: "Response",
      render: (e) => {
        const r = responseState(e);
        return (
          <StatusPill status={r.label} tone={r.tone} size="sm">
            {r.label}
          </StatusPill>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (e) => (
        <StatusPill status={e.status} size="sm">
          {ESC_STATUS_LABEL[e.status]}
        </StatusPill>
      ),
    },
    { key: "ticketId", header: "Ticket", mono: true, render: (e) => e.ticketId ?? "Not a ticket" },
  ];

  return (
    <section className="space-y-5">
      <SectionIntro
        title={academic ? "Escalate academic issues" : "Escalate operational issues"}
        sub={
          academic
            ? "To faculty for the paper: exam readiness decisions, concept gaps, remedial learning and reattempt requests."
            : "To the Programme Admin team as a support ticket: ACCA registration, exemptions, exam bookings, fees, batches and university records."
        }
        action={
          <Button variant="secondary" onClick={onRaise}>
            {academic ? <GraduationCap className="size-4" /> : <LifeBuoy className="size-4" />}
            {academic ? "Escalate academic issue" : "Escalate operational issue"}
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <DataTable
          className="min-w-0"
          caption={academic ? "Academic escalations" : "Operational escalations"}
          rows={visible}
          columns={columns}
          getRowId={(e) => e.id}
          initialSort={{ key: "raisedOn", dir: "desc" }}
          search={{
            placeholder: "Search subject or student",
            match: (e, q) => e.subject.toLowerCase().includes(q) || (studentById(e.studentId)?.name ?? "").toLowerCase().includes(q),
          }}
          filters={
            <FilterBar
              active={Boolean(status || priority)}
              onClear={() => {
                setStatus("");
                setPriority("");
              }}
            >
              <FilterSelect
                label="Status"
                allLabel="All"
                value={status}
                onChange={setStatus}
                options={(Object.keys(ESC_STATUS_LABEL) as Escalation["status"][]).map((k) => ({ value: k, label: ESC_STATUS_LABEL[k] }))}
              />
              <FilterSelect
                label="Urgency"
                allLabel="Any"
                value={priority}
                onChange={setPriority}
                options={[
                  { value: "urgent", label: "Urgent" },
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
            </FilterBar>
          }
          onRowClick={onOpen}
          rowLabel={(e) => `Open escalation: ${e.subject}`}
          rowClassName={(e) => (raisedIds.includes(e.id) ? "bg-cta-soft" : undefined)}
          empty={
            <p className="text-center text-[13px] text-ink-3">
              No {academic ? "academic" : "operational"} escalations for {scope.placement ? "these learners" : "your students"}.
            </p>
          }
        />

        <Card className="min-w-0 self-start">
          <CardHeader title={academic ? "Who handles academic issues" : "Where operational issues go"} sub={academic ? "Faculty by paper" : "Routed by category"} />
          <ul className="divide-y divide-line border-t border-line">
            {academic
              ? facultyStaff.map((f) => (
                  <li key={f.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-[12.5px]">
                    <span className="min-w-0 truncate font-semibold text-ink">{f.name}</span>
                    <span className="shrink-0 font-mono text-ink-2">{f.focusPapers.join(", ")}</span>
                  </li>
                ))
              : OPERATIONAL_ROUTES.map((r) => (
                  <li key={r.category} className="px-4 py-2.5 text-[12.5px]">
                    <span className="block font-semibold text-ink">{r.category}</span>
                    <span className="block text-ink-3">{staffName(r.ownerId)}</span>
                  </li>
                ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-[12px] leading-snug text-ink-3">
            Response times follow the support SLA: urgent {SLA_HOURS.urgent}h, high {SLA_HOURS.high}h, medium {SLA_HOURS.medium}h, low {SLA_HOURS.low}h.
          </p>
        </Card>
      </div>
    </section>
  );
}

function EscalationDetail({
  row,
  onClose,
  onUpdate,
  onChase,
  onStatus,
}: {
  row: EscalationRow | null;
  onClose: () => void;
  onUpdate: (e: EscalationRow, body: string) => void;
  onChase: (e: EscalationRow) => void;
  onStatus: (e: EscalationRow, status: Escalation["status"]) => void;
}) {
  const [draft, setDraft] = useState("");
  const s = row ? studentById(row.studentId) : undefined;
  const response = row ? responseState(row) : null;
  return (
    <Drawer
      open={row != null}
      onClose={() => {
        setDraft("");
        onClose();
      }}
      width="w-full max-w-lg"
      title={row?.subject ?? "Escalation"}
      sub={row && s ? `${s.name} · ${row.kind === "academic" ? "Academic" : "Operational"} · ${row.category}` : undefined}
      footer={
        row ? (
          <>
            {row.status !== "resolved" ? (
              <>
                <Button type="button" variant="ghost" onClick={() => onChase(row)}>
                  <BellRing className="size-4" /> Chase
                </Button>
                <Button type="button" onClick={() => onStatus(row, "resolved")}>
                  <Check className="size-4" /> Mark resolved
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={() => onStatus(row, "open")}>
                <RotateCcw className="size-4" /> Reopen
              </Button>
            )}
          </>
        ) : null
      }
    >
      {row && s && response ? (
        <div className="space-y-5 p-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={row.status}>{ESC_STATUS_LABEL[row.status]}</StatusPill>
            <StatusPill status={row.priority} tone={PRIORITY_TONE[row.priority]}>
              {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)} urgency
            </StatusPill>
            <StatusPill status={response.label} tone={response.tone}>
              {response.label}
            </StatusPill>
          </div>
          <dl className="grid grid-cols-2 gap-2">
            {[
              { label: "Escalated to", value: staffName(row.toId) },
              { label: "Raised", value: `${formatAccaDate(row.raisedOn)} by ${staffName(row.raisedBy)}` },
              { label: "Student", value: `${s.name}${s.currentPaper ? ` · ${s.currentPaper}` : ""}` },
              { label: "Support ticket", value: row.ticketId ?? "Not a ticket" },
            ].map((k) => (
              <div key={k.label} className="min-w-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2.5">
                <dt className="text-[11.5px] text-ink-3">{k.label}</dt>
                <dd className="mt-0.5 text-[13px] font-semibold break-words text-ink">{k.value}</dd>
              </div>
            ))}
          </dl>
          <div>
            <MiniLabel className="mb-1.5">What is happening</MiniLabel>
            <p className="text-[13.5px] leading-relaxed text-ink">{row.detail}</p>
          </div>
          <div>
            <MiniLabel className="mb-3">History</MiniLabel>
            <Timeline
              dense
              items={(row.updates ?? []).map((u, i) => ({
                id: `${row.id}-${i}`,
                title: u.body,
                meta: formatAccaDate(u.at),
                tone: u.body.startsWith("Resolved") || u.body.startsWith("Marked resolved") ? "jade" : u.body.startsWith("Chased") ? "amber" : "info",
              }))}
            />
          </div>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              onUpdate(row, draft.trim());
              setDraft("");
            }}
          >
            <Field label="Add an update">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} placeholder="What changed since this was raised?" />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm" variant="secondary" disabled={!draft.trim()}>
                Add update
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </Drawer>
  );
}
