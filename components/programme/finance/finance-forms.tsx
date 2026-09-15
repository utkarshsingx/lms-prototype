"use client";

import { useState } from "react";
import {
  ACCA_TODAY,
  formatAccaDate,
  formatINR,
  messageTemplates,
  staffName,
} from "@/lib/data/acca";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import {
  EARLIEST_BACKDATE,
  FEE_STATUS_LABELS,
  FINANCE_RECORDERS,
  OFFLINE_MODES,
  REFERENCE_HINTS,
  fillTemplate,
  instalmentLabel,
  planName,
  unpaidInstalments,
  type FeeRow,
  type OfflineMode,
} from "./finance-helpers";

/** Fields for "Record offline payment". Reads by name: student, instalment, amount, mode, reference, date, authorisedBy, receipt, note. */
export function RecordPaymentFields({
  rows,
  initialStudentId,
  initialInstalment,
  defaultAuthoriser,
}: {
  rows: FeeRow[];
  initialStudentId?: string;
  initialInstalment?: number;
  defaultAuthoriser?: string;
}) {
  const payable = rows.filter((r) => unpaidInstalments(r.fees).length > 0).sort((a, b) => a.name.localeCompare(b.name));
  const firstOverdue = rows.find((r) => r.fees.status === "overdue");
  const [studentId, setStudentId] = useState(initialStudentId ?? firstOverdue?.id ?? payable[0]?.id ?? "");
  const row = rows.find((r) => r.id === studentId);
  const options = row ? unpaidInstalments(row.fees) : [];
  const [n, setN] = useState<number>(initialInstalment ?? options[0]?.n ?? 1);
  const instalment = options.find((i) => i.n === n) ?? options[0];
  const [amount, setAmount] = useState(String(instalment?.amount ?? ""));
  const [mode, setMode] = useState<OfflineMode>("Bank transfer");

  return (
    <>
      <Field label="Learner">
        <Select
          name="student"
          value={studentId}
          onChange={(e) => {
            const next = rows.find((r) => r.id === e.target.value);
            const first = next ? unpaidInstalments(next.fees)[0] : undefined;
            setStudentId(e.target.value);
            setN(first?.n ?? 1);
            setAmount(String(first?.amount ?? ""));
          }}
        >
          {payable.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} · {FEE_STATUS_LABELS[r.fees.status]}
            </option>
          ))}
        </Select>
      </Field>
      {row ? (
        <p className="-mt-2 text-[12px] text-ink-3">
          {planName(row.fees.planId)} · paid {formatINR(row.fees.paid)} of {formatINR(row.fees.total)}
        </p>
      ) : null}
      <Field label="Instalment">
        <Select
          name="instalment"
          value={instalment?.n ?? ""}
          onChange={(e) => {
            const next = options.find((i) => i.n === Number(e.target.value));
            setN(Number(e.target.value));
            setAmount(String(next?.amount ?? ""));
          }}
        >
          {options.map((i) => (
            <option key={i.n} value={i.n}>
              {instalmentLabel(i)} · {i.status === "upcoming" ? "Upcoming" : i.status === "overdue" ? "Overdue" : "Due"}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount received (₹)" hint={instalment ? `At least ${formatINR(instalment.amount)}` : undefined}>
          <Input
            name="amount"
            type="number"
            inputMode="numeric"
            required
            min={instalment?.amount ?? 1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="font-mono"
          />
        </Field>
        <Field label="Date received">
          <Input name="date" type="date" required defaultValue={ACCA_TODAY} min={EARLIEST_BACKDATE} max={ACCA_TODAY} />
        </Field>
      </div>
      <Field label="Mode">
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Payment mode">
          {OFFLINE_MODES.map((m) => (
            <label
              key={m}
              className={
                "flex cursor-pointer items-center justify-center rounded-[var(--radius-md)] border px-2 py-2.5 text-center text-[13px] font-semibold transition-colors " +
                (mode === m ? "border-transparent bg-nav-active text-nav-active-ink" : "border-line bg-surface text-ink-2 hover:bg-cta-soft")
              }
            >
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {m}
            </label>
          ))}
        </div>
      </Field>
      <Field label="Reference">
        <Input name="reference" required placeholder={REFERENCE_HINTS[mode]} className="font-mono" />
      </Field>
      <Field label="Authorised by" hint="Needs finance:record">
        <Select name="authorisedBy" defaultValue={defaultAuthoriser && FINANCE_RECORDERS.includes(defaultAuthoriser) ? defaultAuthoriser : FINANCE_RECORDERS[0]}>
          {FINANCE_RECORDERS.map((id) => (
            <option key={id} value={id}>
              {staffName(id)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Note" hint="Optional">
        <Textarea name="note" rows={2} placeholder="e.g. Paid at the Pune centre by the learner's parent." />
      </Field>
      <Checkbox name="receipt" defaultChecked label="Generate the receipt now and add it to the learner's Payments page" />
    </>
  );
}

const TEMPLATES = messageTemplates.filter((t) => t.id === "tpl-fee-due" || t.id === "tpl-fee-overdue");

/** Fields for "Send payment reminders". Reads by name: channel, template. */
export function ReminderFields({ recipients }: { recipients: FeeRow[] }) {
  const anyOverdue = recipients.some((r) => r.fees.status === "overdue");
  const [templateId, setTemplateId] = useState(anyOverdue ? "tpl-fee-overdue" : "tpl-fee-due");
  const [channel, setChannel] = useState("whatsapp");
  const sample = recipients[0];
  const next = sample ? unpaidInstalments(sample.fees)[0] : undefined;
  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const preview = sample && next
    ? fillTemplate(template.body, {
        first_name: sample.name.split(" ")[0],
        instalment_no: String(next.n),
        amount: formatINR(next.amount),
        plan_name: planName(sample.fees.planId),
        due_date: formatAccaDate(next.dueDate),
      })
    : template.body;

  return (
    <>
      <div>
        <p className="mb-2 text-[12.5px] font-semibold text-ink-2">
          {recipients.length} {recipients.length === 1 ? "learner" : "learners"} with an instalment to pay
        </p>
        <ul className="flex flex-wrap gap-1.5">
          {recipients.slice(0, 10).map((r) => (
            <li key={r.id} className="rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink">
              {r.name}
            </li>
          ))}
          {recipients.length > 10 ? (
            <li className="rounded-full px-2 py-0.5 text-[12px] text-ink-3">and {recipients.length - 10} more</li>
          ) : null}
        </ul>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Channel">
          <Select name="channel" value={channel} onChange={(e) => setChannel(e.target.value)}>
            <option value="whatsapp">WhatsApp</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="in-app">In-app notification</option>
          </Select>
        </Field>
        <Field label="Message template">
          <Select name="template" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4">
        <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Preview for {sample?.name ?? "the first learner"}</p>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink">{preview}</p>
      </div>
      <p className="text-[12px] text-ink-3">
        Approved templates only. Quiet hours apply, and each learner gets at most one payment reminder a day.
      </p>
    </>
  );
}
