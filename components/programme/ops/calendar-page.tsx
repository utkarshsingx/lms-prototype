"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarPlus, CheckCircle2, Pencil, Plus, Repeat } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  allCalendarEvents,
  blackoutPeriods,
  blackoutRanges,
  cohortById,
  cohorts as allCohorts,
  daysBetween,
  examinationCycles,
  examSessions,
  faculty as facultyStaff,
  formatAccaDate,
  formatShortDate,
  paperName,
  staffName,
  universities,
  universityById,
  type CalendarKind,
  type ExaminationCycle,
  type PaperCode,
  type Tone,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { AgendaList, formatCalendarDate, formatRange, MonthCalendar, type CalendarEvent as UiEvent } from "@/components/ui/calendar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { detectClashes, timetableSlots, type ClassSlot, type Clash } from "./calendar-data";
import { GatedButton, MiniLabel, plural, useOpsAccess } from "./shared";

/* ------------------------------------------------------------------ calendar layers */

type Layer = "classes" | "mocks" | "acca" | "university" | "programme";

const LAYERS: { id: Layer; label: string; dot: string }[] = [
  { id: "classes", label: "Live classes", dot: "bg-info" },
  { id: "mocks", label: "Mock exams", dot: "bg-violet" },
  { id: "acca", label: "ACCA exams and deadlines", dot: "bg-amber" },
  { id: "university", label: "University calendars", dot: "bg-jade" },
  { id: "programme", label: "Programme events", dot: "bg-ink-3" },
];

function layerFor(kind: CalendarKind, universityId?: string): Layer | null {
  if (kind === "blackout") return null;
  if (kind === "mock") return "mocks";
  if (kind === "acca-exam" || kind === "entry-deadline" || kind === "results" || kind === "subscription") return "acca";
  if (universityId) return "university";
  if (kind === "class") return "classes";
  return "programme";
}

const KIND_LABELS: Partial<Record<CalendarKind, string>> = {
  semester: "Semester",
  "university-exam": "University assessment",
  holiday: "Holiday",
  "acca-exam": "ACCA exams",
  "entry-deadline": "Entry deadline",
  results: "Results",
  mock: "Mock exam",
  class: "Cohort start",
  orientation: "Orientation",
  subscription: "Subscription",
  payment: "Payment due",
  event: "Event",
};

type ProgEvent = {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  kind: CalendarKind;
  tone: Tone;
  universityId?: string;
  cohortId?: string;
};

const MONTHS = [
  { id: "2026-09", label: "Sep 2026" },
  { id: "2026-10", label: "Oct 2026" },
  { id: "2026-11", label: "Nov 2026" },
];

const MONTH_END: Record<string, string> = { "2026-09": "2026-09-30", "2026-10": "2026-10-31", "2026-11": "2026-11-30" };

function monthEnd(month: string) {
  return MONTH_END[month] ?? `${month}-31`;
}

/* ------------------------------------------------------------------ exam cycles */

type CycleRow = {
  id: string;
  sessionId: string;
  label: string;
  examStart: string;
  examEnd: string;
  early?: string;
  standard?: string;
  late?: string;
  results: string;
  mockDeadline: string;
  status: ExaminationCycle["status"];
  bookings: number;
  notBooked: number;
  resultsRecorded: number;
  passRate: number | null;
  note: string;
};

const CYCLE_STATUS_LABEL: Record<ExaminationCycle["status"], string> = {
  closed: "Closed",
  "results-pending": "Results pending",
  "entry-open": "Entry open",
  planning: "Planning",
};

const seedCycles: CycleRow[] = examinationCycles.map((c) => {
  const s = examSessions.find((x) => x.id === c.sessionId)!;
  return {
    id: c.id,
    sessionId: c.sessionId,
    label: s.label,
    examStart: s.examStart,
    examEnd: s.examEnd,
    early: s.earlyEntryCloses,
    standard: s.standardEntryCloses,
    late: s.lateEntryCloses,
    results: s.resultsDate,
    mockDeadline: c.mockDeadline,
    status: c.status,
    bookings: c.bookings,
    notBooked: c.notBooked,
    resultsRecorded: c.resultsRecorded,
    passRate: c.passRate,
    note: c.note,
  };
});

function nextWindow(c: CycleRow) {
  const windows = [
    { label: "Early entry", date: c.early },
    { label: "Standard entry", date: c.standard },
    { label: "Late entry", date: c.late },
  ].filter((w): w is { label: string; date: string } => Boolean(w.date));
  return windows.find((w) => w.date >= ACCA_TODAY);
}

/* ------------------------------------------------------------------ page */

export function CalendarPage() {
  const { canEdit, reason } = useOpsAccess();

  /* calendar */
  const [month, setMonth] = useState("2026-09");
  const [day, setDay] = useState<string | null>(ACCA_TODAY);
  const [layers, setLayers] = useState<Layer[]>(LAYERS.map((l) => l.id));
  const [uni, setUni] = useState("");
  const [customEvents, setCustomEvents] = useState<ProgEvent[]>([]);
  const [eventOpen, setEventOpen] = useState(false);

  /* cycles */
  const [cycles, setCycles] = useState<CycleRow[]>(seedCycles);
  const [editingCycle, setEditingCycle] = useState<CycleRow | null>(null);
  const [addingCycle, setAddingCycle] = useState(false);

  /* scheduling */
  const [scheduled, setScheduled] = useState<ClassSlot[]>([]);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [sCohort, setSCohort] = useState("co-bw-2025-s3");
  const [sSection, setSSection] = useState("sec-bw-2025-s3-a");
  const [sPaper, setSPaper] = useState<PaperCode>("FA");
  const [sFaculty, setSFaculty] = useState("st-grace");
  const [sDate, setSDate] = useState("2026-11-12");
  const [sTime, setSTime] = useState("16:30");
  const [sMins, setSMins] = useState(120);
  const [sRecurring, setSRecurring] = useState(true);
  const [sWeeks, setSWeeks] = useState(4);
  const [tableCohort, setTableCohort] = useState("");
  const [tablePaper, setTablePaper] = useState("");

  const allSlots = useMemo(
    () => [...timetableSlots, ...scheduled].sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date))),
    [scheduled],
  );

  const blackouts = useMemo(
    () =>
      blackoutPeriods
        .filter((b) => uni !== "direct" && (!uni || b.universityId === uni))
        .map((b) => ({ start: b.start, end: b.end, label: `${universityById(b.universityId)?.shortName ?? ""} · ${b.label}` })),
    [uni],
  );

  const baseEvents: ProgEvent[] = useMemo(
    () => [...allCalendarEvents.map((e) => ({ ...e })), ...customEvents],
    [customEvents],
  );

  const filteredEvents = useMemo(
    () =>
      baseEvents.filter((e) => {
        const layer = layerFor(e.kind, e.universityId);
        if (!layer || !layers.includes(layer)) return false;
        const eventUni = e.universityId ?? cohortById(e.cohortId)?.universityId;
        if (uni === "direct") return !eventUni;
        return !uni || !eventUni || eventUni === uni;
      }),
    [baseEvents, layers, uni],
  );

  const visibleSlots = useMemo(
    () =>
      layers.includes("classes")
        ? allSlots.filter((s) => {
            const slotUni = cohortById(s.cohortId)?.universityId;
            return !uni || (uni === "direct" ? !slotUni : slotUni === uni);
          })
        : [],
    [allSlots, layers, uni],
  );

  const calendarEvents: UiEvent[] = useMemo(() => {
    const perDay = new Map<string, { total: number; cancelled: number }>();
    for (const s of visibleSlots) {
      const cur = perDay.get(s.date) ?? { total: 0, cancelled: 0 };
      cur.total += 1;
      if (s.status === "cancelled") cur.cancelled += 1;
      perDay.set(s.date, cur);
    }
    const classEvents: UiEvent[] = [...perDay.entries()].map(([date, v]) => ({
      id: `cls-${date}`,
      date,
      title: v.cancelled === v.total ? `${plural(v.total, "class", "classes")} cancelled` : plural(v.total - v.cancelled, "live class", "live classes"),
      tone: v.cancelled === v.total ? "rose" : "info",
      kind: "Live classes",
    }));
    const other: UiEvent[] = filteredEvents.map((e) => ({
      id: e.id,
      date: e.date,
      title: e.endDate ? `${e.title} (to ${formatShortDate(e.endDate)})` : e.title,
      tone: e.tone,
      kind: KIND_LABELS[e.kind] ?? "Event",
    }));
    return [...other, ...classEvents];
  }, [visibleSlots, filteredEvents]);

  const dayAgenda: UiEvent[] = useMemo(() => {
    if (!day) return [];
    const classes: UiEvent[] = visibleSlots
      .filter((s) => s.date === day)
      .map((s) => {
        const cohort = cohortById(s.cohortId);
        const section = cohort?.sections.find((x) => x.id === s.sectionId);
        return {
          id: s.id,
          date: s.date,
          title: `${s.paper} · ${s.title} · ${cohort?.name ?? ""}${section && (cohort?.sections.length ?? 0) > 1 ? ` · ${section.name}` : ""}`,
          time: `${s.time} IST`,
          tone: s.status === "cancelled" ? "rose" : s.source === "scheduled" ? "cta" : "info",
          kind: s.status === "cancelled" ? "Cancelled" : s.source === "scheduled" ? "Scheduled" : `Live class · ${staffName(s.facultyId)}`,
        };
      });
    const others = calendarEvents.filter((e) => e.date === day && !e.id.startsWith("cls-"));
    return [...others, ...classes];
  }, [day, visibleSlots, calendarEvents]);

  const monthClassCount = visibleSlots.filter((s) => s.date.startsWith(month) && s.status !== "cancelled").length;

  /* ------------------------------------------------------------------ schedule drawer derived state */

  const sCohortRec = cohortById(sCohort);
  const occurrences = useMemo(
    () => (sRecurring ? Array.from({ length: Math.max(1, Math.min(20, sWeeks)) }, (_, i) => addDays(sDate, i * 7)) : [sDate]),
    [sRecurring, sWeeks, sDate],
  );
  const clashes: Clash[] = useMemo(
    () =>
      sDate && sTime
        ? detectClashes({
            cohortId: sCohort,
            sectionId: sSection || undefined,
            facultyId: sFaculty,
            dates: occurrences,
            time: sTime,
            mins: sMins,
            existing: allSlots,
            facultyName: staffName(sFaculty),
          })
        : [],
    [sCohort, sSection, sFaculty, occurrences, sTime, sMins, allSlots, sDate],
  );
  const blockedDates = new Set(clashes.filter((c) => c.blocking).map((c) => c.date));
  const schedulable = occurrences.filter((d) => !blockedDates.has(d));

  const pickCohort = (id: string) => {
    const c = cohortById(id);
    setSCohort(id);
    setSSection(c?.sections[0]?.id ?? "");
    setSPaper(c?.papers[0] ?? "FR");
    setSFaculty(c?.sections[0]?.facultyId ?? c?.facultyIds[0] ?? "st-marcus");
  };

  const submitSchedule = (data: FormData) => {
    if (!sCohortRec) return;
    if (schedulable.length === 0) {
      toast({ title: "Nothing scheduled", body: "Every occurrence falls inside a university examination blackout. Pick another date.", tone: "warning" });
      return;
    }
    const topic = String(data.get("topic") ?? "").trim() || `${sPaper} class`;
    const delivery = String(data.get("delivery")) === "on-campus" ? "on-campus" : "online";
    const section = sCohortRec.sections.find((x) => x.id === sSection);
    const base = scheduled.length;
    const created: ClassSlot[] = schedulable.map((date, i) => ({
      id: `sch-${base + i + 1}`,
      cohortId: sCohort,
      sectionId: sSection || undefined,
      paper: sPaper,
      title: topic,
      facultyId: sFaculty,
      date,
      time: sTime,
      mins: sMins,
      delivery,
      room: delivery === "on-campus" ? section?.room : undefined,
      status: "upcoming",
      source: "scheduled",
      note: sRecurring ? `Weekly, ${plural(occurrences.length, "week")}` : undefined,
    }));
    setScheduled((prev) => [...prev, ...created]);
    const skipped = occurrences.length - schedulable.length;
    const warnings = clashes.filter((c) => !c.blocking).length;
    toast({
      title: `${plural(created.length, "live class", "live classes")} scheduled`,
      body: `${sPaper} · ${topic} · ${sCohortRec.name}${skipped ? ` · ${skipped} skipped in the blackout` : ""}${warnings ? ` · ${plural(warnings, "warning")} to review` : ""}`,
      tone: skipped || warnings ? "warning" : "success",
    });
    setScheduleOpen(false);
    setMonth(schedulable[0].slice(0, 7));
    setDay(schedulable[0]);
    setTableCohort(sCohort);
  };

  /* ------------------------------------------------------------------ event drawer */

  const [eKind, setEKind] = useState<CalendarKind>("mock");
  const [eDate, setEDate] = useState("2026-11-14");
  const [eCohort, setECohort] = useState("co-bw-2025-s3");
  const eventCohort = cohortById(eCohort);
  const eventBlackout =
    eKind === "mock" && eventCohort?.universityId
      ? blackoutRanges(eventCohort.universityId).find((b) => eDate >= b.start && eDate <= b.end)
      : undefined;

  const submitEvent = (data: FormData) => {
    const title = String(data.get("title") ?? "").trim();
    if (!title) return;
    if (eventBlackout) {
      toast({ title: "Mock not added", body: `${eventCohort?.name} has no mocks during ${eventBlackout.label}.`, tone: "warning" });
      return;
    }
    const endDate = String(data.get("endDate") ?? "") || undefined;
    const ev: ProgEvent = {
      id: `custom-${customEvents.length + 1}`,
      date: eDate,
      endDate: endDate && endDate > eDate ? endDate : undefined,
      title,
      kind: eKind,
      tone: eKind === "mock" ? "violet" : eKind === "entry-deadline" ? "amber" : eKind === "results" ? "jade" : "info",
      cohortId: eCohort || undefined,
    };
    setCustomEvents((prev) => [...prev, ev]);
    setEventOpen(false);
    setMonth(eDate.slice(0, 7));
    setDay(eDate);
    const layer = layerFor(eKind);
    if (layer && !layers.includes(layer)) setLayers((l) => [...l, layer]);
    toast({ title: "Added to the programme calendar", body: `${title} · ${formatAccaDate(eDate)}${eventCohort ? ` · ${eventCohort.name}` : " · all programmes"}` });
  };

  /* ------------------------------------------------------------------ cycles */

  const saveCycle = (data: FormData) => {
    if (!editingCycle) return;
    const get = (k: string) => String(data.get(k) ?? "") || undefined;
    const next: CycleRow = {
      ...editingCycle,
      early: get("early"),
      standard: get("standard"),
      late: get("late"),
      examStart: get("examStart") ?? editingCycle.examStart,
      examEnd: get("examEnd") ?? editingCycle.examEnd,
      results: get("results") ?? editingCycle.results,
      mockDeadline: get("mockDeadline") ?? editingCycle.mockDeadline,
      status: (get("status") as CycleRow["status"]) ?? editingCycle.status,
      note: get("note") ?? "",
    };
    if (next.early && next.standard && next.early > next.standard) {
      toast({ title: "Early entry must close before standard entry", tone: "warning" });
      return;
    }
    if (next.standard && next.standard >= next.examStart) {
      toast({ title: "Standard entry must close before the exams start", tone: "warning" });
      return;
    }
    setCycles((prev) => prev.map((c) => (c.id === next.id ? next : c)));
    setEditingCycle(null);
    toast({ title: `Examination cycle updated: ${next.label}`, body: `Exams ${formatRange(next.examStart, next.examEnd)} · results ${formatAccaDate(next.results)}` });
  };

  const availableSessions = examSessions.filter((s) => !s.past && !cycles.some((c) => c.sessionId === s.id));

  const addCycle = (data: FormData) => {
    const s = examSessions.find((x) => x.id === String(data.get("session")));
    if (!s) return;
    const row: CycleRow = {
      id: `ec-${s.id.slice(3)}`,
      sessionId: s.id,
      label: s.label,
      examStart: s.examStart,
      examEnd: s.examEnd,
      early: s.earlyEntryCloses,
      standard: s.standardEntryCloses,
      late: s.lateEntryCloses,
      results: s.resultsDate,
      mockDeadline: String(data.get("mockDeadline") || addDays(s.examStart, -28)),
      status: "planning",
      bookings: 0,
      notBooked: 0,
      resultsRecorded: 0,
      passRate: null,
      note: String(data.get("note") ?? "") || "New cycle. Confirm entry windows once ACCA publishes them.",
    };
    setCycles((prev) => [...prev, row]);
    setAddingCycle(false);
    toast({ title: `Examination cycle added: ${s.label}`, body: `Exams ${formatRange(s.examStart, s.examEnd)}` });
  };

  const cycleColumns: DataTableColumn<CycleRow>[] = [
    {
      key: "label",
      header: "Exam session",
      sortable: true,
      sortValue: (c) => c.examStart,
      render: (c) => (
        <span className="block">
          <span className="block font-semibold text-ink">{c.label}</span>
          <span className="block text-[12px] text-ink-3">Exams {formatRange(c.examStart, c.examEnd)}</span>
        </span>
      ),
    },
    {
      key: "windows",
      header: "Entry windows",
      render: (c) => {
        const next = nextWindow(c);
        return (
          <span className="block text-[12.5px]">
            <span className="block text-ink-2">
              {[c.early && `Early ${formatShortDate(c.early)}`, c.standard && `Standard ${formatShortDate(c.standard)}`, c.late && `Late ${formatShortDate(c.late)}`]
                .filter(Boolean)
                .join(" · ") || "Closed"}
            </span>
            {next && c.status !== "closed" ? (
              <span className="block font-semibold text-ink">
                {next.label} closes in {daysBetween(ACCA_TODAY, next.date)} days
              </span>
            ) : null}
          </span>
        );
      },
    },
    { key: "results", header: "Results", sortable: true, render: (c) => formatAccaDate(c.results) },
    { key: "mockDeadline", header: "Mock deadline", sortable: true, render: (c) => formatAccaDate(c.mockDeadline) },
    {
      key: "bookings",
      header: "Bookings",
      align: "right",
      sortable: true,
      render: (c) => (
        <span className="block font-mono tnum">
          {c.bookings}
          {c.notBooked ? <span className="block text-[11.5px] text-rose">{c.notBooked} not booked</span> : null}
        </span>
      ),
    },
    {
      key: "passRate",
      header: "Pass rate",
      align: "right",
      mono: true,
      render: (c) => (c.passRate == null ? <span className="font-sans text-ink-3">{c.status === "results-pending" ? "Due" : "None yet"}</span> : `${c.passRate}%`),
    },
    { key: "status", header: "Status", render: (c) => <StatusPill status={CYCLE_STATUS_LABEL[c.status]} tone={c.status === "entry-open" ? "info" : undefined} /> },
    {
      key: "edit",
      header: "",
      align: "right",
      render: (c) => (
        <GatedButton allowed={canEdit} reason={reason} size="xs" variant="outline" onClick={() => setEditingCycle(c)}>
          <Pencil className="size-3.5" />
          Edit
        </GatedButton>
      ),
    },
  ];

  /* ------------------------------------------------------------------ schedule table */

  const upcomingSlots = useMemo(
    () =>
      allSlots.filter(
        (s) =>
          (s.source === "scheduled" || (s.date >= ACCA_TODAY && s.date <= addDays(ACCA_TODAY, 13))) &&
          (!tableCohort || s.cohortId === tableCohort) &&
          (!tablePaper || s.paper === tablePaper),
      ),
    [allSlots, tableCohort, tablePaper],
  );

  const slotColumns: DataTableColumn<ClassSlot>[] = [
    {
      key: "date",
      header: "When",
      sortable: true,
      sortValue: (s) => `${s.date}T${s.time}`,
      render: (s) => (
        <span className="block">
          <span className="block font-semibold text-ink">{formatCalendarDate(s.date, "day")}</span>
          <span className="block font-mono text-[12px] text-ink-3">
            {s.time} · {s.mins} min
          </span>
        </span>
      ),
    },
    {
      key: "class",
      header: "Class",
      render: (s) => (
        <span className="block max-w-[20rem]">
          <span className="block truncate font-semibold text-ink">
            {s.paper} · {s.title}
          </span>
          <span className="block truncate text-[12px] text-ink-3">{cohortById(s.cohortId)?.name}</span>
        </span>
      ),
    },
    { key: "faculty", header: "Faculty", sortable: true, sortValue: (s) => staffName(s.facultyId), render: (s) => staffName(s.facultyId) },
    { key: "delivery", header: "Delivery", render: (s) => (s.delivery === "on-campus" ? (s.room ?? "On campus") : "Online live") },
    {
      key: "status",
      header: "Status",
      render: (s) =>
        s.status === "cancelled" ? (
          <StatusPill status="Cancelled" size="sm" />
        ) : s.source === "scheduled" ? (
          <StatusPill status="Scheduled" tone="cta" size="sm">
            {s.note ? "Scheduled · weekly" : "Scheduled"}
          </StatusPill>
        ) : (
          <StatusPill status={s.status === "today" ? "Today" : "Timetable"} tone="info" size="sm" />
        ),
    },
  ];

  const toggleLayer = (id: Layer) => setLayers((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Calendar"
        sub="Configure programme calendars and examination cycles, and schedule live classes around university examination blackouts."
        badge={canEdit ? undefined : <ViewOnlyChip reason={reason} />}
        actions={
          <>
            <GatedButton allowed={canEdit} reason={reason} variant="secondary" onClick={() => setEventOpen(true)}>
              <Plus className="size-4" />
              Add calendar event
            </GatedButton>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => setScheduleOpen(true)}>
              <CalendarPlus className="size-4" />
              Schedule live class
            </GatedButton>
          </>
        }
      />

      {/* ------------------------------------------------------------------ programme calendar */}
      <section aria-labelledby="prog-cal" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="prog-cal" className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
              Configure programme calendars
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-2">Classes, mocks, ACCA exam dates and university calendars on one programme calendar.</p>
          </div>
          <Segmented
            size="sm"
            value={month}
            onChange={(m) => {
              setMonth(m);
              setDay(null);
            }}
            items={MONTHS}
          />
        </div>

        <FilterBar
          active={Boolean(uni) || layers.length !== LAYERS.length}
          onClear={() => {
            setUni("");
            setLayers(LAYERS.map((l) => l.id));
          }}
        >
          {LAYERS.map((l) => {
            const on = layers.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLayer(l.id)}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                  on ? "border-ink bg-cta-soft text-ink" : "border-line bg-surface text-ink-3 hover:text-ink",
                )}
              >
                <span aria-hidden className={cn("size-2 rounded-full", l.dot, !on && "opacity-40")} />
                {l.label}
              </button>
            );
          })}
          <FilterSelect
            label="University"
            allLabel="All"
            value={uni}
            onChange={setUni}
            options={[...universities.map((u) => ({ value: u.id, label: u.shortName })), { value: "direct", label: "ZSkillup direct only" }]}
          />
        </FilterBar>

        {blackouts.length ? (
          <div className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-rose/30 bg-rose-soft px-4 py-3">
            <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-rose" />
            <p className="min-w-0 text-[13px] text-ink">
              <span className="font-semibold">Examination blackout periods: </span>
              {blackouts.map((b, i) => (
                <span key={`${b.start}-${b.label}`}>
                  {i ? " · " : ""}
                  {b.label.split(" · ")[0]} {formatRange(b.start, b.end)}
                </span>
              ))}
              . No ACCA mocks or live classes are scheduled inside them.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_23rem]">
          <MonthCalendar
            month={month}
            onMonthChange={(m) => {
              setMonth(m);
              setDay(null);
            }}
            events={calendarEvents}
            blackout={blackouts}
            selected={day}
            onSelectDay={(d) => setDay((cur) => (cur === d ? null : d))}
            className="min-w-0"
          />
          <Card className="h-fit min-w-0 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[14.5px] font-semibold text-ink">{day ? formatCalendarDate(day, "long") : `${MONTHS.find((m) => m.id === month)?.label ?? month} at a glance`}</h3>
                <p className="text-[12px] text-ink-3">
                  {day ? `${plural(dayAgenda.length, "item")}` : `${plural(monthClassCount, "live class", "live classes")} · select a day for times`}
                </p>
              </div>
              {day ? (
                <Button size="xs" variant="ghost" onClick={() => setDay(null)}>
                  Show month
                </Button>
              ) : null}
            </div>
            <div className="scrollbar-slim max-h-[34rem] overflow-y-auto pr-1">
              <AgendaList
                events={day ? dayAgenda : calendarEvents.filter((e) => !e.id.startsWith("cls-"))}
                day={day}
                from={day ? undefined : `${month}-01`}
                to={day ? undefined : monthEnd(month)}
                blackout={blackouts}
                empty="Nothing scheduled on this day."
                onSelect={(e) => toast({ title: e.title, body: `${formatCalendarDate(e.date, "long")}${e.time ? ` · ${e.time}` : ""}`, tone: "info" })}
              />
            </div>
          </Card>
        </div>
      </section>

      {/* ------------------------------------------------------------------ examination cycles */}
      <section aria-labelledby="cycles" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="cycles" className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
              Configure examination cycles
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-2">
              ACCA session exams run in March, June, September and December. Entry windows, mock deadlines and results dates per cycle.
            </p>
          </div>
          <GatedButton allowed={canEdit} reason={reason} variant="outline" size="sm" disabled={availableSessions.length === 0} onClick={() => setAddingCycle(true)}>
            <Plus className="size-4" />
            Add examination cycle
          </GatedButton>
        </div>
        <DataTable caption="Examination cycles" rows={cycles} columns={cycleColumns} getRowId={(c) => c.id} initialSort={{ key: "label", dir: "asc" }} maxHeight="none" />
      </section>

      {/* ------------------------------------------------------------------ live classes */}
      <section aria-labelledby="schedule" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="schedule" className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
              Schedule live classes
            </h2>
            <p className="mt-1 text-[13.5px] text-ink-2">The next two weeks of timetabled classes, plus every class scheduled here. New classes are checked against blackouts and faculty timetables.</p>
          </div>
          <GatedButton allowed={canEdit} reason={reason} size="sm" onClick={() => setScheduleOpen(true)}>
            <CalendarPlus className="size-4" />
            Schedule live class
          </GatedButton>
        </div>
        <DataTable
          caption="Live class schedule"
          rows={upcomingSlots}
          columns={slotColumns}
          getRowId={(s) => s.id}
          pageSize={8}
          dense
          search={{ placeholder: "Search topic or faculty", match: (s, q) => s.title.toLowerCase().includes(q) || staffName(s.facultyId).toLowerCase().includes(q) }}
          filters={
            <FilterBar
              active={Boolean(tableCohort || tablePaper)}
              onClear={() => {
                setTableCohort("");
                setTablePaper("");
              }}
            >
              <FilterSelect label="Cohort" allLabel="All cohorts" value={tableCohort} onChange={setTableCohort} options={allCohorts.map((c) => ({ value: c.id, label: c.name }))} />
              <FilterSelect label="Paper" allLabel="All papers" value={tablePaper} onChange={setTablePaper} options={[...new Set(allCohorts.flatMap((c) => c.papers))]} />
            </FilterBar>
          }
          rowClassName={(s) => (s.source === "scheduled" ? "bg-cta-soft" : undefined)}
          onRowClick={(s) => {
            setMonth(s.date.slice(0, 7));
            setDay(s.date);
            toast({ title: `${s.paper} · ${s.title}`, body: `${formatCalendarDate(s.date, "long")} · ${s.time} IST · shown on the calendar`, tone: "info" });
          }}
          rowLabel={(s) => `Show ${s.paper} class on the calendar`}
        />
      </section>

      {/* ------------------------------------------------------------------ schedule drawer */}
      <FormDrawer
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule live class"
        sub="Checked against university examination blackouts, university calendars, ACCA exam days and faculty timetables."
        submitLabel={schedulable.length > 1 ? `Schedule ${schedulable.length} classes` : "Schedule class"}
        disabled={!canEdit || schedulable.length === 0}
        disabledReason={!canEdit ? reason : "Every occurrence is inside a blackout"}
        footerNote="Learners are notified in-app and by email."
        width="w-full max-w-xl"
        onSubmit={submitSchedule}
      >
        <Field label="Cohort">
          <Select name="cohort" value={sCohort} onChange={(e) => pickCohort(e.target.value)}>
            {allCohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={sCohortRec?.sections[0]?.kind === "section" ? "Section" : "Batch"}>
            <Select name="section" value={sSection} onChange={(e) => setSSection(e.target.value)}>
              {sCohortRec?.sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="">Whole cohort</option>
            </Select>
          </Field>
          <Field label="Paper">
            <Select name="paper" value={sPaper} onChange={(e) => setSPaper(e.target.value as PaperCode)}>
              {(sCohortRec?.papers ?? []).map((p) => (
                <option key={p} value={p}>
                  {p} · {paperName(p)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Topic">
          <Input name="topic" required defaultValue="FA revision: preparing a statement of financial position" />
        </Field>
        <Field label="Faculty">
          <Select name="faculty" value={sFaculty} onChange={(e) => setSFaculty(e.target.value)}>
            {facultyStaff.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} · {f.focusPapers.join(", ")}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date">
            <Input name="date" type="date" required value={sDate} onChange={(e) => setSDate(e.target.value)} />
          </Field>
          <Field label="Start time (IST)">
            <Input name="time" type="time" required value={sTime} onChange={(e) => setSTime(e.target.value)} />
          </Field>
          <Field label="Duration">
            <Select name="mins" value={String(sMins)} onChange={(e) => setSMins(Number(e.target.value))}>
              {[60, 90, 120, 150, 180].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Delivery">
          <Select name="delivery" defaultValue={sCohortRec?.delivery === "Online live" ? "online" : "on-campus"} key={sCohort}>
            <option value="online">Online live</option>
            <option value="on-campus">On campus{sCohortRec?.sections.find((s) => s.id === sSection)?.room ? ` · ${sCohortRec.sections.find((s) => s.id === sSection)?.room}` : ""}</option>
          </Select>
        </Field>
        <div className="rounded-[14px] border border-line p-3.5">
          <Switch checked={sRecurring} onChange={setSRecurring} label="Recurring weekly" sub="Repeat on the same weekday and time" />
          {sRecurring ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Field label="Number of weeks" className="w-36">
                <Input type="number" min={2} max={20} value={sWeeks} onChange={(e) => setSWeeks(Number(e.target.value) || 2)} />
              </Field>
              <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
                <Repeat aria-hidden className="size-3.5" />
                {formatShortDate(occurrences[0])} to {formatShortDate(occurrences[occurrences.length - 1])}
              </p>
            </div>
          ) : null}
        </div>

        <div className="min-w-0">
          <MiniLabel className="mb-2">Clash detection</MiniLabel>
          {clashes.length === 0 ? (
            <p className="flex items-center gap-2 rounded-[12px] border border-jade/30 bg-jade-soft px-3.5 py-2.5 text-[12.5px] font-semibold text-jade">
              <CheckCircle2 aria-hidden className="size-4" />
              No clashes across {plural(occurrences.length, "occurrence")}.
            </p>
          ) : (
            <ul className="space-y-2">
              {clashes.map((c, i) => (
                <li
                  key={`${c.date}-${c.kind}-${i}`}
                  className={cn(
                    "flex items-start gap-2.5 rounded-[12px] border px-3.5 py-2.5 text-[12.5px]",
                    c.blocking ? "border-rose/30 bg-rose-soft text-ink" : "border-amber/30 bg-amber-soft text-ink",
                  )}
                >
                  {c.blocking ? <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-rose" /> : <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" />}
                  <span className="min-w-0">
                    <span className="font-semibold">{formatCalendarDate(c.date, "day")}: </span>
                    {c.message}
                    {c.blocking ? " This occurrence will be skipped." : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-[12px] text-ink-3">
            {sCohortRec?.universityId
              ? `${universityById(sCohortRec.universityId)?.shortName} blackout: ${blackoutRanges(sCohortRec.universityId)
                  .map((b) => formatRange(b.start, b.end))
                  .join(" and ")}.`
              : "Open-market cohort: no university blackout applies."}{" "}
            {plural(schedulable.length, "class", "classes")} will be scheduled.
          </p>
        </div>
      </FormDrawer>

      {/* ------------------------------------------------------------------ event drawer */}
      <FormDrawer
        open={eventOpen}
        onClose={() => setEventOpen(false)}
        title="Add calendar event"
        sub="Configure the programme calendar: mocks, entry deadlines, orientations and payment dates."
        submitLabel="Add to calendar"
        disabled={!canEdit || Boolean(eventBlackout)}
        disabledReason={!canEdit ? reason : "Mocks cannot be scheduled inside a university examination blackout"}
        onSubmit={submitEvent}
      >
        <Field label="Title">
          <Input name="title" required defaultValue="FA mock exam 3 · Brightwater" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select name="kind" value={eKind} onChange={(e) => setEKind(e.target.value as CalendarKind)}>
              <option value="mock">Mock exam</option>
              <option value="entry-deadline">Entry deadline</option>
              <option value="orientation">Orientation</option>
              <option value="results">Results</option>
              <option value="payment">Payment due</option>
              <option value="event">Programme event</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select name="cohort" value={eCohort} onChange={(e) => setECohort(e.target.value)}>
              <option value="">All programmes</option>
              {allCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input name="date" type="date" required value={eDate} onChange={(e) => setEDate(e.target.value)} />
          </Field>
          <Field label="Ends" hint="Optional">
            <Input name="endDate" type="date" />
          </Field>
        </div>
        {eventBlackout ? (
          <p className="flex items-start gap-2.5 rounded-[12px] border border-rose/30 bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-ink">
            <Ban aria-hidden className="mt-0.5 size-4 shrink-0 text-rose" />
            {formatAccaDate(eDate)} is inside {universityById(eventCohort?.universityId)?.shortName} {eventBlackout.label.toLowerCase()} ({formatRange(eventBlackout.start, eventBlackout.end)}). Move the mock to {formatAccaDate(addDays(eventBlackout.start, -5))} or after {formatAccaDate(eventBlackout.end)}.
          </p>
        ) : (
          <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">No blackout conflict for this date and audience.</p>
        )}
      </FormDrawer>

      {/* ------------------------------------------------------------------ cycle drawers */}
      <FormDrawer
        open={editingCycle !== null}
        onClose={() => setEditingCycle(null)}
        title={editingCycle ? `${editingCycle.label} examination cycle` : "Examination cycle"}
        sub="Dates recorded here drive entry reminders, mock deadlines and results recording."
        submitLabel="Save cycle"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={saveCycle}
      >
        {editingCycle ? (
          <div key={editingCycle.id} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Early entry closes">
                <Input name="early" type="date" defaultValue={editingCycle.early} />
              </Field>
              <Field label="Standard entry closes">
                <Input name="standard" type="date" defaultValue={editingCycle.standard} />
              </Field>
              <Field label="Late entry closes">
                <Input name="late" type="date" defaultValue={editingCycle.late} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Exams start">
                <Input name="examStart" type="date" defaultValue={editingCycle.examStart} />
              </Field>
              <Field label="Exams end">
                <Input name="examEnd" type="date" defaultValue={editingCycle.examEnd} />
              </Field>
              <Field label="Results released">
                <Input name="results" type="date" defaultValue={editingCycle.results} />
              </Field>
              <Field label="Mock deadline">
                <Input name="mockDeadline" type="date" defaultValue={editingCycle.mockDeadline} />
              </Field>
            </div>
            <Field label="Status">
              <Select name="status" defaultValue={editingCycle.status}>
                {(Object.keys(CYCLE_STATUS_LABEL) as CycleRow["status"][]).map((s) => (
                  <option key={s} value={s}>
                    {CYCLE_STATUS_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Operations note">
              <Textarea name="note" rows={3} defaultValue={editingCycle.note} />
            </Field>
          </div>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={addingCycle}
        onClose={() => setAddingCycle(false)}
        title="Add examination cycle"
        sub="Start from an ACCA exam session. Entry windows are copied from the session."
        submitLabel="Add cycle"
        disabled={!canEdit || availableSessions.length === 0}
        disabledReason={reason}
        onSubmit={addCycle}
      >
        <Field label="Exam session">
          <Select name="session" defaultValue={availableSessions[0]?.id}>
            {availableSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · exams {formatRange(s.examStart, s.examEnd)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mock deadline">
          <Input name="mockDeadline" type="date" defaultValue={availableSessions[0] ? addDays(availableSessions[0].examStart, -28) : undefined} />
        </Field>
        <Field label="Operations note">
          <Textarea name="note" rows={3} placeholder="e.g. FM and AA cohorts sit this session." />
        </Field>
      </FormDrawer>
    </div>
  );
}
