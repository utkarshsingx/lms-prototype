"use client";

import { useState } from "react";
import { CalendarPlus, Check, CircleStop, MessageCircleQuestion, Play, Plus, ThumbsUp } from "lucide-react";
import {
  cohortById,
  doubtSessions,
  doubtsForFaculty,
  formatAccaDate,
  formatShortDate,
  studentName,
  type Doubt,
  type DoubtSession,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { LiveDot } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FormDrawer } from "@/components/ui/form-drawer";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { PaperMark, areaTitle, dayLabel, endTime, plural, useFaculty } from "./shared";

type SessionRow = DoubtSession & { live?: boolean; answered?: number };
type QueueItem = { id: string; question: string; who: string; topic: string; upvotes: number; source: string };

function queueFrom(doubt: Doubt): QueueItem {
  return {
    id: doubt.id,
    question: doubt.question,
    who: studentName(doubt.studentId),
    topic: `${doubt.paper} ${doubt.syllabusArea} · ${doubt.topic}`,
    upvotes: doubt.upvotes,
    source: doubt.source,
  };
}

/** "Conduct doubt-clearing sessions": schedule, run the queue live, and close with a summary. */
export function DoubtSessions() {
  const { staffId, cohorts } = useFaculty();
  const [sessions, setSessions] = useState<SessionRow[]>(() => doubtSessions.filter((d) => d.facultyId === staffId));
  const [filter, setFilter] = useState("upcoming");
  const firstOpen = sessions.find((s) => s.status !== "completed");
  const [selectedId, setSelectedId] = useState(firstOpen?.id ?? sessions[0]?.id ?? "");
  const [queues, setQueues] = useState<Record<string, QueueItem[]>>({});
  const [draftQ, setDraftQ] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // Open and session-bound questions on the session's paper join its queue.
  const seedQueue = (s: SessionRow) =>
    doubtsForFaculty(staffId)
      .filter((d) => d.paper === s.paper && (d.status === "open" || d.status === "scheduled-for-session"))
      .map(queueFrom);

  const list = sessions
    .filter((s) => (filter === "upcoming" ? s.status !== "completed" : s.status === "completed"))
    .sort((a, b) => (filter === "upcoming" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)));
  const selected = sessions.find((s) => s.id === selectedId) ?? list[0];
  const queue = selected ? (queues[selected.id] ?? (selected.status === "completed" ? [] : seedQueue(selected))) : [];

  const patch = (id: string, p: Partial<SessionRow>) => setSessions((all) => all.map((s) => (s.id === id ? { ...s, ...p } : s)));
  const setQueue = (id: string, items: QueueItem[]) => setQueues((q) => ({ ...q, [id]: items }));

  return (
    <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { id: "upcoming", label: "Today and upcoming" },
              { id: "past", label: "Held" },
            ]}
          />
          <Button size="sm" variant="secondary" onClick={() => setScheduling(true)}>
            <CalendarPlus className="size-3.5" />
            Schedule
          </Button>
        </div>
        <ul className="scrollbar-slim max-h-[24rem] space-y-2 overflow-y-auto xl:max-h-[40rem]">
          {list.map((s) => {
            const on = s.id === selected?.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelectedId(s.id)}
                  className={cn(
                    "flex w-full min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
                    on ? "border-cta-strong bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                  )}
                >
                  <PaperMark code={s.paper} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[12px] text-ink-2 tnum">
                      {dayLabel(s.start)} · {s.start.slice(11, 16)}
                    </span>
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{s.title}</span>
                    <span className="block truncate text-[12px] text-ink-3">{cohortById(s.cohortId)?.name}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    {s.live ? (
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-rose">
                        <LiveDot /> Live
                      </span>
                    ) : (
                      <StatusPill status={s.status} size="sm" />
                    )}
                    <span className="text-[11.5px] text-ink-3 tnum">
                      {s.status === "completed" ? `${s.attendees} attended` : `${s.questionsQueued} queued`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selected ? (
        <div className="min-w-0 space-y-4">
          <Card className="min-w-0">
            <div className="flex flex-wrap items-start gap-4 p-5">
              <PaperMark code={selected.paper} size="lg" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Conduct doubt-clearing sessions</p>
                <h3 className="mt-1 font-display text-[21px] leading-tight font-bold tracking-[-0.02em] text-ink">{selected.title}</h3>
                <p className="mt-1 text-[13px] text-ink-2">
                  {formatAccaDate(selected.start)} · {selected.start.slice(11, 16)} to {endTime(selected.start, selected.durationMins)} · {cohortById(selected.cohortId)?.name}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{selected.link.replace("https://", "")}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {selected.status === "completed" ? (
                  <StatusPill status="completed" />
                ) : selected.live ? (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const attendees = Math.round((cohortById(selected.cohortId)?.size ?? 20) * 0.45);
                      patch(selected.id, { live: false, status: "completed", attendees });
                      toast({
                        title: "Doubt-clearing session ended",
                        body: `${plural(selected.answered ?? 0, "question")} answered · ${attendees} attended · recording added to Recordings`,
                      });
                    }}
                  >
                    <CircleStop className="size-4" />
                    End session
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      patch(selected.id, { live: true, answered: 0 });
                      setQueue(selected.id, queue);
                      toast({ title: "Doubt-clearing session started", body: `${cohortById(selected.cohortId)?.name} · ${plural(queue.length, "question")} in the queue` });
                    }}
                  >
                    <Play className="size-4" />
                    Start session
                  </Button>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-line px-5 py-4 sm:grid-cols-4">
              <Stat label="Queued by learners" value={selected.questionsQueued} />
              <Stat label="In your queue" value={selected.status === "completed" ? 0 : queue.length} />
              <Stat label="Answered live" value={selected.answered ?? (selected.status === "completed" ? Math.max(3, Math.round(selected.attendees / 3)) : 0)} />
              <Stat label="Attended" value={selected.status === "completed" ? selected.attendees : selected.live ? "In progress" : "Not started"} />
            </dl>
          </Card>

          {selected.status === "completed" ? (
            <Card className="p-5 text-[13px] text-ink-2">
              Session held on {formatAccaDate(selected.start)} with {selected.attendees} learners. Questions answered live were closed on the Student questions page and the recording was added to the cohort&apos;s recordings.
            </Card>
          ) : (
            <Card className="min-w-0">
              <CardHeader
                title="Question queue"
                sub={`Open ${selected.paper} questions from your cohorts, most upvoted first`}
                action={<MessageCircleQuestion aria-hidden className="size-4 text-ink-3" />}
              />
              <ul className="divide-y divide-line border-t border-line">
                {queue.length === 0 ? <li className="px-5 py-5 text-[13px] text-ink-3">The queue is empty. Add a question raised in chat below.</li> : null}
                {queue
                  .slice()
                  .sort((a, b) => b.upvotes - a.upvotes)
                  .map((item) => (
                    <li key={item.id} className="px-5 py-3.5">
                      <div className="flex flex-wrap items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13.5px] leading-relaxed text-ink">{item.question}</p>
                          <p className="mt-1 text-[12px] text-ink-3">
                            {item.who} · {item.topic} · {item.source}
                          </p>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink-2 tnum">
                          <ThumbsUp aria-hidden className="size-3.5" /> {item.upvotes}
                        </span>
                      </div>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <span title={selected.live ? undefined : "Start the session to answer live"} className="inline-flex">
                          <Button
                            size="xs"
                            variant="secondary"
                            disabled={!selected.live}
                            onClick={() => {
                              setQueue(selected.id, queue.filter((q) => q.id !== item.id));
                              patch(selected.id, { answered: (selected.answered ?? 0) + 1 });
                              toast({ title: "Answered in session", body: `${item.who} notified · the doubt is marked answered` });
                            }}
                          >
                            <Check className="size-3.5" />
                            Answered in session
                          </Button>
                        </span>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setQueue(selected.id, queue.filter((q) => q.id !== item.id));
                            toast({ title: "Moved to Student questions", body: "It needs a written answer", tone: "info" });
                          }}
                        >
                          Needs a written answer
                        </Button>
                      </div>
                    </li>
                  ))}
              </ul>
              <form
                className="flex flex-wrap items-end gap-2 border-t border-line px-5 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draftQ.trim()) return;
                  setQueue(selected.id, [
                    ...queue,
                    { id: `chat-${selected.id}-${queue.length + 1}`, question: draftQ.trim(), who: "Raised in chat", topic: `${selected.paper} · live session`, upvotes: 0, source: "Chat" },
                  ]);
                  setDraftQ("");
                  toast({ title: "Added to the queue", tone: "info" });
                }}
              >
                <Field label="Add a question raised in chat" className="min-w-0 flex-1">
                  <Input value={draftQ} onChange={(e) => setDraftQ(e.target.value)} placeholder="e.g. Is goodwill impairment shared with NCI?" />
                </Field>
                <Button type="submit" variant="outline">
                  <Plus className="size-4" />
                  Add
                </Button>
              </form>
            </Card>
          )}
        </div>
      ) : null}

      <FormDrawer
        open={scheduling}
        onClose={() => setScheduling(false)}
        title="Schedule doubt-clearing session"
        sub="Learners in the cohort can queue questions as soon as it is scheduled."
        submitLabel="Schedule session"
        onSubmit={(data) => {
          const cohortId = String(data.get("cohort"));
          const cohort = cohortById(cohortId);
          const date = String(data.get("date") || "2026-09-18");
          const time = String(data.get("time") || "20:00");
          const focus = String(data.get("focus") ?? "").trim();
          const paper = cohort?.papers[0] ?? "FR";
          const row: SessionRow = {
            id: `ds-new-${sessions.length + 1}`,
            cohortId,
            paper,
            facultyId: staffId,
            start: `${date}T${time}`,
            durationMins: Number(data.get("duration") || 60),
            title: focus ? `${paper} doubt-clearing · ${focus}` : `${paper} doubt-clearing`,
            status: date === "2026-09-14" ? "today" : "upcoming",
            questionsQueued: 0,
            attendees: 0,
            link: cohort?.sections[0]?.onlineLink ?? "https://live.zskillup.com/doubts",
          };
          setSessions((all) => [...all, row]);
          setFilter("upcoming");
          setSelectedId(row.id);
          setScheduling(false);
          toast({ title: "Doubt-clearing session scheduled", body: `${cohort?.name} · ${formatShortDate(date)} at ${time} · learners notified` });
        }}
      >
        <Field label="Cohort">
          <Select name="cohort" defaultValue={cohorts[0]?.id}>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date">
            <Input name="date" type="date" defaultValue="2026-09-18" min="2026-09-14" required />
          </Field>
          <Field label="Start">
            <Input name="time" type="time" defaultValue="20:00" required />
          </Field>
          <Field label="Duration">
            <Select name="duration" defaultValue="60">
              <option value="45">45 min</option>
              <option value="60">60 min</option>
              <option value="90">90 min</option>
            </Select>
          </Field>
        </div>
        <Field label="Focus" hint="Optional">
          <Input name="focus" placeholder={`e.g. ${areaTitle(cohorts[0]?.papers[0] ?? "FR", "D")}`} />
        </Field>
        <Field label="Message to learners" hint="Optional">
          <Textarea name="message" rows={3} defaultValue="Post your questions on the Doubts page before the session so we can group similar ones." />
        </Field>
      </FormDrawer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 font-display text-[20px] leading-none font-bold tracking-[-0.02em] text-ink tnum">{value}</dd>
    </div>
  );
}
