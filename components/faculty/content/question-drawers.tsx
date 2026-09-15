"use client";

import { useState } from "react";
import { CheckCircle2, ListPlus, Plus, Sparkles, X } from "lucide-react";
import {
  ACCA_TODAY,
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  evaluationRubrics,
  formatAccaDate,
  paperByCode,
  staffName,
  syllabusAreaTitle,
  universities,
  type BankQuestionType,
  type Difficulty,
  type PaperCode,
  type QuestionBank,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import {
  KEY_STATE,
  PROFESSIONAL_SKILLS,
  TYPE_SHORT,
  answerKeyFromGuide,
  expectedCrMarks,
  guideTotal,
  keyState,
  needsGuide,
  nextQuestionId,
  suggestPoints,
  type LocalQuestion,
  type MarkingPoint,
  type Requirement,
} from "./question-model";
import { ChipPicker, MiniLabel, PaperCodeChip, SyllabusAreaPicker, plural, type useAuthor } from "./shared";

type Author = ReturnType<typeof useAuthor>;

const DIFFICULTY_OPTIONS = (Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }));
const TYPE_OPTIONS: { value: BankQuestionType; label: string; sub: string }[] = [
  { value: "OT", label: "Objective test (OT)", sub: "One correct option from four" },
  { value: "MTQ", label: "Multi-task question (MTQ)", sub: "Scenario with several short tasks" },
  { value: "number", label: "Number entry", sub: "A figure marked within a tolerance" },
  { value: "CR", label: "Constructed response", sub: "Scenario, requirements with marks, professional marks" },
];

function uid(prefix: string, list: { id: string }[]) {
  const max = list.reduce((n, x) => Math.max(n, Number(x.id.split("-").pop()) || 0), 0);
  return `${prefix}-${max + 1}`;
}

function topicsFor(questions: LocalQuestion[], paper: PaperCode) {
  return Array.from(new Set(questions.filter((q) => q.paper === paper).map((q) => q.topic))).sort();
}

/* ------------------------------------------------------------------ editors */

export function MarkingGuideEditor({
  value,
  onChange,
  marks,
  disabled = false,
}: {
  value: MarkingPoint[];
  onChange: (next: MarkingPoint[]) => void;
  marks: number;
  disabled?: boolean;
}) {
  const total = guideTotal(value);
  const patch = (id: string, p: Partial<MarkingPoint>) => onChange(value.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const tone = total === marks ? "jade" : total > marks ? "rose" : "amber";

  return (
    <div className="space-y-2.5">
      {value.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-3 py-3 text-[12.5px] text-ink-3">
          No marking points yet. Add one for each thing a marker gives credit for.
        </p>
      ) : null}
      <ul className="space-y-2">
        {value.map((p, n) => (
          <li key={p.id} className="flex items-start gap-2">
            <span className="mt-2.5 w-5 shrink-0 text-right font-mono text-[11.5px] text-ink-3">{n + 1}</span>
            <div className="min-w-0 flex-1">
              <Input
                value={p.text}
                onChange={(e) => patch(p.id, { text: e.target.value })}
                placeholder="e.g. Goodwill at acquisition, NCI at fair value"
                aria-label={`Marking point ${n + 1}`}
                disabled={disabled}
              />
            </div>
            <div className="w-18 shrink-0">
              <Input
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={Number.isFinite(p.marks) ? p.marks : 0}
                onChange={(e) => patch(p.id, { marks: Number(e.target.value) })}
                aria-label={`Marks for point ${n + 1}`}
                className="text-right"
                disabled={disabled}
              />
            </div>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="mt-1.5 shrink-0"
              aria-label={`Remove marking point ${n + 1}`}
              onClick={() => onChange(value.filter((x) => x.id !== p.id))}
              disabled={disabled}
            >
              <X className="size-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" size="xs" variant="outline" onClick={() => onChange([...value, { id: uid("mp", value), text: "", marks: 1 }])} disabled={disabled}>
          <Plus className="size-3.5" />
          Add marking point
        </Button>
        <div className="ml-auto min-w-40 flex-1 basis-40">
          <div className="mb-1 flex justify-between text-[12px]">
            <span className="text-ink-3">Marks allocated</span>
            <span className={cn("font-semibold tnum", tone === "jade" ? "text-jade" : tone === "rose" ? "text-rose" : "text-amber")}>
              {total} of {marks}
            </span>
          </div>
          <Progress value={marks ? Math.min(100, (total / marks) * 100) : 0} tone={tone} />
        </div>
      </div>
    </div>
  );
}

function RequirementsEditor({
  value,
  onChange,
  kind,
}: {
  value: Requirement[];
  onChange: (next: Requirement[]) => void;
  kind: "CR" | "MTQ";
}) {
  const label = (n: number) => (kind === "CR" ? `(${String.fromCharCode(97 + n)})` : `Task ${n + 1}`);
  const relabel = (list: Requirement[]) => list.map((r, n) => ({ ...r, label: label(n) }));
  const patch = (id: string, p: Partial<Requirement>) => onChange(value.map((x) => (x.id === id ? { ...x, ...p } : x)));

  return (
    <div className="space-y-2.5">
      {value.map((r, n) => (
        <div key={r.id} className="space-y-2 rounded-[var(--radius-md)] border border-line p-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12.5px] font-bold text-ink">{r.label}</span>
            <span className="text-[12px] text-ink-3">{kind === "CR" ? "Requirement" : "Task"}</span>
            <label className="ml-auto flex items-center gap-2 text-[12px] text-ink-3">
              Marks
              <span className="block w-18">
                <Input
                  type="number"
                  min={1}
                  max={40}
                  value={r.marks}
                  onChange={(e) => patch(r.id, { marks: Number(e.target.value) })}
                  className="text-right"
                  aria-label={`Marks for ${r.label}`}
                />
              </span>
            </label>
            {value.length > 1 ? (
              <Button type="button" size="xs" variant="ghost" aria-label={`Remove ${r.label}`} onClick={() => onChange(relabel(value.filter((x) => x.id !== r.id)))}>
                <X className="size-3.5" />
              </Button>
            ) : null}
          </div>
          <Textarea
            rows={2}
            value={r.text}
            onChange={(e) => patch(r.id, { text: e.target.value })}
            placeholder={
              kind === "CR"
                ? n === 0
                  ? "e.g. Calculate goodwill on the acquisition of Sapling Co."
                  : "e.g. Discuss whether the non-controlling interest should be measured at fair value."
                : "e.g. Identify which of the following are employment status tests."
            }
            aria-label={`${r.label} text`}
          />
        </div>
      ))}
      {value.length < 6 ? (
        <Button
          type="button"
          size="xs"
          variant="outline"
          onClick={() => onChange(relabel([...value, { id: uid("rq", value), label: "", text: "", marks: kind === "CR" ? 5 : 2 }]))}
        >
          <ListPlus className="size-3.5" />
          {kind === "CR" ? "Add requirement" : "Add task"}
        </Button>
      ) : null}
    </div>
  );
}

export function KeyPill({ question }: { question: LocalQuestion }) {
  const s = KEY_STATE[keyState(question)];
  return <StatusPill status={s.label} tone={s.tone} size="sm" />;
}

/* ------------------------------------------------------------------ create a bank */

const PURPOSES = ["Topic practice", "Mock exam pool", "Revision and reattempt", "University variant"];

export function CreateBankDrawer({
  open,
  onClose,
  author,
  questions,
  nextId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  author: Author;
  questions: LocalQuestion[];
  nextId: string;
  onCreate: (bank: QuestionBank) => void;
}) {
  const [paper, setPaper] = useState<PaperCode>(author.papers[0]);
  const [purpose, setPurpose] = useState(PURPOSES[1]);
  const [universityId, setUniversityId] = useState("u-brightwater");
  const areas = paperByCode(paper)?.syllabusAreas ?? [];
  const [picked, setPicked] = useState<string[]>(areas.map((a) => a.code));
  const [seed, setSeed] = useState("published");
  const [name, setName] = useState<string | null>(null);

  const uni = universities.find((u) => u.id === universityId);
  const autoName = purpose === "University variant" ? `${paper} ${uni?.shortName ?? ""} bridging bank` : `${paper} ${purpose.toLowerCase()} bank`;
  const pool = questions.filter((q) => q.paper === paper && picked.includes(q.syllabusArea) && q.status === "published");
  const copied = seed === "published" ? pool : seed === "exam" ? pool.filter((q) => q.difficulty === "exam-standard") : [];

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create question bank"
      sub="A bank groups questions for one paper. Quizzes and mock exams draw from it by syllabus area, topic and difficulty."
      submitLabel="Create question bank"
      width="w-full max-w-xl"
      footerNote={author.canPublish ? undefined : `Questions you add go to ${staffName(author.reviewerId)} for review`}
      onSubmit={(data) => {
        if (picked.length === 0) {
          toast({ title: "Choose at least one syllabus area", tone: "warning" });
          return;
        }
        const finalName = (name ?? autoName).trim() || autoName;
        const description =
          String(data.get("description") ?? "").trim() ||
          `${purpose} for ${paperByCode(paper)?.name}, areas ${picked.join(", ")}${purpose === "University variant" && uni ? ` for ${uni.name}` : ""}.`;
        onCreate({
          id: nextId,
          name: finalName,
          paper,
          ownerId: author.staffId,
          questionIds: copied.map((q) => q.id),
          status: author.canPublish ? "published" : "draft",
          updated: ACCA_TODAY,
          description,
        });
        toast({
          title: "Question bank created",
          body: `${finalName} · ${copied.length ? `${plural(copied.length, "question")} copied in` : "empty, ready for questions"}`,
        });
        onClose();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paper">
          <Select
            value={paper}
            onChange={(e) => {
              const next = e.target.value as PaperCode;
              setPaper(next);
              setPicked((paperByCode(next)?.syllabusAreas ?? []).map((a) => a.code));
            }}
          >
            {author.papers.map((p) => (
              <option key={p} value={p}>
                {p} · {paperByCode(p)?.name}
              </option>
            ))}
          </Select>
        </Field>
        {purpose === "University variant" ? (
          <Field label="University">
            <Select value={universityId} onChange={(e) => setUniversityId(e.target.value)}>
              {universities.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>

      <div>
        <MiniLabel className="mb-2">Purpose</MiniLabel>
        <ChipPicker ariaLabel="Purpose" options={PURPOSES.map((p) => ({ value: p, label: p }))} value={[purpose]} onChange={(v) => setPurpose(v[0])} />
      </div>

      <Field label="Bank name">
        <Input value={name ?? autoName} onChange={(e) => setName(e.target.value)} required />
      </Field>

      <div>
        <MiniLabel className="mb-2">Syllabus areas covered</MiniLabel>
        <ChipPicker
          ariaLabel="Syllabus areas covered"
          multiple
          options={areas.map((a) => ({ value: a.code, label: `${a.code} · ${a.title}` }))}
          value={picked}
          onChange={setPicked}
        />
      </div>

      <Field label="Description" hint="Optional">
        <Textarea name="description" rows={2} placeholder="Who uses this bank and what it is for" />
      </Field>

      <fieldset className="space-y-2 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
        <legend className="px-1 text-[12.5px] font-semibold text-ink-2">Start with</legend>
        {[
          { id: "published", label: `Published ${paper} questions in these areas`, n: pool.length },
          { id: "exam", label: "Exam-standard questions only", n: pool.filter((q) => q.difficulty === "exam-standard").length },
          { id: "empty", label: "An empty bank", n: null },
        ].map((o) => (
          <label key={o.id} className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2">
            <input type="radio" name="seed" checked={seed === o.id} onChange={() => setSeed(o.id)} className="size-4 accent-nav-active" />
            <span className="min-w-0 flex-1">{o.label}</span>
            {o.n !== null ? <span className="font-mono text-[12px] text-ink-3">{plural(o.n, "question")}</span> : null}
          </label>
        ))}
      </fieldset>

      <Checkbox name="share" defaultChecked label={`Share with other faculty teaching ${paper}`} />
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ add a question */

export function AddQuestionDrawer({
  open,
  onClose,
  author,
  banks,
  questions,
  initialBankId,
  initialType = "OT",
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  author: Author;
  /** Banks the author may add to. */
  banks: QuestionBank[];
  questions: LocalQuestion[];
  initialBankId?: string;
  initialType?: BankQuestionType;
  onCreate: (question: LocalQuestion, bankId: string) => void;
}) {
  const [type, setType] = useState<BankQuestionType>(initialType);
  const [bankId, setBankId] = useState(banks.find((b) => b.id === initialBankId)?.id ?? banks[0]?.id ?? "");
  const bank = banks.find((b) => b.id === bankId) ?? banks[0];
  const paper = (bank?.paper ?? author.papers[0]) as PaperCode;

  const [area, setArea] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>(initialType === "CR" ? "exam-standard" : "intermediate");
  const [marks, setMarks] = useState(2);
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correct, setCorrect] = useState<number | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>(
    initialType === "MTQ"
      ? [
          { id: "rq-1", label: "Task 1", text: "", marks: 2 },
          { id: "rq-2", label: "Task 2", text: "", marks: 2 },
        ]
      : [
          { id: "rq-1", label: "(a)", text: "", marks: 8 },
          { id: "rq-2", label: "(b)", text: "", marks: 10 },
        ],
  );
  const [professional, setProfessional] = useState(paper === "SBR" ? 2 : 0);
  const [skill, setSkill] = useState(PROFESSIONAL_SKILLS[0]);
  const [guide, setGuide] = useState<MarkingPoint[]>([]);
  const [files, setFiles] = useState<string[]>([]);

  const long = needsGuide(type);
  const total = long ? requirements.reduce((n, r) => n + (r.marks || 0), 0) + (type === "CR" ? professional : 0) : marks;
  const rubrics = evaluationRubrics.filter((r) => r.paper === paper || r.paper === null);
  const expected = expectedCrMarks(paper);
  const topics = topicsFor(questions, paper);

  const changeType = (t: BankQuestionType) => {
    setType(t);
    setGuide([]);
    if (t === "CR") {
      setDifficulty("exam-standard");
      setRequirements([
        { id: "rq-1", label: "(a)", text: "", marks: 8 },
        { id: "rq-2", label: "(b)", text: "", marks: 10 },
      ]);
    }
    if (t === "MTQ")
      setRequirements([
        { id: "rq-1", label: "Task 1", text: "", marks: 2 },
        { id: "rq-2", label: "Task 2", text: "", marks: 2 },
      ]);
    if (t === "OT" || t === "number") setMarks(2);
  };

  const draftFromRequirements = () => {
    const pts: MarkingPoint[] = requirements.map((r, n) => ({
      id: `mp-${n + 1}`,
      text: `${r.label} ${r.text.trim() ? r.text.trim().slice(0, 70) : "Requirement"}`,
      marks: r.marks,
    }));
    if (type === "CR" && professional > 0) pts.push({ id: `mp-${pts.length + 1}`, text: `Professional marks: ${skill.toLowerCase()}`, marks: professional });
    setGuide(pts);
  };

  const submitLabel = author.canPublish ? "Publish question" : "Submit for review";

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={type === "CR" ? "Create constructed-response question" : "Add question"}
      sub="Tag it by paper, syllabus area, topic and difficulty, then write the answer key the marker uses."
      submitLabel={submitLabel}
      width="w-full max-w-2xl"
      footerNote={author.canPublish ? `Adds to ${bank?.name ?? "the bank"}` : `Goes to ${staffName(author.reviewerId)} for review`}
      onSubmit={(data) => {
        if (!bank) return;
        const draft = data.get("draft") === "on";
        const stem = String(data.get("stem") ?? "").trim();
        if (area.length === 0) {
          toast({ title: "Choose a syllabus area", body: "Every question is tagged to one.", tone: "warning" });
          return;
        }
        let answerKey = "";
        if (type === "OT") {
          if (options.some((o) => !o.trim()) || correct === null) {
            toast({ title: "Write all four options and mark the correct one", tone: "warning" });
            return;
          }
          answerKey = options[correct].trim();
        } else if (type === "number") {
          answerKey = String(data.get("value") ?? "").trim();
        } else {
          if (requirements.some((r) => !r.text.trim())) {
            toast({ title: `Write every ${type === "CR" ? "requirement" : "task"}`, tone: "warning" });
            return;
          }
          if (!draft && guideTotal(guide) !== total) {
            toast({ title: `Allocate all ${total} marks in the marking guide`, body: `${guideTotal(guide)} of ${total} allocated so far.`, tone: "warning" });
            return;
          }
          answerKey = answerKeyFromGuide(guide);
        }
        const status: LocalQuestion["status"] = draft ? "draft" : author.canPublish ? "published" : "in-review";
        const q: LocalQuestion = {
          id: nextQuestionId(questions, paper),
          bankId: bank.id,
          paper,
          syllabusArea: area[0],
          topic: topic.trim(),
          difficulty,
          type,
          marks: total,
          status,
          authorId: author.staffId,
          facilityIndex: null,
          usedIn: 0,
          stem: long ? requirements.map((r) => `${r.label} ${r.text.trim()}`).join(" ") : stem,
          answerKey,
          unit: type === "number" ? String(data.get("unit") ?? "").trim() || undefined : undefined,
          updated: ACCA_TODAY,
          options: type === "OT" ? options.map((o) => o.trim()) : undefined,
          correct: type === "OT" ? (correct ?? undefined) : undefined,
          tolerance: type === "number" ? String(data.get("tolerance") ?? "").trim() || undefined : undefined,
          scenario: long ? String(data.get("scenario") ?? "").trim() || undefined : undefined,
          requirements: long ? requirements : undefined,
          professionalMarks: type === "CR" && professional > 0 ? professional : undefined,
          professionalSkill: type === "CR" && professional > 0 ? skill : undefined,
          guide: long ? guide : undefined,
          rubricId: long ? String(data.get("rubric") ?? "") || undefined : undefined,
          explanation: String(data.get("explanation") ?? "").trim() || undefined,
        };
        onCreate(q, bank.id);
        const where = `${q.id} · ${paper} ${area[0]} · ${topic.trim()} · ${DIFFICULTY_LABELS[difficulty]}`;
        toast(
          status === "published"
            ? { title: `${QUESTION_TYPE_LABELS[type]} question published`, body: `${where}${files.length ? " · model answer attached" : ""}` }
            : status === "in-review"
              ? { title: "Question submitted for review", body: `${staffName(author.reviewerId)} is asked to review ${where}`, tone: "info" }
              : { title: "Question saved as draft", body: where, tone: "neutral" },
        );
        onClose();
      }}
    >
      <div>
        <MiniLabel className="mb-2">Question type</MiniLabel>
        <ChipPicker
          ariaLabel="Question type"
          options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label, sub: o.sub }))}
          value={[type]}
          onChange={(v) => changeType(v[0] as BankQuestionType)}
        />
        <p className="mt-1.5 text-[12px] text-ink-3">{TYPE_OPTIONS.find((o) => o.value === type)?.sub}</p>
      </div>

      <section className="space-y-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
        <MiniLabel>Tag questions by paper, topic and difficulty</MiniLabel>
        <Field label="Question bank">
          <Select
            value={bankId}
            onChange={(e) => {
              setBankId(e.target.value);
              setArea([]);
              const next = banks.find((b) => b.id === e.target.value);
              setProfessional(next?.paper === "SBR" ? 2 : 0);
            }}
          >
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.paper} · {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Syllabus area</p>
          <SyllabusAreaPicker paper={paper} value={area} onChange={setArea} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Topic">
            <Input
              list={`topics-${paper}`}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              placeholder={topics[0] ? `e.g. ${topics[0]}` : "Topic"}
            />
            <datalist id={`topics-${paper}`}>
              {topics.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </Field>
          <div>
            <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Difficulty</p>
            <ChipPicker ariaLabel="Difficulty" options={DIFFICULTY_OPTIONS} value={[difficulty]} onChange={(v) => setDifficulty(v[0] as Difficulty)} />
          </div>
        </div>
      </section>

      {type === "OT" || type === "number" ? (
        <>
          <Field label="Question">
            <Textarea
              name="stem"
              rows={3}
              required
              key={type}
              placeholder={
                type === "OT"
                  ? "e.g. Which of the following is an enhancing qualitative characteristic?"
                  : "e.g. P acquired 80% of S for $5,200k. NCI at fair value is $1,100k and net assets are $4,800k. What is goodwill?"
              }
            />
          </Field>
          <Field label="Marks">
            <div className="w-24">
              <Input type="number" min={1} max={4} value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
            </div>
          </Field>
        </>
      ) : null}

      {type === "OT" ? (
        <fieldset className="space-y-2">
          <legend className="mb-1 text-[12.5px] font-semibold text-ink-2">Options · choose the correct answer</legend>
          {options.map((o, n) => (
            <div key={n} className="flex items-center gap-2.5">
              <input
                type="radio"
                name="correct"
                checked={correct === n}
                onChange={() => setCorrect(n)}
                className="size-4 shrink-0 accent-nav-active"
                aria-label={`Option ${String.fromCharCode(65 + n)} is correct`}
              />
              <span className="w-4 shrink-0 font-mono text-[12.5px] font-bold text-ink-2">{String.fromCharCode(65 + n)}</span>
              <div className="min-w-0 flex-1">
                <Input value={o} onChange={(e) => setOptions((list) => list.map((x, i) => (i === n ? e.target.value : x)))} placeholder={`Option ${String.fromCharCode(65 + n)}`} aria-label={`Option ${String.fromCharCode(65 + n)}`} />
              </div>
            </div>
          ))}
        </fieldset>
      ) : null}

      {type === "number" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Correct answer">
            <Input name="value" required placeholder="1,500" inputMode="decimal" />
          </Field>
          <Field label="Tolerance" hint="±">
            <Input name="tolerance" placeholder="0" inputMode="decimal" />
          </Field>
          <Field label="Unit">
            <Input name="unit" placeholder="$000" />
          </Field>
        </div>
      ) : null}

      {long ? (
        <>
          <Field label={type === "CR" ? "Scenario and exhibits" : "Scenario"}>
            <Textarea
              name="scenario"
              rows={5}
              required
              key={type}
              placeholder={
                type === "CR"
                  ? "e.g. Pinto Co acquired 80% of Sapling Co on 1 July 2025. Exhibit 1 gives the statements of financial position; exhibit 2 the fair value information."
                  : "e.g. Ali has worked for Beacon Ltd for three years, uses his own tools and sets his own hours."
              }
            />
          </Field>
          <div className="space-y-2">
            <MiniLabel>{type === "CR" ? "Requirements with marks" : "Tasks with marks"}</MiniLabel>
            <RequirementsEditor value={requirements} onChange={setRequirements} kind={type === "CR" ? "CR" : "MTQ"} />
          </div>
          {type === "CR" ? (
            <div className="grid gap-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
              <Field label="Professional skills marks">
                <Input type="number" min={0} max={10} value={professional} onChange={(e) => setProfessional(Number(e.target.value))} />
              </Field>
              <Field label="Professional skill assessed">
                <Select value={skill} onChange={(e) => setSkill(e.target.value)} disabled={professional === 0}>
                  {PROFESSIONAL_SKILLS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-semibold text-ink">Total {total} marks</span>
            {type === "CR" && !expected.includes(total) ? (
              <StatusPill status={`${paper} constructed-response questions usually carry ${expected.join(" or ")} marks`} tone="amber" size="sm" dot={false} />
            ) : type === "CR" ? (
              <StatusPill status={`Matches the ${paper} exam format`} tone="jade" size="sm" dot={false} />
            ) : null}
          </div>
        </>
      ) : null}

      <section className="space-y-3 rounded-[var(--radius-md)] border border-line p-4">
        <MiniLabel>{long ? "Answer key and marking guide" : "Answer key"}</MiniLabel>
        {type === "OT" ? (
          <p className="text-[13px] text-ink-2">
            {correct === null ? "Choose the correct option above." : `Correct answer: ${String.fromCharCode(65 + correct)}${options[correct] ? ` · ${options[correct]}` : ""}`}
          </p>
        ) : null}
        {type === "number" ? <p className="text-[13px] text-ink-2">Marked correct when the answer is within the tolerance of the correct answer.</p> : null}
        {long ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] text-ink-3">One line per marking point. The total must match the question&apos;s {total} marks.</p>
              <Button type="button" size="xs" variant="ghost" onClick={draftFromRequirements}>
                <Sparkles className="size-3.5" />
                Draft from the requirements
              </Button>
            </div>
            <MarkingGuideEditor value={guide} onChange={setGuide} marks={total} />
            <Field label="Rubric for evaluators">
              <Select name="rubric" defaultValue={rubrics.find((r) => r.paper === paper)?.id ?? ""}>
                <option value="">No rubric</option>
                {rubrics.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </Field>
            <FileDrop label="Attach a model answer" accept=".pdf,.docx,.xlsx" hint="Released to learners after grading" onFiles={(all) => setFiles(all)} />
          </>
        ) : (
          <Field label="Explanation shown after the attempt" hint="Optional">
            <Textarea name="explanation" rows={2} placeholder="Why the answer is right and the common wrong route" />
          </Field>
        )}
      </section>

      <Checkbox name="draft" label={author.canPublish ? "Save as draft instead of publishing" : "Save as draft instead of submitting for review"} />
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ tag several questions */

export type QuestionTagPatch = { paper?: PaperCode; area?: string; topic?: string; difficulty?: Difficulty };

export function TagQuestionsDrawer({
  open,
  onClose,
  author,
  selected,
  questions,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  author: Author;
  selected: LocalQuestion[];
  questions: LocalQuestion[];
  onApply: (ids: string[], patch: QuestionTagPatch) => void;
}) {
  const own = selected.filter((q) => author.papers.includes(q.paper));
  const [picked, setPicked] = useState<string[]>(own.map((q) => q.id));
  const chosen = own.filter((q) => picked.includes(q.id));
  const currentPapers = Array.from(new Set(chosen.map((q) => q.paper)));
  const [paper, setPaper] = useState<string>("");
  const [area, setArea] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<string[]>([]);
  const target = (paper || (currentPapers.length === 1 ? currentPapers[0] : "")) as PaperCode | "";
  const areas = target ? (paperByCode(target)?.syllabusAreas ?? []) : [];

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Tag questions by paper, topic and difficulty"
      sub="Untick any question you want to leave alone. Fields left on Keep stay as they are."
      submitLabel={`Save tags on ${plural(chosen.length, "question")}`}
      disabled={own.length === 0}
      disabledReason="Select questions from your own papers"
      footerNote={selected.length > own.length ? `${plural(selected.length - own.length, "question")} from other papers left out` : undefined}
      onSubmit={() => {
        const patch: QuestionTagPatch = {
          paper: paper ? (paper as PaperCode) : undefined,
          area: area || undefined,
          topic: topic.trim() || undefined,
          difficulty: (difficulty[0] as Difficulty) || undefined,
        };
        if (chosen.length === 0) {
          toast({ title: "Tick at least one question", tone: "warning" });
          return;
        }
        if (!patch.paper && !patch.area && !patch.topic && !patch.difficulty) {
          toast({ title: "Change at least one tag", tone: "warning" });
          return;
        }
        onApply(
          chosen.map((q) => q.id),
          patch,
        );
        const parts = [
          patch.paper ? `paper ${patch.paper}` : null,
          patch.area ? `area ${patch.area}` : null,
          patch.topic ? `topic ${patch.topic}` : null,
          patch.difficulty ? DIFFICULTY_LABELS[patch.difficulty] : null,
        ].filter(Boolean);
        toast({ title: `Tags saved on ${plural(chosen.length, "question")}`, body: parts.join(" · ") });
        onClose();
      }}
    >
      <ul className="max-h-48 divide-y divide-line overflow-y-auto rounded-[var(--radius-md)] border border-line">
        {own.map((q) => {
          const on = picked.includes(q.id);
          return (
            <li key={q.id}>
              <label className="flex min-w-0 cursor-pointer items-center gap-2.5 px-3 py-2 text-[12.5px] hover:bg-cta-soft">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setPicked((list) => (on ? list.filter((x) => x !== q.id) : [...list, q.id]))}
                  className="size-4 shrink-0 accent-nav-active"
                />
                <span className="shrink-0 font-mono text-ink-3">{q.id}</span>
                <span className="min-w-0 flex-1 truncate text-ink">{q.topic}</span>
                <span className="hidden shrink-0 text-ink-3 sm:inline">
                  {q.paper} {q.syllabusArea} · {DIFFICULTY_LABELS[q.difficulty]}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Paper">
          <Select
            value={paper}
            onChange={(e) => {
              setPaper(e.target.value);
              setArea("");
            }}
          >
            <option value="">Keep current paper</option>
            {author.papers.map((p) => (
              <option key={p} value={p}>
                Move to {p} · {paperByCode(p)?.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Syllabus area" hint={target ? undefined : "Choose one paper first"}>
          <Select value={area} onChange={(e) => setArea(e.target.value)} disabled={!target}>
            <option value="">Keep current area</option>
            {areas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} · {a.title}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Topic">
        <Input list="tag-topics" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Keep current topics" />
        <datalist id="tag-topics">
          {(target ? topicsFor(questions, target) : []).map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </Field>
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Difficulty</p>
        <ChipPicker
          ariaLabel="Difficulty"
          options={[{ value: "", label: "Keep current" }, ...DIFFICULTY_OPTIONS]}
          value={[difficulty[0] ?? ""]}
          onChange={(v) => setDifficulty(v[0] ? v : [])}
        />
      </div>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ one question */

export function QuestionDrawer({
  open,
  onClose,
  author,
  question,
  questions,
  onSave,
  onStatus,
  onEditKey,
}: {
  open: boolean;
  onClose: () => void;
  author: Author;
  question: LocalQuestion;
  questions: LocalQuestion[];
  onSave: (id: string, patch: QuestionTagPatch) => void;
  onStatus: (id: string, status: LocalQuestion["status"]) => void;
  onEditKey: () => void;
}) {
  const own = author.papers.includes(question.paper);
  const [area, setArea] = useState(question.syllabusArea);
  const [topic, setTopic] = useState(question.topic);
  const [difficulty, setDifficulty] = useState<Difficulty>(question.difficulty);
  const q = question;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={q.topic}
      sub={`${q.id} · ${QUESTION_TYPE_LABELS[q.type]} · ${plural(q.marks, "mark")}`}
      submitLabel="Save tags"
      disabled={!own}
      disabledReason={`Only faculty assigned to ${q.paper} edit these questions. Author: ${staffName(q.authorId)}.`}
      width="w-full max-w-xl"
      footerNote={own ? undefined : `Owned by ${staffName(q.authorId)}`}
      onSubmit={() => {
        onSave(q.id, { area, topic: topic.trim() || q.topic, difficulty });
        toast({ title: "Tags saved", body: `${q.id} · ${q.paper} ${area} · ${topic.trim() || q.topic} · ${DIFFICULTY_LABELS[difficulty]}` });
        onClose();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <PaperCodeChip code={q.paper} />
        <StatusPill status={q.status} size="sm" />
        <KeyPill question={q} />
        <span className="text-[12px] text-ink-3">
          {staffName(q.authorId)} · updated {formatAccaDate(q.updated)}
        </span>
      </div>

      {q.scenario ? <p className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-ink-2">{q.scenario}</p> : null}
      <div className="rounded-[var(--radius-md)] border border-line px-3.5 py-3">
        {q.requirements && q.requirements.length > 1 ? (
          <ul className="space-y-1.5 text-[13.5px] leading-relaxed text-ink">
            {q.requirements.map((r) => (
              <li key={r.id}>
                <span className="font-mono font-bold">{r.label}</span> {r.text} <span className="text-ink-3">({plural(r.marks, "mark")})</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13.5px] leading-relaxed text-ink">{q.stem}</p>
        )}
        {q.options ? (
          <ol className="mt-2 space-y-1 text-[13px] text-ink-2">
            {q.options.map((o, n) => (
              <li key={n} className={cn(n === q.correct && "font-semibold text-jade")}>
                {String.fromCharCode(65 + n)}. {o}
              </li>
            ))}
          </ol>
        ) : null}
        {q.professionalMarks ? <p className="mt-2 text-[12.5px] text-ink-3">Plus {plural(q.professionalMarks, "professional mark")}</p> : null}
      </div>

      <dl className="grid grid-cols-3 gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3">
        {[
          ["Facility", q.facilityIndex === null ? "Not used" : `${Math.round(q.facilityIndex * 100)}%`],
          ["Used in", plural(q.usedIn, "test")],
          ["Marks", q.marks],
        ].map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">{k}</dt>
            <dd className="mt-0.5 truncate text-[14px] font-semibold text-ink tnum">{v}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <MiniLabel>Tag by paper, topic and difficulty</MiniLabel>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Syllabus area · {q.paper}</p>
          <ChipPicker
            ariaLabel="Syllabus area"
            disabled={!own}
            value={[area]}
            onChange={(v) => setArea(v[0])}
            options={(paperByCode(q.paper)?.syllabusAreas ?? []).map((a) => ({ value: a.code, label: `${a.code} · ${a.title}` }))}
          />
        </div>
        <Field label="Topic">
          <Input list={`topic-${q.id}`} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!own} />
          <datalist id={`topic-${q.id}`}>
            {topicsFor(questions, q.paper).map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </Field>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Difficulty</p>
          <ChipPicker ariaLabel="Difficulty" disabled={!own} options={DIFFICULTY_OPTIONS} value={[difficulty]} onChange={(v) => setDifficulty(v[0] as Difficulty)} />
        </div>
      </section>

      <section className="space-y-2">
        <MiniLabel>Answer key</MiniLabel>
        {q.guide?.length ? (
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {q.guide.map((p) => (
              <li key={p.id} className="flex items-start gap-3 px-3.5 py-2 text-[13px]">
                <span className="min-w-0 flex-1 text-ink-2">{p.text}</span>
                <span className="shrink-0 font-mono text-ink tnum">{p.marks}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[var(--radius-md)] border border-line px-3.5 py-2.5 text-[13px] text-ink-2">
            {q.answerKey || "No answer key yet."}
            {q.unit ? ` ${q.unit}` : ""}
            {q.tolerance ? ` · tolerance ±${q.tolerance}` : ""}
          </p>
        )}
        {own ? (
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={onEditKey}>
              {keyState(q) === "needs-points" || keyState(q) === "missing" ? "Create answer key" : "Edit answer key"}
            </Button>
            {q.status === "draft" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const next = author.canPublish ? "published" : "in-review";
                  onStatus(q.id, next);
                  toast(
                    author.canPublish
                      ? { title: `Published: ${q.id}`, body: `${q.topic} is available to quizzes and mocks.` }
                      : { title: "Submitted for review", body: `${staffName(author.reviewerId)} is asked to review ${q.id}.`, tone: "info" },
                  );
                  onClose();
                }}
              >
                {author.publishLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </section>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ answer keys */

function seedGuide(q?: LocalQuestion): MarkingPoint[] {
  if (!q || !needsGuide(q.type)) return [];
  if (q.guide?.length) return q.guide;
  return suggestPoints(q.answerKey);
}

export function AnswerKeyDrawer({
  open,
  onClose,
  questions,
  initialId,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  /** The author's own questions. */
  questions: LocalQuestion[];
  initialId?: string;
  onSave: (id: string, patch: Partial<LocalQuestion>) => void;
}) {
  const order = [...questions].sort((a, b) => KEY_STATE[keyState(a)].order - KEY_STATE[keyState(b)].order);
  const first = questions.find((q) => q.id === initialId) ?? order[0];
  const [qid, setQid] = useState(first?.id ?? "");
  const q = questions.find((x) => x.id === qid) ?? first;
  const [guide, setGuide] = useState<MarkingPoint[]>(seedGuide(first));
  const suggested = Boolean(q && needsGuide(q.type) && !q.guide?.length && guide.length);

  if (!q) return null;
  const long = needsGuide(q.type);
  const rubrics = evaluationRubrics.filter((r) => r.paper === q.paper || r.paper === null);

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create answer keys"
      sub="The key markers use: a correct answer for objective questions, marking points that add up to the marks for written ones."
      submitLabel="Save answer key"
      width="w-full max-w-xl"
      onSubmit={(data) => {
        if (long) {
          if (guide.some((p) => !p.text.trim())) {
            toast({ title: "Every marking point needs a description", tone: "warning" });
            return;
          }
          if (guideTotal(guide) !== q.marks) {
            toast({ title: `Allocate all ${q.marks} marks`, body: `${guideTotal(guide)} of ${q.marks} allocated so far.`, tone: "warning" });
            return;
          }
          onSave(q.id, { guide, answerKey: answerKeyFromGuide(guide), rubricId: String(data.get("rubric") ?? "") || undefined, updated: ACCA_TODAY });
          toast({ title: "Answer key saved", body: `${q.id} · ${plural(guide.length, "marking point")} · ${q.marks} marks` });
        } else {
          const key = String(data.get("key") ?? "").trim();
          if (!key) {
            toast({ title: "Write the answer key", tone: "warning" });
            return;
          }
          onSave(q.id, {
            answerKey: key,
            tolerance: String(data.get("tolerance") ?? "").trim() || undefined,
            unit: q.type === "number" ? String(data.get("unit") ?? "").trim() || undefined : q.unit,
            explanation: String(data.get("explanation") ?? "").trim() || undefined,
            updated: ACCA_TODAY,
          });
          toast({ title: "Answer key saved", body: `${q.id} · ${key}${q.type === "number" && data.get("unit") ? ` ${String(data.get("unit"))}` : ""}` });
        }
        onClose();
      }}
    >
      <Field label="Question">
        <Select
          value={q.id}
          onChange={(e) => {
            const next = questions.find((x) => x.id === e.target.value);
            setQid(e.target.value);
            setGuide(seedGuide(next));
          }}
        >
          {order.map((x) => (
            <option key={x.id} value={x.id}>
              {x.id} · {x.topic} · {KEY_STATE[keyState(x)].label.toLowerCase()}
            </option>
          ))}
        </Select>
      </Field>

      <div className="space-y-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <PaperCodeChip code={q.paper} />
          <span className="text-[12.5px] text-ink-2">
            {TYPE_SHORT[q.type]} · {q.syllabusArea} {syllabusAreaTitle(q.paper, q.syllabusArea)} · {plural(q.marks, "mark")}
          </span>
          <KeyPill question={q} />
        </div>
        <p className="text-[13px] leading-relaxed text-ink">{q.stem}</p>
      </div>

      {long ? (
        <>
          {suggested ? (
            <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-amber-soft px-3.5 py-2.5 text-[12.5px] leading-snug text-ink">
              <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber" />
              The current key lists what earns marks without the numbers. These points are drafted from it: give each its marks.
            </p>
          ) : null}
          {!suggested && q.guide?.length ? (
            <p className="flex items-center gap-2 text-[12.5px] text-jade">
              <CheckCircle2 className="size-3.5" />
              Marking guide complete. Edit the points or their marks below.
            </p>
          ) : null}
          <MarkingGuideEditor key={q.id} value={guide} onChange={setGuide} marks={q.marks} />
          <Field label="Rubric for evaluators">
            <Select name="rubric" key={`rubric-${q.id}`} defaultValue={q.rubricId ?? rubrics.find((r) => r.paper === q.paper)?.id ?? ""}>
              <option value="">No rubric</option>
              {rubrics.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <FileDrop key={`file-${q.id}`} label="Attach a model answer" accept=".pdf,.docx,.xlsx" hint="Released to learners after grading" />
        </>
      ) : (
        <>
          <div className={cn("grid gap-4", q.type === "number" ? "sm:grid-cols-3" : "")}>
            <Field label={q.type === "number" ? "Correct answer" : "Correct answer"} className={q.type === "number" ? "" : undefined}>
              <Input name="key" key={`key-${q.id}`} defaultValue={q.answerKey} required />
            </Field>
            {q.type === "number" ? (
              <>
                <Field label="Tolerance" hint="±">
                  <Input name="tolerance" key={`tol-${q.id}`} defaultValue={q.tolerance ?? "0"} inputMode="decimal" />
                </Field>
                <Field label="Unit">
                  <Input name="unit" key={`unit-${q.id}`} defaultValue={q.unit ?? ""} />
                </Field>
              </>
            ) : null}
          </div>
          <Field label="Explanation shown after the attempt" hint="Optional">
            <Textarea name="explanation" key={`exp-${q.id}`} rows={3} defaultValue={q.explanation ?? ""} placeholder="Why the answer is right and the common wrong route" />
          </Field>
        </>
      )}
    </FormDrawer>
  );
}
