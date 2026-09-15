"use client";

import { cn } from "@/lib/cn";
import { universities, type University } from "@/lib/data/acca";
import { StatusPill } from "@/components/ui/status";

/** The partner's logo initials on its own brand colour (data, not theme). */
export function UniversityMark({ university, size = "md", className }: { university: University; size?: "sm" | "md"; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[var(--radius-md)] font-display font-bold tracking-[-0.02em] text-white",
        size === "sm" ? "size-7 text-[11px]" : "size-10 text-[13px]",
        className,
      )}
      style={{ backgroundColor: university.branding.primary }}
    >
      {university.branding.logoInitials}
    </span>
  );
}

/** Choose the partner university a coordination page works on. */
export function UniversityPicker({ value, onChange, className }: { value: string; onChange: (id: string) => void; className?: string }) {
  return (
    <div role="radiogroup" aria-label="Partner university" className={cn("flex flex-wrap gap-2", className)}>
      {universities.map((u) => {
        const active = u.id === value;
        return (
          <button
            key={u.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(u.id)}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border py-1.5 pr-3.5 pl-1.5 text-left transition-colors",
              active ? "border-ink bg-cta-soft shadow-[inset_0_-3px_0_var(--cta)]" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
            )}
          >
            <UniversityMark university={u} size="sm" />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-ink">{u.name}</span>
              <span className="block truncate text-[11.5px] text-ink-3">
                {u.city} · {u.status}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** One-line identity strip for the selected university. */
export function UniversityStrip({ university, children }: { university: University; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-3.5 sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <UniversityMark university={university} />
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-bold text-ink">{university.name}</p>
          <p className="truncate text-[12.5px] text-ink-3">
            {university.programmeName} · {university.semesterSystem.semesters} semesters, {university.semesterSystem.academicYear} ·{" "}
            {university.workspace.domain}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill status={university.status} />
        {children}
      </div>
    </div>
  );
}
