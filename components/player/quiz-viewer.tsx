"use client";

import { useState } from "react";
import { Check, RotateCcw, X } from "lucide-react";
import type { Lesson } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PASS_MARK = 50;

const QUESTIONS = [
  {
    prompt:
      "P acquires 80% of S. Consideration is $5,200k, NCI at fair value is $1,100k and S's net assets at acquisition, including a $500k fair value uplift on land, are $4,800k. What is goodwill on acquisition?",
    options: ["$1,500k", "$1,360k", "$2,000k", "$400k"],
    answer: 0,
    why: "Goodwill is consideration plus NCI less net assets: 5,200 + 1,100 − 4,800 = $1,500k. $1,360k measures NCI at its proportionate share (20% of 4,800 = 960), $2,000k leaves out the land uplift and $400k ignores NCI altogether.",
  },
  {
    prompt:
      "Under IFRS 3, how are legal and professional fees incurred on an acquisition treated in the consolidated financial statements?",
    options: [
      "Added to the consideration, so they increase goodwill",
      "Expensed to profit or loss as incurred",
      "Deducted from the subsidiary's net assets at acquisition",
      "Charged to other comprehensive income",
    ],
    answer: 1,
    why: "IFRS 3 requires acquisition-related costs to be expensed as incurred. They are never part of consideration, so they do not affect goodwill. Costs of issuing shares or debt are the exception and follow IAS 32 and IFRS 9.",
  },
  {
    prompt:
      "Goodwill of $1,500k is impaired by $300k. NCI is measured at fair value and the parent holds 80%. How much of the impairment reduces group retained earnings?",
    options: ["$300k", "$240k", "$60k", "Nothing: goodwill is amortised instead"],
    answer: 1,
    why: "With NCI at fair value, goodwill includes the NCI's share, so the impairment is split in the holding proportions: 80% × 300 = $240k against group retained earnings and 20% × 300 = $60k against NCI. Under the proportionate method all $300k would go to the group. Goodwill is never amortised.",
  },
  {
    prompt:
      "Which of these is included in the subsidiary's net assets at acquisition when calculating goodwill?",
    options: [
      "Profit the subsidiary earned after the acquisition date",
      "The fair value uplift on the subsidiary's land at acquisition",
      "The parent's share premium from the shares it issued",
      "Dividends the parent paid in the year",
    ],
    answer: 1,
    why: "Goodwill compares consideration and NCI with the fair value of the net assets acquired, so fair value adjustments at the acquisition date are included. Post-acquisition profit arises after control passes and is shared between group reserves and NCI instead.",
  },
];

export function QuizViewer({
  lesson,
  onContinue,
}: {
  lesson: Lesson;
  /** Called by "Continue to next lesson" once the check is passed. */
  onContinue?: () => void;
}) {
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
    const passed = pct >= PASS_MARK;
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-8 text-center">
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
          {passed
            ? "lesson complete"
            : `${PASS_MARK}% needed, the same as the ACCA pass mark`}
        </p>
        <div className="mt-5 flex justify-center gap-2.5">
          <Button variant="secondary" size="sm" onClick={restart}>
            <RotateCcw className="size-3.5" /> Try again
          </Button>
          {passed && onContinue ? (
            <Button size="sm" onClick={onContinue}>
              Continue to next lesson
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
        <Badge tone="brand">Knowledge check · FR group accounts</Badge>
        <span className="text-[12.5px] text-ink-3 tnum">
          Question {i + 1} of {QUESTIONS.length}
        </span>
        <span className="ml-auto flex gap-1">
          {QUESTIONS.map((_, n) => (
            <span
              key={n}
              className={cn(
                "h-1 w-6 rounded-full",
                n < i ? "bg-jade" : n === i ? "bg-cta" : "bg-surface-3",
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
                aria-pressed={isPicked}
                className={cn(
                  "flex items-start gap-3 rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-all",
                  show && isAnswer
                    ? "border-jade bg-jade-soft"
                    : show && isPicked
                      ? "border-rose bg-rose-soft"
                      : isPicked
                        ? "border-brand bg-cta-soft shadow-[0_0_0_3px_var(--ring)]"
                        : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
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
            aria-live="polite"
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
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
            {lesson.minutes} min · unlimited attempts · practice, not graded
          </span>
        </div>
      </div>
    </div>
  );
}
