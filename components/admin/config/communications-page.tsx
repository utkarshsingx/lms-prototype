"use client";

import { useState } from "react";
import { Bell, Mail, MessageCircle, MessageSquareText, PhoneCall, Plus, Send, Settings2, Smartphone } from "lucide-react";
import {
  communicationChannels,
  formatAccaDate,
  groupIndian,
  messageTemplates,
  type ChannelConfig,
  type MessageTemplate,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Matrix, MatrixCheck } from "@/components/ui/matrix";
import { toast } from "@/components/ui/toast";
import { AdminConfigFrame, BlockHeading, WithHint } from "./shared";

/* ------------------------------------------------------------ channels */

type ChannelId = ChannelConfig["id"] | "voice";
type ChannelRow = Omit<ChannelConfig, "id"> & { id: ChannelId };

const VOICE: ChannelRow = {
  id: "voice",
  name: "Voice agent",
  provider: "ACCA LMS voice agent",
  status: "connected",
  sender: "+91 80 4718 2299 (ZSkillup ACCA)",
  quietHours: "20:00 to 09:30 IST",
  dailyCapPerStudent: 1,
  sent30d: 1860,
  deliveryRate: 91.4,
  useFor: ["Payment reminders", "Exam entry deadlines"],
};

const DISPLAY_NAME: Partial<Record<ChannelId, string>> = { whatsapp: "WhatsApp Business" };

const ICONS: Record<ChannelId, React.ReactNode> = {
  "in-app": <Bell />,
  email: <Mail />,
  whatsapp: <MessageCircle />,
  sms: <MessageSquareText />,
  push: <Smartphone />,
  voice: <PhoneCall />,
};

const CHANNEL_STATUS_LABEL: Record<ChannelRow["status"], string> = {
  connected: "Connected",
  paused: "Paused",
  "not-configured": "Not configured",
};

const EVENTS: { id: string; label: string; sub: string; on: ChannelId[] }[] = [
  { id: "entry", label: "Exam entry reminder", sub: "Early, standard and late entry deadlines", on: ["in-app", "email", "whatsapp"] },
  { id: "class", label: "Class reminder", sub: "2 hours before each live class", on: ["in-app", "whatsapp"] },
  { id: "payment", label: "Payment due", sub: "Follows the reminder cadence in Payment rules", on: ["in-app", "email", "whatsapp", "voice"] },
  { id: "result", label: "Result published", sub: "When ACCA results are recorded", on: ["in-app", "email"] },
  { id: "recording", label: "Recording ready", sub: "Class recording published", on: ["in-app"] },
  { id: "mentor", label: "Mentor check-in", sub: "Authorised mentor reminders", on: ["in-app", "whatsapp"] },
  { id: "exemption", label: "Exemption documents needed", sub: "Missing qualification documents", on: ["in-app", "email"] },
  { id: "interview", label: "Interview scheduled", sub: "Placement interviews", on: ["email", "whatsapp"] },
  { id: "university", label: "University announcement", sub: "Authorised university publishers", on: ["in-app", "email"] },
  { id: "otp", label: "Sign-in code", sub: "One-time codes for multi-factor sign-in", on: ["sms", "email"] },
];

const TIMES = ["none", "20:00", "21:00", "21:30", "22:00", "07:00", "08:00", "09:00", "09:30"];

const CATEGORY_OPTIONS: MessageTemplate["category"][] = ["Exams", "Classes", "Payments", "Mentoring", "Exemptions", "Careers", "University"];

type TemplateRow = Omit<MessageTemplate, "channel"> & { channel: ChannelId };

/* ------------------------------------------------------------ page */

export function CommunicationsPage() {
  const [channels, setChannels] = useState<ChannelRow[]>([...communicationChannels, VOICE]);
  const [routing, setRouting] = useState<Record<string, ChannelId[]>>(() => Object.fromEntries(EVENTS.map((e) => [e.id, e.on])));
  const [templates, setTemplates] = useState<TemplateRow[]>(messageTemplates);
  const [configuring, setConfiguring] = useState<ChannelRow | null>(null);
  const [testing, setTesting] = useState<ChannelId | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateRow | "new" | null>(null);
  const [channelFilter, setChannelFilter] = useState("");
  const [global, setGlobal] = useState({ perDay: 8, respectQuiet: true, dedupe: true });

  const nameOf = (id: ChannelId) => {
    const c = channels.find((x) => x.id === id);
    return DISPLAY_NAME[id] ?? c?.name ?? id;
  };
  const connected = channels.filter((c) => c.status === "connected");
  const editing = editingTemplate && editingTemplate !== "new" ? editingTemplate : null;

  const templateColumns: DataTableColumn<TemplateRow>[] = [
    {
      key: "name",
      header: "Template",
      sortable: true,
      render: (t) => (
        <span className="block min-w-40">
          <span className="block font-semibold text-ink">{t.name}</span>
          <span className="block font-mono text-[11.5px] text-ink-3">{t.id}</span>
        </span>
      ),
    },
    { key: "category", header: "Event", sortable: true },
    { key: "channel", header: "Channel", sortable: true, render: (t) => nameOf(t.channel) },
    { key: "body", header: "Message", wrap: true, render: (t) => <span className="block max-w-md min-w-64 text-[12.5px] text-ink-2">{t.body}</span> },
    { key: "status", header: "Status", sortable: true, render: (t) => <StatusPill status={t.status} /> },
    { key: "lastUsed", header: "Last used", sortable: true, render: (t) => formatAccaDate(t.lastUsed) },
  ];

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Configuration"
        title="Communications"
        sub="Configure communication channels: sender identities, quiet hours and rate limits for each channel, which events send where, and the message templates learners receive."
        actions={
          <Button onClick={() => setTesting("email")}>
            <Send className="size-4" />
            Send test message
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Channels connected" value={`${connected.length} of ${channels.length}`} icon={<Settings2 />} />
        <KpiTile label="Messages in 30 days" value={groupIndian(channels.reduce((s, c) => s + c.sent30d, 0))} tone="info" />
        <KpiTile label="WhatsApp delivery" value={`${channels.find((c) => c.id === "whatsapp")?.deliveryRate ?? 0}%`} tone="jade" />
        <KpiTile label="Templates pending approval" value={templates.filter((t) => t.status === "pending").length} tone="amber" goodWhen="down" />
      </KpiRow>

      <section className="space-y-4">
        <BlockHeading title="Channels" sub="Pause a channel to stop all sends on it immediately. Queued messages move to the fallback channel." />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {channels.map((c) => (
            <Card key={c.id} className="flex min-w-0 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-inv text-cta [&>svg]:size-5">{ICONS[c.id]}</span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-ink">{nameOf(c.id)}</p>
                    <p className="truncate text-[12.5px] text-ink-3">{c.provider}</p>
                  </div>
                </div>
                <StatusPill status={c.status}>{CHANNEL_STATUS_LABEL[c.status]}</StatusPill>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-[12.5px]">
                <div className="col-span-2 min-w-0">
                  <dt className="text-ink-3">Sender identity</dt>
                  <dd className="truncate font-semibold text-ink">{c.sender}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Quiet hours</dt>
                  <dd className="font-semibold text-ink">{c.quietHours}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Rate limit</dt>
                  <dd className="font-semibold text-ink">{c.dailyCapPerStudent} per learner a day</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Sent in 30 days</dt>
                  <dd className="font-mono font-semibold text-ink tnum">{groupIndian(c.sent30d)}</dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">{c.id === "voice" ? "Answer rate" : "Delivery rate"}</dt>
                  <dd className="font-mono font-semibold text-ink tnum">{c.sent30d ? `${c.deliveryRate}%` : "No sends"}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-1 flex-wrap content-start gap-1.5">
                {c.useFor.length ? c.useFor.map((u) => <Badge key={u}>{u}</Badge>) : <span className="text-[12.5px] text-ink-3">Not used for any event yet</span>}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
                {c.status === "not-configured" ? (
                  <span className="text-[12.5px] text-ink-3">Set up to enable</span>
                ) : (
                  <Switch
                    checked={c.status === "connected"}
                    onChange={(on) => {
                      setChannels((list) => list.map((x) => (x.id === c.id ? { ...x, status: on ? "connected" : "paused" } : x)));
                      toast({ title: `${nameOf(c.id)} ${on ? "resumed" : "paused"}`, body: on ? "Sends resume at the next scheduled run." : "Queued messages move to the fallback channel.", tone: on ? "success" : "warning" });
                    }}
                    label={c.status === "connected" ? "On" : "Paused"}
                  />
                )}
                <div className="flex gap-1.5">
                  <WithHint hint={c.status === "connected" ? undefined : `${nameOf(c.id)} is ${CHANNEL_STATUS_LABEL[c.status].toLowerCase()}`}>
                    <Button size="xs" variant="ghost" disabled={c.status !== "connected"} onClick={() => setTesting(c.id)}>
                      Send test
                    </Button>
                  </WithHint>
                  <Button size="xs" variant={c.status === "not-configured" ? "primary" : "outline"} onClick={() => setConfiguring(c)}>
                    {c.status === "not-configured" ? "Set up" : "Configure"}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-4">
          <BlockHeading title="Events and channels" sub="Tick where each event is sent. Paused or unconfigured channels cannot be selected." />
          <Matrix
            caption="Events by channel"
            corner="Event"
            dense
            rows={EVENTS.map((e) => ({ id: e.id, label: e.label, sub: e.sub }))}
            cols={channels.map((c) => ({ id: c.id, label: nameOf(c.id) }))}
            cell={(eventId, channelId) => {
              const ch = channels.find((c) => c.id === channelId)!;
              const on = routing[eventId]?.includes(ch.id) ?? false;
              const event = EVENTS.find((e) => e.id === eventId)!;
              return (
                <MatrixCheck
                  checked={on}
                  label={`${event.label} on ${nameOf(ch.id)}`}
                  disabled={ch.status !== "connected"}
                  disabledReason={`${nameOf(ch.id)} is ${CHANNEL_STATUS_LABEL[ch.status].toLowerCase()}`}
                  onChange={(next) => {
                    setRouting((r) => ({ ...r, [eventId]: next ? [...(r[eventId] ?? []), ch.id] : (r[eventId] ?? []).filter((x) => x !== ch.id) }));
                    toast({ title: `${nameOf(ch.id)} turned ${next ? "on" : "off"} for ${event.label.toLowerCase()}` });
                  }}
                />
              );
            }}
          />
        </section>
        <Card className="h-fit min-w-0">
          <CardHeader title="Sending rules" sub="Apply across every channel." />
          <div className="space-y-4 border-t border-line p-5">
            <Field label="Messages per learner per day, all channels">
              <Input type="number" min={1} max={20} value={global.perDay} onChange={(e) => setGlobal((g) => ({ ...g, perDay: Number(e.target.value) || 1 }))} className="font-mono" />
            </Field>
            <Switch checked={global.respectQuiet} onChange={(v) => setGlobal((g) => ({ ...g, respectQuiet: v }))} label="Quiet hours apply to payment reminders" />
            <Switch checked={global.dedupe} onChange={(v) => setGlobal((g) => ({ ...g, dedupe: v }))} label="Send once per event across channels" sub="If read in-app, skip the WhatsApp copy" />
            <Button
              className="w-full"
              onClick={() => toast({ title: "Sending rules saved", body: `${global.perDay} messages a day per learner · quiet hours ${global.respectQuiet ? "on" : "off"} for payments` })}
            >
              Save sending rules
            </Button>
          </div>
        </Card>
      </div>

      <section className="space-y-4">
        <BlockHeading title="Message templates" sub="WhatsApp templates need provider approval before they can send. Open a template to edit it or send a test." />
        <DataTable
          caption="Message templates"
          rows={channelFilter ? templates.filter((t) => t.channel === channelFilter) : templates}
          columns={templateColumns}
          getRowId={(t) => t.id}
          onRowClick={(t) => setEditingTemplate(t)}
          rowLabel={(t) => `Edit ${t.name}`}
          search={{ placeholder: "Search templates", match: (t, q) => `${t.name} ${t.body} ${t.category}`.toLowerCase().includes(q) }}
          filters={
            <FilterSelect
              label="Channel"
              value={channelFilter}
              onChange={setChannelFilter}
              allLabel="All"
              options={channels.map((c) => ({ value: c.id, label: nameOf(c.id) }))}
            />
          }
          toolbar={
            <Button size="sm" onClick={() => setEditingTemplate("new")}>
              <Plus className="size-4" />
              New template
            </Button>
          }
        />
      </section>

      {/* configure channel */}
      <FormDrawer
        open={configuring !== null}
        onClose={() => setConfiguring(null)}
        title={configuring ? `${nameOf(configuring.id)} settings` : "Channel settings"}
        sub={configuring?.provider}
        submitLabel={configuring?.status === "not-configured" ? "Connect channel" : "Save settings"}
        onSubmit={(data) => {
          if (!configuring) return;
          const start = String(data.get("quietStart"));
          const end = String(data.get("quietEnd"));
          const next: ChannelRow = {
            ...configuring,
            sender: String(data.get("sender") ?? "").trim() || configuring.sender,
            quietHours: start === "none" || end === "none" ? "None" : `${start} to ${end} IST`,
            dailyCapPerStudent: Number(data.get("cap")) || configuring.dailyCapPerStudent,
            useFor: data.getAll("useFor").map(String),
            status: configuring.status === "not-configured" ? "connected" : configuring.status,
          };
          setChannels((list) => list.map((c) => (c.id === configuring.id ? next : c)));
          toast({
            title: configuring.status === "not-configured" ? `${nameOf(configuring.id)} connected` : `${nameOf(configuring.id)} settings saved`,
            body: `Quiet hours ${next.quietHours} · ${next.dailyCapPerStudent} per learner a day`,
          });
          setConfiguring(null);
        }}
      >
        {configuring ? (
          <div key={configuring.id} className="space-y-4">
            <Field label="Sender identity" hint={configuring.id === "email" ? "Verified domain" : undefined}>
              <Input name="sender" defaultValue={configuring.sender} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Quiet hours start">
                <Select name="quietStart" defaultValue={configuring.quietHours === "None" ? "none" : configuring.quietHours.slice(0, 5)}>
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t === "none" ? "No quiet hours" : t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Quiet hours end">
                <Select name="quietEnd" defaultValue={configuring.quietHours === "None" ? "none" : configuring.quietHours.slice(9, 14)}>
                  {TIMES.map((t) => (
                    <option key={t} value={t}>
                      {t === "none" ? "No quiet hours" : t}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Rate limit per learner per day">
              <Input name="cap" type="number" min={1} max={50} defaultValue={configuring.dailyCapPerStudent} className="font-mono" />
            </Field>
            <Field label="Fallback channel">
              <Select name="fallback" defaultValue={configuring.id === "whatsapp" ? "sms" : "email"}>
                {channels
                  .filter((c) => c.id !== configuring.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {nameOf(c.id)}
                    </option>
                  ))}
              </Select>
            </Field>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Use for</legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {Array.from(new Set([...configuring.useFor, "Classes", "Exams", "Payment reminders", "Mentor reminders", "Announcements", "Receipts"])).map((u) => (
                  <Checkbox key={u} name="useFor" value={u} label={u} defaultChecked={configuring.useFor.includes(u)} />
                ))}
              </div>
            </fieldset>
          </div>
        ) : null}
      </FormDrawer>

      {/* send test */}
      <FormDrawer
        open={testing !== null}
        onClose={() => setTesting(null)}
        title="Send test message"
        sub="Test messages go to staff only and are not counted in delivery rates."
        submitLabel="Send test"
        onSubmit={(data) => {
          const ch = String(data.get("channel")) as ChannelId;
          const tpl = templates.find((t) => t.id === String(data.get("template")));
          toast({ title: `Test sent on ${nameOf(ch)}`, body: `${tpl?.name ?? "Template"} to ${String(data.get("to"))}`, tone: "info" });
          setTesting(null);
        }}
      >
        {testing ? (
          <div key={testing} className="space-y-4">
            <Field label="Channel">
              <Select name="channel" defaultValue={testing}>
                {connected.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nameOf(c.id)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Template">
              <Select name="template" defaultValue={templates[0]?.id}>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Send to">
              <Input name="to" required defaultValue={testing === "email" || testing === "in-app" ? "neha.kapoor@zskillup.com" : "+91 98450 21133"} />
            </Field>
          </div>
        ) : null}
      </FormDrawer>

      {/* template editor */}
      <FormDrawer
        open={editingTemplate !== null}
        onClose={() => setEditingTemplate(null)}
        title={editing ? editing.name : "New message template"}
        sub="Use {{variables}} such as {{first_name}}, {{paper}}, {{date}}."
        submitLabel={editing ? "Save template" : "Create template"}
        footerNote={editing ? `Last used ${formatAccaDate(editing.lastUsed)}` : "WhatsApp templates start as pending approval."}
        onSubmit={(data) => {
          const channel = String(data.get("channel")) as ChannelId;
          const row: TemplateRow = {
            id: editing?.id ?? `tpl-new-${templates.length + 1}`,
            name: String(data.get("name") ?? "").trim(),
            channel,
            category: String(data.get("category")) as MessageTemplate["category"],
            body: String(data.get("body") ?? "").trim(),
            status: channel === "whatsapp" && (!editing || editing.body !== String(data.get("body") ?? "").trim()) ? "pending" : (editing?.status ?? "approved"),
            lastUsed: editing?.lastUsed ?? "2026-09-14",
          };
          setTemplates((list) => (editing ? list.map((t) => (t.id === editing.id ? row : t)) : [row, ...list]));
          toast({ title: editing ? "Template saved" : "Template created", body: row.status === "pending" ? `${row.name} sent for WhatsApp approval` : row.name });
          setEditingTemplate(null);
        }}
      >
        <div key={editing?.id ?? "new"} className="space-y-4">
          <Field label="Template name">
            <Input name="name" required defaultValue={editing?.name} placeholder="e.g. Mock exam tomorrow" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel">
              <Select name="channel" defaultValue={editing?.channel ?? "whatsapp"}>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nameOf(c.id)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Event category">
              <Select name="category" defaultValue={editing?.category ?? "Exams"}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Message">
            <Textarea name="body" rows={5} required defaultValue={editing?.body} placeholder="Hi {{first_name}}, your {{paper}} mock opens on {{date}}." />
          </Field>
          {editing ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toast({ title: `Test sent: ${editing.name}`, body: `On ${nameOf(editing.channel)} to Neha Kapoor`, tone: "info" })}
            >
              <Send className="size-3.5" />
              Send test of this template
            </Button>
          ) : null}
        </div>
      </FormDrawer>
    </AdminConfigFrame>
  );
}
