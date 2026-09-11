"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  Bot,
  CheckCheck,
  Clock,
  Phone,
  Send,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import {
  conversations,
  personById,
  whatsappTemplates,
  type ChatMessage,
  type Conversation,
} from "@/lib/data";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Badge, LiveDot, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { Button, IconButton } from "@/components/ui/button";
import { Select } from "@/components/ui/field";

type Stage = { label: string; tone: Tone; rank: number };

function stageOf(t: Conversation): Stage {
  if (t.handledBy === "human") return { label: "With a person", tone: "brand", rank: 2 };
  if (t.status === "escalated") return { label: "Needs a person", tone: "rose", rank: 0 };
  if (t.status === "resolved") return { label: "Resolved", tone: "jade", rank: 3 };
  return { label: "Assistant replying", tone: "violet", rank: 1 };
}

const approved = whatsappTemplates.filter((t) => t.status === "Approved");

/** Sample values so a template preview reads like the message the learner gets. */
const TEMPLATE_VALUES: Record<string, (first: string) => string[]> = {
  compliance_due_reminder: (f) => [f, "Privacy", "58", "25"],
  streak_nudge: (f) => [f, "14"],
  assignment_graded: () => ["Privacy certification 2026", "passed, 92%"],
};

const fillTemplate = (body: string, values: string[]) =>
  body.replace(/\{\{(\d)\}\}/g, (_, n) => values[Number(n) - 1] ?? `{{${n}}}`);

const clock = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** WhatsApp's own emphasis: *bold*. */
function WaText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/g).map((part, i) =>
        /^\*[^*]+\*$/.test(part) ? (
          <strong key={i} className="font-semibold text-ink">
            {part.slice(1, -1)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.from === "system") {
    return (
      <p className="mx-auto w-fit max-w-[92%] rounded-full border border-line bg-surface px-3 py-1 text-center text-[11.5px] leading-snug text-ink-3">
        {m.text} · {m.at}
      </p>
    );
  }
  const out = m.from !== "learner";
  return (
    <div className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div className="max-w-[88%] sm:max-w-[78%]">
        {m.action ? (
          // margin-auto does not push an inline-flex box, so the chip
          // needs a flex parent to sit flush with its own bubble.
          <div className="mb-1.5 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-3">
              <Wrench className="size-3 shrink-0" />
              {m.action}
            </span>
          </div>
        ) : null}
        <div
          className={cn(
            "rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-[var(--shadow-e1)]",
            m.from === "learner" && "rounded-bl-[4px] border border-line bg-surface text-ink-2",
            m.from === "bot" && "rounded-br-[4px] bg-jade-soft text-ink",
            m.from === "agent" && "rounded-br-[4px] bg-brand-soft text-ink",
          )}
        >
          {m.from === "bot" ? (
            <p className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-violet">
              <Sparkles className="size-3" /> Assistant
            </p>
          ) : m.from === "agent" ? (
            <p className="mb-1 text-[11px] font-semibold text-brand">{m.author ?? "Learning team"}</p>
          ) : null}
          <WaText text={m.text} />
          <p
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10.5px]",
              out ? "text-jade" : "text-ink-3",
            )}
          >
            {m.at}
            {out ? <CheckCheck className="size-3" /> : null}
          </p>
        </div>
      </div>
    </div>
  );
}

export function WhatsappInbox() {
  const { user } = useRole();
  // Needs-a-person first. Sorted once, so a thread you take over does not jump.
  const [threads, setThreads] = useState<Conversation[]>(() =>
    conversations
      .filter((c) => c.channel === "whatsapp")
      .map((c) => ({ ...c, unread: c.id === "cv-5" ? 0 : c.unread }))
      .sort((a, b) => stageOf(a).rank - stageOf(b).rank),
  );
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState("cv-5");
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [usedDraft, setUsedDraft] = useState<string[]>([]);
  const [templateId, setTemplateId] = useState(approved[0].id);
  const scroller = useRef<HTMLDivElement>(null);

  const active = threads.find((t) => t.id === activeId)!;
  const person = personById(active.personId);
  const first = person?.name.split(" ")[0] ?? "the learner";
  const stage = stageOf(active);
  const needsPerson = stage.label === "Needs a person";

  const update = (id: string, fn: (t: Conversation) => Conversation) =>
    setThreads((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  const withMessage = (t: Conversation, m: Omit<ChatMessage, "id" | "at">) => ({
    ...t,
    messages: [...t.messages, { ...m, id: `live-${t.messages.length + 1}`, at: clock() }],
  });

  // Play queued messages one at a time while the assistant holds the thread.
  // Each run schedules only the next message; appending it changes
  // `nextPending`, which schedules the one after.
  const nextPending = active.handledBy === "bot" ? active.pending?.[0] : undefined;
  useEffect(() => {
    if (!nextPending) return;
    const fromBot = nextPending.from === "bot";
    const typingTimer = fromBot ? setTimeout(() => setTyping(true), 700) : undefined;
    const arrive = setTimeout(
      () => {
        setTyping(false);
        setThreads((ts) =>
          ts.map((t) =>
            t.id === activeId
              ? {
                  ...t,
                  messages: [...t.messages, nextPending],
                  pending: t.pending?.slice(1),
                }
              : t,
          ),
        );
      },
      fromBot ? 2400 : 1800,
    );
    return () => {
      clearTimeout(typingTimer);
      clearTimeout(arrive);
      setTyping(false);
    };
  }, [activeId, nextPending]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeId, active.messages.length, typing]);

  const open = (id: string) => {
    setActiveId(id);
    setDraft("");
    update(id, (t) => ({ ...t, unread: 0 }));
  };

  const takeOver = () =>
    update(activeId, (t) =>
      withMessage(
        { ...t, handledBy: "human", status: "open", pending: [] },
        { from: "system", text: `${user.name} took over · the assistant stopped replying` },
      ),
    );

  const handBack = () => {
    setDraft("");
    update(activeId, (t) =>
      withMessage(
        { ...t, handledBy: "bot" },
        { from: "system", text: `${user.name} handed back · the assistant answers the next message` },
      ),
    );
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    update(activeId, (t) =>
      withMessage(t, { from: "agent", author: `${user.name} · ${user.title}`, text }),
    );
    setDraft("");
  };

  const template = approved.find((t) => t.id === templateId)!;
  const templateBody = fillTemplate(
    template.body,
    TEMPLATE_VALUES[template.name]?.(first) ?? [first],
  );
  const sendTemplate = () =>
    update(activeId, (t) =>
      withMessage(t, {
        from: "agent",
        author: `${user.name} · approved template`,
        action: `sent template · ${template.name}`,
        text: templateBody,
      }),
    );

  const count = (label: string) => threads.filter((t) => stageOf(t).label === label).length;
  const shown = threads.filter((t) => {
    const label = stageOf(t).label;
    if (filter === "needs") return label === "Needs a person";
    if (filter === "ai") return label === "Assistant replying";
    if (filter === "human") return label === "With a person";
    return true;
  });

  const showDraft =
    active.handledBy === "human" &&
    active.suggestedReply &&
    !draft &&
    !usedDraft.includes(active.id);

  const dayLabel = active.lastAt.startsWith("2026-09-05")
    ? "Today"
    : new Date(active.lastAt).toLocaleDateString("en-GB", { weekday: "long" });

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_minmax(0,1fr)]">
      <div className="min-w-0">
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          className="mb-3"
          items={[
            { id: "all", label: "All" },
            { id: "needs", label: `Needs you · ${count("Needs a person")}` },
            { id: "ai", label: "Assistant" },
            { id: "human", label: "Team" },
          ]}
        />
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--line)]">
            {shown.map((t) => {
              const p = personById(t.personId);
              const s = stageOf(t);
              const last = [...t.messages].reverse().find((m) => m.from !== "system")!;
              const who =
                last.from === "bot"
                  ? "Assistant: "
                  : last.from === "agent"
                    ? `${last.author?.split(" ")[0] ?? "Team"}: `
                    : "";
              return (
                <li key={t.id}>
                  <button
                    onClick={() => open(t.id)}
                    className={cn(
                      "flex w-full gap-3 p-3.5 text-left transition-colors",
                      t.id === activeId ? "bg-brand-soft" : "hover:bg-surface-2",
                    )}
                  >
                    {p ? <Avatar name={p.name} size="md" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                          {p?.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-3">
                          {t.windowOpen === false ? "Tue" : last.at}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-3">
                        {who}
                        {last.text.replace(/\*/g, "")}
                      </p>
                      <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <Badge tone={s.tone} dot>
                          {s.label}
                        </Badge>
                        {t.unread ? (
                          <span className="grid size-4 place-items-center rounded-full bg-jade text-[10px] font-semibold text-on-accent tnum">
                            {t.unread}
                          </span>
                        ) : null}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <Card className="flex h-[40rem] min-w-0 flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          {person ? <Avatar name={person.name} size="md" /> : null}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{person?.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-3 tnum">
              {active.phone}
              <span className="inline-flex items-center gap-1 text-jade">
                <BadgeCheck className="size-3.5" /> opted in
              </span>
            </p>
          </div>
          {typing ? (
            <span className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-violet-soft px-2.5 py-0.5 text-[11.5px] font-medium text-violet">
              <LiveDot tone="jade" /> Assistant is typing
            </span>
          ) : (
            <Badge tone={stage.tone} dot>
              {stage.label}
            </Badge>
          )}
          <IconButton label="Call with the voice agent" size="sm">
            <Phone className="size-3.5" />
          </IconButton>
        </div>

        <div
          ref={scroller}
          className="scrollbar-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5"
          style={{
            backgroundImage: "radial-gradient(var(--line) 0.5px, transparent 0.5px)",
            backgroundSize: "18px 18px",
          }}
        >
          <p className="mx-auto w-fit rounded-full bg-surface-2 px-3 py-1 text-[11px] text-ink-3">
            {dayLabel}
          </p>
          {active.messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {typing ? (
            <div className="flex justify-end">
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-md)] rounded-br-[4px] bg-jade-soft px-3.5 py-3 shadow-[var(--shadow-e1)]">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="size-1.5 animate-bounce rounded-full bg-jade"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </span>
            </div>
          ) : null}
        </div>

        <div className="border-t border-line p-3">
          {active.windowOpen === false ? (
            <div className="space-y-2.5">
              <p className="flex items-start gap-2 px-1 text-[12.5px] leading-snug text-ink-2">
                <Clock className="mt-0.5 size-3.5 shrink-0 text-amber" />
                <span>
                  <span className="font-medium text-ink">The 24-hour window has closed.</span>{" "}
                  WhatsApp only allows an approved template until {first} replies. After that you
                  can take over and chat freely.
                </span>
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 sm:max-w-72">
                  <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                    {approved.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button size="sm" onClick={sendTemplate}>
                  <Send className="size-3.5" /> Send template
                </Button>
              </div>
              <p className="rounded-[var(--radius-sm)] border border-line bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-ink-3">
                {templateBody}
              </p>
            </div>
          ) : active.handledBy === "bot" ? (
            <div
              className={cn(
                "flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-3",
                needsPerson ? "border-transparent bg-rose-soft" : "border-line bg-surface-2",
              )}
            >
              {needsPerson ? (
                <AlertTriangle className="size-4 shrink-0 text-rose" />
              ) : (
                <Bot className="size-4 shrink-0 text-violet" />
              )}
              <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink-2">
                {needsPerson ? (
                  <>
                    <span className="font-medium text-ink">The assistant has stepped back.</span>{" "}
                    This one needs a person to reply.
                  </>
                ) : (
                  <>
                    <span className="font-medium text-ink">The assistant is handling this.</span>{" "}
                    You are seeing it live. Take over to reply to {first} yourself.
                  </>
                )}
              </p>
              <Button size="sm" variant={needsPerson ? "primary" : "secondary"} onClick={takeOver}>
                <UserRound className="size-3.5" /> Take over
              </Button>
            </div>
          ) : (
            <>
              {showDraft ? (
                <div className="mb-2.5 flex flex-wrap items-start gap-x-3 gap-y-2 rounded-[var(--radius-md)] border border-line bg-violet-soft px-3.5 py-2.5 sm:flex-nowrap">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0 text-violet" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-violet">
                      Draft from the assistant · review before sending
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">
                      {active.suggestedReply}
                    </p>
                  </div>
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      setDraft(active.suggestedReply!);
                      setUsedDraft((u) => [...u, active.id]);
                    }}
                  >
                    Use draft
                  </Button>
                </div>
              ) : null}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-line bg-surface px-3 py-1.5 shadow-[var(--shadow-e1)] focus-within:border-brand"
              >
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={draft.length > 70 ? 3 : 1}
                  placeholder={`Reply to ${first} as ${user.name}`}
                  className="min-w-0 flex-1 resize-none bg-transparent py-1.5 text-[13.5px] leading-relaxed text-ink placeholder:text-ink-3 focus:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Send"
                  disabled={!draft.trim()}
                  className="mb-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-jade text-on-accent transition-opacity disabled:opacity-40"
                >
                  <Send className="size-3.5" />
                </button>
              </form>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 px-1">
                <p className="flex items-center gap-1.5 text-[11px] text-ink-3">
                  <Clock className="size-3 shrink-0" /> Free-form replies allowed until{" "}
                  {active.windowClosesAt}
                </p>
                <button
                  onClick={handBack}
                  className="ml-auto inline-flex items-center gap-1.5 text-[12px] font-medium text-brand hover:underline"
                >
                  <ArrowLeftRight className="size-3.5" /> Hand back to the assistant
                </button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
