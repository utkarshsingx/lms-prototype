"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, CalendarClock, CalendarPlus, Check, Clock, MapPin, RotateCcw, Send, Users, Video } from "lucide-react";
import {
  COHORT_TYPE_LABELS,
  classesForStudent,
  cohortById,
  doubtSessions,
  examSessionById,
  formatAccaDate,
  formatDateTime,
  formatShortDate,
  paperName,
  recoveryPlans,
  selectableCohorts,
  staffName,
  type Cohort,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Select, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Timeline } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";

type Request = {
  id: string;
  kind: "switch" | "join" | "batch" | "reserve";
  fromId?: string;
  toId: string;
  batch: string;
  reason: string;
  on: string;
  status: "pending" | "approved";
  decidedBy?: string;
};

type DrawerState = { kind: Request["kind"]; to: Cohort; from?: Cohort } | null;

const SEED_REQUEST: Request = {
  id: "req-0",
  kind: "switch",
  fromId: "co-fr-dec26-eve",
  toId: "co-fr-dec26-wkd",
  batch: "Saturday batch",
  reason: "Weekday evenings clash with month-end close at work.",
  on: "2026-06-24",
  status: "approved",
  decidedBy: "Priya Menon",
};

function PaperBadge({ code }: { code: string }) {
  return (
    <span className="grid h-10 min-w-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv px-2 font-mono text-[13px] font-bold text-cta">{code}</span>
  );
}

export function BatchesPage() {
  const student = useStudentRecord();
  return (
    <StudentTypeGate type="graduate" eyebrow="Your plan" title="Batches & cohorts">
      <BatchesView key={student.id} student={student} />
    </StudentTypeGate>
  );
}

export function BatchesView({ student }: { student: Student }) {
  const [myCohortIds, setMyCohortIds] = useState<string[]>(student.cohortIds);
  const [myBatch, setMyBatch] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const id of student.cohortIds) {
      const c = cohortById(id);
      if (!c) continue;
      out[id] = (c.sections.find((s) => s.id === student.sectionId) ?? c.sections[0])?.id ?? "";
    }
    return out;
  });
  const [requests, setRequests] = useState<Request[]>(student.id === "s-anaya" ? [SEED_REQUEST] : []);
  const [mode, setMode] = useState("all");
  const [paper, setPaper] = useState("");
  const [drawer, setDrawer] = useState<DrawerState>(null);

  const myCohorts = myCohortIds.map((id) => cohortById(id)).filter(Boolean) as Cohort[];
  const upcoming = useMemo(() => classesForStudent(student.id).filter((c) => c.status === "upcoming" || c.status === "today"), [student.id]);
  const pendingFor = (id: string) => requests.find((r) => r.toId === id && r.status === "pending");

  const matches = (c: Cohort) => (mode === "all" || c.mode === mode) && (!paper || c.papers.includes(paper as PaperCode));
  const regular = selectableCohorts.filter((c) => (c.type === "regular" || c.type === "fast-track") && matches(c));
  const recovery = selectableCohorts.filter((c) => (c.type === "revision" || c.type === "reattempt") && matches(c));
  const paperOptions = [...new Set(selectableCohorts.flatMap((c) => c.papers))].map((p) => ({ value: p, label: `${p} · ${paperName(p)}` }));
  const failedPM = student.papers.PM.attempts.find((a) => a.result === "failed");
  const pmRecovery = recoveryPlans.find((r) => r.studentId === student.id && r.paper === "PM");

  const openFor = (c: Cohort) => {
    if (myCohortIds.includes(c.id)) return;
    const from = myCohorts.find((m) => m.papers.some((p) => c.papers.includes(p)));
    const kind: Request["kind"] = c.type === "reattempt" ? "reserve" : from ? "switch" : "join";
    setDrawer({ kind, to: c, from });
  };

  const submit = (data: FormData) => {
    if (!drawer) return;
    const batchId = String(data.get("batch") ?? "");
    const batch = drawer.to.sections.find((s) => s.id === batchId) ?? drawer.to.sections[0];
    const reason = String(data.get("reason") ?? "").trim();
    if (drawer.kind === "batch") {
      setRequests((r) => [
        { id: `req-${r.length + 1}`, kind: "batch", fromId: drawer.to.id, toId: drawer.to.id, batch: batch.name, reason: reason || "Batch change", on: "2026-09-14", status: "pending" },
        ...r,
      ]);
      toast({ title: "Request sent to Programme Admin", body: `Move to the ${batch.name} (${batch.schedule}) in ${drawer.to.name}.` });
    } else {
      setRequests((r) => [
        { id: `req-${r.length + 1}`, kind: drawer.kind, fromId: drawer.from?.id, toId: drawer.to.id, batch: batch.name, reason: reason || "No reason given", on: "2026-09-14", status: "pending" },
        ...r,
      ]);
      toast({
        title: "Request sent to Programme Admin",
        body:
          drawer.kind === "switch"
            ? `Switch from ${drawer.from?.name} to ${drawer.to.name}, ${batch.name}. Priya Menon usually replies within 2 working days.`
            : drawer.kind === "reserve"
              ? `Place reserved in ${drawer.to.name}, ${batch.name}, pending confirmation.`
              : `Join ${drawer.to.name}, ${batch.name}. Priya Menon usually replies within 2 working days.`,
      });
    }
    setDrawer(null);
  };

  const joinRevision = (c: Cohort) => {
    setMyCohortIds((ids) => [...ids, c.id]);
    setMyBatch((b) => ({ ...b, [c.id]: c.sections[0]?.id ?? "" }));
    toast({ title: `You joined ${c.name}`, body: `${c.sections[0]?.name} · ${c.schedule}. Classes appear on Live classes.` });
  };

  const renderCohortCard = (c: Cohort) => {
    const mine = myCohortIds.includes(c.id);
    const pending = pendingFor(c.id);
    const seatsLeft = c.capacity - c.size;
    const session = c.examSessionId ? examSessionById(c.examSessionId) : undefined;
    const samePaper = !mine && myCohorts.some((m) => m.papers.some((p) => c.papers.includes(p)));
    return (
      <Card key={c.id} className={cn("flex min-w-0 flex-col", mine && "border-ink")}>
        <div className="flex items-start gap-3 px-4 pt-4">
          <PaperBadge code={c.papers.join(", ")} />
          <div className="min-w-0 flex-1">
            <h3 className="text-[14.5px] leading-snug font-bold text-ink">{c.name}</h3>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <StatusPill status={c.type === "fast-track" ? "in progress" : "neutral"} tone={c.type === "fast-track" ? "violet" : c.type === "regular" ? "neutral" : "amber"} size="sm" dot={false}>
                {COHORT_TYPE_LABELS[c.type]}
              </StatusPill>
              <StatusPill status={c.mode} tone={c.mode === "weekend" ? "cta" : "info"} size="sm" dot={false}>
                {c.mode === "weekend" ? "Weekend" : "Weekday"}
              </StatusPill>
              {session ? (
                <StatusPill status="session" tone="neutral" size="sm" dot={false}>
                  Sits {session.label}
                </StatusPill>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-2.5 px-4 py-3.5 text-[12.5px] text-ink-2">
          <p className="flex items-center gap-2">
            <Avatar name={staffName(c.facultyIds[0])} size="xs" />
            <span className="truncate">
              {c.facultyIds.map((f) => staffName(f)).join(", ")} · {paperName(c.papers[0])}
            </span>
          </p>
          <p className="flex items-center gap-2">
            <CalendarClock aria-hidden className="size-3.5 shrink-0 text-ink-3" />
            {formatAccaDate(c.startDate)} to {formatAccaDate(c.endDate)}
          </p>
          <p className="flex items-center gap-2">
            <Video aria-hidden className="size-3.5 shrink-0 text-ink-3" />
            {c.delivery}
          </p>
          <ul className="space-y-1.5 rounded-[var(--radius-md)] bg-surface-2 p-2.5">
            {c.sections.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
                <span className="font-semibold text-ink">{s.name}</span>
                <span className="text-ink-3">{s.schedule}</span>
              </li>
            ))}
          </ul>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Users aria-hidden className="size-3.5 text-ink-3" />
                {c.size} of {c.capacity} seats taken
              </span>
              <span className={cn("font-semibold", seatsLeft <= 3 ? "text-rose" : seatsLeft <= 6 ? "text-amber" : "text-jade")}>
                {seatsLeft} {seatsLeft === 1 ? "seat" : "seats"} left
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              <div className={cn("h-full rounded-full", seatsLeft <= 3 ? "bg-rose" : "bg-ink")} style={{ width: `${(c.size / c.capacity) * 100}%` }} />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
          {mine ? (
            <StatusPill status="enrolled">
              <Check aria-hidden className="mr-0.5 inline size-3" strokeWidth={3} />
              Your cohort
            </StatusPill>
          ) : pending ? (
            <StatusPill status="pending">Request pending · sent {formatShortDate(pending.on)}</StatusPill>
          ) : (
            <span className="text-[12px] text-ink-3">{c.status === "enrolling" ? `Starts ${formatShortDate(c.startDate)}` : "Running now"}</span>
          )}
          {!mine ? (
            <Button size="sm" variant={samePaper ? "primary" : "outline"} disabled={Boolean(pending) || seatsLeft <= 0} onClick={() => openFor(c)}>
              {samePaper ? <ArrowLeftRight aria-hidden className="size-3.5" /> : <Send aria-hidden className="size-3.5" />}
              {samePaper ? "Switch to this cohort" : c.type === "reattempt" ? "Reserve a place" : "Request a place"}
            </Button>
          ) : null}
        </div>
      </Card>
    );
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your plan"
        title="Batches & cohorts"
        sub="Flexible cohort selection for each paper: compare weekend and weekday batches, request a switch, and join reattempt and revision cohorts."
        actions={
          <Button onClick={() => myCohorts[0] && setDrawer({ kind: "batch", to: myCohorts[0] })}>
            <ArrowLeftRight aria-hidden className="size-4" />
            Change my batch
          </Button>
        }
      />

      <section aria-labelledby="mine-title" className="space-y-3.5">
        <h2 id="mine-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
          Your cohorts
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          {myCohorts.map((c) => {
            const batch = c.sections.find((s) => s.id === myBatch[c.id]) ?? c.sections[0];
            const next = upcoming.find((l) => l.cohortId === c.id);
            const batchRequest = requests.find((r) => r.kind === "batch" && r.toId === c.id && r.status === "pending");
            return (
              <Card key={c.id} className="min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-inv px-5 py-4 text-ink-inv">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-cta font-mono text-[13px] font-bold text-cta-ink">{c.papers[0]}</span>
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-bold text-ink-inv">{c.name}</p>
                      <p className="truncate text-[12.5px] text-ink-inv/70">
                        {batch?.name} · {batch?.schedule}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={c.mode} tone="cta" dot={false}>
                    {c.mode === "weekend" ? "Weekend batch" : "Weekday batch"}
                  </StatusPill>
                </div>
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <dl className="space-y-2 text-[12.5px]">
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-3">Faculty</dt>
                      <dd className="min-w-0 text-ink">{c.facultyIds.map((f) => staffName(f)).join(", ")}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-3">Mentor</dt>
                      <dd className="min-w-0 text-ink">{staffName(c.mentorId)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-3">Exam</dt>
                      <dd className="min-w-0 text-ink">{c.examSessionId ? examSessionById(c.examSessionId)?.label : "University route"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-20 shrink-0 text-ink-3">Next class</dt>
                      <dd className="min-w-0 text-ink">{next ? `${formatDateTime(next.start)} · ${next.title}` : "No class this fortnight"}</dd>
                    </div>
                  </dl>
                  <div className="min-w-0">
                    <MicroLabel>Weekend or weekday batch selection</MicroLabel>
                    {c.sections.length > 1 ? (
                      <>
                        <Segmented
                          size="sm"
                          className="mt-2"
                          value={myBatch[c.id] ?? ""}
                          onChange={(id) => setMyBatch((b) => ({ ...b, [c.id]: id }))}
                          items={c.sections.map((s) => ({ id: s.id, label: s.name }))}
                        />
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {batchRequest ? (
                            <StatusPill status="pending">Batch change requested</StatusPill>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={myBatch[c.id] === (c.sections.find((s) => s.id === student.sectionId) ?? c.sections[0]).id}
                              onClick={() => {
                                const target = c.sections.find((s) => s.id === myBatch[c.id]);
                                setRequests((r) => [
                                  { id: `req-${r.length + 1}`, kind: "batch", fromId: c.id, toId: c.id, batch: target?.name ?? "", reason: "Batch change", on: "2026-09-14", status: "pending" },
                                  ...r,
                                ]);
                                toast({ title: "Request sent to Programme Admin", body: `Move to the ${target?.name} (${target?.schedule}).` });
                              }}
                            >
                              <Send aria-hidden className="size-3.5" />
                              Request this batch
                            </Button>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="mt-2 text-[12.5px] text-ink-2">
                        One {c.mode} batch: {c.schedule}.{" "}
                        {selectableCohorts.some((o) => o.id !== c.id && o.papers.includes(c.papers[0]))
                          ? `Other ${paperName(c.papers[0])} cohorts are listed below.`
                          : "There is no other batch for this cohort; ask your mentor if the timing stops working."}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">Flexible cohort selection</h2>
            <p className="mt-1 text-[13px] text-ink-3">Every open cohort for your papers, with its batches, faculty and seats left.</p>
          </div>
          <FilterBar
            active={mode !== "all" || Boolean(paper)}
            onClear={() => {
              setMode("all");
              setPaper("");
            }}
          >
            <Segmented
              value={mode}
              onChange={setMode}
              items={[
                { id: "all", label: "All batches" },
                { id: "weekend", label: "Weekend" },
                { id: "weekday", label: "Weekday" },
              ]}
            />
            <FilterSelect label="Paper" value={paper} onChange={setPaper} allLabel="All papers" options={paperOptions} />
          </FilterBar>
        </div>
        {regular.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {regular.map((c) => renderCohortCard(c))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">
            No {mode === "all" ? "" : `${mode} `}cohorts for this paper. Try the other batch type.
          </p>
        )}
      </div>

      <section aria-labelledby="recovery-title" className="space-y-4">
        <div className="min-w-0">
          <h2 id="recovery-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            Reattempt and revision cohorts
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">Smaller cohorts for a paper you are resitting: exam-focused revision, doubt-clearing and a mock before the session.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {recovery.map((c) => {
            const mine = myCohortIds.includes(c.id);
            const pending = pendingFor(c.id);
            const isPM = c.papers.includes("PM");
            const doubt = doubtSessions.find((d) => d.cohortId === c.id && d.status !== "completed");
            return (
              <Card key={c.id} className={cn("min-w-0 p-5", mine && "border-ink")}>
                <div className="flex items-start gap-3">
                  <PaperBadge code={c.papers[0]} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] leading-snug font-bold text-ink">{c.name}</h3>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {COHORT_TYPE_LABELS[c.type]} · {c.schedule} · {staffName(c.facultyIds[0])} · {c.capacity - c.size} seats left
                    </p>
                  </div>
                  {mine ? <StatusPill status="joined">Joined</StatusPill> : pending ? <StatusPill status="pending">Place requested</StatusPill> : null}
                </div>
                {isPM && failedPM ? (
                  <p className="mt-3 rounded-[var(--radius-md)] bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
                    You scored {failedPM.score}% in PM in {failedPM.label}, {50 - (failedPM.score ?? 0)} marks short of the pass mark.{" "}
                    {pmRecovery ? `Your recovery plan focuses on ${pmRecovery.weakAreas.join(" and ")}, ` : ""}ready for the {c.examSessionId ? examSessionById(c.examSessionId)?.label : ""} reattempt.
                  </p>
                ) : c.type === "reattempt" ? (
                  <p className="mt-3 rounded-[var(--radius-md)] bg-surface-2 px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
                    For learners who sit FR in Dec 2026 and do not pass. Reserving a place is free; it is confirmed after results on 25 Jan 2027.
                  </p>
                ) : null}
                <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-2">
                  <li className="flex items-center gap-2">
                    <Clock aria-hidden className="size-3.5 text-ink-3" />
                    {formatAccaDate(c.startDate)} to {formatAccaDate(c.endDate)}
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin aria-hidden className="size-3.5 text-ink-3" />
                    {c.delivery}
                  </li>
                  {doubt ? (
                    <li className="flex items-center gap-2">
                      <RotateCcw aria-hidden className="size-3.5 text-ink-3" />
                      Next doubt-clearing: {formatDateTime(doubt.start)}
                    </li>
                  ) : null}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {mine ? (
                    doubt ? (
                      <Button size="sm" variant="outline" onClick={() => toast({ title: "Added to your calendar", body: `${doubt.title} · ${formatDateTime(doubt.start)}`, tone: "info" })}>
                        <CalendarPlus aria-hidden className="size-3.5" />
                        Add doubt-clearing to calendar
                      </Button>
                    ) : null
                  ) : c.type === "revision" ? (
                    <Button size="sm" onClick={() => joinRevision(c)}>
                      Join cohort
                    </Button>
                  ) : (
                    <Button size="sm" disabled={Boolean(pending)} onClick={() => openFor(c)}>
                      {pending ? "Place requested" : "Reserve a place"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
          {recovery.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3 lg:col-span-2">
              No reattempt or revision cohorts match these filters.
            </p>
          ) : null}
        </div>
      </section>

      <Card>
        <CardHeader title="Your requests" sub="Cohort and batch changes are approved by the Programme Admin team" />
        <div className="px-5 pb-5">
          <Timeline
            dense
            items={requests.map((r) => ({
              id: r.id,
              tone: r.status === "approved" ? "jade" : "amber",
              title:
                r.kind === "batch"
                  ? `Batch change to ${r.batch} · ${cohortById(r.toId)?.name}`
                  : r.kind === "switch"
                    ? `Switch from ${cohortById(r.fromId)?.name} to ${cohortById(r.toId)?.name}`
                    : r.kind === "reserve"
                      ? `Place reserved in ${cohortById(r.toId)?.name}`
                      : `Join ${cohortById(r.toId)?.name}`,
              meta: `${formatAccaDate(r.on)} · ${r.status === "approved" ? `Approved by ${r.decidedBy}` : "Pending with Programme Admin"}`,
              body: r.reason,
            }))}
            empty="No requests yet."
          />
        </div>
      </Card>

      <FormDrawer
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        title={
          drawer?.kind === "switch" ? "Request a cohort switch" : drawer?.kind === "batch" ? "Change my batch" : drawer?.kind === "reserve" ? "Reserve a place" : "Request a place"
        }
        sub={drawer ? (drawer.kind === "switch" ? `From ${drawer.from?.name} to ${drawer.to.name}` : drawer.to.name) : undefined}
        submitLabel="Send request"
        footerNote="Sent to the Programme Admin team."
        onSubmit={submit}
      >
        {drawer ? (
          <>
            {drawer.kind === "batch" ? (
              <Field label="Cohort">
                <Select
                  name="cohort"
                  value={drawer.to.id}
                  onChange={(e) => {
                    const c = cohortById(e.target.value);
                    if (c) setDrawer({ kind: "batch", to: c });
                  }}
                >
                  {myCohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
            <Field label={drawer.to.sections.length > 1 ? "Batch" : "Batch or section"}>
              <Select name="batch" defaultValue={drawer.to.sections.find((s) => s.id !== myBatch[drawer.to.id])?.id ?? drawer.to.sections[0]?.id} key={drawer.to.id}>
                {drawer.to.sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.schedule} · {s.size} learners
                  </option>
                ))}
              </Select>
            </Field>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5 text-[12.5px] leading-relaxed text-ink-2">
              <p>
                <span className="font-semibold text-ink">{drawer.to.name}</span> · {COHORT_TYPE_LABELS[drawer.to.type]} · {drawer.to.mode === "weekend" ? "Weekend" : "Weekday"}
              </p>
              <p>
                {staffName(drawer.to.facultyIds[0])} · {drawer.to.capacity - drawer.to.size} seats left · runs {formatAccaDate(drawer.to.startDate)} to {formatAccaDate(drawer.to.endDate)}
              </p>
              {drawer.kind === "switch" ? <p className="mt-1">Recordings of classes you have missed stay available after the switch. Any fee difference follows the cohort transfer rule.</p> : null}
            </div>
            <Field label="Reason" hint="Optional">
              <Textarea name="reason" rows={3} placeholder="e.g. Saturday mornings clash with a family commitment" />
            </Field>
          </>
        ) : null}
      </FormDrawer>
    </div>
  );
}
