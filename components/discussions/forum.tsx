"use client";

import { Fragment, useCallback, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronUp,
  CircleCheck,
  Eye,
  MessageSquare,
  Plus,
  Search,
  SearchX,
  Send,
  Sparkles,
} from "lucide-react";
import {
  courseById,
  currentUser,
  discussionThreads,
  enrolledCourses,
  hasAcceptedAnswer,
  isCourseInstructor,
  lastActivityMinutes,
  personById,
  similarThreads,
  threadStatus,
  timeAgo,
  type Course,
  type DiscussionAnswer,
  type DiscussionThread,
  type ThreadStatus,
} from "@/lib/data";
import { cn } from "@/lib/cn";
import { Card, SectionTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import { Drawer, Modal } from "@/components/ui/modal";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { RichText } from "@/components/assistant/rich-text";

type TabId = "all" | "mine" | "unanswered";
type SortId = "newest" | "activity" | "votes";
type AskDraft = { title: string; courseId: string; body: string; tags: string };

const SORTS: { id: SortId; label: string }[] = [
  { id: "newest", label: "Newest" },
  { id: "activity", label: "Recent activity" },
  { id: "votes", label: "Most upvoted" },
];

const EMPTY_DRAFT: AskDraft = { title: "", courseId: "", body: "", tags: "" };
const ASK_FORM_ID = "ask-question-form";

const STATUS_LABEL: Record<ThreadStatus, string> = {
  instructor: "Instructor answered",
  peer: "Peer answered",
  unanswered: "Unanswered",
};

const byNewest = (a: DiscussionThread, b: DiscussionThread) =>
  a.minutesAgo - b.minutesAgo;

const SORTERS: Record<
  SortId,
  (a: DiscussionThread, b: DiscussionThread) => number
> = {
  newest: byNewest,
  activity: (a, b) =>
    lastActivityMinutes(a) - lastActivityMinutes(b) || byNewest(a, b),
  // Sorted on the stored count, not the viewer's own vote, so a row does not
  // jump out from under the pointer the moment it is upvoted.
  votes: (a, b) => b.upvotes - a.upvotes || byNewest(a, b),
};

function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().slice(0, 24);
    const key = tag.toLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length === 3) break;
  }
  return out;
}

function matchesSearch(t: DiscussionThread, terms: string[]) {
  if (terms.length === 0) return true;
  const haystack = [
    t.title,
    t.body,
    t.tags.join(" "),
    courseById(t.courseId)?.title ?? "",
    personById(t.authorId)?.name ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return terms.every((w) => haystack.includes(w));
}

export function Forum() {
  const [threads, setThreads] =
    useState<DiscussionThread[]>(discussionThreads);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<TabId>("all");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [sort, setSort] = useState<SortId>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [freshId, setFreshId] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  // Both drafts live here rather than inside the Modal or Drawer, because
  // those unmount their content on close. Opening a similar question from the
  // ask form, or closing a thread mid-reply, must not throw away the writing.
  const [draft, setDraft] = useState<AskDraft>(EMPTY_DRAFT);
  const [replies, setReplies] = useState<Record<string, string>>({});

  const counts = useMemo<Record<TabId, number>>(
    () => ({
      all: threads.length,
      mine: threads.filter((t) => t.authorId === currentUser.id).length,
      unanswered: threads.filter((t) => t.answers.length === 0).length,
    }),
    [threads],
  );

  const threadCourses = useMemo(
    () =>
      Array.from(new Set(threads.map((t) => t.courseId)))
        .map((id) => courseById(id))
        .filter((c): c is Course => c !== undefined)
        .sort((a, b) => (a.title < b.title ? -1 : 1)),
    [threads],
  );

  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return threads
      .filter((t) => {
        if (tab === "mine" && t.authorId !== currentUser.id) return false;
        if (tab === "unanswered" && t.answers.length > 0) return false;
        if (courseFilter !== "all" && t.courseId !== courseFilter) return false;
        return matchesSearch(t, terms);
      })
      .sort(SORTERS[sort]);
  }, [threads, tab, courseFilter, query, sort]);

  const similar = useMemo(
    () => similarThreads(draft.title, threads),
    [draft.title, threads],
  );

  const openThread = openId
    ? (threads.find((t) => t.id === openId) ?? null)
    : null;
  const filtered = query.trim() !== "" || courseFilter !== "all";
  const draftTags = parseTags(draft.tags);
  const canPost = draft.title.trim() !== "" && draft.courseId !== "";

  const closeThread = useCallback(() => setOpenId(null), []);
  const closeAsk = useCallback(() => setAskOpen(false), []);

  function toggleVote(id: string) {
    setVoted((v) => ({ ...v, [id]: !v[id] }));
  }

  function showThread(id: string) {
    setOpenId(id);
    setFreshId(null);
  }

  function clearFilters() {
    setQuery("");
    setCourseFilter("all");
  }

  /** Never overwrites anything already typed into the draft. */
  function openAsk(seedTitle = "") {
    setDraft((d) => ({
      ...d,
      title: d.title || seedTitle,
      courseId:
        d.courseId ||
        (enrolledCourses.some((c) => c.id === courseFilter)
          ? courseFilter
          : ""),
    }));
    setAskOpen(true);
  }

  function submitAsk() {
    if (!canPost) return;
    const thread: DiscussionThread = {
      id: `t-new-${threads.length + 1}`,
      courseId: draft.courseId,
      authorId: currentUser.id,
      title: draft.title.trim(),
      body: draft.body.trim(),
      tags: draftTags,
      minutesAgo: 0,
      views: 0,
      upvotes: 0,
      answers: [],
    };
    setThreads((ts) => [thread, ...ts]);
    setDraft(EMPTY_DRAFT);
    // The new question matches every tab, but a leftover search or course
    // filter could hide it, and with no upvotes it would sink to the bottom.
    clearFilters();
    setSort((s) => (s === "votes" ? "newest" : s));
    setFreshId(thread.id);
    setAskOpen(false);
  }

  function postReply(threadId: string) {
    const body = (replies[threadId] ?? "").trim();
    if (!body) return;
    setThreads((ts) =>
      ts.map((t) =>
        t.id === threadId
          ? {
              ...t,
              answers: [
                ...t.answers,
                {
                  id: `${t.id}-a${t.answers.length + 1}`,
                  authorId: currentUser.id,
                  body,
                  minutesAgo: 0,
                  upvotes: 0,
                },
              ],
            }
          : t,
      ),
    );
    setReplies((r) => ({ ...r, [threadId]: "" }));
  }

  const total = counts[tab];

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Ask the cohort"
        sub="Peers and course instructors answer here, and any answer an instructor has verified is marked, so you can tell at a glance which ones to trust."
        actions={
          <Button onClick={() => openAsk()}>
            <Plus className="size-4" /> Ask a question
          </Button>
        }
      />

      <section className="space-y-4">
        <Tabs
          value={tab}
          onChange={(id) => setTab(id as TabId)}
          items={[
            { id: "all", label: "All questions", count: counts.all },
            { id: "mine", label: "My questions", count: counts.mine },
            { id: "unanswered", label: "Unanswered", count: counts.unanswered },
          ]}
        />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <div className="min-w-0 flex-1">
            <Input
              type="search"
              icon={<Search />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions, tags and people"
              aria-label="Search discussions"
            />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <div className="w-full min-w-0 sm:w-64">
              <Select
                aria-label="Filter by course"
                value={courseFilter}
                onChange={(e) => setCourseFilter(e.target.value)}
              >
                <option value="all">All courses</option>
                {threadCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>
            <Segmented
              items={SORTS}
              value={sort}
              onChange={(id) => setSort(id as SortId)}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p aria-live="polite" className="text-[12.5px] text-ink-3 tnum">
            <span className="font-medium text-ink-2">{visible.length}</span>
            {filtered ? ` of ${total}` : ""}{" "}
            {(filtered ? total : visible.length) === 1
              ? "question"
              : "questions"}
          </p>
          {filtered ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[12.5px] font-medium text-brand hover:underline"
            >
              Clear filters
            </button>
          ) : (
            <p className="text-[12px] text-ink-3">
              Instructor median reply time: 6 hours
            </p>
          )}
        </div>

        {visible.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX />}
              title="No questions match"
              sub="Try fewer words or another course. If nobody has asked it yet, you can be the first."
              action={
                <div className="flex flex-wrap justify-center gap-2.5">
                  <Button variant="secondary" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                  <Button size="sm" onClick={() => openAsk(query.trim())}>
                    <Plus className="size-3.5" /> Ask a question
                  </Button>
                </div>
              }
            />
          ) : tab === "mine" ? (
            <EmptyState
              icon={<MessageSquare />}
              title="You have not asked anything yet"
              sub="Questions you ask in any course collect here, along with every answer they get."
              action={
                <Button size="sm" onClick={() => openAsk()}>
                  <Plus className="size-3.5" /> Ask a question
                </Button>
              }
            />
          ) : tab === "unanswered" ? (
            <EmptyState
              icon={<CircleCheck />}
              title="Every question has an answer"
              sub="Nothing is waiting on the cohort right now."
            />
          ) : (
            <EmptyState
              icon={<MessageSquare />}
              title="No questions yet"
              sub="The first question in a course is usually the one everyone else was wondering about."
            />
          )
        ) : (
          <Card className="overflow-hidden">
            <ul className="divide-y divide-[var(--line)]">
              {visible.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  voted={Boolean(voted[t.id])}
                  fresh={t.id === freshId}
                  onOpen={() => showThread(t.id)}
                  onVote={() => toggleVote(t.id)}
                  onTag={setQuery}
                />
              ))}
            </ul>
          </Card>
        )}
      </section>

      <Modal
        open={askOpen}
        onClose={closeAsk}
        title="Ask a question"
        sub="Your cohort sees it straight away, and the course instructor is notified."
        width="max-w-xl"
        footer={
          <>
            <Button variant="ghost" onClick={closeAsk}>
              Cancel
            </Button>
            <Button type="submit" form={ASK_FORM_ID} disabled={!canPost}>
              Post question
            </Button>
          </>
        }
      >
        <AskForm
          draft={draft}
          tags={draftTags}
          similar={similar}
          onChange={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onSubmit={submitAsk}
          onViewSimilar={(id) => {
            setAskOpen(false);
            showThread(id);
          }}
        />
      </Modal>

      <Drawer
        open={openThread !== null}
        onClose={closeThread}
        title="Question"
        width="w-full max-w-2xl"
      >
        {openThread ? (
          <ThreadDetail
            thread={openThread}
            voted={voted}
            onVote={toggleVote}
            reply={replies[openThread.id] ?? ""}
            onReplyChange={(text) =>
              setReplies((r) => ({ ...r, [openThread.id]: text }))
            }
            onPost={() => postReply(openThread.id)}
          />
        ) : null}
      </Drawer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

function ThreadRow({
  thread,
  voted,
  fresh,
  onOpen,
  onVote,
  onTag,
}: {
  thread: DiscussionThread;
  voted: boolean;
  fresh: boolean;
  onOpen: () => void;
  onVote: () => void;
  onTag: (tag: string) => void;
}) {
  const course = courseById(thread.courseId);
  const name = personById(thread.authorId)?.name ?? "Former member";
  const status = threadStatus(thread);
  const accepted = hasAcceptedAnswer(thread);
  const answers = thread.answers.length;
  const votes = thread.upvotes + (voted ? 1 : 0);
  const activity = lastActivityMinutes(thread);

  return (
    <li
      className={cn(
        "relative flex gap-4 px-4 py-4 transition-colors hover:bg-surface-2/60 sm:px-5",
        fresh && "bg-brand-soft/50",
      )}
    >
      {/* Meta column. Below sm it collapses into the inline row further down. */}
      <div className="hidden w-[4.25rem] shrink-0 flex-col gap-1.5 sm:flex">
        <VoteButton count={votes} voted={voted} onClick={onVote} />
        <AnswerCount count={answers} accepted={accepted} />
        <span className="mt-0.5 text-center text-[11px] text-ink-3 tnum">
          {thread.views} {thread.views === 1 ? "view" : "views"}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[15px] leading-snug font-medium tracking-[-0.01em] text-ink [overflow-wrap:anywhere]">
          {/* The title's ::after covers the whole row, so the row is one
              click target without nesting the vote and tag buttons in it. */}
          <button
            type="button"
            onClick={onOpen}
            className="text-left transition-colors outline-none after:absolute after:inset-0 hover:text-brand focus-visible:after:shadow-[inset_0_0_0_2px_var(--brand)]"
          >
            <InlineCode text={thread.title} />
          </button>
        </h3>

        {thread.body ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-ink-3 [overflow-wrap:anywhere]">
            {thread.body.replace(/`/g, "")}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {course ? <CourseBadge course={course} /> : null}
          {thread.tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTag(tag)}
              title={`Search for ${tag}`}
              className="relative z-10 max-w-full truncate rounded-[var(--radius-xs)] border border-line bg-surface-2 px-1.5 py-px text-[11.5px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
            >
              {tag}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-3">
            <Avatar name={name} size="xs" />
            <span className="min-w-0 truncate font-medium text-ink-2">
              {name}
            </span>
            <span>asked {timeAgo(thread.minutesAgo)}</span>
            {activity < thread.minutesAgo ? (
              <span>· last reply {timeAgo(activity)}</span>
            ) : null}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {thread.assistantDraft ? (
              <Badge tone="violet">
                <Sparkles className="size-3" aria-hidden /> Assistant draft
              </Badge>
            ) : null}
            <StatusBadge status={status} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 sm:hidden">
          <VoteButton
            layout="inline"
            count={votes}
            voted={voted}
            onClick={onVote}
          />
          <AnswerCount layout="inline" count={answers} accepted={accepted} />
          <span className="inline-flex items-center gap-1 text-[12px] text-ink-3 tnum">
            <Eye className="size-3.5" aria-hidden /> {thread.views} views
          </span>
        </div>
      </div>
    </li>
  );
}

function VoteButton({
  count,
  voted,
  onClick,
  layout = "stack",
  className,
}: {
  count: number;
  voted: boolean;
  onClick: () => void;
  layout?: "stack" | "inline";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={voted}
      title={voted ? "Remove your upvote" : "Upvote"}
      className={cn(
        "relative z-10 inline-flex items-center justify-center border font-semibold tnum transition-colors duration-150",
        layout === "stack"
          ? "w-full flex-col rounded-[var(--radius-sm)] py-1 text-[13px] leading-tight"
          : "h-7 gap-1 rounded-[var(--radius-pill)] px-2.5 text-[12px]",
        voted
          ? "border-brand-line bg-brand-soft text-brand"
          : "border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink",
        className,
      )}
    >
      <ChevronUp
        className={layout === "stack" ? "size-4" : "size-3.5"}
        strokeWidth={2.4}
        aria-hidden
      />
      {count}
      <span className="sr-only">{count === 1 ? " upvote" : " upvotes"}</span>
    </button>
  );
}

function AnswerCount({
  count,
  accepted,
  layout = "stack",
}: {
  count: number;
  accepted: boolean;
  layout?: "stack" | "inline";
}) {
  const word = count === 1 ? "answer" : "answers";
  const tone = accepted
    ? "border-transparent bg-jade-soft text-jade"
    : count > 0
      ? "border-line text-ink-2"
      : "border-dashed border-line-strong text-ink-3";
  const acceptedNote = accepted ? (
    <span className="sr-only">, one accepted</span>
  ) : null;

  if (layout === "inline") {
    return (
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-[var(--radius-pill)] border px-2.5 text-[12px] font-medium tnum",
          tone,
        )}
      >
        {accepted ? (
          <CircleCheck className="size-3.5" aria-hidden />
        ) : (
          <MessageSquare className="size-3.5" aria-hidden />
        )}
        {count} {word}
        {acceptedNote}
      </span>
    );
  }

  return (
    <span
      title={accepted ? "Has an accepted answer" : undefined}
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-sm)] border py-1 leading-tight",
        tone,
      )}
    >
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold tnum">
        {accepted ? <CircleCheck className="size-3.5" aria-hidden /> : null}
        {count}
      </span>
      <span className="text-[10.5px]">{word}</span>
      {acceptedNote}
    </span>
  );
}

function StatusBadge({ status }: { status: ThreadStatus }) {
  const tone: Tone =
    status === "instructor"
      ? "brand"
      : status === "unanswered"
        ? "amber"
        : "neutral";
  return (
    <Badge tone={tone} dot>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function CourseBadge({ course }: { course: Course }) {
  return (
    <Badge tone={course.accent as Tone} className="max-w-full min-w-0">
      <span className="min-w-0 truncate">{course.title}</span>
    </Badge>
  );
}

function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-[var(--radius-xs)] border border-line bg-surface-2 px-1.5 py-px text-[11.5px] text-ink-2">
      {children}
    </span>
  );
}

/** Backticks in a title become code, matching how RichText renders bodies.
 *  RichText itself wraps in <p>, which cannot sit inside a heading button. */
function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, i) =>
        part.length > 1 && part.startsWith("`") && part.endsWith("`") ? (
          <code
            key={i}
            className="rounded-[var(--radius-xs)] border border-line bg-surface-2 px-1 py-px font-mono text-[0.86em] font-normal text-ink"
          >
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Thread detail                                                       */
/* ------------------------------------------------------------------ */

function ThreadDetail({
  thread,
  voted,
  onVote,
  reply,
  onReplyChange,
  onPost,
}: {
  thread: DiscussionThread;
  voted: Record<string, boolean>;
  onVote: (id: string) => void;
  reply: string;
  onReplyChange: (text: string) => void;
  onPost: () => void;
}) {
  const course = courseById(thread.courseId);
  const author = personById(thread.authorId);
  const authorName = author?.name ?? "Former member";
  const instructor = course ? personById(course.instructorId) : undefined;
  // Accepted first, then by stored votes. A new reply has none, so it lands
  // last, directly above the box it was typed into.
  const answers = [...thread.answers].sort(
    (a, b) =>
      Number(Boolean(b.accepted)) - Number(Boolean(a.accepted)) ||
      b.upvotes - a.upvotes,
  );
  const count = answers.length;
  const replyId = `reply-${thread.id}`;
  const threadVoted = Boolean(voted[thread.id]);

  return (
    <div className="flex min-h-full flex-col">
      <article className="px-5 pt-5 pb-6">
        <div className="flex flex-wrap items-center gap-1.5">
          {course ? <CourseBadge course={course} /> : null}
          {thread.tags.map((tag) => (
            <TagChip key={tag}>{tag}</TagChip>
          ))}
        </div>

        <h3 className="mt-3 text-[19px] leading-snug font-semibold tracking-[-0.015em] text-ink [overflow-wrap:anywhere]">
          <InlineCode text={thread.title} />
        </h3>

        <div className="mt-3 flex items-center gap-2.5">
          <Avatar name={authorName} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink">
              {authorName}
            </p>
            <p className="truncate text-[12px] text-ink-3">
              {author ? `${author.title} · ` : ""}asked{" "}
              {timeAgo(thread.minutesAgo)}
            </p>
          </div>
        </div>

        {thread.body ? (
          <div className="mt-4 text-[14px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
            <RichText text={thread.body} />
          </div>
        ) : null}

        {thread.lesson ? (
          <p className="mt-4 flex items-start gap-1.5 text-[12.5px] text-ink-3">
            <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              Asked from{" "}
              <span className="font-medium text-ink-2">{thread.lesson}</span>
            </span>
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <VoteButton
            layout="inline"
            count={thread.upvotes + (threadVoted ? 1 : 0)}
            voted={threadVoted}
            onClick={() => onVote(thread.id)}
          />
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 tnum">
            <Eye className="size-3.5" aria-hidden /> {thread.views} views
          </span>
        </div>
      </article>

      <section className="border-t border-line px-5 py-5">
        <SectionTitle>
          <span className="tnum">
            {count} {count === 1 ? "answer" : "answers"}
          </span>
        </SectionTitle>

        {count === 0 ? (
          <p className="text-[13px] leading-relaxed text-ink-3">
            No one has answered yet.
            {instructor
              ? ` ${instructor.name} teaches this course and has been notified.`
              : ""}
          </p>
        ) : (
          <div className="space-y-3">
            {answers.map((a) => (
              <AnswerCard
                key={a.id}
                answer={a}
                courseId={thread.courseId}
                voted={Boolean(voted[a.id])}
                onVote={() => onVote(a.id)}
              />
            ))}
          </div>
        )}

        {thread.assistantDraft ? (
          <AssistantDraft
            draft={thread.assistantDraft}
            instructorName={instructor?.name}
          />
        ) : null}
      </section>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onPost();
        }}
        className="mt-auto border-t border-line bg-surface-2 px-5 py-4"
      >
        <Label htmlFor={replyId}>Your answer</Label>
        <Textarea
          id={replyId}
          rows={3}
          value={reply}
          onChange={(e) => onReplyChange(e.target.value)}
          placeholder="Share what you know or what you tried. A specific answer helps more than agreement."
        />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <span className="inline-flex min-w-0 items-center gap-2 text-[12px] text-ink-3">
            <Avatar name={currentUser.name} size="xs" />
            <span className="truncate">Posting as {currentUser.name}</span>
          </span>
          <Button type="submit" size="sm" disabled={!reply.trim()}>
            <Send className="size-3.5" /> Post
          </Button>
        </div>
      </form>
    </div>
  );
}

function AnswerCard({
  answer,
  courseId,
  voted,
  onVote,
}: {
  answer: DiscussionAnswer;
  courseId: string;
  voted: boolean;
  onVote: () => void;
}) {
  const name = personById(answer.authorId)?.name ?? "Former member";
  const instructor = isCourseInstructor(answer.authorId, courseId);

  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] border p-4",
        answer.accepted
          ? "border-jade/40 bg-jade-soft/40"
          : "border-line bg-surface",
      )}
    >
      {answer.accepted ? (
        <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold text-jade">
          <CircleCheck className="size-4" aria-hidden /> Accepted answer
        </p>
      ) : null}
      <div className="flex gap-3">
        <Avatar name={name} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] font-medium text-ink">{name}</span>
            <Badge tone={instructor ? "brand" : "neutral"}>
              {instructor ? "Instructor" : "Peer"}
            </Badge>
            <span className="text-[11.5px] text-ink-3">
              {timeAgo(answer.minutesAgo)}
            </span>
          </p>
          <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
            <RichText text={answer.body} />
          </div>
          <VoteButton
            layout="inline"
            className="mt-3"
            count={answer.upvotes + (voted ? 1 : 0)}
            voted={voted}
            onClick={onVote}
          />
        </div>
      </div>
    </div>
  );
}

/** Violet and dashed, outside the answer list, with no vote and no accept
 *  state: nothing about it may read as a verified answer. */
function AssistantDraft({
  draft,
  instructorName,
}: {
  draft: NonNullable<DiscussionThread["assistantDraft"]>;
  instructorName?: string;
}) {
  return (
    <div className="mt-4 rounded-[var(--radius-md)] border border-dashed border-violet/45 bg-violet-soft/60 p-4">
      <p className="flex items-center gap-2 text-[12.5px] font-semibold text-violet">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-violet/30 bg-surface">
          <Sparkles className="size-3.5" aria-hidden />
        </span>
        Assistant draft · not yet verified by an instructor
      </p>
      <div className="mt-2.5 text-[13.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">
        <RichText text={draft.body} />
      </div>
      {draft.sources.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11.5px] text-ink-3">Drawn from</span>
          {draft.sources.map((s) => (
            <span
              key={s}
              className="max-w-full truncate rounded-[var(--radius-pill)] border border-line bg-surface px-2 py-0.5 text-[11.5px] text-ink-2"
            >
              {s}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 text-[12px] leading-relaxed text-ink-3">
        Written from the course material, not by a person. It does not count as
        an answer and cannot be accepted
        {instructorName
          ? `. ${instructorName} can verify, edit or discard it.`
          : "."}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ask a question                                                      */
/* ------------------------------------------------------------------ */

function AskForm({
  draft,
  tags,
  similar,
  onChange,
  onSubmit,
  onViewSimilar,
}: {
  draft: AskDraft;
  tags: string[];
  similar: DiscussionThread[];
  onChange: (patch: Partial<AskDraft>) => void;
  onSubmit: () => void;
  onViewSimilar: (id: string) => void;
}) {
  return (
    <form
      id={ASK_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4.5"
    >
      <div>
        <Label
          htmlFor="ask-title"
          hint={<span className="tnum">{draft.title.length}/140</span>}
        >
          Title
        </Label>
        <Input
          id="ask-title"
          autoFocus
          maxLength={140}
          value={draft.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="What exactly are you stuck on?"
        />
        {similar.length > 0 ? (
          <div className="mt-2.5 rounded-[var(--radius-md)] border border-line bg-surface-2 p-2">
            <p className="px-2 pt-1 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">
              Similar questions
            </p>
            <ul className="mt-1">
              {similar.map((t) => {
                const n = t.answers.length;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => onViewSimilar(t.id)}
                      className="flex w-full items-start gap-2.5 rounded-[var(--radius-sm)] px-2 py-1.5 text-left transition-colors hover:bg-surface"
                    >
                      <MessageSquare
                        className="mt-0.5 size-3.5 shrink-0 text-ink-3"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] leading-snug text-ink [overflow-wrap:anywhere]">
                          <InlineCode text={t.title} />
                        </span>
                        <span className="mt-0.5 block text-[11.5px] text-ink-3 tnum">
                          {n} {n === 1 ? "answer" : "answers"} ·{" "}
                          {hasAcceptedAnswer(t)
                            ? "Accepted answer"
                            : STATUS_LABEL[threadStatus(t)]}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      <div>
        <Label htmlFor="ask-course">Course</Label>
        <Select
          id="ask-course"
          value={draft.courseId}
          onChange={(e) => onChange({ courseId: e.target.value })}
        >
          <option value="" disabled>
            Choose one of your courses
          </option>
          {enrolledCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <Label htmlFor="ask-body" hint="Optional">
          Details
        </Label>
        <Textarea
          id="ask-body"
          rows={5}
          value={draft.body}
          onChange={(e) => onChange({ body: e.target.value })}
          placeholder="What you tried, what you expected and what happened instead. Name the lesson if it came from one."
        />
      </div>

      <div>
        <Label htmlFor="ask-tags" hint="Up to 3, separated by commas">
          Tags
        </Label>
        <Input
          id="ask-tags"
          value={draft.tags}
          onChange={(e) => onChange({ tags: e.target.value })}
          placeholder="Raft, Leader election"
        />
        {tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <TagChip key={tag}>{tag}</TagChip>
            ))}
          </div>
        ) : null}
      </div>
    </form>
  );
}
