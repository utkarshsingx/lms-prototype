"use client";

import { useState } from "react";
import { Award, BadgeCheck, Download, Link2, Plus, QrCode, ShieldCheck, UserPlus, X } from "lucide-react";
import {
  certificateTemplates,
  groupIndian,
  jointCertificateRule,
  universities,
  universityById,
  type CertificateTemplate,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { AdminConfigFrame, BlockHeading, MiniLabel, queueExport } from "./shared";
import { inkOn } from "../core/shared";

const KIND_LABEL: Record<CertificateTemplate["kind"], string> = {
  joint: "Joint certificate",
  paper: "Paper completion",
  programme: "Programme completion",
  internship: "Internship",
  "epsm-support": "EPSM study support",
};

const SAMPLE: Record<CertificateTemplate["kind"], { learner: string; line: string }> = {
  joint: { learner: "Rohan Iyer", line: "has completed the ACCA component of the programme and met every joint certificate criterion." },
  paper: { learner: "Anaya Rao", line: "has completed the Taxation (TX-UK) course and a full mock exam at 50% or above." },
  programme: { learner: "Sanya Kulkarni", line: "has completed the ACCA Graduate Pathway with all planned papers passed or exempt." },
  internship: { learner: "Pallavi Krishnan", line: "has completed a 480-hour internship with Marlow and Iyer Chartered Accountants, with supervisor feedback." },
  "epsm-support": { learner: "Anaya Rao", line: "has attended every EPSM study support session. ACCA confirms EPSM completion separately." },
};

const ID_FORMATS = ["ZSK-ACCA-{year}-{serial}", "{university}-JC-{year}-{serial}", "{paper}-{year}-{serial}"];

type Verification = {
  domain: string;
  prefix: string;
  format: string;
  qr: boolean;
  showName: boolean;
  showProgramme: boolean;
  showDate: boolean;
  showPapers: boolean;
  revoked: boolean;
};

function exampleId(format: string, tpl: CertificateTemplate) {
  const uni = universityById(tpl.universityId);
  return format
    .replace("{year}", "2027")
    .replace("{serial}", tpl.kind === "joint" ? "0001" : "000184")
    .replace("{university}", uni?.branding.logoInitials ?? "ZSK")
    .replace("{paper}", tpl.kind === "paper" ? "TX" : "ACCA");
}

/** A deterministic 9 × 9 pattern standing in for the QR code. */
function QrMark({ seed }: { seed: string }) {
  const bits = Array.from({ length: 81 }, (_, i) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    const finder = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
    if (finder) return !(r % 2 === 1 && c % 2 === 1 && (r === 1 || r === 7) && (c === 1 || c === 7));
    return (seed.charCodeAt(i % seed.length) * (i + 3)) % 5 < 2;
  });
  return (
    <span aria-hidden className="grid size-16 shrink-0 grid-cols-9 gap-px rounded-md border border-line bg-surface p-1">
      {bits.map((on, i) => (
        <span key={i} className={on ? "bg-ink" : "bg-surface"} />
      ))}
    </span>
  );
}

function CertificatePreview({ tpl, verification }: { tpl: CertificateTemplate; verification: Verification }) {
  const uni = universityById(tpl.universityId);
  const sample = SAMPLE[tpl.kind];
  const id = exampleId(verification.format, tpl);
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-line-strong bg-surface">
      <div aria-hidden className="h-2 bg-cta" style={uni ? { backgroundColor: uni.branding.primary } : undefined} />
      <div className="p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {uni ? (
              <span className="grid size-10 place-items-center rounded-[10px] font-display text-[15px] font-bold" style={{ backgroundColor: uni.branding.primary, color: inkOn(uni.branding.primary) }}>
                {uni.branding.logoInitials}
              </span>
            ) : null}
            <span className="grid size-10 place-items-center rounded-[10px] bg-surface-inv font-display text-[15px] font-bold text-cta">ZS</span>
          </div>
          <span className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">{tpl.issuers.join(" × ")}</span>
        </div>
        <p className="mt-6 text-[11px] font-bold tracking-[0.14em] text-ink-3 uppercase">{KIND_LABEL[tpl.kind]}</p>
        <h3 className="mt-1.5 font-display text-[clamp(1.2rem,1rem+1vw,1.6rem)] leading-tight font-bold tracking-[-0.02em] text-ink">{tpl.name}</h3>
        <p className="mt-5 text-[13px] text-ink-3">This is to certify that</p>
        <p className="mt-1 font-display text-[clamp(1.4rem,1.1rem+1.2vw,2rem)] leading-tight font-bold text-ink underline decoration-cta decoration-4 underline-offset-8">
          {verification.showName ? sample.learner : "Name hidden on public page"}
        </p>
        <p className="mt-4 max-w-xl text-[13.5px] leading-relaxed text-ink-2">{sample.line}</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {tpl.signatories.map((s) => {
            const [name, ...role] = s.split(", ");
            return (
              <div key={s} className="min-w-0">
                <div className="h-8 border-b border-ink-3" />
                <p className="mt-1.5 truncate text-[13px] font-semibold text-ink">{name}</p>
                <p className="truncate text-[12px] text-ink-3">{role.join(", ")}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-line pt-4">
          <div className="min-w-0 text-[12px] text-ink-3">
            <p>
              Certificate ID <span className="font-mono font-semibold text-ink">{id}</span>
              {verification.showDate ? " · issued 14 Sep 2026" : ""}
            </p>
            <p className="mt-0.5 break-all">
              Verify at <span className="font-mono text-ink">https://{verification.domain}/{verification.prefix}/{id}</span>
            </p>
            <p className="mt-0.5">Issued by the named issuers. Not an ACCA qualification or award.</p>
          </div>
          {verification.qr ? <QrMark seed={id} /> : null}
        </div>
      </div>
    </div>
  );
}

export function CertificatesConfigPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>(certificateTemplates);
  const [selectedId, setSelectedId] = useState("cert-bw-joint");
  const [creating, setCreating] = useState(false);
  const [addingSignatory, setAddingSignatory] = useState(false);
  const [editingRule, setEditingRule] = useState(false);
  const [verification, setVerification] = useState<Verification>({
    domain: "verify.zskillup.com",
    prefix: "acca",
    format: ID_FORMATS[0],
    qr: true,
    showName: true,
    showProgramme: true,
    showDate: true,
    showPapers: false,
    revoked: true,
  });

  const tpl = templates.find((t) => t.id === selectedId) ?? templates[0];
  const update = (id: string, patch: Partial<CertificateTemplate>) => setTemplates((list) => list.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Configuration"
        title="Certificates"
        sub="Configure certificates: templates with a live preview, signatories, eligibility rules and the public verification link printed on every certificate."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("certificates-issued-register.csv")}>
              <Download className="size-4" />
              Issued register
            </Button>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              New template
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Certificates issued" value={groupIndian(templates.reduce((s, t) => s + t.issued, 0))} icon={<Award />} />
        <KpiTile label="Templates" value={templates.length} sub={`${templates.filter((t) => t.status === "active").length} active`} tone="jade" icon={<BadgeCheck />} />
        <KpiTile label="Joint certificate templates" value={templates.filter((t) => t.kind === "joint").length} sub="With partner universities" tone="info" />
        <KpiTile label="Verifications in 30 days" value="318" delta="+42" trend="up" tone="violet" icon={<ShieldCheck />} />
      </KpiRow>

      <section className="space-y-4">
        <BlockHeading title="Certificate templates" sub="Select a template to preview it, change signatories or edit who is eligible." />
        <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
          <ul className="grid min-w-0 gap-2.5 self-start sm:grid-cols-2 lg:grid-cols-1">
            {templates.map((t) => {
              const active = t.id === tpl.id;
              return (
                <li key={t.id} className="min-w-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      "w-full rounded-[16px] border p-4 text-left transition-colors",
                      active ? "border-ink bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                    )}
                  >
                    <span className="flex items-start justify-between gap-2">
                      <span className="min-w-0 text-[13.5px] leading-snug font-semibold text-ink">{t.name}</span>
                      <StatusPill status={t.status} size="sm" />
                    </span>
                    <span className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                      <Badge tone={t.kind === "joint" ? "info" : "neutral"}>{KIND_LABEL[t.kind]}</Badge>
                      <span className="tnum">{groupIndian(t.issued)} issued</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="min-w-0 space-y-5">
            <Card className="p-4 sm:p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <MiniLabel>Preview</MiniLabel>
                  <p className="mt-1 text-[13px] text-ink-2">
                    Issuers: {tpl.issuers.join(" and ")} · {groupIndian(tpl.issued)} issued
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Switch
                    checked={tpl.status === "active"}
                    onChange={(on) => {
                      update(tpl.id, { status: on ? "active" : "draft" });
                      toast({ title: on ? "Template activated" : "Template moved to draft", body: tpl.name, tone: on ? "success" : "warning" });
                    }}
                    label={tpl.status === "active" ? "Active" : "Draft"}
                  />
                  <Button size="sm" variant="secondary" onClick={() => toast({ title: "Test certificate issued", body: `${SAMPLE[tpl.kind].learner} · ${exampleId(verification.format, tpl)} sent to neha.kapoor@zskillup.com`, tone: "info" })}>
                    Issue test certificate
                  </Button>
                </div>
              </div>
              <CertificatePreview tpl={tpl} verification={verification} />
            </Card>

            <div className="grid gap-5 md:grid-cols-2">
              <Card className="min-w-0">
                <CardHeader
                  title="Signatories"
                  sub="Printed in this order. Signature images are stored encrypted."
                  action={
                    <Button size="xs" variant="outline" onClick={() => setAddingSignatory(true)}>
                      <UserPlus className="size-3.5" />
                      Add
                    </Button>
                  }
                />
                <ul className="divide-y divide-line border-t border-line px-5">
                  {tpl.signatories.map((s) => (
                    <li key={s} className="flex items-center justify-between gap-3 py-3">
                      <span className="min-w-0 text-[13px] text-ink">{s}</span>
                      <button
                        type="button"
                        aria-label={`Remove ${s}`}
                        disabled={tpl.signatories.length === 1}
                        title={tpl.signatories.length === 1 ? "A certificate needs at least one signatory" : undefined}
                        onClick={() => {
                          update(tpl.id, { signatories: tpl.signatories.filter((x) => x !== s) });
                          toast({ title: "Signatory removed", body: s, tone: "warning" });
                        }}
                        className="grid size-7 shrink-0 place-items-center rounded-md text-ink-3 hover:bg-rose-soft hover:text-rose disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="min-w-0">
                <CardHeader
                  title="Eligibility rules"
                  sub="Checked nightly. Eligible learners are queued for issue."
                  action={
                    <Button size="xs" variant="outline" onClick={() => setEditingRule(true)}>
                      Edit
                    </Button>
                  }
                />
                <div className="space-y-3 border-t border-line p-5">
                  <ul className="space-y-2">
                    {tpl.rule.split(" + ").map((r) => (
                      <li key={r} className="flex gap-2.5 text-[13px] text-ink-2">
                        <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jade" />
                        <span className="min-w-0">{r}</span>
                      </li>
                    ))}
                  </ul>
                  {tpl.kind === "joint" ? (
                    <p className="text-[12px] text-ink-3">The university verifies eligibility before issue. Issued certificates carry both seals.</p>
                  ) : null}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Link2 className="size-4 text-ink-3" />
              Verification URL settings
            </span>
          }
          sub="Employers and universities check a certificate at this link or by scanning its QR code."
        />
        <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Verification domain">
                <Input value={verification.domain} onChange={(e) => setVerification((v) => ({ ...v, domain: e.target.value }))} className="font-mono" />
              </Field>
              <Field label="Path prefix">
                <Input value={verification.prefix} onChange={(e) => setVerification((v) => ({ ...v, prefix: e.target.value.replace(/\s+/g, "-") }))} className="font-mono" />
              </Field>
            </div>
            <Field label="Certificate ID format">
              <Select value={verification.format} onChange={(e) => setVerification((v) => ({ ...v, format: e.target.value }))}>
                {ID_FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="rounded-[14px] border border-cta bg-cta-soft p-3.5">
              <p className="text-[12px] text-ink-3">Example link for the selected template</p>
              <p className="mt-1 font-mono text-[13px] font-semibold break-all text-ink">
                https://{verification.domain}/{verification.prefix}/{exampleId(verification.format, tpl)}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <Switch checked={verification.qr} onChange={(v) => setVerification((s) => ({ ...s, qr: v }))} label="Print a QR code" sub="Links to the verification page" />
            <MiniLabel>Shown on the public verification page</MiniLabel>
            <Switch checked={verification.showName} onChange={(v) => setVerification((s) => ({ ...s, showName: v }))} label="Learner name" />
            <Switch checked={verification.showProgramme} onChange={(v) => setVerification((s) => ({ ...s, showProgramme: v }))} label="Programme and issuers" />
            <Switch checked={verification.showDate} onChange={(v) => setVerification((s) => ({ ...s, showDate: v }))} label="Issue date" />
            <Switch checked={verification.showPapers} onChange={(v) => setVerification((s) => ({ ...s, showPapers: v }))} label="Papers covered" sub="Scores are never shown" />
            <Switch checked={verification.revoked} onChange={(v) => setVerification((s) => ({ ...s, revoked: v }))} label="Revoked certificates show as revoked" />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button onClick={() => toast({ title: "Verification settings saved", body: `https://${verification.domain}/${verification.prefix}/` })}>Save verification settings</Button>
              <Button variant="outline" onClick={() => toast({ title: "Verification link works", body: `${exampleId(verification.format, tpl)} resolves to ${tpl.name}`, tone: "info" })}>
                <QrCode className="size-4" />
                Test link
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* new template */}
      <FormDrawer
        open={creating}
        onClose={() => setCreating(false)}
        title="New certificate template"
        sub="Templates start as drafts. Activate one when its rules and signatories are final."
        submitLabel="Create template"
        onSubmit={(data) => {
          const issuers = data.getAll("issuers").map(String);
          const uni = universities.find((u) => issuers.includes(u.name));
          const row: CertificateTemplate = {
            id: `cert-new-${templates.length + 1}`,
            name: String(data.get("name") ?? "").trim(),
            kind: String(data.get("kind")) as CertificateTemplate["kind"],
            issuers: issuers.length ? issuers : ["ZSkillup"],
            universityId: uni?.id,
            rule: String(data.get("rule") ?? "").trim() || "Course completed",
            signatories: String(data.get("signatories") ?? "")
              .split("\n")
              .map((s) => s.trim())
              .filter(Boolean),
            status: "draft",
            issued: 0,
          };
          if (row.signatories.length === 0) row.signatories = ["Neha Kapoor, Platform Director"];
          setTemplates((list) => [row, ...list]);
          setSelectedId(row.id);
          toast({ title: "Certificate template created", body: `${row.name} · draft` });
          setCreating(false);
        }}
      >
        <Field label="Template name">
          <Input name="name" required placeholder="e.g. B.Com with ACCA Pathway · Coastline joint certificate" />
        </Field>
        <Field label="Type">
          <Select name="kind" defaultValue="paper">
            {Object.entries(KIND_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Issuers</legend>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Checkbox name="issuers" value="ZSkillup" label="ZSkillup" defaultChecked />
            {universities.map((u) => (
              <Checkbox key={u.id} name="issuers" value={u.name} label={u.name} />
            ))}
          </div>
        </fieldset>
        <Field label="Eligibility rule" hint="Join conditions with +">
          <Textarea name="rule" rows={3} placeholder="Course completed + one full mock at 50% or above" />
        </Field>
        <Field label="Signatories" hint="One per line: name, designation">
          <Textarea name="signatories" rows={3} defaultValue="Priya Menon, ACCA Programme Lead" />
        </Field>
      </FormDrawer>

      {/* add signatory */}
      <FormDrawer
        open={addingSignatory}
        onClose={() => setAddingSignatory(false)}
        title="Add signatory"
        sub={tpl.name}
        submitLabel="Add signatory"
        onSubmit={(data) => {
          const entry = `${String(data.get("name") ?? "").trim()}, ${String(data.get("designation") ?? "").trim()}`;
          update(tpl.id, { signatories: [...tpl.signatories, entry] });
          toast({ title: "Signatory added", body: entry });
          setAddingSignatory(false);
        }}
      >
        <Field label="Name">
          <Input name="name" required placeholder="e.g. Prof. Lakshmi Rao" />
        </Field>
        <Field label="Designation">
          <Input name="designation" required placeholder="e.g. Dean of Commerce" />
        </Field>
        <FileDrop label="Signature image" accept=".png,.svg" multiple={false} hint="Transparent PNG or SVG, at least 600 px wide." />
      </FormDrawer>

      {/* eligibility */}
      <FormDrawer
        open={editingRule}
        onClose={() => setEditingRule(false)}
        title="Edit eligibility rules"
        sub={tpl.name}
        submitLabel="Save rules"
        onSubmit={(data) => {
          let rule: string;
          if (tpl.kind === "joint") {
            const threshold = Number(data.get("attendance")) || 75;
            const chosen = data.getAll("criteria").map(String);
            rule = jointCertificateRule.criteria
              .filter((c) => chosen.includes(c.id))
              .map((c) => (c.id === "attendance" ? `attendance in ACCA sessions at least ${threshold}%` : c.id === "no-overdue-fees" ? "no overdue fees" : c.label))
              .join(" + ");
          } else {
            rule = String(data.get("rule") ?? "").trim();
          }
          update(tpl.id, { rule: rule || tpl.rule });
          toast({ title: "Eligibility rules saved", body: `Rechecked for ${tpl.kind === "joint" ? "142 Brightwater learners" : "eligible learners"} tonight` });
          setEditingRule(false);
        }}
      >
        {tpl.kind === "joint" ? (
          <div key={tpl.id} className="space-y-4">
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Criteria</legend>
              <div className="space-y-2.5">
                {jointCertificateRule.criteria.map((c) => (
                  <Checkbox key={c.id} name="criteria" value={c.id} label={c.label} defaultChecked />
                ))}
              </div>
            </fieldset>
            <Field label="Minimum attendance in ACCA sessions">
              <Input name="attendance" type="number" min={50} max={100} defaultValue={75} className="font-mono" />
            </Field>
          </div>
        ) : (
          <Field label="Rule" hint="Join conditions with +" key={tpl.id}>
            <Textarea name="rule" rows={4} defaultValue={tpl.rule} required />
          </Field>
        )}
      </FormDrawer>
    </AdminConfigFrame>
  );
}
