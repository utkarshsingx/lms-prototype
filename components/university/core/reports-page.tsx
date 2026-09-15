"use client";

import { useMemo, useState } from "react";
import { Building2, Download, FileBarChart, History, Layers, Lock, Mail, RefreshCw, UserRound } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  cohortsForUniversity,
  formatAccaDate,
  formatDateTime,
  reportCatalogue,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { Checkbox, Field, Select, Switch } from "@/components/ui/field";
import { Segmented } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { attendanceOf, intakeShort, sectionsForUniversity, universityClasses, universityStudents } from "./data";
import {
  EXEC_PERIODS,
  EXEC_SECTIONS,
  ExecutiveSummaryPreview,
  type ExecPeriodId,
  type ExecSectionId,
} from "./executive-preview";
import { MiniLabel, plural, queueReport, slug, UniversityHeader, useUniversityWorkspace } from "./shared";

type Format = "PDF" | "CSV";
type ReportKind = "Student report" | "Cohort report" | "Executive summary";

type HistoryRow = {
  id: string;
  report: ReportKind;
  scope: string;
  format: Format;
  file: string;
  by: string;
  at: string;
  size: string;
  status: "ready" | "queued";
};

const FORMAT_ITEMS = [
  { id: "PDF", label: "PDF" },
  { id: "CSV", label: "CSV" },
];

const STUDENT_FILTERS = [
  { id: "all", label: "All students in scope" },
  { id: "at-risk", label: "At-risk students only" },
  { id: "pending", label: "Records pending verification" },
  { id: "unregistered", label: "Not yet registered with ACCA" },
] as const;

const STUDENT_COLUMNS = [
  { id: "acca", label: "ACCA progress" },
  { id: "attendance", label: "Attendance and readiness" },
  { id: "mocks", label: "Mocks and results" },
  { id: "mentor", label: "Mentor interventions" },
  { id: "careers", label: "Internships and placement readiness" },
] as const;

const COHORT_PERIODS = [
  { id: "semester", label: "Semester to date", from: "2026-07-15", to: ACCA_TODAY },
  { id: "4-weeks", label: "Last 4 weeks", from: addDays(ACCA_TODAY, -28), to: ACCA_TODAY },
  { id: "aug-2026", label: "August 2026", from: "2026-08-01", to: "2026-08-31" },
] as const;

export function UniversityReportsPage() {
  const { uni, canEdit, reason, persona } = useUniversityWorkspace();
  const roster = useMemo(() => universityStudents(uni.id), [uni.id]);
  const sections = useMemo(() => sectionsForUniversity(uni.id), [uni.id]);
  const cohorts = useMemo(() => cohortsForUniversity(uni.id), [uni.id]);
  const classes = useMemo(() => universityClasses(uni.id), [uni.id]);
  const ws = uni.workspace.slug;
  const catalogue = (id: string) => reportCatalogue.find((r) => r.id === id);

  /* student report */
  const [stScope, setStScope] = useState("all");
  const [stFilter, setStFilter] = useState<string>("all");
  const [stColumns, setStColumns] = useState<string[]>(["acca", "attendance", "mocks"]);
  const [stFormat, setStFormat] = useState<Format>("CSV");

  const stRows = roster.filter((s) => {
    const inScope =
      stScope === "all" ||
      (stScope.startsWith("intake:") && s.intakeId === stScope.slice(7)) ||
      (stScope.startsWith("section:") && s.sectionId === stScope.slice(8));
    const matches =
      stFilter === "all" ||
      (stFilter === "at-risk" && s.risk.level !== "low") ||
      (stFilter === "pending" && (s.verification.status === "pending" || s.verification.status === "mismatch")) ||
      (stFilter === "unregistered" && s.registration.status !== "registered");
    return inScope && matches;
  });
  const stScopeLabel =
    stScope === "all"
      ? "All intakes"
      : stScope.startsWith("intake:")
        ? intakeShort(stScope.slice(7))
        : (sections.find((s) => s.id === stScope.slice(8))?.label ?? "Section");
  const stFilterLabel = STUDENT_FILTERS.find((f) => f.id === stFilter)?.label ?? "";

  /* cohort report */
  const [coCohort, setCoCohort] = useState(cohorts[0]?.id ?? "");
  const [coSection, setCoSection] = useState("");
  const [coPeriod, setCoPeriod] = useState<string>("semester");
  const [coFormat, setCoFormat] = useState<Format>("PDF");

  const cohort = cohorts.find((c) => c.id === coCohort);
  const cohortSections = sections.filter((s) => s.cohortId === coCohort);
  const section = cohortSections.find((s) => s.id === coSection);
  const period = COHORT_PERIODS.find((x) => x.id === coPeriod) ?? COHORT_PERIODS[0];
  const coClasses = classes.filter(
    (c) =>
      c.cohortId === coCohort &&
      (!coSection || c.sectionId === coSection) &&
      c.start.slice(0, 10) >= period.from &&
      c.start.slice(0, 10) <= period.to,
  );
  const coAttendance = attendanceOf(coClasses);
  const coHeld = coClasses.filter((c) => c.attendance?.marked).length;
  const coStudents = section?.size ?? cohort?.size ?? 0;
  const coScopeLabel = cohort
    ? `${intakeShort(cohort.intakeId ?? "")} · Semester ${cohort.semester} · ${section ? section.name : "all sections"}`
    : "Cohort";

  /* executive summary */
  const [exPeriod, setExPeriod] = useState<ExecPeriodId>("sep-2026");
  const [exInclude, setExInclude] = useState<ExecSectionId[]>(EXEC_SECTIONS.map((s) => s.id));
  const [exFormat, setExFormat] = useState<Format>("PDF");
  const exPeriodMeta = EXEC_PERIODS.find((p) => p.id === exPeriod) ?? EXEC_PERIODS[0];

  /* schedules and history */
  const [schedules, setSchedules] = useState([
    { id: "sch-exec", title: "Executive summary", sub: "PDF on the 1st of each month to Prof. Lakshmi Rao and Dr Suresh Nair", on: true },
    { id: "sch-risk", title: "At-risk student list", sub: "CSV every Monday at 08:00 to Dr Suresh Nair", on: true },
    { id: "sch-cohort", title: "Cohort report", sub: "PDF after each university examination period to the Board of Studies", on: false },
  ]);

  const [history, setHistory] = useState<HistoryRow[]>(() => {
    const atRisk = roster.filter((s) => s.risk.level !== "low").length;
    const secA = sections.find((s) => s.cohort.intakeId === "in-2025-jul" && s.name.endsWith("A"));
    const secACount = secA ? roster.filter((s) => s.sectionId === secA.id).length : 0;
    return [
      { id: "h-6", report: "Cohort report", scope: "2025 intake · Semester 3 · all sections", format: "PDF", file: `${ws}-cohort-report-2025-intake-semester-3.pdf`, by: "Prof. Lakshmi Rao", at: "2026-09-09T11:42", size: "6 pages", status: "ready" },
      { id: "h-5", report: "Student report", scope: "2025 intake · Section A", format: "CSV", file: `${ws}-student-report-2025-intake-section-a.csv`, by: "Dr Suresh Nair", at: "2026-09-09T11:20", size: plural(secACount, "row"), status: "ready" },
      { id: "h-4", report: "Student report", scope: "All intakes · at-risk students only", format: "CSV", file: `${ws}-student-report-at-risk.csv`, by: "Dr Suresh Nair", at: "2026-09-07T08:00", size: plural(atRisk, "row"), status: "ready" },
      { id: "h-3", report: "Executive summary", scope: "August 2026 · all sections", format: "PDF", file: `${ws}-executive-summary-aug-2026.pdf`, by: "Scheduled delivery", at: "2026-09-01T09:00", size: "2 pages", status: "ready" },
      { id: "h-2", report: "Cohort report", scope: "2026 intake · Semester 1 · all sections", format: "CSV", file: `${ws}-cohort-report-2026-intake-semester-1.csv`, by: "Dr Suresh Nair", at: "2026-08-28T10:30", size: "4 rows", status: "ready" },
      { id: "h-1", report: "Executive summary", scope: "July 2026 · all sections", format: "PDF", file: `${ws}-executive-summary-jul-2026.pdf`, by: "Scheduled delivery", at: "2026-08-01T09:00", size: "2 pages", status: "ready" },
    ];
  });
  const [kind, setKind] = useState("");

  function queue(row: Omit<HistoryRow, "id" | "by" | "at" | "status">) {
    const id = `h-new-${history.length + 1}`;
    const minute = String(Math.min(59, 30 + history.length)).padStart(2, "0");
    setHistory((list) => [{ ...row, id, by: persona.name, at: `${ACCA_TODAY}T10:${minute}`, status: "queued" }, ...list]);
    queueReport(row.file, `${row.report} · ${row.scope}`);
    // Simulated generation: the queued row turns ready shortly after.
    window.setTimeout(() => {
      setHistory((list) => list.map((h) => (h.id === id ? { ...h, status: "ready" } : h)));
    }, 2200);
  }

  const historyRows = kind ? history.filter((h) => h.report === kind) : history;

  const columns: DataTableColumn<HistoryRow>[] = [
    {
      key: "report",
      header: "Report",
      sortable: true,
      render: (h) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{h.report}</span>
          <span className="block text-[12px] text-ink-3">{h.scope}</span>
        </span>
      ),
    },
    {
      key: "file",
      header: "File",
      render: (h) => <span className="font-mono text-[12px] text-ink-2">{h.file}</span>,
    },
    {
      key: "format",
      header: "Format",
      sortable: true,
      render: (h) => (
        <StatusPill status={h.format} tone="neutral" dot={false} size="sm">
          {h.format}
        </StatusPill>
      ),
    },
    { key: "size", header: "Size", mono: true, className: "text-ink-2" },
    { key: "by", header: "Downloaded by", sortable: true },
    { key: "at", header: "Requested", sortable: true, render: (h) => formatDateTime(h.at) },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (h) => (
        <StatusPill status={h.status} tone={h.status === "ready" ? "jade" : "amber"}>
          {h.status === "ready" ? "Ready" : "Queued"}
        </StatusPill>
      ),
    },
    {
      key: "again",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (h) =>
        h.status === "ready" ? (
          <Button size="xs" variant="outline" onClick={() => queueReport(h.file, `${h.report} · ${h.scope}`)}>
            <RefreshCw className="size-3.5" />
            Download again
          </Button>
        ) : (
          <span className="text-[12px] text-ink-3">Generating</span>
        ),
    },
  ];

  const exPages = 1 + Math.ceil(exInclude.length / 3);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <UniversityHeader
        section="Overview"
        title="Reports"
        sub={`Download student, cohort and executive reports for ${uni.name}. Every report covers your university's ACCA learners only.`}
        badge={<ScopeChip icon={<Building2 />}>{`${uni.shortName} · ${uni.headline.students} students`}</ScopeChip>}
        actions={
          <Button
            onClick={() =>
              queue({
                report: "Executive summary",
                scope: `${exPeriodMeta.label} · all sections`,
                format: "PDF",
                file: `${ws}-executive-summary-${exPeriodMeta.file}.pdf`,
                size: `${exPages} pages`,
              })
            }
          >
            <Download className="size-4" />
            Download executive summary
          </Button>
        }
      />

      <section aria-label="Download reports" className="grid gap-4 lg:grid-cols-3">
        <ReportCard
          icon={<UserRound />}
          title="Student report"
          description={catalogue("rpt-university-student")?.description ?? ""}
          meta={`${catalogue("rpt-university-student")?.schedule ?? "On demand"} · last run ${formatAccaDate(catalogue("rpt-university-student")?.lastRun ?? ACCA_TODAY)}`}
          pii
          format={stFormat}
          onFormat={setStFormat}
          summary={
            stFormat === "CSV"
              ? `${plural(stRows.length, "student")} · one row each · ${plural(stColumns.length + 1, "column group")}`
              : `${plural(stRows.length, "student")} · one page each`
          }
          disabled={stRows.length === 0}
          disabledReason="No students match this scope."
          onDownload={() =>
            queue({
              report: "Student report",
              scope: `${stScopeLabel} · ${stFilterLabel.toLowerCase()}`,
              format: stFormat,
              file: `${ws}-student-report-${slug(stScopeLabel)}${stFilter === "all" ? "" : `-${stFilter}`}.${stFormat.toLowerCase()}`,
              size: stFormat === "CSV" ? plural(stRows.length, "row") : plural(stRows.length, "page"),
            })
          }
        >
          <Field label="Scope">
            <Select value={stScope} onChange={(e) => setStScope(e.target.value)}>
              <option value="all">All intakes</option>
              {[...new Set(roster.map((s) => s.intakeId))].sort().map((id) => (
                <option key={id} value={`intake:${id}`}>
                  {intakeShort(id)}
                </option>
              ))}
              {sections.map((s) => (
                <option key={s.id} value={`section:${s.id}`}>
                  {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Students">
            <Select value={stFilter} onChange={(e) => setStFilter(e.target.value)}>
              {STUDENT_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Include</legend>
            <div className="space-y-2">
              <Checkbox checked readOnly disabled label="Roll no, semester, section and ACCA ID" />
              {STUDENT_COLUMNS.map((c) => (
                <Checkbox
                  key={c.id}
                  checked={stColumns.includes(c.id)}
                  onChange={(e) =>
                    setStColumns((list) => (e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id)))
                  }
                  label={c.label}
                />
              ))}
            </div>
          </fieldset>
        </ReportCard>

        <ReportCard
          icon={<Layers />}
          title="Cohort report"
          description={catalogue("rpt-university-cohort")?.description ?? ""}
          meta={`${catalogue("rpt-university-cohort")?.schedule ?? "Monthly"} · last run ${formatAccaDate(catalogue("rpt-university-cohort")?.lastRun ?? ACCA_TODAY)}`}
          format={coFormat}
          onFormat={setCoFormat}
          summary={`${coStudents} students · ${plural(coHeld, "class", "classes")} marked · attendance ${coAttendance == null ? "not recorded" : `${coAttendance}%`}`}
          onDownload={() =>
            queue({
              report: "Cohort report",
              scope: `${coScopeLabel} · ${period.label.toLowerCase()}`,
              format: coFormat,
              file: `${ws}-cohort-report-${slug(coScopeLabel)}-${period.id}.${coFormat.toLowerCase()}`,
              size:
                coFormat === "PDF"
                  ? `${2 + (section ? 1 : cohortSections.length) * 2} pages`
                  : plural(section ? 1 : cohortSections.length, "row"),
            })
          }
        >
          <Field label="Cohort">
            <Select
              value={coCohort}
              onChange={(e) => {
                setCoCohort(e.target.value);
                setCoSection("");
              }}
            >
              {cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {intakeShort(c.intakeId ?? "")} · Semester {c.semester} · {c.papers.join(", ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section">
            <Select value={coSection} onChange={(e) => setCoSection(e.target.value)}>
              <option value="">All sections</option>
              {cohortSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.size} students
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Period">
            <Select value={coPeriod} onChange={(e) => setCoPeriod(e.target.value)}>
              {COHORT_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <p className="text-[12px] leading-snug text-ink-3">
            Section attendance, mock averages, pass rates, readiness bands and at-risk counts.
          </p>
        </ReportCard>

        <ReportCard
          icon={<FileBarChart />}
          title="Executive summary"
          description={catalogue("rpt-university-executive")?.description ?? ""}
          meta={`${catalogue("rpt-university-executive")?.schedule ?? "Monthly"} · last run ${formatAccaDate(catalogue("rpt-university-executive")?.lastRun ?? ACCA_TODAY)}`}
          format={exFormat}
          onFormat={setExFormat}
          summary={exFormat === "PDF" ? `${exPages} pages · preview below` : "Figures only · preview below"}
          onDownload={() =>
            queue({
              report: "Executive summary",
              scope: `${exPeriodMeta.label} · all sections`,
              format: exFormat,
              file: `${ws}-executive-summary-${exPeriodMeta.file}.${exFormat.toLowerCase()}`,
              size: exFormat === "PDF" ? `${exPages} pages` : "32 rows",
            })
          }
        >
          <Field label="Period">
            <Select value={exPeriod} onChange={(e) => setExPeriod(e.target.value as ExecPeriodId)}>
              {EXEC_PERIODS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Sections</legend>
            <div className="space-y-2">
              <Checkbox checked readOnly disabled label="Headline figures and key messages" />
              {EXEC_SECTIONS.map((s) => (
                <Checkbox
                  key={s.id}
                  checked={exInclude.includes(s.id)}
                  onChange={(e) =>
                    setExInclude((list) =>
                      e.target.checked
                        ? EXEC_SECTIONS.map((x) => x.id).filter((x) => x === s.id || list.includes(x))
                        : list.filter((x) => x !== s.id),
                    )
                  }
                  label={s.label}
                />
              ))}
            </div>
          </fieldset>
        </ReportCard>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <section aria-label="Executive summary preview" className="min-w-0 space-y-2.5">
          <MiniLabel>Executive summary preview</MiniLabel>
          <ExecutiveSummaryPreview period={exPeriod} include={exInclude} format={exFormat} />
        </section>

        <div className="min-w-0 space-y-4 xl:pt-6">
          <Card className="min-w-0">
            <CardHeader
              title="Scheduled delivery"
              sub="Reports emailed from the workspace on a fixed schedule"
              action={<Mail aria-hidden className="size-4 text-ink-3" />}
            />
            <ul className="divide-y divide-line border-t border-line">
              {schedules.map((s) => (
                <li key={s.id} className="px-5 py-3.5">
                  <span
                    title={canEdit ? undefined : reason}
                    aria-disabled={!canEdit}
                    className={cn("block", !canEdit && "pointer-events-none opacity-60")}
                  >
                    <Switch
                      checked={s.on}
                      label={s.title}
                      sub={s.sub}
                      onChange={(next) => {
                        if (!canEdit) return;
                        setSchedules((list) => list.map((x) => (x.id === s.id ? { ...x, on: next } : x)));
                        toast({
                          title: next ? "Scheduled delivery on" : "Scheduled delivery paused",
                          body: `${s.title} · ${s.sub}`,
                          tone: next ? "success" : "neutral",
                        });
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            {!canEdit ? (
              <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-[12px] text-ink-3" title={reason}>
                <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                View-only access: you can download reports but cannot change scheduled delivery.
              </p>
            ) : null}
          </Card>

          <Card className="min-w-0 p-5">
            <h2 className="text-[14.5px] font-bold text-ink">Personal data in reports</h2>
            <ul className="mt-2.5 space-y-2 text-[12.5px] leading-snug text-ink-2">
              <li>Student reports name individual learners and are logged each time they are downloaded.</li>
              <li>Cohort reports and the executive summary contain totals and averages only.</li>
              <li>Fee balances are not included. Financial administration stays with the ZSkillup programme team.</li>
            </ul>
          </Card>
        </div>
      </div>

      <section aria-labelledby="ua-download-history" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 id="ua-download-history" className="flex items-center gap-2 font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              <History aria-hidden className="size-5 text-ink-3" />
              Download history
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Every report downloaded from this workspace, newest first.</p>
          </div>
        </div>
        <DataTable
          caption="Download history"
          rows={historyRows}
          columns={columns}
          getRowId={(h) => h.id}
          pageSize={8}
          initialSort={{ key: "at", dir: "desc" }}
          search={{
            placeholder: "Search report, scope or person",
            match: (h, q) =>
              h.report.toLowerCase().includes(q) || h.scope.toLowerCase().includes(q) || h.by.toLowerCase().includes(q) || h.file.includes(q),
          }}
          filters={
            <FilterSelect
              label="Report"
              allLabel="All reports"
              value={kind}
              onChange={setKind}
              options={["Student report", "Cohort report", "Executive summary"]}
            />
          }
        />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ report card */

function ReportCard({
  icon,
  title,
  description,
  meta,
  pii,
  format,
  onFormat,
  summary,
  disabled,
  disabledReason,
  onDownload,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  pii?: boolean;
  format: Format;
  onFormat: (f: Format) => void;
  summary: string;
  disabled?: boolean;
  disabledReason?: string;
  onDownload: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex min-w-0 flex-col p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-inv text-cta [&>svg]:size-5">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">{title}</h2>
            {pii ? (
              <StatusPill status="Personal data" tone="amber" size="sm">
                Personal data
              </StatusPill>
            ) : null}
          </div>
          <p className="mt-1 text-[13px] leading-snug text-ink-2">{description}</p>
          <p className="mt-1 text-[12px] text-ink-3">{meta}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3.5 border-t border-line pt-4">{children}</div>

      <div className="mt-auto pt-4">
        <div className="space-y-3 rounded-[14px] border border-line bg-surface-2 p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12.5px] font-semibold text-ink-2">Format</span>
            <Segmented size="sm" items={FORMAT_ITEMS} value={format} onChange={(id) => onFormat(id as Format)} />
          </div>
          <p className="text-[12.5px] text-ink-3">{summary}</p>
          <span title={disabled ? disabledReason : undefined} className="flex">
            <Button type="button" className="w-full" disabled={disabled} onClick={onDownload}>
              <Download className="size-4" />
              Download {format}
            </Button>
          </span>
        </div>
      </div>
    </Card>
  );
}
