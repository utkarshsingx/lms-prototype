"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FilePenLine,
  GitCompareArrows,
  History,
  MessageSquare,
  Minus,
  Plus,
  Send,
  X,
} from "lucide-react";
import {
  ACCA_TODAY,
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  contentItems,
  formatAccaDate,
  formatDateTime,
  reviewRequests,
  staffName,
  type ContentItem,
  type ReviewRequest,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { FilterSelect } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill } from "@/components/ui/status";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { toast } from "@/components/ui/toast";
import {
  GatedButton,
  MiniLabel,
  PaperCodeChip,
  SubmitOnlyChip,
  TYPE_ICONS,
  bumpVersion,
  dueLabel,
  listPapers,
  plural,
  reviewerOptions,
  useAuthor,
} from "./shared";

type Author = ReturnType<typeof useAuthor>;

const REVIEW_STATUS_LABEL: Record<ReviewRequest["status"], string> = {
  pending: "Pending review",
  "changes-requested": "Changes requested",
  approved: "Approved",
};

const NOW = `${ACCA_TODAY}T11:20`;

export function ReviewsPage() {
  const { persona } = useRole();
  return <Reviews key={persona.id} />;
}

function Reviews() {
  const author = useAuthor();
  const { staffId, canPublish } = author;

  const [reviews, setReviews] = useState<ReviewRequest[]>(reviewRequests);
  const [items, setItems] = useState<ContentItem[]>(contentItems);
  const [log, setLog] = useState<TimelineItem[]>(SEED_LOG);

  const assignedToMe = reviews.filter((r) => r.reviewerId === staffId);
  const [tab, setTab] = useState("review");
  const [view, setView] = useState(assignedToMe.length ? "assigned" : "submitted");
  const [fStatus, setFStatus] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [changesFor, setChangesFor] = useState<{ review: ReviewRequest; open: boolean; nonce: number } | null>(null);
  const [submit, setSubmit] = useState<{ open: boolean; contentId?: string; resubmitId?: string; nonce: number }>({ open: false, nonce: 0 });
  const [correcting, setCorrecting] = useState<{ item: ContentItem; open: boolean; nonce: number } | null>(null);

  const order = { pending: 0, "changes-requested": 1, approved: 2 } as const;
  const queue = useMemo(
    () =>
      reviews
        .filter((r) => (view === "assigned" ? r.reviewerId === staffId : view === "submitted" ? r.submittedBy === staffId : true))
        .filter((r) => !fStatus || r.status === fStatus)
        .sort((a, b) => order[a.status] - order[b.status] || a.dueOn.localeCompare(b.dueOn)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reviews, view, fStatus, staffId],
  );
  const selected = queue.find((r) => r.id === selectedId) ?? queue[0];
  const selectedItem = selected ? items.find((i) => i.id === selected.contentId) : undefined;

  const myItems = items.filter((i) => i.authorId === staffId);
  const outdated = items.filter((i) => i.status === "outdated");
  const mySubmissions = reviews.filter((r) => r.submittedBy === staffId);

  const pendingForMe = assignedToMe.filter((r) => r.status === "pending").length;
  const changesRequested = reviews.filter(
    (r) => r.status === "changes-requested" && (r.reviewerId === staffId || r.submittedBy === staffId),
  ).length;
  const myOpen = mySubmissions.filter((r) => r.status !== "approved").length;
  const reviewPapers = Array.from(new Set(assignedToMe.map((r) => r.paper)));

  /* ------------------------------------------------------------------ mutations */

  const comment = (reviewId: string, body: string) =>
    setReviews((list) =>
      list.map((r) => (r.id === reviewId ? { ...r, comments: [...r.comments, { authorId: staffId, at: NOW, body }] } : r)),
    );

  const approve = (r: ReviewRequest) => {
    setReviews((list) =>
      list.map((x) =>
        x.id === r.id ? { ...x, status: "approved", comments: [...x.comments, { authorId: staffId, at: NOW, body: "Approved and published." }] } : x,
      ),
    );
    setItems((list) =>
      list.map((i) =>
        i.id === r.contentId
          ? {
              ...i,
              status: "published",
              version: r.toVersion,
              updated: ACCA_TODAY,
              versions: i.versions.some((v) => v.version === r.toVersion)
                ? i.versions.map((v) => (v.version === r.toVersion ? { ...v, status: "published" } : v))
                : [...i.versions, { version: r.toVersion, date: ACCA_TODAY, authorId: r.submittedBy, summary: r.changeSummary, status: "published" }],
            }
          : i,
      ),
    );
    setLog((l) => [
      { id: `log-${r.id}`, title: `${r.title} approved as ${r.toVersion}`, meta: `${formatAccaDate(ACCA_TODAY)} · approved by ${staffName(staffId)}`, body: r.changeSummary, tone: "jade", icon: <CheckCircle2 /> },
      ...l,
    ]);
    toast({ title: "Approved and published", body: `${r.title} ${r.toVersion} is live for ${r.paper} learners. Anyone mid-attempt finishes on ${r.fromVersion}.` });
  };

  const openSubmit = (contentId?: string, resubmitId?: string) =>
    setSubmit((s) => ({ open: true, contentId, resubmitId, nonce: s.nonce + 1 }));

  /* ------------------------------------------------------------------ submit table */

  const submitColumns: DataTableColumn<ContentItem>[] = [
    {
      key: "title",
      header: "Content",
      sortable: true,
      wrap: true,
      className: "min-w-[16rem]",
      render: (i) => {
        const Icon = TYPE_ICONS[i.type];
        return (
          <span className="flex min-w-0 items-start gap-2.5">
            <Icon className="mt-0.5 size-4 shrink-0 text-ink-3" />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{i.title}</span>
              <span className="block text-[12px] text-ink-3">
                {CONTENT_TYPE_LABELS[i.type]} · {i.lesson}
              </span>
            </span>
          </span>
        );
      },
    },
    { key: "paper", header: "Paper", sortable: true, render: (i) => <PaperCodeChip code={i.paper} /> },
    { key: "version", header: "Version", mono: true },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (i) => ({ draft: 0, published: 1, "in-review": 2, outdated: 3 })[i.status],
      render: (i) => <StatusPill status={CONTENT_STATUS_LABELS[i.status]} tone={i.status === "outdated" ? "rose" : undefined} size="sm" />,
    },
    { key: "updated", header: "Updated", sortable: true, render: (i) => formatAccaDate(i.updated) },
    {
      key: "action",
      header: "",
      align: "right",
      render: (i) =>
        i.status === "in-review" ? (
          <span className="text-[12.5px] text-ink-3">With {staffName(i.reviewerId)}</span>
        ) : i.status === "outdated" ? (
          <Button size="xs" variant="outline" onClick={() => setCorrecting((c) => ({ item: i, open: true, nonce: (c?.nonce ?? 0) + 1 }))}>
            Correct first
          </Button>
        ) : (
          <Button size="xs" variant={i.status === "draft" ? "primary" : "outline"} onClick={() => openSubmit(i.id)}>
            <Send className="size-3" />
            {i.status === "draft" ? "Submit for review" : "Submit new version"}
          </Button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Content"
        title="Reviews & versions"
        sub="Submit content for review, compare versions side by side before approving, and correct content that has gone out of date."
        badge={
          canPublish ? (
            reviewPapers.length ? (
              <ScopeChip icon={<ClipboardCheck aria-hidden />}>You review {listPapers(reviewPapers)} submissions</ScopeChip>
            ) : null
          ) : (
            <SubmitOnlyChip />
          )
        }
        actions={
          <Button onClick={() => openSubmit()}>
            <Send className="size-4" />
            Submit content for review
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Waiting for your review" value={pendingForMe} sub={canPublish ? "Assigned to you" : "Reviews go to faculty with publish rights"} icon={<ClipboardCheck />} />
        <KpiTile label="Changes requested" value={changesRequested} tone="amber" sub="On requests you submitted or review" />
        <KpiTile label="Your submissions open" value={myOpen} tone="info" sub={`${plural(mySubmissions.length, "submission")} in total`} />
        <KpiTile label="Outdated content" value={outdated.length} tone="rose" sub="Across the repository" />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "review", label: "Review content versions", count: canPublish ? pendingForMe : myOpen },
          { id: "submit", label: "Submit content for review", count: myItems.filter((i) => i.status === "draft").length },
          { id: "outdated", label: "Correct outdated content", count: outdated.length },
        ]}
      />

      {tab === "review" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,23rem)_minmax(0,1fr)]">
          <Card className="min-w-0 self-start">
            <div className="space-y-3 px-4 pt-4 pb-3">
              <Segmented
                size="sm"
                value={view}
                onChange={(v) => {
                  setView(v);
                  setSelectedId(null);
                }}
                items={[
                  { id: "assigned", label: "Assigned to you" },
                  { id: "submitted", label: "Submitted by you" },
                  { id: "all", label: "All" },
                ]}
              />
              <FilterSelect
                label="Status"
                allLabel="All"
                value={fStatus}
                onChange={(v) => {
                  setFStatus(v);
                  setSelectedId(null);
                }}
                options={Object.entries(REVIEW_STATUS_LABEL).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <ul className="divide-y divide-line border-t border-line">
              {queue.map((r) => {
                const due = dueLabel(r.dueOn);
                const active = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "relative flex w-full flex-col gap-1.5 px-4 py-3 text-left transition-colors",
                        active ? "bg-cta-soft" : "hover:bg-surface-2",
                      )}
                    >
                      {active ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-cta" /> : null}
                      <span className="flex min-w-0 items-start gap-2">
                        <PaperCodeChip code={r.paper} />
                        <span className="min-w-0 flex-1 text-[13.5px] leading-snug font-semibold text-ink">{r.title}</span>
                      </span>
                      <span className="text-[12px] text-ink-3">
                        {staffName(r.submittedBy)} · {formatAccaDate(r.submittedOn)} ·{" "}
                        <span className="font-mono text-ink-2">
                          {r.fromVersion} to {r.toVersion}
                        </span>
                      </span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusPill status={REVIEW_STATUS_LABEL[r.status]} size="sm" />
                        {r.status === "pending" ? (
                          <StatusPill status={due.label} tone={due.tone} size="sm" dot={false} />
                        ) : null}
                        {view !== "assigned" ? <span className="text-[11.5px] text-ink-3">Reviewer {staffName(r.reviewerId)}</span> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
              {queue.length === 0 ? (
                <li className="px-4 py-10 text-center text-[13px] text-ink-3">No review requests match this view.</li>
              ) : null}
            </ul>
          </Card>

          {selected && selectedItem ? (
            <ReviewDetail
              key={selected.id}
              review={selected}
              item={selectedItem}
              author={author}
              onApprove={() => approve(selected)}
              onRequestChanges={() => setChangesFor((c) => ({ review: selected, open: true, nonce: (c?.nonce ?? 0) + 1 }))}
              onComment={(body) => {
                comment(selected.id, body);
                toast({ title: "Comment added", body: `${selected.title} · visible to ${staffName(selected.submittedBy === staffId ? selected.reviewerId : selected.submittedBy)}` });
              }}
              onResubmit={() => openSubmit(selected.contentId, selected.id)}
            />
          ) : (
            <Card className="grid min-h-60 place-items-center p-8 text-center text-[13.5px] text-ink-3">Choose a review request.</Card>
          )}
        </div>
      ) : null}

      {tab === "submit" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="min-w-0">
            <CardHeader
              title="Submit content for review"
              sub={
                canPublish
                  ? "You can publish your own papers directly. Submitting asks a second faculty member to check a version first."
                  : "Nothing you author reaches learners until a reviewer approves it."
              }
              action={
                <Button size="sm" onClick={() => openSubmit()}>
                  <Send className="size-3.5" />
                  Submit for review
                </Button>
              }
            />
            <div className="px-5 pb-5">
              <DataTable
                bare
                dense
                caption="Your content"
                rows={myItems}
                columns={submitColumns}
                getRowId={(i) => i.id}
                initialSort={{ key: "status", dir: "asc" }}
                pageSize={8}
                search={{ placeholder: "Search your content", match: (i, q) => i.title.toLowerCase().includes(q) }}
              />
            </div>
          </Card>
          <Card className="min-w-0 self-start">
            <CardHeader title="Your submissions" sub="Every request you have sent for review" />
            <ul className="divide-y divide-line border-t border-line">
              {mySubmissions.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("review");
                      setView("submitted");
                      setFStatus("");
                      setSelectedId(r.id);
                    }}
                    className="flex w-full flex-col gap-1 px-5 py-3 text-left transition-colors hover:bg-cta-soft"
                  >
                    <span className="text-[13px] font-semibold text-ink">{r.title}</span>
                    <span className="text-[12px] text-ink-3">
                      {staffName(r.reviewerId)} · due {formatAccaDate(r.dueOn)} ·{" "}
                      <span className="font-mono">
                        {r.fromVersion} to {r.toVersion}
                      </span>
                    </span>
                    <span>
                      <StatusPill status={REVIEW_STATUS_LABEL[r.status]} size="sm" />
                    </span>
                  </button>
                </li>
              ))}
              {mySubmissions.length === 0 ? <li className="px-5 py-8 text-center text-[13px] text-ink-3">You have not submitted anything yet.</li> : null}
            </ul>
          </Card>
        </div>
      ) : null}

      {tab === "outdated" ? (
        <div className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {outdated.map((i) => {
              const own = i.authorId === staffId;
              return (
                <Card key={i.id} className="flex min-w-0 flex-col">
                  <div className="flex-1 space-y-3 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <PaperCodeChip code={i.paper} />
                      <span className="text-[12.5px] text-ink-3">{CONTENT_TYPE_LABELS[i.type]}</span>
                      {own ? (
                        <StatusPill status="Your content" tone="cta" size="sm" dot={false} />
                      ) : (
                        <span className="text-[12.5px] text-ink-3">· owner {staffName(i.authorId)}</span>
                      )}
                      <StatusPill status="Outdated" tone="rose" size="sm" className="ml-auto" />
                    </div>
                    <h3 className="font-display text-[18px] leading-snug font-bold text-ink">{i.title}</h3>
                    <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-amber-soft px-3 py-2.5 text-[13px] leading-snug text-ink">
                      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" />
                      {i.outdatedReason}
                    </p>
                    <p className="text-[12.5px] text-ink-3">
                      <span className="font-mono text-ink-2">{i.version}</span> · last updated {formatAccaDate(i.updated)} · {i.views} learner views · {i.module}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3">
                    <Button size="sm" onClick={() => setCorrecting((c) => ({ item: i, open: true, nonce: (c?.nonce ?? 0) + 1 }))}>
                      <FilePenLine className="size-3.5" />
                      {own ? "Correct" : "Suggest a correction"}
                    </Button>
                    <span className="text-[12px] text-ink-3">
                      {own && canPublish ? `Publishes ${bumpVersion(i.version, "major")}` : `Reviewed by ${staffName(own ? author.reviewerId : i.authorId)}`}
                    </span>
                  </div>
                </Card>
              );
            })}
            {outdated.length === 0 ? (
              <Card className="p-8 text-center text-[13.5px] text-ink-3 lg:col-span-2">Nothing is flagged outdated. Corrections are in the log below.</Card>
            ) : null}
          </div>
          <Card>
            <CardHeader title="Correction log" sub="Corrections and approved versions, newest first" action={<History className="size-4 text-ink-3" />} />
            <div className="border-t border-line px-5 py-5">
              <Timeline items={log} />
            </div>
          </Card>
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ drawers */}
      {changesFor ? (
        <RequestChangesDrawer
          key={`changes-${changesFor.nonce}`}
          review={changesFor.review}
          open={changesFor.open}
          onClose={() => setChangesFor((c) => (c ? { ...c, open: false } : c))}
          onSubmit={(body) => {
            const r = changesFor.review;
            setReviews((list) =>
              list.map((x) => (x.id === r.id ? { ...x, status: "changes-requested", comments: [...x.comments, { authorId: staffId, at: NOW, body }] } : x)),
            );
            toast({ title: "Changes requested", body: `${staffName(r.submittedBy)} is notified about ${r.title}.`, tone: "warning" });
          }}
        />
      ) : null}

      <SubmitDrawer
        key={`submit-${submit.nonce}`}
        open={submit.open}
        onClose={() => setSubmit((s) => ({ ...s, open: false }))}
        author={author}
        items={myItems}
        initialContentId={submit.contentId}
        resubmit={submit.resubmitId ? reviews.find((r) => r.id === submit.resubmitId) : undefined}
        nextId={`rv-new-${reviews.length + 1}`}
        onSubmit={(request, isResubmit) => {
          setReviews((list) => (isResubmit ? list.map((r) => (r.id === request.id ? request : r)) : [request, ...list]));
          setItems((list) =>
            list.map((i) => {
              if (i.id !== request.contentId) return i;
              const hasVersion = i.versions.some((v) => v.version === request.toVersion);
              return {
                ...i,
                status: "in-review",
                reviewerId: request.reviewerId,
                version: request.toVersion,
                updated: ACCA_TODAY,
                versions: hasVersion
                  ? i.versions.map((v) => (v.version === request.toVersion ? { ...v, status: "in-review", summary: request.changeSummary } : v))
                  : [...i.versions, { version: request.toVersion, date: ACCA_TODAY, authorId: staffId, summary: request.changeSummary, status: "in-review" }],
              };
            }),
          );
          setTab("review");
          setView("submitted");
          setFStatus("");
          setSelectedId(request.id);
          toast({
            title: isResubmit ? "Resubmitted for review" : "Submitted for review",
            body: `${staffName(request.reviewerId)} is asked to review ${request.title} ${request.toVersion} by ${formatAccaDate(request.dueOn)}.`,
            tone: "info",
          });
        }}
      />

      {correcting ? (
        <CorrectDrawer
          key={`correct-${correcting.nonce}`}
          item={correcting.item}
          open={correcting.open}
          onClose={() => setCorrecting((c) => (c ? { ...c, open: false } : c))}
          author={author}
          nextReviewId={`rv-new-${reviews.length + 1}`}
          onCorrect={({ item, publishNow, issue, fix, reviewerId, notify }) => {
            const next = bumpVersion(item.version, "major");
            setItems((list) =>
              list.map((i) =>
                i.id === item.id
                  ? {
                      ...i,
                      status: publishNow ? "published" : "in-review",
                      version: next,
                      updated: ACCA_TODAY,
                      reviewerId: publishNow ? i.reviewerId : reviewerId,
                      outdatedReason: undefined,
                      versions: [...i.versions, { version: next, date: ACCA_TODAY, authorId: staffId, summary: `Corrected: ${fix}`, status: publishNow ? "published" : "in-review" }],
                    }
                  : i,
              ),
            );
            if (!publishNow) {
              setReviews((list) => [
                {
                  id: `rv-new-${list.length + 1}`,
                  contentId: item.id,
                  title: item.title,
                  paper: item.paper,
                  submittedBy: staffId,
                  reviewerId,
                  submittedOn: ACCA_TODAY,
                  dueOn: "2026-09-17",
                  status: "pending",
                  fromVersion: item.version,
                  toVersion: next,
                  changeSummary: fix,
                  changes: [{ section: "Outdated content", before: issue, after: fix }],
                  comments: [],
                },
                ...list,
              ]);
            }
            setLog((l) => [
              {
                id: `log-${item.id}-${next}`,
                title: publishNow ? `${item.title} corrected to ${next}` : `Correction to ${item.title} submitted as ${next}`,
                meta: `${formatAccaDate(ACCA_TODAY)} · ${staffName(staffId)}${publishNow ? "" : ` · reviewer ${staffName(reviewerId)}`}`,
                body: fix,
                tone: publishNow ? "jade" : "amber",
                icon: publishNow ? <CheckCircle2 /> : <Send />,
              },
              ...l,
            ]);
            toast(
              publishNow
                ? { title: `Correction published as ${next}`, body: notify ? `${plural(item.views, "learner")} who opened ${item.version} are notified.` : item.title }
                : { title: "Correction submitted for review", body: `${staffName(reviewerId)} is asked to approve ${item.title} ${next}.`, tone: "info" },
            );
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ review detail */

function ReviewDetail({
  review,
  item,
  author,
  onApprove,
  onRequestChanges,
  onComment,
  onResubmit,
}: {
  review: ReviewRequest;
  item: ContentItem;
  author: Author;
  onApprove: () => void;
  onRequestChanges: () => void;
  onComment: (body: string) => void;
  onResubmit: () => void;
}) {
  const [draft, setDraft] = useState("");
  const versions = item.versions;
  const hasFrom = versions.some((v) => v.version === review.fromVersion);
  const [left, setLeft] = useState(hasFrom ? review.fromVersion : (versions[0]?.version ?? review.toVersion));
  const [right, setRight] = useState(versions.some((v) => v.version === review.toVersion) ? review.toVersion : (versions[versions.length - 1]?.version ?? ""));
  const lv = versions.find((v) => v.version === left);
  const rv = versions.find((v) => v.version === right);

  const isReviewer = review.reviewerId === author.staffId;
  const canDecide = author.canPublish && isReviewer;
  const reason = !author.canPublish
    ? "Your role submits content for review. Faculty with publish rights approve it."
    : `${staffName(review.reviewerId)} is the reviewer for this request.`;
  const due = dueLabel(review.dueOn);

  return (
    <Card className="min-w-0 self-start">
      <div className="space-y-3 border-b border-line px-5 pt-5 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <PaperCodeChip code={review.paper} />
          <span className="text-[12.5px] text-ink-3">{CONTENT_TYPE_LABELS[item.type]}</span>
          <StatusPill status={REVIEW_STATUS_LABEL[review.status]} size="sm" />
          {review.status === "pending" ? <StatusPill status={due.label} tone={due.tone} size="sm" dot={false} /> : null}
        </div>
        <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">{review.title}</h2>
        <p className="text-[13px] text-ink-2">
          Submitted by <span className="font-semibold text-ink">{staffName(review.submittedBy)}</span> on {formatAccaDate(review.submittedOn)} · reviewer{" "}
          <span className="font-semibold text-ink">{staffName(review.reviewerId)}</span> · due {formatAccaDate(review.dueOn)}
        </p>
        <p className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-3 text-[13.5px] leading-relaxed text-ink">{review.changeSummary}</p>
      </div>

      <div className="space-y-6 px-5 py-5">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <MiniLabel>Side-by-side changes</MiniLabel>
            <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-ink-2">
              <GitCompareArrows className="size-3.5" />
              {review.fromVersion} to {review.toVersion}
            </span>
          </div>
          {review.changes.map((c) => (
            <div key={c.section} className="rounded-[var(--radius-md)] border border-line">
              <p className="border-b border-line bg-surface-2 px-3.5 py-2 text-[12.5px] font-semibold text-ink">{c.section}</p>
              <div className="grid divide-y divide-line sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="min-w-0 bg-rose-soft/50 px-3.5 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-rose uppercase">
                    <Minus className="size-3" /> Before · {hasFrom ? review.fromVersion : "not published"}
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink">{c.before}</p>
                </div>
                <div className="min-w-0 bg-jade-soft/50 px-3.5 py-3">
                  <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-jade uppercase">
                    <Plus className="size-3" /> After · {review.toVersion}
                  </p>
                  <p className="text-[13px] leading-relaxed text-ink">{c.after}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <MiniLabel>Version history</MiniLabel>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Compare" className="min-w-0 flex-1 basis-32">
              <Select value={left} onChange={(e) => setLeft(e.target.value)}>
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} · {formatAccaDate(v.date)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="With" className="min-w-0 flex-1 basis-32">
              <Select value={right} onChange={(e) => setRight(e.target.value)}>
                {versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} · {formatAccaDate(v.date)}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[lv, rv].map((v, n) =>
              v ? (
                <div key={`${n}-${v.version}`} className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[14px] font-bold text-ink">{v.version}</span>
                    <StatusPill status={CONTENT_STATUS_LABELS[v.status]} size="sm" />
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">
                    {formatAccaDate(v.date)} · {staffName(v.authorId)}
                  </p>
                  <p className="mt-2 text-[13px] leading-snug text-ink-2">{v.summary}</p>
                </div>
              ) : (
                <div key={n} className="rounded-[var(--radius-md)] border border-dashed border-line-strong p-3.5 text-[12.5px] text-ink-3">
                  No earlier version: this is the first submission.
                </div>
              ),
            )}
          </div>
          {left === right ? <p className="text-[12px] text-ink-3">Choose two different versions to compare.</p> : null}
        </section>

        <section className="space-y-3">
          <MiniLabel>Comments</MiniLabel>
          {review.comments.length ? (
            <ul className="space-y-3">
              {review.comments.map((c, i) => (
                <li key={`${c.at}-${i}`} className="flex gap-3">
                  <Avatar name={staffName(c.authorId)} size="sm" />
                  <div className="min-w-0 flex-1 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5">
                    <p className="text-[12px] text-ink-3">
                      <span className="font-semibold text-ink">{staffName(c.authorId)}</span> · {formatDateTime(c.at)}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12.5px] text-ink-3">No comments yet.</p>
          )}
          <div className="space-y-2">
            <Textarea rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a comment for the author or reviewer" aria-label="Comment" />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                disabled={!draft.trim()}
                onClick={() => {
                  onComment(draft.trim());
                  setDraft("");
                }}
              >
                <MessageSquare className="size-3.5" />
                Add comment
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3.5">
        {review.status === "pending" ? (
          <>
            <GatedButton allowed={canDecide} reason={reason} onClick={onApprove}>
              <CheckCircle2 className="size-4" />
              Approve and publish
            </GatedButton>
            <GatedButton allowed={canDecide} reason={reason} variant="outline" onClick={onRequestChanges}>
              <X className="size-4" />
              Request changes
            </GatedButton>
            {!canDecide ? <span className="text-[12.5px] text-ink-3">{reason}</span> : null}
          </>
        ) : review.status === "changes-requested" ? (
          review.submittedBy === author.staffId ? (
            <Button onClick={onResubmit}>
              <Send className="size-4" />
              Resubmit with changes
            </Button>
          ) : (
            <span className="text-[12.5px] text-ink-3">Waiting for {staffName(review.submittedBy)} to resubmit.</span>
          )
        ) : (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-jade">
            <CheckCircle2 className="size-4" />
            Approved · {review.toVersion} is live
          </span>
        )}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ drawers */

function RequestChangesDrawer({
  review,
  open,
  onClose,
  onSubmit,
}: {
  review: ReviewRequest;
  open: boolean;
  onClose: () => void;
  onSubmit: (body: string) => void;
}) {
  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Request changes"
      sub={`${review.title} · ${review.toVersion} goes back to ${staffName(review.submittedBy)}`}
      submitLabel="Request changes"
      footerNote="The author is notified in the app and by email"
      onSubmit={(data) => {
        const sections = data.getAll("sections").map(String);
        const text = String(data.get("comment") ?? "").trim();
        onSubmit(sections.length ? `${text} (Revisit: ${sections.join(", ")})` : text);
        onClose();
      }}
    >
      <fieldset>
        <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Sections to revisit</legend>
        <div className="grid gap-2">
          {review.changes.map((c) => (
            <Checkbox key={c.section} name="sections" value={c.section} defaultChecked label={c.section} />
          ))}
        </div>
      </fieldset>
      <Field label="What needs to change">
        <Textarea name="comment" rows={5} required placeholder="Be specific: the paragraph, the figure and what the syllabus expects." />
      </Field>
    </FormDrawer>
  );
}

type ChangeRow = { section: string; before: string; after: string };

function SubmitDrawer({
  open,
  onClose,
  author,
  items,
  initialContentId,
  resubmit,
  nextId,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  author: Author;
  items: ContentItem[];
  initialContentId?: string;
  resubmit?: ReviewRequest;
  nextId: string;
  onSubmit: (request: ReviewRequest, isResubmit: boolean) => void;
}) {
  const candidates = items.filter((i) => (i.status !== "in-review" && i.status !== "outdated") || i.id === initialContentId);
  const sorted = [...candidates].sort((a, b) => Number(b.status === "draft") - Number(a.status === "draft"));
  const [contentId, setContentId] = useState(initialContentId ?? sorted[0]?.id ?? "");
  const [size, setSize] = useState<"minor" | "major">("minor");
  const [rows, setRows] = useState<ChangeRow[]>([{ section: "", before: "", after: "" }]);
  const [files, setFiles] = useState<string[]>([]);
  const item = candidates.find((i) => i.id === contentId);

  if (!item) return null;

  const published = item.status === "published";
  const fromVersion = resubmit
    ? resubmit.fromVersion
    : published
      ? item.version
      : (item.versions[item.versions.length - 2]?.version ?? "v0.9");
  const toVersion = resubmit ? bumpVersion(resubmit.toVersion, "minor") : published ? bumpVersion(item.version, size) : item.version;

  const patchRow = (n: number, patch: Partial<ChangeRow>) => setRows((r) => r.map((row, i) => (i === n ? { ...row, ...patch } : row)));

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={resubmit ? "Resubmit with changes" : "Submit content for review"}
      sub="The reviewer compares the versions side by side before approving."
      submitLabel={resubmit ? "Resubmit for review" : "Submit for review"}
      width="w-full max-w-xl"
      footerNote={files.length ? plural(files.length, "file") + " attached" : undefined}
      onSubmit={(data) => {
        const summary = String(data.get("summary") ?? "").trim();
        const reviewerId = String(data.get("reviewer") ?? author.reviewerId);
        const dueOn = String(data.get("due") || "2026-09-17");
        const changes = rows.filter((r) => r.section.trim() && (r.before.trim() || r.after.trim()));
        const request: ReviewRequest = resubmit
          ? {
              ...resubmit,
              status: "pending",
              reviewerId,
              dueOn,
              toVersion,
              changeSummary: summary,
              changes: changes.length ? changes : resubmit.changes,
              comments: [...resubmit.comments, { authorId: author.staffId, at: NOW, body: `Resubmitted as ${toVersion}: ${summary}` }],
            }
          : {
              id: nextId,
              contentId: item.id,
              title: item.title,
              paper: item.paper,
              submittedBy: author.staffId,
              reviewerId,
              submittedOn: ACCA_TODAY,
              dueOn,
              status: "pending",
              fromVersion,
              toVersion,
              changeSummary: summary,
              changes: changes.length ? changes : [{ section: "Whole item", before: `${fromVersion} as it stands`, after: summary }],
              comments: [],
            };
        onSubmit(request, Boolean(resubmit));
        onClose();
      }}
    >
      <Field label="Content">
        <Select value={item.id} onChange={(e) => setContentId(e.target.value)} disabled={Boolean(resubmit)}>
          {sorted.map((i) => (
            <option key={i.id} value={i.id}>
              {i.paper} · {i.title} ({CONTENT_STATUS_LABELS[i.status].toLowerCase()})
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Reviewer">
          <Select name="reviewer" defaultValue={resubmit?.reviewerId ?? author.reviewerId}>
            {reviewerOptions(author.staffId).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Review by">
          <Input name="due" type="date" defaultValue="2026-09-17" min={ACCA_TODAY} />
        </Field>
      </div>

      <div className="flex flex-wrap items-end gap-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3">
        {published && !resubmit ? (
          <Field label="Change size" className="min-w-0 flex-1 basis-40">
            <Select value={size} onChange={(e) => setSize(e.target.value as "minor" | "major")}>
              <option value="minor">Minor correction</option>
              <option value="major">Major revision</option>
            </Select>
          </Field>
        ) : null}
        <div className="min-w-0">
          <MiniLabel>Versions</MiniLabel>
          <p className="mt-1 font-mono text-[15px] font-bold text-ink">
            {fromVersion} <span className="text-ink-3">to</span> {toVersion}
          </p>
        </div>
      </div>

      <Field label="Change summary">
        <Textarea
          name="summary"
          rows={3}
          required
          key={item.id}
          defaultValue={resubmit ? "" : item.status === "draft" ? "" : ""}
          placeholder="What changed and why, in two sentences"
        />
      </Field>

      <div className="space-y-3">
        <MiniLabel>What changed, section by section</MiniLabel>
        {rows.map((row, n) => (
          <div key={n} className="space-y-2 rounded-[var(--radius-md)] border border-line p-3">
            <div className="flex items-center gap-2">
              <Input value={row.section} onChange={(e) => patchRow(n, { section: e.target.value })} placeholder="Section, e.g. Worked example 2" aria-label="Section" />
              {rows.length > 1 ? (
                <Button type="button" size="xs" variant="ghost" onClick={() => setRows((r) => r.filter((_, i) => i !== n))} aria-label="Remove change">
                  <X className="size-3.5" />
                </Button>
              ) : null}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Textarea rows={2} value={row.before} onChange={(e) => patchRow(n, { before: e.target.value })} placeholder="Before" aria-label="Before" />
              <Textarea rows={2} value={row.after} onChange={(e) => patchRow(n, { after: e.target.value })} placeholder="After" aria-label="After" />
            </div>
          </div>
        ))}
        {rows.length < 4 ? (
          <Button type="button" size="xs" variant="ghost" onClick={() => setRows((r) => [...r, { section: "", before: "", after: "" }])}>
            <Plus className="size-3.5" />
            Add another change
          </Button>
        ) : null}
      </div>

      <FileDrop label="Attach the revised file" accept=".pdf,.docx,.pptx,.mp4,.vtt" onFiles={(all) => setFiles(all)} hint="Optional when the change is made in the builder" />
    </FormDrawer>
  );
}

function CorrectDrawer({
  item,
  open,
  onClose,
  author,
  onCorrect,
}: {
  item: ContentItem;
  open: boolean;
  onClose: () => void;
  author: Author;
  nextReviewId: string;
  onCorrect: (args: { item: ContentItem; publishNow: boolean; issue: string; fix: string; reviewerId: string; notify: boolean }) => void;
}) {
  const own = item.authorId === author.staffId;
  const publishNow = own && author.canPublish;
  const next = bumpVersion(item.version, "major");
  const defaultReviewer = own ? author.reviewerId : item.authorId;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={own ? "Correct outdated content" : "Suggest a correction"}
      sub={`${item.paper} · ${item.title}`}
      submitLabel={publishNow ? `Publish ${next}` : "Submit correction for review"}
      width="w-full max-w-xl"
      footerNote={publishNow ? "Replaces the outdated version for learners" : "Stays outdated until the reviewer approves"}
      onSubmit={(data) => {
        onCorrect({
          item,
          publishNow,
          issue: String(data.get("issue") ?? "").trim(),
          fix: String(data.get("fix") ?? "").trim(),
          reviewerId: String(data.get("reviewer") ?? defaultReviewer),
          notify: data.get("notify") === "on",
        });
        onClose();
      }}
    >
      <p className="flex items-start gap-2 rounded-[var(--radius-md)] bg-amber-soft px-3.5 py-3 text-[13px] leading-snug text-ink">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" />
        {item.outdatedReason}
      </p>
      <Field label="What was outdated">
        <Textarea name="issue" rows={2} required defaultValue={item.outdatedReason} />
      </Field>
      <Field label="What you corrected">
        <Textarea name="fix" rows={4} required placeholder="e.g. Replaced the IAS 17 operating lease summary with the IFRS 16 right-of-use model and a worked lessee example." />
      </Field>
      <div className="flex flex-wrap items-center gap-4 rounded-[var(--radius-md)] border border-line bg-surface-2 px-4 py-3">
        <div>
          <MiniLabel>New version</MiniLabel>
          <p className="mt-1 font-mono text-[15px] font-bold text-ink">
            {item.version} <span className="text-ink-3">to</span> {next}
          </p>
        </div>
        {!publishNow ? (
          <Field label="Reviewer" className="min-w-0 flex-1 basis-44">
            <Select name="reviewer" defaultValue={defaultReviewer}>
              {Array.from(new Set([defaultReviewer, ...reviewerOptions(author.staffId).map((r) => r.id)])).map((id) => (
                <option key={id} value={id}>
                  {staffName(id)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
      </div>
      <FileDrop label="Upload the corrected version" accept=".pdf,.docx,.pptx,.mp4" hint="Or make the change in the paper builder and attach nothing" />
      <div className="grid gap-2">
        <Checkbox name="notify" defaultChecked label={`Notify the ${plural(item.views, "learner")} who opened ${item.version}`} />
        <Checkbox name="linked" defaultChecked label="Check linked questions, model answers and university variants" />
      </div>
    </FormDrawer>
  );
}

const SEED_LOG: TimelineItem[] = [
  {
    id: "log-rv-09",
    title: "Group accounts revision notes approved as v3.1",
    meta: "7 Sep 2026 · approved by Hana Suzuki",
    body: "Added non-controlling interest at fair value and the goodwill impairment adjustment.",
    tone: "jade",
    icon: <CheckCircle2 />,
  },
  {
    id: "log-tx-01",
    title: "Income tax computation walkthrough moved to Finance Act 2025",
    meta: "30 May 2026 · Grace Whitfield · reviewed by Marcus Bell",
    body: "Rates, allowances and the worked example updated for TX exams from Jun 2026 to Mar 2027.",
    tone: "jade",
    icon: <CheckCircle2 />,
  },
  {
    id: "log-flag",
    title: "Four items flagged outdated by the September syllabus check",
    meta: "1 Sep 2026 · automatic check against the Sep 2026 to Aug 2027 syllabus",
    body: "Leases summary sheet (FR), learning curve formula sheet (PM), FM examiner report notes (Sep 2025) and TX rates and allowances (FA2024).",
    tone: "amber",
    icon: <AlertTriangle />,
  },
];
