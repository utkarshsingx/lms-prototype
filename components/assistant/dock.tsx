"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Chat } from "./chat";
import { LiveDot } from "@/components/ui/badge";

export function AssistantDock() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="fixed right-4 bottom-20 z-90 flex h-[min(560px,72vh)] w-[min(384px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-e4)] sm:right-6 sm:bottom-24"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <span className="grid size-7 place-items-center rounded-full bg-violet-soft text-violet">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-ink">Assistant</p>
                <p className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                  <LiveDot tone="jade" /> Grounded in your record
                </p>
              </div>
              <Link
                href="/assistant"
                className="rounded-[var(--radius-xs)] px-2 py-1 text-[12px] font-medium text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                Expand
              </Link>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="grid size-7 place-items-center rounded-[var(--radius-xs)] text-ink-3 hover:bg-surface-2 hover:text-ink"
              >
                <X className="size-4" />
              </button>
            </div>
            <Chat compact className="flex-1" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Open assistant"}
        className="fixed right-4 bottom-4 z-90 grid size-13 place-items-center rounded-full bg-surface-inv text-ink-inv shadow-[var(--shadow-e4)] transition-transform duration-200 ease-[var(--ease-spring)] hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6"
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="x"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={{ duration: 0.15 }}
            >
              <X className="size-5" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ opacity: 0, rotate: 45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -45 }}
              transition={{ duration: 0.15 }}
            >
              <MessageSquareText className="size-5" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open ? (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-ember ring-2 ring-paper" />
        ) : null}
      </button>
    </>
  );
}
