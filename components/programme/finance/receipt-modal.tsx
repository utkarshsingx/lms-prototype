"use client";

import { Download, Mail } from "lucide-react";
import { formatAccaDate, formatINR, studentById, type Payment, type Receipt } from "@/lib/data/acca";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { recorderLabel } from "./finance-helpers";

export function ReceiptModal({
  receipt,
  payment,
  onClose,
}: {
  receipt: Receipt | null;
  payment: Payment | undefined;
  onClose: () => void;
}) {
  const s = receipt ? studentById(receipt.studentId) : undefined;
  return (
    <Modal
      open={receipt !== null}
      onClose={onClose}
      width="max-w-xl"
      title={receipt ? `Receipt ${receipt.id}` : "Receipt"}
      sub="Tuition received by ZSkillup. Fees paid to ACCA are not receipted here."
      footer={
        receipt ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast({ title: `Receipt emailed to ${s?.name ?? "the learner"}`, body: `${receipt.id} sent to ${s?.email ?? "their email"}` })}
            >
              <Mail className="size-4" /> Email to learner
            </Button>
            <Button
              type="button"
              onClick={() => toast({ title: `Receipt downloaded: ${receipt.id}.pdf`, body: `${formatINR(receipt.amount)} · ${s?.name ?? ""}`, tone: "info" })}
            >
              <Download className="size-4" /> Download receipt
            </Button>
          </>
        ) : null
      }
    >
      {receipt ? (
        <article className="overflow-hidden rounded-[var(--radius-lg)] border border-line">
          <header className="flex flex-wrap items-center justify-between gap-3 bg-surface-inv px-5 py-4 text-ink-inv">
            <div className="min-w-0">
              <p className="font-display text-[18px] leading-none font-bold tracking-[-0.02em]">ACCA LMS</p>
              <p className="mt-1 text-[11.5px] text-ink-inv/70">Powered by ZSkillup</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">Payment receipt</p>
              <p className="mt-1 font-mono text-[13px]">{receipt.id}</p>
            </div>
          </header>
          <dl className="divide-y divide-line px-5 text-[13px]">
            {[
              ["Issued on", formatAccaDate(receipt.issuedOn)],
              ["Received from", `${s?.name ?? receipt.studentId}${s?.accaId ? ` · ACCA ID ${s.accaId}` : ""}`],
              ["Towards", receipt.description],
              ["Payment", payment ? `${payment.id} · ${payment.method} · ${payment.reference}` : "Recorded payment"],
              ["Date received", payment ? formatAccaDate(payment.date) : formatAccaDate(receipt.issuedOn)],
              ["Issued by", recorderLabel(receipt.issuedBy)],
            ].map(([k, v]) => (
              <div key={k} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2.5">
                <dt className="text-ink-3">{k}</dt>
                <dd className="min-w-0 text-right font-medium break-words text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="flex items-end justify-between gap-3 border-t border-line bg-surface-2 px-5 py-4">
            <p className="text-[12px] text-ink-3">Amount received (INR)</p>
            <p className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{formatINR(receipt.amount)}</p>
          </div>
        </article>
      ) : null}
    </Modal>
  );
}
