"use client";

import { useState } from "react";
import { AlertTriangle, Check, ClipboardCheck, FileText, Flag, MessageSquare, Save, Send, ShieldAlert, Sparkles } from "lucide-react";
import {
  cohortById,
  formatAccaDate,
  formatShortDate,
  groupIndian,
  rubricByIdAcca,
  studentById,
  type EvaluationItem,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, batchFor, useFaculty } from "./shared";

export type EvalPatch = Partial<Pick<EvaluationItem, "status" | "marks" | "feedback" | "plagiarism">>;

const BANDS = [
  { band: "Strong", share: 1 },
  { band: "Adequate", share: 0.6 },
  { band: "Weak", share: 0.25 },
];

export function similarityTone(pct: number): StatusTone {
  return pct >= 40 ? "rose" : pct >= 20 ? "amber" : "neutral";
}

export function criterionSplit(total: number, criteria: { id: string; marks: number }[], max: number) {
  // Spread a single mark across criteria in proportion to their weight, remainder to the largest.
  const sum = criteria.reduce((n, c) => n + c.marks, 0);
  const scaled = (total * sum) / Math.max(1, max);
  const parts = criteria.map((c) => Math.floor((scaled * c.marks) / Math.max(1, sum)));
  const rest = Math.round(scaled) - parts.reduce((a, b) => a + b, 0);
  const biggest = criteria.reduce((bi, c, i) => (c.marks > criteria[bi].marks ? i : bi), 0);
  parts[biggest] += rest;
  return Object.fromEntries(criteria.map((c, i) => [c.id, Math.min(c.marks, parts[i])]));
}

/** Queue plus marking pane for one evaluation kind (descriptive, or assignments and projects). */
export function EvaluationWorkbench({
  items,
  label,
  onUpdate,
  onFlag,
}: {
  items: EvaluationItem[];
  label: string;
  onUpdate: (id: string, patch: EvalPatch) => void;
  onFlag: (item: EvaluationItem) => void;
}) {
  const [filter, setFilter] = useState("pending");
  const [selectedId, setSelectedId] = useState(() => items.find((i) => i.status !== "graded" && i.status !== "returned")?.id ?? items[0]?.id ?? "");

  if (items.length === 0) {
    return <EmptyState icon={<ClipboardCheck />} title={`No ${label.toLowerCase()} assigned to you`} sub="Scripts appear here when an assessment you mark closes. Objective questions are marked automatically." />;
  }

  const pending = items.filter((i) => i.status === "to-grade" || i.status === "in-progress");
  const flagged = items.filter((i) => i.status === "flagged");
  const done = items.filter((i) => i.status === "graded" || i.status === "returned");
  const list = filter === "pending" ? pending : filter === "flagged" ? flagged : filter === "graded" ? done : items;
  const selected = items.find((i) => i.id === selectedId) ?? list[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          items={[
            { id: "pending", label: `To grade (${pending.length})` },
            { id: "flagged", label: `Flagged (${flagged.length})` },
            { id: "graded", label: "Graded" },
            { id: "all", label: "All" },
          ]}
        />
        <ul className="scrollbar-slim max-h-[24rem] space-y-2 overflow-y-auto xl:max-h-[48rem]">
          {list.length === 0 ? (
            <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">Nothing in this view.</li>
          ) : null}
          {list.map((i) => {
            const s = studentById(i.studentId);
            const on = i.id === selected?.id;
            return (
              <li key={i.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedId(i.id)}
                  className={cn(
                    "w-full min-w-0 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
                    on ? "border-cta-strong bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Avatar name={s?.name ?? "Learner"} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{s?.name}</span>
                    <StatusPill status={i.status} size="sm" />
                  </span>
                  <span className="mt-2 block truncate text-[12.5px] text-ink-2">
                    {i.paper} · {i.title}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] text-ink-3">
                    <span>
                      Submitted {formatShortDate(i.submittedOn)} · due {formatShortDate(i.dueOn)}
                    </span>
                    {i.plagiarism.similarity >= 20 ? (
                      <StatusPill status="similarity" tone={similarityTone(i.plagiarism.similarity)} size="sm">
                        {i.plagiarism.similarity}% similar
                      </StatusPill>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {selected ? <MarkingPane key={selected.id} item={selected} onUpdate={(p) => onUpdate(selected.id, p)} onFlag={() => onFlag(selected)} /> : null}
    </div>
  );
}

function MarkingPane({ item, onUpdate, onFlag }: { item: EvaluationItem; onUpdate: (patch: EvalPatch) => void; onFlag: () => void }) {
  const { canGrade, me } = useFaculty();
  const student = studentById(item.studentId);
  const cohort = cohortById(item.cohortId);
  const rubric = rubricByIdAcca(item.rubricId);
  const criteria = rubric?.criteria ?? [];
  const rubricTotal = criteria.reduce((n, c) => n + c.marks, 0);
  const closed = item.status === "graded" || item.status === "returned";
  const isFlagged = item.status === "flagged";

  const [scores, setScores] = useState<Record<string, number>>(() =>
    item.marks !== null && criteria.length ? criterionSplit(item.marks, criteria, item.maxMarks) : {},
  );
  const [feedback, setFeedback] = useState(item.feedback ?? "");

  const raw = criteria.reduce((n, c) => n + (scores[c.id] ?? 0), 0);
  const marks = rubricTotal ? Math.round((raw * item.maxMarks) / rubricTotal) : raw;
  const pct = Math.round((marks / Math.max(1, item.maxMarks)) * 100);
  const complete = criteria.every((c) => scores[c.id] != null);
  const late = !closed && item.dueOn < "2026-09-14";

  const draftFeedback = () => {
    const lines = criteria.map((c) => {
      const v = scores[c.id];
      const share = v == null ? null : v / c.marks;
      const d = c.descriptors;
      if (share === null) return `${c.label}: not yet marked.`;
      if (share >= 0.85) return `${c.label}: ${d[0].text.toLowerCase()}, well done.`;
      if (share >= 0.5) return `${c.label}: ${d[1].text.toLowerCase()}. To reach full marks: ${d[0].text.toLowerCase()}.`;
      return `${c.label}: ${d[2].text.toLowerCase()}. Aim for: ${d[1].text.toLowerCase()} first.`;
    });
    setFeedback(`${lines.join("\n")}\n\nWhere to push next: tie every point to a figure or fact from the scenario, and finish with a clear conclusion.`);
  };

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0">
        <div className="flex flex-wrap items-center gap-4 p-5">
          <Avatar name={student?.name ?? "Learner"} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{student?.name}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
              {cohort?.name}
              {student && cohort ? ` · ${batchFor(student, cohort)?.name ?? ""}` : ""}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[13.5px] font-semibold text-ink">{item.title}</p>
            <p className="mt-0.5 text-[12px] text-ink-3">
              {item.paper} · {item.kind === "descriptive" ? "Descriptive answer" : item.kind === "project" ? "Project" : "Assignment"} · {rubric?.name}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 text-[12.5px] text-ink-2">
          <span>Submitted {formatAccaDate(item.submittedOn)}</span>
          <span aria-hidden className="text-ink-3">·</span>
          <span className={cn(late && "font-semibold text-rose")}>
            Marking due {formatAccaDate(item.dueOn)}
            {late ? " · overdue" : ""}
          </span>
          <span aria-hidden className="text-ink-3">·</span>
          <span>{groupIndian(item.wordCount)} words</span>
          <StatusPill status="similarity" tone={similarityTone(item.plagiarism.similarity)} size="sm">
            Similarity {item.plagiarism.similarity}%
          </StatusPill>
          <Button size="xs" variant="outline" className="ml-auto" onClick={onFlag} disabled={closed}>
            <Flag className="size-3.5" />
            {isFlagged ? "Update misconduct flag" : "Flag plagiarism or academic misconduct"}
          </Button>
        </div>
        {isFlagged ? (
          <div className="flex flex-wrap items-start gap-3 border-t border-line bg-rose-soft px-5 py-3.5">
            <ShieldAlert aria-hidden className="mt-0.5 size-4.5 shrink-0 text-rose" />
            <div className="min-w-0 flex-1 text-[12.5px] text-ink">
              <p className="font-semibold text-rose">Flagged for academic misconduct · marks held</p>
              <p className="mt-0.5">
                {item.plagiarism.similarity}% similarity{item.plagiarism.source ? ` · ${item.plagiarism.source}` : ""}
              </p>
              {item.plagiarism.misconduct ? <p className="mt-0.5 text-ink-2">{item.plagiarism.misconduct}</p> : null}
            </div>
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                onUpdate({ status: "to-grade", plagiarism: { ...item.plagiarism, flagged: false, misconduct: undefined } });
                toast({ title: "Flag cleared", body: `${student?.name}'s script is back in your queue`, tone: "info" });
              }}
            >
              Clear flag and grade
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="min-w-0">
        <CardHeader
          title="Script"
          sub={item.question}
          action={
            <Button size="xs" variant="secondary" onClick={() => toast({ title: "Opening the full script", body: `${item.title} · ${student?.name}`, tone: "info" })}>
              <FileText className="size-3.5" />
              Full script
            </Button>
          }
        />
        <div className="border-t border-line px-5 py-4">
          <MiniLabel>Answer excerpt</MiniLabel>
          <p className="mt-2 text-[13.5px] leading-[1.75] text-ink-2 [overflow-wrap:anywhere]">{item.answerExcerpt}</p>
        </div>
      </Card>

      {closed ? (
        <Card className="min-w-0 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={item.status} />
            <p className="font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-ink tnum">
              {item.marks} / {item.maxMarks}
            </p>
            <span className={cn("text-[13px] font-semibold", pct >= 50 ? "text-jade" : "text-rose")}>{Math.round(((item.marks ?? 0) / item.maxMarks) * 100)}%</span>
          </div>
          {item.feedback ? (
            <div className="mt-4">
              <MiniLabel>Feedback released</MiniLabel>
              <p className="mt-1.5 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-2">{item.feedback}</p>
            </div>
          ) : null}
        </Card>
      ) : (
        <>
          {rubric ? (
            <Card className="min-w-0">
              <CardHeader
                title={item.kind === "descriptive" ? "Grade descriptive answers" : "Grade assignments and projects"}
                sub={`${rubric.name} · choose a band for each criterion, then adjust the mark if needed`}
                action={
                  <span className="font-mono text-[13px] font-semibold text-ink tnum">
                    {marks} / {item.maxMarks}
                  </span>
                }
              />
              <div className="divide-y divide-line border-t border-line">
                {criteria.map((c) => (
                  <div key={c.id} className="px-5 py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <p className="text-[13.5px] font-semibold text-ink">{c.label}</p>
                      <label className="flex items-center gap-2 text-[12px] text-ink-3">
                        Mark
                        <Input
                          type="number"
                          min={0}
                          max={c.marks}
                          value={scores[c.id] ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? undefined : Math.max(0, Math.min(c.marks, Number(e.target.value)));
                            setScores((s) => {
                              const next = { ...s };
                              if (v === undefined) delete next[c.id];
                              else next[c.id] = v;
                              return next;
                            });
                          }}
                          className="h-8 w-16 px-2 text-right font-mono text-[13px]"
                          aria-label={`${c.label} mark out of ${c.marks}`}
                        />
                        <span className="tnum">of {c.marks}</span>
                      </label>
                    </div>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
                      {c.descriptors.map((d, i) => {
                        const pts = Math.round(c.marks * (BANDS[i]?.share ?? 0));
                        const on = scores[c.id] === pts;
                        return (
                          <button
                            key={d.band}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setScores((s) => ({ ...s, [c.id]: pts }))}
                            className={cn(
                              "rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors",
                              on ? "border-cta-strong bg-cta-soft shadow-[0_0_0_3px_var(--ring)]" : "border-line bg-surface hover:border-line-strong",
                            )}
                          >
                            <span className={cn("flex items-baseline justify-between text-[12px] font-semibold", on ? "text-ink" : "text-ink-2")}>
                              {d.band}
                              <span className="tnum">{pts}</span>
                            </span>
                            <span className="mt-1 block text-[11.5px] leading-snug text-ink-3">{d.text}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-line px-5 py-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[12.5px] text-ink-2">Running score</span>
                  <span className="text-[13px] font-semibold text-ink tnum">
                    {pct}% · <span className={pct >= 50 ? "text-jade" : "text-rose"}>{pct >= 50 ? "at or above the pass mark" : "below the pass mark"}</span>
                  </span>
                </div>
                <Progress value={pct} height={7} tone={pct >= 50 ? "jade" : "rose"} />
              </div>
            </Card>
          ) : null}

          <Card className="min-w-0">
            <CardHeader
              title="Provide feedback"
              sub="Released to the learner with the rubric. Required below the pass mark."
              action={
                <Button size="xs" variant="ghost" onClick={draftFeedback}>
                  <Sparkles className="size-3.5" />
                  Draft from the rubric
                </Button>
              }
            />
            <div className="border-t border-line px-5 py-4">
              <Textarea rows={6} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="What earned marks, and the one thing to do differently in the exam." />
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <GatedButton
                  allowed={canGrade && !isFlagged}
                  reason={isFlagged ? "Resolve or clear the misconduct flag before releasing marks" : "Your role cannot grade"}
                  disabled={!complete || !feedback.trim()}
                  onClick={() => {
                    onUpdate({ status: "graded", marks, feedback: feedback.trim() });
                    toast({ title: "Marks released", body: `${student?.name} can see ${marks} of ${item.maxMarks} (${pct}%) and your feedback` });
                  }}
                >
                  <Send className="size-4" />
                  Release marks
                </GatedButton>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onUpdate({ status: isFlagged ? "flagged" : "in-progress", marks: complete ? marks : null, feedback: feedback.trim() || undefined });
                    toast({ title: "Marking saved as draft", body: `${item.title} · ${me.name}`, tone: "neutral" });
                  }}
                >
                  <Save className="size-4" />
                  Save draft
                </Button>
                <Button
                  variant="ghost"
                  disabled={isFlagged}
                  onClick={() => {
                    onUpdate({ status: "returned", marks: null, feedback: feedback.trim() || "Please revise and resubmit." });
                    toast({ title: "Returned for revision", body: `${student?.name} can resubmit without using an attempt`, tone: "info" });
                  }}
                >
                  <MessageSquare className="size-4" />
                  Return for revision
                </Button>
                {!complete ? (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3">
                    <AlertTriangle aria-hidden className="size-3.5" />
                    Score every criterion first
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-jade">
                    <Check aria-hidden className="size-3.5" />
                    Every criterion scored
                  </span>
                )}
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

const CONCERNS = [
  "Collusion with another learner",
  "Copied from a model answer or published source",
  "Contract cheating suspected",
  "Exam misconduct from the proctoring log",
];
const ACTIONS = [
  "Hold marks and refer to the Programme Admin",
  "Ask the learner for a written explanation",
  "Award zero for the affected answer",
  "No misconduct: similarity explained",
];

/** "Flag plagiarism or academic misconduct": similarity, matched sources, concern and action. */
export function PlagiarismDrawer({
  item,
  open,
  onClose,
  onSubmit,
}: {
  item: EvaluationItem | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (id: string, patch: EvalPatch) => void;
}) {
  const student = item ? studentById(item.studentId) : undefined;
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Flag plagiarism or academic misconduct"
      sub={item ? `${student?.name} · ${item.title}` : undefined}
      submitLabel="Save flag"
      footerNote="The learner is not told until the case is reviewed."
      onSubmit={(data) => {
        if (!item) return;
        const similarity = Math.max(0, Math.min(100, Number(data.get("similarity")) || 0));
        const source = String(data.get("source") ?? "").trim();
        const concern = String(data.get("concern"));
        const action = String(data.get("action"));
        if (action === ACTIONS[3]) {
          onSubmit(item.id, { status: "to-grade", plagiarism: { similarity, flagged: false, source: source || undefined } });
          toast({ title: "No misconduct recorded", body: "The script is back in your queue", tone: "info" });
        } else {
          onSubmit(item.id, { status: "flagged", plagiarism: { similarity, flagged: true, source: source || undefined, misconduct: `${concern} · ${action}` } });
          toast({
            title: "Flagged for academic misconduct",
            body: action === ACTIONS[0] ? "Marks held · referred to Priya Menon, ACCA Programme Lead" : action,
            tone: "warning",
          });
        }
        onClose();
      }}
    >
      {item ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Similarity" hint="From the similarity report">
              <Input name="similarity" type="number" min={0} max={100} defaultValue={item.plagiarism.similarity} />
            </Field>
            <Field label="Concern">
              <Select name="concern" defaultValue={item.plagiarism.similarity >= 60 ? CONCERNS[0] : CONCERNS[1]}>
                {CONCERNS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Matched sources">
            <Textarea
              name="source"
              rows={3}
              defaultValue={item.plagiarism.source ?? ""}
              placeholder="e.g. 62% match with another learner's submission in the same cohort"
            />
          </Field>
          <Field label="Action">
            <Select name="action" defaultValue={ACTIONS[0]}>
              {ACTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <FileDrop label="Attach the similarity report" accept=".pdf,.html,.png" hint="Kept with the case, not shared with the learner" />
          <Field label="Note for the review">
            <Textarea name="note" rows={3} required placeholder="What you noticed, where in the script, and why it matters." />
          </Field>
        </>
      ) : null}
    </FormDrawer>
  );
}
