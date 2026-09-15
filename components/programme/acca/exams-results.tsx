"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, ClipboardPen, Clock3, FileSpreadsheet } from "lucide-react";
import {
  ACCA_TODAY,
  PAPER_CODES,
  addDays,
  examSessionById,
  formatAccaDate,
  paperName,
  students as allStudents,
  type ExamSessionId,
  type PaperCode,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural, relativeDays } from "./common";
import { paperIndex, sampleMark, studentIndex, type AttemptRow } from "./exams-model";

const RESULT_SESSIONS: ExamSessionId[] = ["es-2026-sep", "es-2026-jun", "es-2026-mar", "es-2025-dec", "es-2025-sep"];

type ParsedRow = {
  key: string;
  attemptId?: string;
  accaId: string;
  name: string;
  paper: PaperCode;
  mark: number;
  match: "matched" | "recorded" | "unmatched";
};

export function ResultsTab({
  attempts,
  setAttempts,
  canEdit,
  reason,
  persona,
}: {
  attempts: AttemptRow[];
  setAttempts: React.Dispatch<React.SetStateAction<AttemptRow[]>>;
  canEdit: boolean;
  reason?: string;
  persona: string;
}) {
  const [sessionId, setSessionId] = useState<ExamSessionId>("es-2026-sep");
  const [files, setFiles] = useState<string[]>([]);
  const [dropKey, setDropKey] = useState(0);
  const [paperFilter, setPaperFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const [singleOpen, setSingleOpen] = useState(false);
  const [formStudent, setFormStudent] = useState("s-lavanya");
  const [formPaper, setFormPaper] = useState<PaperCode>("TX");
  const [formSession, setFormSession] = useState<string>("es-2026-sep");
  const [formMark, setFormMark] = useState("62");

  const session = examSessionById(sessionId)!;
  const pending = session.status === "results-pending";
  const inSession = useMemo(() => attempts.filter((a) => a.sessionId === sessionId), [attempts, sessionId]);
  const pendingRows = inSession.filter((a) => a.result === "pending");

  const parsed: ParsedRow[] = useMemo(() => {
    if (!files.length) return [];
    const rows: ParsedRow[] = inSession.map((a) => ({
      key: a.id,
      attemptId: a.id,
      accaId: a.accaId ?? "",
      name: a.name,
      paper: a.paper,
      mark: a.result === "pending" ? sampleMark(a.id) : (a.score ?? 0),
      match: a.result === "pending" ? "matched" : "recorded",
    }));
    if (pending) rows.push({ key: "unmatched", accaId: "4471093", name: "Not on the programme", paper: "FR", mark: 55, match: "unmatched" });
    return rows;
  }, [files, inSession, pending]);

  const toApply = parsed.filter((p) => p.match === "matched");

  const recordedLabel = (a: AttemptRow) => {
    if (a.result === "pending") return pending ? `Due ${formatAccaDate(session.resultsDate)}` : "Not recorded";
    if (a.recordedOn) return `${formatAccaDate(a.recordedOn)} · ${persona}`;
    return formatAccaDate(a.sessionId ? addDays(examSessionById(a.sessionId)?.resultsDate ?? a.date, 1) : a.date);
  };

  const visible = inSession.filter((a) => (!paperFilter || a.paper === paperFilter) && (!resultFilter || a.result === resultFilter));

  const columns: DataTableColumn<AttemptRow>[] = [
    { key: "name", header: "Learner", sortable: true, className: "font-semibold" },
    { key: "accaId", header: "ACCA ID", mono: true, sortable: true },
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      sortValue: (a) => paperIndex(a.paper),
      render: (a) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">{a.paper}</span>
          <span className="text-ink-3">{paperName(a.paper)}</span>
        </span>
      ),
    },
    { key: "score", header: "Mark", align: "right", mono: true, sortable: true, render: (a) => (a.score == null ? null : `${a.score}%`) },
    {
      key: "result",
      header: "Result",
      sortable: true,
      render: (a) =>
        a.result === "pending" ? <StatusPill status="Results pending" /> : <StatusPill status={a.result} />,
    },
    { key: "recorded", header: "Recorded", className: "text-ink-2", render: recordedLabel },
  ];

  const apply = () => {
    if (!toApply.length) {
      toast({ title: "No changes to record", body: "Every result in the file is already recorded.", tone: "info" });
      return;
    }
    const marks = new Map(toApply.map((p) => [p.attemptId!, p.mark]));
    setAttempts((list) =>
      list.map((a) =>
        marks.has(a.id)
          ? { ...a, score: marks.get(a.id)!, result: marks.get(a.id)! >= 50 ? "passed" : "failed", recordedOn: ACCA_TODAY }
          : a,
      ),
    );
    const passed = toApply.filter((p) => p.mark >= 50).length;
    toast({
      title: `${plural(toApply.length, "result")} recorded · ${session.label}`,
      body: `${passed} passed, ${toApply.length - passed} failed. ${parsed.some((p) => p.match === "unmatched") ? "1 row skipped: ACCA ID not found." : ""}`.trim(),
    });
    setFiles([]);
    setDropKey((k) => k + 1);
  };

  const markNumber = Number(formMark);
  const markValid = formMark !== "" && Number.isFinite(markNumber) && markNumber >= 0 && markNumber <= 100;
  const pendingStudents = attempts.filter((a) => a.result === "pending").map((a) => a.studentId);

  const openSingle = (row?: AttemptRow) => {
    const target = row ?? pendingRows[0];
    if (target) {
      setFormStudent(target.studentId);
      setFormPaper(target.paper);
      setFormSession(target.sessionId ?? "on-demand");
      setFormMark(String(sampleMark(target.id)));
    }
    setSingleOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FilterSelect
          label="Exam session"
          value={sessionId}
          onChange={(v) => {
            setSessionId(v as ExamSessionId);
            setFiles([]);
            setDropKey((k) => k + 1);
          }}
          options={RESULT_SESSIONS.map((id) => {
            const s = examSessionById(id)!;
            return { value: id, label: `${s.label} · ${s.status === "results-pending" ? "results pending" : "released"}` };
          })}
        />
        <GatedButton size="sm" variant="secondary" allowed={canEdit} reason={reason} onClick={() => openSingle()}>
          <ClipboardPen className="size-4" /> Record a single result
        </GatedButton>
      </div>

      {pending ? (
        <Note tone="amber" icon={<Clock3 />}>
          <strong className="font-semibold">{session.label} results pending.</strong> ACCA releases them on{" "}
          {formatAccaDate(session.resultsDate)} ({relativeDays(session.resultsDate)}). {plural(pendingRows.length, "paper")} sat by our learners stay
          marked pending until then. Record results within 48 hours of release.
        </Note>
      ) : (
        <Note tone="jade" icon={<CheckCircle2 />}>
          {session.label} results released {formatAccaDate(session.resultsDate)} and recorded for {plural(inSession.length, "paper attempt")}.
        </Note>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="min-w-0 self-start">
          <CardHeader title="Upload ACCA results file" sub="Export the results from the ACCA learning partner report and drop it here." />
          <div className="space-y-3 px-5 pb-5">
            <FileDrop
              key={dropKey}
              label="Upload results CSV"
              accept=".csv,.xlsx"
              multiple={false}
              disabled={!canEdit}
              disabledReason={reason}
              hint="Columns: ACCA ID, paper, mark. Matched on ACCA ID."
              onFiles={(all) => setFiles(all)}
            />
            {!files.length ? (
              <p className="text-[12.5px] text-ink-3">Choose a file to see a parsed preview before anything is recorded.</p>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title={files.length ? `Parsed preview · ${files[0]}` : "Parsed preview"}
            sub={
              files.length
                ? `${plural(parsed.length, "row")} read · ${toApply.length} to record · ${parsed.filter((p) => p.match === "recorded").length} already recorded · ${parsed.filter((p) => p.match === "unmatched").length} not matched`
                : "Nothing uploaded yet."
            }
            action={
              files.length ? (
                <GatedButton size="sm" allowed={canEdit} reason={reason} onClick={apply}>
                  <FileSpreadsheet className="size-4" /> Record {plural(toApply.length, "result")}
                </GatedButton>
              ) : null
            }
          />
          <div className="px-5 pb-5">
            {files.length ? (
              <DataTable
                bare
                dense
                pageSize={6}
                caption="Parsed results preview"
                rows={parsed}
                getRowId={(p) => p.key}
                columns={[
                  { key: "accaId", header: "ACCA ID", mono: true },
                  { key: "name", header: "Learner", className: "font-semibold" },
                  { key: "paper", header: "Paper", mono: true },
                  { key: "mark", header: "Mark", align: "right", mono: true, render: (p) => `${p.mark}%` },
                  {
                    key: "outcome",
                    header: "Result",
                    render: (p) => <StatusPill status={p.mark >= 50 ? "passed" : "failed"} size="sm" />,
                  },
                  {
                    key: "match",
                    header: "Match",
                    render: (p) =>
                      p.match === "matched" ? (
                        <StatusPill status="Matched" tone="info" size="sm" />
                      ) : p.match === "recorded" ? (
                        <StatusPill status="recorded" tone="neutral" size="sm">
                          Already recorded
                        </StatusPill>
                      ) : (
                        <StatusPill status="unmatched" tone="rose" size="sm">
                          ACCA ID not found
                        </StatusPill>
                      ),
                  },
                ]}
              />
            ) : (
              <div className="grid place-items-center rounded-[var(--radius-md)] border border-dashed border-line-strong px-4 py-10 text-center">
                <FileSpreadsheet aria-hidden className="size-6 text-ink-3" />
                <p className="mt-2 text-[13px] text-ink-3">The parsed rows appear here with a match check against ACCA IDs.</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <div>
        <MiniLabel className="mb-2.5">{session.label} results</MiniLabel>
        <DataTable
          caption={`${session.label} results`}
          rows={visible}
          columns={[
            ...columns,
            {
              key: "actions",
              header: <span className="sr-only">Actions</span>,
              align: "right",
              render: (a) =>
                a.result === "pending" ? (
                  <GatedButton size="xs" variant="outline" allowed={canEdit} reason={reason} onClick={() => openSingle(a)}>
                    Record result
                  </GatedButton>
                ) : null,
            },
          ]}
          getRowId={(a) => a.id}
          initialSort={{ key: "result", dir: "desc" }}
          search={{ placeholder: "Search learner or ACCA ID", match: (a, q) => a.name.toLowerCase().includes(q) || (a.accaId ?? "").includes(q) }}
          filters={
            <FilterBar
              active={Boolean(paperFilter || resultFilter)}
              onClear={() => {
                setPaperFilter("");
                setResultFilter("");
              }}
            >
              <FilterSelect
                label="Paper"
                value={paperFilter}
                onChange={setPaperFilter}
                allLabel="All"
                options={[...new Set(inSession.map((a) => a.paper))].sort((a, b) => paperIndex(a) - paperIndex(b))}
              />
              <FilterSelect
                label="Result"
                value={resultFilter}
                onChange={setResultFilter}
                allLabel="All"
                options={[
                  { value: "passed", label: "Passed" },
                  { value: "failed", label: "Failed" },
                  { value: "pending", label: "Pending" },
                ]}
              />
            </FilterBar>
          }
          toolbar={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => toast({ title: `Report queued: acca-results-${session.label.toLowerCase().replace(" ", "-")}.csv`, tone: "info" })}
            >
              Export
            </Button>
          }
        />
      </div>

      <FormDrawer
        open={singleOpen}
        onClose={() => setSingleOpen(false)}
        title="Record ACCA result"
        sub="Pass mark 50% for every ACCA exam."
        submitLabel="Record result"
        disabled={!canEdit || !markValid}
        disabledReason={reason ?? "Enter a mark from 0 to 100."}
        onSubmit={(data) => {
          const s = studentIndex.get(formStudent)!;
          const onDemand = formSession === "on-demand";
          const date = onDemand ? String(data.get("date") || ACCA_TODAY) : (examSessionById(formSession)?.examStart ?? ACCA_TODAY);
          const result = markNumber >= 50 ? "passed" : "failed";
          const existing = attempts.find(
            (a) => a.studentId === s.id && a.paper === formPaper && a.result === "pending" && (onDemand ? !a.sessionId : a.sessionId === formSession),
          );
          if (existing) {
            setAttempts((list) => list.map((a) => (a.id === existing.id ? { ...a, score: markNumber, result, recordedOn: ACCA_TODAY } : a)));
          } else {
            setAttempts((list) => [
              {
                id: `${s.id}-${formPaper}-new-${list.length}`,
                studentId: s.id,
                name: s.name,
                accaId: s.accaId,
                paper: formPaper,
                sessionId: onDemand ? undefined : (formSession as ExamSessionId),
                date,
                label: onDemand ? formatAccaDate(date) : (examSessionById(formSession)?.label ?? ""),
                score: markNumber,
                result,
                recordedOn: ACCA_TODAY,
              },
              ...list,
            ]);
          }
          if (!onDemand) setSessionId(formSession as ExamSessionId);
          toast({ title: "Result recorded", body: `${s.name} · ${formPaper} ${markNumber}% · ${result === "passed" ? "Passed" : "Failed"}` });
          setSingleOpen(false);
        }}
      >
        <Field label="Learner">
          <Select value={formStudent} onChange={(e) => setFormStudent(e.target.value)}>
            {[...allStudents]
              .sort((a, b) => Number(pendingStudents.includes(b.id)) - Number(pendingStudents.includes(a.id)))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.accaId ? ` · ${s.accaId}` : ""}
                  {pendingStudents.includes(s.id) ? " · result pending" : ""}
                </option>
              ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select value={formPaper} onChange={(e) => setFormPaper(e.target.value as PaperCode)}>
              {PAPER_CODES.map((p) => (
                <option key={p} value={p}>
                  {p} · {paperName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam session">
            <Select value={formSession} onChange={(e) => setFormSession(e.target.value)}>
              {RESULT_SESSIONS.map((id) => (
                <option key={id} value={id}>
                  {examSessionById(id)!.label}
                </option>
              ))}
              <option value="on-demand">On-demand CBE</option>
            </Select>
          </Field>
        </div>
        {formSession === "on-demand" ? (
          <Field label="Exam date">
            <Input type="date" name="date" defaultValue="2026-09-11" max={ACCA_TODAY} />
          </Field>
        ) : null}
        <Field label="Mark (%)" error={formMark !== "" && !markValid ? "Enter a mark from 0 to 100" : undefined}>
          <Input type="number" min={0} max={100} value={formMark} onChange={(e) => setFormMark(e.target.value)} className="font-mono" />
        </Field>
        {markValid ? (
          <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5">
            <span className="text-[12.5px] text-ink-2">Result against the 50% pass mark</span>
            <StatusPill status={markNumber >= 50 ? "passed" : "failed"} />
          </div>
        ) : null}
      </FormDrawer>
    </div>
  );
}
