"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, UserCog } from "lucide-react";
import {
  cohortById,
  cohorts as allCohorts,
  faculty as facultyStaff,
  mentors as mentorStaff,
  staffById,
  staffName,
  students as seedStudents,
  universityById,
  type PaperCode,
  type StaffMember,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/field";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { timetableSlots } from "./calendar-data";
import { plural, useOpsAccess } from "./shared";

/* ------------------------------------------------------------------ faculty assignment rows */

type AssignmentRow = { key: string; cohortId: string; paper: PaperCode; hours: number };

// Cohorts that start after the sample timetable week use their published timetable hours.
const HOURS_FALLBACK: Record<string, number> = { "co-fr-mar27-reat": 2.5, "co-nf-2026-s1": 6 };

const WEEK = { start: "2026-09-07", end: "2026-09-13" };

const assignmentRows: AssignmentRow[] = allCohorts.flatMap((c) =>
  c.papers.map((paper) => {
    const mins = timetableSlots
      .filter((s) => s.cohortId === c.id && s.paper === paper && s.date >= WEEK.start && s.date <= WEEK.end && s.status !== "cancelled")
      .reduce((sum, s) => sum + s.mins, 0);
    const hours = mins ? Math.round((mins / 60) * 2) / 2 : (HOURS_FALLBACK[c.id] ?? 0) / c.papers.length;
    return { key: `${c.id}:${paper}`, cohortId: c.id, paper, hours };
  }),
);

function defaultFaculty(row: AssignmentRow) {
  const c = cohortById(row.cohortId)!;
  return c.facultyIds.find((id) => staffById(id)?.focusPapers.includes(row.paper)) ?? c.facultyIds[0];
}

const initialAssignment: Record<string, string> = Object.fromEntries(assignmentRows.map((r) => [r.key, defaultFaculty(r)]));

function hoursFor(assign: Record<string, string>, facultyId: string) {
  return assignmentRows.filter((r) => assign[r.key] === facultyId).reduce((s, r) => s + r.hours, 0);
}

function fmtHours(h: number) {
  return Number.isInteger(h) ? `${h}` : h.toFixed(1);
}

/* ------------------------------------------------------------------ page */

export function StaffingPage() {
  const { canEdit, reason } = useOpsAccess();
  const [tab, setTab] = useState("faculty");

  /* faculty */
  const [assign, setAssign] = useState<Record<string, string>>(initialAssignment);
  const [cohortType, setCohortType] = useState("");

  const load = (facultyId: string) => {
    const f = staffById(facultyId);
    const base = f?.allocation.weeklyTeachingHours ?? 0;
    return base - hoursFor(initialAssignment, facultyId) + hoursFor(assign, facultyId);
  };

  const assignFaculty = (row: AssignmentRow, facultyId: string) => {
    const before = assign[row.key];
    if (before === facultyId) return;
    const f = staffById(facultyId);
    const next = { ...assign, [row.key]: facultyId };
    setAssign(next);
    const newLoad = (f?.allocation.weeklyTeachingHours ?? 0) - hoursFor(initialAssignment, facultyId) + hoursFor(next, facultyId);
    const over = f?.allocation.capacity != null && newLoad > f.allocation.capacity;
    const specialist = f?.focusPapers.includes(row.paper);
    toast({
      title: `${f?.name} assigned to ${cohortById(row.cohortId)?.name}`,
      body: `${row.paper} · replaces ${staffName(before)} · ${fmtHours(newLoad)} h a week${over ? " · over capacity" : ""}${specialist ? "" : ` · not a ${row.paper} specialist`}`,
      tone: over || !specialist ? "warning" : "success",
    });
  };

  const facultyColumns: DataTableColumn<StaffMember>[] = [
    {
      key: "name",
      header: "Faculty",
      sortable: true,
      render: (f) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={f.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{f.name}</span>
            <span className="block text-[12px] text-ink-3">{f.location}</span>
          </span>
        </span>
      ),
    },
    {
      key: "papers",
      header: "Papers",
      render: (f) => (
        <span className="flex flex-wrap gap-1">
          {f.focusPapers.map((p) => (
            <Badge key={p} tone="dark" className="font-mono">
              {p}
            </Badge>
          ))}
        </span>
      ),
    },
    {
      key: "cohorts",
      header: "Cohorts",
      sortable: true,
      sortValue: (f) => new Set(assignmentRows.filter((r) => assign[r.key] === f.id).map((r) => r.cohortId)).size,
      render: (f) => {
        const ids = [...new Set(assignmentRows.filter((r) => assign[r.key] === f.id).map((r) => r.cohortId))];
        return (
          <span className="block max-w-[16rem]" title={ids.map((id) => cohortById(id)?.name).join(", ")}>
            <span className="block font-semibold text-ink">{ids.length}</span>
            <span className="block truncate text-[12px] text-ink-3">{ids.map((id) => cohortById(id)?.name.split(" · ")[0]).join(", ") || "None"}</span>
          </span>
        );
      },
    },
    {
      key: "hours",
      header: "Hours a week",
      sortable: true,
      sortValue: (f) => load(f.id),
      render: (f) => {
        const h = load(f.id);
        const cap = f.allocation.capacity ?? 16;
        const over = h > cap;
        return (
          <span className="flex min-w-[10rem] items-center gap-3">
            <Progress value={Math.min(100, (h / cap) * 100)} tone={over ? "rose" : h / cap >= 0.85 ? "amber" : "brand"} className="w-24" />
            <span className={cn("font-mono text-[12.5px] tnum", over ? "font-semibold text-rose" : "text-ink-2")}>
              {fmtHours(h)} of {cap}
            </span>
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Load",
      render: (f) => {
        const h = load(f.id);
        const cap = f.allocation.capacity ?? 16;
        return h > cap ? <StatusPill status="Over capacity" tone="rose" size="sm" /> : h / cap >= 0.85 ? <StatusPill status="Near capacity" tone="amber" size="sm" /> : <StatusPill status="Available" tone="jade" size="sm" />;
      },
    },
  ];

  const visibleAssignments = assignmentRows.filter((r) => {
    const c = cohortById(r.cohortId)!;
    return !cohortType || (cohortType === "university" ? c.type === "university" : c.type !== "university");
  });

  const assignmentColumns: DataTableColumn<AssignmentRow>[] = [
    {
      key: "cohort",
      header: "Cohort",
      sortable: true,
      sortValue: (r) => cohortById(r.cohortId)?.name ?? "",
      render: (r) => {
        const c = cohortById(r.cohortId)!;
        return (
          <span className="block max-w-[20rem]">
            <span className="block truncate font-semibold text-ink">{c.name}</span>
            <span className="block truncate text-[12px] text-ink-3">
              {plural(c.sections.length, c.sections[0]?.kind === "section" ? "section" : "batch", c.sections[0]?.kind === "section" ? "sections" : "batches")} · {c.size} students
              {c.universityId ? ` · ${universityById(c.universityId)?.shortName}` : ""}
            </span>
          </span>
        );
      },
    },
    { key: "paper", header: "Paper", mono: true, sortable: true },
    { key: "hours", header: "Hours a week", align: "right", mono: true, sortable: true, render: (r) => (r.hours ? fmtHours(r.hours) : "To confirm") },
    {
      key: "faculty",
      header: "Assigned faculty",
      render: (r) => (
        <span title={canEdit ? undefined : reason} className="block w-56">
          <Select
            aria-label={`Faculty for ${cohortById(r.cohortId)?.name} ${r.paper}`}
            value={assign[r.key]}
            disabled={!canEdit}
            onChange={(e) => assignFaculty(r, e.target.value)}
          >
            {facultyStaff.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
                {f.focusPapers.includes(r.paper) ? ` · ${r.paper} specialist` : ""}
              </option>
            ))}
          </Select>
        </span>
      ),
    },
    {
      key: "check",
      header: "Check",
      render: (r) => {
        const f = staffById(assign[r.key]);
        const over = f ? load(f.id) > (f.allocation.capacity ?? 16) : false;
        const specialist = f?.focusPapers.includes(r.paper);
        if (!over && specialist) return <StatusPill status="Specialist" tone="jade" size="sm" />;
        return (
          <span className="flex flex-wrap gap-1">
            {!specialist ? <StatusPill status={`Not a ${r.paper} specialist`} tone="amber" size="sm" /> : null}
            {over ? <StatusPill status="Over capacity" tone="rose" size="sm" /> : null}
          </span>
        );
      },
    },
  ];

  /* mentors */
  const [mentorOf, setMentorOf] = useState<Record<string, string>>(() => Object.fromEntries(seedStudents.map((s) => [s.id, s.mentorId])));
  const [mentorFilter, setMentorFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [bulkIds, setBulkIds] = useState<string[] | null>(null);

  const caseload = (mentorId: string) => Object.values(mentorOf).filter((m) => m === mentorId).length;

  const reassign = (ids: string[], mentorId: string, note?: string) => {
    const m = staffById(mentorId);
    const moving = ids.filter((id) => mentorOf[id] !== mentorId);
    if (moving.length === 0) {
      toast({ title: `Already allocated to ${m?.name}`, tone: "info" });
      return false;
    }
    const cap = m?.allocation.capacity ?? 30;
    const after = caseload(mentorId) + moving.length;
    if (after > cap) {
      toast({ title: `${m?.name} is at capacity`, body: `${caseload(mentorId)} of ${cap} students. Assigning ${moving.length} would make ${after}.`, tone: "danger" });
      return false;
    }
    setMentorOf((prev) => ({ ...prev, ...Object.fromEntries(moving.map((id) => [id, mentorId])) }));
    const first = seedStudents.find((s) => s.id === moving[0]);
    toast({
      title: moving.length === 1 ? `${first?.name} assigned to ${m?.name}` : `${plural(moving.length, "student")} assigned to ${m?.name}`,
      body: `Caseload now ${after} of ${cap}${note ? ` · ${note}` : ""}`,
    });
    return true;
  };

  const mentorRows = useMemo(
    () =>
      seedStudents.filter(
        (s) => s.enrolmentStatus !== "completed" && (!mentorFilter || mentorOf[s.id] === mentorFilter) && (!riskFilter || s.risk.level === riskFilter),
      ),
    [mentorOf, mentorFilter, riskFilter],
  );

  const mentorColumns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={s.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{s.name}</span>
            <span className="block text-[12px] text-ink-3">{s.type === "graduate" ? "Graduate" : `Undergraduate · ${universityById(s.universityId)?.shortName}`}</span>
          </span>
        </span>
      ),
    },
    {
      key: "cohort",
      header: "Cohort",
      render: (s) => <span className="block max-w-[16rem] truncate">{s.cohortIds.length ? cohortById(s.cohortIds[0])?.name : <span className="text-ink-3">Not allocated</span>}</span>,
    },
    { key: "paper", header: "Current paper", mono: true, render: (s) => s.currentPaper ?? "None" },
    {
      key: "risk",
      header: "Risk",
      sortable: true,
      sortValue: (s) => ({ low: 0, medium: 1, high: 2 })[s.risk.level],
      render: (s) => <RiskBadge level={s.risk.level} />,
    },
    { key: "active", header: "Last active", sortable: true, sortValue: (s) => s.lastActiveDaysAgo, render: (s) => (s.lastActiveDaysAgo === 0 ? "Today" : `${s.lastActiveDaysAgo} days ago`) },
    {
      key: "mentor",
      header: "Mentor",
      sortable: true,
      sortValue: (s) => staffName(mentorOf[s.id]),
      render: (s) => (
        <span title={canEdit ? undefined : reason} className="block w-48">
          <Select
            aria-label={`Mentor for ${s.name}`}
            value={mentorOf[s.id]}
            disabled={!canEdit}
            onChange={(e) => reassign([s.id], e.target.value)}
          >
            {mentorStaff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Faculty & mentors"
        sub="Assign faculty to cohorts and assign mentors to students, with teaching load and mentor caseload in view."
        badge={canEdit ? undefined : <ViewOnlyChip reason={reason} />}
        actions={
          <Button variant="secondary" onClick={() => toast({ title: `Report queued: ${tab === "faculty" ? "faculty-load" : "mentor-caseload"}.csv`, tone: "info" })}>
            Export
          </Button>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "faculty", label: "Assign faculty", count: facultyStaff.length },
          { id: "mentors", label: "Assign mentors", count: mentorStaff.length },
        ]}
      />

      {tab === "faculty" ? (
        <div className="space-y-6">
          <Card className="min-w-0">
            <CardHeader title="Faculty load" sub="Weekly teaching hours from the cohort timetables, against each person's capacity." />
            <div className="px-5 pb-5">
              <DataTable bare caption="Faculty load" rows={facultyStaff} columns={facultyColumns} getRowId={(f) => f.id} maxHeight="none" />
            </div>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Cohort assignments"
              sub="One row per cohort and paper. Changing the faculty updates the load above."
              action={
                <FilterSelect
                  label="Cohorts"
                  allLabel="All"
                  value={cohortType}
                  onChange={setCohortType}
                  options={[
                    { value: "acca", label: "ACCA cohorts" },
                    { value: "university", label: "University-linked" },
                  ]}
                />
              }
            />
            <div className="px-5 pb-5">
              <DataTable
                bare
                caption="Cohort faculty assignments"
                rows={visibleAssignments}
                columns={assignmentColumns}
                getRowId={(r) => r.key}
                pageSize={15}
                maxHeight="none"
                rowClassName={(r) => (assign[r.key] !== initialAssignment[r.key] ? "bg-cta-soft" : undefined)}
              />
            </div>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-3">
            {mentorStaff.map((m) => {
              const n = caseload(m.id);
              const cap = m.allocation.capacity ?? 30;
              const high = seedStudents.filter((s) => mentorOf[s.id] === m.id && s.risk.level === "high").length;
              const active = mentorFilter === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setMentorFilter(active ? "" : m.id)}
                  className={cn(
                    "min-w-0 rounded-[var(--radius-lg)] border bg-surface p-4.5 text-left transition-[border-color,box-shadow]",
                    active ? "border-ink shadow-[0_0_0_3px_var(--cta)]" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Avatar name={m.name} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-[14.5px] font-bold text-ink">{m.name}</span>
                      <span className="block truncate text-[12px] text-ink-3">{m.title}</span>
                    </span>
                  </span>
                  <span className="mt-4 flex items-baseline gap-1.5">
                    <span className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{n}</span>
                    <span className="text-[12.5px] text-ink-3">of {cap} students</span>
                    {high ? (
                      <StatusPill status="High risk" tone="rose" size="sm" className="ml-auto">
                        {high} high risk
                      </StatusPill>
                    ) : null}
                  </span>
                  <Progress value={(n / cap) * 100} tone={n >= cap ? "rose" : n / cap >= 0.85 ? "amber" : "brand"} className="mt-2.5" />
                  <span className="mt-2 block truncate text-[12px] text-ink-3">{m.cohortIds.map((id) => cohortById(id)?.name.split(" · ")[0]).join(", ")}</span>
                </button>
              );
            })}
          </div>

          <DataTable
            caption="Student mentor allocation"
            rows={mentorRows}
            columns={mentorColumns}
            getRowId={(s) => s.id}
            search={{ placeholder: "Search student or cohort", match: (s, q) => s.name.toLowerCase().includes(q) || (cohortById(s.cohortIds[0])?.name ?? "").toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(mentorFilter || riskFilter)}
                onClear={() => {
                  setMentorFilter("");
                  setRiskFilter("");
                }}
              >
                <FilterSelect label="Mentor" allLabel="All mentors" value={mentorFilter} onChange={setMentorFilter} options={mentorStaff.map((m) => ({ value: m.id, label: m.name }))} />
                <FilterSelect
                  label="Risk"
                  allLabel="Any"
                  value={riskFilter}
                  onChange={setRiskFilter}
                  options={[
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                    { value: "low", label: "Low" },
                  ]}
                />
              </FilterBar>
            }
            selectable={canEdit}
            bulkActions={(ids, clear) => (
              <Button
                size="sm"
                onClick={() => {
                  setBulkIds(ids);
                  clear();
                }}
              >
                <UserCog className="size-3.5" />
                Reassign mentor
              </Button>
            )}
            initialSort={{ key: "risk", dir: "desc" }}
          />
          <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
            <AlertTriangle aria-hidden className="size-3.5 shrink-0" />
            Mentors see only their allocated students. A reassignment moves the student&apos;s action plans and notes to the new mentor.
          </p>
        </div>
      )}

      <FormDrawer
        open={bulkIds !== null}
        onClose={() => setBulkIds(null)}
        title="Reassign mentor"
        sub={`${plural(bulkIds?.length ?? 0, "student")} selected`}
        submitLabel="Assign mentor"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const ok = reassign(bulkIds ?? [], String(data.get("mentor")), String(data.get("reason") ?? "").trim() || undefined);
          if (ok) setBulkIds(null);
        }}
      >
        <Field label="New mentor">
          <Select name="mentor" defaultValue="st-sana">
            {mentorStaff.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {caseload(m.id)} of {m.allocation.capacity}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Reason">
          <Textarea name="reason" rows={3} placeholder="e.g. Moving to the SBR cohort in March" />
        </Field>
        <Checkbox name="notify" defaultChecked label="Notify the students and both mentors" />
      </FormDrawer>
    </div>
  );
}
