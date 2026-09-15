"use client";

import { useState } from "react";
import { Megaphone, Pin, Send } from "lucide-react";
import {
  ACCA_TODAY,
  cohorts,
  formatAccaDate,
  staffName,
  type Announcement,
  type Channel,
  type University,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { GatedButton, MiniLabel } from "../acca/common";
import { UniversityMark } from "./common";

const CHANNELS: { id: Channel; label: string }[] = [
  { id: "in-app", label: "In-app" },
  { id: "email", label: "Email" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "sms", label: "SMS" },
];
const CATEGORIES: Announcement["category"][] = ["University", "Exams", "Academic", "Careers", "Operations"];
const CHANNEL_LABEL = Object.fromEntries(CHANNELS.map((c) => [c.id, c.label])) as Record<string, string>;

export function AnnouncementsTab({
  university,
  items,
  setItems,
  canEdit,
  reason,
  persona,
}: {
  university: University;
  items: Announcement[];
  setItems: React.Dispatch<React.SetStateAction<Announcement[]>>;
  canEdit: boolean;
  reason?: string;
  persona: { name: string; staffId?: string };
}) {
  const uniCohorts = cohorts.filter((c) => c.universityId === university.id);
  const audiences = [
    { id: "all", label: `${university.name} · all ACCA learners` },
    ...uniCohorts.map((c) => ({ id: c.id, label: c.name })),
    ...uniCohorts.flatMap((c) => c.sections.map((s) => ({ id: s.id, label: `${c.name} · ${s.name}` }))),
  ];

  const [audience, setAudience] = useState("all");
  const [category, setCategory] = useState<Announcement["category"]>("University");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["in-app", "email"]);
  const [when, setWhen] = useState("now");
  const [date, setDate] = useState("2026-09-18");
  const [pinned, setPinned] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const audienceLabel = audiences.find((a) => a.id === audience)?.label ?? audiences[0].label;

  const save = (status: Announcement["status"]) => {
    if (!title.trim() || !body.trim()) {
      toast({ title: "Add a title and a message", tone: "warning" });
      return;
    }
    if (channels.length === 0) {
      toast({ title: "Choose at least one channel", tone: "warning" });
      return;
    }
    const finalStatus = status === "draft" ? "draft" : when === "schedule" && date > ACCA_TODAY ? "scheduled" : "published";
    const item: Announcement = {
      id: `an-new-${university.id}-${items.length}`,
      title: title.trim(),
      body: body.trim(),
      audience: "university",
      audienceId: university.id,
      audienceLabel,
      authorId: persona.staffId ?? "st-priya",
      publishedOn: finalStatus === "scheduled" ? date : ACCA_TODAY,
      status: finalStatus,
      channels,
      category,
      pinned,
      readPct: finalStatus === "published" ? 0 : undefined,
    };
    setItems((list) => [item, ...list]);
    toast({
      title: finalStatus === "draft" ? "Draft saved" : finalStatus === "scheduled" ? "Announcement scheduled" : "Announcement published",
      body: `${item.title} · ${audienceLabel}${finalStatus === "scheduled" ? ` · ${formatAccaDate(date)}` : ""}`,
    });
    setTitle("");
    setBody("");
    setPinned(false);
  };

  const visible = statusFilter ? items.filter((a) => a.status === statusFilter) : items;

  const columns: DataTableColumn<Announcement>[] = [
    {
      key: "title",
      header: "Announcement",
      sortable: true,
      wrap: true,
      render: (a) => (
        <span className="block min-w-0">
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            {a.pinned ? <Pin aria-label="Pinned" className="size-3.5 shrink-0 text-ink-3" /> : null}
            {a.title}
          </span>
          <span className="block text-[12px] text-ink-3">{a.audienceLabel}</span>
        </span>
      ),
    },
    { key: "category", header: "Category", sortable: true, className: "text-ink-2" },
    {
      key: "channels",
      header: "Channels",
      render: (a) => <span className="text-[12.5px] text-ink-2">{a.channels.map((c) => CHANNEL_LABEL[c] ?? c).join(", ")}</span>,
    },
    { key: "authorId", header: "By", render: (a) => staffName(a.authorId) },
    { key: "publishedOn", header: "Date", sortable: true, render: (a) => formatAccaDate(a.publishedOn) },
    { key: "status", header: "Status", sortable: true, render: (a) => <StatusPill status={a.status} /> },
    { key: "readPct", header: "Read", align: "right", mono: true, sortable: true, render: (a) => (a.readPct == null ? null : `${a.readPct}%`) },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (a) =>
        a.status !== "published" ? (
          <GatedButton
            size="xs"
            variant="outline"
            allowed={canEdit}
            reason={reason}
            onClick={() => {
              setItems((list) => list.map((x) => (x.id === a.id ? { ...x, status: "published", publishedOn: ACCA_TODAY, readPct: 0 } : x)));
              toast({ title: "Announcement published", body: `${a.title} · ${a.audienceLabel}` });
            }}
          >
            Publish now
          </GatedButton>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Create university-specific announcement" sub={`Only ${university.shortName} learners in the chosen audience receive it.`} />
          <div className="space-y-4 px-5 pb-5">
            <Field label="Audience">
              <Select value={audience} onChange={(e) => setAudience(e.target.value)} disabled={!canEdit}>
                {audiences.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <Select value={category} onChange={(e) => setCategory(e.target.value as Announcement["category"])} disabled={!canEdit}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <div>
                <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Send</p>
                <Segmented
                  size="sm"
                  value={when}
                  onChange={setWhen}
                  items={[
                    { id: "now", label: "Now" },
                    { id: "schedule", label: "Schedule" },
                  ]}
                />
              </div>
            </div>
            {when === "schedule" ? (
              <Field label="Publish on">
                <Input type="date" value={date} min="2026-09-15" onChange={(e) => setDate(e.target.value)} disabled={!canEdit} />
              </Field>
            ) : null}
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. FA mock exam 2 on Saturday 31 October" disabled={!canEdit} />
            </Field>
            <Field label="Message">
              <Textarea
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="What learners need to know and do, with dates."
                disabled={!canEdit}
              />
            </Field>
            <fieldset>
              <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Channels</legend>
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {CHANNELS.map((c) => (
                  <Checkbox
                    key={c.id}
                    checked={channels.includes(c.id)}
                    disabled={!canEdit}
                    onChange={(e) => setChannels((list) => (e.target.checked ? [...list, c.id] : list.filter((x) => x !== c.id)))}
                    label={c.label}
                  />
                ))}
              </div>
            </fieldset>
            <Checkbox checked={pinned} disabled={!canEdit} onChange={(e) => setPinned(e.target.checked)} label="Pin to the top of the learners' university page" />
            <div className="flex flex-wrap justify-end gap-2">
              <GatedButton variant="outline" size="sm" allowed={canEdit} reason={reason} onClick={() => save("draft")}>
                Save draft
              </GatedButton>
              <GatedButton size="sm" allowed={canEdit} reason={reason} onClick={() => save("published")}>
                <Send className="size-3.5" /> {when === "schedule" ? "Schedule" : "Publish"}
              </GatedButton>
            </div>
          </div>
        </Card>

        <div className="min-w-0 space-y-3">
          <MiniLabel>Preview · learner view</MiniLabel>
          <Card className="min-w-0 overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-3">
              <UniversityMark university={university} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-ink">{university.name}</span>
                <span className="block truncate text-[11.5px] text-ink-3">University announcement · {category}</span>
              </span>
              {pinned ? <Pin aria-label="Pinned" className="ml-auto size-4 text-ink-3" /> : null}
            </div>
            <div className="space-y-2 px-5 py-4">
              <p className="font-display text-[18px] leading-tight font-bold tracking-[-0.02em] text-ink">
                {title.trim() || "Your announcement title"}
              </p>
              <p className="text-[13.5px] leading-relaxed whitespace-pre-line text-ink-2">
                {body.trim() || "The message appears here exactly as learners will read it."}
              </p>
              <p className="pt-1 text-[12px] text-ink-3">
                {audienceLabel} · {channels.map((c) => CHANNEL_LABEL[c]).join(", ") || "no channel"} ·{" "}
                {when === "schedule" ? `scheduled ${formatAccaDate(date)}` : formatAccaDate(ACCA_TODAY)}
              </p>
            </div>
          </Card>
          <Card className="flex items-start gap-3 p-4">
            <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv text-cta">
              <Megaphone aria-hidden className="size-4" />
            </span>
            <p className="min-w-0 text-[12.5px] leading-relaxed text-ink-2">
              {university.contact.name} can also publish from the {university.shortName} workspace. Announcements created here are sent on the
              university&apos;s behalf and appear on learners&apos; My university page.
            </p>
          </Card>
        </div>
      </div>

      <DataTable
        caption={`${university.name} announcements`}
        rows={visible}
        columns={columns}
        getRowId={(a) => a.id}
        initialSort={{ key: "publishedOn", dir: "desc" }}
        pageSize={6}
        search={{ placeholder: "Search announcements", match: (a, q) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) }}
        filters={
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={setStatusFilter}
            allLabel="All"
            options={[
              { value: "published", label: "Published" },
              { value: "scheduled", label: "Scheduled" },
              { value: "draft", label: "Draft" },
            ]}
          />
        }
        empty={<p className="text-center text-[13px] text-ink-3">No announcements for {university.shortName} yet.</p>}
        toolbar={
          <Button type="button" size="sm" variant="outline" onClick={() => toast({ title: `Report queued: ${university.workspace.slug}-announcements.csv`, tone: "info" })}>
            Export
          </Button>
        }
      />
    </div>
  );
}
