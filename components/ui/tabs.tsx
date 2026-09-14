"use client";

import { cn } from "@/lib/cn";

export type TabItem = { id: string; label: string; count?: number };

/** Underlined tabs, for switching the main content of a page. */
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
      role="tablist"
      className={cn(
        // The baseline is an inset shadow, not a border: the scroll container
        // clips at its padding box, so a tab's underline could never overlap a
        // real border. Tabs paint above an inset shadow.
        "scrollbar-none flex gap-1 overflow-x-auto shadow-[inset_0_-1px_0_var(--line)]",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              // Same weight in both states so the row never reflows on click.
              "relative flex shrink-0 items-center gap-2 border-b-[3px] px-3 pt-1 pb-2.5 text-[13.5px] font-semibold whitespace-nowrap transition-colors",
              active
                ? "border-cta text-ink"
                : "border-transparent text-ink-3 hover:border-line-strong hover:text-ink",
            )}
          >
            {t.label}
            {t.count != null ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-bold tnum",
                  active ? "bg-cta text-cta-ink" : "bg-surface-2 text-ink-3",
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

/** Pill segmented control, for filtering a list in place. */
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
        "scrollbar-none inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-[var(--radius-pill)] border border-line bg-surface p-1",
        className,
      )}
    >
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "shrink-0 rounded-[var(--radius-pill)] font-semibold whitespace-nowrap transition-colors duration-150",
              size === "sm" ? "px-2.5 py-1 text-[12px]" : "px-3.5 py-1.5 text-[13px]",
              // Black pill, white label in light; yellow pill, dark label in
              // Prephasz dark, where a black pill would vanish.
              active
                ? "bg-nav-active text-nav-active-ink"
                : "text-ink-3 hover:bg-cta-soft hover:text-ink",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
