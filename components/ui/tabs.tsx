"use client";

import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; count?: number };

/** Underlined tabs — for switching the main content of a page. */
export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-none flex gap-1 overflow-x-auto border-b border-line",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "relative -mb-px flex items-center gap-2 border-b-2 px-3 pb-2.5 text-[13.5px] font-medium whitespace-nowrap transition-colors",
              active
                ? "border-brand text-ink"
                : "border-transparent text-ink-3 hover:text-ink-2",
            )}
          >
            {t.label}
            {t.count != null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] tnum",
                  active ? "bg-brand-soft text-brand" : "bg-surface-2 text-ink-3",
                )}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Pill segmented control — for filtering a list in place. */
export function Segmented({
  items,
  value,
  onChange,
  size = "md",
  className,
}: {
  items: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-none inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface-2 p-0.5",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={cn(
              "rounded-[var(--radius-sm)] font-medium whitespace-nowrap transition-all duration-150",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3 py-1.5 text-[13px]",
              active
                ? "bg-surface text-ink shadow-[var(--shadow-e2)]"
                : "text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
