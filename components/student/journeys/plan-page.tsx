"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  CircleAlert,
  Clock,
  Flag,
  GraduationCap,
  ListChecks,
  Plus,
  Save,
  Send,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react";
import {
  EXAMS_TO_QUALIFY,
  STRATEGIC_OPTIONS,
  attemptHistory,
  formatShortDate,
  paperName,
  staffName,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FormDrawer } from "@/components/ui/form-drawer";
import { FileDrop } from "@/components/ui/file-drop";
import { Checkbox, Field, Input, Select, Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";
import {
  NEXT_SESSION,
  PAST_SESSIONS,
  PAST_SESSION_DATES,
  buildPlan,
  clashesBetween,
  hoursFor,
  selectionCandidates,
  sessionIndex,
  type PlanAttempt,
} from "./plan-model";

const SELECTABLE_PAPERS: PaperCode[] = ["LW", "PM", "TX", "FR", "AA", "FM", "SBR", "SBL", "AFM", "APM", "ATX", "AAA"];

export function PlanPage() {
  const student = useStudentRecord();
  return (
    <StudentTypeGate type="graduate" eyebrow="Your plan" title="Completion plan">
      <PlanView key={student.id} student={student} />
    </StudentTypeGate>
  );
}

export function PlanView({ student }: { student: Student }) {
  const [attempts, setAttempts] = useState<PlanAttempt[]>(() =>
    attemptHistory(student)
      .filter((a) => a.score !== null && (a.result === "passed" || a.result === "failed"))
      .map((a, i) => ({
        id: `att-${i}`,
        paper: a.paper,
        session: a.label,
        date: a.date,
        score: a.score ?? 0,
        result: a.result as "passed" | "failed",
        source: "acca-record" as const,
      })),
  );
  const [selection, setSelection] = useState<PaperCode[]>(() =>
    (Object.values(student.papers) as Student["papers"][PaperCode][]).filter((p) => p.plannedSessionId === NEXT_SESSION.id).map((p) => p.code),
  );
  const [savedSelection, setSavedSelection] = useState<PaperCode[]>(selection);
  const [options, setOptions] = useState<PaperCode[]>(["AAA", "APM"]);
  const [fastTrack, setFastTrack] = useState(false);
  const [recording, setRecording] = useState(false);
  const [evidence, setEvidence] = useState<string[]>([]);

  const plan = useMemo(() => buildPlan({ student, attempts, selection, options, fastTrack }), [student, attempts, selection, options, fastTrack]);
  const normalPlan = useMemo(() => buildPlan({ student, attempts, selection, options, fastTrack: false }), [student, attempts, selection, options]);
  const fastPlan = useMemo(() => buildPlan({ student, attempts, selection, options, fastTrack: true }), [student, attempts, selection, options]);
  const candidates = useMemo(() => selectionCandidates(student, attempts), [student, attempts]);
  const chosen = candidates.filter((c) => selection.includes(c.code));
  const clashes = clashesBetween(chosen);
  const selectionHours = chosen.reduce((s, c) => s + hoursFor(c.code, c.reattempt), 0);
  const dirty = [...selection].sort().join() !== [...savedSelection].sort().join();

  const cleared = plan.cleared.size;
  const lastLabel = plan.lastExam?.label ?? "Complete";
  const membership = plan.lastExam && sessionIndex(plan.lastExam.label) > sessionIndex(plan.perDoneLabel) ? plan.lastExam.label : plan.perDoneLabel;
  const savedSessions = normalPlan.rows.length - fastPlan.rows.length;
  const mentor = staffName(student.mentorId);
  const exempt = (Object.values(student.papers) as Student["papers"][PaperCode][]).filter((p) => p.status === "exempt").map((p) => p.code);

  const toggleSelection = (code: PaperCode, on: boolean) => {
    setSelection((s) => {
      if (on && s.length >= 4) {
        toast({ title: "ACCA allows up to four exams in one session", tone: "warning" });
        return s;
      }
      return on ? [...s, code] : s.filter((x) => x !== code);
    });
  };

  const attemptColumns: DataTableColumn<PlanAttempt>[] = [
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      render: (a) => (
        <span className="min-w-0">
          <span className="block font-mono font-semibold text-ink">{a.paper}</span>
          <span className="block text-[12px] text-ink-3">{paperName(a.paper)}</span>
        </span>
      ),
    },
    { key: "session", header: "Session", sortable: true, sortValue: (a) => a.date },
    { key: "score", header: "Score", align: "right", mono: true, sortable: true, render: (a) => `${a.score}%` },
    { key: "result", header: "Result", sortable: true, render: (a) => <StatusPill status={a.result} /> },
    {
      key: "source",
      header: "Source",
      render: (a) => (a.source === "you" ? <StatusPill status="Recorded by you" tone="cta" dot={false} /> : <span className="text-ink-2">ACCA results record</span>),
    },
    { key: "effect", header: "Effect on plan", wrap: true, className: "min-w-44 text-ink-2", render: (a) => (a.result === "passed" ? "Cleared, removed from plan" : plan.cleared.has(a.paper) ? "Later passed" : "Reattempt scheduled") },
  ];

  const recordAttempt = (data: FormData) => {
    const paper = String(data.get("paper")) as PaperCode;
    const session = String(data.get("session"));
    const score = Math.max(0, Math.min(100, Math.round(Number(data.get("score")))));
    const result = score >= 50 ? "passed" : "failed";
    const next: PlanAttempt[] = [
      ...attempts,
      { id: `you-${attempts.length + 1}`, paper, session, date: PAST_SESSION_DATES[session] ?? "2026-06-01", score, result, source: "you" },
    ];
    const before = plan.lastExam?.label;
    const after = buildPlan({ student, attempts: next, selection, options, fastTrack }).lastExam?.label ?? "complete";
    setAttempts(next);
    toast({
      title: `Attempt recorded: ${paper} ${session} · ${score}%`,
      body:
        result === "passed"
          ? `${paper} is cleared and removed from your plan. Last exam session ${before === after ? `stays ${after}` : `moves from ${before} to ${after}`}.`
          : `Below the 50% pass mark. ${paper} is marked as a reattempt with 8 hours a week of revision.`,
    });
    setRecording(false);
    setEvidence([]);
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your plan"
        title="Completion plan"
        sub="Your personal ACCA completion plan: the papers left, the exam session for each, and what changes when you speed up, pick papers or record an earlier attempt."
        badge={<ScopeChip icon={<Flag />}>Exams complete {lastLabel}</ScopeChip>}
        actions={
          <>
            <Button variant="outline" onClick={() => toast({ title: `Plan shared with ${mentor}`, body: `${plan.remaining} exams across ${plan.rows.length} sessions, last in ${lastLabel}.`, tone: "info" })}>
              <Send aria-hidden className="size-4" />
              Share with mentor
            </Button>
            <Button onClick={() => setRecording(true)}>
              <Plus aria-hidden className="size-4" />
              Record a previous attempt
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Exams cleared" value={`${cleared} of ${EXAMS_TO_QUALIFY}`} icon={<ShieldCheck />} sub={`${exempt.length} exempt, ${cleared - exempt.length} passed`} />
        <KpiTile label="Exams left" value={plan.remaining} tone="info" icon={<ListChecks />} sub={`${plan.failed.size} ${plan.failed.size === 1 ? "reattempt" : "reattempts"} included`} />
        <KpiTile label="Last exam session" value={lastLabel} tone={fastTrack ? "cta" : "neutral"} icon={<CalendarClock />} sub={fastTrack ? "Fast-track journey on" : "One paper per session after Dec 2026"} />
        <KpiTile label="ACCA membership" value={membership} tone="jade" icon={<GraduationCap />} sub={`EPSM ${student.epsm.status === "complete" ? "complete" : "to do"} · PER ${student.per.months} of 36 months`} />
      </KpiRow>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4.5">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">Personal ACCA completion plan</h2>
            <p className="mt-1 text-[13px] text-ink-3">
              Timeline of exam sessions to qualification. {plan.rows.length} sessions, {plan.remaining} exams, peak {plan.peakHours} study hours a week.
            </p>
          </div>
          <div className={cn("w-full rounded-[var(--radius-md)] border px-4 py-3 sm:w-80", fastTrack ? "border-cta bg-cta-soft" : "border-line bg-surface-2")}>
            <Switch
              checked={fastTrack}
              onChange={(v) => {
                setFastTrack(v);
                toast({
                  title: v ? "Fast-track journey on" : "Fast-track journey off",
                  body: v ? `Two papers per session. Exams complete ${fastPlan.lastExam?.label ?? "sooner"} instead of ${normalPlan.lastExam?.label}.` : `One paper per session. Exams complete ${normalPlan.lastExam?.label}.`,
                  tone: v ? "warning" : "info",
                });
              }}
              label={
                <span className="inline-flex items-center gap-1.5">
                  <Zap aria-hidden className="size-4" />
                  Fast-track journey
                </span>
              }
              sub={savedSessions > 0 ? `Two papers per session saves ${savedSessions} ${savedSessions === 1 ? "session" : "sessions"} (${savedSessions * 3} months)` : "Two papers per session after Dec 2026"}
            />
          </div>
        </div>

        {fastTrack ? (
          <div role="status" className="flex items-start gap-3 border-b border-line bg-amber-soft px-5 py-3.5">
            <TriangleAlert aria-hidden className="mt-0.5 size-4.5 shrink-0 text-amber" />
            <div className="min-w-0 text-[13px] leading-relaxed text-ink">
              <p className="font-semibold">Workload warning: up to {fastPlan.peakHours} study hours a week alongside your job.</p>
              <p className="text-ink-2">
                You work full time at {student.background.occupation?.split(", ")[1] ?? "your employer"} and your PM readiness is {student.readiness.byPaper.PM ?? student.readiness.overall}. Two papers per session suits learners who can protect about 20 hours a week. Exams would finish {fastPlan.lastExam?.label}, but ACCA membership still waits for PER ({plan.perDoneLabel}).
              </p>
            </div>
          </div>
        ) : null}

        <ol className="divide-y divide-line">
          <li className="grid gap-3 px-5 py-4 md:grid-cols-[11rem_minmax(0,1fr)_10rem] md:items-center">
            <div>
              <p className="text-[14px] font-bold text-ink">Completed</p>
              <p className="text-[12px] text-ink-3">Exemptions, passes and EPSM</p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-1.5">
              {exempt.map((c) => (
                <StatusPill key={c} status="exempt" size="sm">
                  {c} exempt
                </StatusPill>
              ))}
              {attempts
                .filter((a) => a.result === "passed")
                .map((a) => (
                  <StatusPill key={a.id} status="passed" size="sm">
                    {a.paper} passed {a.session} · {a.score}%
                  </StatusPill>
                ))}
              {student.epsm.status === "complete" ? (
                <StatusPill status="complete" size="sm">
                  EPSM complete
                </StatusPill>
              ) : null}
            </div>
            <p className="text-[12.5px] text-ink-3 md:text-right">
              <Check aria-hidden className="mr-1 inline size-3.5 text-jade" />
              {cleared} exams cleared
            </p>
          </li>

          {plan.rows.map((row, idx) => (
            <li key={row.session.id} className={cn("grid gap-3 px-5 py-4 md:grid-cols-[11rem_minmax(0,1fr)_10rem] md:items-center", idx === 0 && "bg-cta-soft/60")}>
              <div className="flex items-center gap-3 md:block">
                <p className="font-display text-[18px] leading-tight font-bold tracking-[-0.02em] text-ink">{row.session.label}</p>
                <p className="text-[12px] text-ink-3">{row.session.dates}</p>
                {idx === 0 ? <p className="mt-1 hidden text-[11.5px] font-semibold text-ink md:block">Next session</p> : null}
              </div>
              <div className="flex min-w-0 flex-wrap gap-2">
                {row.papers.map((p) => (
                  <span key={p.code} className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface px-2.5 py-1.5">
                    <span className="font-mono text-[13px] font-bold text-ink">{p.code}</span>
                    <span className="truncate text-[12.5px] text-ink-2">{paperName(p.code)}</span>
                    {p.reattempt ? (
                      <StatusPill status="reattempt" size="sm" dot={false}>
                        Reattempt
                      </StatusPill>
                    ) : p.booked ? (
                      <StatusPill status="booked" size="sm" dot={false}>
                        Booked
                      </StatusPill>
                    ) : null}
                  </span>
                ))}
              </div>
              <div className="min-w-0 md:text-right">
                <p className={cn("font-mono text-[13px] font-semibold tnum", row.hours > 20 ? "text-rose" : row.hours > 16 ? "text-amber" : "text-ink")}>{row.hours} h a week</p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3 md:ml-auto md:w-28" aria-hidden>
                  <div className={cn("h-full rounded-full", row.hours > 20 ? "bg-rose" : row.hours > 16 ? "bg-amber" : "bg-jade")} style={{ width: `${Math.min(100, (row.hours / 24) * 100)}%` }} />
                </div>
              </div>
            </li>
          ))}

          <li className="grid gap-3 bg-surface-inv px-5 py-4 text-ink-inv md:grid-cols-[11rem_minmax(0,1fr)_10rem] md:items-center">
            <p className="font-display text-[18px] leading-tight font-bold tracking-[-0.02em] text-cta">{membership}</p>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-ink-inv">ACCA membership application</p>
              <p className="text-[12.5px] text-ink-inv/70">
                After all 13 exams, EPSM and PER: 36 months of experience ({student.per.months} logged, {plan.perMonthsLeft} to go) and 9 performance objectives ({student.per.objectives.length} achieved).
              </p>
            </div>
            <p className="text-[12.5px] text-ink-inv/70 md:text-right">{sessionIndex(plan.perDoneLabel) >= sessionIndex(lastLabel === "Complete" ? plan.perDoneLabel : lastLabel) ? "PER sets the date" : "Last exam sets the date"}</p>
          </li>
        </ol>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <Card className="min-w-0">
          <CardHeader
            title={`Paper selection · ${NEXT_SESSION.label}`}
            sub="Choose the papers you will sit in the next session. Class clashes and weekly hours update as you choose."
            action={
              <Button
                size="sm"
                disabled={!dirty}
                onClick={() => {
                  setSavedSelection(selection);
                  toast({
                    title: `${NEXT_SESSION.label} paper selection saved`,
                    body: selection.length ? `${selection.join(", ")} · early entry closes 5 Oct 2026` : "No papers this session. Your plan moves them to later sessions.",
                  });
                }}
              >
                <Save aria-hidden className="size-4" />
                {dirty ? "Save selection" : "Saved"}
              </Button>
            }
          />
          <div className="grid gap-3 px-5 pb-4 sm:grid-cols-2">
            {candidates.map((c) => {
              const on = selection.includes(c.code);
              const inClash = clashes.some((x) => x.a === c.code || x.b === c.code) && on;
              return (
                <label
                  key={c.code}
                  className={cn(
                    "flex min-w-0 cursor-pointer gap-3 rounded-[var(--radius-md)] border p-3.5 transition-colors",
                    on ? "border-ink bg-cta-soft" : "border-line bg-surface hover:border-line-strong",
                    inClash && "border-rose",
                  )}
                >
                  <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--nav-active)]" checked={on} onChange={(e) => toggleSelection(c.code, e.target.checked)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[14px] font-bold text-ink">{c.code}</span>
                      <span className="truncate text-[13px] font-semibold text-ink">{paperName(c.code)}</span>
                    </span>
                    <span className="mt-1 block text-[12.5px] text-ink-2">{c.cohort.name}</span>
                    <span className="block text-[12px] text-ink-3">
                      {c.schedule} · {hoursFor(c.code, c.reattempt)} h a week
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {c.enrolled ? (
                        <StatusPill status="enrolled" size="sm">
                          In your cohorts
                        </StatusPill>
                      ) : (
                        <StatusPill status="upcoming" tone={c.weeksMissed > 6 ? "amber" : "info"} size="sm">
                          Cohort started {formatShortDate(c.cohort.startDate)} · {c.weeksMissed} weeks to catch up
                        </StatusPill>
                      )}
                      {c.reattempt ? (
                        <StatusPill status="reattempt" size="sm">
                          Reattempt
                        </StatusPill>
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className="space-y-2 border-t border-line px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="text-ink-2">
                {selection.length} {selection.length === 1 ? "paper" : "papers"} selected for {NEXT_SESSION.label}
              </span>
              <span className={cn("font-mono font-semibold tnum", selectionHours > 20 ? "text-rose" : selectionHours > 16 ? "text-amber" : "text-ink")}>{selectionHours} h a week</span>
            </div>
            {clashes.length ? (
              clashes.map((x) => (
                <p key={`${x.a}-${x.b}`} className="flex items-start gap-2 rounded-[var(--radius-md)] bg-rose-soft px-3 py-2 text-[12.5px] text-rose">
                  <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  Class clash: {x.a} and {x.b} overlap on {x.days.join(" and ")}. Pick another batch on Batches &amp; cohorts or sit one paper later.
                </p>
              ))
            ) : selection.length > 1 ? (
              <p className="flex items-center gap-2 text-[12.5px] text-jade">
                <Check aria-hidden className="size-3.5" strokeWidth={3} />
                No class clashes between your chosen papers
              </p>
            ) : null}
            {selectionHours > 20 ? (
              <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-amber-soft px-3 py-2 text-[12.5px] text-amber">
                <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                More than 20 study hours a week. Talk to {mentor} before booking.
              </p>
            ) : null}
          </div>
          <div className="border-t border-line px-5 py-4">
            <MicroLabel>Strategic Professional options · choose two</MicroLabel>
            <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
              {STRATEGIC_OPTIONS.map((code) => (
                <Checkbox
                  key={code}
                  checked={options.includes(code)}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setOptions((o) => {
                      if (on && o.length >= 2) return [o[1], code];
                      return on ? [...o, code] : o.filter((x) => x !== code);
                    });
                  }}
                  label={`${code} · ${paperName(code)}`}
                />
              ))}
            </div>
            {options.length < 2 ? <p className="mt-2 text-[12.5px] text-amber">Choose {2 - options.length} more to complete the plan.</p> : null}
          </div>
        </Card>

        <Card className="min-w-0 p-5">
          <MicroLabel>How the plan is built</MicroLabel>
          <ul className="mt-3 space-y-3 text-[13px] leading-relaxed text-ink-2">
            <li className="flex gap-2.5">
              <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
              Applied Skills first, then SBR, SBL and your two options, one paper per session unless the fast-track journey is on.
            </li>
            <li className="flex gap-2.5">
              <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
              PM, TX, FR, AA, FM, SBL, SBR and options are session exams in March, June, September and December.
            </li>
            <li className="flex gap-2.5">
              <ListChecks aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
              Study time: 10 hours a week per Applied Skills paper or option, 12 for SBL and SBR, 8 for a reattempt.
            </li>
            <li className="flex gap-2.5">
              <GraduationCap aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
              Membership needs the 13 exams, EPSM and PER. PER needs 36 months and 9 performance objectives.
            </li>
          </ul>
          {plan.unscheduled.length ? (
            <p className="mt-4 rounded-[var(--radius-md)] bg-amber-soft px-3 py-2 text-[12.5px] text-amber">
              {plan.unscheduled.join(", ")} fall beyond Mar 2029 and are not shown.
            </p>
          ) : null}
        </Card>
      </div>

      <section aria-labelledby="attempts-title" className="space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="attempts-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              Previous-attempt recording
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Attempts from your ACCA record, plus any earlier attempts you record. A pass clears the paper; a fail adds a reattempt.</p>
          </div>
          <Button variant="secondary" onClick={() => setRecording(true)}>
            <Plus aria-hidden className="size-4" />
            Record a previous attempt
          </Button>
        </div>
        <DataTable caption="Attempt history used by your plan" rows={attempts} columns={attemptColumns} getRowId={(a) => a.id} dense initialSort={{ key: "session", dir: "desc" }} />
      </section>

      <FormDrawer
        open={recording}
        onClose={() => {
          setRecording(false);
          setEvidence([]);
        }}
        title="Record a previous attempt"
        sub="Add an ACCA exam you sat before joining, or one missing from your record. Your plan updates straight away."
        submitLabel="Record attempt"
        footerNote={evidence.length ? `${evidence.length} file attached` : "The programme team checks it against your ACCA record."}
        onSubmit={recordAttempt}
      >
        <Field label="Paper">
          <Select name="paper" defaultValue="AA">
            {SELECTABLE_PAPERS.filter((p) => !exempt.includes(p)).map((p) => (
              <option key={p} value={p}>
                {p} · {paperName(p)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exam session">
            <Select name="session" defaultValue="Dec 2025">
              {PAST_SESSIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="Score (%)" hint="Pass mark 50">
            <Input name="score" type="number" min={0} max={100} required placeholder="e.g. 44" className="font-mono" />
          </Field>
        </div>
        <FileDrop label="Attach the ACCA result statement" accept=".pdf,.png,.jpg" hint="Optional. A screenshot of your ACCA exam status is fine." onFiles={(all) => setEvidence(all)} />
        <p className="text-[12.5px] leading-relaxed text-ink-3">
          Recording FR, PM or another paper already in your plan changes it: a pass removes it and moves later papers forward; a fail keeps it as a reattempt.
        </p>
      </FormDrawer>
    </div>
  );
}
