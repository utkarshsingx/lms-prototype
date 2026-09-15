"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, CalendarOff, Clock3, Download, FileWarning, NotebookPen, UserCheck, UserX } from "lucide-react";
import {
  activityWeekLabels,
  formatAccaDate,
  formatShortDate,
  formatTime,
  paperName,
  staffName,
  type LiveClass,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { ScoreBar } from "@/components/ui/score";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { BarChart, LineChart } from "@/components/ui/charts";
import { Matrix } from "@/components/ui/matrix";
import { cn } from "@/lib/cn";
import {
  attendanceOf,
  average,
  intakeShort,
  sectionsForUniversity,
  universityClasses,
  universityStudents,
  weekStart,
  type SectionInfo,
} from "./data";
import { plural, queueReport, RecordsNote, UniversityHeader, useUniversityWorkspace } from "./shared";
import { AtRiskTab, InterventionsTab, ReadinessTab } from "./performance-tabs";

const TAB_ITEMS = [
  { id: "attendance", label: "Attendance in ACCA sessions" },
  { id: "progress", label: "Learning progress" },
  { id: "mocks", label: "Assessment and mock performance" },
  { id: "readiness", label: "ACCA readiness scores" },
  { id: "at-risk", label: "At-risk students" },
  { id: "interventions", label: "Mentor interventions" },
];

export function UniversityPerformancePage({ initialTab }: { initialTab?: string }) {
  const { uni } = useUniversityWorkspace();
  const roster = useMemo(() => universityStudents(uni.id), [uni.id]);
  const classes = useMemo(() => universityClasses(uni.id), [uni.id]);
  const sections = useMemo(() => sectionsForUniversity(uni.id), [uni.id]);

  const [tab, setTab] = useState(TAB_ITEMS.some((t) => t.id === initialTab) ? (initialTab as string) : "attendance");
  const [section, setSection] = useState("");

  const scopedRoster = section ? roster.filter((s) => s.sectionId === section) : roster;
  const scopedClasses = section ? classes.filter((c) => c.sectionId === section) : classes;
  const scopedSections = section ? sections.filter((s) => s.id === section) : sections;
  const atRiskCount = scopedRoster.filter((s) => s.risk.level !== "low").length;

  const tabs = TAB_ITEMS.map((t) => (t.id === "at-risk" ? { ...t, count: atRiskCount } : t));
  const sectionLabel = sections.find((s) => s.id === section)?.label ?? "All sections";

  return (
    <div className="mx-auto max-w-[86rem] space-y-6">
      <UniversityHeader
        section="Students"
        title="Performance"
        sub="Attendance in ACCA sessions, learning progress, assessment and mock performance, ACCA readiness scores, at-risk students and mentor interventions for your cohorts."
        actions={
          <Button
            variant="outline"
            onClick={() => queueReport(`${uni.workspace.slug}-performance-${tab}.csv`, `${TAB_ITEMS.find((t) => t.id === tab)?.label} · ${sectionLabel}`)}
          >
            <Download className="size-4" />
            Export this view
          </Button>
        }
      />

      <div className="space-y-3">
        <Tabs items={tabs} value={tab} onChange={setTab} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FilterSelect
            label="Section"
            allLabel="All sections"
            value={section}
            onChange={setSection}
            options={sections.map((s) => ({ value: s.id, label: s.label }))}
          />
          <p className="text-[12.5px] text-ink-3">
            {plural(scopedRoster.length, "learner record")} · {plural(scopedSections.length, "section")}
          </p>
        </div>
      </div>

      {tab === "attendance" ? <AttendanceTab roster={scopedRoster} classes={scopedClasses} sections={scopedSections} /> : null}
      {tab === "progress" ? <ProgressTab roster={scopedRoster} /> : null}
      {tab === "mocks" ? <MocksTab roster={scopedRoster} /> : null}
      {tab === "readiness" ? <ReadinessTab roster={scopedRoster} sections={scopedSections} /> : null}
      {tab === "at-risk" ? <AtRiskTab roster={scopedRoster} /> : null}
      {tab === "interventions" ? <InterventionsTab roster={scopedRoster} /> : null}

      <RecordsNote total={uni.headline.students} listed={roster.length} />
    </div>
  );
}

/* ------------------------------------------------------------------ attendance */

function heatClass(pct: number) {
  if (pct >= 85) return "bg-jade-soft text-jade";
  if (pct >= 75) return "bg-amber-soft text-amber";
  return "bg-rose-soft text-rose";
}

function AttendanceTab({ roster, classes, sections }: { roster: Student[]; classes: LiveClass[]; sections: SectionInfo[] }) {
  const marked = classes.filter((c) => c.attendance?.marked);
  const weeks = [...new Set(marked.map((c) => weekStart(c.start)))].sort();
  const cancelled = classes.filter((c) => c.status === "cancelled");
  const cancelledWeek = cancelled.length ? weekStart(cancelled[0].start) : null;
  const below = roster.filter((s) => s.attendance.total > 0 && s.attendance.pct < 75).sort((a, b) => a.attendance.pct - b.attendance.pct);
  const avg = attendanceOf(classes);

  const cols = [
    ...weeks.map((w) => ({ id: w, label: `w/c ${formatShortDate(w)}` })),
    ...(cancelledWeek ? [{ id: "cia", label: `w/c ${formatShortDate(cancelledWeek)}`, sub: "Internal assessment" }] : []),
    { id: "all", label: "To date" },
  ];

  const columns: DataTableColumn<LiveClass>[] = [
    { key: "start", header: "Class", sortable: true, render: (c) => `${formatAccaDate(c.start)} · ${formatTime(c.start)}` },
    {
      key: "section",
      header: "Section",
      sortable: true,
      sortValue: (c) => c.sectionId,
      render: (c) => sections.find((s) => s.id === c.sectionId)?.short ?? "",
    },
    {
      key: "topic",
      header: "Paper and topic",
      render: (c) => (
        <span className="text-ink-2">
          <span className="font-mono font-semibold text-ink">{c.paper}</span> {c.title}
        </span>
      ),
    },
    { key: "faculty", header: "Faculty", render: (c) => staffName(c.facultyId) },
    { key: "present", header: "Present", align: "right", mono: true, render: (c) => `${c.attendance?.present} of ${c.attendance?.total}` },
    {
      key: "pct",
      header: "Attendance",
      sortable: true,
      sortValue: (c) => c.attendance?.pct ?? 0,
      render: (c) => (
        <span className="flex w-32 items-center gap-2">
          <Progress value={c.attendance?.pct ?? 0} tone={(c.attendance?.pct ?? 0) >= 75 ? "jade" : "rose"} height={5} className="flex-1" />
          <span className="font-mono text-[12px] text-ink">{c.attendance?.pct}%</span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile hero label="Attendance in ACCA sessions" value={avg == null ? "Not started" : `${avg}%`} icon={<UserCheck />} sub="Marked classes to date" />
        <KpiTile label="Classes held" value={marked.length} tone="info" icon={<BookOpenCheck />} sub={`Since ${marked[0] ? formatShortDate(marked[0].start) : ""}`} />
        <KpiTile label="Students below 75%" value={below.length} tone="rose" icon={<UserX />} sub="Joint certificate needs 75%" goodWhen="down" />
        <KpiTile label="Moved to recordings" value={cancelled.length} tone="amber" icon={<CalendarOff />} sub="Internal assessment week" />
      </KpiRow>

      <Card className="min-w-0">
        <CardHeader
          title="Attendance heat by section"
          sub="Share of enrolled students present each week"
          action={
            <span className="hidden items-center gap-3 text-[11.5px] text-ink-3 sm:flex">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-jade" />
                85% and above
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber" />
                75 to 84%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-rose" />
                Below 75%
              </span>
            </span>
          }
        />
        <div className="px-5 pb-5">
          <Matrix
            caption="Attendance by section and week"
            corner="Section"
            dense
            rows={sections.map((s) => ({ id: s.id, label: s.short, sub: `${s.size} students · ${staffName(s.facultyId)}` }))}
            cols={cols}
            cell={(rowId, colId) => {
              if (colId === "cia") {
                return <span className="text-[11.5px] text-ink-3">Recordings</span>;
              }
              const inScope = classes.filter((c) => c.sectionId === rowId && (colId === "all" || weekStart(c.start) === colId));
              const pct = attendanceOf(inScope);
              if (pct == null) return <span className="text-ink-3">None</span>;
              return (
                <span
                  className={cn("inline-grid min-w-14 place-items-center rounded-[8px] px-2 py-1.5 font-mono text-[12.5px] font-bold", heatClass(pct), colId === "all" && "ring-1 ring-current")}
                  title={`${plural(inScope.filter((c) => c.attendance?.marked).length, "class", "classes")}`}
                >
                  {pct}%
                </span>
              );
            }}
          />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="min-w-0">
          <DataTable
            caption="Class-by-class attendance"
            rows={marked}
            columns={columns}
            getRowId={(c) => c.id}
            pageSize={8}
            dense
            initialSort={{ key: "start", dir: "desc" }}
            search={{ placeholder: "Search topic or paper", match: (c, q) => c.title.toLowerCase().includes(q) || c.paper.toLowerCase().includes(q) }}
          />
        </div>
        <Card className="min-w-0">
          <CardHeader title="Students below 75%" sub="Below the joint certificate attendance rule" />
          {below.length ? (
            <ul className="divide-y divide-line border-t border-line">
              {below.map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={s.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-ink">{s.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">
                      {intakeShort(s.intakeId)} · Section {s.section} · {plural(s.attendance.missedClasses, "missed class", "missed classes")}
                    </span>
                  </span>
                  <span className="font-mono text-[14px] font-bold text-rose">{s.attendance.pct}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-line px-5 py-6 text-center text-[13px] text-ink-3">Every student is at 75% or above.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ learning progress */

function ProgressTab({ roster }: { roster: Student[] }) {
  const current = roster.filter((s) => s.currentPaper);
  const currentProgress = (s: Student) => (s.currentPaper ? s.papers[s.currentPaper].progress : 0);
  const cleared = (s: Student) => Object.values(s.papers).filter((p) => p.status === "passed" || p.status === "exempt").length;
  const lastWeek = (s: Student) => s.activityHours[s.activityHours.length - 1] ?? 0;
  const inactive = roster.filter((s) => s.lastActiveDaysAgo >= 14);

  const intakes = [...new Set(roster.map((s) => s.intakeId))].sort();
  const series = intakes.map((id, i) => ({
    label: intakeShort(id),
    values: activityWeekLabels.map((_, w) => {
      const group = roster.filter((s) => s.intakeId === id);
      return group.length ? Math.round((group.reduce((sum, s) => sum + (s.activityHours[w] ?? 0), 0) / group.length) * 10) / 10 : 0;
    }),
    tone: i === 0 ? "info" : "violet",
  }));

  const inPlay = [...new Set(roster.flatMap((s) => Object.values(s.papers).filter((p) => p.status === "current" || p.status === "in-progress").map((p) => p.code)))] as PaperCode[];

  const columns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{s.name}</span>
          <span className="block text-[12px] text-ink-3">
            {intakeShort(s.intakeId)} · Section {s.section}
          </span>
        </span>
      ),
    },
    {
      key: "paper",
      header: "Current paper",
      sortable: true,
      sortValue: (s) => s.currentPaper,
      render: (s) => (s.currentPaper ? <span className="font-mono font-semibold text-ink">{s.currentPaper}</span> : "None"),
    },
    {
      key: "progress",
      header: "Syllabus progress",
      sortable: true,
      sortValue: currentProgress,
      render: (s) => (
        <span className="flex w-40 items-center gap-2">
          <Progress value={currentProgress(s)} className="flex-1" />
          <span className="font-mono text-[12px] text-ink">{currentProgress(s)}%</span>
        </span>
      ),
    },
    { key: "cleared", header: "Papers cleared", align: "center", mono: true, sortable: true, sortValue: cleared, render: cleared },
    { key: "hours", header: "Study hours last week", align: "right", mono: true, sortable: true, sortValue: lastWeek, render: (s) => `${lastWeek(s)}h` },
    {
      key: "active",
      header: "Last active",
      sortable: true,
      sortValue: (s) => s.lastActiveDaysAgo,
      render: (s) =>
        s.lastActiveDaysAgo >= 14 ? (
          <StatusPill status="inactive">{s.lastActiveDaysAgo} days ago</StatusPill>
        ) : (
          <span className="text-ink-2">{s.lastActiveDaysAgo === 0 ? "Today" : `${plural(s.lastActiveDaysAgo, "day")} ago`}</span>
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile label="Average syllabus progress" value={`${average(current.map(currentProgress))}%`} tone="info" icon={<NotebookPen />} sub="On the current paper" />
        <KpiTile label="Papers cleared" value={roster.reduce((n, s) => n + cleared(s), 0)} tone="jade" icon={<BookOpenCheck />} sub="Passed across listed learners" />
        <KpiTile label="Study hours last week" value={`${average(roster.map(lastWeek))}h`} icon={<Clock3 />} sub="Average per learner" />
        <KpiTile label="Inactive 14 days or more" value={inactive.length} tone="rose" icon={<UserX />} sub={inactive.map((s) => s.name.split(" ")[0]).join(", ") || "None"} goodWhen="down" />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Weekly study hours</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">Average hours on the platform per learner, by intake</p>
          <LineChart series={series} labels={activityWeekLabels} unit="h" height={190} min={0} />
        </Card>
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Progress by paper</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">Average syllabus completion for papers in study</p>
          <ul className="space-y-4">
            {inPlay.map((code) => {
              const group = roster.filter((s) => s.papers[code] && (s.papers[code].status === "current" || s.papers[code].status === "in-progress"));
              const pct = average(group.map((s) => s.papers[code].progress));
              return (
                <li key={code}>
                  <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate font-semibold text-ink">
                      <span className="font-mono">{code}</span> · {paperName(code)}
                    </span>
                    <span className="shrink-0 text-[12px] text-ink-3">
                      {plural(group.length, "learner")} · <span className="font-mono font-semibold text-ink">{pct}%</span>
                    </span>
                  </div>
                  <Progress value={pct} height={8} />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <DataTable
        caption="Learning progress"
        rows={roster}
        columns={columns}
        getRowId={(s) => s.id}
        pageSize={10}
        initialSort={{ key: "progress", dir: "asc" }}
        search={{ placeholder: "Search name", match: (s, q) => s.name.toLowerCase().includes(q) }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ mocks */

type MockRow = Student["mocks"][number] & { student: Student };

function MocksTab({ roster }: { roster: Student[] }) {
  const [status, setStatus] = useState("");
  const all: MockRow[] = roster.flatMap((s) => s.mocks.map((m) => ({ ...m, student: s })));
  const done = all.filter((m) => m.status === "completed" && m.score != null);
  const missed = all.filter((m) => m.status === "missed");
  const rows = status ? all.filter((m) => m.status === status) : all;
  const scores = done.map((m) => m.score ?? 0);
  const bins = [
    { label: "Below 40", test: (v: number) => v < 40 },
    { label: "40s", test: (v: number) => v >= 40 && v < 50 },
    { label: "50s", test: (v: number) => v >= 50 && v < 60 },
    { label: "60s", test: (v: number) => v >= 60 && v < 70 },
    { label: "70s", test: (v: number) => v >= 70 && v < 80 },
    { label: "80 plus", test: (v: number) => v >= 80 },
  ];
  const papers = [...new Set(done.map((m) => m.paper))];

  const columns: DataTableColumn<MockRow>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: (m) => m.student.name, render: (m) => <span className="font-semibold text-ink">{m.student.name}</span> },
    { key: "title", header: "Assessment", sortable: true, className: "text-ink-2" },
    { key: "paper", header: "Paper", mono: true, sortable: true },
    { key: "date", header: "Date", sortable: true, render: (m) => formatAccaDate(m.date) },
    {
      key: "score",
      header: "Score",
      sortable: true,
      sortValue: (m) => m.score ?? -1,
      render: (m) => (m.score == null ? <span className="text-ink-3">No score</span> : <ScoreBar value={m.score} marker={50} className="w-32" height={6} />),
    },
    { key: "status", header: "Status", sortable: true, render: (m) => <StatusPill status={m.status} /> },
  ];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile label="Mocks and tests completed" value={done.length} tone="info" icon={<BookOpenCheck />} sub={`${all.filter((m) => m.status === "scheduled").length} more scheduled`} />
        <KpiTile hero label="Average mock score" value={`${average(scores)}%`} sub="ACCA pass mark 50%" />
        <KpiTile label="Scored below 50%" value={scores.filter((v) => v < 50).length} tone="rose" icon={<FileWarning />} sub="Below the ACCA pass mark" goodWhen="down" />
        <KpiTile label="Missed mocks" value={missed.length} tone="amber" icon={<UserX />} sub={missed.map((m) => m.student.name.split(" ")[0]).join(", ") || "None"} goodWhen="down" />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Mock score distribution</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">Completed mocks and progress tests by score band</p>
          <BarChart data={bins.map((b) => scores.filter(b.test).length)} labels={bins.map((b) => b.label)} tone="info" height={150} />
        </Card>
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Average score by paper</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">The black tick marks the ACCA pass mark of 50%</p>
          <ul className="space-y-4">
            {papers.map((p) => {
              const list = done.filter((m) => m.paper === p);
              return (
                <li key={p}>
                  <ScoreBar
                    value={average(list.map((m) => m.score ?? 0))}
                    marker={50}
                    label={`${p} ${paperName(p)} · ${plural(list.length, "attempt")}`}
                  />
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <DataTable
        caption="Assessment and mock performance"
        rows={rows}
        columns={columns}
        getRowId={(m) => `${m.student.id}-${m.id}`}
        pageSize={10}
        initialSort={{ key: "date", dir: "desc" }}
        search={{ placeholder: "Search name or assessment", match: (m, q) => m.student.name.toLowerCase().includes(q) || m.title.toLowerCase().includes(q) }}
        filters={
          <FilterSelect
            label="Status"
            allLabel="All"
            value={status}
            onChange={setStatus}
            options={[
              { value: "completed", label: "Completed" },
              { value: "missed", label: "Missed" },
              { value: "scheduled", label: "Scheduled" },
            ]}
          />
        }
      />
    </div>
  );
}
