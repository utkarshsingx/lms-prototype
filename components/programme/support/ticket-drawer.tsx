"use client";

import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Clock3, MessageSquareReply, PauseCircle, RotateCcw } from "lucide-react";
import {
  TICKET_CATEGORIES,
  cohortById,
  formatDateTime,
  staffName,
  studentById,
  universityById,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/data/acca";
import { Drawer } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import {
  CHANNEL_LABELS,
  PRIORITY_LABELS,
  PRIORITY_TONES,
  STATUS_LABELS,
  SUPPORT_ASSIGNEES,
  assigneeLabel,
  cannedResponsesFor,
  escalationTargets,
  formatHours,
  formatMins,
  hoursBetween,
  learnerLine,
  slaState,
} from "./support-helpers";

const label = "text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase";

function historyTone(action: string): TimelineItem["tone"] {
  if (action.startsWith("Resolved")) return "jade";
  if (action.startsWith("Escalated")) return "rose";
  if (action.startsWith("Raised")) return "info";
  if (action.startsWith("Asked") || action.startsWith("Reopened")) return "amber";
  return "neutral";
}

export type TicketActions = {
  /** Applies `fn` to the ticket and appends a history entry stamped by the page clock. */
  update: (id: string, fn: (t: Ticket, at: string) => Ticket, entry?: { action: string; note?: string }) => string;
};

export function TicketDrawer({
  ticket,
  allTickets,
  onClose,
  onOpenTicket,
  actions,
  canAct,
}: {
  ticket: Ticket | null;
  allTickets: Ticket[];
  onClose: () => void;
  onOpenTicket: (id: string) => void;
  actions: TicketActions;
  canAct: boolean;
}) {
  return (
    <Drawer
      open={ticket !== null}
      onClose={onClose}
      width="w-full max-w-2xl"
      title={ticket ? `${ticket.id} · ${ticket.subject}` : "Ticket"}
      sub={
        ticket
          ? `${studentById(ticket.studentId)?.name ?? "Learner"} · raised ${formatDateTime(ticket.created)} via ${CHANNEL_LABELS[ticket.channel]}`
          : undefined
      }
    >
      {ticket ? (
        <TicketBody
          key={ticket.id}
          ticket={ticket}
          allTickets={allTickets}
          onOpenTicket={onOpenTicket}
          actions={actions}
          canAct={canAct}
        />
      ) : null}
    </Drawer>
  );
}

function TicketBody({
  ticket: t,
  allTickets,
  onOpenTicket,
  actions,
  canAct,
}: {
  ticket: Ticket;
  allTickets: Ticket[];
  onOpenTicket: (id: string) => void;
  actions: TicketActions;
  canAct: boolean;
}) {
  const [reply, setReply] = useState("");
  const [canned, setCanned] = useState("");
  const [escalating, setEscalating] = useState(false);
  const targets = escalationTargets(t);
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const [reason, setReason] = useState("");

  const student = studentById(t.studentId);
  const sla = slaState(t);
  const resolved = t.status === "resolved";
  const academic = t.category === "Academic";
  const cannedOptions = cannedResponsesFor(t.category);
  const others = allTickets.filter((x) => x.studentId === t.studentId && x.id !== t.id);
  const lockedReason = canAct ? undefined : "Your role cannot work support tickets.";

  const history: TimelineItem[] = t.history.map((h) => ({
    id: h.id,
    title: h.action,
    meta: `${formatDateTime(h.at)} · ${h.actor}`,
    body: h.note,
    tone: historyTone(h.action),
  }));

  const sendReply = () => {
    const text = reply.trim();
    if (!text) {
      toast({ title: "Write a reply first", body: "Pick a canned response or type a message.", tone: "warning" });
      return;
    }
    actions.update(
      t.id,
      (x, at) => ({
        ...x,
        status: x.status === "open" ? "in-progress" : x.status,
        firstResponseMins: x.firstResponseMins ?? Math.max(1, Math.round(hoursBetween(x.created, at) * 60)),
      }),
      { action: "Reply sent to the learner", note: text },
    );
    setReply("");
    setCanned("");
    toast({ title: `Reply sent on ${t.id}`, body: `${student?.name ?? "The learner"} is notified in the app and by ${CHANNEL_LABELS[t.channel] === "Portal" ? "email" : CHANNEL_LABELS[t.channel]}.` });
  };

  const resolve = () => {
    const note = reply.trim();
    const at = actions.update(
      t.id,
      (x, stamp) => {
        const hours = Math.max(1, Math.round(hoursBetween(x.created, stamp)));
        return {
          ...x,
          status: "resolved",
          resolutionHours: hours,
          firstResponseMins: x.firstResponseMins ?? Math.max(1, Math.round(hoursBetween(x.created, stamp) * 60)),
        };
      },
      { action: "Resolved", note: note || "Query answered and closed." },
    );
    setReply("");
    const hours = Math.max(1, Math.round(hoursBetween(t.created, at)));
    toast({ title: `${t.id} resolved`, body: `Turnaround ${formatHours(hours)} · ${hours <= t.slaHours ? "within" : "outside"} the ${t.slaHours}h SLA` });
  };

  const escalate = () => {
    if (!target || !reason.trim()) {
      toast({ title: "Add who and why", body: "Choose where to escalate and give a reason.", tone: "warning" });
      return;
    }
    actions.update(t.id, (x) => ({ ...x, status: "escalated", escalatedTo: target }), {
      action: `Escalated to ${staffName(target)}`,
      note: reason.trim(),
    });
    setEscalating(false);
    setReason("");
    toast({
      title: academic ? `Escalated to faculty: ${staffName(target)}` : `Escalated to ${staffName(target)}`,
      body: `${t.id} · ${t.subject}`,
      tone: "warning",
    });
  };

  return (
    <div className="space-y-6 px-5 py-5">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={t.status}>{STATUS_LABELS[t.status]}</StatusPill>
        <StatusPill status={t.priority} tone={PRIORITY_TONES[t.priority]}>
          {PRIORITY_LABELS[t.priority]} priority
        </StatusPill>
        <StatusPill status="sla" tone={sla.tone}>
          {sla.label}
        </StatusPill>
        <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
          <Clock3 aria-hidden className="size-3.5" />
          {t.firstResponseMins != null ? `First response ${formatMins(t.firstResponseMins)}` : "No response yet"}
          {t.resolutionHours != null ? ` · resolved in ${formatHours(t.resolutionHours)}` : ""}
        </span>
      </div>

      <section className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={student?.name ?? "Learner"} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{student?.name}</p>
            <p className="truncate text-[12px] text-ink-3">
              {learnerLine(t.studentId)}
              {student?.universityId ? ` · ${universityById(student.universityId)?.shortName}` : ""}
              {student?.accaId ? ` · ACCA ID ${student.accaId}` : " · not registered with ACCA"}
            </p>
          </div>
          <Badge>{CHANNEL_LABELS[t.channel]}</Badge>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{t.body}</p>
        {student?.cohortIds.length ? (
          <p className="mt-2 text-[12px] text-ink-3">
            Cohorts: {student.cohortIds.map((id) => cohortById(id)?.name ?? id).join(", ")}
          </p>
        ) : null}
      </section>

      <section>
        <h3 className={label}>Categorise and assign</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Category">
            <Select
              value={t.category}
              disabled={!canAct}
              title={lockedReason}
              onChange={(e) => {
                const category = e.target.value as TicketCategory;
                actions.update(t.id, (x) => ({ ...x, category }), { action: `Categorised as ${category}` });
                toast({ title: `${t.id} categorised as ${category}` });
              }}
            >
              {TICKET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select
              value={t.priority}
              disabled={!canAct}
              title={lockedReason}
              onChange={(e) => {
                const priority = e.target.value as TicketPriority;
                const sla = { urgent: 4, high: 24, medium: 48, low: 72 }[priority];
                actions.update(t.id, (x) => ({ ...x, priority, slaHours: sla }), {
                  action: `Priority set to ${PRIORITY_LABELS[priority]}`,
                  note: `SLA ${sla} hours`,
                });
                toast({ title: `${t.id} priority set to ${PRIORITY_LABELS[priority]}`, body: `SLA is now ${sla} hours.` });
              }}
            >
              {(["urgent", "high", "medium", "low"] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assign to">
            <Select
              value={t.assigneeId ?? ""}
              disabled={!canAct}
              title={lockedReason}
              onChange={(e) => {
                const assigneeId = e.target.value || null;
                actions.update(t.id, (x) => ({ ...x, assigneeId }), {
                  action: assigneeId ? `Assigned to ${staffName(assigneeId)}` : "Unassigned",
                });
                toast({ title: assigneeId ? `${t.id} assigned to ${staffName(assigneeId)}` : `${t.id} unassigned` });
              }}
            >
              <option value="">Unassigned</option>
              {SUPPORT_ASSIGNEES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">
          Currently with <span className="font-semibold text-ink-2">{assigneeLabel(t.assigneeId)}</span>
          {t.escalatedTo ? (
            <>
              {" "}· escalated to <span className="font-semibold text-ink-2">{staffName(t.escalatedTo)}</span>
            </>
          ) : null}
        </p>
      </section>

      <section>
        <h3 className={label}>Conversation and actions</h3>
        <Timeline className="mt-4" dense items={history} />
      </section>

      <section className="space-y-3 rounded-[var(--radius-lg)] border border-line p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h3 className={label}>Reply to the learner</h3>
          <div className="w-full min-w-0 sm:w-72">
            <Select
              aria-label="Insert a canned response"
              value={canned}
              disabled={!canAct}
              onChange={(e) => {
                const pick = cannedOptions.find((c) => c.id === e.target.value);
                setCanned(e.target.value);
                if (pick) setReply(pick.body);
              }}
            >
              <option value="">Insert a canned response</option>
              {cannedOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Textarea
          rows={4}
          value={reply}
          disabled={!canAct}
          onChange={(e) => setReply(e.target.value)}
          placeholder={`Reply to ${student?.name.split(" ")[0] ?? "the learner"}. The note is also kept as the resolution note if you resolve.`}
        />
        <div className="flex flex-wrap items-center gap-2">
          {resolved ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!canAct}
              onClick={() => {
                actions.update(t.id, (x) => ({ ...x, status: "in-progress", resolutionHours: null }), {
                  action: "Reopened",
                });
                toast({ title: `${t.id} reopened`, tone: "warning" });
              }}
            >
              <RotateCcw className="size-4" /> Reopen
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" disabled={!canAct} onClick={resolve}>
                <CheckCircle2 className="size-4" /> Resolve
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={!canAct} onClick={sendReply}>
                <MessageSquareReply className="size-4" /> Send reply
              </Button>
              {t.status !== "waiting-on-student" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={!canAct}
                  onClick={() => {
                    actions.update(t.id, (x) => ({ ...x, status: "waiting-on-student" }), {
                      action: "Asked the learner for more information",
                      note: reply.trim() || undefined,
                    });
                    setReply("");
                    toast({ title: `${t.id} is waiting on the learner`, body: "The SLA clock pauses until they reply." });
                  }}
                >
                  <PauseCircle className="size-4" /> Waiting on learner
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:ml-auto"
                disabled={!canAct || targets.length === 0}
                onClick={() => setEscalating((v) => !v)}
                aria-expanded={escalating}
              >
                <ArrowUpRight className="size-4" /> {academic ? "Escalate to faculty" : "Escalate"}
              </Button>
            </>
          )}
        </div>

        {escalating && !resolved ? (
          <div className="space-y-3 rounded-[var(--radius-md)] border border-rose/30 bg-rose-soft p-3.5">
            <p className="text-[13px] font-semibold text-ink">
              {academic ? "Escalate this academic question to faculty" : "Escalate beyond student support"}
            </p>
            <Field label="Escalate to">
              <Select value={target} onChange={(e) => setTarget(e.target.value)}>
                {targets.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reason">
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={academic ? "e.g. Subject question on NCI at fair value that support cannot answer." : "e.g. Needs a decision on the fee waiver."}
              />
            </Field>
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEscalating(false)}>
                Cancel
              </Button>
              <Button type="button" variant="danger" size="sm" onClick={escalate}>
                Escalate
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <section>
        <h3 className={label}>Support history for {student?.name.split(" ")[0] ?? "this learner"}</h3>
        {others.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-3">No other tickets from this learner.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {others.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onOpenTicket(o.id)}
                  className="flex w-full min-w-0 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-cta-soft"
                >
                  <span className="shrink-0 font-mono text-[12px] text-ink-3">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{o.subject}</span>
                  <StatusPill status={o.status} size="sm">
                    {STATUS_LABELS[o.status]}
                  </StatusPill>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
