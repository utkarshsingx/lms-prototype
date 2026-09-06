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
  Eye,
  Flag,
  RotateCcw,
  ShieldCheck,
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

function isCorrect(q: Question, a: Answers[string] | undefined) {
  if (a == null) return false;
  if (q.type === "mcq" || q.type === "truefalse") return a === q.answer;
  if (q.type === "multi") {
    const want = (q.answer as number[]) ?? [];
    const got = (a as number[]) ?? [];
    return want.length === got.length && want.every((x) => got.includes(x));
  }
  // Short answers and code are held for review rather than auto-scored.
  return typeof a === "string" && a.trim().length > 20;
}

export function AssessmentRunner({
  assessment,
  rubric,
  courseTitle,
  courseSlug,
}: {
  assessment: Assessment;
  rubric?: Rubric;
  courseTitle: string;
  courseSlug: string;
}) {
  const [phase, setPhase] = useState<"intro" | "taking" | "result">("intro");
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [flags, setFlags] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(assessment.minutes * 60);
  const [agreed, setAgreed] = useState(false);

  const questions = assessment.questions;
  const q = questions[i];
  const points = totalPoints(assessment);

  useEffect(() => {
    if (phase !== "taking" || !assessment.minutes) return;
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, assessment.minutes]);

  const scored = useMemo(() => {
    const auto = questions.filter((x) => x.type !== "essay");
    const got = auto.reduce(
      (n, x) => n + (isCorrect(x, answers[x.id]) ? x.points : 0),
      0,
    );
    const max = auto.reduce((n, x) => n + x.points, 0) || 1;
    return { got, max, pct: Math.round((got / max) * 100) };
  }, [answers, questions]);

  const answered = questions.filter((x) => answers[x.id] != null).length;
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const lowTime = assessment.minutes > 0 && seconds < 300;

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
            {assessment.autoGraded
              ? "Graded the moment you submit. Every question shows you the reasoning afterwards, whether you got it right or not."
              : "Marked by an instructor against the rubric below. You can read the full rubric before you start, which is the point of having one."}
          </p>
        </header>

        <Card className="p-5 sm:p-6">
          <dl>
            <DataRow label="Questions">
              <span className="tnum">{questions.length}</span>
            </DataRow>
            <DataRow label="Total points">
              <span className="tnum">{points}</span>
            </DataRow>
            <DataRow label="Time limit">
              {assessment.minutes ? (
                <span className="tnum">{assessment.minutes} minutes</span>
              ) : (
                "None"
              )}
            </DataRow>
            <DataRow label="Attempts">
              <span className="tnum">
                {assessment.attempts} · your best score counts
              </span>
            </DataRow>
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              disabled={!agreed}
              onClick={() => setPhase("taking")}
            >
              Start {assessment.minutes ? `· ${assessment.minutes} min` : ""}
              <ArrowRight className="size-4" />
            </Button>
            <LinkButton href="/assessments" variant="ghost" size="lg">
              Not now
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  /* ------------------------------------------------------------ result */
  if (phase === "result") {
    const passed = scored.pct >= assessment.passMark;
    const needsReview = questions.some(
      (x) => x.type === "short" || x.type === "code" || x.type === "essay",
    );
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

          <div className="divide-y divide-[var(--line)]">
            {questions.map((x, n) => {
              const ok = isCorrect(x, answers[x.id]);
              const written =
                x.type === "short" || x.type === "code" || x.type === "essay";
              return (
                <div key={x.id} className="flex gap-4 px-5 py-4 sm:px-6">
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                      written
                        ? "bg-amber-soft text-amber"
                        : ok
                          ? "bg-jade text-on-accent"
                          : "bg-rose text-on-accent",
                    )}
                  >
                    {written ? (
                      <Eye className="size-3.5" />
                    ) : ok ? (
                      <Check className="size-3.5" strokeWidth={3} />
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
                        {written ? "pending" : ok ? x.points : 0} / {x.points}
                      </span>
                    </p>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                      {x.prompt}
                    </p>
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
        </Card>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setPhase("intro");
              setAnswers({});
              setI(0);
              setFlags([]);
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
                  <Badge tone="neutral">{q.points} points</Badge>
                  {q.type === "multi" ? (
                    <Badge tone="brand">Select all that apply</Badge>
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

                <div className="mt-7 flex items-center gap-3 border-t border-line pt-5">
                  <Button
                    variant="secondary"
                    disabled={i === 0}
                    onClick={() => setI((n) => n - 1)}
                  >
                    <ArrowLeft className="size-4" /> Previous
                  </Button>
                  {i === questions.length - 1 ? (
                    <Button onClick={() => setPhase("result")}>
                      Submit assessment
                    </Button>
                  ) : (
                    <Button onClick={() => setI((n) => n + 1)}>
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
                const has = answers[x.id] != null;
                const flagged = flags.includes(x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() => setI(n)}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-[var(--radius-sm)] border text-[12.5px] font-medium transition-colors tnum",
                      n === i
                        ? "border-brand bg-brand text-on-brand"
                        : has
                          ? "border-line bg-surface-2 text-ink"
                          : "border-line bg-surface text-ink-3 hover:border-line-strong",
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

            <dl className="mt-4 space-y-1.5 border-t border-line pt-3.5 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-ink-3">Answered</dt>
                <dd className="font-medium text-ink tnum">
                  {answered}/{questions.length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Flagged</dt>
                <dd className="font-medium text-ink tnum">{flags.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-3">Points available</dt>
                <dd className="font-medium text-ink tnum">{points}</dd>
              </div>
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

function QuestionInput({
  q,
  value,
  onChange,
}: {
  q: Question;
  value: Answers[string] | undefined;
  onChange: (v: Answers[string]) => void;
}) {
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
