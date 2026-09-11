"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Route } from "lucide-react";
import {
  assessments,
  courseById,
  enrolledCourses,
  paths,
  totalPoints,
  type Assessment,
} from "@/lib/data";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/* The learner's standing on each open assessment. Mirrors the history table on
   /assessments so the two pages never disagree. */
const MY_ATTEMPTS: Record<string, { used: number; label: string; tone: Tone; order: number }> = {
  "a-privacy-final": { used: 1, label: "In progress", tone: "brand", order: 0 },
  "a-dist-consensus": { used: 1, label: "Retake available", tone: "amber", order: 1 },
  "a-llm-retrieval": { used: 1, label: "Completed · 94%", tone: "jade", order: 3 },
  "a-sec-final": { used: 1, label: "Completed · 93%", tone: "jade", order: 3 },
};
const NOT_STARTED = { used: 0, label: "Yet to start", tone: "neutral" as Tone, order: 2 };

const myPathIds = ["p-backend", "p-compliance"];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Chip({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <span
      className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] [&>svg]:size-4.5"
      style={{ backgroundColor: `var(--${accent}-soft)`, color: `var(--${accent})` }}
    >
      {children}
    </span>
  );
}

/** Icon, then text and status side by side; the status drops under the text on phones. */
function Row({
  href,
  icon,
  title,
  meta,
  aside,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
  aside: React.ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
      >
        {icon}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink transition-colors group-hover:text-brand">
              {title}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-ink-3 tnum">{meta}</p>
          </div>
          {aside}
        </div>
      </Link>
    </li>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 sm:block sm:w-36 sm:shrink-0">
      <p className="order-2 shrink-0 text-[12px] whitespace-nowrap text-ink-2 tnum sm:order-none sm:text-right">
        {label}
      </p>
      <Progress
        value={value}
        height={4}
        tone={value === 100 ? "jade" : "brand"}
        className="order-1 flex-1 sm:order-none sm:mt-1.5"
      />
    </div>
  );
}

export function MyLearningTabs() {
  const [tab, setTab] = useState("courses");

  const inProgress = enrolledCourses
    .filter((c) => (c.progress ?? 0) < 100)
    .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));

  const programs = paths
    .filter((p) => myPathIds.includes(p.id))
    .map((p) => {
      const required = p.steps.filter((s) => s.required);
      const progress = required.map((s) => courseById(s.courseId)?.progress ?? 0);
      return {
        path: p,
        required: required.length,
        done: progress.filter((x) => x === 100).length,
        value: Math.round(progress.reduce((n, x) => n + x, 0) / required.length),
      };
    });

  const enrolledIds = new Set(enrolledCourses.map((c) => c.id));
  const graded = assessments.filter((a) => a.kind !== "Diagnostic");
  const mine = graded
    .filter((a) => a.status === "open" && enrolledIds.has(a.courseId))
    .map((a) => ({ a, me: MY_ATTEMPTS[a.id] ?? NOT_STARTED }))
    .sort((x, y) => x.me.order - y.me.order);
  const outstanding = mine.filter((m) => !m.me.label.startsWith("Completed")).length;

  const footer = {
    courses: { href: "/my-learning", label: `View all ${enrolledCourses.length} courses` },
    programs: { href: "/paths", label: "Browse learning paths" },
    assessments: { href: "/assessments", label: "View all assessments" },
  }[tab]!;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-3.5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "courses", label: "Courses", count: inProgress.length },
            { id: "programs", label: "Programs", count: programs.length },
            { id: "assessments", label: "Assessments", count: outstanding },
          ]}
        />
      </div>

      <ul className="divide-y divide-[var(--line)]">
        {tab === "courses"
          ? inProgress.map((c) => (
              <Row
                key={c.id}
                href={`/learn/${c.slug}`}
                icon={
                  <Chip accent={c.accent}>
                    <BookOpen />
                  </Chip>
                }
                title={c.title}
                meta={`${c.hours} learning hrs · ${plural(
                  graded.filter((a) => a.courseId === c.id).length,
                  "assessment",
                )} · ${c.level}`}
                aside={<Meter value={c.progress!} label={`${c.progress}% completed`} />}
              />
            ))
          : null}

        {tab === "programs"
          ? programs.map(({ path, required, done, value }) => (
              <Row
                key={path.id}
                href={`/paths/${path.slug}`}
                icon={
                  <Chip accent={path.accent}>
                    <Route />
                  </Chip>
                }
                title={path.title}
                meta={`${path.kind} path · ${done} of ${required} required courses done · ${path.weeks} weeks`}
                aside={<Meter value={value} label={`${value}% completed`} />}
              />
            ))
          : null}

        {tab === "assessments"
          ? mine.map(({ a, me }) => (
              <Row
                key={a.id}
                href={`/assessments/${a.id}`}
                icon={
                  <Chip accent={courseById(a.courseId)?.accent ?? "brand"}>
                    <ClipboardCheck />
                  </Chip>
                }
                title={a.title}
                meta={assessmentMeta(a, me.used)}
                aside={
                  <Badge tone={me.tone} className="w-fit shrink-0">
                    {me.label}
                  </Badge>
                }
              />
            ))
          : null}
      </ul>

      <div className="border-t border-line px-5 py-3">
        <Link
          href={footer.href}
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline"
        >
          {footer.label} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function assessmentMeta(a: Assessment, used: number) {
  return [
    plural(a.questions.length, "question"),
    `${totalPoints(a)} max marks`,
    a.minutes ? `${a.minutes} mins` : "Untimed",
    `${used}/${a.attempts} attempts`,
  ].join(" · ");
}
