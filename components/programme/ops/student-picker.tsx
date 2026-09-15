"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Student } from "@/lib/data/acca";
import { Input } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/cn";

/**
 * Checkbox list used inside FormDrawers when an operation starts without a table selection.
 * Controlled: the page owns `picked` so submit can read it.
 */
export function StudentPicker({
  candidates,
  picked,
  onChange,
  describe,
  label = "Students",
}: {
  candidates: Student[];
  picked: string[];
  onChange: (ids: string[]) => void;
  describe: (s: Student) => string;
  label?: string;
}) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? candidates.filter((s) => s.name.toLowerCase().includes(needle) || describe(s).toLowerCase().includes(needle)) : candidates;
  }, [candidates, q, describe]);

  const toggle = (id: string) => onChange(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  return (
    <fieldset className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <legend className="text-[12.5px] font-semibold text-ink-2">{label}</legend>
        <span className="text-[12px] font-semibold text-ink-3 tnum">{picked.length} selected</span>
      </div>
      <Input
        icon={<Search />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, cohort or university"
        aria-label="Search students"
      />
      <ul className="scrollbar-slim mt-2 max-h-64 divide-y divide-line overflow-y-auto rounded-[12px] border border-line">
        {list.map((s) => {
          const on = picked.includes(s.id);
          return (
            <li key={s.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-cta-soft",
                  on && "bg-cta-soft",
                )}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(s.id)}
                  className="size-4 shrink-0 cursor-pointer accent-ink"
                />
                <Avatar name={s.name} size="xs" />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{s.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{describe(s)}</span>
                </span>
              </label>
            </li>
          );
        })}
        {list.length === 0 ? <li className="px-3 py-4 text-center text-[12.5px] text-ink-3">No students match.</li> : null}
      </ul>
    </fieldset>
  );
}

/** Chips for a fixed selection coming from the table. */
export function PickedSummary({ students, onEdit }: { students: Student[]; onEdit?: () => void }) {
  const shown = students.slice(0, 6);
  return (
    <div className="rounded-[14px] border border-line bg-surface-2 p-3.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12.5px] font-semibold text-ink">
          {students.length} {students.length === 1 ? "student" : "students"} selected
        </p>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
          >
            Change
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((s) => (
          <span key={s.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface py-0.5 pr-2.5 pl-0.5 text-[12px] font-semibold text-ink-2">
            <Avatar name={s.name} size="xs" />
            <span className="truncate">{s.name}</span>
          </span>
        ))}
        {students.length > shown.length ? (
          <span className="inline-flex items-center rounded-full border border-line bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-ink-3">
            +{students.length - shown.length} more
          </span>
        ) : null}
      </div>
    </div>
  );
}
