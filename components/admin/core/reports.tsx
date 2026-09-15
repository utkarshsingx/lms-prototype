"use client";

import { useMemo, useState } from "react";
import { Download, FileDown, FileLock2, Lock, ShieldCheck } from "lucide-react";
import {
  accaProgression,
  alumniOutcomes,
  APPLIED_KNOWLEDGE,
  APPLIED_SKILLS,
  applications,
  careerOutcomes,
  cohorts,
  crossUniversityReport,
  examSessions,
  internshipRecords,
  opportunityById,
  papersCleared,
  paperByCode,
  programmeById,
  reportCatalogue,
  students as allStudents,
  studentTypeComparison,
  universities,
  universityById,
  type AlumniOutcome,
  type PaperCode,
  type ReportDefinition,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardHeader } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { BarChart, Funnel, LineChart, StackedBar } from "@/components/ui/charts";
import { Badge } from "@/components/ui/badge";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { BRAND_SWATCHES, MiniLabel, ROLE_SHORT, SectionHead, UniversityMark, slugify } from "./shared";

/* ------------------------------------------------------------------ tabs */

export const REPORT_TABS = [
  { id: "cross-university", label: "Cross-university reports" },
  { id: "compare", label: "Compare graduate and undergraduate cohorts" },
  { id: "progression", label: "ACCA progression" },
  { id: "careers", label: "Career outcomes" },
  { id: "export", label: "Export authorised reports" },
];

const TAB_REPORT: Record<string, string> = {
  "cross-university": "rpt-cross-university",
  compare: "rpt-cohort-compare",
  progression: "rpt-progression",
  careers: "rpt-careers",
  export: "rpt-usage",
};

/* ------------------------------------------------------------------ export history */

type ExportRow = {
  id: string;
  file: string;
  report: string;
  scope: string;
  format: string;
  requestedBy: string;
  requested: string;
  status: "Ready" | "Queued" | "Downloaded";
};

const SEED_HISTORY: ExportRow[] = [
  { id: "ex-0006", file: "acca-progression-report-dec-2026-cycle.csv", report: "ACCA progression report", scope: "All programmes", format: "CSV", requestedBy: "Priya Menon", requested: "14 Sep 2026, 10:02", status: "Ready" },
  { id: "ex-0005", file: "platform-usage.csv", report: "Platform usage", scope: "Whole platform", format: "CSV", requestedBy: "Arjun Shetty", requested: "11 Sep 2026, 17:25", status: "Downloaded" },
  { id: "ex-0004", file: "graduate-and-undergraduate-comparison.pdf", report: "Graduate and undergraduate comparison", scope: "All programmes · 2026 intakes", format: "PDF", requestedBy: "Neha Kapoor", requested: "10 Sep 2026, 12:40", status: "Downloaded" },
  { id: "ex-0003", file: "brightwater-executive-report-aug-2026.pdf", report: "University executive report", scope: "Brightwater University", format: "PDF", requestedBy: "Dr Suresh Nair", requested: "9 Sep 2026, 11:15", status: "Downloaded" },
  { id: "ex-0002", file: "cross-university-performance.xlsx", report: "Cross-university performance", scope: "All universities", format: "XLSX", requestedBy: "Scheduled · monthly", requested: "1 Sep 2026, 06:00", status: "Ready" },
  { id: "ex-0001", file: "career-outcomes.csv", report: "Career outcomes", scope: "All programmes", format: "CSV", requestedBy: "Scheduled · monthly", requested: "1 Sep 2026, 06:00", status: "Downloaded" },
];

/* ------------------------------------------------------------------ page */

export function AdminReports({ initialTab = "cross-university" }: { initialTab?: string }) {
  const { persona } = useRole();
  const [tab, setTab] = useState(REPORT_TABS.some((t) => t.id === initialTab) ? initialTab : "cross-university");
  const [history, setHistory] = useState<ExportRow[]>(SEED_HISTORY);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportReport, setExportReport] = useState({ id: TAB_REPORT[tab], n: 0 });

  const openExport = (reportId: string) => {
    setExportReport((r) => ({ id: reportId, n: r.n + 1 }));
    setExportOpen(true);
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Overview"
        title="Reports"
        sub="Cross-university performance, graduate and undergraduate comparison, ACCA progression and career outcomes, with exports limited to authorised roles."
        actions={
          <Button onClick={() => openExport(TAB_REPORT[tab])}>
            <FileDown className="size-4" />
            Export this report
          </Button>
        }
      />

      <Tabs items={REPORT_TABS} value={tab} onChange={setTab} />

      {tab === "cross-university" ? <CrossUniversity onExport={() => openExport("rpt-cross-university")} /> : null}
      {tab === "compare" ? <CompareCohorts onExport={() => openExport("rpt-cohort-compare")} /> : null}
      {tab === "progression" ? <Progression onExport={() => openExport("rpt-progression")} /> : null}
      {tab === "careers" ? <CareerOutcomes onExport={() => openExport("rpt-careers")} /> : null}
      {tab === "export" ? <ExportCatalogue history={history} onExport={openExport} /> : null}

      <ExportDrawer
        open={exportOpen}
        reportId={exportReport.id}
        formKey={exportReport.n}
        onClose={() => setExportOpen(false)}
        onQueued={(row) => {
          setHistory((h) => [{ ...row, id: `ex-${String(h.length + 1).padStart(4, "0")}`, requestedBy: persona.name }, ...h]);
          toast({ title: `Report queued: ${row.file}`, body: `${row.report} · ${row.scope}. Logged in the audit log.`, tone: "info" });
          setExportOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ cross-university */

type UniversityRow = (typeof crossUniversityReport)[number] & { nps: number | null };

/* Learner survey net promoter score, last survey Aug 2026. Northfield has not been surveyed. */
const NPS: Record<string, number | null> = { "u-brightwater": 52, "u-coastline": 44, "u-northfield": null };

function notStarted(value: number, suffix = "%") {
  return value === 0 ? <span className="text-ink-3">Not started</span> : <span className="font-mono">{`${value}${suffix}`}</span>;
}

function CrossUniversity({ onExport }: { onExport: () => void }) {
  const [status, setStatus] = useState("");
  const rows: UniversityRow[] = useMemo(
    () => crossUniversityReport.map((u) => ({ ...u, nps: NPS[u.universityId] ?? null })).filter((u) => !status || u.status === status),
    [status],
  );
  const live = crossUniversityReport.filter((u) => u.status === "Live");
  const learners = crossUniversityReport.reduce((n, u) => n + u.students, 0);
  const weighted = (key: "avgAttendance" | "avgReadiness") =>
    Math.round(live.reduce((n, u) => n + u[key] * u.students, 0) / live.reduce((n, u) => n + u.students, 0));

  const columns: DataTableColumn<UniversityRow>[] = [
    {
      key: "name",
      header: "University",
      sortable: true,
      render: (u) => {
        const uni = universityById(u.universityId);
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <UniversityMark initials={uni?.branding.logoInitials ?? ""} color={uni?.branding.primary ?? BRAND_SWATCHES[7]} size="sm" />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{u.name}</span>
              <span className="block text-[12px] text-ink-3">{uni?.city}</span>
            </span>
          </span>
        );
      },
    },
    { key: "status", header: "Status", render: (u) => <StatusPill status={u.status} /> },
    { key: "students", header: "Students", align: "right", mono: true, sortable: true },
    { key: "cohorts", header: "Cohorts", align: "right", mono: true, sortable: true },
    { key: "avgAttendance", header: "Attendance", align: "right", sortable: true, render: (u) => notStarted(u.avgAttendance) },
    {
      key: "avgReadiness",
      header: "Readiness score",
      sortable: true,
      render: (u) => (u.avgReadiness === 0 ? <span className="text-ink-3">Not started</span> : <ScoreBar value={u.avgReadiness} className="w-28" height={6} />),
    },
    { key: "passRate2026", header: "Pass rate 2026", align: "right", sortable: true, render: (u) => notStarted(u.passRate2026) },
    {
      key: "atRisk",
      header: "At risk",
      align: "right",
      sortable: true,
      render: (u) => (u.atRisk === 0 ? <span className="text-ink-3">None</span> : <span className="font-mono font-semibold text-rose">{u.atRisk}</span>),
    },
    { key: "registeredPct", header: "ACCA registered", align: "right", sortable: true, render: (u) => <span className="font-mono">{u.registeredPct}%</span> },
    { key: "jointCertOnTrackPct", header: "Joint certificate on track", align: "right", sortable: true, render: (u) => notStarted(u.jointCertOnTrackPct) },
    { key: "openTickets", header: "Open tickets", align: "right", mono: true, sortable: true },
    {
      key: "nps",
      header: "NPS",
      align: "right",
      sortable: true,
      sortValue: (u) => u.nps ?? -1,
      render: (u) => (u.nps == null ? <span className="text-ink-3">Not surveyed</span> : <span className="font-mono">+{u.nps}</span>),
    },
  ];

  return (
    <section className="space-y-5">
      <SectionHead
        title="View cross-university reports"
        sub="One row per partner university. Student counts are enrolment headlines; rates come from ACCA sessions delivered on the platform."
        action={
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />
      <KpiRow cols={4}>
        <KpiTile label="University-linked learners" value={learners} sub={`${universities.length} universities`} />
        <KpiTile label="Average attendance, live universities" value={`${weighted("avgAttendance")}%`} tone="jade" />
        <KpiTile label="Average readiness score" value={weighted("avgReadiness")} tone="amber" />
        <KpiTile label="Learners at risk" value={crossUniversityReport.reduce((n, u) => n + u.atRisk, 0)} tone="rose" goodWhen="down" />
      </KpiRow>
      <DataTable
        caption="Cross-university report"
        rows={rows}
        columns={columns}
        getRowId={(u) => u.universityId}
        filters={
          <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={["Live", "Onboarding"]} />
        }
        maxHeight="none"
      />
      <div className="grid gap-4 md:grid-cols-3">
        {crossUniversityReport.map((u) => {
          const uni = universityById(u.universityId);
          return (
            <Card key={u.universityId} className="min-w-0 space-y-3 p-5">
              <div className="flex min-w-0 items-center gap-3">
                <UniversityMark initials={uni?.branding.logoInitials ?? ""} color={uni?.branding.primary ?? BRAND_SWATCHES[7]} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink">{u.name}</p>
                  <p className="truncate text-[12px] text-ink-3">{uni?.programmeName}</p>
                </div>
              </div>
              {u.status === "Onboarding" ? (
                <p className="rounded-[12px] border border-dashed border-line-strong px-3 py-4 text-center text-[12.5px] text-ink-3">
                  Onboarding. Workspace goes live on 1 October 2026; figures start after the first classes.
                </p>
              ) : (
                <div className="space-y-3">
                  <ScoreBar label="Attendance in ACCA sessions" value={u.avgAttendance} />
                  <ScoreBar label="Average readiness score" value={u.avgReadiness} marker={50} />
                  <ScoreBar label="Joint certificate on track" value={u.jointCertOnTrackPct} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ compare */

function compareFor(type: Student["type"], intakeYear: string) {
  const list = allStudents.filter(
    (s) => s.type === type && s.enrolmentStatus !== "completed" && (!intakeYear || s.intakeId.startsWith(`in-${intakeYear}`)),
  );
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  const attempts = list
    .flatMap((s) => Object.values(s.papers).flatMap((p) => p.attempts))
    .filter((a) => a.date >= "2026-01-01" && (a.result === "passed" || a.result === "failed"));
  const headline = studentTypeComparison.find((c) => c.type === type);
  return {
    list,
    headcount: intakeYear ? null : (headline?.headcount ?? list.length),
    metrics: [
      { label: "Average readiness score", value: avg(list.map((s) => s.readiness.overall)), unit: "" },
      { label: "Attendance in ACCA sessions", value: avg(list.filter((s) => s.attendance.total > 0).map((s) => s.attendance.pct)), unit: "%" },
      { label: "Pass rate, 2026 attempts", value: pct(attempts.filter((a) => a.result === "passed").length, attempts.length), unit: "%" },
      { label: "Papers cleared per learner", value: Math.round((list.reduce((n, s) => n + papersCleared(s), 0) / Math.max(1, list.length)) * 10) / 10, unit: "" },
      { label: "Medium or high risk", value: pct(list.filter((s) => s.risk.level !== "low").length, list.length), unit: "%", lowerIsBetter: true },
      { label: "Fees overdue", value: pct(list.filter((s) => s.fees.status === "overdue").length, list.length), unit: "%", lowerIsBetter: true },
      { label: "Placement-eligible", value: pct(list.filter((s) => s.career.placementEligible).length, list.length), unit: "%" },
      {
        label: "Study hours per week",
        value: Math.round((list.reduce((n, s) => n + s.activityHours.slice(-4).reduce((a, b) => a + b, 0) / 4, 0) / Math.max(1, list.length)) * 10) / 10,
        unit: "h",
      },
    ],
  };
}

function CompareCohorts({ onExport }: { onExport: () => void }) {
  const [intakeYear, setIntakeYear] = useState("");
  const grad = useMemo(() => compareFor("graduate", intakeYear), [intakeYear]);
  const ug = useMemo(() => compareFor("undergraduate", intakeYear), [intakeYear]);

  const mix = (list: Student[], key: "risk" | "fees") =>
    key === "risk"
      ? [
          { label: "Low risk", value: list.filter((s) => s.risk.level === "low").length, tone: "jade" },
          { label: "Medium risk", value: list.filter((s) => s.risk.level === "medium").length, tone: "amber" },
          { label: "High risk", value: list.filter((s) => s.risk.level === "high").length, tone: "rose" },
        ]
      : [
          { label: "Paid or on track", value: list.filter((s) => s.fees.status === "paid" || s.fees.status === "on-track").length, tone: "jade" },
          { label: "Due", value: list.filter((s) => s.fees.status === "due").length, tone: "amber" },
          { label: "Overdue", value: list.filter((s) => s.fees.status === "overdue").length, tone: "rose" },
        ];

  const sides = [
    { id: "graduate", title: "Graduate learners", data: grad, dark: true },
    { id: "undergraduate", title: "University undergraduates", data: ug, dark: false },
  ];

  return (
    <section className="space-y-5">
      <SectionHead
        title="Compare graduate and undergraduate cohorts"
        sub="Side by side from learner records. Graduates join open-market cohorts; undergraduates follow their university's semester-to-ACCA roadmap."
        action={
          <>
            <FilterSelect
              label="Intake year"
              allLabel="All intakes"
              value={intakeYear}
              onChange={setIntakeYear}
              options={[
                { value: "2025", label: "2025 intakes" },
                { value: "2026", label: "2026 intakes" },
              ]}
            />
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="size-4" />
              Export
            </Button>
          </>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {sides.map((side) => (
          <Card
            key={side.id}
            className={side.dark ? "min-w-0 border-transparent bg-surface-inv p-5 text-ink-inv" : "min-w-0 p-5"}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className={side.dark ? "font-display text-[20px] font-bold text-ink-inv" : "font-display text-[20px] font-bold text-ink"}>
                {side.title}
              </h3>
              <span className={side.dark ? "text-[12.5px] text-ink-inv/65" : "text-[12.5px] text-ink-3"}>
                {side.data.headcount != null ? `${side.data.headcount} learners · ` : ""}
                {side.data.list.length} records compared
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              {side.data.metrics.map((m, i) => {
                const other = (side.id === "graduate" ? ug : grad).metrics[i].value;
                const better = m.lowerIsBetter ? m.value < other : m.value > other;
                return (
                  <div key={m.label} className="min-w-0">
                    <dt className={side.dark ? "text-[12px] leading-snug text-ink-inv/65" : "text-[12px] leading-snug text-ink-3"}>{m.label}</dt>
                    <dd
                      className={
                        side.dark
                          ? "mt-1 font-display text-[24px] leading-none font-bold tracking-[-0.03em] text-ink-inv tnum"
                          : "mt-1 font-display text-[24px] leading-none font-bold tracking-[-0.03em] text-ink tnum"
                      }
                    >
                      {m.value}
                      {m.unit}
                      {better && m.value !== other ? (
                        <span className={side.dark ? "ml-1.5 align-middle text-[11px] font-bold text-cta" : "ml-1.5 align-middle text-[11px] font-bold text-jade"}>
                          ahead
                        </span>
                      ) : null}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0 p-5">
          <MiniLabel>Risk mix</MiniLabel>
          <StackedBar
            className="mt-3"
            normalize
            unit="%"
            rows={[
              { label: "Graduate learners", parts: mix(grad.list, "risk") },
              { label: "University undergraduates", parts: mix(ug.list, "risk") },
            ]}
          />
        </Card>
        <Card className="min-w-0 p-5">
          <MiniLabel>Fee status mix</MiniLabel>
          <StackedBar
            className="mt-3"
            normalize
            unit="%"
            rows={[
              { label: "Graduate learners", parts: mix(grad.list, "fees") },
              { label: "University undergraduates", parts: mix(ug.list, "fees") },
            ]}
          />
        </Card>
      </div>
      <p className="text-[12px] text-ink-3">
        Papers cleared counts passes and ACCA-approved exemptions. Graduates usually start with Applied Knowledge exempt, so compare readiness and pass rates for like-for-like progress.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ progression */

type PaperRow = (typeof accaProgression.byPaper)[number];

const sessionPassRates = examSessions
  .filter((s) => s.past || s.status === "results-pending")
  .map((session) => {
    const attempts = allStudents
      .flatMap((s) => Object.values(s.papers).flatMap((p) => p.attempts))
      .filter((a) => a.sessionId === session.id);
    const decided = attempts.filter((a) => a.result === "passed" || a.result === "failed");
    return {
      label: session.label,
      pending: session.status === "results-pending",
      attempts: attempts.length,
      rate: decided.length ? Math.round((decided.filter((a) => a.result === "passed").length / decided.length) * 100) : 0,
    };
  });

function Progression({ onExport }: { onExport: () => void }) {
  const [level, setLevel] = useState("");
  const funnel = useMemo(() => {
    const cleared = (s: Student, codes: PaperCode[]) => codes.every((c) => s.papers[c].status === "passed" || s.papers[c].status === "exempt");
    const registered = allStudents.filter((s) => s.registration.status === "registered");
    const ak = registered.filter((s) => cleared(s, APPLIED_KNOWLEDGE));
    const as = ak.filter((s) => cleared(s, APPLIED_SKILLS));
    const sp = as.filter((s) => s.papers.SBL.status !== "not-started" || s.papers.SBR.status !== "not-started");
    const ep = sp.filter((s) => s.epsm.status === "complete");
    const affiliate = ep.filter((s) => s.enrolmentStatus === "completed");
    const member = affiliate.filter((s) => s.per.status === "complete");
    return [
      { label: "ACCA registered", value: registered.length },
      { label: "Applied Knowledge complete", value: ak.length },
      { label: "Applied Skills complete", value: as.length },
      { label: "Strategic Professional started", value: sp.length },
      { label: "EPSM complete", value: ep.length },
      { label: "All exams passed · ACCA Affiliate", value: affiliate.length },
      { label: "PER complete · eligible for membership", value: member.length },
    ];
  }, []);

  const perNotStarted = allStudents.length - accaProgression.per.complete - accaProgression.per.inProgress;
  const rows = accaProgression.byPaper.filter((p) => !level || paperByCode(p.paper)?.level === level);

  const columns: DataTableColumn<PaperRow>[] = [
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      sortValue: (p) => paperByCode(p.paper)?.order ?? 0,
      render: (p) => (
        <span className="min-w-0">
          <span className="font-mono font-semibold text-ink">{p.paper}</span>
          <span className="ml-2 text-ink-2">{paperByCode(p.paper)?.name}</span>
        </span>
      ),
    },
    { key: "level", header: "Level", render: (p) => <span className="text-ink-3">{paperByCode(p.paper)?.levelLabel}</span> },
    { key: "exempt", header: "Exempt", align: "right", mono: true, sortable: true },
    { key: "passed", header: "Passed", align: "right", mono: true, sortable: true },
    { key: "current", header: "Studying", align: "right", mono: true, sortable: true },
    {
      key: "failedOutstanding",
      header: "Failed, not yet passed",
      align: "right",
      sortable: true,
      render: (p) => <span className={p.failedOutstanding ? "font-mono font-semibold text-rose" : "font-mono"}>{p.failedOutstanding}</span>,
    },
    { key: "attempts", header: "Attempts", align: "right", mono: true, sortable: true },
    {
      key: "passRate",
      header: "Pass rate",
      sortable: true,
      render: (p) => (p.attempts === 0 ? <span className="text-ink-3">No attempts yet</span> : <ScoreBar value={p.passRate} marker={50} className="w-32" height={6} />),
    },
  ];

  return (
    <section className="space-y-5">
      <SectionHead
        title="View ACCA progression"
        sub="How learners move through the qualification: registration, the three levels, EPSM and PER. Figures are from learner records."
        action={
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="size-4" />
            Generate ACCA progression report
          </Button>
        }
      />
      <KpiRow cols={5}>
        <KpiTile label="ACCA registered" value={funnel[0].value} sub={`of ${allStudents.length} records`} tone="jade" />
        <KpiTile label="Exemptions approved by ACCA" value={accaProgression.exemptionsApproved} tone="jade" />
        <KpiTile label="Exemptions awaiting ACCA" value={accaProgression.exemptionsPending} tone="amber" />
        <KpiTile label="EPSM complete" value={accaProgression.epsm.complete} sub={`${accaProgression.epsm.inProgress} in progress`} />
        <KpiTile label="PER months, average" value={accaProgression.per.avgMonths} sub="of 36 required" />
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Progression funnel" sub="Each step counts learners who also completed every step above it." />
          <div className="px-5 pb-5">
            <Funnel steps={funnel} />
          </div>
        </Card>
        <div className="grid min-w-0 gap-4">
          <Card className="min-w-0">
            <CardHeader title="Pass rate by exam session" sub="Session CBE attempts recorded on the platform. Pass mark 50%." />
            <div className="px-5 pb-5">
              <BarChart
                data={sessionPassRates.filter((s) => !s.pending).map((s) => s.rate)}
                labels={sessionPassRates.filter((s) => !s.pending).map((s) => s.label)}
                height={120}
                tone="brand"
              />
              <ul className="mt-3 flex flex-wrap gap-2">
                {sessionPassRates.map((s) => (
                  <li key={s.label}>
                    <StatusPill status={s.pending ? "Results pending" : "Results released"} size="sm">
                      {s.label} · {s.pending ? `${s.attempts} awaiting results, due 12 Oct 2026` : `${s.rate}% of ${s.attempts}`}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
          <Card className="min-w-0 p-5">
            <MiniLabel>Ethics and Professional Skills Module and PER</MiniLabel>
            <StackedBar
              className="mt-3"
              rows={[
                {
                  label: "EPSM",
                  parts: [
                    { label: "Complete", value: accaProgression.epsm.complete, tone: "jade" },
                    { label: "In progress", value: accaProgression.epsm.inProgress, tone: "info" },
                    { label: "Not started", value: accaProgression.epsm.notStarted, tone: "line-strong" },
                  ],
                },
                {
                  label: "Practical Experience Requirement",
                  parts: [
                    { label: "Complete", value: accaProgression.per.complete, tone: "jade" },
                    { label: "In progress", value: accaProgression.per.inProgress, tone: "info" },
                    { label: "Not started", value: perNotStarted, tone: "line-strong" },
                  ],
                },
              ]}
            />
          </Card>
        </div>
      </div>
      <DataTable
        caption="Pass rates by paper"
        rows={rows}
        columns={columns}
        getRowId={(p) => p.paper}
        pageSize={15}
        filters={
          <FilterSelect
            label="Level"
            allLabel="All levels"
            value={level}
            onChange={setLevel}
            options={[
              { value: "applied-knowledge", label: "Applied Knowledge" },
              { value: "applied-skills", label: "Applied Skills" },
              { value: "strategic-professional", label: "Strategic Professional" },
            ]}
          />
        }
        maxHeight="none"
      />
    </section>
  );
}

/* ------------------------------------------------------------------ careers */

type EmployerRow = { company: string; applications: number; offers: number; joined: number; ctc: number[]; alumni: number };

function lpa(n: number) {
  return `₹${(Math.round(n * 10) / 10).toString()} LPA`;
}

function ctcRange(values: number[]) {
  const lo = Math.round(Math.min(...values) * 10) / 10;
  const hi = Math.round(Math.max(...values) * 10) / 10;
  return lo === hi ? `₹${lo} LPA` : `₹${lo} to ${hi} LPA`;
}

function salaryBand(median: number) {
  if (median < 6) return "Under ₹6 LPA";
  if (median < 8) return "₹6 to 8 LPA";
  if (median < 12) return "₹8 to 12 LPA";
  return "₹12 LPA and above";
}

function CareerOutcomes({ onExport }: { onExport: () => void }) {
  const [accaStatus, setAccaStatus] = useState("");

  const offers = applications.filter((a) => a.offer).map((a) => a.offer!.ctcLPA).sort((a, b) => a - b);
  const median = offers.length ? (offers[Math.floor((offers.length - 1) / 2)] + offers[Math.ceil((offers.length - 1) / 2)]) / 2 : 0;
  const placementRate = Math.round((careerOutcomes.offers / Math.max(1, careerOutcomes.placementEligible)) * 100);

  const employers = useMemo(() => {
    const map = new Map<string, EmployerRow>();
    const row = (company: string) => {
      if (!map.has(company)) map.set(company, { company, applications: 0, offers: 0, joined: 0, ctc: [], alumni: 0 });
      return map.get(company)!;
    };
    for (const a of applications) {
      const r = row(opportunityById(a.opportunityId)?.company ?? "Unknown");
      r.applications += 1;
      if (a.offer) {
        r.offers += 1;
        r.ctc.push(a.offer.ctcLPA);
      }
      if (a.stage === "joined") r.joined += 1;
    }
    for (const al of alumniOutcomes) row(al.company).alumni += 1;
    return [...map.values()].filter((r) => r.offers + r.alumni > 0).sort((a, b) => b.offers + b.alumni - (a.offers + a.alumni));
  }, []);

  const stagesReached = (min: string[]) => applications.filter((a) => min.includes(a.stage)).length;
  const alumni = alumniOutcomes.filter((a) => !accaStatus || a.accaStatus === accaStatus);

  const employerColumns: DataTableColumn<EmployerRow>[] = [
    { key: "company", header: "Employer", sortable: true, className: "font-semibold" },
    { key: "applications", header: "Applications", align: "right", mono: true, sortable: true },
    { key: "offers", header: "Offers", align: "right", mono: true, sortable: true },
    { key: "joined", header: "Joined", align: "right", mono: true, sortable: true },
    { key: "alumni", header: "Alumni placed", align: "right", mono: true, sortable: true },
    {
      key: "ctc",
      header: "Offer CTC",
      align: "right",
      render: (r) =>
        r.ctc.length === 0 ? (
          <span className="text-ink-3">No offers yet</span>
        ) : (
          <span className="font-mono">{ctcRange(r.ctc)}</span>
        ),
    },
  ];

  const alumniColumns: DataTableColumn<AlumniOutcome>[] = [
    { key: "name", header: "Alumnus", sortable: true, className: "font-semibold" },
    { key: "programme", header: "Programme", render: (a) => <span className="text-ink-2">{programmeById(a.programmeId)?.name}</span> },
    { key: "completedYear", header: "Completed", mono: true, sortable: true },
    { key: "accaStatus", header: "ACCA status", sortable: true, render: (a) => <StatusPill status={a.accaStatus} tone={a.accaStatus === "Member" ? "jade" : a.accaStatus === "Affiliate" ? "info" : "amber"} /> },
    { key: "role", header: "Role", wrap: true, className: "min-w-48" },
    { key: "company", header: "Employer", sortable: true },
    { key: "city", header: "City" },
    { key: "ctcLPA", header: "CTC", align: "right", sortable: true, render: (a) => <span className="font-mono">{lpa(a.ctcLPA)}</span> },
  ];

  return (
    <section className="space-y-5">
      <SectionHead
        title="View career outcomes"
        sub="Placement pipeline, offers and joining for placement-eligible learners, plus tracked alumni."
        action={
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />
      <KpiRow cols={5}>
        <KpiTile hero label="Placement rate" value={`${placementRate}%`} sub={`${careerOutcomes.offers} offers for ${careerOutcomes.placementEligible} eligible`} />
        <KpiTile label="Median offer band" value={salaryBand(median)} sub={`median ${lpa(median)}`} tone="jade" />
        <KpiTile label="Joined" value={careerOutcomes.joined} sub={`${careerOutcomes.offers - careerOutcomes.joined} offers still to join`} tone="jade" />
        <KpiTile label="Open opportunities" value={careerOutcomes.openOpportunities} tone="info" />
        <KpiTile
          label="Internships"
          value={internshipRecords.length}
          sub={`${careerOutcomes.internshipsOngoing} ongoing · ${careerOutcomes.internshipsCompleted} completed`}
        />
      </KpiRow>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title="Offers and joining by month" sub="Apr to Sep 2026" />
          <div className="px-5 pb-5">
            <LineChart
              labels={careerOutcomes.monthly.map((m) => m.month.slice(0, 3))}
              series={[
                { label: "Offers", values: careerOutcomes.monthly.map((m) => m.offers), tone: "brand" },
                { label: "Joined", values: careerOutcomes.monthly.map((m) => m.joined), tone: "jade" },
              ]}
              height={180}
            />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Placement pipeline" sub="Current applications by the furthest stage reached" />
          <div className="px-5 pb-5">
            <Funnel
              steps={[
                { label: "Applications", value: applications.length },
                { label: "Shortlisted", value: stagesReached(["shortlisted", "interview", "offer", "joined"]) },
                { label: "Interviewed", value: stagesReached(["interview", "offer", "joined"]) },
                { label: "Offer", value: stagesReached(["offer", "joined"]) },
                { label: "Joined", value: stagesReached(["joined"]) },
              ]}
              tone="jade"
            />
          </div>
        </Card>
      </div>
      <div className="space-y-2">
        <MiniLabel>Top employers</MiniLabel>
        <DataTable caption="Top employers" rows={employers} columns={employerColumns} getRowId={(r) => r.company} maxHeight="none" dense />
      </div>
      <div className="space-y-2">
        <MiniLabel>Alumni career outcomes</MiniLabel>
        <DataTable
          caption="Alumni career outcomes"
          rows={alumni}
          columns={alumniColumns}
          getRowId={(a) => a.id}
          filters={
            <FilterSelect label="ACCA status" allLabel="All statuses" value={accaStatus} onChange={setAccaStatus} options={["Member", "Affiliate", "Finalist"]} />
          }
          initialSort={{ key: "ctcLPA", dir: "desc" }}
          maxHeight="none"
        />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ export catalogue */

function ExportCatalogue({ history, onExport }: { history: ExportRow[]; onExport: (id: string) => void }) {
  const [category, setCategory] = useState("");
  const [pii, setPii] = useState("");
  const rows = reportCatalogue.filter(
    (r) => (!category || r.category === category) && (!pii || (pii === "yes" ? r.containsPII : !r.containsPII)),
  );

  const columns: DataTableColumn<ReportDefinition>[] = [
    {
      key: "name",
      header: "Report",
      sortable: true,
      wrap: true,
      className: "min-w-64",
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.name}</span>
          <span className="block text-[12px] text-ink-3">{r.description}</span>
        </span>
      ),
    },
    { key: "category", header: "Category", sortable: true, render: (r) => <span className="text-ink-2">{r.category}</span> },
    {
      key: "authorisedRoles",
      header: "Authorised for",
      wrap: true,
      className: "min-w-52",
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.authorisedRoles.map((role) => (
            <Badge key={role} tone={role === "super-admin" ? "dark" : "neutral"}>
              {ROLE_SHORT[role]}
            </Badge>
          ))}
        </span>
      ),
    },
    { key: "formats", header: "Formats", render: (r) => <span className="font-mono text-[12px] text-ink-2">{r.formats.join(" · ")}</span> },
    { key: "schedule", header: "Schedule", render: (r) => <span className="text-ink-2">{r.schedule}</span> },
    {
      key: "containsPII",
      header: "Personal data",
      render: (r) =>
        r.containsPII ? (
          <StatusPill status="Pending" size="sm">
            Contains personal data
          </StatusPill>
        ) : (
          <StatusPill status="Not applicable" size="sm">
            None
          </StatusPill>
        ),
    },
    {
      key: "export",
      header: <span className="sr-only">Export</span>,
      align: "right",
      render: (r) => (
        <Button size="xs" variant="secondary" onClick={() => onExport(r.id)}>
          <Download className="size-3.5" />
          Export
        </Button>
      ),
    },
  ];

  const historyColumns: DataTableColumn<ExportRow>[] = [
    { key: "file", header: "File", mono: true, sortable: true },
    { key: "scope", header: "Scope", render: (r) => <span className="text-ink-2">{r.scope}</span> },
    { key: "requestedBy", header: "Requested by", sortable: true },
    { key: "requested", header: "Requested", mono: true },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status === "Ready" ? "Completed" : r.status === "Queued" ? "Queued" : "Closed"} size="sm">{r.status}</StatusPill> },
    {
      key: "download",
      header: <span className="sr-only">Download</span>,
      align: "right",
      render: (r) =>
        r.status === "Queued" ? (
          <span className="text-[12px] text-ink-3">Preparing</span>
        ) : (
          <Button size="xs" variant="ghost" onClick={() => toast({ title: `Downloading ${r.file}`, body: "Download recorded in the audit log.", tone: "info" })}>
            <FileDown className="size-3.5" />
            Download
          </Button>
        ),
    },
  ];

  return (
    <section className="space-y-5">
      <SectionHead
        title="Export authorised reports"
        sub="Only the roles listed for a report can export it. Every export that contains personal data is logged with the requesting user."
      />
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-lg)] border border-line bg-surface-2 px-4 py-3 text-[12.5px] text-ink-2">
        <ShieldCheck className="size-4 shrink-0 text-jade" aria-hidden />
        <span className="min-w-0 flex-1">
          You export as <strong className="text-ink">ZSkillup Super Admin</strong>, authorised for every report below. Programme and University Admins see only the reports marked for their role.
        </span>
      </div>
      <DataTable
        caption="Report catalogue"
        rows={rows}
        columns={columns}
        getRowId={(r) => r.id}
        pageSize={13}
        search={{ placeholder: "Search reports", match: (r, q) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(category || pii)}
            onClear={() => {
              setCategory("");
              setPii("");
            }}
          >
            <FilterSelect
              label="Category"
              allLabel="All categories"
              value={category}
              onChange={setCategory}
              options={[...new Set(reportCatalogue.map((r) => r.category))]}
            />
            <FilterSelect
              label="Personal data"
              allLabel="Any"
              value={pii}
              onChange={setPii}
              options={[
                { value: "yes", label: "Contains personal data" },
                { value: "no", label: "No personal data" },
              ]}
            />
          </FilterBar>
        }
        maxHeight="none"
      />
      <div className="space-y-2">
        <MiniLabel>Export history</MiniLabel>
        <DataTable caption="Export history" rows={history} columns={historyColumns} getRowId={(r) => r.id} pageSize={8} maxHeight="none" />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ export drawer */

function ExportDrawer({
  open,
  reportId,
  formKey,
  onClose,
  onQueued,
}: {
  open: boolean;
  reportId: string;
  formKey: number;
  onClose: () => void;
  onQueued: (row: Omit<ExportRow, "id" | "requestedBy">) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Export report"
      sub="Choose the scope and format. Exports run in the background and appear in the export history."
      submitLabel="Queue export"
      footerNote="Logged in the audit log"
      onSubmit={(data) => {
        const report = reportCatalogue.find((r) => r.id === String(data.get("report")));
        if (!report) return;
        const format = String(data.get("format") || report.formats[0]);
        const scopeId = String(data.get("scope"));
        const cohortId = String(data.get("cohort"));
        const scope = [
          scopeId === "all" ? "All universities and programmes" : scopeId === "open-market" ? "Open-market programmes" : universityById(scopeId)?.name,
          cohortId ? cohorts.find((c) => c.id === cohortId)?.name : null,
          `${String(data.get("from"))} to ${String(data.get("to"))}`,
        ]
          .filter(Boolean)
          .join(" · ");
        const scopeSlug = scopeId === "all" ? "" : `-${slugify(scopeId === "open-market" ? "open-market" : (universityById(scopeId)?.shortName ?? scopeId))}`;
        onQueued({
          file: `${slugify(report.name)}${scopeSlug}.${format.toLowerCase()}`,
          report: report.name,
          scope,
          format,
          requested: "14 Sep 2026, 10:30",
          status: "Queued",
        });
      }}
    >
      {/* Keyed per opening so the form resets each time. */}
      <ExportFields key={formKey} initialReport={reportId} />
    </FormDrawer>
  );
}

export function ExportFields({ initialReport }: { initialReport: string }) {
  const [reportId, setReportId] = useState(initialReport);
  const [scope, setScope] = useState("all");
  const report = reportCatalogue.find((r) => r.id === reportId) ?? reportCatalogue[0];
  const cohortOptions = cohorts.filter((c) =>
    scope === "all" ? true : scope === "open-market" ? !c.universityId : c.universityId === scope,
  );
  return (
    <>
      <Field label="Report">
        <Select name="report" value={reportId} onChange={(e) => setReportId(e.target.value)}>
          {reportCatalogue.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="rounded-[12px] border border-line bg-surface-2 p-3.5">
        <p className="text-[12.5px] text-ink-2">{report.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Authorised for</span>
          {report.authorisedRoles.map((role) => (
            <Badge key={role} tone={role === "super-admin" ? "dark" : "neutral"}>
              {ROLE_SHORT[role]}
            </Badge>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="University or programme">
          <Select name="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="all">All universities and programmes</option>
            <option value="open-market">Open-market programmes</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cohort">
          <Select name="cohort" defaultValue="">
            <option value="">All cohorts</option>
            {cohortOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="From">
          <Input name="from" type="date" defaultValue="2026-06-01" required />
        </Field>
        <Field label="To">
          <Input name="to" type="date" defaultValue="2026-09-14" required />
        </Field>
      </div>
      <Field label="Format">
        <Select name="format" key={report.id} defaultValue={report.formats[0]}>
          {report.formats.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </Select>
      </Field>
      {report.containsPII ? (
        <div className="space-y-3 rounded-[12px] border border-amber/40 bg-amber-soft p-3.5">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <FileLock2 className="size-4 text-amber" aria-hidden />
            This report contains personal data
          </p>
          <Textarea name="reason" rows={2} required placeholder="Purpose, e.g. Dec 2026 exam entry follow-up with Programme Admin" />
          <Checkbox name="confirm" required label="I confirm this export is for an authorised purpose under the data sharing policy." />
        </div>
      ) : (
        <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
          <Lock className="size-3.5" aria-hidden />
          Aggregated figures only, no personal data.
        </p>
      )}
    </>
  );
}

