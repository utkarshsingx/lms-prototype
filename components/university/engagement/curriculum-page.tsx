"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  GitBranch,
  Info,
  MessageSquareText,
  Plus,
  Route,
} from "lucide-react";
import {
  ACCA_TODAY,
  COVERAGE_LABELS,
  curriculumMappingFramework,
  curriculumUploads,
  formatAccaDate,
  paperByCode,
  paperName,
  roadmapApprovals,
  roadmapForUniversity,
  staffName,
  subjectsForUniversity,
  syllabusAreaTitle,
  type Coverage,
  type PaperCode,
  type SubjectMapping,
  type UniversitySubject,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, Segmented } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Matrix } from "@/components/ui/matrix";
import { StatusPill, toneSoft, type StatusTone } from "@/components/ui/status";
import { Stepper } from "@/components/ui/stepper";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { Callout, Gated, MiniLabel, WorkspaceHeader, plural, queueReport, useWorkspace } from "./shared";

const TABS = [
  { id: "upload", label: "Upload university curriculum" },
  { id: "mapping", label: "View curriculum-to-ACCA mapping" },
  { id: "roadmap", label: "Review semester-to-ACCA roadmap" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const COVERAGE_TONE: Record<Coverage, StatusTone> = { full: "jade", partial: "amber", "conceptual-only": "neutral" };

const MAPPING_STATUS_LABEL: Record<UniversitySubject["mappingStatus"], string> = {
  mapped: "Mapped",
  "in-review": "In review",
  "not-mapped": "Not mapped",
};

type Upload = { id: string; fileName: string; uploadedBy: string; uploadedOn: string; subjects: number | null; status: "mapped" | "in-review" | "received" };

type RoadmapStatus = "pending" | "approved" | "changes-requested";

function MappingChip({ m, className }: { m: SubjectMapping; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-px text-[11.5px] font-semibold whitespace-nowrap",
        toneSoft[COVERAGE_TONE[m.coverage]],
        className,
      )}
    >
      <span className="font-mono font-bold">{m.paper}</span>
      {m.areas.length ? <span className="font-mono">{m.areas.join(" ")}</span> : <span>paper level</span>}
    </span>
  );
}

export function CurriculumPage({ initialTab }: { initialTab?: string }) {
  const { uni, canEdit, reason, persona } = useWorkspace();
  const [tab, setTab] = useState<TabId>(TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "upload");

  /* ---------------------------------------------------------------- curriculum */
  const [subjects, setSubjects] = useState<UniversitySubject[]>(() => subjectsForUniversity(uni.id));
  const [uploads, setUploads] = useState<Upload[]>(() =>
    curriculumUploads
      .filter((u) => u.universityId === uni.id)
      .map((u) => ({ id: u.id, fileName: u.fileName, uploadedBy: staffName(u.uploadedBy), uploadedOn: u.uploadedOn, subjects: u.subjects, status: u.status }))
      .sort((a, b) => b.uploadedOn.localeCompare(a.uploadedOn)),
  );
  const [semFilter, setSemFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const visibleSubjects = useMemo(
    () =>
      subjects.filter(
        (s) => (!semFilter || String(s.semester) === semFilter) && (!statusFilter || s.mappingStatus === statusFilter),
      ),
    [subjects, semFilter, statusFilter],
  );

  const mappedCount = subjects.filter((s) => s.mappingStatus === "mapped").length;
  const reviewCount = subjects.filter((s) => s.mappingStatus === "in-review").length;
  const fullCount = subjects.filter((s) => s.mappings.some((m) => m.coverage === "full")).length;
  const credits = subjects.reduce((sum, s) => sum + s.credits, 0);

  const subjectColumns: DataTableColumn<UniversitySubject>[] = [
    { key: "code", header: "Code", mono: true, sortable: true },
    {
      key: "name",
      header: "University subject",
      sortable: true,
      wrap: true,
      render: (s) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{s.name}</span>
          {s.note ? <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{s.note}</span> : null}
        </span>
      ),
    },
    { key: "semester", header: "Semester", sortable: true, align: "right", render: (s) => `Sem ${s.semester}` },
    { key: "credits", header: "Credits", sortable: true, align: "right", mono: true },
    {
      key: "mapping",
      header: "ACCA papers and areas",
      render: (s) =>
        s.mappings.length ? (
          <span className="flex flex-wrap gap-1.5">
            {s.mappings.map((m) => (
              <MappingChip key={m.paper} m={m} />
            ))}
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">No ACCA overlap</span>
        ),
    },
    {
      key: "status",
      header: "Mapping status",
      sortable: true,
      sortValue: (s) => s.mappingStatus,
      render: (s) => <StatusPill status={s.mappingStatus}>{MAPPING_STATUS_LABEL[s.mappingStatus]}</StatusPill>,
    },
    { key: "reviewedBy", header: "Faculty reviewer", render: (s) => (s.reviewedBy ? staffName(s.reviewedBy) : <span className="text-ink-3">Not assigned</span>) },
  ];

  /* ---------------------------------------------------------------- mapping */
  const [mapSem, setMapSem] = useState("all");
  const [showUnmapped, setShowUnmapped] = useState(false);
  const [detail, setDetail] = useState<{ subject: UniversitySubject; mapping: SubjectMapping } | null>(null);

  const paperCols = useMemo(() => {
    const codes = new Set<PaperCode>();
    subjects.forEach((s) => s.mappings.forEach((m) => codes.add(m.paper)));
    return [...codes].sort((a, b) => (paperByCode(a)?.order ?? 0) - (paperByCode(b)?.order ?? 0));
  }, [subjects]);

  const matrixSubjects = subjects.filter(
    (s) => (mapSem === "all" || String(s.semester) === mapSem) && (showUnmapped || s.mappings.length > 0),
  );

  /* ---------------------------------------------------------------- roadmap */
  const stages = roadmapForUniversity(uni.id);
  const approval = roadmapApprovals.find((a) => a.universityId === uni.id);
  const [roadmapStatus, setRoadmapStatus] = useState<RoadmapStatus>("pending");
  const version = "v2.2";
  const [changesOpen, setChangesOpen] = useState(false);
  const [history, setHistory] = useState<TimelineItem[]>(() => [
    {
      id: "rh-3",
      title: "Revision v2.2 sent to the university for review",
      meta: "9 Sep 2026 · Priya Menon, ACCA Programme Lead",
      body: "Two changes: the LW on-demand exam window in Semester 4, and a proposed overlap subject for Semester 6.",
      tone: "amber",
    },
    ...(approval?.approvedOn
      ? [
          {
            id: "rh-2",
            title: `Roadmap ${approval.version} approved`,
            meta: `${formatAccaDate(approval.approvedOn)} · ${staffName(approval.approvedBy)}`,
            body: approval.note || undefined,
            tone: "jade" as const,
          },
        ]
      : []),
    {
      id: "rh-1",
      title: "Curriculum uploaded and mapped",
      meta: "20 May 2025 · Dr Suresh Nair",
      body: "B.Com (Hons) scheme of studies, 22 subjects. Faculty proposed mappings, approved by the ACCA Programme Lead.",
      tone: "neutral",
    },
  ]);

  const CHANGED_STAGES: Record<string, string> = {
    "rm-bw-4": "LW on-demand exam window set to the week of 18 Jan 2027, straight after winter break.",
    "rm-bw-6": "BCH602 Corporate Governance and Ethics proposed as an overlap subject for BT areas B and F (partial).",
  };
  const PROPOSED_OVERLAP: Record<string, string[]> = { "rm-bw-6": ["sub-bw-602"] };

  const currentSemesters = new Map<number, string[]>([
    [3, ["2025 intake"]],
    [1, ["2026 intake"]],
  ]);

  const coverageFor = (subjectId: string, papers: PaperCode[]) => {
    const s = subjects.find((x) => x.id === subjectId);
    return s?.mappings.find((m) => papers.includes(m.paper)) ?? s?.mappings[0];
  };

  const approve = () => {
    setRoadmapStatus("approved");
    setHistory((h) => [
      {
        id: `rh-${h.length + 1}`,
        title: `Roadmap ${version} approved`,
        meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`,
        body: "Student roadmaps and the ACCA sequence update for the 2025 and 2026 intakes.",
        tone: "jade",
      },
      ...h,
    ]);
    toast({ title: `Semester-to-ACCA roadmap ${version} approved`, body: `${uni.shortName} student roadmaps now follow ${version}. Priya Menon is notified.` });
  };

  /* ---------------------------------------------------------------- render */
  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Academics"
        title="Curriculum & mapping"
        sub={`Upload the ${uni.programmeName} curriculum, see how each university subject maps to ACCA syllabus areas, and review the semester-to-ACCA roadmap.`}
        actions={
          <>
            <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-curriculum-mapping.csv`, `${subjects.length} subjects with ACCA mappings`)}>
              <Download className="size-4" />
              Export mapping
            </Button>
            <Gated
              allowed={canEdit}
              reason={reason}
              onClick={() => {
                setTab("upload");
                requestAnimationFrame(() => document.getElementById("curriculum-upload")?.scrollIntoView({ behavior: "smooth", block: "center" }));
              }}
            >
              <FileSpreadsheet className="size-4" />
              Upload curriculum
            </Gated>
          </>
        }
      />

      <Callout icon={<Info />} title="This workspace maps university subjects to ACCA. It does not teach them.">
        University B.Com subjects are taught and managed by the university. This workspace maps them to ACCA; it does not deliver them.
      </Callout>

      <KpiRow cols={4}>
        <KpiTile label="Subjects in the curriculum" value={subjects.length} icon={<BookOpenCheck />} sub={`${credits} credits · 6 semesters`} />
        <KpiTile label="Mapped to ACCA" value={mappedCount} tone="jade" icon={<GitBranch />} sub={`${reviewCount} in faculty review`} />
        <KpiTile label="Full coverage" value={fullCount} tone="info" icon={<CheckCircle2 />} sub="Syllabus areas taught to ACCA depth" />
        <KpiTile
          label="Semester-to-ACCA roadmap"
          value={roadmapStatus === "approved" ? `${version} approved` : roadmapStatus === "changes-requested" ? "Changes requested" : `${version} to review`}
          tone={roadmapStatus === "approved" ? "jade" : roadmapStatus === "changes-requested" ? "rose" : "amber"}
          icon={<Route />}
          sub={roadmapStatus === "pending" ? "Sent 9 Sep 2026 by Priya Menon" : `Updated ${formatAccaDate(ACCA_TODAY)}`}
        />
      </KpiRow>

      <Tabs
        items={TABS.map((t) => ({ id: t.id, label: t.label, count: t.id === "upload" ? subjects.length : t.id === "roadmap" && roadmapStatus === "pending" ? 1 : undefined }))}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
      />

      {/* ------------------------------------------------------------ upload */}
      {tab === "upload" ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <Card className="min-w-0" id="curriculum-upload">
              <CardHeader
                title="Upload university curriculum"
                sub="The scheme of studies or a revised syllabus. ZSkillup faculty re-review mappings before any student roadmap changes."
              />
              <div className="px-5 pb-5">
                <FileDrop
                  label="Upload university curriculum"
                  accept=".pdf,.xlsx,.csv"
                  hint="Subject code, name, semester and credits per row, or the university syllabus PDF."
                  disabled={!canEdit}
                  disabledReason={reason}
                  onFiles={(_, added) => {
                    if (!added.length) return;
                    setUploads((list) => [
                      ...added.map((name, i) => ({
                        id: `cur-new-${list.length + i + 1}`,
                        fileName: name,
                        uploadedBy: persona.name,
                        uploadedOn: ACCA_TODAY,
                        subjects: null,
                        status: "received" as const,
                      })),
                      ...list,
                    ]);
                    toast({
                      title: `Curriculum uploaded: ${added.join(", ")}`,
                      body: `Sent to the ZSkillup academic team. Mappings are re-reviewed before ${uni.shortName} roadmaps change.`,
                    });
                  }}
                />
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface-2 px-4 py-3">
                  <p className="min-w-0 text-[12.5px] text-ink-2">One new or revised subject? Add it without uploading the whole scheme.</p>
                  <Gated allowed={canEdit} reason={reason} size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
                    <Plus className="size-4" />
                    Add subject
                  </Gated>
                </div>
              </div>
            </Card>

            <Card className="min-w-0">
              <CardHeader title="Upload history" sub={`${plural(uploads.length, "file")} for ${uni.shortName}`} />
              <ul className="divide-y divide-line border-t border-line">
                {uploads.map((u) => (
                  <li key={u.id} className="flex items-start justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2">
                        <FileSpreadsheet className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[12.5px] font-semibold text-ink">{u.fileName}</p>
                        <p className="mt-0.5 text-[12px] text-ink-3">
                          {formatAccaDate(u.uploadedOn)} · {u.uploadedBy}
                          {u.subjects != null ? ` · ${plural(u.subjects, "subject")}` : " · reading subjects"}
                        </p>
                      </div>
                    </div>
                    <StatusPill status={u.status} size="sm">
                      {u.status === "mapped" ? "Mapped" : u.status === "in-review" ? "Mapping in review" : "Received"}
                    </StatusPill>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <DataTable
            caption="University curriculum subjects"
            rows={visibleSubjects}
            columns={subjectColumns}
            getRowId={(s) => s.id}
            pageSize={12}
            initialSort={{ key: "semester", dir: "asc" }}
            search={{
              placeholder: "Search subject or code",
              match: (s, q) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q),
            }}
            filters={
              <FilterBar
                active={Boolean(semFilter || statusFilter)}
                onClear={() => {
                  setSemFilter("");
                  setStatusFilter("");
                }}
              >
                <FilterSelect
                  label="Semester"
                  allLabel="All"
                  value={semFilter}
                  onChange={setSemFilter}
                  options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `Semester ${n}` }))}
                />
                <FilterSelect
                  label="Mapping"
                  allLabel="Any status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={Object.entries(MAPPING_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
                />
              </FilterBar>
            }
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------------ mapping */}
      {tab === "mapping" ? (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {curriculumMappingFramework.coverageLevels.map((c) => (
              <div key={c.id} className="min-w-0 rounded-[var(--radius-lg)] border border-line bg-surface p-4">
                <StatusPill status={c.id} tone={COVERAGE_TONE[c.id as Coverage]}>
                  {c.label}
                </StatusPill>
                <p className="mt-2 text-[12.5px] leading-snug text-ink-2">{c.definition}</p>
              </div>
            ))}
            <div className="min-w-0 rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface p-4">
              <StatusPill status="not-mapped">Not mapped</StatusPill>
              <p className="mt-2 text-[12.5px] leading-snug text-ink-2">
                No ACCA syllabus overlap. The subject stays with the university and does not affect the ACCA roadmap.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              size="sm"
              value={mapSem}
              onChange={setMapSem}
              items={[{ id: "all", label: "All semesters" }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n), label: `Sem ${n}` }))]}
            />
            <div className="min-w-0">
              <Switch checked={showUnmapped} onChange={setShowUnmapped} label="Show subjects with no ACCA overlap" />
            </div>
          </div>

          <Matrix
            caption="Curriculum-to-ACCA mapping"
            corner={`University subject · ${plural(matrixSubjects.length, "row")}`}
            rows={matrixSubjects.map((s) => ({
              id: s.id,
              label: `${s.code} · ${s.name}`,
              sub: `Semester ${s.semester} · ${MAPPING_STATUS_LABEL[s.mappingStatus]}`,
            }))}
            cols={paperCols.map((p) => ({ id: p, label: <span title={paperName(p)}>{p}</span>, sub: paperByCode(p)?.group }))}
            cell={(rowId, colId) => {
              const s = subjects.find((x) => x.id === rowId);
              const m = s?.mappings.find((x) => x.paper === colId);
              if (!s || !m) return <span className="text-ink-3" aria-label="No mapping">·</span>;
              return (
                <button
                  type="button"
                  onClick={() => setDetail({ subject: s, mapping: m })}
                  aria-label={`${s.name} to ${paperName(m.paper)}: ${COVERAGE_LABELS[m.coverage]}${m.areas.length ? `, areas ${m.areas.join(", ")}` : ""}`}
                  className={cn(
                    "inline-flex flex-col items-center rounded-[10px] border px-2 py-1 text-[11px] leading-tight font-semibold transition-transform hover:-translate-y-px",
                    toneSoft[COVERAGE_TONE[m.coverage]],
                  )}
                >
                  <span>{COVERAGE_LABELS[m.coverage]}</span>
                  <span className="font-mono">{m.areas.length ? m.areas.join(" ") : "paper"}</span>
                </button>
              );
            }}
          />

          <Card className="p-5">
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="min-w-0">
                <MiniLabel>How mappings are made</MiniLabel>
                <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                  ZSkillup faculty propose each mapping at syllabus-area level and the ACCA Programme Lead approves it. You can view every
                  mapping and raise a query on any cell; you cannot change a mapping from this workspace.
                </p>
                <ul className="mt-3 space-y-1.5 text-[12.5px] text-ink-2">
                  {curriculumMappingFramework.rules.slice(0, 2).map((r) => (
                    <li key={r} className="flex gap-2">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cta-strong" />
                      <span className="min-w-0">{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="min-w-0">
                <Stepper
                  aria-label="Mapping approval flow"
                  steps={curriculumMappingFramework.approvalFlow.map((label, i, all) => ({
                    id: `flow-${i}`,
                    label,
                    state: i === all.length - 1 ? "current" : "done",
                  }))}
                />
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ roadmap */}
      {tab === "roadmap" ? (
        <div className="space-y-5">
          <Card className="min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="min-w-0 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <MiniLabel>Review semester-to-ACCA roadmap</MiniLabel>
                  <StatusPill
                    status={roadmapStatus === "pending" ? "Awaiting approval" : roadmapStatus === "approved" ? "Approved" : "Changes requested"}
                    size="sm"
                  />
                </div>
                <h2 className="mt-2 font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
                  {uni.programmeName} · roadmap {version}
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                  {roadmapStatus === "pending"
                    ? `Sent by Priya Menon on 9 Sep 2026. Currently live: ${approval?.version ?? "v2.1"}, approved ${approval?.approvedOn ? formatAccaDate(approval.approvedOn) : ""}.`
                    : roadmapStatus === "approved"
                      ? `Approved by ${persona.name} on ${formatAccaDate(ACCA_TODAY)}. Student roadmaps now follow ${version}.`
                      : `Changes requested by ${persona.name} on ${formatAccaDate(ACCA_TODAY)}. The Programme Admin team revises and resends it.`}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {Object.entries(CHANGED_STAGES).map(([id, text]) => (
                    <li key={id} className="flex gap-2 text-[12.5px] text-ink-2">
                      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber" />
                      <span className="min-w-0">
                        <span className="font-semibold text-ink">{stages.find((s) => s.id === id)?.label}:</span> {text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {roadmapStatus === "pending" ? (
                  <>
                    <Gated allowed={canEdit} reason={reason} variant="outline" onClick={() => setChangesOpen(true)}>
                      <MessageSquareText className="size-4" />
                      Request changes
                    </Gated>
                    <Gated allowed={canEdit} reason={reason} onClick={approve}>
                      <CheckCircle2 className="size-4" />
                      Approve roadmap
                    </Gated>
                  </>
                ) : roadmapStatus === "approved" ? (
                  <Button variant="secondary" onClick={() => queueReport(`${uni.workspace.slug}-semester-roadmap-${version}.pdf`)}>
                    <Download className="size-4" />
                    Download roadmap
                  </Button>
                ) : (
                  <Gated
                    allowed={canEdit}
                    reason={reason}
                    variant="outline"
                    onClick={() => {
                      setRoadmapStatus("pending");
                      toast({ title: "Change request withdrawn", body: `Roadmap ${version} is back in your review queue.`, tone: "info" });
                    }}
                  >
                    Withdraw request
                  </Gated>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stages.map((stage) => {
              const current = stage.semester != null ? currentSemesters.get(stage.semester) : undefined;
              const change = CHANGED_STAGES[stage.id];
              const overlap = [...stage.overlapSubjectIds, ...(PROPOSED_OVERLAP[stage.id] ?? [])];
              return (
                <Card key={stage.id} className={cn("flex min-w-0 flex-col p-5", current && "border-line-strong")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <MiniLabel>{stage.window}</MiniLabel>
                      <h3 className="mt-1 font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">{stage.label}</h3>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {current?.map((c) => (
                        <span key={c} className="rounded-full bg-cta px-2 py-px text-[11px] font-bold text-cta-ink">
                          Now · {c}
                        </span>
                      ))}
                      {change ? <StatusPill status="Changed" tone="amber" size="sm">Changed in {version}</StatusPill> : null}
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-[11.5px] font-semibold text-ink-3">ACCA papers studied</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {stage.papers.map((p) => (
                        <span key={p} className="inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] text-ink-2">
                          <span className="font-mono font-bold text-ink">{p}</span>
                          <span className="truncate">{paperName(p)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  {stage.examWindowPapers.length ? (
                    <p className="mt-2.5 text-[12.5px] text-ink-2">
                      <span className="font-semibold text-ink">Exam window:</span> {stage.examWindowPapers.join(", ")}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[12.5px] leading-snug text-ink-3">{stage.focus}</p>

                  <div className="mt-auto pt-4">
                    <p className="text-[11.5px] font-semibold text-ink-3">University subjects that overlap</p>
                    {overlap.length ? (
                      <ul className="mt-1.5 space-y-1">
                        {overlap.map((id) => {
                          const s = subjects.find((x) => x.id === id);
                          const m = coverageFor(id, stage.papers.length ? [...stage.papers, ...stage.examWindowPapers] : []);
                          const proposed = PROPOSED_OVERLAP[stage.id]?.includes(id);
                          return s ? (
                            <li key={id} className="flex min-w-0 items-center justify-between gap-2 text-[12.5px]">
                              <span className="min-w-0 truncate text-ink">
                                <span className="font-mono text-[11.5px] text-ink-3">{s.code}</span> {s.name}
                              </span>
                              {proposed ? (
                                <StatusPill status="Proposed" tone="amber" size="sm" />
                              ) : m ? (
                                <StatusPill status={m.coverage} tone={COVERAGE_TONE[m.coverage]} size="sm">
                                  {COVERAGE_LABELS[m.coverage]}
                                </StatusPill>
                              ) : null}
                            </li>
                          ) : null;
                        })}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-[12.5px] text-ink-3">None: Strategic Professional follows graduation.</p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-5">
            <MiniLabel className="mb-4">Review history</MiniLabel>
            <Timeline items={history} />
          </Card>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ drawers */}
      <FormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add subject"
        sub="Adds a university subject to the curriculum. ZSkillup faculty decide whether it maps to ACCA."
        submitLabel="Add subject"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const code = String(data.get("code") ?? "").trim().toUpperCase();
          const name = String(data.get("name") ?? "").trim();
          const semester = Number(data.get("semester"));
          const creditsValue = Number(data.get("credits"));
          if (subjects.some((s) => s.code === code)) {
            toast({ title: `${code} is already in the curriculum`, body: "Use a new subject code, or upload a revised syllabus.", tone: "warning" });
            return;
          }
          setSubjects((list) => [
            ...list,
            {
              id: `sub-new-${list.length + 1}`,
              universityId: uni.id,
              code,
              name,
              semester,
              credits: creditsValue,
              mappings: [],
              mappingStatus: "in-review",
              note: String(data.get("note") ?? "").trim() || `Added by ${persona.name} on ${formatAccaDate(ACCA_TODAY)}, awaiting faculty review.`,
            },
          ]);
          setSemFilter("");
          setStatusFilter("");
          toast({ title: `Subject added: ${code} ${name}`, body: `Semester ${semester}. Sent to ZSkillup faculty for mapping review.` });
          setAddOpen(false);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[minmax(0,8rem)_minmax(0,1fr)]">
          <Field label="Subject code">
            <Input name="code" required placeholder="BCH605" className="font-mono uppercase" pattern="[A-Za-z0-9]{4,10}" />
          </Field>
          <Field label="Subject name">
            <Input name="name" required placeholder="e.g. International Business Environment" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Semester">
            <Select name="semester" defaultValue="5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Credits">
            <Select name="credits" defaultValue="4">
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Note for faculty" hint="Optional">
          <Textarea name="note" rows={3} placeholder="e.g. Replaces BCH502 from the 2026 scheme." />
        </Field>
      </FormDrawer>

      <FormDrawer
        open={detail != null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.subject.code} · ${detail.subject.name}` : "Mapping"}
        sub={detail ? `Semester ${detail.subject.semester} maps to ${paperName(detail.mapping.paper)} (${detail.mapping.paper})` : undefined}
        submitLabel="Send mapping query"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="Read-only mapping"
        onSubmit={(data) => {
          if (!detail) return;
          toast({
            title: "Mapping query sent",
            body: `${detail.subject.code} to ${detail.mapping.paper}: ${String(data.get("query")).slice(0, 80)}. The ZSkillup academic team replies by email.`,
          });
          setDetail(null);
        }}
      >
        {detail ? (
          <>
            <div className="rounded-[16px] border border-line bg-surface-2 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={detail.mapping.coverage} tone={COVERAGE_TONE[detail.mapping.coverage]}>
                  {COVERAGE_LABELS[detail.mapping.coverage]}
                </StatusPill>
                <StatusPill status={detail.subject.mappingStatus} size="sm">
                  {MAPPING_STATUS_LABEL[detail.subject.mappingStatus]}
                </StatusPill>
              </div>
              <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">
                {curriculumMappingFramework.coverageLevels.find((c) => c.id === detail.mapping.coverage)?.definition}
              </p>
            </div>
            <div>
              <MiniLabel className="mb-2">ACCA syllabus areas</MiniLabel>
              {detail.mapping.areas.length ? (
                <ul className="divide-y divide-line rounded-[12px] border border-line">
                  {detail.mapping.areas.map((a) => (
                    <li key={a} className="flex items-baseline gap-3 px-3.5 py-2.5 text-[13px]">
                      <span className="font-mono font-bold text-ink">
                        {detail.mapping.paper} {a}
                      </span>
                      <span className="min-w-0 text-ink-2">{syllabusAreaTitle(detail.mapping.paper, a)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-2">Mapped at paper level only. {detail.subject.note}</p>
              )}
            </div>
            <dl className="rounded-[12px] border border-line px-3.5">
              <div className="flex items-baseline justify-between gap-4 border-b border-line py-2.5">
                <dt className="text-[12.5px] text-ink-3">Faculty reviewer</dt>
                <dd className="text-[13px] font-semibold text-ink">{detail.subject.reviewedBy ? staffName(detail.subject.reviewedBy) : "Not assigned"}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-4 py-2.5">
                <dt className="text-[12.5px] text-ink-3">Credits</dt>
                <dd className="text-[13px] font-semibold text-ink">{detail.subject.credits}</dd>
              </div>
            </dl>
            <Field label="Raise a query with the ZSkillup academic team">
              <Textarea
                name="query"
                rows={3}
                required
                disabled={!canEdit}
                placeholder="e.g. Our Corporate Accounting syllabus now covers consolidated cash flows. Should FR D move to full?"
              />
            </Field>
          </>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={changesOpen}
        onClose={() => setChangesOpen(false)}
        title="Request changes"
        sub={`Roadmap ${version} goes back to the Programme Admin team with your comment.`}
        submitLabel="Send change request"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const stageId = String(data.get("stage"));
          const stageLabel = stageId === "all" ? "Whole roadmap" : (stages.find((s) => s.id === stageId)?.label ?? "Roadmap");
          const comment = String(data.get("comment") ?? "").trim();
          setRoadmapStatus("changes-requested");
          setHistory((h) => [
            {
              id: `rh-${h.length + 1}`,
              title: `Changes requested · ${stageLabel}`,
              meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`,
              body: comment,
              tone: "rose",
            },
            ...h,
          ]);
          toast({ title: "Changes requested", body: `${stageLabel}. Priya Menon is notified and resends the roadmap.` });
          setChangesOpen(false);
        }}
      >
        <Field label="Stage">
          <Select name="stage" defaultValue="rm-bw-4">
            <option value="all">Whole roadmap</option>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} · {s.papers.join(", ")}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Comment">
          <Textarea
            name="comment"
            rows={5}
            required
            placeholder="e.g. Semester 4 begins 4 Jan 2027. Move the LW exam to the week of 25 Jan so learners have two teaching weeks first."
          />
        </Field>
      </FormDrawer>
    </div>
  );
}
