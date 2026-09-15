"use client";

import { useMemo, useState } from "react";
import { Layers, Plus, UsersRound } from "lucide-react";
import {
  ACCA_TODAY,
  examSessionById,
  faculty,
  formatAccaDate,
  mentors,
  paperByCode,
  paperName,
  staffName,
  type PaperCode,
} from "@/lib/data/acca";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural } from "./common";
import { paperIndex, studentIndex, type AttemptRow, type RevisionCohort } from "./exams-model";

type Candidate = {
  id: string;
  studentId: string;
  name: string;
  type: string;
  paper: PaperCode;
  attempts: AttemptRow[];
  last: AttemptRow;
  readiness: number | null;
  cohortId: string | null;
};

const SESSION_CHOICES = ["es-2026-dec", "es-2027-mar", "es-2027-jun"];

export function RevisionCohortsTab({
  attempts,
  cohorts,
  setCohorts,
  canEdit,
  reason,
}: {
  attempts: AttemptRow[];
  cohorts: RevisionCohort[];
  setCohorts: React.Dispatch<React.SetStateAction<RevisionCohort[]>>;
  canEdit: boolean;
  reason?: string;
}) {
  const [paperFilter, setPaperFilter] = useState("");
  const [cohortFilter, setCohortFilter] = useState("");
  const [creating, setCreating] = useState<Candidate[] | null>(null);
  const [formPaper, setFormPaper] = useState<PaperCode>("PM");
  const [formSession, setFormSession] = useState("es-2027-mar");
  const [formType, setFormType] = useState<"revision" | "reattempt">("reattempt");

  const candidates: Candidate[] = useMemo(() => {
    const groups = new Map<string, AttemptRow[]>();
    for (const a of attempts) groups.set(`${a.studentId}-${a.paper}`, [...(groups.get(`${a.studentId}-${a.paper}`) ?? []), a]);
    return [...groups.entries()]
      .map(([id, list]) => {
        const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
        const last = sorted[sorted.length - 1];
        const s = studentIndex.get(last.studentId)!;
        const cohort = cohorts.find((c) => c.paper === last.paper && c.studentIds.includes(s.id));
        return {
          id,
          studentId: s.id,
          name: s.name,
          type: s.type === "graduate" ? "Graduate" : "Undergraduate",
          paper: last.paper,
          attempts: sorted,
          last,
          readiness: s.readiness.byPaper[last.paper] ?? null,
          cohortId: cohort?.id ?? null,
        };
      })
      .filter((c) => c.last.result === "failed" && !c.attempts.some((a) => a.result === "passed"));
  }, [attempts, cohorts]);

  const visible = candidates.filter(
    (c) =>
      (!paperFilter || c.paper === paperFilter) &&
      (!cohortFilter || (cohortFilter === "none" ? !c.cohortId : Boolean(c.cohortId))),
  );

  const openCreate = (ids: string[]) => {
    const picked = candidates.filter((c) => ids.includes(c.id));
    if (!picked.length) return;
    const counts = new Map<PaperCode, number>();
    for (const c of picked) counts.set(c.paper, (counts.get(c.paper) ?? 0) + 1);
    const paper = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    setFormPaper(paper);
    const format = paperByCode(paper)?.examFormat;
    setFormSession(format === "on-demand" ? "es-2026-dec" : "es-2027-mar");
    setFormType(picked.some((c) => c.attempts.length > 1) ? "reattempt" : "revision");
    setCreating(picked);
  };

  const sessionLabel = examSessionById(formSession)?.label ?? "";
  const matching = (creating ?? []).filter((c) => c.paper === formPaper);
  const others = (creating ?? []).filter((c) => c.paper !== formPaper);
  const lead = paperByCode(formPaper)?.leadFacultyId ?? faculty[0].id;
  const onDemand = paperByCode(formPaper)?.examFormat === "on-demand";

  const columns: DataTableColumn<Candidate>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (c) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{c.name}</span>
          <span className="block text-[12px] text-ink-3">{c.type}</span>
        </span>
      ),
    },
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      sortValue: (c) => paperIndex(c.paper),
      render: (c) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">{c.paper}</span>
          <span className="text-ink-3">{paperName(c.paper)}</span>
        </span>
      ),
    },
    {
      key: "last",
      header: "Last attempt",
      sortable: true,
      sortValue: (c) => c.last.score,
      render: (c) => (
        <StatusPill status="failed" size="sm" dot={false}>
          {c.last.label} · {c.last.score}%
        </StatusPill>
      ),
    },
    { key: "count", header: "Attempts", align: "right", mono: true, sortable: true, sortValue: (c) => c.attempts.length, render: (c) => c.attempts.length },
    {
      key: "readiness",
      header: "Readiness score",
      align: "right",
      mono: true,
      sortable: true,
      render: (c) => (c.readiness == null ? null : c.readiness),
    },
    {
      key: "cohort",
      header: "Revision or reattempt cohort",
      sortable: true,
      // Unallocated learners first; blank sort values would sink to the bottom.
      sortValue: (c) => (c.cohortId ? `1 ${cohorts.find((x) => x.id === c.cohortId)?.name ?? ""}` : "0"),
      render: (c) =>
        c.cohortId ? (
          <span className="text-ink-2">{cohorts.find((x) => x.id === c.cohortId)?.name}</span>
        ) : (
          <StatusPill status="Not allocated" tone="amber" size="sm" />
        ),
    },
  ];

  return (
    <div className="space-y-5">
      <Note icon={<UsersRound />}>
        Learners whose latest attempt failed and who have not passed the paper since. Select learners and create a revision and reattempt
        cohort for them. Pass mark 50%.
      </Note>

      <DataTable
        caption="Learners who need a reattempt"
        rows={visible}
        columns={columns}
        getRowId={(c) => c.id}
        initialSort={{ key: "cohort", dir: "asc" }}
        search={{ placeholder: "Search learner", match: (c, q) => c.name.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(paperFilter || cohortFilter)}
            onClear={() => {
              setPaperFilter("");
              setCohortFilter("");
            }}
          >
            <FilterSelect
              label="Paper"
              value={paperFilter}
              onChange={setPaperFilter}
              allLabel="All"
              options={[...new Set(candidates.map((c) => c.paper))].sort((a, b) => paperIndex(a) - paperIndex(b))}
            />
            <FilterSelect
              label="Cohort"
              value={cohortFilter}
              onChange={setCohortFilter}
              allLabel="All"
              options={[
                { value: "none", label: "Not allocated" },
                { value: "allocated", label: "In a cohort" },
              ]}
            />
          </FilterBar>
        }
        selectable
        bulkActions={(ids, clear) => (
          <GatedButton
            size="sm"
            allowed={canEdit}
            reason={reason}
            onClick={() => {
              openCreate(ids);
              clear();
            }}
          >
            <Plus className="size-3.5" /> Create revision and reattempt cohort
          </GatedButton>
        )}
        toolbar={
          <GatedButton
            size="sm"
            variant="outline"
            allowed={canEdit}
            reason={reason}
            onClick={() => openCreate(candidates.filter((c) => !c.cohortId).map((c) => c.id))}
            disabled={!candidates.some((c) => !c.cohortId)}
          >
            Create for unallocated
          </GatedButton>
        }
      />

      <div>
        <MiniLabel className="mb-3">Revision and reattempt cohorts</MiniLabel>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {cohorts.map((c) => (
            <Card key={c.id} className="min-w-0 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv text-cta">
                  <Layers aria-hidden className="size-5" />
                </span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  {c.created ? <StatusPill status="New" tone="cta" size="sm" /> : null}
                  <StatusPill status={c.type === "revision" ? "Revision" : "Reattempt"} tone="info" size="sm" />
                  <StatusPill status={c.status} size="sm" />
                </span>
              </div>
              <p className="mt-3 font-display text-[17px] leading-tight font-bold tracking-[-0.02em] text-ink">{c.name}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">
                {c.paper} · {paperName(c.paper)} · {examSessionById(c.sessionId)?.label} exam session
              </p>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[12.5px]">
                <div className="min-w-0">
                  <dt className="text-ink-3">Faculty</dt>
                  <dd className="truncate font-semibold text-ink">{staffName(c.facultyId)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Mentor</dt>
                  <dd className="truncate font-semibold text-ink">{staffName(c.mentorId)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Learners</dt>
                  <dd className="font-semibold text-ink tnum">
                    {c.size} of {c.capacity}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Starts</dt>
                  <dd className="font-semibold text-ink">
                    {formatAccaDate(c.startDate)} · {c.mode === "weekend" ? "Weekend" : "Weekday"}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </div>

      <FormDrawer
        open={creating !== null}
        onClose={() => setCreating(null)}
        title="Create revision and reattempt cohort"
        sub={`${plural(matching.length, "learner")} will be allocated`}
        submitLabel="Create cohort"
        disabled={!canEdit || matching.length === 0}
        disabledReason={reason ?? "No selected learner failed this paper."}
        onSubmit={(data) => {
          const name = String(data.get("name") ?? "").trim() || `${formPaper} Revision and Reattempt · ${sessionLabel}`;
          const capacity = Math.max(matching.length, Number(data.get("capacity")) || 20);
          const cohort: RevisionCohort = {
            id: `co-new-${formPaper.toLowerCase()}-${cohorts.length}`,
            name,
            type: formType,
            paper: formPaper,
            sessionId: formSession,
            mode: String(data.get("mode")) === "weekday" ? "weekday" : "weekend",
            facultyId: String(data.get("faculty")),
            mentorId: String(data.get("mentor")),
            capacity,
            size: matching.length,
            studentIds: matching.map((m) => m.studentId),
            startDate: String(data.get("start") || ACCA_TODAY),
            status: "enrolling",
            created: true,
          };
          // A learner moves out of an older cohort for the same paper.
          setCohorts((list) => [
            cohort,
            ...list.map((c) => (c.paper === formPaper ? { ...c, studentIds: c.studentIds.filter((id) => !cohort.studentIds.includes(id)) } : c)),
          ]);
          toast({
            title: "Revision and reattempt cohort created",
            body: `${name} · ${plural(matching.length, "learner")} allocated`,
          });
          setCreating(null);
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select value={formPaper} onChange={(e) => setFormPaper(e.target.value as PaperCode)}>
              {[...new Set((creating ?? []).map((c) => c.paper))].map((p) => (
                <option key={p} value={p}>
                  {p} · {paperName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cohort type">
            <Select value={formType} onChange={(e) => setFormType(e.target.value as "revision" | "reattempt")}>
              <option value="revision">Revision</option>
              <option value="reattempt">Reattempt</option>
            </Select>
          </Field>
        </div>
        <Field label={onDemand ? "Target exam window" : "Exam session"} hint={onDemand ? "On-demand CBE" : undefined}>
          <Select value={formSession} onChange={(e) => setFormSession(e.target.value)}>
            {SESSION_CHOICES.map((id) => (
              <option key={id} value={id}>
                {examSessionById(id)?.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Cohort name">
          <Input key={`${formPaper}-${formSession}`} name="name" defaultValue={`${formPaper} Revision and Reattempt · ${sessionLabel}`} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode">
            <Select name="mode" defaultValue="weekend">
              <option value="weekend">Weekend batch</option>
              <option value="weekday">Weekday evening batch</option>
            </Select>
          </Field>
          <Field label="Capacity">
            <Input name="capacity" type="number" min={1} defaultValue={25} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Faculty">
            <Select key={`fac-${formPaper}`} name="faculty" defaultValue={lead}>
              {faculty.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} · {f.focusPapers.join(", ")}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mentor">
            <Select name="mentor" defaultValue="st-aisha">
              {mentors.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Start date">
          <Input name="start" type="date" defaultValue="2026-10-03" />
        </Field>
        <div>
          <MiniLabel className="mb-2">Learners allocated</MiniLabel>
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] border border-line">
            {matching.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-3.5 py-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-ink">{c.name}</span>
                <span className="shrink-0 font-mono text-[12px] text-ink-3">
                  {c.last.label} · {c.last.score}%
                </span>
              </li>
            ))}
          </ul>
          {others.length ? (
            <p className="mt-2 text-[12px] text-ink-3">
              {plural(others.length, "selected learner")} failed a different paper ({[...new Set(others.map((o) => o.paper))].join(", ")}) and
              will not be added. Switch the paper to create that cohort.
            </p>
          ) : null}
        </div>
      </FormDrawer>
    </div>
  );
}
