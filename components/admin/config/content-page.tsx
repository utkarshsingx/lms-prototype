"use client";

import { useMemo, useState } from "react";
import { Archive, CheckCircle2, Download, FileWarning, HardDrive, LibraryBig, Plus, RotateCcw, Send, UploadCloud } from "lucide-react";
import {
  CONTENT_TYPE_LABELS,
  contentItems,
  formatAccaDate,
  groupIndian,
  paperByCode,
  staff,
  staffName,
  subjectById,
  universities,
  type ContentItem,
  type ContentStatus,
  type ContentType,
  type PaperCode,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, toneFill, type StatusTone } from "@/components/ui/status";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Drawer } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { Timeline } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { AdminConfigFrame, BlockHeading, MiniLabel, queueExport } from "./shared";

type RepoStatus = ContentStatus | "archived";
type ContentRow = Omit<ContentItem, "status"> & { status: RepoStatus };

const STATUS_OPTIONS: { value: RepoStatus; label: string }[] = [
  { value: "published", label: "Published" },
  { value: "in-review", label: "In review" },
  { value: "draft", label: "Draft" },
  { value: "outdated", label: "Outdated" },
  { value: "archived", label: "Archived" },
];

const STORAGE: { label: string; gb: number; tone: StatusTone }[] = [
  { label: "Class recordings", gb: 1120, tone: "info" },
  { label: "Lesson videos", gb: 512, tone: "violet" },
  { label: "Study material and documents", gb: 96, tone: "jade" },
  { label: "Proctoring recordings", gb: 88, tone: "amber" },
  { label: "Exports and backups", gb: 44, tone: "neutral" },
];
const STORAGE_QUOTA_GB = 3000;

const papersInRepo = Array.from(new Set(contentItems.map((c) => c.paper)));

export function ContentRepositoryPage() {
  const [rows, setRows] = useState<ContentRow[]>(contentItems);
  const [paper, setPaper] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [variant, setVariant] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newPaper, setNewPaper] = useState<PaperCode>("FR");
  const [newFiles, setNewFiles] = useState<string[]>([]);

  const visible = rows.filter(
    (r) =>
      (!paper || r.paper === paper) &&
      (!type || r.type === type) &&
      (!status || r.status === status) &&
      (!variant ||
        (variant === "core" ? r.variant === null : variant === "any" ? r.variant !== null : r.variant?.universityId === variant)),
  );
  const open = rows.find((r) => r.id === openId) ?? null;

  const setStatusFor = (ids: string[], next: RepoStatus) =>
    setRows((list) => list.map((r) => (ids.includes(r.id) ? { ...r, status: next, updated: "2026-09-14" } : r)));

  const count = (s: RepoStatus) => rows.filter((r) => r.status === s).length;

  const health = useMemo(() => {
    const byPaper = (p: PaperCode, t: ContentType) => rows.filter((r) => r.paper === p && r.type === t && r.status !== "archived").length;
    return {
      outdated: rows.filter((r) => r.status === "outdated"),
      missingModelAnswers: papersInRepo.filter((p) => byPaper(p, "model-answer") === 0),
      missingTranscripts: papersInRepo
        .map((p) => ({ paper: p, videos: byPaper(p, "video"), transcripts: byPaper(p, "transcript") }))
        .filter((x) => x.videos > x.transcripts),
      staleReviews: rows.filter((r) => r.status === "in-review" && r.updated < "2026-09-07"),
    };
  }, [rows]);

  const usedGb = STORAGE.reduce((s, x) => s + x.gb, 0);

  const columns: DataTableColumn<ContentRow>[] = [
    {
      key: "title",
      header: "Content",
      sortable: true,
      render: (r) => (
        <span className="block max-w-80 min-w-56">
          <span className="block truncate font-semibold text-ink">{r.title}</span>
          <span className="block truncate text-[12px] text-ink-3">
            {r.module} · {r.lesson}
          </span>
        </span>
      ),
    },
    { key: "paper", header: "Paper", mono: true, sortable: true },
    { key: "type", header: "Type", sortable: true, render: (r) => CONTENT_TYPE_LABELS[r.type] },
    { key: "syllabusArea", header: "Area", mono: true, render: (r) => `${r.paper} ${r.syllabusArea}` },
    {
      key: "variant",
      header: "University variant",
      sortValue: (r) => r.variant?.label ?? "",
      sortable: true,
      render: (r) => (r.variant ? <Badge tone="info">{r.variant.label}</Badge> : <span className="text-ink-3">Core</span>),
    },
    { key: "version", header: "Version", mono: true, sortable: true },
    { key: "owner", header: "Owner", sortable: true, sortValue: (r) => staffName(r.authorId), render: (r) => staffName(r.authorId) },
    { key: "status", header: "Status", sortable: true, render: (r) => <StatusPill status={r.status} /> },
    { key: "updated", header: "Updated", sortable: true, render: (r) => formatAccaDate(r.updated) },
    { key: "views", header: "Views", align: "right", mono: true, sortable: true },
  ];

  return (
    <AdminConfigFrame>
      <PageHeader
        eyebrow="Academic framework"
        title="Content repository"
        sub="Manage central content repository: every paper's videos, study material, examiner reports, model answers and university variants, with version, owner and review status."
        actions={
          <>
            <Button variant="outline" onClick={() => queueExport("content-repository.csv")}>
              <Download className="size-4" />
              Export catalogue
            </Button>
            <Button onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add content
            </Button>
          </>
        }
      />

      <KpiRow cols={5}>
        <KpiTile hero label="Items in repository" value={rows.length} sub={`${papersInRepo.length} papers`} icon={<LibraryBig />} />
        <KpiTile label="Published" value={count("published")} tone="jade" />
        <KpiTile label="In review" value={count("in-review")} tone="amber" />
        <KpiTile label="Outdated" value={count("outdated")} tone="rose" goodWhen="down" />
        <KpiTile label="University variants" value={rows.filter((r) => r.variant).length} tone="info" sub="Brightwater and Coastline" />
      </KpiRow>

      <section className="space-y-4">
        <BlockHeading title="Repository browser" sub="Select rows to publish or archive in bulk. Open a row for its version history and university subject mapping." />
        <DataTable
          caption="Central content repository"
          rows={visible}
          columns={columns}
          getRowId={(r) => r.id}
          initialSort={{ key: "updated", dir: "desc" }}
          onRowClick={(r) => setOpenId(r.id)}
          rowLabel={(r) => `Open ${r.title}`}
          search={{
            placeholder: "Search title, module or lesson",
            match: (r, q) => `${r.title} ${r.module} ${r.lesson}`.toLowerCase().includes(q),
          }}
          filters={
            <FilterBar
              active={Boolean(paper || type || status || variant)}
              onClear={() => {
                setPaper("");
                setType("");
                setStatus("");
                setVariant("");
              }}
            >
              <FilterSelect label="Paper" value={paper} onChange={setPaper} allLabel="All" options={papersInRepo} />
              <FilterSelect
                label="Type"
                value={type}
                onChange={setType}
                allLabel="All"
                options={Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <FilterSelect label="Status" value={status} onChange={setStatus} allLabel="All" options={STATUS_OPTIONS} />
              <FilterSelect
                label="University variant"
                value={variant}
                onChange={setVariant}
                allLabel="All"
                options={[
                  { value: "core", label: "Core content only" },
                  { value: "any", label: "Any university variant" },
                  ...universities.map((u) => ({ value: u.id, label: u.shortName })),
                ]}
              />
            </FilterBar>
          }
          selectable
          bulkActions={(ids, clear) => (
            <>
              <Button
                size="sm"
                onClick={() => {
                  setStatusFor(ids, "published");
                  toast({ title: `${ids.length} ${ids.length === 1 ? "item" : "items"} published`, body: "Learners see the new versions from their next lesson load." });
                  clear();
                }}
              >
                <Send className="size-3.5" />
                Publish
              </Button>
              <Button
                size="sm"
                variant="inverse"
                onClick={() => {
                  setStatusFor(ids, "archived");
                  toast({ title: `${ids.length} ${ids.length === 1 ? "item" : "items"} archived`, body: "Archived items leave lesson players but stay in the repository.", tone: "info" });
                  clear();
                }}
              >
                <Archive className="size-3.5" />
                Archive
              </Button>
            </>
          )}
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <FileWarning className="size-4 text-ink-3" />
                Content health
              </span>
            }
            sub="Checks run nightly across the repository."
          />
          <div className="space-y-5 border-t border-line p-5">
            <div>
              <MiniLabel>Outdated content · {health.outdated.length}</MiniLabel>
              {health.outdated.length ? (
                <ul className="mt-2.5 divide-y divide-line rounded-[14px] border border-line">
                  {health.outdated.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1 basis-56">
                        <p className="text-[13.5px] font-semibold text-ink">
                          <span className="mr-1.5 font-mono text-ink-3">{r.paper}</span>
                          {r.title}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-2">{r.outdatedReason}</p>
                      </div>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setStatusFor([r.id], "in-review");
                          toast({ title: "Correction assigned", body: `${r.title} · ${staffName(r.authorId)}` });
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        Assign correction
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 flex items-center gap-2 text-[13px] text-jade">
                  <CheckCircle2 className="size-4" />
                  No outdated content
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-[14px] border border-line p-4">
                <MiniLabel>Missing model answers</MiniLabel>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {health.missingModelAnswers.map((p) => (
                    <StatusPill key={p} status="missing" tone="rose" size="sm">
                      {p}
                    </StatusPill>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-ink-3">Papers with lessons but no model answer yet.</p>
              </div>
              <div className="min-w-0 rounded-[14px] border border-line p-4">
                <MiniLabel>Videos without transcripts</MiniLabel>
                <ul className="mt-2 space-y-1 text-[13px] text-ink-2">
                  {health.missingTranscripts.map((x) => (
                    <li key={x.paper} className="flex justify-between gap-2">
                      <span className="font-mono font-semibold text-ink">{x.paper}</span>
                      <span className="tnum">
                        {x.videos - x.transcripts} of {x.videos} videos
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="text-[12.5px] text-ink-3">
              {health.staleReviews.length} {health.staleReviews.length === 1 ? "item has" : "items have"} waited in review for more than 7 days.
            </p>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <HardDrive className="size-4 text-ink-3" />
                Storage usage
              </span>
            }
            sub="Amazon S3 (Mumbai), encrypted at rest."
          />
          <div className="space-y-4 border-t border-line p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-display text-[28px] leading-none font-bold text-ink tnum">
                {(usedGb / 1000).toFixed(2)} TB
                <span className="ml-1.5 text-[14px] font-semibold text-ink-3">of {STORAGE_QUOTA_GB / 1000} TB</span>
              </p>
              <Badge tone="amber">{Math.round((usedGb / STORAGE_QUOTA_GB) * 100)}% used</Badge>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2" role="img" aria-label={`${usedGb} GB used of ${STORAGE_QUOTA_GB} GB`}>
              {STORAGE.map((s) => (
                <span key={s.label} className={cn("h-full", toneFill[s.tone])} style={{ width: `${(s.gb / STORAGE_QUOTA_GB) * 100}%` }} />
              ))}
            </div>
            <ul className="space-y-2">
              {STORAGE.map((s) => (
                <li key={s.label} className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex min-w-0 items-center gap-2 text-ink-2">
                    <span className={cn("size-2.5 shrink-0 rounded-full", toneFill[s.tone])} />
                    <span className="truncate">{s.label}</span>
                  </span>
                  <span className="font-mono text-ink tnum">{groupIndian(s.gb)} GB</span>
                </li>
              ))}
            </ul>
            <p className="text-[12px] text-ink-3">Class recordings older than 3 years move to archive storage automatically.</p>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => toast({ title: "Storage clean-up queued", body: "Archived drafts and orphaned uploads will be removed tonight.", tone: "info" })}
            >
              Run storage clean-up
            </Button>
          </div>
        </Card>
      </div>

      <Drawer
        open={open !== null}
        onClose={() => setOpenId(null)}
        width="w-full max-w-lg"
        title={open?.title ?? "Content"}
        sub={open ? `${open.paper} · ${CONTENT_TYPE_LABELS[open.type]} · ${open.version}` : undefined}
        footer={
          open ? (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setStatusFor([open.id], "outdated");
                  toast({ title: "Marked as outdated", body: open.title, tone: "warning" });
                }}
              >
                Mark outdated
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFor([open.id], "archived");
                  toast({ title: "Archived", body: open.title, tone: "info" });
                }}
              >
                <Archive className="size-4" />
                Archive
              </Button>
              <Button
                onClick={() => {
                  setStatusFor([open.id], "published");
                  toast({ title: "Published", body: `${open.title} ${open.version}` });
                }}
              >
                <Send className="size-4" />
                Publish
              </Button>
            </>
          ) : null
        }
      >
        {open ? (
          <div className="space-y-5 px-5 py-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={open.status} />
              {open.variant ? <Badge tone="info">{open.variant.label}</Badge> : <Badge>Core content</Badge>}
            </div>
            <dl className="grid grid-cols-2 gap-4 text-[13px]">
              {[
                ["Module", open.module],
                ["Lesson", open.lesson],
                ["Syllabus area", `${open.paper} ${open.syllabusArea} · ${paperByCode(open.paper)?.syllabusAreas.find((a) => a.code === open.syllabusArea)?.title ?? ""}`],
                ["Size", open.size],
                ["Owner", staffName(open.authorId)],
                ["Reviewer", open.reviewerId ? staffName(open.reviewerId) : "Not assigned"],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[12px] text-ink-3">{label}</dt>
                  <dd className="mt-0.5 font-semibold break-words text-ink">{value}</dd>
                </div>
              ))}
            </dl>
            {open.outdatedReason ? (
              <p className="rounded-[12px] border border-line bg-rose-soft px-3.5 py-2.5 text-[13px] text-rose">{open.outdatedReason}</p>
            ) : null}
            <div>
              <MiniLabel>Mapped university subjects</MiniLabel>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {open.universitySubjectIds.length ? (
                  open.universitySubjectIds.map((id) => {
                    const s = subjectById(id);
                    return (
                      <Badge key={id}>
                        {s ? `${s.code} ${s.name}` : id}
                      </Badge>
                    );
                  })
                ) : (
                  <span className="text-[13px] text-ink-3">Not mapped to university subjects</span>
                )}
              </div>
            </div>
            <div>
              <MiniLabel className="mb-3">Version history</MiniLabel>
              <Timeline
                dense
                items={[...open.versions].reverse().map((v) => ({
                  id: v.version,
                  title: `${v.version} · ${v.summary}`,
                  meta: `${formatAccaDate(v.date)} · ${staffName(v.authorId)}`,
                  tone: v.status === "published" ? "jade" : v.status === "outdated" ? "rose" : "amber",
                }))}
              />
            </div>
          </div>
        ) : null}
      </Drawer>

      <FormDrawer
        open={adding}
        onClose={() => {
          setAdding(false);
          setNewFiles([]);
        }}
        title="Add content to the repository"
        sub="New items start as drafts and follow the paper's review workflow."
        submitLabel="Add as draft"
        onSubmit={(data) => {
          const title = String(data.get("title") ?? "").trim();
          const variantId = String(data.get("variant") ?? "");
          const uni = universities.find((u) => u.id === variantId);
          const row: ContentRow = {
            id: `ct-new-${rows.length + 1}`,
            title,
            paper: newPaper,
            courseId: paperByCode(newPaper)?.courseId ?? "",
            module: String(data.get("module") ?? "").trim() || "Unassigned module",
            lesson: "Not linked to a lesson",
            type: String(data.get("type")) as ContentType,
            syllabusArea: String(data.get("area")),
            universitySubjectIds: [],
            variant: uni ? { universityId: uni.id, label: `${uni.shortName} variant` } : null,
            status: "draft",
            version: "v0.1",
            versions: [{ version: "v0.1", date: "2026-09-14", authorId: String(data.get("owner")), summary: newFiles.length ? `Uploaded ${newFiles.join(", ")}` : "Created in the repository", status: "draft" }],
            authorId: String(data.get("owner")),
            reviewerId: null,
            updated: "2026-09-14",
            size: newFiles.length ? `${newFiles.length} ${newFiles.length === 1 ? "file" : "files"}` : "No file yet",
            views: 0,
          };
          setRows((list) => [row, ...list]);
          toast({ title: "Content added as draft", body: `${newPaper} · ${CONTENT_TYPE_LABELS[row.type]} · ${title}` });
          setAdding(false);
          setNewFiles([]);
        }}
      >
        <Field label="Title">
          <Input name="title" required placeholder="e.g. Deferred tax walkthrough" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select value={newPaper} onChange={(e) => setNewPaper(e.target.value as PaperCode)}>
              {papersInRepo.map((p) => (
                <option key={p} value={p}>
                  {p} · {paperByCode(p)?.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Type">
            <Select name="type" defaultValue="study-material">
              {Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Syllabus area">
            <Select name="area" key={newPaper}>
              {(paperByCode(newPaper)?.syllabusAreas ?? []).map((a) => (
                <option key={a.code} value={a.code}>
                  {a.code} · {a.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Owner">
            <Select name="owner" defaultValue="st-marcus">
              {staff
                .filter((s) => s.kind === "faculty")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </Select>
          </Field>
        </div>
        <Field label="Module">
          <Input name="module" placeholder="e.g. Accounting for transactions" />
        </Field>
        <Field label="University variant">
          <Select name="variant" defaultValue="">
            <option value="">Core content (all learners)</option>
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} variant
              </option>
            ))}
          </Select>
        </Field>
        <FileDrop label="Upload file" accept=".pdf,.mp4,.docx,.pptx,.xlsx" hint="Videos up to 2 GB, documents up to 50 MB." onFiles={(all) => setNewFiles(all)} />
        <p className="flex items-center gap-2 text-[12px] text-ink-3">
          <UploadCloud className="size-3.5" />
          Files go to the repository bucket; nothing is visible to learners until published.
        </p>
      </FormDrawer>
    </AdminConfigFrame>
  );
}
