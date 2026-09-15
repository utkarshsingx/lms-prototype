"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, ClipboardCheck, Download, FileSearch, Plus, Scale, Send, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  ACCA_TODAY,
  PAPER_CODES,
  addDays,
  exemptionFeeGBP,
  exemptionRules,
  formatAccaDate,
  formatGBP,
  paperName,
  students as allStudents,
  type DocStatus,
  type ExemptionRecord,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { DocumentReview, type Claim, type ClaimDoc } from "./exemption-documents";
import { GatedButton, MiniLabel, Note, plural, useEditAccess } from "./common";

/* ------------------------------------------------------------------ seed */

type RecMap = Record<string, ExemptionRecord[]>;

const byId = new Map(allStudents.map((s) => [s.id, s]));
const GRADUATES = allStudents.filter((s) => s.type === "graduate");
const SEED_RECORDS: RecMap = Object.fromEntries(allStudents.filter((s) => s.exemptions.length).map((s) => [s.id, s.exemptions]));
const pendingDocCount = (s: Student) =>
  new Set(s.exemptions.flatMap((e) => e.documents.filter((d) => d.status === "pending").map((d) => d.name))).size;
// Claims with the most documents to evaluate first.
const QUEUE_IDS = allStudents
  .filter((s) => ["documents-pending", "under-evaluation", "estimated", "submitted"].includes(s.exemptionClaim.status))
  .sort((a, b) => pendingDocCount(b) - pendingDocCount(a))
  .map((s) => s.id);

const paperOrder = (p: string) => PAPER_CODES.indexOf(p as PaperCode);
const sortPapers = (list: string[]) => [...list].sort((a, b) => paperOrder(a) - paperOrder(b));

function openRecords(records: ExemptionRecord[]) {
  const open = records.filter((r) => r.state === "estimated" || r.state === "submitted");
  return open.length ? open : records;
}

function seedDocs(s: Student): ClaimDoc[] {
  const recs = openRecords(s.exemptions);
  const names: string[] = [];
  for (const r of recs) for (const d of r.documents) if (!names.includes(d.name)) names.push(d.name);
  const firstEstimate = recs[0]?.estimatedOn ?? ACCA_TODAY;
  return names.map((name) => {
    const statuses = recs.flatMap((r) => r.documents.filter((d) => d.name === name).map((d) => d.status));
    const status: DocStatus = statuses.includes("pending")
      ? "pending"
      : statuses.includes("rejected")
        ? "rejected"
        : statuses.includes("missing")
          ? "missing"
          : "verified";
    const lower = name.toLowerCase();
    return {
      name,
      status,
      uploadedOn: status === "pending" ? "2026-09-12" : addDays(firstEstimate, -3),
      pages: lower.includes("degree") ? 1 : lower.includes("mark") ? 6 : 3,
      evaluatedBy: status === "verified" ? "Imran Sheikh" : undefined,
      evaluatedOn: status === "verified" ? addDays(firstEstimate, -1) : undefined,
    };
  });
}

const SEED_DOCS: Record<string, ClaimDoc[]> = Object.fromEntries(QUEUE_IDS.map((id) => [id, seedDocs(byId.get(id)!)]));

function guessRule(s: Student) {
  const q = s.background.qualification.toLowerCase();
  const id = q.includes("m.com")
    ? "ex-mcom-in"
    : q.includes("bba")
      ? "ex-bba-fin"
      : q.includes("ca inter")
        ? "ex-ca-inter"
        : q.includes("b.com")
          ? "ex-bcom-in"
          : "ex-bsc-other";
  return exemptionRules.find((r) => r.id === id) ?? exemptionRules[0];
}

const STATE_TONE: Record<ExemptionRecord["state"], StatusTone> = {
  estimated: "amber",
  submitted: "info",
  approved: "jade",
  rejected: "rose",
};

function PaperChips({ records, strikeRejected = false }: { records: { paper: string; state: ExemptionRecord["state"] }[]; strikeRejected?: boolean }) {
  if (records.length === 0) return <span className="text-[12px] text-ink-3">None</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {records.map((r) => (
        <StatusPill
          key={r.paper}
          status={r.state}
          tone={STATE_TONE[r.state]}
          size="sm"
          dot={false}
          className={cn("font-mono", strikeRejected && r.state === "rejected" && "line-through")}
        >
          {r.paper}
        </StatusPill>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ rows */

type EstimateRow = {
  id: string;
  student: Student;
  records: ExemptionRecord[];
  basis: string;
  estimatedOn: string;
  fees: number;
  docsVerified: number;
  docsTotal: number;
  status: "Estimated" | "Submitted to ACCA" | "Estimated and submitted";
};

type ApprovalRow = {
  id: string;
  student: Student;
  records: ExemptionRecord[];
  outcome: "matches" | "differs" | "awaiting" | "partial";
  outcomeLabel: string;
  submittedOn?: string;
  decidedOn?: string;
};

type PaymentRow = {
  id: string;
  studentId: string;
  name: string;
  paper: PaperCode;
  amount: number;
  status: "paid" | "unpaid" | "awaiting";
  paidOn?: string;
  decidedOn?: string;
};

const OUTCOME_TONE: Record<ApprovalRow["outcome"], StatusTone> = {
  matches: "jade",
  differs: "rose",
  awaiting: "info",
  partial: "amber",
};

/* ------------------------------------------------------------------ page */

export function ExemptionsPage() {
  const { canEdit, reason, persona } = useEditAccess("programme:acca");

  const [tab, setTab] = useState("docs");
  const [records, setRecords] = useState<RecMap>(SEED_RECORDS);
  const [docs, setDocs] = useState<Record<string, ClaimDoc[]>>(SEED_DOCS);
  const [queueSelected, setQueueSelected] = useState(QUEUE_IDS[0] ?? "");

  // Record estimate drawer (controlled so the rule drives the paper checkboxes).
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estStudent, setEstStudent] = useState("s-dev");
  const [estRule, setEstRule] = useState("ex-bcom-in");
  const [estPapers, setEstPapers] = useState<string[]>([]);

  const [deciding, setDeciding] = useState<string | null>(null);
  const [approvalFilter, setApprovalFilter] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [payPaper, setPayPaper] = useState("");

  /* ------------------------------------------------ derived */

  const claims: Claim[] = useMemo(
    () =>
      Object.keys(docs).map((id) => {
        const student = byId.get(id)!;
        const recs = records[id] ?? [];
        const open = recs.filter((r) => r.state === "estimated" || r.state === "submitted");
        const pendingDocs = docs[id].some((d) => d.status !== "verified");
        const stage: Claim["stage"] = open.some((r) => r.state === "estimated")
          ? pendingDocs
            ? "Documents pending"
            : "Estimated"
          : open.some((r) => r.state === "submitted")
            ? "Submitted to ACCA"
            : pendingDocs
              ? "Documents pending"
              : "Decided";
        return { student, papers: sortPapers((open.length ? open : recs).map((r) => r.paper)), docs: docs[id], stage };
      }),
    [docs, records],
  );

  const allRecords = useMemo(
    () => Object.entries(records).flatMap(([sid, recs]) => recs.map((r) => ({ sid, ...r }))),
    [records],
  );

  const kpi = useMemo(
    () => ({
      docsPending: Object.values(docs).flat().filter((d) => d.status === "pending").length,
      estimated: allRecords.filter((r) => r.state === "estimated").length,
      estimatedLearners: new Set(allRecords.filter((r) => r.state === "estimated").map((r) => r.sid)).size,
      submitted: allRecords.filter((r) => r.state === "submitted").length,
      unpaid: allRecords.filter((r) => r.state === "approved" && r.fee.status === "unpaid").reduce((s, r) => s + r.fee.amountGBP, 0),
      unpaidCount: allRecords.filter((r) => r.state === "approved" && r.fee.status === "unpaid").length,
      approved: allRecords.filter((r) => r.state === "approved").length,
      rejected: allRecords.filter((r) => r.state === "rejected").length,
    }),
    [docs, allRecords],
  );

  const estimateRows: EstimateRow[] = useMemo(
    () =>
      Object.entries(records)
        .filter(([, recs]) => recs.some((r) => r.state === "estimated" || r.state === "submitted"))
        .map(([sid, recs]) => {
          const open = recs.filter((r) => r.state === "estimated" || r.state === "submitted");
          const hasEst = open.some((r) => r.state === "estimated");
          const hasSub = open.some((r) => r.state === "submitted");
          const d = docs[sid];
          return {
            id: sid,
            student: byId.get(sid)!,
            records: [...open].sort((a, b) => paperOrder(a.paper) - paperOrder(b.paper)),
            basis: open[0]?.basis ?? "",
            estimatedOn: open.map((r) => r.estimatedOn).sort().at(-1) ?? ACCA_TODAY,
            fees: open.reduce((s, r) => s + r.fee.amountGBP, 0),
            docsVerified: d ? d.filter((x) => x.status === "verified").length : 1,
            docsTotal: d ? d.length : 1,
            status: (hasEst && hasSub ? "Estimated and submitted" : hasEst ? "Estimated" : "Submitted to ACCA") as EstimateRow["status"],
          };
        })
        .sort((a, b) => b.estimatedOn.localeCompare(a.estimatedOn)),
    [records, docs],
  );

  const approvalRows: ApprovalRow[] = useMemo(
    () =>
      Object.entries(records)
        .filter(([, recs]) => recs.some((r) => r.state !== "estimated"))
        .map(([sid, recs]) => {
          const sorted = [...recs].sort((a, b) => paperOrder(a.paper) - paperOrder(b.paper));
          const rejected = sorted.filter((r) => r.state === "rejected").map((r) => r.paper);
          const submitted = sorted.filter((r) => r.state === "submitted").map((r) => r.paper);
          const estOnly = sorted.filter((r) => r.state === "estimated").map((r) => r.paper);
          const outcome: ApprovalRow["outcome"] = submitted.length
            ? "awaiting"
            : rejected.length
              ? "differs"
              : estOnly.length
                ? "partial"
                : "matches";
          return {
            id: sid,
            student: byId.get(sid)!,
            records: sorted,
            outcome,
            outcomeLabel:
              outcome === "awaiting"
                ? "Awaiting ACCA decision"
                : outcome === "differs"
                  ? `${rejected.join(", ")} not approved`
                  : outcome === "partial"
                    ? `${estOnly.join(", ")} not yet submitted`
                    : "Matches estimate",
            submittedOn: sorted.map((r) => r.submittedOn).filter(Boolean).sort().at(-1),
            decidedOn: sorted.map((r) => r.decidedOn).filter(Boolean).sort().at(-1),
          };
        }),
    [records],
  );

  const paymentRows: PaymentRow[] = useMemo(
    () =>
      allRecords
        .filter((r) => r.state === "approved" || r.state === "submitted")
        .map((r) => ({
          id: `${r.sid}-${r.paper}`,
          studentId: r.sid,
          name: byId.get(r.sid)!.name,
          paper: r.paper,
          amount: r.fee.amountGBP,
          status: r.state === "submitted" ? ("awaiting" as const) : r.fee.status === "paid" ? ("paid" as const) : ("unpaid" as const),
          paidOn: r.fee.paidOn,
          decidedOn: r.decidedOn,
        })),
    [allRecords],
  );

  /* ------------------------------------------------ actions */

  const decideDoc = (sid: string, docName: string, status: DocStatus, why?: string) => {
    setDocs((prev) => ({
      ...prev,
      [sid]: prev[sid].map((d) =>
        d.name === docName
          ? { ...d, status, reason: status === "rejected" ? why : undefined, evaluatedBy: persona.name, evaluatedOn: ACCA_TODAY }
          : d,
      ),
    }));
    const name = byId.get(sid)?.name ?? "the learner";
    if (status === "verified") toast({ title: "Document verified", body: `${docName} · ${name}` });
    else toast({ title: `Re-upload requested from ${name}`, body: `${docName}: ${why}`, tone: "warning" });
  };

  const resetDoc = (sid: string, docName: string) => {
    setDocs((prev) => ({
      ...prev,
      [sid]: prev[sid].map((d) => (d.name === docName ? { ...d, status: "pending", reason: undefined, evaluatedBy: undefined } : d)),
    }));
    toast({ title: "Evaluation reopened", body: `${docName} · ${byId.get(sid)?.name}`, tone: "info" });
  };

  const lockedPapers = (sid: string) =>
    (records[sid] ?? []).filter((r) => r.state !== "estimated").map((r) => r.paper as string);

  const openEstimate = (sid?: string, ruleId?: string) => {
    const student = byId.get(sid ?? estStudent) ?? GRADUATES[0];
    const rule = exemptionRules.find((r) => r.id === ruleId) ?? guessRule(student);
    const locked = lockedPapers(student.id);
    const current = (records[student.id] ?? []).filter((r) => r.state === "estimated").map((r) => r.paper as string);
    setEstStudent(student.id);
    setEstRule(rule.id);
    setEstPapers(current.length ? current : rule.exemptPapers.filter((p) => !locked.includes(p)));
    setEstimateOpen(true);
    setTab("estimate");
  };

  const submitToAcca = (row: EstimateRow) => {
    const papers = row.records.filter((r) => r.state === "estimated").map((r) => r.paper);
    setRecords((prev) => ({
      ...prev,
      [row.id]: prev[row.id].map((r) =>
        r.state === "estimated" ? { ...r, state: "submitted", submittedOn: ACCA_TODAY, fee: { ...r.fee, status: "unpaid" } } : r,
      ),
    }));
    toast({ title: "Submitted to ACCA", body: `${row.student.name} · ${papers.join(", ")}` });
  };

  const markPaid = (ids: string[]) => {
    const target = paymentRows.filter((p) => ids.includes(p.id) && p.status === "unpaid");
    if (target.length === 0) {
      toast({ title: "Nothing to record", body: "Only approved, unpaid exemption fees can be marked paid.", tone: "info" });
      return;
    }
    setRecords((prev) => {
      const next = { ...prev };
      for (const t of target) {
        next[t.studentId] = next[t.studentId].map((r) =>
          r.paper === t.paper ? { ...r, fee: { ...r.fee, status: "paid", paidOn: ACCA_TODAY } } : r,
        );
      }
      return next;
    });
    toast({
      title: `${plural(target.length, "exemption fee")} recorded as paid`,
      body: `${formatGBP(target.reduce((s, t) => s + t.amount, 0))} paid to ACCA · recorded ${formatAccaDate(ACCA_TODAY)}`,
    });
  };

  /* ------------------------------------------------ columns */

  const estimateColumns: DataTableColumn<EstimateRow>[] = [
    {
      key: "student",
      header: "Learner",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">{r.student.background.qualification} · {r.student.background.institution}</span>
        </span>
      ),
    },
    { key: "papers", header: "Papers", render: (r) => <PaperChips records={r.records} /> },
    { key: "estimatedOn", header: "Estimated on", sortable: true, render: (r) => formatAccaDate(r.estimatedOn) },
    {
      key: "docs",
      header: "Documents",
      render: (r) => (
        <StatusPill status="docs" tone={r.docsVerified === r.docsTotal ? "jade" : "amber"} size="sm">
          {r.docsVerified === r.docsTotal ? "All verified" : `${r.docsVerified} of ${r.docsTotal} verified`}
        </StatusPill>
      ),
    },
    { key: "fees", header: "Fees if approved", align: "right", mono: true, render: (r) => formatGBP(r.fees) },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} tone={r.status === "Submitted to ACCA" ? "info" : "amber"} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => {
        const hasEst = r.records.some((x) => x.state === "estimated");
        const docsReady = r.docsVerified === r.docsTotal;
        return (
          <span className="flex justify-end gap-1.5">
            <GatedButton size="xs" variant="outline" allowed={canEdit} reason={reason} disabled={!hasEst} onClick={() => openEstimate(r.id)}>
              Edit
            </GatedButton>
            <span title={canEdit && hasEst && !docsReady ? "Verify every document before submitting to ACCA" : undefined} className="inline-flex">
              <GatedButton
                size="xs"
                variant="secondary"
                allowed={canEdit}
                reason={reason}
                disabled={!hasEst || !docsReady}
                onClick={() => submitToAcca(r)}
              >
                <Send className="size-3" /> Submit to ACCA
              </GatedButton>
            </span>
          </span>
        );
      },
    },
  ];

  const approvalVisible = approvalFilter ? approvalRows.filter((r) => r.outcome === approvalFilter) : approvalRows;

  const approvalColumns: DataTableColumn<ApprovalRow>[] = [
    {
      key: "student",
      header: "Learner",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">{r.student.accaId ? `ACCA ID ${r.student.accaId}` : "ACCA ID pending"}</span>
        </span>
      ),
    },
    {
      key: "estimated",
      header: "Estimated by ZSkillup",
      render: (r) => <PaperChips records={r.records.map((x) => ({ paper: x.paper, state: "estimated" as const }))} />,
    },
    {
      key: "approved",
      header: "ACCA decision",
      render: (r) => <PaperChips records={r.records.filter((x) => x.state !== "estimated")} strikeRejected />,
    },
    {
      key: "outcome",
      header: "Estimated vs approved",
      sortable: true,
      sortValue: (r) => ["differs", "awaiting", "partial", "matches"].indexOf(r.outcome),
      render: (r) => <StatusPill status={r.outcome} tone={OUTCOME_TONE[r.outcome]}>{r.outcomeLabel}</StatusPill>,
    },
    { key: "submittedOn", header: "Submitted", sortable: true, render: (r) => (r.submittedOn ? formatAccaDate(r.submittedOn) : null) },
    { key: "decidedOn", header: "Decided", sortable: true, render: (r) => (r.decidedOn ? formatAccaDate(r.decidedOn) : null) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        r.outcome === "awaiting" ? (
          <GatedButton size="xs" variant="secondary" allowed={canEdit} reason={reason} onClick={() => setDeciding(r.id)}>
            Record ACCA decision
          </GatedButton>
        ) : null,
    },
  ];

  const paymentVisible = paymentRows.filter((p) => (!payStatus || p.status === payStatus) && (!payPaper || p.paper === payPaper));

  const paymentColumns: DataTableColumn<PaymentRow>[] = [
    { key: "name", header: "Learner", sortable: true, className: "font-semibold" },
    {
      key: "paper",
      header: "Exempt paper",
      sortable: true,
      sortValue: (p) => paperOrder(p.paper),
      render: (p) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">{p.paper}</span>
          <span className="text-ink-3">{paperName(p.paper)}</span>
        </span>
      ),
    },
    { key: "amount", header: "Exemption fee", align: "right", mono: true, sortable: true, render: (p) => formatGBP(p.amount) },
    {
      key: "status",
      header: "Payment",
      sortable: true,
      sortValue: (p) => ["unpaid", "awaiting", "paid"].indexOf(p.status),
      render: (p) =>
        p.status === "paid" ? (
          <StatusPill status="Paid" />
        ) : p.status === "unpaid" ? (
          <StatusPill status="Unpaid" />
        ) : (
          <StatusPill status="awaiting" tone="neutral">
            Due after ACCA decision
          </StatusPill>
        ),
    },
    {
      key: "paidOn",
      header: "Paid to ACCA on",
      sortable: true,
      render: (p) => (p.paidOn ? formatAccaDate(p.paidOn) : null),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (p) =>
        p.status === "unpaid" ? (
          <span className="flex justify-end gap-1.5">
            <GatedButton
              size="xs"
              variant="outline"
              allowed={canEdit}
              reason={reason}
              onClick={() => toast({ title: `Payment reminder sent to ${p.name}`, body: `${p.paper} exemption fee ${formatGBP(p.amount)} · pay in myACCA` })}
            >
              Remind
            </GatedButton>
            <GatedButton size="xs" variant="secondary" allowed={canEdit} reason={reason} onClick={() => markPaid([p.id])}>
              Mark paid
            </GatedButton>
          </span>
        ) : null,
    },
  ];

  /* ------------------------------------------------ drawers' derived values */

  const estStudentRecord = byId.get(estStudent) ?? GRADUATES[0];
  const rule = exemptionRules.find((r) => r.id === estRule) ?? exemptionRules[0];
  const locked = lockedPapers(estStudentRecord.id);
  const estFees = estPapers.reduce((s, p) => s + exemptionFeeGBP(p as PaperCode), 0);
  const decidingRecords = deciding ? (records[deciding] ?? []).filter((r) => r.state === "submitted") : [];

  const tabs = [
    { id: "docs", label: "Evaluate exemption documents", count: kpi.docsPending },
    { id: "estimate", label: "Record estimated exemptions", count: kpi.estimated },
    { id: "approved", label: "Track ACCA-approved exemptions", count: kpi.submitted },
    { id: "payments", label: "Track exemption payments", count: kpi.unpaidCount },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="ACCA operations"
        title="Exemptions"
        sub="Evaluate qualification documents, record the ZSkillup estimate, then track ACCA's decision and the exemption fee each learner pays to ACCA."
        badge={canEdit ? undefined : <ViewOnlyChip />}
        actions={
          <>
            <Button variant="outline" onClick={() => toast({ title: "Report queued: exemption-claims.csv", tone: "info" })}>
              <Download className="size-4" /> Export
            </Button>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => openEstimate()}>
              <Plus className="size-4" /> Record estimate
            </GatedButton>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Documents to evaluate" value={kpi.docsPending} tone="amber" icon={<FileSearch />} sub={`${plural(claims.length, "open claim")}`} />
        <KpiTile
          hero
          label="Estimated, not yet submitted"
          value={plural(kpi.estimated, "paper")}
          icon={<ClipboardCheck />}
          sub={`across ${plural(kpi.estimatedLearners, "learner")}`}
        />
        <KpiTile label="Submitted to ACCA" value={plural(kpi.submitted, "paper")} tone="info" icon={<Scale />} sub="awaiting ACCA decision" />
        <KpiTile
          label="Exemption fees unpaid"
          value={formatGBP(kpi.unpaid)}
          tone="rose"
          icon={<Wallet />}
          sub={`${plural(kpi.unpaidCount, "approved paper")} · paid to ACCA`}
        />
      </KpiRow>

      <div className="space-y-5">
        <Tabs items={tabs} value={tab} onChange={setTab} />

        {tab === "docs" ? (
          <DocumentReview
            claims={claims}
            selectedId={queueSelected}
            onSelect={setQueueSelected}
            onDecide={decideDoc}
            onReset={resetDoc}
            onRecordEstimate={(sid) => openEstimate(sid)}
            canEdit={canEdit}
            reason={reason}
          />
        ) : null}

        {tab === "estimate" ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="min-w-0 space-y-3">
              <Note icon={<ClipboardCheck />}>
                An estimate is ZSkillup&apos;s view of the exemptions a qualification should earn. ACCA confirms each paper after the
                claim is submitted, and charges an exemption fee per exempt paper.
              </Note>
              <DataTable
                caption="Estimated exemptions"
                rows={estimateRows}
                columns={estimateColumns}
                getRowId={(r) => r.id}
                toolbar={
                  <GatedButton size="sm" allowed={canEdit} reason={reason} onClick={() => openEstimate()}>
                    <Plus className="size-4" /> Record estimate
                  </GatedButton>
                }
                search={{ placeholder: "Search learner", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
              />
            </div>
            <Card className="min-w-0 self-start">
              <CardHeader title="Exemption rules" sub="Set by the ZSkillup Super Admin. Pick one to prefill the paper checkboxes." />
              <ul className="divide-y divide-line border-t border-line">
                {exemptionRules.map((r) => (
                  <li key={r.id} className="space-y-1.5 px-5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 text-[13px] font-semibold text-ink">{r.qualification}</p>
                      {r.status === "under-review" ? <StatusPill status="Under review" size="sm" /> : null}
                    </div>
                    <p className="font-mono text-[12px] text-ink-2">{r.exemptPapers.length ? r.exemptPapers.join(" · ") : "No exemptions"}</p>
                    <p className="text-[12px] leading-snug text-ink-3">{r.conditions}</p>
                    <GatedButton size="xs" variant="ghost" allowed={canEdit} reason={reason} className="-ml-2.5" onClick={() => openEstimate(undefined, r.id)}>
                      Use this rule
                    </GatedButton>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ) : null}

        {tab === "approved" ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <MiniLabel>Approved by ACCA</MiniLabel>
                <p className="mt-2 font-display text-[26px] leading-none font-bold text-ink tnum">{kpi.approved}</p>
                <p className="mt-1 text-[12px] text-ink-3">exempt papers confirmed</p>
              </Card>
              <Card className="p-4">
                <MiniLabel>Not approved</MiniLabel>
                <p className="mt-2 font-display text-[26px] leading-none font-bold text-ink tnum">{kpi.rejected}</p>
                <p className="mt-1 text-[12px] text-ink-3">estimate differed from ACCA</p>
              </Card>
              <Card className="p-4">
                <MiniLabel>Estimate accuracy</MiniLabel>
                <p className="mt-2 font-display text-[26px] leading-none font-bold text-ink tnum">
                  {kpi.approved + kpi.rejected ? Math.round((kpi.approved / (kpi.approved + kpi.rejected)) * 100) : 0}%
                </p>
                <p className="mt-1 text-[12px] text-ink-3">of decided papers approved as estimated</p>
              </Card>
            </div>
            <DataTable
              caption="ACCA-approved exemptions"
              rows={approvalVisible}
              columns={approvalColumns}
              getRowId={(r) => r.id}
              initialSort={{ key: "outcome", dir: "asc" }}
              search={{ placeholder: "Search learner or ACCA ID", match: (r, q) => r.student.name.toLowerCase().includes(q) || (r.student.accaId ?? "").includes(q) }}
              filters={
                <FilterSelect
                  label="Outcome"
                  value={approvalFilter}
                  onChange={setApprovalFilter}
                  allLabel="All"
                  options={[
                    { value: "differs", label: "Differs from estimate" },
                    { value: "awaiting", label: "Awaiting ACCA decision" },
                    { value: "partial", label: "Not yet submitted" },
                    { value: "matches", label: "Matches estimate" },
                  ]}
                />
              }
            />
          </div>
        ) : null}

        {tab === "payments" ? (
          <div className="space-y-3">
            <Note icon={<Wallet />}>
              Exemption fees are paid by the learner to ACCA for each exempt paper ({formatGBP(exemptionFeeGBP("BT"))} Applied Knowledge,{" "}
              {formatGBP(exemptionFeeGBP("LW"))} Applied Skills). They are recorded here for tracking, not collected by ZSkillup.
            </Note>
            <DataTable
              caption="Exemption payments"
              rows={paymentVisible}
              columns={paymentColumns}
              getRowId={(p) => p.id}
              initialSort={{ key: "status", dir: "asc" }}
              search={{ placeholder: "Search learner", match: (p, q) => p.name.toLowerCase().includes(q) }}
              filters={
                <FilterBar
                  active={Boolean(payStatus || payPaper)}
                  onClear={() => {
                    setPayStatus("");
                    setPayPaper("");
                  }}
                >
                  <FilterSelect
                    label="Payment"
                    value={payStatus}
                    onChange={setPayStatus}
                    allLabel="All"
                    options={[
                      { value: "unpaid", label: "Unpaid" },
                      { value: "awaiting", label: "Due after ACCA decision" },
                      { value: "paid", label: "Paid" },
                    ]}
                  />
                  <FilterSelect label="Paper" value={payPaper} onChange={setPayPaper} allLabel="All" options={["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"]} />
                </FilterBar>
              }
              selectable
              bulkActions={(ids, clear) => (
                <>
                  <GatedButton
                    size="sm"
                    allowed={canEdit}
                    reason={reason}
                    onClick={() => {
                      const unpaid = paymentRows.filter((p) => ids.includes(p.id) && p.status === "unpaid");
                      toast({
                        title: `Payment reminder sent to ${plural(new Set(unpaid.map((p) => p.studentId)).size, "learner")}`,
                        body: unpaid.length ? `${plural(unpaid.length, "unpaid exemption fee")} · email and WhatsApp` : "No unpaid fees in the selection.",
                        tone: unpaid.length ? "success" : "info",
                      });
                      clear();
                    }}
                  >
                    <Send className="size-3.5" /> Send reminder
                  </GatedButton>
                  <GatedButton
                    size="sm"
                    variant="inverse"
                    allowed={canEdit}
                    reason={reason}
                    onClick={() => {
                      markPaid(ids);
                      clear();
                    }}
                  >
                    <BadgeCheck className="size-3.5" /> Mark paid
                  </GatedButton>
                </>
              )}
            />
          </div>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- record estimate */}
      <FormDrawer
        open={estimateOpen}
        onClose={() => setEstimateOpen(false)}
        title="Record estimated exemptions"
        sub="Estimated by ZSkillup from the qualification documents. ACCA confirms each paper later."
        submitLabel="Record estimate"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={(data) => {
          if (estPapers.length === 0) {
            toast({ title: "Choose at least one paper", tone: "warning" });
            return;
          }
          const note = String(data.get("note") ?? "").trim() || undefined;
          const docsFor = (docs[estStudentRecord.id] ?? [{ name: "Degree certificate", status: "verified" as DocStatus }]).map((d) => ({
            name: d.name,
            status: d.status,
          }));
          setRecords((prev) => {
            const kept = (prev[estStudentRecord.id] ?? []).filter((r) => r.state !== "estimated");
            const added: ExemptionRecord[] = estPapers
              .filter((p) => !kept.some((k) => k.paper === p))
              .map((p) => ({
                paper: p as PaperCode,
                state: "estimated",
                estimatedOn: ACCA_TODAY,
                basis: rule.qualification,
                fee: { status: "not-due", amountGBP: exemptionFeeGBP(p as PaperCode) },
                documents: docsFor,
                note,
              }));
            return { ...prev, [estStudentRecord.id]: [...kept, ...added] };
          });
          toast({ title: "Estimated exemptions recorded", body: `${estStudentRecord.name} · ${sortPapers(estPapers).join(", ")}` });
          setEstimateOpen(false);
        }}
      >
        <Field label="Learner">
          <Select
            value={estStudent}
            onChange={(e) => {
              const s = byId.get(e.target.value)!;
              const r = guessRule(s);
              const lockedNow = lockedPapers(s.id);
              const current = (records[s.id] ?? []).filter((x) => x.state === "estimated").map((x) => x.paper as string);
              setEstStudent(s.id);
              setEstRule(r.id);
              setEstPapers(current.length ? current : r.exemptPapers.filter((p) => !lockedNow.includes(p)));
            }}
          >
            {GRADUATES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.background.qualification}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Exemption rule" hint={rule.status === "under-review" ? "Rule under review" : undefined}>
          <Select
            value={estRule}
            onChange={(e) => {
              const r = exemptionRules.find((x) => x.id === e.target.value)!;
              setEstRule(r.id);
              setEstPapers(r.exemptPapers.filter((p) => !locked.includes(p)));
            }}
          >
            {exemptionRules.map((r) => (
              <option key={r.id} value={r.id}>
                {r.qualification}
              </option>
            ))}
          </Select>
        </Field>
        <p className="-mt-2 text-[12px] leading-snug text-ink-3">{rule.conditions}</p>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Papers estimated exempt</legend>
          {rule.exemptPapers.length === 0 ? (
            <p className="text-[13px] text-ink-3">This rule estimates no exemptions. The learner starts at Applied Knowledge.</p>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {rule.exemptPapers.map((p) => {
                const isLocked = locked.includes(p);
                return (
                  <Checkbox
                    key={`${estStudent}-${estRule}-${p}`}
                    checked={estPapers.includes(p)}
                    disabled={isLocked}
                    onChange={(e) =>
                      setEstPapers((list) => (e.target.checked ? [...list, p] : list.filter((x) => x !== p)))
                    }
                    label={
                      <span>
                        <span className="font-mono font-semibold text-ink">{p}</span> · {paperName(p)}
                        {isLocked ? <span className="block text-[11.5px] text-ink-3">Already with ACCA or decided</span> : null}
                      </span>
                    }
                  />
                );
              })}
            </div>
          )}
        </fieldset>
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5">
          <span className="text-[12.5px] text-ink-2">Exemption fees if ACCA approves · paid to ACCA</span>
          <span className="font-mono text-[14px] font-semibold text-ink tnum">{formatGBP(estFees)}</span>
        </div>
        <Field label="Evaluator note" hint="Optional">
          <Textarea name="note" rows={3} placeholder="e.g. LW estimated: the B.Com syllabus includes company law and contract law." />
        </Field>
      </FormDrawer>

      {/* ---------------------------------------------------------- record ACCA decision */}
      <FormDrawer
        open={deciding !== null}
        onClose={() => setDeciding(null)}
        title="Record ACCA decision"
        sub={deciding ? `${byId.get(deciding)?.name} · submitted ${decidingRecords[0]?.submittedOn ? formatAccaDate(decidingRecords[0].submittedOn) : ""}` : undefined}
        submitLabel="Save decision"
        disabled={!canEdit}
        disabledReason={reason}
        footerNote="Approved papers become due for the ACCA exemption fee."
        onSubmit={(data) => {
          if (!deciding) return;
          const decidedOn = String(data.get("decidedOn") || ACCA_TODAY);
          const outcomes = new Map(decidingRecords.map((r) => [r.paper, String(data.get(`decision-${r.paper}`))]));
          setRecords((prev) => ({
            ...prev,
            [deciding]: prev[deciding].map((r) =>
              outcomes.has(r.paper)
                ? outcomes.get(r.paper) === "approved"
                  ? { ...r, state: "approved", decidedOn, fee: { status: "unpaid", amountGBP: r.fee.amountGBP } }
                  : { ...r, state: "rejected", decidedOn, fee: { status: "not-due", amountGBP: r.fee.amountGBP } }
                : r,
            ),
          }));
          const approved = [...outcomes].filter(([, v]) => v === "approved").map(([p]) => p);
          const rejected = [...outcomes].filter(([, v]) => v !== "approved").map(([p]) => p);
          toast({
            title: "ACCA decision recorded",
            body: `${byId.get(deciding)?.name} · approved ${approved.join(", ") || "none"}${rejected.length ? ` · not approved ${rejected.join(", ")}` : ""}`,
          });
          setDeciding(null);
        }}
      >
        {decidingRecords.map((r) => (
          <Field key={`${deciding}-${r.paper}`} label={`${r.paper} · ${paperName(r.paper)}`} hint={formatGBP(r.fee.amountGBP)}>
            <Select name={`decision-${r.paper}`} defaultValue="approved">
              <option value="approved">Approved by ACCA</option>
              <option value="rejected">Not approved</option>
            </Select>
          </Field>
        ))}
        <Field label="Decision date">
          <Input type="date" name="decidedOn" defaultValue={ACCA_TODAY} />
        </Field>
      </FormDrawer>
    </div>
  );
}
