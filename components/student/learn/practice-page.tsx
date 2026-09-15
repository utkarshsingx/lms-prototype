"use client";

import { useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Library, Play, Plus, Target } from "lucide-react";
import { assessmentById } from "@/lib/data";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  bankQuestions,
  formatAccaDate,
  paperByCode,
  paperName,
  quizzesAndMocks,
  syllabusAreaTitle,
  type BankQuestion,
  type BankQuestionType,
  type Difficulty,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Tabs } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Select, Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { PaperCodeChip, SectionLabel, useStudentRecord } from "./bits";
import { ACCA_TODAY } from "@/lib/data/acca";
import { clamp, paperEntries, plural, readinessPapers, weakAreasFor } from "./derive";
import { PracticeRunner, type PracticeResult } from "./practice-runner";

type PracticeTest = {
  id: string;
  name: string;
  paper: PaperCode;
  kind: "Faculty quiz" | "Progress test" | "Topic test" | "Custom test";
  areas: string[];
  questions: number;
  minutes: number | null;
  best: number | null;
  attempts: number;
  attemptsAllowed: number | null;
  closes?: string;
  closed?: boolean;
  assessmentId?: string;
};

/* Standing on the faculty-set quizzes, per student (matches the dashboard tabs). */
const QUIZ_HISTORY: Record<string, { best: number; attempts: number }> = {
  "s-anaya:qm-fr-groups": { best: 56, attempts: 1 },
  "s-anaya:qm-pm-budgeting": { best: 94, attempts: 1 },
  "s-anaya:qm-fr-progress-2": { best: 60, attempts: 1 },
  "s-rohan:qm-lw-contract": { best: 62, attempts: 1 },
};

const published = bankQuestions.filter((q) => q.status === "published");

function seedTests(s: Student): PracticeTest[] {
  const faculty = quizzesAndMocks
    .filter((q) => (q.kind === "quiz" || q.kind === "progress-test") && q.cohortIds.some((c) => s.cohortIds.includes(c)))
    .map<PracticeTest>((q) => {
      const assessment = q.assessmentId ? assessmentById(q.assessmentId) : undefined;
      const fromFormat = Number(q.blueprint[0]?.format.match(/\d+/)?.[0]);
      const h = QUIZ_HISTORY[`${s.id}:${q.id}`];
      return {
        id: q.id,
        name: q.title,
        paper: q.paper,
        kind: q.kind === "quiz" ? "Faculty quiz" : "Progress test",
        areas: q.blueprint.flatMap((b) => b.areas),
        questions: assessment?.questions.length ?? (fromFormat || Math.round(q.totalMarks / 2)),
        minutes: q.durationMins,
        best: h?.best ?? null,
        attempts: h?.attempts ?? 0,
        attemptsAllowed: assessment?.attempts ?? 1,
        closes: q.closesOn,
        closed: q.status === "closed" || q.closesOn < ACCA_TODAY,
        assessmentId: q.assessmentId,
      };
    });
  const weak = weakAreasFor(s);
  const topic = readinessPapers(s).flatMap((code, pi) =>
    (paperByCode(code)?.syllabusAreas ?? [])
      .map((a, i) => ({ a, i, count: published.filter((q) => q.paper === code && q.syllabusArea === a.code).length }))
      .filter((x) => x.count > 0)
      .map<PracticeTest>(({ a, i, count }) => {
        const attempts = (i + pi) % 3;
        const w = weak.find((x) => x.paper === code && x.area === a.code);
        const base = s.readiness.byPaper[code] ?? s.readiness.overall;
        return {
          id: `topic-${code}-${a.code}`,
          name: `Area ${a.code} topic test: ${a.title}`,
          paper: code,
          kind: "Topic test",
          areas: [a.code],
          questions: count,
          minutes: count * 3,
          best: attempts ? (w ? w.score : clamp(base + ((i * 7) % 15) - 4)) : null,
          attempts,
          attemptsAllowed: null,
        };
      }),
  );
  return [...faculty, ...topic];
}

export function PracticePage({ initialPaper, initialArea }: { initialPaper?: string; initialArea?: string }) {
  const s = useStudentRecord();
  return <Practice key={s.id} s={s} initialPaper={initialPaper} initialArea={initialArea} />;
}

function Practice({ s, initialPaper, initialArea }: { s: Student; initialPaper?: string; initialArea?: string }) {
  const bankPapers = useMemo(
    () =>
      paperEntries(s)
        .filter((e) => e.code !== "EPSM" && e.status !== "exempt" && (e.group === "now" || e.group === "done" || (e.group === "next" && Boolean(s.papers[e.code as PaperCode].plannedSessionId))))
        .map((e) => e.code as PaperCode)
        .filter((c) => published.some((q) => q.paper === c)),
    [s],
  );
  const firstPaper = (bankPapers.find((c) => c === initialPaper?.toUpperCase()) ?? (s.currentPaper && bankPapers.includes(s.currentPaper) ? s.currentPaper : bankPapers[0])) as PaperCode;

  const [tab, setTab] = useState("bank");
  const [paper, setPaper] = useState<string>(firstPaper);
  const [area, setArea] = useState(initialArea?.toUpperCase() ?? "");
  const [difficulty, setDifficulty] = useState("");
  const [qType, setQType] = useState("");

  const [tests, setTests] = useState<PracticeTest[]>(() => seedTests(s));
  const [session, setSession] = useState<{ key: number; title: string; questions: BankQuestion[]; minutes: number | null; testId?: string } | null>(null);
  const [runs, setRuns] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      published
        .filter((q) => readinessPapers(s).includes(q.paper))
        .filter((_, i) => i % 2 === 0)
        .map((q, i) => [q.id, (q.facilityIndex ?? 0.5) >= 0.55 || i % 3 === 0]),
    ),
  );

  const [creating, setCreating] = useState(false);
  const [draftPaper, setDraftPaper] = useState<string>(firstPaper);
  const [timed, setTimed] = useState(true);

  const pool = published.filter((q) => q.paper === paper);
  const filtered = pool.filter(
    (q) => (!area || q.syllabusArea === area) && (!difficulty || q.difficulty === difficulty) && (!qType || q.type === qType),
  );
  const setSize = Math.min(10, filtered.length);
  const mine = published.filter((q) => bankPapers.includes(q.paper));
  const attempted = mine.filter((q) => q.id in verdicts);
  const accuracy = attempted.length ? Math.round((attempted.filter((q) => verdicts[q.id]).length / attempted.length) * 100) : 0;

  const countBy = <K extends string>(list: BankQuestion[], key: (q: BankQuestion) => K) =>
    list.reduce<Record<string, number>>((acc, q) => ((acc[key(q)] = (acc[key(q)] ?? 0) + 1), acc), {});
  const byType = countBy(filtered, (q) => q.type);
  const byDifficulty = countBy(filtered, (q) => q.difficulty);

  const start = (title: string, questions: BankQuestion[], minutes: number | null, testId?: string) => {
    if (!questions.length) {
      toast({ title: "No questions match", body: "Widen the filters to build a set.", tone: "warning" });
      return;
    }
    setRuns((n) => n + 1);
    setSession({ key: runs + 1, title, questions, minutes, testId });
  };

  const complete = (r: PracticeResult) => {
    const pct = Math.round((r.correct / r.total) * 100);
    setVerdicts((v) => ({ ...v, ...r.verdicts }));
    if (session?.testId) {
      setTests((list) =>
        list.map((t) => (t.id === session.testId ? { ...t, attempts: t.attempts + 1, best: Math.max(t.best ?? 0, pct) } : t)),
      );
    }
    toast({
      title: `Practice set complete: ${r.correct} of ${r.total} correct`,
      body: `${pct}% · your practice coverage and readiness score update overnight`,
      tone: pct >= 50 ? "success" : "warning",
    });
    setSession(null);
  };

  const areaOptions = (paperByCode(paper)?.syllabusAreas ?? []).map((a) => ({
    value: a.code,
    label: `${a.code} · ${a.title} (${pool.filter((q) => q.syllabusArea === a.code).length})`,
  }));

  const columns: DataTableColumn<BankQuestion>[] = [
    { key: "id", header: "ID", mono: true, sortable: true, className: "text-ink-3" },
    {
      key: "topic",
      header: "Question",
      sortable: true,
      wrap: true,
      render: (q) => (
        <span className="block min-w-[16rem] max-w-[34rem]">
          <span className="block font-semibold text-ink">{q.topic}</span>
          <span className="line-clamp-2 block text-[12.5px] text-ink-3">{q.stem}</span>
        </span>
      ),
    },
    { key: "syllabusArea", header: "Area", sortable: true, render: (q) => <span title={syllabusAreaTitle(q.paper, q.syllabusArea)} className="font-mono font-semibold">{q.syllabusArea}</span> },
    { key: "type", header: "Type", sortable: true, render: (q) => QUESTION_TYPE_LABELS[q.type] },
    { key: "difficulty", header: "Difficulty", sortable: true, render: (q) => DIFFICULTY_LABELS[q.difficulty] },
    { key: "marks", header: "Marks", align: "right", mono: true, sortable: true },
    {
      key: "you",
      header: "Your last try",
      sortable: true,
      sortValue: (q) => (q.id in verdicts ? (verdicts[q.id] ? 2 : 1) : 0),
      render: (q) =>
        q.id in verdicts ? (
          <StatusPill status={verdicts[q.id] ? "Correct" : "Incorrect"} tone={verdicts[q.id] ? "jade" : "rose"} size="sm" />
        ) : (
          <StatusPill status="Not attempted" size="sm" />
        ),
    },
    {
      key: "go",
      header: <span className="sr-only">Practise</span>,
      align: "right",
      render: (q) => (
        <Button size="xs" variant="outline" onClick={() => start(`${q.paper} · ${q.topic}`, [q], null)}>
          Practise
        </Button>
      ),
    },
  ];

  const testColumns: DataTableColumn<PracticeTest>[] = [
    {
      key: "name",
      header: "Practice test",
      sortable: true,
      render: (t) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <PaperCodeChip code={t.paper} />
          <span className="min-w-0">
            <span className="block max-w-[22rem] truncate font-semibold text-ink">{t.name}</span>
            <span className="block text-[12px] text-ink-3">
              {t.kind} · {plural(t.questions, "question")} · {t.minutes ? `${t.minutes} min` : "untimed"}
              {t.closes ? ` · ${t.closed ? "closed" : "closes"} ${formatAccaDate(t.closes)}` : ""}
            </span>
          </span>
        </span>
      ),
    },
    { key: "paper", header: "Paper", sortable: true, render: (t) => paperName(t.paper) },
    {
      key: "best",
      header: "Best score",
      sortable: true,
      sortValue: (t) => t.best ?? -1,
      render: (t) => (t.best != null ? <ScoreBar value={t.best} marker={50} className="w-32" height={6} /> : <span className="text-ink-3">Not attempted</span>),
    },
    {
      key: "attempts",
      header: "Attempts",
      align: "right",
      mono: true,
      sortable: true,
      render: (t) => (t.attemptsAllowed ? `${t.attempts} of ${t.attemptsAllowed}` : t.attempts),
    },
    {
      key: "action",
      header: <span className="sr-only">Start</span>,
      align: "right",
      render: (t) =>
        t.closed ? (
          <StatusPill status="Closed" tone="neutral" size="sm" />
        ) : t.assessmentId ? (
          <LinkButton size="xs" href={`/assessments/${t.assessmentId}`}>
            <ExternalLink className="size-3" />
            {t.attempts ? "Retake in runner" : "Start in runner"}
          </LinkButton>
        ) : (
          <Button
            size="xs"
            onClick={() =>
              start(
                t.name,
                published.filter((q) => q.paper === t.paper && (!t.areas.length || t.areas.includes(q.syllabusArea))).slice(0, t.questions),
                t.minutes,
                t.id,
              )
            }
          >
            <Play className="size-3 fill-current" />
            {t.attempts ? "Retake" : "Start"}
          </Button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="Practice"
        sub="Question bank and practice tests for your papers, tagged by syllabus area, difficulty and ACCA question type."
        actions={
          <>
            <Button variant="secondary" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              Create custom test
            </Button>
            <Button
              onClick={() =>
                start(
                  `${paper} practice set${area ? ` · area ${area}` : ""}`,
                  filtered.slice(0, 10),
                  null,
                )
              }
            >
              <Target className="size-4" />
              Start {setSize}-question set
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Questions for your papers" value={mine.length} sub={`${plural(bankPapers.length, "paper")} · ${bankPapers.join(", ")}`} />
        <KpiTile label="Attempted" value={attempted.length} sub={`${mine.length - attempted.length} still to try`} tone="info" icon={<ClipboardList />} />
        <KpiTile label="Accuracy" value={`${accuracy}%`} sub="Across attempted questions" tone={accuracy >= 60 ? "jade" : "amber"} />
        <KpiTile label="Practice tests" value={tests.length} sub={`${tests.filter((t) => t.best != null).length} attempted`} tone="violet" icon={<Library />} />
      </KpiRow>

      <Card className="min-w-0 overflow-hidden">
        <div className="px-5 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "bank", label: "Question bank", count: pool.length },
              { id: "tests", label: "Practice tests", count: tests.length },
            ]}
          />
        </div>

        {tab === "bank" ? (
          <div className="space-y-4 p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <FilterBar
                active={Boolean(area || difficulty || qType)}
                onClear={() => {
                  setArea("");
                  setDifficulty("");
                  setQType("");
                }}
              >
                <FilterSelect
                  label="Paper"
                  value={paper}
                  onChange={(v) => {
                    setPaper(v);
                    setArea("");
                  }}
                  options={bankPapers.map((c) => ({ value: c, label: `${c} · ${paperName(c)}` }))}
                />
                <FilterSelect label="Syllabus area" value={area} onChange={setArea} allLabel="All areas" options={areaOptions} />
                <FilterSelect
                  label="Difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                  allLabel="Any"
                  options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
                />
                <FilterSelect
                  label="Question type"
                  value={qType}
                  onChange={setQType}
                  allLabel="All types"
                  options={(Object.keys(QUESTION_TYPE_LABELS) as BankQuestionType[]).map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
                />
              </FilterBar>
              <Button className="shrink-0" onClick={() => start(`${paper} practice set${area ? ` · area ${area}` : ""}`, filtered.slice(0, 10), null)}>
                <Play className="size-4 fill-current" />
                Start {setSize}-question set
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[14px] border border-line bg-surface-2 p-3.5">
                <SectionLabel>By question type</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(QUESTION_TYPE_LABELS) as BankQuestionType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setQType(qType === t ? "" : t)}
                      className={
                        qType === t
                          ? "rounded-full border border-cta bg-cta px-2.5 py-1 text-[12px] font-semibold text-cta-ink"
                          : "rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-cta-soft"
                      }
                    >
                      {QUESTION_TYPE_LABELS[t]} <span className="tnum">{byType[t] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="rounded-[14px] border border-line bg-surface-2 p-3.5">
                <SectionLabel>By difficulty</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDifficulty(difficulty === d ? "" : d)}
                      className={
                        difficulty === d
                          ? "rounded-full border border-cta bg-cta px-2.5 py-1 text-[12px] font-semibold text-cta-ink"
                          : "rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-semibold text-ink-2 hover:bg-cta-soft"
                      }
                    >
                      {DIFFICULTY_LABELS[d]} <span className="tnum">{byDifficulty[d] ?? 0}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <DataTable
              bare
              dense
              caption="Question bank"
              rows={filtered}
              columns={columns}
              getRowId={(q) => q.id}
              pageSize={8}
              search={{ placeholder: "Search topics and question text", match: (q, text) => q.topic.toLowerCase().includes(text) || q.stem.toLowerCase().includes(text) }}
              empty={<EmptyState title="No questions match these filters" sub="Clear a filter or choose another syllabus area." />}
            />
          </div>
        ) : (
          <div className="p-5">
            <DataTable
              bare
              caption="Practice tests"
              rows={tests}
              columns={testColumns}
              getRowId={(t) => t.id}
              pageSize={10}
              search={{ placeholder: "Search practice tests", match: (t, text) => t.name.toLowerCase().includes(text) }}
              toolbar={
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="size-4" />
                  Create custom test
                </Button>
              }
            />
          </div>
        )}
      </Card>

      {session ? (
        <PracticeRunner
          key={session.key}
          open
          title={session.title}
          questions={session.questions}
          minutes={session.minutes}
          onClose={() => setSession(null)}
          onComplete={complete}
        />
      ) : null}

      <FormDrawer
        open={creating}
        onClose={() => setCreating(false)}
        title="Create custom test"
        sub="Build a practice test from the question bank for any of your papers."
        submitLabel="Create test"
        onSubmit={(data) => {
          const code = String(data.get("paper")) as PaperCode;
          const areas = data.getAll("areas").map(String);
          const wanted = Number(data.get("count") ?? 10);
          const available = published.filter((q) => q.paper === code && (!areas.length || areas.includes(q.syllabusArea))).length;
          if (!available) {
            toast({ title: "No questions in those areas yet", body: "Choose another syllabus area.", tone: "warning" });
            return;
          }
          const n = Math.min(wanted, available);
          const minutes = timed ? Number(data.get("minutes") ?? n * 3) : null;
          const test: PracticeTest = {
            id: `custom-${tests.length + 1}`,
            name: `Custom test · ${code}${areas.length ? ` · areas ${areas.join(", ")}` : " · all areas"}`,
            paper: code,
            kind: "Custom test",
            areas,
            questions: n,
            minutes,
            best: null,
            attempts: 0,
            attemptsAllowed: null,
          };
          setTests((list) => [test, ...list]);
          setTab("tests");
          setCreating(false);
          toast({
            title: "Custom test created",
            body: `${plural(n, "question")}${wanted > n ? ` (${available} available)` : ""} · ${minutes ? `${minutes} minutes` : "untimed"}`,
          });
        }}
      >
        <Field label="Paper">
          <Select name="paper" value={draftPaper} onChange={(e) => setDraftPaper(e.target.value)}>
            {bankPapers.map((c) => (
              <option key={c} value={c}>
                {c} · {paperName(c)}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Syllabus areas (leave empty for all)</legend>
          <div className="grid gap-2 sm:grid-cols-2" key={draftPaper}>
            {(paperByCode(draftPaper)?.syllabusAreas ?? []).map((a) => {
              const n = published.filter((q) => q.paper === draftPaper && q.syllabusArea === a.code).length;
              return <Checkbox key={a.code} name="areas" value={a.code} disabled={!n} label={`${a.code} · ${a.title} (${n})`} />;
            })}
          </div>
        </fieldset>
        <Field label="Number of questions">
          <Select name="count" defaultValue="10">
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n} questions
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded-[14px] border border-line p-3.5">
          <Switch checked={timed} onChange={setTimed} label="Timed test" sub="Counts down like the CBE. Untimed tests let you check each answer as you go." />
          {timed ? (
            <Field label="Time limit" className="mt-3">
              <Select name="minutes" defaultValue="30">
                {[15, 20, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m} minutes
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
        </div>
      </FormDrawer>
    </div>
  );
}
