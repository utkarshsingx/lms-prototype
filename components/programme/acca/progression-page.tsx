"use client";

import { useMemo, useState } from "react";
import { Award, BriefcaseBusiness, FileBarChart2, Send, ShieldCheck } from "lucide-react";
import {
  ACCA_TODAY,
  APPLIED_KNOWLEDGE,
  APPLIED_SKILLS,
  STRATEGIC_ESSENTIALS,
  STRATEGIC_OPTIONS,
  cohorts,
  epsm,
  formatAccaDate,
  paperByCode,
  papersCleared,
  per,
  perObjectives,
  programmeById,
  reportCatalogue,
  students as allStudents,
  universities,
  universityById,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { StackedBar } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural, slug, useEditAccess } from "./common";

/* ------------------------------------------------------------------ model */

type Row = {
  id: string;
  student: Student;
  epsmStatus: Student["epsm"]["status"];
  epsmProgress: number;
  epsmCompletedOn?: string;
  perStatus: Student["per"]["status"];
  months: number;
  objectives: string[];
  employer?: string;
  supervisor?: string;
  supervisorConfirmed: boolean;
};

const SEED: Row[] = allStudents.map((s) => ({
  id: s.id,
  student: s,
  epsmStatus: s.epsm.status,
  epsmProgress: s.epsm.progress,
  epsmCompletedOn: s.epsm.completedOn,
  perStatus: s.per.status,
  months: s.per.months,
  objectives: s.per.objectives,
  employer: s.per.employer,
  supervisor: s.per.supervisor,
  // A supervisor confirms experience once the first six months are logged.
  supervisorConfirmed: Boolean(s.per.supervisor) && s.per.months >= 6,
}));

const ESSENTIAL = perObjectives.filter((o) => o.kind === "essential").map((o) => o.id);
const TECHNICAL = perObjectives.filter((o) => o.kind === "technical").map((o) => o.id);

function objectiveCounts(ids: string[]) {
  const essential = ids.filter((id) => ESSENTIAL.includes(id)).length;
  const technical = ids.filter((id) => TECHNICAL.includes(id)).length;
  return { essential, technical, counted: Math.min(essential, per.essentialRequired) + Math.min(technical, per.technicalRequired) };
}

const cleared = (s: Student, code: PaperCode) => s.papers[code].status === "passed" || s.papers[code].status === "exempt";
const levelComplete = (s: Student, codes: PaperCode[]) => codes.every((c) => cleared(s, c));
const strategicStarted = (s: Student) =>
  [...STRATEGIC_ESSENTIALS, ...STRATEGIC_OPTIONS].some((c) => s.papers[c].status !== "not-started" && s.papers[c].status !== "upcoming");

const SCOPES = [
  { value: "all", label: "All learners" },
  { value: "graduate", label: "Graduate learners" },
  { value: "undergraduate", label: "University undergraduates" },
  ...universities.map((u) => ({ value: u.id, label: u.name })),
  ...cohorts.map((c) => ({ value: c.id, label: c.name })),
];

const LEVELS = [
  { value: "all", label: "All levels" },
  { value: "applied-knowledge", label: "Applied Knowledge" },
  { value: "applied-skills", label: "Applied Skills" },
  { value: "strategic-professional", label: "Strategic Professional" },
];

const LEVEL_PAPERS: Record<string, PaperCode[]> = {
  all: [...APPLIED_KNOWLEDGE, ...APPLIED_SKILLS, ...STRATEGIC_ESSENTIALS],
  "applied-knowledge": APPLIED_KNOWLEDGE,
  "applied-skills": APPLIED_SKILLS,
  "strategic-professional": [...STRATEGIC_ESSENTIALS, ...STRATEGIC_OPTIONS],
};

const INCLUDES = ["Papers and attempts", "Exemptions", "Ethics Module", "Practical experience"] as const;

type HistoryRow = { id: string; name: string; scope: string; level: string; format: string; rows: number; by: string; on: string };

const progressionReport = reportCatalogue.find((r) => r.id === "rpt-progression")!;

const SEED_HISTORY: HistoryRow[] = [
  { id: "h2", name: "acca-progression-all-learners-all-levels.csv", scope: "All learners", level: "All levels", format: "CSV", rows: 64, by: "Priya Menon", on: progressionReport.lastRun },
  { id: "h1", name: "acca-progression-brightwater-university-applied-knowledge.xlsx", scope: "Brightwater University", level: "Applied Knowledge", format: "XLSX", rows: 20, by: "Imran Sheikh", on: "2026-04-22" },
];

function inScope(s: Student, scope: string) {
  if (scope === "all") return true;
  if (scope === "graduate" || scope === "undergraduate") return s.type === scope;
  if (scope.startsWith("u-")) return s.universityId === scope;
  return s.cohortIds.includes(scope);
}

/* ------------------------------------------------------------------ page */

export function ProgressionPage() {
  const { canEdit, reason, persona } = useEditAccess("programme:acca");
  const [tab, setTab] = useState("epsm");
  const [rows, setRows] = useState<Row[]>(SEED);

  const [epsmFilter, setEpsmFilter] = useState("");
  const [epsmType, setEpsmType] = useState("");
  const [perFilter, setPerFilter] = useState("active");
  const [completing, setCompleting] = useState<Row | null>(null);
  const [perEditing, setPerEditing] = useState<Row | null>(null);
  const [perObjectivesDraft, setPerObjectivesDraft] = useState<string[]>([]);

  const [scope, setScope] = useState("all");
  const [level, setLevel] = useState("all");
  const [includes, setIncludes] = useState<string[]>([...INCLUDES]);
  const [format, setFormat] = useState<string>("CSV");
  const [history, setHistory] = useState<HistoryRow[]>(SEED_HISTORY);

  const counts = useMemo(() => {
    const epsmComplete = rows.filter((r) => r.epsmStatus === "complete").length;
    const epsmProgress = rows.filter((r) => r.epsmStatus === "in-progress").length;
    const perComplete = rows.filter((r) => r.perStatus === "complete").length;
    const perActive = rows.filter((r) => r.perStatus === "in-progress");
    return {
      epsmComplete,
      epsmProgress,
      perComplete,
      perActive: perActive.length,
      avgMonths: perActive.length ? Math.round(perActive.reduce((s, r) => s + r.months, 0) / perActive.length) : 0,
      unconfirmed: rows.filter((r) => r.perStatus !== "not-started" && !r.supervisorConfirmed).length,
    };
  }, [rows]);

  const update = (id: string, patch: Partial<Row>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  /* ------------------------------------------------ EPSM */

  const epsmVisible = rows.filter((r) => (!epsmFilter || r.epsmStatus === epsmFilter) && (!epsmType || r.student.type === epsmType));

  const epsmByType = (["graduate", "undergraduate"] as const).map((t) => {
    const list = rows.filter((r) => r.student.type === t);
    return {
      label: t === "graduate" ? "Graduate learners" : "University undergraduates",
      parts: [
        { label: "Complete", value: list.filter((r) => r.epsmStatus === "complete").length, tone: "jade" },
        { label: "In progress", value: list.filter((r) => r.epsmStatus === "in-progress").length, tone: "amber" },
        { label: "Not started", value: list.filter((r) => r.epsmStatus === "not-started").length, tone: "line-strong" },
      ],
    };
  });

  const epsmColumns: DataTableColumn<Row>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">
            {r.student.universityId ? universityById(r.student.universityId)?.shortName : programmeById(r.student.programmeId)?.name}
          </span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Ethics Module",
      sortable: true,
      sortValue: (r) => ["in-progress", "not-started", "complete"].indexOf(r.epsmStatus),
      render: (r) => <StatusPill status={r.epsmStatus} />,
    },
    {
      key: "progress",
      header: "Progress",
      sortable: true,
      sortValue: (r) => r.epsmProgress,
      render: (r) => (
        <span className="flex items-center gap-2.5">
          <Progress value={r.epsmProgress} tone={r.epsmStatus === "complete" ? "jade" : "cta"} className="w-24" />
          <span className="font-mono text-[12px] text-ink-2 tnum">{r.epsmProgress}%</span>
        </span>
      ),
    },
    {
      key: "units",
      header: "Units",
      align: "right",
      mono: true,
      render: (r) => `${Math.round((r.epsmProgress / 100) * epsm.units.length)} of ${epsm.units.length}`,
    },
    { key: "completed", header: "Completed on", sortable: true, sortValue: (r) => r.epsmCompletedOn, render: (r) => (r.epsmCompletedOn ? formatAccaDate(r.epsmCompletedOn) : null) },
    {
      key: "current",
      header: "Current paper",
      render: (r) => {
        const code = r.student.currentPaper;
        if (!code) return null;
        const strategic = paperByCode(code)?.level === "strategic-professional";
        return (
          <span className="flex items-center gap-2">
            <span className="font-mono text-[12px] font-semibold text-ink">{code}</span>
            {strategic && r.epsmStatus !== "complete" ? <StatusPill status="Needed before SBL" tone="rose" size="sm" /> : null}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        r.epsmStatus !== "complete" ? (
          <span className="flex justify-end gap-1.5">
            <GatedButton
              size="xs"
              variant="outline"
              allowed={canEdit}
              reason={reason}
              onClick={() => toast({ title: `Ethics Module reminder sent to ${r.student.name}`, body: `${r.epsmProgress}% complete · in-app and email` })}
            >
              Remind
            </GatedButton>
            <GatedButton size="xs" variant="secondary" allowed={canEdit} reason={reason} onClick={() => setCompleting(r)}>
              Record completion
            </GatedButton>
          </span>
        ) : null,
    },
  ];

  /* ------------------------------------------------ PER */

  const perVisible = rows.filter((r) =>
    perFilter === "active" ? r.perStatus !== "not-started" : perFilter === "unconfirmed" ? r.perStatus !== "not-started" && !r.supervisorConfirmed : !perFilter || r.perStatus === perFilter,
  );

  const perColumns: DataTableColumn<Row>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">{r.employer ?? "No employer recorded"}</span>
        </span>
      ),
    },
    {
      key: "supervisor",
      header: "Practical experience supervisor",
      render: (r) =>
        r.supervisor ? (
          <span className="block">
            <span className="block text-ink">{r.supervisor}</span>
            <span className="mt-1 block">
              {r.supervisorConfirmed ? (
                <StatusPill status="Supervisor confirmed" tone="jade" size="sm" />
              ) : (
                <StatusPill status="Awaiting confirmation" tone="amber" size="sm" />
              )}
            </span>
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">Not yet nominated</span>
        ),
    },
    {
      key: "months",
      header: "Experience",
      sortable: true,
      sortValue: (r) => r.months,
      render: (r) => (
        <span className="block w-32">
          <span className="flex items-baseline justify-between text-[12px]">
            <span className="font-mono font-semibold text-ink tnum">{r.months}</span>
            <span className="text-ink-3">of {per.monthsRequired} months</span>
          </span>
          <Progress value={(r.months / per.monthsRequired) * 100} tone={r.months >= per.monthsRequired ? "jade" : "brand"} className="mt-1" />
        </span>
      ),
    },
    {
      key: "objectives",
      header: "Performance objectives",
      sortable: true,
      sortValue: (r) => objectiveCounts(r.objectives).counted,
      render: (r) => {
        const c = objectiveCounts(r.objectives);
        return (
          <span className="block">
            <span className="flex items-center gap-1" aria-hidden>
              {Array.from({ length: per.objectivesRequired }, (_, i) => (
                <span
                  key={i}
                  className={
                    i < Math.min(c.essential, 5)
                      ? "size-2.5 rounded-full bg-jade"
                      : i >= 5 && i - 5 < Math.min(c.technical, 4)
                        ? "size-2.5 rounded-full bg-info"
                        : "size-2.5 rounded-full bg-surface-3"
                  }
                />
              ))}
            </span>
            <span className="mt-1 block text-[12px] text-ink-3">
              {c.counted} of 9 · essential {Math.min(c.essential, 5)}/5 · technical {Math.min(c.technical, 4)}/4
            </span>
          </span>
        );
      },
    },
    { key: "status", header: "PER status", sortable: true, render: (r) => <StatusPill status={r.perStatus} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => (
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => {
            setPerObjectivesDraft(r.objectives);
            setPerEditing(r);
          }}
        >
          {canEdit ? "Update PER" : "View"}
        </Button>
      ),
    },
  ];

  /* ------------------------------------------------ report */

  const scoped = rows.filter((r) => inScope(r.student, scope));
  const scopeLabel = SCOPES.find((s) => s.value === scope)?.label ?? "All learners";
  const levelLabel = LEVELS.find((l) => l.value === level)?.label ?? "All levels";
  const pct = (n: number) => (scoped.length ? Math.round((n / scoped.length) * 100) : 0);

  const summary = [
    { label: "Registered with ACCA", value: scoped.filter((r) => r.student.registration.status === "registered").length },
    { label: "Applied Knowledge complete", value: scoped.filter((r) => levelComplete(r.student, APPLIED_KNOWLEDGE)).length },
    { label: "Applied Skills complete", value: scoped.filter((r) => levelComplete(r.student, APPLIED_SKILLS)).length },
    { label: "Strategic Professional started", value: scoped.filter((r) => strategicStarted(r.student)).length },
    ...(includes.includes("Ethics Module") ? [{ label: "Ethics Module complete", value: scoped.filter((r) => r.epsmStatus === "complete").length }] : []),
    ...(includes.includes("Practical experience")
      ? [{ label: "PER in progress or complete", value: scoped.filter((r) => r.perStatus !== "not-started").length }]
      : []),
  ];

  const paperRows = LEVEL_PAPERS[level].map((code) => {
    const list = scoped.map((r) => r.student.papers[code].status);
    return {
      code,
      exempt: list.filter((s) => s === "exempt").length,
      passed: list.filter((s) => s === "passed").length,
      current: list.filter((s) => s === "current" || s === "in-progress" || s === "results-pending").length,
      failed: list.filter((s) => s === "failed").length,
    };
  });

  const avgCleared = scoped.length ? (scoped.reduce((s, r) => s + papersCleared(r.student), 0) / scoped.length).toFixed(1) : "0";

  const generate = () => {
    if (includes.length === 0) {
      toast({ title: "Choose at least one section to include", tone: "warning" });
      return;
    }
    const name = `acca-progression-${slug(scopeLabel)}-${slug(levelLabel)}.${format.toLowerCase()}`;
    setHistory((list) => [
      { id: `h-${list.length + 1}`, name, scope: scopeLabel, level: levelLabel, format, rows: scoped.length, by: persona.name, on: ACCA_TODAY },
      ...list,
    ]);
    toast({ title: `Report queued: ${name}`, body: `${plural(scoped.length, "learner")} · ${includes.join(", ")}`, tone: "info" });
  };

  const tabs = [
    { id: "epsm", label: "Track Ethics Module completion", count: counts.epsmProgress },
    { id: "per", label: "Track Practical Experience Requirements", count: counts.unconfirmed },
    { id: "report", label: "Generate ACCA progression reports" },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="ACCA operations"
        title="Progression"
        sub="Track the Ethics and Professional Skills Module and the Practical Experience Requirement alongside exams, and generate ACCA progression reports."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <Button onClick={() => setTab("report")}>
            <FileBarChart2 className="size-4" /> Generate report
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Ethics Module complete" value={`${counts.epsmComplete} of ${rows.length}`} icon={<ShieldCheck />} sub={`${counts.epsmProgress} in progress`} />
        <KpiTile label="PER in progress" value={counts.perActive} tone="info" icon={<BriefcaseBusiness />} sub={`average ${counts.avgMonths} of 36 months`} />
        <KpiTile label="PER complete" value={counts.perComplete} tone="jade" icon={<Award />} sub="36 months and 9 objectives" />
        <KpiTile label="Supervisor confirmation pending" value={counts.unconfirmed} tone="amber" icon={<Send />} sub="Experience not yet signed off" />
      </KpiRow>

      <div className="space-y-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />

        {tab === "epsm" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <Card className="min-w-0">
                <CardHeader title="Completion by learner type" sub="The Ethics and Professional Skills Module is required for membership. Recommended before Strategic Professional." />
                <div className="px-5 pb-5">
                  <StackedBar rows={epsmByType} />
                </div>
              </Card>
              <Card className="min-w-0">
                <CardHeader title={epsm.name} sub={epsm.delivery} />
                <ol className="grid gap-1.5 px-5 pb-5 sm:grid-cols-2">
                  {epsm.units.map((u, i) => (
                    <li key={u.id} className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-2">
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface-2 font-mono text-[10.5px] font-semibold text-ink">{i + 1}</span>
                      <span className="min-w-0 truncate">{u.title}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            </div>
            <DataTable
              caption="Ethics Module completion"
              rows={epsmVisible}
              columns={epsmColumns}
              getRowId={(r) => r.id}
              initialSort={{ key: "status", dir: "asc" }}
              search={{ placeholder: "Search learner", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
              filters={
                <FilterBar
                  active={Boolean(epsmFilter || epsmType)}
                  onClear={() => {
                    setEpsmFilter("");
                    setEpsmType("");
                  }}
                >
                  <FilterSelect
                    label="Status"
                    value={epsmFilter}
                    onChange={setEpsmFilter}
                    allLabel="All"
                    options={[
                      { value: "complete", label: "Complete" },
                      { value: "in-progress", label: "In progress" },
                      { value: "not-started", label: "Not started" },
                    ]}
                  />
                  <FilterSelect
                    label="Type"
                    value={epsmType}
                    onChange={setEpsmType}
                    allLabel="All"
                    options={[
                      { value: "graduate", label: "Graduate" },
                      { value: "undergraduate", label: "Undergraduate" },
                    ]}
                  />
                </FilterBar>
              }
              selectable
              bulkActions={(ids, clear) => (
                <GatedButton
                  size="sm"
                  allowed={canEdit}
                  reason={reason}
                  onClick={() => {
                    const target = rows.filter((r) => ids.includes(r.id) && r.epsmStatus !== "complete");
                    toast({
                      title: `Ethics Module reminder sent to ${plural(target.length, "learner")}`,
                      body: target.length ? "In-app and email" : "Everyone selected has completed the module.",
                      tone: target.length ? "success" : "info",
                    });
                    clear();
                  }}
                >
                  <Send className="size-3.5" /> Send reminder
                </GatedButton>
              )}
            />
          </div>
        ) : null}

        {tab === "per" ? (
          <div className="space-y-4">
            <Note icon={<BriefcaseBusiness />}>{per.summary}</Note>
            <DataTable
              caption="Practical Experience Requirement tracker"
              rows={perVisible}
              columns={perColumns}
              getRowId={(r) => r.id}
              initialSort={{ key: "months", dir: "desc" }}
              search={{
                placeholder: "Search learner, employer or supervisor",
                match: (r, q) =>
                  r.student.name.toLowerCase().includes(q) || (r.employer ?? "").toLowerCase().includes(q) || (r.supervisor ?? "").toLowerCase().includes(q),
              }}
              filters={
                <FilterSelect
                  label="Show"
                  value={perFilter}
                  onChange={setPerFilter}
                  allLabel="All learners"
                  options={[
                    { value: "active", label: "In progress or complete" },
                    { value: "unconfirmed", label: "Awaiting supervisor confirmation" },
                    { value: "complete", label: "Complete" },
                    { value: "not-started", label: "Not started" },
                  ]}
                />
              }
              toolbar={
                <Button type="button" size="sm" variant="outline" onClick={() => toast({ title: "Report queued: per-tracker.csv", tone: "info" })}>
                  Export
                </Button>
              }
            />
          </div>
        ) : null}

        {tab === "report" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <Card className="min-w-0 self-start">
              <CardHeader title="Report settings" sub={`${progressionReport.name} · ${progressionReport.description}`} />
              <div className="space-y-4 px-5 pb-5">
                <Field label="Scope">
                  <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                    <optgroup label="Learners">
                      {SCOPES.slice(0, 3).map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="University">
                      {SCOPES.filter((s) => s.value.startsWith("u-")).map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Cohort">
                      {SCOPES.filter((s) => s.value.startsWith("co-")).map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </optgroup>
                  </Select>
                </Field>
                <Field label="Level">
                  <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <fieldset>
                  <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Include</legend>
                  <div className="grid gap-2">
                    {INCLUDES.map((inc) => (
                      <Checkbox
                        key={inc}
                        checked={includes.includes(inc)}
                        onChange={(e) => setIncludes((list) => (e.target.checked ? [...list, inc] : list.filter((x) => x !== inc)))}
                        label={inc}
                      />
                    ))}
                  </div>
                </fieldset>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Format</p>
                  <Segmented items={progressionReport.formats.map((f) => ({ id: f, label: f }))} value={format} onChange={setFormat} size="sm" />
                </div>
                <Button type="button" className="w-full" onClick={generate}>
                  <FileBarChart2 className="size-4" /> Generate report
                </Button>
                <p className="text-[12px] text-ink-3">Contains personal data. Authorised for Programme Admin and Super Admin.</p>
              </div>
            </Card>

            <div className="min-w-0 space-y-4">
              <Card className="min-w-0">
                <CardHeader
                  title="Preview summary"
                  sub={`${scopeLabel} · ${levelLabel} · ${plural(scoped.length, "learner")} · average ${avgCleared} papers cleared`}
                />
                <div className="grid gap-5 px-5 pb-5 lg:grid-cols-2">
                  <ul className="space-y-3">
                    {summary.map((s) => (
                      <li key={s.label}>
                        <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                          <span className="min-w-0 truncate text-ink-2">{s.label}</span>
                          <span className="shrink-0 font-mono font-semibold text-ink tnum">
                            {s.value} <span className="text-ink-3">· {pct(s.value)}%</span>
                          </span>
                        </div>
                        <Progress value={pct(s.value)} tone="brand" />
                      </li>
                    ))}
                  </ul>
                  <div className="min-w-0">
                    <MiniLabel className="mb-2">Papers · {levelLabel}</MiniLabel>
                    <div className="scrollbar-slim overflow-x-auto rounded-[var(--radius-md)] border border-line">
                      <table className="w-full text-[12.5px]">
                        <thead>
                          <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                            <th className="px-3 py-2">Paper</th>
                            <th className="px-3 py-2 text-right">Exempt</th>
                            <th className="px-3 py-2 text-right">Passed</th>
                            <th className="px-3 py-2 text-right">Studying</th>
                            <th className="px-3 py-2 text-right">Failed</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paperRows.map((p) => (
                            <tr key={p.code} className="border-t border-line">
                              <td className="px-3 py-1.5 font-mono font-semibold text-ink">{p.code}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-ink-2 tnum">{p.exempt}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-ink-2 tnum">{p.passed}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-ink-2 tnum">{p.current}</td>
                              <td className={p.failed ? "px-3 py-1.5 text-right font-mono font-semibold text-rose tnum" : "px-3 py-1.5 text-right font-mono text-ink-2 tnum"}>
                                {p.failed}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </Card>

              <div>
                <MiniLabel className="mb-2.5">Generated reports</MiniLabel>
                <DataTable
                  caption="Generated progression reports"
                  rows={history}
                  getRowId={(h) => h.id}
                  pageSize={5}
                  dense
                  columns={[
                    { key: "name", header: "File", mono: true },
                    { key: "scope", header: "Scope", className: "text-ink-2" },
                    { key: "level", header: "Level", className: "text-ink-2" },
                    { key: "rows", header: "Learners", align: "right", mono: true },
                    { key: "by", header: "Generated by" },
                    { key: "on", header: "On", render: (h) => formatAccaDate(h.on) },
                    {
                      key: "dl",
                      header: <span className="sr-only">Download</span>,
                      align: "right",
                      render: (h) => (
                        <Button type="button" size="xs" variant="ghost" onClick={() => toast({ title: `Downloading ${h.name}`, tone: "info" })}>
                          Download
                        </Button>
                      ),
                    },
                  ]}
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- EPSM completion */}
      <FormDrawer
        open={completing !== null}
        onClose={() => setCompleting(null)}
        title="Record Ethics Module completion"
        sub={completing ? `${completing.student.name} · currently ${completing.epsmProgress}%` : undefined}
        submitLabel="Mark complete"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="ACCA confirms completion in myACCA."
        onSubmit={(data) => {
          if (!completing) return;
          const on = String(data.get("on") || ACCA_TODAY);
          update(completing.id, { epsmStatus: "complete", epsmProgress: 100, epsmCompletedOn: on });
          toast({ title: "Ethics Module completion recorded", body: `${completing.student.name} · ${formatAccaDate(on)}` });
          setCompleting(null);
        }}
      >
        <Field label="Completed on">
          <Input type="date" name="on" defaultValue={ACCA_TODAY} max={ACCA_TODAY} />
        </Field>
        <Field label="Evidence">
          <Select name="evidence" defaultValue="myacca">
            <option value="myacca">Completion shown in the learner&apos;s myACCA account</option>
            <option value="certificate">EPSM completion statement uploaded</option>
          </Select>
        </Field>
      </FormDrawer>

      {/* ---------------------------------------------------------- PER update */}
      <FormDrawer
        open={perEditing !== null}
        onClose={() => setPerEditing(null)}
        title="Practical Experience Requirement"
        sub={perEditing ? `${perEditing.student.name} · ${perEditing.employer ?? "no employer recorded"}` : undefined}
        submitLabel="Save PER record"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          if (!perEditing) return;
          const months = Math.max(0, Math.min(60, Number(data.get("months")) || 0));
          const c = objectiveCounts(perObjectivesDraft);
          const complete = months >= per.monthsRequired && c.essential >= per.essentialRequired && c.technical >= per.technicalRequired;
          const supervisor = String(data.get("supervisor") ?? "").trim() || undefined;
          update(perEditing.id, {
            months,
            objectives: perObjectivesDraft,
            employer: String(data.get("employer") ?? "").trim() || undefined,
            supervisor,
            supervisorConfirmed: Boolean(supervisor) && data.get("confirmed") === "on",
            perStatus: complete ? "complete" : months > 0 || perObjectivesDraft.length ? "in-progress" : "not-started",
          });
          toast({
            title: complete ? "PER complete" : "PER record updated",
            body: `${perEditing.student.name} · ${months} of 36 months · ${c.counted} of 9 objectives`,
          });
          setPerEditing(null);
        }}
      >
        {perEditing ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Experience months" hint="of 36">
                <Input key={`${perEditing.id}-m`} name="months" type="number" min={0} max={60} defaultValue={perEditing.months} disabled={!canEdit} />
              </Field>
              <Field label="Employer">
                <Input key={`${perEditing.id}-e`} name="employer" defaultValue={perEditing.employer ?? ""} disabled={!canEdit} />
              </Field>
            </div>
            <Field label="Practical experience supervisor">
              <Input key={`${perEditing.id}-s`} name="supervisor" defaultValue={perEditing.supervisor ?? ""} placeholder="Name, role" disabled={!canEdit} />
            </Field>
            <Checkbox
              key={`${perEditing.id}-c`}
              name="confirmed"
              defaultChecked={perEditing.supervisorConfirmed}
              disabled={!canEdit}
              label="Supervisor has confirmed the experience in myACCA"
            />
            {(["essential", "technical"] as const).map((kind) => (
              <fieldset key={kind}>
                <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">
                  {kind === "essential" ? "Essential objectives (all 5 required)" : "Technical objectives (4 required)"}
                </legend>
                <div className="grid gap-2">
                  {perObjectives
                    .filter((o) => o.kind === kind)
                    .map((o) => (
                      <Checkbox
                        key={`${perEditing.id}-${o.id}`}
                        checked={perObjectivesDraft.includes(o.id)}
                        disabled={!canEdit}
                        onChange={(e) =>
                          setPerObjectivesDraft((list) => (e.target.checked ? [...list, o.id] : list.filter((x) => x !== o.id)))
                        }
                        label={
                          <span>
                            <span className="font-mono font-semibold text-ink">{o.code}</span> · {o.name}
                          </span>
                        }
                      />
                    ))}
                </div>
              </fieldset>
            ))}
          </>
        ) : null}
      </FormDrawer>
    </div>
  );
}
