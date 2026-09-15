"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Ban, CalendarRange, CalendarX2, FileUp, Plus, Trash2 } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  blackoutPeriods,
  calendarUploads,
  cohorts,
  daysBetween,
  examSessions,
  formatAccaDate,
  intakeById,
  programmeCalendarEvents,
  semesters,
  staffName,
  students as allStudents,
  universityById,
  universityCalendarEvents,
  type BlackoutPeriod,
  type CalendarEvent as DataCalendarEvent,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { AgendaList, MonthCalendar, formatCalendarDate, formatRange, type CalendarEvent } from "@/components/ui/calendar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural, useEditAccess } from "../acca/common";
import { UniversityPicker, UniversityStrip } from "./common";

const BLACKOUT_RULES = [
  "No ACCA mock examinations scheduled",
  "No ACCA live classes scheduled",
  "ACCA exam bookings inside the period show a warning",
];

const KIND_LABEL: Record<string, string> = {
  semester: "University semester",
  holiday: "Holiday",
  "university-exam": "University examinations",
  orientation: "Orientation",
  event: "University event",
  mock: "ACCA mock exam",
  class: "ACCA class",
  "entry-deadline": "ACCA entry deadline",
  results: "ACCA results",
  "acca-exam": "ACCA exam session",
  subscription: "ACCA subscription",
  payment: "Payment",
};

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

type Conflict = {
  id: string;
  kind: "Exam booking" | "Live class" | "ACCA mock exam" | "ACCA exam session";
  title: string;
  date: string;
  detail: string;
  blackout: BlackoutPeriod;
  advisory?: boolean;
};

/** Sample contents of an uploaded academic calendar, per university. */
const SAMPLE_CALENDAR: Record<string, { date: string; endDate?: string; title: string; kind: string }[]> = {
  "u-brightwater": [
    { date: "2027-01-04", title: "Semester 2 and 4 teaching begins", kind: "semester" },
    { date: "2027-01-26", title: "Republic Day · campus closed", kind: "holiday" },
    { date: "2027-02-15", endDate: "2027-02-19", title: "Continuous internal assessment 3", kind: "university-exam" },
    { date: "2027-03-22", title: "Holi · campus closed", kind: "holiday" },
  ],
  "u-coastline": [
    { date: "2027-01-11", title: "Semester 4 teaching begins", kind: "semester" },
    { date: "2027-03-01", endDate: "2027-03-05", title: "Internal assessment week", kind: "university-exam" },
    { date: "2027-04-26", endDate: "2027-05-14", title: "Semester 4 university examinations", kind: "university-exam" },
  ],
  "u-northfield": [
    { date: "2026-10-02", title: "Gandhi Jayanti · campus closed", kind: "holiday" },
    { date: "2026-10-26", endDate: "2026-10-30", title: "Mid-term examinations", kind: "university-exam" },
    { date: "2026-12-07", endDate: "2026-12-19", title: "End-term examinations", kind: "university-exam" },
  ],
};

export function CalendarsPage() {
  const { canEdit, reason, persona } = useEditAccess("programme:universities");
  const [uniId, setUniId] = useState("u-brightwater");
  const [blackouts, setBlackouts] = useState<BlackoutPeriod[]>(blackoutPeriods);
  const [uploads, setUploads] = useState(calendarUploads.map((u) => ({ ...u, status: u.status as string })));
  const [addedEvents, setAddedEvents] = useState<DataCalendarEvent[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [dropKey, setDropKey] = useState(0);
  const [month, setMonth] = useState("2026-11");
  const [day, setDay] = useState<string | null>(null);
  const [rescheduled, setRescheduled] = useState<string[]>([]);
  const [adding, setAdding] = useState<{ label: string; start: string; end: string; reason: string } | null>(null);

  const university = universityById(uniId)!;
  const uniBlackouts = blackouts.filter((b) => b.universityId === uniId).sort((a, b) => a.start.localeCompare(b.start));
  const nextBlackout = uniBlackouts.find((b) => b.end >= ACCA_TODAY);
  const uniCohorts = useMemo(() => cohorts.filter((c) => c.universityId === uniId), [uniId]);
  const uniStudents = useMemo(() => allStudents.filter((s) => s.universityId === uniId), [uniId]);
  const uniSemesters = semesters.filter((s) => s.universityId === uniId);
  const uniUploads = uploads.filter((u) => u.universityId === uniId);

  const events: CalendarEvent[] = useMemo(() => {
    const uni = [...universityCalendarEvents, ...addedEvents]
      .filter((e) => e.universityId === uniId && e.kind !== "blackout")
      .map((e) => ({ id: e.id, date: e.date, title: e.title, tone: e.tone, kind: KIND_LABEL[e.kind] ?? "University calendar", time: e.endDate ? `to ${formatAccaDate(e.endDate)}` : undefined }));
    const cohortIds = new Set(uniCohorts.map((c) => c.id));
    const acca = programmeCalendarEvents
      .filter((e) => e.kind !== "blackout" && ((e.cohortId && cohortIds.has(e.cohortId)) || (!e.cohortId && !e.programmeId)))
      .map((e) => ({ id: e.id, date: e.date, title: e.title, tone: e.tone, kind: KIND_LABEL[e.kind] ?? "ACCA", time: e.endDate ? `to ${formatAccaDate(e.endDate)}` : undefined }));
    const bookingGroups = new Map<string, { date: string; paper: string; names: string[] }>();
    for (const s of uniStudents) {
      for (const b of s.examBookings) {
        if (b.sessionId || b.status === "sat" || b.status === "cancelled" || b.date < ACCA_TODAY) continue;
        const key = `${b.date}-${b.paper}`;
        const g = bookingGroups.get(key) ?? { date: b.date, paper: b.paper, names: [] };
        g.names.push(s.name);
        bookingGroups.set(key, g);
      }
    }
    const bookings = [...bookingGroups.entries()].map(([key, g]) => ({
      id: `bk-${key}`,
      date: g.date,
      title: `${g.paper} CBE · ${g.names.length === 1 ? g.names[0] : plural(g.names.length, "learner")}`,
      tone: "info" as const,
      kind: "ACCA exam booking",
    }));
    return [...uni, ...acca, ...bookings];
  }, [uniId, uniCohorts, uniStudents, addedEvents]);

  const ranges = uniBlackouts.map((b) => ({ start: b.start, end: b.end, label: b.label }));

  const conflictsFor = (list: BlackoutPeriod[]): Conflict[] => {
    const out: Conflict[] = [];
    const cohortIds = new Set(uniCohorts.map((c) => c.id));
    for (const bo of list) {
      const inside = (d: string) => d >= bo.start && d <= bo.end;
      for (const s of uniStudents) {
        for (const b of s.examBookings) {
          if (b.sessionId || !(b.status === "booked" || b.status === "planned") || !inside(b.date)) continue;
          out.push({ id: `c-bk-${b.id}-${bo.id}`, kind: "Exam booking", title: `${s.name} · ${b.paper} on-demand CBE`, date: b.date, detail: b.centre, blackout: bo });
        }
      }
      for (const e of programmeCalendarEvents) {
        if ((e.kind === "mock" || e.kind === "class") && e.cohortId && cohortIds.has(e.cohortId) && inside(e.date)) {
          out.push({ id: `c-ev-${e.id}-${bo.id}`, kind: e.kind === "mock" ? "ACCA mock exam" : "Live class", title: e.title, date: e.date, detail: "Programme calendar", blackout: bo });
        }
      }
      // Project each section's weekly timetable across the blackout, up to the cohort's end date.
      for (const c of uniCohorts) {
        for (const sec of c.sections) {
          sec.schedule.split(" · ").forEach((slot, i) => {
            const days = [...slot.matchAll(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/g)].map((m) => WEEKDAYS[m[1]]);
            const paper = slot.match(/\((\w+)\)/)?.[1] ?? c.papers.join(", ");
            const from = bo.start > ACCA_TODAY ? bo.start : ACCA_TODAY;
            const to = bo.end < c.endDate ? bo.end : c.endDate;
            const dates: string[] = [];
            for (let d = from; d <= to; d = addDays(d, 1)) if (days.includes(weekday(d))) dates.push(d);
            if (dates.length) {
              out.push({
                id: `c-cls-${sec.id}-${i}-${bo.id}`,
                kind: "Live class",
                title: `${paper} class · ${c.name.split(" · ").slice(1).join(" · ")} · ${sec.name}`,
                date: dates[0],
                detail: `${plural(dates.length, "session")} · ${slot.replace(/\s*\(\w+\)/, "")}`,
                blackout: bo,
              });
            }
          });
        }
      }
      for (const es of examSessions) {
        if (es.past || es.examEnd < bo.start || es.examStart > bo.end) continue;
        const booked = uniStudents.filter((s) => s.examBookings.some((b) => b.sessionId === es.id && b.status === "booked")).length;
        out.push({
          id: `c-es-${es.id}-${bo.id}`,
          kind: "ACCA exam session",
          title: `${es.label} ACCA exams overlap the blackout`,
          date: es.examStart,
          detail: `${formatRange(es.examStart, es.examEnd)} · ${plural(booked, `${university.shortName} learner`)} booked`,
          blackout: bo,
          advisory: true,
        });
      }
    }
    return out.sort((a, b) => a.date.localeCompare(b.date));
  };

  const conflicts = conflictsFor(uniBlackouts);
  const openConflicts = conflicts.filter((c) => !c.advisory && !rescheduled.includes(c.id));

  const reschedule = (c: Conflict) => {
    const to = addDays(c.blackout.end, c.kind === "Exam booking" ? 3 : 2);
    setRescheduled((list) => [...list, c.id]);
    toast({
      title: c.kind === "Exam booking" ? "Learner asked to rebook" : "Rescheduled outside the blackout",
      body: `${c.title} · moved to ${formatAccaDate(to)} or later`,
    });
  };

  const pendingExamPeriods = universityCalendarEvents.filter(
    (e) => e.universityId === uniId && e.kind === "university-exam" && e.endDate && daysBetween(e.date, e.endDate) >= 6 && !uniBlackouts.some((b) => b.start <= e.date && b.end >= e.endDate!),
  );

  const parsedEvents = files.length ? (SAMPLE_CALENDAR[uniId] ?? []) : [];

  const semesterColumns: DataTableColumn<(typeof semesters)[number]>[] = [
    { key: "intake", header: "Intake", render: (s) => intakeById(s.intakeId)?.label ?? s.intakeId },
    { key: "label", header: "Semester", className: "font-semibold" },
    { key: "teaching", header: "Teaching", render: (s) => formatRange(s.start, s.end) },
    { key: "exams", header: "University examinations", render: (s) => formatRange(s.examStart, s.examEnd) },
    { key: "status", header: "Status", render: (s) => <StatusPill status={s.status} /> },
    {
      key: "blackout",
      header: "ACCA blackout",
      render: (s) =>
        uniBlackouts.some((b) => b.start <= s.examStart && b.end >= s.examEnd) ? (
          <StatusPill status="Covered" tone="jade" size="sm" />
        ) : s.examEnd < ACCA_TODAY ? (
          <span className="text-[12px] text-ink-3">Past</span>
        ) : (
          <GatedButton
            size="xs"
            variant="outline"
            allowed={canEdit}
            reason={reason}
            onClick={() => setAdding({ label: `University examinations · ${s.label}`, start: s.examStart, end: s.examEnd, reason: `${university.shortName} end-semester examinations` })}
          >
            <Plus className="size-3" /> Add blackout
          </GatedButton>
        ),
    },
  ];

  const draftConflicts = adding
    ? conflictsFor([
        {
          id: "draft",
          universityId: uniId,
          start: adding.start,
          end: adding.end,
          label: adding.label,
          reason: adding.reason,
          rules: BLACKOUT_RULES,
          addedBy: "",
          addedOn: ACCA_TODAY,
        },
      ]).filter((c) => !c.advisory)
    : [];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="University coordination"
        title="Academic calendars"
        sub="Upload each partner's academic calendar and add examination blackout periods, so no ACCA mocks or live classes land in university exams."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <GatedButton
            allowed={canEdit}
            reason={reason}
            onClick={() =>
              setAdding({
                label: "University examinations",
                start: pendingExamPeriods[0]?.date ?? "2027-04-19",
                end: pendingExamPeriods[0]?.endDate ?? "2027-05-08",
                reason: `${university.shortName} examinations`,
              })
            }
          >
            <Plus className="size-4" /> Add examination blackout period
          </GatedButton>
        }
      />

      <UniversityPicker
        value={uniId}
        onChange={(id) => {
          setUniId(id);
          setFiles([]);
          setDropKey((k) => k + 1);
          setDay(null);
        }}
      />
      <UniversityStrip university={university} />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Next university examinations"
          value={nextBlackout ? formatRange(nextBlackout.start, nextBlackout.end) : "Not set"}
          icon={<CalendarX2 />}
          sub={nextBlackout ? `ACCA blackout starts in ${daysBetween(ACCA_TODAY, nextBlackout.start)} days` : "No blackout added yet"}
        />
        <KpiTile label="Blackout periods" value={uniBlackouts.length} tone="rose" icon={<Ban />} sub="No ACCA mocks or classes" />
        <KpiTile label="Conflicts to resolve" value={openConflicts.length} tone={openConflicts.length ? "amber" : "jade"} icon={<AlertTriangle />} sub="Inside a blackout" />
        <KpiTile label="Calendar uploads" value={uniUploads.length} icon={<CalendarRange />} sub={uniUploads[0] ? `last ${formatAccaDate(uniUploads[0].uploadedOn)}` : "None yet"} />
      </KpiRow>

      {pendingExamPeriods.length ? (
        <Note tone="amber" icon={<AlertTriangle />}>
          <span className="font-semibold">{pendingExamPeriods[0].title}</span> ({formatRange(pendingExamPeriods[0].date, pendingExamPeriods[0].endDate!)}) is on the
          university calendar but is not yet an ACCA blackout period.{" "}
          <button
            type="button"
            disabled={!canEdit}
            title={canEdit ? undefined : reason}
            onClick={() =>
              setAdding({
                label: pendingExamPeriods[0].title.replace(/\s*\(.*\)$/, ""),
                start: pendingExamPeriods[0].date,
                end: pendingExamPeriods[0].endDate!,
                reason: `${university.shortName} examinations`,
              })
            }
            className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Add it as a blackout
          </button>
        </Note>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <MonthCalendar
          month={month}
          onMonthChange={(m) => {
            setMonth(m);
            setDay(null);
          }}
          events={events}
          blackout={ranges}
          selected={day}
          onSelectDay={(d) => setDay((cur) => (cur === d ? null : d))}
        />
        <Card className="min-w-0 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="text-[14.5px] font-semibold text-ink">{day ? formatCalendarDate(day, "long") : "This month"}</h3>
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
            blackout={ranges}
            empty="Nothing on the calendar."
          />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Add examination blackout periods"
            sub="During a blackout no ACCA mocks or live classes are scheduled and exam bookings are warned."
          />
          <ul className="divide-y divide-line border-t border-line">
            {uniBlackouts.length ? (
              uniBlackouts.map((b) => (
                <li key={b.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">{b.label}</span>
                    <span className="block text-[12.5px] text-ink-2">
                      {formatRange(b.start, b.end)} · {plural(daysBetween(b.start, b.end) + 1, "day")}
                    </span>
                    <span className="block text-[12px] text-ink-3">
                      Added by {staffName(b.addedBy) || persona.name} on {formatAccaDate(b.addedOn)} · {plural(b.rules.length, "rule")}
                    </span>
                  </span>
                  <GatedButton
                    size="xs"
                    variant="ghost"
                    allowed={canEdit}
                    reason={reason}
                    onClick={() => {
                      setBlackouts((list) => list.filter((x) => x.id !== b.id));
                      toast({ title: "Blackout period removed", body: `${b.label} · ${formatRange(b.start, b.end)}`, tone: "warning" });
                    }}
                  >
                    <Trash2 className="size-3.5" /> Remove
                  </GatedButton>
                </li>
              ))
            ) : (
              <li className="px-5 py-6 text-center text-[13px] text-ink-3">No blackout periods for {university.shortName} yet.</li>
            )}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Conflicts inside blackout periods"
            sub={`${plural(openConflicts.length, "item")} to reschedule for ${university.shortName}`}
            action={
              openConflicts.length > 1 ? (
                <GatedButton
                  size="xs"
                  variant="outline"
                  allowed={canEdit}
                  reason={reason}
                  onClick={() => {
                    setRescheduled((list) => [...list, ...openConflicts.map((c) => c.id)]);
                    toast({ title: `${plural(openConflicts.length, "conflict")} rescheduled`, body: "Moved outside the blackout. Learners and faculty are notified." });
                  }}
                >
                  Reschedule all
                </GatedButton>
              ) : null
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {conflicts.length ? (
              conflicts.map((c) => {
                const done = rescheduled.includes(c.id);
                return (
                  <li key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusPill status={c.kind} tone={c.advisory ? "info" : "rose"} size="sm" />
                        <span className="text-[12px] text-ink-3">{formatAccaDate(c.date)}</span>
                      </span>
                      <span className="mt-1 block text-[13.5px] font-semibold text-ink">{c.title}</span>
                      <span className="block text-[12px] text-ink-3">
                        {c.detail} · {c.blackout.label}
                      </span>
                    </span>
                    {c.advisory ? (
                      <GatedButton
                        size="xs"
                        variant="outline"
                        allowed={canEdit}
                        reason={reason}
                        onClick={() =>
                          toast({
                            title: "Blackout warning sent",
                            body: `${university.shortName} learners are told not to book ${c.title.replace(" ACCA exams overlap the blackout", "")} exams inside university examinations.`,
                            tone: "info",
                          })
                        }
                      >
                        Warn learners
                      </GatedButton>
                    ) : done ? (
                      <StatusPill status="Rescheduled" tone="jade" />
                    ) : (
                      <GatedButton size="xs" variant="secondary" allowed={canEdit} reason={reason} onClick={() => reschedule(c)}>
                        Reschedule
                      </GatedButton>
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-5 py-6 text-center text-[13px] text-ink-3">Nothing scheduled inside a blackout period.</li>
            )}
          </ul>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <CardHeader title="Upload university academic calendars" sub="PDF or spreadsheet from the university registrar." />
          <div className="space-y-3 px-5 pb-5">
            <FileDrop
              key={`${uniId}-${dropKey}`}
              label="Upload academic calendar"
              accept=".pdf,.xlsx,.csv,.ics"
              multiple={false}
              disabled={!canEdit}
              disabledReason={reason}
              hint="Semester dates, holidays and examination periods are read from the file."
              onFiles={(all) => setFiles(all)}
            />
            {parsedEvents.length ? (
              <div className="space-y-2">
                <MiniLabel>Detected in {files[0]}</MiniLabel>
                <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line">
                  {parsedEvents.map((e) => (
                    <li key={`${e.date}-${e.title}`} className="px-3 py-2">
                      <span className="block text-[13px] font-semibold text-ink">{e.title}</span>
                      <span className="block text-[12px] text-ink-3">
                        {e.endDate ? formatRange(e.date, e.endDate) : formatAccaDate(e.date)} · {KIND_LABEL[e.kind]}
                      </span>
                    </li>
                  ))}
                </ul>
                <GatedButton
                  size="sm"
                  className="w-full"
                  allowed={canEdit}
                  reason={reason}
                  onClick={() => {
                    setAddedEvents((list) => [
                      ...list,
                      ...parsedEvents.map((e, i) => ({
                        id: `uc-new-${uniId}-${list.length + i}`,
                        universityId: uniId,
                        date: e.date,
                        endDate: e.endDate,
                        title: e.title,
                        kind: e.kind as DataCalendarEvent["kind"],
                        tone: (e.kind === "university-exam" ? "amber" : e.kind === "holiday" ? "neutral" : "jade") as DataCalendarEvent["tone"],
                      })),
                    ]);
                    setUploads((list) => [
                      { id: `cu-new-${list.length}`, universityId: uniId, fileName: files[0], uploadedBy: persona.staffId ?? "st-priya", uploadedOn: ACCA_TODAY, status: "applied", events: parsedEvents.length },
                      ...list,
                    ]);
                    toast({ title: "Academic calendar applied", body: `${plural(parsedEvents.length, "event")} added to the ${university.shortName} calendar` });
                    setMonth(parsedEvents[0].date.slice(0, 7));
                    setFiles([]);
                    setDropKey((k) => k + 1);
                  }}
                >
                  <FileUp className="size-4" /> Apply {plural(parsedEvents.length, "event")} to the calendar
                </GatedButton>
              </div>
            ) : null}
            {uniUploads.length ? (
              <div className="space-y-2 pt-1">
                <MiniLabel>Previous uploads</MiniLabel>
                <ul className="space-y-2">
                  {uniUploads.map((u) => (
                    <li key={u.id} className="flex items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[12px] font-semibold text-ink">{u.fileName}</span>
                        <span className="block text-[12px] text-ink-3">
                          {staffName(u.uploadedBy)} · {formatAccaDate(u.uploadedOn)} · {plural(u.events, "event")}
                        </span>
                      </span>
                      <StatusPill status={u.status} size="sm" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Card>

        <div className="min-w-0">
          <MiniLabel className="mb-2.5">Semester dates</MiniLabel>
          <DataTable caption={`${university.name} semester dates`} rows={uniSemesters} columns={semesterColumns} getRowId={(s) => s.id} dense />
        </div>
      </div>

      <FormDrawer
        open={adding !== null}
        onClose={() => setAdding(null)}
        title="Add examination blackout period"
        sub={university.name}
        submitLabel="Add blackout period"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="Learners and faculty in affected cohorts are notified."
        onSubmit={(data) => {
          if (!adding) return;
          const start = String(data.get("start") || "");
          const end = String(data.get("end") || "");
          if (!start || !end || end < start) {
            toast({ title: "The end date must be on or after the start date", tone: "warning" });
            return;
          }
          const rules = data.getAll("rules").map(String);
          const bo: BlackoutPeriod = {
            id: `bo-new-${uniId}-${blackouts.length}`,
            universityId: uniId as BlackoutPeriod["universityId"],
            start,
            end,
            label: String(data.get("label") ?? "").trim() || "University examinations",
            reason: String(data.get("reason") ?? "").trim() || `${university.shortName} examinations`,
            rules: rules.length ? rules : BLACKOUT_RULES,
            addedBy: persona.staffId ?? "st-priya",
            addedOn: ACCA_TODAY,
          };
          setBlackouts((list) => [...list, bo]);
          setMonth(start.slice(0, 7));
          setDay(null);
          const found = conflictsFor([bo]).filter((c) => !c.advisory).length;
          toast({
            title: "Examination blackout period added",
            body: `${bo.label} · ${formatRange(start, end)}${found ? ` · ${plural(found, "conflict")} to reschedule` : " · no conflicts"}`,
            tone: found ? "warning" : "success",
          });
          setAdding(null);
        }}
      >
        {adding ? (
          <>
            <Field label="Label">
              <Input key={`l-${adding.start}`} name="label" required defaultValue={adding.label} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">
                <Input
                  type="date"
                  name="start"
                  value={adding.start}
                  onChange={(e) => setAdding({ ...adding, start: e.target.value })}
                  required
                />
              </Field>
              <Field label="Ends">
                <Input type="date" name="end" value={adding.end} min={adding.start} onChange={(e) => setAdding({ ...adding, end: e.target.value })} required />
              </Field>
            </div>
            <Field label="Reason">
              <Input key={`r-${adding.start}`} name="reason" defaultValue={adding.reason} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Rules during the blackout</legend>
              <div className="grid gap-2">
                {BLACKOUT_RULES.map((r) => (
                  <Checkbox key={r} name="rules" value={r} defaultChecked label={r} />
                ))}
              </div>
            </fieldset>
            {adding.start && adding.end && adding.end >= adding.start ? (
              draftConflicts.length ? (
                <Note tone="amber" icon={<AlertTriangle />}>
                  {plural(draftConflicts.length, "item")} already fall inside these dates:{" "}
                  {draftConflicts
                    .slice(0, 4)
                    .map((c) => c.title)
                    .join("; ")}
                  {draftConflicts.length > 4 ? ` and ${draftConflicts.length - 4} more` : ""}. They will appear in the conflicts list.
                </Note>
              ) : (
                <Note tone="jade">No ACCA classes, mocks or exam bookings fall inside these dates.</Note>
              )
            ) : null}
          </>
        ) : null}
      </FormDrawer>
    </div>
  );
}
