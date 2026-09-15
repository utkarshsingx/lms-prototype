"use client";

import { useCallback, useMemo, useState } from "react";
import { Building2, Download, FileSpreadsheet, GraduationCap, Layers, Upload, UsersRound } from "lucide-react";
import {
  cohortById,
  cohorts as allCohorts,
  intakeById,
  intakes,
  programmeById,
  programmeForUniversity,
  semesters,
  staffName,
  students as seedStudents,
  universities,
  universityById,
  formatAccaDate,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, DataRow } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Drawer } from "@/components/ui/modal";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { FileDrop } from "@/components/ui/file-drop";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, plural, useOpsAccess } from "./shared";
import { PickedSummary, StudentPicker } from "./student-picker";

type OpKind = "allocate" | "university" | "semester";

const OPS: Record<OpKind, { title: string; button: string; sub: string; submit: string }> = {
  allocate: {
    title: "Allocate students to cohorts",
    button: "Allocate to cohort",
    sub: "Add learners to an ACCA or university-linked cohort, and to one of its batches or sections.",
    submit: "Allocate",
  },
  university: {
    title: "Map students to universities",
    button: "Map to university",
    sub: "Link learners to a partner university, its programme and intake.",
    submit: "Map to university",
  },
  semester: {
    title: "Map students to semesters",
    button: "Map to semester",
    sub: "Set the current university semester and section for university-linked learners.",
    submit: "Map to semester",
  },
};

const SAMPLE_CSV = "september-2026-intake-students.csv";

type ImportRow = {
  name: string;
  type: Student["type"];
  universityId?: string;
  intakeId: string;
  semester?: number;
  section?: string;
  accaId: string | null;
  issue?: string;
};

const IMPORT_PREVIEW: ImportRow[] = [
  { name: "Kiran Bhat", type: "graduate", intakeId: "in-2026-sep", accaId: null },
  { name: "Pallavi Nair", type: "graduate", intakeId: "in-2026-sep", accaId: "4721093" },
  { name: "Aman Joshi", type: "undergraduate", universityId: "u-brightwater", intakeId: "in-2026-jul", semester: 1, section: "B", accaId: null },
  { name: "Meghna Kulkarni", type: "undergraduate", universityId: "u-coastline", intakeId: "in-2025-jul", semester: 3, section: "A", accaId: "5129044", issue: "Duplicate ACCA ID (already held by Rohan Iyer)" },
];

function uniq<T>(list: T[]) {
  return [...new Set(list)];
}

function cohortLabel(s: Student) {
  return s.cohortIds.map((id) => cohortById(id)?.name ?? id).join(", ");
}

function sectionName(s: Student) {
  for (const id of s.cohortIds) {
    const sec = cohortById(id)?.sections.find((x) => x.id === s.sectionId);
    if (sec) return sec.name;
  }
  return "";
}

function describeStudent(s: Student) {
  const uni = universityById(s.universityId)?.shortName ?? "ZSkillup direct";
  const semester = s.semester ? ` · Semester ${s.semester}` : "";
  return `${uni}${semester} · ${s.cohortIds.length ? cohortById(s.cohortIds[0])?.name : "Not allocated"}`;
}

function intakesForUniversity(uid: string) {
  const programme = programmeForUniversity(uid);
  return intakes.filter((i) => programme && i.programmeIds.includes(programme.id));
}

export function StudentsPage() {
  const { canEdit, reason } = useOpsAccess();

  const [rows, setRows] = useState<Student[]>(seedStudents);
  const [type, setType] = useState("");
  const [uni, setUni] = useState("");
  const [cohort, setCohort] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");

  const [op, setOp] = useState<OpKind | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [targetCohort, setTargetCohort] = useState("co-fr-dec26-wkd");
  const [targetUni, setTargetUni] = useState("u-brightwater");
  const [targetSemester, setTargetSemester] = useState("3");

  const [detailId, setDetailId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFiles, setImportFiles] = useState<string[]>([]);
  const [dropKey, setDropKey] = useState(0);
  const [imported, setImported] = useState(0);

  const byId = useMemo(() => new Map(rows.map((s) => [s.id, s])), [rows]);
  const detail = detailId ? byId.get(detailId) : undefined;

  const visible = useMemo(
    () =>
      rows.filter(
        (s) =>
          (!type || s.type === type) &&
          (!uni || (uni === "direct" ? !s.universityId : s.universityId === uni)) &&
          (!cohort || (cohort === "none" ? s.cohortIds.length === 0 : s.cohortIds.includes(cohort))) &&
          (!semesterFilter || String(s.semester ?? "") === semesterFilter),
      ),
    [rows, type, uni, cohort, semesterFilter],
  );

  const unallocated = rows.filter((s) => s.cohortIds.length === 0).length;
  const linked = rows.filter((s) => s.universityId).length;
  const withSemester = rows.filter((s) => s.universityId && s.semester).length;

  const openOp = useCallback(
    (kind: OpKind, ids: string[]) => {
      const first = ids.map((id) => byId.get(id)).find(Boolean);
      if (kind === "allocate") {
        const uniCohort = first?.universityId
          ? allCohorts.find((c) => c.universityId === first.universityId && c.intakeId === first.intakeId)
          : undefined;
        setTargetCohort(uniCohort?.id ?? (first?.cohortIds.length ? "co-fr-mar27-reat" : "co-fr-dec26-wkd"));
      }
      if (kind === "university") setTargetUni(first?.universityId ?? "u-brightwater");
      if (kind === "semester") setTargetSemester(String(Math.min(6, first?.semester ?? 3)));
      setPicked(kind === "semester" ? ids.filter((id) => byId.get(id)?.universityId) : ids);
      setShowPicker(ids.length === 0);
      setOp(kind);
      setDetailId(null);
    },
    [byId],
  );

  const closeOp = () => setOp(null);
  const pickedStudents = picked.map((id) => byId.get(id)).filter((s): s is Student => Boolean(s));

  /* ---------------------------------------------------------------- submit handlers */

  const requirePicked = () => {
    if (picked.length === 0) {
      toast({ title: "Choose at least one student", tone: "warning" });
      return false;
    }
    return true;
  };

  const submitAllocate = (data: FormData) => {
    if (!requirePicked()) return;
    const c = cohortById(targetCohort);
    if (!c) return;
    const sectionId = String(data.get("section") ?? "");
    const sec = c.sections.find((x) => x.id === sectionId);
    const move = data.get("move") === "on";
    setRows((prev) =>
      prev.map((s) =>
        picked.includes(s.id)
          ? {
              ...s,
              cohortIds: move ? [c.id] : uniq([...s.cohortIds, c.id]),
              sectionId: sec?.id ?? (move ? undefined : s.sectionId),
              section: sec?.kind === "section" ? sec.name.replace("Section ", "") : s.section,
            }
          : s,
      ),
    );
    toast({ title: `${plural(picked.length, "student")} allocated to ${c.name}`, body: sec ? sec.name : "No batch or section chosen yet" });
    closeOp();
  };

  const submitUniversity = (data: FormData) => {
    if (!requirePicked()) return;
    const intakeId = String(data.get("intake") ?? "");
    const join = data.get("join") === "on";
    if (!targetUni) {
      setRows((prev) =>
        prev.map((s) =>
          picked.includes(s.id)
            ? {
                ...s,
                universityId: undefined,
                semester: undefined,
                section: undefined,
                sectionId: undefined,
                type: "graduate",
                programmeId: "pr-graduate",
                cohortIds: s.cohortIds.filter((id) => !cohortById(id)?.universityId),
              }
            : s,
        ),
      );
      toast({ title: `${plural(picked.length, "student")} moved to ZSkillup direct`, body: "University link removed" });
      closeOp();
      return;
    }
    const u = universityById(targetUni)!;
    const programme = programmeForUniversity(targetUni);
    const uCohort = allCohorts.find((c) => c.universityId === targetUni && c.intakeId === intakeId);
    setRows((prev) =>
      prev.map((s) =>
        picked.includes(s.id)
          ? {
              ...s,
              universityId: u.id,
              programmeId: programme?.id ?? s.programmeId,
              intakeId: intakeId || s.intakeId,
              type: "undergraduate",
              semester: uCohort?.semester ?? s.semester,
              cohortIds:
                join && uCohort
                  ? uniq([...s.cohortIds.filter((id) => !cohortById(id)?.universityId), uCohort.id])
                  : s.cohortIds,
            }
          : s,
      ),
    );
    toast({
      title: `${plural(picked.length, "student")} mapped to ${u.name}`,
      body: `${programme?.name ?? u.programmeName} · ${intakeById(intakeId)?.label ?? ""}${join && uCohort ? ` · added to ${uCohort.name}` : ""}`,
    });
    closeOp();
  };

  const submitSemester = (data: FormData) => {
    if (!requirePicked()) return;
    const sem = Number(targetSemester);
    const letter = String(data.get("section") ?? "A");
    const move = data.get("move") === "on";
    setRows((prev) =>
      prev.map((s) => {
        if (!picked.includes(s.id) || !s.universityId) return s;
        const target =
          allCohorts.find((c) => c.universityId === s.universityId && c.semester === sem && c.intakeId === s.intakeId) ??
          allCohorts.find((c) => c.universityId === s.universityId && c.semester === sem);
        const sec = target?.sections.find((x) => x.name === `Section ${letter}`) ?? target?.sections[0];
        return {
          ...s,
          semester: sem,
          section: sec ? sec.name.replace("Section ", "") : letter,
          sectionId: move && sec ? sec.id : s.sectionId,
          cohortIds:
            move && target
              ? uniq([...s.cohortIds.filter((id) => cohortById(id)?.universityId !== s.universityId), target.id])
              : s.cohortIds,
        };
      }),
    );
    toast({ title: `${plural(picked.length, "student")} mapped to Semester ${sem}`, body: `Section ${letter} · effective ${formatAccaDate(String(data.get("from") || "2026-09-14"))}` });
    closeOp();
  };

  const submitImport = () => {
    if (importFiles.length === 0) {
      toast({ title: "Choose a CSV file first", tone: "warning" });
      return;
    }
    const gradTemplate = seedStudents.find((s) => s.scenarioTags.includes("new-graduate")) ?? seedStudents[0];
    const ugTemplate = seedStudents.find((s) => s.scenarioTags.includes("ug-bw26")) ?? seedStudents[1];
    const ready = IMPORT_PREVIEW.filter((r) => !r.issue);
    const base = imported;
    const created: Student[] = ready.map((r, i) => {
      const t = r.type === "graduate" ? gradTemplate : ugTemplate;
      const id = `s-import-${base + i + 1}`;
      return {
        ...t,
        id,
        name: r.name,
        initials: r.name
          .split(" ")
          .map((p) => p[0])
          .join("")
          .toUpperCase(),
        email: `${r.name.toLowerCase().replace(/\s+/g, ".")}@students.zskillup.com`,
        type: r.type,
        universityId: r.universityId as Student["universityId"],
        programmeId: r.universityId ? (programmeForUniversity(r.universityId)?.id ?? t.programmeId) : "pr-graduate",
        intakeId: r.intakeId,
        semester: r.semester,
        section: r.section,
        sectionId: undefined,
        cohortIds: [],
        accaId: r.accaId,
        enrolmentStatus: "onboarding",
      };
    });
    setRows((prev) => [...created, ...prev]);
    setImported(base + created.length);
    toast({
      title: `${plural(created.length, "student")} imported`,
      body: `${importFiles[0]} · ${plural(IMPORT_PREVIEW.length - created.length, "row")} skipped. New learners show as Not allocated.`,
    });
    setImportOpen(false);
    setImportFiles([]);
    setDropKey((k) => k + 1);
    setCohort("none");
  };

  /* ---------------------------------------------------------------- table */

  const columns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={s.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{s.name}</span>
            <span className="block text-[12px] text-ink-3">{programmeById(s.programmeId)?.name ?? ""}</span>
          </span>
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (s) => <Badge tone={s.type === "graduate" ? "dark" : "info"}>{s.type === "graduate" ? "Graduate" : "Undergraduate"}</Badge>,
    },
    {
      key: "university",
      header: "University",
      sortable: true,
      sortValue: (s) => universityById(s.universityId)?.shortName ?? "",
      render: (s) => (s.universityId ? universityById(s.universityId)?.name : <span className="text-ink-3">ZSkillup direct</span>),
    },
    {
      key: "semester",
      header: "Semester",
      sortable: true,
      sortValue: (s) => s.semester ?? 0,
      render: (s) => (s.semester ? `Semester ${s.semester}` : <span className="text-ink-3">Not applicable</span>),
    },
    {
      key: "cohort",
      header: "Cohort",
      sortable: true,
      sortValue: (s) => cohortLabel(s),
      render: (s) =>
        s.cohortIds.length ? (
          <span className="block max-w-[18rem] truncate" title={cohortLabel(s)}>
            {cohortById(s.cohortIds[0])?.name}
            {s.cohortIds.length > 1 ? <span className="text-ink-3"> +{s.cohortIds.length - 1}</span> : null}
          </span>
        ) : (
          <StatusPill status="Not allocated" tone="rose" size="sm" />
        ),
    },
    {
      key: "section",
      header: "Batch or section",
      render: (s) => sectionName(s) || <span className="text-ink-3">None</span>,
    },
    {
      key: "intake",
      header: "Intake",
      sortable: true,
      sortValue: (s) => intakeById(s.intakeId)?.start ?? "",
      render: (s) => intakeById(s.intakeId)?.label.replace(" intake", "") ?? "",
    },
    { key: "accaId", header: "ACCA ID", mono: true, sortable: true, render: (s) => s.accaId ?? <span className="font-sans text-ink-3">Not registered</span> },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (s) => s.enrolmentStatus,
      render: (s) => <StatusPill status={s.enrolmentStatus} size="sm" />,
    },
  ];

  const filtersActive = Boolean(type || uni || cohort || semesterFilter);
  const opCards: { kind: OpKind; icon: React.ReactNode; figure: string; figureSub: string }[] = [
    { kind: "allocate", icon: <Layers />, figure: String(unallocated), figureSub: "not allocated to a cohort" },
    { kind: "university", icon: <Building2 />, figure: String(linked), figureSub: `university-linked · ${rows.length - linked} ZSkillup direct` },
    { kind: "semester", icon: <GraduationCap />, figure: `${withSemester} of ${linked}`, figureSub: "semesters mapped" },
  ];

  /* ---------------------------------------------------------------- op drawer bodies */

  const cohortForAllocate = cohortById(targetCohort);
  const seatsAfter = (cohortForAllocate?.size ?? 0) + picked.filter((id) => !byId.get(id)?.cohortIds.includes(targetCohort)).length;
  const firstPicked = pickedStudents[0];
  const semesterDates = firstPicked?.universityId
    ? semesters.find((x) => x.universityId === firstPicked.universityId && x.intakeId === firstPicked.intakeId && x.number === Number(targetSemester))
    : undefined;
  const pickerCandidates = op === "semester" ? rows.filter((s) => s.universityId) : rows;

  const studentsBlock =
    showPicker || picked.length === 0 ? (
      <StudentPicker
        candidates={pickerCandidates}
        picked={picked}
        onChange={setPicked}
        describe={describeStudent}
        label={op === "semester" ? "University-linked students" : "Students"}
      />
    ) : (
      <PickedSummary students={pickedStudents} onEdit={() => setShowPicker(true)} />
    );

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Students"
        sub="Allocate students to cohorts, map students to universities and map students to semesters. Select rows for bulk changes."
        badge={canEdit ? undefined : <ViewOnlyChip reason={reason} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Report queued: programme-students.csv", tone: "info" })}>
              <Download className="size-4" />
              Export
            </Button>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => setImportOpen(true)}>
              <Upload className="size-4" />
              Import CSV
            </GatedButton>
          </>
        }
      />

      <div className="grid gap-3 md:grid-cols-3">
        {opCards.map((c) => (
          <Card key={c.kind} className="flex min-w-0 flex-col p-4.5">
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-inv text-cta [&>svg]:size-[18px]">{c.icon}</span>
              <div className="min-w-0">
                <h2 className="text-[14.5px] leading-snug font-bold text-ink">{OPS[c.kind].title}</h2>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{OPS[c.kind].sub}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <p className="min-w-0">
                <span className="font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{c.figure}</span>
                <span className="ml-1.5 text-[12.5px] text-ink-3">{c.figureSub}</span>
              </p>
              <GatedButton allowed={canEdit} reason={reason} size="sm" variant="outline" onClick={() => openOp(c.kind, [])}>
                {OPS[c.kind].button}
              </GatedButton>
            </div>
          </Card>
        ))}
      </div>

      <DataTable
        caption="Students"
        rows={visible}
        columns={columns}
        getRowId={(s) => s.id}
        search={{
          placeholder: "Search name, ACCA ID or cohort",
          match: (s, q) => s.name.toLowerCase().includes(q) || (s.accaId ?? "").includes(q) || cohortLabel(s).toLowerCase().includes(q),
        }}
        filters={
          <FilterBar
            active={filtersActive}
            onClear={() => {
              setType("");
              setUni("");
              setCohort("");
              setSemesterFilter("");
            }}
          >
            <FilterSelect
              label="Type"
              allLabel="All types"
              value={type}
              onChange={setType}
              options={[
                { value: "graduate", label: "Graduate" },
                { value: "undergraduate", label: "Undergraduate" },
              ]}
            />
            <FilterSelect
              label="University"
              allLabel="All"
              value={uni}
              onChange={setUni}
              options={[{ value: "direct", label: "ZSkillup direct" }, ...universities.map((u) => ({ value: u.id, label: u.shortName }))]}
            />
            <FilterSelect
              label="Cohort"
              allLabel="All cohorts"
              value={cohort}
              onChange={setCohort}
              options={[{ value: "none", label: "Not allocated" }, ...allCohorts.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <FilterSelect
              label="Semester"
              allLabel="Any"
              value={semesterFilter}
              onChange={setSemesterFilter}
              options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `Semester ${n}` }))}
            />
          </FilterBar>
        }
        selectable={canEdit}
        bulkActions={(ids, clear) => (
          <>
            {(Object.keys(OPS) as OpKind[]).map((kind) => (
              <Button
                key={kind}
                size="sm"
                variant={kind === "allocate" ? "primary" : "inverse"}
                onClick={() => {
                  openOp(kind, ids);
                  clear();
                }}
              >
                {kind === "allocate" ? <UsersRound className="size-3.5" /> : kind === "university" ? <Building2 className="size-3.5" /> : <GraduationCap className="size-3.5" />}
                {OPS[kind].button}
              </Button>
            ))}
          </>
        )}
        onRowClick={(s) => setDetailId(s.id)}
        rowLabel={(s) => `Open ${s.name}`}
        rowClassName={(s) => (s.id.startsWith("s-import-") ? "bg-cta-soft" : undefined)}
        empty={<p className="text-[13px] text-ink-3">No students match these filters.</p>}
      />

      {/* ---------------------------------------------------------------- allocate */}
      <FormDrawer
        open={op === "allocate"}
        onClose={closeOp}
        title={OPS.allocate.title}
        sub={OPS.allocate.sub}
        submitLabel={OPS.allocate.submit}
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={submitAllocate}
      >
        {studentsBlock}
        <Field label="Cohort">
          <Select name="cohort" value={targetCohort} onChange={(e) => setTargetCohort(e.target.value)}>
            <optgroup label="ACCA cohorts">
              {allCohorts
                .filter((c) => !c.universityId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="University-linked cohorts">
              {allCohorts
                .filter((c) => c.universityId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </optgroup>
          </Select>
        </Field>
        {cohortForAllocate ? (
          <>
            <Field label={cohortForAllocate.sections[0]?.kind === "section" ? "Section" : "Batch"}>
              <Select name="section" key={cohortForAllocate.id} defaultValue={cohortForAllocate.sections[0]?.id ?? ""}>
                {cohortForAllocate.sections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name} · {sec.schedule}
                  </option>
                ))}
                <option value="">Decide later</option>
              </Select>
            </Field>
            <div
              className={
                seatsAfter > cohortForAllocate.capacity
                  ? "rounded-[12px] border border-rose/30 bg-rose-soft px-3.5 py-2.5 text-[12.5px] text-rose"
                  : "rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2"
              }
            >
              {seatsAfter > cohortForAllocate.capacity
                ? `Over capacity: ${seatsAfter} of ${cohortForAllocate.capacity} seats after this allocation. Add a batch or section on Cohorts & batches.`
                : `${seatsAfter} of ${cohortForAllocate.capacity} seats used after this allocation · ${staffName(cohortForAllocate.facultyIds[0])} · ${cohortForAllocate.schedule}`}
            </div>
          </>
        ) : null}
        <Checkbox name="move" label="Move out of their current cohorts (transfer rather than add)" />
      </FormDrawer>

      {/* ---------------------------------------------------------------- university */}
      <FormDrawer
        open={op === "university"}
        onClose={closeOp}
        title={OPS.university.title}
        sub={OPS.university.sub}
        submitLabel={OPS.university.submit}
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={submitUniversity}
      >
        {studentsBlock}
        <Field label="University">
          <Select name="university" value={targetUni} onChange={(e) => setTargetUni(e.target.value)}>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.programmeName}
              </option>
            ))}
            <option value="">ZSkillup direct (remove university link)</option>
          </Select>
        </Field>
        {targetUni ? (
          <>
            <Field label="Intake">
              <Select name="intake" key={targetUni} defaultValue={intakesForUniversity(targetUni)[0]?.id}>
                {intakesForUniversity(targetUni).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="University roll number" hint="Optional, used when the university verifies the record">
              <Input name="roll" placeholder={`${universityById(targetUni)?.workspace.studentIdFormat ?? "Roll number"}`} className="font-mono" />
            </Field>
            <Checkbox name="join" defaultChecked label="Also add to the university-linked cohort for this intake" />
            <p className="text-[12px] text-ink-3">
              Mapped learners become undergraduates on {programmeForUniversity(targetUni)?.name ?? "the university programme"}. The university sees them in its workspace.
            </p>
          </>
        ) : (
          <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
            Learners return to the ACCA Graduate Pathway and leave any university-linked cohort.
          </p>
        )}
      </FormDrawer>

      {/* ---------------------------------------------------------------- semester */}
      <FormDrawer
        open={op === "semester"}
        onClose={closeOp}
        title={OPS.semester.title}
        sub={OPS.semester.sub}
        submitLabel={OPS.semester.submit}
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={submitSemester}
      >
        {studentsBlock}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current semester">
            <Select name="semester" value={targetSemester} onChange={(e) => setTargetSemester(e.target.value)}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  Semester {n}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Section">
            <Select name="section" defaultValue={firstPicked?.section ?? "A"}>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
            </Select>
          </Field>
        </div>
        <Field label="Effective from">
          <Input name="from" type="date" defaultValue="2026-09-14" />
        </Field>
        <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
          {semesterDates
            ? `${universityById(firstPicked?.universityId)?.shortName} ${semesterDates.label}: teaching ${formatAccaDate(semesterDates.start)} to ${formatAccaDate(semesterDates.end)}, university examinations ${formatAccaDate(semesterDates.examStart)} to ${formatAccaDate(semesterDates.examEnd)}.`
            : "Semester dates come from the university academic calendar once it is uploaded."}
        </p>
        <Checkbox name="move" defaultChecked label="Move to the matching university cohort and section" />
      </FormDrawer>

      {/* ---------------------------------------------------------------- import */}
      <FormDrawer
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportFiles([]);
          setDropKey((k) => k + 1);
        }}
        title="Import students from CSV"
        sub="Columns: name, email, type, university, intake, semester, section, ACCA ID."
        submitLabel={importFiles.length ? `Import ${IMPORT_PREVIEW.filter((r) => !r.issue).length} students` : "Import"}
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="Rows with problems are skipped."
        width="w-full max-w-2xl"
        onSubmit={submitImport}
      >
        <FileDrop
          key={dropKey}
          label="Student CSV"
          accept=".csv"
          hint="One row per learner. Up to 500 rows."
          initialFiles={importFiles}
          onFiles={(all) => setImportFiles(all)}
          disabled={!canEdit}
          disabledReason={reason}
        />
        {importFiles.length === 0 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setImportFiles([SAMPLE_CSV]);
              setDropKey((k) => k + 1);
            }}
          >
            <FileSpreadsheet className="size-4" />
            Use the sample file
          </Button>
        ) : (
          <div className="min-w-0">
            <MiniLabel className="mb-2">Parsed preview · {importFiles[0]}</MiniLabel>
            <div className="scrollbar-slim overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full min-w-[34rem] text-[12.5px]">
                <thead>
                  <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2">University · intake</th>
                    <th className="px-3 py-2">ACCA ID</th>
                    <th className="px-3 py-2">Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {IMPORT_PREVIEW.map((r) => (
                    <tr key={r.name}>
                      <td className="px-3 py-2 font-semibold whitespace-nowrap text-ink">{r.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-ink-2">{r.type === "graduate" ? "Graduate" : `Undergraduate · Sem ${r.semester} ${r.section}`}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-ink-2">
                        {universityById(r.universityId)?.shortName ?? "ZSkillup direct"} · {intakeById(r.intakeId)?.label.replace(" intake", "")}
                      </td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap text-ink-2">{r.accaId ?? "None"}</td>
                      <td className="px-3 py-2">
                        {r.issue ? (
                          <StatusPill status="Rejected" size="sm" className="max-w-[14rem]">
                            {r.issue}
                          </StatusPill>
                        ) : (
                          <StatusPill status="Ready" tone="jade" size="sm" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </FormDrawer>

      {/* ---------------------------------------------------------------- detail */}
      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetailId(null)}
        title={detail?.name ?? "Student"}
        sub={detail ? `${detail.type === "graduate" ? "Graduate" : "Undergraduate"} · ${programmeById(detail.programmeId)?.name ?? ""}` : undefined}
        footer={
          detail ? (
            <>
              {(Object.keys(OPS) as OpKind[])
                .filter((k) => k !== "semester" || detail.universityId)
                .map((k) => (
                  <GatedButton key={k} allowed={canEdit} reason={reason} size="sm" variant={k === "allocate" ? "primary" : "outline"} onClick={() => openOp(k, [detail.id])}>
                    {OPS[k].button}
                  </GatedButton>
                ))}
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex items-center gap-3">
              <Avatar name={detail.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-[13px] text-ink-3">{detail.email}</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <StatusPill status={detail.enrolmentStatus} size="sm" />
                  <StatusPill status={detail.registration.status} size="sm" />
                </div>
              </div>
            </div>
            <dl>
              <DataRow label="University">{universityById(detail.universityId)?.name ?? "ZSkillup direct"}</DataRow>
              <DataRow label="Intake">{intakeById(detail.intakeId)?.label ?? "Not set"}</DataRow>
              <DataRow label="Semester">{detail.semester ? `Semester ${detail.semester}` : "Not applicable"}</DataRow>
              <DataRow label="Batch or section">{sectionName(detail) || "None"}</DataRow>
              <DataRow label="Cohorts">{detail.cohortIds.length ? cohortLabel(detail) : "Not allocated"}</DataRow>
              <DataRow label="ACCA ID">
                <span className="font-mono">{detail.accaId ?? "Not registered"}</span>
              </DataRow>
              <DataRow label="Current paper">{detail.currentPaper ?? "None"}</DataRow>
              <DataRow label="Mentor">{staffName(detail.mentorId)}</DataRow>
              <DataRow label="Background">{detail.background.qualification}</DataRow>
            </dl>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
