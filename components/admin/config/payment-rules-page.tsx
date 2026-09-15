"use client";

import { useMemo, useState } from "react";
import { BellRing, Download, IndianRupee, Pencil, Plus, Wallet } from "lucide-react";
import {
  ACCA_TODAY,
  FINANCE_SCOPE_NOTE,
  accaFeesGBP,
  addDays,
  daysBetween,
  feePlans,
  financeSummary,
  formatAccaDate,
  formatGBP,
  formatINR,
  paymentRules,
  programmeById,
  programmes,
  studentById,
  type FeePlan,
  type PaymentRule,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, toneFill, toneText, type StatusTone } from "@/components/ui/status";
import { cn } from "@/lib/cn";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { AdminConfigFrame, BlockHeading, MiniLabel, queueExport } from "./shared";

type GroupId = "late" | "refund" | "acca" | "discount" | "hold";
type RuleRow = PaymentRule & { group: GroupId };

const GROUP_OF: Record<string, GroupId> = {
  "pr-late-fee": "late",
  "pr-grace": "late",
  "pr-reminders": "late",
  "pr-upfront": "discount",
  "pr-refund": "refund",
  "pr-transfer": "refund",
  "pr-acca-fees": "acca",
  "pr-block": "hold",
};

const EXTRA_RULES: RuleRow[] = [
  { id: "pr-refund-partial", name: "Partial refund window", appliesTo: "Open-market programmes", rule: "Unused instalments refunded at 50% between day 15 and day 30 of enrolment", value: "15 to 30 days, 50%", status: "active", group: "refund" },
  { id: "pr-refund-university", name: "University plan refunds", appliesTo: "University partnership plans", rule: "Refunds follow the partner agreement and are approved by the university", value: "Per university agreement", status: "active", group: "refund" },
  { id: "pr-acca-exemption", name: "Exemption fees", appliesTo: "Learners with estimated exemptions", rule: "Recorded per exempt paper once ACCA confirms; learner pays ACCA directly", value: `${formatGBP(accaFeesGBP.exemptionAppliedKnowledge)} Applied Knowledge, ${formatGBP(accaFeesGBP.exemptionAppliedSkills)} Applied Skills`, status: "active", group: "acca" },
  { id: "pr-acca-exam", name: "Exam fees by entry window", appliesTo: "All exam bookings", rule: "Fee recorded at the window the learner booked in; late entry flagged to the mentor", value: "Early, standard, late", status: "active", group: "acca" },
  { id: "pr-merit", name: "Merit scholarship", appliesTo: "ACCA Graduate Pathway", rule: "Applied Knowledge exam average of 75% or above at enrolment", value: "10% of tuition", status: "active", group: "discount" },
  { id: "pr-reattempt-waiver", name: "Reattempt cohort fee waiver", appliesTo: "Revision and reattempt cohorts", rule: "Learners who attended at least 80% of the first cohort", value: "50% of the revision cohort fee", status: "active", group: "discount" },
];

const GROUPS: { id: GroupId; title: string; sub: string }[] = [
  { id: "late", title: "Late fees and grace periods", sub: "When an instalment becomes overdue and what it costs." },
  { id: "refund", title: "Refund policy windows", sub: "How much is refunded, and when." },
  { id: "acca", title: "ACCA fee pass-through recording", sub: "Fees learners pay to ACCA, recorded here for tracking only." },
  { id: "discount", title: "Discounts and scholarships", sub: "Applied at enrolment by Finance Operations." },
  { id: "hold", title: "Holds", sub: "Service holds linked to overdue fees." },
];

const SAMPLE_STUDENTS = [
  { id: "s-anaya", label: "Anaya Rao · instalment due" },
  { id: "s-abhishek", label: "Abhishek Das · instalment overdue" },
  { id: "s-rohan", label: "Rohan Iyer · university plan" },
  { id: "s-mehul", label: "Mehul Rathore · refund requested" },
];

export function PaymentRulesPage() {
  const [plans, setPlans] = useState<FeePlan[]>(feePlans);
  const [rules, setRules] = useState<RuleRow[]>(() => [...paymentRules.map((r) => ({ ...r, group: GROUP_OF[r.id] ?? "late" })), ...EXTRA_RULES]);
  const [editingPlan, setEditingPlan] = useState<FeePlan | "new" | null>(null);
  const [editingRule, setEditingRule] = useState<RuleRow | "new" | null>(null);
  const [cadence, setCadence] = useState({ before: 7, onDue: true, after: 8, weekly: true });
  const [sampleId, setSampleId] = useState(SAMPLE_STUDENTS[0].id);

  const planEditing = editingPlan && editingPlan !== "new" ? editingPlan : null;
  const ruleEditing = editingRule && editingRule !== "new" ? editingRule : null;
  const blockRule = rules.find((r) => r.id === "pr-block");

  const planColumns: DataTableColumn<FeePlan>[] = [
    {
      key: "name",
      header: "Fee plan",
      sortable: true,
      render: (p) => (
        <span className="block min-w-52">
          <span className="block font-semibold text-ink">{p.name}</span>
          <span className="block text-[12px] text-ink-3">{programmeById(p.programmeId)?.name}</span>
        </span>
      ),
    },
    { key: "instalments", header: "Instalments", align: "right", mono: true, sortable: true, render: (p) => `${p.instalments} × ${formatINR(p.instalmentAmount)}` },
    { key: "total", header: "Total", align: "right", mono: true, sortable: true, render: (p) => formatINR(p.total) },
    { key: "schedule", header: "Schedule", wrap: true, className: "min-w-48 text-ink-2" },
    { key: "lateFeeINR", header: "Late fee", align: "right", mono: true, sortable: true, render: (p) => (p.lateFeeINR ? formatINR(p.lateFeeINR) : "None") },
    { key: "graceDays", header: "Grace", align: "right", mono: true, sortable: true, render: (p) => (p.graceDays ? `${p.graceDays} days` : "None") },
    { key: "active", header: "Status", render: (p) => <StatusPill status={p.active ? "active" : "paused"}>{p.active ? "Active" : "Closed to new learners"}</StatusPill> },
  ];

  const preview = useMemo(() => {
    const s = studentById(sampleId);
    if (!s) return null;
    const plan = plans.find((p) => p.id === s.fees.planId);
    const next = s.fees.instalments.find((i) => i.status !== "paid");
    const enrolled = s.fees.instalments[0]?.dueDate ?? ACCA_TODAY;
    const dated: { date: string; order: number; item: TimelineItem }[] = [];
    const facts: { label: string; value: string; tone: StatusTone }[] = [];
    if (plan && next) {
      const graceEnd = addDays(next.dueDate, plan.graceDays);
      const overdueDays = daysBetween(graceEnd, ACCA_TODAY);
      const push = (date: string, order: number, item: Omit<TimelineItem, "meta">, suffix = "") =>
        dated.push({ date, order, item: { ...item, meta: `${formatAccaDate(date)}${suffix}` } });
      const reminder = (date: string, title: string) =>
        push(date, 0, { id: `r-${title}`, title, tone: date <= ACCA_TODAY ? "jade" : "info" }, date <= ACCA_TODAY ? " · sent" : " · scheduled");
      if (cadence.before) reminder(addDays(next.dueDate, -cadence.before), `Reminder ${cadence.before} days before`);
      if (cadence.onDue) reminder(next.dueDate, "Reminder on the due date");
      if (cadence.after) reminder(addDays(next.dueDate, cadence.after), `Reminder ${cadence.after} days after`);
      if (cadence.weekly) reminder(addDays(next.dueDate, (cadence.after || 0) + 7), "Weekly reminders until paid");
      push(next.dueDate, 1, { id: "due", title: `Instalment ${next.n} of ${formatINR(next.amount)} due`, tone: "amber" });
      if (plan.graceDays) {
        push(graceEnd, 2, {
          id: "grace",
          title: plan.lateFeeINR ? `Grace ends · late fee ${formatINR(plan.lateFeeINR)} from ${formatAccaDate(addDays(graceEnd, 1))}` : "Grace ends",
          tone: "rose",
        });
      }
      if (blockRule?.status === "active") {
        push(addDays(graceEnd, 30), 3, { id: "hold", title: "Proctored mock booking hold starts", tone: "rose" });
      }
      facts.push({
        label: "Status today",
        value: overdueDays > 0 ? `Overdue ${overdueDays} days` : daysBetween(ACCA_TODAY, next.dueDate) <= cadence.before ? "Due soon" : "On track",
        tone: overdueDays > 0 ? "rose" : daysBetween(ACCA_TODAY, next.dueDate) <= cadence.before ? "amber" : "jade",
      });
      facts.push({ label: "Late fee", value: overdueDays > 0 && plan.lateFeeINR ? `${formatINR(plan.lateFeeINR)} applied` : plan.lateFeeINR ? `${formatINR(plan.lateFeeINR)} if unpaid after grace` : "None", tone: overdueDays > 0 ? "rose" : "neutral" });
    }
    const sinceEnrolment = daysBetween(enrolled, ACCA_TODAY);
    const refundRule = rules.find((r) => r.id === "pr-refund");
    facts.push({
      label: "Refund",
      value: s.type === "undergraduate" ? "Per university agreement" : sinceEnrolment <= 14 && refundRule?.status === "active" ? "Full refund window open" : "Outside the 14-day full refund window",
      tone: "neutral",
    });
    facts.push({ label: "ACCA fees", value: `Recorded only: registration ${formatGBP(accaFeesGBP.registration)}, subscription ${formatGBP(accaFeesGBP.annualSubscription)}`, tone: "info" });
    const items = dated.sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order).map((d) => d.item);
    return { s, plan, next, items, facts };
  }, [sampleId, plans, rules, cadence, blockRule]);

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Configuration"
        title="Payment rules"
        sub="Configure payment rules: fee plans, late fees and grace periods, refund windows, ACCA fee pass-through recording, discounts and scholarships, and reminder cadence."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("payment-rules.csv")}>
              <Download className="size-4" />
              Export rules
            </Button>
            <Button onClick={() => setEditingRule("new")}>
              <Plus className="size-4" />
              Add payment rule
            </Button>
          </>
        }
      />
      <p className="-mt-3 text-[12.5px] text-ink-3">{FINANCE_SCOPE_NOTE}</p>

      <KpiRow cols={4}>
        <KpiTile hero label="Active fee plans" value={plans.filter((p) => p.active).length} sub={`${programmes.length} programmes`} icon={<Wallet />} />
        <KpiTile label="Payment rules active" value={rules.filter((r) => r.status === "active").length} sub={`${rules.filter((r) => r.status === "draft").length} in draft`} tone="jade" />
        <KpiTile label="Learners overdue" value={financeSummary.overdueStudents} tone="rose" goodWhen="down" icon={<IndianRupee />} />
        <KpiTile label="Reminder touches" value={[cadence.before, cadence.onDue, cadence.after].filter(Boolean).length + (cadence.weekly ? 1 : 0)} sub="Per instalment, then weekly" tone="info" icon={<BellRing />} />
      </KpiRow>

      <section className="space-y-4">
        <BlockHeading title="Fee plans" sub="Graduate instalment plans and university per-semester plans. Open a plan to edit it." />
        <DataTable
          caption="Fee plans"
          rows={plans}
          columns={planColumns}
          getRowId={(p) => p.id}
          onRowClick={(p) => setEditingPlan(p)}
          rowLabel={(p) => `Edit ${p.name}`}
          toolbar={
            <Button size="sm" onClick={() => setEditingPlan("new")}>
              <Plus className="size-4" />
              Add fee plan
            </Button>
          }
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const list = rules.filter((r) => r.group === g.id);
          return (
            <Card key={g.id} className="min-w-0">
              <CardHeader title={g.title} sub={g.sub} />
              <ul className="divide-y divide-line border-t border-line px-5">
                {list.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3.5">
                    <div className="min-w-0 flex-1 basis-56">
                      <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-semibold text-ink">
                        {r.name}
                        <StatusPill status={r.status} size="sm" />
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-ink-2">{r.rule}</p>
                      <p className="mt-1 text-[12px] text-ink-3">
                        {r.appliesTo} · <span className="font-semibold text-ink">{r.value}</span>
                      </p>
                    </div>
                    <Button size="xs" variant="outline" onClick={() => setEditingRule(r)}>
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </li>
                ))}
              </ul>
              {g.id === "late" ? (
                <div className="space-y-4 border-t border-line p-5">
                  <MiniLabel>Reminder cadence</MiniLabel>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Days before due date">
                      <Input type="number" min={0} max={30} value={cadence.before} onChange={(e) => setCadence((c) => ({ ...c, before: Number(e.target.value) || 0 }))} className="font-mono" />
                    </Field>
                    <Field label="Days after due date">
                      <Input type="number" min={0} max={30} value={cadence.after} onChange={(e) => setCadence((c) => ({ ...c, after: Number(e.target.value) || 0 }))} className="font-mono" />
                    </Field>
                  </div>
                  <Switch checked={cadence.onDue} onChange={(v) => setCadence((c) => ({ ...c, onDue: v }))} label="Remind on the due date" />
                  <Switch checked={cadence.weekly} onChange={(v) => setCadence((c) => ({ ...c, weekly: v }))} label="Then weekly until paid" />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      const value = [cadence.before ? `${cadence.before} days before` : "", cadence.onDue ? "on due date" : "", cadence.after ? `${cadence.after} days after` : "", cadence.weekly ? "then weekly" : ""].filter(Boolean).join(", ");
                      setRules((list) => list.map((r) => (r.id === "pr-reminders" ? { ...r, value } : r)));
                      toast({ title: "Reminder cadence saved", body: value });
                    }}
                  >
                    Save cadence
                  </Button>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title="Rule preview on a sample student" sub="See how the current plans and rules play out for one learner. Edits above update this preview." />
        <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <div className="space-y-4">
            <Field label="Sample student">
              <Select value={sampleId} onChange={(e) => setSampleId(e.target.value)}>
                {SAMPLE_STUDENTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
            {preview?.plan ? (
              <div className="rounded-[14px] border border-line bg-surface-2 p-4 text-[13px]">
                <p className="font-semibold text-ink">{preview.plan.name}</p>
                <p className="mt-1 text-ink-2">
                  {formatINR(preview.s.fees.paid)} paid of {formatINR(preview.s.fees.total)} · {preview.plan.graceDays} days grace
                </p>
              </div>
            ) : null}
            <dl className="divide-y divide-line rounded-[14px] border border-line">
              {preview?.facts.map((f) => (
                <div key={f.label} className="flex gap-3 px-3.5 py-2.5">
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneFill[f.tone])} />
                  <div className="min-w-0">
                    <dt className="text-[12px] text-ink-3">{f.label}</dt>
                    <dd className={cn("text-[13px] font-semibold", f.tone === "neutral" || f.tone === "info" ? "text-ink" : toneText[f.tone])}>{f.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="min-w-0">
            <MiniLabel className="mb-3">{preview?.next ? `Instalment ${preview.next.n} timeline` : "No instalments outstanding"}</MiniLabel>
            <Timeline items={preview?.items ?? []} empty="All instalments are paid." />
          </div>
        </div>
      </Card>

      {/* fee plan drawer */}
      <FormDrawer
        open={editingPlan !== null}
        onClose={() => setEditingPlan(null)}
        title={planEditing ? `Edit ${planEditing.name}` : "Add fee plan"}
        sub="Changes apply to learners who enrol after saving. Existing learners keep their plan."
        submitLabel={planEditing ? "Save plan" : "Add plan"}
        onSubmit={(data) => {
          const instalments = Math.max(1, Number(data.get("instalments")) || 1);
          const amount = Math.max(0, Number(data.get("amount")) || 0);
          const row: FeePlan = {
            id: planEditing?.id ?? `fp-new-${plans.length + 1}`,
            name: String(data.get("name") ?? "").trim(),
            programmeId: String(data.get("programme")),
            instalments,
            instalmentAmount: amount,
            total: instalments * amount,
            schedule: String(data.get("schedule") ?? "").trim(),
            lateFeeINR: Number(data.get("lateFee")) || 0,
            graceDays: Number(data.get("grace")) || 0,
            active: data.get("active") === "on",
            note: planEditing?.note ?? "",
          };
          setPlans((list) => (planEditing ? list.map((p) => (p.id === planEditing.id ? row : p)) : [...list, row]));
          toast({ title: planEditing ? "Fee plan saved" : "Fee plan added", body: `${row.name} · ${row.instalments} × ${formatINR(row.instalmentAmount)} = ${formatINR(row.total)}` });
          setEditingPlan(null);
        }}
      >
        <div key={planEditing?.id ?? "new"} className="space-y-4">
          <Field label="Plan name">
            <Input name="name" required defaultValue={planEditing?.name} placeholder="e.g. Fast Track · 3 instalments" />
          </Field>
          <Field label="Programme">
            <Select name="programme" defaultValue={planEditing?.programmeId ?? "pr-graduate"}>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Instalments">
              <Input name="instalments" type="number" min={1} max={12} required defaultValue={planEditing?.instalments ?? 4} className="font-mono" />
            </Field>
            <Field label="Amount per instalment (₹)">
              <Input name="amount" type="number" min={0} step={500} required defaultValue={planEditing?.instalmentAmount ?? 29500} className="font-mono" />
            </Field>
          </div>
          <Field label="Schedule">
            <Input name="schedule" required defaultValue={planEditing?.schedule} placeholder="e.g. Quarterly on the 10th" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Late fee (₹)">
              <Input name="lateFee" type="number" min={0} step={100} defaultValue={planEditing?.lateFeeINR ?? 500} className="font-mono" />
            </Field>
            <Field label="Grace period (days)">
              <Input name="grace" type="number" min={0} max={60} defaultValue={planEditing?.graceDays ?? 7} className="font-mono" />
            </Field>
          </div>
          <Checkbox name="active" label="Open to new learners" defaultChecked={planEditing?.active ?? true} />
        </div>
      </FormDrawer>

      {/* rule drawer */}
      <FormDrawer
        open={editingRule !== null}
        onClose={() => setEditingRule(null)}
        title={ruleEditing ? `Edit rule · ${ruleEditing.name}` : "Add payment rule"}
        sub="Rules are checked nightly against every enrolled learner."
        submitLabel={ruleEditing ? "Save rule" : "Add rule"}
        onSubmit={(data) => {
          const row: RuleRow = {
            id: ruleEditing?.id ?? `pr-new-${rules.length + 1}`,
            name: String(data.get("name") ?? "").trim(),
            appliesTo: String(data.get("appliesTo") ?? "").trim() || "All learners",
            rule: String(data.get("rule") ?? "").trim(),
            value: String(data.get("value") ?? "").trim(),
            status: String(data.get("status")) === "draft" ? "draft" : "active",
            group: (String(data.get("group")) as GroupId) || "late",
          };
          setRules((list) => (ruleEditing ? list.map((r) => (r.id === ruleEditing.id ? row : r)) : [...list, row]));
          toast({ title: ruleEditing ? "Payment rule saved" : "Payment rule added", body: `${row.name} · ${row.value}` });
          setEditingRule(null);
        }}
      >
        <div key={ruleEditing?.id ?? "new"} className="space-y-4">
          <Field label="Rule name">
            <Input name="name" required defaultValue={ruleEditing?.name} placeholder="e.g. Sibling discount" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Group">
              <Select name="group" defaultValue={ruleEditing?.group ?? "discount"}>
                {GROUPS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status">
              <Select name="status" defaultValue={ruleEditing?.status ?? "draft"}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
              </Select>
            </Field>
          </div>
          <Field label="Applies to">
            <Input name="appliesTo" defaultValue={ruleEditing?.appliesTo} placeholder="e.g. ACCA Graduate Pathway" />
          </Field>
          <Field label="Rule">
            <Textarea name="rule" rows={3} required defaultValue={ruleEditing?.rule} placeholder="When the rule applies" />
          </Field>
          <Field label="Value">
            <Input name="value" required defaultValue={ruleEditing?.value} placeholder="e.g. 5% or 14 days" />
          </Field>
          {ruleEditing?.group === "acca" ? (
            <Badge tone="info">ACCA fees are paid by learners to ACCA and never collected here</Badge>
          ) : null}
        </div>
      </FormDrawer>
    </AdminConfigFrame>
  );
}
