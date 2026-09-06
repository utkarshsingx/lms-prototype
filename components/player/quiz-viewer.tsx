"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { Lesson } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const QUESTIONS = [
  {
    prompt:
      "A 5-node cluster is partitioned 3/2. Which side can commit new entries?",
    options: [
      "Neither, until the partition heals",
      "The 3-node side, because it holds a majority",
      "The 2-node side, if it held the leader",
      "Both, each with its own log",
    ],
    answer: 1,
    why: "Commitment needs a quorum of 3. The minority side may still have the old leader, but it cannot advance the commit index — so at worst it serves stale reads, and never commits.",
  },
  {
    prompt: "What does R + W > N buy you?",
    options: [
      "Lower write latency",
      "Overlapping read and write quorums, so a read sees the last write",
      "Automatic conflict resolution",
      "Tolerance of N − 1 node failures",
    ],
    answer: 1,
    why: "The inequality guarantees every read set shares at least one node with the last write set. That overlap is what makes read-your-writes hold.",
  },
];

export function QuizViewer({ lesson }: { lesson: Lesson }) {
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUESTIONS[i];
  const correct = picked === q.answer;

  function submit() {
    if (picked == null) return;
    setChecked(true);
    if (picked === q.answer) setScore((s) => s + 1);
  }

  function next() {
    if (i + 1 >= QUESTIONS.length) return setDone(true);
    setI((n) => n + 1);
    setPicked(null);
    setChecked(false);
  }

  function restart() {
    setI(0);
    setPicked(null);
    setChecked(false);
    setScore(0);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((score / QUESTIONS.length) * 100);
    const passed = pct >= 60;
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center shadow-[var(--shadow-e2)]">
        <span
          className={cn(
            "mx-auto grid size-14 place-items-center rounded-full",
            passed ? "bg-jade-soft text-jade" : "bg-rose-soft text-rose",
          )}
        >
          {passed ? (
            <Check className="size-6" strokeWidth={2.5} />
          ) : (
            <X className="size-6" strokeWidth={2.5} />
          )}
        </span>
        <h3 className="mt-5 font-display text-[1.9rem] leading-tight tracking-[var(--display-tracking)] text-ink tnum">
          {pct}%
        </h3>
        <p className="mt-1.5 text-[14px] text-ink-2 tnum">
          {score} of {QUESTIONS.length} correct ·{" "}
          {passed ? "lesson complete" : "60% needed to pass"}
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={restart}>
            <RotateCcw className="size-3.5" /> Try again
          </Button>
          {passed ? <Button size="sm">Continue to next lesson</Button> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e2)]">
      <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
        <Badge tone="brand">Knowledge check</Badge>
        <span className="text-[12.5px] text-ink-3 tnum">
          Question {i + 1} of {QUESTIONS.length}
        </span>
        <span className="ml-auto flex gap-1">
          {QUESTIONS.map((_, n) => (
            <span
              key={n}
              className={cn(
                "h-1 w-6 rounded-full",
                n < i ? "bg-jade" : n === i ? "bg-brand" : "bg-surface-3",
              )}
            />
          ))}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <p className="text-[15.5px] leading-relaxed font-medium text-ink">
          {q.prompt}
        </p>

        <div className="mt-4 grid gap-2">
          {q.options.map((o, n) => {
            const isPicked = picked === n;
            const isAnswer = n === q.answer;
            const show = checked;
            return (
              <button
                key={o}
                disabled={checked}
                onClick={() => setPicked(n)}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-all",
                  show && isAnswer
                    ? "border-jade bg-jade-soft"
                    : show && isPicked
                      ? "border-rose bg-rose-soft"
                      : isPicked
                        ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
                        : "border-line bg-surface hover:border-line-strong",
                )}
              >
                <span
                  className={cn(
                    "mt-px grid size-5 shrink-0 place-items-center rounded-full border font-mono text-[11px] font-semibold",
                    show && isAnswer
                      ? "border-jade bg-jade text-on-accent"
                      : show && isPicked
                        ? "border-rose bg-rose text-on-accent"
                        : isPicked
                          ? "border-brand bg-brand text-on-brand"
                          : "border-line-strong text-ink-3",
                  )}
                >
                  {show && isAnswer ? (
                    <Check className="size-3" strokeWidth={3} />
                  ) : show && isPicked ? (
                    <X className="size-3" strokeWidth={3} />
                  ) : (
                    String.fromCharCode(65 + n)
                  )}
                </span>
                <span className="text-[13.5px] leading-relaxed text-ink-2">
                  {o}
                </span>
              </button>
            );
          })}
        </div>

        {checked ? (
          <div
            className={cn(
              "mt-4 rounded-[var(--radius-md)] border px-4 py-3",
              correct
                ? "border-jade-soft bg-jade-soft"
                : "border-amber-soft bg-amber-soft",
            )}
          >
            <p
              className={cn(
                "text-[12.5px] font-semibold",
                correct ? "text-jade" : "text-amber",
              )}
            >
              {correct ? "Correct" : "Not quite"}
            </p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
              {q.why}
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex items-center gap-3">
          {checked ? (
            <Button size="sm" onClick={next}>
              {i + 1 >= QUESTIONS.length ? "See result" : "Next question"}
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={picked == null}>
              Check answer
            </Button>
          )}
          <span className="text-[12px] text-ink-3">
            {lesson.minutes} min · unlimited attempts · not graded
          </span>
        </div>
      </div>
    </div>
  );
}
