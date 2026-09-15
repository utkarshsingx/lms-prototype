"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Download, ShieldAlert, ShieldCheck, UsersRound } from "lucide-react";
import {
  ACCA_TODAY,
  escalations,
  formatAccaDate,
  paperName,
  programmeById,
  semesters as allSemesters,
  staffByPersona,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Avatar } from "@/components/ui/avatar";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import {
  datesOfBirth,
  intakeShort,
  rosterRows,
  sectionsForUniversity,
  VERIFICATION_LABEL,
  type RosterRow,
} from "./data";
import { Student360Drawer } from "./student-360";
import { GatedButton, MiniLabel, plural, queueReport, RecordsNote, UniversityHeader, useUniversityWorkspace } from "./shared";

type SemesterTarget = { ids: string[]; label: string } | { sectionId: string } | null;

const SEMESTER_REASONS = [
  "Semester progression after university results",
  "Correction to the university record",
  "Readmission or year repeat",
];

export function UniversityStudentsPage() {
  const { uni, canEdit, reason, persona } = useUniversityWorkspace();
  const me = staffByPersona(persona.id)?.id ?? persona.staffId ?? "";
  const sections = useMemo(() => sectionsForUniversity(uni.id), [uni.id]);
  const programme = programmeById(uni.programmeId);

  const [rows, setRows] = useState<RosterRow[]>(() => rosterRows(uni.id));
  const [intake, setIntake] = useState("");
  const [semester, setSemester] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");

  const [openId, setOpenId] = useState<string | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(null);
  const [semTarget, setSemTarget] = useState<SemesterTarget>(null);
  const [bulkVerifyOpen, setBulkVerifyOpen] = useState(false);
  const [activity, setActivity] = useState<TimelineItem[]>(() => [
    {
      id: "act-3",
      title: "Tara Kamath flagged as a mismatch",
      meta: "10 Sep 2026 · Dr Suresh Nair",
      body: "Date of birth differs between the ACCA registration and the university record. Raised with the Programme Admin (TK-2075).",
      tone: "rose",
    },
    {
      id: "act-2",
      title: "2025 intake moved to Semester 3",
      meta: "15 Jul 2026 · Dr Suresh Nair · Sections A and B",
      body: "Semester progression after Semester 2 results.",
      tone: "info",
    },
    {
      id: "act-1",
      title: "2026 intake started Semester 1",
      meta: "15 Jul 2026 · Dr Suresh Nair · Sections A and B",
      tone: "neutral",
    },
  ]);

  const openRow = rows.find((r) => r.id === openId) ?? null;
  const verifyRow = rows.find((r) => r.id === verifyId) ?? null;

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (!intake || r.student.intakeId === intake) &&
          (!semester || String(r.semester) === semester) &&
          (!section || r.student.sectionId === section) &&
          (!status || r.verification === status),
      ),
    [rows, intake, semester, section, status],
  );

  const counts = {
    verified: rows.filter((r) => r.verification === "verified").length,
    pending: rows.filter((r) => r.verification === "pending").length,
    mismatch: rows.filter((r) => r.verification === "mismatch").length,
  };

  function logActivity(item: Omit<TimelineItem, "id">) {
    setActivity((list) => [{ id: `act-${list.length + 1}-${item.title}`, ...item }, ...list]);
  }

  function verify(ids: string[], note?: string) {
    const eligible = rows.filter((r) => ids.includes(r.id) && r.verification !== "verified");
    if (!eligible.length) {
      toast({ title: "Nothing to verify", body: "The selected records are already verified.", tone: "neutral" });
      return;
    }
    setRows((list) =>
      list.map((r) =>
        eligible.some((e) => e.id === r.id)
          ? { ...r, verification: "verified", verifiedBy: me, verifiedOn: ACCA_TODAY, note: undefined }
          : r,
      ),
    );
    const names = eligible.map((r) => r.student.name);
    logActivity({
      title: eligible.length === 1 ? `${names[0]} verified` : `${eligible.length} student records verified`,
      meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`,
      body: note || (eligible.length > 1 ? names.join(", ") : "Checked against the university enrolment register."),
      tone: "jade",
    });
    toast({
      title: eligible.length === 1 ? "Record verified" : `${eligible.length} records verified`,
      body: eligible.length === 1 ? `${names[0]} · ${eligible[0].roll}` : names.join(", "),
    });
  }

  const columns: DataTableColumn<RosterRow>[] = [
    { key: "roll", header: "Roll no", mono: true, sortable: true },
    {
      key: "name",
      header: "Student",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={r.student.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{r.student.name}</span>
            <span className="block text-[12px] text-ink-3">{r.student.email}</span>
          </span>
        </span>
      ),
    },
    { key: "intake", header: "Intake", sortable: true, sortValue: (r) => r.student.intakeId, render: (r) => intakeShort(r.student.intakeId) },
    { key: "semester", header: "Semester", sortable: true, align: "center", mono: true },
    { key: "section", header: "Section", sortable: true, align: "center", sortValue: (r) => r.student.section, render: (r) => r.student.section },
    {
      key: "accaId",
      header: "ACCA ID",
      mono: true,
      sortable: true,
      sortValue: (r) => r.student.accaId,
      render: (r) => r.student.accaId ?? <StatusPill status="not-registered" size="sm" />,
    },
    {
      key: "paper",
      header: "Current paper",
      sortable: true,
      sortValue: (r) => r.student.currentPaper,
      render: (r) =>
        r.student.currentPaper ? (
          <span className="text-ink-2">
            <span className="font-mono font-semibold text-ink">{r.student.currentPaper}</span> {paperName(r.student.currentPaper)}
          </span>
        ) : (
          "None"
        ),
    },
    {
      key: "verification",
      header: "Record status",
      sortable: true,
      render: (r) => <StatusPill status={r.verification}>{VERIFICATION_LABEL[r.verification]}</StatusPill>,
    },
    {
      key: "action",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        r.verification === "verified" ? (
          <span className="text-[12px] text-ink-3">{r.verifiedOn ? formatAccaDate(r.verifiedOn) : "Verified"}</span>
        ) : (
          <GatedButton
            allowed={canEdit}
            reason={reason}
            size="xs"
            variant={r.verification === "mismatch" ? "outline" : "secondary"}
            onClick={() => setVerifyId(r.id)}
          >
            {r.verification === "mismatch" ? <ShieldAlert className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
            {r.verification === "mismatch" ? "Resolve" : "Verify"}
          </GatedButton>
        ),
    },
  ];

  const filtersActive = Boolean(intake || semester || section || status);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <UniversityHeader
        section="Students"
        title="Students"
        sub={`View university-linked students on ${programme?.name ?? uni.programmeName}, verify student records against your enrolment register and update the current semester.`}
        actions={
          <>
            <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-students.csv`, `${visible.length} learner records`)}>
              <Download className="size-4" />
              Export
            </Button>
            <GatedButton allowed={canEdit} reason={reason} variant="secondary" onClick={() => setBulkVerifyOpen(true)}>
              <ShieldCheck className="size-4" />
              Verify student records
            </GatedButton>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => setSemTarget({ sectionId: sections[0]?.id ?? "" })}>
              <CalendarClock className="size-4" />
              Update current student semester
            </GatedButton>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="University-linked students" value={uni.headline.students} sub={`${plural(uni.headline.intakes, "intake")} · ${uni.headline.sections} sections`} icon={<UsersRound />} />
        <KpiTile label="Verified records" value={counts.verified} tone="jade" icon={<ShieldCheck />} sub={`of ${rows.length} listed`} />
        <KpiTile label="Pending verification" value={counts.pending} tone="amber" icon={<ShieldCheck />} sub="Awaiting your check" goodWhen="down" />
        <KpiTile label="Mismatch" value={counts.mismatch} tone="rose" icon={<ShieldAlert />} sub="Differs from the register" goodWhen="down" />
      </KpiRow>

      <section aria-labelledby="ua-linked-students" className="space-y-2.5">
        <div className="min-w-0">
          <h2 id="ua-linked-students" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            University-linked students
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">
            Click a student for the full 360 view. Select rows to verify records or update the semester in bulk.
          </p>
        </div>
        <DataTable
          caption="University-linked students"
          rows={visible}
          columns={columns}
          getRowId={(r) => r.id}
          search={{
            placeholder: "Search name, roll no or ACCA ID",
            match: (r, q) =>
              r.student.name.toLowerCase().includes(q) || r.roll.toLowerCase().includes(q) || (r.student.accaId ?? "").includes(q),
          }}
          filters={
            <FilterBar
              active={filtersActive}
              onClear={() => {
                setIntake("");
                setSemester("");
                setSection("");
                setStatus("");
              }}
            >
              <FilterSelect
                label="Intake"
                allLabel="All"
                value={intake}
                onChange={setIntake}
                options={[...new Set(rows.map((r) => r.student.intakeId))].map((id) => ({ value: id, label: intakeShort(id) }))}
              />
              <FilterSelect
                label="Semester"
                allLabel="All"
                value={semester}
                onChange={setSemester}
                options={[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `Semester ${n}` }))}
              />
              <FilterSelect
                label="Section"
                allLabel="All"
                value={section}
                onChange={setSection}
                options={sections.map((s) => ({ value: s.id, label: s.short }))}
              />
              <FilterSelect
                label="Record status"
                allLabel="All"
                value={status}
                onChange={setStatus}
                options={(["verified", "pending", "mismatch"] as const).map((v) => ({ value: v, label: VERIFICATION_LABEL[v] }))}
              />
            </FilterBar>
          }
          selectable={canEdit}
          bulkActions={(ids, clear) => (
            <>
              <Button
                size="sm"
                onClick={() => {
                  const mismatched = rows.filter((r) => ids.includes(r.id) && r.verification === "mismatch");
                  verify(ids.filter((id) => !mismatched.some((m) => m.id === id)));
                  if (mismatched.length) {
                    toast({
                      title: `${plural(mismatched.length, "mismatch", "mismatches")} left for review`,
                      body: "Resolve each mismatch from its row before verifying.",
                      tone: "warning",
                    });
                  }
                  clear();
                }}
              >
                <ShieldCheck className="size-4" />
                Verify selected
              </Button>
              <Button
                size="sm"
                variant="inverse"
                onClick={() => {
                  setSemTarget({ ids, label: plural(ids.length, "selected student") });
                  clear();
                }}
              >
                <CalendarClock className="size-4" />
                Update semester
              </Button>
            </>
          )}
          onRowClick={(r) => setOpenId(r.id)}
          rowLabel={(r) => `Open ${r.student.name}`}
          initialSort={{ key: "roll", dir: "asc" }}
          pageSize={20}
          rowClassName={(r) => (r.verification === "mismatch" ? "bg-rose-soft/40" : undefined)}
        />
        <RecordsNote total={uni.headline.students} listed={rows.length} />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
        <Card className="min-w-0">
          <CardHeader title="Record activity" sub="Verifications and semester updates in this workspace" />
          <div className="px-5 pb-5">
            <Timeline items={activity} dense />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="Semester dates" sub="From the academic calendar. A semester update takes effect on these dates." />
          <ul className="divide-y divide-line border-t border-line">
            {allSemesters
              .filter((s) => s.universityId === uni.id)
              .map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      {intakeShort(s.intakeId)} · {s.label}
                    </span>
                    <span className="block text-[12px] text-ink-3">
                      {formatAccaDate(s.start)} to {formatAccaDate(s.end)}
                    </span>
                  </span>
                  <StatusPill status={s.status} size="sm" />
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Student360Drawer
        row={openRow}
        onClose={() => setOpenId(null)}
        canEdit={canEdit}
        reason={reason}
        onVerify={(r) => setVerifyId(r.id)}
        onUpdateSemester={(r) => setSemTarget({ ids: [r.id], label: r.student.name })}
      />

      <VerifyDrawer
        row={verifyRow}
        canEdit={canEdit}
        reason={reason}
        onClose={() => setVerifyId(null)}
        onVerify={(r, note) => {
          verify([r.id], note);
          setVerifyId(null);
        }}
        onKeepMismatch={(r, note) => {
          logActivity({
            title: `${r.student.name} kept as a mismatch`,
            meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name}`,
            body: note || "Sent to the Programme Admin to correct the ACCA LMS record.",
            tone: "rose",
          });
          toast({ title: "Mismatch sent to the Programme Admin", body: `${r.student.name} · ${r.roll}`, tone: "warning" });
          setVerifyId(null);
        }}
      />

      <BulkVerifyDrawer
        open={bulkVerifyOpen}
        rows={rows}
        canEdit={canEdit}
        reason={reason}
        onClose={() => setBulkVerifyOpen(false)}
        onOpenMismatch={(r) => {
          setBulkVerifyOpen(false);
          setVerifyId(r.id);
        }}
        onVerify={(ids, note) => {
          verify(ids, note);
          setBulkVerifyOpen(false);
        }}
      />

      <SemesterDrawer
        target={semTarget}
        rows={rows}
        sections={sections}
        canEdit={canEdit}
        reason={reason}
        onClose={() => setSemTarget(null)}
        onApply={(ids, next, from, why, label) => {
          setRows((list) => list.map((r) => (ids.includes(r.id) ? { ...r, semester: next } : r)));
          logActivity({
            title: `${label} moved to Semester ${next}`,
            meta: `${formatAccaDate(ACCA_TODAY)} · ${persona.name} · effective ${formatAccaDate(from)}`,
            body: `${why}. ${plural(ids.length, "student record")} updated.`,
            tone: "info",
          });
          toast({ title: "Current semester updated", body: `${label} · Semester ${next} from ${formatAccaDate(from)}` });
          setSemTarget(null);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ verify one record */

function VerifyDrawer({
  row,
  canEdit,
  reason,
  onClose,
  onVerify,
  onKeepMismatch,
}: {
  row: RosterRow | null;
  canEdit: boolean;
  reason?: string;
  onClose: () => void;
  onVerify: (row: RosterRow, note: string) => void;
  onKeepMismatch: (row: RosterRow, note: string) => void;
}) {
  const s = row?.student;
  const mismatch = row?.verification === "mismatch";
  const dob = row ? datesOfBirth(row) : null;
  const escalation = s && mismatch ? escalations.find((e) => e.studentId === s.id && e.kind === "operational") : undefined;

  const fields: { label: string; register: string; platform: string }[] =
    row && s && dob
      ? [
          { label: "Name", register: s.name, platform: s.name },
          { label: "Roll no", register: row.roll, platform: row.roll },
          { label: "Date of birth", register: formatAccaDate(dob.university), platform: formatAccaDate(dob.platform) },
          { label: "Intake", register: intakeShort(s.intakeId), platform: intakeShort(s.intakeId) },
          { label: "Semester", register: `Semester ${row.semester}`, platform: `Semester ${row.semester}` },
          { label: "Section", register: `Section ${s.section}`, platform: `Section ${s.section}` },
        ]
      : [];

  return (
    <FormDrawer
      open={row != null}
      onClose={onClose}
      title={mismatch ? "Resolve record mismatch" : "Verify student record"}
      sub={s && row ? `${s.name} · ${row.roll} · ACCA ID ${s.accaId ?? "not registered"}` : undefined}
      submitLabel={mismatch ? "Save resolution" : "Verify record"}
      disabled={!canEdit}
      disabledReason={reason}
      footerNote="The Programme Admin sees the result in ACCA operations."
      onSubmit={(data) => {
        if (!row) return;
        const note = String(data.get("note") ?? "").trim();
        if (mismatch && data.get("resolution") === "keep") onKeepMismatch(row, note);
        else onVerify(row, note);
      }}
    >
      {row && s ? (
        <>
          {row.note ? (
            <p
              className={cn(
                "rounded-[12px] px-3.5 py-2.5 text-[13px] leading-snug",
                mismatch ? "bg-rose-soft text-rose" : "bg-amber-soft text-amber",
              )}
            >
              {row.note}.
            </p>
          ) : null}

          <div>
            <MiniLabel className="mb-2">Record check</MiniLabel>
            <div className="overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full min-w-[26rem] text-[13px]">
                <thead className="bg-surface-2 text-left text-[12px] text-ink-3">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Field</th>
                    <th className="px-3 py-2 font-semibold">University register</th>
                    <th className="px-3 py-2 font-semibold">ACCA LMS record</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {fields.map((f) => {
                    const differs = f.register !== f.platform;
                    return (
                      <tr key={f.label} className={differs ? "bg-rose-soft/50" : undefined}>
                        <td className="px-3 py-2 text-ink-3">{f.label}</td>
                        <td className="px-3 py-2 font-semibold text-ink">{f.register}</td>
                        <td className={cn("px-3 py-2 font-semibold", differs ? "text-rose" : "text-ink")}>{f.platform}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {mismatch ? (
            <Field label="Resolution">
              <Select name="resolution" defaultValue="corrected" key={`${row.id}-resolution`}>
                <option value="corrected">ACCA LMS record corrected to match the register, mark verified</option>
                <option value="register">University register was wrong and has been corrected, mark verified</option>
                <option value="keep">Keep as mismatch and ask the Programme Admin to correct it</option>
              </Select>
            </Field>
          ) : null}
          {escalation ? (
            <p className="text-[12.5px] text-ink-3">
              Linked ticket <span className="font-mono text-ink-2">{escalation.ticketId}</span> · {escalation.subject} ·{" "}
              <StatusPill status={escalation.status} size="sm" />
            </p>
          ) : null}

          <Checkbox
            name="checked"
            required
            key={`${row.id}-checked`}
            label="I have checked this record against the Brightwater enrolment register."
          />
          <Field label="Note" hint="Optional">
            <Textarea name="note" rows={3} placeholder="e.g. Checked against the Semester 3 enrolment list dated 12 Sep 2026." key={`${row.id}-note`} />
          </Field>
        </>
      ) : null}
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ verify student records in bulk */

function BulkVerifyDrawer({
  open,
  rows,
  canEdit,
  reason,
  onClose,
  onOpenMismatch,
  onVerify,
}: {
  open: boolean;
  rows: RosterRow[];
  canEdit: boolean;
  reason?: string;
  onClose: () => void;
  onOpenMismatch: (row: RosterRow) => void;
  onVerify: (ids: string[], note: string) => void;
}) {
  const pending = rows.filter((r) => r.verification === "pending");
  const mismatched = rows.filter((r) => r.verification === "mismatch");
  const [picked, setPicked] = useState<string[]>([]);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setPicked(pending.map((r) => r.id));
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Verify student records"
      sub="Check each record against the university enrolment register, then verify them together."
      submitLabel={picked.length ? `Verify ${plural(picked.length, "record")}` : "Verify records"}
      disabled={!canEdit || picked.length === 0}
      disabledReason={!canEdit ? reason : "Choose at least one record."}
      footerNote="The Programme Admin sees the result in ACCA operations."
      onSubmit={(data) => onVerify(picked, String(data.get("note") ?? "").trim())}
    >
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <MiniLabel>Pending verification · {pending.length}</MiniLabel>
          {pending.length ? (
            <button
              type="button"
              className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              onClick={() => setPicked(picked.length === pending.length ? [] : pending.map((r) => r.id))}
            >
              {picked.length === pending.length ? "Clear all" : "Select all"}
            </button>
          ) : null}
        </div>
        {pending.length ? (
          <ul className="divide-y divide-line rounded-[12px] border border-line">
            {pending.map((r) => (
              <li key={r.id} className="px-3.5 py-2.5">
                <Checkbox
                  checked={picked.includes(r.id)}
                  onChange={(e) => setPicked((list) => (e.target.checked ? [...list, r.id] : list.filter((x) => x !== r.id)))}
                  label={
                    <span className="block min-w-0">
                      <span className="block font-semibold text-ink">{r.student.name}</span>
                      <span className="block font-mono text-[12px] text-ink-3">
                        {r.roll} · {intakeShort(r.student.intakeId)} · Section {r.student.section} · ACCA ID {r.student.accaId ?? "not issued"}
                      </span>
                      {r.note ? <span className="block text-[12px] text-ink-3">{r.note}</span> : null}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-5 text-center text-[13px] text-ink-3">
            Every pending record is verified.
          </p>
        )}
      </div>

      {mismatched.length ? (
        <div>
          <MiniLabel className="mb-2">Mismatches · resolve one at a time</MiniLabel>
          <ul className="divide-y divide-line rounded-[12px] border border-rose/30 bg-rose-soft/40">
            {mismatched.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{r.student.name}</span>
                  <span className="block text-[12px] text-ink-3">{r.note ?? "Differs from the register"}</span>
                </span>
                <Button type="button" size="xs" variant="outline" onClick={() => onOpenMismatch(r)}>
                  <ShieldAlert className="size-3.5" />
                  Resolve
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Checkbox name="checked" required label="I have checked these records against the Brightwater enrolment register." />
      <Field label="Note" hint="Optional">
        <Textarea name="note" rows={2} placeholder="e.g. Checked against the Semester 3 enrolment list dated 12 Sep 2026." />
      </Field>
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ update current semester */

function SemesterDrawer({
  target,
  rows,
  sections,
  canEdit,
  reason,
  onClose,
  onApply,
}: {
  target: SemesterTarget;
  rows: RosterRow[];
  sections: ReturnType<typeof sectionsForUniversity>;
  canEdit: boolean;
  reason?: string;
  onClose: () => void;
  onApply: (ids: string[], semester: number, from: string, why: string, label: string) => void;
}) {
  const byIds = target && "ids" in target ? target : null;
  const [scope, setScope] = useState<string>("");
  const [lastTarget, setLastTarget] = useState<SemesterTarget>(null);
  if (target !== lastTarget) {
    setLastTarget(target);
    setScope(byIds ? "selected" : target && "sectionId" in target ? `section:${target.sectionId}` : "");
  }

  const scopeIds =
    scope === "selected" && byIds
      ? byIds.ids
      : rows.filter((r) => `section:${r.student.sectionId}` === scope).map((r) => r.id);
  const scopeRows = rows.filter((r) => scopeIds.includes(r.id));
  const current = [...new Set(scopeRows.map((r) => r.semester))];
  const suggested = Math.min(6, (current[0] ?? 1) + 1);
  const scopeLabel =
    scope === "selected" && byIds ? byIds.label : (sections.find((s) => `section:${s.id}` === scope)?.label ?? "Section");
  const nextSemesterStart =
    allSemesters.find(
      (s) => s.intakeId === scopeRows[0]?.student.intakeId && s.number === suggested && s.universityId === scopeRows[0]?.student.universityId,
    )?.start ?? "2027-01-04";

  return (
    <FormDrawer
      open={target != null}
      onClose={onClose}
      title="Update current student semester"
      sub="Moves students to a new semester. Their ACCA roadmap, dashboard and cohort reports follow."
      submitLabel="Update semester"
      disabled={!canEdit || scopeIds.length === 0}
      disabledReason={!canEdit ? reason : "Choose students or a section with records."}
      footerNote="Students and their mentor see the change on their dashboard."
      onSubmit={(data) => {
        const next = Number(data.get("semester"));
        const from = String(data.get("from") || nextSemesterStart);
        const why = String(data.get("reason") ?? SEMESTER_REASONS[0]);
        onApply(scopeIds, next, from, why, scopeLabel);
      }}
    >
      <Field label="Apply to">
        <Select name="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
          {byIds ? <option value="selected">{byIds.label}</option> : null}
          {sections.map((s) => (
            <option key={s.id} value={`section:${s.id}`}>
              Whole section: {s.label} ({plural(rows.filter((r) => r.student.sectionId === s.id).length, "record")})
            </option>
          ))}
        </Select>
      </Field>

      <div className="rounded-[12px] border border-line bg-surface-2 px-3.5 py-3 text-[13px] text-ink-2">
        <span className="font-semibold text-ink">{plural(scopeIds.length, "student record")}</span> · currently{" "}
        {current.length ? current.map((n) => `Semester ${n}`).join(", ") : "no records"}
        {scopeRows.length ? (
          <span className="mt-1 block truncate text-[12px] text-ink-3">{scopeRows.map((r) => r.student.name).join(", ")}</span>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New semester">
          <Select name="semester" defaultValue={String(suggested)} key={`sem-${scope}`}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                Semester {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Effective from">
          <Input type="date" name="from" defaultValue={nextSemesterStart} key={`from-${scope}`} />
        </Field>
      </div>
      <Field label="Reason">
        <Select name="reason" defaultValue={SEMESTER_REASONS[0]}>
          {SEMESTER_REASONS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </Field>
      <Field label="Note" hint="Optional">
        <Textarea name="note" rows={2} placeholder="e.g. Semester 3 results declared on 28 Dec 2026." />
      </Field>
    </FormDrawer>
  );
}
