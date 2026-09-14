"use client";

import { useId } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";

/** Horizontal, wrapping row of filters. Pass `onClear` to show a reset button while any filter is active. */
export function FilterBar({
  children,
  onClear,
  active = false,
  className,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  /** True when any filter differs from its default; reveals the Clear button. */
  active?: boolean;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Filters"
      className={cn("flex min-w-0 flex-wrap items-center gap-2", className)}
    >
      {children}
      {onClear && active ? (
        <button
          type="button"
          onClick={onClear}
          className="inline-flex h-9 items-center gap-1.5 rounded-[12px] px-2.5 text-[12.5px] font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4 transition-colors hover:bg-cta-soft hover:text-ink"
        >
          <RotateCcw aria-hidden className="size-3.5" />
          Clear filters
        </button>
      ) : null}
    </div>
  );
}

export type FilterOption = string | { value: string; label: string };

/**
 * Compact labelled select. `allLabel` adds a first option whose value is `""`
 * ("All cohorts"); the control reads as active (yellow wash) when value is not "".
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly FilterOption[];
  allLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const id = useId();
  const active = allLabel != null && value !== "";
  return (
    <label
      htmlFor={id}
      className={cn(
        "relative inline-flex h-9 max-w-full min-w-0 items-center rounded-[12px] border pl-3 text-[12.5px] transition-colors",
        "focus-within:border-ink focus-within:shadow-[0_0_0_3px_var(--ring)]",
        active
          ? "border-cta bg-cta-soft text-ink"
          : "border-line bg-surface text-ink-2 hover:border-line-strong",
        disabled && "opacity-50",
        className,
      )}
    >
      <span className="shrink-0 font-medium text-ink-3">{label}</span>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 cursor-pointer appearance-none truncate bg-transparent pr-8 pl-1.5 font-semibold text-ink outline-none disabled:cursor-not-allowed"
      >
        {allLabel != null ? <option value="">{allLabel}</option> : null}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-ink-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M2.5 4.5 6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
