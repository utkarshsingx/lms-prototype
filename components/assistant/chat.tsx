"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUp, Link2, Sparkles, Wrench } from "lucide-react";
import { answer, now } from "@/lib/assistant";
import { assistantSuggestions, type ChatMessage } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { RichText } from "./rich-text";

const opener: ChatMessage = {
  id: "seed",
  from: "bot",
  at: "now",
  text: "I have your enrolments, deadlines and path progress in front of me. Ask about any of it, or ask me to do something — enrol you in a course, book study time, chase a grade.",
};

export function Chat({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([opener]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setDraft("");
    setMessages((m) => [
      ...m,
      { id: `u${m.length}`, from: "learner", at: now(), text: q },
    ]);
    setThinking(true);
    // The delay is deliberate: an instant answer reads as canned, and the
    // "consulting your record" beat is what the real product would be doing.
    window.setTimeout(
      () => {
        const r = answer(q);
        setThinking(false);
        setMessages((m) => [...m, { ...r, id: `b${m.length}`, at: now() }]);
      },
      680 + Math.random() * 420,
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        className={cn(
          "scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto",
          compact ? "px-4 py-4" : "px-1 py-2",
        )}
      >
        {messages.map((m) =>
          m.from === "learner" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-[var(--radius-lg)] rounded-br-[6px] bg-brand px-3.5 py-2.5 text-[13.5px] leading-relaxed text-on-brand shadow-[var(--shadow-e2)]">
                {m.text}
              </div>
            </div>
          ) : (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-2.5"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                {m.action ? (
                  <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">
                    <Wrench className="size-3" />
                    {m.action}
                  </p>
                ) : null}
                <div className="text-[13.5px] leading-relaxed text-ink-2">
                  <RichText text={m.text} />
                </div>
                {m.citations?.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.citations.map((c) => (
                      <Link
                        key={c.label}
                        href={c.href}
                        className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand"
                      >
                        <Link2 className="size-3" />
                        {c.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ),
        )}

        {thinking ? (
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
              <Sparkles className="size-3.5" />
            </span>
            <div className="flex items-center gap-1 pt-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-ink-3"
                  style={{ animationDelay: `${i * 130}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 ? (
        <div className={cn("flex flex-wrap gap-1.5", compact ? "px-4 pb-3" : "px-1 pb-3")}>
          {assistantSuggestions.slice(0, compact ? 3 : 5).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className={cn(
          "relative shrink-0",
          compact ? "border-t border-line p-3" : "pt-1",
        )}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask anything about your learning…"
          className="h-11 w-full rounded-[var(--radius-md)] border border-line bg-surface pr-11 pl-3.5 text-[13.5px] text-ink shadow-[var(--shadow-e1)] placeholder:text-ink-3 focus:border-brand focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || thinking}
          className={cn(
            "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] transition-all",
            compact ? "right-4.5" : "right-1.5",
            draft.trim() && !thinking
              ? "bg-brand text-on-brand shadow-[var(--shadow-e2)]"
              : "bg-surface-3 text-ink-3",
          )}
        >
          <ArrowUp className="size-4" strokeWidth={2.2} />
        </button>
      </form>
    </div>
  );
}
