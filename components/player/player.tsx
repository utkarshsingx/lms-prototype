"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  MessageCircleQuestion,
  NotebookPen,
  Paperclip,
  Sparkles,
  X,
} from "lucide-react";
import type { Course, Lesson } from "@/lib/data";
import { lessonCount, lessonTypeLabel } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/field";
import { LessonBullet, LessonTypeIcon } from "@/components/course/lesson-icon";
import {
  ArticleViewer,
  AssignmentViewer,
  LabViewer,
  LiveViewer,
  PackageViewer,
  PdfViewer,
  SlidesViewer,
  VideoViewer,
} from "./viewers";
import { QuizViewer } from "./quiz-viewer";

const TRANSCRIPT = [
  ["00:00", "Right, quorums. The reason this matters is not theoretical."],
  ["00:09", "Every incident I have been paged for that involved data loss came down to a quorum that did not overlap."],
  ["00:21", "So: R plus W greater than N. That is the whole rule."],
  ["00:31", "With five nodes, write to three, read from three. Any read set shares at least one node with the last write set."],
  ["00:48", "Now watch what happens when someone drops W to two because writes felt slow."],
  ["01:02", "Nothing. Nothing happens, for months. Then there is a partition and you find out."],
  ["01:19", "This is the part I want you to take away. The bug is invisible until the exact moment it is expensive."],
];

const DISCUSSION = [
  {
    by: "Daniel Okonkwo",
    at: "2 days ago",
    text: "If W = N, do I still need R > 1? Feels like reading from any single node would be safe.",
    replies: [
      {
        by: "Marcus Bell",
        at: "2 days ago",
        instructor: true,
        text: "Safe for consistency, yes — but W = N means a single node failure blocks all writes. You have traded availability for a read optimisation you did not need.",
      },
    ],
  },
  {
    by: "Arjun Nair",
    at: "5 days ago",
    text: "The phi-accrual example in the reading assumes heartbeat intervals are normally distributed. In our cluster they are bimodal because of the GC pauses. Does the maths still hold?",
    replies: [
      {
        by: "Marcus Bell",
        at: "4 days ago",
        instructor: true,
        text: "It does not, and that is a good catch. Bimodal arrival means the CDF underestimates suspicion during the quiet mode. Fit two distributions or raise the threshold — most people raise the threshold and never find out why it works.",
      },
    ],
  },
];

const RESOURCES = [
  { name: "Quorum sizing cheat sheet.pdf", size: "180 KB" },
  { name: "raft-starter.zip", size: "1.4 MB" },
  { name: "Incident timeline (annotated).pdf", size: "2.1 MB" },
  { name: "Slides — module 3.key", size: "8.6 MB" },
];

export function Player({ course }: { course: Course }) {
  const flat = useMemo(
    () => course.modules.flatMap((m) => m.lessons),
    [course],
  );
  const startIndex = Math.max(
    0,
    flat.findIndex((l) => l.state === "in_progress"),
  );

  const [current, setCurrent] = useState(flat[startIndex]?.id ?? flat[0].id);
  const [railOpen, setRailOpen] = useState(true);
  const [tab, setTab] = useState("transcript");
  const [note, setNote] = useState(
    "R + W > N. With N=5 pick W=3/R=3.\nThe failure only shows up under partition — check our staging config.",
  );

  const idx = flat.findIndex((l) => l.id === current);
  const lesson = flat[idx];
  const module = course.modules.find((m) =>
    m.lessons.some((l) => l.id === current),
  )!;
  const doneCount = flat.filter((l) => l.state === "completed").length;

  return (
    <div className="mx-auto max-w-[110rem]">
      {/* Course bar */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={`/courses/${course.slug}`}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> {course.title}
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12.5px] whitespace-nowrap text-ink-3 tnum sm:block">
            {doneCount} of {lessonCount(course)} lessons
          </span>
          <Progress
            value={course.progress ?? 0}
            className="w-28"
            height={5}
          />
          <span className="text-[12.5px] font-semibold text-ink tnum">
            {course.progress ?? 0}%
          </span>
          <button
            onClick={() => setRailOpen((r) => !r)}
            className="hidden rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium whitespace-nowrap text-ink-2 shadow-[var(--shadow-e1)] hover:bg-surface-2 xl:block"
          >
            {railOpen ? "Hide curriculum" : "Show curriculum"}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-6",
          railOpen ? "xl:grid-cols-[minmax(0,1fr)_22rem]" : "xl:grid-cols-1",
        )}
      >
        <div className="min-w-0 space-y-5">
          {/* Lesson head */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2">
                <LessonTypeIcon type={lesson.type} />
                {lessonTypeLabel[lesson.type]}
              </span>
              <span className="text-[12.5px] text-ink-3">
                {module.title} · lesson {idx + 1} of {flat.length}
              </span>
              {lesson.state === "completed" ? (
                <Badge tone="jade" dot>
                  Complete
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2.5 font-display text-[clamp(1.5rem,1.2rem+1.1vw,2.1rem)] leading-[1.1] tracking-[-0.02em] text-ink">
              {lesson.title}
            </h1>
          </div>

          <Viewer lesson={lesson} course={course} />

          {/* Lesson nav */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={idx === 0}
              onClick={() => setCurrent(flat[idx - 1].id)}
            >
              <ArrowLeft className="size-4" /> Previous
            </Button>
            <Button
              variant="secondary"
              disabled={idx >= flat.length - 1}
              onClick={() => setCurrent(flat[idx + 1].id)}
            >
              Next <ArrowRight className="size-4" />
            </Button>
            <Button className="ml-auto">
              <Check className="size-4" /> Mark complete and continue
            </Button>
          </div>

          {/* Lesson panels */}
          <div>
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { id: "transcript", label: "Transcript" },
                { id: "notes", label: "Notes" },
                { id: "discussion", label: "Q&A", count: DISCUSSION.length },
                { id: "resources", label: "Resources", count: RESOURCES.length },
                { id: "tutor", label: "AI tutor" },
              ]}
            />

            <div className="rounded-b-[var(--radius-lg)] border border-t-0 border-line bg-surface p-5 shadow-[var(--shadow-e1)]">
              {tab === "transcript" ? (
                <div className="space-y-2.5">
                  {TRANSCRIPT.map(([at, text]) => (
                    <p key={at} className="flex gap-4">
                      <button className="shrink-0 font-mono text-[12px] text-brand tnum hover:underline">
                        {at}
                      </button>
                      <span className="text-[13.5px] leading-relaxed text-ink-2">
                        {text}
                      </span>
                    </p>
                  ))}
                  <p className="pt-2 text-[12px] text-ink-3">
                    Auto-generated, reviewed by the instructor. Searchable across
                    the whole course.
                  </p>
                </div>
              ) : null}

              {tab === "notes" ? (
                <div>
                  <div className="mb-2.5 flex items-center gap-2">
                    <NotebookPen className="size-4 text-ink-3" />
                    <span className="text-[12.5px] text-ink-3">
                      Private to you · timestamped to 01:19 · exports with the
                      course
                    </span>
                  </div>
                  <Textarea
                    rows={7}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="font-mono text-[13px]"
                  />
                  <div className="mt-3 flex items-center gap-2.5">
                    <Button size="sm">Save note</Button>
                    <Button variant="ghost" size="sm">
                      <Download className="size-3.5" /> Export all notes
                    </Button>
                  </div>
                </div>
              ) : null}

              {tab === "discussion" ? (
                <div className="space-y-5">
                  {DISCUSSION.map((d) => (
                    <div key={d.by + d.at}>
                      <div className="flex gap-3">
                        <Avatar name={d.by} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-baseline gap-2">
                            <span className="text-[13px] font-medium text-ink">
                              {d.by}
                            </span>
                            <span className="text-[11.5px] text-ink-3">
                              {d.at}
                            </span>
                          </p>
                          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                            {d.text}
                          </p>
                        </div>
                      </div>
                      {d.replies.map((r) => (
                        <div
                          key={r.by + r.at}
                          className="mt-3 ml-11 flex gap-3 border-l-2 border-line pl-4"
                        >
                          <Avatar name={r.by} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-2">
                              <span className="text-[13px] font-medium text-ink">
                                {r.by}
                              </span>
                              {r.instructor ? (
                                <Badge tone="brand">Instructor</Badge>
                              ) : null}
                              <span className="text-[11.5px] text-ink-3">
                                {r.at}
                              </span>
                            </p>
                            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
                              {r.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div className="border-t border-line pt-4">
                    <Textarea rows={2} placeholder="Ask the cohort a question…" />
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <Button size="sm">
                        <MessageCircleQuestion className="size-3.5" /> Post
                      </Button>
                      <span className="text-[12px] text-ink-3">
                        Instructor median reply time: 6 hours
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "resources" ? (
                <ul className="divide-y divide-[var(--line)]">
                  {RESOURCES.map((r) => (
                    <li
                      key={r.name}
                      className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <Paperclip className="size-4 shrink-0 text-ink-3" />
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink-2">
                        {r.name}
                      </span>
                      <span className="shrink-0 text-[12px] text-ink-3 tnum">
                        {r.size}
                      </span>
                      <IconButton label={`Download ${r.name}`} size="sm">
                        <Download className="size-3.5" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              ) : null}

              {tab === "tutor" ? (
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-relaxed text-ink-2">
                      The tutor answers from{" "}
                      <span className="font-medium text-ink">this lesson</span>{" "}
                      and the two before it, not from the open internet. If the
                      answer is not in the course it says so rather than
                      improvising.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {[
                        "Explain the commit index again, slower",
                        "Give me a worked example with N=7",
                        "Why is W=2 dangerous here?",
                      ].map((s) => (
                        <Link
                          key={s}
                          href="/assistant"
                          className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-violet hover:bg-violet-soft hover:text-violet"
                        >
                          {s}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Curriculum rail */}
        {railOpen ? (
          <aside className="xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start">
            <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e1)]">
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ink">
                    Curriculum
                  </p>
                  <p className="mt-0.5 text-[11.5px] text-ink-3 tnum">
                    {course.modules.length} modules · {flat.length} lessons ·{" "}
                    {course.hours}h
                  </p>
                </div>
                <IconButton
                  label="Hide curriculum"
                  size="sm"
                  className="xl:hidden"
                  onClick={() => setRailOpen(false)}
                >
                  <X className="size-4" />
                </IconButton>
              </div>

              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {course.modules.map((m, mi) => {
                  const has = m.lessons.some((l) => l.id === current);
                  const done = m.lessons.filter(
                    (l) => l.state === "completed",
                  ).length;
                  return (
                    <details key={m.id} open={has} className="group border-b border-line last:border-0">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2">
                        <span className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-[11px] font-semibold text-ink-2 tnum">
                          {mi + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-medium text-ink">
                            {m.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-ink-3 tnum">
                            {done}/{m.lessons.length} ·{" "}
                            {m.lessons.reduce((n, l) => n + l.minutes, 0)} min
                          </span>
                        </span>
                        <ChevronDown className="size-3.5 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                      </summary>
                      <ul className="pb-1">
                        {m.lessons.map((l) => {
                          const active = l.id === current;
                          return (
                            <li key={l.id}>
                              <button
                                onClick={() => setCurrent(l.id)}
                                className={cn(
                                  "flex w-full items-center gap-3 py-2 pr-4 pl-4 text-left transition-colors",
                                  active
                                    ? "bg-brand-soft"
                                    : "hover:bg-surface-2",
                                )}
                              >
                                <LessonBullet type={l.type} state={l.state} />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block truncate text-[12.5px]",
                                      active
                                        ? "font-medium text-brand"
                                        : l.state === "completed"
                                          ? "text-ink-3"
                                          : "text-ink-2",
                                    )}
                                  >
                                    {l.title}
                                  </span>
                                </span>
                                <span className="shrink-0 text-[11px] text-ink-3 tnum">
                                  {l.minutes}m
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}

function Viewer({ lesson, course }: { lesson: Lesson; course: Course }) {
  switch (lesson.type) {
    case "video":
      return <VideoViewer lesson={lesson} />;
    case "article":
      return <ArticleViewer lesson={lesson} />;
    case "pdf":
      return <PdfViewer lesson={lesson} />;
    case "slides":
      return <SlidesViewer lesson={lesson} />;
    case "scorm":
    case "xapi":
      return <PackageViewer lesson={lesson} />;
    case "quiz":
      return <QuizViewer lesson={lesson} />;
    case "lab":
      return <LabViewer lesson={lesson} />;
    case "assignment":
      return <AssignmentViewer lesson={lesson} course={course} />;
    case "live":
      return <LiveViewer lesson={lesson} />;
    default:
      return <ArticleViewer lesson={lesson} />;
  }
}
