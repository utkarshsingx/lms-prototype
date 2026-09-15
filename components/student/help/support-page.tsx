"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  LifeBuoy,
  MessageSquareReply,
  Paperclip,
  Plus,
  RotateCcw,
  Timer,
} from "lucide-react";
import {
  SLA_HOURS,
  TICKET_CATEGORIES,
  TICKET_STATUS_LABELS,
  faqs,
  staffById,
  ticketsForStudent,
  type Student,
  type Ticket,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { DEMO_NOW, addHours, dayTimeLabel, hoursBetween, useStudentRecord } from "./shared";

type TicketRow = Ticket & { attachments?: string[] };
type TabId = "open" | "resolved" | "all";

const CATEGORY_HINT: Record<TicketCategory, string> = {
  Registration: "ACCA student ID, registration documents, annual subscription",
  Exemption: "Qualification documents, estimated or ACCA-approved exemptions, exemption fees",
  "Exam booking": "Entry windows, CBE centres, on-demand dates, results",
  Payments: "Instalments, receipts, late fees, refunds",
  Technical: "Sign-in, live classes, recordings, proctored tests",
  Academic: "A subject question support cannot answer goes to your faculty",
  Career: "Resume reviews, interviews, internships and offers",
};

const STATUS_TONE: Record<Ticket["status"], StatusTone> = {
  open: "info",
  "in-progress": "info",
  "waiting-on-student": "amber",
  escalated: "rose",
  resolved: "jade",
};

function slaOf(t: TicketRow): { label: string; tone: StatusTone; pct: number } {
  if (t.status === "resolved" && t.resolutionHours !== null) {
    const within = t.resolutionHours <= t.slaHours;
    return {
      label: `Resolved in ${t.resolutionHours}h · SLA ${t.slaHours}h`,
      tone: within ? "jade" : "amber",
      pct: 100,
    };
  }
  const due = addHours(t.created, t.slaHours);
  const elapsed = hoursBetween(t.created, DEMO_NOW);
  if (elapsed > t.slaHours) return { label: `Past the ${t.slaHours}h SLA · due was ${dayTimeLabel(due)}`, tone: "rose", pct: 100 };
  return {
    label: `Resolution due by ${dayTimeLabel(due)} · ${t.slaHours}h SLA`,
    tone: elapsed / t.slaHours > 0.75 ? "amber" : "jade",
    pct: Math.max(4, Math.round((elapsed / t.slaHours) * 100)),
  };
}

export function SupportPage() {
  const s = useStudentRecord();
  return <SupportView key={s.id} s={s} />;
}

function SupportView({ s }: { s: Student }) {
  const [rows, setRows] = useState<TicketRow[]>(() => ticketsForStudent(s.id));
  const [tab, setTab] = useState<TabId>("all");
  const [category, setCategory] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(() => ticketsForStudent(s.id)[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [raiseKey, setRaiseKey] = useState(0);
  const [raiseCategory, setRaiseCategory] = useState<TicketCategory>("Exam booking");
  const [files, setFiles] = useState<string[]>([]);
  const [faqOpen, setFaqOpen] = useState<string | null>(null);
  const [raisedCount, setRaisedCount] = useState(0);

  const counts = {
    open: rows.filter((t) => t.status !== "resolved").length,
    resolved: rows.filter((t) => t.status === "resolved").length,
    all: rows.length,
  };
  const visible = rows.filter(
    (t) =>
      (tab === "all" || (tab === "open" ? t.status !== "resolved" : t.status === "resolved")) &&
      (!category || t.category === category),
  );
  const selected = rows.find((t) => t.id === selectedId) ?? visible[0];
  const responded = rows.filter((t) => t.firstResponseMins !== null);
  const avgFirst = responded.length
    ? Math.round(responded.reduce((a, t) => a + (t.firstResponseMins ?? 0), 0) / responded.length)
    : null;
  const myFaqs = useMemo(
    () => faqs.filter((f) => f.status === "published" && (f.audience === "all" || f.audience === s.type)),
    [s.type],
  );
  const raiseFaqs = myFaqs.filter((f) => f.category === raiseCategory).slice(0, 2);

  function update(id: string, patch: Partial<TicketRow>, action: string, note?: string) {
    setRows((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              ...patch,
              updated: DEMO_NOW,
              history: [...t.history, { id: `h${t.history.length + 10}`, at: DEMO_NOW, actor: s.name, action, note }],
            }
          : t,
      ),
    );
  }

  function sendReply() {
    if (!selected || !reply.trim()) return;
    const body = reply.trim();
    update(
      selected.id,
      selected.status === "waiting-on-student" ? { status: "in-progress" } : {},
      "You replied",
      body,
    );
    setReply("");
    toast({ title: `Reply added to ${selected.id}`, body: staffById(selected.assigneeId ?? undefined)?.name ? `${staffById(selected.assigneeId ?? undefined)?.name} is notified` : "The support team is notified" });
  }

  function raise(data: FormData) {
    const urgent = String(data.get("urgency")) === "high";
    const priority: TicketPriority = urgent ? "high" : "medium";
    // Sample tickets run TK-2041 to TK-2078; new ones continue the sequence.
    const id = `TK-${2079 + raisedCount}`;
    setRaisedCount((n) => n + 1);
    const cat = raiseCategory;
    const ticket: TicketRow = {
      id,
      subject: String(data.get("subject") ?? "").trim(),
      body: String(data.get("details") ?? "").trim(),
      category: cat,
      priority,
      status: "open",
      studentId: s.id,
      universityId: s.universityId,
      assigneeId: null,
      channel: "portal",
      created: DEMO_NOW,
      updated: DEMO_NOW,
      firstResponseMins: null,
      resolutionHours: null,
      slaHours: SLA_HOURS[priority],
      attachments: files,
      history: [
        { id: "h1", at: DEMO_NOW, actor: s.name, action: "Raised ticket", note: files.length ? `${files.length} attachment${files.length > 1 ? "s" : ""}` : undefined },
        { id: "h2", at: DEMO_NOW, actor: "System", action: `Categorised as ${cat} and placed in the ${cat === "Payments" ? "Finance Operations" : cat === "Career" ? "placement team" : "Student Support"} queue` },
      ],
    };
    setRows((list) => [ticket, ...list]);
    setTab("all");
    setCategory("");
    setSelectedId(id);
    toast({ title: `Ticket ${id} raised`, body: `Open · resolution within ${SLA_HOURS[priority]} hours` });
    setRaiseOpen(false);
  }

  const timeline: TimelineItem[] = selected
    ? [...selected.history].reverse().map((h) => ({
        id: h.id,
        title: h.action,
        meta: `${dayTimeLabel(h.at.length === 10 ? `${h.at}T17:30` : h.at)} · ${h.actor}`,
        body: h.note,
        tone: /resolved/i.test(h.action)
          ? "jade"
          : /escalat/i.test(h.action)
            ? "rose"
            : h.actor === s.name
              ? "cta"
              : /asked/i.test(h.action)
                ? "amber"
                : "neutral",
      }))
    : [];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Help"
        title="Support tickets"
        sub="Raise a ticket for registration, exemptions, exam bookings, payments, technical problems, academic queries or careers. Every ticket has a named owner and a turnaround time."
        actions={
          <Button
            onClick={() => {
              setRaiseCategory("Exam booking");
              setFiles([]);
              setRaiseKey((k) => k + 1);
              setRaiseOpen(true);
            }}
          >
            <Plus className="size-4" /> Raise a ticket
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Open tickets" value={counts.open} icon={<LifeBuoy />} sub={counts.open ? "The team is working on them" : "Nothing outstanding"} />
        <KpiTile label="Resolved" value={counts.resolved} tone="jade" icon={<CheckCircle2 />} sub="Last 30 days" />
        <KpiTile label="First response" value={avgFirst !== null ? `${avgFirst} min` : "Not yet"} tone="info" icon={<Clock3 />} sub="Average on your tickets" />
        <KpiTile label="Resolution SLA" value="4 to 72h" tone="neutral" icon={<Timer />} sub="Urgent 4h · high 24h · normal 48h" />
      </KpiRow>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:items-start">
        <section className="min-w-0 space-y-3 xl:col-start-1 xl:row-start-1">
          <Tabs
            value={tab}
            onChange={(id) => setTab(id as TabId)}
            items={[
              { id: "all", label: "All", count: counts.all },
              { id: "open", label: "Open", count: counts.open },
              { id: "resolved", label: "Resolved", count: counts.resolved },
            ]}
          />
          <FilterSelect label="Category" allLabel="All categories" value={category} onChange={setCategory} options={TICKET_CATEGORIES} />
          {visible.length === 0 ? (
            <EmptyState icon={<LifeBuoy />} title="No tickets here" sub="Nothing matches this view." />
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-[var(--line)]">
                {visible.map((t) => {
                  const sla = slaOf(t);
                  const active = selected?.id === t.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedId(t.id)}
                        className={cn(
                          "relative block w-full px-4 py-3.5 text-left transition-colors hover:bg-cta-soft",
                          active && "bg-cta-soft",
                        )}
                      >
                        {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-cta" /> : null}
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[12px] font-semibold text-ink-2">{t.id}</span>
                          <StatusPill status={t.status} tone={STATUS_TONE[t.status]} size="sm">
                            {TICKET_STATUS_LABELS[t.status]}
                          </StatusPill>
                        </div>
                        <p className="mt-1.5 text-[14px] leading-snug font-bold text-ink">{t.subject}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
                          <span>{t.category}</span>
                          <span>·</span>
                          <span className="tnum">Raised {dayTimeLabel(t.created)}</span>
                        </p>
                        <p className={cn("mt-1.5 text-[12px] font-semibold", sla.tone === "rose" ? "text-rose" : sla.tone === "amber" ? "text-amber" : "text-jade")}>
                          {sla.label}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}

        </section>

        {selected ? (
          <Card className="min-w-0 xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <div className="border-b border-line px-5 pt-4.5 pb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12.5px] font-semibold text-ink-2">{selected.id}</span>
                <StatusPill status={selected.status} tone={STATUS_TONE[selected.status]}>
                  {TICKET_STATUS_LABELS[selected.status]}
                </StatusPill>
                <Badge>{selected.category}</Badge>
                <Badge tone={selected.priority === "urgent" || selected.priority === "high" ? "rose" : "neutral"}>
                  {selected.priority[0].toUpperCase() + selected.priority.slice(1)} priority
                </Badge>
              </div>
              <h2 className="mt-2.5 font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">{selected.subject}</h2>
              <dl className="mt-3 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-3">
                <div className="min-w-0">
                  <dt className="text-ink-3">Owner</dt>
                  <dd className="truncate font-semibold text-ink">
                    {selected.assigneeId ? `${staffById(selected.assigneeId)?.name} · ${staffById(selected.assigneeId)?.title}` : "Waiting to be assigned"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">Raised</dt>
                  <dd className="font-semibold text-ink tnum">
                    {dayTimeLabel(selected.created)} · {selected.channel === "portal" ? "Portal" : selected.channel === "whatsapp" ? "WhatsApp" : selected.channel}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-ink-3">First response</dt>
                  <dd className="font-semibold text-ink tnum">
                    {selected.firstResponseMins !== null ? `${selected.firstResponseMins} minutes` : "Not yet"}
                  </dd>
                </div>
              </dl>
              <SlaBar ticket={selected} />
            </div>

            <div className="border-b border-line px-5 py-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Your message</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink [overflow-wrap:anywhere]">{selected.body}</p>
              {selected.attachments?.length ? (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {selected.attachments.map((f) => (
                    <span key={f} className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink">
                      <Paperclip className="size-3 shrink-0 text-ink-3" />
                      <span className="truncate">{f}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-b border-line px-5 py-5">
              <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Ticket history</p>
              <Timeline dense items={timeline} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendReply();
              }}
              className="bg-surface-2 px-5 py-4"
            >
              <label htmlFor="ticket-reply" className="text-[12.5px] font-semibold text-ink-2">
                {selected.status === "resolved" ? "Add a note or reopen the ticket" : "Reply to the support team"}
              </label>
              <Textarea
                id="ticket-reply"
                rows={3}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Add details, a reference number or an answer to their question"
                className="mt-1.5"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                {selected.status === "resolved" ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      update(selected.id, { status: "open", resolutionHours: null }, "Reopened by learner");
                      toast({ title: `${selected.id} reopened`, tone: "warning" });
                    }}
                  >
                    <RotateCcw className="size-3.5" /> Reopen ticket
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      update(
                        selected.id,
                        { status: "resolved", resolutionHours: Math.max(1, hoursBetween(selected.created, DEMO_NOW)) },
                        "Resolved",
                        "Learner confirmed the answer",
                      );
                      toast({ title: `${selected.id} marked resolved` });
                    }}
                  >
                    <CheckCircle2 className="size-3.5" /> Mark as resolved
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={!reply.trim()}>
                  <MessageSquareReply className="size-3.5" /> Send reply
                </Button>
              </div>
            </form>
          </Card>
        ) : null}

          <Card className="min-w-0 xl:col-start-1 xl:row-start-2">
            <CardHeader title="Before you raise a ticket" sub="Answers to the questions learners ask most" />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {myFaqs.slice(0, 5).map((f) => {
                const open = faqOpen === f.id;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setFaqOpen(open ? null : f.id)}
                      className="flex w-full items-start justify-between gap-3 px-5 py-3 text-left hover:bg-cta-soft"
                    >
                      <span className="min-w-0 text-[13px] font-semibold text-ink">{f.question}</span>
                      <ChevronDown className={cn("mt-0.5 size-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
                    </button>
                    {open ? <p className="px-5 pb-3.5 text-[13px] leading-relaxed text-ink-2">{f.answer}</p> : null}
                  </li>
                );
              })}
            </ul>
          </Card>
      </div>

      <FormDrawer
        open={raiseOpen}
        onClose={() => setRaiseOpen(false)}
        title="Raise a ticket"
        sub="Tell us what you need. The right team picks it up and you can follow every step here."
        submitLabel="Raise ticket"
        footerNote="You get a ticket number straight away"
        onSubmit={raise}
      >
        <Field label="Category" hint={CATEGORY_HINT[raiseCategory]}>
          <Select name="category" value={raiseCategory} onChange={(e) => setRaiseCategory(e.target.value as TicketCategory)}>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        {raiseFaqs.length ? (
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Already answered?</p>
            <ul className="mt-1.5 space-y-2">
              {raiseFaqs.map((f) => (
                <li key={f.id}>
                  <p className="text-[13px] font-semibold text-ink">{f.question}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-3">{f.answer}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Field label="Subject">
          <Input name="subject" required key={`subject-${raiseKey}`} placeholder="e.g. FR booking confirmation not received" />
        </Field>
        <Field label="Details">
          <Textarea name="details" required rows={5} key={`details-${raiseKey}`} placeholder="What happened, what you expected, and any reference numbers" />
        </Field>
        <Field label="How urgent is it?">
          <Select name="urgency" defaultValue="medium" key={`urgency-${raiseKey}`}>
            <option value="medium">Normal · resolution within 48 hours</option>
            <option value="high">Blocking an exam entry or payment deadline · within 24 hours</option>
          </Select>
        </Field>
        <FileDrop
          key={`files-${raiseKey}`}
          label="Add an attachment"
          accept=".pdf,.png,.jpg,.jpeg"
          hint="A screenshot, receipt or letter. Up to 10 MB each."
          onFiles={(all) => setFiles(all)}
        />
      </FormDrawer>
    </div>
  );
}

function SlaBar({ ticket }: { ticket: TicketRow }) {
  const sla = slaOf(ticket);
  return (
    <div className="mt-3.5">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="font-semibold text-ink-2">Turnaround</span>
        <span className={cn("font-semibold", sla.tone === "rose" ? "text-rose" : sla.tone === "amber" ? "text-amber" : "text-jade")}>{sla.label}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn("h-full rounded-full", sla.tone === "rose" ? "bg-rose" : sla.tone === "amber" ? "bg-amber" : "bg-jade")}
          style={{ width: `${sla.pct}%` }}
        />
      </div>
    </div>
  );
}
