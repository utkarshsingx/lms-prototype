import {
  ACCA_TODAY,
  addDays,
  feePlanById,
  formatAccaDate,
  formatINR,
  programmeById,
  staffName,
  students,
  universityById,
  type Instalment,
  type Payment,
  type PaymentKind,
  type Student,
} from "@/lib/data/acca";

export type FeeRow = {
  id: string;
  name: string;
  type: Student["type"];
  programme: string;
  university?: string;
  accaId: string | null;
  fees: Student["fees"];
};

export const seedFeeRows = (): FeeRow[] =>
  students.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    programme: programmeById(s.programmeId)?.name ?? "Programme",
    university: universityById(s.universityId)?.shortName,
    accaId: s.accaId,
    fees: s.fees,
  }));

export const FEE_STATUS_LABELS: Record<Student["fees"]["status"], string> = {
  paid: "Paid in full",
  "on-track": "On track",
  due: "Due",
  overdue: "Overdue",
};

export const FEE_STATUS_TONES = { paid: "jade", "on-track": "info", due: "amber", overdue: "rose" } as const;

/** Staff with finance:record who may authorise an offline payment. */
export const FINANCE_RECORDERS = ["st-deepa", "st-priya"];

export const OFFLINE_MODES = ["Bank transfer", "Cheque", "Cash"] as const;
export type OfflineMode = (typeof OFFLINE_MODES)[number];

export const REFERENCE_HINTS: Record<OfflineMode, string> = {
  "Bank transfer": "UTR or NEFT reference, e.g. N258091842211",
  Cheque: "Cheque number and bank, e.g. 004417 HDFC Bank",
  Cash: "Cash book entry, e.g. CASH-PUNE-0917",
};

export const PAYMENT_KIND_LABELS: Record<PaymentKind, string> = {
  tuition: "Tuition",
  "acca-registration": "Registration fee",
  "acca-subscription": "Annual subscription",
  "acca-exemption": "Exemption fee",
  "acca-exam": "Exam entry",
};

export function unpaidInstalments(fees: Student["fees"]) {
  return fees.instalments.filter((i) => i.status !== "paid");
}

export function planName(planId: string) {
  return feePlanById(planId)?.name ?? planId;
}

/** Marks an instalment paid (the form requires at least the instalment amount) and recomputes the fee summary. */
export function applyPayment(fees: Student["fees"], n: number, amount: number, paidOn: string): Student["fees"] {
  const instalments: Instalment[] = fees.instalments.map((i) =>
    i.n === n && amount >= i.amount ? { ...i, status: "paid", paidOn } : i,
  );
  const paid = fees.paid + amount;
  const outstanding = instalments.filter((i) => i.status === "due" || i.status === "overdue");
  const due = outstanding.reduce((s, i) => s + i.amount, 0);
  const balance = Math.max(0, fees.total - paid);
  const status: Student["fees"]["status"] = outstanding.some((i) => i.status === "overdue")
    ? "overdue"
    : outstanding.length
      ? "due"
      : balance === 0
        ? "paid"
        : "on-track";
  const next = instalments.find((i) => i.status !== "paid");
  return { ...fees, instalments, paid, due, balance, status, nextDueDate: next?.dueDate ?? null };
}

export function instalmentLabel(i: Instalment) {
  return `Instalment ${i.n} · ${formatINR(i.amount)} · due ${formatAccaDate(i.dueDate)}`;
}

export function recorderLabel(id: string) {
  return id === "System" ? "System" : staffName(id);
}

export function methodKind(p: Payment) {
  return p.offline ? "Offline" : "Online";
}

/** Offline payments may be back-dated up to 30 days. */
export const EARLIEST_BACKDATE = addDays(ACCA_TODAY, -30);

export function fillTemplate(body: string, values: Record<string, string>) {
  return body.replace(/\{\{(\w+)\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}
