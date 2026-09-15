"use client";

import { useState } from "react";
import { formatDateTime, studentById, type Ticket } from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/field";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { STATUS_LABELS, formatHours, learnerLine, median } from "./support-helpers";

function toneFor(action: string): TimelineItem["tone"] {
  if (action.startsWith("Resolved")) return "jade";
  if (action.startsWith("Escalated")) return "rose";
  if (action.startsWith("Raised")) return "info";
  if (action.startsWith("Asked") || action.startsWith("Reopened")) return "amber";
  return "neutral";
}

export function SupportHistoryCard({ tickets, onOpenTicket }: { tickets: Ticket[]; onOpenTicket: (id: string) => void }) {
  const learners = [...new Set(tickets.map((t) => t.studentId))]
    .map((id) => ({ id, name: studentById(id)?.name ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const [studentId, setStudentId] = useState("s-anaya");

  const mine = tickets.filter((t) => t.studentId === studentId);
  const resolved = mine.filter((t) => t.status === "resolved");
  const med = median(resolved.map((t) => t.resolutionHours ?? 0));

  const events = mine
    .flatMap((t) => t.history.map((h, i) => ({ t, h, i })))
    .sort((a, b) => b.h.at.localeCompare(a.h.at) || b.i - a.i);

  const items: TimelineItem[] = events.map(({ t, h }) => ({
    id: `${t.id}-${h.id}`,
    title: h.action,
    meta: `${formatDateTime(h.at)} · ${h.actor}`,
    tone: toneFor(h.action),
    body: (
      <>
        <button
          type="button"
          onClick={() => onOpenTicket(t.id)}
          className="text-left font-medium text-ink underline decoration-cta decoration-2 underline-offset-4 hover:decoration-cta-strong"
        >
          <span className="font-mono text-[12px]">{t.id}</span> · {t.subject}
        </button>
        {h.note ? <span className="mt-0.5 block text-ink-3">{h.note}</span> : null}
      </>
    ),
  }));

  return (
    <Card className="min-w-0">
      <CardHeader title="Support history" sub="Every ticket and action for one learner, newest first" />
      <div className="space-y-4 px-5 pb-5">
        <Select aria-label="Choose a learner" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
          {learners.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} · {learnerLine(l.id)}
            </option>
          ))}
        </Select>
        <dl className="grid grid-cols-3 gap-2">
          {[
            ["Tickets", String(mine.length)],
            ["Open", String(mine.length - resolved.length)],
            ["Median resolution", med != null ? formatHours(med) : "None yet"],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2">
              <dt className="text-[11px] leading-tight font-bold tracking-[0.08em] text-ink-3 uppercase">{k}</dt>
              <dd className="mt-1 font-display text-[18px] leading-none font-bold text-ink tnum">{v}</dd>
            </div>
          ))}
        </dl>
        {mine.length ? (
          <p className="text-[12px] text-ink-3">
            Latest: {STATUS_LABELS[mine[0].status]} · {mine[0].category}
          </p>
        ) : null}
        <div className="scrollbar-slim max-h-[26rem] overflow-y-auto pr-1">
          <Timeline dense items={items} empty="No tickets from this learner." />
        </div>
      </div>
    </Card>
  );
}
