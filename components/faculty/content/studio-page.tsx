"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Eye,
  FileClock,
  GitBranch,
  Layers,
  Library,
  Link2,
  Plus,
  Send,
  Tags,
  Upload,
} from "lucide-react";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  contentItems,
  formatAccaDate,
  paperByCode,
  staffName,
  syllabusAreaTitle,
  universities,
  universityById,
  type ContentItem,
  type ContentType,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Segmented } from "@/components/ui/tabs";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { StatusPill } from "@/components/ui/status";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/toast";
import { CreateMenu } from "./create-menu";
import { CreateDrawer, type CreateRequest } from "./create-drawer";
import { BulkTagDrawer, TagDrawer, VariantDrawer } from "./item-drawers";
import {
  CREATE_CONTENT,
  CREATE_STRUCTURE,
  outlineFromCourse,
  type CreateKind,
  type PaperOutline,
} from "./outline";
import {
  ActionTile,
  PaperCodeChip,
  SubjectCodes,
  SubmitOnlyChip,
  TYPE_ICONS,
  UniversityMark,
  listPapers,
  plural,
  useAuthor,
} from "./shared";

export function ContentStudioPage() {
  const { persona } = useRole();
  // Local edits belong to one persona: switching persona starts a clean studio.
  return <Studio key={persona.id} />;
}

function Studio() {
  const author = useAuthor();
  const { papers, canPublish } = author;

  const [outlines, setOutlines] = useState<PaperOutline[]>(
    () => papers.map((p) => outlineFromCourse(p)).filter((o): o is PaperOutline => o !== null),
  );
  const [items, setItems] = useState<ContentItem[]>(contentItems);
  const [origins, setOrigins] = useState<Record<string, string>>({});

  const [scope, setScope] = useState("mine");
  const [fPaper, setFPaper] = useState("");
  const [fType, setFType] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fArea, setFArea] = useState("");
  const [fVariant, setFVariant] = useState("");

  const [create, setCreate] = useState<CreateRequest>({ kind: "video", open: false, nonce: 0 });
  const [tagging, setTagging] = useState<{ item: ContentItem; open: boolean; nonce: number } | null>(null);
  const [variant, setVariant] = useState<{ open: boolean; originalId?: string; nonce: number }>({ open: false, nonce: 0 });
  const [bulk, setBulk] = useState<{ open: boolean; mode: "area" | "subjects"; ids: string[]; nonce: number }>({
    open: false,
    mode: "area",
    ids: [],
    nonce: 0,
  });

  const openCreate = (kind: CreateKind, outlineId?: string) =>
    setCreate((c) => ({ kind, open: true, outlineId, nonce: c.nonce + 1 }));
  const openVariant = (originalId?: string) => setVariant((v) => ({ open: true, originalId, nonce: v.nonce + 1 }));
  const openBulk = (mode: "area" | "subjects", ids: string[] = []) =>
    setBulk((b) => ({ open: true, mode, ids, nonce: b.nonce + 1 }));

  const mine = useMemo(() => items.filter((i) => papers.includes(i.paper)), [items, papers]);
  const scoped = scope === "mine" ? mine : items;

  const visible = useMemo(
    () =>
      scoped.filter(
        (i) =>
          (!fPaper || i.paper === fPaper) &&
          (!fType || i.type === fType) &&
          (!fStatus || i.status === fStatus) &&
          (!fArea || i.syllabusArea === fArea) &&
          (!fVariant || (fVariant === "variant" ? i.variant !== null : i.variant === null)),
      ),
    [scoped, fPaper, fType, fStatus, fArea, fVariant],
  );

  const paperOptions = Array.from(new Set(scoped.map((i) => i.paper)));
  const areaOptions = fPaper ? (paperByCode(fPaper)?.syllabusAreas ?? []) : [];
  const filtersActive = Boolean(fPaper || fType || fStatus || fArea || fVariant);
  const clearFilters = () => {
    setFPaper("");
    setFType("");
    setFStatus("");
    setFArea("");
    setFVariant("");
  };

  const variants = scoped.filter((i) => i.variant);
  const originals = mine.filter((i) => !i.variant && i.status !== "outdated");
  const taggable = mine.filter((i) => i.status !== "outdated");
  const unmapped = mine.filter((i) => i.universitySubjectIds.length === 0);

  const originalOf = (v: ContentItem) => {
    const id = origins[v.id];
    if (id) return items.find((i) => i.id === id);
    return items.find((i) => i.paper === v.paper && i.lesson === v.lesson && !i.variant && i.id !== v.id);
  };

  /* ------------------------------------------------------------------ mutations */

  const addItems = (created: ContentItem[]) => {
    setItems((list) => [...created, ...list]);
    clearFilters();
    setScope("mine");
  };

  const setStatus = (ids: string[], status: ContentItem["status"]) =>
    setItems((list) =>
      list.map((i) =>
        ids.includes(i.id)
          ? {
              ...i,
              status,
              reviewerId: status === "in-review" ? author.reviewerId : i.reviewerId,
              versions: i.versions.map((v, n) => (n === i.versions.length - 1 ? { ...v, status } : v)),
            }
          : i,
      ),
    );

  const addLessonToOutline = (outlineId: string, moduleId: string, lesson: PaperOutline["modules"][number]["lessons"][number]) =>
    setOutlines((list) =>
      list.map((o) =>
        o.id === outlineId
          ? { ...o, modules: o.modules.map((m) => (m.id === moduleId ? { ...m, lessons: [...m.lessons, lesson] } : m)) }
          : o,
      ),
    );

  /* ------------------------------------------------------------------ table */

  const columns: DataTableColumn<ContentItem>[] = [
    {
      key: "title",
      header: "Content",
      sortable: true,
      className: "min-w-[17rem]",
      wrap: true,
      render: (i) => {
        const Icon = TYPE_ICONS[i.type];
        return (
          <span className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-2 text-ink-2">
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{i.title}</span>
              <span className="block text-[12px] text-ink-3">
                {i.module} · {i.lesson}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: "type", header: "Type", sortable: true, render: (i) => CONTENT_TYPE_LABELS[i.type] },
    { key: "paper", header: "Paper", sortable: true, render: (i) => <PaperCodeChip code={i.paper} /> },
    {
      key: "syllabusArea",
      header: "Syllabus area",
      sortable: true,
      sortValue: (i) => `${i.paper}${i.syllabusArea}`,
      render: (i) => (
        <span className="flex max-w-[15rem] min-w-0 items-center gap-1.5" title={syllabusAreaTitle(i.paper, i.syllabusArea)}>
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cta text-[11px] font-bold text-cta-ink">{i.syllabusArea}</span>
          <span className="min-w-0 truncate text-[12.5px] text-ink-2">{syllabusAreaTitle(i.paper, i.syllabusArea)}</span>
        </span>
      ),
    },
    { key: "subjects", header: "University subjects", render: (i) => <SubjectCodes ids={i.universitySubjectIds} /> },
    {
      key: "variant",
      header: "Variant",
      sortValue: (i) => i.variant?.label ?? "",
      sortable: true,
      render: (i) => {
        const u = i.variant ? universityById(i.variant.universityId) : undefined;
        return u ? (
          <span className="inline-flex items-center gap-1.5">
            <UniversityMark university={u} className="size-5 text-[8.5px]" />
            <span className="text-[12.5px] text-ink-2">{i.variant?.label}</span>
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">Original</span>
        );
      },
    },
    { key: "version", header: "Version", mono: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (i) => <StatusPill status={CONTENT_STATUS_LABELS[i.status]} tone={i.status === "outdated" ? "rose" : undefined} size="sm" />,
    },
    { key: "updated", header: "Updated", sortable: true, render: (i) => formatAccaDate(i.updated) },
  ];

  /* ------------------------------------------------------------------ figures */

  const published = mine.filter((i) => i.status === "published").length;
  const inReview = mine.filter((i) => i.status === "in-review").length;
  const outdated = mine.filter((i) => i.status === "outdated").length;
  const variantCount = mine.filter((i) => i.variant).length;
  const typeCount = (t: ContentType) => mine.filter((i) => i.type === t).length;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Content"
        title="Content studio"
        sub="Create papers, modules and lessons, upload videos and study material, and tag everything to the ACCA syllabus and the university subjects it supports."
        badge={
          <>
            <ScopeChip icon={<BookOpen aria-hidden />}>Your papers: {listPapers(papers)}</ScopeChip>
            {canPublish ? null : <SubmitOnlyChip />}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => openVariant()}>
              <GitBranch className="size-4" />
              Create university variant
            </Button>
            {/* First on phones, so the menu opens from the left edge and stays on screen. */}
            <CreateMenu onPick={(k) => openCreate(k)} className="order-first sm:order-none" />
          </>
        }
      />

      <KpiRow cols={5}>
        <KpiTile hero label="Content items in your papers" value={mine.length} sub={`${plural(outlines.length, "paper")} · ${listPapers(outlines.map((o) => o.code))}`} icon={<Library />} />
        <KpiTile label="Published" value={published} tone="jade" sub="Live for learners" />
        <KpiTile label="In review" value={inReview} tone="amber" sub="Waiting for a reviewer" href="/faculty/content/reviews" />
        <KpiTile label="Outdated" value={outdated} tone="rose" sub="Needs correcting" href="/faculty/content/reviews" />
        <KpiTile label="University variants" value={variantCount} tone="info" sub="Linked to an original" />
      </KpiRow>

      {/* ------------------------------------------------------------------ create tiles */}
      <Card>
        <CardHeader
          title="Create and upload"
          sub={
            canPublish
              ? "Everything you publish goes live on the paper straight away. Tick Save as draft to hold it back."
              : `Everything you create is submitted for review by ${staffName(author.reviewerId)} before learners see it.`
          }
        />
        <div className="space-y-5 border-t border-line px-5 py-5">
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">Create papers, modules and lessons</p>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {CREATE_STRUCTURE.map((c) => (
                <ActionTile key={c.kind} icon={c.icon} label={c.label} sub={c.sub} onClick={() => openCreate(c.kind)} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2.5 text-[13px] font-semibold text-ink">Upload and add content</p>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {CREATE_CONTENT.map((c) => (
                <ActionTile
                  key={c.kind}
                  icon={c.icon}
                  label={c.label}
                  sub={c.sub}
                  count={`${typeCount(c.kind)} in your papers`}
                  onClick={() => openCreate(c.kind)}
                />
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ paper cards */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">Your papers</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">Open a paper to edit its modules and lessons in the builder.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => openCreate("paper")}>
            <Plus className="size-4" />
            Create paper
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {outlines.map((o) => (
            <PaperCard
              key={o.id}
              outline={o}
              items={items.filter((i) => i.paper === o.code)}
              onAddModule={() => openCreate("module", o.id)}
              onAddLesson={() => openCreate("lesson", o.id)}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ tagging and mapping */}
      <Card>
        <CardHeader
          title="Tag, map and adapt your content"
          sub="Learners find content by syllabus area. Mapped university subjects tell B.Com students which ACCA lessons bridge what their university already teaches."
        />
        <div className="grid gap-px border-t border-line bg-line md:grid-cols-3">
          <div className="min-w-0 space-y-3 bg-surface px-5 py-4.5">
            <h3 className="text-[14px] font-bold text-ink">Tag content by ACCA syllabus area</h3>
            <ul className="space-y-2.5">
              {outlines
                .filter((o, n, all) => all.findIndex((x) => x.code === o.code) === n)
                .map((o) => {
                  const areas = paperByCode(o.code)?.syllabusAreas ?? [];
                  const tagged = new Set(mine.filter((i) => i.paper === o.code).map((i) => i.syllabusArea));
                  const count = areas.filter((a) => tagged.has(a.code)).length;
                  return (
                    <li key={o.code} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-[12.5px]">
                        <PaperCodeChip code={o.code} />
                        <span className="min-w-0 flex-1 truncate text-ink-2">
                          Content in {count} of {areas.length} syllabus areas
                        </span>
                      </div>
                      <Progress value={areas.length ? (count / areas.length) * 100 : 0} tone={count === areas.length ? "jade" : "cta"} />
                    </li>
                  );
                })}
            </ul>
            <Button size="sm" variant="secondary" onClick={() => openBulk("area")}>
              <Tags className="size-3.5" />
              Tag content
            </Button>
          </div>

          <div className="min-w-0 space-y-3 bg-surface px-5 py-4.5">
            <h3 className="text-[14px] font-bold text-ink">Map content against university subjects</h3>
            <p className="text-[12.5px] text-ink-2">
              <span className="font-display text-[22px] font-bold text-ink tnum">{mine.length - unmapped.length}</span> of {mine.length} items mapped
            </p>
            <ul className="space-y-1">
              {unmapped.slice(0, 3).map((i) => (
                <li key={i.id} className="flex min-w-0 items-center gap-2 text-[12.5px]">
                  <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-amber" />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{i.title}</span>
                  <span className="shrink-0 text-ink-3">{i.paper}</span>
                </li>
              ))}
              {unmapped.length > 3 ? <li className="pl-3.5 text-[12px] text-ink-3">and {plural(unmapped.length - 3, "more unmapped item")}</li> : null}
            </ul>
            <Button size="sm" variant="secondary" onClick={() => openBulk("subjects")} disabled={mine.length === 0}>
              <Link2 className="size-3.5" />
              Map content
            </Button>
          </div>

          <div className="min-w-0 space-y-3 bg-surface px-5 py-4.5">
            <h3 className="text-[14px] font-bold text-ink">Create university-specific content variants</h3>
            <ul className="space-y-2">
              {universities.map((u) => {
                const n = items.filter((i) => i.variant?.universityId === u.id && papers.includes(i.paper)).length;
                return (
                  <li key={u.id} className="flex min-w-0 items-center gap-2.5 text-[12.5px]">
                    <UniversityMark university={u} className="size-6 text-[9.5px]" />
                    <span className="min-w-0 flex-1 truncate text-ink-2">{u.name}</span>
                    <span className="shrink-0 font-mono text-ink tnum">{n}</span>
                  </li>
                );
              })}
            </ul>
            <Button size="sm" variant="secondary" onClick={() => openVariant()}>
              <GitBranch className="size-3.5" />
              Create university variant
            </Button>
          </div>
        </div>
      </Card>

      {/* ------------------------------------------------------------------ library */}
      <section className="space-y-3.5">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">Content library</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            Click a row to tag it by ACCA syllabus area, map it against university subjects or create a university variant.
          </p>
        </div>
        <DataTable
          caption="Content library"
          rows={visible}
          columns={columns}
          getRowId={(i) => i.id}
          search={{
            placeholder: "Search title, module or lesson",
            match: (i, q) =>
              i.title.toLowerCase().includes(q) || i.lesson.toLowerCase().includes(q) || i.module.toLowerCase().includes(q),
          }}
          filters={
            <FilterBar active={filtersActive} onClear={clearFilters}>
              <Segmented
                size="sm"
                value={scope}
                onChange={(v) => {
                  setScope(v);
                  clearFilters();
                }}
                items={[
                  { id: "mine", label: "Your papers" },
                  { id: "all", label: "All papers" },
                ]}
              />
              <FilterSelect
                label="Paper"
                allLabel="All"
                value={fPaper}
                onChange={(v) => {
                  setFPaper(v);
                  setFArea("");
                }}
                options={paperOptions}
              />
              {fPaper ? (
                <FilterSelect
                  label="Syllabus area"
                  allLabel="All"
                  value={fArea}
                  onChange={setFArea}
                  options={areaOptions.map((a) => ({ value: a.code, label: `${a.code} · ${a.title}` }))}
                />
              ) : null}
              <FilterSelect
                label="Type"
                allLabel="All"
                value={fType}
                onChange={setFType}
                options={Object.entries(CONTENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <FilterSelect
                label="Status"
                allLabel="All"
                value={fStatus}
                onChange={setFStatus}
                options={Object.entries(CONTENT_STATUS_LABELS).map(([value, label]) => ({ value, label }))}
              />
              <FilterSelect
                label="University"
                allLabel="Originals and variants"
                value={fVariant}
                onChange={setFVariant}
                options={[
                  { value: "original", label: "Originals only" },
                  { value: "variant", label: "University variants" },
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
                const own = ids.filter((id) => mine.some((i) => i.id === id && i.status !== "outdated"));
                if (own.length === 0) {
                  toast({ title: "No items in your papers selected", body: "You tag and map content in the papers assigned to you.", tone: "warning" });
                  return;
                }
                openBulk("area", own);
                clear();
              }}
            >
              <Tags className="size-3.5" />
              Tag and map selected
            </Button>
            <Button
              size="sm"
              variant="inverse"
              onClick={() => {
                const drafts = items.filter((i) => ids.includes(i.id) && i.status === "draft" && papers.includes(i.paper));
                if (drafts.length === 0) {
                  toast({ title: "No drafts in your papers selected", body: "Only your own drafts can be published or submitted.", tone: "warning" });
                  return;
                }
                setStatus(drafts.map((d) => d.id), canPublish ? "published" : "in-review");
                toast(
                  canPublish
                    ? { title: `${plural(drafts.length, "item")} published`, body: drafts.map((d) => d.title).join(", ") }
                    : { title: `${plural(drafts.length, "item")} submitted for review`, body: `${staffName(author.reviewerId)} is asked to review them.`, tone: "info" },
                );
                clear();
              }}
            >
              {canPublish ? <Upload className="size-3.5" /> : <Send className="size-3.5" />}
              {canPublish ? "Publish selected drafts" : "Submit selected for review"}
            </Button>
            </>
          )}
          onRowClick={(i) => setTagging((t) => ({ item: i, open: true, nonce: (t?.nonce ?? 0) + 1 }))}
          rowLabel={(i) => `Tag and map ${i.title}`}
          rowClassName={(i) => (i.status === "outdated" ? "bg-rose-soft/40" : undefined)}
        />
      </section>

      {/* ------------------------------------------------------------------ variants */}
      <Card>
        <CardHeader
          title="University-specific content variants"
          sub="Variants rework an original for one partner university and stay linked to it. B.Com subjects are taught by the university; variants only bridge them to ACCA."
          action={
            <Button size="sm" variant="secondary" onClick={() => openVariant()}>
              <GitBranch className="size-3.5" />
              Create university variant
            </Button>
          }
        />
        <ul className="divide-y divide-line border-t border-line">
          {variants.map((v) => {
            const u = v.variant ? universityById(v.variant.universityId) : undefined;
            const orig = originalOf(v);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => setTagging((t) => ({ item: v, open: true, nonce: (t?.nonce ?? 0) + 1 }))}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-left transition-colors hover:bg-cta-soft"
                >
                  {u ? <UniversityMark university={u} className="size-9 text-[11px]" /> : null}
                  <span className="min-w-0 flex-1 basis-60">
                    <span className="block text-[13.5px] font-semibold text-ink">{v.title}</span>
                    <span className="block text-[12px] text-ink-3">
                      {v.variant?.label} · {orig ? `variant of ${orig.title} (${orig.version})` : `based on the lesson ${v.lesson}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2">
                    <PaperCodeChip code={v.paper} />
                    <SubjectCodes ids={v.universitySubjectIds} />
                    <span className="font-mono text-[12px] text-ink-2">{v.version}</span>
                    <StatusPill status={CONTENT_STATUS_LABELS[v.status]} size="sm" />
                  </span>
                </button>
              </li>
            );
          })}
          {variants.length === 0 ? (
            <li className="px-5 py-8 text-center text-[13px] text-ink-3">
              No university variants in your papers yet. Switch the library to All papers to see other variants.
            </li>
          ) : null}
        </ul>
      </Card>

      {/* ------------------------------------------------------------------ drawers */}
      {outlines.length ? (
        <CreateDrawer
          key={`create-${create.nonce}`}
          request={create}
          onClose={() => setCreate((c) => ({ ...c, open: false }))}
          outlines={outlines}
          items={items}
          author={author}
          onCreatePaper={(o) => setOutlines((list) => [...list, o])}
          onCreateModule={(outlineId, m, at) =>
            setOutlines((list) =>
              list.map((o) => (o.id === outlineId ? { ...o, modules: [...o.modules.slice(0, at), m, ...o.modules.slice(at)] } : o)),
            )
          }
          onCreateLesson={addLessonToOutline}
          onCreateItems={addItems}
        />
      ) : null}

      {tagging ? (
        <TagDrawer
          key={`tag-${tagging.nonce}`}
          item={tagging.item}
          open={tagging.open}
          onClose={() => setTagging((t) => (t ? { ...t, open: false } : t))}
          author={author}
          onSave={(next) => setItems((list) => list.map((i) => (i.id === next.id ? next : i)))}
          onStatus={(item, status) => setStatus([item.id], status)}
          onVariant={(item) => {
            setTagging((t) => (t ? { ...t, open: false } : t));
            openVariant(item.id);
          }}
        />
      ) : null}

      {taggable.length ? (
        <BulkTagDrawer
          key={`bulk-${bulk.nonce}`}
          open={bulk.open}
          mode={bulk.mode}
          onClose={() => setBulk((b) => ({ ...b, open: false }))}
          items={taggable}
          author={author}
          initialIds={bulk.ids}
          onApply={(ids, patch) =>
            setItems((list) =>
              list.map((i) =>
                ids.includes(i.id)
                  ? {
                      ...i,
                      syllabusArea: patch.area ?? i.syllabusArea,
                      universitySubjectIds: patch.replaceSubjects
                        ? patch.subjects
                        : Array.from(new Set([...i.universitySubjectIds, ...patch.subjects])),
                    }
                  : i,
              ),
            )
          }
        />
      ) : null}

      {originals.length ? (
        <VariantDrawer
          key={`variant-${variant.nonce}`}
          open={variant.open}
          onClose={() => setVariant((v) => ({ ...v, open: false }))}
          originals={originals}
          initialOriginalId={variant.originalId}
          author={author}
          nextId={`ct-var-${items.length + 1}`}
          onCreate={(v, originalId) => {
            setItems((list) => [v, ...list]);
            setOrigins((o) => ({ ...o, [v.id]: originalId }));
            clearFilters();
            setScope("mine");
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function PaperCard({
  outline,
  items,
  onAddModule,
  onAddLesson,
}: {
  outline: PaperOutline;
  items: ContentItem[];
  onAddModule: () => void;
  onAddLesson: () => void;
}) {
  const paper = paperByCode(outline.code);
  const lessons = outline.modules.reduce((n, m) => n + m.lessons.length, 0);
  const areas = paper?.syllabusAreas ?? [];
  const tagged = new Set([
    ...items.map((i) => i.syllabusArea),
    ...outline.modules.flatMap((m) => [...m.areas, ...m.lessons.map((l) => l.area).filter((a): a is string => Boolean(a))]),
  ]);
  const covered = areas.filter((a) => tagged.has(a.code)).length;
  const subjects = new Set(items.flatMap((i) => i.universitySubjectIds)).size;
  const counts = {
    published: items.filter((i) => i.status === "published").length,
    review: items.filter((i) => i.status === "in-review").length,
    draft: items.filter((i) => i.status === "draft").length,
    outdated: items.filter((i) => i.status === "outdated").length,
  };

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 bg-surface-inv px-5 py-4">
        <div className="min-w-0">
          <p className="font-display text-[30px] leading-none font-bold tracking-[-0.03em] text-cta">{outline.code}</p>
          <p className="mt-2 truncate text-[14.5px] font-semibold text-ink-inv">{outline.title}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-inv/65">
            {paper?.levelLabel} · {outline.edition}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-ink-inv/10 px-2.5 py-1 text-[11.5px] font-semibold text-ink-inv">
          {outline.status === "in_review" ? "In review" : outline.status === "draft" ? "Draft" : "Published"}
        </span>
      </div>

      <div className="flex-1 space-y-4 px-5 py-4">
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Modules", outline.modules.length],
            ["Lessons", lessons],
            ["Content items", items.length],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">{label}</dt>
              <dd className="mt-0.5 font-display text-[22px] leading-none font-bold text-ink tnum">{value}</dd>
            </div>
          ))}
        </dl>

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
            <span className="font-semibold text-ink-2">Syllabus areas tagged</span>
            <span className="text-ink-3 tnum">
              {covered} of {areas.length}
            </span>
          </div>
          <Progress value={areas.length ? (covered / areas.length) * 100 : 0} tone={covered === areas.length ? "jade" : "cta"} />
          <div className="mt-2 flex flex-wrap gap-1">
            {areas.map((a) => (
              <span
                key={a.code}
                title={a.title}
                className={cn(
                  "grid size-6 place-items-center rounded-full text-[11px] font-bold",
                  tagged.has(a.code) ? "bg-nav-active text-nav-active-ink" : "border border-dashed border-line-strong text-ink-3",
                )}
              >
                {a.code}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <StatusPill status="Published" size="sm">
            {counts.published} published
          </StatusPill>
          {counts.review ? (
            <StatusPill status="In review" size="sm">
              {counts.review} in review
            </StatusPill>
          ) : null}
          {counts.draft ? (
            <StatusPill status="Draft" size="sm">
              {counts.draft} draft
            </StatusPill>
          ) : null}
          {counts.outdated ? (
            <StatusPill status="Outdated" tone="rose" size="sm">
              {counts.outdated} outdated
            </StatusPill>
          ) : null}
          <StatusPill status="Mapped" tone="info" size="sm" dot={false}>
            {plural(subjects, "university subject")} mapped
          </StatusPill>
        </div>

        <ol className="space-y-1.5 border-t border-line pt-3">
          {outline.modules.slice(0, 4).map((m, i) => (
            <li key={m.id} className="flex min-w-0 items-center gap-2 text-[12.5px]">
              <span className="grid size-5 shrink-0 place-items-center rounded-[var(--radius-xs)] bg-surface-2 font-mono text-[10.5px] text-ink-2">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-ink-2">{m.title}</span>
              <span className="shrink-0 text-ink-3 tnum">{plural(m.lessons.length, "lesson")}</span>
            </li>
          ))}
          {outline.modules.length > 4 ? (
            <li className="pl-7 text-[12px] text-ink-3">and {plural(outline.modules.length - 4, "more module")}</li>
          ) : null}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3">
        {outline.slug ? (
          <LinkButton href={`/faculty/content/${outline.slug}`} size="sm">
            Open paper builder <ArrowRight className="size-3.5" />
          </LinkButton>
        ) : (
          <Button size="sm" onClick={onAddLesson} disabled={outline.modules.length === 0}>
            <Plus className="size-3.5" /> Add lesson
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onAddModule}>
          <Layers className="size-3.5" /> Add module
        </Button>
        {outline.slug ? (
          <Button size="sm" variant="ghost" onClick={onAddLesson}>
            <FileClock className="size-3.5" /> Add lesson
          </Button>
        ) : null}
        {outline.slug ? (
          <LinkButton href={`/courses/${outline.slug}`} size="sm" variant="ghost" className="ml-auto">
            <Eye className="size-3.5" /> Preview
          </LinkButton>
        ) : null}
      </div>
    </Card>
  );
}
