"use client";

import { useState } from "react";
import {
  BookOpenText,
  Captions,
  ClipboardCheck,
  FileBadge2,
  FileText,
  NotebookPen,
  PlayCircle,
  Plus,
  Send,
  type LucideIcon,
} from "lucide-react";
import {
  ACCA_TODAY,
  COVERAGE_LABELS,
  daysBetween,
  paperByCode,
  staffById,
  universities,
  universityById,
  universitySubjects,
  type ContentType,
  type PaperCode,
  type University,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import type { StatusTone } from "@/components/ui/status";

/* ------------------------------------------------------------------ identity */

/** The signed-in faculty member, their assigned papers and whether they publish or submit. */
export function useAuthor() {
  const { persona, can } = useRole();
  const staffId = persona.staffId ?? "st-marcus";
  const me = staffById(staffId);
  const papers = ((me?.focusPapers?.length ? me.focusPapers : ["FR"]) as PaperCode[]).filter((p) => paperByCode(p));
  const canPublish = can("content:publish");
  return {
    persona,
    staffId,
    name: me?.name ?? persona.name,
    firstName: (me?.name ?? persona.name).split(" ")[0],
    papers,
    canPublish,
    publishLabel: canPublish ? "Publish" : "Submit for review",
    /** Who reviews this author's work: a publisher who is not the author. */
    reviewerId: staffId === "st-marcus" ? "st-hana" : "st-marcus",
  };
}

/** Faculty who can approve content, excluding the author. */
export function reviewerOptions(excludeId: string) {
  return ["st-marcus", "st-hana", "st-tomas", "st-grace", "st-priya"]
    .filter((id) => id !== excludeId)
    .map((id) => ({ id, name: staffById(id)?.name ?? id, title: staffById(id)?.title ?? "" }));
}

/* ------------------------------------------------------------------ small helpers */

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export function listPapers(codes: string[]) {
  if (codes.length <= 1) return codes.join("");
  return `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`;
}

/** "v2.3" → minor "v2.4" or major "v3.0". */
export function bumpVersion(version: string, kind: "minor" | "major") {
  const m = /^v(\d+)\.(\d+)$/.exec(version);
  if (!m) return "v1.0";
  const major = Number(m[1]);
  const minor = Number(m[2]);
  return kind === "major" ? `v${major + 1}.0` : `v${major}.${minor + 1}`;
}

/** Due label relative to Monday 14 Sep 2026. */
export function dueLabel(iso: string): { label: string; tone: StatusTone } {
  const d = daysBetween(ACCA_TODAY, iso);
  if (d < 0) return { label: `Overdue by ${plural(-d, "day")}`, tone: "rose" };
  if (d === 0) return { label: "Due today", tone: "amber" };
  if (d <= 2) return { label: `Due in ${plural(d, "day")}`, tone: "amber" };
  return { label: `Due in ${plural(d, "day")}`, tone: "neutral" };
}

export const TYPE_ICONS: Record<ContentType, LucideIcon> = {
  video: PlayCircle,
  "study-material": BookOpenText,
  transcript: Captions,
  "examiner-report": FileBadge2,
  "model-answer": ClipboardCheck,
  "revision-notes": NotebookPen,
  "practice-activity": FileText,
};

/* ------------------------------------------------------------------ bits of UI */

export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** A disabled Button ignores pointer events, so its tooltip sits on a wrapper. */
export function GatedButton({
  allowed,
  reason,
  className,
  ...props
}: React.ComponentProps<typeof Button> & { allowed: boolean; reason: string }) {
  return (
    <span title={allowed ? undefined : reason} className={cn("inline-flex", className)}>
      <Button {...props} disabled={!allowed || props.disabled} />
    </span>
  );
}

/** Chip shown in page headers for authors who submit rather than publish. */
export function SubmitOnlyChip() {
  return (
    <span
      title="Your role submits content for review. A faculty member with publish rights approves it."
      className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ink"
    >
      <Send aria-hidden className="size-3.5 text-amber" strokeWidth={2.2} />
      Submit-for-review access
    </span>
  );
}

export function PaperCodeChip({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center rounded-[var(--radius-xs)] bg-surface-inv px-1.5 font-mono text-[11.5px] font-bold text-cta",
        className,
      )}
    >
      {code}
    </span>
  );
}

export function UniversityMark({ university, className }: { university: University; className?: string }) {
  return (
    // The partner's brand colour is data, not theme.
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[10.5px] font-bold text-white",
        className,
      )}
      style={{ backgroundColor: university.branding.primary }}
    >
      {university.branding.logoInitials}
    </span>
  );
}

/** Three-step difficulty meter: foundation, intermediate, exam standard. */
export function DifficultyMeter({ level, label }: { level: 1 | 2 | 3; label: string }) {
  return (
    <span className="inline-flex items-center gap-2" title={label}>
      <span aria-hidden className="flex items-end gap-0.5">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={cn("w-1.5 rounded-full", n <= level ? "bg-ink" : "bg-surface-3")}
            style={{ height: 6 + n * 3 }}
          />
        ))}
      </span>
      <span className="text-[12.5px] text-ink-2">{label}</span>
    </span>
  );
}

/** Bordered tile that opens a create drawer; its label carries the requirement wording. */
export function ActionTile({
  icon: Icon,
  label,
  sub,
  count,
  onClick,
  disabled = false,
  reason,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub: string;
  count?: string;
  onClick: () => void;
  disabled?: boolean;
  reason?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? reason : undefined}
      className="group flex min-w-0 items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-3.5 text-left transition-colors hover:border-ink hover:bg-cta-soft disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-line disabled:hover:bg-surface"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-inv text-cta">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13.5px] font-bold text-ink">
          <span className="min-w-0">{label}</span>
          <Plus className="size-3.5 shrink-0 text-ink-3 transition-colors group-hover:text-ink" />
        </span>
        <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{sub}</span>
        {count ? <span className="mt-1.5 block font-mono text-[11px] text-ink-2">{count}</span> : null}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ pickers */

export type ChipOption = { value: string; label: string; sub?: string };

/**
 * Toggle chips. Single mode behaves like radios. Writes hidden inputs under `name`
 * so a FormDrawer's FormData carries the choice.
 */
export function ChipPicker({
  options,
  value,
  onChange,
  multiple = false,
  name,
  disabled = false,
  ariaLabel,
}: {
  options: ChipOption[];
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  name?: string;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            title={o.sub}
            onClick={() => {
              if (multiple) onChange(on ? value.filter((v) => v !== o.value) : [...value, o.value]);
              else onChange([o.value]);
            }}
            className={cn(
              "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-left text-[12.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              on
                ? "border-nav-active bg-nav-active text-nav-active-ink"
                : "border-line bg-surface text-ink-2 hover:border-line-strong hover:bg-cta-soft hover:text-ink",
            )}
          >
            <span className="min-w-0 truncate">{o.label}</span>
          </button>
        );
      })}
      {name ? value.map((v) => <input key={v} type="hidden" name={name} value={v} />) : null}
    </div>
  );
}

/** ACCA syllabus area picker for one paper ("D · Preparation of financial statements"). */
export function SyllabusAreaPicker({
  paper,
  value,
  onChange,
  multiple = false,
  name = "area",
}: {
  paper: PaperCode;
  value: string[];
  onChange: (next: string[]) => void;
  multiple?: boolean;
  name?: string;
}) {
  const areas = paperByCode(paper)?.syllabusAreas ?? [];
  return (
    <div className="space-y-2">
      <ChipPicker
        ariaLabel={`Syllabus area for ${paper}`}
        multiple={multiple}
        name={name}
        value={value}
        onChange={onChange}
        options={areas.map((a) => ({ value: a.code, label: `${a.code} · ${a.title}`, sub: a.title }))}
      />
      <p className="text-[12px] text-ink-3">
        {value.length === 0
          ? "Choose the ACCA syllabus area this is tagged to."
          : `Tagged ${paper} ${value.join(", ")}. Learners find it from the syllabus area on their Papers page.`}
      </p>
    </div>
  );
}

/**
 * University subject multi-select. Subjects already mapped to the paper are suggested first;
 * "Show all subjects" lists the rest. Restrict to one university with `universityId`.
 */
export function SubjectPicker({
  paper,
  area,
  value,
  onChange,
  universityId,
  name = "subjects",
}: {
  paper: PaperCode;
  area?: string;
  value: string[];
  onChange: (next: string[]) => void;
  universityId?: string;
  name?: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const pool = universitySubjects.filter((s) => !universityId || s.universityId === universityId);
  const suggested = pool.filter((s) => s.mappings.some((m) => m.paper === paper));
  const list = showAll ? pool : suggested;
  const unis = universities.filter((u) => list.some((s) => s.universityId === u.id));

  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-3">
      {unis.length === 0 ? (
        <p className="rounded-[var(--radius-md)] border border-dashed border-line-strong px-3 py-3 text-[12.5px] text-ink-3">
          No subjects at this university map to {paper} yet. Show all subjects to map one.
        </p>
      ) : null}
      {unis.map((u) => (
        <div key={u.id} className="rounded-[var(--radius-md)] border border-line">
          <div className="flex items-center gap-2 border-b border-line bg-surface-2 px-3 py-2">
            <UniversityMark university={u} className="size-6 text-[9.5px]" />
            <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">{u.name}</span>
            <span className="ml-auto shrink-0 text-[11.5px] text-ink-3">{u.programmeName}</span>
          </div>
          <ul className="divide-y divide-line">
            {list
              .filter((s) => s.universityId === u.id)
              .map((s) => {
                const mapping = s.mappings.find((m) => m.paper === paper);
                const areaMatch = mapping && area ? mapping.areas.includes(area) : false;
                const on = value.includes(s.id);
                return (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-cta-soft">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggle(s.id)}
                        className="mt-0.5 size-4 shrink-0 accent-nav-active"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-semibold text-ink">
                          <span className="font-mono text-[11.5px] text-ink-3">{s.code}</span> {s.name}
                        </span>
                        <span className="block text-[12px] text-ink-3">
                          Semester {s.semester}
                          {mapping
                            ? ` · ${COVERAGE_LABELS[mapping.coverage]} overlap with ${paper}${mapping.areas.length ? ` ${mapping.areas.join(", ")}` : ""}`
                            : " · No mapping to this paper yet"}
                        </span>
                      </span>
                      {areaMatch ? (
                        <span className="shrink-0 rounded-full bg-jade-soft px-2 py-0.5 text-[11px] font-semibold text-jade">
                          Matches {area}
                        </span>
                      ) : null}
                    </label>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] text-ink-3">
          {value.length ? `Mapped to ${plural(value.length, "university subject")}` : "Not mapped to a university subject"}
        </p>
        <Button type="button" size="xs" variant="ghost" onClick={() => setShowAll((s) => !s)}>
          {showAll ? "Show suggested subjects" : "Show all subjects"}
        </Button>
      </div>
      {value.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
    </div>
  );
}

/** Codes of mapped subjects, e.g. "BCH301". */
export function SubjectCodes({ ids, max = 2 }: { ids: string[]; max?: number }) {
  if (ids.length === 0) return <span className="text-[12.5px] text-ink-3">Not mapped</span>;
  const shown = ids.slice(0, max);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {shown.map((id) => {
        const s = universitySubjects.find((x) => x.id === id);
        const u = universityById(s?.universityId);
        return (
          <span
            key={id}
            title={s ? `${s.name} · ${u?.name ?? ""}` : id}
            className="rounded-[var(--radius-xs)] border border-line bg-surface-2 px-1.5 py-px font-mono text-[11px] text-ink-2"
          >
            {s?.code ?? id}
          </span>
        );
      })}
      {ids.length > max ? <span className="text-[11.5px] text-ink-3">+{ids.length - max}</span> : null}
    </span>
  );
}
