"use client";

import { useState } from "react";
import { Check, FileText, RotateCcw, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatAccaDate, type DocStatus, type Student } from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Select, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { GatedButton, MiniLabel, Note, plural } from "./common";

export type ClaimDoc = {
  name: string;
  status: DocStatus;
  uploadedOn: string;
  pages: number;
  reason?: string;
  evaluatedBy?: string;
  evaluatedOn?: string;
};

export type Claim = {
  student: Student;
  papers: string[];
  docs: ClaimDoc[];
  stage: "Documents pending" | "Estimated" | "Submitted to ACCA" | "Decided";
};

export const REJECT_REASONS = [
  "Scan unreadable",
  "Pages missing",
  "Name does not match ID proof",
  "Not an attested copy",
  "Wrong document uploaded",
] as const;

const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  verified: "Verified",
  pending: "Awaiting evaluation",
  rejected: "Re-upload requested",
  missing: "Missing",
};

export function docTone(status: DocStatus) {
  return status === "verified" ? "jade" : status === "pending" ? "amber" : status === "rejected" ? "rose" : "neutral";
}

/** A deterministic mock of the uploaded page so the evaluator has something to look at. */
function DocumentPreview({ student, doc }: { student: Student; doc: ClaimDoc }) {
  const year = student.background.qualification.match(/\d{4}/)?.[0] ?? "2023";
  const institution = student.background.institution;
  const lower = doc.name.toLowerCase();
  return (
    <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3 sm:p-5">
      <div className="mx-auto max-w-md rounded-[6px] border border-line-strong bg-surface px-5 py-6 text-ink sm:px-7">
        <p className="text-center text-[10.5px] font-bold tracking-[0.14em] text-ink-3 uppercase">{institution}</p>
        <p className="mt-1.5 text-center font-display text-[17px] leading-tight font-bold tracking-[-0.02em]">{doc.name}</p>
        <div className="mx-auto mt-3 h-px w-16 bg-line-strong" />
        {lower.includes("degree") ? (
          <p className="mt-4 text-center text-[12.5px] leading-relaxed text-ink-2">
            This is to certify that <span className="font-semibold text-ink">{student.name}</span> has been admitted to the degree of{" "}
            <span className="font-semibold text-ink">Bachelor of Commerce</span> in the examinations held in {year}.
          </p>
        ) : lower.includes("mark") ? (
          <table className="mt-4 w-full text-[11.5px]">
            <tbody>
              {[
                ["Financial Accounting", 71],
                ["Cost Accounting", 64],
                ["Business Statistics", 58],
                ["Business Law", 62],
                ["Company Law", 55],
                ["Management Accounting", 67],
              ].map(([subject, mark]) => (
                <tr key={subject as string} className="border-b border-line last:border-0">
                  <td className="py-1 text-ink-2">{subject}</td>
                  <td className="py-1 text-right font-mono text-ink tnum">{mark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <ul className="mt-4 space-y-1.5 text-[11.5px] text-ink-2">
            {["Unit 1 · Law of contract", "Unit 2 · Sale of goods and agency", "Unit 3 · Companies Act 2013: formation", "Unit 4 · Share capital and directors"].map(
              (u) => (
                <li key={u} className="flex items-center gap-2">
                  <span aria-hidden className="size-1 rounded-full bg-ink-3" />
                  {u}
                </li>
              ),
            )}
          </ul>
        )}
        <div className="mt-5 flex items-center justify-between text-[10.5px] text-ink-3">
          <span>{student.name}</span>
          <span>Page 1 of {doc.pages}</span>
        </div>
      </div>
    </div>
  );
}

export function DocumentReview({
  claims,
  selectedId,
  onSelect,
  onDecide,
  onReset,
  onRecordEstimate,
  canEdit,
  reason,
}: {
  claims: Claim[];
  selectedId: string;
  onSelect: (id: string) => void;
  onDecide: (studentId: string, docName: string, status: DocStatus, reason?: string) => void;
  onReset: (studentId: string, docName: string) => void;
  onRecordEstimate: (studentId: string) => void;
  canEdit: boolean;
  reason?: string;
}) {
  const claim = claims.find((c) => c.student.id === selectedId) ?? claims[0];
  const [docName, setDocName] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(REJECT_REASONS[0]);
  const [rejectNote, setRejectNote] = useState("");

  if (!claim) return null;
  const doc = claim.docs.find((d) => d.name === docName) ?? claim.docs.find((d) => d.status === "pending") ?? claim.docs[0];
  const verified = claim.docs.filter((d) => d.status === "verified").length;
  const allVerified = verified === claim.docs.length;

  const pick = (id: string) => {
    onSelect(id);
    setDocName(null);
    setRejecting(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]">
      <Card className="min-w-0 self-start">
        <div className="border-b border-line px-4 py-3">
          <MiniLabel>Document review queue</MiniLabel>
          <p className="mt-1 text-[12.5px] text-ink-3">
            {plural(claims.filter((c) => c.docs.some((d) => d.status === "pending")).length, "claim")} with documents to evaluate
          </p>
        </div>
        <ul className="divide-y divide-line">
          {claims.map((c) => {
            const pending = c.docs.filter((d) => d.status === "pending").length;
            const rejected = c.docs.filter((d) => d.status === "rejected").length;
            const active = c.student.id === claim.student.id;
            return (
              <li key={c.student.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => pick(c.student.id)}
                  className={cn(
                    "flex w-full min-w-0 items-start justify-between gap-3 px-4 py-3 text-left transition-colors",
                    active ? "bg-cta-soft shadow-[inset_3px_0_0_var(--cta)]" : "hover:bg-cta-soft",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{c.student.name}</span>
                    <span className="block truncate text-[12px] text-ink-3">
                      {c.student.background.qualification} · {c.papers.join(", ")}
                    </span>
                  </span>
                  {pending ? (
                    <StatusPill status="pending" tone="amber" size="sm">
                      {pending} to check
                    </StatusPill>
                  ) : rejected ? (
                    <StatusPill status="rejected" tone="rose" size="sm">
                      {rejected} returned
                    </StatusPill>
                  ) : (
                    <StatusPill status="verified" tone="jade" size="sm">
                      Verified
                    </StatusPill>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="font-display text-[19px] leading-tight font-bold tracking-[-0.02em] text-ink">{claim.student.name}</p>
            <p className="mt-1 text-[12.5px] text-ink-3">
              {claim.student.background.qualification} · {claim.student.background.institution} · claim for {claim.papers.join(", ")}
            </p>
          </div>
          <StatusPill status={claim.stage} />
        </div>

        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <MiniLabel>Documents · {verified} of {claim.docs.length} verified</MiniLabel>
            <ul className="space-y-2">
              {claim.docs.map((d) => {
                const active = d.name === doc?.name;
                return (
                  <li key={d.name}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setDocName(d.name);
                        setRejecting(false);
                      }}
                      className={cn(
                        "flex w-full min-w-0 items-start gap-2.5 rounded-[var(--radius-md)] border px-3 py-2.5 text-left transition-colors",
                        active ? "border-ink bg-cta-soft" : "border-line hover:border-line-strong hover:bg-cta-soft",
                      )}
                    >
                      <FileText aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ink">{d.name}</span>
                        <span className="mt-1 block">
                          <StatusPill status={d.status} tone={docTone(d.status)} size="sm">
                            {DOC_STATUS_LABEL[d.status]}
                          </StatusPill>
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
            {allVerified ? (
              <Note tone="jade" icon={<ShieldCheck />}>
                All documents verified.{" "}
                {claim.stage === "Documents pending" || claim.stage === "Estimated"
                  ? "Record or review the estimate next."
                  : "The claim has moved on to ACCA."}
              </Note>
            ) : null}
            {allVerified && (claim.stage === "Documents pending" || claim.stage === "Estimated") ? (
              <GatedButton
                size="sm"
                className="w-full"
                wrapperClassName="w-full"
                allowed={canEdit}
                reason={reason}
                onClick={() => onRecordEstimate(claim.student.id)}
              >
                Record estimated exemptions
              </GatedButton>
            ) : null}
          </div>

          {doc ? (
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{doc.name}</p>
                  <p className="text-[12px] text-ink-3">
                    Uploaded {formatAccaDate(doc.uploadedOn)} · {plural(doc.pages, "page")}
                    {doc.evaluatedBy ? ` · ${DOC_STATUS_LABEL[doc.status]} by ${doc.evaluatedBy}` : ""}
                  </p>
                </div>
                <StatusPill status={doc.status} tone={docTone(doc.status)}>
                  {DOC_STATUS_LABEL[doc.status]}
                </StatusPill>
              </div>

              <DocumentPreview student={claim.student} doc={doc} />

              {doc.reason ? (
                <Note tone="rose" icon={<X />}>
                  Returned: {doc.reason}
                </Note>
              ) : null}

              {rejecting ? (
                <div className="space-y-3 rounded-[var(--radius-md)] border border-line p-3.5">
                  <Field label="Reason for rejection">
                    <Select value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}>
                      {REJECT_REASONS.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Message to the learner" hint="Optional">
                    <Textarea
                      rows={2}
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="e.g. Please upload all six semester mark sheets as one PDF."
                    />
                  </Field>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button type="button" size="sm" variant="ghost" onClick={() => setRejecting(false)}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        onDecide(claim.student.id, doc.name, "rejected", rejectNote.trim() ? `${rejectReason}. ${rejectNote.trim()}` : rejectReason);
                        setDocName(doc.name);
                        setRejecting(false);
                        setRejectNote("");
                      }}
                    >
                      Reject and request re-upload
                    </Button>
                  </div>
                </div>
              ) : doc.status === "pending" ? (
                <div className="flex flex-wrap gap-2">
                  <GatedButton
                    size="sm"
                    variant="secondary"
                    allowed={canEdit}
                    reason={reason}
                    onClick={() => {
                      onDecide(claim.student.id, doc.name, "verified");
                      // Move on to the next document still waiting, otherwise stay on this one.
                      const next = claim.docs.find((d) => d.status === "pending" && d.name !== doc.name);
                      setDocName(next ? next.name : doc.name);
                    }}
                  >
                    <Check className="size-3.5" /> Verify document
                  </GatedButton>
                  <GatedButton size="sm" variant="outline" allowed={canEdit} reason={reason} onClick={() => setRejecting(true)}>
                    <X className="size-3.5" /> Reject with reason
                  </GatedButton>
                </div>
              ) : (
                <GatedButton
                  size="sm"
                  variant="ghost"
                  allowed={canEdit}
                  reason={reason}
                  onClick={() => {
                    onReset(claim.student.id, doc.name);
                    setDocName(doc.name);
                  }}
                >
                  <RotateCcw className="size-3.5" /> Reopen evaluation
                </GatedButton>
              )}
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
