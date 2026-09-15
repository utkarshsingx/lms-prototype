"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CREATE_CONTENT, CREATE_STRUCTURE, type CreateKind } from "./outline";

/** Header "Create" button with a menu of everything the studio can create. */
export function CreateMenu({ onPick, className }: { onPick: (kind: CreateKind) => void; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (kind: CreateKind) => {
    setOpen(false);
    onPick(kind);
  };

  const groups = [
    { heading: "Create papers, modules and lessons", items: CREATE_STRUCTURE },
    { heading: "Upload and add content", items: CREATE_CONTENT },
  ];

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <Button aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <Plus className="size-4" />
        Create
        <ChevronDown className="size-4" />
      </Button>
      {open ? (
        <div
          role="menu"
          className="absolute top-full left-0 z-40 mt-2 w-[min(19rem,calc(100vw-2.5rem))] rounded-[var(--radius-lg)] border border-line bg-surface p-1.5 shadow-[var(--shadow-e3)] sm:right-0 sm:left-auto"
        >
          {groups.map((g) => (
            <div key={g.heading} className="py-1">
              <p className="px-2.5 pt-1 pb-1.5 text-[10.5px] font-bold tracking-[0.12em] text-ink-3 uppercase">{g.heading}</p>
              {g.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.kind}
                    role="menuitem"
                    type="button"
                    onClick={() => pick(item.kind)}
                    className="flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left transition-colors hover:bg-cta-soft focus-visible:bg-cta-soft focus-visible:outline-none"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-inv text-cta">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{item.label}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">{item.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
