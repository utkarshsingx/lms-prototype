"use client";

import { useState } from "react";
import { AlertTriangle, Download, Plug, RefreshCw, Unplug } from "lucide-react";
import { formatDateTime, integrations as seedIntegrations, staff, staffName, type Integration } from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { useRole } from "@/lib/role";
import { AdminConfigFrame, BlockHeading, DEMO_NOW, queueExport } from "./shared";

type IntegrationRow = Omit<Integration, "category"> & { category: string; method: string };

const METHOD: Record<string, string> = {
  "int-zoom": "OAuth app · webhooks",
  "int-razorpay": "API keys · settlement webhooks",
  "int-whatsapp": "Cloud API · approved templates",
  "int-sendgrid": "API key · verified domain",
  "int-google": "SAML single sign-on",
  "int-s3": "IAM role · server-side encryption",
  "int-proctor": "API key",
  "int-results": "CSV upload by the programme team",
  "int-sis-bw": "SFTP nightly file",
  "int-sis-nf": "SFTP nightly file",
};

const EXTRA: IntegrationRow[] = [
  { id: "int-m365", name: "Microsoft 365 single sign-on", category: "Identity", status: "not-connected", lastSync: "", detail: "Available for Coastline University staff, who use Microsoft 365 accounts.", ownerId: "st-arjun", method: "OpenID Connect" },
  { id: "int-vimeo", name: "Vimeo", category: "Video", status: "connected", lastSync: "2026-09-14T09:40", detail: "Lesson video hosting with domain-level privacy and captions", ownerId: "st-arjun", method: "API token · domain whitelist" },
  { id: "int-sis-cl", name: "Coastline student information system", category: "Data", status: "connected", lastSync: "2026-09-12T18:15", detail: "Weekly CSV upload of semester and enrolment records", ownerId: "st-priya", method: "CSV upload weekly" },
  { id: "int-hubspot", name: "HubSpot", category: "CRM", status: "not-connected", lastSync: "", detail: "Not connected. Admissions and sales are managed outside ACCA LMS.", ownerId: "st-neha", method: "Private app token" },
];

type SyncLog = { id: string; at: string; integrationId: string; event: string; records: number; duration: string; result: "success" | "failed" | "partial"; note: string };

const SEED_LOGS: SyncLog[] = [
  { id: "sl-18", at: "2026-09-14T10:02", integrationId: "int-s3", event: "Recording upload", records: 6, duration: "4m 12s", result: "success", note: "Saturday FR and AA batch recordings" },
  { id: "sl-17", at: "2026-09-14T10:01", integrationId: "int-whatsapp", event: "Template message batch", records: 214, duration: "38s", result: "success", note: "Class reminders for today" },
  { id: "sl-16", at: "2026-09-14T09:55", integrationId: "int-zoom", event: "Attendance import", records: 128, duration: "21s", result: "success", note: "4 classes from Sunday" },
  { id: "sl-15", at: "2026-09-14T09:40", integrationId: "int-vimeo", event: "Caption sync", records: 12, duration: "1m 05s", result: "success", note: "" },
  { id: "sl-14", at: "2026-09-14T08:00", integrationId: "int-google", event: "Directory sync", records: 41, duration: "9s", result: "success", note: "Staff and Brightwater accounts" },
  { id: "sl-13", at: "2026-09-14T06:00", integrationId: "int-sis-bw", event: "Semester and enrolment file", records: 142, duration: "52s", result: "partial", note: "2 records held: date of birth mismatch" },
  { id: "sl-12", at: "2026-09-13T23:00", integrationId: "int-razorpay", event: "Settlement file", records: 0, duration: "2s", result: "failed", note: "Settlement file not yet available from the gateway" },
  { id: "sl-11", at: "2026-09-13T22:15", integrationId: "int-s3", event: "Nightly backup", records: 1, duration: "18m 40s", result: "success", note: "Primary database snapshot" },
  { id: "sl-10", at: "2026-09-13T18:00", integrationId: "int-proctor", event: "Session reports", records: 33, duration: "14s", result: "success", note: "FR progress test 2 re-sits" },
  { id: "sl-09", at: "2026-09-12T18:15", integrationId: "int-sis-cl", event: "CSV upload", records: 96, duration: "11s", result: "success", note: "Uploaded by Priya Menon" },
  { id: "sl-08", at: "2026-09-12T09:30", integrationId: "int-zoom", event: "Recording fetch", records: 5, duration: "3m 02s", result: "success", note: "" },
  { id: "sl-07", at: "2026-09-11T23:00", integrationId: "int-razorpay", event: "Settlement file", records: 46, duration: "6s", result: "success", note: "₹11,27,000 settled" },
];

const STATUS_LABEL: Record<IntegrationRow["status"], string> = { connected: "Connected", attention: "Needs attention", "not-connected": "Not connected" };

export function IntegrationsPage() {
  const { persona } = useRole();
  const [rows, setRows] = useState<IntegrationRow[]>(() => [...seedIntegrations.map((i) => ({ ...i, method: METHOD[i.id] ?? "API" })), ...EXTRA]);
  const [logs, setLogs] = useState<SyncLog[]>(SEED_LOGS);
  const [view, setView] = useState("all");
  const [category, setCategory] = useState("");
  const [configuring, setConfiguring] = useState<IntegrationRow | null>(null);
  const [logIntegration, setLogIntegration] = useState("");
  const [logResult, setLogResult] = useState("");
  const [autoSync, setAutoSync] = useState(true);

  const categories = Array.from(new Set(rows.map((r) => r.category)));
  const visible = rows.filter((r) => (view === "all" || r.status === view) && (!category || r.category === category));
  const nameOf = (id: string) => rows.find((r) => r.id === id)?.name ?? id;

  const addLog = (row: IntegrationRow, event: string, result: SyncLog["result"], note: string) =>
    setLogs((list) => [
      { id: `sl-new-${list.length + 1}`, at: DEMO_NOW, integrationId: row.id, event, records: result === "success" ? 1 + (row.name.length % 40) : 0, duration: "6s", result, note },
      ...list,
    ]);

  const syncNow = (row: IntegrationRow) => {
    setRows((list) => list.map((r) => (r.id === row.id ? { ...r, lastSync: DEMO_NOW, status: r.status === "attention" ? "connected" : r.status } : r)));
    addLog(row, "Manual sync", "success", `Started by ${persona.name}`);
    toast({ title: `${row.name} synced`, body: `Last sync ${formatDateTime(DEMO_NOW)}` });
  };

  const logColumns: DataTableColumn<SyncLog>[] = [
    { key: "at", header: "Time", sortable: true, render: (l) => formatDateTime(l.at) },
    { key: "integration", header: "Integration", sortable: true, sortValue: (l) => nameOf(l.integrationId), render: (l) => <span className="font-semibold text-ink">{nameOf(l.integrationId)}</span> },
    { key: "event", header: "Event" },
    { key: "records", header: "Records", align: "right", mono: true, sortable: true },
    { key: "duration", header: "Duration", align: "right", mono: true },
    { key: "result", header: "Result", sortable: true, render: (l) => <StatusPill status={l.result} /> },
    { key: "note", header: "Note", wrap: true, className: "min-w-56 text-ink-2", render: (l) => l.note || "None" },
  ];

  const filteredLogs = logs.filter((l) => (!logIntegration || l.integrationId === logIntegration) && (!logResult || l.result === logResult));

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Configuration"
        title="Integrations"
        sub="Manage integrations: video, identity, payments, messaging, storage and university student information systems, with the sync log for each."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("integration-sync-log.csv")}>
              <Download className="size-4" />
              Export sync log
            </Button>
            <Button
              onClick={() => {
                const live = rows.filter((r) => r.status !== "not-connected");
                setRows((list) => list.map((r) => (r.status === "not-connected" ? r : { ...r, lastSync: DEMO_NOW })));
                toast({ title: `Sync started for ${live.length} integrations`, body: "Results appear in the sync log.", tone: "info" });
              }}
            >
              <RefreshCw className="size-4" />
              Sync all now
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Connected" value={rows.filter((r) => r.status === "connected").length} sub={`of ${rows.length} integrations`} icon={<Plug />} />
        <KpiTile label="Needs attention" value={rows.filter((r) => r.status === "attention").length} tone="amber" goodWhen="down" icon={<AlertTriangle />} />
        <KpiTile label="Not connected" value={rows.filter((r) => r.status === "not-connected").length} tone="neutral" icon={<Unplug />} />
        <KpiTile label="Sync failures, 24 hours" value={logs.filter((l) => l.result === "failed" && l.at >= "2026-09-13T10:30").length} tone="rose" goodWhen="down" icon={<RefreshCw />} />
      </KpiRow>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Segmented
            value={view}
            onChange={setView}
            items={[
              { id: "all", label: "All" },
              { id: "connected", label: "Connected" },
              { id: "attention", label: "Needs attention" },
              { id: "not-connected", label: "Not connected" },
            ]}
          />
          <FilterSelect label="Category" value={category} onChange={setCategory} allLabel="All" options={categories} />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <Card key={r.id} className="flex min-w-0 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] leading-snug font-bold text-ink">{r.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {r.category} · {r.method}
                  </p>
                </div>
                <StatusPill status={r.status}>{STATUS_LABEL[r.status]}</StatusPill>
              </div>
              <p className="mt-3 flex-1 text-[13px] leading-relaxed text-ink-2">{r.detail}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-[12.5px]">
                <div className="min-w-0">
                  <dt className="text-ink-3">Last sync</dt>
                  <dd className="font-semibold text-ink">{r.lastSync ? formatDateTime(r.lastSync) : "Never"}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Owner</dt>
                  <dd className="truncate font-semibold text-ink">{staffName(r.ownerId)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap justify-end gap-1.5 border-t border-line pt-3.5">
                {r.status === "not-connected" ? (
                  <Button size="xs" onClick={() => setConfiguring(r)}>
                    <Plug className="size-3.5" />
                    Connect
                  </Button>
                ) : (
                  <>
                    <Button size="xs" variant="ghost" onClick={() => syncNow(r)}>
                      <RefreshCw className="size-3.5" />
                      Sync now
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => setConfiguring(r)}>
                      Configure
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <BlockHeading
          title="Sync logs"
          sub="Every scheduled and manual sync, newest first. Failed syncs retry three times, then alert the integration owner."
          action={<Switch checked={autoSync} onChange={(v) => { setAutoSync(v); toast({ title: v ? "Automatic retries on" : "Automatic retries paused", tone: v ? "success" : "warning" }); }} label="Automatic retries" />}
        />
        <DataTable
          caption="Integration sync logs"
          rows={filteredLogs}
          columns={logColumns}
          getRowId={(l) => l.id}
          initialSort={{ key: "at", dir: "desc" }}
          filters={
            <FilterBar
              active={Boolean(logIntegration || logResult)}
              onClear={() => {
                setLogIntegration("");
                setLogResult("");
              }}
            >
              <FilterSelect
                label="Integration"
                value={logIntegration}
                onChange={setLogIntegration}
                allLabel="All"
                options={rows.filter((r) => logs.some((l) => l.integrationId === r.id)).map((r) => ({ value: r.id, label: r.name }))}
              />
              <FilterSelect
                label="Result"
                value={logResult}
                onChange={setLogResult}
                allLabel="All"
                options={[
                  { value: "success", label: "Success" },
                  { value: "partial", label: "Partial" },
                  { value: "failed", label: "Failed" },
                ]}
              />
            </FilterBar>
          }
        />
      </section>

      <FormDrawer
        open={configuring !== null}
        onClose={() => setConfiguring(null)}
        title={configuring ? (configuring.status === "not-connected" ? `Connect ${configuring.name}` : `${configuring.name} settings`) : "Integration"}
        sub={configuring?.method}
        submitLabel={configuring?.status === "not-connected" ? "Connect" : "Save settings"}
        footerNote="Credentials are stored encrypted and never shown again."
        onSubmit={(data) => {
          if (!configuring) return;
          const connecting = configuring.status === "not-connected";
          const owner = String(data.get("owner"));
          setRows((list) =>
            list.map((r) =>
              r.id === configuring.id
                ? { ...r, ownerId: owner, status: connecting || r.status === "attention" ? "connected" : r.status, lastSync: connecting ? DEMO_NOW : r.lastSync }
                : r,
            ),
          );
          addLog(configuring, connecting ? "Connected" : "Settings updated", "success", `Frequency: ${String(data.get("frequency"))}`);
          toast({ title: connecting ? `${configuring.name} connected` : `${configuring.name} settings saved`, body: `Owner ${staffName(owner)} · ${String(data.get("frequency"))}` });
          setConfiguring(null);
        }}
      >
        {configuring ? (
          <div key={configuring.id} className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{configuring.category}</Badge>
              <StatusPill status={configuring.status}>{STATUS_LABEL[configuring.status]}</StatusPill>
            </div>
            {configuring.status === "attention" ? (
              <p className="rounded-[12px] bg-amber-soft px-3.5 py-2.5 text-[13px] text-amber">{configuring.detail}</p>
            ) : null}
            <Field label={configuring.method.startsWith("CSV") ? "Upload folder" : configuring.method.startsWith("SFTP") ? "SFTP host" : "Account or client ID"}>
              <Input
                name="account"
                required
                defaultValue={configuring.status === "not-connected" ? "" : configuring.method.startsWith("SFTP") ? "sftp.zskillup.com:22" : `zskillup-acca-${configuring.id.slice(4)}`}
                className="font-mono"
              />
            </Field>
            <Field label={configuring.method.startsWith("CSV") ? "File template" : "Secret or API key"} hint={configuring.status === "not-connected" ? undefined : "Stored"}>
              <Input
                name="secret"
                type={configuring.method.startsWith("CSV") ? "text" : "password"}
                defaultValue={configuring.status === "not-connected" ? "" : configuring.method.startsWith("CSV") ? "enrolments-template-v2.csv" : "stored-credential"}
                required={configuring.status === "not-connected"}
                className="font-mono"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Sync frequency">
                <Select name="frequency" defaultValue={configuring.method.includes("nightly") ? "Nightly" : configuring.method.includes("weekly") ? "Weekly" : "Real time"}>
                  {["Real time", "Hourly", "Nightly", "Weekly"].map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Owner">
                <Select name="owner" defaultValue={configuring.ownerId}>
                  {staff
                    .filter((s) => s.kind === "super-admin" || s.kind === "programme-admin")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                </Select>
              </Field>
            </div>
            <Field label="Webhook URL" hint="Read only">
              <Input readOnly value={`https://acca.zskillup.com/hooks/${configuring.id.slice(4)}`} className="font-mono text-[12.5px]" />
            </Field>
            {configuring.status !== "not-connected" ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => {
                  setRows((list) => list.map((r) => (r.id === configuring.id ? { ...r, status: "not-connected", lastSync: "" } : r)));
                  addLog(configuring, "Disconnected", "success", `Disconnected by ${persona.name}`);
                  toast({ title: `${configuring.name} disconnected`, tone: "warning" });
                  setConfiguring(null);
                }}
              >
                <Unplug className="size-3.5" />
                Disconnect
              </Button>
            ) : null}
          </div>
        ) : null}
      </FormDrawer>
    </AdminConfigFrame>
  );
}
