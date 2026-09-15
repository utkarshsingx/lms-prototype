"use client";

import { useMemo, useState } from "react";
import { Bell, Download, FileText, Mail, MessageCircle, Pin, Plus, Send, Smartphone, Upload } from "lucide-react";
import {
  ACCA_TODAY,
  announcements as seedAnnouncements,
  cohortById,
  cohorts as allCohorts,
  formatAccaDate,
  groupIndian,
  programmeById,
  programmeResources,
  programmes,
  staffName,
  TOTAL_LEARNERS,
  universities,
  universityById,
  type Announcement,
  type AnnouncementAudience,
  type Channel,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { PageHeader, DataRow } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, Segmented } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Drawer } from "@/components/ui/modal";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { StatusPill } from "@/components/ui/status";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { GatedButton, MiniLabel, useOpsAccess } from "./shared";

const CHANNELS: { id: Channel; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "in-app", label: "In-app", icon: Bell },
  { id: "email", label: "Email", icon: Mail },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "sms", label: "SMS", icon: Smartphone },
];

const AUDIENCE_LABEL: Record<AnnouncementAudience, string> = {
  all: "All learners",
  programme: "Programme",
  cohort: "Cohort",
  university: "University",
};

const CATEGORIES: Announcement["category"][] = ["Academic", "Operations", "Exams", "University", "Careers", "Finance"];

function audienceSize(a: Pick<Announcement, "audience" | "audienceId">) {
  if (a.audience === "all") return TOTAL_LEARNERS;
  if (a.audience === "programme") return programmeById(a.audienceId)?.learners ?? 0;
  if (a.audience === "cohort") return cohortById(a.audienceId)?.size ?? 0;
  return universityById(a.audienceId)?.students ?? 0;
}

function scheduleLabel(a: Announcement) {
  if (a.status === "draft") return "Not scheduled";
  if (a.status === "scheduled") return `Sends ${formatAccaDate(a.publishedOn)}`;
  return `Sent ${formatAccaDate(a.publishedOn)}`;
}

/* ------------------------------------------------------------------ resources */

type Resource = (typeof programmeResources)[number] & { status: "published" | "archived" };

const RESOURCE_KINDS = ["Timetable", "Guide", "Policy", "Template"];
const RESOURCE_AUDIENCES = [
  "All learners",
  "Graduate learners",
  "University undergraduates",
  ...universities.map((u) => u.name),
  ...allCohorts.filter((c) => !c.universityId).map((c) => c.name),
];

/* ------------------------------------------------------------------ preview */

function AnnouncementPreview({ title, body, audienceLabel, channels, author }: { title: string; body: string; audienceLabel: string; channels: Channel[]; author: string }) {
  return (
    <div className="space-y-3">
      <div className="rounded-[16px] border border-line bg-surface p-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-full bg-surface-inv text-cta">
            <Bell aria-hidden className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">In-app · {audienceLabel}</p>
          </div>
        </div>
        <p className="mt-2.5 text-[14.5px] leading-snug font-bold text-ink">{title || "Announcement title"}</p>
        <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{body || "Write the message learners will see."}</p>
        <p className="mt-2 text-[11.5px] text-ink-3">{author} · ACCA LMS</p>
      </div>
      {channels.includes("whatsapp") ? (
        <div className="rounded-[16px] border border-line bg-surface-2 p-3">
          <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">WhatsApp</p>
          <div className="ml-auto max-w-[85%] rounded-[14px] rounded-tr-[4px] bg-jade-soft px-3 py-2 text-[12.5px] text-ink">
            <span className="font-semibold">{title || "Announcement title"}</span>
            <br />
            {body ? (body.length > 160 ? `${body.slice(0, 157)}...` : body) : "Message text"}
          </div>
        </div>
      ) : null}
      {channels.includes("email") ? (
        <p className="flex items-center gap-2 text-[12px] text-ink-3">
          <Mail aria-hidden className="size-3.5" />
          Email subject: {title || "Announcement title"} · from acca@zskillup.com
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export function AnnouncementsPage() {
  const { canEdit, reason } = useOpsAccess();
  const { persona } = useRole();
  const [tab, setTab] = useState("announcements");

  /* announcements */
  const [rows, setRows] = useState<Announcement[]>(seedAnnouncements);
  const [status, setStatus] = useState("");
  const [audience, setAudience] = useState("");
  const [category, setCategory] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((a) => a.id === openId);

  const [composeOpen, setComposeOpen] = useState(false);
  const [cTitle, setCTitle] = useState("");
  const [cBody, setCBody] = useState("");
  const [cAudience, setCAudience] = useState<AnnouncementAudience>("cohort");
  const [cTarget, setCTarget] = useState("co-fm-fast-dec26");
  const [cChannels, setCChannels] = useState<Channel[]>(["in-app", "email"]);
  const [cWhen, setCWhen] = useState("now");
  const [cPinned, setCPinned] = useState(false);
  const [created, setCreated] = useState(0);

  const targetOptions = useMemo(() => {
    if (cAudience === "programme") return programmes.map((p) => ({ id: p.id, label: p.name }));
    if (cAudience === "cohort") return allCohorts.map((c) => ({ id: c.id, label: c.name }));
    if (cAudience === "university") return universities.map((u) => ({ id: u.id, label: u.name }));
    return [];
  }, [cAudience]);
  const cAudienceLabel = cAudience === "all" ? "All learners" : (targetOptions.find((t) => t.id === cTarget)?.label ?? "");

  const visible = rows.filter((a) => (!status || a.status === status) && (!audience || a.audience === audience) && (!category || a.category === category));

  const openCompose = (from?: Announcement) => {
    setCTitle(from ? `${from.title}` : "FM mock exam on Sunday 8 November");
    setCBody(
      from
        ? from.body
        : "The Dec 2026 FM mock is proctored and runs 3 hours. Complete the device check by 6 November. Working capital and investment appraisal revision notes are published.",
    );
    setCAudience(from?.audience ?? "cohort");
    setCTarget(from?.audienceId ?? "co-fm-fast-dec26");
    setCChannels(from?.channels ?? ["in-app", "email"]);
    setCWhen("now");
    setCPinned(Boolean(from?.pinned));
    setOpenId(null);
    setComposeOpen(true);
  };

  const submitCompose = (data: FormData) => {
    if (!cTitle.trim() || !cBody.trim()) {
      toast({ title: "Add a title and a message", tone: "warning" });
      return;
    }
    if (cChannels.length === 0) {
      toast({ title: "Choose at least one channel", tone: "warning" });
      return;
    }
    const n = created + 1;
    const when = String(data.get("scheduleDate") || "2026-09-16");
    const a: Announcement = {
      id: `an-new-${n}`,
      title: cTitle.trim(),
      body: cBody.trim(),
      audience: cAudience,
      audienceId: cAudience === "all" ? undefined : cTarget,
      audienceLabel: cAudienceLabel,
      authorId: persona.staffId ?? "st-priya",
      publishedOn: cWhen === "schedule" ? when : ACCA_TODAY,
      status: cWhen === "now" ? "published" : cWhen === "schedule" ? "scheduled" : "draft",
      channels: cChannels,
      category: String(data.get("category")) as Announcement["category"],
      pinned: cPinned,
      readPct: cWhen === "now" ? 0 : undefined,
    };
    setRows((prev) => [a, ...prev]);
    setCreated(n);
    setComposeOpen(false);
    setStatus("");
    const size = audienceSize(a);
    toast({
      title: a.status === "published" ? "Announcement published" : a.status === "scheduled" ? "Announcement scheduled" : "Draft saved",
      body: `${a.title} · ${a.audienceLabel} · ${groupIndian(size)} learners${a.status === "scheduled" ? ` · ${formatAccaDate(a.publishedOn)} ${String(data.get("scheduleTime") || "09:00")}` : ""}`,
    });
  };

  const setAnnouncementStatus = (a: Announcement, next: Announcement["status"]) => {
    setRows((prev) => prev.map((x) => (x.id === a.id ? { ...x, status: next, publishedOn: next === "published" ? ACCA_TODAY : x.publishedOn, readPct: next === "published" ? (x.readPct ?? 0) : x.readPct } : x)));
    toast({
      title: next === "published" ? "Announcement published" : "Moved back to drafts",
      body: `${a.title} · ${a.audienceLabel}`,
      tone: next === "published" ? "success" : "info",
    });
  };

  const togglePin = (a: Announcement) => {
    setRows((prev) => prev.map((x) => (x.id === a.id ? { ...x, pinned: !x.pinned } : x)));
    toast({ title: a.pinned ? "Unpinned" : "Pinned to the top of learners' feeds", body: a.title, tone: "info" });
  };

  const counts = {
    published: rows.filter((a) => a.status === "published").length,
    scheduled: rows.filter((a) => a.status === "scheduled").length,
    draft: rows.filter((a) => a.status === "draft").length,
    read: (() => {
      const withRead = rows.filter((a) => a.status === "published" && a.readPct != null && a.readPct > 0);
      return withRead.length ? Math.round(withRead.reduce((s, a) => s + (a.readPct ?? 0), 0) / withRead.length) : 0;
    })(),
  };

  const columns: DataTableColumn<Announcement>[] = [
    {
      key: "title",
      header: "Announcement",
      sortable: true,
      render: (a) => (
        <span className="block max-w-[22rem]">
          <span className="flex items-center gap-1.5">
            {a.pinned ? <Pin aria-label="Pinned" className="size-3.5 shrink-0 text-ink" /> : null}
            <span className="truncate font-semibold text-ink">{a.title}</span>
          </span>
          <span className="block truncate text-[12px] text-ink-3">
            {a.category} · {staffName(a.authorId)}
          </span>
        </span>
      ),
    },
    {
      key: "audience",
      header: "Audience",
      sortable: true,
      sortValue: (a) => a.audienceLabel,
      render: (a) => (
        <span className="block max-w-[16rem]">
          <Badge tone={a.audience === "all" ? "dark" : a.audience === "university" ? "info" : "neutral"}>{AUDIENCE_LABEL[a.audience]}</Badge>
          <span className="mt-0.5 block truncate text-[12px] text-ink-3">{a.audience === "all" ? `${TOTAL_LEARNERS} learners` : a.audienceLabel}</span>
        </span>
      ),
    },
    {
      key: "channels",
      header: "Channels",
      render: (a) => (
        <span className="flex gap-1">
          {CHANNELS.filter((c) => a.channels.includes(c.id)).map((c) => (
            <span key={c.id} title={c.label} className="grid size-7 place-items-center rounded-full border border-line bg-surface-2 text-ink-2">
              <c.icon className="size-3.5" />
              <span className="sr-only">{c.label}</span>
            </span>
          ))}
        </span>
      ),
    },
    { key: "schedule", header: "Schedule", sortable: true, sortValue: (a) => a.publishedOn, render: (a) => scheduleLabel(a) },
    { key: "status", header: "Status", sortable: true, render: (a) => <StatusPill status={a.status} /> },
    {
      key: "read",
      header: "Read",
      sortable: true,
      sortValue: (a) => a.readPct ?? -1,
      render: (a) =>
        a.status === "published" && a.readPct != null ? (
          <span className="flex min-w-[7rem] items-center gap-2">
            <Progress value={a.readPct} tone="brand" className="w-16" />
            <span className="font-mono text-[12px] text-ink-2 tnum">{a.readPct}%</span>
          </span>
        ) : (
          <span className="text-ink-3">Not sent</span>
        ),
    },
  ];

  /* resources */
  const [resources, setResources] = useState<Resource[]>(programmeResources.map((r) => ({ ...r, status: "published" as const })));
  const [kind, setKind] = useState("");
  const [resAudience, setResAudience] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<string[]>([]);
  const [uploadKey, setUploadKey] = useState(0);

  const visibleResources = resources.filter((r) => (!kind || r.kind === kind) && (!resAudience || r.audience === resAudience));

  const submitUpload = (data: FormData) => {
    if (uploadFiles.length === 0) {
      toast({ title: "Choose a file to upload", tone: "warning" });
      return;
    }
    const file = uploadFiles[0];
    const title = String(data.get("title") ?? "").trim() || file.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
    const ext = file.split(".").pop()?.toUpperCase() ?? "PDF";
    const r: Resource = {
      id: `res-new-${resources.length + 1}`,
      title,
      kind: String(data.get("kind")),
      audience: String(data.get("audience")),
      owner: persona.staffId ?? "st-priya",
      updated: ACCA_TODAY,
      size: ext === "PDF" ? "PDF" : ext,
      downloads: 0,
      status: "published",
    };
    setResources((prev) => [r, ...prev]);
    setUploadOpen(false);
    setUploadFiles([]);
    setUploadKey((k) => k + 1);
    toast({
      title: "Resource uploaded",
      body: `${title} · ${r.audience}${data.get("notify") === "on" ? " · learners notified in-app" : ""}`,
    });
  };

  const resourceColumns: DataTableColumn<Resource>[] = [
    {
      key: "title",
      header: "Resource",
      sortable: true,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-surface-2 text-ink-2">
            <FileText aria-hidden className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block max-w-[18rem] truncate font-semibold text-ink">{r.title}</span>
            <span className="block text-[12px] text-ink-3">
              {r.size} · updated {formatAccaDate(r.updated)}
            </span>
          </span>
        </span>
      ),
    },
    { key: "kind", header: "Type", sortable: true, render: (r) => <Badge tone={r.kind === "Policy" ? "amber" : r.kind === "Timetable" ? "info" : "neutral"}>{r.kind}</Badge> },
    {
      key: "audience",
      header: "Audience",
      sortable: true,
      render: (r) => (
        <span title={canEdit ? undefined : reason} className="block w-56">
          <Select
            aria-label={`Audience for ${r.title}`}
            value={r.audience}
            disabled={!canEdit}
            onChange={(e) => {
              const next = e.target.value;
              setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, audience: next } : x)));
              toast({ title: "Audience updated", body: `${r.title} · ${next}` });
            }}
          >
            {(RESOURCE_AUDIENCES.includes(r.audience) ? RESOURCE_AUDIENCES : [r.audience, ...RESOURCE_AUDIENCES]).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </span>
      ),
    },
    { key: "owner", header: "Owner", sortable: true, sortValue: (r) => staffName(r.owner), render: (r) => staffName(r.owner) },
    { key: "downloads", header: "Downloads", align: "right", mono: true, sortable: true },
    { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} size="sm" /> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r) => (
        <span className="flex justify-end gap-1.5">
          <Button size="xs" variant="ghost" onClick={() => toast({ title: `Downloading ${r.title}`, body: r.size, tone: "info" })}>
            <Download className="size-3.5" />
            Download
          </Button>
          <GatedButton
            allowed={canEdit}
            reason={reason}
            size="xs"
            variant="outline"
            onClick={() => {
              const next = r.status === "published" ? "archived" : "published";
              setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)));
              toast({ title: next === "archived" ? "Resource archived" : "Resource restored", body: r.title, tone: "info" });
            }}
          >
            {r.status === "published" ? "Archive" : "Restore"}
          </GatedButton>
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Operations"
        title="Announcements & resources"
        sub="Manage announcements to learners by programme, cohort or university, and manage programme resources such as timetables, exam guides and fee policies."
        badge={canEdit ? undefined : <ViewOnlyChip reason={reason} />}
        actions={
          <>
            <GatedButton allowed={canEdit} reason={reason} variant="secondary" onClick={() => setUploadOpen(true)}>
              <Upload className="size-4" />
              Upload resource
            </GatedButton>
            <GatedButton allowed={canEdit} reason={reason} onClick={() => openCompose()}>
              <Send className="size-4" />
              Compose announcement
            </GatedButton>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "announcements", label: "Manage announcements", count: rows.length },
          { id: "resources", label: "Manage programme resources", count: resources.length },
        ]}
      />

      {tab === "announcements" ? (
        <div className="space-y-5">
          <KpiRow cols={4}>
            <KpiTile label="Published" value={counts.published} tone="jade" icon={<Send />} />
            <KpiTile label="Scheduled" value={counts.scheduled} tone="amber" icon={<Bell />} />
            <KpiTile label="Drafts" value={counts.draft} icon={<FileText />} />
            <KpiTile label="Average read rate" value={`${counts.read}%`} sub="published with read data" tone="info" icon={<Mail />} />
          </KpiRow>
          <DataTable
            caption="Announcements"
            rows={visible}
            columns={columns}
            getRowId={(a) => a.id}
            search={{ placeholder: "Search announcements", match: (a, q) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q) || a.audienceLabel.toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(status || audience || category)}
                onClear={() => {
                  setStatus("");
                  setAudience("");
                  setCategory("");
                }}
              >
                <FilterSelect
                  label="Status"
                  allLabel="All"
                  value={status}
                  onChange={setStatus}
                  options={[
                    { value: "published", label: "Published" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "draft", label: "Draft" },
                  ]}
                />
                <FilterSelect
                  label="Audience"
                  allLabel="All"
                  value={audience}
                  onChange={setAudience}
                  options={(Object.keys(AUDIENCE_LABEL) as AnnouncementAudience[]).map((k) => ({ value: k, label: AUDIENCE_LABEL[k] }))}
                />
                <FilterSelect label="Category" allLabel="All" value={category} onChange={setCategory} options={CATEGORIES} />
              </FilterBar>
            }
            onRowClick={(a) => setOpenId(a.id)}
            rowLabel={(a) => `Open ${a.title}`}
            rowClassName={(a) => (a.id.startsWith("an-new-") ? "bg-cta-soft" : undefined)}
          />
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-4.5">
            <div className="min-w-0">
              <p className="text-[14.5px] font-bold text-ink">Programme resources library</p>
              <p className="text-[12.5px] text-ink-3">Timetables, exam guides, fee policies and templates. Each resource is shown only to its audience.</p>
            </div>
            <GatedButton allowed={canEdit} reason={reason} size="sm" onClick={() => setUploadOpen(true)}>
              <Plus className="size-4" />
              Upload resource
            </GatedButton>
          </Card>
          <DataTable
            caption="Programme resources"
            rows={visibleResources}
            columns={resourceColumns}
            getRowId={(r) => r.id}
            search={{ placeholder: "Search resources", match: (r, q) => r.title.toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(kind || resAudience)}
                onClear={() => {
                  setKind("");
                  setResAudience("");
                }}
              >
                <FilterSelect label="Type" allLabel="All" value={kind} onChange={setKind} options={RESOURCE_KINDS} />
                <FilterSelect label="Audience" allLabel="All" value={resAudience} onChange={setResAudience} options={[...new Set(resources.map((r) => r.audience))]} />
              </FilterBar>
            }
            rowClassName={(r) => (r.status === "archived" ? "opacity-60" : r.id.startsWith("res-new-") ? "bg-cta-soft" : undefined)}
          />
        </div>
      )}

      {/* ------------------------------------------------------------------ compose */}
      <FormDrawer
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        title="Compose announcement"
        sub="Choose the audience and channels, check the preview, then publish, schedule or save a draft."
        submitLabel={cWhen === "now" ? "Publish now" : cWhen === "schedule" ? "Schedule" : "Save draft"}
        disabled={!canEdit}
        disabledReason={reason}
        footerNote={`${groupIndian(audienceSize({ audience: cAudience, audienceId: cTarget }))} learners`}
        width="w-full max-w-xl"
        onSubmit={submitCompose}
      >
        <Field label="Title">
          <Input name="title" required value={cTitle} onChange={(e) => setCTitle(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea name="body" rows={4} required value={cBody} onChange={(e) => setCBody(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Audience">
            <Select
              name="audience"
              value={cAudience}
              onChange={(e) => {
                const next = e.target.value as AnnouncementAudience;
                setCAudience(next);
                setCTarget(next === "programme" ? programmes[0].id : next === "cohort" ? allCohorts[0].id : next === "university" ? universities[0].id : "");
              }}
            >
              <option value="all">All learners</option>
              <option value="programme">A programme</option>
              <option value="cohort">A cohort</option>
              <option value="university">A university</option>
            </Select>
          </Field>
          {cAudience === "all" ? (
            <Field label="Reach">
              <Input readOnly value={`${TOTAL_LEARNERS} learners across 6 programmes`} />
            </Field>
          ) : (
            <Field label={cAudience === "programme" ? "Programme" : cAudience === "cohort" ? "Cohort" : "University"}>
              <Select name="target" value={cTarget} onChange={(e) => setCTarget(e.target.value)}>
                {targetOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Category">
            <Select name="category" defaultValue="Academic">
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end pb-2">
            <Switch checked={cPinned} onChange={setCPinned} label="Pin to the top" />
          </div>
        </div>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Channels</legend>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const on = cChannels.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setCChannels((l) => (on ? l.filter((x) => x !== c.id) : [...l, c.id]))}
                  className={cn(
                    "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-[12.5px] font-semibold transition-colors",
                    on ? "border-ink bg-cta-soft text-ink" : "border-line bg-surface text-ink-3 hover:text-ink",
                  )}
                >
                  <c.icon className="size-3.5" />
                  {c.label}
                </button>
              );
            })}
          </div>
          {cChannels.includes("sms") ? <p className="mt-2 text-[12px] text-amber">SMS is paused on the platform. SMS copies will queue until it is resumed.</p> : null}
        </fieldset>
        <div>
          <p className="mb-2 text-[12.5px] font-semibold text-ink-2">When</p>
          <Segmented
            size="sm"
            value={cWhen}
            onChange={setCWhen}
            items={[
              { id: "now", label: "Publish now" },
              { id: "schedule", label: "Schedule" },
              { id: "draft", label: "Save as draft" },
            ]}
          />
          {cWhen === "schedule" ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <Field label="Date">
                <Input name="scheduleDate" type="date" defaultValue="2026-09-16" min={ACCA_TODAY} />
              </Field>
              <Field label="Time (IST)">
                <Input name="scheduleTime" type="time" defaultValue="09:00" />
              </Field>
            </div>
          ) : null}
        </div>
        <div className="min-w-0 rounded-[16px] border border-dashed border-line-strong bg-paper p-3.5">
          <MiniLabel className="mb-3">Preview</MiniLabel>
          <AnnouncementPreview title={cTitle} body={cBody} audienceLabel={cAudienceLabel} channels={cChannels} author={persona.name} />
        </div>
      </FormDrawer>

      {/* ------------------------------------------------------------------ detail */}
      <Drawer
        open={Boolean(open)}
        onClose={() => setOpenId(null)}
        title={open?.title ?? "Announcement"}
        sub={open ? `${open.audienceLabel} · ${open.category}` : undefined}
        width="w-full max-w-lg"
        footer={
          open ? (
            <>
              <GatedButton allowed={canEdit} reason={reason} size="sm" variant="ghost" onClick={() => togglePin(open)}>
                <Pin className="size-3.5" />
                {open.pinned ? "Unpin" : "Pin"}
              </GatedButton>
              <GatedButton allowed={canEdit} reason={reason} size="sm" variant="outline" onClick={() => openCompose(open)}>
                Duplicate
              </GatedButton>
              {open.status === "published" ? (
                <GatedButton allowed={canEdit} reason={reason} size="sm" variant="secondary" onClick={() => setAnnouncementStatus(open, "draft")}>
                  Unpublish
                </GatedButton>
              ) : (
                <GatedButton allowed={canEdit} reason={reason} size="sm" onClick={() => setAnnouncementStatus(open, "published")}>
                  <Send className="size-3.5" />
                  Publish now
                </GatedButton>
              )}
            </>
          ) : null
        }
      >
        {open ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap gap-1.5">
              <StatusPill status={open.status} />
              {open.pinned ? <StatusPill status="Pinned" tone="cta" /> : null}
            </div>
            <AnnouncementPreview title={open.title} body={open.body} audienceLabel={open.audienceLabel} channels={open.channels} author={staffName(open.authorId)} />
            <dl>
              <DataRow label="Audience">
                {AUDIENCE_LABEL[open.audience]} · {groupIndian(audienceSize(open))} learners
              </DataRow>
              <DataRow label="Channels">{CHANNELS.filter((c) => open.channels.includes(c.id)).map((c) => c.label).join(", ") || "None"}</DataRow>
              <DataRow label="Schedule">{scheduleLabel(open)}</DataRow>
              <DataRow label="Author">{staffName(open.authorId)}</DataRow>
              <DataRow label="Read">{open.status === "published" && open.readPct != null ? `${open.readPct}%` : "Not sent yet"}</DataRow>
            </dl>
          </div>
        ) : null}
      </Drawer>

      {/* ------------------------------------------------------------------ upload */}
      <FormDrawer
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setUploadFiles([]);
          setUploadKey((k) => k + 1);
        }}
        title="Upload resource"
        sub="Add a timetable, exam guide, fee policy or template to the programme resources library."
        submitLabel="Upload"
        disabled={!canEdit}
        disabledReason={reason}
        onSubmit={submitUpload}
      >
        <FileDrop
          key={uploadKey}
          label="File"
          initialFiles={uploadFiles}
          accept=".pdf,.xlsx,.docx,.pptx"
          hint="PDF, XLSX, DOCX or PPTX up to 20 MB."
          multiple={false}
          onFiles={(all) => setUploadFiles(all)}
          disabled={!canEdit}
          disabledReason={reason}
        />
        {uploadFiles.length === 0 ? (
          <Button type="button" size="sm" variant="outline" onClick={() => {
              setUploadFiles(["Mar-2027-exam-entry-timeline.pdf"]);
              setUploadKey((k) => k + 1);
            }}>
            <FileText className="size-4" />
            Use a sample file
          </Button>
        ) : (
          <p className="flex items-center gap-2 rounded-[12px] border border-line bg-surface-2 px-3.5 py-2.5 text-[12.5px] text-ink-2">
            <FileText aria-hidden className="size-4 shrink-0" />
            <span className="min-w-0 truncate">Ready to upload: {uploadFiles[0]}</span>
          </p>
        )}
        <Field label="Title" hint="Defaults to the file name">
          <Input name="title" placeholder="e.g. Mar 2027 exam entry timeline" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type">
            <Select name="kind" defaultValue="Timetable">
              {RESOURCE_KINDS.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </Select>
          </Field>
          <Field label="Audience">
            <Select name="audience" defaultValue="All learners">
              {RESOURCE_AUDIENCES.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Checkbox name="notify" defaultChecked label="Notify the audience in-app" />
      </FormDrawer>
    </div>
  );
}
