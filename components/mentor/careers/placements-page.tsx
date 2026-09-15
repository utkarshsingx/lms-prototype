"use client";

import { useMemo, useState } from "react";
import {
  Award,
  BadgeIndianRupee,
  CalendarClock,
  CalendarPlus,
  ClipboardPen,
  Download,
  GraduationCap,
  Handshake,
  MessageSquareQuote,
  SquareKanban,
  TriangleAlert,
} from "lucide-react";
import {
  addDays,
  blackoutOn,
  daysBetween,
  formatAccaDate,
  formatTime,
  staffName,
  type PlacementStage,
  type Student,
} from "@/lib/data/acca";
import { useSwitchPersona } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AgendaList, formatCalendarDate, type CalendarEvent as UiEvent } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Kanban } from "@/components/ui/kanban";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { CareerBadges, Guard, READ_ONLY_REASON, ReadOnlyNotice, useCareerScope, type CareerScope } from "./scope";
import { Fact, MiniLabel, SECTION, STAGE_COLUMNS, StudentCell, ctcBand, formatLPA, stageLabel } from "./shared";
import {
  TODAY,
  updateCareers,
  useCareers,
  type CareerApplication,
  type CareerInternship,
  type CareerOpportunity,
} from "./store";

const TABS = [
  { id: "stages", label: "Track placement stages" },
  { id: "schedule", label: "Schedule interviews" },
  { id: "feedback", label: "Record recruiter feedback" },
  { id: "offers", label: "Track offers and joining" },
  { id: "internships", label: "Track internship completion" },
];

const ROUNDS = ["Screening call", "Technical round", "Case study round", "Final round", "HR round"];
const OUTCOMES = ["Next round", "Move to offer", "On hold", "Not selected"];
const OFFER_STATUSES = [
  { value: "offered", label: "Offered" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
  { value: "joined", label: "Joined" },
] as const;

type Row = { app: CareerApplication; student: Student; opp: CareerOpportunity };

function lpaFrom(opp: CareerOpportunity) {
  const nums = (opp.compensation.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  if (opp.kind === "internship" || nums.length === 0) return 0;
  const mid = nums.length > 1 ? (nums[0] + nums[1]) / 2 : nums[0];
  return Math.round(mid * 10) / 10;
}

function interviewWhen(date: string) {
  return `${formatCalendarDate(date.slice(0, 10), "day")}, ${formatTime(date)}`;
}

function pay(row: Row) {
  if (!row.app.offer) return "";
  return row.opp.kind === "internship" || !row.app.offer.ctcLPA ? row.opp.compensation : formatLPA(row.app.offer.ctcLPA);
}

export function PlacementsPage() {
  const scope = useCareerScope();
  const store = useCareers();
  const [tab, setTab] = useState("stages");
  const [schedule, setSchedule] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [offer, setOffer] = useState<string | null>(null);
  const [logFor, setLogFor] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () =>
      store.applications.flatMap((app) => {
        const student = scope.students.find((s) => s.id === app.studentId);
        const opp = store.opportunities.find((o) => o.id === app.opportunityId);
        return student && opp ? [{ app, student, opp }] : [];
      }),
    [store.applications, store.opportunities, scope.students],
  );

  const weekEnd = addDays(TODAY, 7);
  const active = rows.filter((r) => r.app.stage !== "joined" && r.app.stage !== "rejected");
  const thisWeek = rows.filter((r) => r.app.interview && r.app.interview.date.slice(0, 10) >= TODAY && r.app.interview.date.slice(0, 10) <= weekEnd);
  const offers = rows.filter((r) => r.app.offer);
  const internships = store.internships.filter((i) => scope.ids.has(i.studentId));

  const move = (row: Row, to: string) => {
    const stage = to as PlacementStage;
    updateCareers((st) => ({
      applications: st.applications.map((a) => {
        if (a.id !== row.app.id) return a;
        const next: CareerApplication = { ...a, stage, updated: TODAY };
        if (stage === "offer" && !a.offer) {
          next.offer = { ctcLPA: lpaFrom(row.opp), offeredOn: TODAY, joiningDate: "2026-12-14", status: "offered" };
        }
        if (stage === "joined") {
          const base = a.offer ?? { ctcLPA: lpaFrom(row.opp), offeredOn: TODAY, joiningDate: TODAY, status: "joined" as const };
          next.offer = { ...base, status: "joined", joiningDate: base.joiningDate > TODAY ? TODAY : base.joiningDate };
        }
        if (stage === "shortlisted" && !a.shortlistedBy) next.shortlistedBy = scope.staffId;
        return next;
      }),
    }));
    toast({
      title: `${row.student.name} moved to ${stageLabel(stage)}`,
      body:
        stage === "interview" && !row.app.interview
          ? `${row.opp.title} · ${row.opp.company}. Schedule the interview round next.`
          : stage === "offer" && !row.app.offer
            ? `${row.opp.title} · ${row.opp.company}. Offer recorded, update the CTC and joining date in Track offers and joining.`
            : `${row.opp.title} · ${row.opp.company}`,
    });
    if (stage === "interview" && !row.app.interview) setSchedule(row.app.id);
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow={SECTION}
        title="Placement pipeline"
        sub="Track placement stages from application to joining, schedule interviews, record recruiter feedback, and track offers, joining and internship completion."
        badge={<CareerBadges scope={scope} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Report queued: placement-pipeline.csv", tone: "info" })}>
              <Download className="size-4" />
              Export
            </Button>
            <Guard allowed={scope.canEdit}>
              <Button disabled={!scope.canEdit} onClick={() => setSchedule("")}>
                <CalendarPlus className="size-4" />
                Schedule interview
              </Button>
            </Guard>
          </>
        }
      />

      <ReadOnlyNotice scope={scope} what="Placement stages, interviews, offers and internships" />

      <KpiRow cols={4}>
        <KpiTile hero label="Active in the pipeline" value={active.length} icon={<SquareKanban />} sub={`${rows.length} applications from your scope`} />
        <KpiTile label="Recruiter interviews this week" value={thisWeek.length} tone="violet" icon={<CalendarClock />} sub={`To ${formatAccaDate(weekEnd)}`} />
        <KpiTile
          label="Offers accepted"
          value={offers.filter((r) => r.app.offer!.status === "accepted").length}
          tone="jade"
          icon={<Handshake />}
          sub={`${offers.filter((r) => r.app.offer!.status === "offered").length} awaiting a reply`}
        />
        <KpiTile label="Joined" value={rows.filter((r) => r.app.stage === "joined").length} tone="info" icon={<Award />} sub={`${internships.filter((i) => i.status === "ongoing").length} internships ongoing`} />
      </KpiRow>

      <Tabs
        items={TABS.map((t) => ({
          ...t,
          count:
            t.id === "schedule"
              ? rows.filter((r) => r.app.interview && r.app.interview.date.slice(0, 10) >= TODAY).length
              : t.id === "feedback"
                ? rows.filter((r) => r.app.interview && !r.app.recruiterFeedback).length || undefined
                : t.id === "offers"
                  ? offers.length
                  : t.id === "internships"
                    ? internships.length
                    : undefined,
        }))}
        value={tab}
        onChange={setTab}
      />

      {tab === "stages" ? <StagesTab rows={rows} scope={scope} onMove={move} onSchedule={setSchedule} onFeedback={setFeedback} /> : null}
      {tab === "schedule" ? <ScheduleTab rows={rows} scope={scope} onSchedule={setSchedule} /> : null}
      {tab === "feedback" ? <FeedbackTab rows={rows} scope={scope} onFeedback={setFeedback} /> : null}
      {tab === "offers" ? <OffersTab rows={offers} scope={scope} onRecord={() => setOffer("")} /> : null}
      {tab === "internships" ? <InternshipsTab records={internships} total={store.internships.length} scope={scope} onLog={setLogFor} /> : null}

      <ScheduleDrawer rows={rows} appId={schedule} scope={scope} onClose={() => setSchedule(null)} />
      <RecruiterFeedbackDrawer rows={rows} appId={feedback} scope={scope} onClose={() => setFeedback(null)} />
      <OfferDrawer rows={rows} appId={offer} scope={scope} onClose={() => setOffer(null)} />
      <InternshipLogDrawer record={internships.find((i) => i.id === logFor)} studentName={scope.students.find((s) => s.id === internships.find((i) => i.id === logFor)?.studentId)?.name ?? ""} scope={scope} onClose={() => setLogFor(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ stages */

function StagesTab({
  rows,
  scope,
  onMove,
  onSchedule,
  onFeedback,
}: {
  rows: Row[];
  scope: CareerScope;
  onMove: (row: Row, to: string) => void;
  onSchedule: (id: string) => void;
  onFeedback: (id: string) => void;
}) {
  const [kind, setKind] = useState("all");
  const [oppId, setOppId] = useState("");
  const opps = Array.from(new Map(rows.map((r) => [r.opp.id, r.opp])).values());
  const visible = rows.filter((r) => (kind === "all" || r.opp.kind === kind) && (!oppId || r.opp.id === oppId));

  return (
    <div className="space-y-4">
      <FilterBar
        active={Boolean(oppId || kind !== "all")}
        onClear={() => {
          setKind("all");
          setOppId("");
        }}
      >
        <Segmented
          size="sm"
          value={kind}
          onChange={setKind}
          items={[
            { id: "all", label: "All" },
            { id: "job", label: "Jobs" },
            { id: "internship", label: "Internships" },
          ]}
        />
        <FilterSelect
          label="Opportunity"
          allLabel="All opportunities"
          value={oppId}
          onChange={setOppId}
          options={opps.map((o) => ({ value: o.id, label: `${o.title} · ${o.company}` }))}
        />
        <span className="text-[12.5px] text-ink-3 tnum">{visible.length} applications</span>
      </FilterBar>

      <Kanban
        columns={STAGE_COLUMNS}
        items={visible}
        getColumn={(r) => r.app.stage}
        getId={(r) => r.app.id}
        getLabel={(r) => r.student.name}
        onMove={scope.canEdit ? onMove : undefined}
        renderCard={(r) => (
          <div className="min-w-0">
            <StudentCell student={r.student} size="xs" />
            <p className="mt-1.5 truncate text-[12.5px] text-ink-2">
              {r.opp.title} · {r.opp.company}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge tone={r.opp.kind === "job" ? "dark" : "info"}>{r.opp.kind === "job" ? "Job" : "Internship"}</Badge>
              <StatusPill status="match" tone={r.app.matchScore >= 70 ? "jade" : r.app.matchScore >= 50 ? "amber" : "rose"} size="sm" dot={false}>
                Match {r.app.matchScore}
              </StatusPill>
            </div>
            {r.app.interview ? (
              <p className="mt-2 text-[12px] text-ink-3">
                {r.app.interview.round} · {interviewWhen(r.app.interview.date)}
              </p>
            ) : null}
            {r.app.offer ? (
              <p className="mt-1 text-[12px] font-semibold text-ink-2">
                {pay(r)} · joining {formatAccaDate(r.app.offer.joiningDate)}
              </p>
            ) : null}
            {r.app.recruiterFeedback ? <p className="mt-1.5 line-clamp-2 text-[12px] text-ink-3">&ldquo;{r.app.recruiterFeedback}&rdquo;</p> : null}
            {scope.canEdit && (r.app.stage === "shortlisted" || r.app.stage === "interview") ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <Button size="xs" variant="ghost" onClick={() => onSchedule(r.app.id)}>
                  <CalendarPlus className="size-3.5" />
                  {r.app.interview ? "Reschedule" : "Schedule interview"}
                </Button>
                {r.app.interview ? (
                  <Button size="xs" variant="ghost" onClick={() => onFeedback(r.app.id)}>
                    <MessageSquareQuote className="size-3.5" />
                    Feedback
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      />
      {!scope.canEdit ? <p className="text-[12px] text-ink-3">Read-only board: stage moves need placement:manage.</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ schedule */

function ScheduleTab({ rows, scope, onSchedule }: { rows: Row[]; scope: CareerScope; onSchedule: (id: string) => void }) {
  const withInterview = rows.filter((r) => r.app.interview);
  const events: UiEvent[] = withInterview.map((r) => ({
    id: r.app.id,
    date: r.app.interview!.date.slice(0, 10),
    title: `${r.student.name} · ${r.opp.company}`,
    time: `${formatTime(r.app.interview!.date)} IST`,
    kind: `${r.app.interview!.round} · ${r.app.interview!.mode}`,
    tone: "violet",
  }));

  const columns: DataTableColumn<Row>[] = [
    { key: "student", header: "Student", sortable: true, sortValue: (r) => r.student.name, render: (r) => <StudentCell student={r.student} sub={`${r.opp.title} · ${r.opp.company}`} /> },
    { key: "round", header: "Round", sortable: true, sortValue: (r) => r.app.interview!.round, render: (r) => r.app.interview!.round },
    { key: "when", header: "Date and time", sortable: true, sortValue: (r) => r.app.interview!.date, render: (r) => <span className="tnum">{interviewWhen(r.app.interview!.date)}</span> },
    { key: "mode", header: "Mode", render: (r) => r.app.interview!.mode },
    { key: "panel", header: "Panel", render: (r) => <span className="text-ink-2">{r.app.interview!.panel}</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => (r.app.interview!.date.slice(0, 10) >= TODAY ? 0 : 1),
      render: (r) =>
        r.app.interview!.date.slice(0, 10) >= TODAY ? <StatusPill status="Scheduled" size="sm" /> : <StatusPill status="Completed" tone="jade" size="sm" />,
    },
    {
      key: "action",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        r.app.interview!.date.slice(0, 10) >= TODAY ? (
          <Guard allowed={scope.canEdit}>
            <Button size="xs" variant="outline" disabled={!scope.canEdit} onClick={() => onSchedule(r.app.id)}>
              Reschedule
            </Button>
          </Guard>
        ) : null,
    },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Card className="min-w-0 self-start p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-[14.5px] font-semibold text-ink">Upcoming recruiter interviews</h3>
          <Guard allowed={scope.canEdit}>
            <Button size="xs" disabled={!scope.canEdit} onClick={() => onSchedule("")}>
              <CalendarPlus className="size-3.5" />
              Schedule
            </Button>
          </Guard>
        </div>
        <AgendaList
          events={events}
          from={TODAY}
          empty="No recruiter interviews scheduled for learners in your scope."
          onSelect={(e) => (scope.canEdit ? onSchedule(e.id) : toast({ title: e.title, body: `${formatCalendarDate(e.date, "long")} · ${e.time} · ${e.kind}`, tone: "info" }))}
        />
      </Card>
      <DataTable
        caption="Interview schedule"
        rows={withInterview}
        columns={columns}
        getRowId={(r) => r.app.id}
        initialSort={{ key: "when", dir: "desc" }}
        search={{ placeholder: "Search learner or company", match: (r, q) => r.student.name.toLowerCase().includes(q) || r.opp.company.toLowerCase().includes(q) }}
        empty={<EmptyState title="No interviews yet" sub="Schedule an interview for a shortlisted student." />}
      />
    </div>
  );
}

function ScheduleDrawer({ rows, appId, scope, onClose }: { rows: Row[]; appId: string | null; scope: CareerScope; onClose: () => void }) {
  const candidates = rows.filter((r) => r.app.stage === "shortlisted" || r.app.stage === "interview" || r.app.id === appId);
  const [picked, setPicked] = useState("");
  const [date, setDate] = useState<string | null>(null);
  const activeId = picked || appId || candidates.find((r) => !r.app.interview)?.app.id || candidates[0]?.app.id || "";
  const row = rows.find((r) => r.app.id === activeId);

  const close = () => {
    setPicked("");
    setDate(null);
    onClose();
  };
  if (!row) return null;

  const existing = row.app.interview;
  const defaultDate = existing && existing.date.slice(0, 10) >= TODAY ? existing.date.slice(0, 10) : addDays(TODAY, 3);
  const chosen = date ?? defaultDate;
  const blackout = row.student.universityId ? blackoutOn(row.student.universityId, chosen) : undefined;

  return (
    <FormDrawer
      open={appId !== null}
      onClose={close}
      title={existing ? "Reschedule interview" : "Schedule interview"}
      sub="Recruiter interview round for a shortlisted student. The student and recruiter both get the invite."
      submitLabel={existing ? "Save new time" : "Schedule interview"}
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      onSubmit={(data) => {
        const time = String(data.get("time"));
        const iso = `${String(data.get("date") || chosen)}T${time}`;
        const round = String(data.get("round"));
        const mode = String(data.get("mode")) as NonNullable<CareerApplication["interview"]>["mode"];
        updateCareers((st) => ({
          applications: st.applications.map((a) =>
            a.id === row.app.id
              ? {
                  ...a,
                  stage: a.stage === "shortlisted" || a.stage === "applied" ? "interview" : a.stage,
                  updated: TODAY,
                  interview: { date: iso, round, mode, panel: String(data.get("panel") ?? "").trim() || `${row.opp.company} hiring panel` },
                }
              : a,
          ),
        }));
        toast({
          title: existing ? "Interview rescheduled" : "Interview scheduled",
          body: `${row.student.name} · ${row.opp.company} · ${round} · ${interviewWhen(iso)}${data.get("notify") === "on" ? " · invites sent" : ""}`,
        });
        close();
      }}
    >
      <div key={activeId} className="space-y-4">
        <Field label="Application">
          <Select
            value={activeId}
            onChange={(e) => {
              setPicked(e.target.value);
              setDate(null);
            }}
          >
            {candidates.map((r) => (
              <option key={r.app.id} value={r.app.id}>
                {r.student.name} · {r.opp.title}, {r.opp.company} ({stageLabel(r.app.stage)})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Round">
          <Select name="round" defaultValue={existing?.round ?? "Technical round"}>
            {ROUNDS.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date">
            <Input name="date" type="date" min={TODAY} required value={chosen} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Time (IST)">
            <Select name="time" defaultValue={existing ? formatTime(existing.date) : "11:00"}>
              {["10:00", "11:00", "12:00", "14:30", "16:00", "17:30"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Mode">
            <Select name="mode" defaultValue={existing?.mode ?? "Video"}>
              <option>Video</option>
              <option>On-site</option>
              <option>Phone</option>
            </Select>
          </Field>
          <Field label="Panel">
            <Input name="panel" defaultValue={existing?.panel ?? `${row.opp.company} hiring panel`} />
          </Field>
        </div>
        {blackout ? (
          <p className="flex items-start gap-2 rounded-[12px] border border-rose/30 bg-rose-soft px-3 py-2.5 text-[12.5px] text-ink">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-rose" />
            {formatAccaDate(chosen)} falls in the {blackout.label} ({formatAccaDate(blackout.start)} to {formatAccaDate(blackout.end)}). Pick a date outside the examination blackout.
          </p>
        ) : null}
        <Field label="Preparation notes for the student">
          <Textarea name="notes" rows={3} placeholder="e.g. Revise IFRS 15 and bring two examples of reconciliations you owned." />
        </Field>
        <Checkbox name="notify" defaultChecked label="Send the invite to the student and the recruiter" />
      </div>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ recruiter feedback */

function FeedbackTab({ rows, scope, onFeedback }: { rows: Row[]; scope: CareerScope; onFeedback: (id: string) => void }) {
  const [view, setView] = useState("all");
  const base = rows.filter((r) => r.app.interview || r.app.recruiterFeedback);
  const visible = base.filter((r) => (view === "awaiting" ? !r.app.recruiterFeedback : view === "recorded" ? Boolean(r.app.recruiterFeedback) : true));

  const columns: DataTableColumn<Row>[] = [
    { key: "student", header: "Student", sortable: true, sortValue: (r) => r.student.name, render: (r) => <StudentCell student={r.student} sub={`${r.opp.title} · ${r.opp.company}`} /> },
    {
      key: "interview",
      header: "Interview",
      sortable: true,
      sortValue: (r) => r.app.interview?.date ?? "",
      render: (r) => (r.app.interview ? <span className="tnum">{r.app.interview.round} · {formatAccaDate(r.app.interview.date)}</span> : <span className="text-ink-3">Not recorded</span>),
    },
    { key: "stage", header: "Stage", sortable: true, sortValue: (r) => r.app.stage, render: (r) => <StatusPill status={r.app.stage} size="sm">{stageLabel(r.app.stage)}</StatusPill> },
    {
      key: "feedback",
      header: "Recruiter feedback",
      wrap: true,
      className: "min-w-[16rem]",
      render: (r) => (r.app.recruiterFeedback ? <span className="line-clamp-2 text-ink-2">{r.app.recruiterFeedback}</span> : <StatusPill status="Awaiting feedback" size="sm" />),
    },
    { key: "rating", header: "Rating", align: "right", mono: true, sortable: true, sortValue: (r) => r.app.recruiterRating ?? -1, render: (r) => (r.app.recruiterRating ? `${r.app.recruiterRating} of 5` : "") },
    {
      key: "outcome",
      header: "Outcome",
      sortable: true,
      sortValue: (r) => r.app.recruiterOutcome ?? "",
      render: (r) =>
        r.app.recruiterOutcome ? (
          <StatusPill status={r.app.recruiterOutcome} tone={r.app.recruiterOutcome === "Not selected" ? "rose" : r.app.recruiterOutcome === "On hold" ? "amber" : "jade"} size="sm" />
        ) : null,
    },
    { key: "on", header: "Recorded", sortable: true, sortValue: (r) => r.app.feedbackOn ?? "", render: (r) => <span className="text-ink-3">{r.app.feedbackOn ? formatAccaDate(r.app.feedbackOn) : ""}</span> },
    {
      key: "action",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => (
        <Guard allowed={scope.canEdit}>
          <Button size="xs" variant={r.app.recruiterFeedback ? "ghost" : "outline"} disabled={!scope.canEdit} onClick={() => onFeedback(r.app.id)}>
            <ClipboardPen className="size-3.5" />
            {r.app.recruiterFeedback ? "Update" : "Record feedback"}
          </Button>
        </Guard>
      ),
    },
  ];

  return (
    <DataTable
      caption="Recruiter feedback"
      rows={visible}
      columns={columns}
      getRowId={(r) => r.app.id}
      initialSort={{ key: "interview", dir: "desc" }}
      search={{ placeholder: "Search learner, company or feedback", match: (r, q) => r.student.name.toLowerCase().includes(q) || r.opp.company.toLowerCase().includes(q) || (r.app.recruiterFeedback ?? "").toLowerCase().includes(q) }}
      filters={
        <Segmented
          size="sm"
          value={view}
          onChange={setView}
          items={[
            { id: "all", label: `All · ${base.length}` },
            { id: "awaiting", label: `Awaiting · ${base.filter((r) => !r.app.recruiterFeedback).length}` },
            { id: "recorded", label: `Recorded · ${base.filter((r) => r.app.recruiterFeedback).length}` },
          ]}
        />
      }
      toolbar={
        <Guard allowed={scope.canEdit}>
          <Button size="sm" disabled={!scope.canEdit} onClick={() => onFeedback("")}>
            <ClipboardPen className="size-4" />
            Record recruiter feedback
          </Button>
        </Guard>
      }
      empty={<EmptyState title="No recruiter interviews yet" sub="Feedback is recorded after a scheduled interview round." />}
    />
  );
}

function RecruiterFeedbackDrawer({ rows, appId, scope, onClose }: { rows: Row[]; appId: string | null; scope: CareerScope; onClose: () => void }) {
  const candidates = rows.filter((r) => r.app.interview || r.app.id === appId);
  const [picked, setPicked] = useState("");
  const activeId = picked || appId || candidates.find((r) => !r.app.recruiterFeedback)?.app.id || candidates[0]?.app.id || "";
  const row = rows.find((r) => r.app.id === activeId);
  const close = () => {
    setPicked("");
    onClose();
  };
  if (!row) return null;

  return (
    <FormDrawer
      open={appId !== null}
      onClose={close}
      title="Record recruiter feedback"
      sub="What the recruiter said after the round. The outcome moves the placement stage."
      submitLabel="Save feedback"
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      onSubmit={(data) => {
        const outcome = String(data.get("outcome"));
        const rating = Number(data.get("rating") ?? 3);
        const text = String(data.get("feedback") ?? "").trim();
        const stage: PlacementStage =
          outcome === "Move to offer" ? "offer" : outcome === "Not selected" ? "rejected" : row.app.stage === "shortlisted" || row.app.stage === "applied" ? "interview" : row.app.stage;
        updateCareers((st) => ({
          applications: st.applications.map((a) =>
            a.id === row.app.id
              ? {
                  ...a,
                  stage,
                  updated: TODAY,
                  recruiterFeedback: text,
                  recruiterName: String(data.get("recruiter") ?? "").trim() || row.opp.company,
                  recruiterRating: rating,
                  recruiterOutcome: outcome,
                  feedbackOn: TODAY,
                  offer: stage === "offer" && !a.offer ? { ctcLPA: lpaFrom(row.opp), offeredOn: TODAY, joiningDate: "2026-12-14", status: "offered" } : a.offer,
                }
              : a,
          ),
        }));
        toast({
          title: "Recruiter feedback recorded",
          body: `${row.student.name} · ${row.opp.company} · ${outcome}${stage !== row.app.stage ? `, moved to ${stageLabel(stage)}` : ""}`,
          tone: outcome === "Not selected" ? "warning" : "success",
        });
        close();
      }}
    >
      <div key={activeId} className="space-y-4">
        <Field label="Application">
          <Select value={activeId} onChange={(e) => setPicked(e.target.value)}>
            {candidates.map((r) => (
              <option key={r.app.id} value={r.app.id}>
                {r.student.name} · {r.opp.company}
                {r.app.interview ? ` · ${r.app.interview.round}` : ""}
              </option>
            ))}
          </Select>
        </Field>
        <dl className="grid grid-cols-2 gap-3 rounded-[14px] border border-line bg-surface-2 p-3.5">
          <Fact label="Role">{row.opp.title}</Fact>
          <Fact label="Stage">{stageLabel(row.app.stage)}</Fact>
          <Fact label="Interview">{row.app.interview ? `${row.app.interview.round} · ${formatAccaDate(row.app.interview.date)}` : "Not scheduled"}</Fact>
          <Fact label="Match score">{row.app.matchScore}</Fact>
        </dl>
        <Field label="Recruiter or panel">
          <Input name="recruiter" defaultValue={row.app.recruiterName ?? row.app.interview?.panel ?? ""} />
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Recruiter rating</legend>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <label key={n}>
                <input type="radio" name="rating" value={n} defaultChecked={n === (row.app.recruiterRating ?? 3)} className="peer sr-only" />
                <span className="grid size-9 cursor-pointer place-items-center rounded-[10px] border border-line bg-surface font-mono text-[13px] font-semibold text-ink-2 transition-colors peer-checked:border-nav-active peer-checked:bg-nav-active peer-checked:text-nav-active-ink peer-focus-visible:shadow-[0_0_0_3px_var(--ring-cta)] hover:bg-cta-soft">
                  {n}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Outcome">
          <Select name="outcome" defaultValue={row.app.recruiterOutcome ?? "Next round"}>
            {OUTCOMES.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </Select>
        </Field>
        <Field label="Feedback">
          <Textarea name="feedback" rows={4} required defaultValue={row.app.recruiterFeedback ?? ""} placeholder="e.g. Strong on reconciliations, needs to explain IFRS 16 lease adjustments more clearly." />
        </Field>
        <Checkbox name="share" defaultChecked label="Share a summary with the student" />
      </div>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ offers and joining */

function OffersTab({ rows, scope, onRecord }: { rows: Row[]; scope: CareerScope; onRecord: () => void }) {
  const [status, setStatus] = useState("");
  const visible = status ? rows.filter((r) => r.app.offer!.status === status) : rows;
  const jobs = rows.filter((r) => r.opp.kind === "job" && r.app.offer!.ctcLPA);

  const setOfferStatus = (row: Row, next: string) => {
    const s = next as NonNullable<CareerApplication["offer"]>["status"];
    updateCareers((st) => ({
      applications: st.applications.map((a) =>
        a.id === row.app.id && a.offer
          ? {
              ...a,
              updated: TODAY,
              stage: s === "joined" ? "joined" : a.stage === "joined" ? "offer" : a.stage,
              offer: { ...a.offer, status: s, joiningDate: s === "joined" && a.offer.joiningDate > TODAY ? TODAY : a.offer.joiningDate },
            }
          : a,
      ),
    }));
    toast({
      title: `Offer marked ${OFFER_STATUSES.find((o) => o.value === s)?.label.toLowerCase()}`,
      body: `${row.student.name} · ${row.opp.title}, ${row.opp.company}${s === "joined" ? " · moved to Joined" : ""}`,
      tone: s === "declined" ? "warning" : "success",
    });
  };

  const columns: DataTableColumn<Row>[] = [
    { key: "student", header: "Student", sortable: true, sortValue: (r) => r.student.name, render: (r) => <StudentCell student={r.student} sub={`${r.opp.title} · ${r.opp.company}`} /> },
    { key: "offered", header: "Offer date", sortable: true, sortValue: (r) => r.app.offer!.offeredOn, render: (r) => <span className="tnum">{formatAccaDate(r.app.offer!.offeredOn)}</span> },
    {
      key: "ctc",
      header: "CTC band",
      sortable: true,
      sortValue: (r) => r.app.offer!.ctcLPA,
      render: (r) =>
        r.opp.kind === "job" && r.app.offer!.ctcLPA ? (
          <span>
            <span className="font-semibold text-ink">{ctcBand(r.app.offer!.ctcLPA)}</span>
            <span className="text-ink-3"> · {formatLPA(r.app.offer!.ctcLPA)}</span>
          </span>
        ) : (
          <span className="text-ink-2">{r.opp.compensation}</span>
        ),
    },
    { key: "joining", header: "Joining date", sortable: true, sortValue: (r) => r.app.offer!.joiningDate, render: (r) => <span className="tnum">{formatAccaDate(r.app.offer!.joiningDate)}</span> },
    {
      key: "days",
      header: "Joining in",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (r) => daysBetween(TODAY, r.app.offer!.joiningDate),
      render: (r) => {
        const d = daysBetween(TODAY, r.app.offer!.joiningDate);
        return r.app.offer!.status === "joined" ? "Joined" : r.app.offer!.status === "declined" ? "" : d > 0 ? `${d} days` : d === 0 ? "Today" : "Overdue";
      },
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => r.app.offer!.status,
      render: (r) =>
        scope.canEdit ? (
          <Select
            aria-label={`Offer status for ${r.student.name}`}
            value={r.app.offer!.status}
            onChange={(e) => setOfferStatus(r, e.target.value)}
            className="h-8.5 min-w-[8.5rem] text-[12.5px]"
          >
            {OFFER_STATUSES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        ) : (
          <StatusPill status={r.app.offer!.status} tone={r.app.offer!.status === "declined" ? "rose" : r.app.offer!.status === "offered" ? "amber" : "jade"} size="sm" />
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Offers made", value: rows.length },
          { label: "Accepted, not yet joined", value: rows.filter((r) => r.app.offer!.status === "accepted").length },
          { label: "Joined", value: rows.filter((r) => r.app.offer!.status === "joined").length },
          { label: "Median CTC, jobs", value: jobs.length ? formatLPA([...jobs.map((r) => r.app.offer!.ctcLPA)].sort((a, b) => a - b)[Math.floor(jobs.length / 2)]) : "No offers" },
        ].map((f) => (
          <Card key={f.label} className="min-w-0 p-4">
            <dt className="text-[12.5px] font-semibold text-ink-3">{f.label}</dt>
            <dd className="mt-1.5 font-display text-[24px] leading-none font-bold text-ink tnum">{f.value}</dd>
          </Card>
        ))}
      </dl>
      <DataTable
        caption="Offers and joining"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.app.id}
        initialSort={{ key: "joining", dir: "asc" }}
        search={{ placeholder: "Search learner or company", match: (r, q) => r.student.name.toLowerCase().includes(q) || r.opp.company.toLowerCase().includes(q) }}
        filters={<FilterSelect label="Status" allLabel="Any status" value={status} onChange={setStatus} options={OFFER_STATUSES.map((o) => ({ value: o.value, label: o.label }))} />}
        toolbar={
          <Guard allowed={scope.canEdit}>
            <Button size="sm" disabled={!scope.canEdit} onClick={onRecord}>
              <BadgeIndianRupee className="size-4" />
              Record offer
            </Button>
          </Guard>
        }
        empty={<EmptyState title="No offers yet" sub="Offers appear here when a recruiter makes one after the final round." />}
      />
    </div>
  );
}

function OfferDrawer({ rows, appId, scope, onClose }: { rows: Row[]; appId: string | null; scope: CareerScope; onClose: () => void }) {
  const candidates = rows.filter((r) => !r.app.offer && (r.app.stage === "interview" || r.app.stage === "shortlisted"));
  const [picked, setPicked] = useState("");
  const activeId = picked || appId || candidates[0]?.app.id || "";
  const row = rows.find((r) => r.app.id === activeId);
  const close = () => {
    setPicked("");
    onClose();
  };

  if (!row) {
    return (
      <FormDrawer open={appId !== null} onClose={close} title="Record offer" submitLabel="Record offer" disabled disabledReason="No application is at the interview stage." onSubmit={close}>
        <EmptyState title="Nobody at the interview stage" sub="Move a student to Interview on the board before recording an offer." />
      </FormDrawer>
    );
  }

  return (
    <FormDrawer
      open={appId !== null}
      onClose={close}
      title="Record offer"
      sub="Offer details from the recruiter. The student moves to Offer on the board."
      submitLabel="Record offer"
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      onSubmit={(data) => {
        const ctc = Number(data.get("ctc") ?? 0);
        const offeredOn = String(data.get("offeredOn") || TODAY);
        const joiningDate = String(data.get("joining") || "2026-12-14");
        const status = String(data.get("status")) as "offered" | "accepted";
        updateCareers((st) => ({
          applications: st.applications.map((a) =>
            a.id === row.app.id ? { ...a, stage: "offer", updated: TODAY, offer: { ctcLPA: ctc, offeredOn, joiningDate, status } } : a,
          ),
        }));
        toast({
          title: "Offer recorded",
          body: `${row.student.name} · ${row.opp.company} · ${row.opp.kind === "job" ? `${formatLPA(ctc)} (${ctcBand(ctc)})` : row.opp.compensation} · joining ${formatAccaDate(joiningDate)}`,
        });
        close();
      }}
    >
      <div key={activeId} className="space-y-4">
        <Field label="Application">
          <Select value={activeId} onChange={(e) => setPicked(e.target.value)}>
            {candidates.map((r) => (
              <option key={r.app.id} value={r.app.id}>
                {r.student.name} · {r.opp.title}, {r.opp.company}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={row.opp.kind === "job" ? "CTC (₹ LPA)" : "Monthly stipend is fixed"} hint={row.opp.compensation}>
            <Input name="ctc" type="number" step="0.1" min={0} defaultValue={lpaFrom(row.opp) || ""} disabled={row.opp.kind !== "job"} />
          </Field>
          <Field label="Offer status">
            <Select name="status" defaultValue="offered">
              <option value="offered">Offered, awaiting reply</option>
              <option value="accepted">Accepted</option>
            </Select>
          </Field>
          <Field label="Offer date">
            <Input name="offeredOn" type="date" max={TODAY} defaultValue={TODAY} />
          </Field>
          <Field label="Joining date" hint="After the Dec 2026 exam session">
            <Input name="joining" type="date" min={TODAY} defaultValue="2026-12-14" />
          </Field>
        </div>
      </div>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ internships */

function weeks(r: CareerInternship) {
  const total = Math.max(1, Math.round(daysBetween(r.start, r.end) / 7));
  const done = r.status === "completed" ? total : r.status === "planned" ? 0 : Math.min(total, Math.max(0, Math.floor(daysBetween(r.start, TODAY) / 7) + 1));
  return { total, done };
}

function InternshipsTab({ records, total, scope, onLog }: { records: CareerInternship[]; total: number; scope: CareerScope; onLog: (id: string) => void }) {
  const switchPersona = useSwitchPersona();
  const outside = total - records.length;

  const complete = (r: CareerInternship, name: string) => {
    updateCareers((st) => ({
      internships: st.internships.map((x) => (x.id === r.id ? { ...x, status: "completed", hoursLogged: Math.max(x.hoursLogged, x.hoursRequired), certificate: "pending", end: x.end > TODAY ? TODAY : x.end } : x)),
    }));
    toast({ title: "Internship marked complete", body: `${name} · ${r.company} · certificate pending supervisor sign-off` });
  };
  const issue = (r: CareerInternship, name: string) => {
    updateCareers((st) => ({ internships: st.internships.map((x) => (x.id === r.id ? { ...x, certificate: "issued" } : x)) }));
    toast({ title: "Internship certificate issued", body: `${name} · ${r.role}, ${r.company}` });
  };

  if (records.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap />}
        title="None of the learners in your scope has an internship on record"
        sub={`${total} internship records sit with other learners, coordinated by Meera Pillai for the placement team.`}
        action={
          !scope.canEdit ? (
            <Button variant="secondary" onClick={() => switchPersona("p-rahul", "stay")}>
              Switch to Rahul Verma
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {records.map((r) => {
          const s = scope.students.find((x) => x.id === r.studentId);
          const w = weeks(r);
          const name = s?.name ?? "";
          return (
            <Card key={r.id} className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4.5 pb-3">
                {s ? <StudentCell student={s} sub={`${r.role} · ${r.company}`} size="md" /> : null}
                <div className="flex flex-wrap gap-1.5">
                  <StatusPill status={r.status} size="sm" />
                  <StatusPill status={`certificate ${r.certificate}`} tone={r.certificate === "issued" ? "jade" : r.certificate === "pending" ? "amber" : "neutral"} size="sm">
                    Certificate {r.certificate === "not-due" ? "not due" : r.certificate}
                  </StatusPill>
                </div>
              </div>
              <div className="space-y-3 border-t border-line px-5 py-4">
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="text-ink-2">
                      {formatAccaDate(r.start)} to {formatAccaDate(r.end)}
                    </span>
                    <span className="font-mono font-semibold text-ink tnum">
                      {r.status === "planned" ? `${w.total} weeks` : `Week ${w.done} of ${w.total}`}
                    </span>
                  </div>
                  <Progress value={(w.done / w.total) * 100} tone={r.status === "completed" ? "jade" : "cta"} />
                </div>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[12.5px]">
                    <span className="text-ink-2">Hours logged</span>
                    <span className="font-mono font-semibold text-ink tnum">
                      {r.hoursLogged} of {r.hoursRequired}
                    </span>
                  </div>
                  <Progress value={(r.hoursLogged / r.hoursRequired) * 100} tone="brand" />
                </div>
                <dl className="grid grid-cols-3 gap-3">
                  <Fact label="Supervisor">{r.supervisor}</Fact>
                  <Fact label="Rating">{r.rating != null ? `${r.rating} of 5` : "Not rated"}</Fact>
                  <Fact label="Weekly logs">{r.weeklyLogs}</Fact>
                </dl>
                <div>
                  <MiniLabel>Supervisor feedback</MiniLabel>
                  <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{r.supervisorFeedback}</p>
                </div>
              </div>
              <div className={cn("flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3", !scope.canEdit && "opacity-90")}>
                <Guard allowed={scope.canEdit && r.status !== "planned"} reason={r.status === "planned" ? "The internship has not started." : READ_ONLY_REASON}>
                  <Button size="xs" variant="ghost" disabled={!scope.canEdit || r.status === "planned"} onClick={() => onLog(r.id)}>
                    <ClipboardPen className="size-3.5" />
                    Log supervisor feedback
                  </Button>
                </Guard>
                {r.status === "ongoing" ? (
                  <Guard allowed={scope.canEdit}>
                    <Button size="xs" variant="outline" disabled={!scope.canEdit} onClick={() => complete(r, name)}>
                      Mark complete
                    </Button>
                  </Guard>
                ) : null}
                {r.status === "completed" && r.certificate !== "issued" ? (
                  <Guard allowed={scope.canEdit}>
                    <Button size="xs" disabled={!scope.canEdit} onClick={() => issue(r, name)}>
                      <Award className="size-3.5" />
                      Issue certificate
                    </Button>
                  </Guard>
                ) : null}
                {r.certificate === "issued" ? (
                  <Button size="xs" variant="ghost" onClick={() => toast({ title: "Download started", body: `internship-certificate-${r.id}.pdf`, tone: "info" })}>
                    <Download className="size-3.5" />
                    Certificate
                  </Button>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
      {outside > 0 ? (
        <p className="text-[12.5px] text-ink-3">
          {outside} more internship {outside === 1 ? "record sits" : "records sit"} with learners outside your scope, coordinated by Meera Pillai, Internship Coordinator.
        </p>
      ) : null}
    </div>
  );
}

function InternshipLogDrawer({ record, studentName, scope, onClose }: { record?: CareerInternship; studentName: string; scope: CareerScope; onClose: () => void }) {
  if (!record) return null;
  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Log supervisor feedback"
      sub={`${studentName} · ${record.role}, ${record.company} · supervisor ${record.supervisor}`}
      submitLabel="Save log"
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      onSubmit={(data) => {
        const hours = Math.min(record.hoursRequired, Math.max(record.hoursLogged, Number(data.get("hours") ?? record.hoursLogged)));
        const rating = data.get("rating") ? Number(data.get("rating")) : record.rating;
        updateCareers((st) => ({
          internships: st.internships.map((x) =>
            x.id === record.id
              ? { ...x, hoursLogged: hours, weeklyLogs: Number(data.get("logs") ?? x.weeklyLogs), rating, supervisorFeedback: String(data.get("feedback") ?? "").trim() || x.supervisorFeedback }
              : x,
          ),
        }));
        toast({ title: "Supervisor feedback logged", body: `${studentName} · ${hours} of ${record.hoursRequired} hours · ${staffName("st-meera")} notified` });
        onClose();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hours logged to date" hint={`${record.hoursRequired} required`}>
          <Input name="hours" type="number" min={record.hoursLogged} max={record.hoursRequired} defaultValue={record.hoursLogged} />
        </Field>
        <Field label="Weekly logs submitted">
          <Input name="logs" type="number" min={0} defaultValue={record.weeklyLogs} />
        </Field>
      </div>
      <Field label="Supervisor rating">
        <Select name="rating" defaultValue={record.rating != null ? String(record.rating) : ""}>
          <option value="">Not rated yet</option>
          {["3", "3.5", "4", "4.5", "5"].map((n) => (
            <option key={n} value={n}>
              {n} of 5
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Supervisor feedback">
        <Textarea name="feedback" rows={4} defaultValue={record.supervisorFeedback === "Not started" ? "" : record.supervisorFeedback} />
      </Field>
    </FormDrawer>
  );
}
