"use client";

import { useState } from "react";
import { BadgeCheck, Plus, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  APPLIED_KNOWLEDGE,
  APPLIED_SKILLS,
  COVERAGE_LABELS,
  curriculumMappingFramework,
  paperByCode,
  paperName,
  staffName,
  type Coverage,
  type PaperCode,
  type UniversitySubject,
} from "@/lib/data/acca";
import { Card } from "@/components/ui/card";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Matrix } from "@/components/ui/matrix";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural } from "../acca/common";

const MAP_PAPERS: PaperCode[] = [...APPLIED_KNOWLEDGE, ...APPLIED_SKILLS];

const COVERAGE_STYLE: Record<Coverage, string> = {
  full: "border-transparent bg-jade-soft text-jade",
  partial: "border-transparent bg-amber-soft text-amber",
  "conceptual-only": "border-line bg-surface-2 text-ink-2",
};

const SHORT: Record<Coverage, string> = { full: "Full", partial: "Partial", "conceptual-only": "Conceptual" };

export function MappingMatrix({
  subjects,
  setSubjects,
  canEdit,
  reason,
  persona,
}: {
  subjects: UniversitySubject[];
  setSubjects: (updater: (list: UniversitySubject[]) => UniversitySubject[]) => void;
  canEdit: boolean;
  reason?: string;
  persona: string;
}) {
  const [semester, setSemester] = useState("");
  const [show, setShow] = useState("");
  const [editing, setEditing] = useState<{ subjectId: string; paper: PaperCode } | null>(null);
  const [coverage, setCoverage] = useState<string>("none");
  const [areas, setAreas] = useState<string[]>([]);

  const visible = subjects.filter(
    (s) =>
      (!semester || String(s.semester) === semester) &&
      (!show || (show === "mapped" ? s.mappings.length > 0 : show === "needs" ? s.mappingStatus !== "mapped" : s.mappingStatus === show)),
  );

  const subject = editing ? subjects.find((s) => s.id === editing.subjectId) : undefined;
  const paper = editing ? paperByCode(editing.paper) : undefined;

  const open = (subjectId: string, code: PaperCode) => {
    const s = subjects.find((x) => x.id === subjectId);
    const m = s?.mappings.find((x) => x.paper === code);
    setCoverage(m?.coverage ?? "none");
    setAreas(m?.areas ?? []);
    setEditing({ subjectId, paper: code });
  };

  const inReview = subjects.filter((s) => s.mappingStatus === "in-review");
  const counts = {
    mapped: subjects.filter((s) => s.mappingStatus === "mapped").length,
    review: inReview.length,
    none: subjects.filter((s) => s.mappingStatus === "not-mapped").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="min-w-0 p-5">
          <MiniLabel>Mapping status</MiniLabel>
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[
              ["Mapped", counts.mapped, "jade"],
              ["In faculty review", counts.review, "amber"],
              ["Not mapped", counts.none, "neutral"],
            ].map(([label, value, tone]) => (
              <div key={label as string} className="min-w-0 rounded-[var(--radius-md)] border border-line p-3">
                <StatusPill status={label as string} tone={tone as "jade"} size="sm" />
                <p className="mt-2 font-display text-[24px] leading-none font-bold text-ink tnum">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <GatedButton
              size="sm"
              variant="secondary"
              allowed={canEdit}
              reason={reason}
              disabled={counts.review === 0}
              onClick={() => {
                setSubjects((list) => list.map((s) => (inReview.some((r) => r.id === s.id) ? { ...s, mappingStatus: "mapped", reviewedBy: s.reviewedBy ?? "st-priya" } : s)));
                toast({ title: `${plural(counts.review, "mapping")} approved`, body: `Approved by ${persona} · now shown on student roadmaps` });
              }}
            >
              <BadgeCheck className="size-3.5" /> Approve reviewed mappings ({counts.review})
            </GatedButton>
            <GatedButton
              size="sm"
              variant="outline"
              allowed={canEdit}
              reason={reason}
              onClick={() => toast({ title: "Mappings sent for faculty review", body: "Each paper's lead faculty member reviews the subjects mapped to it.", tone: "info" })}
            >
              <Send className="size-3.5" /> Send to faculty for review
            </GatedButton>
          </div>
        </Card>
        <Card className="min-w-0 p-5">
          <MiniLabel>Coverage levels · framework {curriculumMappingFramework.version}</MiniLabel>
          <ul className="mt-3 space-y-2.5">
            {curriculumMappingFramework.coverageLevels.map((c) => (
              <li key={c.id} className="flex items-start gap-2.5">
                <span className={cn("mt-0.5 inline-flex shrink-0 rounded-full border px-2 py-px text-[11px] font-semibold", COVERAGE_STYLE[c.id as Coverage])}>
                  {c.label}
                </span>
                <span className="min-w-0 text-[12.5px] leading-snug text-ink-2">{c.definition}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterBar
          active={Boolean(semester || show)}
          onClear={() => {
            setSemester("");
            setShow("");
          }}
        >
          <FilterSelect
            label="Semester"
            value={semester}
            onChange={setSemester}
            allLabel="All"
            options={[...new Set(subjects.map((s) => s.semester))].sort().map((n) => ({ value: String(n), label: `Semester ${n}` }))}
          />
          <FilterSelect
            label="Show"
            value={show}
            onChange={setShow}
            allLabel="All subjects"
            options={[
              { value: "mapped", label: "Mapped to ACCA" },
              { value: "needs", label: "Needs mapping or review" },
              { value: "not-mapped", label: "Not mapped" },
            ]}
          />
        </FilterBar>
        <p className="text-[12.5px] text-ink-3">Select a cell to set coverage and syllabus areas.</p>
      </div>

      {visible.length ? (
        <Matrix
          caption="University subjects mapped to ACCA papers and syllabus areas"
          corner="University subject"
          maxHeight="min(70vh, 44rem)"
          dense
          rows={visible.map((s) => ({
            id: s.id,
            label: `${s.code} · ${s.name}`,
            sub: (
              <span className="flex flex-wrap items-center gap-1.5">
                <span>
                  Semester {s.semester} · {s.credits} credits
                </span>
                <StatusPill
                  status={s.mappingStatus}
                  tone={s.mappingStatus === "mapped" ? "jade" : s.mappingStatus === "in-review" ? "amber" : "neutral"}
                  size="sm"
                />
              </span>
            ),
          }))}
          cols={MAP_PAPERS.map((p) => ({ id: p, label: p, sub: APPLIED_KNOWLEDGE.includes(p) ? "Applied Knowledge" : "Applied Skills" }))}
          cell={(rowId, colId) => {
            const s = subjects.find((x) => x.id === rowId)!;
            const m = s.mappings.find((x) => x.paper === colId);
            return (
              <span title={canEdit ? undefined : reason} className="inline-flex">
                <button
                  type="button"
                  disabled={!canEdit}
                  aria-label={`${s.name} to ${colId}: ${m ? `${COVERAGE_LABELS[m.coverage]}${m.areas.length ? `, areas ${m.areas.join(", ")}` : ""}` : "not mapped"}`}
                  onClick={() => open(s.id, colId as PaperCode)}
                  className={cn(
                    "grid min-h-11 w-[5.5rem] place-items-center rounded-[10px] border px-1.5 py-1 text-center transition-colors disabled:cursor-not-allowed",
                    m ? COVERAGE_STYLE[m.coverage] : "border-dashed border-line-strong text-ink-3 hover:border-ink hover:bg-cta-soft hover:text-ink",
                    m && "hover:border-ink",
                  )}
                >
                  {m ? (
                    <span className="leading-tight">
                      <span className="block text-[11.5px] font-bold">{SHORT[m.coverage]}</span>
                      {m.areas.length ? <span className="block font-mono text-[10.5px] opacity-80">{m.areas.join(" ")}</span> : null}
                    </span>
                  ) : (
                    <Plus aria-hidden className="size-3.5" />
                  )}
                </button>
              </span>
            );
          }}
        />
      ) : (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-ink-3">
          No subjects match these filters.
        </p>
      )}

      <Note>
        {curriculumMappingFramework.rules[2]} {curriculumMappingFramework.rules[1]}
      </Note>

      <FormDrawer
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={subject && paper ? `Map ${subject.code} to ${paper.code}` : "Map subject"}
        sub={subject && paper ? `${subject.name} → ${paper.name}` : undefined}
        submitLabel="Save mapping"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote={paper ? `Reviewed by ${staffName(paper.leadFacultyId)}, ${paper.code} lead` : undefined}
        onSubmit={(data) => {
          if (!subject || !paper) return;
          if ((coverage === "full" || coverage === "partial") && areas.length === 0) {
            toast({ title: "Choose at least one syllabus area", body: "Full and partial mappings are made at syllabus area level.", tone: "warning" });
            return;
          }
          const note = String(data.get("note") ?? "").trim();
          setSubjects((list) =>
            list.map((s) => {
              if (s.id !== subject.id) return s;
              const others = s.mappings.filter((m) => m.paper !== paper.code);
              const mappings =
                coverage === "none"
                  ? others
                  : [...others, { paper: paper.code, areas: coverage === "conceptual-only" ? [] : [...areas].sort(), coverage: coverage as Coverage }];
              return {
                ...s,
                mappings,
                mappingStatus: mappings.length ? "in-review" : "not-mapped",
                note: note || s.note,
              };
            }),
          );
          toast({
            title: coverage === "none" ? "Mapping removed" : "Mapping saved",
            body:
              coverage === "none"
                ? `${subject.name} no longer maps to ${paper.code}`
                : `${subject.name} → ${paper.code} ${COVERAGE_LABELS[coverage as Coverage]}${areas.length && coverage !== "conceptual-only" ? ` (${[...areas].sort().join(", ")})` : ""} · sent to ${staffName(paper.leadFacultyId)} for review`,
          });
          setEditing(null);
        }}
      >
        <div>
          <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Coverage</p>
          <Segmented
            value={coverage}
            onChange={setCoverage}
            items={[
              { id: "none", label: "Not mapped" },
              { id: "full", label: "Full" },
              { id: "partial", label: "Partial" },
              { id: "conceptual-only", label: "Conceptual only" },
            ]}
          />
          {coverage !== "none" ? (
            <p className="mt-2 text-[12px] leading-snug text-ink-3">
              {curriculumMappingFramework.coverageLevels.find((c) => c.id === coverage)?.definition}
            </p>
          ) : null}
        </div>
        {paper && (coverage === "full" || coverage === "partial") ? (
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">{paperName(paper.code)} syllabus areas</legend>
            <div className="grid gap-2">
              {paper.syllabusAreas.map((a) => (
                <Checkbox
                  key={`${editing?.subjectId}-${paper.code}-${a.code}`}
                  checked={areas.includes(a.code)}
                  onChange={(e) => setAreas((list) => (e.target.checked ? [...list, a.code] : list.filter((x) => x !== a.code)))}
                  label={
                    <span>
                      <span className="font-mono font-semibold text-ink">{a.code}</span> · {a.title}
                    </span>
                  }
                />
              ))}
            </div>
          </fieldset>
        ) : null}
        {coverage === "conceptual-only" ? (
          <Note tone="amber">Conceptual only mappings sit at paper level. Learners still study the full ACCA paper.</Note>
        ) : null}
        <Field label="Mapping note" hint="Optional">
          <Textarea key={editing ? `${editing.subjectId}-${editing.paper}` : "none"} name="note" rows={3} defaultValue={subject?.note ?? ""} placeholder="e.g. Covers consolidation basics only; IFRS 10 depth is taught in FR." />
        </Field>
      </FormDrawer>
    </div>
  );
}
