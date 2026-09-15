"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, ListPlus, Plus, RotateCcw, Search, X } from "lucide-react";
import {
  ACCA_TODAY,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  bankQuestions,
  cohortById,
  cohortsForFaculty,
  examSessionById,
  paperByCode,
  staffName,
  syllabusAreaTitle,
  type Difficulty,
  type PaperCode,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FilterSelect } from "@/components/ui/filter-bar";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { formatCalendarDate, formatRange } from "@/components/ui/calendar";
import {
  FORMAT_LABELS,
  MOCK_SESSIONS,
  bandMark,
  bandRange,
  blueprintTemplate,
  blueprintTotal,
  defaultWindow,
  describeRow,
  poolFor,
  rowMarks,
  type BlueprintRow,
  type LocalQuiz,
  type LocalRubric,
  type SectionFormat,
} from "./mock-model";
import { ChipPicker, DifficultyMeter, MiniLabel, PaperCodeChip, plural, type useAuthor } from "./shared";

type Author = ReturnType<typeof useAuthor>;

const DIFF_LEVEL: Record<Difficulty, 1 | 2 | 3> = { foundation: 1, intermediate: 2, "exam-standard": 3 };
const SECTION_TONES = ["bg-ink", "bg-cta", "bg-info", "bg-violet", "bg-jade"];

function cohortsFor(author: Author, paper: PaperCode) {
  return cohortsForFaculty(author.staffId).filter((c) => c.papers.includes(paper));
}

function durationLabel(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function statusFor(author: Author, draft: boolean, opensOn: string): LocalQuiz["status"] {
  if (draft) return "draft";
  if (!author.canPublish) return "in-review";
  return opensOn > ACCA_TODAY ? "scheduled" : "published";
}

function savedToast(author: Author, status: LocalQuiz["status"], title: string, detail: string) {
  toast(
    status === "draft"
      ? { title: "Saved as draft", body: `${title} · ${detail}`, tone: "neutral" }
      : status === "in-review"
        ? { title: "Submitted for review", body: `${staffName(author.reviewerId)} is asked to review ${title}. ${detail}`, tone: "info" }
        : { title: status === "scheduled" ? `Scheduled: ${title}` : `Published: ${title}`, body: detail },
  );
}

function CohortPicker({
  author,
  paper,
  value,
  onChange,
}: {
  author: Author;
  paper: PaperCode;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const list = cohortsFor(author, paper);
  if (list.length === 0) {
    return <p className="text-[12.5px] text-ink-3">You have no {paper} cohorts assigned. Save it as a draft and a Programme Admin assigns cohorts.</p>;
  }
  return (
    <ul className="space-y-2">
      {list.map((c) => (
        <li key={c.id}>
          <Checkbox
            checked={value.includes(c.id)}
            onChange={() => onChange(value.includes(c.id) ? value.filter((v) => v !== c.id) : [...value, c.id])}
            label={
              <span>
                <span className="font-semibold text-ink">{c.name}</span>
                <span className="block text-[12px] text-ink-3">
                  {c.size} learners · {examSessionById(c.examSessionId ?? "")?.label ?? "No exam session"} · {c.mode === "weekend" ? "Weekend" : "Weekday"}
                </span>
              </span>
            }
          />
        </li>
      ))}
    </ul>
  );
}

function SaveBar({
  author,
  noun,
  onSave,
}: {
  author: Author;
  noun: string;
  onSave: (draft: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3.5">
      <Button onClick={() => onSave(false)}>
        <Check className="size-4" />
        {author.canPublish ? `Publish ${noun}` : "Submit for review"}
      </Button>
      <Button variant="ghost" onClick={() => onSave(true)}>
        Save as draft
      </Button>
      {!author.canPublish ? <span className="text-[12px] text-ink-3">Goes to {staffName(author.reviewerId)}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ quiz builder */

export function QuizBuilder({
  author,
  nextId,
  onSave,
}: {
  author: Author;
  nextId: string;
  onSave: (quiz: LocalQuiz) => void;
}) {
  const [paper, setPaper] = useState<PaperCode>(author.papers[0]);
  const [fArea, setFArea] = useState("");
  const [fDiff, setFDiff] = useState("");
  const [fType, setFType] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [title, setTitle] = useState<string | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(2);
  const [opens, setOpens] = useState("2026-09-21");
  const [closes, setCloses] = useState("2026-10-04");
  const [cohortIds, setCohortIds] = useState<string[]>(cohortsFor(author, author.papers[0]).map((c) => c.id));
  const [shuffle, setShuffle] = useState(true);
  const [answers, setAnswers] = useState(true);

  const pool = bankQuestions.filter((q) => q.paper === paper && q.status === "published");
  const shown = pool.filter(
    (q) =>
      (!fArea || q.syllabusArea === fArea) &&
      (!fDiff || q.difficulty === fDiff) &&
      (!fType || q.type === fType) &&
      (!query.trim() || `${q.topic} ${q.stem}`.toLowerCase().includes(query.trim().toLowerCase())),
  );
  const selected = picked.map((id) => pool.find((q) => q.id === id)).filter((q): q is (typeof pool)[number] => Boolean(q));
  const marks = selected.reduce((n, q) => n + q.marks, 0);
  const suggested = Math.max(10, Math.ceil((marks * 1.8) / 5) * 5);
  const areas = Array.from(new Set(selected.map((q) => q.syllabusArea))).sort();
  const autoTitle = `${paper} quiz: ${
    areas.length === 1 ? (syllabusAreaTitle(paper, areas[0]) ?? `area ${areas[0]}`) : areas.length ? `areas ${areas.join(", ")}` : "topic check"
  }`;

  const changePaper = (p: PaperCode) => {
    setPaper(p);
    setFArea("");
    setPicked([]);
    setCohortIds(cohortsFor(author, p).map((c) => c.id));
  };
  const toggle = (id: string) => setPicked((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));
  const move = (id: string, dir: -1 | 1) =>
    setPicked((list) => {
      const i = list.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = (draft: boolean) => {
    const name = (title ?? autoTitle).trim() || autoTitle;
    if (selected.length === 0) {
      toast({ title: "Pick at least one question from the bank", tone: "warning" });
      return;
    }
    if (closes < opens) {
      toast({ title: "The window closes before it opens", tone: "warning" });
      return;
    }
    if (!draft && cohortIds.length === 0) {
      toast({ title: "Choose the cohorts who sit this quiz", tone: "warning" });
      return;
    }
    const status = statusFor(author, draft, opens);
    onSave({
      id: nextId,
      title: name,
      kind: "quiz",
      paper,
      durationMins: duration ?? suggested,
      totalMarks: marks,
      blueprint: [{ section: "Quiz", format: `${plural(selected.length, "question")} from the ${paper} bank`, marks, areas, questionIds: selected.map((q) => q.id) }],
      status,
      cohortIds,
      opensOn: opens,
      closesOn: closes,
      attempts: 0,
      avgScore: null,
      createdBy: author.staffId,
      proctored: false,
      attemptsAllowed: attempts,
    });
    savedToast(author, status, name, `${plural(selected.length, "question")} · ${marks} marks · ${formatRange(opens, closes)}`);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
      <Card className="min-w-0">
        <CardHeader title="Pick from the question bank" sub="Filter by syllabus area, difficulty and type, then add questions to the quiz. Only published questions are offered." />
        <div className="space-y-3 border-t border-line px-5 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect label="Paper" value={paper} onChange={(v) => changePaper(v as PaperCode)} options={author.papers.map((p) => ({ value: p, label: p }))} />
            <FilterSelect
              label="Syllabus area"
              allLabel="All"
              value={fArea}
              onChange={setFArea}
              options={(paperByCode(paper)?.syllabusAreas ?? []).map((a) => ({ value: a.code, label: `${a.code} · ${a.title}` }))}
            />
            <FilterSelect
              label="Difficulty"
              allLabel="All"
              value={fDiff}
              onChange={setFDiff}
              options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
            />
            <FilterSelect
              label="Type"
              allLabel="All"
              value={fType}
              onChange={setFType}
              options={(["OT", "number", "MTQ", "CR"] as const).map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-0 flex-1 basis-56">
              <Input icon={<Search />} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topic or question" aria-label="Search questions" />
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={shown.every((q) => picked.includes(q.id))}
              onClick={() => setPicked((list) => [...list, ...shown.map((q) => q.id).filter((id) => !list.includes(id))])}
            >
              <ListPlus className="size-3.5" />
              Add all {shown.length} shown
            </Button>
          </div>
        </div>
        <ul className="divide-y divide-line border-t border-line">
          {shown.map((q) => {
            const on = picked.includes(q.id);
            return (
              <li key={q.id} className={cn("flex items-start gap-3 px-5 py-3", on && "bg-cta-soft")}>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
                    <span className="font-mono text-[11.5px] text-ink-3">{q.id}</span>
                    <span className="font-semibold text-ink">{q.topic}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{q.stem}</p>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="grid size-4.5 place-items-center rounded-full bg-cta text-[10px] font-bold text-cta-ink">{q.syllabusArea}</span>
                      {q.type === "number" ? "Number entry" : q.type}
                    </span>
                    <DifficultyMeter level={DIFF_LEVEL[q.difficulty]} label={DIFFICULTY_LABELS[q.difficulty]} />
                    <span className="tnum">{plural(q.marks, "mark")}</span>
                    {q.facilityIndex !== null ? <span className="tnum">Facility {Math.round(q.facilityIndex * 100)}%</span> : null}
                  </p>
                </div>
                <Button size="xs" variant={on ? "secondary" : "outline"} onClick={() => toggle(q.id)} aria-pressed={on}>
                  {on ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                  {on ? "Added" : "Add"}
                </Button>
              </li>
            );
          })}
          {shown.length === 0 ? <li className="px-5 py-10 text-center text-[13px] text-ink-3">No published questions match these filters.</li> : null}
        </ul>
      </Card>

      <Card className="min-w-0 self-start">
        <CardHeader title="Create quizzes" sub="Settings and the questions in order" />
        <div className="space-y-4 border-t border-line px-5 py-4">
          <Field label="Quiz title">
            <Input value={title ?? autoTitle} onChange={(e) => setTitle(e.target.value)} />
          </Field>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <MiniLabel>Questions</MiniLabel>
              <span className="text-[12.5px] font-semibold text-ink tnum">
                {plural(selected.length, "question")} · {marks} marks
              </span>
            </div>
            {selected.length ? (
              <ol className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
                {selected.map((q, n) => (
                  <li key={q.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="w-5 shrink-0 text-right font-mono text-[11.5px] text-ink-3">{n + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-semibold text-ink">{q.topic}</span>
                      <span className="block text-[11.5px] text-ink-3">
                        {q.id} · {q.syllabusArea} · {plural(q.marks, "mark")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center">
                      <Button size="xs" variant="ghost" aria-label={`Move ${q.id} up`} onClick={() => move(q.id, -1)} disabled={n === 0}>
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button size="xs" variant="ghost" aria-label={`Move ${q.id} down`} onClick={() => move(q.id, 1)} disabled={n === selected.length - 1}>
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <Button size="xs" variant="ghost" aria-label={`Remove ${q.id}`} onClick={() => toggle(q.id)}>
                        <X className="size-3.5" />
                      </Button>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-3 py-5 text-center text-[12.5px] text-ink-3">
                Add questions from the bank on the left.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Duration" hint="minutes" className="min-w-0">
              <Input type="number" min={5} max={180} value={duration ?? suggested} onChange={(e) => setDuration(Number(e.target.value))} />
            </Field>
            <Field label="Attempts allowed" className="min-w-0">
              <Select value={attempts} onChange={(e) => setAttempts(Number(e.target.value))}>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Opens" className="min-w-0">
              <Input type="date" value={opens} min={ACCA_TODAY} onChange={(e) => setOpens(e.target.value)} />
            </Field>
            <Field label="Closes" className="min-w-0">
              <Input type="date" value={closes} min={opens} onChange={(e) => setCloses(e.target.value)} />
            </Field>
          </div>
          <p className="-mt-2 text-[12px] text-ink-3">Suggested {suggested} minutes at the CBE pace of 1.8 minutes a mark.</p>

          <div>
            <MiniLabel className="mb-2">Cohorts</MiniLabel>
            <CohortPicker author={author} paper={paper} value={cohortIds} onChange={setCohortIds} />
          </div>

          <div className="space-y-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
            <Switch checked={shuffle} onChange={setShuffle} label="Shuffle question order" sub="Each learner sees a different order" />
            <Switch checked={answers} onChange={setAnswers} label="Show answers after the window closes" sub="Explanations from the answer keys" />
          </div>
        </div>
        <SaveBar author={author} noun="quiz" onSave={save} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ mock exam blueprint */

export function MockBuilder({
  author,
  nextId,
  rubrics,
  existing,
  onSave,
}: {
  author: Author;
  nextId: string;
  rubrics: LocalRubric[];
  existing: LocalQuiz[];
  onSave: (mock: LocalQuiz) => void;
}) {
  // Prefer a session the author teaches a cohort for that has no mock yet.
  const pickSession = (p: PaperCode) => {
    const withCohorts = MOCK_SESSIONS.filter((s) => cohortsFor(author, p).some((c) => c.examSessionId === s.id));
    const free = withCohorts.find((s) => !existing.some((q) => q.kind === "mock" && q.paper === p && q.title.includes(s.label)));
    return free ?? withCohorts[0] ?? MOCK_SESSIONS.find((s) => s.id === "es-2027-mar") ?? MOCK_SESSIONS[0];
  };
  const firstSession = pickSession(author.papers[0]);
  const [paper, setPaper] = useState<PaperCode>(author.papers[0]);
  const [sessionId, setSessionId] = useState<string>(firstSession?.id ?? "");
  const [rows, setRows] = useState<BlueprintRow[]>(blueprintTemplate(author.papers[0]));
  const [title, setTitle] = useState<string | null>(null);
  const [duration, setDuration] = useState(paperByCode(author.papers[0])?.durationMins ?? 180);
  const win = defaultWindow(firstSession?.id ?? "");
  const [opens, setOpens] = useState(win.opens);
  const [closes, setCloses] = useState(win.closes);
  const [cohortIds, setCohortIds] = useState<string[]>(
    cohortsFor(author, author.papers[0])
      .filter((c) => c.examSessionId === firstSession?.id)
      .map((c) => c.id),
  );
  const [proctored, setProctored] = useState(true);
  const [rubricId, setRubricId] = useState(rubrics.find((r) => r.paper === author.papers[0])?.id ?? "");

  const session = MOCK_SESSIONS.find((s) => s.id === sessionId);
  const clash = existing.find((q) => q.kind === "mock" && q.paper === paper && session && q.title.includes(session.label));
  const autoTitle = `${paper} mock exam${clash ? " 2" : ""} · ${session?.label ?? ""}`;
  const total = blueprintTotal(rows);
  const hasCr = rows.some((r) => r.format === "CR");
  const paperRubrics = rubrics.filter((r) => r.paper === paper || r.paper === null);
  const areas = paperByCode(paper)?.syllabusAreas ?? [];
  const lateWindow = session ? closes >= session.examStart : false;
  const learners = cohortIds.reduce((n, id) => n + (cohortById(id)?.size ?? 0), 0);

  const reset = (p: PaperCode, sid: string) => {
    setRows(blueprintTemplate(p));
    setDuration(paperByCode(p)?.durationMins ?? 180);
    const w = defaultWindow(sid);
    setOpens(w.opens);
    setCloses(w.closes);
    setCohortIds(
      cohortsFor(author, p)
        .filter((c) => c.examSessionId === sid)
        .map((c) => c.id),
    );
    setRubricId(rubrics.find((r) => r.paper === p)?.id ?? "");
  };

  const patchRow = (id: string, p: Partial<BlueprintRow>) => setRows((list) => list.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const save = (draft: boolean) => {
    const name = (title ?? autoTitle).trim() || autoTitle;
    if (!draft && total !== 100) {
      toast({ title: `The blueprint totals ${total} marks`, body: "ACCA exams are marked out of 100. Adjust the sections first.", tone: "warning" });
      return;
    }
    if (closes < opens) {
      toast({ title: "The window closes before it opens", tone: "warning" });
      return;
    }
    if (!draft && cohortIds.length === 0) {
      toast({ title: "Choose the cohorts who sit this mock", tone: "warning" });
      return;
    }
    const status = statusFor(author, draft, opens);
    const sections = Array.from(new Set(rows.map((r) => r.section)));
    onSave({
      id: nextId,
      title: name,
      kind: "mock",
      paper,
      durationMins: duration,
      totalMarks: total,
      blueprint: sections.map((s) => {
        const part = rows.filter((r) => r.section === s);
        return {
          section: s,
          format: part.map(describeRow).join(" · "),
          marks: blueprintTotal(part),
          areas: Array.from(new Set(part.flatMap((r) => r.areas))).sort(),
        };
      }),
      rubricId: hasCr ? rubricId || undefined : undefined,
      status,
      cohortIds,
      opensOn: opens,
      closesOn: closes,
      attempts: 0,
      avgScore: null,
      createdBy: author.staffId,
      proctored,
      attemptsAllowed: 1,
      sessionLabel: session?.label,
    });
    savedToast(author, status, name, `${total} marks · ${durationLabel(duration)} · ${formatRange(opens, closes)} · ${plural(cohortIds.length, "cohort")}`);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="min-w-0 space-y-5">
        <Card className="min-w-0">
          <CardHeader title="Create mock examinations" sub="Start from the ACCA exam structure for the paper, then adjust sections, marks and syllabus areas." />
          <div className="space-y-4 border-t border-line px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Paper" className="min-w-0">
                <Select
                  value={paper}
                  onChange={(e) => {
                    const p = e.target.value as PaperCode;
                    const sid = pickSession(p).id;
                    setPaper(p);
                    setSessionId(sid);
                    reset(p, sid);
                  }}
                >
                  {author.papers.map((p) => (
                    <option key={p} value={p}>
                      {p} · {paperByCode(p)?.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Exam session" className="min-w-0">
                <Select
                  value={sessionId}
                  onChange={(e) => {
                    setSessionId(e.target.value);
                    reset(paper, e.target.value);
                  }}
                >
                  {MOCK_SESSIONS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Duration" hint="minutes" className="min-w-0">
                <Input type="number" min={30} max={240} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
              </Field>
            </div>
            <Field label="Title">
              <Input value={title ?? autoTitle} onChange={(e) => setTitle(e.target.value)} />
            </Field>
            <p className="text-[12.5px] text-ink-3">{paperByCode(paper)?.examStructure}</p>
            {clash ? (
              <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-amber-soft px-3.5 py-2.5 text-[12.5px] leading-snug text-ink">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber" />
                {clash.title} already exists ({clash.status}, {formatRange(clash.opensOn, clash.closesOn)}). This one is saved as a second mock for the same session, so give it a later window.
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Blueprint"
            sub="Sections with question formats and marks. The total must reach 100."
            action={
              <Button size="sm" variant="ghost" onClick={() => setRows(blueprintTemplate(paper))}>
                <RotateCcw className="size-3.5" />
                Reset to {paper} structure
              </Button>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((r, n) => {
              const pool = poolFor(paper, r);
              const short = pool.length < r.questions;
              return (
                <li key={r.id} className="space-y-3 px-5 py-4">
                  <div className="grid grid-cols-2 items-end gap-3 sm:grid-cols-[7rem_minmax(0,1fr)_5rem_5rem_auto]">
                    <Field label="Section" className="min-w-0">
                      <Input value={r.section} onChange={(e) => patchRow(r.id, { section: e.target.value })} />
                    </Field>
                    <Field label="Format" className="min-w-0">
                      <Select value={r.format} onChange={(e) => patchRow(r.id, { format: e.target.value as SectionFormat })}>
                        {(Object.keys(FORMAT_LABELS) as SectionFormat[]).map((f) => (
                          <option key={f} value={f}>
                            {FORMAT_LABELS[f].label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Questions" className="min-w-0">
                      <Input type="number" min={1} max={60} value={r.questions} onChange={(e) => patchRow(r.id, { questions: Number(e.target.value) })} />
                    </Field>
                    <Field label="Marks each" className="min-w-0">
                      <Input type="number" min={1} max={100} value={r.marksEach} onChange={(e) => patchRow(r.id, { marksEach: Number(e.target.value) })} />
                    </Field>
                    <div className="col-span-2 flex items-center justify-between gap-2 sm:col-span-1 sm:pb-2">
                      <span className="font-display text-[20px] font-bold text-ink tnum">{rowMarks(r)}</span>
                      <Button size="xs" variant="ghost" aria-label={`Remove row ${n + 1}`} onClick={() => setRows((list) => list.filter((x) => x.id !== r.id))} disabled={rows.length === 1}>
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                  <ChipPicker
                    ariaLabel={`Syllabus areas for ${r.section}`}
                    multiple
                    value={r.areas}
                    onChange={(v) => patchRow(r.id, { areas: v })}
                    options={areas.map((a) => ({ value: a.code, label: a.code, sub: a.title }))}
                  />
                  <p className={cn("text-[12px]", short ? "text-amber" : "text-ink-3")}>
                    {short
                      ? `The ${paper} bank has ${plural(pool.length, "matching published question")} for ${plural(r.questions, "slot")}. Add more in the question bank before the window opens.`
                      : `The ${paper} bank has ${plural(pool.length, "matching published question")}.`}
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setRows((list) => [
                  ...list,
                  { id: `bp-${list.reduce((m, x) => Math.max(m, Number(x.id.slice(3)) || 0), 0) + 1}`, section: "Section D", format: "CR", questions: 1, marksEach: 10, areas: [] },
                ])
              }
            >
              <Plus className="size-3.5" />
              Add section row
            </Button>
          </div>
        </Card>
      </div>

      <Card className="min-w-0 self-start">
        <CardHeader title="Mock summary" sub={session ? `For the ${session.label} exam session, exams from ${formatCalendarDate(session.examStart)}` : undefined} />
        <div className="space-y-5 border-t border-line px-5 py-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span className={cn("font-display text-[40px] leading-none font-bold tnum", total === 100 ? "text-ink" : "text-rose")}>{total}</span>
              <StatusPill status={total === 100 ? "Totals 100 marks" : `${total > 100 ? total - 100 : 100 - total} marks ${total > 100 ? "over" : "short"}`} tone={total === 100 ? "jade" : "rose"} size="sm" />
            </div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-surface-3" aria-hidden>
              {rows.map((r, n) => (
                <span key={r.id} className={SECTION_TONES[n % SECTION_TONES.length]} style={{ width: `${(rowMarks(r) / Math.max(total, 100)) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-3 space-y-1.5">
              {rows.map((r, n) => (
                <li key={r.id} className="flex items-center gap-2 text-[12.5px]">
                  <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", SECTION_TONES[n % SECTION_TONES.length])} />
                  <span className="min-w-0 flex-1 truncate text-ink-2">
                    {r.section} · {describeRow(r)}
                  </span>
                  <span className="shrink-0 font-mono text-ink tnum">{rowMarks(r)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-ink-3">{total ? `${(duration / total).toFixed(2)} minutes a mark` : "No marks yet"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Window opens" className="min-w-0">
              <Input type="date" value={opens} min={ACCA_TODAY} onChange={(e) => setOpens(e.target.value)} />
            </Field>
            <Field label="Window closes" className="min-w-0">
              <Input type="date" value={closes} min={opens} onChange={(e) => setCloses(e.target.value)} />
            </Field>
          </div>
          {lateWindow ? <p className="-mt-3 text-[12px] text-rose">The window runs into the exam dates. Close it before {formatCalendarDate(session?.examStart ?? ACCA_TODAY)}.</p> : null}

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <MiniLabel>Cohorts</MiniLabel>
              <span className="text-[12px] text-ink-3 tnum">{learners} learners</span>
            </div>
            <CohortPicker author={author} paper={paper} value={cohortIds} onChange={setCohortIds} />
          </div>

          {hasCr ? (
            <Field label="Rubric for constructed responses">
              <Select value={rubricId} onChange={(e) => setRubricId(e.target.value)}>
                <option value="">No rubric</option>
                {paperRubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.status !== "published" ? " (not yet approved)" : ""}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Switch checked={proctored} onChange={setProctored} label="Proctored" sub="Webcam and screen checks, as in the CBE" />
        </div>
        <SaveBar author={author} noun="mock exam" onSave={save} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ rubric builder */

type Criterion = { id: string; label: string; marks: number; descriptors: string[] };

/** Name for a new rubric started from an existing one; a rubric saved in this session keeps its name. */
function copyName(r: LocalRubric | undefined) {
  if (!r) return "";
  return r.id.startsWith("rb-new") ? r.name : `${r.name} · Mar 2027 mocks`;
}

function fromRubric(r: LocalRubric | undefined): { levels: string[]; criteria: Criterion[] } {
  if (!r) return { levels: ["Strong", "Adequate", "Weak"], criteria: [{ id: "cr-1", label: "", marks: 10, descriptors: ["", "", ""] }] };
  const levels = r.criteria[0]?.descriptors.map((d) => d.band) ?? ["Strong", "Adequate", "Weak"];
  return {
    levels,
    criteria: r.criteria.map((c, i) => ({
      id: `cr-${i + 1}`,
      label: c.label,
      marks: c.marks,
      descriptors: levels.map((band) => c.descriptors.find((d) => d.band === band)?.text ?? ""),
    })),
  };
}

export function RubricBuilder({
  author,
  rubrics,
  seedId,
  nextId,
  onSave,
}: {
  author: Author;
  rubrics: LocalRubric[];
  seedId?: string;
  nextId: string;
  onSave: (rubric: LocalRubric) => void;
}) {
  const seed = rubrics.find((r) => r.id === seedId) ?? rubrics.find((r) => r.paper === author.papers[0]);
  const start = fromRubric(seed);
  const [from, setFrom] = useState(seed?.id ?? "blank");
  const [name, setName] = useState(copyName(seed));
  const [paper, setPaper] = useState<string>(seed?.paper ?? author.papers[0]);
  const [appliesTo, setAppliesTo] = useState(seed?.appliesTo ?? "");
  const [levels, setLevels] = useState<string[]>(start.levels);
  const [criteria, setCriteria] = useState<Criterion[]>(start.criteria);
  const [sample, setSample] = useState<Record<string, number>>({});

  const total = criteria.reduce((n, c) => n + (c.marks || 0), 0);
  const sampleTotal = criteria.reduce((n, c) => n + (sample[c.id] !== undefined ? bandMark(c.marks, sample[c.id], levels.length) : 0), 0);
  const sampled = criteria.filter((c) => sample[c.id] !== undefined).length;

  const load = (id: string) => {
    setFrom(id);
    const r = rubrics.find((x) => x.id === id);
    const next = fromRubric(r);
    setLevels(next.levels);
    setCriteria(next.criteria);
    setSample({});
    setName(copyName(r));
    setPaper(r?.paper ?? author.papers[0]);
    setAppliesTo(r?.appliesTo ?? "");
  };

  const patch = (id: string, p: Partial<Criterion>) => setCriteria((list) => list.map((c) => (c.id === id ? { ...c, ...p } : c)));
  const nextCriterionId = () => `cr-${criteria.reduce((m, c) => Math.max(m, Number(c.id.slice(3)) || 0), 0) + 1}`;

  const save = (draft: boolean) => {
    const finalName = name.trim();
    if (!finalName) {
      toast({ title: "Name the rubric", tone: "warning" });
      return;
    }
    if (criteria.some((c) => !c.label.trim())) {
      toast({ title: "Every criterion needs a label", tone: "warning" });
      return;
    }
    if (!draft && criteria.some((c) => c.descriptors.some((d) => !d.trim()))) {
      toast({ title: "Describe every level for every criterion", body: "Or save it as a draft and finish later.", tone: "warning" });
      return;
    }
    const status: LocalRubric["status"] = draft ? "draft" : author.canPublish ? "published" : "in-review";
    onSave({
      id: nextId,
      name: finalName,
      paper: paper ? (paper as PaperCode) : null,
      appliesTo: appliesTo.trim() || "Constructed-response answers",
      criteria: criteria.map((c) => ({
        id: c.label.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "") || c.id,
        label: c.label.trim(),
        marks: c.marks,
        descriptors: levels.map((band, i) => ({ band, text: c.descriptors[i] ?? "" })),
      })),
      createdBy: author.staffId,
      updated: ACCA_TODAY,
      status,
    });
    toast(
      status === "draft"
        ? { title: "Rubric saved as draft", body: finalName, tone: "neutral" }
        : status === "in-review"
          ? { title: "Rubric submitted for review", body: `${staffName(author.reviewerId)} is asked to approve ${finalName}.`, tone: "info" }
          : { title: "Rubric published", body: `${finalName} · ${plural(criteria.length, "criterion", "criteria")} · ${total} marks · available to mocks and evaluators` },
    );
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="min-w-0">
        <CardHeader title="Create evaluation rubrics" sub="Criteria, performance levels and marks. Evaluators see the preview on the right when they grade." />
        <div className="space-y-4 border-t border-line px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Start from" className="min-w-0">
              <Select value={from} onChange={(e) => load(e.target.value)}>
                <option value="blank">A blank rubric</option>
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Paper" className="min-w-0">
              <Select value={paper} onChange={(e) => setPaper(e.target.value)}>
                {author.papers.map((p) => (
                  <option key={p} value={p}>
                    {p} · {paperByCode(p)?.name}
                  </option>
                ))}
                <option value="">Any paper</option>
              </Select>
            </Field>
          </div>
          <Field label="Rubric name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. FR Section C constructed response" />
          </Field>
          <Field label="Applies to">
            <Input value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} placeholder="e.g. FR mock Section C and written case answers" />
          </Field>

          <div>
            <MiniLabel className="mb-2">Levels, highest first</MiniLabel>
            <div className="flex flex-wrap items-center gap-2">
              {levels.map((l, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span className="block w-28">
                    <Input
                      value={l}
                      onChange={(e) => setLevels((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                      aria-label={`Level ${i + 1}`}
                    />
                  </span>
                  {levels.length > 2 ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      aria-label={`Remove level ${l}`}
                      onClick={() => {
                        setLevels((list) => list.filter((_, j) => j !== i));
                        setCriteria((list) => list.map((c) => ({ ...c, descriptors: c.descriptors.filter((_, j) => j !== i) })));
                        setSample({});
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                  ) : null}
                </span>
              ))}
              {levels.length < 5 ? (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setLevels((list) => [...list, list.length === 3 ? "Not attempted" : `Level ${list.length + 1}`]);
                    setCriteria((list) => list.map((c) => ({ ...c, descriptors: [...c.descriptors, ""] })));
                    setSample({});
                  }}
                >
                  <Plus className="size-3.5" />
                  Add level
                </Button>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <MiniLabel>Criteria</MiniLabel>
              <span className="text-[12.5px] font-semibold text-ink tnum">{total} marks in total</span>
            </div>
            {criteria.map((c, n) => (
              <div key={c.id} className="space-y-2.5 rounded-[var(--radius-md)] border border-line p-3.5">
                <div className="flex items-end gap-2">
                  <Field label={`Criterion ${n + 1}`} className="min-w-0 flex-1">
                    <Input value={c.label} onChange={(e) => patch(c.id, { label: e.target.value })} placeholder="e.g. Analysis and interpretation" />
                  </Field>
                  <Field label="Marks" className="w-20 shrink-0">
                    <Input type="number" min={1} max={100} value={c.marks} onChange={(e) => patch(c.id, { marks: Number(e.target.value) })} />
                  </Field>
                  <Button
                    size="xs"
                    variant="ghost"
                    className="mb-2 shrink-0"
                    aria-label={`Remove criterion ${n + 1}`}
                    onClick={() => setCriteria((list) => list.filter((x) => x.id !== c.id))}
                    disabled={criteria.length === 1}
                  >
                    <X className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {levels.map((l, i) => (
                    <label key={i} className="block min-w-0">
                      <span className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
                        <span className="font-semibold text-ink-2">{l || `Level ${i + 1}`}</span>
                        <span className="font-mono text-ink-3">{bandRange(c.marks, i, levels.length)}</span>
                      </span>
                      <Textarea
                        rows={2}
                        value={c.descriptors[i] ?? ""}
                        onChange={(e) => patch(c.id, { descriptors: c.descriptors.map((d, j) => (j === i ? e.target.value : d)) })}
                        placeholder="What an answer at this level does"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCriteria((list) => [...list, { id: nextCriterionId(), label: "", marks: 5, descriptors: levels.map(() => "") }])}
            >
              <Plus className="size-3.5" />
              Add criterion
            </Button>
          </div>
        </div>
        <SaveBar author={author} noun="rubric" onSave={save} />
      </Card>

      <Card className="min-w-0 self-start">
        <CardHeader
          title="Preview"
          sub="As an evaluator sees it. Click a level on each criterion to score a sample script."
          action={
            sampled ? (
              <Button size="xs" variant="ghost" onClick={() => setSample({})}>
                Clear
              </Button>
            ) : null
          }
        />
        <div className="border-t border-line px-5 py-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {paper ? <PaperCodeChip code={paper} /> : null}
            <span className="min-w-0 flex-1 text-[14px] font-bold text-ink">{name || "Untitled rubric"}</span>
            <span className="text-[12.5px] text-ink-3">{appliesTo}</span>
          </div>
          <div className="scrollbar-slim overflow-x-auto rounded-[var(--radius-md)] border border-line">
            <table className="w-full min-w-[34rem] border-separate border-spacing-0 text-[12.5px]">
              <thead>
                <tr>
                  <th scope="col" className="w-40 border-b border-line bg-surface-2 px-3 py-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                    Criterion
                  </th>
                  {levels.map((l, i) => (
                    <th key={i} scope="col" className="border-b border-l border-line bg-surface-2 px-3 py-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                      {l || `Level ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.map((c) => (
                  <tr key={c.id}>
                    <th scope="row" className="border-b border-line px-3 py-2.5 text-left align-top font-semibold text-ink">
                      {c.label || "Unnamed criterion"}
                      <span className="mt-0.5 block font-mono text-[11.5px] font-normal text-ink-3">{plural(c.marks, "mark")}</span>
                    </th>
                    {levels.map((_, i) => {
                      const on = sample[c.id] === i;
                      return (
                        <td key={i} className="border-b border-l border-line p-0 align-top">
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSample((s) => ({ ...s, [c.id]: i }))}
                            className={cn("flex h-full w-full flex-col gap-1 px-3 py-2.5 text-left transition-colors", on ? "bg-cta-soft" : "hover:bg-surface-2")}
                          >
                            <span className={cn("font-mono text-[11.5px]", on ? "font-bold text-ink" : "text-ink-3")}>{bandRange(c.marks, i, levels.length)}</span>
                            <span className="leading-snug text-ink-2">{c.descriptors[i] || "Not described yet"}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] text-ink-2">
                Sample script{sampled < criteria.length ? ` · ${sampled} of ${criteria.length} criteria scored` : ""}
              </span>
              <span className="font-display text-[22px] font-bold text-ink tnum">
                {sampleTotal} <span className="text-[14px] text-ink-3">of {total}</span>
              </span>
            </div>
            <Progress value={total ? (sampleTotal / total) * 100 : 0} tone={total && sampleTotal / total >= 0.5 ? "jade" : "amber"} />
            <p className="text-[12px] text-ink-3">
              {sampled === criteria.length && total
                ? sampleTotal / total >= 0.5
                  ? "At or above the 50% pass mark for this question."
                  : "Below the 50% pass mark for this question."
                : "Each level awards the middle of its mark range in the sample."}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
