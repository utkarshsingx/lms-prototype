"use client";

import { useState } from "react";
import { Ban, Download, Flag, IndianRupee, Layers3, ScrollText, ShieldAlert } from "lucide-react";
import { auditLogs, formatDateTime, type AuditLog } from "@/lib/data/acca";
import { roleMeta } from "@/lib/role";
import { PageHeader } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Drawer } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { AdminConfigFrame, BlockHeading, MiniLabel, queueExport } from "./shared";

type Diff = { field: string; before: string; after: string };

const DIFFS: Record<string, Diff[]> = {
  "Exported report": [
    { field: "Export", before: "Not generated", after: "Generated and downloaded" },
    { field: "Contains personal data", before: "None", after: "Yes: names, ACCA IDs" },
  ],
  "Downloaded report": [{ field: "Export", before: "Not generated", after: "Generated and downloaded" }],
  "Opened finance page": [{ field: "Access decision", before: "Requested", after: "Denied: missing finance:view" }],
  "Attempted to edit semester": [{ field: "Access decision", before: "Requested", after: "Denied: view-only university access" }],
  "Attempted to publish content": [{ field: "Access decision", before: "Requested", after: "Denied: content:submit only, sent for review" }],
  "Opened student profile": [{ field: "Access decision", before: "Requested", after: "Denied: learner not allocated" }],
  "Failed sign-in, 5 attempts": [{ field: "Account lock", before: "Unlocked", after: "Locked for 15 minutes" }],
  "Recorded offline payment": [
    { field: "Instalment status", before: "Due", after: "Paid" },
    { field: "Receipt", before: "None", after: "RC-2026-0418" },
    { field: "Payment mode", before: "None", after: "Bank transfer" },
  ],
  "Updated integration": [{ field: "Quiet hours", before: "22:00 to 08:00 IST", after: "21:30 to 08:00 IST" }],
  "Nightly backup completed": [{ field: "Latest snapshot", before: "12 Sep 2026, 22:15", after: "13 Sep 2026, 22:15" }],
  "Published content": [{ field: "Version", before: "v2.0 published", after: "v2.1 published" }],
  "Verified student records": [{ field: "Record status (12 learners)", before: "Pending verification", after: "Verified" }],
  "Updated ACCA student ID": [{ field: "ACCA student ID", before: "Not recorded", after: "5140226" }],
  "Changed role permissions": [{ field: "Permissions", before: "programme:ops, programme:acca", after: "programme:ops, programme:acca, programme:universities" }],
  "Sent authorised reminder": [{ field: "Reminder", before: "Not sent", after: "Sent on WhatsApp with the approved template" }],
  "Approved refund": [{ field: "Refund status", before: "Requested", after: "Approved" }],
  "Published job": [{ field: "Status", before: "Draft", after: "Published" }],
  "Enabled multi-factor authentication requirement": [{ field: "MFA for staff", before: "Optional", after: "Required" }],
  "Invited user": [{ field: "Account", before: "None", after: "Invited · University Admin, editor" }],
  "Added blackout period": [{ field: "Coastline blackout periods", before: "None for Dec 2026", after: "30 Nov to 18 Dec 2026" }],
  "Data retention job": [{ field: "Proctoring recordings over 180 days", before: "412 files", after: "Deleted" }],
  "Suspended user": [{ field: "Account status", before: "Active", after: "Suspended" }],
  "Published announcement": [{ field: "Status", before: "Draft", after: "Published" }],
  "Rotated API credentials": [{ field: "API key", before: "rzp_live_••••8Kq2", after: "rzp_live_••••T7mX" }],
  "Recorded ACCA results": [{ field: "Jun 2026 results pending", before: "3", after: "0" }],
  "Updated privacy policy": [{ field: "Policy version", before: "v2.2", after: "v3.0" }],
};

const LOCATIONS: Record<string, string> = {
  "Priya Menon": "Bengaluru, IN",
  "Imran Sheikh": "Bengaluru, IN",
  "Deepa Iyer": "Bengaluru, IN",
  "Arjun Shetty": "Bengaluru, IN",
  "Neha Kapoor": "Mumbai, IN",
  "Prof. Lakshmi Rao": "Pune, IN",
  "Dr Suresh Nair": "Pune, IN",
  "Marcus Bell": "Remote, GB",
  "Farah Siddiqui": "Hyderabad, IN",
  "Aisha Khan": "Bengaluru, IN",
  "Rahul Verma": "Bengaluru, IN",
  "Joseph Mathew": "Kochi, IN",
};

const DEVICES = ["Chrome 128 on macOS", "Edge 127 on Windows 11", "Safari 17 on iPadOS", "Chrome 128 on Windows 11"];

type Highlight = "permission" | "finance" | "bulk" | "denied";

const HIGHLIGHTS: { id: Highlight; label: string; sub: string; icon: React.ReactNode; tone: StatusTone; match: (l: AuditLog) => boolean }[] = [
  { id: "permission", label: "Permission changes", sub: "Roles, invitations and suspensions", icon: <ShieldAlert />, tone: "violet", match: (l) => l.category === "Users" || /permission|mfa|multi-factor/i.test(l.action) },
  { id: "finance", label: "Finance actions and exports", sub: "Payments, refunds and exports", icon: <IndianRupee />, tone: "amber", match: (l) => l.category === "Finance" || l.category === "Reports" },
  { id: "bulk", label: "Bulk updates", sub: "Actions touching many records", icon: <Layers3 />, tone: "info", match: (l) => /\b\d+ (records|files)\b|results|backup/i.test(`${l.action} ${l.target}`) },
  { id: "denied", label: "Denied attempts", sub: "Blocked by permissions or security", icon: <Ban />, tone: "rose", match: (l) => l.result === "denied" },
];

const toneIcon: Record<StatusTone, string> = {
  violet: "bg-violet-soft text-violet",
  amber: "bg-amber-soft text-amber",
  info: "bg-info-soft text-info",
  rose: "bg-rose-soft text-rose",
  jade: "bg-jade-soft text-jade",
  neutral: "bg-surface-2 text-ink-2",
  cta: "bg-cta text-cta-ink",
};

function roleLabel(role: AuditLog["actorRole"]) {
  return role === "system" ? "System" : roleMeta(role).short;
}

export function AuditLogsPage() {
  const [actor, setActor] = useState("");
  const [role, setRole] = useState("");
  const [category, setCategory] = useState("");
  const [result, setResult] = useState("");
  const [range, setRange] = useState("all");
  const [highlight, setHighlight] = useState<Highlight | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [flagged, setFlagged] = useState<string[]>([]);

  const actors = Array.from(new Set(auditLogs.map((l) => l.actor)));
  const roles = Array.from(new Set(auditLogs.map((l) => l.actorRole)));
  const categories = Array.from(new Set(auditLogs.map((l) => l.category)));
  const from = range === "today" ? "2026-09-14" : range === "7d" ? "2026-09-08" : "";

  const hl = HIGHLIGHTS.find((h) => h.id === highlight);
  const visible = auditLogs.filter(
    (l) =>
      (!actor || l.actor === actor) &&
      (!role || l.actorRole === role) &&
      (!category || l.category === category) &&
      (!result || l.result === result) &&
      (!from || l.at >= from) &&
      (!hl || hl.match(l)),
  );
  const open = auditLogs.find((l) => l.id === openId) ?? null;
  const openIndex = open ? auditLogs.indexOf(open) : 0;
  const anyFilter = Boolean(actor || role || category || result || highlight || range !== "all");

  const columns: DataTableColumn<AuditLog>[] = [
    { key: "at", header: "Time", sortable: true, render: (l) => <span className="tnum">{formatDateTime(l.at)}</span> },
    {
      key: "actor",
      header: "Actor",
      sortable: true,
      render: (l) => (
        <span className="block min-w-36">
          <span className="block font-semibold text-ink">{l.actor}</span>
          <span className="block text-[12px] text-ink-3">{roleLabel(l.actorRole)}</span>
        </span>
      ),
    },
    { key: "action", header: "Action", sortable: true, className: "text-ink" },
    { key: "target", header: "Entity", wrap: true, render: (l) => <span className="block max-w-sm min-w-56 text-ink-2">{l.target}</span> },
    { key: "category", header: "Category", sortable: true, render: (l) => <Badge>{l.category}</Badge> },
    { key: "ip", header: "IP", mono: true },
    {
      key: "result",
      header: "Result",
      sortable: true,
      render: (l) => (
        <span className="flex items-center gap-1.5">
          <StatusPill status={l.result} />
          {flagged.includes(l.id) ? <Flag aria-label="Flagged for review" className="size-3.5 text-rose" /> : null}
        </span>
      ),
    },
  ];

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Governance"
        title="Audit logs"
        sub="Review audit logs: every sign-in, permission change, export, finance action and configuration change, with who did it, from where and what changed."
        actions={
          <Button
            onClick={() => queueExport(`audit-log-${range === "today" ? "14-sep-2026" : range === "7d" ? "8-to-14-sep-2026" : "sep-2026"}.csv`)}
          >
            <Download className="size-4" />
            Export log
          </Button>
        }
      />

      <section className="space-y-3">
        <MiniLabel>Highlights</MiniLabel>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {HIGHLIGHTS.map((h) => {
            const n = auditLogs.filter(h.match).length;
            const active = highlight === h.id;
            return (
              <button
                key={h.id}
                type="button"
                aria-pressed={active}
                onClick={() => setHighlight(active ? "" : h.id)}
                className={cn(
                  "min-w-0 rounded-[var(--radius-lg)] border p-4 text-left transition-colors",
                  active ? "border-ink bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-[12.5px] leading-snug font-semibold text-ink-3">{h.label}</span>
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-[10px] [&>svg]:size-4", toneIcon[h.tone])}>{h.icon}</span>
                </span>
                <span className="mt-2 block font-display text-[26px] leading-none font-bold text-ink tnum">{n}</span>
                <span className="mt-1.5 block text-[12px] text-ink-3">{active ? "Filtering the log · select to clear" : h.sub}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <BlockHeading
          title="Activity log"
          sub="Entries cannot be edited or deleted and are kept for 7 years. Select a row for the before and after values."
          action={
            <Segmented
              size="sm"
              value={range}
              onChange={setRange}
              items={[
                { id: "today", label: "Today" },
                { id: "7d", label: "Last 7 days" },
                { id: "all", label: "All" },
              ]}
            />
          }
        />
        <DataTable
          caption="Audit log"
          rows={visible}
          columns={columns}
          getRowId={(l) => l.id}
          initialSort={{ key: "at", dir: "desc" }}
          onRowClick={(l) => setOpenId(l.id)}
          rowLabel={(l) => `Open ${l.action} by ${l.actor}`}
          pageSize={12}
          search={{ placeholder: "Search action, entity or IP", match: (l, q) => `${l.action} ${l.target} ${l.ip} ${l.actor}`.toLowerCase().includes(q) }}
          filters={
            <FilterBar
              active={anyFilter}
              onClear={() => {
                setActor("");
                setRole("");
                setCategory("");
                setResult("");
                setHighlight("");
                setRange("all");
              }}
            >
              <FilterSelect label="Actor" value={actor} onChange={setActor} allLabel="All" options={actors} />
              <FilterSelect label="Role" value={role} onChange={setRole} allLabel="All" options={roles.map((r) => ({ value: r, label: roleLabel(r) }))} />
              <FilterSelect label="Category" value={category} onChange={setCategory} allLabel="All" options={categories} />
              <FilterSelect
                label="Result"
                value={result}
                onChange={setResult}
                allLabel="All"
                options={[
                  { value: "success", label: "Success" },
                  { value: "denied", label: "Denied" },
                ]}
              />
            </FilterBar>
          }
        />
      </section>

      <Drawer
        open={open !== null}
        onClose={() => setOpenId(null)}
        width="w-full max-w-lg"
        title={open ? open.action : "Audit entry"}
        sub={open ? `${formatDateTime(open.at)} · ${open.id}` : undefined}
        footer={
          open ? (
            <>
              <Button variant="ghost" onClick={() => queueExport(`audit-entry-${open.id}.csv`)}>
                <Download className="size-4" />
                Export entry
              </Button>
              <Button
                variant={flagged.includes(open.id) ? "outline" : "secondary"}
                onClick={() => {
                  const on = !flagged.includes(open.id);
                  setFlagged((f) => (on ? [...f, open.id] : f.filter((x) => x !== open.id)));
                  toast({ title: on ? "Flagged for compliance review" : "Flag removed", body: `${open.id} · ${open.action}`, tone: on ? "warning" : "info" });
                }}
              >
                <Flag className="size-4" />
                {flagged.includes(open.id) ? "Remove flag" : "Flag for review"}
              </Button>
            </>
          ) : null
        }
      >
        {open ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={open.result} />
              <Badge>{open.category}</Badge>
              {flagged.includes(open.id) ? <StatusPill status="flagged">Flagged for review</StatusPill> : null}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-[13px]">
              {[
                ["Actor", open.actor],
                ["Role", roleLabel(open.actorRole)],
                ["Entity", open.target],
                ["IP address", open.ip],
                ["Location", open.actorRole === "system" ? "Platform job" : (LOCATIONS[open.actor] ?? "Unknown")],
                ["Device", open.actorRole === "system" ? "Scheduled task" : DEVICES[openIndex % DEVICES.length]],
              ].map(([label, value]) => (
                <div key={label} className={cn("min-w-0", label === "Entity" && "col-span-2")}>
                  <dt className="text-[12px] text-ink-3">{label}</dt>
                  <dd className={cn("mt-0.5 font-semibold break-words text-ink", label === "IP address" && "font-mono")}>{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <MiniLabel className="mb-2.5">Before and after</MiniLabel>
              <div className="overflow-x-auto rounded-[14px] border border-line">
                <table className="w-full min-w-[26rem] text-[12.5px]">
                  <thead>
                    <tr className="bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase">
                      <th className="px-3 py-2">Field</th>
                      <th className="px-3 py-2">Before</th>
                      <th className="px-3 py-2">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(DIFFS[open.action] ?? [{ field: "Record", before: "Previous value", after: open.target }]).map((d) => (
                      <tr key={d.field} className="border-t border-line align-top">
                        <td className="px-3 py-2.5 font-semibold text-ink">{d.field}</td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-md bg-rose-soft px-1.5 py-0.5 font-mono text-rose line-through decoration-1">{d.before}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="rounded-md bg-jade-soft px-1.5 py-0.5 font-mono text-jade">{d.after}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="flex items-center gap-2 text-[12px] text-ink-3">
              <ScrollText className="size-3.5" />
              This entry is write-once. Exports of it are themselves logged.
            </p>
          </div>
        ) : null}
      </Drawer>
    </AdminConfigFrame>
  );
}
