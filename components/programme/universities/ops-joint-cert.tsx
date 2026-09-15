"use client";

import { useMemo, useState } from "react";
import { Award, Send } from "lucide-react";
import {
  ACCA_TODAY,
  certificateTemplates,
  formatAccaDate,
  jointCertificateRule,
  sectionById,
  students as allStudents,
  type JointCertCheckId,
  type Student,
  type University,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { MatrixCheck } from "@/components/ui/matrix";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel, Note, plural } from "../acca/common";

export type Verification = "not-sent" | "pending" | "verified" | "issued";

const VERIFY_META: Record<Verification, { label: string; tone: StatusTone }> = {
  "not-sent": { label: "Not sent", tone: "neutral" },
  pending: { label: "Pending university verification", tone: "amber" },
  verified: { label: "Verified", tone: "jade" },
  issued: { label: "Issued", tone: "info" },
};

const ELIGIBILITY_LABEL = { eligible: "Eligible", "on-track": "On track", "at-risk": "At risk" } as const;

const CRITERIA: { id: JointCertCheckId; short: string }[] = [
  { id: "applied-knowledge", short: "Applied Knowledge" },
  { id: "lw-passed", short: "LW passed" },
  { id: "attendance", short: "Attendance 75%+" },
  { id: "no-overdue-fees", short: "No overdue fees" },
];

export const SEED_VERIFICATION: Record<string, Verification> = Object.fromEntries(
  allStudents
    .filter((s) => s.jointCertificate)
    .map((s) => [s.id, s.jointCertificate!.universityVerification === "not-started" ? "not-sent" : s.jointCertificate!.universityVerification]),
);

type Row = { id: string; student: Student; status: Verification };

export function JointCertTab({
  university,
  verification,
  setVerification,
  canEdit,
  reason,
}: {
  university: University;
  verification: Record<string, Verification>;
  setVerification: React.Dispatch<React.SetStateAction<Record<string, Verification>>>;
  canEdit: boolean;
  reason?: string;
}) {
  const [eligFilter, setEligFilter] = useState("");
  const [verifyFilter, setVerifyFilter] = useState("");

  const template = certificateTemplates.find((t) => t.kind === "joint" && t.universityId === university.id);
  const templateActive = template?.status === "active";

  const rows: Row[] = useMemo(
    () =>
      allStudents
        .filter((s) => s.universityId === university.id && s.jointCertificate)
        .map((s) => ({ id: s.id, student: s, status: verification[s.id] ?? "not-sent" })),
    [university.id, verification],
  );

  const visible = rows.filter(
    (r) => (!eligFilter || r.student.jointCertificate!.status === eligFilter) && (!verifyFilter || r.status === verifyFilter),
  );

  const counts = {
    eligible: rows.filter((r) => r.student.jointCertificate!.status === "eligible").length,
    pending: rows.filter((r) => r.status === "pending").length,
    verified: rows.filter((r) => r.status === "verified").length,
    issued: rows.filter((r) => r.status === "issued").length,
  };

  const send = (ids: string[]) => {
    const target = rows.filter((r) => ids.includes(r.id) && r.student.jointCertificate!.status === "eligible" && r.status === "not-sent");
    if (!target.length) {
      toast({ title: "Nobody to send", body: "Only eligible learners not yet sent can go to the university for verification.", tone: "info" });
      return;
    }
    setVerification((v) => ({ ...v, ...Object.fromEntries(target.map((t) => [t.id, "pending" as Verification])) }));
    toast({
      title: `Sent to ${university.shortName} for verification`,
      body: `${plural(target.length, "learner")} · ${university.contact.name} is notified`,
    });
  };

  const columns: DataTableColumn<Row>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      sortValue: (r) => r.student.name,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.student.name}</span>
          <span className="block text-[12px] text-ink-3">
            Semester {r.student.semester} · {sectionById(r.student.sectionId)?.name ?? "Section"}
          </span>
        </span>
      ),
    },
    ...CRITERIA.map((c) => ({
      key: c.id,
      header: c.short,
      align: "center" as const,
      render: (r: Row) => {
        const check = r.student.jointCertificate!.checks.find((x) => x.id === c.id);
        return (
          <span title={check?.detail} className="inline-grid">
            <MatrixCheck checked={Boolean(check?.met)} label={`${c.short}: ${check?.detail ?? ""}`} />
          </span>
        );
      },
    })),
    {
      key: "eligibility",
      header: "Eligibility",
      sortable: true,
      sortValue: (r) => ["eligible", "on-track", "at-risk"].indexOf(r.student.jointCertificate!.status),
      render: (r) => {
        const jc = r.student.jointCertificate!;
        return (
          <span className="block">
            <StatusPill status={ELIGIBILITY_LABEL[jc.status]} tone={jc.status === "eligible" ? "jade" : jc.status === "on-track" ? "info" : "rose"} />
            {jc.missing.length ? <span className="mt-1 block text-[12px] text-ink-3">Needs {jc.missing.join(", ")}</span> : null}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "University verification",
      sortable: true,
      sortValue: (r) => ["pending", "verified", "not-sent", "issued"].indexOf(r.status),
      render: (r) => <StatusPill status={VERIFY_META[r.status].label} tone={VERIFY_META[r.status].tone} />,
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) => {
        const eligible = r.student.jointCertificate!.status === "eligible";
        if (r.status === "not-sent") {
          return (
            <span title={canEdit && !eligible ? `Not yet eligible: needs ${r.student.jointCertificate!.missing.join(", ")}` : undefined} className="inline-flex">
              <GatedButton size="xs" variant="outline" allowed={canEdit} reason={reason} disabled={!eligible} onClick={() => send([r.id])}>
                Send for verification
              </GatedButton>
            </span>
          );
        }
        if (r.status === "pending") {
          return (
            <GatedButton
              size="xs"
              variant="ghost"
              allowed={canEdit}
              reason={reason}
              onClick={() => toast({ title: `Reminder sent to ${university.contact.name}`, body: `Verify ${r.student.name} for the joint certificate`, tone: "info" })}
            >
              Remind university
            </GatedButton>
          );
        }
        if (r.status === "verified") {
          return (
            <span title={canEdit && !templateActive ? "The certificate template is still in draft" : undefined} className="inline-flex">
              <GatedButton
                size="xs"
                variant="secondary"
                allowed={canEdit}
                reason={reason}
                disabled={!templateActive}
                onClick={() => {
                  setVerification((v) => ({ ...v, [r.id]: "issued" }));
                  toast({ title: "Joint certificate issued", body: `${r.student.name} · ${formatAccaDate(ACCA_TODAY)} · learner notified` });
                }}
              >
                <Award className="size-3" /> Issue certificate
              </GatedButton>
            </span>
          );
        }
        return (
          <Button type="button" size="xs" variant="ghost" onClick={() => toast({ title: `Downloading ${r.student.name.toLowerCase().replace(/\s+/g, "-")}-joint-certificate.pdf`, tone: "info" })}>
            Download
          </Button>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title={template?.name ?? "Joint certificate"}
            sub={template ? `Issued by ${template.issuers.join(" and ")}` : "No joint certificate template for this university"}
            action={template ? <StatusPill status={template.status === "active" ? "Active" : "Draft"} tone={template.status === "active" ? "jade" : "neutral"} /> : null}
          />
          <div className="space-y-3 px-5 pb-5">
            <p className="text-[13px] leading-relaxed text-ink-2">{template?.rule ?? jointCertificateRule.summary}</p>
            {template ? (
              <p className="text-[12.5px] text-ink-3">Signatories: {template.signatories.join(" · ")}</p>
            ) : null}
            {template && !templateActive ? (
              <Note tone="amber">The template is in draft. Certificates can be issued once the ZSkillup Super Admin activates it.</Note>
            ) : null}
          </div>
        </Card>
        <div className="grid grid-cols-2 gap-3 self-start">
          {[
            ["Eligible", counts.eligible],
            ["Pending university verification", counts.pending],
            ["Verified", counts.verified],
            ["Issued", counts.issued],
          ].map(([label, value]) => (
            <Card key={label as string} className="min-w-0 p-4">
              <MiniLabel>{label}</MiniLabel>
              <p className="mt-2 font-display text-[24px] leading-none font-bold text-ink tnum">{value}</p>
            </Card>
          ))}
        </div>
      </div>

      <DataTable
        caption="Joint certificate eligibility"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ key: "eligibility", dir: "asc" }}
        search={{ placeholder: "Search learner", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
        empty={<p className="text-center text-[13px] text-ink-3">No learners on a joint certificate route at {university.shortName}.</p>}
        filters={
          <FilterBar
            active={Boolean(eligFilter || verifyFilter)}
            onClear={() => {
              setEligFilter("");
              setVerifyFilter("");
            }}
          >
            <FilterSelect
              label="Eligibility"
              value={eligFilter}
              onChange={setEligFilter}
              allLabel="All"
              options={(Object.keys(ELIGIBILITY_LABEL) as (keyof typeof ELIGIBILITY_LABEL)[]).map((k) => ({ value: k, label: ELIGIBILITY_LABEL[k] }))}
            />
            <FilterSelect
              label="Verification"
              value={verifyFilter}
              onChange={setVerifyFilter}
              allLabel="All"
              options={(Object.keys(VERIFY_META) as Verification[]).map((k) => ({ value: k, label: VERIFY_META[k].label }))}
            />
          </FilterBar>
        }
        selectable
        bulkActions={(ids, clear) => (
          <GatedButton
            size="sm"
            allowed={canEdit}
            reason={reason}
            onClick={() => {
              send(ids);
              clear();
            }}
          >
            <Send className="size-3.5" /> Send to university for verification
          </GatedButton>
        )}
        toolbar={
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => toast({ title: `Report queued: ${university.workspace.slug}-joint-certificate-eligibility.csv`, tone: "info" })}
          >
            Export eligibility list
          </Button>
        }
      />
    </div>
  );
}
