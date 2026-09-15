"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, CalendarRange, Clock, Layers, MapPin, Plus, Users, Video } from "lucide-react";
import {
  accaPapers,
  COHORT_TYPE_LABELS,
  cohorts as seedCohorts,
  examSessionById,
  examSessions,
  faculty as facultyStaff,
  formatAccaDate,
  intakeById,
  intakes,
  mentors as mentorStaff,
  paperName,
  programmeById,
  programmeForUniversity,
  roadmapForUniversity,
  staffName,
  universities,
  universityById,
  type Cohort,
  type CohortSection,
  type CohortType,
  type ExamSessionId,
  type PaperCode,
} from "@/lib/data/acca";
import { PageHeader, DataRow } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { GatedButton, MiniLabel, plural, useOpsAccess } from "./shared";

const ACCA_TYPES: CohortType[] = ["regular", "revision", "reattempt", "fast-track"];
const FUTURE_SESSIONS = examSessions.filter((s) => !s.past && s.status !== "results-pending");

function isUniversity(c: Cohort) {
  return c.type === "university";
}

function intakeYear(intakeId?: string) {
  return intakeById(intakeId)?.start.slice(0, 4) ?? "";
}

function suggestAccaName(paper: string, type: CohortType, session: string, mode: string) {
  const label = examSessionById(session)?.label ?? "";
  const kind = type === "revision" ? " Revision" : type === "reattempt" ? " Reattempt" : type === "fast-track" ? " Fast Track" : "";
  return `${paper}${kind} · ${label} · ${mode === "weekend" ? "Weekend" : "Weekday"}`;
}

function intakesForUniversity(uid: string) {
  const programme = programmeForUniversity(uid);
  return intakes.filter((i) => programme && i.programmeIds.includes(programme.id));
}

export function CohortsPage() {
  const { canEdit, reason } = useOpsAccess();

  const [rows, setRows] = useState<Cohort[]>(seedCohorts);
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState("co-fr-dec26-wkd");
  const [created, setCreated] = useState(0);

  const [accaOpen, setAccaOpen] = useState(false);
  const [paper, setPaper] = useState<PaperCode>("AA");
  const [ctype, setCtype] = useState<CohortType>("regular");
  const [session, setSession] = useState<string>("es-2027-mar");
  const [mode, setMode] = useState("weekend");

  const [uniOpen, setUniOpen] = useState(false);
  const [uniId, setUniId] = useState("u-coastline");
  const [uniIntake, setUniIntake] = useState("in-2026-jul");
  const [uniSemester, setUniSemester] = useState("1");

  const [sectionOpen, setSectionOpen] = useState(false);

  const counts = {
    all: rows.length,
    acca: rows.filter((c) => !isUniversity(c)).length,
    university: rows.filter(isUniversity).length,
  };
  const visible = rows.filter((c) => (tab === "all" ? true : tab === "university" ? isUniversity(c) : !isUniversity(c)));
  const selected = rows.find((c) => c.id === selectedId) ?? rows[0];

  const totals = useMemo(
    () => ({
      running: rows.filter((c) => c.status === "running").length,
      learners: rows.reduce((s, c) => s + c.size, 0),
      sections: rows.reduce((s, c) => s + c.sections.length, 0),
      seats: rows.reduce((s, c) => s + Math.max(0, c.capacity - c.size), 0),
    }),
    [rows],
  );

  const uniRoadmapPapers = roadmapForUniversity(uniId).find((r) => r.semester === Number(uniSemester))?.papers ?? [];
  const uniDuplicate = rows.find((c) => c.universityId === uniId && c.intakeId === uniIntake && c.semester === Number(uniSemester));

  /* ------------------------------------------------------------------ create handlers */

  const createAcca = (data: FormData) => {
    const name = String(data.get("name") ?? "").trim() || suggestAccaName(paper, ctype, session, mode);
    const n = created + 1;
    const id = `co-new-${n}`;
    const capacity = Number(data.get("capacity")) || 30;
    const facultyId = String(data.get("faculty"));
    const batchName = String(data.get("batch") ?? "").trim();
    const schedule = String(data.get("schedule") ?? "").trim() || (mode === "weekend" ? "Sat 09:30 to 12:30" : "Tue and Thu 19:00 to 21:00");
    const sections: CohortSection[] = batchName
      ? [{ id: `bt-new-${n}-1`, cohortId: id, kind: "batch", name: batchName, size: 0, schedule, facultyId, onlineLink: `https://live.zskillup.com/new-${n}` }]
      : [];
    const cohort: Cohort = {
      id,
      name,
      type: ctype,
      mode: mode as Cohort["mode"],
      papers: [paper],
      programmeId: ctype === "fast-track" ? "pr-fasttrack" : ["SBL", "SBR", "AFM", "APM", "ATX", "AAA"].includes(paper) ? "pr-strategic" : "pr-graduate",
      examSessionId: session as ExamSessionId,
      facultyIds: [facultyId],
      mentorId: String(data.get("mentor")),
      size: 0,
      capacity,
      studentIds: [],
      sections,
      schedule,
      delivery: "Online live",
      startDate: String(data.get("start") || "2026-10-03"),
      endDate: examSessionById(session)?.examStart ?? "2027-03-01",
      status: "enrolling",
      selectable: true,
    };
    setRows((prev) => [cohort, ...prev]);
    setCreated(n);
    setSelectedId(id);
    setTab("acca");
    setAccaOpen(false);
    toast({ title: "ACCA cohort created", body: `${name} · ${capacity} seats · ${staffName(facultyId)}` });
  };

  const createUniversity = (data: FormData) => {
    const u = universityById(uniId);
    if (!u) return;
    const papers = data.getAll("papers").map(String) as PaperCode[];
    if (papers.length === 0) {
      toast({ title: "Choose at least one ACCA paper", tone: "warning" });
      return;
    }
    const n = created + 1;
    const id = `co-new-${n}`;
    const sectionCount = Number(data.get("sections")) || 1;
    const perSection = Number(data.get("perSection")) || 36;
    const facultyId = String(data.get("faculty"));
    const sections: CohortSection[] = Array.from({ length: sectionCount }, (_, i) => ({
      id: `sec-new-${n}-${i + 1}`,
      cohortId: id,
      kind: "section",
      name: `Section ${String.fromCharCode(65 + i)}`,
      size: 0,
      schedule: "Timetable to confirm with the university",
      facultyId,
    }));
    const name = `${u.shortName} · ${intakeYear(uniIntake)} intake · Semester ${uniSemester}`;
    const cohort: Cohort = {
      id,
      name,
      type: "university",
      mode: "weekday",
      papers,
      programmeId: programmeForUniversity(uniId)?.id ?? u.programmeId,
      universityId: u.id,
      intakeId: uniIntake,
      semester: Number(uniSemester),
      facultyIds: [facultyId],
      mentorId: String(data.get("mentor")),
      size: 0,
      capacity: sectionCount * perSection,
      studentIds: [],
      sections,
      schedule: "Weekday, aligned to the university timetable",
      delivery: "Hybrid",
      startDate: String(data.get("start") || "2027-01-04"),
      endDate: "2027-04-16",
      status: "enrolling",
      selectable: false,
    };
    setRows((prev) => [cohort, ...prev]);
    setCreated(n);
    setSelectedId(id);
    setTab("university");
    setUniOpen(false);
    toast({ title: "University-linked cohort created", body: `${name} · ${papers.join(", ")} · ${plural(sectionCount, "section")}` });
  };

  const addSection = (data: FormData) => {
    if (!selected) return;
    const kind = String(data.get("kind")) as CohortSection["kind"];
    const name = String(data.get("name") ?? "").trim();
    if (!name) return;
    const size = Number(data.get("size")) || 0;
    const room = String(data.get("room") ?? "").trim();
    const section: CohortSection = {
      id: `${kind === "batch" ? "bt" : "sec"}-${selected.id.replace(/^co-/, "")}-${selected.sections.length + 1}`,
      cohortId: selected.id,
      kind,
      name,
      size,
      schedule: String(data.get("schedule") ?? "").trim() || "Schedule to confirm",
      facultyId: String(data.get("faculty")),
      room: room || undefined,
      onlineLink: room ? undefined : `https://live.zskillup.com/${selected.id.replace(/^co-/, "")}-${selected.sections.length + 1}`,
    };
    setRows((prev) =>
      prev.map((c) => (c.id === selected.id ? { ...c, sections: [...c.sections, section], capacity: c.capacity + size } : c)),
    );
    setSectionOpen(false);
    toast({ title: `${kind === "batch" ? "Batch" : "Section"} added`, body: `${name} · ${selected.name} · ${size} seats` });
  };

  const sectionKind = selected && isUniversity(selected) ? "section" : "batch";

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Cohorts & batches"
        sub="Create ACCA cohorts and university-linked cohorts, then create batches and sections inside each cohort."
        badge={canEdit ? undefined : <ViewOnlyChip reason={reason} />}
        actions={
          <>
            <GatedButton allowed={canEdit} reason={reason} variant="secondary" onClick={() => setUniOpen(true)}>
              <Building2 className="size-4" />
              Create university-linked cohort
            </GatedButton>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => setAccaOpen(true)}>
              <Plus className="size-4" />
              Create ACCA cohort
            </GatedButton>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Cohorts running" value={totals.running} sub={`of ${rows.length} cohorts`} icon={<Layers />} tone="info" />
        <KpiTile label="Learners in cohorts" value={totals.learners} sub="headline enrolment" icon={<Users />} />
        <KpiTile label="Batches and sections" value={totals.sections} icon={<CalendarRange />} tone="violet" />
        <KpiTile label="Seats open" value={totals.seats} sub="across all cohorts" icon={<Plus />} tone="jade" />
      </KpiRow>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <div className="min-w-0 space-y-4">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "all", label: "All cohorts", count: counts.all },
              { id: "acca", label: "ACCA cohorts", count: counts.acca },
              { id: "university", label: "University-linked cohorts", count: counts.university },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {visible.map((c) => {
              const active = c.id === selected?.id;
              const session = c.examSessionId ? examSessionById(c.examSessionId) : undefined;
              const pct = c.capacity ? Math.round((c.size / c.capacity) * 100) : 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 flex-col rounded-[var(--radius-lg)] border bg-surface p-4 text-left transition-[border-color,box-shadow] duration-150",
                    active ? "border-ink shadow-[0_0_0_3px_var(--cta)]" : "border-line hover:border-line-strong",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={c.type === "university" ? "info" : c.type === "regular" ? "dark" : "amber"}>{COHORT_TYPE_LABELS[c.type]}</Badge>
                    <Badge>{c.mode === "weekend" ? "Weekend" : "Weekday"}</Badge>
                    <StatusPill status={c.status} size="sm" className="ml-auto" />
                  </div>
                  <p className="mt-2.5 text-[14.5px] leading-snug font-bold text-ink">{c.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                    {c.papers.join(", ")} ·{" "}
                    {c.universityId
                      ? `${universityById(c.universityId)?.shortName} · Semester ${c.semester}`
                      : session
                        ? `${session.label} exam session`
                        : programmeById(c.programmeId)?.name}
                  </p>
                  <p className="mt-2 truncate text-[12.5px] text-ink-2">
                    {c.facultyIds.map((id) => staffName(id)).join(", ")} · mentor {staffName(c.mentorId)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={pct} tone={pct >= 95 ? "rose" : "brand"} className="flex-1" />
                    <span className="shrink-0 font-mono text-[12px] text-ink-2 tnum">
                      {c.size}/{c.capacity}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-ink-3">
                    {c.sections.length === 0
                      ? "No batches or sections yet"
                      : plural(c.sections.length, c.sections[0].kind === "section" ? "section" : "batch", c.sections[0].kind === "section" ? "sections" : "batches")}
                  </p>
                </button>
              );
            })}
          </div>
          {tab !== "university" ? (
            <p className="text-[12.5px] text-ink-3">
              Revision and reattempt cohorts for failed papers are created from results on{" "}
              <Link href="/programme/acca/exams" className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
                Exams & results
              </Link>
              .
            </p>
          ) : null}
        </div>

        {selected ? (
          <Card className="h-fit min-w-0 xl:sticky xl:top-20">
            <CardHeader
              title={selected.name}
              sub={`${COHORT_TYPE_LABELS[selected.type]} cohort · ${programmeById(selected.programmeId)?.name ?? ""}`}
            />
            <div className="px-5">
              <dl>
                {selected.universityId ? (
                  <>
                    <DataRow label="University">{universityById(selected.universityId)?.name}</DataRow>
                    <DataRow label="Intake and semester">
                      {intakeById(selected.intakeId)?.label} · Semester {selected.semester}
                    </DataRow>
                  </>
                ) : (
                  <DataRow label="Exam session">{selected.examSessionId ? examSessionById(selected.examSessionId)?.label : "Not set"}</DataRow>
                )}
                <DataRow label="Papers">{selected.papers.map((p) => `${p} · ${paperName(p)}`).join(", ")}</DataRow>
                <DataRow label="Schedule">{selected.schedule}</DataRow>
                <DataRow label="Delivery">{selected.delivery}</DataRow>
                <DataRow label="Runs">
                  {formatAccaDate(selected.startDate)} to {formatAccaDate(selected.endDate)}
                </DataRow>
                <DataRow label="Seats">
                  {selected.size} of {selected.capacity}
                </DataRow>
              </dl>
            </div>
            <div className="mt-3 border-t border-line px-5 pt-4 pb-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <MiniLabel>Batches and sections</MiniLabel>
                <GatedButton allowed={canEdit} reason={reason} size="xs" onClick={() => setSectionOpen(true)}>
                  <Plus className="size-3.5" />
                  Add {sectionKind}
                </GatedButton>
              </div>
              {selected.sections.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-6 text-center text-[12.5px] text-ink-3">
                  No batches or sections yet. Add one to start allocating students.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {selected.sections.map((sec) => (
                    <li key={sec.id} className="rounded-[14px] border border-line bg-surface-2 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-[13.5px] font-bold text-ink">{sec.name}</p>
                        <span className="shrink-0 font-mono text-[12px] text-ink-2 tnum">{sec.size} students</span>
                      </div>
                      <p className="mt-1 flex items-start gap-1.5 text-[12px] text-ink-2">
                        <Clock aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                        <span className="min-w-0">{sec.schedule}</span>
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                        {sec.room ? <MapPin aria-hidden className="size-3.5 shrink-0" /> : <Video aria-hidden className="size-3.5 shrink-0" />}
                        <span className="min-w-0 truncate">
                          {sec.room ?? "Online live"} · {staffName(sec.facultyId)}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/programme/students"
                className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              >
                Allocate students to this cohort
                <ArrowRight aria-hidden className="size-3.5" />
              </Link>
            </div>
          </Card>
        ) : null}
      </div>

      {/* ------------------------------------------------------------------ ACCA cohort */}
      <FormDrawer
        open={accaOpen}
        onClose={() => setAccaOpen(false)}
        title="Create ACCA cohort"
        sub="An open-market cohort for one paper and exam session, taught in weekday or weekend batches."
        submitLabel="Create cohort"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="Graduate learners can choose it once it is enrolling."
        onSubmit={createAcca}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select name="paper" value={paper} onChange={(e) => setPaper(e.target.value as PaperCode)}>
              {accaPapers.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} · {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam session">
            <Select name="session" value={session} onChange={(e) => setSession(e.target.value)}>
              {FUTURE_SESSIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} · {s.statusLabel}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cohort type">
            <Select name="type" value={ctype} onChange={(e) => setCtype(e.target.value as CohortType)}>
              {ACCA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {COHORT_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mode">
            <Select name="mode" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="weekend">Weekend</option>
              <option value="weekday">Weekday</option>
            </Select>
          </Field>
        </div>
        <Field label="Cohort name" hint="Leave blank to use the suggested name">
          <Input name="name" placeholder={suggestAccaName(paper, ctype, session, mode)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Capacity">
            <Input name="capacity" type="number" min={5} max={80} defaultValue={30} />
          </Field>
          <Field label="Starts">
            <Input name="start" type="date" defaultValue="2026-10-03" />
          </Field>
          <Field label="Faculty">
            <Select name="faculty" key={paper} defaultValue={facultyStaff.find((f) => f.focusPapers.includes(paper))?.id ?? facultyStaff[0].id}>
              {facultyStaff.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.focusPapers.join(", ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mentor">
            <Select name="mentor" defaultValue="st-sana">
              {mentorStaff.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.allocation.students} of {m.allocation.capacity}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="rounded-[14px] border border-line p-3.5">
          <MiniLabel className="mb-3">First batch (optional)</MiniLabel>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Batch name">
              <Input name="batch" defaultValue={mode === "weekend" ? "Saturday batch" : "Tue and Thu evening"} key={mode} />
            </Field>
            <Field label="Schedule">
              <Input name="schedule" defaultValue={mode === "weekend" ? "Sat 09:30 to 12:30" : "Tue and Thu 19:00 to 21:00"} key={`s-${mode}`} />
            </Field>
          </div>
        </div>
        {facultyStaff.some((f) => f.focusPapers.includes(paper)) ? null : (
          <p className="rounded-[12px] border border-amber/30 bg-amber-soft px-3.5 py-2.5 text-[12.5px] text-amber">
            No faculty member lists {paper} as a focus paper yet. Assign a specialist on Faculty & mentors.
          </p>
        )}
      </FormDrawer>

      {/* ------------------------------------------------------------------ university cohort */}
      <FormDrawer
        open={uniOpen}
        onClose={() => setUniOpen(false)}
        title="Create university-linked cohort"
        sub="A cohort for one university intake and semester, following the university's semester-to-ACCA roadmap."
        submitLabel="Create cohort"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={createUniversity}
      >
        <Field label="University">
          <Select
            name="university"
            value={uniId}
            onChange={(e) => {
              setUniId(e.target.value);
              const list = intakesForUniversity(e.target.value);
              setUniIntake(list[list.length - 1]?.id ?? "in-2026-jul");
            }}
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} · {u.status}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Intake">
            <Select name="intake" value={uniIntake} onChange={(e) => setUniIntake(e.target.value)}>
              {intakesForUniversity(uniId).map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Semester">
            <Select name="semester" value={uniSemester} onChange={(e) => setUniSemester(e.target.value)}>
              {Array.from({ length: universityById(uniId)?.semesterSystem.semesters ?? 6 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  Semester {i + 1}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <fieldset key={`${uniId}-${uniSemester}`}>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">ACCA papers this semester</legend>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"].map((code) => (
              <Checkbox key={code} name="papers" value={code} defaultChecked={uniRoadmapPapers.includes(code as PaperCode)} label={code} />
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            {uniRoadmapPapers.length
              ? `Pre-selected from the ${universityById(uniId)?.shortName} roadmap: ${uniRoadmapPapers.join(", ")}.`
              : "No roadmap stage for this semester yet."}
          </p>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sections">
            <Select name="sections" defaultValue="2">
              <option value="1">1 section</option>
              <option value="2">2 sections (A and B)</option>
              <option value="3">3 sections (A to C)</option>
            </Select>
          </Field>
          <Field label="Seats per section">
            <Input name="perSection" type="number" min={10} max={80} defaultValue={36} />
          </Field>
          <Field label="Faculty">
            <Select name="faculty" defaultValue="st-vikram">
              {facultyStaff.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.focusPapers.join(", ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mentor">
            <Select name="mentor" defaultValue="st-sana">
              {mentorStaff.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Starts">
          <Input name="start" type="date" defaultValue="2027-01-04" />
        </Field>
        {uniDuplicate ? (
          <p className="rounded-[12px] border border-amber/30 bg-amber-soft px-3.5 py-2.5 text-[12.5px] text-amber">
            {uniDuplicate.name} already exists. Add a section to it instead of creating a second cohort.
          </p>
        ) : (
          <p className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
            Will be created as {universityById(uniId)?.shortName} · {intakeYear(uniIntake)} intake · Semester {uniSemester}.
          </p>
        )}
      </FormDrawer>

      {/* ------------------------------------------------------------------ section */}
      <FormDrawer
        open={sectionOpen}
        onClose={() => setSectionOpen(false)}
        title={`Add ${sectionKind}`}
        sub={selected ? `${selected.name} · currently ${plural(selected.sections.length, sectionKind, sectionKind === "batch" ? "batches" : "sections")}` : undefined}
        submitLabel={`Add ${sectionKind}`}
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={addSection}
      >
        {selected ? (
          <>
            <Field label="Type">
              <Select name="kind" defaultValue={sectionKind}>
                <option value="batch">Batch (a timetable slot in an ACCA cohort)</option>
                <option value="section">Section (a university class group)</option>
              </Select>
            </Field>
            <Field label="Name">
              <Input
                name="name"
                required
                defaultValue={
                  sectionKind === "section"
                    ? `Section ${String.fromCharCode(65 + selected.sections.length)}`
                    : selected.mode === "weekend"
                      ? "Sunday afternoon batch"
                      : "Mon and Wed evening"
                }
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Seats">
                <Input name="size" type="number" min={1} max={80} defaultValue={sectionKind === "section" ? 35 : 20} />
              </Field>
              <Field label="Faculty">
                <Select name="faculty" defaultValue={selected.facultyIds[0]}>
                  {facultyStaff.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Schedule">
              <Input name="schedule" defaultValue={selected.mode === "weekend" ? "Sun 14:00 to 17:00" : "Mon and Wed 19:00 to 21:00"} />
            </Field>
            <Field label="Room" hint="Leave blank for online live">
              <Input name="room" placeholder={selected.universityId ? "Commerce Block, C-208" : "Online live"} />
            </Field>
          </>
        ) : null}
      </FormDrawer>
    </div>
  );
}
