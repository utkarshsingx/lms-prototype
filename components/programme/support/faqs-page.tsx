"use client";

import { useState } from "react";
import Link from "next/link";
import { BookMarked, Eye, FilePlus2, Pencil, Plus, Repeat2, ThumbsUp, TrendingDown, TrendingUp } from "lucide-react";
import {
  ACCA_TODAY,
  TICKET_CATEGORIES,
  faqs as seedFaqs,
  formatAccaDate,
  groupIndian,
  recurringProblems as seedProblems,
  staffName,
  tickets,
  type Faq,
  type RecurringProblem,
  type TicketCategory,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { ScoreBar } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { SUPPORT_ASSIGNEES } from "./support-helpers";

const AUDIENCE_LABELS: Record<Faq["audience"], string> = {
  all: "All learners",
  graduate: "Graduate learners",
  undergraduate: "Undergraduates",
};

const PROBLEM_STATUS_LABELS: Record<RecurringProblem["status"], string> = {
  investigating: "Investigating",
  "fix-in-progress": "Fix in progress",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

const SUGGESTED_QUESTION: Record<string, string> = {
  "rp-01": "My UPI payment is not showing on the platform. What should I do?",
  "rp-02": "The device check cannot find my camera on Chrome. What should I do?",
  "rp-03": "Why can ACCA's LW exemption decision differ from my estimate?",
  "rp-04": "Why am I warned when I book an exam during university examinations?",
  "rp-05": "When are weekend class recordings published?",
};

const OWNERS = [...SUPPORT_ASSIGNEES.map((a) => a.id), "st-marcus"];
const TICKET_IDS = new Set(tickets.map((t) => t.id));

type Editor = { mode: "create" | "edit"; faq: Partial<Faq>; key: string };

const sectionLabel = "text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase";

function FaqFields({ initial }: { initial: Partial<Faq> }) {
  const [question, setQuestion] = useState(initial.question ?? "");
  const [answer, setAnswer] = useState(initial.answer ?? "");
  return (
    <>
      <Field label="Question" hint="Write it the way a learner would ask">
        <Input name="question" required value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="e.g. When is the ACCA annual subscription due?" />
      </Field>
      <Field label="Answer">
        <Textarea name="answer" rows={5} required value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Plain, specific steps. Link to the page where the learner acts." />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <Select name="category" defaultValue={initial.category ?? "Registration"}>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Audience">
          <Select name="audience" defaultValue={initial.audience ?? "all"}>
            {(Object.keys(AUDIENCE_LABELS) as Faq["audience"][]).map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox name="publish" defaultChecked={initial.status !== "draft"} label="Published in the learner help centre" />
      <div className="rounded-[var(--radius-lg)] border border-line bg-surface-2 p-4">
        <p className={sectionLabel}>Preview · how learners see it</p>
        <p className="mt-2.5 text-[14px] font-semibold text-ink">{question || "Your question appears here"}</p>
        <p className="mt-1.5 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">
          {answer || "The answer appears here as you type."}
        </p>
        <p className="mt-3 text-[12px] text-ink-3">Was this helpful? Yes · No</p>
      </div>
    </>
  );
}

export function FaqsPage() {
  const { can } = useRole();
  const canEdit = can("programme:support");
  const lockedReason = "Your role can view FAQs but cannot change them.";

  const [tab, setTab] = useState("faqs");
  const [faqList, setFaqList] = useState<Faq[]>(seedFaqs);
  const [problems, setProblems] = useState<RecurringProblem[]>(seedProblems);
  const [category, setCategory] = useState("");
  const [audience, setAudience] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [problemView, setProblemView] = useState("active");
  const [logOpen, setLogOpen] = useState(false);
  const [created, setCreated] = useState(0);

  const published = faqList.filter((f) => f.status === "published");
  const views = published.reduce((s, f) => s + f.views, 0);
  const helpful = views ? Math.round(published.reduce((s, f) => s + f.helpfulPct * f.views, 0) / views) : 0;
  const openProblems = problems.filter((p) => p.status !== "resolved");

  const visibleFaqs = faqList.filter(
    (f) => (!category || f.category === category) && (!audience || f.audience === audience) && (!status || f.status === status),
  );
  const visibleProblems = problems.filter((p) =>
    problemView === "all" ? true : problemView === "resolved" ? p.status === "resolved" : p.status !== "resolved",
  );

  const togglePublish = (f: Faq) => {
    const next = f.status === "published" ? "draft" : "published";
    setFaqList((list) => list.map((x) => (x.id === f.id ? { ...x, status: next, updated: ACCA_TODAY } : x)));
    toast({
      title: next === "published" ? "FAQ published" : "FAQ unpublished",
      body: f.question,
      tone: next === "published" ? "success" : "warning",
    });
  };

  const columns: DataTableColumn<Faq>[] = [
    {
      key: "question",
      header: "Question",
      sortable: true,
      wrap: true,
      className: "min-w-72 max-w-[30rem]",
      render: (f) => (
        <span className="block">
          <span className="block font-semibold text-ink">{f.question}</span>
          <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-ink-3">{f.answer}</span>
        </span>
      ),
    },
    { key: "category", header: "Category", sortable: true, render: (f) => <Badge>{f.category}</Badge> },
    { key: "audience", header: "Audience", sortable: true, render: (f) => <span className="text-ink-2">{AUDIENCE_LABELS[f.audience]}</span> },
    { key: "views", header: "Views", align: "right", sortable: true, mono: true, render: (f) => groupIndian(f.views) },
    {
      key: "helpfulPct",
      header: "Helpful",
      sortable: true,
      render: (f) =>
        f.views ? <ScoreBar value={f.helpfulPct} className="w-28" height={6} label={`${f.helpfulPct}%`} showValue={false} /> : <span className="text-ink-3">No votes yet</span>,
    },
    { key: "updated", header: "Updated", sortable: true, mono: true, render: (f) => formatAccaDate(f.updated) },
    { key: "status", header: "Status", sortable: true, render: (f) => <StatusPill status={f.status} size="sm" /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (f) => (
        <span className="inline-flex items-center gap-1.5" title={canEdit ? undefined : lockedReason}>
          <Button size="xs" variant="outline" disabled={!canEdit} onClick={() => togglePublish(f)}>
            {f.status === "published" ? "Unpublish" : "Publish"}
          </Button>
          <IconButton
            label={`Edit ${f.question}`}
            size="xs"
            variant="outline"
            disabled={!canEdit}
            onClick={() => setEditor({ mode: "edit", faq: f, key: `${f.id}-${f.updated}` })}
          >
            <Pencil className="size-3.5" />
          </IconButton>
        </span>
      ),
    },
  ];

  const openCreate = (prefill: Partial<Faq> = {}) => {
    setTab("faqs");
    setEditor({ mode: "create", faq: prefill, key: `new-${created}-${prefill.category ?? ""}` });
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student support"
        title="FAQs & trends"
        sub="Manage the FAQs learners see in the help centre, and monitor recurring problems behind the ticket queue."
        badge={canEdit ? undefined : <ViewOnlyChip reason={lockedReason} />}
        actions={
          <>
            <Button variant="secondary" onClick={() => setTab("problems")}>
              <Repeat2 className="size-4" /> Recurring problems
            </Button>
            <span title={canEdit ? undefined : lockedReason} className="inline-flex">
              <Button disabled={!canEdit} onClick={() => openCreate()}>
                <Plus className="size-4" /> Add FAQ
              </Button>
            </span>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Published FAQs" value={published.length} icon={<BookMarked />} sub={`${faqList.length - published.length} in draft`} />
        <KpiTile label="FAQ views" value={groupIndian(views)} tone="info" icon={<Eye />} sub="Across published answers" />
        <KpiTile label="Found helpful" value={`${helpful}%`} tone="jade" icon={<ThumbsUp />} sub="Weighted by views" />
        <KpiTile
          label="Recurring problems open"
          value={openProblems.length}
          tone="amber"
          icon={<Repeat2 />}
          sub={`${openProblems.reduce((s, p) => s + p.count30d, 0)} tickets in 30 days`}
        />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "faqs", label: "Manage FAQs", count: faqList.length },
          { id: "problems", label: "Monitor recurring problems", count: openProblems.length },
        ]}
      />

      {tab === "faqs" ? (
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="FAQ categories">
            {[{ id: "", label: "All categories", count: faqList.length }, ...TICKET_CATEGORIES.map((c) => ({ id: c, label: c, count: faqList.filter((f) => f.category === c).length }))].map(
              (c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.label}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors",
                      active ? "border-transparent bg-nav-active text-nav-active-ink" : "border-line bg-surface text-ink-2 hover:bg-cta-soft hover:text-ink",
                    )}
                  >
                    {c.label}
                    <span className={cn("rounded-full px-1.5 text-[11px] tnum", active ? "bg-cta text-cta-ink" : "bg-surface-2 text-ink-3")}>{c.count}</span>
                  </button>
                );
              },
            )}
          </div>
          <DataTable
            caption="FAQs"
            rows={visibleFaqs}
            columns={columns}
            getRowId={(f) => f.id}
            search={{
              placeholder: "Search questions and answers",
              match: (f, q) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q),
            }}
            filters={
              <FilterBar
                active={Boolean(audience || status || category)}
                onClear={() => {
                  setAudience("");
                  setStatus("");
                  setCategory("");
                }}
              >
                <FilterSelect
                  label="Audience"
                  value={audience}
                  onChange={setAudience}
                  allLabel="Everyone"
                  options={(Object.keys(AUDIENCE_LABELS) as Faq["audience"][]).map((a) => ({ value: a, label: AUDIENCE_LABELS[a] }))}
                />
                <FilterSelect
                  label="Status"
                  value={status}
                  onChange={setStatus}
                  allLabel="Any"
                  options={[
                    { value: "published", label: "Published" },
                    { value: "draft", label: "Draft" },
                  ]}
                />
              </FilterBar>
            }
          />
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[13.5px] text-ink-2">
                Problems clustered from support tickets, WhatsApp and voice calls. Each has an owner, a root cause and a fix.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                value={problemView}
                onChange={setProblemView}
                items={[
                  { id: "active", label: "Active" },
                  { id: "resolved", label: "Resolved" },
                  { id: "all", label: "All" },
                ]}
              />
              <span title={canEdit ? undefined : lockedReason} className="inline-flex">
                <Button size="sm" disabled={!canEdit} onClick={() => setLogOpen(true)}>
                  <Plus className="size-4" /> Log recurring problem
                </Button>
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {visibleProblems.map((p) => {
              const first = p.trend[0] ?? 0;
              const last = p.trend[p.trend.length - 1] ?? 0;
              const rising = last > first;
              return (
                <Card key={p.id} className="flex min-w-0 flex-col p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display text-[18px] leading-snug font-bold tracking-[-0.02em] text-ink">{p.title}</h3>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <Badge>{p.category}</Badge>
                        <StatusPill status={p.status} size="sm">
                          {PROBLEM_STATUS_LABELS[p.status]}
                        </StatusPill>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-[30px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{p.count30d}</p>
                      <p className="mt-1 text-[11.5px] text-ink-3">tickets in 30 days</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 pt-2 pb-1">
                    <div className="flex items-center justify-between gap-2 text-[11.5px] text-ink-3">
                      <span>Weekly tickets, last 6 weeks</span>
                      <span className={cn("inline-flex items-center gap-1 font-semibold", rising ? "text-rose" : "text-jade")}>
                        {rising ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                        {first} to {last} a week
                      </span>
                    </div>
                    <Sparkline data={p.trend} tone={rising ? "rose" : "jade"} height={36} />
                  </div>

                  <dl className="mt-4 space-y-3 text-[13px] leading-relaxed">
                    <div>
                      <dt className={sectionLabel}>Root cause</dt>
                      <dd className="mt-1 text-ink-2">{p.rootCause}</dd>
                    </div>
                    <div>
                      <dt className={sectionLabel}>Fix</dt>
                      <dd className="mt-1 text-ink-2">{p.fix}</dd>
                    </div>
                    <div>
                      <dt className={sectionLabel}>Linked tickets</dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {p.linkedTicketIds.length ? (
                          p.linkedTicketIds.map((id) => (
                            <Link
                              key={id}
                              href={`/programme/support?ticket=${id}`}
                              className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11.5px] text-ink transition-colors hover:border-ink hover:bg-cta-soft"
                            >
                              {id}
                            </Link>
                          ))
                        ) : (
                          <span className="text-ink-3">None open</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-auto flex flex-wrap items-end gap-3 border-t border-line pt-4">
                    <span className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-2">
                      <Avatar name={staffName(p.ownerId)} size="xs" />
                      <span className="min-w-0 truncate">Owner: {staffName(p.ownerId)}</span>
                    </span>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <div className="w-40" title={canEdit ? undefined : lockedReason}>
                        <Select
                          aria-label={`Fix status for ${p.title}`}
                          value={p.status}
                          disabled={!canEdit}
                          className="h-9 text-[13px]"
                          onChange={(e) => {
                            const next = e.target.value as RecurringProblem["status"];
                            setProblems((list) => list.map((x) => (x.id === p.id ? { ...x, status: next } : x)));
                            toast({ title: `${PROBLEM_STATUS_LABELS[next]}: ${p.title}`, body: `Owner ${staffName(p.ownerId)} is notified.` });
                          }}
                        >
                          {(Object.keys(PROBLEM_STATUS_LABELS) as RecurringProblem["status"][]).map((s) => (
                            <option key={s} value={s}>
                              {PROBLEM_STATUS_LABELS[s]}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <span title={canEdit ? undefined : lockedReason} className="inline-flex">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canEdit}
                          onClick={() =>
                            openCreate({
                              category: p.category,
                              question: SUGGESTED_QUESTION[p.id] ?? `${p.title}: what should I do?`,
                              answer: p.fix,
                              status: "draft",
                            })
                          }
                        >
                          <FilePlus2 className="size-4" /> Draft FAQ
                        </Button>
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {visibleProblems.length === 0 ? (
            <p className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-10 text-center text-[13px] text-ink-3">
              No recurring problems in this view.
            </p>
          ) : null}
        </section>
      )}

      <FormDrawer
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === "edit" ? "Edit FAQ" : "Add FAQ"}
        sub={editor?.mode === "edit" ? `Last updated ${formatAccaDate(editor.faq.updated ?? ACCA_TODAY)}` : "Answers the questions learners raise most often."}
        submitLabel={editor?.mode === "edit" ? "Save FAQ" : "Add FAQ"}
        disabled={!canEdit}
        disabledReason={lockedReason}
        onSubmit={(data) => {
          if (!editor) return;
          const next = {
            question: String(data.get("question") ?? "").trim(),
            answer: String(data.get("answer") ?? "").trim(),
            category: String(data.get("category")) as TicketCategory,
            audience: String(data.get("audience")) as Faq["audience"],
            status: (data.get("publish") ? "published" : "draft") as Faq["status"],
            updated: ACCA_TODAY,
          };
          if (editor.mode === "edit" && editor.faq.id) {
            const id = editor.faq.id;
            setFaqList((list) => list.map((f) => (f.id === id ? { ...f, ...next } : f)));
            toast({ title: "FAQ saved", body: next.question });
          } else {
            const n = faqList.length + 1;
            setFaqList((list) => [{ id: `faq-${String(n).padStart(2, "0")}`, views: 0, helpfulPct: 0, ...next }, ...list]);
            setCreated((c) => c + 1);
            setCategory("");
            setStatus("");
            setAudience("");
            toast({ title: next.status === "published" ? "FAQ added and published" : "FAQ saved as draft", body: next.question });
          }
          setEditor(null);
        }}
      >
        {editor ? <FaqFields key={editor.key} initial={editor.faq} /> : null}
      </FormDrawer>

      <FormDrawer
        open={logOpen}
        onClose={() => setLogOpen(false)}
        title="Log recurring problem"
        sub="Group tickets that share a cause, so one fix closes them together."
        submitLabel="Log problem"
        disabled={!canEdit}
        disabledReason={lockedReason}
        onSubmit={(data) => {
          const linked = String(data.get("linked") ?? "")
            .split(/[\s,]+/)
            .map((x) => x.trim().toUpperCase())
            .filter((x) => TICKET_IDS.has(x));
          const count = Math.max(linked.length, Number(data.get("count")) || 0);
          const problem: RecurringProblem = {
            id: `rp-${String(problems.length + 1).padStart(2, "0")}`,
            title: String(data.get("title") ?? "").trim(),
            category: String(data.get("category")) as TicketCategory,
            count30d: count,
            trend: [0, 0, 0, 0, Math.floor(count / 2), Math.ceil(count / 2)],
            rootCause: String(data.get("rootCause") ?? "").trim() || "Under investigation.",
            ownerId: String(data.get("owner")),
            status: "investigating",
            fix: String(data.get("fix") ?? "").trim() || "Fix to be agreed with the owner.",
            linkedTicketIds: linked,
          };
          setProblems((list) => [problem, ...list]);
          setProblemView("active");
          setLogOpen(false);
          toast({ title: "Recurring problem logged", body: `${problem.title} · owner ${staffName(problem.ownerId)}` });
        }}
      >
        <Field label="Problem">
          <Input name="title" required placeholder="e.g. Exemption fee receipts rejected by ACCA" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <Select name="category" defaultValue="Exemption">
              {TICKET_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Owner">
            <Select name="owner" defaultValue="st-priya">
              {OWNERS.map((id) => (
                <option key={id} value={id}>
                  {staffName(id)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Linked tickets" hint="Ticket numbers, comma separated">
          <Input name="linked" placeholder="TK-2052, TK-2057" className="font-mono" />
        </Field>
        <Field label="Tickets in the last 30 days" hint="Includes WhatsApp and calls">
          <Input name="count" type="number" min={1} defaultValue={3} />
        </Field>
        <Field label="Root cause">
          <Textarea name="rootCause" rows={2} placeholder="What keeps causing it." />
        </Field>
        <Field label="Fix">
          <Textarea name="fix" rows={2} placeholder="What will stop it, and who does it." />
        </Field>
      </FormDrawer>
    </div>
  );
}
