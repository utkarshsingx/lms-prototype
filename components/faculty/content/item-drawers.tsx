"use client";

import { useState } from "react";
import { Copy, GitBranch } from "lucide-react";
import {
  ACCA_TODAY,
  CONTENT_TYPE_LABELS,
  formatAccaDate,
  paperByCode,
  staffName,
  syllabusAreaTitle,
  universities,
  universityById,
  type ContentItem,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { MiniLabel, SubjectPicker, SyllabusAreaPicker, UniversityMark, plural, type useAuthor } from "./shared";

type Author = ReturnType<typeof useAuthor>;

/* ------------------------------------------------------------------ tag and map an existing item */

export function TagDrawer({
  item,
  open,
  onClose,
  author,
  onSave,
  onStatus,
  onVariant,
}: {
  item: ContentItem;
  open: boolean;
  onClose: () => void;
  author: Author;
  onSave: (item: ContentItem) => void;
  onStatus: (item: ContentItem, status: ContentItem["status"]) => void;
  onVariant: (item: ContentItem) => void;
}) {
  const [area, setArea] = useState<string[]>([item.syllabusArea]);
  const [subjects, setSubjects] = useState<string[]>(item.universitySubjectIds);
  const own = author.papers.includes(item.paper);
  const Uni = item.variant ? universityById(item.variant.universityId) : undefined;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={item.title}
      sub={`${CONTENT_TYPE_LABELS[item.type]} · ${item.paper} · ${item.module} · ${item.lesson}`}
      submitLabel="Save tags"
      disabled={!own}
      disabledReason={`Only faculty assigned to ${item.paper} edit its tags. Owner: ${staffName(item.authorId)}.`}
      width="w-full max-w-xl"
      footerNote={own ? "Tags apply to every version" : `Owned by ${staffName(item.authorId)}`}
      onSubmit={(data) => {
        const title = String(data.get("title") ?? "").trim() || item.title;
        onSave({ ...item, title, syllabusArea: area[0] ?? item.syllabusArea, universitySubjectIds: subjects });
        toast({
          title: "Tags saved",
          body: `${title} · ${item.paper} ${area[0]} · ${subjects.length ? `mapped to ${plural(subjects.length, "university subject")}` : "no university subjects"}`,
        });
        onClose();
      }}
    >
      <div className="flex flex-wrap items-center gap-2 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 text-[12.5px] text-ink-2">
        <StatusPill status={item.status} size="sm" />
        <span className="font-mono text-ink">{item.version}</span>
        <span>· updated {formatAccaDate(item.updated)}</span>
        <span>· {staffName(item.authorId)}</span>
        {item.views ? <span>· {item.views} views</span> : null}
        {Uni ? (
          <span className="inline-flex items-center gap-1.5">
            · <UniversityMark university={Uni} className="size-5 text-[8.5px]" /> {item.variant?.label}
          </span>
        ) : null}
      </div>

      <Field label="Title">
        <Input name="title" defaultValue={item.title} disabled={!own} />
      </Field>

      <div>
        <MiniLabel className="mb-2">Tag content by ACCA syllabus area</MiniLabel>
        <SyllabusAreaPicker paper={item.paper} value={area} onChange={own ? setArea : () => undefined} />
      </div>

      <div>
        <MiniLabel className="mb-2">Map content against university subjects</MiniLabel>
        <SubjectPicker
          paper={item.paper}
          area={area[0]}
          value={subjects}
          onChange={own ? setSubjects : () => undefined}
          universityId={item.variant?.universityId}
        />
      </div>

      <div>
        <MiniLabel className="mb-2">Versions</MiniLabel>
        <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
          {[...item.versions].reverse().map((v) => (
            <li key={v.version} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
              <span className="w-10 shrink-0 font-mono text-[12.5px] font-semibold text-ink">{v.version}</span>
              <span className="min-w-0 flex-1 text-[12.5px] text-ink-2">{v.summary}</span>
              <span className="shrink-0 text-[11.5px] text-ink-3">{formatAccaDate(v.date)}</span>
            </li>
          ))}
        </ul>
      </div>

      {own ? (
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          {item.status === "draft" ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const next = author.canPublish ? "published" : "in-review";
                onStatus(item, next);
                toast(
                  author.canPublish
                    ? { title: `Published: ${item.title}`, body: `${item.version} is live for ${item.paper} learners.` }
                    : { title: "Submitted for review", body: `${staffName(author.reviewerId)} is asked to review ${item.title}.`, tone: "info" },
                );
                onClose();
              }}
            >
              {author.publishLabel}
            </Button>
          ) : null}
          {!item.variant ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onVariant(item)}>
              <GitBranch className="size-3.5" />
              Create university variant
            </Button>
          ) : null}
        </div>
      ) : null}
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ tag and map many items */

export type BulkTagPatch = { area: string | null; subjects: string[]; replaceSubjects: boolean };

export function BulkTagDrawer({
  open,
  onClose,
  mode,
  items,
  author,
  initialIds,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  mode: "area" | "subjects";
  /** Items the author may tag: their own papers, not outdated. */
  items: ContentItem[];
  author: Author;
  initialIds: string[];
  onApply: (ids: string[], patch: BulkTagPatch) => void;
}) {
  const papers = author.papers.filter((p) => items.some((i) => i.paper === p));
  const firstPaper = items.find((i) => initialIds.includes(i.id))?.paper ?? papers[0] ?? author.papers[0];
  const [paper, setPaper] = useState(firstPaper);
  const inPaper = items.filter((i) => i.paper === paper);
  const seed = initialIds.length
    ? initialIds
    : mode === "subjects"
      ? inPaper.filter((i) => i.universitySubjectIds.length === 0).map((i) => i.id)
      : [];
  const [picked, setPicked] = useState<string[]>(seed.filter((id) => inPaper.some((i) => i.id === id)));
  const [area, setArea] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [replace, setReplace] = useState(false);
  const skipped = initialIds.filter((id) => !inPaper.some((i) => i.id === id)).length;

  const areaBlock = (
    <div key="area">
      <MiniLabel className="mb-2">Tag content by ACCA syllabus area</MiniLabel>
      <SyllabusAreaPicker paper={paper} value={area} onChange={setArea} name="bulkArea" />
      {area.length ? (
        <button type="button" onClick={() => setArea([])} className="mt-1.5 text-[12px] font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4">
          Keep each item&apos;s current area
        </button>
      ) : null}
    </div>
  );
  const subjectBlock = (
    <div key="subjects" className="space-y-2">
      <MiniLabel>Map content against university subjects</MiniLabel>
      <SubjectPicker paper={paper} area={area[0]} value={subjects} onChange={setSubjects} name="bulkSubjects" />
      <Checkbox checked={replace} onChange={(e) => setReplace(e.target.checked)} label="Replace existing mappings instead of adding to them" />
    </div>
  );

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={mode === "area" ? "Tag content by ACCA syllabus area" : "Map content against university subjects"}
      sub="Choose the items, then the syllabus area and the university subjects they support. Tags apply to every version."
      submitLabel={`Apply to ${plural(picked.length, "item")}`}
      width="w-full max-w-xl"
      footerNote={skipped ? `${plural(skipped, "selected item")} from another paper left out` : undefined}
      onSubmit={() => {
        if (picked.length === 0) {
          toast({ title: "Choose at least one item", tone: "warning" });
          return;
        }
        if (area.length === 0 && subjects.length === 0) {
          toast({ title: "Choose a syllabus area or a university subject", tone: "warning" });
          return;
        }
        onApply(picked, { area: area[0] ?? null, subjects, replaceSubjects: replace });
        const parts = [
          area.length ? `tagged ${paper} ${area[0]} · ${syllabusAreaTitle(paper, area[0])}` : null,
          subjects.length ? `${replace ? "mapped only" : "mapped"} to ${plural(subjects.length, "university subject")}` : null,
        ].filter(Boolean);
        toast({ title: `${plural(picked.length, "item")} updated`, body: parts.join(" · ") });
        onClose();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-end">
        <Field label="Paper">
          <Select
            value={paper}
            onChange={(e) => {
              const next = e.target.value as typeof paper;
              setPaper(next);
              setArea([]);
              setSubjects([]);
              setPicked(mode === "subjects" ? items.filter((i) => i.paper === next && i.universitySubjectIds.length === 0).map((i) => i.id) : []);
            }}
          >
            {papers.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-2 pb-1 text-[12.5px] text-ink-3">
          <button type="button" className="font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4" onClick={() => setPicked(inPaper.map((i) => i.id))}>
            Select all {inPaper.length}
          </button>
          <span>·</span>
          <button
            type="button"
            className="font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4"
            onClick={() => setPicked(inPaper.filter((i) => i.universitySubjectIds.length === 0).map((i) => i.id))}
          >
            Only unmapped
          </button>
          <span>·</span>
          <button type="button" className="font-semibold text-ink-2 underline decoration-cta decoration-2 underline-offset-4" onClick={() => setPicked([])}>
            None
          </button>
        </div>
      </div>

      <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-[var(--radius-md)] border border-line">
        {inPaper.map((i) => {
          const on = picked.includes(i.id);
          return (
            <li key={i.id}>
              <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-cta-soft">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setPicked((p) => (on ? p.filter((x) => x !== i.id) : [...p, i.id]))}
                  className="mt-0.5 size-4 shrink-0 accent-nav-active"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{i.title}</span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {CONTENT_TYPE_LABELS[i.type]} · area {i.syllabusArea} ·{" "}
                    {i.universitySubjectIds.length ? plural(i.universitySubjectIds.length, "subject") + " mapped" : "not mapped"}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {mode === "area" ? [areaBlock, subjectBlock] : [subjectBlock, areaBlock]}
    </FormDrawer>
  );
}

/* ------------------------------------------------------------------ university variant */

const CHANGES = [
  "Examples use the university's B.Com context",
  "Bridging notes for the overlapping university subject",
  "Timed to the university semester",
  "Indian standards named alongside IFRS and ISAs",
  "Shorter lessons for weekday campus slots",
];

export function VariantDrawer({
  open,
  onClose,
  originals,
  initialOriginalId,
  author,
  nextId,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  originals: ContentItem[];
  initialOriginalId?: string;
  author: Author;
  nextId: string;
  onCreate: (variant: ContentItem, originalId: string) => void;
}) {
  const [originalId, setOriginalId] = useState(initialOriginalId ?? originals[0]?.id ?? "");
  const [universityId, setUniversityId] = useState("u-brightwater");
  const [subjects, setSubjects] = useState<string[]>([]);
  const original = originals.find((o) => o.id === originalId) ?? originals[0];
  const uni = universityById(universityId) ?? universities[0];

  if (!original) return null;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Create university variant"
      sub="A copy of the original, changed for one partner university. It stays linked, so corrections to the original are flagged on the variant."
      submitLabel={author.canPublish ? "Create variant" : "Create and submit for review"}
      width="w-full max-w-xl"
      footerNote={author.canPublish ? undefined : `Goes to ${staffName(author.reviewerId)} for review`}
      onSubmit={(data) => {
        const label = String(data.get("label") ?? "").trim() || `${uni.shortName} variant`;
        const title = String(data.get("title") ?? "").trim() || `${original.title} · ${uni.shortName}`;
        const draft = data.get("draft") === "on";
        const changes = data.getAll("changes").map(String);
        const status: ContentItem["status"] = draft ? "draft" : author.canPublish ? "published" : "in-review";
        const summary = `Variant of ${original.title} (${original.version}) for ${uni.name}${changes.length ? `: ${changes.join("; ").toLowerCase()}` : ""}`;
        onCreate(
          {
            ...original,
            id: nextId,
            title,
            variant: { universityId: uni.id, label },
            universitySubjectIds: subjects,
            status,
            version: "v1.0",
            versions: [{ version: "v1.0", date: ACCA_TODAY, authorId: author.staffId, summary, status }],
            authorId: author.staffId,
            reviewerId: status === "in-review" ? author.reviewerId : null,
            updated: ACCA_TODAY,
            views: 0,
            outdatedReason: undefined,
          },
          original.id,
        );
        toast({
          title: status === "draft" ? "Variant saved as draft" : status === "in-review" ? "Variant submitted for review" : "University variant created",
          body: `${label} · linked to ${original.title}`,
          tone: status === "published" ? "success" : "info",
        });
        onClose();
      }}
    >
      <Field label="Original content">
        <Select
          value={original.id}
          onChange={(e) => {
            setOriginalId(e.target.value);
            setSubjects([]);
          }}
        >
          {originals.map((o) => (
            <option key={o.id} value={o.id}>
              {o.paper} · {o.title}
            </option>
          ))}
        </Select>
      </Field>

      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
        <Copy className="mt-0.5 size-4 shrink-0 text-ink-3" />
        <div className="min-w-0 text-[12.5px] text-ink-2">
          <p className="font-semibold text-ink">
            {CONTENT_TYPE_LABELS[original.type]} · {original.version} · {original.size}
          </p>
          <p className="mt-0.5">
            {original.paper} {original.syllabusArea} · {syllabusAreaTitle(original.paper, original.syllabusArea)} · {original.lesson}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="University">
          <Select
            value={universityId}
            onChange={(e) => {
              setUniversityId(e.target.value);
              setSubjects([]);
            }}
          >
            {universities.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.status === "Onboarding" ? " (onboarding)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Variant label">
          <Input name="label" key={universityId} defaultValue={`${uni.shortName} B.Com bridge`} required />
        </Field>
      </div>

      <Field label="Variant title">
        <Input name="title" key={`${original.id}-${universityId}`} defaultValue={`${original.title} for ${uni.shortName} students`} required />
      </Field>

      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">What changes</legend>
        <div className="grid gap-2">
          {CHANGES.map((c, i) => (
            <Checkbox key={c} name="changes" value={c} defaultChecked={i < 2} label={c} />
          ))}
        </div>
      </fieldset>

      <Field label="Notes for the reviewer" hint="Optional">
        <Textarea name="note" rows={2} placeholder={`e.g. ${paperByCode(original.paper)?.code ?? ""} examples reworked around a Pune manufacturing group`} />
      </Field>

      <div>
        <MiniLabel className="mb-2">Map to {uni.shortName} subjects</MiniLabel>
        <SubjectPicker paper={original.paper} area={original.syllabusArea} value={subjects} onChange={setSubjects} universityId={uni.id} />
      </div>

      <Checkbox name="draft" label="Save as draft" />
    </FormDrawer>
  );
}
