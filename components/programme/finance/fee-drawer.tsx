"use client";

import { BellRing, FileText, Wallet } from "lucide-react";
import { formatAccaDate, formatINR, type Payment, type PaymentReminder } from "@/lib/data/acca";
import { Drawer } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status";
import { FEE_STATUS_LABELS, FEE_STATUS_TONES, planName, type FeeRow } from "./finance-helpers";

const label = "text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase";

export function FeeDrawer({
  row,
  payments,
  reminders,
  canRecord,
  onClose,
  onRecord,
  onRemind,
  onOpenReceipt,
}: {
  row: FeeRow | null;
  payments: Payment[];
  reminders: PaymentReminder[];
  canRecord: boolean;
  onClose: () => void;
  onRecord: (studentId: string, n?: number) => void;
  onRemind: (studentId: string) => void;
  onOpenReceipt: (receiptId: string) => void;
}) {
  const mine = row ? payments.filter((p) => p.studentId === row.id) : [];
  const sent = row ? reminders.filter((r) => r.studentId === row.id) : [];
  const hasUnpaid = row ? row.fees.instalments.some((i) => i.status !== "paid") : false;
  const lockedReason = "Needs the finance:record permission";

  return (
    <Drawer
      open={row !== null}
      onClose={onClose}
      width="w-full max-w-xl"
      title={row?.name ?? "Learner"}
      sub={row ? `${row.type === "graduate" ? "Graduate" : "Undergraduate"} · ${row.university ?? row.programme} · ${planName(row.fees.planId)}` : undefined}
      footer={
        row ? (
          <>
            <span title={canRecord ? undefined : lockedReason} className="inline-flex">
              <Button type="button" variant="secondary" disabled={!canRecord || !hasUnpaid} onClick={() => onRemind(row.id)}>
                <BellRing className="size-4" /> Send reminder
              </Button>
            </span>
            <span title={canRecord ? undefined : lockedReason} className="inline-flex">
              <Button type="button" disabled={!canRecord || !hasUnpaid} onClick={() => onRecord(row.id)}>
                <Wallet className="size-4" /> Record offline payment
              </Button>
            </span>
          </>
        ) : null
      }
    >
      {row ? (
        <div className="space-y-6 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill status={row.fees.status} tone={FEE_STATUS_TONES[row.fees.status]}>
              {FEE_STATUS_LABELS[row.fees.status]}
            </StatusPill>
            {row.fees.nextDueDate ? <span className="text-[12.5px] text-ink-3">Next due {formatAccaDate(row.fees.nextDueDate)}</span> : null}
          </div>
          <dl className="grid grid-cols-3 gap-2">
            {[
              ["Plan total", formatINR(row.fees.total)],
              ["Paid", formatINR(row.fees.paid)],
              ["Balance", formatINR(row.fees.balance)],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 rounded-[var(--radius-md)] border border-line bg-surface-2 px-2.5 py-2.5 sm:px-3">
                <dt className="truncate text-[11px] font-bold tracking-[0.08em] text-ink-3 uppercase">{k}</dt>
                <dd className="mt-1 truncate font-display text-[15px] leading-none font-bold text-ink tnum sm:text-[17px]">{v}</dd>
              </div>
            ))}
          </dl>

          <section>
            <h3 className={label}>Instalment schedule</h3>
            <ul className="mt-3 divide-y divide-line rounded-[var(--radius-md)] border border-line">
              {row.fees.instalments.map((i) => (
                <li key={i.n} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3.5 py-2.5">
                  <span className="w-8 shrink-0 font-mono text-[12px] text-ink-3">#{i.n}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-ink tnum">{formatINR(i.amount)}</span>
                    <span className="block text-[12px] text-ink-3">
                      Due {formatAccaDate(i.dueDate)}
                      {i.paidOn ? ` · paid ${formatAccaDate(i.paidOn)}` : ""}
                    </span>
                  </span>
                  <StatusPill status={i.status} size="sm" />
                  {i.status !== "paid" ? (
                    <span title={canRecord ? undefined : lockedReason} className="inline-flex">
                      <Button type="button" size="xs" variant="outline" disabled={!canRecord} onClick={() => onRecord(row.id, i.n)}>
                        Record payment
                      </Button>
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h3 className={label}>Payments and receipts</h3>
            {mine.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-3">No tuition payments recorded yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line rounded-[var(--radius-md)] border border-line">
                {mine.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-ink">{p.description}</span>
                      <span className="block text-[12px] text-ink-3">
                        {formatAccaDate(p.date)} · {p.method} · {p.offline ? "offline" : "online"}
                      </span>
                    </span>
                    <span className="font-mono text-[12.5px] font-semibold text-ink tnum">{formatINR(p.amount)}</span>
                    {p.receiptId ? (
                      <Button type="button" size="xs" variant="ghost" onClick={() => onOpenReceipt(p.receiptId!)}>
                        <FileText className="size-3.5" /> {p.receiptId}
                      </Button>
                    ) : (
                      <StatusPill status={p.status} size="sm" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className={label}>Reminders sent</h3>
            {sent.length === 0 ? (
              <p className="mt-2 text-[13px] text-ink-3">No payment reminders sent to this learner.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {sent.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 text-ink-2">
                      {r.subject} · <span className="text-ink-3">{formatAccaDate(r.sentOn)}</span>
                    </span>
                    <StatusPill status={r.status} size="sm" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
