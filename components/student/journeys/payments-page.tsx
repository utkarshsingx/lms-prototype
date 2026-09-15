"use client";

import { useState } from "react";
import { Bell, CreditCard, Download, FileText, Landmark, Plus, Receipt as ReceiptIcon, Wallet } from "lucide-react";
import {
  ACCA_TODAY,
  accaFeesGBP,
  daysBetween,
  feePlanById,
  formatAccaDate,
  formatGBP,
  formatINR,
  paperName,
  paymentReminders,
  payments as allPayments,
  paymentsForStudent,
  programmeById,
  receipts as allReceipts,
  type Instalment,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, DataRow } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, useStudentRecord } from "./shared";

type AccaKind = "acca-registration" | "acca-subscription" | "acca-exemption" | "acca-exam";

type AccaRow = {
  id: string;
  kind: AccaKind;
  description: string;
  amount: number;
  date: string;
  reference: string;
  paper?: string;
  paid: boolean;
  /** For fees not yet paid: the date ACCA needs them by. */
  dueBy?: string;
  recordedByYou?: boolean;
};

type ReceiptRow = { id: string; date: string; description: string; amount: number; method: string };

const ACCA_KIND_LABEL: Record<AccaKind, string> = {
  "acca-registration": "Registration",
  "acca-subscription": "Annual subscription",
  "acca-exemption": "Exemption fees",
  "acca-exam": "Exam entry",
};

function nextReceiptNumber() {
  const max = allReceipts
    .filter((r) => r.id.startsWith("RCPT-2026-"))
    .reduce((m, r) => Math.max(m, Number(r.id.slice(10))), 0);
  return max + 1;
}

function feeStatusOf(instalments: Instalment[]) {
  if (instalments.some((i) => i.status === "overdue")) return "overdue";
  if (instalments.some((i) => i.status === "due")) return "due";
  if (instalments.some((i) => i.status !== "paid")) return "on-track";
  return "paid";
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export function PaymentsPage() {
  const student = useStudentRecord();
  return <PaymentsView key={student.id} student={student} />;
}

export function PaymentsView({ student }: { student: Student }) {
  const plan = feePlanById(student.fees.planId)!;
  const programme = programmeById(student.programmeId);

  const [instalments, setInstalments] = useState<Instalment[]>(() => student.fees.instalments.map((i) => ({ ...i })));
  const [receiptRows, setReceiptRows] = useState<ReceiptRow[]>(() =>
    allReceipts
      .filter((r) => r.studentId === student.id)
      .map((r) => ({
        id: r.id,
        date: r.issuedOn,
        description: r.description,
        amount: r.amount,
        method: allPayments.find((p) => p.id === r.paymentId)?.method ?? "Online",
      })),
  );
  const [accaRows, setAccaRows] = useState<AccaRow[]>(() => {
    const paid: AccaRow[] = paymentsForStudent(student.id)
      .filter((p) => p.paidTo === "ACCA" && p.status === "paid")
      .map((p) => ({
        id: p.id,
        kind: p.kind as AccaKind,
        description: p.description,
        amount: p.amount,
        date: p.date,
        reference: p.reference,
        paper: p.paper,
        paid: true,
      }));
    const unpaidExams: AccaRow[] = student.examBookings
      .filter((b) => b.status === "planned" && b.feeStatus === "unpaid")
      .map((b) => ({
        id: `due-${b.id}`,
        kind: "acca-exam",
        description: `ACCA exam entry: ${b.paper} ${b.label} (${b.entryWindow} entry)`,
        amount: b.feeGBP,
        date: b.entryClosesOn ?? b.date,
        reference: "None yet",
        paper: b.paper,
        paid: false,
        dueBy: b.entryClosesOn ?? b.date,
      }));
    const subscription: AccaRow[] =
      student.subscription.dueDate && student.subscription.status !== "not-applicable"
        ? [
            {
              id: "due-subscription",
              kind: "acca-subscription",
              description: `ACCA annual subscription ${student.subscription.dueDate.slice(0, 4)}`,
              amount: student.subscription.amountGBP || accaFeesGBP.annualSubscription,
              date: student.subscription.dueDate,
              reference: "None yet",
              paid: false,
              dueBy: student.subscription.dueDate,
            },
          ]
        : [];
    return [...unpaidExams, ...subscription, ...paid];
  });

  const [paying, setPaying] = useState<number | null>(null);
  const [recording, setRecording] = useState<AccaRow | "new" | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);

  const paidTotal = instalments.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const paidCount = instalments.filter((i) => i.status === "paid").length;
  const next = instalments.find((i) => i.status !== "paid");
  const status = feeStatusOf(instalments);
  const reminders = paymentReminders.filter((r) => r.studentId === student.id);
  const accaPaidTotal = accaRows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0);
  const accaDue = accaRows.filter((r) => !r.paid);
  const payingInstalment = instalments.find((i) => i.n === paying);

  const receiptColumns: DataTableColumn<ReceiptRow>[] = [
    { key: "id", header: "Receipt", mono: true, sortable: true },
    { key: "date", header: "Issued", sortable: true, render: (r) => formatAccaDate(r.date) },
    { key: "description", header: "For", wrap: true, className: "min-w-52" },
    { key: "method", header: "Method" },
    { key: "amount", header: "Amount", align: "right", mono: true, sortable: true, render: (r) => formatINR(r.amount) },
    {
      key: "download",
      header: <span className="sr-only">Download</span>,
      align: "right",
      render: (r) => (
        <Button
          size="xs"
          variant="ghost"
          onClick={() => toast({ title: `Receipt downloaded: ${r.id}.pdf`, body: `${formatINR(r.amount)} · ${formatAccaDate(r.date)}`, tone: "info" })}
        >
          <Download aria-hidden className="size-3.5" />
          Download
        </Button>
      ),
    },
  ];

  const accaColumns: DataTableColumn<AccaRow>[] = [
    {
      key: "kind",
      header: "Fee",
      sortable: true,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{ACCA_KIND_LABEL[r.kind]}</span>
          <span className="block text-[12px] text-ink-3">{r.paper ? `${r.paper} · ${paperName(r.paper)}` : "All papers"}</span>
        </span>
      ),
    },
    { key: "description", header: "Description", wrap: true, className: "min-w-56" },
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (r) => (r.paid ? formatAccaDate(r.date) : `Due by ${formatAccaDate(r.dueBy ?? r.date)}`),
    },
    { key: "amount", header: "Amount", align: "right", mono: true, sortable: true, render: (r) => formatGBP(r.amount) },
    { key: "reference", header: "ACCA reference", mono: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (r) => (r.paid ? 1 : 0),
      render: (r) =>
        r.paid ? (
          <StatusPill status="paid">{r.recordedByYou ? "Paid to ACCA · recorded by you" : "Paid to ACCA"}</StatusPill>
        ) : (
          <StatusPill status="due">Not paid yet</StatusPill>
        ),
    },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      align: "right",
      render: (r) =>
        r.paid ? null : (
          <Button size="xs" variant="outline" onClick={() => setRecording(r)}>
            Record payment
          </Button>
        ),
    },
  ];

  const confirmPayment = (data: FormData) => {
    if (!payingInstalment) return;
    const method = String(data.get("method") ?? "UPI");
    const receiptId = `RCPT-2026-${String(nextReceiptNumber() + receiptRows.filter((r) => r.date === ACCA_TODAY).length).padStart(4, "0")}`;
    setInstalments((list) =>
      list.map((i) => (i.n === payingInstalment.n ? { ...i, status: "paid", paidOn: ACCA_TODAY } : i)),
    );
    setReceiptRows((list) => [
      {
        id: receiptId,
        date: ACCA_TODAY,
        description: `${plan.name}, instalment ${payingInstalment.n} of ${plan.instalments}`,
        amount: payingInstalment.amount,
        method,
      },
      ...list,
    ]);
    toast({
      title: "Payment successful",
      body: `${formatINR(payingInstalment.amount)} · instalment ${payingInstalment.n} of ${plan.instalments} · receipt ${receiptId}`,
    });
    setPaying(null);
  };

  const recordAcca = (data: FormData) => {
    const kind = String(data.get("kind")) as AccaKind;
    const paper = String(data.get("paper") ?? "");
    const amount = Number(data.get("amount") ?? 0);
    const date = String(data.get("date") || ACCA_TODAY);
    const reference = String(data.get("reference") ?? "").trim() || "Reference not given";
    const target = recording !== "new" && recording ? recording : undefined;
    if (target) {
      setAccaRows((rows) =>
        rows.map((r) =>
          r.id === target.id ? { ...r, paid: true, date, amount: amount || r.amount, reference, recordedByYou: true, dueBy: undefined } : r,
        ),
      );
    } else {
      setAccaRows((rows) => [
        {
          id: `you-${rows.length + 1}`,
          kind,
          description: `${ACCA_KIND_LABEL[kind]}${paper ? `: ${paper}` : ""} (recorded by you)`,
          amount,
          date,
          reference,
          paper: paper || undefined,
          paid: true,
          recordedByYou: true,
        },
        ...rows,
      ]);
    }
    toast({
      title: "ACCA payment recorded",
      body: `${formatGBP(amount || target?.amount || 0)} paid to ACCA${evidence.length ? ` · ${evidence.length} file attached` : ""}. The programme team can see it for tracking.`,
    });
    setRecording(null);
    setEvidence([]);
  };

  const recordingRow = recording !== "new" ? recording : null;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Account"
        title="Payments"
        sub={`Payment information for your ${programme?.name ?? "programme"}: fee plan, instalments, receipts and the ACCA fees you pay, recorded here for tracking.`}
        badge={<StatusPill status={status} size="md" />}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => toast({ title: `Report queued: fee-statement-${slug(student.name)}.csv`, tone: "info" })}
            >
              <Download aria-hidden className="size-4" />
              Download statement
            </Button>
            {next ? (
              <Button onClick={() => setPaying(next.n)}>
                <CreditCard aria-hidden className="size-4" />
                {next.status === "upcoming" ? `Pay ${formatINR(next.amount)} early` : `Pay ${formatINR(next.amount)} now`}
              </Button>
            ) : null}
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Next instalment"
          value={next ? formatINR(next.amount) : "All paid"}
          icon={<Wallet />}
          sub={
            next
              ? `Due ${formatAccaDate(next.dueDate)} · ${daysBetween(ACCA_TODAY, next.dueDate) >= 0 ? `in ${daysBetween(ACCA_TODAY, next.dueDate)} days` : `${-daysBetween(ACCA_TODAY, next.dueDate)} days overdue`}`
              : "No instalments left"
          }
        />
        <KpiTile label="Paid so far" value={formatINR(paidTotal)} tone="jade" sub={`${paidCount} of ${plan.instalments} instalments`} />
        <KpiTile label="Balance" value={formatINR(plan.total - paidTotal)} tone={status === "overdue" ? "rose" : "neutral"} sub={status === "overdue" ? "Includes an overdue instalment" : "No overdue fees"} />
        <KpiTile label="Paid to ACCA" value={formatGBP(accaPaidTotal)} tone="info" sub={`${accaDue.length} ACCA ${accaDue.length === 1 ? "fee" : "fees"} still to pay`} />
      </KpiRow>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="min-w-0">
          <CardHeader title="Instalments" sub={`${plan.instalments} instalments of ${formatINR(plan.instalmentAmount)} · ${plan.schedule}`} />
          <div className="px-5 pb-2">
            <div className="flex items-baseline justify-between gap-3 text-[12.5px] text-ink-3">
              <span>
                {formatINR(paidTotal)} of {formatINR(plan.total)} paid
              </span>
              <span className="font-mono font-semibold text-ink tnum">{Math.round((paidTotal / plan.total) * 100)}%</span>
            </div>
            <Progress value={(paidTotal / plan.total) * 100} className="mt-2" height={8} />
          </div>
          <ol className="px-5 pt-3 pb-5">
            {instalments.map((i, idx) => {
              const isNext = next?.n === i.n;
              const last = idx === instalments.length - 1;
              return (
                <li key={i.n} className="relative flex gap-3.5">
                  {!last ? <span aria-hidden className="absolute top-9 bottom-0 left-[17px] w-px bg-line-strong" /> : null}
                  <span
                    aria-hidden
                    className={cn(
                      "relative z-[1] mt-1 grid size-9 shrink-0 place-items-center rounded-full border-2 text-[12.5px] font-bold tnum",
                      i.status === "paid" && "border-jade bg-jade text-on-accent",
                      i.status === "due" && "border-cta bg-surface-inv text-cta",
                      i.status === "overdue" && "border-rose bg-rose text-on-accent",
                      i.status === "upcoming" && "border-line-strong bg-surface text-ink-3",
                    )}
                  >
                    {i.n}
                  </span>
                  <div
                    className={cn(
                      "mb-3 flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-[var(--radius-md)] border px-3.5 py-3",
                      isNext ? "border-cta bg-cta-soft" : "border-line bg-surface",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-ink">
                        Instalment {i.n} · <span className="font-mono tnum">{formatINR(i.amount)}</span>
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ink-3">
                        {i.status === "paid"
                          ? `Paid ${formatAccaDate(i.paidOn ?? i.dueDate)} · due ${formatAccaDate(i.dueDate)}`
                          : `Due ${formatAccaDate(i.dueDate)}`}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={i.status} />
                      {i.status === "paid" ? null : isNext ? (
                        <Button size="sm" onClick={() => setPaying(i.n)}>
                          {i.status === "upcoming" ? "Pay early" : "Pay now"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Fee plan" sub={programme?.name} />
            <dl className="px-5 pb-4">
              <DataRow label="Plan">{plan.name}</DataRow>
              <DataRow label="Programme fee">
                <span className="font-mono tnum">{formatINR(plan.total)}</span>
              </DataRow>
              <DataRow label="Instalments">
                {plan.instalments} × <span className="font-mono tnum">{formatINR(plan.instalmentAmount)}</span>
              </DataRow>
              <DataRow label="Schedule">{plan.schedule}</DataRow>
              <DataRow label="Late fee">
                {formatINR(plan.lateFeeINR)} after {plan.graceDays} days
              </DataRow>
            </dl>
            {plan.note ? <p className="border-t border-line px-5 py-3.5 text-[12.5px] leading-relaxed text-ink-2">{plan.note}</p> : null}
          </Card>

          <Card className="p-5">
            <MicroLabel>Reminders sent to you</MicroLabel>
            {reminders.length ? (
              <ul className="mt-3 space-y-2.5">
                {reminders.map((r) => (
                  <li key={r.id} className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-inv text-cta">
                      <Bell aria-hidden className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-ink">{r.subject}</span>
                      <span className="block text-[12px] text-ink-3">
                        {r.channel === "whatsapp" ? "WhatsApp" : "Email"} · {formatAccaDate(r.sentOn)} · {r.status === "scheduled" ? "Scheduled" : "Delivered"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[13px] text-ink-3">No reminders. Your next instalment is not due within 14 days.</p>
            )}
            <div className="mt-4 flex items-start gap-2.5 rounded-[var(--radius-md)] bg-surface-2 p-3 text-[12.5px] leading-relaxed text-ink-2">
              <Landmark aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
              Pay online by UPI, card or net banking. Bank transfers and cheques are recorded by the finance team, who issue the receipt.
            </div>
          </Card>
        </div>
      </div>

      <section className="space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">Receipts</h2>
            <p className="mt-1 text-[13px] text-ink-3">Issued by ZSkillup for every programme fee payment.</p>
          </div>
        </div>
        <DataTable
          caption="Receipts"
          rows={receiptRows}
          columns={receiptColumns}
          getRowId={(r) => r.id}
          dense
          pageSize={6}
          initialSort={{ key: "date", dir: "desc" }}
          empty={<p className="text-[13px] text-ink-3">No receipts yet.</p>}
        />
      </section>

      <section className="space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 max-w-2xl">
            <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">ACCA fees</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
              Registration, annual subscription, exemption and exam entry fees are paid by you to ACCA in GBP. They are recorded here for tracking; ZSkillup does not collect them.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setRecording("new")}>
            <Plus aria-hidden className="size-4" />
            Record an ACCA payment
          </Button>
        </div>
        <DataTable
          caption="ACCA fees recorded"
          rows={accaRows}
          columns={accaColumns}
          getRowId={(r) => r.id}
          dense
          pageSize={12}
          rowClassName={(r) => (r.paid ? undefined : "bg-amber-soft/40")}
        />
      </section>

      <FormDrawer
        open={paying !== null}
        onClose={() => setPaying(null)}
        title={payingInstalment ? `Pay instalment ${payingInstalment.n} of ${plan.instalments}` : "Pay instalment"}
        sub={payingInstalment ? `${formatINR(payingInstalment.amount)} · due ${formatAccaDate(payingInstalment.dueDate)}` : undefined}
        submitLabel={payingInstalment ? `Pay ${formatINR(payingInstalment.amount)}` : "Pay"}
        footerNote="A receipt is issued straight away."
        onSubmit={confirmPayment}
      >
        {payingInstalment ? (
          <>
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
              <dl>
                <DataRow label="Plan">{plan.name}</DataRow>
                <DataRow label="Instalment">
                  {payingInstalment.n} of {plan.instalments}
                </DataRow>
                <DataRow label="Amount">
                  <span className="font-mono tnum">{formatINR(payingInstalment.amount)}</span>
                </DataRow>
                <DataRow label="Paid by">{student.name}</DataRow>
              </dl>
            </div>
            <Field label="Payment method">
              <Select name="method" defaultValue="UPI">
                <option>UPI</option>
                <option>Card</option>
                <option>Net banking</option>
              </Select>
            </Field>
            <p className="flex items-start gap-2 text-[12.5px] text-ink-3">
              <ReceiptIcon aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              The receipt appears in Receipts and is emailed to {student.email}.
            </p>
          </>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={recording !== null}
        onClose={() => {
          setRecording(null);
          setEvidence([]);
        }}
        title={recordingRow ? `Record payment: ${ACCA_KIND_LABEL[recordingRow.kind]}` : "Record an ACCA payment"}
        sub="For fees you paid on the ACCA portal. Amounts are in GBP."
        submitLabel="Record payment"
        onSubmit={recordAcca}
      >
        <Field label="Fee type">
          <Select name="kind" defaultValue={recordingRow?.kind ?? "acca-exam"} key={`kind-${recordingRow?.id ?? "new"}`} disabled={Boolean(recordingRow)}>
            {(Object.keys(ACCA_KIND_LABEL) as AccaKind[]).map((k) => (
              <option key={k} value={k}>
                {ACCA_KIND_LABEL[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Paper" hint="For exam entry and exemption fees">
          <Select name="paper" defaultValue={recordingRow?.paper ?? ""} key={`paper-${recordingRow?.id ?? "new"}`} disabled={Boolean(recordingRow)}>
            <option value="">Not paper-specific</option>
            {["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM", "SBL", "SBR", "AFM", "APM", "ATX", "AAA"].map((p) => (
              <option key={p} value={p}>
                {p} · {paperName(p)}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount (£)">
            <Input
              name="amount"
              type="number"
              min={1}
              step="1"
              required
              defaultValue={recordingRow?.amount ?? ""}
              key={`amount-${recordingRow?.id ?? "new"}`}
              className="font-mono"
            />
          </Field>
          <Field label="Date paid">
            <Input name="date" type="date" defaultValue={ACCA_TODAY} max={ACCA_TODAY} required />
          </Field>
        </div>
        <Field label="ACCA payment reference" hint="Optional">
          <Input name="reference" placeholder="e.g. ACCA-EX-PM-DEC26" className="font-mono" />
        </Field>
        <FileDrop
          label="Attach the ACCA payment confirmation"
          accept=".pdf,.png,.jpg"
          hint="The email or portal receipt from ACCA."
          onFiles={(all, added) => {
            setEvidence(all);
            if (added.length) toast({ title: `${added.length} ${added.length === 1 ? "file" : "files"} attached`, body: added.join(", "), tone: "info" });
          }}
        />
        <p className="flex items-start gap-2 text-[12.5px] text-ink-3">
          <FileText aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Recording a fee does not pay ACCA. Pay on the ACCA portal first, then record it here.
        </p>
      </FormDrawer>
    </div>
  );
}
