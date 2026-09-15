"use client";

import { Suspense, useCallback, useMemo, useRef, useState } from "react";
import { AlarmClock, Download, Inbox, MessageSquareReply, Plus, Tags, TimerReset, UserCheck } from "lucide-react";
import {
  TICKET_CATEGORIES,
  staffName,
  studentById,
  students as allStudents,
  tickets as seedTickets,
  universityById,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { PageHeader } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import {
  CHANNEL_LABELS,
  PRIORITY_LABELS,
  PRIORITY_ORDER,
  PRIORITY_TONES,
  QUEUES,
  STATUS_LABELS,
  SUPPORT_ASSIGNEES,
  formatHours,
  formatMins,
  inQueue,
  learnerLine,
  median,
  slaState,
  stampAfter,
  type QueueId,
} from "./support-helpers";
import { TicketDrawer, type TicketActions } from "./ticket-drawer";
import { TurnaroundCard } from "./turnaround-card";
import { SupportHistoryCard } from "./support-history-card";
import { TicketDeepLink } from "./ticket-deep-link";

const SLA_BY_PRIORITY: Record<TicketPriority, number> = { urgent: 4, high: 24, medium: 48, low: 72 };

export function SupportPage() {
  const { persona, can } = useRole();
  const canAct = can("programme:support");
  const lockedReason = "Your role can view tickets but cannot work them.";

  const [tickets, setTickets] = useState<Ticket[]>(seedTickets);
  const [queue, setQueue] = useState<QueueId>("all");
  const [status, setStatus] = useState("unresolved");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [assignee, setAssignee] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [bulkAssign, setBulkAssign] = useState<string[] | null>(null);
  const [bulkCategorise, setBulkCategorise] = useState<string[] | null>(null);
  const [logOpen, setLogOpen] = useState(false);
  const clock = useRef(0);

  const update = useCallback<TicketActions["update"]>(
    (id, fn, entry) => {
      const at = stampAfter(clock.current++);
      const actor = persona.name;
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;
          const next = fn(t, at);
          return entry
            ? {
                ...next,
                updated: at,
                history: [...next.history, { id: `h-live-${next.history.length + 1}`, at, actor, action: entry.action, note: entry.note }],
              }
            : { ...next, updated: at };
        }),
      );
      return at;
    },
    [persona.name],
  );
  const actions = useMemo<TicketActions>(() => ({ update }), [update]);
  const openTicket = useCallback((id: string) => setOpenId(id), []);

  const unresolved = tickets.filter((t) => t.status !== "resolved");
  const breaching = unresolved.filter((t) => slaState(t).breached);
  const medFirst = median(tickets.filter((t) => t.firstResponseMins != null).map((t) => t.firstResponseMins!));
  const resolvedList = tickets.filter((t) => t.resolutionHours != null);
  const medResolution = median(resolvedList.map((t) => t.resolutionHours!));
  const withinSla = resolvedList.length
    ? Math.round((resolvedList.filter((t) => t.resolutionHours! <= t.slaHours).length / resolvedList.length) * 100)
    : 0;
  const countBy = (s: TicketStatus) => unresolved.filter((t) => t.status === s).length;

  const queueCategories = QUEUES.find((q) => q.id === queue)?.categories ?? TICKET_CATEGORIES;

  const visible = tickets.filter(
    (t) =>
      inQueue(t, queue) &&
      (status === "" || (status === "unresolved" ? t.status !== "resolved" : t.status === status)) &&
      (!priority || t.priority === priority) &&
      (!category || t.category === category) &&
      (!assignee || (assignee === "none" ? t.assigneeId === null : t.assigneeId === assignee)),
  );

  const openTicketRecord = openId ? (tickets.find((t) => t.id === openId) ?? null) : null;

  const columns: DataTableColumn<Ticket>[] = [
    {
      key: "subject",
      header: "Ticket",
      sortable: true,
      className: "max-w-[22rem]",
      render: (t) => (
        <span className="block min-w-0">
          <span className="font-mono text-[11.5px] text-ink-3">{t.id}</span>
          <span className="block truncate font-semibold text-ink">{t.subject}</span>
        </span>
      ),
    },
    {
      key: "student",
      header: "Learner",
      sortable: true,
      sortValue: (t) => studentById(t.studentId)?.name,
      render: (t) => {
        const s = studentById(t.studentId);
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={s?.name ?? "Learner"} size="xs" />
            <span className="min-w-0">
              <span className="block font-medium text-ink">{s?.name}</span>
              <span className="block text-[12px] text-ink-3">
                {learnerLine(t.studentId)}
                {s?.universityId ? ` · ${universityById(s.universityId)?.shortName}` : ""}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: "category", header: "Category", sortable: true, render: (t) => <Badge>{t.category}</Badge> },
    {
      key: "priority",
      header: "Priority",
      sortable: true,
      sortValue: (t) => PRIORITY_ORDER[t.priority],
      render: (t) => (
        <StatusPill status={t.priority} tone={PRIORITY_TONES[t.priority]} size="sm">
          {PRIORITY_LABELS[t.priority]}
        </StatusPill>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (t) => (
        <StatusPill status={t.status} size="sm">
          {STATUS_LABELS[t.status]}
        </StatusPill>
      ),
    },
    {
      key: "assignee",
      header: "Assignee",
      sortable: true,
      sortValue: (t) => (t.assigneeId ? staffName(t.assigneeId) : ""),
      render: (t) =>
        t.assigneeId ? (
          <span className="flex items-center gap-2">
            <Avatar name={staffName(t.assigneeId)} size="xs" />
            {staffName(t.assigneeId)}
          </span>
        ) : (
          <StatusPill status="unassigned" tone="rose" size="sm">
            Unassigned
          </StatusPill>
        ),
    },
    {
      key: "sla",
      header: "Turnaround",
      sortable: true,
      sortValue: (t) => slaState(t).hoursLeft,
      render: (t) => {
        const sla = slaState(t);
        return (
          <span className="block">
            <StatusPill status="sla" tone={sla.tone} size="sm">
              {sla.label}
            </StatusPill>
            <span className="mt-0.5 block text-[11.5px] text-ink-3">
              {t.resolutionHours != null
                ? `Resolved in ${formatHours(t.resolutionHours)}`
                : t.firstResponseMins != null
                  ? `First response ${formatMins(t.firstResponseMins)}`
                  : "Awaiting first response"}
            </span>
          </span>
        );
      },
    },
    { key: "channel", header: "Channel", render: (t) => <span className="text-ink-2">{CHANNEL_LABELS[t.channel]}</span> },
  ];

  const filtersActive = status !== "unresolved" || Boolean(priority || category || assignee);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <Suspense fallback={null}>
        <TicketDeepLink onOpen={openTicket} />
      </Suspense>

      <PageHeader
        eyebrow="Student support"
        title="Support tickets"
        sub="View student support tickets, categorise and assign them, resolve queries or escalate them, and track turnaround time."
        badge={canAct ? undefined : <ViewOnlyChip reason={lockedReason} />}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast({ title: "Report queued: support-tickets.csv", body: `${tickets.length} tickets with turnaround times`, tone: "info" })}
            >
              <Download className="size-4" /> Export
            </Button>
            <span title={canAct ? undefined : lockedReason} className="inline-flex">
              <Button disabled={!canAct} onClick={() => setLogOpen(true)}>
                <Plus className="size-4" /> Log a ticket
              </Button>
            </span>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Open tickets"
          value={unresolved.length}
          icon={<Inbox />}
          sub={`${countBy("open")} open · ${countBy("in-progress")} in progress · ${countBy("escalated")} escalated · ${countBy("waiting-on-student")} waiting`}
        />
        <KpiTile
          label="Breaching SLA"
          value={breaching.length}
          tone="rose"
          icon={<AlarmClock />}
          sub="Past the turnaround target for their priority"
        />
        <KpiTile
          label="Median first response"
          value={medFirst != null ? formatMins(medFirst) : "None"}
          tone="info"
          icon={<MessageSquareReply />}
          delta="Target under 4h"
        />
        <KpiTile
          label="Median resolution"
          value={medResolution != null ? formatHours(medResolution) : "None"}
          tone="jade"
          icon={<TimerReset />}
          sub={`${withinSla}% resolved within SLA`}
        />
      </KpiRow>

      <section className="space-y-3">
        <Tabs
          value={queue}
          onChange={(id) => {
            setQueue(id as QueueId);
            setCategory("");
          }}
          items={QUEUES.map((q) => ({
            id: q.id,
            label: q.label,
            count: unresolved.filter((t) => inQueue(t, q.id)).length,
          }))}
        />
        <DataTable
          caption="Support tickets"
          rows={visible}
          columns={columns}
          getRowId={(t) => t.id}
          initialSort={{ key: "sla", dir: "asc" }}
          onRowClick={(t) => setOpenId(t.id)}
          rowLabel={(t) => `Open ${t.id}, ${t.subject}`}
          search={{
            placeholder: "Search ticket, subject or learner",
            match: (t, q) =>
              t.id.toLowerCase().includes(q) ||
              t.subject.toLowerCase().includes(q) ||
              (studentById(t.studentId)?.name.toLowerCase().includes(q) ?? false),
          }}
          filters={
            <FilterBar
              active={filtersActive}
              onClear={() => {
                setStatus("unresolved");
                setPriority("");
                setCategory("");
                setAssignee("");
              }}
            >
              <FilterSelect
                label="Status"
                value={status}
                onChange={setStatus}
                allLabel="All statuses"
                options={[
                  { value: "unresolved", label: "Unresolved" },
                  ...(Object.keys(STATUS_LABELS) as TicketStatus[]).map((s) => ({ value: s, label: STATUS_LABELS[s] })),
                ]}
              />
              <FilterSelect
                label="Priority"
                value={priority}
                onChange={setPriority}
                allLabel="Any"
                options={(["urgent", "high", "medium", "low"] as TicketPriority[]).map((p) => ({ value: p, label: PRIORITY_LABELS[p] }))}
              />
              {queueCategories.length > 1 ? (
                <FilterSelect label="Category" value={category} onChange={setCategory} allLabel="All" options={queueCategories} />
              ) : null}
              <FilterSelect
                label="Assignee"
                value={assignee}
                onChange={setAssignee}
                allLabel="Anyone"
                options={[{ value: "none", label: "Unassigned" }, ...SUPPORT_ASSIGNEES.map((a) => ({ value: a.id, label: a.name }))]}
              />
            </FilterBar>
          }
          selectable={canAct}
          bulkActions={(ids, clear) => (
            <>
              <Button
                size="sm"
                variant="inverse"
                onClick={() => {
                  setBulkCategorise(ids);
                  clear();
                }}
              >
                <Tags className="size-3.5" /> Categorise
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setBulkAssign(ids);
                  clear();
                }}
              >
                <UserCheck className="size-3.5" /> Assign
              </Button>
            </>
          )}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <TurnaroundCard tickets={tickets} />
        <SupportHistoryCard tickets={tickets} onOpenTicket={openTicket} />
      </div>

      <TicketDrawer
        ticket={openTicketRecord}
        allTickets={tickets}
        onClose={() => setOpenId(null)}
        onOpenTicket={openTicket}
        actions={actions}
        canAct={canAct}
      />

      <FormDrawer
        open={bulkAssign !== null}
        onClose={() => setBulkAssign(null)}
        title="Assign tickets"
        sub={`${bulkAssign?.length ?? 0} selected`}
        submitLabel="Assign"
        disabled={!canAct}
        disabledReason={lockedReason}
        onSubmit={(data) => {
          const to = String(data.get("assignee"));
          const ids = bulkAssign ?? [];
          ids.forEach((id) => update(id, (t) => ({ ...t, assigneeId: to }), { action: `Assigned to ${staffName(to)}` }));
          toast({ title: `${ids.length} ${ids.length === 1 ? "ticket" : "tickets"} assigned to ${staffName(to)}`, body: ids.join(", ") });
          setBulkAssign(null);
        }}
      >
        <Field label="Assign to">
          <Select name="assignee" defaultValue={SUPPORT_ASSIGNEES[0].id}>
            {SUPPORT_ASSIGNEES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} · {a.title}
              </option>
            ))}
          </Select>
        </Field>
        <p className="text-[12.5px] text-ink-3">Each assignee is notified and the change is added to the ticket history.</p>
      </FormDrawer>

      <FormDrawer
        open={bulkCategorise !== null}
        onClose={() => setBulkCategorise(null)}
        title="Categorise tickets"
        sub={`${bulkCategorise?.length ?? 0} selected`}
        submitLabel="Save category"
        disabled={!canAct}
        disabledReason={lockedReason}
        onSubmit={(data) => {
          const to = String(data.get("category")) as TicketCategory;
          const ids = bulkCategorise ?? [];
          ids.forEach((id) => update(id, (t) => ({ ...t, category: to }), { action: `Categorised as ${to}` }));
          toast({ title: `${ids.length} ${ids.length === 1 ? "ticket" : "tickets"} categorised as ${to}`, body: ids.join(", ") });
          setBulkCategorise(null);
        }}
      >
        <Field label="Category">
          <Select name="category" defaultValue="Registration">
            {TICKET_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <p className="text-[12.5px] text-ink-3">The category decides the queue and the escalation route.</p>
      </FormDrawer>

      <FormDrawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log a ticket"
        sub="For queries that arrive by phone, email or at the front desk."
        submitLabel="Log ticket"
        disabled={!canAct}
        disabledReason={lockedReason}
        footerNote="The learner gets a ticket number by email."
        onSubmit={(data) => {
          const studentId = String(data.get("student"));
          const subject = String(data.get("subject") ?? "").trim();
          const body = String(data.get("body") ?? "").trim();
          const cat = String(data.get("category")) as TicketCategory;
          const pri = String(data.get("priority")) as TicketPriority;
          const channel = String(data.get("channel")) as Ticket["channel"];
          const to = String(data.get("assignee")) || null;
          const at = stampAfter(clock.current++);
          const id = `TK-${2041 + tickets.length}`;
          const learner = studentById(studentId);
          const history: Ticket["history"] = [
            { id: "h1", at, actor: learner?.name ?? "Learner", action: "Raised ticket", note: `Via ${CHANNEL_LABELS[channel].toLowerCase()}, logged by ${persona.name}` },
          ];
          if (to) history.push({ id: "h2", at, actor: persona.name, action: `Categorised as ${cat} and assigned to ${staffName(to)}` });
          const ticket: Ticket = {
            id,
            subject,
            body,
            category: cat,
            priority: pri,
            status: "open",
            studentId,
            universityId: learner?.universityId,
            assigneeId: to,
            channel,
            created: at,
            updated: at,
            firstResponseMins: null,
            resolutionHours: null,
            slaHours: SLA_BY_PRIORITY[pri],
            history,
          };
          setTickets((prev) => [ticket, ...prev]);
          setLogOpen(false);
          setOpenId(id);
          toast({ title: `${id} logged`, body: `${learner?.name} · ${subject}` });
        }}
      >
        <Field label="Learner">
          <Select name="student" defaultValue="s-anaya">
            {[...allStudents]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.type === "graduate" ? "Graduate" : "Undergraduate"}
                </option>
              ))}
          </Select>
        </Field>
        <Field label="Subject">
          <Input name="subject" required placeholder="e.g. Exemption fee receipt not accepted by ACCA" />
        </Field>
        <Field label="Details">
          <Textarea name="body" rows={3} required placeholder="What the learner asked, in their words." />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select name="category" defaultValue="Registration">
              {TICKET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Priority">
            <Select name="priority" defaultValue="medium">
              {(["urgent", "high", "medium", "low"] as TicketPriority[]).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]} · {SLA_BY_PRIORITY[p]}h SLA
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Channel">
            <Select name="channel" defaultValue="phone">
              {(Object.keys(CHANNEL_LABELS) as Ticket["channel"][]).map((c) => (
                <option key={c} value={c}>
                  {CHANNEL_LABELS[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assign to">
            <Select name="assignee" defaultValue={persona.staffId && SUPPORT_ASSIGNEES.some((a) => a.id === persona.staffId) ? persona.staffId : "st-imran"}>
              <option value="">Leave unassigned</option>
              {SUPPORT_ASSIGNEES.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormDrawer>
    </div>
  );
}
