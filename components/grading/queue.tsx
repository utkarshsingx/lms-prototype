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
  type Rubric,
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

const SAMPLE_ANSWER = `## Consistency model

I chose linearizable reads through the leader with a lease, and eventually
consistent follower reads behind an explicit opt-in header. Most of our traffic
is a dashboard that tolerates 200ms of staleness; the ledger endpoint does not,
so it is the one caller that pays for the lease.

## Under partition

A minority partition keeps serving reads from its stale snapshot and rejects
writes with 503. It cannot commit, because commit needs 3 of 5. The lease means
the old leader stops answering linearizable reads within 4s of losing contact,
which bounds staleness to the lease duration rather than to the partition
duration. That bound is the part I would defend hardest.

## Signals

Commit index lag per follower, lease renewals per second, and the count of
elections in a 5-minute window. The third one is the alert: a healthy cluster has
zero, and any non-zero value is either a real failure or a config problem.

## Alternative rejected

Quorum reads on every request. Correct, simpler to reason about, and it doubles
p99 read latency at our fan-out. The lease buys the same guarantee for one extra
failure mode, which the runbook covers.`;

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
            sub="Nothing is waiting on you. Auto-graded submissions never enter this queue."
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
                      ? "border-brand bg-brand-soft shadow-[var(--shadow-e2)]"
                      : "border-line bg-surface hover:border-line-strong hover:shadow-[var(--shadow-e2)]",
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
            sub="Choose something from the queue to start marking."
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
                title="Submission"
                sub="Markdown, submitted 4 Sep 23:58 IST · 1 of 1 attempts used"
                action={
                  <Button variant="secondary" size="xs">
                    <FileText className="size-3.5" /> Open original
                  </Button>
                }
              />
              <pre className="scrollbar-slim max-h-96 overflow-y-auto border-t border-line px-5 py-4 font-sans text-[13.5px] leading-[1.7] whitespace-pre-wrap text-ink-2">
                {SAMPLE_ANSWER}
              </pre>
            </Card>

            {rubric ? (
              <Card>
                <CardHeader
                  title={rubric.name}
                  sub="Click a level per criterion. The learner sees the same grid with your choice highlighted."
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
                          {scores[c.id] ?? "—"} / {c.weight}
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
                                  ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
                                  : "border-line bg-surface hover:border-line-strong",
                              )}
                            >
                              <p
                                className={cn(
                                  "flex items-baseline justify-between text-[12px] font-semibold",
                                  on ? "text-brand" : "text-ink-2",
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
                sub="Goes to the learner with the rubric. Required when the score is below the pass mark."
                action={
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() =>
                      setFeedback(
                        "Strong on the partition analysis — bounding staleness to the lease rather than the partition is exactly the right instinct, and you defended it. The alternative you rejected was rejected for a real reason with a number attached.\n\nWhere to push next: the operability section names three signals but no thresholds, so nobody could act on it at 3am without asking you. Give the elections-per-5-minutes alert a threshold and a first action.",
                      )
                    }
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
                  placeholder="What was strong, and the single most useful thing to do differently next time."
                />
                <p className="mt-2 text-[11.5px] text-ink-3">
                  A draft is a starting point. It is not sent until you edit and
                  submit it.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    disabled={!complete || !feedback.trim() || sent}
                    onClick={() => setSent(true)}
                  >
                    {sent ? (
                      <>
                        <Check className="size-4" /> Grade released
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> Release grade
                      </>
                    )}
                  </Button>
                  <Button variant="secondary">
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
