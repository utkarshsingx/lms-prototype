"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  CornerDownLeft,
  Route,
  Search,
  User,
} from "lucide-react";
import { assessments, courses, paths, people } from "@/lib/data";
import { channelNav, learnNav, manageNav } from "@/lib/nav";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/misc";

type Entry = {
  id: string;
  label: string;
  sub: string;
  href: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const entries = useMemo<Entry[]>(
    () => [
      ...[...learnNav, ...manageNav, ...channelNav].map((n) => ({
        id: `nav-${n.href}`,
        label: n.label,
        sub: "Go to",
        href: n.href,
        group: "Navigate",
        icon: n.icon,
      })),
      ...courses.map((c) => ({
        id: c.id,
        label: c.title,
        sub: `${c.category} · ${c.hours}h · ${c.level}`,
        href: `/courses/${c.slug}`,
        group: "Courses",
        icon: BookOpen,
      })),
      ...paths.map((p) => ({
        id: p.id,
        label: p.title,
        sub: `${p.kind} path · ${p.steps.length} courses`,
        href: `/paths/${p.slug}`,
        group: "Paths",
        icon: Route,
      })),
      ...assessments.map((a) => ({
        id: a.id,
        label: a.title,
        sub: `${a.kind} · ${a.submissions} submissions`,
        href: `/assessments/${a.id}`,
        group: "Assessments",
        icon: ClipboardCheck,
      })),
      ...people.map((p) => ({
        id: p.id,
        label: p.name,
        sub: `${p.title} · ${p.department}`,
        href: `/people`,
        group: "People",
        icon: User,
      })),
    ],
    [],
  );

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const pool = needle
      ? entries.filter(
          (e) =>
            e.label.toLowerCase().includes(needle) ||
            e.sub.toLowerCase().includes(needle),
        )
      : entries.filter((e) => e.group === "Navigate");
    return pool.slice(0, 14);
  }, [q, entries]);

  useEffect(() => {
    setCursor(0);
  }, [q]);

  useEffect(() => {
    if (open) {
      setQ("");
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(c + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(c - 1, 0));
      }
      if (e.key === "Enter" && results[cursor]) {
        e.preventDefault();
        router.push(results[cursor].href);
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, results, cursor, router, onClose]);

  if (typeof document === "undefined") return null;

  let lastGroup = "";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(12_12_14/0.4)] backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-e4)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="size-4 shrink-0 text-ink-3" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search courses, paths, assessments, people…"
                className="h-13 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
              />
              <Kbd>esc</Kbd>
            </div>

            <div className="scrollbar-slim max-h-[52vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-10 text-center text-[13px] text-ink-3">
                  Nothing matches “{q}”.
                </p>
              ) : (
                results.map((r, i) => {
                  const head = r.group !== lastGroup ? r.group : null;
                  lastGroup = r.group;
                  const Icon = r.icon;
                  const active = i === cursor;
                  return (
                    <div key={r.id}>
                      {head ? (
                        <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
                          {head}
                        </p>
                      ) : null}
                      <button
                        onMouseEnter={() => setCursor(i)}
                        onClick={() => {
                          router.push(r.href);
                          onClose();
                        }}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors",
                          active ? "bg-brand-soft" : "hover:bg-surface-2",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            active ? "text-brand" : "text-ink-3",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink">
                            {r.label}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {r.sub}
                          </span>
                        </span>
                        {active ? (
                          <CornerDownLeft className="size-3.5 shrink-0 text-brand" />
                        ) : (
                          <ArrowRight className="size-3.5 shrink-0 text-ink-3 opacity-0" />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2.5 text-[11.5px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> open
              </span>
              <span className="ml-auto">{results.length} results</span>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
