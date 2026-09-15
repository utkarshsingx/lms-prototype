"use client";

import { useState } from "react";
import { BarChart3, BookOpen, CalendarDays, Download, Lightbulb, Send, UserRound, UsersRound } from "lucide-react";
import {
  analyticsForPaper,
  classesForCohort,
  cohortWeakTopics,
  examSessionById,
  formatAccaDate,
  formatShortDate,
  paperByCode,
  staffName,
  studentsInCohort,
  type Cohort,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { RemedialDrawer, type Recommendation, type RemedialPreset } from "./remedial-drawer";
import { FACULTY_NOW, PaperMark, batchFor, dayLabel, daysAgoLabel, plural, useFaculty } from "./shared";

const RISK_ORDER = { low: 0, medium: 1, high: 2 } as const;

const SEED_RECOMMENDATIONS: Recommendation[] = [
  {
    id: "rec-01",
    sentOn: "2026-09-11",
    paper: "FR",
    cohortId: "co-fr-dec26-wkd",
    audience: "Students below 50 on this topic",
    recipients: 17,
    topic: "Unrealised profit on intra-group inventory",
    contentTitles: ["Consolidated statement of financial position", "Goodwill on acquisition walkthrough"],
    due: "2026-09-18",
    completed: 6,
  },
  {
    id: "rec-02",
    sentOn: "2026-09-07",
    paper: "FR",
    cohortId: "co-fr-dec26-eve",
    audience: "Whole cohort",
    recipients: 29,
    topic: "Statement of cash flows",
    contentTitles: ["Group accounts revision notes"],
    due: "2026-09-14",
    completed: 21,
  },
  {
    id: "rec-03",
    sentOn: "2026-09-10",
    paper: "PM",
    cohortId: "co-pm-dec26-rev",
    audience: "Students below 50 on this topic",
    recipients: 15,
    topic: "Mix and yield variances",
    contentTitles: ["Planning and operational variances"],
    due: "2026-09-17",
    completed: 5,
  },
];

type ProgressRow = { key: string; student: Student; cohort: Cohort };

export function FacultyCohortsPage() {
  const f = useFaculty();
  return <CohortsView key={f.staffId} />;
}

function CohortsView() {
  const { papers, cohorts, me } = useFaculty();
  const [paper, setPaper] = useState<PaperCode>(papers[0]);
  const [cohortFilter, setCohortFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [recs, setRecs] = useState<Recommendation[]>(SEED_RECOMMENDATIONS);
  const [drawer, setDrawer] = useState<{ n: number; open: boolean; preset: RemedialPreset }>({ n: 0, open: false, preset: {} });

  const info = paperByCode(paper)!;
  const paperCohorts = cohorts.filter((c) => c.papers.includes(paper));
  const learners = paperCohorts.reduce((n, c) => n + c.size, 0);
  const analytics = analyticsForPaper(paper);

  const rows: ProgressRow[] = paperCohorts.flatMap((c) =>
    studentsInCohort(c.id).map((s) => ({ key: `${c.id}-${s.id}`, student: s, cohort: c })),
  );
  const visible = rows.filter(
    (r) => (!cohortFilter || r.cohort.id === cohortFilter) && (!riskFilter || r.student.risk.level === riskFilter),
  );
  const rated = rows.map((r) => r.student.readiness.byPaper[paper]).filter((v): v is number => typeof v === "number");
  const avgReadiness = rated.length ? Math.round(rated.reduce((a, b) => a + b, 0) / rated.length) : null;

  const weak = cohortWeakTopics
    .filter((w) => w.paper === paper && paperCohorts.some((c) => c.id === w.cohortId) && (!cohortFilter || w.cohortId === cohortFilter))
    .flatMap((w) => w.topics.map((t) => ({ ...t, cohortId: w.cohortId })))
    .sort((a, b) => a.avgScore - b.avgScore);

  const areaScores = (analytics?.byArea ?? []).slice().sort((a, b) => a.avg - b.avg);
  const weakestAreas = new Set(areaScores.slice(0, 2).map((a) => a.area));

  const openDrawer = (preset: RemedialPreset) =>
    setDrawer((d) => ({
      n: d.n + 1,
      open: true,
      preset: { ...preset, cohortId: preset.cohortId ?? (cohortFilter || paperCohorts[0]?.id) },
    }));

  const columns: DataTableColumn<ProgressRow>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.student.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{r.student.name}</span>
            <span className="block text-[12px] text-ink-3">{r.student.type === "graduate" ? "Graduate" : "Undergraduate"}</span>
          </span>
        </span>
      ),
    },
    {
      key: "cohort",
      header: "Cohort · batch",
      sortable: true,
      sortValue: (r) => r.cohort.name,
      render: (r) => (
        <span className="block text-[12.5px] text-ink-2">
          {r.cohort.name}
          <span className="block text-[12px] text-ink-3">{batchFor(r.student, r.cohort)?.name ?? "No batch"}</span>
        </span>
      ),
    },
    {
      key: "progress",
      header: "Paper progress",
      sortable: true,
      sortValue: (r) => r.student.papers[paper]?.progress ?? 0,
      render: (r) => {
        const v = r.student.papers[paper]?.progress ?? 0;
        return (
          <span className="flex items-center gap-2">
            <Progress value={v} tone="brand" className="w-24" />
            <span className="font-mono text-[12px] text-ink-2 tnum">{v}%</span>
          </span>
        );
      },
    },
    {
      key: "readiness",
      header: "Readiness score",
      sortable: true,
      sortValue: (r) => r.student.readiness.byPaper[paper] ?? null,
      render: (r) => {
        const v = r.student.readiness.byPaper[paper];
        return typeof v === "number" ? <ScoreBar value={v} marker={50} height={6} className="w-28" /> : <span className="text-ink-3">Not rated</span>;
      },
    },
    {
      key: "attendance",
      header: "Attendance",
      align: "right",
      sortable: true,
      sortValue: (r) => r.student.attendance.pct,
      render: (r) => (r.student.attendance.total ? `${r.student.attendance.pct}%` : "Not started"),
    },
    {
      key: "mock",
      header: "Latest mock",
      sortable: true,
      sortValue: (r) => latestMock(r.student, paper)?.score ?? null,
      render: (r) => {
        const m = latestMock(r.student, paper);
        if (!m) return <span className="text-ink-3">None yet</span>;
        if (m.status === "missed") return <StatusPill status="missed" size="sm" />;
        return (
          <span className="font-mono text-[12px] tnum">
            <span className={cn("font-semibold", (m.score ?? 0) < 50 ? "text-rose" : "text-ink")}>{m.score}%</span>
            <span className="text-ink-3"> · {formatShortDate(m.date)}</span>
          </span>
        );
      },
    },
    {
      key: "active",
      header: "Last active",
      sortable: true,
      sortValue: (r) => r.student.lastActiveDaysAgo,
      render: (r) => (
        <span className={cn(r.student.lastActiveDaysAgo >= 14 ? "font-semibold text-rose" : "text-ink-2")}>
          {daysAgoLabel(r.student.lastActiveDaysAgo)}
        </span>
      ),
    },
    {
      key: "risk",
      header: "Risk",
      sortable: true,
      sortValue: (r) => RISK_ORDER[r.student.risk.level],
      render: (r) => <RiskBadge level={r.student.risk.level} />,
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Teaching"
        title="Papers & cohorts"
        sub="View your assigned papers and cohorts, follow student progress, identify weak topics and recommend remedial learning."
        badge={<ScopeChip icon={<BookOpen />}>{`${me.name} · ${papers.join(", ")} · ${plural(cohorts.length, "cohort")}`}</ScopeChip>}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: `Report queued: ${paper.toLowerCase()}-student-progress.csv`, tone: "info" })}>
              <Download className="size-4" />
              Export progress
            </Button>
            <Button onClick={() => openDrawer({ topic: weak[0]?.topic, contentId: weak[0]?.contentId, cohortId: weak[0]?.cohortId })}>
              <Lightbulb className="size-4" />
              Recommend remedial learning
            </Button>
          </>
        }
      />

      <section className="space-y-4">
        <SectionTitle>View assigned papers</SectionTitle>
        <Tabs
          value={paper}
          onChange={(id) => {
            setPaper(id as PaperCode);
            setCohortFilter("");
          }}
          items={papers.map((p) => ({ id: p, label: `${p} · ${paperByCode(p)?.name}`, count: cohorts.filter((c) => c.papers.includes(p)).length }))}
        />
        <Card className="min-w-0 p-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 items-start gap-4">
              <PaperMark code={paper} size="lg" />
              <div className="min-w-0">
                <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">{info.name}</h2>
                <p className="mt-1 text-[13px] text-ink-2">
                  {info.levelLabel} · {info.examFormat === "session" ? "Session CBE" : "On-demand CBE"} · {info.durationLabel} · pass mark {info.passMark}%
                </p>
                <p className="mt-1 text-[12.5px] text-ink-3">{info.examStructure}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {info.syllabusAreas.map((a) => (
                    <span key={a.code} title={a.title} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] text-ink-2">
                      <span className="font-mono font-bold text-ink">{a.code}</span>
                      <span className="truncate">{a.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <dl className="grid shrink-0 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:w-[26rem] lg:grid-cols-2">
              <Figure label="Cohorts" value={paperCohorts.length} />
              <Figure label="Learners" value={learners} />
              <Figure label="Average readiness" value={avgReadiness ?? "Not rated"} hint="listed learner records" />
              <Figure label="Exam pass rate" value={analytics ? `${analytics.passRate}%` : "No data"} hint={analytics ? "Jun 2026 exam session" : undefined} />
            </dl>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
            <LinkButton size="sm" variant="outline" href={`/faculty/content/${info.courseSlug}`}>
              <BookOpen className="size-4" />
              Open in content studio
            </LinkButton>
            <LinkButton size="sm" variant="outline" href={`/faculty/analytics?paper=${paper}`}>
              <BarChart3 className="size-4" />
              Paper analytics
            </LinkButton>
          </div>
        </Card>
      </section>

      <section>
        <SectionTitle
          action={
            cohortFilter ? (
              <button type="button" onClick={() => setCohortFilter("")} className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
                Show all cohorts
              </button>
            ) : null
          }
        >
          View assigned cohorts
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {paperCohorts.map((c) => {
            const on = cohortFilter === c.id;
            const next = classesForCohort(c.id).find((x) => x.start > FACULTY_NOW && x.status !== "cancelled");
            const session = c.examSessionId ? examSessionById(c.examSessionId) : undefined;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setCohortFilter(on ? "" : c.id)}
                className={cn(
                  "flex min-w-0 flex-col rounded-[var(--radius-lg)] border p-4.5 text-left transition-colors",
                  on ? "border-cta-strong bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[14.5px] leading-snug font-bold text-ink">{c.name}</p>
                  <StatusPill status={c.status} size="sm" />
                </div>
                <p className="mt-1 text-[12.5px] text-ink-3">
                  {c.type === "regular" ? "Regular" : c.type === "revision" ? "Revision" : c.type === "reattempt" ? "Reattempt" : c.type === "fast-track" ? "Fast track" : "University"} ·{" "}
                  {c.mode === "weekend" ? "Weekend" : "Weekday"} · {session ? `${session.label} exam session` : "No session"}
                </p>
                <p className="mt-3 font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-ink tnum">
                  {c.size}
                  <span className="ml-1.5 font-sans text-[12.5px] font-semibold tracking-normal text-ink-3">learners</span>
                </p>
                <ul className="mt-3 space-y-1 text-[12.5px] text-ink-2">
                  {c.sections.map((s) => (
                    <li key={s.id} className="flex min-w-0 items-center gap-1.5">
                      <UsersRound aria-hidden className="size-3.5 shrink-0 text-ink-3" />
                      <span className="truncate">
                        {s.name} · {s.size} · {s.schedule}
                      </span>
                    </li>
                  ))}
                  <li className="flex min-w-0 items-center gap-1.5">
                    <UserRound aria-hidden className="size-3.5 shrink-0 text-ink-3" />
                    <span className="truncate">Mentor {staffName(c.mentorId)}</span>
                  </li>
                  <li className="flex min-w-0 items-center gap-1.5">
                    <CalendarDays aria-hidden className="size-3.5 shrink-0 text-ink-3" />
                    <span className="truncate">
                      {next ? `Next class ${dayLabel(next.start)}, ${next.start.slice(11, 16)}` : `Starts ${formatAccaDate(c.startDate)}`}
                    </span>
                  </li>
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>View student progress</SectionTitle>
        <DataTable
          caption={`${paper} student progress`}
          rows={visible}
          columns={columns}
          getRowId={(r) => r.key}
          search={{ placeholder: "Search learners", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
          filters={
            <FilterBar
              active={Boolean(cohortFilter || riskFilter)}
              onClear={() => {
                setCohortFilter("");
                setRiskFilter("");
              }}
            >
              <FilterSelect
                label="Cohort"
                allLabel="All cohorts"
                value={cohortFilter}
                onChange={setCohortFilter}
                options={paperCohorts.map((c) => ({ value: c.id, label: c.name }))}
              />
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
          toolbar={<span className="text-[12px] text-ink-3">Learner records in this sample · cohort cards show full sizes</span>}
          selectable
          bulkActions={(ids, clear) => (
            <Button
              size="sm"
              onClick={() => {
                const picked = rows.filter((r) => ids.includes(r.key));
                openDrawer({ cohortId: picked[0]?.cohort.id, studentIds: picked.map((r) => r.student.id) });
                clear();
              }}
            >
              <Lightbulb className="size-3.5" />
              Recommend remedial learning
            </Button>
          )}
          initialSort={{ key: "risk", dir: "desc" }}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Card className="min-w-0">
          <CardHeader title="Syllabus area scores" sub={`${paper} mocks and tests, all attempts`} />
          <ul className="space-y-3 border-t border-line px-5 py-4">
            {(analytics?.byArea ?? []).map((a) => (
              <li key={a.area} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <p className="min-w-0 truncate text-[13px] text-ink">
                    <span className="font-mono font-bold">{a.area}</span> · {a.title}
                  </p>
                  {weakestAreas.has(a.area) ? (
                    <StatusPill status="at risk" size="sm">
                      Weak
                    </StatusPill>
                  ) : null}
                </div>
                <ScoreBar value={a.avg} marker={50} height={6} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Identify weak topics"
            sub="Ranked by average score, lowest first"
            action={
              <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-[12px] font-semibold text-ink-2 tnum">{weak.length} topics</span>
            }
          />
          <ol className="divide-y divide-line border-t border-line">
            {weak.length === 0 ? <li className="px-5 py-6 text-[13px] text-ink-3">No weak topics recorded for this cohort yet.</li> : null}
            {weak.map((w, i) => (
              <li key={`${w.cohortId}-${w.topic}`} className="grid gap-3 px-5 py-4 md:grid-cols-[2rem_minmax(0,1fr)_auto] md:items-start">
                <span className="font-display text-[20px] leading-none font-bold text-ink-3 tnum">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-ink">{w.topic}</p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    Area {w.area} · {info.syllabusAreas.find((a) => a.code === w.area)?.title} · {paperCohorts.find((c) => c.id === w.cohortId)?.name}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:items-center">
                    <ScoreBar value={w.avgScore} marker={50} height={6} />
                    <p className="text-[12.5px] text-ink-2">
                      <span className="font-semibold text-rose tnum">{w.studentsBelow50}</span> learners below 50
                    </p>
                  </div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                    <span className="mr-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Suggested</span>
                    {w.recommendation}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openDrawer({ cohortId: w.cohortId, topic: w.topic, contentId: w.contentId })}>
                  <Send className="size-3.5" />
                  Recommend
                </Button>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader title="Remedial learning sent" sub="What you recommended and how many learners have completed it" />
        <div className="px-5 pb-5">
          <DataTable
            bare
            dense
            caption="Remedial learning sent"
            rows={recs.filter((r) => r.paper === paper)}
            getRowId={(r) => r.id}
            maxHeight="none"
            empty={<p className="text-center text-[13px] text-ink-3">Nothing recommended for {paper} yet. Use Recommend on a weak topic.</p>}
            columns={[
              { key: "sentOn", header: "Sent", mono: true, sortable: true, render: (r) => formatShortDate(r.sentOn) },
              { key: "topic", header: "Topic", wrap: true, render: (r) => <span className="font-semibold text-ink">{r.topic}</span> },
              {
                key: "to",
                header: "Recommended to",
                wrap: true,
                render: (r) => (
                  <span className="text-[12.5px] text-ink-2">
                    {r.audience} · {r.recipients}
                    <span className="block text-[12px] text-ink-3">{paperCohorts.find((c) => c.id === r.cohortId)?.name ?? r.cohortId}</span>
                  </span>
                ),
              },
              { key: "content", header: "Content", wrap: true, render: (r) => <span className="text-[12.5px] text-ink-2">{r.contentTitles.join(", ")}</span> },
              { key: "due", header: "Due", mono: true, sortable: true, render: (r) => formatShortDate(r.due) },
              {
                key: "done",
                header: "Completed",
                render: (r) => (
                  <span className="flex items-center gap-2">
                    <Progress value={r.recipients ? (r.completed / r.recipients) * 100 : 0} tone="jade" className="w-20" />
                    <span className="font-mono text-[12px] text-ink-2 tnum">
                      {r.completed} of {r.recipients}
                    </span>
                  </span>
                ),
              },
            ]}
          />
        </div>
      </Card>

      <RemedialDrawer
        key={drawer.n}
        open={drawer.open}
        onClose={() => setDrawer((d) => ({ ...d, open: false }))}
        paper={paper}
        cohorts={paperCohorts}
        preset={drawer.preset}
        onSend={(rec) => setRecs((list) => [{ ...rec, id: `rec-new-${list.length + 1}` }, ...list])}
      />
    </div>
  );
}

function latestMock(s: Student, paper: PaperCode) {
  return s.mocks
    .filter((m) => m.paper === paper && m.status !== "scheduled")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

function Figure({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-display text-[22px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{value}</dd>
      {hint ? <dd className="mt-1 text-[11.5px] text-ink-3">{hint}</dd> : null}
    </div>
  );
}
