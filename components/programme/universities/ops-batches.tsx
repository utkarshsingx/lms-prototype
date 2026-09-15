"use client";

import { useMemo, useState } from "react";
import { Bell, Flag } from "lucide-react";
import {
  ACCA_TODAY,
  cohorts,
  formatAccaDate,
  liveClasses,
  staffName,
  students as allStudents,
  type Cohort,
  type CohortSection,
  type Student,
  type University,
} from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Drawer } from "@/components/ui/modal";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, plural } from "../acca/common";

type BatchRow = {
  id: string;
  cohort: Cohort;
  section: CohortSection;
  held: number;
  cancelled: number;
  attendance: number | null;
  learners: Student[];
  readiness: number | null;
  atRisk: number;
  nextMilestone: string;
};

const MILESTONE: Record<string, string> = {
  "co-bw-2025-s3": "Last FA on-demand slot 20 Nov, blackout from 23 Nov",
  "co-bw-2026-s1": "BT exams planned for 16 Jan 2027",
  "co-cl-2025-s3": "FA mock exam 2 on 31 Oct, blackout from 30 Nov",
  "co-nf-2026-s1": `Classes start ${formatAccaDate("2026-10-05")}`,
};

export function BatchesTab({ university, canEdit, reason }: { university: University; canEdit: boolean; reason?: string }) {
  const [open, setOpen] = useState<BatchRow | null>(null);

  const rows: BatchRow[] = useMemo(
    () =>
      cohorts
        .filter((c) => c.universityId === university.id)
        .flatMap((c) =>
          c.sections.map((sec) => {
            const classes = liveClasses.filter((l) => l.sectionId === sec.id);
            const marked = classes.filter((l) => l.status === "completed" && l.attendance?.marked);
            const learners = allStudents.filter((s) => s.sectionId === sec.id);
            return {
              id: sec.id,
              cohort: c,
              section: sec,
              held: classes.filter((l) => l.status === "completed").length,
              cancelled: classes.filter((l) => l.status === "cancelled").length,
              attendance: marked.length ? Math.round(marked.reduce((s, l) => s + (l.attendance?.pct ?? 0), 0) / marked.length) : null,
              learners,
              readiness: learners.length ? Math.round(learners.reduce((s, l) => s + l.readiness.overall, 0) / learners.length) : null,
              atRisk: learners.filter((l) => l.risk.level !== "low").length,
              nextMilestone: MILESTONE[c.id] ?? "",
            };
          }),
        ),
    [university.id],
  );

  const withAttendance = rows.filter((r) => r.attendance != null);

  const columns: DataTableColumn<BatchRow>[] = [
    {
      key: "section",
      header: "Batch",
      sortable: true,
      sortValue: (r) => `${r.cohort.name} ${r.section.name}`,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.section.name}</span>
          <span className="block text-[12px] text-ink-3">{r.cohort.name.split(" · ").slice(1).join(" · ")}</span>
        </span>
      ),
    },
    { key: "size", header: "Learners", align: "right", mono: true, sortable: true, sortValue: (r) => r.section.size, render: (r) => r.section.size },
    {
      key: "faculty",
      header: "Faculty and schedule",
      render: (r) => (
        <span className="block">
          <span className="block text-ink">{staffName(r.section.facultyId)}</span>
          <span className="block max-w-72 truncate text-[12px] text-ink-3" title={r.section.schedule}>
            {r.section.schedule}
          </span>
        </span>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      sortable: true,
      sortValue: (r) => r.attendance,
      render: (r) => (r.attendance == null ? <StatusPill status="Not started" size="sm" /> : <ScoreBar value={r.attendance} className="w-28" height={6} />),
    },
    {
      key: "classes",
      header: "Classes held",
      align: "right",
      mono: true,
      render: (r) => (
        <span>
          {r.held}
          {r.cancelled ? <span className="text-rose"> · {r.cancelled} moved</span> : null}
        </span>
      ),
    },
    {
      key: "readiness",
      header: "Readiness",
      sortable: true,
      sortValue: (r) => r.readiness,
      render: (r) => (r.readiness == null ? null : <ScoreBar value={r.readiness} className="w-28" height={6} />),
    },
    {
      key: "atRisk",
      header: "At risk",
      align: "right",
      sortable: true,
      render: (r) =>
        r.atRisk ? (
          <StatusPill status="At risk" size="sm">
            {r.atRisk} of {r.learners.length} listed
          </StatusPill>
        ) : (
          <span className="text-[12px] text-ink-3">None listed</span>
        ),
    },
    { key: "milestone", header: "Next milestone", wrap: true, className: "text-ink-2", render: (r) => r.nextMilestone },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="grid grid-cols-2 gap-3 self-start">
          {[
            ["Batches", rows.length],
            ["Learners", university.headline.students],
            ["Average attendance", withAttendance.length ? `${Math.round(withAttendance.reduce((s, r) => s + (r.attendance ?? 0), 0) / withAttendance.length)}%` : "Not started"],
            ["Classes moved to recordings", rows.reduce((s, r) => s + r.cancelled, 0)],
          ].map(([label, value]) => (
            <Card key={label as string} className="min-w-0 p-4">
              <MiniLabel>{label}</MiniLabel>
              <p className="mt-2 font-display text-[24px] leading-none font-bold text-ink tnum">{value}</p>
            </Card>
          ))}
        </div>
        <Card className="min-w-0">
          <CardHeader title="Attendance in ACCA sessions by batch" sub="Marked classes since 24 Aug 2026." />
          <div className="px-5 pb-5">
            {withAttendance.length ? (
              <BarChart
                data={withAttendance.map((r) => r.attendance ?? 0)}
                labels={withAttendance.map((r) => `${r.cohort.intakeId === "in-2026-jul" ? "2026" : "2025"} ${r.section.name.replace("Section ", "")}`)}
                tone="jade"
                height={110}
              />
            ) : (
              <p className="py-8 text-center text-[13px] text-ink-3">No classes held yet. Attendance appears after the first marked class.</p>
            )}
          </div>
        </Card>
      </div>

      <DataTable
        caption={`${university.name} batches`}
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={setOpen}
        rowLabel={(r) => `Open ${r.cohort.name} ${r.section.name}`}
      />
      <p className="text-[12px] text-ink-3">
        Learner counts are enrolment figures. Readiness and risk come from the learner records listed for each batch. Select a batch to see them.
      </p>

      <Drawer
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open ? `${open.section.name} · ${open.cohort.name.split(" · ").slice(1).join(" · ")}` : "Batch"}
        sub={open ? `${open.section.size} learners · ${staffName(open.section.facultyId)} · ${open.section.room ?? "Online"}` : undefined}
        width="w-full max-w-xl"
        footer={
          open ? (
            <>
              <GatedButton
                variant="outline"
                size="sm"
                allowed={canEdit}
                reason={reason}
                onClick={() => toast({ title: "Attendance nudge sent", body: `${open.section.name} learners below 80% · in-app and WhatsApp` })}
              >
                <Bell className="size-3.5" /> Send attendance nudge
              </GatedButton>
              <GatedButton
                size="sm"
                allowed={canEdit}
                reason={reason}
                onClick={() =>
                  toast({ title: `At-risk learners flagged to ${staffName(open.cohort.mentorId)}`, body: `${plural(open.atRisk, "learner")} in ${open.section.name}` })
                }
              >
                <Flag className="size-3.5" /> Flag at-risk to mentor
              </GatedButton>
            </>
          ) : null
        }
      >
        {open ? (
          <div className="space-y-4 p-5">
            <div className="grid grid-cols-3 gap-2.5">
              {[
                ["Attendance", open.attendance == null ? "Not started" : `${open.attendance}%`],
                ["Readiness", open.readiness ?? "No data"],
                ["Classes held", open.held],
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0 rounded-[var(--radius-md)] border border-line p-3">
                  <MiniLabel>{label}</MiniLabel>
                  <p className="mt-1.5 font-display text-[20px] leading-none font-bold text-ink tnum">{value}</p>
                </div>
              ))}
            </div>
            <MiniLabel>Listed learners · {open.learners.length}</MiniLabel>
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line">
              {open.learners.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">{s.name}</span>
                    <span className="block text-[12px] text-ink-3">
                      {s.currentPaper ?? "No current paper"} · attendance {s.attendance.total ? `${s.attendance.pct}%` : "not started"} · readiness{" "}
                      {s.readiness.overall}
                    </span>
                  </span>
                  <RiskBadge level={s.risk.level} />
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-ink-3">As of {formatAccaDate(ACCA_TODAY)}.</p>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
