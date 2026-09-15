"use client";

import Link from "next/link";
import { ArrowRight, CalendarRange, Megaphone, Play, Route } from "lucide-react";
import {
  ACCA_TODAY,
  announcementsForUniversity,
  cohortById,
  examSessionById,
  formatAccaDate,
  formatShortDate,
  paperName,
  programmeById,
  sectionById,
  universityById,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { lessonTypeLabel } from "@/lib/data";
import { HeroBand } from "@/components/ui/hero-band";
import { Card, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScoreRing } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { LessonTypeIcon } from "@/components/course/lesson-icon";
import { DEMO_DATE, usePartOfDay } from "./greeting";
import { MyLearningTabs } from "./my-learning-tabs";
import { DateTile, PaperCodeChip, SectionLabel, TextLink, useStudentRecord } from "@/components/student/learn/bits";
import { READINESS_TARGET, courseForCode, nextLesson, upcomingFor } from "@/components/student/learn/derive";

export function DashboardView() {
  const s = useStudentRecord();
  // Keyed so local state resets when a stored persona takes over on hydration.
  return <Dashboard key={s.id} s={s} />;
}

function Dashboard({ s }: { s: Student }) {
  const part = usePartOfDay();
  const first = s.name.split(" ")[0];
  const code = s.currentPaper;
  const course = code ? courseForCode(code) : undefined;
  const lesson = code ? nextLesson(s, code) : undefined;
  const progress = code ? s.papers[code].progress : 0;
  const readiness = code ? (s.readiness.byPaper[code] ?? s.readiness.overall) : s.readiness.overall;
  const exam = s.examBookings
    .filter((b) => b.status === "booked" && b.date >= ACCA_TODAY)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  const session = exam?.sessionId ? examSessionById(exam.sessionId) : undefined;
  const undergrad = s.type === "undergraduate";
  const uni = universityById(s.universityId);
  const programme = programmeById(s.programmeId);

  return (
    <div className="mx-auto max-w-[86rem] space-y-6">
      <HeroBand
        eyebrow={`Personal dashboard · ${DEMO_DATE} · ${undergrad ? (uni?.name ?? "University") : (programme?.name ?? "Graduate pathway")}`}
        title={`${part}, ${first}`}
        sub={
          code
            ? `${code} ${paperName(code)} is your current paper. You have studied ${progress}% of it${
                exam ? ` and your exam is booked for ${exam.entryWindow === "on-demand" ? formatAccaDate(exam.date) : `the ${exam.label} session`}` : ""
              }.`
            : "Your next paper starts soon."
        }
        stats={[
          { label: "Current paper", value: code ?? "None", hint: code ? `${paperName(code)} · ${progress}% studied` : undefined },
          { label: "Readiness score", value: readiness, hint: readiness >= READINESS_TARGET ? "Above the 70 target" : `Target ${READINESS_TARGET} before the exam` },
          {
            label: "Next exam",
            value: exam ? formatShortDate(exam.date) : "Not booked",
            hint: exam ? `${exam.paper} · ${exam.entryWindow === "on-demand" ? "on-demand CBE" : `${session?.label ?? exam.label} session`}, booked` : undefined,
          },
        ]}
        actions={
          <>
            {course ? (
              <LinkButton href={`/learn/${course.slug}`} size="lg">
                <Play className="size-4 fill-current" />
                Resume {code}
              </LinkButton>
            ) : null}
            <LinkButton href="/journey" variant="inverse" size="lg">
              <Route className="size-4" />
              ACCA journey
            </LinkButton>
          </>
        }
        aside={
          code ? (
            <div className="hidden rounded-full bg-surface p-2 lg:grid">
              <ScoreRing value={readiness} size={112} stroke={9} showBand label={`${code} readiness score`} />
            </div>
          ) : null
        }
      />

      {undergrad ? <UniversityStrip s={s} /> : <PlanStrip s={s} />}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {code && course && lesson ? (
            <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
              <span className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-cta text-cta-ink">
                <LessonTypeIcon type={lesson.lesson.type} className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <SectionLabel>Continue learning · {code}</SectionLabel>
                <h2 className="mt-1.5 font-display text-[clamp(1.25rem,1.1rem+0.6vw,1.6rem)] leading-[1.15] font-bold tracking-[-0.02em] text-ink">
                  {lesson.lesson.title}
                </h2>
                <p className="mt-1 text-[13px] text-ink-3">
                  Module {lesson.moduleIndex + 1}: {lesson.module.title} · {lessonTypeLabel[lesson.lesson.type]} · {lesson.lesson.minutes} min
                </p>
                <div className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <Progress value={progress} height={5} className="w-full max-w-72" />
                  <span className="text-[12px] text-ink-3 tnum">
                    {progress}% of the paper · lesson {lesson.number} of {lesson.total}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                <LinkButton href={`/learn/${course.slug}`}>
                  <Play className="size-4 fill-current" />
                  Resume
                </LinkButton>
                <LinkButton href={`/courses/${course.slug}`} variant="outline">
                  Paper overview
                </LinkButton>
              </div>
            </Card>
          ) : null}

          <MyLearningTabs student={s} />
        </div>

        <ComingUp s={s} />
      </div>
    </div>
  );
}

function PlanStrip({ s }: { s: Student }) {
  const batch = sectionById(s.sectionId);
  const cohort = cohortById(batch?.cohortId);
  const next = (Object.values(s.papers) as Student["papers"][PaperCode][])
    .filter((p) => (p.status === "current" || p.status === "failed" || p.status === "upcoming") && p.plannedSessionId)
    .sort(
      (a, b) =>
        (examSessionById(a.plannedSessionId!)?.examStart ?? "").localeCompare(examSessionById(b.plannedSessionId!)?.examStart ?? "") ||
        Number(b.status === "current") - Number(a.status === "current"),
    )
    .slice(0, 3);
  const booked = (code: PaperCode) => s.examBookings.some((b) => b.paper === code && b.status === "booked");

  return (
    <Card className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:gap-6">
      <div className="min-w-0 md:w-56 md:shrink-0">
        <SectionLabel>Your completion plan</SectionLabel>
        <p className="mt-1 text-[13px] text-ink-2">Next three papers and their target exam sessions.</p>
      </div>
      <ol className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
        {next.map((p, i) => (
          <li key={p.code} className="flex min-w-0 items-center gap-2.5 rounded-[14px] border border-line bg-surface-2 px-3 py-2.5">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold text-ink-3 tnum">{i + 1}</span>
            <PaperCodeChip code={p.code} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-semibold text-ink">{p.plannedLabel}</span>
              <span className="block truncate text-[11.5px] text-ink-3">
                {p.status === "failed" ? "Reattempt" : booked(p.code) ? "Exam booked" : "Target session"}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
        {batch ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-inv px-3 py-1 text-[12px] font-semibold text-ink-inv">
            <CalendarRange className="size-3.5 text-cta" />
            {cohort?.mode === "weekend" ? "Weekend batch" : "Weekday batch"} · {batch.schedule}
          </span>
        ) : null}
        <TextLink href="/plan">Completion plan</TextLink>
      </div>
    </Card>
  );
}

function UniversityStrip({ s }: { s: Student }) {
  const uni = universityById(s.universityId);
  const cohort = s.cohortIds.map((id) => cohortById(id)).find((c) => c?.type === "university");
  const latest = uni
    ? announcementsForUniversity(uni.id)
        .filter((a) => a.status === "published")
        .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))[0]
    : undefined;
  if (!uni) return null;

  return (
    <Card className="grid gap-0 overflow-hidden md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex min-w-0 items-center gap-4 p-5">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-[16px] font-display text-[20px] font-bold text-ink-inv"
          style={{ backgroundColor: uni.branding.primary }}
          aria-hidden
        >
          {uni.branding.logoInitials}
        </span>
        <div className="min-w-0">
          <SectionLabel>University and cohort</SectionLabel>
          <p className="mt-1 truncate font-display text-[18px] font-bold tracking-[-0.02em] text-ink">{uni.name}</p>
          <p className="truncate text-[13px] text-ink-2">
            {uni.programmeName} · Semester {s.semester} · Section {s.section}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-ink-3">
            {cohort?.name} · ACCA ID <span className="font-mono">{s.accaId}</span>
          </p>
        </div>
      </div>
      {latest ? (
        <div className="min-w-0 border-t border-line bg-surface-2 p-5 md:border-t-0 md:border-l">
          <div className="flex items-center justify-between gap-3">
            <SectionLabel className="flex items-center gap-1.5">
              <Megaphone className="size-3.5" /> Latest from {uni.shortName}
            </SectionLabel>
            <span className="shrink-0 text-[12px] text-ink-3">{formatAccaDate(latest.publishedOn)}</span>
          </div>
          <p className="mt-1.5 text-[14px] font-semibold text-ink">{latest.title}</p>
          <p className="mt-1 line-clamp-2 text-[13px] text-ink-2">{latest.body}</p>
          <TextLink href="/my-university" className="mt-2">
            University announcements
          </TextLink>
        </div>
      ) : null}
    </Card>
  );
}

function ComingUp({ s }: { s: Student }) {
  const items = upcomingFor(s);
  return (
    <Card className="overflow-hidden">
      <CardHeader title="Coming up" sub="Classes, deadlines and exams, soonest first" />
      <ul className="divide-y divide-line border-t border-line">
        {items.map((u) => (
          <li key={u.id}>
            <Link href={u.href} className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-cta-soft">
              <DateTile iso={u.at} strong={u.at.startsWith(ACCA_TODAY)} tone={u.tone} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{u.title}</span>
                <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                  {u.kind} · {u.meta}
                </span>
              </span>
              <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <TextLink href="/readiness">Your readiness score</TextLink>
        <StatusPill status="Today" tone="info" dot={false} size="sm">
          {items.filter((i) => i.at.startsWith(ACCA_TODAY)).length} today
        </StatusPill>
      </div>
    </Card>
  );
}
