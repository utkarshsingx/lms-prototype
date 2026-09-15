"use client";

import { useMemo, useState } from "react";
import { AlarmClock, ArrowUpRight, Download, Info, LifeBuoy, MessageSquareReply, Timer } from "lucide-react";
import {
  TICKET_CATEGORIES,
  TICKET_STATUS_LABELS,
  formatAccaDate,
  formatDateTime,
  staffById,
  staffName,
  studentById,
  ticketsForUniversity,
  type Ticket,
  type TicketPriority,
} from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { Drawer } from "@/components/ui/modal";
import { Field, Textarea } from "@/components/ui/field";
import { StackedBar } from "@/components/ui/charts";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import {
  Callout,
  DEMO_NOW,
  Gated,
  MiniLabel,
  WorkspaceHeader,
  durationLabel,
  hoursBetween,
  intakeShort,
  plural,
  queueReport,
  rollNumber,
  useWorkspace,
} from "./shared";

const PRIORITY_TONE: Record<TicketPriority, StatusTone> = { urgent: "rose", high: "amber", medium: "info", low: "neutral" };
const PRIORITY_LABEL: Record<TicketPriority, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
const PRIORITY_ORDER: Record<TicketPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };

type Sla = { state: "met" | "missed" | "due" | "breached"; label: string; hours: number };

function slaOf(t: Ticket): Sla {
  if (t.status === "resolved") {
    const h = t.resolutionHours ?? 0;
    return h <= t.slaHours
      ? { state: "met", label: `Met · resolved in ${durationLabel(h)}`, hours: h }
      : { state: "missed", label: `Missed · resolved in ${durationLabel(h)}`, hours: h };
  }
  const age = hoursBetween(t.created, DEMO_NOW);
  return age > t.slaHours
    ? { state: "breached", label: `Breached · ${durationLabel(age - t.slaHours)} over`, hours: age }
    : { state: "due", label: `Due in ${durationLabel(t.slaHours - age)}`, hours: age };
}

const SLA_TONE: Record<Sla["state"], StatusTone> = { met: "jade", missed: "rose", due: "amber", breached: "rose" };

const VIEWS = ["all", "open", "escalated", "resolved"] as const;
type View = (typeof VIEWS)[number];

export function SupportPage() {
  const { uni, canEdit, reason, persona } = useWorkspace();
  const tickets = useMemo(() => ticketsForUniversity(uni.id), [uni.id]);

  const [view, setView] = useState<View>("all");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [updates, setUpdates] = useState<Record<string, TimelineItem[]>>({});
  const [draft, setDraft] = useState("");

  const counts = {
    all: tickets.length,
    open: tickets.filter((t) => t.status !== "resolved").length,
    escalated: tickets.filter((t) => t.status === "escalated").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
  };

  const rows = tickets.filter(
    (t) =>
      (view === "all" || (view === "open" ? t.status !== "resolved" : t.status === view)) &&
      (!category || t.category === category) &&
      (!priority || t.priority === priority),
  );

  const breaching = tickets.filter((t) => slaOf(t).state === "breached").length;
  const responses = tickets.map((t) => t.firstResponseMins).filter((m): m is number => m != null).sort((a, b) => a - b);
  const medianResponse = responses.length ? responses[Math.floor((responses.length - 1) / 2)] : 0;
  const escalatedToUs = tickets.filter((t) => t.escalatedTo && staffById(t.escalatedTo)?.universityId === uni.id && t.status !== "resolved");

  const opened = tickets.find((t) => t.id === openId) ?? null;

  const columns: DataTableColumn<Ticket>[] = [
    { key: "id", header: "Ticket", mono: true, sortable: true },
    {
      key: "subject",
      header: "Subject and student",
      wrap: true,
      sortable: true,
      render: (t) => {
        const s = studentById(t.studentId);
        return (
          <span className="block min-w-0">
            <span className="block font-semibold text-ink">{t.subject}</span>
            <span className="mt-0.5 block text-[12px] text-ink-3">
              {s?.name} · <span className="font-mono">{rollNumber(t.studentId)}</span>
              {s?.section ? ` · Section ${s.section}` : ""}
            </span>
          </span>
        );
      },
    },
    { key: "category", header: "Category", sortable: true },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (t) => PRIORITY_ORDER[t.priority],
      render: (t) => (
        <StatusPill status={t.priority} tone={PRIORITY_TONE[t.priority]} size="sm">
          {PRIORITY_LABEL[t.priority]}
        </StatusPill>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (t) => <StatusPill status={t.status}>{TICKET_STATUS_LABELS[t.status]}</StatusPill>,
    },
    {
      key: "with",
      header: "With",
      render: (t) =>
        t.status === "escalated" && t.escalatedTo ? (
          <span className="text-ink-2">
            Escalated to <span className="font-semibold text-ink">{staffName(t.escalatedTo)}</span>
          </span>
        ) : (
          <span className="text-ink-2">{staffName(t.assigneeId)}</span>
        ),
    },
    {
      key: "age",
      header: "Age",
      align: "right",
      sortable: true,
      sortValue: (t) => hoursBetween(t.created, DEMO_NOW),
      render: (t) => durationLabel(hoursBetween(t.created, DEMO_NOW)),
    },
    {
      key: "sla",
      header: "SLA",
      sortable: true,
      sortValue: (t) => ["breached", "due", "missed", "met"].indexOf(slaOf(t).state),
      render: (t) => {
        const sla = slaOf(t);
        return (
          <StatusPill status={sla.state} tone={SLA_TONE[sla.state]} size="sm">
            {sla.label}
          </StatusPill>
        );
      },
    },
  ];

  const detailHistory = (t: Ticket): TimelineItem[] => [
    ...(updates[t.id] ?? []),
    ...[...t.history].reverse().map((h) => ({
      id: h.id,
      title: h.action,
      meta: `${h.at.includes("T") ? formatDateTime(h.at) : formatAccaDate(h.at)} · ${h.actor}`,
      body: h.note,
      tone: (/escalat/i.test(h.action) ? "rose" : /resolv/i.test(h.action) ? "jade" : /raised/i.test(h.action) ? "neutral" : "info") as StatusTone,
    })),
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Engagement"
        title="Support tickets"
        sub={`View support-ticket status for tickets raised by ${uni.shortName} students. The ZSkillup support team answers and resolves them.`}
        badge={<ScopeChip icon={<LifeBuoy />}>Showing {plural(tickets.length, "ticket")} from {uni.shortName} students</ScopeChip>}
        actions={
          <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-support-tickets.csv`, `${tickets.length} tickets with status and SLA`)}>
            <Download className="size-4" />
            Export
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile label="Open tickets" value={counts.open} tone="info" icon={<LifeBuoy />} sub={`${counts.resolved} resolved in the last 30 days`} />
        <KpiTile label="Escalated" value={counts.escalated} tone="rose" icon={<ArrowUpRight />} sub={escalatedToUs.length ? `${escalatedToUs.length} escalated to ${uni.shortName}` : "To faculty or programme team"} />
        <KpiTile label="Breaching SLA" value={breaching} tone={breaching ? "amber" : "jade"} icon={<AlarmClock />} sub="Open past the resolution target" />
        <KpiTile label="Median first response" value={durationLabel(Math.round(medianResponse / 60))} icon={<Timer />} sub={`${medianResponse} minutes`} />
      </KpiRow>

      {escalatedToUs.length ? (
        <Callout icon={<Info />} tone="amber" title={`${plural(escalatedToUs.length, "ticket")} escalated to ${uni.shortName}`}>
          {escalatedToUs.map((t) => (
            <span key={t.id} className="block">
              <span className="font-mono text-[12px] text-ink">{t.id}</span> · {t.subject} ({studentById(t.studentId)?.name}), escalated to {staffName(t.escalatedTo)}.{" "}
              <button type="button" onClick={() => setOpenId(t.id)} className="font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
                View ticket
              </button>
            </span>
          ))}
        </Callout>
      ) : null}

      <DataTable
        caption={`${uni.shortName} support tickets`}
        rows={rows}
        columns={columns}
        getRowId={(t) => t.id}
        onRowClick={(t) => setOpenId(t.id)}
        rowLabel={(t) => `Open ticket ${t.id}`}
        initialSort={{ key: "sla", dir: "asc" }}
        search={{
          placeholder: "Search ticket, subject or student",
          match: (t, q) =>
            t.id.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || (studentById(t.studentId)?.name ?? "").toLowerCase().includes(q),
        }}
        filters={
          <FilterBar
            active={Boolean(category || priority || view !== "all")}
            onClear={() => {
              setCategory("");
              setPriority("");
              setView("all");
            }}
          >
            <Segmented
              size="sm"
              value={view}
              onChange={(v) => setView(v as View)}
              items={VIEWS.map((v) => ({ id: v, label: `${v === "all" ? "All" : v === "open" ? "Open" : v === "escalated" ? "Escalated" : "Resolved"} · ${counts[v]}` }))}
            />
            <FilterSelect label="Category" allLabel="All" value={category} onChange={setCategory} options={TICKET_CATEGORIES} />
            <FilterSelect
              label="Priority"
              allLabel="Any"
              value={priority}
              onChange={setPriority}
              options={(Object.keys(PRIORITY_LABEL) as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_LABEL[p] }))}
            />
          </FilterBar>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Tickets by category" sub="Open and resolved, last 30 days" />
          <div className="px-5 pb-5">
            <StackedBar
              rows={TICKET_CATEGORIES.map((c) => ({
                label: c,
                parts: [
                  { label: "Open", value: tickets.filter((t) => t.category === c && t.status !== "resolved" && t.status !== "escalated").length, tone: "info" },
                  { label: "Escalated", value: tickets.filter((t) => t.category === c && t.status === "escalated").length, tone: "rose" },
                  { label: "Resolved", value: tickets.filter((t) => t.category === c && t.status === "resolved").length, tone: "jade" },
                ],
              }))}
            />
          </div>
        </Card>
        <Callout icon={<Info />} title="Status only">
          Tickets are handled by the ZSkillup student support team. You can see status, SLA and history for your students. Replies to students,
          categories and assignments are managed by the Programme Admin team. When a ticket is escalated to the university, you can send the team an
          update from the ticket.
        </Callout>
      </div>

      <Drawer
        open={opened != null}
        onClose={() => {
          setOpenId(null);
          setDraft("");
        }}
        title={opened ? `${opened.id} · ${opened.subject}` : "Ticket"}
        sub={opened ? `${studentById(opened.studentId)?.name} · ${opened.category} · raised ${formatDateTime(opened.created)}` : undefined}
        width="w-full max-w-lg"
        footer={
          <p className="mr-auto text-[12.5px] text-ink-3">Read-only view. The ZSkillup support team replies to students.</p>
        }
      >
        {opened ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={opened.status}>{TICKET_STATUS_LABELS[opened.status]}</StatusPill>
              <StatusPill status={opened.priority} tone={PRIORITY_TONE[opened.priority]}>
                {PRIORITY_LABEL[opened.priority]} priority
              </StatusPill>
              <StatusPill status={slaOf(opened).state} tone={SLA_TONE[slaOf(opened).state]}>
                {slaOf(opened).label}
              </StatusPill>
            </div>
            <p className="rounded-[14px] border border-line bg-surface-2 p-3.5 text-[13.5px] leading-relaxed text-ink">{opened.body}</p>
            <dl className="rounded-[12px] border border-line px-3.5">
              {[
                ["Student", `${studentById(opened.studentId)?.name} · ${rollNumber(opened.studentId)}`],
                ["Cohort", `${intakeShort(studentById(opened.studentId)?.intakeId ?? "")} · Semester ${studentById(opened.studentId)?.semester} · Section ${studentById(opened.studentId)?.section}`],
                ["Channel", opened.channel === "whatsapp" ? "WhatsApp" : opened.channel.charAt(0).toUpperCase() + opened.channel.slice(1)],
                ["Assigned to", staffName(opened.assigneeId)],
                ["First response", opened.firstResponseMins != null ? durationLabel(Math.round(opened.firstResponseMins / 60)) : "Awaiting"],
                ["Resolution target", `${opened.slaHours} hours`],
                ["Last updated", formatDateTime(opened.updated.includes("T") ? opened.updated : `${opened.updated}T00:00`)],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
                  <dt className="shrink-0 text-[12.5px] text-ink-3">{k}</dt>
                  <dd className="min-w-0 text-right text-[13px] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            {opened.escalatedTo && staffById(opened.escalatedTo)?.universityId === uni.id && opened.status !== "resolved" ? (
              <div className="space-y-3 rounded-[14px] border border-amber/40 bg-amber-soft p-4">
                <p className="text-[13.5px] font-semibold text-ink">Escalated to {staffName(opened.escalatedTo)}</p>
                <p className="text-[12.5px] leading-relaxed text-ink-2">
                  The support team needs the university to check this student&apos;s record. Review it on the Students page, then send the team an update.
                </p>
                <Field label="Update for the support team">
                  <Textarea
                    rows={3}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={!canEdit}
                    placeholder="e.g. Date of birth corrected in the university record on 14 Sep. Please re-run verification."
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href="/university/students" variant="outline" size="sm">
                    Open student records
                  </LinkButton>
                  <Gated
                    allowed={canEdit}
                    reason={reason}
                    size="sm"
                    disabled={!draft.trim()}
                    onClick={() => {
                      setUpdates((u) => ({
                        ...u,
                        [opened.id]: [
                          { id: `up-${(u[opened.id]?.length ?? 0) + 1}`, title: "University update sent", meta: `14 Sep 2026, 15:00 · ${persona.name}`, body: draft.trim(), tone: "info" },
                          ...(u[opened.id] ?? []),
                        ],
                      }));
                      toast({ title: `Update sent on ${opened.id}`, body: `${staffName(opened.assigneeId)} and the support team are notified.` });
                      setDraft("");
                    }}
                  >
                    <MessageSquareReply className="size-4" />
                    Send update
                  </Gated>
                </div>
              </div>
            ) : null}

            <div>
              <MiniLabel className="mb-3">History</MiniLabel>
              <Timeline dense items={detailHistory(opened)} />
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
