"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarPlus,
  ChevronDown,
  CircleCheck,
  Clock3,
  MessageCircleQuestion,
  Paperclip,
  Plus,
  Sparkles,
  ThumbsUp,
  Video,
} from "lucide-react";
import {
  doubtSessions,
  doubtsForStudent,
  paperByCode,
  paperName,
  staffById,
  staffName,
  syllabusAreaTitle,
  type Doubt,
  type DoubtSession,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Tabs } from "@/components/ui/tabs";
import { FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Timeline } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import {
  DEMO_NOW,
  addHours,
  cohortFor,
  dayLabel,
  dayTimeLabel,
  facultyFor,
  studyPapers,
  useStudentRecord,
} from "./shared";

type DoubtRow = Doubt & { attachments?: string[] };
type TabId = "all" | "waiting" | "answered" | "session";
type AskSeed = { paper: PaperCode; area?: string; topic?: string };

const SOURCES: Doubt["source"][] = ["Lesson", "Live class", "Practice", "Mock review", "AI tutor handoff"];

function nextSessionFor(cohortId: string): DoubtSession | undefined {
  return doubtSessions
    .filter((d) => d.cohortId === cohortId && d.start >= DEMO_NOW && d.status !== "completed")
    .sort((a, b) => a.start.localeCompare(b.start))[0];
}

function statusOf(d: DoubtRow): { tab: Exclude<TabId, "all">; label: string; tone: StatusTone } {
  if (d.status === "open") return { tab: "waiting", label: "Waiting for faculty", tone: "amber" };
  if (d.status === "scheduled-for-session") {
    const session = nextSessionFor(d.cohortId);
    return {
      tab: "session",
      label: session ? `In doubt-clearing session ${dayLabel(session.start)}` : "In doubt-clearing session",
      tone: "info",
    };
  }
  if (d.status === "closed") return { tab: "answered", label: `Closed · answered by ${staffName(d.assignedTo)}`, tone: "neutral" };
  return { tab: "answered", label: `Answered by ${staffName(d.assignedTo)}`, tone: "jade" };
}

export function DoubtsPage() {
  const s = useStudentRecord();
  return <DoubtsView key={s.id} s={s} />;
}

function DoubtsView({ s }: { s: Student }) {
  const papers = useMemo(() => studyPapers(s, { includeUpcoming: false }), [s]);
  const [rows, setRows] = useState<DoubtRow[]>(() =>
    [...doubtsForStudent(s.id)].sort((a, b) => b.askedOn.localeCompare(a.askedOn)),
  );
  const [tab, setTab] = useState<TabId>("all");
  const [paperFilter, setPaperFilter] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const first = doubtsForStudent(s.id).find((d) => d.status === "answered");
    return first ? { [first.id]: true } : {};
  });
  const [helpful, setHelpful] = useState<Record<string, boolean>>({});
  const [freshId, setFreshId] = useState<string | null>(null);
  const [askSeed, setAskSeed] = useState<AskSeed | null>(null);
  const [askPaper, setAskPaper] = useState<PaperCode>(papers[0] ?? "FR");
  const [files, setFiles] = useState<string[]>([]);
  const [draftKey, setDraftKey] = useState(0);

  const sessions = useMemo(
    () =>
      doubtSessions
        .filter((d) => s.cohortIds.includes(d.cohortId) && d.start >= DEMO_NOW && d.status !== "completed")
        .sort((a, b) => a.start.localeCompare(b.start)),
    [s],
  );
  const nextSession = sessions[0];

  const counts = useMemo(() => {
    const c = { all: rows.length, waiting: 0, answered: 0, session: 0 };
    rows.forEach((d) => c[statusOf(d).tab]++);
    return c;
  }, [rows]);

  const visible = rows.filter(
    (d) => (tab === "all" || statusOf(d).tab === tab) && (!paperFilter || d.paper === paperFilter),
  );

  function openAsk(seed?: AskSeed) {
    const paper = seed?.paper ?? papers[0] ?? "FR";
    setAskPaper(paper);
    setAskSeed(seed ?? { paper });
    setFiles([]);
    setDraftKey((k) => k + 1);
  }

  function closeAsk() {
    setAskSeed(null);
    setFiles([]);
  }

  function submit(data: FormData) {
    const paper = askPaper;
    const area = String(data.get("area") ?? "A");
    const topic = String(data.get("topic") ?? "").trim();
    const question = String(data.get("question") ?? "").trim();
    const facultyId = facultyFor(s, paper);
    const row: DoubtRow = {
      id: `db-new-${rows.length + 1}`,
      studentId: s.id,
      paper,
      cohortId: cohortFor(s, paper) ?? s.cohortIds[0],
      syllabusArea: area,
      topic,
      question,
      askedOn: DEMO_NOW,
      source: String(data.get("source")) as Doubt["source"],
      status: "open",
      assignedTo: facultyId,
      upvotes: 0,
      attachments: files,
    };
    setRows((r) => [row, ...r]);
    setTab("all");
    setPaperFilter("");
    setFreshId(row.id);
    toast({
      title: `Doubt sent to ${staffName(facultyId)}`,
      body: `${paper} · ${area} ${syllabusAreaTitle(paper, area)} · Waiting for faculty`,
    });
    closeAsk();
  }

  function withdraw(d: DoubtRow) {
    setRows((r) => r.filter((x) => x.id !== d.id));
    toast({ title: "Doubt withdrawn", body: d.topic, tone: "neutral" });
  }

  const seedAreas = paperByCode(askPaper)?.syllabusAreas ?? [];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Help"
        title="Doubt resolution"
        sub="Ask your faculty about anything in your papers. Answers come back here, and questions that need a whiteboard go to the next doubt-clearing session."
        actions={
          <>
            <Button variant="outline" onClick={() => document.getElementById("doubt-sessions")?.scrollIntoView({ behavior: "smooth" })}>
              <Video className="size-4" /> Doubt-clearing sessions
            </Button>
            <Button onClick={() => openAsk()}>
              <Plus className="size-4" /> Ask a doubt
            </Button>
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          hero
          label="Next doubt-clearing session"
          value={nextSession ? dayLabel(nextSession.start) : "None scheduled"}
          sub={
            nextSession
              ? `${nextSession.paper} · ${nextSession.start.slice(11, 16)} · ${staffName(nextSession.facultyId)}`
              : undefined
          }
          icon={<Video />}
        />
        <KpiTile label="Waiting for faculty" value={counts.waiting} tone="amber" icon={<Clock3 />} sub="Reply within 24 hours" />
        <KpiTile label="Answered" value={counts.answered} tone="jade" icon={<CircleCheck />} sub="Answers stay here for revision" />
        <KpiTile label="In doubt-clearing session" value={counts.session} tone="info" icon={<MessageCircleQuestion />} sub="Answered live, then recorded" />
      </KpiRow>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-col gap-3">
            <Tabs
              value={tab}
              onChange={(id) => setTab(id as TabId)}
              items={[
                { id: "all", label: "All doubts", count: counts.all },
                { id: "waiting", label: "Waiting for faculty", count: counts.waiting },
                { id: "answered", label: "Answered", count: counts.answered },
                { id: "session", label: "In doubt-clearing session", count: counts.session },
              ]}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <FilterSelect
                label="Paper"
                allLabel="All papers"
                value={paperFilter}
                onChange={setPaperFilter}
                options={Array.from(new Set(rows.map((d) => d.paper))).map((p) => ({ value: p, label: `${p} · ${paperName(p)}` }))}
              />
              <p className="text-[12.5px] text-ink-3 tnum">
                {visible.length} of {rows.length} doubts
              </p>
            </div>
          </div>

          {visible.length === 0 ? (
            <EmptyState
              icon={<MessageCircleQuestion />}
              title="No doubts here"
              sub="Nothing matches this view. Ask a new doubt, or clear the paper filter."
              action={
                <Button size="sm" onClick={() => openAsk()}>
                  <Plus className="size-3.5" /> Ask a doubt
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {visible.map((d) => {
                const st = statusOf(d);
                const faculty = staffById(d.assignedTo);
                const session = d.status === "scheduled-for-session" ? nextSessionFor(d.cohortId) : undefined;
                const open = Boolean(expanded[d.id]);
                const hasAnswer = Boolean(d.answer);
                return (
                  <li key={d.id}>
                    <Card className={cn("p-4 sm:p-5", d.id === freshId && "border-cta bg-cta-soft")}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="dark">{d.paper}</Badge>
                        <span className="min-w-0 truncate text-[12px] font-semibold text-ink-2">
                          {d.syllabusArea} · {syllabusAreaTitle(d.paper, d.syllabusArea)}
                        </span>
                        <span className="ml-auto">
                          <StatusPill status={d.status} tone={st.tone}>
                            {st.label}
                          </StatusPill>
                        </span>
                      </div>
                      <h3 className="mt-3 text-[15px] leading-snug font-bold text-ink">{d.topic}</h3>
                      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2 [overflow-wrap:anywhere]">{d.question}</p>
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3 tnum">
                        <span>Asked {dayTimeLabel(d.askedOn)}</span>
                        <span>From {d.source.toLowerCase()}</span>
                        <span>To {staffName(d.assignedTo)}</span>
                        {d.upvotes ? (
                          <span className="inline-flex items-center gap-1">
                            <ThumbsUp className="size-3" /> {d.upvotes} in your cohort have the same doubt
                          </span>
                        ) : null}
                      </p>
                      {d.attachments?.length ? (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {d.attachments.map((f) => (
                            <span
                              key={f}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] font-medium text-ink"
                            >
                              <Paperclip className="size-3 shrink-0 text-ink-3" />
                              <span className="truncate">{f}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {hasAnswer ? (
                        <div className="mt-3.5 border-t border-line pt-3">
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setExpanded((e) => ({ ...e, [d.id]: !open }))}
                            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                          >
                            <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
                            {open ? "Hide answer" : "Show answer"}
                          </button>
                          {open ? (
                            <div className="mt-3 rounded-[var(--radius-md)] border border-line border-l-4 border-l-jade bg-surface-2 p-4">
                              <div className="flex items-center gap-2.5">
                                <Avatar name={faculty?.name ?? "Faculty"} size="sm" />
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold text-ink">{faculty?.name}</p>
                                  <p className="truncate text-[12px] text-ink-3">
                                    {faculty?.title} · answered {d.answeredOn ? dayTimeLabel(d.answeredOn) : ""}
                                  </p>
                                </div>
                              </div>
                              <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink [overflow-wrap:anywhere]">{d.answer}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <Button
                                  size="xs"
                                  variant={helpful[d.id] ? "secondary" : "outline"}
                                  aria-pressed={Boolean(helpful[d.id])}
                                  onClick={() => {
                                    setHelpful((h) => ({ ...h, [d.id]: !h[d.id] }));
                                    if (!helpful[d.id]) toast({ title: `Thanks sent to ${faculty?.name}`, body: d.topic });
                                  }}
                                >
                                  <ThumbsUp className="size-3.5" /> {helpful[d.id] ? "Marked helpful" : "This helped"}
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => openAsk({ paper: d.paper, area: d.syllabusArea, topic: `Follow-up: ${d.topic}` })}
                                >
                                  Ask a follow-up
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ) : null}

                      {d.status === "scheduled-for-session" ? (
                        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-line bg-info-soft/60 p-3.5">
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-ink">
                              {session ? `${session.title} · ${dayTimeLabel(session.start)}` : "Next doubt-clearing session"}
                            </p>
                            <p className="mt-0.5 text-[12px] text-ink-3">
                              {staffName(d.assignedTo)} will take it live. {session ? `${session.questionsQueued} questions queued.` : ""}
                            </p>
                          </div>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() =>
                              toast({
                                title: "Added to your calendar",
                                body: session ? `${session.title} · ${dayTimeLabel(session.start)}` : d.topic,
                                tone: "info",
                              })
                            }
                          >
                            <CalendarPlus className="size-3.5" /> Add to calendar
                          </Button>
                        </div>
                      ) : null}

                      {d.status === "open" ? (
                        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
                          <p className="text-[12px] text-ink-3">
                            Reply expected by {dayTimeLabel(addHours(d.askedOn, 24))}
                          </p>
                          <Button size="xs" variant="ghost" onClick={() => withdraw(d)}>
                            Withdraw doubt
                          </Button>
                        </div>
                      ) : null}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="min-w-0 space-y-5">
          <Card id="doubt-sessions" className="scroll-mt-24">
            <CardHeader title="Doubt-clearing sessions" sub="Live with your faculty, for your cohorts only" />
            {sessions.length ? (
              <ul className="divide-y divide-[var(--line)] border-t border-line">
                {sessions.slice(0, 4).map((ds, i) => (
                  <li key={ds.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-ink">{ds.title}</p>
                        <p className="mt-0.5 text-[12px] text-ink-3 tnum">
                          {dayTimeLabel(ds.start)} · {ds.durationMins} min · {staffName(ds.facultyId)}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-3 tnum">{ds.questionsQueued} questions queued</p>
                      </div>
                      {i === 0 ? <Badge tone="cta">Next</Badge> : <Badge tone="dark">{ds.paper}</Badge>}
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => toast({ title: "Added to your calendar", body: `${ds.title} · ${dayTimeLabel(ds.start)}`, tone: "info" })}
                      >
                        <CalendarPlus className="size-3.5" /> Add to calendar
                      </Button>
                      <span title="The join link opens 10 minutes before the session" className="inline-flex">
                        <Button size="xs" variant="secondary" disabled>
                          <Video className="size-3.5" /> Join
                        </Button>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-line px-5 py-4 text-[13px] text-ink-3">No sessions scheduled for your cohorts.</p>
            )}
            <div className="border-t border-line px-5 py-3">
              <Link
                href="/classes"
                className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              >
                Recordings of past sessions
              </Link>
            </div>
          </Card>

          <Card className="p-5">
            <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">How a doubt is resolved</p>
            <Timeline
              dense
              items={[
                { id: "1", title: "You ask", meta: "With the paper, syllabus area and a screenshot", tone: "cta" },
                { id: "2", title: "Your faculty answers", meta: "Within 24 hours on working days", tone: "jade" },
                { id: "3", title: "Or takes it live", meta: "In the next doubt-clearing session for your cohort", tone: "info" },
                { id: "4", title: "The answer stays here", meta: "Searchable for revision before the exam", tone: "neutral" },
              ]}
            />
            <Link
              href="/assistant"
              className="mt-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
            >
              <Sparkles className="size-3.5 text-violet" /> Try the AI tutor first
            </Link>
          </Card>
        </aside>
      </div>

      <FormDrawer
        open={askSeed !== null}
        onClose={closeAsk}
        title="Ask a doubt"
        sub="Your question goes to the faculty who teach this paper in your cohort."
        submitLabel="Send to faculty"
        footerNote={`Goes to ${staffName(facultyFor(s, askPaper))}`}
        onSubmit={submit}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Paper">
            <Select name="paper" value={askPaper} onChange={(e) => setAskPaper(e.target.value as PaperCode)}>
              {papers.map((p) => (
                <option key={p} value={p}>
                  {p} · {paperName(p)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Where it came from">
            <Select name="source" defaultValue="Lesson" key={`src-${draftKey}`}>
              {SOURCES.map((src) => (
                <option key={src}>{src}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Syllabus area">
          <Select
            name="area"
            key={`area-${askPaper}-${draftKey}`}
            defaultValue={askSeed?.paper === askPaper && askSeed.area ? askSeed.area : seedAreas[0]?.code}
          >
            {seedAreas.map((a) => (
              <option key={a.code} value={a.code}>
                {a.code} · {a.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Topic">
          <Input name="topic" required key={`topic-${draftKey}`} defaultValue={askSeed?.topic ?? ""} placeholder="e.g. NCI at fair value" />
        </Field>
        <Field label="Your question" hint="Show your workings">
          <Textarea
            name="question"
            required
            rows={5}
            key={`q-${draftKey}`}
            placeholder="What you did, the answer you expected and where yours differs."
          />
        </Field>
        <FileDrop
          key={`files-${draftKey}`}
          label="Attach a screenshot"
          accept=".png,.jpg,.jpeg,.pdf"
          hint="Your workings, the question or the lesson screen. Up to 5 MB each."
          onFiles={(all) => setFiles(all)}
        />
      </FormDrawer>
    </div>
  );
}
