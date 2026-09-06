"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  Check,
  ChevronDown,
  Cloud,
  Copy,
  Eye,
  GripVertical,
  History,
  Plus,
  Settings2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import type { Course, Lesson, LessonType, Module } from "@/lib/data";
import { lessonTypeLabel, personById } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { Avatar } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { LessonTypeIcon } from "@/components/course/lesson-icon";

const TYPES: LessonType[] = [
  "video",
  "article",
  "pdf",
  "slides",
  "scorm",
  "xapi",
  "quiz",
  "assignment",
  "lab",
  "live",
];

const VERSIONS = [
  { v: "v4.2", at: "12 Aug 2026", by: "Marcus Bell", note: "Rewrote module 3 labs against Raft 2024 errata", live: true },
  { v: "v4.1", at: "28 Jun 2026", by: "Marcus Bell", note: "Added the operating module and the runbook exercise" },
  { v: "v4.0", at: "02 Mar 2026", by: "Priya Menon", note: "Restructured around incidents rather than papers" },
  { v: "v3.6", at: "19 Nov 2025", by: "Marcus Bell", note: "Replaced the consensus video after the audio complaint" },
];

export function CourseBuilder({ course }: { course: Course }) {
  const [tab, setTab] = useState("curriculum");
  const [modules, setModules] = useState<Module[]>(course.modules);
  const [saved, setSaved] = useState(true);
  const [title, setTitle] = useState(course.title);

  const author = personById(course.instructorId);
  const lessons = modules.flatMap((m) => m.lessons);
  const minutes = lessons.reduce((n, l) => n + l.minutes, 0);

  function touch() {
    setSaved(false);
    window.setTimeout(() => setSaved(true), 900);
  }

  function addLesson(mi: number) {
    setModules((ms) =>
      ms.map((m, i) =>
        i === mi
          ? {
              ...m,
              lessons: [
                ...m.lessons,
                {
                  id: `new-${Date.now()}`,
                  title: "Untitled lesson",
                  type: "video" as LessonType,
                  minutes: 10,
                  state: "not_started" as const,
                },
              ],
            }
          : m,
      ),
    );
    touch();
  }

  function addModule() {
    setModules((ms) => [
      ...ms,
      {
        id: `mod-${Date.now()}`,
        title: `Module ${ms.length + 1}`,
        summary: "Describe what this module covers.",
        lessons: [],
      },
    ]);
    touch();
  }

  function removeLesson(mi: number, li: number) {
    setModules((ms) =>
      ms.map((m, i) =>
        i === mi ? { ...m, lessons: m.lessons.filter((_, n) => n !== li) } : m,
      ),
    );
    touch();
  }

  function patchLesson(mi: number, li: number, patch: Partial<Lesson>) {
    setModules((ms) =>
      ms.map((m, i) =>
        i === mi
          ? {
              ...m,
              lessons: m.lessons.map((l, n) =>
                n === li ? { ...l, ...patch } : l,
              ),
            }
          : m,
      ),
    );
    touch();
  }

  function move(mi: number, li: number, dir: -1 | 1) {
    setModules((ms) =>
      ms.map((m, i) => {
        if (i !== mi) return m;
        const next = [...m.lessons];
        const to = li + dir;
        if (to < 0 || to >= next.length) return m;
        [next[li], next[to]] = [next[to], next[li]];
        return { ...m, lessons: next };
      }),
    );
    touch();
  }

  const checklist = [
    { label: "Title and summary written", ok: title.length > 8 },
    { label: "At least three modules", ok: modules.length >= 3 },
    { label: "Every module has a lesson", ok: modules.every((m) => m.lessons.length > 0) },
    { label: "Learning outcomes listed", ok: course.outcomes.length >= 3 },
    { label: "An assessment attached", ok: lessons.some((l) => l.type === "quiz") },
    { label: "Accessibility review signed off", ok: course.status === "published" },
  ];
  const ready = checklist.filter((c) => c.ok).length;

  return (
    <div className="mx-auto max-w-[86rem] space-y-6">
      <nav className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <Link href="/studio" className="hover:text-ink">
          Course studio
        </Link>
        <span>/</span>
        <span className="truncate">{course.title}</span>
      </nav>

      {/* Builder bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="min-w-0 flex-1">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              touch();
            }}
            className="w-full max-w-2xl bg-transparent font-display text-[clamp(1.6rem,1.3rem+1.3vw,2.35rem)] leading-tight tracking-[var(--display-tracking)] text-ink focus:outline-none"
          />
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3 tnum">
            <Badge
              tone={
                course.status === "published"
                  ? "jade"
                  : course.status === "in_review"
                    ? "amber"
                    : "neutral"
              }
              dot
            >
              {course.status === "in_review" ? "In review" : course.status}
            </Badge>
            <span>
              {modules.length} modules · {lessons.length} lessons ·{" "}
              {Math.round(minutes / 60)}h {minutes % 60}m
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                saved ? "text-ink-3" : "text-brand",
              )}
            >
              <Cloud className="size-3.5" />
              {saved ? "All changes saved" : "Saving…"}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="secondary" size="sm">
            <Eye className="size-3.5" /> Preview as learner
          </Button>
          <Button size="sm">
            <Upload className="size-3.5" />
            {course.status === "published" ? "Publish changes" : "Submit for review"}
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "curriculum", label: "Curriculum", count: lessons.length },
          { id: "details", label: "Details" },
          { id: "settings", label: "Delivery" },
          { id: "learners", label: "Learners", count: course.enrolled },
          { id: "versions", label: "Versions", count: VERSIONS.length },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          {tab === "curriculum" ? (
            <div className="space-y-4">
              {modules.map((m, mi) => (
                <Card key={m.id} className="overflow-hidden">
                  <details open className="group">
                    <summary className="flex cursor-pointer list-none items-center gap-3 border-b border-line px-4 py-3.5">
                      <GripVertical className="size-4 shrink-0 cursor-grab text-ink-3" />
                      <span className="grid size-7 shrink-0 place-items-center rounded-[6px] bg-surface-2 text-[12px] font-semibold text-ink-2 tnum">
                        {mi + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold text-ink">
                          {m.title}
                        </span>
                        <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                          {m.summary}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11.5px] text-ink-3 tnum">
                        {m.lessons.length} lessons ·{" "}
                        {m.lessons.reduce((n, l) => n + l.minutes, 0)} min
                      </span>
                      <ChevronDown className="size-4 shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
                    </summary>

                    <ul className="divide-y divide-[var(--line)]">
                      <AnimatePresence initial={false}>
                        {m.lessons.map((l, li) => (
                          <motion.li
                            key={l.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.18 }}
                            className="group/row flex flex-wrap items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
                          >
                            <GripVertical className="size-3.5 shrink-0 cursor-grab text-ink-3 opacity-0 group-hover/row:opacity-100" />
                            <span
                              className="grid size-7 shrink-0 place-items-center rounded-[6px]"
                              style={{
                                backgroundColor: `var(--${course.accent}-soft)`,
                                color: `var(--${course.accent})`,
                              }}
                            >
                              <LessonTypeIcon type={l.type} />
                            </span>
                            <input
                              value={l.title}
                              onChange={(e) =>
                                patchLesson(mi, li, { title: e.target.value })
                              }
                              className="min-w-40 flex-1 rounded-[var(--radius-xs)] border border-transparent bg-transparent px-2 py-1 text-[13.5px] text-ink hover:border-line focus:border-brand focus:bg-surface focus:outline-none"
                            />
                            <select
                              value={l.type}
                              onChange={(e) =>
                                patchLesson(mi, li, {
                                  type: e.target.value as LessonType,
                                })
                              }
                              className="shrink-0 cursor-pointer rounded-[var(--radius-xs)] border border-line bg-surface px-2 py-1 text-[12px] text-ink-2 focus:border-brand focus:outline-none"
                            >
                              {TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {lessonTypeLabel[t]}
                                </option>
                              ))}
                            </select>
                            <span className="flex shrink-0 items-center gap-1">
                              <input
                                type="number"
                                value={l.minutes}
                                onChange={(e) =>
                                  patchLesson(mi, li, {
                                    minutes: Number(e.target.value) || 0,
                                  })
                                }
                                className="w-14 rounded-[var(--radius-xs)] border border-line bg-surface px-2 py-1 text-right text-[12px] text-ink-2 focus:border-brand focus:outline-none tnum"
                              />
                              <span className="text-[11.5px] text-ink-3">min</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
                              <IconButton
                                label="Move up"
                                size="xs"
                                onClick={() => move(mi, li, -1)}
                              >
                                <ChevronDown className="size-3.5 rotate-180" />
                              </IconButton>
                              <IconButton
                                label="Move down"
                                size="xs"
                                onClick={() => move(mi, li, 1)}
                              >
                                <ChevronDown className="size-3.5" />
                              </IconButton>
                              <IconButton label="Duplicate" size="xs">
                                <Copy className="size-3.5" />
                              </IconButton>
                              <IconButton
                                label="Delete lesson"
                                size="xs"
                                className="text-rose"
                                onClick={() => removeLesson(mi, li)}
                              >
                                <Trash2 className="size-3.5" />
                              </IconButton>
                            </span>
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </ul>

                    <div className="flex flex-wrap gap-2 border-t border-line bg-surface-2 px-4 py-2.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => addLesson(mi)}
                      >
                        <Plus className="size-3.5" /> Add lesson
                      </Button>
                      <Button variant="ghost" size="xs">
                        <Upload className="size-3.5" /> Upload SCORM package
                      </Button>
                      <Button variant="ghost" size="xs">
                        <Plus className="size-3.5" /> Add quiz
                      </Button>
                    </div>
                  </details>
                </Card>
              ))}

              <button
                onClick={addModule}
                className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface py-4 text-[13.5px] font-medium text-ink-2 transition-colors hover:border-brand hover:bg-brand-soft hover:text-brand"
              >
                <Plus className="size-4" /> Add module
              </button>
            </div>
          ) : null}

          {tab === "details" ? (
            <Card className="space-y-5 p-5 sm:p-6">
              <Field label="Subtitle" hint="One line, shown under the title">
                <Input defaultValue={course.subtitle} onChange={touch} />
              </Field>
              <Field label="Summary">
                <Textarea rows={4} defaultValue={course.summary} onChange={touch} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Category">
                  <Select defaultValue={course.category} onChange={touch}>
                    {["Engineering", "AI & Data", "Design", "Security", "Compliance", "Leadership", "Onboarding", "Revenue"].map(
                      (c) => (
                        <option key={c}>{c}</option>
                      ),
                    )}
                  </Select>
                </Field>
                <Field label="Level">
                  <Select defaultValue={course.level} onChange={touch}>
                    {["Foundational", "Intermediate", "Advanced"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Accent">
                  <Select defaultValue={course.accent} onChange={touch}>
                    {["brand", "jade", "ember", "violet", "amber", "rose"].map((a) => (
                      <option key={a}>{a}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Learning outcomes" hint="One per line">
                <Textarea
                  rows={5}
                  defaultValue={course.outcomes.join("\n")}
                  onChange={touch}
                />
              </Field>
              <Field label="Requirements" hint="One per line">
                <Textarea
                  rows={3}
                  defaultValue={course.requirements.join("\n")}
                  onChange={touch}
                />
              </Field>
            </Card>
          ) : null}

          {tab === "settings" ? (
            <div className="space-y-4">
              <Card>
                <CardHeader title="Enrolment" sub="Who gets on this course and how" />
                <div className="space-y-4 border-t border-line px-5 py-4">
                  <Switch
                    checked
                    onChange={touch}
                    label="Open to self-enrolment"
                    sub="Anyone in the workspace can start it from the catalog"
                  />
                  <Switch
                    checked={!!course.compliance?.mandatory}
                    onChange={touch}
                    label="Mandatory"
                    sub="Auto-assigned with a deadline; appears in compliance reporting"
                  />
                  <Switch
                    checked={course.certificate}
                    onChange={touch}
                    label="Issue a certificate"
                    sub="On completion of every required lesson plus a passing assessment"
                  />
                  <Switch
                    checked={false}
                    onChange={touch}
                    label="Sequential lessons"
                    sub="Each lesson unlocks only when the previous one is complete"
                  />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Completion criteria"
                  sub="What has to be true before this course counts as done"
                />
                <div className="space-y-4 border-t border-line px-5 py-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Minimum lessons viewed">
                      <Select defaultValue="All required" onChange={touch}>
                        {["All required", "All lessons", "80%", "60%"].map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Assessment pass mark">
                      <Input type="number" defaultValue={70} onChange={touch} />
                    </Field>
                  </div>
                  <Switch
                    checked
                    onChange={touch}
                    label="Recertification required"
                    sub={`Learners retake this every ${course.compliance?.recertifyMonths || 12} months`}
                  />
                </div>
              </Card>

              <Card>
                <CardHeader
                  title="Reminders"
                  sub="Which channels may chase a learner on this course"
                />
                <div className="space-y-4 border-t border-line px-5 py-4">
                  <Switch checked onChange={touch} label="Email" sub="Deadline reminders at 14, 7 and 1 days" />
                  <Switch checked onChange={touch} label="WhatsApp" sub="Utility template only, opted-in numbers" />
                  <Switch
                    checked={!!course.compliance?.mandatory}
                    onChange={touch}
                    label="Voice agent"
                    sub="Outbound call at 14 days remaining, weekdays 09:00–18:00 learner-local"
                  />
                </div>
              </Card>
            </div>
          ) : null}

          {tab === "learners" ? (
            <Card className="overflow-hidden">
              <CardHeader
                title={`${course.enrolled.toLocaleString()} enrolled`}
                sub="Progress is per learner; scores stay with the instructor"
                action={
                  <Button variant="secondary" size="xs">
                    <Users className="size-3.5" /> Export CSV
                  </Button>
                }
              />
              <table className="w-full border-t border-line">
                <thead>
                  <tr className="border-b border-line text-left">
                    {["Learner", "Department", "Progress", "Last active", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-2.5 text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {[
                    ["Anaya Rao", "Engineering", 62, "2 hours ago", "On track"],
                    ["Daniel Okonkwo", "Engineering", 88, "Yesterday", "On track"],
                    ["Arjun Nair", "Engineering", 34, "6 days ago", "Stalled"],
                    ["Grace Whitfield", "Engineering", 100, "1 week ago", "Complete"],
                    ["Yusuf Karim", "Data", 12, "21 days ago", "At risk"],
                  ].map(([name, dept, pct, seen, status]) => (
                    <tr key={name as string} className="hover:bg-surface-2">
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={name as string} size="xs" />
                          <span className="text-[13px] font-medium text-ink">
                            {name}
                          </span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-ink-3">{dept}</td>
                      <td className="px-5 py-3">
                        <span className="flex items-center gap-2.5">
                          <Progress
                            value={pct as number}
                            className="w-20"
                            height={5}
                            tone={pct === 100 ? "jade" : "brand"}
                          />
                          <span className="text-[12px] text-ink-2 tnum">{pct}%</span>
                        </span>
                      </td>
                      <td className="px-5 py-3 text-[12.5px] text-ink-3">{seen}</td>
                      <td className="px-5 py-3">
                        <Badge
                          tone={
                            (status === "Complete"
                              ? "jade"
                              : status === "On track"
                                ? "brand"
                                : status === "Stalled"
                                  ? "amber"
                                  : "rose") as Tone
                          }
                          dot
                        >
                          {status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : null}

          {tab === "versions" ? (
            <Card className="overflow-hidden">
              <CardHeader
                title="Version history"
                sub="Learners finish on the version they started. Publishing never moves someone mid-attempt."
                action={<History className="size-4 text-ink-3" />}
              />
              <ul className="divide-y divide-[var(--line)] border-t border-line">
                {VERSIONS.map((v) => (
                  <li key={v.v} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <span className="w-12 shrink-0 font-mono text-[12.5px] font-semibold text-ink tnum">
                      {v.v}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-ink-2">{v.note}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-3">
                        {v.by} · {v.at}
                      </p>
                    </div>
                    {v.live ? <Badge tone="jade" dot>Live</Badge> : null}
                    <Button variant="ghost" size="xs">
                      Compare
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>

        {/* Publish rail */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardHeader
              title="Ready to publish?"
              sub={`${ready} of ${checklist.length} checks pass`}
            />
            <div className="border-t border-line px-5 py-4">
              <Progress
                value={(ready / checklist.length) * 100}
                tone={ready === checklist.length ? "jade" : "ember"}
              />
              <ul className="mt-3.5 space-y-2.5">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-start gap-2.5">
                    <span
                      className={cn(
                        "mt-0.5 grid size-4 shrink-0 place-items-center rounded-full",
                        c.ok
                          ? "bg-jade text-on-accent"
                          : "border border-line-strong text-ink-3",
                      )}
                    >
                      {c.ok ? (
                        <Check className="size-2.5" strokeWidth={3.5} />
                      ) : (
                        <AlertCircle className="size-2.5" />
                      )}
                    </span>
                    <span
                      className={cn(
                        "text-[12.5px] leading-snug",
                        c.ok ? "text-ink-3" : "text-ink-2",
                      )}
                    >
                      {c.label}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <CardHeader title="Ownership" />
            <div className="border-t border-line px-5 py-4">
              {author ? (
                <div className="flex items-center gap-3">
                  <Avatar name={author.name} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">
                      {author.name}
                    </p>
                    <p className="truncate text-[11.5px] text-ink-3">Author</p>
                  </div>
                </div>
              ) : null}
              <div className="mt-3.5 flex items-center gap-3 border-t border-line pt-3.5">
                <Avatar name="Priya Menon" size="md" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">
                    Priya Menon
                  </p>
                  <p className="truncate text-[11.5px] text-ink-3">Reviewer</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" className="mt-4 w-full">
                <Plus className="size-3.5" /> Add collaborator
              </Button>
            </div>
          </Card>

          <Card className="p-4">
            <p className="flex items-center gap-2 text-[12px] font-medium text-ink-2">
              <Settings2 className="size-3.5" /> Danger zone
            </p>
            <div className="mt-3 space-y-2">
              <Button variant="secondary" size="sm" className="w-full">
                Archive course
              </Button>
              <Link
                href={`/courses/${course.slug}`}
                className="flex items-center justify-center gap-1.5 text-[12.5px] font-medium text-brand hover:underline"
              >
                View public page <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
