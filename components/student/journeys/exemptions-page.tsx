"use client";

import { useMemo, useState } from "react";
import { Calculator, FileCheck2, FileText, Info, PoundSterling, ShieldCheck, Upload } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  exemptionFeeGBP,
  exemptionRules,
  formatAccaDate,
  formatGBP,
  paperName,
  type ExemptionRecord,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Stepper, type Step } from "@/components/ui/stepper";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Select } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { MicroLabel, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";

type DocRow = {
  id: string;
  name: string;
  type: string;
  file: string;
  uploadedOn: string;
  status: "verified" | "pending" | "rejected" | "missing";
  note: string;
  papers: PaperCode[];
};

type Estimate = { id: string; ruleId: string; qualification: string; papers: PaperCode[]; fee: number; checkedOn: string };

const DOC_TYPES = ["Degree certificate", "Transcripts or mark sheets", "Photo ID", "Law subject syllabus", "Other supporting document"];

const DOC_FILES: Record<string, string> = {
  "Degree certificate": "BCom-degree-certificate-2024.pdf",
  "Consolidated mark sheets": "BCom-consolidated-marksheets.pdf",
  "Law subject syllabus": "BCom-business-law-syllabus.pdf",
};

function documentsFor(s: Student): DocRow[] {
  const byName = new Map<string, DocRow>();
  for (const e of s.exemptions) {
    for (const d of e.documents) {
      const row = byName.get(d.name);
      if (row) {
        row.papers.push(e.paper);
      } else {
        byName.set(d.name, {
          id: `doc-${byName.size + 1}`,
          name: d.name,
          type: d.name === "Consolidated mark sheets" ? "Transcripts or mark sheets" : d.name,
          file: DOC_FILES[d.name] ?? `${d.name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
          uploadedOn: addDays(e.estimatedOn, -7),
          status: d.status,
          note: d.status === "verified" ? "Verified by the programme team" : d.status === "pending" ? "Awaiting review" : "Re-upload requested",
          papers: [e.paper],
        });
      }
    }
  }
  const rows = [...byName.values()];
  if (rows.length) {
    rows.push({
      id: `doc-${rows.length + 1}`,
      name: "Photo ID (passport)",
      type: "Photo ID",
      file: "passport-photo-page.jpg",
      uploadedOn: rows[0].uploadedOn,
      status: "verified",
      note: "Name matches the degree certificate",
      papers: [],
    });
  }
  return rows;
}

function evaluationSteps(s: Student): Step[] {
  const ex = s.exemptions;
  if (ex.length === 0) {
    return [
      { id: "docs", label: "Documents uploaded", sub: "Upload your degree certificate, transcripts and photo ID", state: "current" },
      { id: "est", label: "Estimated by ZSkillup", sub: "The programme team estimates exemptions from your documents", state: "upcoming" },
      { id: "sub", label: "Submitted to ACCA", sub: "Claimed on your ACCA record", state: "locked" },
      { id: "dec", label: "ACCA decision", sub: "ACCA confirms or rejects each paper", state: "locked" },
      { id: "fee", label: "Fee paid", sub: "Exemption fee paid to ACCA per exempt paper", state: "locked" },
    ];
  }
  const first = ex[0];
  const allDocs = ex.every((e) => e.documents.every((d) => d.status === "verified"));
  const decided = ex.every((e) => e.state === "approved" || e.state === "rejected");
  const submitted = ex.every((e) => e.submittedOn);
  const feesPaid = ex.filter((e) => e.state === "approved").every((e) => e.fee.status === "paid");
  const approved = ex.filter((e) => e.state === "approved");
  const feeTotal = approved.reduce((sum, e) => sum + e.fee.amountGBP, 0);
  return [
    { id: "docs", label: "Documents", sub: allDocs ? "Degree certificate, mark sheets and photo ID verified" : "Some documents are awaiting review", state: allDocs ? "done" : "current" },
    { id: "est", label: "Estimated by ZSkillup", sub: `${ex.map((e) => e.paper).join(", ")} estimated on ${formatAccaDate(first.estimatedOn)} from your ${first.basis}`, state: "done" },
    {
      id: "sub",
      label: "Submitted to ACCA",
      sub: first.submittedOn ? `Claimed on your ACCA record on ${formatAccaDate(first.submittedOn)}` : "Submit once you agree the estimate",
      state: submitted ? "done" : "current",
    },
    {
      id: "dec",
      label: "ACCA decision",
      sub: decided ? `${approved.map((e) => e.paper).join(", ")} approved by ACCA on ${formatAccaDate(first.decidedOn ?? first.submittedOn ?? first.estimatedOn)}` : "Usually 4 to 6 weeks after submission",
      state: decided ? "done" : submitted ? "current" : "locked",
    },
    {
      id: "fee",
      label: "Fee paid",
      sub: feesPaid && approved[0]?.fee.paidOn ? `${formatGBP(feeTotal)} paid to ACCA on ${formatAccaDate(approved[0].fee.paidOn)}` : `${formatGBP(feeTotal)} due to ACCA`,
      state: decided ? (feesPaid ? "done" : "current") : "locked",
    },
  ];
}

export function ExemptionsPage() {
  const student = useStudentRecord();
  return (
    <StudentTypeGate type="graduate" eyebrow="Your plan" title="Exemptions">
      <ExemptionsView key={student.id} student={student} />
    </StudentTypeGate>
  );
}

export function ExemptionsView({ student }: { student: Student }) {
  const [docs, setDocs] = useState<DocRow[]>(() => documentsFor(student));
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [dropKey, setDropKey] = useState(0);
  const [estimating, setEstimating] = useState(false);
  const [ruleId, setRuleId] = useState(exemptionRules[1].id);
  const [estimates, setEstimates] = useState<Estimate[]>([]);

  const records = student.exemptions;
  const approved = records.filter((e) => e.state === "approved");
  const feeTotal = approved.reduce((s, e) => s + e.fee.amountGBP, 0);
  const steps = useMemo(() => evaluationSteps(student), [student]);
  const rule = exemptionRules.find((r) => r.id === ruleId)!;
  const ruleFee = rule.exemptPapers.reduce((s, p) => s + exemptionFeeGBP(p), 0);
  const pendingDocs = docs.filter((d) => d.status === "pending").length;

  const docColumns: DataTableColumn<DocRow>[] = [
    {
      key: "name",
      header: "Document",
      sortable: true,
      render: (d) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2">
            <FileText aria-hidden className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{d.name}</span>
            <span className="block truncate font-mono text-[11.5px] text-ink-3">{d.file}</span>
          </span>
        </span>
      ),
    },
    { key: "type", header: "Type", sortable: true },
    { key: "uploadedOn", header: "Uploaded", sortable: true, render: (d) => formatAccaDate(d.uploadedOn) },
    { key: "papers", header: "Supports", render: (d) => (d.papers.length ? d.papers.join(", ") : "Identity check") },
    { key: "status", header: "Status", sortable: true, render: (d) => <StatusPill status={d.status === "pending" ? "In review" : d.status} /> },
    { key: "note", header: "Note", wrap: true, className: "min-w-44 text-ink-2" },
  ];

  const paperColumns: DataTableColumn<ExemptionRecord>[] = [
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      render: (e) => (
        <span className="min-w-0">
          <span className="block font-mono font-semibold text-ink">{e.paper}</span>
          <span className="block text-[12px] text-ink-3">{paperName(e.paper)}</span>
        </span>
      ),
    },
    { key: "estimatedOn", header: "Estimated", sortable: true, render: (e) => <StatusPill status="estimated">Estimated {formatAccaDate(e.estimatedOn)}</StatusPill> },
    { key: "submittedOn", header: "Submitted to ACCA", render: (e) => (e.submittedOn ? formatAccaDate(e.submittedOn) : "Not yet") },
    {
      key: "state",
      header: "ACCA decision",
      sortable: true,
      render: (e) => (
        <StatusPill status={e.state}>
          {e.state === "approved" ? "ACCA-approved" : e.state === "rejected" ? "Rejected" : e.state === "submitted" ? "Awaiting ACCA" : "Estimated"}
          {e.decidedOn ? ` · ${formatAccaDate(e.decidedOn)}` : ""}
        </StatusPill>
      ),
    },
    { key: "fee", header: "Exemption fee", align: "right", mono: true, render: (e) => formatGBP(e.fee.amountGBP) },
    {
      key: "feeStatus",
      header: "Fee status",
      render: (e) => (
        <StatusPill status={e.fee.status}>
          {e.fee.status === "paid" ? `Paid to ACCA ${e.fee.paidOn ? formatAccaDate(e.fee.paidOn) : ""}` : e.fee.status === "unpaid" ? "Unpaid" : "Not due"}
        </StatusPill>
      ),
    },
    { key: "basis", header: "Basis", className: "text-ink-2" },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your plan"
        title="Exemptions"
        sub="Upload your qualification documents and follow the exemption evaluation from the programme team's estimate to ACCA's decision."
        badge={approved.length ? <StatusPill status="approved">{approved.length} papers ACCA-approved</StatusPill> : <StatusPill status="not-started" />}
        actions={
          <Button onClick={() => setEstimating(true)}>
            <Calculator aria-hidden className="size-4" />
            Check another qualification
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Papers exempt" value={approved.length} icon={<ShieldCheck />} sub={approved.map((e) => e.paper).join(", ") || "None yet"} />
        <KpiTile label="Exemption fees paid to ACCA" value={formatGBP(feeTotal)} tone="jade" icon={<PoundSterling />} sub={`${approved.length} × per-paper fee`} />
        <KpiTile label="Documents" value={`${docs.filter((d) => d.status === "verified").length} verified`} tone={pendingDocs ? "amber" : "jade"} icon={<FileCheck2 />} sub={pendingDocs ? `${pendingDocs} in review` : "Nothing waiting"} />
        <KpiTile label="Qualification" value={records[0]?.basis ?? student.background.qualification} icon={<Info />} sub={student.background.institution} />
      </KpiRow>

      <section aria-labelledby="docs-title" className="space-y-3.5">
        <div className="min-w-0">
          <h2 id="docs-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            Qualification-document upload
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">Degree certificate, transcripts or mark sheets, and a photo ID. Each document shows its review status.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="min-w-0 space-y-4 p-5">
            <Field label="Document type">
              <Select value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </Select>
            </Field>
            <FileDrop
              key={dropKey}
              label={`Upload ${docType.toLowerCase()}`}
              accept=".pdf,.jpg,.jpeg,.png"
              hint="Clear scans, up to 10 MB each."
              onFiles={(_, added) => {
                if (!added.length) return;
                setDocs((rows) => [
                  ...added.map((file, i) => ({
                    id: `up-${rows.length + i + 1}`,
                    name: docType === "Other supporting document" ? file.replace(/\.[a-z]+$/i, "") : docType,
                    type: docType,
                    file,
                    uploadedOn: ACCA_TODAY,
                    status: "pending" as const,
                    note: "Uploaded today · review within 2 working days",
                    papers: [] as PaperCode[],
                  })),
                  ...rows,
                ]);
                toast({
                  title: `${added.length} ${added.length === 1 ? "document" : "documents"} uploaded`,
                  body: `${added.join(", ")} · the programme team reviews within 2 working days`,
                });
                setDropKey((k) => k + 1);
              }}
            />
            <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-3">
              <Upload aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              New uploads appear in the table as In review. You are told on the Notifications page when a document is verified or needs re-uploading.
            </p>
          </Card>
          <DataTable
            caption="Qualification documents"
            rows={docs}
            columns={docColumns}
            getRowId={(d) => d.id}
            dense
            pageSize={6}
            className="min-w-0"
          />
        </div>
      </section>

      <section aria-labelledby="eval-title" className="space-y-3.5">
        <div className="min-w-0">
          <h2 id="eval-title" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            Exemption evaluation
          </h2>
          <p className="mt-1 text-[13px] text-ink-3">Exemptions are estimated first by the programme team, then confirmed by ACCA. ACCA charges a fee for each exempt paper.</p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <Card className="min-w-0 p-5">
            <MicroLabel className="mb-4">Your evaluation</MicroLabel>
            <Stepper steps={steps} orientation="vertical" aria-label="Exemption evaluation" />
          </Card>
          <div className="min-w-0 space-y-4">
            <DataTable
              caption="Exemption result per paper"
              rows={records}
              columns={paperColumns}
              getRowId={(e) => e.paper}
              dense
              empty={<p className="text-[13px] text-ink-3">No exemptions claimed yet. Upload your documents to start.</p>}
            />
            {estimates.length ? (
              <Card>
                <CardHeader title="Qualifications you checked" sub="Estimates only. ACCA decides each case." />
                <ul className="divide-y divide-line border-t border-line">
                  {estimates.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">{e.qualification}</span>
                        <span className="block text-[12px] text-ink-3">Checked {formatAccaDate(e.checkedOn)} · fees {formatGBP(e.fee)} to ACCA</span>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {e.papers.length ? (
                          e.papers.map((p) => (
                            <StatusPill key={p} status="estimated" size="sm">
                              {p} estimated
                            </StatusPill>
                          ))
                        ) : (
                          <StatusPill status="none" size="sm">
                            No exemptions
                          </StatusPill>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            ) : null}
          </div>
        </div>
      </section>

      <FormDrawer
        open={estimating}
        onClose={() => setEstimating(false)}
        title="Check another qualification"
        sub="See the exemptions the programme team would estimate from a qualification, using ZSkillup's exemption rules."
        submitLabel="Save this estimate"
        footerNote="Estimates are not an ACCA decision."
        onSubmit={() => {
          setEstimates((list) => [
            { id: `est-${list.length + 1}`, ruleId: rule.id, qualification: rule.qualification, papers: rule.exemptPapers, fee: ruleFee, checkedOn: ACCA_TODAY },
            ...list,
          ]);
          toast({
            title: "Estimate saved",
            body: rule.exemptPapers.length ? `${rule.qualification}: ${rule.exemptPapers.join(", ")} estimated` : `${rule.qualification}: no exemptions estimated`,
          });
          setEstimating(false);
        }}
      >
        <Field label="Qualification">
          <Select name="rule" value={ruleId} onChange={(e) => setRuleId(e.target.value)}>
            {exemptionRules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.qualification}
              </option>
            ))}
          </Select>
        </Field>
        <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4" aria-live="polite">
          <MicroLabel>Estimated exemptions</MicroLabel>
          {rule.exemptPapers.length ? (
            <ul className="mt-3 divide-y divide-line rounded-[var(--radius-md)] border border-line bg-surface">
              {rule.exemptPapers.map((p) => (
                <li key={p} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <span className="min-w-0 text-[13px]">
                    <span className="font-mono font-semibold text-ink">{p}</span> <span className="text-ink-2">{paperName(p)}</span>
                  </span>
                  <span className="font-mono text-[12.5px] text-ink-2 tnum">{formatGBP(exemptionFeeGBP(p))}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[13px] text-ink-2">No exemptions estimated. You would start at Applied Knowledge.</p>
          )}
          <div className="mt-3 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="text-ink-3">Exemption fees to ACCA</span>
            <span className="font-mono font-semibold text-ink tnum">{formatGBP(ruleFee)}</span>
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">{rule.conditions}</p>
          <p className="mt-2 text-[12px] text-ink-3">
            Rule reviewed {formatAccaDate(rule.lastReviewed)} · {rule.status === "active" ? "active" : "under review"} · awarding body: {rule.body}
          </p>
        </div>
      </FormDrawer>
    </div>
  );
}
