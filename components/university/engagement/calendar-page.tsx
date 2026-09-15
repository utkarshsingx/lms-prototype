"use client";

import { useMemo, useState } from "react";
import { Ban, CalendarClock, CalendarPlus, CalendarRange, FileUp, GraduationCap, TriangleAlert } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  blackoutsForUniversity,
  calendarForUniversity,
  calendarUploads,
  cohortsForUniversity,
  daysBetween,
  doubtSessions,
  examPeriods,
  formatAccaDate,
  intakeById,
  liveClasses,
  programmeCalendarEvents,
  semesters as allSemesters,
  staffName,
  studentsForUniversity,
  type CalendarKind,
} from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch } from "@/components/ui/field";
import { StatusPill, toneFill, type StatusTone } from "@/components/ui/status";
import {
  AgendaList,
  MonthCalendar,
  formatCalendarDate,
  formatRange,
  type BlackoutRange,
  type CalendarEvent as UiEvent,
} from "@/components/ui/calendar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { Callout, Gated, MiniLabel, WorkspaceHeader, intakeShort, plural, useWorkspace } from "./shared";

type SemesterRow = {
  id: string;
  intakeId: string;
  number: number;
  start: string;
  end: string;
  examStart?: string;
  examEnd?: string;
  status: "completed" | "in-progress" | "upcoming";
  source: string;
};

type ExamPeriodRow = {
  id: string;
  label: string;
  start: string;
  end: string;
  semesters: number[];
  type: "end-semester" | "internal";
  blackout: "active" | "requested" | "none";
  source: string;
};

type UploadRow = { id: string; fileName: string; uploadedBy: string; uploadedOn: string; events: number | null; status: "applied" | "in-review" | "received" };

const KIND_LABEL: Partial<Record<CalendarKind, string>> = {
  semester: "Semester dates",
  "university-exam": "University assessment",
  holiday: "Holiday",
  orientation: "Orientation",
  event: "University event",
  mock: "ACCA mock exam",
  "entry-deadline": "ACCA deadline",
  class: "ACCA class",
};

const MONTHS = [
  { id: "2026-09", label: "Sep 2026" },
  { id: "2026-10", label: "Oct 2026" },
  { id: "2026-11", label: "Nov 2026" },
  { id: "2026-12", label: "Dec 2026" },
];

const SEM_LABEL = (list: number[]) => (list.length ? `Semester ${list.join(" and ")}` : "All semesters");

/** Expands a multi-day event into one entry per day so it shows on every date it covers. */
function expand(id: string, start: string, end: string | undefined, make: (date: string, i: number) => UiEvent): UiEvent[] {
  const days = end ? Math.min(daysBetween(start, end), 31) : 0;
  return Array.from({ length: days + 1 }, (_, i) => make(addDays(start, i), i)).map((e, i) => ({ ...e, id: `${id}-${i}` }));
}

export function CalendarPage() {
  const { uni, canEdit, reason, persona } = useWorkspace();

  const cohortIds = useMemo(() => new Set(cohortsForUniversity(uni.id).map((c) => c.id)), [uni.id]);
  const roster = useMemo(() => studentsForUniversity(uni.id), [uni.id]);

  /* ---------------------------------------------------------------- state */
  const [semesterRows, setSemesterRows] = useState<SemesterRow[]>(() =>
    allSemesters
      .filter((s) => s.universityId === uni.id)
      .map((s) => ({
        id: s.id,
        intakeId: s.intakeId,
        number: s.number,
        start: s.start,
        end: s.end,
        examStart: s.examStart,
        examEnd: s.examEnd,
        status: s.status,
        source: "Academic calendar upload",
      })),
  );

  const [periods, setPeriods] = useState<ExamPeriodRow[]>(() => {
    const blackouts = blackoutsForUniversity(uni.id);
    const endSemester: ExamPeriodRow[] = examPeriods
      .filter((p) => p.universityId === uni.id)
      .map((p) => ({
        id: p.id,
        label: p.label,
        start: p.start,
        end: p.end,
        semesters: p.semesters,
        type: "end-semester",
        blackout: blackouts.some((b) => b.start === p.start && b.end === p.end) ? "active" : "requested",
        source: "Academic calendar upload",
      }));
    const internal: ExamPeriodRow[] = calendarForUniversity(uni.id)
      .filter((e) => e.kind === "university-exam")
      .map((e) => ({
        id: e.id,
        label: e.title,
        start: e.date,
        end: e.endDate ?? e.date,
        semesters: [1, 3],
        type: "internal",
        blackout: "none",
        source: "Academic calendar upload",
      }));
    return [...internal, ...endSemester].sort((a, b) => a.start.localeCompare(b.start));
  });

  const [extraEvents, setExtraEvents] = useState<UiEvent[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>(() =>
    calendarUploads
      .filter((u) => u.universityId === uni.id)
      .map((u) => ({ id: u.id, fileName: u.fileName, uploadedBy: staffName(u.uploadedBy), uploadedOn: u.uploadedOn, events: u.events, status: u.status })),
  );

  const [month, setMonth] = useState("2026-11");
  const [day, setDay] = useState<string | null>(null);
  const [showAcca, setShowAcca] = useState(true);
  const [semOpen, setSemOpen] = useState(false);
  const [periodOpen, setPeriodOpen] = useState(false);

  /* ---------------------------------------------------------------- derived */
  const blackout: BlackoutRange[] = periods
    .filter((p) => p.blackout !== "none")
    .map((p) => ({ start: p.start, end: p.end, label: p.blackout === "active" ? `University examinations · ${SEM_LABEL(p.semesters)}` : `${p.label} (blackout requested)` }));

  const universityEvents: UiEvent[] = useMemo(
    () =>
      calendarForUniversity(uni.id)
        .filter((e) => e.kind !== "blackout" && e.kind !== "university-exam")
        .flatMap((e) =>
          expand(e.id, e.date, e.kind === "holiday" ? e.endDate : undefined, (date) => ({
            id: e.id,
            date,
            title: e.title,
            tone: e.tone as StatusTone,
            kind: KIND_LABEL[e.kind] ?? "University calendar",
          })),
        ),
    [uni.id],
  );

  const assessmentEvents: UiEvent[] = periods
    .filter((p) => p.type === "internal")
    .flatMap((p) => expand(p.id, p.start, p.end, (date) => ({ id: p.id, date, title: p.label, tone: "amber", kind: "University assessment" })));

  const accaEvents: UiEvent[] = useMemo(() => {
    const byDay = new Map<string, { total: number; cancelled: number }>();
    for (const c of liveClasses) {
      if (!cohortIds.has(c.cohortId)) continue;
      const d = c.start.slice(0, 10);
      const entry = byDay.get(d) ?? { total: 0, cancelled: 0 };
      entry.total += 1;
      if (c.status === "cancelled") entry.cancelled += 1;
      byDay.set(d, entry);
    }
    const classes: UiEvent[] = [...byDay].map(([date, v]) =>
      v.cancelled
        ? { id: `acca-cls-${date}`, date, title: `ACCA classes moved to recordings · ${v.cancelled}`, tone: "amber", kind: "ACCA class" }
        : { id: `acca-cls-${date}`, date, title: `ACCA live classes · ${v.total}`, tone: "info", kind: "ACCA class" },
    );
    const doubt: UiEvent[] = doubtSessions
      .filter((d) => cohortIds.has(d.cohortId))
      .map((d) => ({ id: d.id, date: d.start.slice(0, 10), title: d.title, tone: "info", kind: "ACCA doubt-clearing", time: d.start.slice(11, 16) }));
    const programme: UiEvent[] = programmeCalendarEvents
      .filter((e) => e.cohortId && cohortIds.has(e.cohortId) && e.kind !== "blackout")
      .map((e) => ({ id: e.id, date: e.date, title: e.title, tone: e.tone as StatusTone, kind: KIND_LABEL[e.kind] ?? "ACCA" }));
    const bookingsByDay = new Map<string, { paper: string; n: number }>();
    for (const s of roster) {
      for (const b of s.examBookings) {
        if (b.status !== "booked") continue;
        const entry = bookingsByDay.get(b.date) ?? { paper: b.paper, n: 0 };
        entry.n += 1;
        bookingsByDay.set(b.date, entry);
      }
    }
    const bookings: UiEvent[] = [...bookingsByDay].map(([date, v]) => ({
      id: `acca-bk-${date}`,
      date,
      title: `${v.paper} on-demand exam · ${plural(v.n, "student")}`,
      tone: "violet",
      kind: "ACCA exam booking",
    }));
    return [...classes, ...doubt, ...programme, ...bookings];
  }, [cohortIds, roster]);

  const events = [...universityEvents, ...assessmentEvents, ...extraEvents, ...(showAcca ? accaEvents : [])];

  /** ACCA items (classes, mocks, exam bookings) that fall inside a date range. */
  const conflictsIn = (start: string, end: string) => {
    const inside = (d: string) => d >= start && d <= end;
    const classes = liveClasses.filter((c) => cohortIds.has(c.cohortId) && c.status !== "cancelled" && inside(c.start.slice(0, 10))).length;
    const mocks = programmeCalendarEvents.filter((e) => e.kind === "mock" && e.cohortId && cohortIds.has(e.cohortId) && inside(e.date)).length;
    const bookings = roster.flatMap((s) => s.examBookings).filter((b) => b.status === "booked" && inside(b.date)).length;
    return { classes, mocks, bookings, total: classes + mocks + bookings };
  };

  const current = semesterRows.find((s) => s.status === "in-progress" && s.number === Math.max(...semesterRows.filter((x) => x.status === "in-progress").map((x) => x.number)));
  const nextExams = periods.filter((p) => p.type === "end-semester" && p.end >= ACCA_TODAY).sort((a, b) => a.start.localeCompare(b.start))[0];
  const nextConflicts = nextExams ? conflictsIn(nextExams.start, nextExams.end) : null;
  const intakeIds = [...new Set(semesterRows.map((s) => s.intakeId))].sort();

  /* ---------------------------------------------------------------- columns */
  const semesterColumns: DataTableColumn<SemesterRow>[] = [
    { key: "intake", header: "Intake", sortable: true, sortValue: (s) => s.intakeId, render: (s) => intakeShort(s.intakeId) },
    { key: "number", header: "Semester", sortable: true, render: (s) => <span className="font-semibold">Semester {s.number}</span> },
    { key: "teaching", header: "Teaching dates", sortable: true, sortValue: (s) => s.start, render: (s) => formatRange(s.start, s.end) },
    {
      key: "exams",
      header: "University examinations",
      render: (s) => (s.examStart && s.examEnd ? formatRange(s.examStart, s.examEnd) : <span className="text-ink-3">Not added</span>),
    },
    { key: "status", header: "Status", sortable: true, render: (s) => <StatusPill status={s.status} /> },
    { key: "source", header: "Source", className: "text-ink-3" },
  ];

  const periodColumns: DataTableColumn<ExamPeriodRow>[] = [
    {
      key: "label",
      header: "Examination period",
      sortable: true,
      wrap: true,
      render: (p) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{p.label}</span>
          <span className="block text-[12px] text-ink-3">
            {p.type === "end-semester" ? "End-semester examinations" : "Continuous internal assessment"} · {SEM_LABEL(p.semesters)}
          </span>
        </span>
      ),
    },
    { key: "dates", header: "Dates", sortable: true, sortValue: (p) => p.start, render: (p) => formatRange(p.start, p.end) },
    {
      key: "blackout",
      header: "ACCA scheduling",
      render: (p) =>
        p.blackout === "active" ? (
          <StatusPill status="Blackout active" tone="rose">ACCA blackout period</StatusPill>
        ) : p.blackout === "requested" ? (
          <StatusPill status="Pending" tone="amber">Blackout sent to Programme Admin</StatusPill>
        ) : (
          <StatusPill status="Recordings" tone="neutral">Classes move to recordings</StatusPill>
        ),
    },
    {
      key: "conflicts",
      header: "ACCA items inside",
      align: "right",
      render: (p) => {
        const c = conflictsIn(p.start, p.end);
        if (p.blackout === "none") return <span className="text-ink-3">Not blocked</span>;
        return c.total ? (
          <span className="font-semibold text-rose tnum" title={`${c.classes} classes, ${c.mocks} mocks, ${c.bookings} exam bookings`}>
            {plural(c.total, "item")} to move
          </span>
        ) : (
          <span className="text-jade">None</span>
        );
      },
    },
    { key: "source", header: "Source", className: "text-ink-3" },
  ];

  /* ---------------------------------------------------------------- render */
  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Academics"
        title="Academic calendar"
        sub={`Upload the ${uni.shortName} academic calendar, add semester dates and add university examination periods. ACCA classes, mocks and exam bookings are planned around them.`}
        actions={
          <>
            <Gated allowed={canEdit} reason={reason} variant="outline" onClick={() => setSemOpen(true)}>
              <CalendarPlus className="size-4" />
              Add semester dates
            </Gated>
            <Gated allowed={canEdit} reason={reason} onClick={() => setPeriodOpen(true)}>
              <CalendarRange className="size-4" />
              Add university examination period
            </Gated>
          </>
        }
      />

      <Callout icon={<Ban />} title="University examination periods become ACCA blackout periods">
        While your students sit university examinations, no ACCA live classes or mock examinations are scheduled, and any ACCA exam booking
        inside the period shows a warning to the student and the Programme Admin team.
      </Callout>

      <KpiRow cols={4}>
        <KpiTile
          label="Current semester"
          value={current ? `Semester ${current.number}` : "Between semesters"}
          icon={<GraduationCap />}
          sub={current ? `${intakeShort(current.intakeId)} · ${formatRange(current.start, current.end)}` : undefined}
        />
        <KpiTile
          label="Next university examinations"
          value={nextExams ? formatRange(nextExams.start, nextExams.end).replace(/ \d{4}$/, "") : "None"}
          tone="rose"
          icon={<CalendarRange />}
          sub={nextExams ? `${daysBetween(ACCA_TODAY, nextExams.start)} days away · ACCA blackout` : undefined}
        />
        <KpiTile
          label="ACCA items inside the blackout"
          value={nextConflicts?.total ?? 0}
          tone={nextConflicts?.total ? "amber" : "jade"}
          icon={<TriangleAlert />}
          sub={nextConflicts?.bookings ? `${plural(nextConflicts.bookings, "exam booking")} to rebook` : "Nothing to move"}
        />
        <KpiTile
          label="Academic calendar"
          value={uploads[0]?.status === "applied" ? "Applied" : "In review"}
          tone={uploads[0]?.status === "applied" ? "jade" : "amber"}
          icon={<FileUp />}
          sub={uploads[0] ? `${formatAccaDate(uploads[0].uploadedOn)} · ${uploads[0].uploadedBy}` : undefined}
        />
      </KpiRow>

      <section aria-labelledby="calendar-view" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="calendar-view" className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
            Semester dates, examinations and ACCA plans
          </h2>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              value={month}
              onChange={(m) => {
                setMonth(m);
                setDay(null);
              }}
              items={MONTHS}
            />
            <Switch checked={showAcca} onChange={setShowAcca} label="Show ACCA plans" />
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
          {(
            [
              ["jade", "Semester dates"],
              ["amber", "University assessment"],
              ["neutral", "Holiday"],
              ["info", "ACCA classes"],
              ["violet", "ACCA mocks and exams"],
            ] as [StatusTone, string][]
          ).map(([tone, label]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden className={cn("size-2 rounded-full", toneFill[tone])} />
              {label}
            </li>
          ))}
        </ul>
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <MonthCalendar
            month={month}
            onMonthChange={(m) => {
              setMonth(m);
              setDay(null);
            }}
            events={events}
            blackout={blackout}
            selected={day}
            onSelectDay={(d) => setDay((cur) => (cur === d ? null : d))}
          />
          <Card className="min-w-0 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="min-w-0 text-[14.5px] font-semibold text-ink">
                {day ? formatCalendarDate(day, "long") : MONTHS.find((m) => m.id === month)?.label ?? "This month"}
              </h3>
              {day ? (
                <Button size="xs" variant="ghost" onClick={() => setDay(null)}>
                  Show month
                </Button>
              ) : null}
            </div>
            <AgendaList
              events={events}
              day={day}
              from={day ? undefined : `${month}-01`}
              to={day ? undefined : `${month}-31`}
              blackout={blackout}
              limit={day ? undefined : 14}
              empty="Nothing on the calendar for this day."
              blackoutNote="No ACCA live classes or mock examinations are scheduled."
            />
          </Card>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Upload academic calendar"
            sub="PDF or spreadsheet from the university. The Programme Admin team checks extracted dates before they change ACCA plans."
          />
          <div className="px-5 pb-5">
            <FileDrop
              label="Upload academic calendar"
              accept=".pdf,.xlsx,.csv,.ics"
              hint="Academic year 2026-27 or a revised version."
              disabled={!canEdit}
              disabledReason={reason}
              onFiles={(_, added) => {
                if (!added.length) return;
                setUploads((list) => [
                  ...added.map((name, i) => ({
                    id: `cu-new-${list.length + i + 1}`,
                    fileName: name,
                    uploadedBy: persona.name,
                    uploadedOn: ACCA_TODAY,
                    events: null,
                    status: "received" as const,
                  })),
                  ...list,
                ]);
                toast({ title: `Academic calendar uploaded: ${added.join(", ")}`, body: "Dates are extracted and sent to Priya Menon to confirm before ACCA plans change." });
              }}
            />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Calendar uploads" sub={plural(uploads.length, "file")} />
          <ul className="divide-y divide-line border-t border-line">
            {uploads.map((u) => (
              <li key={u.id} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2">
                    <CalendarClock className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[12.5px] font-semibold text-ink">{u.fileName}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {formatAccaDate(u.uploadedOn)} · {u.uploadedBy}
                      {u.events != null ? ` · ${plural(u.events, "date")} extracted` : " · extracting dates"}
                    </p>
                  </div>
                </div>
                <StatusPill status={u.status} size="sm">
                  {u.status === "applied" ? "Applied" : u.status === "in-review" ? "In review" : "Received"}
                </StatusPill>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section aria-labelledby="semester-dates" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="semester-dates" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              Semester dates
            </h2>
            <p className="mt-1 text-[13px] text-ink-2">Teaching and examination dates per intake. ACCA papers in the roadmap follow these semesters.</p>
          </div>
          <Gated allowed={canEdit} reason={reason} size="sm" variant="secondary" onClick={() => setSemOpen(true)}>
            <CalendarPlus className="size-4" />
            Add semester dates
          </Gated>
        </div>
        <DataTable
          caption="Semester dates"
          rows={semesterRows}
          columns={semesterColumns}
          getRowId={(s) => s.id}
          dense
          initialSort={{ key: "teaching", dir: "asc" }}
        />
      </section>

      <section aria-labelledby="exam-periods" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="exam-periods" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              University examination periods
            </h2>
            <p className="mt-1 text-[13px] text-ink-2">
              End-semester examinations become ACCA blackout periods. Internal assessment weeks move ACCA classes to recordings.
            </p>
          </div>
          <Gated allowed={canEdit} reason={reason} size="sm" onClick={() => setPeriodOpen(true)}>
            <CalendarRange className="size-4" />
            Add university examination period
          </Gated>
        </div>
        <DataTable caption="University examination periods" rows={periods} columns={periodColumns} getRowId={(p) => p.id} dense initialSort={{ key: "dates", dir: "asc" }} />
      </section>

      {/* ------------------------------------------------------------ drawers */}
      <FormDrawer
        open={semOpen}
        onClose={() => setSemOpen(false)}
        title="Add semester dates"
        sub="Teaching and examination dates for one semester of one intake."
        submitLabel="Add semester dates"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const intakeId = String(data.get("intake"));
          const number = Number(data.get("semester"));
          const start = String(data.get("start"));
          const end = String(data.get("end"));
          const examStart = String(data.get("examStart") ?? "") || undefined;
          const examEnd = String(data.get("examEnd") ?? "") || undefined;
          if (end <= start) {
            toast({ title: "Teaching must end after it starts", tone: "warning" });
            return;
          }
          if ((examStart && examStart <= end) || (examStart && examEnd && examEnd < examStart)) {
            toast({ title: "Examinations must follow teaching", body: "Check the examination start and end dates.", tone: "warning" });
            return;
          }
          if (semesterRows.some((s) => s.intakeId === intakeId && s.number === number)) {
            toast({ title: `Semester ${number} already has dates for the ${intakeShort(intakeId)}`, tone: "warning" });
            return;
          }
          setSemesterRows((rows) => [
            ...rows,
            {
              id: `sem-new-${rows.length + 1}`,
              intakeId,
              number,
              start,
              end,
              examStart,
              examEnd,
              status: start > ACCA_TODAY ? "upcoming" : end < ACCA_TODAY ? "completed" : "in-progress",
              source: `Added by ${persona.name}`,
            },
          ]);
          setExtraEvents((list) => [
            ...list,
            { id: `ev-sem-${list.length}-a`, date: start, title: `Semester ${number} teaching begins · ${intakeShort(intakeId)}`, tone: "jade", kind: "Semester dates" },
            { id: `ev-sem-${list.length}-b`, date: end, title: `Semester ${number} teaching ends · ${intakeShort(intakeId)}`, tone: "jade", kind: "Semester dates" },
          ]);
          if (examStart && examEnd) {
            setPeriods((list) => [
              ...list,
              {
                id: `ep-new-${list.length + 1}`,
                label: `Semester ${number} university examinations`,
                start: examStart,
                end: examEnd,
                semesters: [number],
                type: "end-semester",
                blackout: "requested",
                source: `Added by ${persona.name}`,
              },
            ]);
          }
          toast({
            title: `Semester dates added: Semester ${number}, ${intakeShort(intakeId)}`,
            body: `Teaching ${formatRange(start, end)}${examStart && examEnd ? `. Examinations ${formatRange(examStart, examEnd)} sent as an ACCA blackout.` : "."}`,
          });
          setSemOpen(false);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intake">
            <Select name="intake" defaultValue="in-2025-jul">
              {intakeIds.map((id) => (
                <option key={id} value={id}>
                  {intakeById(id)?.label ?? intakeShort(id)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Semester">
            <Select name="semester" defaultValue="5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teaching starts">
            <Input type="date" name="start" required defaultValue="2027-07-14" />
          </Field>
          <Field label="Teaching ends">
            <Input type="date" name="end" required defaultValue="2027-11-19" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Examinations start" hint="Optional">
            <Input type="date" name="examStart" defaultValue="2027-11-22" />
          </Field>
          <Field label="Examinations end" hint="Optional">
            <Input type="date" name="examEnd" defaultValue="2027-12-11" />
          </Field>
        </div>
        <p className="text-[12.5px] leading-relaxed text-ink-3">Examination dates added here are also listed as a university examination period and sent as an ACCA blackout.</p>
      </FormDrawer>

      <FormDrawer
        open={periodOpen}
        onClose={() => setPeriodOpen(false)}
        title="Add university examination period"
        sub="End-semester examinations block ACCA classes and mocks. Internal assessment weeks move classes to recordings."
        submitLabel="Add university examination period"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const label = String(data.get("label") ?? "").trim();
          const start = String(data.get("start"));
          const end = String(data.get("end"));
          const type = String(data.get("type")) as ExamPeriodRow["type"];
          const semestersChosen = data.getAll("semesters").map(Number);
          const asBlackout = data.get("blackout") === "on";
          if (end < start) {
            toast({ title: "The period must end on or after its start date", tone: "warning" });
            return;
          }
          const c = conflictsIn(start, end);
          setPeriods((list) => [
            ...list,
            {
              id: `ep-new-${list.length + 1}`,
              label,
              start,
              end,
              semesters: semestersChosen,
              type,
              blackout: asBlackout ? "requested" : "none",
              source: `Added by ${persona.name}`,
            },
          ]);
          setMonth(start.slice(0, 7));
          setDay(null);
          toast({
            title: `Examination period added: ${label}`,
            body: asBlackout
              ? c.total
                ? `${formatRange(start, end)} sent as an ACCA blackout. ${plural(c.total, "ACCA item")} inside (${c.classes} classes, ${c.mocks} mocks, ${c.bookings} exam bookings) go to the Programme Admin team to reschedule.`
                : `${formatRange(start, end)} sent as an ACCA blackout. No ACCA classes, mocks or bookings fall inside.`
              : `${formatRange(start, end)}. ACCA classes that week move to recordings.`,
            tone: asBlackout && c.total ? "warning" : "success",
          });
          setPeriodOpen(false);
        }}
      >
        <Field label="Name">
          <Input name="label" required defaultValue="Continuous internal assessment 3" />
        </Field>
        <Field label="Type">
          <Select name="type" defaultValue="internal">
            <option value="end-semester">End-semester examinations</option>
            <option value="internal">Continuous internal assessment</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Starts">
            <Input type="date" name="start" required defaultValue="2027-02-15" />
          </Field>
          <Field label="Ends">
            <Input type="date" name="end" required defaultValue="2027-02-19" />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Semesters sitting examinations</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Checkbox key={n} name="semesters" value={n} defaultChecked={n === 2 || n === 4} label={`Semester ${n}`} />
            ))}
          </div>
        </fieldset>
        <div className="rounded-[14px] border border-line bg-surface-2 p-3.5">
          <Checkbox name="blackout" label="Send as an ACCA blackout period (no ACCA live classes or mock examinations)" />
          <MiniLabel className="mt-3">What a blackout does</MiniLabel>
          <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-2">
            {(blackoutsForUniversity(uni.id)[0]?.rules ?? []).map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-rose" />
                <span className="min-w-0">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </FormDrawer>
    </div>
  );
}
