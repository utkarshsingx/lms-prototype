"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Download, Siren, Timer, UserRoundCog } from "lucide-react";
import {
  escalationMatrix,
  formatDateTime,
  staff,
  staffName,
  studentName,
  tickets,
  type EscalationRule,
  type Ticket,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Drawer } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Matrix } from "@/components/ui/matrix";
import { LineChart, StackedBar } from "@/components/ui/charts";
import { Timeline } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { AdminConfigFrame, BlockHeading, DEMO_NOW, addHoursIso, formatHours, hoursBetween, queueExport } from "./shared";

type Level = 1 | 2 | 3;

type EscRow = {
  id: string;
  subject: string;
  body: string;
  category: Ticket["category"];
  priority: Ticket["priority"];
  studentId: string;
  ownerId: string;
  level: Level;
  escalatedAt: string;
  status: "escalated" | "resolved";
  history: Ticket["history"];
};

const TREND_LABELS = ["20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"];
const TREND = {
  escalated: [5, 4, 6, 7, 5, 8, 9, 7],
  withinSla: [4, 4, 5, 5, 4, 6, 6, 4],
};

const BY_CATEGORY: { label: string; within: number; breached: number }[] = [
  { label: "Academic", within: 9, breached: 2 },
  { label: "Exam booking", within: 5, breached: 3 },
  { label: "Registration", within: 4, breached: 2 },
  { label: "Exemption", within: 4, breached: 1 },
  { label: "Payments", within: 3, breached: 1 },
  { label: "Technical", within: 2, breached: 0 },
];

function seedRows(matrix: EscalationRule[]): EscRow[] {
  return tickets
    .filter((t) => t.escalatedTo && (t.status === "escalated" || t.status === "resolved"))
    .map((t) => {
      const entry = t.history.find((h) => h.action.startsWith("Escalated to"));
      const at = entry ? (entry.at.length === 10 ? `${entry.at}T17:30` : entry.at) : t.updated;
      const rule = matrix.find((m) => m.category === t.category);
      return {
        id: t.id,
        subject: t.subject,
        body: t.body,
        category: t.category,
        priority: t.priority,
        studentId: t.studentId,
        ownerId: t.escalatedTo ?? rule?.levels[1].ownerId ?? "st-priya",
        level: 2 as Level,
        escalatedAt: at,
        status: t.status === "resolved" ? "resolved" : "escalated",
        history: t.history,
      };
    });
}

export function EscalationsPage() {
  const [matrix, setMatrix] = useState<EscalationRule[]>(escalationMatrix);
  const [rows, setRows] = useState<EscRow[]>(() => seedRows(escalationMatrix));
  const [status, setStatus] = useState("escalated");
  const [category, setCategory] = useState("");
  const [editingCell, setEditingCell] = useState<{ ruleId: string; level: Level } | null>(null);
  const [reassigning, setReassigning] = useState<EscRow | null>(null);
  const [resolving, setResolving] = useState<EscRow | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const slaFor = (row: EscRow) => matrix.find((m) => m.category === row.category)?.levels.find((l) => l.level === row.level)?.slaHours ?? 48;
  const timer = (row: EscRow): { label: string; tone: StatusTone; remaining: number } => {
    if (row.status === "resolved") return { label: "Closed", tone: "neutral", remaining: Infinity };
    const remaining = hoursBetween(DEMO_NOW, addHoursIso(row.escalatedAt, slaFor(row)));
    if (remaining < 0) return { label: `Breached ${formatHours(-remaining)} ago`, tone: "rose", remaining };
    return { label: `${formatHours(remaining)} left`, tone: remaining < 12 ? "amber" : "jade", remaining };
  };

  const visible = rows.filter((r) => (!status || r.status === status) && (!category || r.category === category));
  const open = rows.filter((r) => r.status === "escalated");
  const breaching = open.filter((r) => timer(r).remaining < 0).length;
  const detail = rows.find((r) => r.id === openId) ?? null;
  const cellRule = editingCell ? matrix.find((m) => m.id === editingCell.ruleId) : undefined;
  const cellLevel = cellRule?.levels.find((l) => l.level === editingCell?.level);

  const eligibleOwners = useMemo(() => staff.filter((s) => s.kind !== "university-admin" || s.id === "st-suresh"), []);

  const columns: DataTableColumn<EscRow>[] = [
    {
      key: "subject",
      header: "Ticket",
      sortable: true,
      render: (r) => (
        <span className="block max-w-72 min-w-52">
          <span className="block font-mono text-[11.5px] text-ink-3">{r.id}</span>
          <span className="block truncate font-semibold text-ink">{r.subject}</span>
        </span>
      ),
    },
    { key: "student", header: "Learner", sortable: true, sortValue: (r) => studentName(r.studentId), render: (r) => studentName(r.studentId) },
    { key: "category", header: "Category", sortable: true },
    { key: "priority", header: "Priority", sortable: true, render: (r) => <StatusPill status={r.priority} tone={r.priority === "urgent" || r.priority === "high" ? "rose" : r.priority === "medium" ? "amber" : "neutral"} /> },
    {
      key: "owner",
      header: "Escalated to",
      sortable: true,
      sortValue: (r) => staffName(r.ownerId),
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="truncate">{staffName(r.ownerId)}</span>
          <Badge tone="dark">L{r.level}</Badge>
        </span>
      ),
    },
    { key: "escalatedAt", header: "Escalated", sortable: true, render: (r) => formatDateTime(r.escalatedAt) },
    {
      key: "timer",
      header: "SLA timer",
      sortable: true,
      sortValue: (r) => timer(r).remaining,
      render: (r) => {
        const t = timer(r);
        return (
          <StatusPill status={t.label} tone={t.tone}>
            <Timer className="mr-0.5 inline size-3 align-[-2px]" />
            {t.label}
          </StatusPill>
        );
      },
    },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
    {
      key: "actions",
      header: "Actions",
      render: (r) =>
        r.status === "resolved" ? (
          <span className="text-ink-3">None</span>
        ) : (
          <span className="flex gap-1.5">
            <Button size="xs" variant="outline" onClick={() => setReassigning(r)}>
              Reassign
            </Button>
            <Button size="xs" onClick={() => setResolving(r)}>
              Resolve
            </Button>
          </span>
        ),
    },
  ];

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Governance"
        title="Support escalation"
        sub="Manage support escalation: the matrix of who owns each ticket category at each level and how long they have, plus every escalated ticket with its breach timer."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("support-escalations.csv")}>
              <Download className="size-4" />
              Export escalations
            </Button>
            <Button
              onClick={() => {
                const owners = Array.from(new Set(open.filter((r) => timer(r).remaining < 0).map((r) => staffName(r.ownerId))));
                toast({
                  title: owners.length ? `Breach reminder sent to ${owners.length} ${owners.length === 1 ? "owner" : "owners"}` : "No tickets are breaching SLA",
                  body: owners.join(", ") || undefined,
                  tone: owners.length ? "warning" : "success",
                });
              }}
            >
              <Siren className="size-4" />
              Remind breaching owners
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Open escalations" value={open.length} icon={<Siren />} />
        <KpiTile label="Breaching SLA now" value={breaching} tone="rose" goodWhen="down" icon={<Timer />} />
        <KpiTile label="Resolved within SLA, 30 days" value="74%" delta="+6 pts" trend="up" tone="jade" icon={<CheckCircle2 />} />
        <KpiTile label="Median time to resolve" value="26h" delta="-4h" trend="down" goodWhen="down" tone="info" />
      </KpiRow>

      <section className="space-y-4">
        <BlockHeading title="Escalated tickets" sub="Timers count from escalation against the owner's SLA for that level. Reassign to move a ticket up a level." />
        <DataTable
          caption="Escalated tickets"
          rows={visible}
          columns={columns}
          getRowId={(r) => r.id}
          initialSort={{ key: "timer", dir: "asc" }}
          onRowClick={(r) => setOpenId(r.id)}
          rowLabel={(r) => `Open ${r.id}`}
          filters={
            <FilterBar
              active={status !== "escalated" || Boolean(category)}
              onClear={() => {
                setStatus("escalated");
                setCategory("");
              }}
            >
              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                allLabel="All"
                options={[
                  { value: "escalated", label: "Open" },
                  { value: "resolved", label: "Resolved" },
                ]}
              />
              <FilterSelect label="Category" value={category} onChange={setCategory} allLabel="All" options={matrix.map((m) => m.category)} />
            </FilterBar>
          }
        />
      </section>

      <section className="space-y-4">
        <BlockHeading title="Escalation matrix" sub="Category by level. Select a cell to change the owner or the SLA." />
        <Matrix
          caption="Escalation matrix"
          corner="Category and trigger"
          rows={matrix.map((m) => ({ id: m.id, label: m.category, sub: m.trigger }))}
          cols={[
            { id: "1", label: "Level 1", sub: "First owner" },
            { id: "2", label: "Level 2", sub: "Escalation" },
            { id: "3", label: "Level 3", sub: "Final" },
          ]}
          cell={(ruleId, col) => {
            const rule = matrix.find((m) => m.id === ruleId)!;
            const lvl = rule.levels.find((l) => l.level === Number(col))!;
            return (
              <button
                type="button"
                onClick={() => setEditingCell({ ruleId, level: lvl.level })}
                className="w-40 rounded-[12px] border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-ink hover:bg-cta-soft"
                aria-label={`Edit ${rule.category} level ${lvl.level}`}
              >
                <span className="block truncate text-[12.5px] font-semibold text-ink">{staffName(lvl.ownerId)}</span>
                <span className="block truncate text-[11.5px] text-ink-3">{lvl.team}</span>
                <span className="mt-1 inline-flex rounded-full bg-surface-inv px-2 py-px font-mono text-[11px] font-bold text-cta">{lvl.slaHours}h SLA</span>
              </button>
            );
          }}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Escalation trend" sub="Weekly escalations and how many were resolved within SLA." />
          <div className="border-t border-line p-5">
            <LineChart
              labels={TREND_LABELS}
              series={[
                { label: "Escalated", values: TREND.escalated, tone: "rose" },
                { label: "Resolved within SLA", values: TREND.withinSla, tone: "jade" },
              ]}
              min={0}
              height={180}
            />
          </div>
        </Card>
        <Card className="min-w-0">
          <CardHeader title="By category, last 30 days" />
          <div className="border-t border-line p-5">
            <StackedBar
              rows={BY_CATEGORY.map((c) => ({
                label: c.label,
                parts: [
                  { label: "Within SLA", value: c.within, tone: "jade" },
                  { label: "Breached", value: c.breached, tone: "rose" },
                ],
              }))}
            />
          </div>
        </Card>
      </div>

      {/* ticket detail */}
      <Drawer
        open={detail !== null}
        onClose={() => setOpenId(null)}
        width="w-full max-w-lg"
        title={detail ? `${detail.id} · ${detail.subject}` : "Ticket"}
        sub={detail ? `${studentName(detail.studentId)} · ${detail.category}` : undefined}
        footer={
          detail && detail.status === "escalated" ? (
            <>
              <Button variant="outline" onClick={() => setReassigning(detail)}>
                <UserRoundCog className="size-4" />
                Reassign
              </Button>
              <Button onClick={() => setResolving(detail)}>
                <CheckCircle2 className="size-4" />
                Resolve
              </Button>
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap gap-2">
              <StatusPill status={detail.status} />
              <StatusPill status={timer(detail).label} tone={timer(detail).tone} />
              <Badge tone="dark">
                Level {detail.level} · {staffName(detail.ownerId)}
              </Badge>
            </div>
            <p className="rounded-[14px] border border-line bg-surface-2 p-4 text-[13.5px] leading-relaxed text-ink-2">{detail.body}</p>
            <div>
              <p className="mb-3 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">History</p>
              <Timeline
                dense
                items={[...detail.history].reverse().map((h) => ({
                  id: h.id,
                  title: h.action,
                  meta: `${formatDateTime(h.at.length === 10 ? `${h.at}T17:30` : h.at)} · ${h.actor}`,
                  body: h.note,
                  tone: h.action.startsWith("Escalated") || h.action.startsWith("Reassigned") ? "rose" : h.action.startsWith("Resolved") ? "jade" : "neutral",
                }))}
              />
            </div>
          </div>
        ) : null}
      </Drawer>

      {/* matrix cell */}
      <FormDrawer
        open={editingCell !== null}
        onClose={() => setEditingCell(null)}
        title={cellRule ? `${cellRule.category} · level ${editingCell?.level}` : "Escalation level"}
        sub={cellRule?.trigger}
        submitLabel="Save level"
        onSubmit={(data) => {
          if (!cellRule || !editingCell) return;
          const ownerId = String(data.get("owner"));
          const slaHours = Math.max(1, Number(data.get("sla")) || 24);
          const team = String(data.get("team") ?? "").trim() || cellLevel?.team || "Support";
          setMatrix((list) =>
            list.map((m) => (m.id === cellRule.id ? { ...m, levels: m.levels.map((l) => (l.level === editingCell.level ? { ...l, ownerId, slaHours, team } : l)) } : m)),
          );
          toast({ title: `${cellRule.category} level ${editingCell.level} updated`, body: `${staffName(ownerId)} · ${slaHours}h SLA` });
          setEditingCell(null);
        }}
      >
        {cellLevel ? (
          <div key={`${cellRule?.id}-${cellLevel.level}`} className="space-y-4">
            <Field label="Team">
              <Input name="team" defaultValue={cellLevel.team} />
            </Field>
            <Field label="Owner">
              <Select name="owner" defaultValue={cellLevel.ownerId}>
                {eligibleOwners.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="SLA (hours)">
              <Input name="sla" type="number" min={1} max={240} defaultValue={cellLevel.slaHours} className="font-mono" />
            </Field>
          </div>
        ) : null}
      </FormDrawer>

      {/* reassign */}
      <FormDrawer
        open={reassigning !== null}
        onClose={() => setReassigning(null)}
        title={reassigning ? `Reassign ${reassigning.id}` : "Reassign"}
        sub={reassigning?.subject}
        submitLabel="Reassign"
        footerNote="The new owner is notified by email and in-app."
        onSubmit={(data) => {
          if (!reassigning) return;
          const ownerId = String(data.get("owner"));
          const level = Number(data.get("level")) as Level;
          const note = String(data.get("note") ?? "").trim();
          setRows((list) =>
            list.map((r) =>
              r.id === reassigning.id
                ? {
                    ...r,
                    ownerId,
                    level,
                    escalatedAt: level !== r.level ? DEMO_NOW : r.escalatedAt,
                    history: [...r.history, { id: `h-re-${r.history.length + 1}`, at: DEMO_NOW, actor: "Neha Kapoor", action: `Reassigned to ${staffName(ownerId)} (level ${level})`, note: note || undefined }],
                  }
                : r,
            ),
          );
          toast({ title: `${reassigning.id} reassigned`, body: `${staffName(ownerId)} · level ${level}` });
          setReassigning(null);
        }}
      >
        {reassigning ? (
          <div key={reassigning.id} className="space-y-4">
            <Field label="Level">
              <Select name="level" defaultValue={String(reassigning.level)}>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3 (timer restarts)</option>
              </Select>
            </Field>
            <Field label="New owner">
              <Select name="owner" defaultValue={matrix.find((m) => m.category === reassigning.category)?.levels[2].ownerId ?? reassigning.ownerId}>
                {eligibleOwners.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.title}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Note for the new owner">
              <Textarea name="note" rows={3} placeholder="What has been tried and what is needed" />
            </Field>
          </div>
        ) : null}
      </FormDrawer>

      {/* resolve */}
      <FormDrawer
        open={resolving !== null}
        onClose={() => setResolving(null)}
        title={resolving ? `Resolve ${resolving.id}` : "Resolve"}
        sub={resolving?.subject}
        submitLabel="Resolve ticket"
        footerNote="The learner is notified with the resolution note."
        onSubmit={(data) => {
          if (!resolving) return;
          const note = String(data.get("note") ?? "").trim();
          setRows((list) =>
            list.map((r) =>
              r.id === resolving.id
                ? { ...r, status: "resolved", history: [...r.history, { id: `h-res-${r.history.length + 1}`, at: DEMO_NOW, actor: "Neha Kapoor", action: "Resolved", note }] }
                : r,
            ),
          );
          toast({ title: `${resolving.id} resolved`, body: note });
          setResolving(null);
        }}
      >
        {resolving ? (
          <Field label="Resolution note" key={resolving.id}>
            <Textarea name="note" rows={4} required placeholder="e.g. Programme Lead approved moving PM to Mar 2027; learner moved to the reattempt cohort." />
          </Field>
        ) : null}
      </FormDrawer>
    </AdminConfigFrame>
  );
}
