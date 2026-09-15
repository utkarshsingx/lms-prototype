import { ACCA_TODAY, addDays, createRng, daysBetween, formatINR, formatShortDate } from "./types";
import type { Payment, PaymentReminder, ReconciliationRow, Receipt, Refund, Student } from "./types";
import { accaFeesGBP } from "./papers";
import { feePlanById } from "./programmes";
import { students } from "./students";

export const FINANCE_SCOPE_NOTE = "Enrolled-student financial administration only. Admissions and sales are managed elsewhere.";

const ONLINE_METHODS = ["UPI", "Card", "Net banking"] as const;
const OFFLINE_METHODS = ["Bank transfer", "Cheque", "Cash"] as const;

function buildPayments(): { payments: Payment[]; receipts: Receipt[] } {
  const rng = createRng(8842);
  const payments: Payment[] = [];
  const receipts: Receipt[] = [];
  let seq = 1;
  const receiptSeq: Record<string, number> = {};
  const push = (p: Omit<Payment, "id">) => {
    const id = `PAY-${String(seq++).padStart(4, "0")}`;
    const payment = { ...p, id };
    if (p.paidTo === "ZSkillup" && p.status === "paid") {
      const year = p.date.slice(0, 4);
      receiptSeq[year] = (receiptSeq[year] ?? 0) + 1;
      const rid = `RCPT-${year}-${String(receiptSeq[year]).padStart(4, "0")}`;
      payment.receiptId = rid;
      receipts.push({ id: rid, paymentId: id, studentId: p.studentId, issuedOn: p.date, amount: p.amount, issuedBy: p.offline ? "st-deepa" : "System", description: p.description });
    }
    payments.push(payment);
  };

  for (const s of students) {
    const plan = feePlanById(s.fees.planId)!;
    for (const inst of s.fees.instalments) {
      if (inst.status !== "paid" || !inst.paidOn) continue;
      const offline = rng.chance(0.18);
      const recent = daysBetween(inst.paidOn, ACCA_TODAY) <= 10;
      push({
        studentId: s.id,
        kind: "tuition",
        description: `${plan.name}, instalment ${inst.n} of ${plan.instalments}`,
        currency: "INR",
        amount: inst.amount,
        date: inst.paidOn,
        method: offline ? rng.pick(OFFLINE_METHODS) : rng.pick(ONLINE_METHODS),
        status: "paid",
        paidTo: "ZSkillup",
        reference: offline ? `OFF-${inst.paidOn.replace(/-/g, "")}-${rng.int(100, 999)}` : `pay_${(s.id.length * 7919 + inst.n * 104729).toString(36)}${rng.int(1000, 9999)}`,
        offline,
        recordedBy: offline ? "st-deepa" : "System",
        reconciliation: recent ? "pending" : "matched",
      });
    }
    if (s.registration.status === "registered" && s.registration.date) {
      push({ studentId: s.id, kind: "acca-registration", description: "ACCA initial registration fee", currency: "GBP", amount: accaFeesGBP.registration, date: s.registration.date, method: "Paid on ACCA portal", status: "paid", paidTo: "ACCA", reference: `ACCA-REG-${s.accaId}`, offline: false, recordedBy: "st-imran", reconciliation: "not-applicable" });
    }
    if (s.subscription.status === "paid" && s.subscription.paidOn) {
      push({ studentId: s.id, kind: "acca-subscription", description: "ACCA annual subscription 2026", currency: "GBP", amount: s.subscription.amountGBP, date: s.subscription.paidOn, method: "Paid on ACCA portal", status: "paid", paidTo: "ACCA", reference: `ACCA-SUB26-${s.accaId}`, offline: false, recordedBy: "st-imran", reconciliation: "not-applicable" });
    }
    const paidExemptions = s.exemptions.filter((e) => e.fee.status === "paid");
    if (paidExemptions.length) {
      push({
        studentId: s.id,
        kind: "acca-exemption",
        description: `ACCA exemption fees: ${paidExemptions.map((e) => e.paper).join(", ")}`,
        currency: "GBP",
        amount: paidExemptions.reduce((sum, e) => sum + e.fee.amountGBP, 0),
        date: paidExemptions[0].fee.paidOn ?? paidExemptions[0].decidedOn ?? paidExemptions[0].estimatedOn,
        method: "Paid on ACCA portal",
        status: "paid",
        paidTo: "ACCA",
        reference: `ACCA-EXM-${s.accaId ?? "PENDING"}`,
        offline: false,
        recordedBy: "st-imran",
        reconciliation: "not-applicable",
      });
    }
    for (const b of s.examBookings) {
      if (b.feeStatus !== "paid" || !b.bookedOn) continue;
      push({ studentId: s.id, kind: "acca-exam", description: `ACCA exam entry: ${b.paper} ${b.label} (${b.entryWindow} entry)`, currency: "GBP", amount: b.feeGBP, date: b.bookedOn, method: "Paid on ACCA portal", status: "paid", paidTo: "ACCA", reference: `ACCA-EX-${b.id.slice(3).toUpperCase()}`, offline: false, recordedBy: "st-imran", paper: b.paper, reconciliation: "not-applicable" });
    }
  }

  // A UPI payment that has not reached the gateway settlement yet (ticket "UPI payment not reflected").
  const overdue = students.find((s) => s.fees.status === "overdue" && s.type === "graduate");
  if (overdue) {
    const inst = overdue.fees.instalments.find((i) => i.status === "overdue")!;
    push({ studentId: overdue.id, kind: "tuition", description: `${feePlanById(overdue.fees.planId)!.name}, instalment ${inst.n}`, currency: "INR", amount: inst.amount, date: "2026-09-11", method: "UPI", status: "pending", paidTo: "ZSkillup", reference: "UPI 6021 8844 1290", offline: false, recordedBy: "System", reconciliation: "unmatched" });
  }
  // A failed card payment.
  const due = students.find((s) => s.fees.status === "due" && s.id !== "s-anaya");
  if (due) {
    push({ studentId: due.id, kind: "tuition", description: "Card payment attempt, instalment 5", currency: "INR", amount: 24500, date: "2026-09-13", method: "Card", status: "failed", paidTo: "ZSkillup", reference: "pay_declined_91a7", offline: false, recordedBy: "System", reconciliation: "not-applicable" });
  }
  return { payments: payments.sort((a, b) => b.date.localeCompare(a.date)), receipts: receipts.sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)) };
}

const built = buildPayments();
export const payments: Payment[] = built.payments;
export const receipts: Receipt[] = built.receipts;

export function paymentsForStudent(studentId: string) {
  return payments.filter((p) => p.studentId === studentId);
}

export const accaPayments = payments.filter((p) => p.paidTo === "ACCA");

function tagged(tag: string, n = 0): Student {
  return students.filter((s) => s.scenarioTags.includes(tag))[n];
}

export const refunds: Refund[] = [
  { id: "RF-0107", studentId: tagged("refund", 0).id, amount: 12000, reason: "Moved from the FR Dec 2026 weekend cohort to the FR Reattempt Mar 2027 cohort. Cohort fee difference refunded.", requestedOn: "2026-08-20", status: "processed", approverId: "st-priya", processedOn: "2026-08-28" },
  { id: "RF-0112", studentId: tagged("refund", 1).id, amount: 32000, reason: "Duplicate instalment: paid by card and by bank transfer on the same day.", requestedOn: "2026-09-09", status: "approved", approverId: "st-priya" },
  { id: "RF-0115", studentId: tagged("new-graduate", 0).id, amount: 24500, reason: "Withdrawal within the 14-day cooling-off period after enrolment.", requestedOn: "2026-09-12", status: "requested" },
  { id: "RF-0098", studentId: tagged("ug-cl25", 2).id, amount: 1000, reason: "Late fee reversed after a bank processing delay was confirmed.", requestedOn: "2026-08-12", status: "processed", approverId: "st-deepa", processedOn: "2026-08-14" },
  { id: "RF-0101", studentId: tagged("missed-classes", 0).id, amount: 24500, reason: "Refund requested for missed classes. Recordings were available, so the request was declined under the refund policy.", requestedOn: "2026-08-16", status: "rejected", approverId: "st-priya" },
];

export const paymentReminders: PaymentReminder[] = (() => {
  const out: PaymentReminder[] = [];
  let n = 1;
  for (const s of students) {
    for (const inst of s.fees.instalments) {
      if (inst.status === "overdue") {
        const overdueDays = daysBetween(inst.dueDate, ACCA_TODAY);
        out.push({ id: `RM-${String(n++).padStart(3, "0")}`, studentId: s.id, subject: `Instalment ${inst.n} overdue by ${overdueDays} days`, amount: inst.amount, channel: "whatsapp", sentOn: addDays(inst.dueDate, 8), sentBy: "st-deepa", templateId: "tpl-fee-overdue", status: "read" });
        out.push({ id: `RM-${String(n++).padStart(3, "0")}`, studentId: s.id, subject: `Second reminder: instalment ${inst.n} of ${formatINR(inst.amount)}`, amount: inst.amount, channel: "email", sentOn: addDays(ACCA_TODAY, -2), sentBy: "st-deepa", templateId: "tpl-fee-overdue", status: "delivered" });
      } else if (inst.status === "due") {
        out.push({ id: `RM-${String(n++).padStart(3, "0")}`, studentId: s.id, subject: `Instalment ${inst.n} due on ${formatShortDate(inst.dueDate)}`, amount: inst.amount, channel: n % 3 === 0 ? "email" : "whatsapp", sentOn: addDays(inst.dueDate, -7), sentBy: "System", templateId: "tpl-fee-due", status: addDays(inst.dueDate, -7) <= ACCA_TODAY ? "delivered" : "scheduled" });
      }
    }
  }
  return out;
})();

export const reconciliationRows: ReconciliationRow[] = (() => {
  const recent = payments.filter((p) => p.kind === "tuition" && p.currency === "INR" && p.date >= "2026-08-01" && p.status === "paid").slice(0, 12);
  const rows: ReconciliationRow[] = recent.map((p, i) => ({
    id: `RC-${String(i + 1).padStart(3, "0")}`,
    date: addDays(p.date, 1),
    source: p.offline ? "HDFC current account statement" : "Payment gateway settlement",
    reference: p.reference,
    amount: p.amount,
    currency: "INR",
    matchedPaymentId: p.reconciliation === "pending" ? undefined : p.id,
    status: p.reconciliation === "pending" ? "investigating" : "matched",
    note: p.reconciliation === "pending" ? "Settlement expected within two working days" : "Matched on reference and amount",
  }));
  const pending = payments.find((p) => p.status === "pending");
  rows.push(
    { id: "RC-101", date: "2026-09-12", source: "Payment gateway settlement", reference: "UPI 6021 8844 1290", amount: 24500, currency: "INR", matchedPaymentId: pending?.id, status: "partial", note: "Gateway shows success, settlement batch not yet received" },
    { id: "RC-102", date: "2026-09-10", source: "HDFC current account statement", reference: "NEFT N253091842211", amount: 38000, currency: "INR", status: "unmatched", note: "Credit without learner reference. Likely a Brightwater semester instalment." },
    { id: "RC-103", date: "2026-09-08", source: "HDFC current account statement", reference: "CHQ 004417", amount: 34000, currency: "INR", status: "unmatched", note: "Cheque deposited at branch, awaiting learner details from Coastline office" },
    { id: "RC-104", date: "2026-09-05", source: "Payment gateway settlement", reference: "pay_dup_7c2e", amount: 32000, currency: "INR", status: "investigating", note: "Duplicate payment, refund RF-0112 approved" },
  );
  return rows;
})();

export const financeSummary = (() => {
  const tuitionCollected2026 = payments.filter((p) => p.kind === "tuition" && p.status === "paid" && p.date >= "2026-01-01").reduce((s, p) => s + p.amount, 0);
  const dueNow = students.reduce((s, x) => s + x.fees.due, 0);
  const overdueStudents = students.filter((s) => s.fees.status === "overdue").length;
  const dueStudents = students.filter((s) => s.fees.status === "due").length;
  const accaTrackedGBP = accaPayments.filter((p) => p.date >= "2026-01-01").reduce((s, p) => s + p.amount, 0);
  const unreconciled = reconciliationRows.filter((r) => r.status !== "matched").length;
  const refundsOpen = refunds.filter((r) => r.status === "requested" || r.status === "approved").length;
  return { tuitionCollected2026, dueNow, overdueStudents, dueStudents, accaTrackedGBP, unreconciled, refundsOpen };
})();
