"use client";

import { useEffect, useState } from "react";
import { Check, Clock, Eye, X } from "lucide-react";
import { DIFFICULTY_LABELS, QUESTION_TYPE_LABELS, syllabusAreaTitle, type BankQuestion } from "@/lib/data/acca";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";
import { PaperCodeChip } from "./bits";

export type PracticeResult = { verdicts: Record<string, boolean>; correct: number; total: number };

const parseFigure = (v: string) => Number(v.replace(/[^0-9.-]/g, ""));

/** Number answers mark within 1% of the key (at least 1 unit), like the CBE. */
function markNumber(q: BankQuestion, value: string) {
  const key = parseFigure(q.answerKey);
  const got = parseFigure(value);
  if (!value.trim() || !Number.isFinite(got)) return false;
  return Math.abs(got - key) <= Math.max(1, Math.abs(key) * 0.01);
}

export function PracticeRunner({
  open,
  title,
  questions,
  minutes,
  onClose,
  onComplete,
}: {
  open: boolean;
  title: string;
  questions: BankQuestion[];
  /** Timed sets count down; null runs untimed. */
  minutes: number | null;
  onClose: () => void;
  onComplete: (result: PracticeResult) => void;
}) {
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [verdicts, setVerdicts] = useState<Record<string, boolean>>({});
  const [seconds, setSeconds] = useState((minutes ?? 0) * 60);

  useEffect(() => {
    if (!open || !minutes) return;
    const t = setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [open, minutes]);

  const q = questions[index];
  if (!q) return null;
  const response = responses[q.id] ?? "";
  const isRevealed = revealed[q.id] ?? false;
  const verdict = verdicts[q.id];
  const answered = Object.keys(verdicts).length;
  const correct = Object.values(verdicts).filter(Boolean).length;
  const last = index === questions.length - 1;

  const finish = () => onComplete({ verdicts, correct, total: questions.length });

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={title}
      sub={`Question ${index + 1} of ${questions.length} · ${answered} answered · ${correct} correct`}
      footer={
        <>
          <span className="mr-auto flex items-center gap-2 text-[12.5px] text-ink-3">
            {minutes ? (
              <>
                <Clock className="size-3.5" />
                <span className={cn("font-mono tnum", seconds < 60 && "font-bold text-rose")}>
                  {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
                </span>
                left
              </>
            ) : (
              "Untimed practice"
            )}
          </span>
          <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Previous
          </Button>
          {last ? (
            <Button type="button" size="sm" onClick={finish}>
              Finish set
            </Button>
          ) : (
            <Button type="button" size="sm" variant="secondary" onClick={() => setIndex((i) => i + 1)}>
              {verdict === undefined ? "Skip" : "Next question"}
            </Button>
          )}
        </>
      }
    >
      <Progress value={((index + 1) / questions.length) * 100} height={4} tone="brand" className="mb-4" />
      <div className="flex flex-wrap items-center gap-2">
        <PaperCodeChip code={q.paper} />
        <StatusPill status="type" tone="info" dot={false} size="sm">
          {QUESTION_TYPE_LABELS[q.type]}
        </StatusPill>
        <StatusPill status="difficulty" tone="neutral" dot={false} size="sm">
          {DIFFICULTY_LABELS[q.difficulty]}
        </StatusPill>
        <span className="text-[12px] text-ink-3">
          Area {q.syllabusArea} · {syllabusAreaTitle(q.paper, q.syllabusArea)} · {q.marks} {q.marks === 1 ? "mark" : "marks"}
        </span>
      </div>
      <p className="mt-2 text-[12px] font-semibold tracking-[0.02em] text-ink-3">{q.topic}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink">{q.stem}</p>

      <div className="mt-4 space-y-3">
        {q.type === "number" ? (
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-0 flex-1">
              <label htmlFor={`ans-${q.id}`} className="mb-1.5 block text-[12.5px] font-semibold text-ink-2">
                Your answer {q.unit ? `(${q.unit})` : ""}
              </label>
              <Input
                id={`ans-${q.id}`}
                inputMode="decimal"
                className="font-mono"
                value={response}
                disabled={verdict !== undefined}
                onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                placeholder="Enter a figure"
              />
            </div>
            <Button
              type="button"
              disabled={verdict !== undefined || !response.trim()}
              onClick={() => {
                setVerdicts((v) => ({ ...v, [q.id]: markNumber(q, response) }));
                setRevealed((r) => ({ ...r, [q.id]: true }));
              }}
            >
              Check answer
            </Button>
          </div>
        ) : (
          <>
            <label htmlFor={`ans-${q.id}`} className="block text-[12.5px] font-semibold text-ink-2">
              {q.type === "CR" ? "Plan your answer" : "Your answer"}
            </label>
            <Textarea
              id={`ans-${q.id}`}
              rows={q.type === "CR" ? 6 : 3}
              value={response}
              onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
              placeholder={q.type === "CR" ? "Outline the points you would make, with workings" : "Write or choose your answer, then check it"}
            />
            {!isRevealed ? (
              <Button type="button" variant="outline" onClick={() => setRevealed((r) => ({ ...r, [q.id]: true }))}>
                <Eye className="size-4" />
                {q.type === "CR" ? "Show marking guide" : "Show answer"}
              </Button>
            ) : null}
          </>
        )}

        {isRevealed ? (
          <div
            className={cn(
              "rounded-[14px] border p-4",
              verdict === true ? "border-jade/40 bg-jade-soft" : verdict === false ? "border-rose/40 bg-rose-soft" : "border-line bg-surface-2",
            )}
          >
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">{q.type === "CR" ? "Marking guide" : "Answer key"}</p>
            <p className="mt-1 text-[14px] font-semibold text-ink">
              {q.answerKey}
              {q.unit && q.type === "number" ? ` ${q.unit}` : ""}
            </p>
            {q.type === "number" && verdict !== undefined ? (
              <p className={cn("mt-1.5 flex items-center gap-1.5 text-[13px] font-semibold", verdict ? "text-jade" : "text-rose")}>
                {verdict ? <Check className="size-4" /> : <X className="size-4" />}
                {verdict ? "Correct" : `Not quite: you entered ${response}`}
              </p>
            ) : null}
            {q.type !== "number" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[12.5px] text-ink-2">Mark yourself:</span>
                <Button type="button" size="xs" variant={verdict === true ? "secondary" : "outline"} onClick={() => setVerdicts((v) => ({ ...v, [q.id]: true }))}>
                  <Check className="size-3.5" />
                  {q.type === "CR" ? "Covered the key points" : "I got it right"}
                </Button>
                <Button type="button" size="xs" variant={verdict === false ? "secondary" : "outline"} onClick={() => setVerdicts((v) => ({ ...v, [q.id]: false }))}>
                  <X className="size-3.5" />
                  {q.type === "CR" ? "Missed key points" : "I got it wrong"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
