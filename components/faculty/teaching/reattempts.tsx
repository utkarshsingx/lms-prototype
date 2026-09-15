"use client";

import { useState } from "react";
import { Check, Lock, RotateCcw, Send, X } from "lucide-react";
import {
  cohortsForStudent,
  formatAccaDate,
  formatShortDate,
  staffName,
  studentById,
  type ReattemptRequest,
} from "@/lib/data/acca";
import { PERMISSION_LABELS } from "@/lib/personas";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormDrawer } from "@/components/ui/form-drawer";
import { StatusPill } from "@/components/ui/status";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, useFaculty } from "./shared";

export type ReattemptPatch = Partial<Pick<ReattemptRequest, "status" | "decidedBy" | "decidedOn" | "attemptsAllowed">>;

type Decision = { kind: "approve" | "decline"; request: ReattemptRequest } | null;

const CONDITIONS = [
  "Complete the recommended remedial learning first",
  "Attend the next doubt-clearing session first",
  "No condition",
];

const DECLINE_REASONS = [
  "Attempts used within the published policy",
  "Evidence does not support the request",
  "Better served by the next scheduled test",
  "Request raised after the appeal window",
];

/** "Approve reattempts where authorised": approve or decline with a new window, or recommend when not authorised. */
export function ReattemptRequests({
  requests,
  onDecide,
}: {
  requests: ReattemptRequest[];
  onDecide: (id: string, patch: ReattemptPatch) => void;
}) {
  const { staffId, me, canApprove } = useFaculty();
  const [filter, setFilter] = useState("pending");
  const [decision, setDecision] = useState<Decision>(null);
  const [windows, setWindows] = useState<Record<string, string>>({});
  const [recommended, setRecommended] = useState<string[]>([]);

  const pending = requests.filter((r) => r.status === "pending");
  const list = (filter === "pending" ? pending : filter === "decided" ? requests.filter((r) => r.status !== "pending") : requests)
    .slice()
    .sort((a, b) => b.requestedOn.localeCompare(a.requestedOn));

  const reason = `Needs the "${PERMISSION_LABELS["faculty:approve-reattempt"]}" permission. You can recommend a decision to an authorised reviewer.`;
  const request = decision?.request;
  const learner = request ? studentById(request.studentId) : undefined;

  return (
    <div className="space-y-4">
      <Card className="min-w-0">
        <CardHeader
          title="Approve reattempts where authorised"
          sub={
            canApprove
              ? "You are authorised to approve reattempts on your papers. Every decision is logged and the learner is notified."
              : "You can review these requests and recommend a decision. Approval sits with an authorised reviewer."
          }
          action={
            canApprove ? (
              <StatusPill status="authorised" tone="jade" size="sm">
                Authorised
              </StatusPill>
            ) : (
              <ViewOnlyChip label="Approval not authorised" reason={reason} />
            )
          }
        />
        <div className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { id: "pending", label: `Pending (${pending.length})` },
              { id: "decided", label: "Decided" },
              { id: "all", label: "All" },
            ]}
          />
          <p className="ml-auto text-[12px] text-ink-3">Requests on {Array.from(new Set(requests.map((r) => r.paper))).join(", ") || "your papers"}</p>
        </div>
      </Card>

      {list.length === 0 ? (
        <Card className="px-5 py-10 text-center text-[13px] text-ink-3">No reattempt requests in this view.</Card>
      ) : null}

      <ul className="space-y-3">
        {list.map((r) => {
          const s = studentById(r.studentId);
          const cohort = cohortsForStudent(r.studentId).find((c) => c.papers.includes(r.paper));
          const isRecommended = recommended.includes(r.id);
          return (
            <li key={r.id}>
              <Card className={cn("min-w-0", r.status === "pending" && "border-line-strong")}>
                <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Avatar name={s?.name ?? "Learner"} size="sm" />
                      <p className="min-w-0 text-[14.5px] font-bold text-ink">{s?.name}</p>
                      <StatusPill status={r.status} size="sm" />
                      {isRecommended && r.status === "pending" ? (
                        <StatusPill status="recommended" tone="info" size="sm">
                          Recommended by you
                        </StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-2 text-[13.5px] font-semibold text-ink">
                      {r.paper} · {r.title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {cohort?.name ?? "Cohort not listed"} · requested {formatAccaDate(r.requestedOn)}
                    </p>
                    <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Fact label="Attempts used" value={`${r.attemptsUsed} of ${r.attemptsAllowed}`} />
                      <Fact label="Last score" value={<span className={r.lastScore < 50 ? "text-rose" : "text-jade"}>{r.lastScore}%</span>} />
                      <Fact label="Pass mark" value="50%" />
                    </dl>
                    <blockquote className="mt-3 rounded-[var(--radius-md)] border-l-2 border-cta bg-surface-2 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink-2">
                      <MiniLabel className="mb-1">Learner&apos;s reason</MiniLabel>
                      {r.reason}
                    </blockquote>
                    {r.status !== "pending" ? (
                      <p className="mt-3 text-[12.5px] text-ink-2">
                        {r.status === "approved" ? "Approved" : "Declined"} by {staffName(r.decidedBy)}
                        {r.decidedOn ? ` on ${formatAccaDate(r.decidedOn)}` : ""}
                        {windows[r.id] ? ` · ${windows[r.id]}` : ""}
                      </p>
                    ) : null}
                  </div>

                  {r.status === "pending" ? (
                    <div className="flex flex-wrap gap-2 lg:w-52 lg:flex-col lg:items-stretch">
                      <GatedButton
                        allowed={canApprove}
                        reason={reason}
                        wrapperClassName="lg:w-full"
                        className="lg:w-full"
                        onClick={() => setDecision({ kind: "approve", request: r })}
                      >
                        {canApprove ? <Check className="size-4" /> : <Lock className="size-4" />}
                        Approve reattempt
                      </GatedButton>
                      <GatedButton
                        allowed={canApprove}
                        reason={reason}
                        variant="outline"
                        wrapperClassName="lg:w-full"
                        className="lg:w-full"
                        onClick={() => setDecision({ kind: "decline", request: r })}
                      >
                        <X className="size-4" />
                        Decline
                      </GatedButton>
                      {!canApprove ? (
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={isRecommended}
                          className="lg:w-full"
                          onClick={() => {
                            setRecommended((ids) => [...ids, r.id]);
                            toast({
                              title: "Recommendation sent",
                              body: `${s?.name} · ${r.title} · sent to Marcus Bell, authorised to approve reattempts`,
                              tone: "info",
                            });
                          }}
                        >
                          <Send className="size-4" />
                          {isRecommended ? "Recommendation sent" : "Recommend approval"}
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <FormDrawer
        key={decision ? `${decision.kind}-${decision.request.id}` : "closed"}
        open={decision !== null}
        onClose={() => setDecision(null)}
        title={decision?.kind === "decline" ? "Decline reattempt" : "Approve reattempt"}
        sub={request ? `${learner?.name} · ${request.paper} · ${request.title}` : undefined}
        submitLabel={decision?.kind === "decline" ? "Decline request" : "Approve reattempt"}
        destructive={decision?.kind === "decline"}
        disabled={!canApprove}
        disabledReason={reason}
        footerNote="The learner and their mentor are notified."
        onSubmit={(data) => {
          if (!request || !decision) return;
          if (decision.kind === "approve") {
            const extra = Number(data.get("extra") || 1);
            const opens = String(data.get("opens") || "2026-09-16");
            const closes = String(data.get("closes") || "2026-09-23");
            onDecide(request.id, {
              status: "approved",
              decidedBy: staffId,
              decidedOn: "2026-09-14",
              attemptsAllowed: request.attemptsAllowed + extra,
            });
            setWindows((w) => ({ ...w, [request.id]: `attempt ${request.attemptsUsed + 1} open ${formatShortDate(opens)} to ${formatShortDate(closes)}` }));
            toast({
              title: "Reattempt approved",
              body: `${learner?.name} · attempt ${request.attemptsUsed + 1} opens ${formatShortDate(opens)} · ${String(data.get("condition"))}`,
            });
          } else {
            onDecide(request.id, { status: "declined", decidedBy: staffId, decidedOn: "2026-09-14" });
            toast({ title: "Reattempt declined", body: `${learner?.name} · ${String(data.get("reason"))}`, tone: "warning" });
          }
          setDecision(null);
        }}
      >
        {request ? (
          <>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 text-[12.5px] text-ink-2">
              <p>
                <span className="font-semibold text-ink">{request.attemptsUsed} of {request.attemptsAllowed}</span> attempts used · last score{" "}
                <span className="font-semibold text-ink">{request.lastScore}%</span>
              </p>
              <p className="mt-1">{request.reason}</p>
            </div>
            {decision?.kind === "approve" ? (
              <>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Extra attempts">
                    <Select name="extra" defaultValue="1">
                      <option value="1">1</option>
                      <option value="2">2</option>
                    </Select>
                  </Field>
                  <Field label="Window opens">
                    <Input name="opens" type="date" defaultValue="2026-09-16" min="2026-09-14" required />
                  </Field>
                  <Field label="Window closes">
                    <Input name="closes" type="date" defaultValue="2026-09-23" min="2026-09-14" required />
                  </Field>
                </div>
                <Field label="Condition">
                  <Select name="condition" defaultValue={CONDITIONS[0]}>
                    {CONDITIONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Note to learner" hint="Optional">
                  <Textarea
                    name="note"
                    rows={3}
                    defaultValue={`Your reattempt for ${request.title} is approved. Work through the recommended material before you start.`}
                  />
                </Field>
                <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                  <RotateCcw aria-hidden className="size-3.5" />
                  Decision recorded as {me.name} on 14 Sep 2026
                </p>
              </>
            ) : (
              <>
                <Field label="Reason">
                  <Select name="reason" defaultValue={DECLINE_REASONS[0]}>
                    {DECLINE_REASONS.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Explanation to learner">
                  <Textarea name="note" rows={4} required placeholder="Explain the decision and what the learner can do next." />
                </Field>
              </>
            )}
          </>
        ) : null}
      </FormDrawer>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-mono text-[14px] font-semibold text-ink tnum">{value}</dd>
    </div>
  );
}
