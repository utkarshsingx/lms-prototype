"use client";

import { useMemo, useState } from "react";
import { Briefcase, Building2, Download, Gauge, GraduationCap, Info, MapPin, Send, TrendingUp } from "lucide-react";
import {
  PLACEMENT_STAGES,
  alumniOutcomes,
  applications,
  careerOutcomes,
  companyReadinessFor,
  formatAccaDate,
  interviewsForStudent,
  opportunities,
  opportunityById,
  papersCleared,
  placementSummary,
  programmeById,
  resumeForStudent,
  studentsForUniversity,
  type Application,
  type Student,
} from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill, toneFill, type StatusTone } from "@/components/ui/status";
import { BarChart, Donut, Funnel, LineChart } from "@/components/ui/charts";
import { ScoreBar } from "@/components/ui/score";
import { cn } from "@/lib/cn";
import { Callout, MiniLabel, WorkspaceHeader, intakeShort, plural, queueReport, rollNumber, useWorkspace } from "./shared";

const TABS = [
  { id: "internships", label: "View internship participation" },
  { id: "readiness", label: "View placement readiness" },
  { id: "outcomes", label: "View career outcomes" },
] as const;
type TabId = (typeof TABS)[number]["id"];

type Participation = "not-started" | "planned" | "applied" | "shortlisted" | "interview" | "offer" | "ongoing" | "completed";

const PARTICIPATION: Record<Participation, { label: string; tone: StatusTone }> = {
  "not-started": { label: "Not started", tone: "neutral" },
  planned: { label: "Planned · Summer 2027", tone: "amber" },
  applied: { label: "Applied", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "violet" },
  interview: { label: "Interview", tone: "violet" },
  offer: { label: "Offer", tone: "jade" },
  ongoing: { label: "Ongoing", tone: "info" },
  completed: { label: "Completed", tone: "jade" },
};

type InternRow = { student: Student; participation: Participation; application?: Application };

const BAND_TONE: Record<string, StatusTone> = { Ready: "jade", "Nearly ready": "amber", Developing: "rose" };

function participationOf(s: Student, app?: Application): Participation {
  const st = s.career.internship.status;
  if (st === "completed" || st === "ongoing") return st;
  if (app && (app.stage === "shortlisted" || app.stage === "interview" || app.stage === "offer")) return app.stage;
  if (app || st === "applied") return "applied";
  if (st === "planned") return "planned";
  return "not-started";
}

export function CareersPage({ initialTab }: { initialTab?: string }) {
  const { uni } = useWorkspace();
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "internships");

  const roster = useMemo(() => studentsForUniversity(uni.id), [uni.id]);
  const ids = useMemo(() => new Set(roster.map((s) => s.id)), [roster]);
  const apps = applications.filter((a) => ids.has(a.studentId));
  const firstCohortSize = 71;

  const internRows: InternRow[] = roster.map((s) => {
    const application = apps.find((a) => a.studentId === s.id);
    return { student: s, application, participation: participationOf(s, application) };
  });

  const readinessRows = roster.map((s) => ({
    student: s,
    cr: companyReadinessFor(s.id),
    resume: resumeForStudent(s.id),
    interviews: interviewsForStudent(s.id).filter((i) => i.status === "completed"),
  }));
  const withScores = readinessRows.filter((r) => r.cr);
  const avgCr = withScores.length ? Math.round(withScores.reduce((sum, r) => sum + (r.cr?.score ?? 0), 0) / withScores.length) : 0;

  const [intake, setIntake] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");
  const [band, setBand] = useState("");

  const sectionOk = (s: Student) => (!intake || s.intakeId === intake) && (!section || s.section === section);

  const intakeOptions = [...new Set(roster.map((s) => s.intakeId))].sort().map((id) => ({ value: id, label: intakeShort(id) }));

  const openInternships = opportunities.filter(
    (o) => o.kind === "internship" && o.status === "open" && o.eligibility.studentTypes.includes("undergraduate"),
  );

  const counts = (Object.keys(PARTICIPATION) as Participation[])
    .map((p) => ({ id: p, n: internRows.filter((r) => r.participation === p).length }))
    .filter((c) => c.n > 0);

  /* ---------------------------------------------------------------- columns */
  const internColumns: DataTableColumn<InternRow>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block font-mono text-[11.5px] text-ink-3">{rollNumber(r.student.id)}</span>
        </span>
      ),
    },
    { key: "cohort", header: "Intake · section", render: (r) => `${intakeShort(r.student.intakeId)} · ${r.student.section}` },
    {
      key: "participation",
      header: "Internship participation",
      sortable: true,
      sortValue: (r) => Object.keys(PARTICIPATION).indexOf(r.participation),
      render: (r) => (
        <StatusPill status={r.participation} tone={PARTICIPATION[r.participation].tone}>
          {PARTICIPATION[r.participation].label}
        </StatusPill>
      ),
    },
    {
      key: "opportunity",
      header: "Internship",
      wrap: true,
      render: (r) => {
        const o = r.application ? opportunityById(r.application.opportunityId) : undefined;
        if (o) {
          return (
            <span className="block min-w-0">
              <span className="block font-semibold text-ink">{o.title}</span>
              <span className="block text-[12px] text-ink-3">
                {o.company} · {o.location}
              </span>
            </span>
          );
        }
        return r.participation === "planned" ? (
          <span className="text-ink-2">To be matched by the career team</span>
        ) : (
          <span className="text-ink-3">No application yet</span>
        );
      },
    },
    { key: "applied", header: "Applied on", sortable: true, sortValue: (r) => r.application?.appliedOn ?? "", render: (r) => (r.application ? formatAccaDate(r.application.appliedOn) : null) },
    {
      key: "match",
      header: "Match score",
      sortable: true,
      sortValue: (r) => r.application?.matchScore ?? null,
      render: (r) => (r.application ? <ScoreBar value={r.application.matchScore} className="w-28" height={6} /> : null),
    },
  ];

  const readinessColumns: DataTableColumn<(typeof readinessRows)[number]>[] = [
    {
      key: "student",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">
            {intakeShort(r.student.intakeId)} · Section {r.student.section}
          </span>
        </span>
      ),
    },
    {
      key: "cr",
      header: "Company Readiness Score",
      sortable: true,
      sortValue: (r) => r.cr?.score ?? null,
      render: (r) => (r.cr ? <ScoreBar value={r.cr.score} className="w-32" height={6} /> : <span className="text-ink-3">Not started</span>),
    },
    {
      key: "band",
      header: "Band",
      sortable: true,
      sortValue: (r) => r.cr?.band ?? "",
      render: (r) => (r.cr ? <StatusPill status={r.cr.band} tone={BAND_TONE[r.cr.band]} size="sm" /> : null),
    },
    { key: "ats", header: "ATS score", align: "right", sortable: true, sortValue: (r) => r.resume?.atsScore ?? null, render: (r) => r.resume?.atsScore ?? null },
    {
      key: "resume",
      header: "Resume",
      sortable: true,
      sortValue: (r) => r.resume?.status ?? "",
      render: (r) => (r.resume ? <StatusPill status={r.resume.status} size="sm" /> : <StatusPill status="not-started" size="sm" />),
    },
    {
      key: "interviews",
      header: "Mock interviews",
      render: (r) =>
        r.interviews.length ? (
          <span className="text-ink-2">
            {plural(r.interviews.length, "completed", "completed")} · latest {r.interviews[r.interviews.length - 1].score ?? "not scored"}
          </span>
        ) : (
          <span className="text-ink-3">None yet</span>
        ),
    },
    { key: "papers", header: "Papers cleared", align: "right", sortable: true, sortValue: (r) => papersCleared(r.student), render: (r) => papersCleared(r.student) },
    {
      key: "eligible",
      header: "Placement-eligible",
      render: (r) =>
        r.student.career.placementEligible ? <StatusPill status="Eligible" size="sm" /> : <StatusPill status="Not yet" tone="neutral" size="sm" />,
    },
  ];

  const bins = [
    { label: "Under 40", test: (v: number) => v < 40 },
    { label: "40 to 49", test: (v: number) => v >= 40 && v < 50 },
    { label: "50 to 59", test: (v: number) => v >= 50 && v < 60 },
    { label: "60 to 69", test: (v: number) => v >= 60 && v < 70 },
    { label: "70 and above", test: (v: number) => v >= 70 },
  ];

  const components = withScores[0]?.cr?.components.map((c) => ({
    label: c.label,
    weight: c.weight,
    avg: Math.round(withScores.reduce((sum, r) => sum + (r.cr?.components.find((x) => x.label === c.label)?.score ?? 0), 0) / withScores.length),
  }));

  const applied = apps.length;
  const shortlisted = apps.filter((a) => ["shortlisted", "interview", "offer", "joined"].includes(a.stage)).length;
  const interviewing = apps.filter((a) => ["interview", "offer", "joined"].includes(a.stage)).length;
  const offers = apps.filter((a) => ["offer", "joined"].includes(a.stage)).length;
  const planned = internRows.filter((r) => r.participation === "planned").length;
  const programme = programmeById(uni.programmeId);
  const graduatesIn = programme ? `Apr ${2025 + Math.ceil(programme.durationMonths / 12)}` : "Apr 2028";

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Engagement"
        title="Careers"
        sub={`Internship participation, placement readiness and career outcomes for ${uni.shortName} ACCA learners. The ZSkillup career team runs internships and placements.`}
        actions={
          <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-careers-${tab}.csv`, TABS.find((t) => t.id === tab)?.label)}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          label="Internships planned"
          value={uni.headline.internshipsPlanned}
          tone="violet"
          icon={<Briefcase />}
          sub={`${Math.round((uni.headline.internshipsPlanned / firstCohortSize) * 100)}% of the ${firstCohortSize} learners in the 2025 intake`}
        />
        <KpiTile label="Internship applications" value={applied} tone="info" icon={<Send />} sub={`${shortlisted} shortlisted · listed records`} />
        <KpiTile label="Average Company Readiness Score" value={avgCr} tone={avgCr >= 50 ? "amber" : "rose"} icon={<Gauge />} sub={`${withScores.length} learners with a score`} />
        <KpiTile label="Placement-eligible learners" value={roster.filter((s) => s.career.placementEligible).length} icon={<GraduationCap />} sub={`First graduating batch ${graduatesIn}`} />
      </KpiRow>

      <Tabs items={TABS.map((t) => ({ id: t.id, label: t.label }))} value={tab} onChange={(id) => setTab(id as TabId)} />

      {/* ------------------------------------------------------------ internships */}
      {tab === "internships" ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <Card className="min-w-0">
              <CardHeader title="Internship participation" sub={`${plural(internRows.length, "listed learner record")} across both intakes`} />
              <div className="flex flex-wrap items-center gap-6 px-5 pb-5">
                <Donut
                  segments={counts.map((c) => ({ label: PARTICIPATION[c.id].label, value: c.n, tone: PARTICIPATION[c.id].tone }))}
                  center={
                    <span>
                      <span className="block font-display text-[26px] leading-none font-bold text-ink tnum">{internRows.length - (counts.find((c) => c.id === "not-started")?.n ?? 0)}</span>
                      <span className="text-[11px] text-ink-3">taking part</span>
                    </span>
                  }
                />
                <ul className="min-w-0 flex-1 space-y-2">
                  {counts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <button
                        type="button"
                        onClick={() => setStatus((cur) => (cur === c.id ? "" : c.id))}
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded-md text-left hover:underline hover:decoration-cta hover:decoration-2 hover:underline-offset-4",
                          status === c.id ? "font-semibold text-ink" : "text-ink-2",
                        )}
                      >
                        <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", toneFill[PARTICIPATION[c.id].tone])} />
                        <span className="truncate">{PARTICIPATION[c.id].label}</span>
                      </button>
                      <span className="font-mono font-semibold text-ink tnum">{c.n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            <Card className="min-w-0">
              <CardHeader title="Open internships for your learners" sub="Posted by the ZSkillup career team" />
              <ul className="divide-y divide-line border-t border-line">
                {openInternships.map((o) => {
                  const ours = apps.filter((a) => a.opportunityId === o.id);
                  return (
                    <li key={o.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[14px] font-semibold text-ink">{o.title}</p>
                          <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 text-[12.5px] text-ink-3">
                            <Building2 aria-hidden className="size-3.5" />
                            {o.company}
                            <MapPin aria-hidden className="ml-1 size-3.5" />
                            {o.location} · {o.compensation}
                          </p>
                        </div>
                        <StatusPill status={`${ours.length} applied`} tone={ours.length ? "info" : "neutral"} size="sm">
                          {plural(ours.length, `${uni.shortName} applicant`)}
                        </StatusPill>
                      </div>
                      <p className="mt-1.5 text-[12.5px] text-ink-2">
                        {o.eligibility.note}. Closes {formatAccaDate(o.closesOn)}. Needs {plural(o.eligibility.minPapersCleared, "paper")} cleared
                        {o.eligibility.requiredPapers.length ? ` including ${o.eligibility.requiredPapers.join(", ")}` : ""}.
                      </p>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>

          <DataTable
            caption="Internship participation"
            rows={internRows.filter((r) => sectionOk(r.student) && (!status || r.participation === status))}
            columns={internColumns}
            getRowId={(r) => r.student.id}
            initialSort={{ key: "participation", dir: "desc" }}
            search={{ placeholder: "Search student or roll number", match: (r, q) => r.student.name.toLowerCase().includes(q) || rollNumber(r.student.id).toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(intake || section || status)}
                onClear={() => {
                  setIntake("");
                  setSection("");
                  setStatus("");
                }}
              >
                <FilterSelect label="Intake" allLabel="Both" value={intake} onChange={setIntake} options={intakeOptions} />
                <FilterSelect label="Section" allLabel="All" value={section} onChange={setSection} options={[{ value: "A", label: "Section A" }, { value: "B", label: "Section B" }]} />
                <FilterSelect
                  label="Participation"
                  allLabel="Any"
                  value={status}
                  onChange={setStatus}
                  options={counts.map((c) => ({ value: c.id, label: PARTICIPATION[c.id].label }))}
                />
              </FilterBar>
            }
          />
          <p className="text-[12px] text-ink-3">
            Headline figures cover all {uni.headline.students} {uni.shortName} students. Tables list the {roster.length} learner records synced to this workspace.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ readiness */}
      {tab === "readiness" ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="min-w-0">
              <CardHeader title="Company Readiness Score distribution" sub={`${plural(withScores.length, "learner")} with a score · 70 and above is ready for placement interviews`} />
              <div className="px-5 pb-5">
                <BarChart
                  data={bins.map((b) => withScores.filter((r) => b.test(r.cr?.score ?? 0)).length)}
                  labels={bins.map((b) => b.label)}
                  tone="violet"
                  height={150}
                />
              </div>
            </Card>
            <Card className="min-w-0">
              <CardHeader title="What drives the score" sub="Average component scores for your learners, with each component's weight" />
              <div className="space-y-3.5 px-5 pb-5">
                {components?.map((c) => (
                  <ScoreBar key={c.label} label={`${c.label} · ${c.weight}%`} value={c.avg} />
                ))}
              </div>
            </Card>
          </div>
          <DataTable
            caption="Placement readiness"
            rows={readinessRows.filter((r) => sectionOk(r.student) && (!band || r.cr?.band === band || (band === "none" && !r.cr)))}
            columns={readinessColumns}
            getRowId={(r) => r.student.id}
            initialSort={{ key: "cr", dir: "desc" }}
            search={{ placeholder: "Search student", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(intake || section || band)}
                onClear={() => {
                  setIntake("");
                  setSection("");
                  setBand("");
                }}
              >
                <FilterSelect label="Intake" allLabel="Both" value={intake} onChange={setIntake} options={intakeOptions} />
                <FilterSelect label="Section" allLabel="All" value={section} onChange={setSection} options={[{ value: "A", label: "Section A" }, { value: "B", label: "Section B" }]} />
                <FilterSelect
                  label="Band"
                  allLabel="Any"
                  value={band}
                  onChange={setBand}
                  options={[
                    { value: "Ready", label: "Ready" },
                    { value: "Nearly ready", label: "Nearly ready" },
                    { value: "Developing", label: "Developing" },
                    { value: "none", label: "Not started" },
                  ]}
                />
              </FilterBar>
            }
          />
          <Callout icon={<Info />}>
            Placement eligibility is set by the ZSkillup career team. No {uni.shortName} learner is placement-eligible yet: the 2025 intake is in Semester 3,
            so internships and resume work come first. Learners in the 2026 intake start their career profile later in the programme.
          </Callout>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ outcomes */}
      {tab === "outcomes" ? (
        <div className="space-y-5">
          <Callout icon={<TrendingUp />} title={`${uni.shortName} outcomes so far`}>
            The first {uni.programmeName} batch (2025 intake) graduates in {graduatesIn}. Until then, outcomes for {uni.shortName} are internships and early
            applications. The benchmark below shows where ZSkillup ACCA alumni from all programmes work today.
          </Callout>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="min-w-0">
              <CardHeader title={`${uni.shortName} career pipeline`} sub="Listed learner records, this academic year" />
              <div className="px-5 pb-5">
                <Funnel
                  tone="violet"
                  steps={[
                    { label: "Career profile started", value: withScores.length },
                    { label: "Internship planned or applied", value: planned + applied },
                    { label: "Applied", value: applied },
                    { label: "Shortlisted", value: shortlisted },
                    { label: "Interview", value: interviewing },
                    { label: "Offer", value: offers },
                  ]}
                />
              </div>
            </Card>
            <Card className="min-w-0">
              <CardHeader title="Offers and joining across ZSkillup programmes" sub="Monthly, all programmes (benchmark)" />
              <div className="px-5 pb-5">
                <LineChart
                  labels={placementSummary.monthly.map((m) => m.month.replace(" 2026", ""))}
                  series={[
                    { label: "Offers", values: placementSummary.monthly.map((m) => m.offers), tone: "violet" },
                    { label: "Joined", values: placementSummary.monthly.map((m) => m.joined), tone: "jade" },
                  ]}
                  height={170}
                  min={0}
                />
              </div>
            </Card>
          </div>

          <KpiRow cols={4}>
            <KpiTile label="Alumni tracked" value={careerOutcomes.alumniTracked} sub="All ZSkillup programmes" />
            <KpiTile label="Average alumni CTC" value={`₹${careerOutcomes.alumniAvgCtcLPA} LPA`} tone="jade" sub="Latest recorded role" />
            <KpiTile label="Offers this year" value={placementSummary.offers} tone="violet" sub={`${placementSummary.joined} joined`} />
            <KpiTile label="Average offer" value={`₹${placementSummary.avgOfferLPA} LPA`} tone="info" sub="Graduate placements" />
          </KpiRow>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
            <Card className="min-w-0 p-5">
              <MiniLabel>Alumni by ACCA status</MiniLabel>
              <div className="mt-4 flex flex-col items-center gap-4">
                <Donut
                  segments={careerOutcomes.alumniByStatus.map((a, i) => ({ label: a.status, value: a.count, tone: ["jade", "violet", "amber"][i % 3] }))}
                  center={
                    <span>
                      <span className="block font-display text-[26px] leading-none font-bold text-ink tnum">{careerOutcomes.alumniTracked}</span>
                      <span className="text-[11px] text-ink-3">alumni</span>
                    </span>
                  }
                />
                <ul className="w-full space-y-1.5">
                  {careerOutcomes.alumniByStatus.map((a, i) => (
                    <li key={a.status} className="flex items-center justify-between text-[13px] text-ink-2">
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2.5 rounded-full", toneFill[(["jade", "violet", "amber"] as StatusTone[])[i % 3]])} />
                        {a.status}
                      </span>
                      <span className="font-mono font-semibold text-ink">{a.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
            <DataTable
              caption="ZSkillup alumni outcomes"
              rows={alumniOutcomes}
              getRowId={(a) => a.id}
              dense
              initialSort={{ key: "ctc", dir: "desc" }}
              toolbar={<span className="text-[12.5px] text-ink-3">Anonymised benchmark · names hidden</span>}
              columns={[
                { key: "role", header: "Role", sortable: true, className: "font-semibold" },
                { key: "company", header: "Employer", sortable: true },
                { key: "city", header: "City" },
                { key: "accaStatus", header: "ACCA status", sortable: true, render: (a) => <StatusPill status={a.accaStatus} tone={a.accaStatus === "Member" ? "jade" : a.accaStatus === "Affiliate" ? "violet" : "amber"} size="sm" /> },
                { key: "programme", header: "Programme", render: (a) => programmeById(a.programmeId)?.name ?? a.programmeId },
                { key: "completedYear", header: "Completed", align: "right", sortable: true, mono: true },
                { key: "ctc", header: "CTC", align: "right", sortable: true, sortValue: (a) => a.ctcLPA, render: (a) => `₹${a.ctcLPA} LPA` },
              ]}
            />
          </div>
          <p className="text-[12px] text-ink-3">
            Placement stages tracked by the career team: {PLACEMENT_STAGES.map((s) => s.label).join(", ")}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
