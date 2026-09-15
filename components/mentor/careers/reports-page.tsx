"use client";

import { useState } from "react";
import { Award, Building2, Clock3, Download, FileBarChart, IndianRupee, Plus, TrendingUp, UsersRound } from "lucide-react";
import {
  addDays,
  daysBetween,
  placementSummary,
  programmeById,
  programmes,
  type AlumniOutcome,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, Donut, Funnel, LineChart, StackedBar } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { CareerBadges, Guard, READ_ONLY_REASON, ReadOnlyNotice, useCareerScope, type CareerScope } from "./scope";
import { CITIES, MiniLabel, ROLE_TRACKS, SECTION, average, ctcBand, formatLPA, median } from "./shared";
import { TODAY, updateCareers, useCareers, type CareerApplication, type CareerOpportunity, type ReportRun } from "./store";

const TABS = [
  { id: "generate", label: "Generate placement reports" },
  { id: "alumni", label: "Track alumni career outcomes" },
];

const PERIODS = [
  { id: "30", label: "Last 30 days", from: addDays(TODAY, -30), file: "last-30-days" },
  { id: "90", label: "Last 90 days", from: addDays(TODAY, -90), file: "last-90-days" },
  { id: "h1", label: "Apr to Sep 2026", from: "2026-04-01", file: "apr-sep-2026" },
  { id: "ytd", label: "Year to date", from: "2026-01-01", file: "ytd-2026" },
];

const STATUS_TONE = { Member: "jade", Affiliate: "info", Finalist: "amber" } as const;

type AppRow = { app: CareerApplication; opp: CareerOpportunity };

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function PlacementReportsPage() {
  const scope = useCareerScope();
  const [tab, setTab] = useState("generate");

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow={SECTION}
        title="Placement reports"
        sub="Generate placement reports for the learners in your scope, with placement rate, package bands and time to offer, and track alumni career outcomes."
        badge={<CareerBadges scope={scope} />}
        actions={
          <Button variant="secondary" onClick={() => toast({ title: "Report queued: alumni-career-outcomes.csv", tone: "info" })}>
            <Download className="size-4" />
            Export alumni outcomes
          </Button>
        }
      />
      <Tabs items={TABS} value={tab} onChange={setTab} />
      {tab === "generate" ? <GenerateTab scope={scope} /> : <AlumniTab scope={scope} />}
    </div>
  );
}

/* ------------------------------------------------------------------ generate */

function GenerateTab({ scope }: { scope: CareerScope }) {
  const store = useCareers();
  const { persona } = useRole();
  const [programme, setProgramme] = useState("");
  const [kind, setKind] = useState("all");
  const [period, setPeriod] = useState("h1");
  const [format, setFormat] = useState("CSV");
  const [include, setInclude] = useState({ employers: true, funnel: true, students: false });

  const programmeIds = Array.from(new Set(scope.students.map((s) => s.programmeId)));
  const students = programme ? scope.students.filter((s) => s.programmeId === programme) : scope.students;
  const ids = new Set(students.map((s) => s.id));
  const p = PERIODS.find((x) => x.id === period) ?? PERIODS[2];

  const rows: AppRow[] = store.applications.flatMap((app) => {
    const opp = store.opportunities.find((o) => o.id === app.opportunityId);
    if (!opp || !ids.has(app.studentId)) return [];
    if (kind !== "all" && opp.kind !== kind) return [];
    const touched = app.offer?.offeredOn ?? app.updated;
    return app.appliedOn >= p.from || touched >= p.from ? [{ app, opp }] : [];
  });

  const eligible = students.filter((s) => s.career.placementEligible).length;
  const placed = rows.filter((r) => r.app.offer && (r.app.offer.status === "accepted" || r.app.offer.status === "joined"));
  const jobOffers = rows.filter((r) => r.app.offer && r.opp.kind === "job" && r.app.offer.ctcLPA > 0);
  const med = median(jobOffers.map((r) => r.app.offer!.ctcLPA));
  const timeToOffer = median(rows.filter((r) => r.app.offer).map((r) => Math.max(0, daysBetween(r.app.appliedOn, r.app.offer!.offeredOn))));
  const rate = eligible ? Math.round((placed.length / eligible) * 100) : 0;

  const funnel = [
    { label: "Applied", value: rows.length },
    { label: "Shortlisted", value: rows.filter((r) => r.app.shortlistedBy || r.app.stage !== "applied").length },
    { label: "Interviewed", value: rows.filter((r) => r.app.interview).length },
    { label: "Offer", value: rows.filter((r) => r.app.offer).length },
    { label: "Joined", value: rows.filter((r) => r.app.stage === "joined").length },
  ];

  type Employer = { id: string; company: string; opportunities: number; applications: number; interviews: number; offers: number; joined: number; medianCtc: number };
  const employers: Employer[] = Array.from(
    rows.reduce((m, r) => {
      const e = m.get(r.opp.company) ?? { id: slug(r.opp.company), company: r.opp.company, opps: new Set<string>(), apps: [] as AppRow[] };
      e.opps.add(r.opp.id);
      e.apps.push(r);
      m.set(r.opp.company, e);
      return m;
    }, new Map<string, { id: string; company: string; opps: Set<string>; apps: AppRow[] }>()),
  ).map(([, e]) => ({
    id: e.id,
    company: e.company,
    opportunities: e.opps.size,
    applications: e.apps.length,
    interviews: e.apps.filter((r) => r.app.interview).length,
    offers: e.apps.filter((r) => r.app.offer).length,
    joined: e.apps.filter((r) => r.app.stage === "joined").length,
    medianCtc: median(e.apps.filter((r) => r.app.offer && r.opp.kind === "job").map((r) => r.app.offer!.ctcLPA)),
  }));

  const scopeLabel = programme ? (programmeById(programme)?.name ?? "Programme") : scope.placement ? "All placement-eligible learners" : "Your allocated students";
  const kindLabel = kind === "all" ? "Jobs and internships" : kind === "job" ? "Jobs only" : "Internships only";

  const generate = () => {
    const file = `placement-report-${slug(programme ? (programmeById(programme)?.name ?? "programme") : scope.placement ? "placement-eligible" : "allocated-students")}-${p.file}.${format.toLowerCase()}`;
    const id = `pr-${String(store.reportRuns.length + 1).padStart(3, "0")}`;
    const run: ReportRun = {
      id,
      file,
      scope: `${scopeLabel} · ${kindLabel}`,
      period: p.label,
      format,
      requestedBy: persona.name,
      requested: "14 Sep 2026, just now",
      status: "Queued",
    };
    updateCareers((st) => ({ reportRuns: [run, ...st.reportRuns] }));
    toast({ title: `Report queued: ${file}`, body: `${rows.length} applications · ${include.students ? "includes student-level rows" : "aggregates only"}`, tone: "info" });
    window.setTimeout(() => {
      updateCareers((st) => ({ reportRuns: st.reportRuns.map((r) => (r.id === id ? { ...r, status: "Ready" } : r)) }));
      toast({ title: "Report ready", body: file });
    }, 2500);
  };

  const employerColumns: DataTableColumn<Employer>[] = [
    {
      key: "company",
      header: "Employer",
      sortable: true,
      render: (e) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-surface-inv text-cta">
            <Building2 aria-hidden className="size-4" />
          </span>
          <span className="truncate font-semibold text-ink">{e.company}</span>
        </span>
      ),
    },
    { key: "opportunities", header: "Opportunities", align: "right", mono: true, sortable: true },
    { key: "applications", header: "Applications", align: "right", mono: true, sortable: true },
    { key: "interviews", header: "Interviewed", align: "right", mono: true, sortable: true },
    { key: "offers", header: "Offers", align: "right", mono: true, sortable: true },
    { key: "joined", header: "Joined", align: "right", mono: true, sortable: true },
    {
      key: "conversion",
      header: "Offer rate",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (e) => (e.applications ? e.offers / e.applications : 0),
      render: (e) => `${e.applications ? Math.round((e.offers / e.applications) * 100) : 0}%`,
    },
    { key: "medianCtc", header: "Median CTC", align: "right", sortable: true, render: (e) => (e.medianCtc ? formatLPA(e.medianCtc) : <span className="text-ink-3">No job offers</span>) },
  ];

  const runColumns: DataTableColumn<ReportRun>[] = [
    { key: "file", header: "Report", render: (r) => <span className="font-mono text-[12.5px] text-ink">{r.file}</span> },
    { key: "scope", header: "Scope", render: (r) => <span className="text-ink-2">{r.scope}</span> },
    { key: "period", header: "Period" },
    { key: "requestedBy", header: "Requested by" },
    { key: "requested", header: "Requested", render: (r) => <span className="tnum text-ink-3">{r.requested}</span> },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} tone={r.status === "Ready" ? "jade" : "amber"} size="sm" /> },
    {
      key: "download",
      header: <span className="sr-only">Download</span>,
      align: "right",
      render: (r) => (
        <Guard allowed={r.status === "Ready"} reason="The report is still being generated.">
          <Button size="xs" variant="ghost" disabled={r.status !== "Ready"} onClick={() => toast({ title: "Download started", body: r.file, tone: "info" })}>
            <Download className="size-3.5" />
            Download
          </Button>
        </Guard>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <Card className="min-w-0">
        <CardHeader title="Generate placement reports" sub="Choose a scope and period. Figures below update before you generate." />
        <div className="grid gap-4 border-t border-line px-5 py-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Scope">
            <Select value={programme} onChange={(e) => setProgramme(e.target.value)}>
              <option value="">{scope.placement ? "All placement-eligible learners" : "All your allocated students"}</option>
              {programmeIds.map((id) => (
                <option key={id} value={id}>
                  {programmeById(id)?.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Period">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)}>
              {PERIODS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="min-w-0">
            <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Opportunities</p>
            <Segmented
              value={kind}
              onChange={setKind}
              items={[
                { id: "all", label: "All" },
                { id: "job", label: "Jobs" },
                { id: "internship", label: "Internships" },
              ]}
            />
          </div>
          <Field label="Format">
            <Select value={format} onChange={(e) => setFormat(e.target.value)}>
              <option>CSV</option>
              <option>XLSX</option>
              <option>PDF</option>
            </Select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3.5">
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Checkbox checked={include.employers} onChange={(e) => setInclude((x) => ({ ...x, employers: e.target.checked }))} label="Employer table" />
            <Checkbox checked={include.funnel} onChange={(e) => setInclude((x) => ({ ...x, funnel: e.target.checked }))} label="Stage funnel" />
            <Checkbox checked={include.students} onChange={(e) => setInclude((x) => ({ ...x, students: e.target.checked }))} label="Student-level rows (personal data)" />
          </div>
          <Button onClick={generate}>
            <FileBarChart className="size-4" />
            Generate placement report
          </Button>
        </div>
      </Card>

      <KpiRow cols={4}>
        <KpiTile hero label="Placement rate" value={`${rate}%`} icon={<TrendingUp />} sub={`${placed.length} placed of ${eligible} placement-eligible`} />
        <KpiTile label="Median package band" value={jobOffers.length ? ctcBand(med) : "No job offers"} tone="jade" icon={<IndianRupee />} sub={jobOffers.length ? `Median ${formatLPA(med)} · ${jobOffers.length} job offers` : p.label} />
        <KpiTile label="Time to offer" value={rows.some((r) => r.app.offer) ? `${Math.round(timeToOffer)} days` : "No offers"} tone="info" icon={<Clock3 />} sub="Median, application to offer" />
        <KpiTile label="Offers and joined" value={`${funnel[3].value} · ${funnel[4].value}`} tone="violet" icon={<Award />} sub={`${rows.length} applications · ${p.label}`} />
      </KpiRow>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title="Stage funnel" sub={`${scopeLabel} · ${kindLabel} · ${p.label}`} />
          <div className="px-5 pb-5">{rows.length ? <Funnel steps={funnel} tone="cta-strong" /> : <EmptyState title="No applications in this period" sub="Widen the period or the scope." />}</div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Offers and joining by month" sub="All ZSkillup learners, Apr to Sep 2026" />
          <div className="px-5 pb-5">
            <LineChart
              labels={placementSummary.monthly.map((m) => m.month.slice(0, 3))}
              height={180}
              series={[
                { label: "Offers", values: placementSummary.monthly.map((m) => m.offers), tone: "cta-strong" },
                { label: "Joined", values: placementSummary.monthly.map((m) => m.joined), tone: "jade" },
              ]}
            />
          </div>
        </Card>
      </div>

      <DataTable
        caption="Employers"
        rows={employers}
        columns={employerColumns}
        getRowId={(e) => e.id}
        initialSort={{ key: "applications", dir: "desc" }}
        search={{ placeholder: "Search employer", match: (e, q) => e.company.toLowerCase().includes(q) }}
        toolbar={<MiniLabel>Employer table · {p.label}</MiniLabel>}
        empty={<EmptyState title="No employers in this period" sub="Widen the period or the scope." />}
      />

      <Card className="min-w-0">
        <CardHeader title="Report history" sub="Generated and scheduled placement reports" />
        <div className="px-5 pb-4">
          <DataTable bare dense caption="Report history" rows={store.reportRuns} columns={runColumns} getRowId={(r) => r.id} pageSize={6} />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ alumni */

function AlumniTab({ scope }: { scope: CareerScope }) {
  const store = useCareers();
  const [programme, setProgramme] = useState("");
  const [status, setStatus] = useState("");
  const [year, setYear] = useState("");
  const [editing, setEditing] = useState<AlumniOutcome | "new" | null>(null);

  const alumni = store.alumni;
  const visible = alumni.filter((a) => (!programme || a.programmeId === programme) && (!status || a.accaStatus === status) && (!year || String(a.completedYear) === year));
  const years = Array.from(new Set(alumni.map((a) => a.completedYear))).sort();
  const statuses = ["Member", "Affiliate", "Finalist"] as const;
  const ctcs = visible.map((a) => a.ctcLPA);
  const bands = ["Below ₹5 LPA", "₹5 to 7 LPA", "₹7 to 10 LPA", "₹10 to 15 LPA", "₹15 LPA and above"];

  const columns: DataTableColumn<AlumniOutcome>[] = [
    {
      key: "name",
      header: "Alumnus",
      sortable: true,
      render: (a) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={a.name} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{a.name}</span>
            <span className="block truncate text-[12px] text-ink-3">{programmeById(a.programmeId)?.name}</span>
          </span>
        </span>
      ),
    },
    { key: "completedYear", header: "Completed", mono: true, sortable: true },
    { key: "accaStatus", header: "ACCA status", sortable: true, render: (a) => <StatusPill status={a.accaStatus} tone={STATUS_TONE[a.accaStatus]} size="sm" /> },
    { key: "role", header: "Role", sortable: true, render: (a) => <span className="text-ink-2">{a.role}</span> },
    { key: "company", header: "Company", sortable: true },
    { key: "city", header: "City", sortable: true },
    { key: "ctcLPA", header: "CTC", align: "right", sortable: true, render: (a) => <span className="font-mono font-semibold text-ink tnum">{formatLPA(a.ctcLPA)}</span> },
    { key: "band", header: "Package band", sortable: true, sortValue: (a) => a.ctcLPA, render: (a) => <span className="text-ink-3">{ctcBand(a.ctcLPA)}</span> },
  ];

  return (
    <div className="space-y-5">
      <ReadOnlyNotice scope={scope} what="Alumni career outcomes" />
      <KpiRow cols={4}>
        <KpiTile hero label="Alumni tracked" value={visible.length} icon={<UsersRound />} sub="Programme-wide, not limited to your scope" />
        <KpiTile label="Average CTC" value={formatLPA(average(ctcs))} tone="jade" icon={<IndianRupee />} sub={`Median ${formatLPA(median(ctcs))}`} />
        <KpiTile label="ACCA members" value={visible.filter((a) => a.accaStatus === "Member").length} tone="info" icon={<Award />} sub={`${visible.filter((a) => a.accaStatus === "Affiliate").length} affiliates`} />
        <KpiTile label="In audit and reporting roles" value={visible.filter((a) => /audit|reporting/i.test(a.role)).length} tone="violet" icon={<Building2 />} sub="Audit, assurance and financial reporting" />
      </KpiRow>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="min-w-0">
          <CardHeader title="ACCA status" sub="Members, affiliates and finalists" />
          <div className="flex flex-wrap items-center gap-5 px-5 pb-5">
            <Donut
              size={120}
              stroke={15}
              segments={statuses.map((s) => ({ label: s, value: visible.filter((a) => a.accaStatus === s).length, tone: STATUS_TONE[s] }))}
              center={<span className="font-display text-[22px] font-bold text-ink tnum">{visible.length}</span>}
            />
            <ul className="min-w-0 space-y-1.5 text-[13px]">
              {statuses.map((s) => (
                <li key={s} className="flex items-center gap-2">
                  <StatusPill status={s} tone={STATUS_TONE[s]} size="sm" />
                  <span className="font-mono text-ink tnum">{visible.filter((a) => a.accaStatus === s).length}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Package bands" sub="Current CTC of tracked alumni" />
          <div className="px-5 pb-5">
            <BarChart data={bands.map((b) => ctcs.filter((c) => ctcBand(c) === b).length)} labels={["<5", "5 to 7", "7 to 10", "10 to 15", "15+"]} tone="cta" height={130} />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="By completion year" sub="ACCA status of each graduating year" />
          <div className="px-5 pb-5">
            <StackedBar
              rows={years.map((y) => ({
                label: String(y),
                parts: statuses.map((s) => ({ label: s, value: visible.filter((a) => a.completedYear === y && a.accaStatus === s).length, tone: STATUS_TONE[s] })),
              }))}
            />
          </div>
        </Card>
      </div>

      <DataTable
        caption="Alumni career outcomes"
        rows={visible}
        columns={columns}
        getRowId={(a) => a.id}
        initialSort={{ key: "ctcLPA", dir: "desc" }}
        onRowClick={(a) => setEditing(a)}
        rowLabel={(a) => `Open the career outcome of ${a.name}`}
        search={{ placeholder: "Search alumni, role or company", match: (a, q) => a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q) || a.company.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(programme || status || year)}
            onClear={() => {
              setProgramme("");
              setStatus("");
              setYear("");
            }}
          >
            <FilterSelect
              label="Programme"
              allLabel="All programmes"
              value={programme}
              onChange={setProgramme}
              options={Array.from(new Set(alumni.map((a) => a.programmeId))).map((id) => ({ value: id, label: programmeById(id)?.name ?? id }))}
            />
            <FilterSelect label="ACCA status" allLabel="Any status" value={status} onChange={setStatus} options={[...statuses]} />
            <FilterSelect label="Completed" allLabel="Any year" value={year} onChange={setYear} options={years.map(String)} />
          </FilterBar>
        }
        toolbar={
          <Guard allowed={scope.canEdit}>
            <Button size="sm" disabled={!scope.canEdit} onClick={() => setEditing("new")}>
              <Plus className="size-4" />
              Record alumni outcome
            </Button>
          </Guard>
        }
      />

      <AlumniDrawer target={editing} scope={scope} count={alumni.length} onClose={() => setEditing(null)} />
    </div>
  );
}

function AlumniDrawer({ target, scope, count, onClose }: { target: AlumniOutcome | "new" | null; scope: CareerScope; count: number; onClose: () => void }) {
  const existing = target && target !== "new" ? target : null;
  return (
    <FormDrawer
      open={target !== null}
      onClose={onClose}
      title={existing ? existing.name : "Record alumni outcome"}
      sub={existing ? `${programmeById(existing.programmeId)?.name} · completed ${existing.completedYear}` : "A former learner's current role, employer and ACCA status."}
      submitLabel={existing ? "Save outcome" : "Record outcome"}
      disabled={!scope.canEdit}
      disabledReason={READ_ONLY_REASON}
      onSubmit={(data) => {
        const record: AlumniOutcome = {
          id: existing?.id ?? `al-${String(count + 10).padStart(2, "0")}`,
          name: existing?.name ?? String(data.get("name") ?? "").trim(),
          studentId: existing?.studentId,
          programmeId: existing?.programmeId ?? String(data.get("programme")),
          completedYear: existing?.completedYear ?? Number(data.get("year")),
          accaStatus: String(data.get("status")) as AlumniOutcome["accaStatus"],
          role: String(data.get("role") ?? "").trim(),
          company: String(data.get("company") ?? "").trim(),
          city: String(data.get("city")),
          ctcLPA: Math.round(Number(data.get("ctc") ?? 0) * 10) / 10,
        };
        updateCareers((st) => ({
          alumni: existing ? st.alumni.map((a) => (a.id === existing.id ? record : a)) : [record, ...st.alumni],
        }));
        toast({ title: existing ? "Alumni outcome updated" : "Alumni outcome recorded", body: `${record.name} · ${record.role}, ${record.company} · ${formatLPA(record.ctcLPA)}` });
        onClose();
      }}
    >
      <div key={existing?.id ?? "new"} className="space-y-4">
        {existing ? null : (
          <>
            <Field label="Full name">
              <Input name="name" required placeholder="e.g. Pranav Kulkarni" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Programme">
                <Select name="programme" defaultValue="pr-graduate">
                  {programmes.map((pr) => (
                    <option key={pr.id} value={pr.id}>
                      {pr.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Completed">
                <Select name="year" defaultValue="2026">
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <option key={y}>{y}</option>
                  ))}
                </Select>
              </Field>
            </div>
          </>
        )}
        <Field label="ACCA status">
          <Select name="status" defaultValue={existing?.accaStatus ?? "Affiliate"} disabled={!scope.canEdit}>
            <option>Finalist</option>
            <option>Affiliate</option>
            <option>Member</option>
          </Select>
        </Field>
        <Field label="Current role">
          <Input name="role" required list="alumni-roles" defaultValue={existing?.role ?? ""} placeholder="e.g. Audit senior" disabled={!scope.canEdit} />
          <datalist id="alumni-roles">
            {ROLE_TRACKS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Company">
            <Input name="company" required defaultValue={existing?.company ?? ""} disabled={!scope.canEdit} />
          </Field>
          <Field label="City">
            <Select name="city" defaultValue={existing?.city ?? "Bengaluru"} disabled={!scope.canEdit}>
              {Array.from(new Set([...(existing ? [existing.city] : []), ...CITIES])).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="CTC (₹ LPA)">
          <Input name="ctc" type="number" step="0.1" min={0} required defaultValue={existing?.ctcLPA ?? ""} disabled={!scope.canEdit} />
        </Field>
      </div>
    </FormDrawer>
  );
}
