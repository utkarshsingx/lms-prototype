"use client";

import { useState } from "react";
import { BarChart3, Clock, Download, Lightbulb, Send, Target, UsersRound } from "lucide-react";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  analyticsForPaper,
  bankQuestions,
  cohortWeakTopics,
  examSessionById,
  groupIndian,
  paperByCode,
  quizOrMockById,
  quizzesAndMocks,
  type BankQuestion,
  type BankQuestionType,
  type PaperAnalytics,
  type PaperCode,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { BarChart } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Matrix } from "@/components/ui/matrix";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { StatusPill, toneSoft, type StatusTone } from "@/components/ui/status";
import { scoreTone } from "@/components/ui/score";
import { toast } from "@/components/ui/toast";
import { PaperMark, hashOf, useFaculty } from "./shared";

/** ACCA's guidance of about 1.8 minutes per mark. */
const MINS_PER_MARK = 1.8;
const RELEASED_SESSIONS = ["es-2025-sep", "es-2025-dec", "es-2026-mar", "es-2026-jun"];
const SESSION_OFFSETS = [-6, -3, -4, 0];
const BIN_LABELS = ["0", "10", "20", "30", "40", "50", "60", "70", "80", "90"];
const TYPE_SHORT: Record<BankQuestionType, string> = { OT: "OT", MTQ: "MTQ", CR: "CR", number: "Number" };

type Flag = "Too hard" | "Low discrimination" | "Too easy" | "Performing well";
const FLAG_TONE: Record<Flag, StatusTone> = {
  "Too hard": "rose",
  "Low discrimination": "amber",
  "Too easy": "amber",
  "Performing well": "jade",
};

type QuestionRow = BankQuestion & { discrimination: number; allowed: number; taken: number; flag: Flag };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const oneDp = (v: number) => Math.round(v * 10) / 10;

function discriminationOf(q: BankQuestion) {
  const base = q.difficulty === "exam-standard" ? 0.38 : q.difficulty === "intermediate" ? 0.33 : 0.26;
  return Math.max(0.05, Math.round((base + ((hashOf(q.id) % 13) - 6) / 50) * 100) / 100);
}

function flagOf(facility: number, discrimination: number): Flag {
  if (facility < 0.4) return "Too hard";
  if (discrimination < 0.2) return "Low discrimination";
  if (facility > 0.85) return "Too easy";
  return "Performing well";
}

/** A bell-shaped spread of scores around an assessment's average, in 10-point bands. */
function spreadAround(avg: number, attempts: number, seed: string) {
  const sd = 15 + (hashOf(seed) % 4);
  const weights = BIN_LABELS.map((_, i) => Math.exp(-((i * 10 + 5 - avg) ** 2) / (2 * sd * sd)));
  const sum = weights.reduce((a, b) => a + b, 0);
  const bins = weights.map((w) => Math.round((w / sum) * attempts));
  const drift = attempts - bins.reduce((a, b) => a + b, 0);
  bins[bins.indexOf(Math.max(...bins))] += drift;
  return bins;
}

function sessionResults(paper: PaperCode, base: PaperAnalytics) {
  return RELEASED_SESSIONS.map((id, i) => {
    const jitter = i === RELEASED_SESSIONS.length - 1 ? 0 : (hashOf(`${paper}:${id}`) % 5) - 2;
    const rate = clamp(base.passRate + SESSION_OFFSETS[i] + jitter, 20, 95);
    const sat = Math.max(6, Math.round(base.attempts / 7) + (hashOf(`${id}:${paper}`) % 9) - 4);
    return { id, label: examSessionById(id)?.label ?? id, sat, passed: Math.round((sat * rate) / 100), rate };
  });
}

export function FacultyAnalyticsPage({ initialPaper }: { initialPaper?: string }) {
  const f = useFaculty();
  return <AnalyticsView key={f.staffId} initialPaper={initialPaper} />;
}

function AnalyticsView({ initialPaper }: { initialPaper?: string }) {
  const { papers, cohorts, me } = useFaculty();
  const available = papers.filter((p) => analyticsForPaper(p));
  const [paper, setPaper] = useState<PaperCode>(
    available.find((p) => p === initialPaper) ?? available[0] ?? papers[0],
  );
  const [assessmentId, setAssessmentId] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [flagFilter, setFlagFilter] = useState("");
  const [sentForReview, setSentForReview] = useState<string[]>([]);

  const info = paperByCode(paper)!;
  const base = analyticsForPaper(paper);

  if (!base) {
    return (
      <div className="mx-auto max-w-[86rem] space-y-7">
        <PageHeader eyebrow="Assessment" title="Analytics" sub="View paper-level assessment analytics for the papers you teach." />
        <Card className="p-8 text-center text-[13px] text-ink-3">No assessment attempts recorded for {info.name} yet.</Card>
      </div>
    );
  }

  const tests = quizzesAndMocks.filter((q) => q.paper === paper && q.attempts > 0);
  const qm = assessmentId ? quizOrMockById(assessmentId) : undefined;
  const attempts = qm?.attempts ?? base.attempts;
  const avg = qm?.avgScore ?? base.avgScore;
  const distribution = qm ? spreadAround(avg, attempts, qm.id) : base.distribution;
  const total = distribution.reduce((a, b) => a + b, 0);
  const passing = distribution.slice(5).reduce((a, b) => a + b, 0);
  const passPct = total ? Math.round((passing / total) * 100) : 0;
  const allowedMins = qm?.durationMins ?? info.durationMins;
  const medianMins = qm ? Math.round(qm.durationMins * (0.78 + (hashOf(qm.id) % 15) / 100)) : base.medianTimeMins;
  const shift = avg - base.avgScore;

  const scopedIds = qm ? qm.blueprint.flatMap((b) => b.questionIds ?? []) : [];
  const questions: QuestionRow[] = bankQuestions
    .filter((q) => q.paper === paper && q.facilityIndex !== null && (scopedIds.length === 0 || scopedIds.includes(q.id)))
    .map((q) => {
      const discrimination = discriminationOf(q);
      const allowed = oneDp(q.marks * MINS_PER_MARK);
      return {
        ...q,
        discrimination,
        allowed,
        taken: oneDp(allowed * (0.82 + (hashOf(`${q.id}:time`) % 40) / 100)),
        flag: flagOf(q.facilityIndex ?? 0, discrimination),
      };
    });
  const visibleQuestions = questions.filter(
    (q) =>
      (!areaFilter || q.syllabusArea === areaFilter) &&
      (!typeFilter || q.type === typeFilter) &&
      (!flagFilter || (flagFilter === "review" ? q.flag !== "Performing well" : q.flag === "Performing well")),
  );
  const needsReview = questions.filter((q) => q.flag !== "Performing well").length;

  const paperCohorts = cohorts.filter((c) => c.papers.includes(paper) && (!qm || qm.cohortIds.includes(c.id)));
  const heatCols = [...paperCohorts.map((c) => ({ id: c.id, label: c.name.replace(`${paper} · `, ""), sub: `${c.size} learners` })), { id: "all", label: "All learners", sub: `${groupIndian(attempts)} attempts` }];
  const cohortScore = (area: string, cohortId: string) => {
    const areaAvg = base.byArea.find((a) => a.area === area)?.avg ?? base.avgScore;
    let v = areaAvg + shift + (hashOf(`${cohortId}:${area}`) % 11) - 5;
    const weak = cohortWeakTopics.find((w) => w.cohortId === cohortId && w.paper === paper)?.topics.filter((t) => t.area === area) ?? [];
    if (weak.length) v = (v + Math.min(...weak.map((t) => t.avgScore))) / 2;
    return clamp(Math.round(v), 20, 95);
  };
  // "All learners" is the size-weighted mean of the cohort cells, so the row always reads consistently.
  const areaScore = (area: string, colId: string) => {
    if (colId !== "all") return cohortScore(area, colId);
    const size = paperCohorts.reduce((n, c) => n + c.size, 0);
    if (!size) return clamp(Math.round((base.byArea.find((a) => a.area === area)?.avg ?? base.avgScore) + shift), 20, 95);
    return Math.round(paperCohorts.reduce((n, c) => n + c.size * cohortScore(area, c.id), 0) / size);
  };

  const sessions = sessionResults(paper, base);
  const pendingSession = examSessionById("es-2026-sep");
  const byType = (["OT", "number", "MTQ", "CR"] as BankQuestionType[])
    .map((type) => {
      const list = questions.filter((q) => q.type === type);
      if (!list.length) return null;
      const perMarkTaken = list.reduce((n, q) => n + q.taken, 0) / list.reduce((n, q) => n + q.marks, 0);
      const marks = Math.round(list.reduce((n, q) => n + q.marks, 0) / list.length);
      return { type, count: list.length, marks, allowed: oneDp(marks * MINS_PER_MARK), taken: oneDp(marks * perMarkTaken) };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const maxMins = Math.max(1, ...byType.flatMap((t) => [t.allowed, t.taken]));

  const columns: DataTableColumn<QuestionRow>[] = [
    { key: "id", header: "ID", mono: true, sortable: true },
    {
      key: "topic",
      header: "Question",
      wrap: true,
      sortable: true,
      className: "min-w-[16rem]",
      render: (q) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{q.topic}</span>
          <span className="line-clamp-2 block text-[12px] leading-snug text-ink-3">{q.stem}</span>
        </span>
      ),
    },
    { key: "syllabusArea", header: "Area", sortable: true, render: (q) => <span title={info.syllabusAreas.find((a) => a.code === q.syllabusArea)?.title} className="font-mono font-semibold">{q.syllabusArea}</span> },
    { key: "type", header: "Type", sortable: true, render: (q) => <span title={QUESTION_TYPE_LABELS[q.type]}>{TYPE_SHORT[q.type]}</span> },
    { key: "difficulty", header: "Difficulty", sortable: true, render: (q) => DIFFICULTY_LABELS[q.difficulty] },
    { key: "marks", header: "Marks", align: "right", mono: true, sortable: true },
    { key: "usedIn", header: "Used in", align: "right", mono: true, sortable: true, render: (q) => `${q.usedIn} tests` },
    {
      key: "facility",
      header: "Facility",
      sortable: true,
      sortValue: (q) => q.facilityIndex ?? 0,
      render: (q) => {
        const pct = Math.round((q.facilityIndex ?? 0) * 100);
        return (
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-surface-3">
              <span className={cn("block h-full rounded-full", pct < 40 ? "bg-rose" : pct > 85 ? "bg-amber" : "bg-jade")} style={{ width: `${pct}%` }} />
            </span>
            <span className="font-mono text-[12px] text-ink-2 tnum">{pct}%</span>
          </span>
        );
      },
    },
    {
      key: "discrimination",
      header: "Discrimination",
      align: "right",
      sortable: true,
      render: (q) => <span className={cn("font-mono tnum", q.discrimination < 0.2 ? "font-semibold text-amber" : "text-ink")}>{q.discrimination.toFixed(2)}</span>,
    },
    {
      key: "taken",
      header: "Time on question",
      align: "right",
      sortable: true,
      render: (q) => (
        <span className="font-mono text-[12px] tnum">
          <span className={cn("font-semibold", q.taken > q.allowed * 1.1 ? "text-rose" : "text-ink")}>{q.taken} min</span>
          <span className="text-ink-3"> / {q.allowed}</span>
        </span>
      ),
    },
    {
      key: "flag",
      header: "Review",
      sortable: true,
      render: (q) =>
        sentForReview.includes(q.id) ? (
          <StatusPill status="in review" tone="info" size="sm">
            Review requested
          </StatusPill>
        ) : (
          <StatusPill status={q.flag} tone={FLAG_TONE[q.flag]} size="sm" />
        ),
    },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      render: (q) =>
        q.flag !== "Performing well" && !sentForReview.includes(q.id) ? (
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setSentForReview((ids) => [...ids, q.id]);
              toast({ title: "Question sent for review", body: `${q.id} · ${q.topic} · ${q.flag.toLowerCase()} · added to Reviews and versions` });
            }}
          >
            <Send className="size-3.5" />
            Send for review
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Assessment"
        title="Analytics"
        sub="View paper-level assessment analytics: score distribution, pass rate by exam session, question facility and discrimination, syllabus-area performance and time on question."
        badge={<ScopeChip icon={<BarChart3 />}>{`${me.name} · assigned papers ${available.join(", ")}`}</ScopeChip>}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast({ title: `Report queued: ${paper.toLowerCase()}-${qm ? qm.id.replace("qm-", "") : "all-assessments"}-analytics.csv`, tone: "info" })}
            >
              <Download className="size-4" />
              Export analytics
            </Button>
            <LinkButton href="/faculty/cohorts">
              <Lightbulb className="size-4" />
              Recommend remedial learning
            </LinkButton>
          </>
        }
      />

      <section className="space-y-4">
        <SectionTitle>View paper-level assessment analytics</SectionTitle>
        <Tabs
          value={paper}
          onChange={(id) => {
            setPaper(id as PaperCode);
            setAssessmentId("");
            setAreaFilter("");
            setTypeFilter("");
            setFlagFilter("");
          }}
          items={available.map((p) => ({ id: p, label: `${p} · ${paperByCode(p)?.name}` }))}
        />
        <Card className="flex min-w-0 flex-wrap items-center gap-4 p-4.5">
          <PaperMark code={paper} />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-bold text-ink">{info.name}</p>
            <p className="text-[12.5px] text-ink-3">
              {info.levelLabel} · {info.examFormat === "session" ? "Session CBE" : "On-demand CBE"} · {info.durationLabel} · pass mark {info.passMark}%
            </p>
          </div>
          <FilterBar active={Boolean(assessmentId)} onClear={() => setAssessmentId("")}>
            <FilterSelect
              label="Assessment"
              allLabel="All mocks and tests"
              value={assessmentId}
              onChange={(v) => {
                setAssessmentId(v);
                setAreaFilter("");
              }}
              options={tests.map((t) => ({ value: t.id, label: `${t.title} · ${t.attempts} attempts` }))}
              disabled={tests.length === 0}
            />
          </FilterBar>
        </Card>
      </section>

      <KpiRow cols={4}>
        <KpiTile hero label="Attempts" value={groupIndian(attempts)} icon={<UsersRound />} sub={qm ? qm.title : "All mocks and tests this year"} />
        <KpiTile label="Average score" value={`${avg}%`} tone={scoreTone(avg)} icon={<Target />} sub={`Pass mark ${info.passMark}%`} />
        <KpiTile label="Scored 50% or more" value={`${passPct}%`} tone={scoreTone(passPct)} sub={`${groupIndian(passing)} of ${groupIndian(total)} attempts`} />
        <KpiTile label="Median time" value={`${medianMins} min`} icon={<Clock />} sub={`of ${allowedMins} min allowed`} />
      </KpiRow>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title="Score distribution" sub={`${qm ? qm.title : "All mocks and tests"} · attempts in 10-mark bands`} />
          <div className="border-t border-line px-5 pt-8 pb-5">
            <BarChart data={distribution} labels={BIN_LABELS} tone="cta-strong" height={170} />
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px]">
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold", toneSoft.rose)}>
                Below 50: {groupIndian(total - passing)} ({100 - passPct}%)
              </span>
              <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-semibold", toneSoft.jade)}>
                50 and above: {groupIndian(passing)} ({passPct}%)
              </span>
            </div>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Pass rate by session" sub={`ACCA ${paper} exam results for ZSkillup learners in each exam session`} />
          <div className="border-t border-line px-5 pt-8 pb-4">
            <BarChart data={sessions.map((s) => s.rate)} labels={sessions.map((s) => s.label)} tone="brand" height={120} />
          </div>
          <div className="overflow-x-auto border-t border-line">
            <table className="w-full min-w-[26rem] text-[13px]">
              <caption className="sr-only">Pass rate by exam session</caption>
              <thead>
                <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                  <th scope="col" className="px-5 py-2">Exam session</th>
                  <th scope="col" className="px-3 py-2 text-right">Sat</th>
                  <th scope="col" className="px-3 py-2 text-right">Passed</th>
                  <th scope="col" className="px-5 py-2 text-right">Pass rate</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-t border-line">
                    <th scope="row" className="px-5 py-2 text-left font-semibold text-ink">
                      {s.label}
                    </th>
                    <td className="px-3 py-2 text-right font-mono text-ink-2 tnum">{s.sat}</td>
                    <td className="px-3 py-2 text-right font-mono text-ink-2 tnum">{s.passed}</td>
                    <td className={cn("px-5 py-2 text-right font-mono font-semibold tnum", s.rate >= 50 ? "text-jade" : "text-rose")}>{s.rate}%</td>
                  </tr>
                ))}
                {pendingSession ? (
                  <tr className="border-t border-line">
                    <th scope="row" className="px-5 py-2 text-left font-semibold text-ink">
                      {pendingSession.label}
                    </th>
                    <td colSpan={3} className="px-5 py-2 text-right">
                      <StatusPill status="results pending" size="sm">
                        Results due 12 Oct 2026
                      </StatusPill>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle>Question facility and discrimination</SectionTitle>
        <DataTable
          caption={`${paper} question facility and discrimination`}
          rows={visibleQuestions}
          columns={columns}
          getRowId={(q) => q.id}
          initialSort={{ key: "facility", dir: "asc" }}
          search={{ placeholder: "Search questions", match: (q, s) => q.topic.toLowerCase().includes(s) || q.id.includes(s) || q.stem.toLowerCase().includes(s) }}
          filters={
            <FilterBar
              active={Boolean(areaFilter || typeFilter || flagFilter)}
              onClear={() => {
                setAreaFilter("");
                setTypeFilter("");
                setFlagFilter("");
              }}
            >
              <FilterSelect
                label="Area"
                allLabel="All areas"
                value={areaFilter}
                onChange={setAreaFilter}
                options={info.syllabusAreas.map((a) => ({ value: a.code, label: `${a.code} · ${a.title}` }))}
              />
              <FilterSelect
                label="Type"
                allLabel="All types"
                value={typeFilter}
                onChange={setTypeFilter}
                options={(Object.keys(QUESTION_TYPE_LABELS) as BankQuestionType[]).map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
              />
              <FilterSelect
                label="Review"
                allLabel="Any"
                value={flagFilter}
                onChange={setFlagFilter}
                options={[
                  { value: "review", label: `Needs review (${needsReview})` },
                  { value: "ok", label: "Performing well" },
                ]}
              />
            </FilterBar>
          }
          toolbar={<span className="text-[12px] text-ink-3">Facility: share answering correctly · Discrimination: how well it separates strong and weak learners</span>}
          empty={<p className="text-center text-[13px] text-ink-3">No published questions with attempts in this scope.</p>}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Syllabus-area heat"
            sub="Average score by syllabus area and cohort. Select a score to filter the question table to that area."
          />
          <div className="border-t border-line p-4">
            <Matrix
              dense
              caption={`${paper} average score by syllabus area and cohort`}
              corner="Syllabus area"
              rows={info.syllabusAreas.map((a) => ({ id: a.code, label: `${a.code} · ${a.title}` }))}
              cols={heatCols}
              cell={(area, col) => {
                const v = areaScore(area, col);
                const on = areaFilter === area;
                return (
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={`Area ${area}, ${col === "all" ? "all learners" : heatCols.find((c) => c.id === col)?.label}: ${v}%. Filter questions to area ${area}.`}
                    onClick={() => setAreaFilter(on ? "" : area)}
                    className={cn(
                      "inline-flex min-w-12 justify-center rounded-[8px] border px-2 py-1 font-mono text-[12.5px] font-semibold tnum transition-shadow",
                      toneSoft[scoreTone(v)],
                      on && "shadow-[0_0_0_2px_var(--cta)]",
                    )}
                  >
                    {v}
                  </button>
                );
              }}
            />
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-ink-2">
              {(
                [
                  ["jade", "70 and above"],
                  ["amber", "50 to 69"],
                  ["rose", "Below 50"],
                ] as const
              ).map(([tone, label]) => (
                <li key={tone} className="inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn("size-2.5 rounded-[3px] border", toneSoft[tone])} />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Time on question" sub={`Average minutes taken against ${MINS_PER_MARK} minutes a mark`} />
          <ul className="space-y-4 border-t border-line px-5 py-4">
            {byType.map((t) => {
              const over = t.taken > t.allowed * 1.1;
              return (
                <li key={t.type} className="min-w-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <p className="text-[13px] font-semibold text-ink">
                      {QUESTION_TYPE_LABELS[t.type]}
                      <span className="font-normal text-ink-3">
                        {" "}
                        · {t.count} {t.count === 1 ? "question" : "questions"} · {t.marks} marks
                      </span>
                    </p>
                    <p className={cn("font-mono text-[12.5px] tnum", over ? "font-semibold text-rose" : "text-ink-2")}>
                      {t.taken} of {t.allowed} min
                    </p>
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-line-strong" style={{ width: `${(t.allowed / maxMins) * 100}%` }} />
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className={cn("h-full rounded-full", over ? "bg-rose" : "bg-cta-strong")} style={{ width: `${(t.taken / maxMins) * 100}%` }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-line px-5 py-3 text-[12px] text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-3.5 rounded-full bg-line-strong" />
              Time allowed
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-3.5 rounded-full bg-cta-strong" />
              Time taken
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-3.5 rounded-full bg-rose" />
              Over by more than 10%
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}
