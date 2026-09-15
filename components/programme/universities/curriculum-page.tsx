"use client";

import { useMemo, useState } from "react";
import { BookOpenCheck, FileUp, GitBranch, Map as MapIcon, Plus } from "lucide-react";
import {
  ACCA_TODAY,
  COVERAGE_LABELS,
  curriculumUploads,
  formatAccaDate,
  roadmapApprovals,
  semesterRoadmaps,
  staffName,
  universitySubjects,
  universityById,
  type RoadmapStage,
  type UniversitySubject,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural, useEditAccess } from "../acca/common";
import { UniversityPicker, UniversityStrip } from "./common";
import { MappingMatrix } from "./mapping-matrix";
import { RoadmapEditor, type Approval } from "./roadmap-editor";

type Upload = { id: string; universityId: string; fileName: string; uploadedBy: string; uploadedOn: string; subjects: number; status: "mapped" | "in-review" };

type ParsedSubject = { code: string; name: string; semester: number; credits: number; change: "New" | "Updated" | "Unchanged" };

/** What the sample syllabus file contains for each university, beyond the subjects already on record. */
const SAMPLE_PARSE: Record<string, Omit<ParsedSubject, "change">[]> = {
  "u-brightwater": [
    { code: "BCH305", name: "Accounting Standards and Financial Reporting", semester: 5, credits: 4 },
    { code: "BCH602", name: "Corporate Governance and Ethics", semester: 6, credits: 4 },
    { code: "BCH504", name: "Advanced Cost Management", semester: 5, credits: 3 },
  ],
  "u-coastline": [
    { code: "CUB3C03", name: "Business Regulatory Framework", semester: 3, credits: 3 },
    { code: "CUB5C03", name: "Financial Reporting", semester: 5, credits: 4 },
  ],
  "u-northfield": [
    { code: "BBF201", name: "Cost Accounting", semester: 2, credits: 4 },
    { code: "BBF203", name: "Business Taxation", semester: 2, credits: 3 },
    { code: "BBF204", name: "Corporate Finance Basics", semester: 2, credits: 3 },
  ],
};

const roadmapsSeed = () =>
  Object.fromEntries(["u-brightwater", "u-coastline", "u-northfield"].map((id) => [id, semesterRoadmaps.filter((r) => r.universityId === id)]));

export function CurriculumPage() {
  const { canEdit, reason, persona } = useEditAccess("programme:universities");
  const [uniId, setUniId] = useState("u-brightwater");
  const [tab, setTab] = useState("upload");
  const [subjects, setSubjects] = useState<UniversitySubject[]>(universitySubjects);
  const [uploads, setUploads] = useState<Upload[]>(curriculumUploads);
  const [files, setFiles] = useState<string[]>([]);
  const [dropKey, setDropKey] = useState(0);
  const [addOpen, setAddOpen] = useState(false);

  const [savedRoadmaps, setSavedRoadmaps] = useState<Record<string, RoadmapStage[]>>(roadmapsSeed);
  const [draftRoadmaps, setDraftRoadmaps] = useState<Record<string, RoadmapStage[]>>(roadmapsSeed);
  const [approvals, setApprovals] = useState<Approval[]>(roadmapApprovals);

  const university = universityById(uniId)!;
  const uniSubjects = useMemo(() => subjects.filter((s) => s.universityId === uniId), [subjects, uniId]);
  const uniUploads = uploads.filter((u) => u.universityId === uniId).sort((a, b) => b.uploadedOn.localeCompare(a.uploadedOn));
  const approval = approvals.find((a) => a.universityId === uniId)!;

  const parsed: ParsedSubject[] = useMemo(() => {
    if (!files.length) return [];
    return (SAMPLE_PARSE[uniId] ?? []).map((p) => {
      const existing = uniSubjects.find((s) => s.code === p.code);
      return {
        ...p,
        change: !existing ? "New" : existing.name !== p.name || existing.credits !== p.credits ? "Updated" : "Unchanged",
      };
    });
  }, [files, uniId, uniSubjects]);

  const kpi = {
    subjects: uniSubjects.length,
    mapped: uniSubjects.filter((s) => s.mappingStatus === "mapped").length,
    review: uniSubjects.filter((s) => s.mappingStatus === "in-review").length,
    papers: new Set(uniSubjects.flatMap((s) => s.mappings.map((m) => m.paper))).size,
  };

  const setUniSubjects = (updater: (list: UniversitySubject[]) => UniversitySubject[]) =>
    setSubjects((all) => [...all.filter((s) => s.universityId !== uniId), ...updater(all.filter((s) => s.universityId === uniId))]);

  const importParsed = () => {
    const changes = parsed.filter((p) => p.change !== "Unchanged");
    setSubjects((all) => {
      let next = [...all];
      for (const p of changes) {
        const existing = next.find((s) => s.universityId === uniId && s.code === p.code);
        if (existing) {
          next = next.map((s) => (s.id === existing.id ? { ...s, name: p.name, credits: p.credits, mappingStatus: s.mappings.length ? "in-review" : "not-mapped" } : s));
        } else {
          next.push({
            id: `sub-new-${uniId}-${p.code.toLowerCase()}`,
            universityId: uniId,
            code: p.code,
            name: p.name,
            semester: p.semester,
            credits: p.credits,
            mappingStatus: "not-mapped",
            mappings: [],
          });
        }
      }
      return next;
    });
    setUploads((list) => [
      {
        id: `cur-new-${list.length}`,
        universityId: uniId,
        fileName: files[0],
        uploadedBy: persona.staffId ?? "st-priya",
        uploadedOn: ACCA_TODAY,
        subjects: parsed.length,
        status: "in-review",
      },
      ...list,
    ]);
    const added = changes.filter((c) => c.change === "New").length;
    toast({
      title: "University curriculum uploaded",
      body: `${files[0]} · ${plural(added, "new subject")}, ${plural(changes.length - added, "updated subject")} · map them next`,
    });
    setFiles([]);
    setDropKey((k) => k + 1);
  };

  const columns: DataTableColumn<UniversitySubject>[] = [
    { key: "code", header: "Code", mono: true, sortable: true },
    { key: "name", header: "University subject", sortable: true, className: "font-semibold" },
    { key: "semester", header: "Semester", align: "right", mono: true, sortable: true },
    { key: "credits", header: "Credits", align: "right", mono: true, sortable: true },
    {
      key: "mappings",
      header: "ACCA mapping",
      render: (s) =>
        s.mappings.length ? (
          <span className="flex flex-wrap gap-1">
            {s.mappings.map((m) => (
              <StatusPill key={m.paper} status={m.coverage === "conceptual-only" ? "conceptual only" : m.coverage} size="sm" dot={false}>
                <span className="font-mono">{m.paper}</span>
                {m.areas.length ? ` ${m.areas.join(" ")}` : ""} · {COVERAGE_LABELS[m.coverage]}
              </StatusPill>
            ))}
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">{s.note ?? "No ACCA overlap recorded"}</span>
        ),
    },
    {
      key: "mappingStatus",
      header: "Status",
      sortable: true,
      render: (s) => (
        <StatusPill status={s.mappingStatus} tone={s.mappingStatus === "mapped" ? "jade" : s.mappingStatus === "in-review" ? "amber" : "neutral"} />
      ),
    },
  ];

  const tabs = [
    { id: "upload", label: "Upload university curriculum", count: uniSubjects.length },
    { id: "map", label: "Map university subjects to ACCA topics", count: kpi.review },
    { id: "roadmap", label: "Create semester-to-ACCA roadmaps" },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="University coordination"
        title="Curriculum mapping"
        sub="Upload each partner's curriculum, map its subjects to ACCA syllabus areas and build the semester-to-ACCA roadmap learners follow."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <GatedButton allowed={canEdit} reason={reason} onClick={() => setTab("upload")}>
            <FileUp className="size-4" /> Upload curriculum
          </GatedButton>
        }
      />

      <UniversityPicker
        value={uniId}
        onChange={(id) => {
          setUniId(id);
          setFiles([]);
          setDropKey((k) => k + 1);
        }}
      />

      <UniversityStrip university={university}>
        <StatusPill status={approval.status === "approved" ? "Roadmap approved" : "Roadmap in review"} tone={approval.status === "approved" ? "jade" : "amber"} />
      </UniversityStrip>

      <KpiRow cols={4}>
        <KpiTile label="University subjects" value={kpi.subjects} icon={<BookOpenCheck />} sub={`${university.semesterSystem.semesters} semesters`} />
        <KpiTile label="Mapped to ACCA" value={kpi.mapped} tone="jade" icon={<GitBranch />} sub={`${kpi.papers} papers covered`} />
        <KpiTile label="Mappings in review" value={kpi.review} tone="amber" icon={<MapIcon />} sub="with paper faculty" />
        <KpiTile hero label="Roadmap version" value={approval.version} sub={approval.status === "approved" ? "Approved" : "In review"} />
      </KpiRow>

      <div className="space-y-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />

        {tab === "upload" ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card className="min-w-0">
                <CardHeader title="Upload university curriculum" sub={`Syllabus or scheme of study for ${university.programmeName}.`} />
                <div className="space-y-4 px-5 pb-5">
                  <FileDrop
                    key={`${uniId}-${dropKey}`}
                    label="Upload syllabus file"
                    accept=".pdf,.xlsx,.csv,.docx"
                    multiple={false}
                    disabled={!canEdit}
                    disabledReason={reason}
                    hint="Subjects, semesters and credits are read from the file."
                    onFiles={(all) => setFiles(all)}
                  />
                  {files.length ? (
                    <div className="space-y-2.5">
                      <MiniLabel>Parsed subjects · {files[0]}</MiniLabel>
                      <div className="scrollbar-slim overflow-x-auto rounded-[var(--radius-md)] border border-line">
                        <table className="w-full text-[12.5px]">
                          <thead>
                            <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                              <th className="px-3 py-2">Code</th>
                              <th className="px-3 py-2">Subject</th>
                              <th className="px-3 py-2 text-right">Sem</th>
                              <th className="px-3 py-2 text-right">Credits</th>
                              <th className="px-3 py-2">Change</th>
                            </tr>
                          </thead>
                          <tbody>
                            {parsed.map((p) => (
                              <tr key={p.code} className="border-t border-line">
                                <td className="px-3 py-2 font-mono whitespace-nowrap text-ink-2">{p.code}</td>
                                <td className="min-w-40 px-3 py-2 font-semibold text-ink">{p.name}</td>
                                <td className="px-3 py-2 text-right font-mono text-ink-2">{p.semester}</td>
                                <td className="px-3 py-2 text-right font-mono text-ink-2">{p.credits}</td>
                                <td className="px-3 py-2">
                                  <StatusPill status={p.change} tone={p.change === "New" ? "info" : p.change === "Updated" ? "amber" : "neutral"} size="sm" />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-[12px] text-ink-3">
                        {plural(uniSubjects.length - parsed.filter((p) => p.change !== "New").length, "subject")} on record match the file and stay unchanged.
                      </p>
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setFiles([]);
                            setDropKey((k) => k + 1);
                          }}
                        >
                          Discard
                        </Button>
                        <GatedButton size="sm" allowed={canEdit} reason={reason} onClick={importParsed}>
                          Import {plural(parsed.filter((p) => p.change !== "Unchanged").length, "change")}
                        </GatedButton>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card className="min-w-0">
                <CardHeader title="Upload history" sub={`${plural(uniUploads.length, "file")} for ${university.shortName}`} />
                <ul className="divide-y divide-line border-t border-line">
                  {uniUploads.map((u) => (
                    <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[12.5px] font-semibold text-ink">{u.fileName}</span>
                        <span className="block text-[12px] text-ink-3">
                          {staffName(u.uploadedBy)} · {formatAccaDate(u.uploadedOn)} · {plural(u.subjects, "subject")}
                        </span>
                      </span>
                      <StatusPill status={u.status} tone={u.status === "mapped" ? "jade" : "amber"} />
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            <DataTable
              caption={`${university.name} subjects`}
              rows={uniSubjects}
              columns={columns}
              getRowId={(s) => s.id}
              initialSort={{ key: "semester", dir: "asc" }}
              pageSize={12}
              search={{ placeholder: "Search subject or code", match: (s, q) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) }}
              toolbar={
                <>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTab("map")}>
                    Open mapping
                  </Button>
                  <GatedButton size="sm" allowed={canEdit} reason={reason} onClick={() => setAddOpen(true)}>
                    <Plus className="size-4" /> Add subject
                  </GatedButton>
                </>
              }
            />
            <Note>
              University B.Com subjects are taught and managed by the university. This workspace maps them to ACCA; it does not deliver them.
            </Note>
          </div>
        ) : null}

        {tab === "map" ? (
          <MappingMatrix subjects={uniSubjects} setSubjects={setUniSubjects} canEdit={canEdit} reason={reason} persona={persona.name} />
        ) : null}

        {tab === "roadmap" ? (
          <RoadmapEditor
            key={uniId}
            university={university}
            stages={draftRoadmaps[uniId] ?? []}
            saved={savedRoadmaps[uniId] ?? []}
            subjects={uniSubjects}
            approval={approval}
            onChange={(stages) => setDraftRoadmaps((d) => ({ ...d, [uniId]: stages }))}
            onReset={() => setDraftRoadmaps((d) => ({ ...d, [uniId]: savedRoadmaps[uniId] ?? [] }))}
            onSave={(next) => {
              setSavedRoadmaps((s) => ({ ...s, [uniId]: draftRoadmaps[uniId] ?? [] }));
              setApprovals((list) => list.map((a) => (a.universityId === uniId ? next : a)));
            }}
            canEdit={canEdit}
            reason={reason}
            persona={persona.name}
          />
        ) : null}
      </div>

      <FormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add university subject"
        sub={university.name}
        submitLabel="Add subject"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          const code = String(data.get("code") ?? "").trim().toUpperCase();
          const name = String(data.get("name") ?? "").trim();
          if (uniSubjects.some((s) => s.code === code)) {
            toast({ title: `${code} is already on record`, tone: "warning" });
            return;
          }
          setSubjects((all) => [
            ...all,
            {
              id: `sub-new-${uniId}-${code.toLowerCase()}`,
              universityId: uniId,
              code,
              name,
              semester: Number(data.get("semester")) || 1,
              credits: Number(data.get("credits")) || 4,
              mappingStatus: "not-mapped",
              mappings: [],
            },
          ]);
          toast({ title: "Subject added", body: `${code} · ${name} · map it to ACCA next` });
          setAddOpen(false);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)]">
          <Field label="Code">
            <Input name="code" required placeholder="BCH505" className="font-mono" />
          </Field>
          <Field label="Subject name">
            <Input name="name" required placeholder="e.g. Advanced Accounting" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Semester">
            <Select name="semester" defaultValue="1">
              {Array.from({ length: university.semesterSystem.semesters }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Semester {i + 1}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Credits">
            <Input name="credits" type="number" min={1} max={8} defaultValue={4} />
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}
