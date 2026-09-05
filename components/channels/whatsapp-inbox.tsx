"use client";

import { useState } from "react";
import {
  BadgeCheck,
  Check,
  CheckCheck,
  Paperclip,
  Phone,
  Send,
  Smile,
  UserRound,
  Wrench,
} from "lucide-react";
import { conversations, personById } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

const statusTone: Record<string, Tone> = {
  resolved: "jade",
  open: "brand",
  escalated: "rose",
  awaiting: "amber",
};

export function WhatsappInbox() {
  const threads = conversations.filter((c) => c.channel === "whatsapp");
  const [filter, setFilter] = useState("all");
  const [activeId, setActiveId] = useState(threads[0].id);

  const shown =
    filter === "all"
      ? threads
      : filter === "open"
        ? threads.filter((t) => t.status !== "resolved")
        : threads.filter((t) => t.handledBy === "human");

  const active = threads.find((t) => t.id === activeId)!;
  const person = personById(active.personId);

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      <div className="min-w-0">
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          className="mb-3"
          items={[
            { id: "all", label: "All" },
            { id: "open", label: "Needs action" },
            { id: "human", label: "With a human" },
          ]}
        />
        <Card className="overflow-hidden">
          <ul className="divide-y divide-[var(--line)]">
            {shown.map((t) => {
              const p = personById(t.personId);
              const on = t.id === active.id;
              const last = t.messages[t.messages.length - 1];
              return (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      "flex w-full gap-3 p-3.5 text-left transition-colors",
                      on ? "bg-brand-soft" : "hover:bg-surface-2",
                    )}
                  >
                    {p ? <Avatar name={p.name} size="md" /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-baseline gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">
                          {p?.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-ink-3">
                          {last.at}
                        </span>
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-ink-3">
                        {last.text}
                      </p>
                      <p className="mt-1.5 flex items-center gap-1.5">
                        <Badge tone={statusTone[t.status]}>{t.status}</Badge>
                        {t.unread ? (
                          <span className="grid size-4 place-items-center rounded-full bg-jade text-[10px] font-semibold text-white tnum">
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

      {/* Thread */}
      <Card className="flex min-h-[34rem] flex-col overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          {person ? <Avatar name={person.name} size="md" /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">{person?.name}</p>
            <p className="mt-0.5 flex items-center gap-2 text-[12px] text-ink-3 tnum">
              {active.phone}
              <span className="inline-flex items-center gap-1 text-jade">
                <BadgeCheck className="size-3.5" /> opted in
              </span>
            </p>
          </div>
          <Badge tone={active.handledBy === "bot" ? "violet" : "brand"} dot>
            {active.handledBy === "bot" ? "Assistant" : "Human"}
          </Badge>
          <Button variant="secondary" size="xs">
            <UserRound className="size-3.5" /> Take over
          </Button>
          <Button variant="ghost" size="xs">
            <Phone className="size-3.5" />
          </Button>
        </div>

        {/* WhatsApp-ish canvas */}
        <div
          className="scrollbar-slim min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5"
          style={{
            backgroundImage:
              "radial-gradient(var(--line) 0.5px, transparent 0.5px)",
            backgroundSize: "18px 18px",
          }}
        >
          <p className="mx-auto w-fit rounded-full bg-surface-2 px-3 py-1 text-[11px] text-ink-3">
            Today
          </p>
          {active.messages.map((m) => {
            const mine = m.from !== "learner";
            return (
              <div
                key={m.id}
                className={cn("flex", mine ? "justify-end" : "justify-start")}
              >
                <div className="max-w-[78%]">
                  {m.action ? (
                    <p className="mb-1.5 ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 text-[11px] text-ink-3">
                      <Wrench className="size-3" />
                      {m.action}
                    </p>
                  ) : null}
                  <div
                    className={cn(
                      "rounded-[var(--radius-md)] px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-[var(--shadow-e1)]",
                      mine
                        ? "rounded-br-[4px] bg-jade-soft text-ink"
                        : "rounded-bl-[4px] border border-line bg-surface text-ink-2",
                    )}
                  >
                    {m.from === "agent" ? (
                      <p className="mb-1 text-[11px] font-semibold text-brand">
                        Tomas Lindqvist · instructor
                      </p>
                    ) : null}
                    {m.text}
                    <p
                      className={cn(
                        "mt-1 flex items-center justify-end gap-1 text-[10.5px]",
                        mine ? "text-jade" : "text-ink-3",
                      )}
                    >
                      {m.at}
                      {mine ? <CheckCheck className="size-3" /> : null}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-[var(--shadow-e1)]">
            <Smile className="size-4 shrink-0 text-ink-3" />
            <input
              placeholder={
                active.status === "escalated"
                  ? "Reply as a human — the assistant has stepped back"
                  : "Type a reply, or leave it to the assistant"
              }
              className="h-8 min-w-0 flex-1 bg-transparent text-[13.5px] text-ink placeholder:text-ink-3 focus:outline-none"
            />
            <Paperclip className="size-4 shrink-0 text-ink-3" />
            <button
              aria-label="Send"
              className="grid size-8 shrink-0 place-items-center rounded-full bg-jade text-white"
            >
              <Send className="size-3.5" />
            </button>
          </div>
          <p className="mt-2 px-2 text-[11px] text-ink-3">
            Outside a 24-hour session window only approved templates can be sent.
            This conversation is inside its window until 18:42.
          </p>
        </div>
      </Card>
    </div>
  );
}
