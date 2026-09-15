"use client";

import { useState } from "react";
import { ArrowRight, Check, MessageSquare, Save, Scale } from "lucide-react";
import {
  cohortById,
  evaluationQueue,
  formatAccaDate,
  rubricByIdAcca,
  staffName,
  studentById,
  type ReEvaluationRequest,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { Input, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/misc";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { criterionSplit } from "./grader";
import { MiniLabel, firstNameOf, plural, useFaculty } from "./shared";

export type ReEvalPatch = Partial<Pick<ReEvaluationRequest, "status" | "revisedMarks">>;

const STATUS_TONE: Record<ReEvaluationRequest["status"], StatusTone> = {
  open: "info",
  "under-review": "amber",
  upheld: "neutral",
  revised: "jade",
};

const STATUS_LABEL: Record<ReEvaluationRequest["status"], string> = {
  open: "Open",
  "under-review": "Under review",
  upheld: "Original marks upheld",
  revised: "Marks revised",
};

/** "Participate in re-evaluation": the panel view, with original marks, second marks and a moderation note. */
export function ReEvaluation({
  requests,
  onUpdate,
}: {
  requests: ReEvaluationRequest[];
  onUpdate: (id: string, patch: ReEvalPatch) => void;
}) {
  const { staffId } = useFaculty();
  const active = requests.filter((r) => r.status === "open" || r.status === "under-review");
  const [filter, setFilter] = useState(active.length ? "active" : "all");
  const list = (filter === "active" ? active : filter === "closed" ? requests.filter((r) => !active.includes(r)) : requests)
    .slice()
    .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn));
  const secondFirst = active.find((r) => evaluationQueue.find((e) => e.id === r.evaluationId)?.graderId !== staffId);
  const [selectedId, setSelectedId] = useState(secondFirst?.id ?? active[0]?.id ?? requests[0]?.id ?? "");
  const selected = requests.find((r) => r.id === selectedId) ?? list[0];

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Scale />}
        title="You are not on any re-evaluation panel"
        sub="When a learner asks for a script on your papers to be re-marked, you join the panel as the original marker or the second marker."
      />
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          items={[
            { id: "active", label: `Active (${active.length})` },
            { id: "closed", label: "Decided" },
            { id: "all", label: "All" },
          ]}
        />
        <ul className="space-y-2">
          {list.length === 0 ? (
            <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">Nothing in this view.</li>
          ) : null}
          {list.map((r) => {
            const evaluation = evaluationQueue.find((e) => e.id === r.evaluationId);
            const on = r.id === selected?.id;
            const mine = evaluation?.graderId === staffId;
            return (
              <li key={r.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedId(r.id)}
                  className={cn(
                    "w-full min-w-0 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
                    on ? "border-cta-strong bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{studentById(r.studentId)?.name}</span>
                    <StatusPill status={r.status} tone={STATUS_TONE[r.status]} size="sm">
                      {STATUS_LABEL[r.status]}
                    </StatusPill>
                  </span>
                  <span className="mt-1.5 block truncate text-[12.5px] text-ink-2">
                    {r.paper} · {r.title}
                  </span>
                  <span className="mt-1 block text-[11.5px] text-ink-3">
                    {mine ? "You are the original marker" : "You are the second marker"} · {r.originalMarks} of {r.maxMarks} · requested {formatAccaDate(r.requestedOn)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {selected ? <PanelView key={selected.id} request={selected} onUpdate={(p) => onUpdate(selected.id, p)} /> : null}
    </div>
  );
}

function PanelView({ request, onUpdate }: { request: ReEvaluationRequest; onUpdate: (patch: ReEvalPatch) => void }) {
  const { staffId, me } = useFaculty();
  const evaluation = evaluationQueue.find((e) => e.id === request.evaluationId);
  const student = studentById(request.studentId);
  const rubric = evaluation ? rubricByIdAcca(evaluation.rubricId) : undefined;
  const criteria = rubric?.criteria ?? [];
  const rubricTotal = criteria.reduce((n, c) => n + c.marks, 0);
  const originalMarker = evaluation?.graderId ?? request.panelIds[0];
  const secondMarker = request.panelIds.find((id) => id !== originalMarker) ?? request.panelIds[1];
  const isOriginal = originalMarker === staffId;
  const closed = request.status === "upheld" || request.status === "revised";

  const original = criteria.length ? criterionSplit(request.originalMarks, criteria, request.maxMarks) : {};
  const [second, setSecond] = useState<Record<string, number>>(() =>
    request.status === "revised" && request.revisedMarks != null && criteria.length ? criterionSplit(request.revisedMarks, criteria, request.maxMarks) : {},
  );
  const [note, setNote] = useState("");
  const [response, setResponse] = useState("");

  const raw = criteria.reduce((n, c) => n + (second[c.id] ?? 0), 0);
  const secondTotal = rubricTotal ? Math.round((raw * request.maxMarks) / rubricTotal) : raw;
  const complete = criteria.length > 0 && criteria.every((c) => second[c.id] != null);
  const diff = secondTotal - request.originalMarks;

  return (
    <div className="min-w-0 space-y-4">
      <Card className="min-w-0">
        <div className="flex flex-wrap items-start gap-4 p-5">
          <Avatar name={student?.name ?? "Learner"} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Participate in re-evaluation</p>
            <p className="mt-1 text-[15px] font-bold text-ink">{student?.name}</p>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              {request.paper} · {request.title} · {evaluation ? cohortById(evaluation.cohortId)?.name : ""}
            </p>
          </div>
          <StatusPill status={request.status} tone={STATUS_TONE[request.status]}>
            {STATUS_LABEL[request.status]}
          </StatusPill>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 sm:grid-cols-4">
          <Fact label="Original marks" value={`${request.originalMarks} / ${request.maxMarks}`} />
          <Fact label="Requested" value={formatAccaDate(request.requestedOn)} />
          <Fact label="Original marker" value={`${staffName(originalMarker)}${isOriginal ? " (you)" : ""}`} small />
          <Fact label="Second marker" value={`${staffName(secondMarker)}${secondMarker === staffId ? " (you)" : ""}`} small />
        </dl>
        <div className="border-t border-line px-5 py-4">
          <MiniLabel>Learner&apos;s request</MiniLabel>
          <p className="mt-1.5 rounded-[var(--radius-md)] border-l-2 border-cta bg-surface-2 px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink">{request.reason}</p>
        </div>
      </Card>

      {evaluation ? (
        <Card className="min-w-0">
          <CardHeader title="Script" sub={evaluation.question} />
          <div className="space-y-4 border-t border-line px-5 py-4">
            <div>
              <MiniLabel>Answer excerpt</MiniLabel>
              <p className="mt-1.5 text-[13.5px] leading-[1.75] text-ink-2 [overflow-wrap:anywhere]">{evaluation.answerExcerpt}</p>
            </div>
            {evaluation.feedback ? (
              <div>
                <MiniLabel>Original feedback · {staffName(originalMarker)}</MiniLabel>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{evaluation.feedback}</p>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="min-w-0">
        <CardHeader
          title={isOriginal ? "Original marks by criterion" : "Second marker view"}
          sub={
            isOriginal
              ? `${staffName(secondMarker)} re-marks the script independently. Add your response to the learner's point below.`
              : "Mark each criterion without adjusting towards the original, then record a moderation note."
          }
          action={
            !isOriginal && complete ? (
              <span className="font-mono text-[13px] font-semibold text-ink tnum">
                {secondTotal} / {request.maxMarks}
              </span>
            ) : null
          }
        />
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[30rem] text-[13px]">
            <caption className="sr-only">Original and second marks by criterion</caption>
            <thead>
              <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                <th scope="col" className="px-5 py-2.5">Criterion</th>
                <th scope="col" className="px-3 py-2.5 text-right">Out of</th>
                <th scope="col" className="px-3 py-2.5 text-right">Original</th>
                <th scope="col" className="px-5 py-2.5 text-right">{closed ? "Outcome" : isOriginal ? "Second marker" : "Your marks"}</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => (
                <tr key={c.id} className="border-t border-line">
                  <th scope="row" className="px-5 py-3 text-left font-semibold text-ink">
                    {c.label}
                  </th>
                  <td className="px-3 py-3 text-right font-mono text-ink-3 tnum">{c.marks}</td>
                  <td className="px-3 py-3 text-right font-mono text-ink-2 tnum">{original[c.id] ?? 0}</td>
                  <td className="px-5 py-3 text-right">
                    {closed ? (
                      <span className="font-mono text-ink tnum">{request.status === "revised" ? (second[c.id] ?? original[c.id]) : original[c.id]}</span>
                    ) : isOriginal ? (
                      <span className="text-[12px] text-ink-3">Not shared until decided</span>
                    ) : (
                      <Input
                        type="number"
                        min={0}
                        max={c.marks}
                        value={second[c.id] ?? ""}
                        onChange={(e) => {
                          const v = e.target.value === "" ? undefined : Math.max(0, Math.min(c.marks, Number(e.target.value)));
                          setSecond((s) => {
                            const next = { ...s };
                            if (v === undefined) delete next[c.id];
                            else next[c.id] = v;
                            return next;
                          });
                        }}
                        className="ml-auto h-8 w-16 px-2 text-right font-mono text-[13px]"
                        aria-label={`${c.label}: your mark out of ${c.marks}`}
                      />
                    )}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-line bg-surface-2">
                <th scope="row" className="px-5 py-3 text-left font-bold text-ink">
                  Total
                </th>
                <td className="px-3 py-3 text-right font-mono text-ink-3 tnum">{request.maxMarks}</td>
                <td className="px-3 py-3 text-right font-mono font-semibold text-ink tnum">{request.originalMarks}</td>
                <td className="px-5 py-3 text-right font-mono font-semibold text-ink tnum">
                  {closed ? (request.status === "revised" ? request.revisedMarks : request.originalMarks) : isOriginal ? "" : complete ? secondTotal : ""}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {!isOriginal && !closed && complete ? (
          <p className={cn("border-t border-line px-5 py-3 text-[12.5px]", diff === 0 ? "text-ink-2" : diff > 0 ? "text-jade" : "text-rose")}>
            {diff === 0
              ? "Your marks match the original. Uphold the original marks."
              : `Your marks are ${plural(Math.abs(diff), "mark")} ${diff > 0 ? "higher" : "lower"} than the original.`}
          </p>
        ) : null}
      </Card>

      {closed ? (
        <Card className="min-w-0 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Scale aria-hidden className="size-5 text-ink-3" />
            {request.status === "revised" ? (
              <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-ink">
                Revised from <span className="font-mono tnum">{request.originalMarks}</span>
                <ArrowRight aria-hidden className="size-4 text-ink-3" />
                <span className="font-mono text-jade tnum">{request.revisedMarks}</span> of {request.maxMarks}
              </p>
            ) : (
              <p className="text-[14px] font-semibold text-ink">
                Original marks of {request.originalMarks} / {request.maxMarks} upheld
              </p>
            )}
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">
            Decided by the panel of {request.panelIds.map((id) => staffName(id)).join(" and ")}. {firstNameOf(student?.name ?? "The learner")} has been told the outcome with the moderation note.
          </p>
        </Card>
      ) : isOriginal ? (
        <Card className="min-w-0">
          <CardHeader title="Marker response" sub={`Sent to ${staffName(secondMarker)} with the script and your original marking`} />
          <div className="border-t border-line px-5 py-4">
            <Textarea
              rows={4}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder={`What you credited, and whether the learner's point about the script changes it.`}
            />
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <Button
                disabled={!response.trim()}
                onClick={() => {
                  onUpdate({ status: "under-review" });
                  setResponse("");
                  toast({ title: "Response sent to the second marker", body: `${staffName(secondMarker)} · ${request.title}`, tone: "info" });
                }}
              >
                <MessageSquare className="size-4" />
                Send response
              </Button>
              <span className="text-[12px] text-ink-3">The second marker records the decision.</span>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="min-w-0">
          <CardHeader title="Moderation note" sub="Shared with the original marker and the learner with the outcome" />
          <div className="border-t border-line px-5 py-4">
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Where the marking guide supports or does not support the learner's point, and the mark you settled on."
            />
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <Button
                disabled={!complete || !note.trim() || diff === 0}
                onClick={() => {
                  onUpdate({ status: "revised", revisedMarks: secondTotal });
                  toast({
                    title: "Marks revised",
                    body: `${student?.name} · ${request.originalMarks} to ${secondTotal} of ${request.maxMarks} · moderation note shared`,
                  });
                }}
              >
                <Check className="size-4" />
                {complete && diff !== 0 ? `Revise marks to ${secondTotal}` : "Revise marks"}
              </Button>
              <Button
                variant="secondary"
                disabled={!note.trim()}
                onClick={() => {
                  onUpdate({ status: "upheld" });
                  toast({ title: "Original marks upheld", body: `${student?.name} · ${request.originalMarks} of ${request.maxMarks} · moderation note shared`, tone: "neutral" });
                }}
              >
                <Scale className="size-4" />
                Uphold original marks
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onUpdate({ status: "under-review" });
                  toast({ title: "Re-evaluation saved", body: `Under review · ${me.name}`, tone: "neutral" });
                }}
              >
                <Save className="size-4" />
                Save progress
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function Fact({ label, value, small }: { label: string; value: React.ReactNode; small?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-3">{label}</dt>
      <dd className={cn("mt-0.5 font-semibold text-ink", small ? "text-[13px]" : "font-mono text-[15px] tnum")}>{value}</dd>
    </div>
  );
}
