"use client";

import { useState } from "react";
import { ArrowRight, BadgePoundSterling, CheckCheck, Link2, Plus, RotateCcw, Scale, Search } from "lucide-react";
import {
  ACCA_TODAY,
  PAPER_CODES,
  accaFeesGBP,
  accaPayments,
  daysBetween,
  examFeeGBP,
  exemptionFeeGBP,
  formatAccaDate,
  formatGBP,
  formatINR,
  payments as allPayments,
  reconciliationRows,
  refunds as seedRefunds,
  staffName,
  studentName,
  students,
  type PaperCode,
  type Payment,
  type PaymentKind,
  type ReconciliationRow,
  type Refund,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { RestrictedNotice } from "@/components/ui/restricted";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { PAYMENT_KIND_LABELS, recorderLabel } from "./finance-helpers";
import { FinanceScopeNote } from "./scope-note";

const LOCKED = "Needs the finance:record permission";
const ACCA_KINDS: PaymentKind[] = ["acca-registration", "acca-subscription", "acca-exemption", "acca-exam"];
const REFUND_STAGES: { id: Refund["status"]; label: string }[] = [
  { id: "requested", label: "Requested" },
  { id: "approved", label: "Approved" },
  { id: "processed", label: "Processed" },
  { id: "rejected", label: "Rejected" },
];
const LEARNERS = [...students].sort((a, b) => a.name.localeCompare(b.name));
const paymentById = (id?: string) => (id ? allPayments.find((p) => p.id === id) : undefined);

export function ReconciliationPage() {
  const { can } = useRole();
  if (!can("finance:view")) {
    return (
      <div className="mx-auto max-w-[86rem] py-4">
        <RestrictedNotice permission="finance:view" />
      </div>
    );
  }
  return <ReconciliationWorkspace />;
}

function AccaPaymentFields() {
  const [kind, setKind] = useState<PaymentKind>("acca-exam");
  const [paper, setPaper] = useState<PaperCode>("FR");
  const [entry, setEntry] = useState<"early" | "standard" | "late" | "on-demand">("early");
  const suggested =
    kind === "acca-registration"
      ? accaFeesGBP.registration
      : kind === "acca-subscription"
        ? accaFeesGBP.annualSubscription
        : kind === "acca-exemption"
          ? exemptionFeeGBP(paper)
          : examFeeGBP(paper, entry);
  const needsPaper = kind === "acca-exemption" || kind === "acca-exam";
  return (
    <>
      <Field label="Learner">
        <Select name="student" defaultValue="s-anaya">
          {LEARNERS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.accaId ? ` · ACCA ID ${s.accaId}` : " · not registered"}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Paid to ACCA for">
        <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as PaymentKind)}>
          {ACCA_KINDS.map((k) => (
            <option key={k} value={k}>
              {PAYMENT_KIND_LABELS[k]}
            </option>
          ))}
        </Select>
      </Field>
      {needsPaper ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select name="paper" value={paper} onChange={(e) => setPaper(e.target.value as PaperCode)}>
              {PAPER_CODES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          {kind === "acca-exam" ? (
            <Field label="Entry window">
              <Select name="entry" value={entry} onChange={(e) => setEntry(e.target.value as typeof entry)}>
                <option value="early">Early</option>
                <option value="standard">Standard</option>
                <option value="late">Late</option>
                <option value="on-demand">On-demand CBE</option>
              </Select>
            </Field>
          ) : null}
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount paid (£)" hint={`ACCA fee ${formatGBP(suggested)}`}>
          <Input key={`${kind}-${paper}-${entry}`} name="amount" type="number" min={1} required defaultValue={suggested} className="font-mono" />
        </Field>
        <Field label="Paid on">
          <Input name="date" type="date" required defaultValue={ACCA_TODAY} max={ACCA_TODAY} />
        </Field>
      </div>
      <Field label="ACCA reference">
        <Input name="reference" required placeholder="From the learner's myACCA receipt" className="font-mono" />
      </Field>
      <p className="text-[12px] text-ink-3">Recorded for tracking only. The learner pays ACCA directly, and no ZSkillup receipt is issued.</p>
    </>
  );
}

function ReconciliationWorkspace() {
  const { can, persona } = useRole();
  const canRecord = can("finance:record");

  const [tab, setTab] = useState("reconcile");
  const [lines, setLines] = useState<ReconciliationRow[]>(reconciliationRows);
  const [refundList, setRefundList] = useState<Refund[]>(seedRefunds);
  const [refundRefs, setRefundRefs] = useState<Record<string, string>>({});
  const [acca, setAcca] = useState<Payment[]>(accaPayments);

  const [lineStatus, setLineStatus] = useState("");
  const [lineSource, setLineSource] = useState("");
  const [refundStatus, setRefundStatus] = useState("");
  const [accaKind, setAccaKind] = useState("");
  const [accaPaper, setAccaPaper] = useState("");
  const [accaYear, setAccaYear] = useState("2026");

  const [matching, setMatching] = useState<ReconciliationRow | null>(null);
  const [processing, setProcessing] = useState<Refund | null>(null);
  const [rejecting, setRejecting] = useState<Refund | null>(null);
  const [logRefund, setLogRefund] = useState(false);
  const [recordAcca, setRecordAcca] = useState(false);

  const unreconciled = lines.filter((l) => l.status !== "matched");
  const matchedTotal = lines.filter((l) => l.status === "matched").reduce((s, l) => s + (paymentById(l.matchedPaymentId)?.amount ?? l.amount), 0);
  const lineTotal = lines.reduce((s, l) => s + l.amount, 0);
  const openRefunds = refundList.filter((r) => r.status === "requested" || r.status === "approved");
  const acca2026 = acca.filter((p) => p.date >= "2026-01-01");
  const sources = [...new Set(lines.map((l) => l.source))];

  const markInvestigating = (l: ReconciliationRow) => {
    setLines((list) => list.map((x) => (x.id === l.id ? { ...x, status: "investigating", note: `${x.note}. Investigation opened by ${persona.name}` } : x)));
    toast({ title: `${l.id} under investigation`, body: `${l.reference} · ${formatINR(l.amount)}`, tone: "warning" });
  };

  const approveRefund = (r: Refund) => {
    setRefundList((list) => list.map((x) => (x.id === r.id ? { ...x, status: "approved", approverId: persona.staffId ?? "st-priya" } : x)));
    toast({ title: `${r.id} approved`, body: `${formatINR(r.amount)} to ${studentName(r.studentId)} · ready to process` });
  };

  /* -------------------------------------------------------------- columns */

  const lineColumns: DataTableColumn<ReconciliationRow>[] = [
    {
      key: "id",
      header: "Line",
      sortable: true,
      render: (l) => (
        <span className="block">
          <span className="block font-mono text-[12px] text-ink">{l.id}</span>
          <span className="block text-[12px] text-ink-3">{formatAccaDate(l.date)}</span>
        </span>
      ),
    },
    { key: "source", header: "Source", sortable: true, render: (l) => <span className="text-ink-2">{l.source}</span> },
    { key: "reference", header: "Reference", mono: true },
    { key: "amount", header: "Settlement", align: "right", mono: true, sortable: true, render: (l) => formatINR(l.amount) },
    {
      key: "recorded",
      header: "Recorded payment",
      render: (l) => {
        const p = paymentById(l.matchedPaymentId);
        if (!p) return <span className="text-ink-3">No recorded payment</span>;
        return (
          <span className="block">
            <span className="block font-medium text-ink">
              <span className="font-mono text-[12px]">{p.id}</span> · {studentName(p.studentId)}
            </span>
            <span className="block text-[12px] text-ink-3">
              {formatINR(p.amount)} · {p.method} · {p.status}
            </span>
          </span>
        );
      },
    },
    {
      key: "difference",
      header: "Difference",
      align: "right",
      render: (l) => {
        const p = paymentById(l.matchedPaymentId);
        if (!p) return <span className="font-mono text-[12px] font-semibold text-rose tnum">{formatINR(l.amount)}</span>;
        const diff = l.amount - p.amount;
        return diff === 0 ? (
          <span className="font-mono text-[12px] text-jade tnum">None</span>
        ) : (
          <span className="font-mono text-[12px] font-semibold text-rose tnum">{formatINR(diff)}</span>
        );
      },
    },
    { key: "status", header: "Status", sortable: true, render: (l) => <StatusPill status={l.status} size="sm" /> },
    { key: "note", header: "Note", wrap: true, className: "min-w-64 max-w-[22rem]", render: (l) => <span className="text-[12.5px] text-ink-2">{l.note}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (l) =>
        l.status === "matched" ? (
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-jade">
            <CheckCheck className="size-3.5" /> Reconciled
          </span>
        ) : (
          <span title={canRecord ? undefined : LOCKED} className="inline-flex gap-1.5">
            <Button size="xs" disabled={!canRecord} onClick={() => setMatching(l)}>
              <Link2 className="size-3.5" /> Mark matched
            </Button>
            {l.status === "unmatched" ? (
              <Button size="xs" variant="outline" disabled={!canRecord} onClick={() => markInvestigating(l)}>
                <Search className="size-3.5" /> Investigate
              </Button>
            ) : null}
          </span>
        ),
    },
  ];

  const refundColumns: DataTableColumn<Refund>[] = [
    {
      key: "id",
      header: "Refund",
      sortable: true,
      render: (r) => (
        <span className="block">
          <span className="block font-mono text-[12px] text-ink">{r.id}</span>
          <span className="block text-[12px] text-ink-3">Requested {formatAccaDate(r.requestedOn)}</span>
        </span>
      ),
    },
    { key: "learner", header: "Learner", sortable: true, sortValue: (r) => studentName(r.studentId), render: (r) => <span className="font-medium">{studentName(r.studentId)}</span> },
    { key: "amount", header: "Amount", align: "right", mono: true, sortable: true, render: (r) => formatINR(r.amount) },
    { key: "reason", header: "Reason", wrap: true, className: "min-w-72 max-w-[26rem]", render: (r) => <span className="text-[12.5px] text-ink-2">{r.reason}</span> },
    {
      key: "status",
      header: "Stage",
      sortable: true,
      sortValue: (r) => REFUND_STAGES.findIndex((s) => s.id === r.status),
      render: (r) => <StatusPill status={r.status} size="sm" />,
    },
    { key: "approver", header: "Approved by", render: (r) => (r.approverId ? staffName(r.approverId) : <span className="text-ink-3">Awaiting approval</span>) },
    {
      key: "processedOn",
      header: "Processed",
      render: (r) =>
        r.processedOn ? (
          <span className="block">
            <span className="block">{formatAccaDate(r.processedOn)}</span>
            {refundRefs[r.id] ? <span className="block font-mono text-[11.5px] text-ink-3">{refundRefs[r.id]}</span> : null}
          </span>
        ) : (
          <span className="text-ink-3">Not yet</span>
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        r.status === "requested" ? (
          <span title={canRecord ? undefined : LOCKED} className="inline-flex gap-1.5">
            <Button size="xs" disabled={!canRecord} onClick={() => approveRefund(r)}>
              Approve
            </Button>
            <Button size="xs" variant="outline" disabled={!canRecord} onClick={() => setRejecting(r)}>
              Reject
            </Button>
          </span>
        ) : r.status === "approved" ? (
          <span title={canRecord ? undefined : LOCKED} className="inline-flex">
            <Button size="xs" variant="secondary" disabled={!canRecord} onClick={() => setProcessing(r)}>
              Mark processed
            </Button>
          </span>
        ) : (
          <span className="text-[12px] text-ink-3">Closed</span>
        ),
    },
  ];

  const accaColumns: DataTableColumn<Payment>[] = [
    {
      key: "id",
      header: "Payment",
      sortable: true,
      sortValue: (p) => p.date,
      render: (p) => (
        <span className="block">
          <span className="block font-mono text-[12px] text-ink">{p.id}</span>
          <span className="block text-[12px] text-ink-3">{formatAccaDate(p.date)}</span>
        </span>
      ),
    },
    { key: "learner", header: "Learner", sortable: true, sortValue: (p) => studentName(p.studentId), render: (p) => <span className="font-medium">{studentName(p.studentId)}</span> },
    { key: "kind", header: "Type", sortable: true, render: (p) => <Badge>{PAYMENT_KIND_LABELS[p.kind]}</Badge> },
    { key: "description", header: "Description", className: "max-w-[20rem]", render: (p) => <span className="block truncate text-ink-2">{p.description}</span> },
    { key: "paper", header: "Paper", mono: true, sortable: true },
    { key: "amount", header: "Amount", align: "right", mono: true, sortable: true, render: (p) => formatGBP(p.amount) },
    { key: "paidTo", header: "Paid to", render: () => <Badge tone="dark">ACCA</Badge> },
    { key: "reference", header: "Reference", mono: true },
    { key: "recordedBy", header: "Recorded by", render: (p) => <span className="text-ink-2">{recorderLabel(p.recordedBy)}</span> },
    { key: "status", header: "Status", render: () => <StatusPill status="recorded" tone="jade" size="sm">Recorded</StatusPill> },
  ];

  const lineRows = lines.filter((l) => (!lineStatus || l.status === lineStatus) && (!lineSource || l.source === lineSource));
  const refundRows = refundList.filter((r) => !refundStatus || r.status === refundStatus);
  const accaRows = acca.filter(
    (p) => (!accaKind || p.kind === accaKind) && (!accaPaper || p.paper === accaPaper) && (!accaYear || p.date.startsWith(accaYear)),
  );

  const candidates = matching
    ? allPayments
        .filter((p) => p.paidTo === "ZSkillup" && p.currency === "INR" && p.amount === matching.amount && p.status !== "failed")
        .sort((a, b) => Math.abs(daysBetween(a.date, matching.date)) - Math.abs(daysBetween(b.date, matching.date)))
        .slice(0, 8)
    : [];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Finance"
        title="Reconciliation & refunds"
        sub="Reconcile gateway settlements and bank lines against recorded payments, track refunds, and track ACCA-related payments."
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: "Report queued: reconciliation-sep-2026.csv", body: `${lines.length} lines, ${unreconciled.length} not yet matched`, tone: "info" })}>
              <Scale className="size-4" /> Export reconciliation
            </Button>
            <span title={canRecord ? undefined : LOCKED} className="inline-flex">
              <Button
                disabled={!canRecord}
                onClick={() => {
                  setTab("refunds");
                  setLogRefund(true);
                }}
              >
                <Plus className="size-4" /> Log refund request
              </Button>
            </span>
          </>
        }
      />

      <FinanceScopeNote>Fees paid to ACCA are recorded here for tracking. They are paid by the learner to ACCA and are never counted as ZSkillup revenue.</FinanceScopeNote>

      <KpiRow cols={4}>
        <KpiTile hero label="Lines to reconcile" value={unreconciled.length} icon={<Scale />} sub={`${formatINR(unreconciled.reduce((s, l) => s + l.amount, 0))} not yet matched`} />
        <KpiTile label="Refunds open" value={openRefunds.length} tone="amber" icon={<RotateCcw />} sub={`${formatINR(openRefunds.reduce((s, r) => s + r.amount, 0))} requested or approved`} />
        <KpiTile label="ACCA-related payments in 2026" value={formatGBP(acca2026.reduce((s, p) => s + p.amount, 0))} tone="info" icon={<BadgePoundSterling />} sub={`${acca2026.length} recorded, paid to ACCA`} />
        <KpiTile
          label="Lines matched"
          value={lines.length - unreconciled.length}
          tone="jade"
          icon={<CheckCheck />}
          sub={`${Math.round(((lines.length - unreconciled.length) / Math.max(1, lines.length)) * 100)}% of settlement and bank lines`}
        />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "reconcile", label: "Reconcile transactions", count: unreconciled.length },
          { id: "refunds", label: "Track refunds", count: openRefunds.length },
          { id: "acca", label: "Track ACCA-related payments", count: acca.length },
        ]}
      />

      {tab === "reconcile" ? (
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <Card className="min-w-0 p-5">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Gateway settlement vs recorded · Aug to Sep 2026</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-ink-3">Settlement and bank lines</p>
                  <p className="mt-1 font-display text-[24px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{formatINR(lineTotal)}</p>
                  <p className="mt-1 text-[12px] text-ink-3">{lines.length} lines</p>
                </div>
                <ArrowRight aria-hidden className="hidden size-4 text-ink-3 sm:block" />
                <div className="min-w-0">
                  <p className="text-[12.5px] text-ink-3">Matched to recorded payments</p>
                  <p className="mt-1 font-display text-[24px] leading-none font-bold tracking-[-0.03em] text-jade tnum">{formatINR(matchedTotal)}</p>
                  <p className="mt-1 text-[12px] text-ink-3">{lines.length - unreconciled.length} lines</p>
                </div>
                <span aria-hidden className="hidden text-[18px] font-bold text-ink-3 sm:block">=</span>
                <div className="min-w-0">
                  <p className="text-[12.5px] text-ink-3">Still to reconcile</p>
                  <p className="mt-1 font-display text-[24px] leading-none font-bold tracking-[-0.03em] text-rose tnum">{formatINR(lineTotal - matchedTotal)}</p>
                  <p className="mt-1 text-[12px] text-ink-3">{unreconciled.length} lines</p>
                </div>
              </div>
            </Card>
            <FileDrop
              label="Upload settlement file or bank statement"
              accept=".csv,.xlsx"
              hint="Gateway settlement CSV or current account export. Lines match on reference and amount."
              disabled={!canRecord}
              disabledReason={LOCKED}
              onFiles={(_, added) => {
                if (added.length) toast({ title: `${added.length} ${added.length === 1 ? "file" : "files"} added for matching`, body: added.join(", "), tone: "info" });
              }}
            />
          </div>

          <DataTable
            caption="Reconcile transactions"
            rows={lineRows}
            columns={lineColumns}
            getRowId={(l) => l.id}
            initialSort={{ key: "status", dir: "desc" }}
            search={{ placeholder: "Search reference or line", match: (l, q) => l.reference.toLowerCase().includes(q) || l.id.toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(lineStatus || lineSource)}
                onClear={() => {
                  setLineStatus("");
                  setLineSource("");
                }}
              >
                <FilterSelect
                  label="Status"
                  value={lineStatus}
                  onChange={setLineStatus}
                  allLabel="All"
                  options={[
                    { value: "unmatched", label: "Unmatched" },
                    { value: "partial", label: "Partial" },
                    { value: "investigating", label: "Investigating" },
                    { value: "matched", label: "Matched" },
                  ]}
                />
                <FilterSelect label="Source" value={lineSource} onChange={setLineSource} allLabel="All" options={sources} />
              </FilterBar>
            }
          />
        </section>
      ) : null}

      {tab === "refunds" ? (
        <section className="space-y-4">
          <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {REFUND_STAGES.map((s) => {
              const inStage = refundList.filter((r) => r.status === s.id);
              const active = refundStatus === s.id;
              return (
                <li key={s.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRefundStatus(active ? "" : s.id)}
                    className={
                      "w-full rounded-[var(--radius-lg)] border p-4 text-left transition-colors " +
                      (active ? "border-transparent bg-surface-inv text-ink-inv" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft")
                    }
                  >
                    <span className={"block text-[11px] font-bold tracking-[0.12em] uppercase " + (active ? "text-cta" : "text-ink-3")}>{s.label}</span>
                    <span className="mt-2 block font-display text-[26px] leading-none font-bold tracking-[-0.03em] tnum">{inStage.length}</span>
                    <span className={"mt-1 block text-[12px] tnum " + (active ? "text-ink-inv/70" : "text-ink-3")}>
                      {formatINR(inStage.reduce((sum, r) => sum + r.amount, 0))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <DataTable
            caption="Track refunds"
            rows={refundRows}
            columns={refundColumns}
            getRowId={(r) => r.id}
            initialSort={{ key: "status", dir: "asc" }}
            search={{ placeholder: "Search learner or reason", match: (r, q) => studentName(r.studentId).toLowerCase().includes(q) || r.reason.toLowerCase().includes(q) || r.id.toLowerCase().includes(q) }}
            filters={
              <FilterSelect
                label="Stage"
                value={refundStatus}
                onChange={setRefundStatus}
                allLabel="All"
                options={REFUND_STAGES.map((s) => ({ value: s.id, label: s.label }))}
              />
            }
            toolbar={
              <span title={canRecord ? undefined : LOCKED} className="inline-flex">
                <Button size="sm" disabled={!canRecord} onClick={() => setLogRefund(true)}>
                  <Plus className="size-4" /> Log refund request
                </Button>
              </span>
            }
          />
        </section>
      ) : null}

      {tab === "acca" ? (
        <section className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {ACCA_KINDS.map((k) => {
              const list = acca2026.filter((p) => p.kind === k);
              const active = accaKind === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setAccaKind(active ? "" : k)}
                  className={
                    "min-w-0 rounded-[var(--radius-lg)] border p-4 text-left transition-colors " +
                    (active ? "border-transparent bg-surface-inv text-ink-inv" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft")
                  }
                >
                  <span className={"block truncate text-[12.5px] font-semibold " + (active ? "text-cta" : "text-ink-3")}>{PAYMENT_KIND_LABELS[k]}s</span>
                  <span className="mt-2 block font-display text-[22px] leading-none font-bold tracking-[-0.03em] tnum">{formatGBP(list.reduce((s, p) => s + p.amount, 0))}</span>
                  <span className={"mt-1 block text-[12px] " + (active ? "text-ink-inv/70" : "text-ink-3")}>{list.length} in 2026</span>
                </button>
              );
            })}
          </div>
          <DataTable
            caption="Track ACCA-related payments"
            rows={accaRows}
            columns={accaColumns}
            getRowId={(p) => p.id}
            search={{ placeholder: "Search learner or ACCA reference", match: (p, q) => studentName(p.studentId).toLowerCase().includes(q) || p.reference.toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(accaKind || accaPaper || accaYear !== "2026")}
                onClear={() => {
                  setAccaKind("");
                  setAccaPaper("");
                  setAccaYear("2026");
                }}
              >
                <FilterSelect label="Type" value={accaKind} onChange={setAccaKind} allLabel="All" options={ACCA_KINDS.map((k) => ({ value: k, label: PAYMENT_KIND_LABELS[k] }))} />
                <FilterSelect label="Paper" value={accaPaper} onChange={setAccaPaper} allLabel="All" options={PAPER_CODES} />
                <FilterSelect label="Year" value={accaYear} onChange={setAccaYear} allLabel="All years" options={["2026", "2025"]} />
              </FilterBar>
            }
            toolbar={
              <span title={canRecord ? undefined : LOCKED} className="inline-flex">
                <Button size="sm" disabled={!canRecord} onClick={() => setRecordAcca(true)}>
                  <Plus className="size-4" /> Record ACCA payment
                </Button>
              </span>
            }
          />
        </section>
      ) : null}

      <FormDrawer
        open={matching !== null}
        onClose={() => setMatching(null)}
        title={matching ? `Match ${matching.id}` : "Match line"}
        sub={matching ? `${matching.source} · ${matching.reference} · ${formatINR(matching.amount)}` : undefined}
        submitLabel="Mark matched"
        disabled={!canRecord || candidates.length === 0}
        disabledReason={candidates.length === 0 ? "No recorded payment has this amount" : LOCKED}
        onSubmit={(data) => {
          if (!matching) return;
          const paymentId = String(data.get("payment"));
          const note = String(data.get("note") ?? "").trim();
          const p = paymentById(paymentId);
          setLines((list) =>
            list.map((x) =>
              x.id === matching.id
                ? { ...x, status: "matched", matchedPaymentId: paymentId, note: `Matched by ${persona.name}${note ? `: ${note}` : " on reference and amount"}` }
                : x,
            ),
          );
          toast({ title: `${matching.id} matched to ${paymentId}`, body: p ? `${studentName(p.studentId)} · ${formatINR(p.amount)}` : undefined });
          setMatching(null);
        }}
      >
        {matching ? (
          <>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5 text-[13px] text-ink-2">
              <p className="font-semibold text-ink">{matching.note}</p>
              <p className="mt-1 text-[12px] text-ink-3">Line dated {formatAccaDate(matching.date)}</p>
            </div>
            {candidates.length ? (
              <Field label="Recorded payment" hint="Same amount, closest date first">
                <Select name="payment" defaultValue={matching.matchedPaymentId ?? candidates[0].id}>
                  {candidates.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.id} · {studentName(p.studentId)} · {p.method} · {formatAccaDate(p.date)} · {p.status}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : (
              <p className="text-[13px] text-ink-3">No recorded payment has this amount. Record the payment on Fees & payments first.</p>
            )}
            <Field label="Note" hint="Optional">
              <Textarea name="note" rows={2} placeholder="e.g. Learner confirmed the NEFT reference by email." />
            </Field>
          </>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={processing !== null}
        onClose={() => setProcessing(null)}
        title={processing ? `Process ${processing.id}` : "Process refund"}
        sub={processing ? `${formatINR(processing.amount)} to ${studentName(processing.studentId)}` : undefined}
        submitLabel="Mark processed"
        disabled={!canRecord}
        disabledReason={LOCKED}
        onSubmit={(data) => {
          if (!processing) return;
          const date = String(data.get("date") || ACCA_TODAY);
          const ref = String(data.get("reference") ?? "").trim();
          setRefundList((list) => list.map((x) => (x.id === processing.id ? { ...x, status: "processed", processedOn: date } : x)));
          setRefundRefs((m) => ({ ...m, [processing.id]: ref }));
          toast({ title: `${processing.id} processed`, body: `${formatINR(processing.amount)} returned to ${studentName(processing.studentId)} · ${ref}` });
          setProcessing(null);
        }}
      >
        <Field label="Bank reference (UTR)">
          <Input name="reference" required placeholder="e.g. HDFCR52026091400417" className="font-mono" />
        </Field>
        <Field label="Processed on">
          <Input name="date" type="date" required defaultValue={ACCA_TODAY} max={ACCA_TODAY} />
        </Field>
        <p className="text-[12.5px] text-ink-3">Refunds go back to the original payment method. The learner is emailed the reference.</p>
      </FormDrawer>

      <FormDrawer
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={rejecting ? `Reject ${rejecting.id}` : "Reject refund"}
        sub={rejecting ? `${formatINR(rejecting.amount)} requested by ${studentName(rejecting.studentId)}` : undefined}
        submitLabel="Reject refund"
        destructive
        disabled={!canRecord}
        disabledReason={LOCKED}
        onSubmit={(data) => {
          if (!rejecting) return;
          const why = String(data.get("why") ?? "").trim();
          setRefundList((list) =>
            list.map((x) => (x.id === rejecting.id ? { ...x, status: "rejected", approverId: persona.staffId ?? "st-priya", reason: `${x.reason} Rejected: ${why}` } : x)),
          );
          toast({ title: `${rejecting.id} rejected`, body: why, tone: "warning" });
          setRejecting(null);
        }}
      >
        <Field label="Reason, shared with the learner">
          <Textarea name="why" rows={3} required placeholder="e.g. Outside the 14-day cooling-off period under the refund policy." />
        </Field>
      </FormDrawer>

      <FormDrawer
        open={logRefund}
        onClose={() => setLogRefund(false)}
        title="Log refund request"
        sub="Enrolled learners only. Approval and processing follow."
        submitLabel="Log request"
        disabled={!canRecord}
        disabledReason={LOCKED}
        onSubmit={(data) => {
          const studentId = String(data.get("student"));
          const amount = Number(data.get("amount"));
          const reason = String(data.get("reason") ?? "").trim();
          const nextNo = Math.max(...refundList.map((r) => Number(r.id.slice(3)))) + 1;
          const refund: Refund = { id: `RF-${String(nextNo).padStart(4, "0")}`, studentId, amount, reason, requestedOn: ACCA_TODAY, status: "requested" };
          setRefundList((list) => [refund, ...list]);
          setRefundStatus("");
          setLogRefund(false);
          toast({ title: `${refund.id} logged`, body: `${formatINR(amount)} for ${studentName(studentId)} · awaiting approval` });
        }}
      >
        <Field label="Learner">
          <Select name="student" defaultValue={LEARNERS[0].id}>
            {LEARNERS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Amount (₹)">
          <Input name="amount" type="number" min={1} required placeholder="24500" className="font-mono" />
        </Field>
        <Field label="Reason">
          <Textarea name="reason" rows={3} required placeholder="e.g. Duplicate instalment paid by card and bank transfer." />
        </Field>
      </FormDrawer>

      <FormDrawer
        open={recordAcca}
        onClose={() => setRecordAcca(false)}
        title="Record ACCA payment"
        sub="Registration, annual subscription, exemption and exam fees the learner paid to ACCA."
        submitLabel="Record payment"
        disabled={!canRecord}
        disabledReason={LOCKED}
        onSubmit={(data) => {
          const studentId = String(data.get("student"));
          const kind = String(data.get("kind")) as PaymentKind;
          const paper = (data.get("paper") ? String(data.get("paper")) : undefined) as PaperCode | undefined;
          const entry = data.get("entry") ? String(data.get("entry")) : undefined;
          const amount = Number(data.get("amount"));
          const date = String(data.get("date") || ACCA_TODAY);
          const reference = String(data.get("reference") ?? "").trim();
          const description =
            kind === "acca-registration"
              ? "ACCA initial registration fee"
              : kind === "acca-subscription"
                ? "ACCA annual subscription 2026"
                : kind === "acca-exemption"
                  ? `ACCA exemption fees: ${paper}`
                  : `ACCA exam entry: ${paper} (${entry} entry)`;
          const payment: Payment = {
            id: `PAY-${String(allPayments.length + (acca.length - accaPayments.length) + 1).padStart(4, "0")}`,
            studentId,
            kind,
            description,
            currency: "GBP",
            amount,
            date,
            method: "Paid on ACCA portal",
            status: "paid",
            paidTo: "ACCA",
            reference,
            offline: false,
            recordedBy: persona.staffId ?? "st-deepa",
            paper: kind === "acca-exemption" || kind === "acca-exam" ? paper : undefined,
            reconciliation: "not-applicable",
          };
          setAcca((list) => [payment, ...list]);
          setAccaKind("");
          setAccaPaper("");
          setAccaYear(date.slice(0, 4));
          setRecordAcca(false);
          toast({ title: `ACCA payment recorded · ${formatGBP(amount)}`, body: `${studentName(studentId)} · ${PAYMENT_KIND_LABELS[kind]}${payment.paper ? ` ${payment.paper}` : ""}` });
        }}
      >
        {recordAcca ? <AccaPaymentFields /> : null}
      </FormDrawer>
    </div>
  );
}

