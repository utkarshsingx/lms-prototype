"use client";

import { useMemo, useState } from "react";
import { CalendarRange, ChevronDown, Download, Layers, MapPin, UsersRound } from "lucide-react";
import {
  ACCA_TODAY,
  cohortsForUniversity,
  examPeriods,
  formatAccaDate,
  formatTime,
  intakeById,
  paperName,
  semesters as allSemesters,
  staffName,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Segmented } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Drawer } from "@/components/ui/modal";
import { BarChart } from "@/components/ui/charts";
import { ScoreBar } from "@/components/ui/score";
import { DataRow } from "@/components/ui/misc";
import { formatCalendarDate, formatRange } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import {
  attendanceOf,
  intakeShort,
  sectionsForUniversity,
  universityClasses,
  universityStudents,
  type SectionInfo,
} from "./data";
import { MiniLabel, plural, queueReport, UniversityHeader, useUniversityWorkspace } from "./shared";

export function UniversityCohortsPage() {
  const { uni } = useUniversityWorkspace();
  const cohorts = useMemo(() => cohortsForUniversity(uni.id), [uni.id]);
  const sections = useMemo(() => sectionsForUniversity(uni.id), [uni.id]);
  const classes = useMemo(() => universityClasses(uni.id), [uni.id]);
  const roster = useMemo(() => universityStudents(uni.id), [uni.id]);

  const intakeIds = [...new Set(cohorts.map((c) => c.intakeId ?? ""))].filter(Boolean).sort();
  const [intakeFilter, setIntakeFilter] = useState("all");
  const [collapsed, setCollapsed] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<SectionInfo | null>(null);

  const shownIntakes = intakeFilter === "all" ? intakeIds : intakeIds.filter((id) => id === intakeFilter);
  const seats = cohorts.reduce((s, c) => s + c.capacity, 0);
  const filled = cohorts.reduce((s, c) => s + c.size, 0);
  const overallAttendance = attendanceOf(classes);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <UniversityHeader
        section="Students"
        title="Intakes & cohorts"
        sub="View intakes, batches and cohorts: every intake's ACCA cohorts and sections with sizes, faculty, mentor, schedule and attendance."
        actions={
          <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-intakes-cohorts.csv`, `${cohorts.length} cohorts · ${sections.length} sections`)}>
            <Download className="size-4" />
            Export structure
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Intakes" value={intakeIds.length} icon={<CalendarRange />} sub={intakeIds.map((id) => intakeShort(id)).join(" · ")} />
        <KpiTile label="Active cohorts" value={cohorts.filter((c) => c.status === "running").length} icon={<Layers />} tone="info" sub={uni.programmeName} />
        <KpiTile label="Sections and batches" value={sections.length} icon={<UsersRound />} tone="violet" sub="Weekday timetables" />
        <KpiTile
          label="Seats filled"
          value={`${filled} of ${seats}`}
          tone="jade"
          sub={overallAttendance == null ? "Attendance not started" : `${overallAttendance}% attendance in ACCA sessions`}
        />
      </KpiRow>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={intakeFilter}
          onChange={setIntakeFilter}
          items={[{ id: "all", label: "All intakes" }, ...intakeIds.map((id) => ({ id, label: intakeShort(id) }))]}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="ghost" onClick={() => setCollapsed([])}>
            Expand all
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setCollapsed(cohorts.map((c) => c.id))}>
            Collapse all
          </Button>
        </div>
      </div>

      <div className="space-y-5">
        {shownIntakes.map((intakeId) => {
          const intake = intakeById(intakeId);
          const intakeCohorts = cohorts.filter((c) => c.intakeId === intakeId);
          const students = intakeCohorts.reduce((s, c) => s + c.size, 0);
          return (
            <Card key={intakeId} className="min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-inv text-cta">
                    <CalendarRange className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <MiniLabel>Intake</MiniLabel>
                    <h2 className="font-display text-[19px] leading-tight font-bold tracking-[-0.02em] text-ink">
                      {intake?.label ?? intakeShort(intakeId)}
                    </h2>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-3">
                  <span>Started {intake ? formatAccaDate(intake.start) : ""}</span>
                  <span>
                    <span className="font-semibold text-ink tnum">{students}</span> {uni.shortName} students
                  </span>
                  <StatusPill status={intake?.status ?? "active"} />
                </div>
              </div>

              <ul className="space-y-4 p-4 sm:p-5">
                {intakeCohorts.map((c) => {
                  const open = !collapsed.includes(c.id);
                  const cohortClasses = classes.filter((x) => x.cohortId === c.id);
                  const att = attendanceOf(cohortClasses);
                  const sem = allSemesters.find((s) => s.universityId === uni.id && s.intakeId === intakeId && s.number === c.semester);
                  const exam = sem ? examPeriods.find((p) => p.universityId === uni.id && p.start === sem.examStart) : undefined;
                  const faculty = c.facultyIds.map((id) => staffName(id));
                  return (
                    <li key={c.id} className="rounded-[16px] border border-line">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setCollapsed((list) => (open ? [...list, c.id] : list.filter((x) => x !== c.id)))}
                        className="flex w-full items-start gap-3 rounded-[16px] px-4 py-3.5 text-left transition-colors hover:bg-cta-soft"
                      >
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[9px] bg-info-soft text-info">
                          <Layers className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Cohort</span>
                          <span className="block text-[15px] font-bold text-ink">{c.name}</span>
                          <span className="mt-1 block text-[12.5px] text-ink-3">
                            {c.papers.map((p) => `${p} ${paperName(p)}`).join(" · ")} · {c.schedule} · {c.delivery}
                          </span>
                        </span>
                        <span className="hidden shrink-0 items-center gap-2 sm:flex">
                          <StatusPill status={c.status} />
                        </span>
                        <ChevronDown aria-hidden className={cn("mt-1 size-4 shrink-0 text-ink-3 transition-transform", open ? "rotate-180" : "")} />
                      </button>

                      {open ? (
                        <div className="border-t border-line px-4 pt-3.5 pb-4">
                          <dl className="grid grid-cols-2 gap-x-5 gap-y-3 md:grid-cols-4">
                            <div className="min-w-0">
                              <dt className="text-[11.5px] text-ink-3">Size</dt>
                              <dd className="mt-0.5 text-[13.5px] font-semibold text-ink tnum">
                                {c.size} of {c.capacity} seats
                              </dd>
                              <Progress value={(c.size / c.capacity) * 100} tone="brand" height={4} className="mt-1.5" />
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[11.5px] text-ink-3">Attendance</dt>
                              <dd className="mt-0.5 text-[13.5px] font-semibold text-ink tnum">{att == null ? "Not started" : `${att}%`}</dd>
                              <dd className="text-[11.5px] text-ink-3">{plural(cohortClasses.filter((x) => x.attendance?.marked).length, "class", "classes")} marked</dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[11.5px] text-ink-3">Faculty</dt>
                              <dd className="mt-1 flex min-w-0 items-center gap-2">
                                <AvatarStack names={faculty} size="xs" />
                                <span className="min-w-0 truncate text-[13px] font-semibold text-ink">{faculty.join(", ")}</span>
                              </dd>
                            </div>
                            <div className="min-w-0">
                              <dt className="text-[11.5px] text-ink-3">Mentor</dt>
                              <dd className="mt-1 flex min-w-0 items-center gap-2">
                                <Avatar name={staffName(c.mentorId)} size="xs" />
                                <span className="min-w-0 truncate text-[13px] font-semibold text-ink">{staffName(c.mentorId)}</span>
                              </dd>
                            </div>
                          </dl>
                          <p className="mt-3 text-[12.5px] text-ink-3">
                            Semester {c.semester}: {formatRange(c.startDate, c.endDate)}
                            {exam ? ` · university examinations ${formatRange(exam.start, exam.end)} (ACCA blackout)` : ""}
                          </p>

                          <MiniLabel className="mt-4 mb-2">Sections and batches</MiniLabel>
                          <ul className="ml-2 space-y-2 border-l-2 border-line-strong pl-4">
                            {sections
                              .filter((s) => s.cohortId === c.id)
                              .map((s) => {
                                const secClasses = classes.filter((x) => x.sectionId === s.id);
                                const secAtt = attendanceOf(secClasses);
                                const room = [...secClasses].reverse().find((x) => x.room)?.room;
                                const next = secClasses.find((x) => x.status === "today" || x.status === "upcoming");
                                return (
                                  <li key={s.id} className="relative">
                                    <span aria-hidden className="absolute top-5 -left-4 h-0.5 w-3 bg-line-strong" />
                                    <button
                                      type="button"
                                      onClick={() => setOpenSection(s)}
                                      className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[12px] border border-line bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-cta-soft"
                                    >
                                      <span className="min-w-0 flex-1 basis-56">
                                        <span className="flex items-center gap-2 text-[13.5px] font-semibold text-ink">
                                          {s.name}
                                          <StatusPill status={s.kind} tone="neutral" size="sm" dot={false}>
                                            {s.kind === "section" ? "Section" : "Batch"}
                                          </StatusPill>
                                        </span>
                                        <span className="mt-0.5 block truncate text-[12px] text-ink-3">{s.schedule}</span>
                                      </span>
                                      <span className="w-20 shrink-0 text-[12.5px] text-ink-2">
                                        <span className="font-semibold text-ink tnum">{s.size}</span> students
                                      </span>
                                      <span className="w-32 min-w-0 shrink-0 truncate text-[12.5px] text-ink-2">{staffName(s.facultyId)}</span>
                                      <span className="flex w-40 min-w-0 shrink-0 items-center gap-1 text-[12.5px] text-ink-3">
                                        <MapPin aria-hidden className="size-3.5 shrink-0" />
                                        <span className="truncate">{room ?? "Online"}</span>
                                      </span>
                                      <span className="w-24 shrink-0">
                                        {secAtt == null ? (
                                          <span className="text-[12.5px] text-ink-3">Not started</span>
                                        ) : (
                                          <ScoreBar value={secAtt} height={5} label="Attendance" showValue />
                                        )}
                                      </span>
                                      <span className="w-28 shrink-0 text-[12px] text-ink-3">
                                        {next ? `Next ${formatCalendarDate(next.start.slice(0, 10), "day")}` : "No class booked"}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                          </ul>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>

      <SectionDrawer section={openSection} onClose={() => setOpenSection(null)} classes={classes} roster={roster} />
    </div>
  );
}

function SectionDrawer({
  section,
  onClose,
  classes,
  roster,
}: {
  section: SectionInfo | null;
  onClose: () => void;
  classes: ReturnType<typeof universityClasses>;
  roster: ReturnType<typeof universityStudents>;
}) {
  const secClasses = section ? classes.filter((c) => c.sectionId === section.id) : [];
  const marked = secClasses.filter((c) => c.attendance?.marked).slice(-8);
  const upcoming = secClasses.filter((c) => c.start.slice(0, 10) >= ACCA_TODAY).slice(0, 5);
  const members = section ? roster.filter((s) => s.sectionId === section.id) : [];
  const att = attendanceOf(secClasses);

  return (
    <Drawer
      open={section != null}
      onClose={onClose}
      width="w-full max-w-xl"
      title={section?.label ?? "Section"}
      sub={section ? `${section.schedule} · ${staffName(section.facultyId)}` : undefined}
      footer={
        section ? (
          <Button variant="outline" onClick={() => queueReport(`section-roster-${section.id}.csv`, section.label)}>
            <Download className="size-4" />
            Export section roster
          </Button>
        ) : null
      }
    >
      {section ? (
        <div className="space-y-5 px-5 py-4">
          <dl className="rounded-[14px] border border-line px-4 py-1">
            <DataRow label="Students">{section.size}</DataRow>
            <DataRow label="Cohort">{section.cohort.name}</DataRow>
            <DataRow label="Papers">{section.cohort.papers.join(", ")}</DataRow>
            <DataRow label="Mentor">{staffName(section.cohort.mentorId)}</DataRow>
            <DataRow label="Attendance in ACCA sessions">{att == null ? "Not started" : `${att}%`}</DataRow>
          </dl>

          <div>
            <MiniLabel className="mb-3">Attendance by class</MiniLabel>
            {marked.length ? (
              <BarChart
                data={marked.map((c) => c.attendance?.pct ?? 0)}
                labels={marked.map((c) => formatCalendarDate(c.start.slice(0, 10), "short").slice(0, 6))}
                tone="info"
                height={110}
              />
            ) : (
              <p className="text-[13px] text-ink-3">No classes marked yet.</p>
            )}
          </div>

          <div>
            <MiniLabel className="mb-2">Upcoming classes</MiniLabel>
            <ul className="divide-y divide-line rounded-[14px] border border-line">
              {upcoming.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-ink">
                      <span className="font-mono">{c.paper}</span> · {c.title}
                    </span>
                    <span className="block text-[12px] text-ink-3">
                      {formatCalendarDate(c.start.slice(0, 10), "day")} · {formatTime(c.start)} · {c.room ?? "Online"}
                    </span>
                    {c.note ? <span className="block text-[12px] text-amber">{c.note}</span> : null}
                  </span>
                  <StatusPill status={c.status} size="sm" />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <MiniLabel className="mb-2">Learner records in this section</MiniLabel>
            <ul className="divide-y divide-line rounded-[14px] border border-line">
              {members.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-3.5 py-2.5">
                  <Avatar name={s.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{s.name}</span>
                    <span className="block text-[12px] text-ink-3">
                      {s.currentPaper ?? "No paper"} · attendance {s.attendance.total ? `${s.attendance.pct}%` : "not started"}
                    </span>
                  </span>
                  <ScoreBar value={s.readiness.overall} className="w-24 shrink-0" height={5} label="Readiness" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
