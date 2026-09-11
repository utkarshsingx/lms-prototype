"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Compass,
  Eye,
  Flag,
  Lock,
  Minus,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Timer,
  X,
} from "lucide-react";
import type { Assessment, Question, Rubric } from "@/lib/data";
import { totalPoints } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Textarea } from "@/components/ui/field";
import { Progress, Ring } from "@/components/ui/progress";
import { DataRow } from "@/components/ui/misc";

type Answers = Record<string, number | number[] | string>;
type Answer = Answers[string];

const isWritten = (q: Question) =>
  q.type === "short" || q.type === "code" || q.type === "essay";

function isAnswered(q: Question, a: Answer | undefined) {
  if (a == null) return false;
  if (q.type === "match") return Array.isArray(a) && a.some((v) => v >= 0);
  if (Array.isArray(a)) return a.length > 0;
  if (typeof a === "string") return a.trim().length > 0;
  return true;
}

function pointsFor(q: Question, a: Answer | undefined): number {
  if (a == null) return 0;
  if (q.type === "match") {
    // a[i] is the original index of the right item paired with left row i.
    const pairs = q.pairs ?? [];
    if (!pairs.length || !Array.isArray(a)) return 0;
    const right = pairs.filter((_, n) => a[n] === n).length;
    return Math.floor((q.points * right) / pairs.length);
  }
  if (q.type === "mcq" || q.type === "truefalse")
    return a === q.answer ? q.points : 0;
  if (q.type === "multi") {
    const want = (q.answer as number[]) ?? [];
    const got = (a as number[]) ?? [];
    return want.length === got.length && want.every((x) => got.includes(x))
      ? q.points
      : 0;
  }
  // Short answers and code are held for review rather than auto-scored.
  return typeof a === "string" && a.trim().length > 20 ? q.points : 0;
}

const isCorrect = (q: Question, a: Answer | undefined) =>
  pointsFor(q, a) === q.points;

type ModuleStatus = "Tested out" | "Start here" | "Up next";

const STATUS_TONE = {
  "Tested out": "jade",
  "Start here": "brand",
  "Up next": "neutral",
} as const;

function placementFor(
  questions: Question[],
  answers: Answers,
  moduleCount: number,
) {
  const rows = Array.from({ length: moduleCount }, (_, index) => {
    const tested = questions.filter((x) => x.moduleIndex === index);
    const correct = tested.filter((x) => isCorrect(x, answers[x.id])).length;
    return {
      index,
      correct,
      total: tested.length,
      testedOut: tested.length > 0 && correct === tested.length,
    };
  });
  const start = rows.findIndex((r) => !r.testedOut);
  return {
    start,
    testedOut: rows.filter((r) => r.testedOut).length,
    modules: rows.map((r) => {
      const status: ModuleStatus = r.testedOut
        ? "Tested out"
        : r.index === start
          ? "Start here"
          : "Up next";
      return { ...r, status };
    }),
  };
}

/** Display order for a match question's right column: stable per question id,
 *  so it survives remounts, and never the answer key's own order. */
function matchOrder(seed: string, n: number) {
  let h = 2166136261;
  for (let k = 0; k < seed.length; k++) {
    h ^= seed.charCodeAt(k);
    h = Math.imul(h, 16777619);
  }
  const rand = () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: n }, (_, k) => k);
  for (let k = n - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [order[k], order[j]] = [order[j], order[k]];
  }
  return n > 1 && order.every((v, k) => v === k)
    ? [...order.slice(1), order[0]]
    : order;
}

type CellState = "current" | "answered" | "skipped" | "unvisited";

const CELL: Record<CellState, string> = {
  current: "border-brand bg-brand text-on-brand",
  answered: "border-jade/40 bg-jade-soft text-jade",
  skipped: "border-amber bg-amber-soft text-amber",
  unvisited: "border-line bg-surface text-ink-3",
};

const CELL_LABEL: Record<CellState | "flagged", string> = {
  answered: "Answered",
  skipped: "Skipped",
  current: "Current",
  flagged: "Flagged",
  unvisited: "Not visited",
};

const LEGEND = [
  "answered",
  "skipped",
  "current",
  "flagged",
  "unvisited",
] as const;

export function AssessmentRunner({
  assessment,
  rubric,
  courseTitle,
  courseSlug,
  moduleTitles = [],
}: {
  assessment: Assessment;
  rubric?: Rubric;
  courseTitle: string;
  courseSlug: string;
  /** The course's module titles in order. A diagnostic places against them. */
  moduleTitles?: string[];
}) {
  const [phase, setPhase] = useState<"intro" | "taking" | "result">("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [visited, setVisited] = useState<string[]>(() =>
    assessment.questions.slice(0, 1).map((x) => x.id),
  );
  const [skipped, setSkipped] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(assessment.minutes * 60);
  const [agreed, setAgreed] = useState(false);

  const questions = assessment.questions;
  const q = questions[i];
  const points = totalPoints(assessment);
  const diagnostic = assessment.kind === "Diagnostic";
  const moduleCount =
    moduleTitles.length ||
    questions.reduce((n, x) => Math.max(n, (x.moduleIndex ?? -1) + 1), 0);
  const moduleTitle = (k: number) => moduleTitles[k] ?? `Module ${k + 1}`;

  useEffect(() => {
    if (phase !== "taking" || !assessment.minutes) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, assessment.minutes]);

  const scored = useMemo(() => {
    const auto = questions.filter((x) => x.type !== "essay");
    const got = auto.reduce((n, x) => n + pointsFor(x, answers[x.id]), 0);
    const max = auto.reduce((n, x) => n + x.points, 0) || 1;
    return { got, max, pct: Math.round((got / max) * 100) };
  }, [answers, questions]);

  const answered = questions.filter((x) => isAnswered(x, answers[x.id])).length;
  // A question seen and left blank reads as skipped however the learner moved
  // on; the Skip button also records it while it is still the current one.
  const leftBlank = (x: Question, n: number) =>
    !isAnswered(x, answers[x.id]) &&
    (skipped.includes(x.id) || (n !== i && visited.includes(x.id)));
  const cellState = (x: Question, n: number): CellState =>
    n === i
      ? "current"
      : isAnswered(x, answers[x.id])
        ? "answered"
        : leftBlank(x, n)
          ? "skipped"
          : "unvisited";
  const skippedCount = questions.filter(leftBlank).length;

  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const lowTime = assessment.minutes > 0 && seconds < 300;

  const go = (n: number) => {
    const id = questions[n].id;
    setVisited((v) => (v.includes(id) ? v : [...v, id]));
    setI(n);
  };
  // From the last question, Skip wraps to the first one still unanswered.
  const skipTo =
    i < questions.length - 1
      ? i + 1
      : questions.findIndex((x, n) => n !== i && !isAnswered(x, answers[x.id]));
  const skip = () => {
    if (!isAnswered(q, answers[q.id]))
      setSkipped((s) => (s.includes(q.id) ? s : [...s, q.id]));
    if (skipTo >= 0) go(skipTo);
  };

  /* ------------------------------------------------------------- intro */
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <nav className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <Link href="/assessments" className="hover:text-ink">
            Assessments
          </Link>
          <span>/</span>
          <Link href={`/courses/${courseSlug}`} className="hover:text-ink">
            {courseTitle}
          </Link>
        </nav>

        <header>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={assessment.autoGraded ? "brand" : "violet"}>
              {assessment.kind}
            </Badge>
            {diagnostic ? <Badge tone="neutral">Not graded</Badge> : null}
            {assessment.proctored ? (
              <Badge tone="amber" dot>
                Proctored
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-3.5 font-display text-[clamp(1.9rem,1.5rem+1.8vw,2.8rem)] leading-[1.06] tracking-[var(--display-tracking)] text-ink">
            {assessment.title}
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
            {diagnostic
              ? `This is not graded. It only decides where you start in ${courseTitle}: modules you already know are marked as tested out, and the curriculum opens at the first one that is new to you.`
              : assessment.autoGraded
                ? "Graded the moment you submit. Every question shows you the reasoning afterwards, whether you got it right or not."
                : "Marked by an instructor against the rubric below. You can read the full rubric before you start, which is the point of having one."}
          </p>
        </header>

        <Card className="p-5 sm:p-6">
          <dl>
            <DataRow label="Questions">
              <span className="tnum">{questions.length}</span>
            </DataRow>
            {diagnostic ? (
              <DataRow label="Modules covered">
                <span className="tnum">{moduleCount}</span>
              </DataRow>
            ) : (
              <DataRow label="Total points">
                <span className="tnum">{points}</span>
              </DataRow>
            )}
            <DataRow label="Time limit">
              {assessment.minutes ? (
                <span className="tnum">{assessment.minutes} minutes</span>
              ) : (
                "None"
              )}
            </DataRow>
            <DataRow label="Attempts">
              <span className="tnum">
                {assessment.attempts} ·{" "}
                {diagnostic
                  ? "your placement is saved"
                  : "your best score counts"}
              </span>
            </DataRow>
            {diagnostic ? null : (
              <>
                <DataRow label="Pass mark">
                  <span className="tnum">{assessment.passMark}%</span>
                </DataRow>
                <DataRow label="Due">
                  {new Date(assessment.dueAt).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "long",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </DataRow>
              </>
            )}
          </dl>
        </Card>

        {assessment.proctored ? (
          <div className="flex gap-3.5 rounded-[var(--radius-lg)] border border-amber-soft bg-amber-soft p-4.5">
            <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-amber" />
            <div>
              <p className="text-[13.5px] font-semibold text-amber">
                This assessment is proctored
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                Leaving the tab is recorded and shown to your instructor with a
                timestamp. Nothing is captured from your camera or microphone,
                and no automated decision is made from the record — a person
                reads it if it is ever raised.
              </p>
            </div>
          </div>
        ) : null}

        {rubric ? (
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3.5">
              <p className="text-[14px] font-semibold text-ink">
                {rubric.name}
              </p>
              <p className="mt-0.5 text-[12.5px] text-ink-3 tnum">
                {rubric.criteria.length} criteria · {rubric.total} points
              </p>
            </div>
            <div className="divide-y divide-[var(--line)]">
              {rubric.criteria.map((c) => (
                <div key={c.id} className="px-5 py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[13.5px] font-medium text-ink">
                      {c.name}
                    </p>
                    <span className="shrink-0 text-[12px] text-ink-3 tnum">
                      {c.weight} pts
                    </span>
                  </div>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {c.levels.map((l) => (
                      <div
                        key={l.label}
                        className="rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2"
                      >
                        <p className="flex items-baseline justify-between text-[12px] font-semibold text-ink-2">
                          {l.label}
                          <span className="text-ink-3 tnum">{l.points}</span>
                        </p>
                        <p className="mt-1 text-[12px] leading-snug text-ink-3">
                          {l.descriptor}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : null}

        <Card className="p-5">
          {diagnostic ? (
            <p className="text-[13px] leading-relaxed text-ink-2">
              Answer from what you know rather than guessing. A lucky guess
              places you past a module you still need, and there is only one
              attempt.
            </p>
          ) : (
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              label={
                <>
                  I will complete this on my own. Using the assistant, another
                  person or another tab for answers is a policy breach, and the
                  platform records enough to make that checkable.
                </>
              }
            />
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={!diagnostic && !agreed}
              onClick={() => setPhase("taking")}
            >
              {diagnostic ? "Start diagnostic " : "Start "}
              {assessment.minutes ? `· ${assessment.minutes} min` : ""}
              <ArrowRight className="size-4" />
            </Button>
            <LinkButton
              href={diagnostic ? `/courses/${courseSlug}` : "/assessments"}
              variant="ghost"
              size="lg"
            >
              Not now
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  /* --------------------------------------------------------- placement */
  if (phase === "result" && diagnostic) {
    const place = placementFor(questions, answers, moduleCount);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="overflow-hidden">
          <div className="bg-brand-soft p-6 sm:p-8">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] text-brand uppercase">
              <Compass className="size-3.5" /> Your placement
            </p>
            <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-[var(--display-tracking)] text-ink tnum">
              {place.testedOut
                ? `You tested out of ${place.testedOut} of ${moduleCount} modules`
                : "You will start from module 1"}
            </h1>
            <p className="mt-1.5 max-w-xl text-[13.5px] leading-relaxed text-ink-2">
              {place.start < 0
                ? "Every module is marked as tested out. The whole course is open, and each module stays available if you want a refresher."
                : place.testedOut
                  ? "Modules you tested out of are marked complete and stay open for a refresher. The rest of the curriculum is unlocked from here."
                  : "The curriculum is unlocked from module 1, which is where you will get the most out of it."}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <LinkButton
                href={`/learn/${courseSlug}`}
                size="lg"
                className="h-auto! min-h-12 py-3 whitespace-normal!"
              >
                {place.start < 0
                  ? "Open the course"
                  : `Start at module ${place.start + 1}: ${moduleTitle(place.start)}`}
                <ArrowRight className="size-4 shrink-0" />
              </LinkButton>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                <Lock className="size-3.5" /> One attempt · your placement is
                saved
              </span>
            </div>
          </div>

          <ol className="divide-y divide-[var(--line)]">
            {place.modules.map((m) => (
              <li
                key={m.index}
                className="flex items-center gap-4 px-5 py-4 sm:px-6"
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[12.5px] font-semibold tnum",
                    m.status === "Tested out"
                      ? "bg-jade-soft text-jade"
                      : m.status === "Start here"
                        ? "bg-brand text-on-brand"
                        : "bg-surface-2 text-ink-2",
                  )}
                >
                  {m.status === "Tested out" ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    m.index + 1
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold tracking-[-0.01em] text-ink">
                    {moduleTitle(m.index)}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <Progress
                      value={m.total ? (m.correct / m.total) * 100 : 0}
                      tone={m.status === "Tested out" ? "jade" : "brand"}
                      className="w-20"
                      height={4}
                    />
                    <span className="text-[12px] text-ink-3 tnum">
                      {m.correct}/{m.total} correct
                    </span>
                  </div>
                </div>
                <Badge tone={STATUS_TONE[m.status]}>{m.status}</Badge>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-line px-5 py-3.5 sm:px-6">
            <p className="text-[14px] font-semibold text-ink">
              Question review
            </p>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              Every question with its reasoning, so you can check the placement
              for yourself.
            </p>
          </div>
          <QuestionReview questions={questions} answers={answers} diagnostic />
        </Card>

        <div className="flex flex-wrap gap-3">
          <LinkButton href={`/courses/${courseSlug}`} variant="secondary">
            Course overview
          </LinkButton>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ result */
  if (phase === "result") {
    const passed = scored.pct >= assessment.passMark;
    const needsReview = questions.some(isWritten);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Card className="overflow-hidden">
          <div
            className={cn(
              "flex flex-wrap items-center gap-6 p-6 sm:p-8",
              passed ? "bg-jade-soft" : "bg-ember-soft",
            )}
          >
            <Ring
              value={scored.pct}
              size={92}
              stroke={7}
              tone={passed ? "jade" : "ember"}
            />
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-[11px] font-semibold tracking-[0.14em] uppercase",
                  passed ? "text-jade" : "text-ember",
                )}
              >
                {passed ? "Passed" : "Not passed"}
              </p>
              <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-[var(--display-tracking)] text-ink tnum">
                {scored.got} of {scored.max} points
              </h1>
              <p className="mt-1.5 text-[13.5px] text-ink-2 tnum">
                Pass mark {assessment.passMark}% · attempt 1 of{" "}
                {assessment.attempts}
                {needsReview
                  ? " · written answers held for instructor review"
                  : ""}
              </p>
            </div>
          </div>

          <QuestionReview questions={questions} answers={answers} />
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setPhase("intro");
              setAnswers({});
              setI(0);
              setFlags([]);
              setVisited(questions.slice(0, 1).map((x) => x.id));
              setSkipped([]);
              setSeconds(assessment.minutes * 60);
              setAgreed(false);
            }}
          >
            <RotateCcw className="size-4" /> Retake
          </Button>
          <LinkButton href={`/learn/${courseSlug}`} variant="secondary">
            Back to the course
          </LinkButton>
          <LinkButton href="/assessments" className="ml-auto">
            All assessments
          </LinkButton>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ taking */
  return (
    <div className="mx-auto max-w-[72rem]">
      {/* Exam bar */}
      <div className="sticky top-14 z-30 -mx-4 mb-6 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <p className="text-[13.5px] font-semibold text-ink">
            {assessment.title}
          </p>
          <span className="text-[12.5px] text-ink-3 tnum">
            {answered} of {questions.length} answered
          </span>
          <Progress
            value={(answered / questions.length) * 100}
            className="w-24"
            height={4}
          />
          {assessment.minutes ? (
            <span
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-semibold tnum",
                lowTime
                  ? "border-transparent bg-rose-soft text-rose"
                  : "border-line bg-surface text-ink",
              )}
            >
              {lowTime ? (
                <AlertTriangle className="size-3.5" />
              ) : (
                <Clock className="size-3.5" />
              )}
              {clock}
            </span>
          ) : (
            <span className="ml-auto inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
              <Timer className="size-3.5" /> Untimed
            </span>
          )}
          <Button size="sm" onClick={() => setPhase("result")}>
            Submit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={q.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card className="p-5 sm:p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[11px] font-semibold tracking-[0.13em] text-ink-3 uppercase">
                    Question {i + 1} of {questions.length}
                  </span>
                  {diagnostic ? null : (
                    <Badge tone="neutral">{q.points} points</Badge>
                  )}
                  {q.type === "multi" ? (
                    <Badge tone="brand">Select all that apply</Badge>
                  ) : null}
                  {q.type === "match" ? (
                    <Badge tone="brand">Match each pair</Badge>
                  ) : null}
                  <button
                    onClick={() =>
                      setFlags((f) =>
                        f.includes(q.id)
                          ? f.filter((x) => x !== q.id)
                          : [...f, q.id],
                      )
                    }
                    className={cn(
                      "ml-auto inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                      flags.includes(q.id)
                        ? "border-transparent bg-amber-soft text-amber"
                        : "border-line text-ink-3 hover:text-ink",
                    )}
                  >
                    <Flag className="size-3" />
                    {flags.includes(q.id) ? "Flagged" : "Flag for review"}
                  </button>
                </div>

                <p className="mt-4 text-[16px] leading-[1.6] font-medium text-ink">
                  {q.prompt}
                </p>

                <div className="mt-5">
                  <QuestionInput
                    q={q}
                    value={answers[q.id]}
                    onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                  />
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-line pt-5">
                  <Button
                    variant="secondary"
                    disabled={i === 0}
                    onClick={() => go(i - 1)}
                  >
                    <ArrowLeft className="size-4" />
                    <span className="max-sm:sr-only">Previous</span>
                  </Button>
                  <Button variant="ghost" disabled={skipTo < 0} onClick={skip}>
                    Skip <SkipForward className="size-4" />
                  </Button>
                  {i === questions.length - 1 ? (
                    <Button onClick={() => setPhase("result")}>
                      Submit{" "}
                      <span className="max-sm:hidden">
                        {diagnostic ? "diagnostic" : "assessment"}
                      </span>
                    </Button>
                  ) : (
                    <Button onClick={() => go(i + 1)}>
                      Next <ArrowRight className="size-4" />
                    </Button>
                  )}
                  <span className="ml-auto text-[12px] text-ink-3">
                    Answers save as you type
                  </span>
                </div>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigator */}
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <Card className="p-4">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
              Navigator
            </p>
            <div className="mt-3 grid grid-cols-5 gap-1.5 lg:grid-cols-4">
              {questions.map((x, n) => {
                const state = cellState(x, n);
                const flagged = flags.includes(x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() => go(n)}
                    aria-current={n === i ? "step" : undefined}
                    aria-label={`Question ${n + 1}, ${CELL_LABEL[state].toLowerCase()}${flagged ? ", flagged" : ""}`}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-[var(--radius-sm)] border text-[12.5px] font-medium transition-colors tnum",
                      CELL[state],
                      state === "unvisited" && "hover:border-line-strong",
                    )}
                  >
                    {n + 1}
                    {flagged ? (
                      <span className="absolute top-0.5 right-0.5 size-1.5 rounded-full bg-amber" />
                    ) : null}
                  </button>
                );
              })}
            </div>

            <ul className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-5 lg:grid-cols-2">
              {LEGEND.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-1.5 text-[11.5px] text-ink-3"
                >
                  <span
                    className={cn(
                      "relative size-3 shrink-0 rounded-[calc(var(--radius-sm)*0.5)] border",
                      s === "flagged" ? CELL.unvisited : CELL[s],
                    )}
                  >
                    {s === "flagged" ? (
                      <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-amber" />
                    ) : null}
                  </span>
                  {CELL_LABEL[s]}
                </li>
              ))}
            </ul>

            <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-ink-3">Answered</dt>
                <dd className="font-medium text-ink tnum">
                  {answered}/{questions.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Skipped</dt>
                <dd className="font-medium text-ink tnum">{skippedCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Flagged</dt>
                <dd className="font-medium text-ink tnum">{flags.length}</dd>
              </div>
              {diagnostic ? null : (
                <div className="flex justify-between">
                  <dt className="text-ink-3">Points available</dt>
                  <dd className="font-medium text-ink tnum">{points}</dd>
                </div>
              )}
            </dl>

            {assessment.proctored ? (
              <p className="mt-4 flex gap-2 border-t border-line pt-3.5 text-[11.5px] leading-snug text-ink-3">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                Tab changes are recorded for this attempt.
              </p>
            ) : null}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function QuestionReview({
  questions,
  answers,
  diagnostic,
}: {
  questions: Question[];
  answers: Answers;
  diagnostic?: boolean;
}) {
  return (
    <div className="divide-y divide-[var(--line)]">
      {questions.map((x, n) => {
        const got = pointsFor(x, answers[x.id]);
        const written = isWritten(x);
        const ok = got === x.points;
        const partial = !ok && got > 0;
        return (
          <div key={x.id} className="flex gap-4 px-5 py-4 sm:px-6">
            <span
              className={cn(
                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                written
                  ? "bg-amber-soft text-amber"
                  : ok
                    ? "bg-jade text-on-accent"
                    : partial
                      ? "bg-ember-soft text-ember"
                      : "bg-rose text-on-accent",
              )}
            >
              {written ? (
                <Eye className="size-3.5" />
              ) : ok ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : partial ? (
                <Minus className="size-3.5" strokeWidth={3} />
              ) : (
                <X className="size-3.5" strokeWidth={3} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline justify-between gap-4">
                <span className="text-[13.5px] font-medium text-ink">
                  Question {n + 1}
                </span>
                <span className="shrink-0 text-[12px] text-ink-3 tnum">
                  {diagnostic && x.moduleIndex != null
                    ? `Module ${x.moduleIndex + 1}`
                    : `${written ? "pending" : got} / ${x.points}`}
                </span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                {x.prompt}
              </p>
              {x.type === "match" ? (
                <MatchReview q={x} value={answers[x.id]} got={got} />
              ) : null}
              {x.explanation ? (
                <p className="mt-2.5 rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed text-ink-2">
                  {x.explanation}
                </p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MatchReview({
  q,
  value,
  got,
}: {
  q: Question;
  value: Answer | undefined;
  got: number;
}) {
  const pairs = q.pairs ?? [];
  const cur = Array.isArray(value) ? value : [];
  const right = pairs.filter((_, n) => cur[n] === n).length;
  return (
    <div className="mt-3">
      <ul className="space-y-1.5">
        {pairs.map((p, n) => {
          const chosen = pairs[cur[n] ?? -1];
          const ok = cur[n] === n;
          return (
            <li
              key={p.left}
              className="flex gap-2.5 rounded-[var(--radius-sm)] border border-line bg-surface px-3 py-2"
            >
              <span
                className={cn(
                  "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                  ok ? "bg-jade-soft text-jade" : "bg-rose-soft text-rose",
                )}
              >
                {ok ? (
                  <Check className="size-2.5" strokeWidth={3.5} />
                ) : (
                  <X className="size-2.5" strokeWidth={3.5} />
                )}
              </span>
              <div className="min-w-0 flex-1 text-[12.5px] leading-snug">
                <p className="font-medium text-ink">
                  <span className="mr-1.5 font-mono text-[11px] text-ink-3">
                    {String.fromCharCode(65 + n)}
                  </span>
                  {p.left}
                </p>
                <p className="mt-1 flex gap-1.5 text-ink-2">
                  <ArrowRight className="mt-0.5 size-3 shrink-0 text-ink-3" />
                  {chosen ? chosen.right : "Not paired"}
                </p>
                {ok ? null : (
                  <p className="mt-1 text-ink-2">
                    <span className="font-medium text-ink">Correct:</span>{" "}
                    {p.right}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[12px] text-ink-3 tnum">
        {right} of {pairs.length} pairs correct · {got} of {q.points} points
      </p>
    </div>
  );
}

const PAIR_TONES = [
  "border-brand bg-brand-soft text-brand",
  "border-jade bg-jade-soft text-jade",
  "border-violet bg-violet-soft text-violet",
  "border-amber bg-amber-soft text-amber",
];

function PairChip({ slot }: { slot: number }) {
  if (slot < 0)
    return (
      <span
        aria-hidden
        className="mt-px size-5 shrink-0 rounded-full border border-dashed border-line-strong"
      />
    );
  return (
    <span
      aria-hidden
      className={cn(
        "mt-px grid size-5 shrink-0 place-items-center rounded-full border text-[11px] font-semibold tnum",
        PAIR_TONES[slot % PAIR_TONES.length],
      )}
    >
      {slot + 1}
    </span>
  );
}

function MatchInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
}) {
  const pairs = q.pairs ?? [];
  const order = useMemo(
    () => matchOrder(q.id, pairs.length),
    [q.id, pairs.length],
  );
  const cur =
    Array.isArray(value) && value.length === pairs.length
      ? value
      : pairs.map(() => -1);
  // Chip numbers are slots: a new pair takes the lowest free number, so
  // undoing one pair never renumbers the others.
  const [slots, setSlots] = useState<number[]>(() => {
    let k = 0;
    return cur.map((v) => (v >= 0 ? k++ : -1));
  });
  const [pick, setPick] = useState<{ side: "left" | "right"; n: number } | null>(
    null,
  );
  const paired = cur.filter((v) => v >= 0).length;

  const set = (row: number, right: number) => {
    const next = [...cur];
    const nextSlots = [...slots];
    next[row] = right;
    if (right < 0) nextSlots[row] = -1;
    else {
      let s = 0;
      while (nextSlots.includes(s)) s++;
      nextSlots[row] = s;
    }
    setSlots(nextSlots);
    onChange(next);
  };

  const pressLeft = (row: number) => {
    if (cur[row] >= 0) return set(row, -1);
    if (pick?.side === "right") {
      set(row, pick.n);
      return setPick(null);
    }
    setPick(pick?.side === "left" && pick.n === row ? null : { side: "left", n: row });
  };

  const pressRight = (r: number) => {
    const row = cur.indexOf(r);
    if (row >= 0) return set(row, -1);
    if (pick?.side === "left") {
      set(pick.n, r);
      return setPick(null);
    }
    setPick(pick?.side === "right" && pick.n === r ? null : { side: "right", n: r });
  };

  const optionClass = (on: boolean, isPaired: boolean) =>
    cn(
      "flex w-full items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all",
      on
        ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
        : isPaired
          ? "border-line-strong bg-surface-2"
          : "border-line bg-surface hover:border-line-strong",
    );

  return (
    <div className="@container">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-[12.5px] text-ink-3">
          {pick
            ? pick.side === "left"
              ? `Now choose the match for ${String.fromCharCode(65 + pick.n)}.`
              : "Now choose the item it belongs to."
            : "Choose an item, then its match. Choose a paired item to undo it."}
        </p>
        <span
          aria-live="polite"
          className="text-[12px] font-medium text-ink-2 tnum"
        >
          {paired} of {pairs.length} paired
        </span>
      </div>

      <div className="grid gap-4 @lg:grid-cols-2 @lg:gap-5">
        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
            Items
          </p>
          <div className="grid gap-2">
            {pairs.map((p, row) => {
              const letter = String.fromCharCode(65 + row);
              const on = pick?.side === "left" && pick.n === row;
              const slot = cur[row] >= 0 ? slots[row] : -1;
              return (
                <button
                  key={p.left}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${letter}. ${p.left}${slot >= 0 ? `, pair ${slot + 1}` : ""}`}
                  onClick={() => pressLeft(row)}
                  className={optionClass(on, slot >= 0)}
                >
                  <span
                    className={cn(
                      "mt-px grid size-5 shrink-0 place-items-center rounded-[var(--radius-xs)] border font-mono text-[11px] font-semibold",
                      on
                        ? "border-brand bg-brand text-on-brand"
                        : "border-line-strong text-ink-3",
                    )}
                  >
                    {letter}
                  </span>
                  <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-2">
                    {p.left}
                  </span>
                  <PairChip slot={slot} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-2 text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
            Matches
          </p>
          <div className="grid gap-2">
            {order.map((r) => {
              const row = cur.indexOf(r);
              const on = pick?.side === "right" && pick.n === r;
              const slot = row >= 0 ? slots[row] : -1;
              return (
                <button
                  key={pairs[r].right}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${pairs[r].right}${slot >= 0 ? `, pair ${slot + 1}` : ""}`}
                  onClick={() => pressRight(r)}
                  className={optionClass(on, slot >= 0)}
                >
                  <PairChip slot={slot} />
                  <span className="min-w-0 flex-1 text-[14px] leading-relaxed text-ink-2">
                    {pairs[r].right}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
}) {
  if (q.type === "match") {
    return <MatchInput q={q} value={value} onChange={onChange} />;
  }

  if (q.type === "mcq" || q.type === "truefalse") {
    return (
      <div className="grid gap-2">
        {(q.options ?? []).map((o, n) => {
          const on = value === n;
          return (
            <button
              key={o}
              onClick={() => onChange(n)}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all",
                on
                  ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "mt-px grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold",
                  on
                    ? "border-brand bg-brand text-on-brand"
                    : "border-line-strong text-ink-3",
                )}
              >
                {String.fromCharCode(65 + n)}
              </span>
              <span className="text-[14px] leading-relaxed text-ink-2">{o}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "multi") {
    const cur = (value as number[]) ?? [];
    return (
      <div className="grid gap-2">
        {(q.options ?? []).map((o, n) => {
          const on = cur.includes(n);
          return (
            <button
              key={o}
              onClick={() =>
                onChange(on ? cur.filter((x) => x !== n) : [...cur, n])
              }
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all",
                on
                  ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "mt-px grid size-5 shrink-0 place-items-center rounded-[5px] border",
                  on
                    ? "border-brand bg-brand text-on-brand"
                    : "border-line-strong",
                )}
              >
                {on ? <Check className="size-3" strokeWidth={3.5} /> : null}
              </span>
              <span className="text-[14px] leading-relaxed text-ink-2">{o}</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (q.type === "code") {
    return (
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-line">
        <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
          <span className="font-mono text-[12px] text-ink-3">raft.go</span>
          <span className="ml-auto text-[11.5px] text-ink-3">
            Go 1.23 · tests run on submit
          </span>
        </div>
        <textarea
          value={(value as string) ?? q.starter ?? ""}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          rows={12}
          className="w-full resize-y bg-stage p-4 font-mono text-[12.5px] leading-[1.7] text-stage-ink focus:outline-none"
        />
      </div>
    );
  }

  return (
    <div>
      <Textarea
        rows={q.type === "essay" ? 12 : 5}
        value={(value as string) ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          q.type === "essay"
            ? "Write your response. Markdown is supported, and you can paste a link to a document instead."
            : "One or two sentences is enough."
        }
      />
      <p className="mt-2 text-[12px] text-ink-3 tnum">
        {((value as string) ?? "").trim().split(/\s+/).filter(Boolean).length}{" "}
        words · reviewed by an instructor
      </p>
    </div>
  );
}
