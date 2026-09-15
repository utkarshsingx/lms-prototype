"use client";

import { useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileSearch,
  MessageSquarePlus,
  RotateCcw,
  Sparkles,
  UserRoundPen,
} from "lucide-react";
import {
  formatAccaDate,
  paperName,
  papersCleared,
  type CareerProfile,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { BarChart } from "@/components/ui/charts";
import { CareerBadges, Guard, READ_ONLY_REASON, ReadOnlyNotice, useCareerScope } from "./scope";
import {
  CITIES,
  ROLE_TRACKS,
  SECTION,
  SKILL_OPTIONS,
  StudentCell,
  TypeBadge,
  average,
  clearedPapers,
  primaryCohort,
  typeLabel,
} from "./shared";
import { TODAY, updateCareers, useCareers, type CareerResume, type ResumeSectionId } from "./store";

type Row = {
  id: string;
  student: Student;
  profile?: CareerProfile;
  resume?: CareerResume;
  crs: number | null;
};

const TABS = [
  { id: "profiles", label: "Build student career profiles" },
  { id: "resumes", label: "Review resumes" },
  { id: "ats", label: "View ATS resume scores" },
];

const ATS_BANDS = [
  { id: "lt50", label: "Below 50", test: (v: number) => v < 50 },
  { id: "50", label: "50 to 59", test: (v: number) => v >= 50 && v < 60 },
  { id: "60", label: "60 to 69", test: (v: number) => v >= 60 && v < 70 },
  { id: "70", label: "70 to 79", test: (v: number) => v >= 70 && v < 80 },
  { id: "80", label: "80 and above", test: (v: number) => v >= 80 },
];

export function CareerProfilesPage() {
  const scope = useCareerScope();
  const store = useCareers();
  const [tab, setTab] = useState("profiles");
  const [builder, setBuilder] = useState<{ open: boolean; studentId: string }>({ open: false, studentId: "" });
  const [reviewId, setReviewId] = useState<string | null>(null);

  const rows: Row[] = useMemo(
    () =>
      scope.students.map((s) => ({
        id: s.id,
        student: s,
        profile: store.profiles.find((p) => p.studentId === s.id),
        resume: store.resumes.find((r) => r.studentId === s.id),
        crs: store.readiness.find((c) => c.studentId === s.id)?.score ?? s.career.companyReadiness,
      })),
    [scope.students, store.profiles, store.resumes, store.readiness],
  );

  const withResume = rows.filter((r) => r.resume);
  const inReview = withResume.filter((r) => r.resume!.status === "in-review").length;
  const complete = rows.filter((r) => (r.profile?.completeness ?? 0) >= 80).length;

  const openBuilder = (studentId: string) => setBuilder({ open: true, studentId });
  const openReview = (studentId: string) => {
    setReviewId(studentId);
    setTab("resumes");
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow={SECTION}
        title="Career profiles"
        sub="Build student career profiles, review resumes line by line and track ATS resume scores for the learners you support."
        badge={<CareerBadges scope={scope} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Report queued: career-profiles.csv", tone: "info" })}>
              <Download className="size-4" />
              Export
            </Button>
            <Guard allowed={scope.canEdit}>
              <Button disabled={!scope.canEdit} onClick={() => openBuilder("")}>
                <UserRoundPen className="size-4" />
                Build career profile
              </Button>
            </Guard>
          </>
        }
      />

      <ReadOnlyNotice scope={scope} what="Career profiles and resume reviews" />

      <KpiRow cols={4}>
        <KpiTile hero label={scope.placement ? "Placement-eligible learners" : "Allocated students"} value={rows.length} sub={`${rows.filter((r) => r.student.type === "graduate").length} graduate · ${rows.filter((r) => r.student.type === "undergraduate").length} undergraduate`} />
        <KpiTile label="Average ATS score" value={average(withResume.map((r) => r.resume!.atsScore))} tone="info" icon={<FileSearch />} sub="Across current resume versions" />
        <KpiTile label="Resumes awaiting review" value={inReview} tone="amber" icon={<MessageSquarePlus />} sub="Submitted by learners" />
        <KpiTile label="Profiles 80% complete or more" value={`${complete} of ${rows.length}`} tone="jade" icon={<CheckCircle2 />} sub="Target roles, locations, skills and papers" />
      </KpiRow>

      <Tabs items={TABS.map((t) => ({ ...t, count: t.id === "resumes" ? inReview : undefined }))} value={tab} onChange={setTab} />

      {tab === "profiles" ? <ProfilesTab rows={rows} canEdit={scope.canEdit} onOpen={openBuilder} onReview={openReview} /> : null}
      {tab === "resumes" ? (
        <ResumesTab rows={withResume} selectedId={reviewId} onSelect={setReviewId} canEdit={scope.canEdit} />
      ) : null}
      {tab === "ats" ? <AtsTab rows={withResume} onOpen={openReview} /> : null}

      <ProfileBuilder
        open={builder.open}
        studentId={builder.studentId}
        rows={rows}
        canEdit={scope.canEdit}
        staffId={scope.staffId}
        onClose={() => setBuilder((b) => ({ ...b, open: false }))}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ profiles */

function ProfilesTab({
  rows,
  canEdit,
  onOpen,
  onReview,
}: {
  rows: Row[];
  canEdit: boolean;
  onOpen: (id: string) => void;
  onReview: (id: string) => void;
}) {
  const [resumeStatus, setResumeStatus] = useState("");
  const [role, setRole] = useState("");
  const [completeness, setCompleteness] = useState("");

  const roles = useMemo(() => Array.from(new Set(rows.map((r) => r.profile?.targetRoles[0] ?? r.student.career.targetRole))).sort(), [rows]);
  const visible = rows.filter(
    (r) =>
      (!resumeStatus || r.resume?.status === resumeStatus) &&
      (!role || (r.profile?.targetRoles[0] ?? r.student.career.targetRole) === role) &&
      (!completeness || (completeness === "high" ? (r.profile?.completeness ?? 0) >= 80 : (r.profile?.completeness ?? 0) < 80)),
  );

  const columns: DataTableColumn<Row>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => <StudentCell student={r.student} sub={`${typeLabel(r.student.type)} · ${primaryCohort(r.student)}`} />,
    },
    {
      key: "role",
      header: "Target role",
      sortable: true,
      sortValue: (r) => r.profile?.targetRoles[0] ?? r.student.career.targetRole,
      render: (r) => (
        <span className="text-ink-2">
          {r.profile?.targetRoles[0] ?? r.student.career.targetRole}
          {r.profile && r.profile.targetRoles.length > 1 ? <span className="text-ink-3"> +{r.profile.targetRoles.length - 1}</span> : null}
        </span>
      ),
    },
    {
      key: "papers",
      header: "Papers passed",
      sortable: true,
      sortValue: (r) => papersCleared(r.student),
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-mono font-semibold text-ink tnum">{papersCleared(r.student)}/13</span>
          <span className="max-w-[9rem] truncate text-[12px] text-ink-3">{clearedPapers(r.student).map((p) => p.code).join(", ")}</span>
        </span>
      ),
    },
    {
      key: "ats",
      header: "ATS score",
      sortable: true,
      sortValue: (r) => r.resume?.atsScore ?? -1,
      render: (r) => (r.resume ? <ScoreBar value={r.resume.atsScore} className="w-24" height={6} /> : <span className="text-ink-3">No resume</span>),
    },
    {
      key: "crs",
      header: "Company Readiness Score",
      sortable: true,
      sortValue: (r) => r.crs ?? -1,
      render: (r) => (r.crs != null ? <ScoreBar value={r.crs} className="w-24" height={6} /> : <span className="text-ink-3">Not scored</span>),
    },
    {
      key: "completeness",
      header: "Profile completeness",
      sortable: true,
      sortValue: (r) => r.profile?.completeness ?? 0,
      render: (r) => (
        <span className="flex items-center gap-2">
          <Progress value={r.profile?.completeness ?? 0} className="w-20" tone={(r.profile?.completeness ?? 0) >= 80 ? "jade" : "cta"} />
          <span className="font-mono text-[12.5px] text-ink-2 tnum">{Math.round(r.profile?.completeness ?? 0)}%</span>
        </span>
      ),
    },
    {
      key: "resume",
      header: "Resume",
      sortable: true,
      sortValue: (r) => r.resume?.status ?? "",
      render: (r) => (r.resume ? <StatusPill status={r.resume.status} size="sm" /> : <StatusPill status="Not started" size="sm" />),
    },
    {
      key: "updated",
      header: "Updated",
      sortable: true,
      sortValue: (r) => r.profile?.updated ?? "",
      render: (r) => <span className="text-ink-3">{r.profile ? formatAccaDate(r.profile.updated) : "Never"}</span>,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => (
        <span className="flex justify-end gap-1.5">
          {r.resume ? (
            <Button size="xs" variant="ghost" onClick={() => onReview(r.id)}>
              Review resume
            </Button>
          ) : null}
          <Button size="xs" variant="outline" onClick={() => onOpen(r.id)}>
            {canEdit ? "Build profile" : "View profile"}
          </Button>
        </span>
      ),
    },
  ];

  return (
    <DataTable
      caption="Student career profiles"
      rows={visible}
      columns={columns}
      getRowId={(r) => r.id}
      onRowClick={(r) => onOpen(r.id)}
      rowLabel={(r) => `Open the career profile of ${r.student.name}`}
      initialSort={{ key: "completeness", dir: "asc" }}
      search={{
        placeholder: "Search learner, role or skill",
        match: (r, q) =>
          r.student.name.toLowerCase().includes(q) ||
          (r.profile?.targetRoles.join(" ").toLowerCase().includes(q) ?? false) ||
          (r.profile?.skills.join(" ").toLowerCase().includes(q) ?? false),
      }}
      filters={
        <FilterBar
          active={Boolean(resumeStatus || role || completeness)}
          onClear={() => {
            setResumeStatus("");
            setRole("");
            setCompleteness("");
          }}
        >
          <FilterSelect
            label="Resume"
            allLabel="Any status"
            value={resumeStatus}
            onChange={setResumeStatus}
            options={[
              { value: "in-review", label: "In review" },
              { value: "changes-requested", label: "Changes requested" },
              { value: "approved", label: "Approved" },
              { value: "draft", label: "Draft" },
            ]}
          />
          <FilterSelect label="Target role" allLabel="All roles" value={role} onChange={setRole} options={roles} />
          <FilterSelect
            label="Completeness"
            allLabel="Any"
            value={completeness}
            onChange={setCompleteness}
            options={[
              { value: "low", label: "Below 80%" },
              { value: "high", label: "80% and above" },
            ]}
          />
        </FilterBar>
      }
    />
  );
}

/* ------------------------------------------------------------------ profile builder */

function computeCompleteness(form: FormData, cleared: number, resumeStatus?: string) {
  const skills = form.getAll("skills").length + String(form.get("extraSkills") ?? "").split(",").filter((s) => s.trim()).length;
  let score = 0;
  if (String(form.get("headline") ?? "").trim().length > 10) score += 15;
  if (form.getAll("roles").length) score += 15;
  if (form.getAll("cities").length) score += 10;
  score += Math.min(15, skills * 5);
  if (String(form.get("expRole") ?? "").trim()) score += 15;
  if (cleared > 0) score += 15;
  score += resumeStatus === "approved" ? 15 : resumeStatus === "in-review" || resumeStatus === "changes-requested" ? 10 : 5;
  return score;
}

function ProfileBuilder({
  open,
  studentId,
  rows,
  canEdit,
  staffId,
  onClose,
}: {
  open: boolean;
  studentId: string;
  rows: Row[];
  canEdit: boolean;
  staffId: string;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState("");
  const [live, setLive] = useState<{ key: string; value: number } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const activeId = studentId || picked || rows[0]?.id || "";
  const row = rows.find((r) => r.id === activeId);

  if (!row) return null;
  const s = row.student;
  const p = row.profile;
  const cleared = clearedPapers(s);
  const current = s.currentPaper;
  const currentBooking = current ? s.examBookings.find((b) => b.paper === current && (b.status === "booked" || b.status === "planned")) : undefined;
  const before = Math.round(p?.completeness ?? 0);
  const liveValue = live && live.key === activeId ? live.value : null;

  const recompute = () => {
    const form = bodyRef.current?.closest("form");
    if (form) setLive({ key: activeId, value: computeCompleteness(new FormData(form), cleared.length, row.resume?.status) });
  };

  const roleOptions = Array.from(new Set([...(p?.targetRoles ?? [s.career.targetRole]), ...ROLE_TRACKS]));
  const cityOptions = Array.from(new Set([...(p?.preferredCities ?? [s.city]), ...CITIES]));
  const skillOptions = Array.from(new Set([...(p?.skills ?? []), ...SKILL_OPTIONS]));

  return (
    <FormDrawer
      open={open}
      onClose={() => {
        onClose();
        setPicked("");
        setLive(null);
      }}
      title={canEdit ? "Build career profile" : "Career profile"}
      sub={`${s.name} · ${typeLabel(s.type)} · ACCA ID ${s.accaId ?? "not registered"}`}
      submitLabel="Save career profile"
      disabled={!canEdit}
      disabledReason={READ_ONLY_REASON}
      footerNote={canEdit ? "Shared with the learner's Career centre" : "View-only access"}
      onSubmit={(data) => {
        const extra = String(data.get("extraSkills") ?? "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
        const completeness = computeCompleteness(data, cleared.length, row.resume?.status);
        const expRole = String(data.get("expRole") ?? "").trim();
        const next: CareerProfile = {
          studentId: s.id,
          headline: String(data.get("headline") ?? "").trim(),
          targetRoles: data.getAll("roles").map(String),
          preferredCities: data.getAll("cities").map(String),
          skills: Array.from(new Set([...data.getAll("skills").map(String), ...extra])),
          experience: expRole
            ? [{ role: expRole, organisation: String(data.get("expOrg") ?? "").trim(), period: String(data.get("expPeriod") ?? "").trim() }]
            : [],
          completeness,
          updated: TODAY,
          ownerId: staffId,
        };
        updateCareers((st) => ({
          profiles: st.profiles.some((x) => x.studentId === s.id)
            ? st.profiles.map((x) => (x.studentId === s.id ? next : x))
            : [...st.profiles, next],
        }));
        toast({ title: "Career profile saved", body: `${s.name} · ${completeness}% complete · visible in the learner's Career centre` });
        onClose();
        setPicked("");
        setLive(null);
      }}
    >
      <div ref={bodyRef} key={activeId} onChange={recompute} className="space-y-4">
        {!studentId ? (
          <Field label="Student">
            <Select
              value={activeId}
              onChange={(e) => {
                setPicked(e.target.value);
                setLive(null);
              }}
            >
              {rows.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.student.name} · {r.profile?.targetRoles[0] ?? r.student.career.targetRole}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <div className="rounded-[16px] border border-line bg-surface-2 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Papers auto-filled from the ACCA journey</p>
            <TypeBadge type={s.type} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {cleared.length ? (
              cleared.map((c) => (
                <StatusPill key={c.code} status={c.status} size="sm">
                  {c.code} · {c.status === "passed" ? `Passed${c.score != null ? ` ${c.score}%` : ""}` : "Exempt"}
                </StatusPill>
              ))
            ) : (
              <span className="text-[12.5px] text-ink-3">No papers passed or exempt yet</span>
            )}
            {current ? (
              <StatusPill status="current" tone="info" size="sm">
                {current} · Current{currentBooking ? `, ${currentBooking.label}` : ""}
              </StatusPill>
            ) : null}
          </div>
          <p className="mt-2.5 text-[12px] text-ink-3">
            EPSM {s.epsm.status === "complete" ? "complete" : `${s.epsm.progress}% done`} · PER {s.per.months} of 36 months
            {current ? ` · ${paperName(current)} readiness score ${s.readiness.byPaper[current] ?? s.readiness.overall}` : ""}. Updates when results are recorded.
          </p>
        </div>

        <div className="rounded-[16px] border border-line p-4">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-[13px] font-semibold text-ink">Profile completeness</p>
            <p className="font-mono text-[13px] font-semibold text-ink tnum">
              {liveValue != null && liveValue !== before ? (
                <>
                  <span className="text-ink-3">{before}% to </span>
                  {liveValue}%
                </>
              ) : (
                `${before}%`
              )}
            </p>
          </div>
          <Progress value={liveValue ?? before} className="mt-2" tone={(liveValue ?? before) >= 80 ? "jade" : "cta"} />
        </div>

        <Field label="Headline" hint="One line recruiters see first">
          <Input name="headline" defaultValue={p?.headline ?? `${typeLabel(s.type)} ACCA learner · ${papersCleared(s)} of 13 exams cleared`} disabled={!canEdit} />
        </Field>

        <fieldset disabled={!canEdit}>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Target roles</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roleOptions.map((r) => (
              <Checkbox key={r} name="roles" value={r} defaultChecked={(p?.targetRoles ?? [s.career.targetRole]).includes(r)} label={r} />
            ))}
          </div>
        </fieldset>

        <fieldset disabled={!canEdit}>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Preferred locations</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cityOptions.map((c) => (
              <Checkbox key={c} name="cities" value={c} defaultChecked={(p?.preferredCities ?? [s.city]).includes(c)} label={c} />
            ))}
          </div>
        </fieldset>

        <fieldset disabled={!canEdit}>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Skills</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {skillOptions.map((k) => (
              <Checkbox key={k} name="skills" value={k} defaultChecked={(p?.skills ?? []).includes(k)} label={k} />
            ))}
          </div>
        </fieldset>
        <Field label="Other skills" hint="Comma separated">
          <Input name="extraSkills" placeholder="e.g. Oracle NetSuite, Alteryx" disabled={!canEdit} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Experience: role" className="sm:col-span-1">
            <Input name="expRole" defaultValue={p?.experience[0]?.role ?? ""} placeholder="e.g. Accounts executive" disabled={!canEdit} />
          </Field>
          <Field label="Organisation">
            <Input name="expOrg" defaultValue={p?.experience[0]?.organisation ?? ""} disabled={!canEdit} />
          </Field>
          <Field label="Period">
            <Input name="expPeriod" defaultValue={p?.experience[0]?.period ?? ""} placeholder="2024 to present" disabled={!canEdit} />
          </Field>
        </div>
      </div>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ resume review */

const SECTIONS: { id: ResumeSectionId; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "acca", label: "ACCA progress" },
  { id: "experience", label: "Experience" },
  { id: "education", label: "Education" },
  { id: "skills", label: "Skills" },
];

function resumeLines(row: Row, section: ResumeSectionId): string[] {
  const s = row.student;
  const p = row.profile;
  switch (section) {
    case "summary":
      return [
        p?.headline ?? `${typeLabel(s.type)} ACCA learner`,
        `Targeting ${(p?.targetRoles ?? [s.career.targetRole]).join(" or ")} roles in ${(p?.preferredCities ?? [s.city]).join(", ")}.`,
      ];
    case "acca": {
      const cleared = clearedPapers(s);
      return [
        `ACCA student ID ${s.accaId ?? "pending"} · ${cleared.length} of 13 exams cleared`,
        cleared.map((c) => (c.status === "passed" ? `${c.code} passed${c.score != null ? ` (${c.score}%)` : ""}` : `${c.code} exempt`)).join(" · ") || "Applied Knowledge in progress",
        s.currentPaper ? `Currently studying ${paperName(s.currentPaper)} (${s.currentPaper})` : "Awaiting next paper",
      ];
    }
    case "experience":
      return p?.experience.length
        ? p.experience.map((e) => `${e.role}${e.organisation ? `, ${e.organisation}` : ""} · ${e.period}`)
        : s.background.occupation
          ? [s.background.occupation]
          : ["No work experience listed yet"];
    case "education":
      return [`${s.background.qualification} · ${s.background.institution}`];
    case "skills":
      return [(p?.skills ?? []).join(" · ") || "No skills listed"];
  }
}

function ResumesTab({
  rows,
  selectedId,
  onSelect,
  canEdit,
}: {
  rows: Row[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  canEdit: boolean;
}) {
  const { persona } = useRole();
  const [filter, setFilter] = useState("in-review");
  const [draft, setDraft] = useState<{ section: ResumeSectionId; text: string } | null>(null);

  const listed = rows
    .filter((r) => filter === "all" || r.resume!.status === filter)
    .sort((a, b) => b.resume!.updated.localeCompare(a.resume!.updated));
  const selected = rows.find((r) => r.id === selectedId) ?? listed[0] ?? rows[0];

  if (!selected) {
    return <EmptyState title="No resumes to review" sub="Resumes appear here when learners submit them from the Resume builder." />;
  }

  const resume = selected.resume!;
  const open = resume.comments.filter((c) => !c.resolved).length;

  const setStatus = (status: CareerResume["status"]) => {
    updateCareers((st) => ({
      resumes: st.resumes.map((r) =>
        r.id === resume.id
          ? { ...r, status, updated: TODAY, reviewerId: r.reviewerId ?? "st-rahul", comments: status === "approved" ? r.comments.map((c) => ({ ...c, resolved: true })) : r.comments }
          : r,
      ),
    }));
  };

  const addComment = () => {
    if (!draft || !draft.text.trim()) return;
    updateCareers((st) => ({
      resumes: st.resumes.map((r) =>
        r.id === resume.id
          ? {
              ...r,
              comments: [
                ...r.comments,
                { id: `${r.id}-c${r.comments.length + 1}`, section: draft.section, author: persona.name, body: draft.text.trim(), at: TODAY, resolved: false },
              ],
            }
          : r,
      ),
    }));
    toast({ title: `Comment added to ${SECTIONS.find((x) => x.id === draft.section)?.label}`, body: `${selected.student.name} · resume ${resume.version}` });
    setDraft(null);
  };

  const toggleResolved = (commentId: string) =>
    updateCareers((st) => ({
      resumes: st.resumes.map((r) =>
        r.id === resume.id ? { ...r, comments: r.comments.map((c) => (c.id === commentId ? { ...c, resolved: !c.resolved } : c)) } : r,
      ),
    }));

  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
      <Card className="min-w-0 self-start p-4">
        <Segmented
          size="sm"
          value={filter}
          onChange={setFilter}
          items={[
            { id: "in-review", label: "In review" },
            { id: "changes-requested", label: "Changes" },
            { id: "approved", label: "Approved" },
            { id: "all", label: "All" },
          ]}
        />
        <ul className="scrollbar-slim mt-3 max-h-[36rem] space-y-1.5 overflow-y-auto pr-1">
          {listed.length === 0 ? (
            <li className="rounded-[12px] border border-dashed border-line-strong px-3 py-6 text-center text-[12.5px] text-ink-3">No resumes with this status</li>
          ) : (
            listed.map((r) => {
              const active = r.id === selected.id;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(r.id);
                      setDraft(null);
                    }}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2.5 rounded-[12px] border px-3 py-2.5 text-left transition-colors",
                      active ? "border-cta bg-cta-soft" : "border-transparent hover:bg-surface-2",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-semibold text-ink">{r.student.name}</span>
                      <span className="block truncate text-[12px] text-ink-3">
                        {r.resume!.version} · {formatAccaDate(r.resume!.updated)}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[12.5px] font-semibold text-ink tnum">ATS {r.resume!.atsScore}</span>
                      <StatusPill status={r.resume!.status} size="sm" dot={false} />
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </Card>

      <Card className="min-w-0">
        <CardHeader
          title={
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[19px] tracking-[var(--display-tracking)]">{selected.student.name}</span>
              <StatusPill status={resume.status} />
            </span>
          }
          sub={`Resume ${resume.version} · updated ${formatAccaDate(resume.updated)} · ${selected.profile?.targetRoles[0] ?? selected.student.career.targetRole} · ${open} open ${open === 1 ? "comment" : "comments"}`}
        />
        <div className="flex flex-wrap gap-2 px-5 pb-4">
          <Guard allowed={canEdit}>
            <Button
              size="sm"
              variant="outline"
              disabled={!canEdit || resume.status === "changes-requested"}
              onClick={() => {
                setStatus("changes-requested");
                toast({ title: "Changes requested", body: `${selected.student.name} · ${open} open ${open === 1 ? "comment" : "comments"} sent to the learner`, tone: "warning" });
              }}
            >
              <RotateCcw className="size-3.5" />
              Request changes
            </Button>
          </Guard>
          <Guard allowed={canEdit}>
            <Button
              size="sm"
              disabled={!canEdit || resume.status === "approved"}
              onClick={() => {
                setStatus("approved");
                toast({ title: "Resume approved", body: `${selected.student.name} · ${resume.version} can now be used for applications` });
              }}
            >
              <CheckCircle2 className="size-3.5" />
              Approve resume
            </Button>
          </Guard>
        </div>

        <div className="grid gap-5 border-t border-line p-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
          <article aria-label={`Resume of ${selected.student.name}`} className="min-w-0 rounded-[16px] border border-line bg-surface-2 p-3 sm:p-5">
            <div className="rounded-[12px] border border-line bg-surface px-4 py-5 sm:px-6">
              <header className="border-b border-line pb-3">
                <p className="font-display text-[22px] leading-tight tracking-[var(--display-tracking)] text-ink">{selected.student.name}</p>
                <p className="mt-1 truncate text-[12.5px] text-ink-3">
                  {selected.student.city} · {selected.student.email} · {selected.student.phone}
                </p>
              </header>
              <div className="divide-y divide-line">
                {SECTIONS.map((sec) => {
                  const comments = resume.comments.filter((c) => c.section === sec.id);
                  const composing = draft?.section === sec.id;
                  return (
                    <section key={sec.id} className="py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">{sec.label}</h3>
                        {canEdit && !composing ? (
                          <Button size="xs" variant="ghost" onClick={() => setDraft({ section: sec.id, text: "" })}>
                            <MessageSquarePlus className="size-3.5" />
                            Comment
                          </Button>
                        ) : null}
                      </div>
                      <ul className="mt-1.5 space-y-1">
                        {resumeLines(selected, sec.id).map((line, i) => (
                          <li key={i} className="text-[13.5px] leading-relaxed text-ink-2">
                            {line}
                          </li>
                        ))}
                      </ul>
                      {comments.length ? (
                        <ul className="mt-2.5 space-y-2">
                          {comments.map((c) => (
                            <li
                              key={c.id}
                              className={cn(
                                "rounded-r-[10px] border-l-[3px] px-3 py-2",
                                c.resolved ? "border-line-strong bg-surface-2" : "border-cta bg-cta-soft",
                              )}
                            >
                              <p className={cn("text-[13px] leading-snug", c.resolved ? "text-ink-3 line-through" : "text-ink")}>{c.body}</p>
                              <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                                <span className="text-[11.5px] text-ink-3">
                                  {c.author} · {formatAccaDate(c.at)}
                                </span>
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => toggleResolved(c.id)}
                                    className="text-[12px] font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4 hover:text-ink"
                                  >
                                    {c.resolved ? "Reopen" : "Resolve"}
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {composing ? (
                        <div className="mt-2.5 space-y-2">
                          <Textarea
                            rows={2}
                            autoFocus
                            aria-label={`Comment on ${sec.label}`}
                            value={draft.text}
                            onChange={(e) => setDraft({ section: sec.id, text: e.target.value })}
                            placeholder="e.g. Quantify the month-end close: days saved, entries automated."
                          />
                          <div className="flex justify-end gap-2">
                            <Button size="xs" variant="ghost" onClick={() => setDraft(null)}>
                              Cancel
                            </Button>
                            <Button size="xs" disabled={!draft.text.trim()} onClick={addComment}>
                              Post comment
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </section>
                  );
                })}
              </div>
            </div>
          </article>

          <aside className="min-w-0 space-y-5">
            <div className="flex items-center gap-4">
              <ScoreRing value={resume.atsScore} size={96} stroke={8} showBand label="ATS score" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">ATS score</p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">Parsed against {selected.profile?.targetRoles[0] ?? selected.student.career.targetRole} job descriptions</p>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">ATS score breakdown</p>
              {resume.breakdown.map((b) => (
                <ScoreBar key={b.label} label={b.label} value={b.score} height={6} />
              ))}
            </div>
            <div>
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Missing keywords</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {resume.missingKeywords.length ? (
                  resume.missingKeywords.map((k) => (
                    <Badge key={k} tone="amber">
                      {k}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[12.5px] text-ink-3">None for the target role</span>
                )}
              </div>
            </div>
            <div className="rounded-[14px] border border-line bg-surface-2 p-3.5">
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                <Sparkles aria-hidden className="size-3.5 text-violet" />
                Reviewer checklist
              </p>
              <ul className="mt-2 space-y-1 text-[12.5px] leading-snug text-ink-2">
                <li>ACCA progress above education</li>
                <li>One quantified result per role</li>
                <li>Keywords from the target job description</li>
              </ul>
            </div>
          </aside>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ ATS scores */

function AtsTab({ rows, onOpen }: { rows: Row[]; onOpen: (id: string) => void }) {
  const [band, setBand] = useState("");
  const counts = ATS_BANDS.map((b) => rows.filter((r) => b.test(r.resume!.atsScore)).length);
  const labels = rows[0]?.resume?.breakdown.map((b) => b.label) ?? [];
  const avgBreakdown = labels.map((label) => ({
    label,
    value: average(rows.map((r) => r.resume!.breakdown.find((b) => b.label === label)?.score ?? 0)),
  }));
  const test = ATS_BANDS.find((b) => b.id === band)?.test;
  const visible = test ? rows.filter((r) => test(r.resume!.atsScore)) : rows;
  const part = (r: Row, label: string) => r.resume!.breakdown.find((b) => b.label === label)?.score ?? 0;

  const columns: DataTableColumn<Row>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: (r) => r.student.name, render: (r) => <StudentCell student={r.student} sub={r.profile?.targetRoles[0] ?? r.student.career.targetRole} /> },
    { key: "version", header: "Version", mono: true, render: (r) => r.resume!.version },
    { key: "ats", header: "ATS score", sortable: true, sortValue: (r) => r.resume!.atsScore, render: (r) => <ScoreBar value={r.resume!.atsScore} className="w-24" height={6} /> },
    { key: "format", header: "Format", align: "right", mono: true, sortable: true, sortValue: (r) => part(r, "Format and parsing"), render: (r) => part(r, "Format and parsing") },
    { key: "keywords", header: "Keywords", align: "right", mono: true, sortable: true, sortValue: (r) => part(r, "Keywords for target role"), render: (r) => part(r, "Keywords for target role") },
    { key: "impact", header: "Impact", align: "right", mono: true, sortable: true, sortValue: (r) => part(r, "Quantified impact"), render: (r) => part(r, "Quantified impact") },
    { key: "acca", header: "ACCA progress", align: "right", mono: true, sortable: true, sortValue: (r) => part(r, "ACCA progress shown"), render: (r) => part(r, "ACCA progress shown") },
    {
      key: "missing",
      header: "Missing keywords",
      render: (r) => (
        <span className="flex max-w-[16rem] flex-wrap gap-1">
          {r.resume!.missingKeywords.map((k) => (
            <Badge key={k} tone="amber">
              {k}
            </Badge>
          ))}
        </span>
      ),
    },
    { key: "status", header: "Resume", render: (r) => <StatusPill status={r.resume!.status} size="sm" /> },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="ATS score distribution" sub={`${rows.length} current resumes · click a band to filter the table`} />
          <div className="px-5 pb-5">
            <BarChart data={counts} labels={ATS_BANDS.map((b) => b.label)} tone="cta" highlight={counts.indexOf(Math.max(...counts))} height={150} />
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ATS_BANDS.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={band === b.id}
                  onClick={() => setBand((cur) => (cur === b.id ? "" : b.id))}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[12px] font-semibold transition-colors",
                    band === b.id ? "border-nav-active bg-nav-active text-nav-active-ink" : "border-line text-ink-2 hover:bg-cta-soft",
                  )}
                >
                  {b.label} · {counts[i]}
                </button>
              ))}
            </div>
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Average ATS score breakdown" sub="Where resumes lose points across your learners" />
          <div className="space-y-3.5 px-5 pb-5">
            {avgBreakdown.map((b) => (
              <ScoreBar key={b.label} label={b.label} value={b.value} />
            ))}
          </div>
        </Card>
      </div>

      <DataTable
        caption="ATS resume scores"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ key: "ats", dir: "asc" }}
        onRowClick={(r) => onOpen(r.id)}
        rowLabel={(r) => `Review the resume of ${r.student.name}`}
        search={{ placeholder: "Search learner or keyword", match: (r, q) => r.student.name.toLowerCase().includes(q) || r.resume!.missingKeywords.join(" ").toLowerCase().includes(q) }}
        filters={
          <FilterSelect
            label="ATS band"
            allLabel="All bands"
            value={band}
            onChange={setBand}
            options={ATS_BANDS.map((b) => ({ value: b.id, label: b.label }))}
          />
        }
      />
    </div>
  );
}
