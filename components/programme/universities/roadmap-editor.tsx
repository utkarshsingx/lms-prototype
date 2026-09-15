"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, RotateCcw, Save } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ACCA_TODAY,
  APPLIED_KNOWLEDGE,
  APPLIED_SKILLS,
  STRATEGIC_ESSENTIALS,
  formatAccaDate,
  paperName,
  staffName,
  type PaperCode,
  type RoadmapStage,
  type University,
  type UniversitySubject,
} from "@/lib/data/acca";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural } from "../acca/common";

const CORE: PaperCode[] = [...APPLIED_KNOWLEDGE, ...APPLIED_SKILLS, ...STRATEGIC_ESSENTIALS];

export type Approval = {
  universityId: string;
  status: "approved" | "in-review";
  approvedBy: string | null;
  approvedOn: string | null;
  version: string;
  note: string;
};

function bumpVersion(v: string) {
  const [major, minor = "0"] = v.replace(/^v/, "").split(".");
  return `v${major}.${Number(minor) + 1}`;
}

function PaperToggle({
  code,
  pressed,
  onToggle,
  disabled,
  reason,
}: {
  code: PaperCode;
  pressed: boolean;
  onToggle: () => void;
  disabled: boolean;
  reason?: string;
}) {
  return (
    <span title={disabled ? reason : paperName(code)} className="inline-flex">
      <button
        type="button"
        aria-pressed={pressed}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "h-7 min-w-10 rounded-full border px-2 font-mono text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed",
          pressed ? "border-nav-active bg-nav-active text-nav-active-ink" : "border-line bg-surface text-ink-3 hover:border-ink hover:text-ink",
          disabled && !pressed && "opacity-60",
        )}
      >
        {code}
      </button>
    </span>
  );
}

export function RoadmapEditor({
  university,
  stages,
  saved,
  subjects,
  approval,
  onChange,
  onSave,
  onReset,
  canEdit,
  reason,
  persona,
}: {
  university: University;
  stages: RoadmapStage[];
  saved: RoadmapStage[];
  subjects: UniversitySubject[];
  approval: Approval;
  onChange: (stages: RoadmapStage[]) => void;
  onSave: (approval: Approval) => void;
  onReset: () => void;
  canEdit: boolean;
  reason?: string;
  persona: string;
}) {
  const [focusDraft, setFocusDraft] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(stages) !== JSON.stringify(saved);

  const toggle = (stageId: string, field: "papers" | "examWindowPapers", code: PaperCode) =>
    onChange(
      stages.map((s) =>
        s.id === stageId
          ? { ...s, [field]: s[field].includes(code) ? s[field].filter((p) => p !== code) : [...s[field], code].sort((a, b) => CORE.indexOf(a) - CORE.indexOf(b)) }
          : s,
      ),
    );

  const warnings = useMemo(() => {
    const out: string[] = [];
    const studiedAt = new Map<PaperCode, number[]>();
    const examAt = new Map<PaperCode, number[]>();
    stages.forEach((s, i) => {
      s.papers.forEach((p) => studiedAt.set(p, [...(studiedAt.get(p) ?? []), i]));
      s.examWindowPapers.forEach((p) => examAt.set(p, [...(examAt.get(p) ?? []), i]));
    });
    const missing = CORE.filter((p) => !studiedAt.has(p));
    if (missing.length) out.push(`Not placed in any semester: ${missing.join(", ")}.`);
    for (const [p, idx] of studiedAt) if (idx.length > 1) out.push(`${p} is studied in more than one stage.`);
    for (const [p, idx] of examAt) {
      const firstStudy = Math.min(...(studiedAt.get(p) ?? [Infinity]));
      if (idx.some((i) => i < firstStudy)) out.push(`${p} has an exam window before the stage where it is studied.`);
    }
    const lastAk = Math.max(...APPLIED_KNOWLEDGE.map((p) => Math.min(...(studiedAt.get(p) ?? [Infinity]))));
    const earlyAs = APPLIED_SKILLS.filter((p) => (studiedAt.get(p) ?? []).some((i) => i < lastAk) && p !== "LW");
    if (Number.isFinite(lastAk) && earlyAs.length) out.push(`${earlyAs.join(", ")} studied before Applied Knowledge is complete.`);
    return out;
  }, [stages]);

  const addStage = () => {
    const numbered = stages.filter((s) => s.semester != null);
    const next = (numbered[numbered.length - 1]?.semester ?? 0) + 1;
    const odd = next % 2 === 1;
    const stage: RoadmapStage = {
      id: `rm-new-${university.id}-${next}`,
      universityId: university.id,
      semester: next,
      label: `Semester ${next}`,
      window: odd ? university.semesterSystem.academicYear.split(" to ")[0] + " to Nov" : "Jan to Apr",
      papers: [],
      examWindowPapers: [],
      focus: "",
      overlapSubjectIds: subjects.filter((s) => s.semester === next && s.mappings.length).map((s) => s.id),
    };
    const after = stages.findIndex((s) => s.semester == null);
    onChange(after === -1 ? [...stages, stage] : [...stages.slice(0, after), stage, ...stages.slice(after)]);
    toast({ title: `Semester ${next} added`, body: "Select the papers studied and the exam window.", tone: "info" });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <MiniLabel>Roadmap approval</MiniLabel>
              <p className="mt-2 font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
                {university.shortName} roadmap {approval.version}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                {approval.status === "approved" && approval.approvedBy && approval.approvedOn
                  ? `Approved by ${staffName(approval.approvedBy)} on ${formatAccaDate(approval.approvedOn)}`
                  : `Waiting for ${university.contact.name} to review`}
              </p>
            </div>
            <StatusPill status={approval.status === "approved" ? "Approved" : "In review"} />
          </div>
          {approval.note ? <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{approval.note}</p> : null}
        </Card>
        <Card className="min-w-0 p-5">
          <MiniLabel>Roadmap checks</MiniLabel>
          {warnings.length ? (
            <ul className="mt-2.5 space-y-1.5">
              {warnings.map((w) => (
                <li key={w} className="flex items-start gap-2 text-[12.5px] text-ink">
                  <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber" />
                  <span className="min-w-0">{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-ink">
              <CheckCircle2 aria-hidden className="size-4 text-jade" /> Every core paper is placed in order, with exam windows after study.
            </p>
          )}
          <p className="mt-3 text-[12px] text-ink-3">Exam windows are planned outside the university examination blackout.</p>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] text-ink-3">
          {plural(stages.length, "stage")} · select the papers studied and sat in each semester. No dragging needed.
        </p>
        <div className="flex flex-wrap gap-2">
          <GatedButton size="sm" variant="outline" allowed={canEdit} reason={reason} onClick={addStage}>
            <Plus className="size-3.5" /> Add semester
          </GatedButton>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={!dirty}
            onClick={() => {
              setFocusDraft({});
              onReset();
            }}
          >
            <RotateCcw className="size-3.5" /> Reset
          </Button>
          <GatedButton
            size="sm"
            allowed={canEdit}
            reason={reason}
            disabled={!dirty}
            onClick={() => {
              const version = bumpVersion(approval.version);
              onSave({
                universityId: university.id,
                status: "in-review",
                approvedBy: null,
                approvedOn: null,
                version,
                note: `Saved by ${persona} on ${formatAccaDate(ACCA_TODAY)}. Sent to ${university.contact.name} for review.`,
              });
              toast({ title: `Roadmap saved as ${version}`, body: `${university.name} · sent to ${university.contact.name} for review` });
            }}
          >
            <Save className="size-3.5" /> Save roadmap
          </GatedButton>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {stages.map((s) => (
          <Card key={s.id} className="min-w-0 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-display text-[17px] leading-tight font-bold tracking-[-0.02em] text-ink">{s.label}</p>
                <p className="text-[12px] text-ink-3">{s.window}</p>
              </div>
              {s.papers.length ? (
                <span className="font-mono text-[12px] font-semibold text-ink">{s.papers.join(" · ")}</span>
              ) : (
                <StatusPill status="No papers" tone="neutral" size="sm" />
              )}
            </div>
            <MiniLabel className="mt-3.5 mb-1.5">Study this semester</MiniLabel>
            <div className="flex flex-wrap gap-1.5">
              {CORE.map((p) => (
                <PaperToggle key={p} code={p} pressed={s.papers.includes(p)} disabled={!canEdit} reason={reason} onToggle={() => toggle(s.id, "papers", p)} />
              ))}
            </div>
            <MiniLabel className="mt-3.5 mb-1.5">Exam window</MiniLabel>
            <div className="flex flex-wrap gap-1.5">
              {CORE.map((p) => (
                <PaperToggle
                  key={p}
                  code={p}
                  pressed={s.examWindowPapers.includes(p)}
                  disabled={!canEdit}
                  reason={reason}
                  onToggle={() => toggle(s.id, "examWindowPapers", p)}
                />
              ))}
            </div>
            <MiniLabel className="mt-3.5 mb-1.5">Focus</MiniLabel>
            <Textarea
              rows={2}
              value={focusDraft[s.id] ?? s.focus}
              disabled={!canEdit}
              onChange={(e) => setFocusDraft((d) => ({ ...d, [s.id]: e.target.value }))}
              onBlur={() => {
                const v = focusDraft[s.id];
                if (v != null && v !== s.focus) onChange(stages.map((x) => (x.id === s.id ? { ...x, focus: v } : x)));
              }}
              className="text-[13px]"
              placeholder="What learners focus on this semester"
            />
            {s.overlapSubjectIds.length ? (
              <p className="mt-2.5 text-[12px] leading-snug text-ink-3">
                Overlaps with {s.overlapSubjectIds.map((id) => subjects.find((x) => x.id === id)?.name).filter(Boolean).join(", ")}
              </p>
            ) : null}
          </Card>
        ))}
      </div>

      <Note>
        University B.Com subjects are taught and managed by the university. This workspace maps them to ACCA; it does not deliver them.
      </Note>
    </div>
  );
}
