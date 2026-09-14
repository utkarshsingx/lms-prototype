"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  MessageCircleQuestion,
  NotebookPen,
  Sparkles,
  X,
} from "lucide-react";
import type { Course, Lesson } from "@/lib/data";
import { lessonTypeLabel } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/ui/avatar";
import { Tabs } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
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

/* The tutor video is the goodwill working from bible section 7: 80% of S,
   consideration 3,000 + 2,200, NCI at fair value 1,100, net assets 4,800. */
const TRANSCRIPT: [string, string][] = [
  ["00:00", "This lesson is goodwill on acquisition, the working that sits inside almost every FR consolidation question."],
  ["00:11", "P acquires 80% of S. Start with consideration: cash of $3,000k, plus 1,000k P shares issued at a market price of $2.20."],
  ["00:26", "The shares are valued at market price, so they are worth $2,200k and total consideration is $5,200k."],
  ["00:38", "Next, the non-controlling interest. This question measures NCI at fair value, and that fair value is $1,100k."],
  ["00:51", "Now S's net assets at acquisition: share capital $1,000k, retained earnings $3,300k and a fair value uplift on land of $500k. That is $4,800k."],
  ["01:09", "Goodwill is consideration plus NCI less net assets: 5,200 plus 1,100 minus 4,800, which is $1,500k."],
  ["01:22", "If NCI were measured at its proportionate share of net assets instead, NCI would be 20% of 4,800, so $960k, and goodwill would be $1,360k."],
  ["01:40", "The $140k difference is the goodwill that belongs to the NCI. The requirement always tells you which method to use, so read it before you start."],
  ["01:55", "One trap to finish: professional fees on the acquisition are expensed under IFRS 3. They are never added to consideration."],
];

type Reply = { by: string; at: string; faculty?: boolean; text: string };
type Thread = { id: string; by: string; role: string; at: string; text: string; replies: Reply[] };

const DISCUSSION: Thread[] = [
  {
    id: "q-uplift",
    by: "Kavya Menon",
    role: "Graduate learner · FR Dec 2026 weekend",
    at: "2 days ago",
    text: "Why does the $500k land uplift go into net assets at acquisition, when a revaluation S makes next year does not change goodwill?",
    replies: [
      {
        by: "Marcus Bell",
        at: "2 days ago",
        faculty: true,
        text: "Goodwill is fixed at the acquisition date, so only fair values on that date count. The uplift existed when P took control. A revaluation next year is post-acquisition: it goes to group reserves and the NCI's share, and goodwill never moves.",
      },
    ],
  },
  {
    id: "q-proportionate",
    by: "Siddharth Kulkarni",
    role: "B.Com (Hons) with ACCA · Brightwater",
    at: "4 days ago",
    text: "In the practice question NCI was at the proportionate share. Do I still include the fair value uplift before taking 20%?",
    replies: [
      {
        by: "Marcus Bell",
        at: "4 days ago",
        faculty: true,
        text: "Yes. Proportionate NCI is a share of the fair value of net assets, uplift included. With this lesson's figures that is 20% of $4,800k, so $960k, not 20% of $4,300k.",
      },
    ],
  },
  {
    id: "q-shares",
    by: "Ishita Shah",
    role: "Graduate learner · FR Dec 2026 weekend",
    at: "6 days ago",
    text: "Are the 1,000k shares valued at nominal value or at the $2.20 market price?",
    replies: [
      {
        by: "Marcus Bell",
        at: "5 days ago",
        faculty: true,
        text: "At fair value on the acquisition date, so the $2.20 market price. Nominal value only decides how P splits the credit between share capital and share premium in its own books.",
      },
    ],
  },
];

const RESOURCES = [
  { name: "IFRS standards quick reference.pdf", size: "420 KB", sheet: false },
  { name: "Consolidation workings template.xlsx", size: "96 KB", sheet: true },
  { name: "Group accounts past exam questions.pdf", size: "2.4 MB", sheet: false },
  { name: "Module 3 slides.pdf", size: "6.8 MB", sheet: false },
];

const DEFAULT_NOTE = `Goodwill = consideration + NCI - FV of net assets at acquisition
FV method: 5,200 + 1,100 - 4,800 = 1,500
Proportionate: NCI = 20% x 4,800 = 960, goodwill 1,360
Acquisition fees: expense them, never add to consideration`;

const TUTOR_PROMPTS = [
  "Explain the proportionate NCI method again, more slowly",
  "Give me a goodwill example with a 75% holding",
  "Why is the land uplift in net assets at acquisition?",
  "How is a goodwill impairment split with NCI at fair value?",
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

  const [current, setCurrent] = useState(flat[startIndex]?.id ?? flat[0]?.id);
  const [railOpen, setRailOpen] = useState(true);
  const [tab, setTab] = useState("transcript");
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [noteSaved, setNoteSaved] = useState(true);
  const [completed, setCompleted] = useState<string[]>([]);
  const [threads, setThreads] = useState(DISCUSSION);
  const [draft, setDraft] = useState("");
  const [downloaded, setDownloaded] = useState<string[]>([]);

  if (!flat.length) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 text-[14px] text-ink-2">
        This paper has no lessons published yet.
      </p>
    );
  }

  const idx = Math.max(0, flat.findIndex((l) => l.id === current));
  const base = flat[idx];
  const stateOf = (l: Lesson): Lesson["state"] =>
    completed.includes(l.id) ? "completed" : l.state;
  const lesson = { ...base, state: stateOf(base) };
  const mod =
    course.modules.find((m) => m.lessons.some((l) => l.id === lesson.id)) ??
    course.modules[0];
  const doneCount = flat.filter((l) => stateOf(l) === "completed").length;
  // The paper's recorded progress, raised as lessons are completed here.
  const progress = Math.max(
    course.progress ?? 0,
    Math.round((doneCount / flat.length) * 100),
  );
  const goNext = () => {
    if (idx < flat.length - 1) setCurrent(flat[idx + 1].id);
  };
  const completeAndContinue = () => {
    setCompleted((c) => (c.includes(lesson.id) ? c : [...c, lesson.id]));
    toast({ title: "Lesson complete", body: lesson.title });
    goNext();
  };

  return (
    <div className="mx-auto max-w-[110rem]">
      {/* Paper bar */}
      <div className="mb-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href={`/courses/${course.slug}`}
          className="inline-flex min-w-0 items-center gap-1.5 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4 shrink-0" />
          <span className="truncate">{course.title}</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[12.5px] whitespace-nowrap text-ink-3 tnum sm:block">
            {doneCount} of {flat.length} lessons
          </span>
          <Progress value={progress} className="w-28" height={6} />
          <span className="text-[12.5px] font-bold text-ink tnum">{progress}%</span>
          <button
            onClick={() => setRailOpen((r) => !r)}
            className="hidden rounded-[var(--radius-sm)] border border-line bg-surface px-2.5 py-1.5 text-[12px] font-semibold whitespace-nowrap text-ink-2 hover:bg-cta-soft hover:text-ink xl:block"
          >
            {railOpen ? "Hide lessons" : "Show lessons"}
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
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-inv px-2.5 py-1 text-[11.5px] font-semibold text-ink-inv">
                <LessonTypeIcon type={lesson.type} className="text-cta" />
                {lessonTypeLabel[lesson.type]}
              </span>
              <span className="text-[12.5px] text-ink-3">
                {mod.title} · lesson {idx + 1} of {flat.length}
              </span>
              {lesson.state === "completed" ? (
                <Badge tone="jade" dot>
                  Complete
                </Badge>
              ) : null}
            </div>
            <h1 className="mt-2.5 font-display text-[clamp(1.5rem,1.2rem+1.1vw,2.1rem)] leading-[1.1] font-bold tracking-[var(--display-tracking)] text-ink">
              {lesson.title}
            </h1>
          </div>

          <Viewer lesson={lesson} course={course} onContinue={completeAndContinue} />

          {/* Lesson nav */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              disabled={idx === 0}
              onClick={() => setCurrent(flat[idx - 1].id)}
            >
              <ArrowLeft className="size-4" />
              <span className="max-sm:sr-only">Previous</span>
            </Button>
            <Button
              variant="secondary"
              disabled={idx >= flat.length - 1}
              onClick={goNext}
            >
              <span className="max-sm:sr-only">Next</span>
              <ArrowRight className="size-4" />
            </Button>
            <Button className="ml-auto" onClick={completeAndContinue}>
              <Check className="size-4" />
              {lesson.state === "completed" ? "Continue" : "Mark complete and continue"}
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
                { id: "discussion", label: "Q&A", count: threads.length },
                { id: "resources", label: "Resources", count: RESOURCES.length },
                { id: "tutor", label: "AI tutor" },
              ]}
            />

            <div className="rounded-b-[var(--radius-lg)] border border-t-0 border-line bg-surface p-5">
              {tab === "transcript" ? (
                <div className="space-y-2.5">
                  {TRANSCRIPT.map(([at, text]) => (
                    <p key={at} className="flex gap-4">
                      <span className="shrink-0 font-mono text-[12px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4 tnum">
                        {at}
                      </span>
                      <span className="text-[13.5px] leading-relaxed text-ink-2">
                        {text}
                      </span>
                    </p>
                  ))}
                  <p className="pt-2 text-[12px] text-ink-3">
                    Tutor video by Marcus Bell · transcript checked by FR faculty
                    · searchable across the whole paper.
                  </p>
                </div>
              ) : null}

              {tab === "notes" ? (
                <div>
                  <div className="mb-2.5 flex flex-wrap items-center gap-2">
                    <NotebookPen className="size-4 text-ink-3" />
                    <span className="text-[12.5px] text-ink-3">
                      Private to you · timestamped to 01:09 · kept with this paper
                    </span>
                  </div>
                  <Textarea
                    rows={6}
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setNoteSaved(false);
                    }}
                    className="font-mono text-[13px]"
                    aria-label="Your notes for this lesson"
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-2.5">
                    <Button
                      size="sm"
                      disabled={noteSaved}
                      onClick={() => {
                        setNoteSaved(true);
                        toast({ title: "Note saved", body: lesson.title });
                      }}
                    >
                      Save note
                    </Button>
                    <span className="text-[12px] text-ink-3">
                      {noteSaved ? "All changes saved" : "Unsaved changes"}
                    </span>
                  </div>
                </div>
              ) : null}

              {tab === "discussion" ? (
                <div className="space-y-5">
                  {threads.map((d) => (
                    <div key={d.id}>
                      <div className="flex gap-3">
                        <Avatar name={d.by} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="text-[13px] font-semibold text-ink">
                              {d.by}
                            </span>
                            <span className="text-[11.5px] text-ink-3">
                              {d.role} · {d.at}
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
                          className="mt-3 ml-5 flex gap-3 border-l-2 border-cta pl-4 sm:ml-11"
                        >
                          <Avatar name={r.by} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="flex flex-wrap items-baseline gap-2">
                              <span className="text-[13px] font-semibold text-ink">
                                {r.by}
                              </span>
                              {r.faculty ? <Badge tone="brand">FR faculty</Badge> : null}
                              <span className="text-[11.5px] text-ink-3">{r.at}</span>
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
                    <Textarea
                      rows={2}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      placeholder="Ask a question about this lesson…"
                      aria-label="Ask a question about this lesson"
                    />
                    <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
                      <Button
                        size="sm"
                        disabled={!draft.trim()}
                        onClick={() => {
                          setThreads((t) => [
                            ...t,
                            {
                              id: `q-${t.length + 1}`,
                              by: "Anaya Rao",
                              role: "Graduate learner · FR Dec 2026 weekend",
                              at: "Just now",
                              text: draft.trim(),
                              replies: [],
                            },
                          ]);
                          setDraft("");
                          toast({
                            title: "Question posted",
                            body: "Marcus Bell and your cohort can see it now.",
                          });
                        }}
                      >
                        <MessageCircleQuestion className="size-3.5" /> Post question
                      </Button>
                      <span className="text-[12px] text-ink-3">
                        FR faculty usually reply within 6 hours
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              {tab === "resources" ? (
                <ul className="divide-y divide-[var(--line)]">
                  {RESOURCES.map((r) => {
                    const Icon = r.sheet ? FileSpreadsheet : FileText;
                    const done = downloaded.includes(r.name);
                    return (
                      <li
                        key={r.name}
                        className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
                      >
                        <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-inv">
                          <Icon className="size-4 text-cta" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink-2">
                          {r.name}
                        </span>
                        <span className="shrink-0 text-[12px] text-ink-3 tnum">
                          {r.size}
                        </span>
                        <IconButton
                          label={done ? `Downloaded ${r.name}` : `Download ${r.name}`}
                          size="sm"
                          onClick={() => {
                            setDownloaded((d) => (d.includes(r.name) ? d : [...d, r.name]));
                            toast({ title: "Download started", body: r.name });
                          }}
                        >
                          {done ? (
                            <Check className="size-3.5 text-jade" />
                          ) : (
                            <Download className="size-3.5" />
                          )}
                        </IconButton>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              {tab === "tutor" ? (
                <div className="flex flex-col items-start gap-4 sm:flex-row">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
                    <Sparkles className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-relaxed text-ink-2">
                      The AI tutor answers from{" "}
                      <span className="font-semibold text-ink">this lesson</span>{" "}
                      and the FR study material before it, not from the open
                      internet. If the answer is not in your material it says so,
                      and you can send the question to Doubts for faculty.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {TUTOR_PROMPTS.map((s) => (
                        <Link
                          key={s}
                          href={`/assistant?q=${encodeURIComponent(s)}`}
                          className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-2 transition-colors hover:border-violet hover:bg-violet-soft hover:text-violet"
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

        {/* Lesson rail */}
        {railOpen ? (
          <aside className="xl:sticky xl:top-20 xl:max-h-[calc(100dvh-6rem)] xl:self-start">
            <div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
              <div className="flex items-center justify-between gap-3 bg-surface-inv px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-ink-inv">Paper lessons</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-inv/60 tnum">
                    {course.modules.length} modules · {flat.length} lessons ·{" "}
                    {course.hours}h
                  </p>
                </div>
                <button
                  onClick={() => setRailOpen(false)}
                  aria-label="Hide lessons"
                  className="grid size-8 place-items-center rounded-[var(--radius-sm)] text-ink-inv/70 hover:bg-ink-inv/10 hover:text-ink-inv xl:hidden"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="scrollbar-slim min-h-0 flex-1 overflow-y-auto">
                {course.modules.map((m, mi) => {
                  const has = m.lessons.some((l) => l.id === lesson.id);
                  const done = m.lessons.filter((l) => stateOf(l) === "completed").length;
                  return (
                    <details key={m.id} open={has} className="group border-b border-line last:border-0">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-cta-soft">
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-[6px] text-[11px] font-bold tnum",
                            has ? "bg-cta text-cta-ink" : "bg-surface-2 text-ink-2",
                          )}
                        >
                          {mi + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[12.5px] font-semibold text-ink">
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
                          const active = l.id === lesson.id;
                          const state = stateOf(l);
                          return (
                            <li key={l.id}>
                              <button
                                onClick={() => setCurrent(l.id)}
                                aria-current={active ? "step" : undefined}
                                className={cn(
                                  "relative flex w-full items-center gap-3 py-2 pr-4 pl-4 text-left transition-colors",
                                  active
                                    ? "bg-cta-soft before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full before:bg-cta"
                                    : "hover:bg-cta-soft",
                                )}
                              >
                                <LessonBullet type={l.type} state={state} />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      "block truncate text-[12.5px]",
                                      active
                                        ? "font-bold text-ink"
                                        : state === "completed"
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

function Viewer({
  lesson,
  course,
  onContinue,
}: {
  lesson: Lesson;
  course: Course;
  onContinue: () => void;
}) {
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
      return <QuizViewer key={lesson.id} lesson={lesson} onContinue={onContinue} />;
    case "lab":
      return <LabViewer lesson={lesson} />;
    case "assignment":
      return <AssignmentViewer key={lesson.id} lesson={lesson} course={course} />;
    case "live":
      return <LiveViewer key={lesson.id} lesson={lesson} />;
    default:
      return <ArticleViewer lesson={lesson} />;
  }
}
