"use client";

import { useState } from "react";
import { Download, FileText, Globe2, Inbox, Lock, Plus, ShieldCheck, UploadCloud } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  daysBetween,
  formatAccaDate,
  privacyPolicies,
  staff,
  staffName,
  students,
  type PrivacyPolicy,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Matrix } from "@/components/ui/matrix";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { AdminConfigFrame, BlockHeading, Fact, queueExport } from "./shared";

/* ------------------------------------------------------------ seeds */

type RetentionRow = { id: string; type: string; period: string; action: string; basis: string; enforced: boolean; nextRun: string };

const PERIODS = ["90 days", "180 days", "1 year", "2 years", "3 years", "7 years", "8 years", "1 year after ACCA decision", "2 years after completion", "7 years after completion"];
const END_ACTIONS = ["Delete", "Anonymise", "Archive"];

const RETENTION: RetentionRow[] = [
  { id: "rt-records", type: "Learner records: ACCA progress and results", period: "7 years after completion", action: "Anonymise", basis: "Audit and certificate verification", enforced: true, nextRun: "2026-10-01" },
  { id: "rt-payments", type: "Payments and receipts", period: "8 years", action: "Delete", basis: "Tax and accounting records", enforced: true, nextRun: "2026-10-01" },
  { id: "rt-docs", type: "Qualification documents", period: "1 year after ACCA decision", action: "Delete", basis: "Exemption evaluation", enforced: true, nextRun: "2026-09-20" },
  { id: "rt-proctoring", type: "Proctoring recordings", period: "180 days", action: "Delete", basis: "Assessment integrity; kept while a misconduct case is open", enforced: true, nextRun: "2026-09-17" },
  { id: "rt-recordings", type: "Class recordings", period: "3 years", action: "Archive", basis: "Learning content", enforced: true, nextRun: "2026-10-01" },
  { id: "rt-ai", type: "AI tutor conversations", period: "90 days", action: "Delete", basis: "Quality review, excluded from model training", enforced: false, nextRun: "2026-09-21" },
  { id: "rt-tickets", type: "Support tickets and WhatsApp conversations", period: "3 years", action: "Anonymise", basis: "Service history", enforced: true, nextRun: "2026-10-01" },
  { id: "rt-mentor", type: "Mentor notes", period: "2 years after completion", action: "Delete", basis: "Student success", enforced: true, nextRun: "2026-10-01" },
  { id: "rt-audit", type: "Audit logs", period: "7 years", action: "Delete", basis: "Security and compliance; write-once", enforced: true, nextRun: "2027-01-01" },
];

const CONSENTS: { id: string; label: string; sub: string; rate: number; on: boolean }[] = [
  { id: "uni-share", label: "Share ACCA progress with the partner university", sub: "Collected at enrolment for university-linked learners, withdrawable at any time", rate: 98.6, on: true },
  { id: "whatsapp", label: "WhatsApp messages", sub: "Opt-in at first sign-in; reply STOP to withdraw", rate: 91.2, on: true },
  { id: "leaderboard", label: "Name on the cohort leaderboard", sub: "Initials shown instead when withdrawn", rate: 87.4, on: true },
  { id: "recordings", label: "Appear in class recordings", sub: "Camera and name hidden for learners who withdraw", rate: 94.0, on: true },
  { id: "ai-review", label: "AI tutor conversations used for quality review", sub: "Never used to train models", rate: 82.5, on: true },
  { id: "analytics", label: "Anonymised product analytics", sub: "Aggregated usage only", rate: 96.1, on: true },
  { id: "marketing", label: "Messages about other programmes", sub: "Off. Admissions and sales are managed outside ACCA LMS.", rate: 0, on: false },
];

const WITHDRAWALS = [
  { id: "wd-1", learner: "Lavanya Rajan", consent: "WhatsApp messages", on: "2026-08-30", action: "Moved to email and in-app" },
  { id: "wd-2", learner: "Kunal Chauhan", consent: "Name on the cohort leaderboard", on: "2026-09-02", action: "Initials shown" },
  { id: "wd-3", learner: "Shreya Varghese", consent: "AI tutor conversations used for quality review", on: "2026-09-09", action: "Conversations excluded from review" },
];

type RoleKey = "super-admin" | "programme-admin" | "university-admin" | "faculty" | "mentor" | "student";
const ROLE_COLS: { id: RoleKey; label: string }[] = [
  { id: "super-admin", label: "Super Admin" },
  { id: "programme-admin", label: "Programme Admin" },
  { id: "university-admin", label: "University Admin" },
  { id: "faculty", label: "Faculty" },
  { id: "mentor", label: "Mentor and career" },
  { id: "student", label: "Student" },
];
const LEVELS = ["Full", "Edit", "View", "With finance:view", "Status only", "Name only", "Shared notes only", "Own record", "None"];

const ACCESS_ROWS: { id: string; label: string; sub: string; levels: Record<RoleKey, string> }[] = [
  { id: "marks", label: "Marks and results", sub: "Mocks, graded work, ACCA results", levels: { "super-admin": "Full", "programme-admin": "Edit", "university-admin": "View", faculty: "Edit", mentor: "View", student: "Own record" } },
  { id: "readiness", label: "Readiness scores", sub: "Per paper and overall", levels: { "super-admin": "Full", "programme-admin": "View", "university-admin": "View", faculty: "View", mentor: "View", student: "Own record" } },
  { id: "fees", label: "Fees and payments", sub: "Instalments, receipts, refunds", levels: { "super-admin": "Full", "programme-admin": "With finance:view", "university-admin": "Status only", faculty: "None", mentor: "Status only", student: "Own record" } },
  { id: "personal", label: "Personal data", sub: "Contact details, date of birth, address", levels: { "super-admin": "Full", "programme-admin": "Edit", "university-admin": "View", faculty: "Name only", mentor: "View", student: "Own record" } },
  { id: "documents", label: "Qualification documents", sub: "Degree certificates, mark sheets", levels: { "super-admin": "Full", "programme-admin": "Edit", "university-admin": "None", faculty: "None", mentor: "None", student: "Own record" } },
  { id: "tickets", label: "Support tickets", sub: "Ticket content and history", levels: { "super-admin": "Full", "programme-admin": "Edit", "university-admin": "Status only", faculty: "View", mentor: "View", student: "Own record" } },
  { id: "notes", label: "Mentor notes", sub: "Private and shared notes", levels: { "super-admin": "View", "programme-admin": "View", "university-admin": "None", faculty: "None", mentor: "Edit", student: "Shared notes only" } },
  { id: "proctoring", label: "Proctoring recordings", sub: "Webcam and screen", levels: { "super-admin": "Full", "programme-admin": "None", "university-admin": "None", faculty: "View", mentor: "None", student: "None" } },
  { id: "career", label: "Career profile and resume", sub: "ATS and Company Readiness Scores", levels: { "super-admin": "View", "programme-admin": "View", "university-admin": "View", faculty: "None", mentor: "Edit", student: "Own record" } },
];

type RequestType = "Access" | "Erasure" | "Correction" | "Withdraw consent" | "Grievance";
type RequestRow = { id: string; learner: string; type: RequestType; received: string; channel: string; status: "new" | "in-progress" | "completed" | "rejected"; assigneeId: string; detail: string; closedOn?: string; response?: string };

const REQUESTS: RequestRow[] = [
  { id: "DPR-0031", learner: "Sneha D'Souza", type: "Access", received: "2026-09-12", channel: "Email", status: "new", assigneeId: "st-neha", detail: "Copy of all data held, including mentor notes and proctoring recordings." },
  { id: "DPR-0030", learner: "Gaurav Ahmed", type: "Erasure", received: "2026-09-08", channel: "Portal", status: "in-progress", assigneeId: "st-neha", detail: "Alumnus asks to delete the account. Exam records are kept for 7 years under the retention schedule." },
  { id: "DPR-0029", learner: "Farhan Malhotra", type: "Correction", received: "2026-09-03", channel: "Support ticket", status: "in-progress", assigneeId: "st-arjun", detail: "Date of birth on the profile differs from the passport." },
  { id: "DPR-0024", learner: "Aditya Ansari", type: "Access", received: "2026-08-17", channel: "Email", status: "in-progress", assigneeId: "st-neha", detail: "Export of AI tutor conversations and practice history." },
  { id: "DPR-0028", learner: "Lavanya Rajan", type: "Withdraw consent", received: "2026-08-28", channel: "WhatsApp", status: "completed", assigneeId: "st-arjun", detail: "Withdraw WhatsApp consent.", closedOn: "2026-08-30", response: "WhatsApp messages stopped; email and in-app continue." },
  { id: "DPR-0027", learner: "Kunal Chauhan", type: "Access", received: "2026-08-20", channel: "Portal", status: "completed", assigneeId: "st-neha", detail: "Copy of learner record.", closedOn: "2026-09-04", response: "Data pack sent through the portal." },
  { id: "DPR-0026", learner: "Swati Pandey", type: "Erasure", received: "2026-08-18", channel: "Email", status: "rejected", assigneeId: "st-neha", detail: "Delete all personal data.", closedOn: "2026-09-01", response: "Active learner with an open fee plan and exam booking. Erasure deferred until completion; marketing data removed." },
];

type NoticeVersion = { version: string; published: string; summary: string; accepted: number; status: "current" | "superseded" };

const NOTICES: NoticeVersion[] = [
  { version: "v3.0", published: "2026-09-05", summary: "Data sharing with partner universities", accepted: 412, status: "current" },
  { version: "v2.2", published: "2026-07-18", summary: "Finance data access and export logging", accepted: 598, status: "superseded" },
  { version: "v2.1", published: "2026-05-02", summary: "Retention periods for records and proctoring", accepted: 571, status: "superseded" },
  { version: "v2.0", published: "2026-03-14", summary: "Rights under the Digital Personal Data Protection Act, 2023", accepted: 549, status: "superseded" },
];

const SUBPROCESSORS = [
  { id: "sp-aws", name: "Amazon Web Services", purpose: "Hosting, storage and backups", data: "All platform data", location: "India (Mumbai, Hyderabad)", dpa: true },
  { id: "sp-zoom", name: "Zoom", purpose: "Live classes and recordings", data: "Name, email, attendance", location: "United States", dpa: true },
  { id: "sp-sendgrid", name: "SendGrid", purpose: "Email delivery", data: "Name, email, message content", location: "United States", dpa: true },
  { id: "sp-whatsapp", name: "WhatsApp Business Platform", purpose: "Messaging", data: "Name, phone, message content", location: "Global", dpa: true },
  { id: "sp-razorpay", name: "Razorpay", purpose: "Payments", data: "Name, payment reference", location: "India", dpa: true },
  { id: "sp-proctor", name: "Proctoring service", purpose: "Mock exam proctoring", data: "Webcam and screen recordings", location: "India", dpa: false },
];

const TOTAL_LEARNERS = 610;

/* ------------------------------------------------------------ page */

export function PrivacyPage() {
  const [tab, setTab] = useState("retention");
  const [retention, setRetention] = useState<RetentionRow[]>(RETENTION);
  const [policies, setPolicies] = useState<PrivacyPolicy[]>(privacyPolicies);
  const [consents, setConsents] = useState(CONSENTS);
  const [reask, setReask] = useState(true);
  const [access, setAccess] = useState(() => Object.fromEntries(ACCESS_ROWS.map((r) => [r.id, r.levels])) as Record<string, Record<RoleKey, string>>);
  const [requests, setRequests] = useState<RequestRow[]>(REQUESTS);
  const [handling, setHandling] = useState<RequestRow | null>(null);
  const [logging, setLogging] = useState(false);
  const [requestStatus, setRequestStatus] = useState("open");
  const [notices, setNotices] = useState<NoticeVersion[]>(NOTICES);
  const [publishing, setPublishing] = useState(false);
  const [residency, setResidency] = useState({ indiaOnly: true, blockPersonalEmail: true, maskExports: true });

  const openRequests = requests.filter((r) => r.status === "new" || r.status === "in-progress");
  const dueSoon = openRequests.filter((r) => daysBetween(ACCA_TODAY, addDays(r.received, 30)) <= 7);
  const current = notices.find((n) => n.status === "current") ?? notices[0];

  const retentionColumns: DataTableColumn<RetentionRow>[] = [
    { key: "type", header: "Data type", sortable: true, render: (r) => <span className="block min-w-56 font-semibold text-ink">{r.type}</span> },
    {
      key: "period",
      header: "Retention period",
      render: (r) => (
        <select
          aria-label={`${r.type} retention period`}
          value={r.period}
          onChange={(e) => {
            const period = e.target.value;
            setRetention((list) => list.map((x) => (x.id === r.id ? { ...x, period } : x)));
            toast({ title: "Retention period changed", body: `${r.type}: ${period}. Takes effect at the next purge run.` });
          }}
          className="h-9 min-w-44 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] text-ink hover:border-line-strong focus:border-ink focus:outline-none"
        >
          {Array.from(new Set([r.period, ...PERIODS])).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      ),
    },
    {
      key: "action",
      header: "At end of period",
      render: (r) => (
        <select
          aria-label={`${r.type} action at end of period`}
          value={r.action}
          onChange={(e) => {
            const action = e.target.value;
            setRetention((list) => list.map((x) => (x.id === r.id ? { ...x, action } : x)));
            toast({ title: "End-of-retention action changed", body: `${r.type}: ${action}` });
          }}
          className="h-9 rounded-[10px] border border-line bg-surface px-2.5 text-[13px] text-ink hover:border-line-strong focus:border-ink focus:outline-none"
        >
          {END_ACTIONS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      ),
    },
    { key: "basis", header: "Purpose", wrap: true, className: "min-w-52 text-ink-2" },
    { key: "nextRun", header: "Next purge run", sortable: true, render: (r) => formatAccaDate(r.nextRun) },
    {
      key: "enforced",
      header: "Status",
      render: (r) => (
        <span className="flex items-center gap-2">
          <StatusPill status={r.enforced ? "enforced" : "draft"} />
          <Button
            size="xs"
            variant={r.enforced ? "ghost" : "outline"}
            onClick={() => {
              setRetention((list) => list.map((x) => (x.id === r.id ? { ...x, enforced: !x.enforced } : x)));
              toast({ title: r.enforced ? "Retention rule paused" : "Retention rule enforced", body: r.type, tone: r.enforced ? "warning" : "success" });
            }}
          >
            {r.enforced ? "Pause" : "Enforce"}
          </Button>
        </span>
      ),
    },
  ];

  const policyColumns: DataTableColumn<PrivacyPolicy>[] = [
    { key: "title", header: "Policy", sortable: true, render: (p) => <span className="block min-w-48 font-semibold text-ink">{p.title}</span> },
    { key: "category", header: "Category", sortable: true, render: (p) => <Badge>{p.category}</Badge> },
    { key: "setting", header: "Setting", wrap: true, className: "min-w-48 text-ink" },
    { key: "description", header: "What it means", wrap: true, className: "min-w-64 text-ink-2" },
    { key: "owner", header: "Owner", render: (p) => staffName(p.ownerId) },
    { key: "updated", header: "Updated", sortable: true, render: (p) => formatAccaDate(p.updated) },
    {
      key: "status",
      header: "Status",
      render: (p) => (
        <span className="flex items-center gap-2">
          <StatusPill status={p.status} />
          {p.status === "draft" ? (
            <Button
              size="xs"
              variant="outline"
              onClick={() => {
                setPolicies((list) => list.map((x) => (x.id === p.id ? { ...x, status: "enforced", updated: "2026-09-14" } : x)));
                toast({ title: "Policy enforced", body: p.title });
              }}
            >
              Enforce
            </Button>
          ) : null}
        </span>
      ),
    },
  ];

  const requestColumns: DataTableColumn<RequestRow>[] = [
    { key: "id", header: "Request", mono: true, sortable: true },
    { key: "learner", header: "Learner", sortable: true, className: "font-semibold text-ink" },
    { key: "type", header: "Type", sortable: true, render: (r) => <Badge tone={r.type === "Erasure" ? "rose" : r.type === "Access" ? "info" : "neutral"}>{r.type}</Badge> },
    { key: "received", header: "Received", sortable: true, render: (r) => formatAccaDate(r.received) },
    {
      key: "due",
      header: "Response due",
      sortable: true,
      sortValue: (r) => addDays(r.received, 30),
      render: (r) => {
        const due = addDays(r.received, 30);
        if (r.status === "completed" || r.status === "rejected") return <span className="text-ink-3">Closed {r.closedOn ? formatAccaDate(r.closedOn) : ""}</span>;
        const left = daysBetween(ACCA_TODAY, due);
        return (
          <span className="flex items-center gap-2">
            <span>{formatAccaDate(due)}</span>
            <StatusPill status="due" tone={left < 0 ? "rose" : left <= 7 ? "amber" : "jade"} size="sm" dot={false}>
              {left < 0 ? `${-left} days late` : `${left} days left`}
            </StatusPill>
          </span>
        );
      },
    },
    { key: "channel", header: "Channel", className: "text-ink-2" },
    { key: "assignee", header: "Handler", render: (r) => staffName(r.assigneeId) },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
  ];

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Governance"
        title="Data & privacy"
        sub="Configure data and privacy policies: retention by data type, consent, who can see marks, fees and personal data, access and erasure requests under the Digital Personal Data Protection Act, 2023, data residency and privacy notice versions."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("privacy-policy-register.csv")}>
              <Download className="size-4" />
              Export policy register
            </Button>
            <Button onClick={() => setPublishing(true)}>
              <UploadCloud className="size-4" />
              Publish privacy notice
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Policies enforced" value={`${policies.filter((p) => p.status === "enforced").length} of ${policies.length}`} icon={<ShieldCheck />} />
        <KpiTile label="Open DPDP requests" value={openRequests.length} sub={`${dueSoon.length} due within 7 days`} tone="amber" goodWhen="down" icon={<Inbox />} />
        <KpiTile label="Privacy notice" value={current.version} sub={`${Math.round((current.accepted / TOTAL_LEARNERS) * 100)}% of learners accepted`} tone="info" icon={<FileText />} />
        <KpiTile label="Data residency" value="India" sub="Mumbai, backups in Hyderabad" tone="jade" icon={<Globe2 />} />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "retention", label: "Data retention" },
          { id: "consent", label: "Consent" },
          { id: "access", label: "Data access by role" },
          { id: "requests", label: "DPDP requests", count: openRequests.length },
          { id: "residency", label: "Residency and notices" },
        ]}
      />

      {tab === "retention" ? (
        <section className="space-y-5">
          <BlockHeading
            title="Data retention by data type"
            sub="How long each kind of data is kept and what happens at the end. Purge runs are logged in Audit logs."
            action={
              <Button onClick={() => toast({ title: "Retention schedule saved", body: `${retention.filter((r) => r.enforced).length} of ${retention.length} rules enforced` })}>
                Save retention schedule
              </Button>
            }
          />
          <DataTable caption="Data retention schedule" rows={retention} columns={retentionColumns} getRowId={(r) => r.id} pageSize={12} />
          <BlockHeading title="Policy register" sub="Every data and privacy policy with its owner and status." />
          <DataTable caption="Privacy policy register" rows={policies} columns={policyColumns} getRowId={(p) => p.id} pageSize={12} />
        </section>
      ) : null}

      {tab === "consent" ? (
        <section className="space-y-5">
          <BlockHeading title="Consent settings" sub="What learners are asked to agree to, and how many have agreed. Turning a purpose off stops that processing for everyone." />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <Card className="min-w-0">
              <ul className="divide-y divide-line px-5">
                {consents.map((c) => (
                  <li key={c.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
                    <Switch
                      checked={c.on}
                      onChange={(v) => {
                        setConsents((list) => list.map((x) => (x.id === c.id ? { ...x, on: v } : x)));
                        toast({ title: `${c.label}: ${v ? "on" : "off"}`, body: v ? "Learners are asked at next sign-in." : "Processing for this purpose stops tonight.", tone: v ? "success" : "warning" });
                      }}
                      label={c.label}
                      sub={c.sub}
                    />
                    <div className="text-left sm:text-right">
                      <p className="font-mono text-[15px] font-bold text-ink tnum">{c.on ? `${c.rate}%` : "Off"}</p>
                      <p className="text-[11.5px] text-ink-3">{c.on ? "consented" : "not collected"}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <div className="min-w-0 space-y-5">
              <Card className="p-5">
                <Switch
                  checked={reask}
                  onChange={(v) => {
                    setReask(v);
                    toast({ title: v ? "Consent re-asked when the notice changes" : "Consent carries over between notice versions", tone: "info" });
                  }}
                  label="Ask for consent again when the privacy notice changes"
                  sub="Learners see the change summary at sign-in"
                />
              </Card>
              <Card className="min-w-0">
                <CardHeader title="Withdrawals in the last 30 days" />
                <ul className="divide-y divide-line border-t border-line px-5">
                  {WITHDRAWALS.map((w) => (
                    <li key={w.id} className="py-3 text-[13px]">
                      <p className="font-semibold text-ink">{w.learner}</p>
                      <p className="text-ink-2">{w.consent}</p>
                      <p className="mt-0.5 text-[12px] text-ink-3">
                        {formatAccaDate(w.on)} · {w.action}
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </section>
      ) : null}

      {tab === "access" ? (
        <section className="space-y-5">
          <BlockHeading
            title="Data access by role"
            sub="Who can see marks, fees and personal data. Changes apply at the next sign-in and are recorded in Audit logs."
            action={
              <Button onClick={() => toast({ title: "Data access rules saved", body: "Role permissions update at next sign-in." })}>
                Save access rules
              </Button>
            }
          />
          <Matrix
            caption="Data access by role"
            corner="Data"
            rows={ACCESS_ROWS.map((r) => ({ id: r.id, label: r.label, sub: r.sub }))}
            cols={ROLE_COLS}
            cell={(rowId, colId) => {
              const role = colId as RoleKey;
              const value = access[rowId][role];
              const changed = value !== ACCESS_ROWS.find((r) => r.id === rowId)!.levels[role];
              const row = ACCESS_ROWS.find((r) => r.id === rowId)!;
              const locked = role === "super-admin" && rowId !== "notes" && rowId !== "career";
              return (
                <span title={locked ? "Super Admin keeps full access for compliance" : undefined} className="inline-flex">
                  <select
                    aria-label={`${row.label}: ${ROLE_COLS.find((c) => c.id === role)?.label}`}
                    value={value}
                    disabled={locked}
                    onChange={(e) => {
                      const next = e.target.value;
                      setAccess((a) => ({ ...a, [rowId]: { ...a[rowId], [role]: next } }));
                      toast({ title: `${ROLE_COLS.find((c) => c.id === role)?.label}: ${row.label.toLowerCase()} set to ${next}` });
                    }}
                    className={cn(
                      "h-8 w-36 rounded-[10px] border px-2 text-[12.5px] font-semibold focus:border-ink focus:outline-none disabled:cursor-not-allowed disabled:opacity-60",
                      value === "None" ? "border-line bg-surface-2 text-ink-3" : "border-line bg-surface text-ink",
                      changed && "border-cta bg-cta-soft",
                    )}
                  >
                    {LEVELS.map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </select>
                </span>
              );
            }}
          />
          <p className="flex items-center gap-2 text-[12.5px] text-ink-3">
            <Lock className="size-3.5" />
            University Admins only ever see learners of their own university. Mentors see allocated or placement-eligible learners only.
          </p>
        </section>
      ) : null}

      {tab === "requests" ? (
        <section className="space-y-5">
          <BlockHeading
            title="Access and erasure requests"
            sub="Requests under the Digital Personal Data Protection Act, 2023 are answered within 30 days. Open a request to verify identity and record the response."
            action={
              <Button onClick={() => setLogging(true)}>
                <Plus className="size-4" />
                Log request
              </Button>
            }
          />
          <DataTable
            caption="DPDP request queue"
            rows={requestStatus === "open" ? openRequests : requestStatus === "closed" ? requests.filter((r) => r.status === "completed" || r.status === "rejected") : requests}
            columns={requestColumns}
            getRowId={(r) => r.id}
            onRowClick={(r) => setHandling(r)}
            rowLabel={(r) => `Handle ${r.id}`}
            initialSort={{ key: "due", dir: "asc" }}
            search={{ placeholder: "Search learner or request", match: (r, q) => `${r.id} ${r.learner} ${r.type}`.toLowerCase().includes(q) }}
            filters={
              <FilterSelect
                label="Queue"
                value={requestStatus}
                onChange={setRequestStatus}
                options={[
                  { value: "open", label: "Open" },
                  { value: "closed", label: "Closed" },
                  { value: "all", label: "All requests" },
                ]}
              />
            }
          />
        </section>
      ) : null}

      {tab === "residency" ? (
        <section className="space-y-5">
          <BlockHeading title="Data residency" sub="Where learner data is stored and processed." />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card className="min-w-0 p-5">
              <dl className="grid gap-4 sm:grid-cols-2">
                <Fact label="Primary region">AWS Asia Pacific (Mumbai)</Fact>
                <Fact label="Backup region">AWS Asia Pacific (Hyderabad)</Fact>
                <Fact label="Encryption at rest">AES-256, keys in AWS KMS</Fact>
                <Fact label="Encryption in transit">TLS 1.2 and above</Fact>
              </dl>
              <div className="mt-5 space-y-4 border-t border-line pt-4">
                <Switch checked={residency.indiaOnly} onChange={(v) => { setResidency((r) => ({ ...r, indiaOnly: v })); toast({ title: v ? "Documents and recordings stay in India" : "India-only storage turned off", tone: v ? "success" : "warning" }); }} label="Keep documents and recordings in India only" />
                <Switch checked={residency.blockPersonalEmail} onChange={(v) => { setResidency((r) => ({ ...r, blockPersonalEmail: v })); toast({ title: v ? "Exports to personal email blocked" : "Exports to personal email allowed", tone: v ? "success" : "warning" }); }} label="Block report exports to personal email addresses" />
                <Switch checked={residency.maskExports} onChange={(v) => { setResidency((r) => ({ ...r, maskExports: v })); toast({ title: v ? "Phone numbers masked in exports" : "Phone numbers shown in exports", tone: "info" }); }} label="Mask phone numbers in CSV exports" />
              </div>
            </Card>
            <Card className="min-w-0">
              <CardHeader title="Sub-processors" sub="Services that process learner data for ZSkillup." />
              <ul className="divide-y divide-line border-t border-line px-5">
                {SUBPROCESSORS.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-[13px]">
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="font-semibold text-ink">{s.name}</p>
                      <p className="text-[12px] text-ink-3">
                        {s.purpose} · {s.data}
                      </p>
                    </div>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge>{s.location}</Badge>
                      <StatusPill status={s.dpa ? "signed" : "pending"} tone={s.dpa ? "jade" : "amber"} size="sm">
                        {s.dpa ? "DPA signed" : "DPA pending"}
                      </StatusPill>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <BlockHeading
            title="Privacy notice versions"
            sub="Learners accept the current notice at sign-in."
            action={
              <Button variant="outline" onClick={() => toast({ title: `Reminder sent to ${TOTAL_LEARNERS - current.accepted} learners`, body: `Accept privacy notice ${current.version}`, tone: "info" })}>
                Remind learners to accept
              </Button>
            }
          />
          <Card className="min-w-0">
            <ul className="divide-y divide-line px-5">
              {notices.map((n) => (
                <li key={n.version} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 flex-1 basis-64 items-center gap-3">
                    <Badge tone={n.status === "current" ? "dark" : "neutral"}>{n.version}</Badge>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold text-ink">{n.summary}</p>
                      <p className="text-[12px] text-ink-3">Published {formatAccaDate(n.published)}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[12.5px] text-ink-2 tnum">
                      {n.accepted} of {TOTAL_LEARNERS} accepted
                    </span>
                    <StatusPill status={n.status} tone={n.status === "current" ? "jade" : "neutral"} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      {/* handle request */}
      <FormDrawer
        open={handling !== null}
        onClose={() => setHandling(null)}
        title={handling ? `${handling.id} · ${handling.type} request` : "Request"}
        sub={handling ? `${handling.learner} · received ${formatAccaDate(handling.received)} by ${handling.channel.toLowerCase()}` : undefined}
        submitLabel="Save response"
        footerNote={handling ? `Respond by ${formatAccaDate(addDays(handling.received, 30))}` : undefined}
        onSubmit={(data) => {
          if (!handling) return;
          const outcome = String(data.get("outcome")) as RequestRow["status"];
          const closed = outcome === "completed" || outcome === "rejected";
          const response = String(data.get("response") ?? "").trim();
          if (closed && data.get("verified") !== "on") {
            toast({ title: "Verify the learner's identity first", body: "Requests can only be closed after identity verification.", tone: "warning" });
            return;
          }
          setRequests((list) =>
            list.map((r) => (r.id === handling.id ? { ...r, status: outcome, response: response || r.response, assigneeId: String(data.get("handler")), closedOn: closed ? ACCA_TODAY : undefined } : r)),
          );
          toast({ title: `${handling.id} ${closed ? (outcome === "completed" ? "completed" : "closed as rejected") : "updated"}`, body: response || handling.learner });
          setHandling(null);
        }}
      >
        {handling ? (
          <div key={handling.id} className="space-y-4">
            <p className="rounded-[14px] border border-line bg-surface-2 p-3.5 text-[13.5px] text-ink-2">{handling.detail}</p>
            <Checkbox name="verified" label="Identity verified against the enrolment record" defaultChecked={handling.status !== "new"} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Outcome">
                <Select name="outcome" defaultValue={handling.status === "new" ? "in-progress" : handling.status}>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected with reason</option>
                </Select>
              </Field>
              <Field label="Handler">
                <Select name="handler" defaultValue={handling.assigneeId}>
                  {staff
                    .filter((s) => s.kind === "super-admin")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <Field label="Response to the learner">
              <Textarea name="response" rows={4} defaultValue={handling.response} placeholder="What was done, and what was kept and why" />
            </Field>
            {handling.type === "Access" ? <FileDrop label="Attach data pack" accept=".zip,.pdf,.csv" hint="Sent through the learner portal, never by email attachment." /> : null}
          </div>
        ) : null}
      </FormDrawer>

      {/* log request */}
      <FormDrawer
        open={logging}
        onClose={() => setLogging(false)}
        title="Log a data request"
        sub="The 30-day response clock starts from the date received."
        submitLabel="Log request"
        onSubmit={(data) => {
          const learner = students.find((s) => s.id === String(data.get("learner")));
          const received = String(data.get("received") || ACCA_TODAY);
          const row: RequestRow = {
            id: `DPR-${String(32 + requests.length - REQUESTS.length).padStart(4, "0")}`,
            learner: learner?.name ?? "Learner",
            type: String(data.get("type")) as RequestType,
            received,
            channel: String(data.get("channel")),
            status: "new",
            assigneeId: "st-neha",
            detail: String(data.get("detail") ?? "").trim() || "No detail recorded",
          };
          setRequests((list) => [row, ...list]);
          setRequestStatus("open");
          toast({ title: `${row.id} logged`, body: `${row.type} request from ${row.learner} · respond by ${formatAccaDate(addDays(received, 30))}` });
          setLogging(false);
        }}
      >
        <Field label="Learner">
          <Select name="learner" defaultValue={students[5]?.id}>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Request type">
            <Select name="type" defaultValue="Access">
              {(["Access", "Erasure", "Correction", "Withdraw consent", "Grievance"] as RequestType[]).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
          </Field>
          <Field label="Received by">
            <Select name="channel" defaultValue="Email">
              {["Email", "Portal", "Support ticket", "WhatsApp", "Letter"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Date received">
          <Input name="received" type="date" defaultValue={ACCA_TODAY} max={ACCA_TODAY} />
        </Field>
        <Field label="Details">
          <Textarea name="detail" rows={3} placeholder="What the learner asked for" />
        </Field>
      </FormDrawer>

      {/* publish notice */}
      <FormDrawer
        open={publishing}
        onClose={() => setPublishing(false)}
        title="Publish privacy notice"
        sub={`Replaces ${current.version}. Learners accept the new version at their next sign-in.`}
        submitLabel="Publish notice"
        onSubmit={(data) => {
          const summary = String(data.get("summary") ?? "").trim();
          const [maj, min] = current.version.replace("v", "").split(".").map(Number);
          const version = data.get("major") === "on" ? `v${maj + 1}.0` : `v${maj}.${min + 1}`;
          setNotices((list) => [{ version, published: ACCA_TODAY, summary, accepted: 0, status: "current" }, ...list.map((n) => ({ ...n, status: "superseded" as const }))]);
          setTab("residency");
          toast({ title: `Privacy notice ${version} published`, body: reask ? `${TOTAL_LEARNERS} learners will be asked to accept at sign-in.` : summary });
          setPublishing(false);
        }}
      >
        <Field label="Summary of changes">
          <Input name="summary" required placeholder="e.g. AI tutor conversation storage reduced to 90 days" />
        </Field>
        <Field label="Full notice text">
          <Textarea name="text" rows={6} placeholder="Paste the notice text" />
        </Field>
        <FileDrop label="Or upload the notice" accept=".pdf,.docx" multiple={false} />
        <Checkbox name="major" label="Major change (new version number)" />
      </FormDrawer>
    </AdminConfigFrame>
  );
}
