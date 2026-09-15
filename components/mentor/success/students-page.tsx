"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import {
  EXAMS_TO_QUALIFY,
  formatShortDate,
  isoDaysAgo,
  staffName,
  type ActionPlan,
  type MentoringSession,
  type MentorReminder,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { ScoreBar } from "@/components/ui/score";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { ActionPlanDrawer, ReminderDrawer, ScheduleSessionDrawer } from "./drawers";
import { MentorScopeChip, useMentorScope } from "./scope";
import {
  RISK_RANK,
  StudentCell,
  TypePill,
  ago,
  clearedCount,
  currentReadiness,
  lastMock,
  latestResult,
  plural,
} from "./shared";
import { Student360Drawer, type Student360Tab } from "./student-360";

export function MentorStudentsPage() {
  const { persona } = useRole();
  return <StudentsView key={persona.id} />;
}

function StudentsView() {
  const scope = useMentorScope();
  const rows = scope.students;

  const [type, setType] = useState("");
  const [risk, setRisk] = useState("");
  const [paper, setPaper] = useState("");
  const [open, setOpen] = useState<{ student: Student; tab: Student360Tab } | null>(null);
  const [drawer, setDrawer] = useState<{ kind: "session" | "reminder" | "plan"; ids: string[] } | null>(null);
  const [contacted, setContacted] = useState<Record<string, string>>({});

  const papers = useMemo(() => Array.from(new Set(rows.map((s) => s.currentPaper).filter(Boolean))) as string[], [rows]);
  const visible = rows.filter(
    (s) => (!type || s.type === type) && (!risk || s.risk.level === risk) && (!paper || s.currentPaper === paper),
  );

  const graduates = rows.filter((s) => s.type === "graduate").length;
  const started = rows.filter((s) => s.attendance.total > 0);
  const avgAttendance = started.length ? Math.round(started.reduce((a, s) => a + s.attendance.pct, 0) / started.length) : 0;
  const avgReadiness = Math.round(rows.reduce((a, s) => a + currentReadiness(s), 0) / Math.max(1, rows.length));
  const high = rows.filter((s) => s.risk.level === "high").length;

  const openOn = (student: Student, tab: Student360Tab) => setOpen({ student, tab });

  const columns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="flex min-w-0 flex-col gap-1">
          <StudentCell student={s} />
          {contacted[s.id] ? (
            <span className="pl-10.5">
              <StatusPill status="sent" size="sm">
                {contacted[s.id]}
              </StatusPill>
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "type",
      header: "Student type",
      sortable: true,
      render: (s) => <TypePill student={s} />,
    },
    {
      key: "journey",
      header: "ACCA journey",
      sortable: true,
      sortValue: (s) => clearedCount(s),
      render: (s) => (
        <button type="button" onClick={() => openOn(s, "journey")} className="group block w-36 text-left">
          <span className="flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="font-semibold text-ink underline decoration-transparent decoration-2 underline-offset-4 group-hover:decoration-cta">
              {s.currentPaper ? `Current ${s.currentPaper}` : "Onboarding"}
            </span>
            <span className="font-mono text-[11.5px] text-ink-3 tnum">
              {clearedCount(s)}/{EXAMS_TO_QUALIFY}
            </span>
          </span>
          <Progress value={(clearedCount(s) / EXAMS_TO_QUALIFY) * 100} tone="brand" height={5} className="mt-1.5" />
        </button>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      align: "right",
      sortable: true,
      sortValue: (s) => (s.attendance.total ? s.attendance.pct : null),
      render: (s) =>
        s.attendance.total ? (
          <button type="button" onClick={() => openOn(s, "attendance")} className="text-right">
            <span className={cn("block font-mono font-semibold tnum", s.attendance.pct < 75 ? "text-rose" : "text-ink")}>{s.attendance.pct}%</span>
            <span className="block text-[11.5px] text-ink-3">{plural(s.attendance.missedClasses, "miss", "misses")}</span>
          </button>
        ) : (
          <span className="text-[12.5px] text-ink-3">Not started</span>
        ),
    },
    {
      key: "activity",
      header: "Learning activity",
      sortable: true,
      sortValue: (s) => s.lastActiveDaysAgo,
      render: (s) => (
        <button type="button" onClick={() => openOn(s, "activity")} className="flex w-40 items-center gap-2.5 text-left">
          <span className="w-16 shrink-0">
            <Sparkline data={s.activityHours} tone={s.lastActiveDaysAgo >= 14 ? "rose" : "brand"} height={24} fill={false} />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-[12.5px] font-semibold", s.lastActiveDaysAgo >= 14 ? "text-rose" : "text-ink")}>
              {ago(isoDaysAgo(s.lastActiveDaysAgo))}
            </span>
            <span className="block text-[11.5px] text-ink-3">{s.activityHours[7]}h last week</span>
          </span>
        </button>
      ),
    },
    {
      key: "mocks",
      header: "Mock performance",
      sortable: true,
      sortValue: (s) => lastMock(s)?.score ?? null,
      render: (s) => {
        const m = lastMock(s);
        return (
          <button type="button" onClick={() => openOn(s, "mocks")} className="text-left">
            {m ? (
              <span className={cn("block font-mono font-semibold tnum", (m.score ?? 0) >= 50 ? "text-ink" : "text-rose")}>{m.score}%</span>
            ) : (
              <span className="block text-[12.5px] text-ink-3">No mock yet</span>
            )}
            <span className="block text-[11.5px] text-ink-3">
              {s.missedMocks ? <span className="font-semibold text-rose">{plural(s.missedMocks, "missed mock")}</span> : m ? m.title : "Scheduled"}
            </span>
          </button>
        );
      },
    },
    {
      key: "readiness",
      header: "Readiness score",
      sortable: true,
      sortValue: (s) => currentReadiness(s),
      render: (s) => (
        <button type="button" onClick={() => openOn(s, "readiness")} className="block w-28 text-left">
          <ScoreBar value={currentReadiness(s)} marker={50} height={6} label={s.currentPaper ?? "Overall"} />
        </button>
      ),
    },
    {
      key: "results",
      header: "Attempts and results",
      sortable: true,
      sortValue: (s) => latestResult(s)?.date ?? null,
      render: (s) => {
        const r = latestResult(s);
        return (
          <button type="button" onClick={() => openOn(s, "attempts")} className="text-left">
            {r ? (
              <span className="flex items-center gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-ink">
                  {r.paper} {r.score != null ? `${r.score}%` : ""}
                </span>
                <StatusPill status={r.result === "pending" ? "results pending" : r.result} size="sm" />
              </span>
            ) : (
              <span className="text-[12.5px] text-ink-3">No attempts yet</span>
            )}
            <span className="block text-[11.5px] text-ink-3">{r ? r.label : `${clearedCount(s)} papers exempt`}</span>
          </button>
        );
      },
    },
    {
      key: "risk",
      header: "Risk",
      sortable: true,
      sortValue: (s) => RISK_RANK[s.risk.level],
      render: (s) => <RiskBadge level={s.risk.level} />,
    },
    ...(scope.placement
      ? [
          {
            key: "mentor",
            header: "Mentor",
            sortable: true,
            sortValue: (s: Student) => staffName(s.mentorId),
            render: (s: Student) => <span className="text-ink-2">{staffName(s.mentorId)}</span>,
          },
        ]
      : []),
  ];

  const selectedStudent = drawer?.ids[0];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student success"
        title="My students"
        sub="View allocated students with their student type, ACCA journey, attendance, learning activity, mock performance, readiness scores, attempts and results."
        badge={<MentorScopeChip scope={scope} />}
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              toast({
                title: `Report queued: ${scope.placement ? "placement-eligible-learners" : "allocated-students"}.csv`,
                body: plural(visible.length, "student"),
                tone: "info",
              })
            }
          >
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <KpiRow cols={5}>
        <KpiTile hero label={scope.placement ? "Placement-eligible learners" : "Allocated students"} value={rows.length} sub={scope.capacity && !scope.placement ? `of ${scope.capacity} capacity` : `across ${new Set(rows.map((s) => s.mentorId)).size} mentors`} />
        <KpiTile label="Student type" value={`${graduates} · ${rows.length - graduates}`} sub="graduate · undergraduate" tone="info" />
        <KpiTile label="Average attendance" value={`${avgAttendance}%`} sub="ACCA live classes" tone={avgAttendance >= 75 ? "jade" : "amber"} />
        <KpiTile label="Average readiness score" value={avgReadiness} sub="on the current paper" tone={avgReadiness >= 70 ? "jade" : avgReadiness >= 50 ? "amber" : "rose"} />
        <KpiTile label="High risk" value={high} sub={plural(rows.filter((s) => s.risk.level === "medium").length, "medium")} tone="rose" />
      </KpiRow>

      <DataTable
        caption={scope.placement ? "Placement-eligible learners" : "Allocated students"}
        rows={visible}
        columns={columns}
        getRowId={(s) => s.id}
        initialSort={{ key: "risk", dir: "desc" }}
        pageSize={10}
        search={{
          placeholder: "Search name, ACCA ID or city",
          match: (s, q) => s.name.toLowerCase().includes(q) || (s.accaId ?? "").includes(q) || s.city.toLowerCase().includes(q),
        }}
        filters={
          <FilterBar
            active={Boolean(type || risk || paper)}
            onClear={() => {
              setType("");
              setRisk("");
              setPaper("");
            }}
          >
            <FilterSelect
              label="Type"
              allLabel="All"
              value={type}
              onChange={setType}
              options={[
                { value: "graduate", label: "Graduate" },
                { value: "undergraduate", label: "Undergraduate" },
              ]}
            />
            <FilterSelect label="Current paper" allLabel="All" value={paper} onChange={setPaper} options={papers} />
            <FilterSelect
              label="Risk"
              allLabel="Any"
              value={risk}
              onChange={setRisk}
              options={[
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
          </FilterBar>
        }
        selectable
        bulkActions={(ids, clear) => (
          <>
            <Button
              size="sm"
              variant="inverse"
              onClick={() => {
                setDrawer({ kind: "reminder", ids });
                clear();
              }}
            >
              Send authorised reminder
            </Button>
          </>
        )}
        onRowClick={(s) => openOn(s, "journey")}
        rowLabel={(s) => `Open ${s.name}`}
      />

      <Student360Drawer
        student={open?.student ?? null}
        initialTab={open?.tab}
        showMentor={scope.placement}
        onClose={() => setOpen(null)}
        onAction={(kind, s) => {
          setOpen(null);
          setDrawer({ kind, ids: [s.id] });
        }}
      />

      <ScheduleSessionDrawer
        open={drawer?.kind === "session"}
        onClose={() => setDrawer(null)}
        scope={scope}
        studentId={selectedStudent}
        onSave={(sess: MentoringSession) => setContacted((c) => ({ ...c, [sess.studentId]: `Session booked ${formatShortDate(sess.start.slice(0, 10))}` }))}
      />
      <ReminderDrawer
        open={drawer?.kind === "reminder"}
        onClose={() => setDrawer(null)}
        scope={scope}
        studentIds={drawer?.kind === "reminder" ? drawer.ids : []}
        onSent={(sent: MentorReminder[]) =>
          setContacted((c) => {
            const next = { ...c };
            sent.forEach((r) => (next[r.studentId] = "Reminder sent today"));
            return next;
          })
        }
      />
      <ActionPlanDrawer
        open={drawer?.kind === "plan"}
        onClose={() => setDrawer(null)}
        scope={scope}
        studentId={selectedStudent}
        onCreate={(plan: ActionPlan) => setContacted((c) => ({ ...c, [plan.studentId]: "Action plan created" }))}
      />
    </div>
  );
}
