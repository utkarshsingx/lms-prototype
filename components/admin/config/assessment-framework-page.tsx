"use client";

import { useState } from "react";
import { ClipboardCheck, Download, Gauge, Plus, Scale, ShieldCheck, UploadCloud } from "lucide-react";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  accaPapers,
  addDays,
  bankQuestions,
  evaluationRubrics,
  formatAccaDate,
  paperName,
  quizzesAndMocks,
  reEvaluationRequests,
  staffName,
  studentName,
  type AccaPaper,
  type BankQuestionType,
  type Difficulty,
  type PaperCode,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Matrix } from "@/components/ui/matrix";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { AdminConfigFrame, BlockHeading, MiniLabel, WithHint, queueExport } from "./shared";

/* ------------------------------------------------------------ types and seeds */

type Weights = { mocks: number; practice: number; attendance: number; syllabus: number };

const WEIGHT_LABELS: { key: keyof Weights; label: string; sub: string }[] = [
  { key: "mocks", label: "Mock exam performance", sub: "Average of the last two proctored mocks for the paper" },
  { key: "practice", label: "Practice coverage", sub: "Share of syllabus areas practised at 60% or above" },
  { key: "attendance", label: "Attendance", sub: "Live classes attended in the paper's cohort" },
  { key: "syllabus", label: "Syllabus completion", sub: "Lessons completed in the paper" },
];

const EXAMPLES: { id: string; label: string; values: Weights }[] = [
  { id: "anaya-fr", label: "Anaya Rao · FR (graduate)", values: { mocks: 55, practice: 66, attendance: 88, syllabus: 62 } },
  { id: "rohan-fa", label: "Rohan Iyer · FA (Brightwater)", values: { mocks: 70, practice: 64, attendance: 92, syllabus: 72 } },
  { id: "low-pm", label: "Sample at-risk learner · PM", values: { mocks: 38, practice: 40, attendance: 61, syllabus: 45 } },
];

const DIFFICULTY_DEFINITIONS: Record<Difficulty, string> = {
  foundation: "Recall and single-step application. Used early in a module and in diagnostics.",
  intermediate: "Multi-step application of one syllabus area. Most practice sets and quizzes.",
  "exam-standard": "Written and timed to the ACCA exam. Used in mocks and Section C practice.",
};

const DIFFICULTIES = Object.keys(DIFFICULTY_LABELS) as Difficulty[];
const TYPES = Object.keys(QUESTION_TYPE_LABELS) as BankQuestionType[];
const BANK_PAPERS = Array.from(new Set(bankQuestions.map((q) => q.paper)));

type MockRow = (typeof quizzesAndMocks)[number];

/* ------------------------------------------------------------ page */

export function AssessmentFrameworkPage() {
  const [tab, setTab] = useState("pass");
  const [version, setVersion] = useState(2.2);
  const [defaults, setDefaults] = useState({ mock: 50, quiz: 50, target: 70 });
  const [weights, setWeights] = useState<Weights>({ mocks: 40, practice: 25, attendance: 15, syllabus: 20 });
  const [slaDays, setSlaDays] = useState(10);

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Academic framework"
        title="Assessment framework"
        sub="Manage assessment framework: pass marks, mock rules, question taxonomy, constructed-response marking and moderation, and the readiness score formula every paper uses."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("assessment-framework-policy.csv")}>
              <Download className="size-4" />
              Export policy
            </Button>
            <Button
              onClick={() => {
                const next = Math.round((version + 0.1) * 10) / 10;
                setVersion(next);
                toast({ title: `Assessment framework v${next.toFixed(1)} published`, body: "Faculty see the new rules in Quizzes and mocks and Evaluation." });
              }}
            >
              <UploadCloud className="size-4" />
              Publish framework
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Framework version" value={`v${version.toFixed(1)}`} sub="Applies to all papers" icon={<ClipboardCheck />} />
        <KpiTile label="ACCA pass mark" value="50%" sub={`Exam entry target: readiness ${defaults.target}`} tone="jade" icon={<Scale />} />
        <KpiTile
          label="Mocks scheduled"
          value={quizzesAndMocks.filter((q) => q.kind === "mock" && q.status === "scheduled").length}
          sub="Dec 2026 session"
          tone="info"
          icon={<ShieldCheck />}
        />
        <KpiTile label="Re-evaluation SLA" value={`${slaDays} days`} sub={`${reEvaluationRequests.filter((r) => r.status === "open" || r.status === "under-review").length} requests open`} tone="amber" icon={<Gauge />} />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "pass", label: "Pass marks" },
          { id: "mocks", label: "Mock rules" },
          { id: "taxonomy", label: "Question taxonomy" },
          { id: "marking", label: "Marking and moderation" },
          { id: "readiness", label: "Readiness score formula" },
        ]}
      />

      {tab === "pass" ? <PassMarks defaults={defaults} setDefaults={setDefaults} /> : null}
      {tab === "mocks" ? <MockRules /> : null}
      {tab === "taxonomy" ? <Taxonomy /> : null}
      {tab === "marking" ? <Marking slaDays={slaDays} setSlaDays={setSlaDays} /> : null}
      {tab === "readiness" ? <ReadinessFormula weights={weights} setWeights={setWeights} target={defaults.target} /> : null}
    </AdminConfigFrame>
  );
}

/* ------------------------------------------------------------ pass marks */

function NumberField({
  label,
  value,
  onChange,
  hint,
  suffix = "%",
  min = 0,
  max = 100,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Math.max(min, Math.min(max, Number(e.target.value) || 0)))}
          className="font-mono"
        />
        <span className="shrink-0 text-[13px] text-ink-3">{suffix}</span>
      </div>
    </Field>
  );
}

function PassMarks({
  defaults,
  setDefaults,
}: {
  defaults: { mock: number; quiz: number; target: number };
  setDefaults: React.Dispatch<React.SetStateAction<{ mock: number; quiz: number; target: number }>>;
}) {
  const [overrides, setOverrides] = useState<Record<string, { mock?: number; target?: number }>>({
    SBR: { target: 75 },
    SBL: { target: 75 },
  });

  const setOverride = (code: PaperCode, key: "mock" | "target", v: number) =>
    setOverrides((o) => ({ ...o, [code]: { ...o[code], [key]: v } }));

  const overridden = Object.entries(overrides).filter(
    ([, o]) => (o.mock !== undefined && o.mock !== defaults.mock) || (o.target !== undefined && o.target !== defaults.target),
  ).length;

  const columns: DataTableColumn<AccaPaper>[] = [
    {
      key: "code",
      header: "Paper",
      render: (p) => (
        <span className="flex min-w-48 items-center gap-2">
          <span className="font-mono font-semibold text-ink">{p.code}</span>
          <span className="truncate text-ink-2">{p.name}</span>
        </span>
      ),
    },
    { key: "levelLabel", header: "Level", className: "text-ink-2" },
    { key: "passMark", header: "ACCA exam", render: () => <Badge tone="jade">50% · set by ACCA</Badge> },
    {
      key: "mock",
      header: "Mock pass mark",
      render: (p) => (
        <Input
          aria-label={`${p.code} mock pass mark`}
          type="number"
          min={0}
          max={100}
          value={overrides[p.code]?.mock ?? defaults.mock}
          onChange={(e) => setOverride(p.code, "mock", Number(e.target.value) || 0)}
          className="h-9 w-20 font-mono"
        />
      ),
    },
    {
      key: "target",
      header: "Exam entry readiness",
      render: (p) => (
        <Input
          aria-label={`${p.code} exam entry readiness target`}
          type="number"
          min={0}
          max={100}
          value={overrides[p.code]?.target ?? defaults.target}
          onChange={(e) => setOverride(p.code, "target", Number(e.target.value) || 0)}
          className="h-9 w-20 font-mono"
        />
      ),
    },
    {
      key: "override",
      header: "Setting",
      render: (p) => {
        const o = overrides[p.code];
        const custom = o && ((o.mock !== undefined && o.mock !== defaults.mock) || (o.target !== undefined && o.target !== defaults.target));
        return custom ? <Badge tone="cta">Paper override</Badge> : <span className="text-ink-3">Default</span>;
      },
    },
  ];

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Pass marks"
        sub="ACCA sets 50% for every exam. Internal mocks, quizzes and the readiness target for exam entry can be set here, with paper overrides."
        action={
          <Button onClick={() => toast({ title: "Pass marks saved", body: `Mocks ${defaults.mock}% · quizzes ${defaults.quiz}% · entry target ${defaults.target} · ${overridden} paper overrides` })}>
            Save pass marks
          </Button>
        }
      />
      <Card className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="ACCA exams" hint="Locked">
          <Input value="50%" disabled readOnly />
        </Field>
        <NumberField label="Mock exams" value={defaults.mock} onChange={(v) => setDefaults((d) => ({ ...d, mock: v }))} />
        <NumberField label="Quizzes and progress tests" value={defaults.quiz} onChange={(v) => setDefaults((d) => ({ ...d, quiz: v }))} />
        <NumberField
          label="Readiness target for exam entry"
          value={defaults.target}
          suffix="score"
          onChange={(v) => setDefaults((d) => ({ ...d, target: v }))}
        />
      </Card>
      <DataTable caption="Pass marks by paper" rows={accaPapers} columns={columns} getRowId={(p) => p.code} pageSize={15} dense />
    </section>
  );
}

/* ------------------------------------------------------------ mock rules */

function MockRules() {
  const [rules, setRules] = useState({
    attempts: "1",
    window: "48",
    earliest: "6",
    lateJoin: "30",
    release: "objective-first",
    retakeReview: true,
  });
  const [proctoring, setProctoring] = useState({ webcam: true, screen: true, fullscreen: true, idCheck: true, deviceCheck: true });
  const [tabSwitches, setTabSwitches] = useState("2");
  const [mocks, setMocks] = useState<MockRow[]>(() => quizzesAndMocks.filter((q) => q.kind === "mock"));

  const PROCTOR: { key: keyof typeof proctoring; label: string; sub: string }[] = [
    { key: "webcam", label: "Webcam proctoring", sub: "Recordings kept 180 days unless a misconduct case is open" },
    { key: "screen", label: "Screen recording", sub: "Captured for the full sitting" },
    { key: "fullscreen", label: "Full-screen lock", sub: "Leaving full screen is logged and warned" },
    { key: "idCheck", label: "Photo ID check at start", sub: "Matched against the learner profile photo" },
    { key: "deviceCheck", label: "Device check 48 hours before", sub: "Camera, microphone and browser" },
  ];

  const columns: DataTableColumn<MockRow>[] = [
    { key: "title", header: "Mock exam", sortable: true, className: "font-semibold text-ink" },
    { key: "paper", header: "Paper", mono: true },
    { key: "durationMins", header: "Duration", align: "right", mono: true, render: (m) => `${m.durationMins} min` },
    { key: "window", header: "Availability window", render: (m) => `${formatAccaDate(m.opensOn)} to ${formatAccaDate(m.closesOn)}` },
    {
      key: "proctored",
      header: "Proctoring",
      render: (m) => (m.proctored ? <StatusPill status="Proctored" tone="violet" /> : <StatusPill status="Not proctored" tone="neutral" />),
    },
    { key: "status", header: "Status", render: (m) => <StatusPill status={m.status} /> },
  ];

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Mock rules"
        sub="Attempts, availability windows and proctoring for every mock exam. Faculty build mocks inside these limits."
        action={
          <Button
            onClick={() =>
              toast({
                title: "Mock rules saved",
                body: `${rules.attempts} ${rules.attempts === "1" ? "attempt" : "attempts"} · ${rules.window}-hour window · ${Object.values(proctoring).filter(Boolean).length} proctoring checks on`,
              })
            }
          >
            Save mock rules
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title="Attempts and windows" />
          <div className="grid gap-4 border-t border-line p-5 sm:grid-cols-2">
            <Field label="Attempts per mock">
              <Select value={rules.attempts} onChange={(e) => setRules((r) => ({ ...r, attempts: e.target.value }))}>
                <option value="1">1 attempt</option>
                <option value="2">2 attempts</option>
                <option value="3">3 attempts</option>
              </Select>
            </Field>
            <Field label="Availability window">
              <Select value={rules.window} onChange={(e) => setRules((r) => ({ ...r, window: e.target.value }))}>
                <option value="24">24 hours</option>
                <option value="48">48 hours</option>
                <option value="72">72 hours</option>
              </Select>
            </Field>
            <Field label="Earliest mock before the exam session">
              <Select value={rules.earliest} onChange={(e) => setRules((r) => ({ ...r, earliest: e.target.value }))}>
                <option value="4">4 weeks</option>
                <option value="6">6 weeks</option>
                <option value="8">8 weeks</option>
              </Select>
            </Field>
            <Field label="Late join cut-off">
              <Select value={rules.lateJoin} onChange={(e) => setRules((r) => ({ ...r, lateJoin: e.target.value }))}>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
              </Select>
            </Field>
            <Field label="Results release" className="sm:col-span-2">
              <Select value={rules.release} onChange={(e) => setRules((r) => ({ ...r, release: e.target.value }))}>
                <option value="objective-first">Objective sections at submission, Section C after marking</option>
                <option value="after-marking">All sections after faculty marking</option>
                <option value="after-window">All sections when the window closes</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Switch
                checked={rules.retakeReview}
                onChange={(v) => setRules((r) => ({ ...r, retakeReview: v }))}
                label="Second attempt only after a mentor review"
                sub="Applies when attempts per mock is 2 or more"
              />
            </div>
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Proctoring" sub="Applied to every proctored mock and graded test." />
          <div className="space-y-4 border-t border-line p-5">
            {PROCTOR.map((p) => (
              <Switch key={p.key} checked={proctoring[p.key]} onChange={(v) => setProctoring((s) => ({ ...s, [p.key]: v }))} label={p.label} sub={p.sub} />
            ))}
            <Field label="Flag for faculty review after tab switches">
              <Select value={tabSwitches} onChange={(e) => setTabSwitches(e.target.value)}>
                {["1", "2", "3"].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === "1" ? "switch" : "switches"}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>
      </div>
      <DataTable
        caption="Mock exams these rules apply to"
        rows={mocks}
        columns={columns}
        getRowId={(m) => m.id}
        toolbar={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setMocks((list) => list.map((m) => (m.status === "scheduled" || m.status === "draft" ? { ...m, proctored: proctoring.webcam } : m)));
              toast({ title: `Rules applied to ${mocks.filter((m) => m.status === "scheduled" || m.status === "draft").length} upcoming mocks`, body: "Published mocks keep the rules they opened with." });
            }}
          >
            Apply to upcoming mocks
          </Button>
        }
      />
    </section>
  );
}

/* ------------------------------------------------------------ taxonomy */

function Taxonomy() {
  const [definitions, setDefinitions] = useState(DIFFICULTY_DEFINITIONS);
  const [editing, setEditing] = useState<Difficulty | null>(null);
  const [adding, setAdding] = useState(false);
  const [termPaper, setTermPaper] = useState<PaperCode>("FR");
  const [terms, setTerms] = useState<{ id: string; kind: string; paper: string; area: string; name: string }[]>([
    { id: "t-1", kind: "Topic", paper: "FR", area: "B", name: "IFRS 18 presentation (from 2027)" },
  ]);
  const [tagging, setTagging] = useState({ required: true, facility: true, retire: true });
  const [topicPaper, setTopicPaper] = useState<PaperCode>("FR");

  const count = (paper: string, diff?: Difficulty) =>
    bankQuestions.filter((q) => q.paper === paper && (!diff || q.difficulty === diff)).length;

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Question taxonomy"
        sub="Every question is tagged paper, syllabus area, topic and difficulty, with a question type. Faculty cannot submit a question for review without all four tags."
        action={
          <Button onClick={() => setAdding(true)}>
            <Plus className="size-4" />
            Add taxonomy term
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        {["Paper", "Syllabus area", "Topic", "Difficulty"].map((l, i) => (
          <span key={l} className="flex items-center gap-2">
            <span className="rounded-full bg-surface-inv px-3 py-1 font-semibold text-ink-inv">
              <span className="mr-1.5 text-cta">{i + 1}</span>
              {l}
            </span>
            {i < 3 ? <span className="text-ink-3">→</span> : null}
          </span>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-3">
          <Card className="min-w-0">
            <CardHeader
              title="Topics by syllabus area"
              sub="The topic level of the taxonomy, with questions tagged to each."
              action={
                <FilterSelect label="Paper" value={topicPaper} onChange={(v) => setTopicPaper(v as PaperCode)} options={BANK_PAPERS} />
              }
            />
            <ul className="divide-y divide-line border-t border-line px-5">
              {(accaPapers.find((p) => p.code === topicPaper)?.syllabusAreas ?? []).map((a) => {
                const qs = bankQuestions.filter((q) => q.paper === topicPaper && q.syllabusArea === a.code);
                const topics = Array.from(new Set([...qs.map((q) => q.topic), ...terms.filter((t) => t.paper === topicPaper && t.area === a.code).map((t) => t.name)]));
                return (
                  <li key={a.code} className="flex flex-wrap items-start gap-x-3 gap-y-1.5 py-2.5">
                    <span className="w-12 shrink-0 font-mono text-[12.5px] font-semibold text-ink">
                      {topicPaper} {a.code}
                    </span>
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="text-[12.5px] text-ink-3">{a.title}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {topics.length ? (
                          topics.map((t) => (
                            <span key={t} className="rounded-full border border-line bg-surface-2 px-2 py-px text-[12px] text-ink-2">
                              {t} <span className="font-mono text-ink-3">{qs.filter((q) => q.topic === t).length}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[12px] text-ink-3">No topics yet</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
          <MiniLabel>Questions by paper and difficulty</MiniLabel>
          <Matrix
            caption="Question bank by paper and difficulty"
            corner="Paper"
            dense
            rows={BANK_PAPERS.map((p) => ({ id: p, label: p, sub: paperName(p) }))}
            cols={[...DIFFICULTIES.map((d) => ({ id: d, label: DIFFICULTY_LABELS[d] })), { id: "total", label: "Total" }]}
            cell={(row, col) => (
              <span className={cn("font-mono tnum", col === "total" ? "font-bold text-ink" : "text-ink-2")}>
                {col === "total" ? count(row) : count(row, col as Difficulty)}
              </span>
            )}
          />
        </div>
        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Difficulty levels" />
            <ul className="divide-y divide-line border-t border-line px-5">
              {DIFFICULTIES.map((d) => (
                <li key={d} className="flex flex-wrap items-start justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1 basis-52">
                    <p className="text-[13.5px] font-semibold text-ink">
                      {DIFFICULTY_LABELS[d]}
                      <span className="ml-2 font-mono text-[12px] font-normal text-ink-3">{bankQuestions.filter((q) => q.difficulty === d).length} questions</span>
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-2">{definitions[d]}</p>
                  </div>
                  <Button size="xs" variant="outline" onClick={() => setEditing(d)}>
                    Edit
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <MiniLabel>Question types</MiniLabel>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {TYPES.map((t) => (
                <div key={t} className="rounded-[12px] border border-line px-3 py-2.5">
                  <p className="font-mono text-[12px] text-ink-3">{t}</p>
                  <p className="text-[13px] font-semibold text-ink">{QUESTION_TYPE_LABELS[t]}</p>
                  <p className="text-[12px] text-ink-3 tnum">{bankQuestions.filter((q) => q.type === t).length} in bank</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Tagging rules" />
          <div className="space-y-4 border-t border-line p-5">
            <Switch
              checked={tagging.required}
              onChange={(v) => {
                setTagging((t) => ({ ...t, required: v }));
                toast({ title: v ? "All four tags required before review" : "Tags optional before review", tone: "info" });
              }}
              label="Paper, syllabus area, topic and difficulty required before review"
            />
            <Switch
              checked={tagging.facility}
              onChange={(v) => {
                setTagging((t) => ({ ...t, facility: v }));
                toast({ title: v ? "Facility index recalculates after 30 attempts" : "Facility index recalculation paused", tone: "info" });
              }}
              label="Recalculate facility index after 30 attempts"
            />
            <Switch
              checked={tagging.retire}
              onChange={(v) => {
                setTagging((t) => ({ ...t, retire: v }));
                toast({ title: v ? "Out-of-range questions flagged for retirement" : "Retirement flags off", tone: "info" });
              }}
              label="Flag questions with facility below 0.2 or above 0.95 for retirement"
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Recently added terms" sub="Terms added here appear in the question bank tag pickers." />
          <ul className="divide-y divide-line border-t border-line px-5">
            {terms.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-[13px]">
                <span className="min-w-0 font-semibold text-ink">{t.name}</span>
                <span className="flex flex-wrap gap-1.5">
                  <Badge>{t.kind}</Badge>
                  <Badge tone="dark">
                    {t.paper} {t.area}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <FormDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing ? `Difficulty · ${DIFFICULTY_LABELS[editing]}` : "Difficulty"}
        submitLabel="Save definition"
        onSubmit={(data) => {
          if (!editing) return;
          const text = String(data.get("definition") ?? "").trim();
          setDefinitions((d) => ({ ...d, [editing]: text || d[editing] }));
          toast({ title: `${DIFFICULTY_LABELS[editing]} definition saved` });
          setEditing(null);
        }}
      >
        {editing ? (
          <Field label="Definition shown to question authors" key={editing}>
            <Textarea name="definition" rows={4} defaultValue={definitions[editing]} required />
          </Field>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={adding}
        onClose={() => setAdding(false)}
        title="Add taxonomy term"
        sub="New topics sit under a paper and syllabus area."
        submitLabel="Add term"
        onSubmit={(data) => {
          const name = String(data.get("name") ?? "").trim();
          const term = { id: `t-${terms.length + 1}`, kind: String(data.get("kind")), paper: termPaper, area: String(data.get("area")), name };
          setTerms((list) => [term, ...list]);
          toast({ title: "Taxonomy term added", body: `${term.kind} · ${term.paper} ${term.area} · ${name}` });
          setAdding(false);
        }}
      >
        <Field label="Term type">
          <Select name="kind" defaultValue="Topic">
            <option>Topic</option>
            <option>Subtopic</option>
            <option>Skill tag</option>
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select value={termPaper} onChange={(e) => setTermPaper(e.target.value as PaperCode)}>
              {accaPapers.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Syllabus area">
            <Select name="area" key={termPaper}>
              {(accaPapers.find((p) => p.code === termPaper)?.syllabusAreas ?? []).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} · {a.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Name">
          <Input name="name" required placeholder="e.g. Deferred tax" />
        </Field>
      </FormDrawer>
    </section>
  );
}

/* ------------------------------------------------------------ marking and moderation */

function Marking({ slaDays, setSlaDays }: { slaDays: number; setSlaDays: (n: number) => void }) {
  const [marking, setMarking] = useState({ nearPass: 5, sample: 10, variance: 4 });
  const [switches, setSwitches] = useState({ professional: true, guide: true, blind: true, excludeOriginal: true, bothWays: true });
  const [windowDays, setWindowDays] = useState(7);
  const [panel, setPanel] = useState("2");

  type ReRow = (typeof reEvaluationRequests)[number];
  const columns: DataTableColumn<ReRow>[] = [
    {
      key: "title",
      header: "Script",
      render: (r) => (
        <span className="block min-w-48">
          <span className="block font-semibold text-ink">{r.title}</span>
          <span className="block text-[12px] text-ink-3">{studentName(r.studentId)}</span>
        </span>
      ),
    },
    { key: "paper", header: "Paper", mono: true },
    { key: "marks", header: "Original marks", mono: true, align: "right", render: (r) => `${r.originalMarks} / ${r.maxMarks}` },
    { key: "requestedOn", header: "Requested", render: (r) => formatAccaDate(r.requestedOn) },
    {
      key: "due",
      header: "SLA due",
      render: (r) =>
        r.status === "open" || r.status === "under-review" ? (
          <span className="font-semibold text-ink">{formatAccaDate(addDays(r.requestedOn, slaDays))}</span>
        ) : (
          <span className="text-ink-3">Closed</span>
        ),
    },
    { key: "panel", header: "Panel", wrap: true, render: (r) => r.panelIds.map((id) => staffName(id)).join(", ") },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusPill status={r.status}>{r.status === "revised" && r.revisedMarks !== undefined ? `Revised to ${r.revisedMarks}` : undefined}</StatusPill>
      ),
    },
  ];

  const SW: { key: keyof typeof switches; label: string; sub?: string }[] = [
    { key: "professional", label: "Professional skills marks moderated by lead faculty", sub: "SBL and SBR professional marks" },
    { key: "guide", label: "Marking guide approved before marking opens" },
    { key: "blind", label: "Blind second marking", sub: "Second marker does not see first marks" },
  ];

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Constructed-response marking and moderation"
        sub="When scripts are second marked, when a third marker steps in, and how quickly re-evaluation requests are answered."
        action={
          <Button
            onClick={() =>
              toast({
                title: "Marking and moderation rules saved",
                body: `Second marking within ${marking.nearPass} marks of pass · ${marking.sample}% sample · re-evaluation in ${slaDays} days`,
              })
            }
          >
            Save marking rules
          </Button>
        }
      />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="min-w-0">
          <CardHeader title="Second marking thresholds" />
          <div className="space-y-4 border-t border-line p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label="Within marks of pass" value={marking.nearPass} suffix="marks" max={20} onChange={(v) => setMarking((m) => ({ ...m, nearPass: v }))} />
              <NumberField label="Random sample" value={marking.sample} onChange={(v) => setMarking((m) => ({ ...m, sample: v }))} />
              <NumberField label="Third marker if gap over" value={marking.variance} suffix="marks" max={20} onChange={(v) => setMarking((m) => ({ ...m, variance: v }))} />
            </div>
            {SW.map((s) => (
              <Switch key={s.key} checked={switches[s.key]} onChange={(v) => setSwitches((c) => ({ ...c, [s.key]: v }))} label={s.label} sub={s.sub} />
            ))}
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Re-evaluation" />
          <div className="space-y-4 border-t border-line p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <NumberField label="Request window" value={windowDays} suffix="days" max={30} onChange={setWindowDays} />
              <NumberField label="Re-evaluation SLA" value={slaDays} suffix="days" min={1} max={30} onChange={setSlaDays} />
              <Field label="Panel size">
                <Select value={panel} onChange={(e) => setPanel(e.target.value)}>
                  <option value="2">2 markers</option>
                  <option value="3">3 markers</option>
                </Select>
              </Field>
            </div>
            <Switch
              checked={switches.excludeOriginal}
              onChange={(v) => setSwitches((c) => ({ ...c, excludeOriginal: v }))}
              label="Original marker excluded from the panel"
            />
            <Switch
              checked={switches.bothWays}
              onChange={(v) => setSwitches((c) => ({ ...c, bothWays: v }))}
              label="Marks can go down as well as up"
              sub="Learners see this before they request"
            />
          </div>
        </Card>
      </div>
      <DataTable caption="Re-evaluation requests" rows={reEvaluationRequests} columns={columns} getRowId={(r) => r.id} />
      <Card className="p-5">
        <MiniLabel>Rubrics in use</MiniLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          {evaluationRubrics.map((r) => (
            <Badge key={r.id} tone={r.paper ? "neutral" : "info"}>
              {r.name}
            </Badge>
          ))}
        </div>
      </Card>
    </section>
  );
}

/* ------------------------------------------------------------ readiness score formula */

function ReadinessFormula({
  weights,
  setWeights,
  target,
}: {
  weights: Weights;
  setWeights: React.Dispatch<React.SetStateAction<Weights>>;
  target: number;
}) {
  const [exampleId, setExampleId] = useState(EXAMPLES[0].id);
  const example = EXAMPLES.find((e) => e.id === exampleId) ?? EXAMPLES[0];
  const total = weights.mocks + weights.practice + weights.attendance + weights.syllabus;
  const score = Math.round(
    (example.values.mocks * weights.mocks +
      example.values.practice * weights.practice +
      example.values.attendance * weights.attendance +
      example.values.syllabus * weights.syllabus) /
      Math.max(1, total),
  );
  const weakest = WEIGHT_LABELS.reduce((a, b) => (example.values[b.key] < example.values[a.key] ? b : a));

  return (
    <section className="space-y-5">
      <BlockHeading
        title="Readiness score formula"
        sub="The readiness score (0 to 100) drives exam entry advice, mentor risk alerts and university reports. Weights must add up to 100."
        action={
          <WithHint hint={total === 100 ? undefined : "Weights must add up to 100 before saving"}>
            <Button
              disabled={total !== 100}
              onClick={() =>
                toast({
                  title: "Readiness score formula saved",
                  body: `Mocks ${weights.mocks}% · practice ${weights.practice}% · attendance ${weights.attendance}% · syllabus ${weights.syllabus}%. Scores recalculate tonight.`,
                })
              }
            >
              Save formula
            </Button>
          </WithHint>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Weights"
            action={
              <Badge tone={total === 100 ? "jade" : "rose"}>
                Total {total}%
              </Badge>
            }
          />
          <div className="space-y-5 border-t border-line p-5">
            {WEIGHT_LABELS.map((w) => (
              <div key={w.key}>
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor={`w-${w.key}`} className="min-w-0 text-[13.5px] font-semibold text-ink">
                    {w.label}
                  </label>
                  <span className="font-mono text-[14px] font-bold text-ink tnum">{weights[w.key]}%</span>
                </div>
                <p className="text-[12.5px] text-ink-3">{w.sub}</p>
                <input
                  id={`w-${w.key}`}
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={weights[w.key]}
                  onChange={(e) => setWeights((cur) => ({ ...cur, [w.key]: Number(e.target.value) }))}
                  className="mt-2 w-full cursor-pointer accent-[var(--cta-strong)]"
                />
              </div>
            ))}
            {total !== 100 ? (
              <p className="rounded-[12px] bg-rose-soft px-3.5 py-2.5 text-[13px] font-medium text-rose">
                Weights add up to {total}%. Adjust them to exactly 100% to save.
              </p>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setWeights({ mocks: 40, practice: 25, attendance: 15, syllabus: 20 });
                toast({ title: "Weights reset to the default formula", tone: "info" });
              }}
            >
              Reset to 40 · 25 · 15 · 20
            </Button>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Live example" sub="Recalculates as you move the sliders." />
          <div className="space-y-5 border-t border-line p-5">
            <Field label="Learner">
              <Select value={exampleId} onChange={(e) => setExampleId(e.target.value)}>
                {EXAMPLES.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="flex flex-wrap items-center gap-5">
              <ScoreRing value={score} size={104} stroke={9} showBand label="Readiness score" />
              <div className="min-w-0 flex-1 basis-40">
                <p className="text-[12px] text-ink-3">Readiness score</p>
                <p className="font-display text-[34px] leading-none font-bold text-ink tnum">{score}</p>
                <p className={cn("mt-2 text-[13px] font-semibold", score >= target ? "text-jade" : score >= 50 ? "text-amber" : "text-rose")}>
                  {score >= target ? "Recommend exam entry" : `Hold entry: below the target of ${target}`}
                </p>
                {score < target ? <p className="mt-0.5 text-[12.5px] text-ink-2">Weakest input: {weakest.label.toLowerCase()}</p> : null}
              </div>
            </div>
            <div className="space-y-3">
              {WEIGHT_LABELS.map((w) => (
                <ScoreBar key={w.key} label={`${w.label} · weight ${weights[w.key]}%`} value={example.values[w.key]} height={6} />
              ))}
            </div>
            <p className="text-[12px] text-ink-3">Bands: {target} and above ready to book · 50 to {target - 1} borderline · below 50 at risk.</p>
          </div>
        </Card>
      </div>
    </section>
  );
}
