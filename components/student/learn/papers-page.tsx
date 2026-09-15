"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  Download,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  ListChecks,
  NotebookPen,
  Play,
  Presentation,
  ScrollText,
  Target,
} from "lucide-react";
import { lessonTypeLabel } from "@/lib/data";
import {
  CONTENT_TYPE_LABELS,
  contentForPaper,
  formatAccaDate,
  liveClasses,
  staffName,
  type ContentType,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { toast } from "@/components/ui/toast";
import { LessonBullet } from "@/components/course/lesson-icon";
import { cn } from "@/lib/cn";
import { PaperCodeChip, SectionLabel, useStudentRecord } from "./bits";
import {
  areaCoverage,
  completedLessons,
  lessonModules,
  nextLesson,
  paperEntries,
  weakAreasFor,
  type LearnCode,
  type PaperEntry,
  type PaperGroupId,
} from "./derive";

type MaterialKind = ContentType | "class-notes";

const MATERIAL_ICON: Record<MaterialKind, React.ComponentType<{ className?: string }>> = {
  video: Play,
  "study-material": FileText,
  transcript: ScrollText,
  "examiner-report": FileSearch,
  "model-answer": FileCheck2,
  "revision-notes": NotebookPen,
  "practice-activity": ListChecks,
  "class-notes": Presentation,
};

const MATERIAL_LABEL: Record<MaterialKind, string> = { ...CONTENT_TYPE_LABELS, "class-notes": "Class notes" };

type Material = { id: string; kind: MaterialKind; title: string; where: string; size: string; updated: string; variant?: string };

function materialsFor(s: Student, code: LearnCode): Material[] {
  if (code === "EPSM") return [];
  const content = contentForPaper(code)
    .filter((c) => c.status === "published" && (!c.variant || c.variant.universityId === s.universityId))
    .map<Material>((c) => ({
      id: c.id,
      kind: c.type,
      title: c.title,
      where: `${c.module} · ${c.lesson}`,
      size: c.size,
      updated: c.updated,
      variant: c.variant?.label,
    }));
  const notes = liveClasses
    .filter((c) => c.paper === code && s.cohortIds.includes(c.cohortId) && c.notes === "published")
    .map<Material>((c) => ({
      id: `notes-${c.id}`,
      kind: "class-notes",
      title: `Class notes: ${c.title}`,
      where: `Live class ${formatAccaDate(c.start)} · ${staffName(c.facultyId)}`,
      size: `${c.resources.length} ${c.resources.length === 1 ? "file" : "files"}`,
      updated: c.start.slice(0, 10),
    }));
  return [...content, ...notes];
}

const GROUPS: { id: PaperGroupId | "all"; label: string }[] = [
  { id: "now", label: "Studying now" },
  { id: "next", label: "Coming up" },
  { id: "done", label: "Completed" },
  { id: "all", label: "All papers" },
];

export function PapersPage({ initialPaper, initialTab }: { initialPaper?: string; initialTab?: string }) {
  const s = useStudentRecord();
  return <Papers key={s.id} s={s} initialPaper={initialPaper} initialTab={initialTab} />;
}

function Papers({ s, initialPaper, initialTab }: { s: Student; initialPaper?: string; initialTab?: string }) {
  const entries = useMemo(() => paperEntries(s), [s]);
  const start = entries.find((e) => e.code === initialPaper?.toUpperCase()) ?? entries.find((e) => e.code === s.currentPaper) ?? entries[0];

  const [group, setGroup] = useState<string>(start.group === "later" ? "all" : start.group);
  const [selected, setSelected] = useState<LearnCode>(start.code);
  const detailRef = useRef<HTMLDivElement>(null);

  const visible = group === "all" ? entries : entries.filter((e) => e.group === group);
  const entry = entries.find((e) => e.code === selected) ?? start;
  const current = s.currentPaper ? entries.find((e) => e.code === s.currentPaper) : undefined;

  const open = (code: LearnCode) => {
    setSelected(code);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="Papers"
        sub="Paper-wise learning for every ACCA paper in your plan: lessons, study material and syllabus areas in one place."
        actions={
          current?.course ? (
            <LinkButton href={`/learn/${current.course.slug}`}>
              <Play className="size-4 fill-current" />
              Resume {current.code}
            </LinkButton>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={group}
          onChange={setGroup}
          items={GROUPS.map((g) => ({
            id: g.id,
            label: `${g.label} (${g.id === "all" ? entries.length : entries.filter((e) => e.group === g.id).length})`,
          }))}
        />
        <p className="text-[12.5px] text-ink-3">
          {s.type === "undergraduate" ? "Sequenced to your university semesters" : "Exempt papers need no study"}
        </p>
      </div>

      {visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((e) => (
            <PaperCard key={e.code} s={s} e={e} active={e.code === selected} onOpen={() => open(e.code)} />
          ))}
        </div>
      ) : (
        <EmptyState title="Nothing in this group" sub="Switch to All papers to see every paper in your plan." />
      )}

      <div ref={detailRef} className="scroll-mt-24">
        <PaperDetail key={entry.code} s={s} e={entry} initialTab={initialTab} />
      </div>
    </div>
  );
}

function PaperCard({ s, e, active, onOpen }: { s: Student; e: PaperEntry; active: boolean; onOpen: () => void }) {
  const next = e.group === "now" || e.group === "next" ? nextLesson(s, e.code) : undefined;
  const total = e.course?.modules.reduce((n, m) => n + m.lessons.length, 0) ?? 0;
  const done = completedLessons(s, e.code);
  return (
    <Card className={cn("flex min-w-0 flex-col p-5 transition-colors", active && "border-ink shadow-[0_0_0_3px_var(--ring-cta)]")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PaperCodeChip code={e.code} />
          <div className="min-w-0">
            <p className="truncate font-display text-[16.5px] font-bold tracking-[-0.02em] text-ink">{e.name}</p>
            <p className="truncate text-[12px] text-ink-3">{e.levelLabel}</p>
          </div>
        </div>
        <StatusPill status={e.status} size="sm" className="shrink-0">
          {e.statusLabel}
        </StatusPill>
      </div>

      <p className="mt-3 truncate text-[12.5px] text-ink-2">{e.semester ? `${e.semester} · ${e.examLine}` : e.examLine}</p>

      <div className="mt-3 flex items-center gap-3">
        <Progress value={e.progress} height={6} tone={e.progress >= 100 ? "jade" : "cta"} className="flex-1" />
        <span className="shrink-0 text-[12px] font-semibold text-ink tnum">{e.progress}%</span>
      </div>
      <p className="mt-1 text-[11.5px] text-ink-3 tnum">
        {done} of {total} lessons{e.readiness != null ? ` · readiness score ${e.readiness}` : ""}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1">
        {e.areas.map((a) => (
          <span key={a.code} title={a.title} className="grid size-6 place-items-center rounded-[6px] border border-line bg-surface-2 font-mono text-[10.5px] font-bold text-ink-2">
            {a.code}
          </span>
        ))}
        <span className="ml-1 text-[11.5px] text-ink-3">{e.code === "EPSM" ? `${e.areas.length} units` : `${e.areas.length} syllabus areas`}</span>
      </div>

      {next ? (
        <p className="mt-3 line-clamp-2 rounded-[12px] bg-surface-2 px-3 py-2 text-[12.5px] text-ink-2">
          <span className="font-semibold text-ink">Next lesson:</span> {next.lesson.title}
        </p>
      ) : null}

      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Button size="sm" variant={active ? "secondary" : "outline"} onClick={onOpen}>
          {active ? "Showing below" : "Open paper"}
        </Button>
        {e.course && e.status !== "exempt" ? (
          <LinkButton size="sm" variant="ghost" href={`/learn/${e.course.slug}`}>
            {e.group === "done" ? "Review" : e.progress > 0 ? "Resume" : "Start"}
          </LinkButton>
        ) : null}
      </div>
    </Card>
  );
}

function PaperDetail({ s, e, initialTab }: { s: Student; e: PaperEntry; initialTab?: string }) {
  const modules = lessonModules(s, e.code);
  const materials = materialsFor(s, e.code);
  const weak = weakAreasFor(s).filter((w) => w.paper === e.code);
  const next = nextLesson(s, e.code);

  const [tab, setTab] = useState(["lessons", "material", "areas"].includes(initialTab ?? "") ? initialTab! : "lessons");
  const [openModules, setOpenModules] = useState<number[]>([next?.moduleIndex ?? 0]);
  const [kind, setKind] = useState("");

  const shown = kind ? materials.filter((m) => m.kind === kind) : materials;
  const kinds = [...new Set(materials.map((m) => m.kind))];
  const total = modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <Card className="min-w-0 overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line p-5">
        <div className="flex min-w-0 items-center gap-3">
          <PaperCodeChip code={e.code} className="h-9 min-w-12 text-[13px]" />
          <div className="min-w-0">
            <SectionLabel>Paper-wise learning</SectionLabel>
            <h2 className="mt-0.5 font-display text-[clamp(1.3rem,1.1rem+0.6vw,1.65rem)] leading-tight font-bold tracking-[-0.02em] text-ink">{e.name}</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-3">
              {e.levelLabel} · {e.examLine}
              {e.course ? ` · ${e.course.hours} study hours` : ""}
            </p>
          </div>
        </div>
        {e.course ? (
          <div className="flex flex-wrap gap-2">
            <LinkButton href={`/courses/${e.course.slug}`} variant="outline" size="sm">
              Paper overview
            </LinkButton>
            <LinkButton href={`/learn/${e.course.slug}`} size="sm">
              <Play className="size-3.5 fill-current" />
              {e.progress > 0 && e.progress < 100 ? "Resume" : e.progress >= 100 ? "Review" : "Start"}
            </LinkButton>
          </div>
        ) : null}
      </div>

      <div className="px-5 pt-3">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "lessons", label: "Lessons", count: total },
            { id: "material", label: "Study material", count: materials.length },
            { id: "areas", label: e.code === "EPSM" ? "Units" : "Syllabus areas", count: e.areas.length },
          ]}
        />
      </div>

      {tab === "lessons" ? (
        <div className="space-y-2 p-5">
          {modules.map((m, mi) => {
            const isOpen = openModules.includes(mi);
            const doneCount = m.lessons.filter((l) => l.state === "completed").length;
            return (
              <div key={m.id} className="overflow-hidden rounded-[14px] border border-line">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenModules((list) => (isOpen ? list.filter((x) => x !== mi) : [...list, mi]))}
                  className="flex w-full items-center gap-3 bg-surface-2 px-4 py-3 text-left transition-colors hover:bg-cta-soft"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-[12px] font-bold text-ink tnum">{mi + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-ink">{m.title}</span>
                    <span className="block text-[12px] text-ink-3 tnum">
                      {doneCount} of {m.lessons.length} lessons complete
                    </span>
                  </span>
                  <Progress value={(doneCount / m.lessons.length) * 100} height={4} tone={doneCount === m.lessons.length ? "jade" : "cta"} className="hidden w-24 sm:block" />
                  <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-ink-3 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen ? (
                  <ul className="divide-y divide-line">
                    {m.lessons.map((l) => (
                      <li key={l.id}>
                        <Link
                          href={`/learn/${e.course?.slug ?? ""}`}
                          className={cn("group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-cta-soft", l.state === "in_progress" && "bg-cta-soft")}
                        >
                          <LessonBullet type={l.type} state={l.state} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] text-ink">{l.title}</span>
                            <span className="block text-[11.5px] text-ink-3">
                              {lessonTypeLabel[l.type]} · {l.minutes} min
                              {l.state === "in_progress" ? " · in progress" : ""}
                            </span>
                          </span>
                          <ExternalLink aria-hidden className="size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {tab === "material" ? (
        <div className="p-5">
          {materials.length ? (
            <>
              <FilterBar active={kind !== ""} onClear={() => setKind("")} className="mb-3">
                <FilterSelect
                  label="Type"
                  value={kind}
                  onChange={setKind}
                  allLabel="All types"
                  options={kinds.map((k) => ({ value: k, label: MATERIAL_LABEL[k] }))}
                />
                <span className="text-[12px] text-ink-3">
                  {shown.length} of {materials.length} items
                </span>
              </FilterBar>
              <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line">
                {shown.map((m) => {
                  const Icon = MATERIAL_ICON[m.kind];
                  return (
                    <li key={m.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{m.title}</span>
                            {m.variant ? (
                              <StatusPill status="Variant" tone="info" dot={false} size="sm">
                                {m.variant}
                              </StatusPill>
                            ) : null}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {MATERIAL_LABEL[m.kind]} · {m.where} · {m.size} · updated {formatAccaDate(m.updated)}
                          </span>
                        </span>
                      </span>
                      <span className="flex shrink-0 gap-2 pl-12 sm:pl-0">
                        <Button size="xs" variant="outline" onClick={() => toast({ title: `Opening ${m.title}`, body: `${e.code} · ${MATERIAL_LABEL[m.kind]}`, tone: "info" })}>
                          Open
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => toast({ title: "Download started", body: m.title, tone: "info" })}>
                          <Download className="size-3.5" />
                          Download
                        </Button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <EmptyState
              title={e.code === "EPSM" ? "EPSM material lives in the lessons" : "No study material published for this paper yet"}
              sub={e.code === "EPSM" ? "Each EPSM unit carries its own readings and case studies." : "Your faculty publish notes, examiner reports and model answers as the paper starts."}
            />
          )}
        </div>
      ) : null}

      {tab === "areas" ? (
        <ul className="grid gap-3 p-5 md:grid-cols-2">
          {e.areas.map((a, i) => {
            const cov = areaCoverage(e.progress, i);
            const w = weak.find((x) => x.area === a.code);
            return (
              <li key={a.code} className="flex min-w-0 flex-col rounded-[14px] border border-line p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-[8px] bg-surface-inv font-mono text-[13px] font-bold text-cta">{a.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-ink">{a.title}</p>
                    {w ? (
                      <p className="mt-0.5 text-[12px] text-ink-3">
                        Weak topic: {w.topic} · your score {w.score}%
                      </p>
                    ) : null}
                  </div>
                  {w ? (
                    <StatusPill status="At risk" size="sm" className="shrink-0">
                      Weak area
                    </StatusPill>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={cov} height={6} tone={cov >= 100 ? "jade" : "brand"} className="flex-1" />
                  <span className="w-20 shrink-0 text-right text-[12px] text-ink-2 tnum">{cov}% covered</span>
                </div>
                {e.code !== "EPSM" ? (
                  <Link
                    href={`/practice?paper=${e.code}&area=${a.code}`}
                    className="mt-3 inline-flex w-fit items-center gap-1.5 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                  >
                    <Target aria-hidden className="size-3.5" />
                    Practise area {a.code}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Card>
  );
}
