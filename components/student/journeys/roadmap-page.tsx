"use client";

import { useState } from "react";
import { ChevronDown, Download, MapPin, MessageCircleQuestion, Scale, X } from "lucide-react";
import {
  COVERAGE_LABELS,
  curriculumMappingFramework,
  formatAccaDate,
  paperByCode,
  paperName,
  roadmapApprovals,
  roadmapForUniversity,
  staffName,
  subjectById,
  subjectsForUniversity,
  syllabusAreaTitle,
  universityById,
  type Coverage,
  type PaperCode,
  type RoadmapStage,
  type Student,
  type University,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Stepper, type StepState } from "@/components/ui/stepper";
import { Matrix } from "@/components/ui/matrix";
import { Segmented } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, UniversityMark, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";

const MATRIX_PAPERS: PaperCode[] = ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"];

const COVERAGE_TONE: Record<Coverage, StatusTone> = { full: "jade", partial: "amber", "conceptual-only": "neutral" };

/** Why each stage of the Brightwater sequence sits where it does. Other universities fall back to the stage focus. */
const SEQUENCE_REASONS: Record<string, string> = {
  "rm-bw-1":
    "BT comes first: it is the foundation Applied Knowledge paper and runs next to Business Organisation and Management, which covers BT areas A, B and D in part. BT is an on-demand exam, so it is sat as soon as teaching ends and before university examinations.",
  "rm-bw-2":
    "MA follows while Cost Accounting (MA area C, full) and Business Statistics (MA area B, partial) are taught. FA study begins here too, building on Financial Accounting from Semester 1, which covers FA areas C to F in full.",
  "rm-bw-3":
    "The FA exam sits in the Semester 3 window, on-demand and before university examinations begin, so an ACCA exam never competes with university papers. LW starts now because Business Law (Semester 2) and Company Law (Semester 3) have just covered LW areas B, D, E and F.",
  "rm-bw-4":
    "PM and TX run together. Management Accounting covers PM area A in part. TX is studied in full: Income Tax Law and Practice teaches Indian tax, which only builds concepts for TX-UK. The LW on-demand exam is sat in January, after the winter break.",
  "rm-bw-5":
    "FR and AA follow Corporate Accounting (FR area D, partial) and sit alongside Auditing (AA areas A, C and D, partial). PM and TX are sat as session exams, planned outside the December session because it overlaps university examinations.",
  "rm-bw-6":
    "FM completes Applied Skills next to the Financial Management subject (FM areas C, D and E, partial). FR and AA are sat in a session window that avoids university examinations.",
  "rm-bw-7":
    "Strategic Professional follows graduation: SBL, SBR and two options from AFM, APM, ATX and AAA. EPSM is completed before SBL, and PER builds up in your first finance role.",
};

function stageState(stage: RoadmapStage, current: number | undefined): StepState {
  if (stage.semester === null) return "locked";
  if (current === undefined) return "upcoming";
  if (stage.semester < current) return "done";
  if (stage.semester === current) return "current";
  return "upcoming";
}

function paperPill(s: Student, code: PaperCode) {
  const p = s.papers[code];
  const pass = p.attempts.find((a) => a.result === "passed");
  switch (p.status) {
    case "passed":
      return { status: "passed", label: `${code} passed ${pass?.score ?? ""}%` };
    case "exempt":
      return { status: "exempt", label: `${code} exempt` };
    case "current":
      return { status: "booked", label: `${code} exam ${p.plannedLabel ?? "booked"}` };
    case "in-progress":
      return { status: "in progress", label: `${code} studying` };
    case "failed":
      return { status: "failed", label: `${code} reattempt` };
    default:
      return { status: "upcoming", label: `${code} ${p.plannedLabel ? `· ${p.plannedLabel}` : "upcoming"}` };
  }
}

export function RoadmapPage() {
  const student = useStudentRecord();
  const university = universityById(student.universityId);
  return (
    <StudentTypeGate type="undergraduate" eyebrow="Your university" title="Semester roadmap">
      {university ? <RoadmapView key={student.id} student={student} university={university} /> : null}
    </StudentTypeGate>
  );
}

export function RoadmapView({ student, university }: { student: Student; university: University }) {
  const stages = roadmapForUniversity(university.id);
  const approval = roadmapApprovals.find((a) => a.universityId === university.id);
  const subjects = subjectsForUniversity(university.id);
  const [semester, setSemester] = useState("all");
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [cell, setCell] = useState<{ subjectId: string; paper: PaperCode } | null>(() => {
    const first = subjects.find((s) => s.semester === student.semester && s.mappings.length);
    return first ? { subjectId: first.id, paper: first.mappings[0].paper } : null;
  });
  const [open, setOpen] = useState<string[]>(() => stages.filter((s) => s.semester === student.semester).map((s) => s.id));

  const rows = subjects.filter((s) => (semester === "all" || String(s.semester) === semester) && (showUnmapped || s.mappings.length > 0));
  const mappings = subjects.flatMap((s) => s.mappings);
  const count = (c: Coverage) => mappings.filter((m) => m.coverage === c).length;
  const selectedSubject = cell ? subjectById(cell.subjectId) : undefined;
  const selectedMapping = selectedSubject?.mappings.find((m) => m.paper === cell?.paper);
  const coverageDef = curriculumMappingFramework.coverageLevels.find((c) => c.id === selectedMapping?.coverage);
  const paperSemester = (code: PaperCode) => stages.find((st) => st.papers.includes(code))?.label.replace("Semester ", "Sem ");

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your university"
        title="Semester roadmap"
        sub={`How your ${university.programmeName} semesters line up with ACCA papers at ${university.name}, where your university subjects overlap with the ACCA syllabus, and why the papers come in this order.`}
        badge={
          approval ? (
            <StatusPill status={approval.status}>
              Roadmap {approval.version} {approval.status === "approved" ? `approved ${approval.approvedOn ? formatAccaDate(approval.approvedOn) : ""}` : "in review"}
            </StatusPill>
          ) : null
        }
        actions={
          <>
            <LinkButton href="/my-mentor" variant="outline">
              <MessageCircleQuestion aria-hidden className="size-4" />
              Ask your mentor
            </LinkButton>
            <Button onClick={() => toast({ title: `Report queued: ${university.workspace.slug}-semester-roadmap.csv`, tone: "info" })}>
              <Download aria-hidden className="size-4" />
              Download roadmap
            </Button>
          </>
        }
      />

      {/* Semester-to-ACCA roadmap */}
      <section aria-labelledby="roadmap-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 id="roadmap-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              Semester-to-ACCA roadmap
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">
              {university.semesterSystem.semesters} semesters, academic year {university.semesterSystem.academicYear}. You are in Semester {student.semester}.
            </p>
          </div>
          {approval?.approvedBy ? (
            <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
              <UniversityMark university={university} size="sm" />
              Approved by {staffName(approval.approvedBy)}
            </p>
          ) : null}
        </div>

        <Card className="p-4 sm:p-5">
          <Stepper
            aria-label="Semester-to-ACCA roadmap"
            steps={stages.map((st) => ({
              id: st.id,
              label: st.semester ? `Sem ${st.semester} · ${st.papers.join(", ")}` : `After graduation`,
              sub: st.window,
              state: stageState(st, student.semester),
            }))}
          />
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stages.map((st) => {
            const state = stageState(st, student.semester);
            const selected = semester === String(st.semester);
            return (
              <Card key={st.id} className={cn("flex min-w-0 flex-col", state === "current" && "border-ink", selected && "ring-2 ring-cta")}>
                <div className={cn("flex items-center justify-between gap-2 rounded-t-[var(--radius-lg)] px-4 py-3", state === "current" ? "bg-surface-inv text-ink-inv" : "border-b border-line bg-surface-2")}>
                  <div className="min-w-0">
                    <p className={cn("text-[14px] font-bold", state === "current" ? "text-ink-inv" : "text-ink")}>{st.label}</p>
                    <p className={cn("text-[12px]", state === "current" ? "text-ink-inv/70" : "text-ink-3")}>{st.window}</p>
                  </div>
                  {state === "current" ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-cta px-2 py-0.5 text-[11px] font-bold text-cta-ink">
                      <MapPin aria-hidden className="size-3" />
                      You are here
                    </span>
                  ) : (
                    <StatusPill status={state === "done" ? "completed" : state === "locked" ? "planned" : "upcoming"} size="sm">
                      {state === "done" ? "Completed" : state === "locked" ? "After degree" : "Upcoming"}
                    </StatusPill>
                  )}
                </div>
                <div className="flex-1 space-y-3 px-4 py-3.5">
                  <div>
                    <MicroLabel>ACCA papers studied</MicroLabel>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {st.papers.map((p) => {
                        const pill = paperPill(student, p);
                        return (
                          <StatusPill key={p} status={pill.status} size="sm">
                            {pill.label}
                          </StatusPill>
                        );
                      })}
                    </div>
                  </div>
                  {st.examWindowPapers.length ? (
                    <div>
                      <MicroLabel>Exam window</MicroLabel>
                      <p className="mt-1 font-mono text-[12.5px] font-semibold text-ink">{st.examWindowPapers.join(", ")}</p>
                    </div>
                  ) : null}
                  <p className="text-[12.5px] leading-relaxed text-ink-2">{st.focus}</p>
                  {st.overlapSubjectIds.length ? (
                    <p className="text-[12px] text-ink-3">Overlaps with {st.overlapSubjectIds.map((id) => subjectById(id)?.name).filter(Boolean).join(", ")}</p>
                  ) : null}
                </div>
                {st.semester ? (
                  <div className="border-t border-line px-4 py-2.5">
                    <Button
                      size="xs"
                      variant={selected ? "secondary" : "ghost"}
                      onClick={() => {
                        setSemester(selected ? "all" : String(st.semester));
                        document.getElementById("overlap-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                    >
                      {selected ? "Showing overlap" : "Show subject overlap"}
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      </section>

      {/* University-subject overlap */}
      <section aria-labelledby="overlap-title" className="scroll-mt-24 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 id="overlap-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
              University-subject overlap
            </h2>
            <p className="mt-1 text-[13px] text-ink-3">Your B.Com subjects against ACCA papers, by syllabus area. Select a cell to see what it means for your ACCA study.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              size="sm"
              value={semester}
              onChange={setSemester}
              items={[{ id: "all", label: "All semesters" }, ...Array.from({ length: university.semesterSystem.semesters }, (_, i) => ({ id: String(i + 1), label: `Sem ${i + 1}` }))]}
            />
            <div className="rounded-[var(--radius-md)] border border-line bg-surface px-3 py-1.5">
              <Switch checked={showUnmapped} onChange={setShowUnmapped} label={<span className="text-[12.5px]">Show subjects with no overlap</span>} />
            </div>
          </div>
        </div>

        <KpiRow cols={4}>
          <KpiTile label="Subjects with ACCA overlap" value={`${subjects.filter((s) => s.mappings.length).length} of ${subjects.length}`} icon={<Scale />} />
          <KpiTile label="Full coverage" value={count("full")} tone="jade" sub={COVERAGE_LABELS.full} />
          <KpiTile label="Partial coverage" value={count("partial")} tone="amber" sub="Study the ACCA lessons for the gaps" />
          <KpiTile label="Conceptual only" value={count("conceptual-only")} tone="neutral" sub="Study the full ACCA paper" />
        </KpiRow>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="min-w-0">
            {rows.length ? (
              <Matrix
                caption="University subjects against ACCA papers"
                corner="University subject"
                maxHeight="36rem"
                rows={rows.map((s) => ({
                  id: s.id,
                  label: s.name,
                  sub: `${s.code} · Semester ${s.semester}${s.mappingStatus === "in-review" ? " · mapping in review" : ""}`,
                }))}
                cols={MATRIX_PAPERS.map((p) => ({ id: p, label: p, sub: paperSemester(p) }))}
                cell={(rowId, colId) => {
                  const sub = subjects.find((s) => s.id === rowId);
                  const m = sub?.mappings.find((x) => x.paper === colId);
                  if (!m) return <span aria-hidden className="inline-block size-1.5 rounded-full bg-line-strong" />;
                  const active = cell?.subjectId === rowId && cell.paper === colId;
                  const tone = COVERAGE_TONE[m.coverage];
                  return (
                    <button
                      type="button"
                      aria-pressed={active}
                      aria-label={`${sub?.name} and ${colId}: ${COVERAGE_LABELS[m.coverage]}${m.areas.length ? `, areas ${m.areas.join(", ")}` : ""}`}
                      onClick={() => setCell({ subjectId: rowId, paper: colId as PaperCode })}
                      className={cn(
                        "inline-flex max-w-full flex-col items-center rounded-[8px] border px-2 py-1 text-[11px] leading-tight font-semibold whitespace-nowrap transition-transform hover:scale-105",
                        tone === "jade" && "border-transparent bg-jade-soft text-jade",
                        tone === "amber" && "border-transparent bg-amber-soft text-amber",
                        tone === "neutral" && "border-line bg-surface-2 text-ink-2",
                        active && "ring-2 ring-ink",
                      )}
                    >
                      {m.coverage === "conceptual-only" ? "Concept" : COVERAGE_LABELS[m.coverage]}
                      {m.areas.length ? <span className="font-mono text-[10.5px] opacity-80">{m.areas.join(" ")}</span> : null}
                    </button>
                  );
                }}
              />
            ) : (
              <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-ink-3">
                No subjects in this semester overlap with ACCA. Turn on &quot;Show subjects with no overlap&quot; to list them.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {curriculumMappingFramework.coverageLevels.map((c) => (
                <p key={c.id} className="flex max-w-xs items-start gap-2 text-[12px] leading-snug text-ink-3">
                  <StatusPill status={c.id} tone={COVERAGE_TONE[c.id as Coverage]} size="sm" dot={false}>
                    {c.label}
                  </StatusPill>
                  <span className="min-w-0">{c.definition}</span>
                </p>
              ))}
            </div>
          </div>

          <Card className="min-w-0 self-start p-5">
            {selectedSubject && selectedMapping && cell ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <MicroLabel>Selected overlap</MicroLabel>
                  <button type="button" aria-label="Clear selection" onClick={() => setCell(null)} className="grid size-7 place-items-center rounded-[8px] text-ink-3 hover:bg-cta-soft hover:text-ink">
                    <X aria-hidden className="size-3.5" />
                  </button>
                </div>
                <p className="mt-2 text-[15px] font-bold text-ink">{selectedSubject.name}</p>
                <p className="text-[12.5px] text-ink-3">
                  {selectedSubject.code} · Semester {selectedSubject.semester} · {selectedSubject.credits} credits
                </p>
                <div className="my-3 flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-[8px] bg-surface-inv font-mono text-[12px] font-bold text-cta">{cell.paper}</span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold text-ink">{paperName(cell.paper)}</span>
                    <StatusPill status={selectedMapping.coverage} tone={COVERAGE_TONE[selectedMapping.coverage]} size="sm">
                      {COVERAGE_LABELS[selectedMapping.coverage]} coverage
                    </StatusPill>
                  </span>
                </div>
                {selectedMapping.areas.length ? (
                  <ul className="space-y-1.5 rounded-[var(--radius-md)] bg-surface-2 p-3 text-[12.5px] text-ink-2">
                    {selectedMapping.areas.map((a) => (
                      <li key={a} className="flex gap-2">
                        <span className="font-mono font-bold text-ink">{a}</span>
                        <span className="min-w-0">{syllabusAreaTitle(cell.paper, a)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-[var(--radius-md)] bg-surface-2 p-3 text-[12.5px] text-ink-2">Mapped at paper level only: concepts transfer but the rules differ.</p>
                )}
                <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{coverageDef?.definition}</p>
                {selectedSubject.note ? <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{selectedSubject.note}</p> : null}
                <p className="mt-3 text-[12px] text-ink-3">
                  {selectedSubject.reviewedBy ? `Reviewed by ${staffName(selectedSubject.reviewedBy)}, ACCA faculty` : "Awaiting faculty review"}
                </p>
                <LinkButton href={`/courses/${paperByCode(cell.paper)?.courseSlug ?? ""}`} size="sm" variant="outline" className="mt-4">
                  Open {cell.paper} study material
                </LinkButton>
              </>
            ) : (
              <p className="text-[13px] text-ink-3">Select a coloured cell in the grid to see the syllabus areas it covers.</p>
            )}
          </Card>
        </div>
        <p className="text-[12px] text-ink-3">
          University B.Com subjects are taught and managed by {university.shortName}. This workspace maps them to ACCA; it does not deliver them.
        </p>
      </section>

      {/* University-specific ACCA sequence */}
      <section aria-labelledby="sequence-title" className="space-y-4">
        <div className="min-w-0 max-w-2xl">
          <h2 id="sequence-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            University-specific ACCA sequence
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">Why {university.shortName} learners take the papers in this order, and how it differs from the graduate route.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="min-w-0">
            <ol className="divide-y divide-line">
              {stages.map((st, i) => {
                const isOpen = open.includes(st.id);
                const state = stageState(st, student.semester);
                return (
                  <li key={st.id}>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen((o) => (o.includes(st.id) ? o.filter((x) => x !== st.id) : [...o, st.id]))}
                      className={cn("flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-cta-soft", state === "current" && "bg-cta-soft")}
                    >
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-full text-[12.5px] font-bold tnum",
                          state === "done" ? "bg-jade text-on-accent" : state === "current" ? "bg-surface-inv text-cta" : "border border-line-strong bg-surface text-ink-3",
                        )}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-semibold text-ink">
                          {st.semester ? `${st.papers.join(", ")} in ${st.label}` : `${st.papers.join(", ")} ${st.label.toLowerCase()}`}
                        </span>
                        <span className="block truncate text-[12px] text-ink-3">
                          {st.window}
                          {st.examWindowPapers.length ? ` · exam window ${st.examWindowPapers.join(", ")}` : ""}
                        </span>
                      </span>
                      {state === "current" ? <StatusPill status="current" size="sm">You are here</StatusPill> : null}
                      <ChevronDown aria-hidden className={cn("size-4 shrink-0 text-ink-3 transition-transform", isOpen && "rotate-180")} />
                    </button>
                    {isOpen ? <p className="px-5 pb-4 pl-16 text-[13px] leading-relaxed text-ink-2">{SEQUENCE_REASONS[st.id] ?? st.focus}</p> : null}
                  </li>
                );
              })}
            </ol>
            <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
              <Button size="xs" variant="ghost" onClick={() => setOpen(stages.map((s) => s.id))}>
                Expand all
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setOpen([])}>
                Collapse all
              </Button>
            </div>
          </Card>
          <div className="min-w-0 space-y-4">
            <Card className="p-5">
              <MicroLabel>Compared with the graduate route</MicroLabel>
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                Graduates with a completed B.Com usually claim exemptions from BT, MA, FA and LW and start at Applied Skills. As an integrated undergraduate you sit those papers, timed next to the university subjects that teach the same syllabus areas, so no exemptions are claimed.
              </p>
            </Card>
            <Card className="p-5">
              <MicroLabel>Exam timing rules</MicroLabel>
              <ul className="mt-2 space-y-2 text-[13px] leading-relaxed text-ink-2">
                <li>BT, MA, FA and LW are on-demand exams, booked on any date outside university examinations.</li>
                <li>PM, TX, FR, AA and FM are session exams in March, June, September and December. The December session falls inside {university.shortName} examinations, so the roadmap avoids it.</li>
                <li>The pass mark is 50% for every paper.</li>
              </ul>
            </Card>
            <Card className="p-5">
              <MicroLabel>Your next step</MicroLabel>
              <p className="mt-2 text-[13.5px] font-semibold text-ink">
                {student.currentPaper ? `${student.currentPaper} exam on ${student.examBookings.find((b) => b.paper === student.currentPaper && b.status === "booked") ? formatAccaDate(student.examBookings.find((b) => b.paper === student.currentPaper && b.status === "booked")!.date) : "your booked date"}` : "Keep studying"}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-3">Readiness {student.readiness.byPaper[student.currentPaper ?? "FA"] ?? student.readiness.overall}. Then LW, planned for January.</p>
              <LinkButton href="/exams" size="sm" className="mt-3">
                Exams and results
              </LinkButton>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

