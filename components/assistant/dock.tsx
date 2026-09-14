"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Chat } from "./chat";
import { LiveDot } from "@/components/ui/badge";
import { useRole } from "@/lib/role";

/** The AI tutor, floating bottom right. Students only; hidden on the full
 *  tutor page so there are never two copies of the same conversation. */
export function AssistantDock() {
  const [open, setOpen] = useState(false);
  const { role, persona } = useRole();
  const pathname = usePathname();

  if (role !== "student" || pathname === "/assistant") return null;

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="AI tutor"
            className="fixed right-4 bottom-20 z-90 flex h-[min(560px,72vh)] w-[min(384px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-e4)] sm:right-6 sm:bottom-24"
          >
            <div className="flex items-center gap-2.5 border-b border-line bg-surface-inv px-4 py-3 text-ink-inv">
              <span className="grid size-8 place-items-center rounded-full bg-cta text-cta-ink">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-bold">AI tutor</p>
                <p className="flex items-center gap-1.5 truncate text-[11.5px] text-ink-inv/65">
                  <LiveDot tone="jade" /> Grounded in {persona.name.split(" ")[0]}&apos;s ACCA record
                </p>
              </div>
              <Link
                href="/assistant"
                onClick={() => setOpen(false)}
                className="rounded-[var(--radius-xs)] px-2 py-1 text-[12px] font-semibold text-ink-inv/75 hover:bg-ink-inv/10 hover:text-ink-inv"
              >
                Expand
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close AI tutor"
                className="grid size-7 place-items-center rounded-[var(--radius-xs)] text-ink-inv/75 hover:bg-ink-inv/10 hover:text-ink-inv"
              >
                <X className="size-4" />
              </button>
            </div>
            <Chat compact className="flex-1" />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close AI tutor" : "Open AI tutor"}
        aria-expanded={open}
        className="fixed right-4 bottom-4 z-90 grid size-13 place-items-center rounded-full bg-cta text-cta-ink shadow-[var(--shadow-e4)] transition-transform duration-200 ease-[var(--ease-spring)] hover:scale-105 active:scale-95 sm:right-6 sm:bottom-6"
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
              <X className="size-5" strokeWidth={2.4} />
            </motion.span>
          ) : (
            <motion.span
              key="tutor"
              initial={{ opacity: 0, rotate: 45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -45 }}
              transition={{ duration: 0.15 }}
            >
              <Sparkles className="size-5" strokeWidth={2.4} />
            </motion.span>
          )}
        </AnimatePresence>
        {!open ? (
          <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-surface-inv ring-2 ring-paper" />
        ) : null}
      </button>
    </>
  );
}
