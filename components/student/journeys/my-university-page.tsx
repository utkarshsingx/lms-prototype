"use client";

import { useMemo, useState } from "react";
import {
  Ban,
  BookOpen,
  Check,
  Copy,
  IdCard,
  Info,
  Mail,
  MapPin,
  Megaphone,
  MessagesSquare,
  Pin,
  TriangleAlert,
  UsersRound,
} from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  announcementsForUniversity,
  blackoutOn,
  blackoutRanges,
  calendarForUniversity,
  classesForStudent,
  cohortById,
  daysBetween,
  doubtSessions,
  formatAccaDate,
  formatTime,
  intakeById,
  paperName,
  programmeCalendarEvents,
  sectionById,
  semesters,
  staffName,
  studentsInCohort,
  subjectsForUniversity,
  universityById,
  type Student,
  type University,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Progress } from "@/components/ui/progress";
import { AvatarStack } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { AgendaList, MonthCalendar, formatCalendarDate, formatRange, type CalendarEvent as UiEvent } from "@/components/ui/calendar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, UniversityMark, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";

type Layer = "university" | "classes" | "assessments" | "deadlines";
type CalEvent = UiEvent & { layer: Layer };

const LAYERS: { id: Layer; label: string; tone: StatusTone }[] = [
  { id: "university", label: "University calendar", tone: "amber" },
  { id: "classes", label: "ACCA classes", tone: "info" },
  { id: "assessments", label: "Mocks and exams", tone: "violet" },
  { id: "deadlines", label: "Deadlines", tone: "rose" },
];

const MONTHS = [
  { id: "2026-09", label: "Sep" },
  { id: "2026-10", label: "Oct" },
  { id: "2026-11", label: "Nov" },
  { id: "2026-12", label: "Dec" },
  { id: "2027-01", label: "Jan" },
];

/** Monday-based teaching weeks: Semester 3 teaching starts in the week of Mon 13 Jul. */
const TEACHING_WEEK_ZERO = "2026-07-13";
/** 19 calendar weeks less the Diwali break week. */
const TEACHING_WEEKS = 18;

function weekday(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function inRange(iso: string, start: string, end: string) {
  return iso >= start && iso <= end;
}

function buildEvents(s: Student, u: University): CalEvent[] {
  const out: CalEvent[] = [];
  const uniEvents = calendarForUniversity(u.id);
  const cia = uniEvents.filter((e) => e.kind === "university-exam" && e.endDate);
  const holidays = uniEvents.filter((e) => e.kind === "holiday");

  // University calendar, multi-day entries shown on each day. The examination blackout is drawn as a band.
  for (const e of uniEvents) {
    if (e.kind === "blackout") continue;
    const last = e.endDate ?? e.date;
    for (let d = e.date; d <= last; d = addDays(d, 1)) {
      out.push({ id: `${e.id}-${d}`, date: d, title: e.title, tone: e.tone, kind: "University calendar", layer: "university" });
    }
  }

  // ACCA classes: the live timetable to 27 Sep, then the section timetable to the end of teaching.
  const recorded = classesForStudent(s.id);
  for (const c of recorded) {
    const date = c.start.slice(0, 10);
    const ciaWeek = cia.find((x) => inRange(date, x.date, x.endDate!));
    out.push({
      id: c.id,
      date,
      title: c.status === "cancelled" ? `${c.paper} class moved to recording` : `${c.paper} live class · ${c.title}`,
      tone: c.status === "cancelled" ? "neutral" : "info",
      kind: c.status === "cancelled" ? `ACCA class · ${ciaWeek ? ciaWeek.title : "cancelled"}` : "ACCA live class",
      time: `${formatTime(c.start)} IST`,
      layer: "classes",
    });
  }
  const section = sectionById(s.sectionId);
  const lastRecorded = recorded.reduce((m, c) => (c.start.slice(0, 10) > m ? c.start.slice(0, 10) : m), ACCA_TODAY);
  const semester = semesters.find((x) => x.universityId === u.id && x.intakeId === s.intakeId && x.status === "in-progress");
  const teachingEnd = semester?.end ?? "2026-11-20";
  const slots = section?.id.endsWith("-a")
    ? [
        { dow: 1, paper: "LW", time: "14:00" },
        { dow: 3, paper: "LW", time: "14:00" },
        { dow: 5, paper: "FA", time: "10:00" },
      ]
    : [
        { dow: 2, paper: "FA", time: "14:00" },
        { dow: 4, paper: "FA", time: "14:00" },
        { dow: 5, paper: "LW", time: "14:00" },
      ];
  for (let d = addDays(lastRecorded, 1); d <= teachingEnd; d = addDays(d, 1)) {
    const slot = slots.find((x) => x.dow === weekday(d));
    if (!slot) continue;
    if (holidays.some((h) => inRange(d, h.date, h.endDate ?? h.date))) continue;
    const ciaWeek = cia.find((x) => inRange(d, x.date, x.endDate!));
    out.push({
      id: `gen-${slot.paper}-${d}`,
      date: d,
      title: ciaWeek ? `${slot.paper} class moved to recording` : `${slot.paper} live class · Section ${s.section ?? "A"}`,
      tone: ciaWeek ? "neutral" : "info",
      kind: ciaWeek ? `ACCA class · ${ciaWeek.title}` : "ACCA live class",
      time: `${slot.time} IST`,
      layer: "classes",
    });
  }
  for (const d of doubtSessions.filter((x) => s.cohortIds.includes(x.cohortId))) {
    out.push({ id: d.id, date: d.start.slice(0, 10), title: d.title, tone: "info", kind: "Doubt-clearing", time: `${formatTime(d.start)} IST`, layer: "classes" });
  }

  for (const m of s.mocks) {
    out.push({
      id: m.id,
      date: m.date,
      title: m.score !== null ? `${m.title} · ${m.score}%` : m.title,
      tone: "violet",
      kind: m.status === "scheduled" ? "Mock exam · scheduled" : "Mock exam · completed",
      layer: "assessments",
    });
  }
  for (const b of s.examBookings) {
    out.push({
      id: b.id,
      date: b.date,
      title: `${b.paper} ${b.entryWindow === "on-demand" ? "on-demand CBE" : "session CBE"} · ${b.status === "booked" ? "booked" : b.status === "sat" ? "sat" : "planned"}`,
      tone: b.status === "booked" ? "cta" : b.status === "sat" ? "jade" : "neutral",
      kind: `ACCA exam · ${b.centre}`,
      layer: "assessments",
    });
  }
  // ACCA deadlines for this learner: cohort deadlines and the annual subscription (mocks and blackouts are shown above).
  const deadlines = programmeCalendarEvents.filter(
    (e) => e.kind === "subscription" || (e.cohortId && s.cohortIds.includes(e.cohortId) && e.kind !== "mock" && e.kind !== "blackout"),
  );
  for (const e of deadlines) {
    out.push({ id: e.id, date: e.date, title: e.title, tone: e.tone, kind: "ACCA deadline", layer: "deadlines" });
  }
  return out;
}

export function MyUniversityPage() {
  const student = useStudentRecord();
  const university = universityById(student.universityId);
  return (
    <StudentTypeGate type="undergraduate" eyebrow="Your university" title="My university">
      {university ? <MyUniversityView key={student.id} student={student} university={university} /> : null}
    </StudentTypeGate>
  );
}

export function MyUniversityView({ student, university }: { student: Student; university: University }) {
  const cohort = cohortById(student.cohortIds.find((id) => cohortById(id)?.type === "university"));
  const section = sectionById(student.sectionId);
  const intake = intakeById(student.intakeId);
  const semester = semesters.find((x) => x.universityId === university.id && x.intakeId === student.intakeId && x.status === "in-progress");
  const subjects = subjectsForUniversity(university.id).filter((x) => x.semester === student.semester);
  const classmates = studentsInCohort(cohort?.id ?? "").filter((x) => x.section === student.section);
  const rollNo = `${university.workspace.studentIdFormat.split("-")[0]}-${intake?.start.slice(0, 4) ?? "2025"}-${(student.accaId ?? "0000").slice(-4)}`;
  const blackouts = blackoutRanges(university.id);
  const nextBlackout = blackouts.find((b) => b.end >= ACCA_TODAY);

  const events = useMemo(() => buildEvents(student, university), [student, university]);
  const [layers, setLayers] = useState<Layer[]>(["university", "classes", "assessments", "deadlines"]);
  const [month, setMonth] = useState("2026-11");
  const [day, setDay] = useState<string | null>("2026-11-18");
  const visible = events.filter((e) => layers.includes(e.layer));

  const announcements = useMemo(
    () =>
      announcementsForUniversity(university.id)
        .filter((a) => a.status === "published")
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.publishedOn.localeCompare(a.publishedOn)),
    [university.id],
  );
  const [read, setRead] = useState<string[]>(() => announcements.filter((a) => a.publishedOn < "2026-09-10").map((a) => a.id));
  const [category, setCategory] = useState("all");
  const shownAnnouncements = announcements.filter((a) => category === "all" || a.category === category);
  const unread = announcements.filter((a) => !read.includes(a.id)).length;

  const week = semester ? Math.min(TEACHING_WEEKS, Math.floor(daysBetween(TEACHING_WEEK_ZERO, ACCA_TODAY) / 7) + 1) : 0;
  const teachingDaysLeft = semester ? daysBetween(ACCA_TODAY, semester.end) : 0;
  const nextClass = classesForStudent(student.id).find((c) => c.status === "today" || c.status === "upcoming");

  // Alignment checks, computed from the events above.
  const faBooking = student.examBookings.find((b) => b.paper === student.currentPaper && b.status === "booked");
  const lwBooking = student.examBookings.find((b) => b.paper === "LW" && b.status === "planned");
  const accaInBlackout = events.filter((e) => (e.layer === "classes" || e.layer === "assessments") && e.tone !== "neutral" && blackoutOn(university.id, e.date));
  const ciaMoved = events.filter((e) => e.layer === "classes" && e.tone === "neutral");
  const uniEvents = calendarForUniversity(university.id);
  const cia2 = uniEvents.find((e) => e.id.endsWith("-06"));
  const mockAfterCia = student.mocks.find((m) => m.status === "scheduled" && cia2 && daysBetween(cia2.endDate ?? cia2.date, m.date) >= 0 && daysBetween(cia2.endDate ?? cia2.date, m.date) <= 2);
  const checks: { id: string; ok: boolean; warn?: boolean; title: string; detail: string }[] = [
    ...(faBooking
      ? [
          {
            id: "exam",
            ok: !blackoutOn(university.id, faBooking.date),
            title: `${faBooking.paper} exam on ${formatAccaDate(faBooking.date)} is ${blackoutOn(university.id, faBooking.date) ? "inside" : "before"} university examinations`,
            detail: nextBlackout ? `Examinations run ${formatRange(nextBlackout.start, nextBlackout.end)}. ${daysBetween(faBooking.date, nextBlackout.start)} days between your exam and the first university paper.` : "",
          },
        ]
      : []),
    {
      id: "blackout",
      ok: accaInBlackout.length === 0,
      title: accaInBlackout.length ? `${accaInBlackout.length} ACCA items fall inside the blackout` : "No ACCA classes or mocks inside the examination blackout",
      detail: "ACCA live classes and mocks pause during university examinations. Recordings stay available.",
    },
    {
      id: "cia",
      ok: true,
      warn: true,
      title: `${ciaMoved.length} ACCA classes move to recordings in internal assessment weeks`,
      detail: "Watch the recordings the same week. A live doubt-clearing hour runs on Saturday 26 September.",
    },
    ...(mockAfterCia && cia2
      ? [
          {
            id: "mock",
            ok: true,
            warn: true,
            title: `${mockAfterCia.title} on ${formatAccaDate(mockAfterCia.date)} is the day after ${cia2.title.toLowerCase()} ends`,
            detail: "Plan FA revision before the assessment week rather than during it.",
          },
        ]
      : []),
    ...(lwBooking
      ? [
          {
            id: "lw",
            ok: !blackoutOn(university.id, lwBooking.date),
            title: `LW exam planned for ${formatAccaDate(lwBooking.date)}, after the winter break`,
            detail: "Clear of both university examination periods. Book it once FA is done.",
          },
        ]
      : []),
  ];

  const toggleLayer = (id: Layer) => setLayers((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your university"
        title="My university"
        sub={`Your ${university.name} identity, the current semester, how the university calendar lines up with ACCA, and announcements from the university.`}
        actions={
          <LinkButton href="/discussions?space=cohort" variant="outline">
            <MessagesSquare aria-hidden className="size-4" />
            Cohort community
          </LinkButton>
        }
      />

      {/* University and cohort identity */}
      <section aria-labelledby="identity-title" className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
        <div className="relative isolate overflow-hidden px-5 py-6 text-ink-inv sm:px-7" style={{ backgroundColor: university.branding.primary }}>
          <span aria-hidden className="absolute -top-20 -right-10 -z-10 size-64 rounded-full bg-ink-inv/10" />
          <span aria-hidden className="absolute -bottom-24 right-40 -z-10 size-48 rounded-full bg-ink-inv/5" />
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <UniversityMark university={university} size="lg" className="ring-ink-inv/60" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/75 uppercase">University and cohort identity</p>
                <h2 id="identity-title" className="mt-1 font-display text-[clamp(1.5rem,1.2rem+1.2vw,2.2rem)] leading-tight font-bold tracking-[-0.03em] text-ink-inv">
                  {university.name}
                </h2>
                <p className="text-[13.5px] text-ink-inv/80">
                  {university.programmeName} · {university.branding.tagline}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="inverse" size="sm" onClick={() => toast({ title: "ID card downloaded", body: `${student.name} · ${rollNo} · ACCA ID ${student.accaId}`, tone: "info" })}>
                <IdCard aria-hidden className="size-4" />
                Download ID card
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {[cohort?.name, section ? `${section.name}${section.room ? ` · ${section.room}` : ""}` : null, intake?.label, `Semester ${student.semester} of ${university.semesterSystem.semesters}`].filter(Boolean).map((chip) => (
              <span key={chip} className="inline-flex max-w-full items-center rounded-full border border-ink-inv/30 bg-ink-inv/10 px-3 py-1 text-[12.5px] font-semibold text-ink-inv">
                <span className="truncate">{chip}</span>
              </span>
            ))}
          </div>
        </div>
        <dl className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "University roll number", value: rollNo, mono: true, copy: rollNo },
            { label: "ACCA student ID", value: student.accaId ?? "Not registered", mono: true, copy: student.accaId ?? undefined },
            {
              label: "University record",
              value: student.verification.status === "verified" ? `Verified by ${staffName(student.verification.by)}` : "Verification pending",
              sub: student.verification.on ? formatAccaDate(student.verification.on) : undefined,
            },
            { label: "Mentor", value: staffName(student.mentorId), sub: "Academic Mentor · Universities" },
            { label: "ACCA faculty", value: cohort?.facultyIds.map((f) => staffName(f)).join(", ") ?? "", sub: cohort?.papers.map((p) => `${p} ${paperName(p)}`).join(" · ") },
            { label: "Programme Director", value: university.contact.name, sub: university.contact.email },
            { label: "Timetable", value: section?.schedule ?? cohort?.schedule ?? "", sub: cohort?.delivery },
            { label: "University support", value: university.workspace.supportEmail, sub: university.city },
          ].map((f) => (
            <div key={f.label} className="min-w-0 bg-surface px-5 py-3.5">
              <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">{f.label}</dt>
              <dd className="mt-1 flex min-w-0 items-center gap-2">
                <span className={cn("min-w-0 text-[13.5px] font-semibold break-words text-ink", f.mono && "font-mono")}>{f.value}</span>
                {f.copy ? (
                  <button
                    type="button"
                    aria-label={`Copy ${f.label}`}
                    onClick={() => {
                      try {
                        navigator.clipboard?.writeText(f.copy!).catch(() => {});
                      } catch {
                        /* clipboard blocked */
                      }
                      toast({ title: `${f.label} copied`, body: f.copy, tone: "info" });
                    }}
                    className="grid size-7 shrink-0 place-items-center rounded-[8px] text-ink-3 transition-colors hover:bg-cta-soft hover:text-ink"
                  >
                    <Copy aria-hidden className="size-3.5" />
                  </button>
                ) : null}
              </dd>
              {f.sub ? <dd className="mt-0.5 truncate text-[12px] text-ink-3">{f.sub}</dd> : null}
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Current semester */}
        {semester ? (
          <Card className="min-w-0">
            <CardHeader
              title="Current semester"
              sub={`${semester.label} · ${formatRange(semester.start, semester.end)}`}
              action={<StatusPill status="in-progress">Week {week} of {TEACHING_WEEKS}</StatusPill>}
            />
            <div className="space-y-5 px-5 pb-5">
              <div>
                <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[12.5px]">
                  <span className="text-ink-2">
                    Teaching week {week} of {TEACHING_WEEKS} · {teachingDaysLeft} days of teaching left
                  </span>
                  <span className="font-mono font-semibold text-ink tnum">{Math.round((week / TEACHING_WEEKS) * 100)}%</span>
                </div>
                <Progress value={(week / TEACHING_WEEKS) * 100} height={10} />
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-[12px] text-ink-3">
                  <span>Teaching began {formatAccaDate(semester.start)}</span>
                  <span>University examinations {formatRange(semester.examStart, semester.examEnd)}</span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {cohort?.papers.map((p) => {
                  const prog = student.papers[p];
                  const booking = student.examBookings.find((b) => b.paper === p && (b.status === "booked" || b.status === "planned"));
                  return (
                    <div key={p} className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-surface-inv font-mono text-[12px] font-bold text-cta">{p}</span>
                          <span className="truncate text-[13.5px] font-semibold text-ink">{paperName(p)}</span>
                        </span>
                        <StatusPill status={prog.status === "current" ? "exam window" : prog.status} tone={prog.status === "current" ? "cta" : undefined} size="sm">
                          {prog.status === "current" ? "Exam window" : prog.status === "in-progress" ? "Studying" : undefined}
                        </StatusPill>
                      </div>
                      <div className="mt-3 flex justify-between text-[12px] text-ink-3">
                        <span>Course progress</span>
                        <span className="font-mono text-ink tnum">{prog.progress}%</span>
                      </div>
                      <Progress value={prog.progress} className="mt-1" tone="brand" />
                      <p className="mt-2 text-[12px] text-ink-2">
                        Readiness {student.readiness.byPaper[p] ?? "not scored"} · {booking ? `exam ${booking.status === "booked" ? "booked" : "planned"} ${formatAccaDate(booking.date)}` : "exam not booked"}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div>
                <MicroLabel>University subjects this semester</MicroLabel>
                <ul className="mt-2 divide-y divide-line rounded-[var(--radius-md)] border border-line">
                  {subjects.map((sub) => (
                    <li key={sub.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold text-ink">{sub.name}</span>
                        <span className="block font-mono text-[11.5px] text-ink-3">
                          {sub.code} · {sub.credits} credits
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {sub.mappings.length ? (
                          sub.mappings.map((m) => (
                            <StatusPill key={m.paper} status={m.coverage} size="sm" dot={false} tone={m.coverage === "full" ? "jade" : m.coverage === "partial" ? "amber" : "neutral"}>
                              {m.paper} {m.areas.join(", ")} · {m.coverage === "conceptual-only" ? "conceptual" : m.coverage}
                            </StatusPill>
                          ))
                        ) : (
                          <StatusPill status="none" size="sm" dot={false}>
                            No ACCA overlap
                          </StatusPill>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[12px] text-ink-3">University subjects are taught and examined by {university.shortName}. See the overlap in detail on the semester roadmap.</p>
              </div>
            </div>
          </Card>
        ) : null}

        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <MicroLabel>{nextClass && !nextClass.start.startsWith(ACCA_TODAY) ? "Next ACCA class" : "Today"}</MicroLabel>
            {nextClass ? (
              <div className="mt-2.5">
                <p className="text-[14px] font-semibold text-ink">
                  {nextClass.paper} · {nextClass.title}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {formatCalendarDate(nextClass.start.slice(0, 10), "day")} · {formatTime(nextClass.start)} IST · {nextClass.room ?? section?.room ?? "Online"}
                </p>
                <LinkButton href="/classes" size="sm" className="mt-3">
                  Open live classes
                </LinkButton>
              </div>
            ) : (
              <p className="mt-2 text-[13px] text-ink-3">No ACCA class today.</p>
            )}
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <MicroLabel>Your cohort</MicroLabel>
              <UsersRound aria-hidden className="size-4 text-ink-3" />
            </div>
            <p className="mt-2 text-[14px] font-semibold text-ink">{cohort?.name}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              {section?.size ?? classmates.length} learners in {section?.name ?? "your section"} · {cohort?.size} in the cohort
            </p>
            <div className="mt-3 flex items-center gap-3">
              <AvatarStack names={classmates.map((c) => c.name)} max={5} />
              <span className="text-[12.5px] text-ink-2">
                {student.leaderboard ? `You are rank ${student.leaderboard.rank} of ${student.leaderboard.cohortSize}` : null}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <LinkButton href="/leaderboard" size="sm" variant="outline">
                Cohort leaderboard
              </LinkButton>
              <LinkButton href="/discussions?space=cohort" size="sm" variant="ghost">
                Cohort community
              </LinkButton>
            </div>
          </Card>
          <Card className="p-5">
            <MicroLabel>Contacts</MicroLabel>
            <ul className="mt-2.5 space-y-2 text-[12.5px] text-ink-2">
              <li className="flex items-start gap-2">
                <Mail aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                <span className="min-w-0 break-words">ACCA office: {university.workspace.supportEmail}</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                <span className="min-w-0">
                  {section?.room ?? "Commerce Block"}, {university.city}
                </span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* University academic-calendar alignment */}
      <section aria-labelledby="align-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 id="align-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              University academic-calendar alignment
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">
              The {university.shortName} calendar overlaid with your ACCA classes, mocks and exams. University examinations are an ACCA blackout: no classes or mocks are scheduled.
            </p>
          </div>
          <Segmented value={month} onChange={(m) => { setMonth(m); setDay(null); }} items={MONTHS} size="sm" />
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Calendar layers">
          {LAYERS.map((l) => {
            const on = layers.includes(l.id);
            return (
              <button
                key={l.id}
                type="button"
                aria-pressed={on}
                onClick={() => toggleLayer(l.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                  on ? "border-ink bg-surface text-ink" : "border-line bg-surface-2 text-ink-3 line-through",
                )}
              >
                <span aria-hidden className={cn("size-2.5 rounded-full", { amber: "bg-amber", info: "bg-info", violet: "bg-violet", rose: "bg-rose", jade: "bg-jade", neutral: "bg-ink-3", cta: "bg-cta" }[l.tone])} />
                {l.label}
                <span className="font-mono text-[11px] text-ink-3 tnum">{events.filter((e) => e.layer === l.id && e.date.startsWith(month)).length}</span>
              </button>
            );
          })}
          <span className="inline-flex items-center gap-2 rounded-full border border-rose/30 bg-rose-soft px-3 py-1.5 text-[12.5px] font-semibold text-rose">
            <Ban aria-hidden className="size-3.5" />
            Examination blackout
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <MonthCalendar
            month={month}
            onMonthChange={(m) => {
              setMonth(m);
              setDay(null);
            }}
            events={visible}
            blackout={blackouts}
            selected={day}
            onSelectDay={(d) => setDay((cur) => (cur === d ? null : d))}
            className="min-w-0"
          />
          <div className="min-w-0 space-y-4">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-[14.5px] font-semibold text-ink">{day ? formatCalendarDate(day, "long") : "This month"}</h3>
                {day ? (
                  <Button size="xs" variant="ghost" onClick={() => setDay(null)}>
                    Show month
                  </Button>
                ) : null}
              </div>
              <AgendaList
                events={visible}
                blackout={blackouts}
                day={day}
                from={day ? undefined : `${month}-01`}
                to={day ? undefined : `${month}-31`}
                limit={day ? undefined : 12}
                empty="Nothing on this day."
                onSelect={(e) => toast({ title: e.title, body: `${formatCalendarDate(e.date, "long")}${e.time ? ` · ${e.time}` : ""}${e.kind ? ` · ${e.kind}` : ""}`, tone: "info" })}
              />
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader title="Alignment checks" sub="Where the university calendar and your ACCA plan meet" />
          <ul className="grid gap-px border-t border-line bg-line md:grid-cols-2">
            {checks.map((c) => (
              <li key={c.id} className="flex gap-3 bg-surface px-5 py-4">
                <span
                  aria-hidden
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full",
                    !c.ok ? "bg-rose text-on-accent" : c.warn ? "bg-amber-soft text-amber" : "bg-jade text-on-accent",
                  )}
                >
                  {!c.ok ? <TriangleAlert className="size-3.5" /> : c.warn ? <Info className="size-3.5" /> : <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <div className="min-w-0">
                  <p className="text-[13.5px] font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      {/* University-specific announcements */}
      <section aria-labelledby="ann-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="ann-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              University-specific announcements
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">
              Published by {university.name} for its ACCA learners · {unread} unread
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              size="sm"
              value={category}
              onChange={setCategory}
              items={[
                { id: "all", label: "All" },
                ...[...new Set(announcements.map((a) => a.category))].map((c) => ({ id: c, label: c })),
              ]}
            />
            <Button
              size="sm"
              variant="outline"
              disabled={unread === 0}
              onClick={() => {
                setRead(announcements.map((a) => a.id));
                toast({ title: "All university announcements marked as read", tone: "neutral" });
              }}
            >
              Mark all read
            </Button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {shownAnnouncements.map((a) => {
            const isRead = read.includes(a.id);
            return (
              <Card key={a.id} className={cn("flex min-w-0 flex-col p-5", !isRead && "border-ink")}>
                <div className="flex flex-wrap items-center gap-2">
                  <UniversityMark university={university} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-semibold text-ink">{staffName(a.authorId)}</p>
                    <p className="truncate text-[12px] text-ink-3">
                      {formatAccaDate(a.publishedOn)} · {a.audienceLabel}
                    </p>
                  </div>
                  {a.pinned ? (
                    <StatusPill status="pinned" tone="cta" size="sm" dot={false}>
                      <Pin aria-hidden className="mr-0.5 inline size-3" />
                      Pinned
                    </StatusPill>
                  ) : null}
                  <StatusPill status={a.category} tone={a.category === "Exams" ? "rose" : a.category === "Careers" ? "violet" : "info"} size="sm" dot={false} />
                </div>
                <h3 className="mt-3 flex items-start gap-2 text-[15px] leading-snug font-bold text-ink">
                  {!isRead ? <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-cta-strong" /> : null}
                  {a.title}
                </h3>
                <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-2">{a.body}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                  <span className="flex items-center gap-1.5 text-[12px] text-ink-3">
                    <Megaphone aria-hidden className="size-3.5" />
                    {a.channels.map((c) => (c === "in-app" ? "In-app" : c === "whatsapp" ? "WhatsApp" : c.charAt(0).toUpperCase() + c.slice(1))).join(", ")}
                  </span>
                  <Button
                    size="xs"
                    variant={isRead ? "ghost" : "secondary"}
                    onClick={() => setRead((r) => (isRead ? r.filter((x) => x !== a.id) : [...r, a.id]))}
                  >
                    {isRead ? "Mark as unread" : "Mark as read"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="flex items-center gap-2 text-[12px] text-ink-3">
        <BookOpen aria-hidden className="size-3.5" />
        {university.name} teaches and manages B.Com subjects. This workspace maps them to ACCA; it does not deliver them.
      </p>
    </div>
  );
}
