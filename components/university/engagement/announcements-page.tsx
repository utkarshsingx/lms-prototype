"use client";

import { useState } from "react";
import { BellRing, CalendarClock, Megaphone, Pin, Save, Send, ShieldCheck, Users } from "lucide-react";
import {
  ACCA_TODAY,
  announcementsForUniversity,
  cohortsForUniversity,
  formatAccaDate,
  staffName,
  type Announcement,
  type Channel,
} from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/tabs";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Progress } from "@/components/ui/progress";
import { Drawer } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { Callout, Gated, MiniLabel, UniversityMark, WorkspaceHeader, intakeShort, plural, useWorkspace } from "./shared";

type Row = Announcement & { reach: number; authorName: string };

const CHANNEL_LABEL: Record<Channel, string> = { "in-app": "In-app", email: "Email", whatsapp: "WhatsApp", sms: "SMS", push: "Push" };
const CATEGORIES: Announcement["category"][] = ["University", "Exams", "Academic", "Careers", "Operations"];

export function AnnouncementsPage() {
  const { uni, canEdit, persona } = useWorkspace();
  const cohorts = cohortsForUniversity(uni.id);
  const publishReason = `Authorised publishers: Programme Director. ${persona.name} has view-only access and cannot publish or save drafts.`;

  const reachFor = (label: string) => {
    const cohort = cohorts.find((c) => label.includes(intakeShort(c.intakeId ?? "")));
    const section = cohort?.sections.find((s) => label.includes(s.name));
    return section?.size ?? cohort?.size ?? uni.headline.students;
  };

  const [rows, setRows] = useState<Row[]>(() =>
    announcementsForUniversity(uni.id)
      .map((a) => ({ ...a, reach: reachFor(a.audienceLabel), authorName: staffName(a.authorId) }))
      .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn)),
  );

  /* ---------------------------------------------------------------- composer */
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"all" | "cohort" | "section">("all");
  const [cohortId, setCohortId] = useState(cohorts[0]?.id ?? "");
  const [sectionId, setSectionId] = useState(cohorts[0]?.sections[0]?.id ?? "");
  const [category, setCategory] = useState<Announcement["category"]>("University");
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(false);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [scheduleOn, setScheduleOn] = useState("2026-09-21");
  const [pinned, setPinned] = useState(false);

  const cohort = cohorts.find((c) => c.id === cohortId) ?? cohorts[0];
  const section = cohort?.sections.find((s) => s.id === sectionId) ?? cohort?.sections[0];
  const cohortLabel = cohort ? `${intakeShort(cohort.intakeId ?? "")} · Semester ${cohort.semester}` : "";
  const audienceLabel =
    audience === "all"
      ? `${uni.name} · all ACCA learners`
      : audience === "cohort"
        ? `${uni.name} · ${cohortLabel}`
        : `${uni.name} · ${cohortLabel} · ${section?.name ?? ""}`;
  const reach = audience === "all" ? uni.headline.students : audience === "cohort" ? (cohort?.size ?? 0) : (section?.size ?? 0);
  const channels: Channel[] = ["in-app", ...(email ? (["email"] as Channel[]) : []), ...(whatsapp ? (["whatsapp"] as Channel[]) : [])];

  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const opened = rows.find((r) => r.id === openId) ?? null;

  const reset = () => {
    setTitle("");
    setBody("");
    setAudience("all");
    setCategory("University");
    setEmail(true);
    setWhatsapp(false);
    setWhen("now");
    setPinned(false);
  };

  const submit = (status: Announcement["status"]) => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Add a title and a message first", tone: "warning" });
      return;
    }
    if (status === "scheduled" && scheduleOn <= ACCA_TODAY) {
      toast({ title: "Choose a date after today to schedule", tone: "warning" });
      return;
    }
    const row: Row = {
      id: `an-new-${rows.length + 1}`,
      title: title.trim(),
      body: body.trim(),
      audience: audience === "all" ? "university" : "cohort",
      audienceId: audience === "all" ? uni.id : cohort?.id,
      audienceLabel,
      authorId: persona.staffId ?? "",
      authorName: persona.name,
      publishedOn: status === "scheduled" ? scheduleOn : ACCA_TODAY,
      status,
      channels,
      category,
      pinned,
      readPct: status === "published" ? 0 : undefined,
      reach,
    };
    setRows((list) => [row, ...list]);
    setFilter("all");
    reset();
    if (status === "published") {
      toast({ title: "Announcement published", body: `${row.title} · reaches ${reach} learners by ${channels.map((c) => CHANNEL_LABEL[c]).join(", ")}.` });
    } else if (status === "scheduled") {
      toast({ title: `Announcement scheduled for ${formatAccaDate(scheduleOn)}`, body: `${row.title} · ${reach} learners.`, tone: "info" });
    } else {
      toast({ title: "Draft saved", body: row.title, tone: "neutral" });
    }
  };

  const setStatus = (id: string, status: Announcement["status"]) => {
    const r = rows.find((x) => x.id === id);
    setRows((list) =>
      list.map((x) => (x.id === id ? { ...x, status, publishedOn: status === "published" ? ACCA_TODAY : x.publishedOn, readPct: status === "published" ? (x.readPct ?? 0) : x.readPct } : x)),
    );
    if (!r) return;
    if (status === "published") toast({ title: "Announcement published", body: `${r.title} · reaches ${r.reach} learners.` });
    if (status === "draft") toast({ title: "Schedule cancelled", body: `${r.title} moved back to drafts.`, tone: "info" });
  };

  const visible = rows.filter((r) => filter === "all" || r.status === filter);

  const columns: DataTableColumn<Row>[] = [
    {
      key: "title",
      header: "Announcement",
      sortable: true,
      wrap: true,
      render: (r) => (
        <span className="block min-w-0">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            {r.pinned ? <Pin aria-label="Pinned" className="size-3.5 shrink-0 text-ink-3" /> : null}
            {r.title}
          </span>
          <span className="mt-0.5 block text-[12px] text-ink-3">{r.category}</span>
        </span>
      ),
    },
    { key: "audience", header: "Audience", wrap: true, render: (r) => <span className="text-ink-2">{r.audienceLabel.replace(`${uni.name} · `, "")}</span> },
    {
      key: "channels",
      header: "Channels",
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.channels.map((c) => (
            <span key={c} className="rounded-full border border-line bg-surface-2 px-1.5 py-px text-[11px] font-semibold text-ink-2">
              {CHANNEL_LABEL[c]}
            </span>
          ))}
        </span>
      ),
    },
    {
      key: "publishedOn",
      header: "Date",
      sortable: true,
      render: (r) => (r.status === "scheduled" ? `Scheduled ${formatAccaDate(r.publishedOn)}` : r.status === "draft" ? `Draft · ${formatAccaDate(r.publishedOn)}` : formatAccaDate(r.publishedOn)),
    },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
    {
      key: "read",
      header: "Read",
      sortable: true,
      sortValue: (r) => r.readPct ?? null,
      render: (r) =>
        r.readPct != null ? (
          <span className="flex items-center gap-2">
            <Progress value={r.readPct} tone="brand" height={5} className="w-16" />
            <span className="font-mono text-[12px] text-ink-2">{r.readPct}%</span>
          </span>
        ) : null,
    },
    { key: "author", header: "Published by", render: (r) => r.authorName },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <WorkspaceHeader
        section="Engagement"
        title="Announcements"
        sub={`Publish authorised university announcements to ${uni.shortName} ACCA learners: every student, one cohort or one section.`}
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-ink">
            <ShieldCheck aria-hidden className="size-3.5 text-jade" />
            Authorised publishers: Programme Director
          </span>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Publish authorised university announcements"
            sub={canEdit ? `Signed in as ${persona.name}. You are an authorised publisher for ${uni.shortName}.` : publishReason}
          />
          {/* A disabled fieldset also locks the audience and schedule toggles for view-only users. */}
          <fieldset disabled={!canEdit} aria-label="Announcement composer" className="m-0 min-w-0 space-y-4 border-0 px-5 pt-0 pb-5">
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} placeholder="e.g. Library hours extended during CIA 1" maxLength={90} />
            </Field>
            <Field label="Message" hint={`${body.length} of 600`}>
              <Textarea
                rows={5}
                value={body}
                maxLength={600}
                onChange={(e) => setBody(e.target.value)}
                disabled={!canEdit}
                placeholder="Write what learners need to know and by when. Keep ACCA dates exact."
              />
            </Field>

            <div>
              <MiniLabel className="mb-2">Audience</MiniLabel>
              <Segmented
                value={audience}
                onChange={(v) => setAudience(v as typeof audience)}
                items={[
                  { id: "all", label: `All ${uni.shortName} ACCA students` },
                  { id: "cohort", label: "A cohort" },
                  { id: "section", label: "A section" },
                ]}
              />
              {audience !== "all" ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Cohort">
                    <Select
                      value={cohortId}
                      disabled={!canEdit}
                      onChange={(e) => {
                        setCohortId(e.target.value);
                        setSectionId(cohorts.find((c) => c.id === e.target.value)?.sections[0]?.id ?? "");
                      }}
                    >
                      {cohorts.map((c) => (
                        <option key={c.id} value={c.id}>
                          {intakeShort(c.intakeId ?? "")} · Semester {c.semester} ({c.size})
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {audience === "section" ? (
                    <Field label="Section">
                      <Select value={section?.id ?? ""} disabled={!canEdit} onChange={(e) => setSectionId(e.target.value)}>
                        {cohort?.sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.size})
                          </option>
                        ))}
                      </Select>
                    </Field>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={category} disabled={!canEdit} onChange={(e) => setCategory(e.target.value as Announcement["category"])}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <fieldset>
                <legend className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Channels</legend>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1.5">
                  <Checkbox checked disabled label="In-app" readOnly />
                  <Checkbox checked={email} disabled={!canEdit} onChange={(e) => setEmail(e.target.checked)} label="Email" />
                  <Checkbox checked={whatsapp} disabled={!canEdit} onChange={(e) => setWhatsapp(e.target.checked)} label="WhatsApp" />
                </div>
              </fieldset>
            </div>

            <div className="grid items-end gap-4 sm:grid-cols-2">
              <div>
                <MiniLabel className="mb-2">When</MiniLabel>
                <Segmented
                  size="sm"
                  value={when}
                  onChange={(v) => setWhen(v as typeof when)}
                  items={[
                    { id: "now", label: "Publish now" },
                    { id: "schedule", label: "Schedule" },
                  ]}
                />
              </div>
              {when === "schedule" ? (
                <Field label="Publish on">
                  <Input type="date" value={scheduleOn} min="2026-09-15" disabled={!canEdit} onChange={(e) => setScheduleOn(e.target.value)} />
                </Field>
              ) : (
                <div className="min-w-0">
                  <Switch checked={pinned} onChange={setPinned} label="Pin to the top" sub="Stays first on student dashboards" />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <p className="flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-2">
                <Users aria-hidden className="size-4 shrink-0 text-ink-3" />
                Reaches <span className="font-semibold text-ink">{reach}</span> learners
              </p>
              <div className="flex flex-wrap gap-2">
                <Gated allowed={canEdit} reason={publishReason} variant="outline" onClick={() => submit("draft")}>
                  <Save className="size-4" />
                  Save draft
                </Gated>
                <Gated allowed={canEdit} reason={publishReason} onClick={() => submit(when === "schedule" ? "scheduled" : "published")}>
                  {when === "schedule" ? <CalendarClock className="size-4" /> : <Send className="size-4" />}
                  {when === "schedule" ? "Schedule announcement" : "Publish announcement"}
                </Gated>
              </div>
            </div>
          </fieldset>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="min-w-0 overflow-hidden">
            <div className="border-b border-line bg-surface-2 px-5 py-2.5">
              <MiniLabel>Student preview</MiniLabel>
            </div>
            <div className="p-5">
              <div className="flex items-center gap-3">
                <UniversityMark uni={uni} size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{uni.name}</p>
                  <p className="truncate text-[12px] text-ink-3">{audienceLabel.replace(`${uni.name} · `, "")}</p>
                </div>
                {pinned && when === "now" ? <Pin aria-label="Pinned" className="ml-auto size-4 shrink-0 text-ink-3" /> : null}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusPill status={category} tone="info" size="sm" />
                <span className="text-[12px] text-ink-3">{when === "schedule" ? `Arrives ${formatAccaDate(scheduleOn)}` : formatAccaDate(ACCA_TODAY)}</span>
              </div>
              <h3 className="mt-2 font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
                {title.trim() || "Your announcement title"}
              </h3>
              <p className="mt-2 text-[13.5px] leading-relaxed whitespace-pre-line text-ink-2">
                {body.trim() || "The message appears here as learners will read it on their dashboard and in My university."}
              </p>
              <p className="mt-4 flex flex-wrap items-center gap-1.5 text-[12px] text-ink-3">
                <BellRing aria-hidden className="size-3.5" />
                {channels.map((c) => CHANNEL_LABEL[c]).join(" · ")}
              </p>
            </div>
          </Card>
          <Callout icon={<Megaphone />} title="Authorised publishers: Programme Director">
            Only the {uni.shortName} Programme Director can publish, schedule or save announcements here. Other university users see the history.
            ZSkillup programme announcements and exam reminders are sent by the Programme Admin team.
          </Callout>
        </div>
      </div>

      <section aria-labelledby="announcement-history" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="announcement-history" className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
            History
          </h2>
          <Segmented
            size="sm"
            value={filter}
            onChange={setFilter}
            items={[
              { id: "all", label: `All · ${rows.length}` },
              { id: "published", label: `Published · ${rows.filter((r) => r.status === "published").length}` },
              { id: "scheduled", label: `Scheduled · ${rows.filter((r) => r.status === "scheduled").length}` },
              { id: "draft", label: `Drafts · ${rows.filter((r) => r.status === "draft").length}` },
            ]}
          />
        </div>
        <DataTable
          caption="Announcement history"
          rows={visible}
          columns={columns}
          getRowId={(r) => r.id}
          onRowClick={(r) => setOpenId(r.id)}
          rowLabel={(r) => `Open ${r.title}`}
          search={{ placeholder: "Search announcements", match: (r, q) => r.title.toLowerCase().includes(q) || r.body.toLowerCase().includes(q) }}
        />
      </section>

      <Drawer
        open={opened != null}
        onClose={() => setOpenId(null)}
        title={opened?.title ?? "Announcement"}
        sub={opened ? `${opened.audienceLabel} · ${plural(opened.reach, "learner")}` : undefined}
        footer={
          opened ? (
            <>
              {opened.status === "scheduled" ? (
                <Gated allowed={canEdit} reason={publishReason} variant="ghost" onClick={() => setStatus(opened.id, "draft")}>
                  Cancel schedule
                </Gated>
              ) : null}
              {opened.status !== "published" ? (
                <Gated allowed={canEdit} reason={publishReason} onClick={() => setStatus(opened.id, "published")}>
                  <Send className="size-4" />
                  Publish now
                </Gated>
              ) : (
                <Gated
                  allowed={canEdit}
                  reason={publishReason}
                  variant="secondary"
                  onClick={() => {
                    const unread = Math.round((opened.reach * (100 - (opened.readPct ?? 0))) / 100);
                    toast({ title: "Reminder sent", body: `${opened.title} · ${plural(unread, "learner")} who have not read it yet.` });
                  }}
                >
                  <BellRing className="size-4" />
                  Remind unread learners
                </Gated>
              )}
              <Button variant="outline" onClick={() => setOpenId(null)}>
                Close
              </Button>
            </>
          ) : null
        }
      >
        {opened ? (
          <div className="space-y-4 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={opened.status} />
              <StatusPill status={opened.category} tone="info" size="sm" />
              {opened.pinned ? <StatusPill status="Pinned" tone="cta" size="sm" /> : null}
            </div>
            <p className="text-[14px] leading-relaxed text-ink">{opened.body}</p>
            <dl className="rounded-[12px] border border-line px-3.5">
              {[
                [opened.status === "scheduled" ? "Scheduled for" : opened.status === "draft" ? "Last saved" : "Published", formatAccaDate(opened.publishedOn)],
                ["By", opened.authorName],
                ["Channels", opened.channels.map((c) => CHANNEL_LABEL[c]).join(", ")],
                ["Read by", opened.readPct != null ? `${opened.readPct}% · ${Math.round((opened.reach * opened.readPct) / 100)} of ${opened.reach}` : "Not sent yet"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0">
                  <dt className="shrink-0 text-[12.5px] text-ink-3">{k}</dt>
                  <dd className="min-w-0 text-right text-[13px] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
