"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  FileText,
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";
import {
  assessmentById,
  courseById,
  personById,
  rubricById,
  submissions as allSubs,
  type Submission,
} from "@/lib/data";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/field";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/misc";
import { RichText } from "@/components/assistant/rich-text";
import { toast } from "@/components/ui/toast";

type Sample = { answer: string; feedback: string };

/* Sample scripts, keyed by assessment, so the grader shows the kind of written
   answer each paper actually produces. */
const FR_CASE: Sample = {
  answer: `**Profitability**
Revenue grew 18% to $42.6m, but gross margin fell from 34.0% to 29.5%. The note on the new contract with Varro Retail explains most of it: the contract was won on lower prices, so the extra volume came at a thinner margin. Operating margin fell less, from 14.2% to 12.8%, because administrative expenses stayed flat while revenue grew.

**Liquidity and working capital**
The current ratio fell from 1.6 to 1.1 and the quick ratio from 1.0 to 0.6. Receivables collection period rose from 41 to 58 days, which matches the 60-day credit terms given to Varro Retail. Inventory holding period rose from 52 to 67 days. Halden Co is funding its growth through working capital, and the overdraft of $3.1m (nil last year) shows where the cash came from.

**Gearing**
Gearing (debt to debt plus equity) rose from 22% to 38% after the $8m loan notes issued to buy the new warehouse. Interest cover fell from 9.1 times to 4.3 times. That is still comfortable, but the loan notes carry a covenant of 3.5 times.

**Conclusion**
Halden Co has grown quickly but less profitably, and liquidity is now the main risk. If the receivables collection period stays at 58 days the overdraft will keep rising. I would recommend renegotiating credit terms with Varro Retail before the loan note covenant is tested.`,
  feedback:
    "Clear structure, and every ratio is interpreted rather than just calculated, which is what the marking guide rewards. Linking the fall in gross margin to the Varro Retail contract, and the longer collection period to its credit terms, is exactly the kind of cause the examiner looks for.\n\nWhere to push next: the covenant is your strongest point but it arrives in the last paragraph. Say how close interest cover is to 3.5 times and what a breach would mean for the loan notes. Also comment on whether the new warehouse should bring the inventory holding period down next year.",
};

const PM_REPORT: Sample = {
  answer: `**Summary for the production director**
Actual profit for August was $184,000 against a budget of $226,000, an adverse difference of $42,000. Two variances explain most of it: an adverse material mix variance of $18,400 and an adverse labour efficiency variance of $15,600. Sales variances were small.

**Materials**
The mix variance is adverse because more of the expensive ingredient (cashew paste at $12 per kg) was used in place of the cheaper filler. The yield variance is $6,200 favourable, so the richer mix produced more output per batch. Mix and yield together are $12,200 adverse. The purchasing manager changed filler supplier in July after a quality complaint, which is the likely cause, so this is an operational decision rather than waste.

**Labour**
Labour efficiency is $15,600 adverse: 1,300 hours at the standard rate of $12. Of this, 400 hours were lost when the line stopped on 14 August. The remaining 900 hours are spread across every shift and are consistent with new staff on the second shift still being trained.

**Recommendations**
1. Revise the standard mix if the new filler supplier is kept, otherwise the mix variance will recur every month and stop being useful.
2. Report idle time separately so the cost of training the second shift is visible on its own.
3. Review the labour standard in October, once the new staff are trained.`,
  feedback:
    "Good use of the mix and yield split: you calculated both and, more importantly, explained that the richer mix is an operational choice rather than waste. The recommendations are specific and tied to the causes you found.\n\nWhere to push next: idle time is a variance in its own right, so take the 400 idle hours ($4,800) out before calculating efficiency. That changes efficiency to $10,800 adverse and makes your training point stronger. Also check whether the small sales variances hide a volume effect and a price effect that cancel each other out.",
};

const EPSM_SHORT: Sample = {
  answer: `**Scenario**
Your manager asks you to hold back a supplier invoice until after the year end, so that this year's results meet the bonus target.

**Principles at risk**
Integrity and objectivity. Recording the invoice late would make the financial statements misleading, and the bonus creates a self-interest threat for my manager and, indirectly, for me.

**What I would do**
Explain to my manager that the invoice must be recorded in the period it relates to. If they insist, raise it with the finance director and keep a written note of both conversations. If that does not resolve it, take advice from ACCA's ethics advisory service before deciding whether to escalate further.`,
  feedback:
    "You named the right principles and spotted the self-interest threat, and your escalation steps are in a sensible order.\n\nWhere to push next: name the safeguard at each step, and say why the written note matters. It protects you as well as the company if the matter is raised later.",
};

const SAMPLES: Record<string, Sample> = {
  "a-fr-case": FR_CASE,
  "a-pm-variance": PM_REPORT,
  "a-pm-mock": PM_REPORT,
  "a-epsm-final": EPSM_SHORT,
};

function statusTone(s: Submission["status"]): Tone {
  return s === "graded"
    ? "jade"
    : s === "awaiting_review"
      ? "amber"
      : s === "late"
        ? "ember"
        : s === "missing"
          ? "rose"
          : "neutral";
}

export function GradingQueue() {
  const [filter, setFilter] = useState("pending");
  const [activeId, setActiveId] = useState<string | null>("s5");
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");
  const [sent, setSent] = useState(false);

  const subs = useMemo(() => {
    if (filter === "pending")
      return allSubs.filter((s) => s.status === "awaiting_review");
    if (filter === "flagged") return allSubs.filter((s) => s.flags.length > 0);
    if (filter === "graded") return allSubs.filter((s) => s.status === "graded");
    return allSubs;
  }, [filter]);

  const active = allSubs.find((s) => s.id === activeId) ?? subs[0] ?? null;
  const assessment = active ? assessmentById(active.assessmentId) : undefined;
  const rubric = rubricById(assessment?.rubricId);
  const learner = active ? personById(active.personId) : undefined;
  const course = assessment ? courseById(assessment.courseId) : undefined;

  const total = rubric
    ? rubric.criteria.reduce((n, c) => n + (scores[c.id] ?? 0), 0)
    : 0;
  const pct = rubric ? Math.round((total / rubric.total) * 100) : 0;
  const complete = rubric
    ? rubric.criteria.every((c) => scores[c.id] != null)
    : false;
  const sample = (assessment && SAMPLES[assessment.id]) ?? FR_CASE;

  return (
    <div className="grid gap-6 xl:grid-cols-[21rem_1fr]">
      {/* Queue */}
      <div className="min-w-0">
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          className="mb-3.5"
          items={[
            { id: "pending", label: "Pending" },
            { id: "flagged", label: "Flagged" },
            { id: "graded", label: "Graded" },
            { id: "all", label: "All" },
          ]}
        />

        {subs.length === 0 ? (
          <EmptyState
            icon={<Check />}
            title="Queue is clear"
            sub="Nothing is waiting on you. Objective questions are marked automatically and never enter this queue."
          />
        ) : (
          <div className="space-y-2">
            {subs.map((s) => {
              const a = assessmentById(s.assessmentId);
              const p = personById(s.personId);
              const on = s.id === active?.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setActiveId(s.id);
                    setScores({});
                    setSent(false);
                    setFeedback("");
                  }}
                  className={cn(
                    "w-full rounded-[var(--radius-lg)] border p-3.5 text-left transition-all",
                    on
                      ? "border-cta-strong bg-cta-soft"
                      : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    {p ? <Avatar name={p.name} size="xs" /> : null}
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                      {p?.name}
                    </span>
                    <Badge tone={statusTone(s.status)}>
                      {s.status.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 truncate text-[12.5px] text-ink-2">
                    {a?.title}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-[11.5px] text-ink-3">
                    <Clock className="size-3" />
                    {s.submittedAt
                      ? new Date(s.submittedAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Kolkata",
                        })
                      : "Not submitted"}
                    {s.attempt > 1 ? ` · attempt ${s.attempt}` : ""}
                  </p>
                  {s.flags.length ? (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] text-amber">
                      <AlertTriangle className="size-3" />
                      {s.flags[0]}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Grader */}
      <div className="min-w-0">
        {!active || !assessment ? (
          <EmptyState
            icon={<FileText />}
            title="Pick a submission"
            sub="Choose a script from the queue to start marking."
          />
        ) : (
          <div className="space-y-4">
            <Card>
              <div className="flex flex-wrap items-center gap-4 p-5">
                {learner ? <Avatar name={learner.name} size="lg" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold tracking-[-0.012em] text-ink">
                    {learner?.name}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {learner?.title} · {learner?.department}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[13.5px] font-medium text-ink">
                    {assessment.title}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {course?.title}
                  </p>
                </div>
              </div>
              {active.flags.length ? (
                <div className="flex flex-wrap gap-2 border-t border-line bg-amber-soft px-5 py-2.5">
                  {active.flags.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1.5 text-[12px] text-amber"
                    >
                      <AlertTriangle className="size-3.5" />
                      {f}
                    </span>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card>
              <CardHeader
                title="Script"
                sub={`Typed answer · ${
                  active.submittedAt
                    ? `submitted ${new Date(active.submittedAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Asia/Kolkata",
                      })} IST`
                    : "not submitted"
                } · attempt ${active.attempt} of ${assessment.attempts}`}
                action={
                  <Button variant="secondary" size="xs">
                    <FileText className="size-3.5" /> Open script
                  </Button>
                }
              />
              <div className="scrollbar-slim max-h-96 overflow-y-auto border-t border-line px-5 py-4 text-[13.5px] leading-[1.7] text-ink-2 [overflow-wrap:anywhere]">
                <RichText text={sample.answer} />
              </div>
            </Card>

            {rubric ? (
              <Card>
                <CardHeader
                  title={rubric.name}
                  sub="Choose a level for each criterion. The learner sees the same grid with your choice highlighted."
                  action={
                    <span className="text-[13px] font-semibold text-ink tnum">
                      {total} / {rubric.total}
                    </span>
                  }
                />
                <div className="divide-y divide-[var(--line)] border-t border-line">
                  {rubric.criteria.map((c) => (
                    <div key={c.id} className="px-5 py-4">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-[13.5px] font-medium text-ink">
                          {c.name}
                        </p>
                        <span className="shrink-0 text-[12px] text-ink-3 tnum">
                          {scores[c.id] != null
                            ? `${scores[c.id]} / ${c.weight}`
                            : `out of ${c.weight}`}
                        </span>
                      </div>
                      <div className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                        {c.levels.map((l) => {
                          const on = scores[c.id] === l.points;
                          return (
                            <button
                              key={l.label}
                              onClick={() =>
                                setScores((s) => ({ ...s, [c.id]: l.points }))
                              }
                              className={cn(
                                "rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-all",
                                on
                                  ? "border-cta-strong bg-cta-soft shadow-[0_0_0_3px_var(--ring)]"
                                  : "border-line bg-surface hover:border-line-strong",
                              )}
                            >
                              <p
                                className={cn(
                                  "flex items-baseline justify-between text-[12px] font-semibold",
                                  on ? "text-ink" : "text-ink-2",
                                )}
                              >
                                {l.label}
                                <span className="tnum">{l.points}</span>
                              </p>
                              <p className="mt-1 text-[11.5px] leading-snug text-ink-3">
                                {l.descriptor}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line px-5 py-4">
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <span className="text-[12.5px] text-ink-2">
                      Running score
                    </span>
                    <span className="text-[13px] font-semibold text-ink tnum">
                      {pct}% ·{" "}
                      <span
                        className={pct >= assessment.passMark ? "text-jade" : "text-ember"}
                      >
                        {pct >= assessment.passMark ? "pass" : "below pass mark"}
                      </span>
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    height={7}
                    tone={pct >= assessment.passMark ? "jade" : "ember"}
                  />
                </div>
              </Card>
            ) : null}

            <Card>
              <CardHeader
                title="Feedback"
                sub="Goes to the learner with the rubric. Required when the mark is below the pass mark."
                action={
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setFeedback(sample.feedback)}
                  >
                    <Sparkles className="size-3.5" /> Draft from the rubric
                  </Button>
                }
              />
              <div className="border-t border-line px-5 py-4">
                <Textarea
                  rows={6}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="What earned marks, and the single most useful thing to do differently in the exam."
                />
                <p className="mt-2 text-[11.5px] text-ink-3">
                  A draft is a starting point. It is not sent until you edit and
                  submit it.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    disabled={!complete || !feedback.trim() || sent}
                    onClick={() => {
                      setSent(true);
                      toast({
                        title: "Marks released",
                        body: `${learner?.name ?? "The learner"} can see ${pct}% and your feedback now.`,
                      });
                    }}
                  >
                    {sent ? (
                      <>
                        <Check className="size-4" /> Marks released
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> Release marks
                      </>
                    )}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() =>
                      toast({
                        title: "Revision requested",
                        body: `${learner?.name ?? "The learner"} can resubmit without using an attempt.`,
                        tone: "info",
                      })
                    }
                  >
                    <MessageSquare className="size-4" /> Ask for a revision
                  </Button>
                  {!complete ? (
                    <span className="text-[12px] text-ink-3">
                      Score every criterion first
                    </span>
                  ) : null}
                  {sent ? (
                    <span className="text-[12px] text-jade">
                      Learner notified in-app and on WhatsApp
                    </span>
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
