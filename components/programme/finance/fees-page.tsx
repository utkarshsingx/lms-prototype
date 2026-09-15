"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, BellRing, FileText, IndianRupee, Receipt as ReceiptIcon, Users, Wallet } from "lucide-react";
import {
  ACCA_TODAY,
  feePlanById,
  feePlans,
  formatAccaDate,
  formatINR,
  formatShortDate,
  paymentReminders,
  payments as allPayments,
  programmeById,
  receipts as seedReceipts,
  staffName,
  type Payment,
  type PaymentReminder,
  type Receipt,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { RestrictedNotice } from "@/components/ui/restricted";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  FEE_STATUS_LABELS,
  FEE_STATUS_TONES,
  applyPayment,
  methodKind,
  planName,
  recorderLabel,
  seedFeeRows,
  unpaidInstalments,
  type FeeRow,
  type OfflineMode,
} from "./finance-helpers";
import { RecordPaymentFields, ReminderFields } from "./finance-forms";
import { FeeDrawer } from "./fee-drawer";
import { ReceiptModal } from "./receipt-modal";
import { FinanceScopeNote } from "./scope-note";

const CHANNEL_LABELS: Record<string, string> = { whatsapp: "WhatsApp", email: "Email", sms: "SMS", "in-app": "In-app", push: "Push" };
const LOCKED = "Needs the finance:record permission";
const SEED_RECEIPTS_2026 = seedReceipts.filter((r) => r.id.startsWith("RCPT-2026-")).length;

export function FeesPage() {
  const { can } = useRole();
  if (!can("finance:view")) {
    return (
      <div className="mx-auto max-w-[86rem] py-4">
        <RestrictedNotice permission="finance:view" />
      </div>
    );
  }
  return <FeesWorkspace />;
}

function FeesWorkspace() {
  const { can, persona } = useRole();
  const canRecord = can("finance:record");

  const [rows, setRows] = useState<FeeRow[]>(seedFeeRows);
  const [payments, setPayments] = useState<Payment[]>(() => allPayments.filter((p) => p.paidTo === "ZSkillup"));
  const [receipts, setReceipts] = useState<Receipt[]>(seedReceipts);
  const [reminders, setReminders] = useState<PaymentReminder[]>(paymentReminders);
  const [tab, setTab] = useState("status");

  const [status, setStatus] = useState("");
  const [plan, setPlan] = useState("");
  const [type, setType] = useState("");
  const [method, setMethod] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [remChannel, setRemChannel] = useState("");

  const [recording, setRecording] = useState<{ studentId?: string; n?: number; key: string } | null>(null);
  const [reminding, setReminding] = useState<string[] | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [feeStudent, setFeeStudent] = useState<string | null>(null);

  const recorded = payments.length - allPayments.filter((p) => p.paidTo === "ZSkillup").length;

  const lastReminder = useMemo(() => {
    const map = new Map<string, PaymentReminder>();
    for (const r of reminders) {
      const cur = map.get(r.studentId);
      if (!cur || r.sentOn > cur.sentOn) map.set(r.studentId, r);
    }
    return map;
  }, [reminders]);

  const collected = payments.filter((p) => p.kind === "tuition" && p.status === "paid" && p.date >= "2026-01-01").reduce((s, p) => s + p.amount, 0);
  const dueNow = rows.reduce((s, r) => s + r.fees.due, 0);
  const dueRows = rows.filter((r) => r.fees.status === "due");
  const overdueRows = rows.filter((r) => r.fees.status === "overdue");
  const receiptsThisMonth = receipts.filter((r) => r.issuedOn.startsWith("2026-09")).length;

  const nextReceiptIds = (count: number) => {
    const base = SEED_RECEIPTS_2026 + (receipts.length - seedReceipts.length);
    return Array.from({ length: count }, (_, i) => `RCPT-2026-${String(base + i + 1).padStart(4, "0")}`);
  };

  const openRecord = (studentId?: string, n?: number) => {
    setFeeStudent(null);
    setRecording({ studentId, n, key: `${studentId ?? "any"}-${n ?? 0}-${payments.length}` });
  };
  const openRemind = (ids: string[]) => {
    const eligible = rows.filter((r) => ids.includes(r.id) && unpaidInstalments(r.fees).length > 0).map((r) => r.id);
    if (eligible.length === 0) {
      toast({ title: "Nothing to remind", body: "The selected learners have paid every instalment.", tone: "warning" });
      return;
    }
    setFeeStudent(null);
    setReminding(eligible);
  };

  const issueReceipts = (targets: Payment[]) => {
    const fresh = targets.filter((p) => p.status === "paid" && !p.receiptId);
    const ids = nextReceiptIds(fresh.length);
    const byPayment = new Map(fresh.map((p, i) => [p.id, ids[i]]));
    if (fresh.length) {
      setReceipts((list) => [
        ...fresh.map((p, i) => ({ id: ids[i], paymentId: p.id, studentId: p.studentId, issuedOn: ACCA_TODAY, amount: p.amount, issuedBy: persona.staffId ?? "st-deepa", description: p.description })),
        ...list,
      ]);
      setPayments((list) => list.map((p) => (byPayment.has(p.id) ? { ...p, receiptId: byPayment.get(p.id) } : p)));
    }
    return { fresh: ids, reissued: targets.filter((p) => p.status === "paid" && p.receiptId).length };
  };

  /* -------------------------------------------------------------- columns */

  const feeColumns: DataTableColumn<FeeRow>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.name}</span>
          <span className="block text-[12px] text-ink-3">
            {r.type === "graduate" ? "Graduate" : "Undergraduate"} · {r.university ?? r.programme}
          </span>
        </span>
      ),
    },
    {
      key: "plan",
      header: "Payment plan",
      sortable: true,
      sortValue: (r) => planName(r.fees.planId),
      className: "max-w-[15rem]",
      render: (r) => <span className="block truncate text-ink-2">{planName(r.fees.planId)}</span>,
    },
    {
      key: "instalments",
      header: "Instalments",
      sortable: true,
      sortValue: (r) => r.fees.paid / Math.max(1, r.fees.total),
      render: (r) => {
        const paidCount = r.fees.instalments.filter((i) => i.status === "paid").length;
        return (
          <span className="block w-28">
            <span className="block text-[12px] text-ink-2 tnum">
              {paidCount} of {r.fees.instalments.length} paid
            </span>
            <Progress value={(paidCount / Math.max(1, r.fees.instalments.length)) * 100} tone="jade" height={5} className="mt-1" />
          </span>
        );
      },
    },
    { key: "total", header: "Total", align: "right", mono: true, sortable: true, sortValue: (r) => r.fees.total, render: (r) => formatINR(r.fees.total) },
    { key: "paid", header: "Paid", align: "right", mono: true, sortable: true, sortValue: (r) => r.fees.paid, render: (r) => formatINR(r.fees.paid) },
    {
      key: "due",
      header: "Due now",
      align: "right",
      sortable: true,
      sortValue: (r) => r.fees.due,
      render: (r) =>
        r.fees.due ? (
          <span className={r.fees.status === "overdue" ? "font-mono text-[12px] font-semibold text-rose tnum" : "font-mono text-[12px] font-semibold text-ink tnum"}>
            {formatINR(r.fees.due)}
          </span>
        ) : (
          <span className="font-mono text-[12px] text-ink-3">₹0</span>
        ),
    },
    {
      key: "next",
      header: "Next due",
      sortable: true,
      sortValue: (r) => r.fees.nextDueDate ?? "9999",
      render: (r) => (r.fees.nextDueDate ? formatAccaDate(r.fees.nextDueDate) : <span className="text-ink-3">Nothing due</span>),
    },
    {
      key: "status",
      header: "Fee status",
      sortable: true,
      sortValue: (r) => ["overdue", "due", "on-track", "paid"].indexOf(r.fees.status),
      render: (r) => (
        <StatusPill status={r.fees.status} tone={FEE_STATUS_TONES[r.fees.status]} size="sm">
          {FEE_STATUS_LABELS[r.fees.status]}
        </StatusPill>
      ),
    },
    {
      key: "reminder",
      header: "Last reminder",
      render: (r) => {
        const rem = lastReminder.get(r.id);
        if (!rem) return <span className="text-ink-3">None</span>;
        return (
          <span className="text-[12.5px] text-ink-2">
            {rem.status === "scheduled" ? "Scheduled " : ""}
            {formatShortDate(rem.sentOn)} · {CHANNEL_LABELS[rem.channel] ?? rem.channel}
          </span>
        );
      },
    },
    {
      key: "action",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        unpaidInstalments(r.fees).length ? (
          <span title={canRecord ? undefined : LOCKED} className="inline-flex">
            <Button size="xs" variant="outline" disabled={!canRecord} onClick={() => openRecord(r.id)}>
              <Wallet className="size-3.5" /> Record payment
            </Button>
          </span>
        ) : (
          <span className="text-[12px] text-ink-3">Paid in full</span>
        ),
    },
  ];

  const paymentColumns: DataTableColumn<Payment>[] = [
    {
      key: "id",
      header: "Payment",
      sortable: true,
      render: (p) => (
        <span className="block">
          <span className="block font-mono text-[12px] text-ink">{p.id}</span>
          <span className="block text-[12px] text-ink-3">{formatAccaDate(p.date)}</span>
        </span>
      ),
    },
    {
      key: "learner",
      header: "Learner",
      sortable: true,
      sortValue: (p) => rows.find((r) => r.id === p.studentId)?.name,
      render: (p) => <span className="font-medium">{rows.find((r) => r.id === p.studentId)?.name ?? p.studentId}</span>,
    },
    { key: "description", header: "Towards", className: "max-w-[18rem]", render: (p) => <span className="block truncate text-ink-2">{p.description}</span> },
    {
      key: "method",
      header: "Method",
      sortable: true,
      render: (p) => (
        <span className="flex items-center gap-2">
          <Badge tone={p.offline ? "cta" : "neutral"}>{methodKind(p)}</Badge>
          <span className="text-ink-2">{p.method}</span>
        </span>
      ),
    },
    { key: "reference", header: "Reference", mono: true },
    { key: "amount", header: "Amount", align: "right", mono: true, sortable: true, render: (p) => formatINR(p.amount) },
    { key: "status", header: "Status", sortable: true, render: (p) => <StatusPill status={p.status} size="sm" /> },
    { key: "recordedBy", header: "Recorded by", render: (p) => <span className="text-ink-2">{recorderLabel(p.recordedBy)}</span> },
    {
      key: "receipt",
      header: "Receipt",
      render: (p) =>
        p.receiptId ? (
          <Button size="xs" variant="ghost" onClick={() => setReceiptId(p.receiptId!)}>
            <FileText className="size-3.5" /> {p.receiptId}
          </Button>
        ) : p.status === "paid" ? (
          <span title={canRecord ? undefined : LOCKED} className="inline-flex">
            <Button
              size="xs"
              variant="outline"
              disabled={!canRecord}
              onClick={() => {
                const { fresh } = issueReceipts([p]);
                toast({ title: `Receipt ${fresh[0]} generated`, body: `${rows.find((r) => r.id === p.studentId)?.name} · ${formatINR(p.amount)}` });
                setReceiptId(fresh[0]);
              }}
            >
              <ReceiptIcon className="size-3.5" /> Generate receipt
            </Button>
          </span>
        ) : (
          <span className="text-[12px] text-ink-3">{p.status === "pending" ? "After settlement" : "Not issued"}</span>
        ),
    },
  ];

  const reminderColumns: DataTableColumn<PaymentReminder>[] = [
    { key: "id", header: "Reminder", mono: true, sortable: true },
    { key: "learner", header: "Learner", sortable: true, sortValue: (r) => rows.find((x) => x.id === r.studentId)?.name, render: (r) => <span className="font-medium">{rows.find((x) => x.id === r.studentId)?.name}</span> },
    { key: "subject", header: "Message", className: "max-w-[20rem]", render: (r) => <span className="block truncate text-ink-2">{r.subject}</span> },
    { key: "amount", header: "Amount", align: "right", mono: true, render: (r) => formatINR(r.amount) },
    { key: "channel", header: "Channel", sortable: true, render: (r) => CHANNEL_LABELS[r.channel] ?? r.channel },
    { key: "sentOn", header: "Sent", sortable: true, mono: true, render: (r) => formatAccaDate(r.sentOn) },
    { key: "sentBy", header: "Sent by", render: (r) => <span className="text-ink-2">{recorderLabel(r.sentBy)}</span> },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} size="sm" /> },
  ];

  /* -------------------------------------------------------------- filtered rows */

  const feeRows = rows.filter(
    (r) => (!status || r.fees.status === status) && (!plan || r.fees.planId === plan) && (!type || r.type === type),
  );
  const paymentRows = payments.filter((p) => (!method || methodKind(p) === method) && (!payStatus || p.status === payStatus));
  const reminderRows = reminders.filter((r) => !remChannel || r.channel === remChannel);

  const openReceipt = receiptId ? (receipts.find((r) => r.id === receiptId) ?? null) : null;
  const feeRow = feeStudent ? (rows.find((r) => r.id === feeStudent) ?? null) : null;
  const remindRows = reminding ? rows.filter((r) => reminding.includes(r.id)) : [];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Finance"
        title="Fees & payments"
        sub="View enrolled-student fee status and payment plans, record authorised offline payments, generate receipts and send payment reminders."
        actions={
          <>
            <span title={canRecord ? undefined : LOCKED} className="inline-flex">
              <Button variant="secondary" disabled={!canRecord} onClick={() => openRemind([...overdueRows, ...dueRows].map((r) => r.id))}>
                <BellRing className="size-4" /> Send payment reminders
              </Button>
            </span>
            <span title={canRecord ? undefined : LOCKED} className="inline-flex">
              <Button disabled={!canRecord} onClick={() => openRecord()}>
                <Wallet className="size-4" /> Record offline payment
              </Button>
            </span>
          </>
        }
      />

      <FinanceScopeNote>
        {persona.name} can {canRecord ? "view fee status and record authorised payments, receipts and reminders" : "view fee status only"}. Fees paid to ACCA are tracked under Reconciliation & refunds.
      </FinanceScopeNote>

      <KpiRow cols={4}>
        <KpiTile hero label="Tuition collected in 2026" value={formatINR(collected)} icon={<IndianRupee />} sub={`${recorded ? `${recorded} recorded today · ` : ""}ZSkillup tuition only`} />
        <KpiTile label="Due and overdue now" value={formatINR(dueNow)} tone="amber" icon={<Wallet />} sub={`${dueRows.length} due · ${overdueRows.length} overdue`} />
        <KpiTile
          label="Learners overdue"
          value={overdueRows.length}
          tone="rose"
          icon={<AlertTriangle />}
          sub={`${formatINR(overdueRows.reduce((s, r) => s + r.fees.due, 0))} past the due date`}
        />
        <KpiTile label="Receipts issued" value={receipts.length} tone="jade" icon={<ReceiptIcon />} sub={`${receiptsThisMonth} in Sep 2026`} />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "status", label: "Enrolled-student fee status", count: rows.length },
          { id: "plans", label: "Payment plans", count: feePlans.length },
          { id: "receipts", label: "Payments and receipts", count: payments.length },
          { id: "reminders", label: "Payment reminders", count: reminders.length },
        ]}
      />

      {tab === "status" ? (
        <DataTable
          caption="Enrolled-student fee status"
          rows={feeRows}
          columns={feeColumns}
          getRowId={(r) => r.id}
          initialSort={{ key: "status", dir: "asc" }}
          onRowClick={(r) => setFeeStudent(r.id)}
          rowLabel={(r) => `Open fee record for ${r.name}`}
          search={{ placeholder: "Search learner", match: (r, q) => r.name.toLowerCase().includes(q) || (r.accaId ?? "").includes(q) }}
          filters={
            <FilterBar
              active={Boolean(status || plan || type)}
              onClear={() => {
                setStatus("");
                setPlan("");
                setType("");
              }}
            >
              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                allLabel="All"
                options={(Object.keys(FEE_STATUS_LABELS) as (keyof typeof FEE_STATUS_LABELS)[]).map((s) => ({ value: s, label: FEE_STATUS_LABELS[s] }))}
              />
              <FilterSelect label="Plan" value={plan} onChange={setPlan} allLabel="All plans" options={feePlans.map((p) => ({ value: p.id, label: p.name }))} />
              <FilterSelect
                label="Type"
                value={type}
                onChange={setType}
                allLabel="All"
                options={[
                  { value: "graduate", label: "Graduate" },
                  { value: "undergraduate", label: "Undergraduate" },
                ]}
              />
            </FilterBar>
          }
          selectable={canRecord}
          bulkActions={(ids, clear) => (
            <Button
              size="sm"
              onClick={() => {
                openRemind(ids);
                clear();
              }}
            >
              <BellRing className="size-3.5" /> Send payment reminders
            </Button>
          )}
        />
      ) : null}

      {tab === "plans" ? (
        <section className="space-y-4">
          <p className="text-[13px] text-ink-2">
            Payment plans are configured by a ZSkillup Super Admin under Payment rules. Programme Admin views them and records payments against them.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {feePlans.map((p) => {
              const learners = rows.filter((r) => r.fees.planId === p.id);
              const expected = learners.reduce((s, r) => s + r.fees.total, 0);
              const paid = learners.reduce((s, r) => s + r.fees.paid, 0);
              const overdue = learners.filter((r) => r.fees.status === "overdue").length;
              return (
                <Card key={p.id} className="flex min-w-0 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[15px] leading-snug font-bold text-ink">{p.name}</h3>
                      <p className="mt-0.5 text-[12.5px] text-ink-3">{programmeById(p.programmeId)?.name}</p>
                    </div>
                    <StatusPill status={p.active ? "active" : "paused"} size="sm" />
                  </div>
                  <p className="mt-4 font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-ink tnum">
                    {p.instalments} × {formatINR(p.instalmentAmount)}
                  </p>
                  <dl className="mt-4 space-y-1.5 text-[12.5px]">
                    {[
                      ["Plan total", formatINR(p.total)],
                      ["Schedule", p.schedule],
                      ["Late fee", p.lateFeeINR ? `${formatINR(p.lateFeeINR)} after ${p.graceDays} days' grace` : "None"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="shrink-0 text-ink-3">{k}</dt>
                        <dd className="min-w-0 text-right font-medium text-ink">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
                    <div className="flex justify-between gap-2 text-[12px] text-ink-2 tnum">
                      <span>
                        {learners.length} {learners.length === 1 ? "learner" : "learners"} in the sample
                      </span>
                      <span className={overdue ? "font-semibold text-rose" : "text-ink-3"}>{overdue} overdue</span>
                    </div>
                    <Progress value={expected ? (paid / expected) * 100 : 0} className="mt-2" />
                    <p className="mt-1.5 text-[12px] text-ink-3 tnum">
                      {formatINR(paid)} collected of {formatINR(expected)}
                    </p>
                  </div>
                  {p.note ? <p className="mt-3 text-[12.5px] leading-snug text-ink-3">{p.note}</p> : null}
                  <div className="mt-auto pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={learners.length === 0}
                      onClick={() => {
                        setPlan(p.id);
                        setStatus("");
                        setType("");
                        setTab("status");
                      }}
                    >
                      <Users className="size-4" /> View learners on this plan
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === "receipts" ? (
        <DataTable
          caption="Payments and receipts"
          rows={paymentRows}
          columns={paymentColumns}
          getRowId={(p) => p.id}
          search={{
            placeholder: "Search learner, reference or receipt",
            match: (p, q) =>
              p.reference.toLowerCase().includes(q) ||
              (p.receiptId ?? "").toLowerCase().includes(q) ||
              p.id.toLowerCase().includes(q) ||
              (rows.find((r) => r.id === p.studentId)?.name.toLowerCase().includes(q) ?? false),
          }}
          filters={
            <FilterBar
              active={Boolean(method || payStatus)}
              onClear={() => {
                setMethod("");
                setPayStatus("");
              }}
            >
              <FilterSelect label="Method" value={method} onChange={setMethod} allLabel="All" options={["Online", "Offline"]} />
              <FilterSelect
                label="Status"
                value={payStatus}
                onChange={setPayStatus}
                allLabel="All"
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "pending", label: "Pending" },
                  { value: "failed", label: "Failed" },
                ]}
              />
            </FilterBar>
          }
          selectable={canRecord}
          bulkActions={(ids, clear) => (
            <Button
              size="sm"
              onClick={() => {
                const targets = payments.filter((p) => ids.includes(p.id));
                const { fresh, reissued } = issueReceipts(targets);
                const total = fresh.length + reissued;
                toast({
                  title: total ? `${total} ${total === 1 ? "receipt" : "receipts"} generated` : "No paid payments selected",
                  body: total ? `${fresh.length} new, ${reissued} reissued · receipts-14-sep-2026.zip is ready to download` : "Receipts are issued for paid tuition only.",
                  tone: total ? "success" : "warning",
                });
                clear();
              }}
            >
              <ReceiptIcon className="size-3.5" /> Generate receipts
            </Button>
          )}
        />
      ) : null}

      {tab === "reminders" ? (
        <DataTable
          caption="Payment reminders"
          rows={reminderRows}
          columns={reminderColumns}
          getRowId={(r) => r.id}
          search={{ placeholder: "Search learner or message", match: (r, q) => r.subject.toLowerCase().includes(q) || (rows.find((x) => x.id === r.studentId)?.name.toLowerCase().includes(q) ?? false) }}
          filters={
            <FilterSelect
              label="Channel"
              value={remChannel}
              onChange={setRemChannel}
              allLabel="All"
              options={[
                { value: "whatsapp", label: "WhatsApp" },
                { value: "email", label: "Email" },
                { value: "sms", label: "SMS" },
                { value: "in-app", label: "In-app" },
              ]}
            />
          }
          toolbar={
            <span title={canRecord ? undefined : LOCKED} className="inline-flex">
              <Button size="sm" disabled={!canRecord} onClick={() => openRemind([...overdueRows, ...dueRows].map((r) => r.id))}>
                <BellRing className="size-4" /> Send payment reminders
              </Button>
            </span>
          }
        />
      ) : null}

      <FeeDrawer
        row={feeRow}
        payments={payments}
        reminders={reminders}
        canRecord={canRecord}
        onClose={() => setFeeStudent(null)}
        onRecord={openRecord}
        onRemind={(id) => openRemind([id])}
        onOpenReceipt={setReceiptId}
      />

      <ReceiptModal receipt={openReceipt} payment={openReceipt ? payments.find((p) => p.id === openReceipt.paymentId) : undefined} onClose={() => setReceiptId(null)} />

      <FormDrawer
        open={recording !== null}
        onClose={() => setRecording(null)}
        title="Record offline payment"
        sub="For authorised cash, cheque and bank transfer payments. Online payments reconcile automatically."
        submitLabel="Record payment"
        disabled={!canRecord}
        disabledReason={LOCKED}
        footerNote="Recorded in the audit log"
        onSubmit={(data) => {
          const studentId = String(data.get("student"));
          const n = Number(data.get("instalment"));
          const amount = Number(data.get("amount"));
          const mode = String(data.get("mode") ?? "Bank transfer") as OfflineMode;
          const reference = String(data.get("reference") ?? "").trim();
          const date = String(data.get("date") || ACCA_TODAY);
          const authorisedBy = String(data.get("authorisedBy"));
          const withReceipt = data.get("receipt") !== null;
          const row = rows.find((r) => r.id === studentId);
          const inst = row?.fees.instalments.find((i) => i.n === n);
          if (!row || !inst || amount < inst.amount) {
            toast({ title: "Check the amount", body: inst ? `Instalment ${n} is ${formatINR(inst.amount)}.` : "Choose an instalment.", tone: "warning" });
            return;
          }
          const feePlan = feePlanById(row.fees.planId);
          const paymentId = `PAY-${String(allPayments.length + recorded + 1).padStart(4, "0")}`;
          const receiptNo = withReceipt ? nextReceiptIds(1)[0] : undefined;
          const payment: Payment = {
            id: paymentId,
            studentId,
            kind: "tuition",
            description: `${feePlan?.name ?? "Fee plan"}, instalment ${n} of ${feePlan?.instalments ?? row.fees.instalments.length}`,
            currency: "INR",
            amount,
            date,
            method: mode,
            status: "paid",
            paidTo: "ZSkillup",
            reference,
            offline: true,
            recordedBy: persona.staffId ?? authorisedBy,
            receiptId: receiptNo,
            reconciliation: "pending",
          };
          setPayments((list) => [payment, ...list]);
          if (receiptNo) {
            setReceipts((list) => [
              { id: receiptNo, paymentId, studentId, issuedOn: ACCA_TODAY, amount, issuedBy: authorisedBy, description: payment.description },
              ...list,
            ]);
          }
          setRows((list) => list.map((r) => (r.id === studentId ? { ...r, fees: applyPayment(r.fees, n, amount, date) } : r)));
          setRecording(null);
          toast({
            title: `Payment recorded · ${formatINR(amount)}`,
            body: receiptNo
              ? `${row.name} · ${mode} · receipt ${receiptNo} generated · authorised by ${staffName(authorisedBy)}`
              : `${row.name} · ${mode} · generate the receipt from Payments and receipts`,
          });
          if (receiptNo) setReceiptId(receiptNo);
        }}
      >
        {recording ? (
          <RecordPaymentFields
            key={recording.key}
            rows={rows}
            initialStudentId={recording.studentId}
            initialInstalment={recording.n}
            defaultAuthoriser={persona.staffId}
          />
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={reminding !== null}
        onClose={() => setReminding(null)}
        title="Send payment reminders"
        sub="Uses the approved instalment templates."
        submitLabel={`Send to ${remindRows.length} ${remindRows.length === 1 ? "learner" : "learners"}`}
        disabled={!canRecord}
        disabledReason={LOCKED}
        onSubmit={(data) => {
          const channel = String(data.get("channel")) as PaymentReminder["channel"];
          const templateId = String(data.get("template"));
          const start = reminders.length;
          const fresh: PaymentReminder[] = remindRows.flatMap((r, i) => {
            const next = unpaidInstalments(r.fees)[0];
            if (!next) return [];
            return [
              {
                id: `RM-${String(start + i + 1).padStart(3, "0")}`,
                studentId: r.id,
                subject:
                  next.status === "overdue"
                    ? `Instalment ${next.n} overdue since ${formatShortDate(next.dueDate)}`
                    : `Instalment ${next.n} due on ${formatShortDate(next.dueDate)}`,
                amount: next.amount,
                channel,
                sentOn: ACCA_TODAY,
                sentBy: persona.staffId ?? "st-deepa",
                templateId,
                status: "sent",
              },
            ];
          });
          setReminders((list) => [...fresh, ...list]);
          setReminding(null);
          toast({
            title: `Payment reminders sent to ${fresh.length} ${fresh.length === 1 ? "learner" : "learners"}`,
            body: `${CHANNEL_LABELS[channel] ?? channel} · ${templateId === "tpl-fee-overdue" ? "Instalment overdue" : "Instalment due"} template`,
          });
        }}
      >
        {reminding ? <ReminderFields key={reminding.join(",")} recipients={remindRows} /> : null}
      </FormDrawer>
    </div>
  );
}
