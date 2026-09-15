"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardCheck,
  FileClock,
  GraduationCap,
  MessageCircleQuestion,
  MonitorPlay,
  PenLine,
  Play,
  RotateCcw,
  Square,
  Target,
  Video,
} from "lucide-react";
import {
  classesForFaculty,
  cohortById,
  cohortWeakTopics,
  doubtSessions,
  doubtsForFaculty,
  evaluationsForGrader,
  formatShortDate,
  reattemptRequests,
  reviewRequests,
  staffName,
  studentName,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { HeroBand } from "@/components/ui/hero-band";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status";
import { LiveDot } from "@/components/ui/badge";
import { ScoreBar } from "@/components/ui/score";
import { toast } from "@/components/ui/toast";
import {
  FACULTY_NOW,
  PaperMark,
  WEEK_END,
  areaTitle,
  batchSize,
  cohortBatchLabel,
  dayLabel,
  endTime,
  isToday,
  longDay,
  plural,
  useFaculty,
} from "./shared";

export function FacultyDashboard() {
  const f = useFaculty();
  return <Dashboard key={f.staffId} />;
}

type TodayItem = {
  id: string;
  kind: "class" | "doubt";
  start: string;
  mins: number;
  paper: string;
  title: string;
  where: string;
  learners: number;
};

function Dashboard() {
  const { staffId, firstName, papers, cohorts, canApprove } = useFaculty();

  const myClasses = classesForFaculty(staffId).filter((c) => c.status !== "cancelled");
  const mySessions = doubtSessions.filter((d) => d.facultyId === staffId);

  const today: TodayItem[] = [
    ...myClasses
      .filter((c) => isToday(c.start))
      .map((c) => ({
        id: c.id,
        kind: "class" as const,
        start: c.start,
        mins: c.durationMins,
        paper: c.paper,
        title: c.title,
        where: cohortBatchLabel(c.cohortId, c.sectionId),
        learners: batchSize(c),
      })),
    ...mySessions
      .filter((d) => isToday(d.start))
      .map((d) => ({
        id: d.id,
        kind: "doubt" as const,
        start: d.start,
        mins: d.durationMins,
        paper: d.paper,
        title: `Doubt-clearing session · ${d.questionsQueued} questions queued`,
        where: cohortById(d.cohortId)?.name ?? d.cohortId,
        learners: cohortById(d.cohortId)?.size ?? 0,
      })),
  ].sort((a, b) => a.start.localeCompare(b.start));

  const weekClasses = myClasses.filter((c) => c.start > FACULTY_NOW && c.start.slice(0, 10) <= WEEK_END);
  const nextClass = weekClasses.find((c) => !isToday(c.start)) ?? weekClasses[0];

  const pendingEvals = evaluationsForGrader(staffId).filter((e) => e.status !== "graded" && e.status !== "returned");
  const flaggedEvals = pendingEvals.filter((e) => e.status === "flagged");
  const openDoubts = doubtsForFaculty(staffId)
    .filter((d) => d.status === "open")
    .sort((a, b) => a.askedOn.localeCompare(b.askedOn));

  const reviewing = reviewRequests.filter((r) => r.reviewerId === staffId && r.status === "pending");
  const submitted = reviewRequests.filter((r) => r.submittedBy === staffId && r.status !== "approved");
  const isReviewer = reviewing.length > 0;
  const reviewRows = isReviewer ? reviewing : submitted;

  const afterClass = myClasses
    .filter(
      (c) =>
        c.status === "completed" &&
        ((c.attendance && !c.attendance.marked) || c.recording?.status === "not-uploaded" || c.notes === "draft"),
    )
    .reverse();

  const reattempts = reattemptRequests.filter((r) => papers.includes(r.paper) && r.status === "pending");

  const cohortIds = new Set(cohorts.map((c) => c.id));
  const weak = cohortWeakTopics
    .filter((w) => cohortIds.has(w.cohortId))
    .flatMap((w) => w.topics.map((t) => ({ ...t, cohortId: w.cohortId, paper: w.paper })))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 3);

  const [live, setLive] = useState<Record<string, "live" | "ended">>({});

  const learnerCount = cohorts.reduce((n, c) => n + c.size, 0);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <HeroBand
        eyebrow="Teaching · Monday 14 September 2026"
        title={`Good morning, ${firstName}`}
        sub={`${plural(cohorts.length, "cohort")} and ${learnerCount} learners across ${papers.join(" and ")}. ${
          today.length
            ? `Today: ${today.map((t) => `${t.kind === "doubt" ? `${t.paper} doubt-clearing` : `${t.paper} class`} at ${t.start.slice(11, 16)}`).join(", ")}.`
            : "No live classes today."
        }`}
        stats={[
          {
            label: "Classes this week",
            value: weekClasses.length,
            hint: nextClass ? `Next: ${dayLabel(nextClass.start)}, ${nextClass.start.slice(11, 16)}` : "None scheduled",
          },
          {
            label: "Scripts to grade",
            value: pendingEvals.length,
            hint: flaggedEvals.length ? `${flaggedEvals.length} flagged for similarity` : "None flagged",
          },
          {
            label: "Questions waiting",
            value: openDoubts.length,
            hint: openDoubts[0] ? `Oldest asked ${formatShortDate(openDoubts[0].askedOn)}` : "Inbox clear",
          },
          {
            label: "Content in review",
            value: reviewRows.filter((r) => r.status === "pending").length,
            hint: isReviewer ? "Assigned to you to review" : "Submitted by you",
          },
        ]}
        actions={
          <>
            <LinkButton href="/faculty/classes">
              <MonitorPlay className="size-4" />
              Open live class console
            </LinkButton>
            <LinkButton href="/faculty/evaluation" variant="inverse">
              <ClipboardCheck className="size-4" />
              Grade scripts
            </LinkButton>
          </>
        }
        aside={
          nextClass ? (
            <div className="w-full rounded-[16px] border border-ink-inv/15 bg-ink-inv/5 p-4 lg:w-64">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">Next live class</p>
              <p className="mt-2 font-display text-[26px] leading-none font-bold tracking-[-0.03em] text-cta">
                {dayLabel(nextClass.start)}
              </p>
              <p className="mt-1.5 text-[13px] font-semibold text-ink-inv">
                {nextClass.start.slice(11, 16)} to {endTime(nextClass.start, nextClass.durationMins)} · {nextClass.paper}
              </p>
              <p className="mt-1 text-[12.5px] text-ink-inv/65">{nextClass.title}</p>
              <p className="mt-1 text-[12px] text-ink-inv/50">
                {cohortBatchLabel(nextClass.cohortId, nextClass.sectionId)} · {batchSize(nextClass)} learners
              </p>
            </div>
          ) : undefined
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Today's classes"
            sub={longDay(FACULTY_NOW)}
            action={
              <Link
                href="/faculty/classes"
                className="text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              >
                All classes
              </Link>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {today.length === 0 ? (
              <li className="px-5 py-6 text-[13px] text-ink-3">No live classes or doubt-clearing sessions today.</li>
            ) : null}
            {today.map((t) => {
              const state = live[t.id];
              return (
                <li key={t.id} className={cn("flex flex-wrap items-center gap-3 px-5 py-4", state === "live" && "bg-cta-soft")}>
                  <PaperMark code={t.paper} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-bold text-ink">
                      <span className="font-mono text-[12.5px] tnum">
                        {t.start.slice(11, 16)} to {endTime(t.start, t.mins)}
                      </span>
                      {state === "live" ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-rose">
                          <LiveDot /> Live now
                        </span>
                      ) : state === "ended" ? (
                        <StatusPill status="completed" size="sm">
                          Ended
                        </StatusPill>
                      ) : (
                        <StatusPill status="today" size="sm" />
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-[13.5px] text-ink">{t.title}</p>
                    <p className="truncate text-[12px] text-ink-3">
                      {t.where} · {t.learners} learners
                    </p>
                  </div>
                  {state === "live" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setLive((s) => ({ ...s, [t.id]: "ended" }));
                        toast({
                          title: t.kind === "doubt" ? "Doubt-clearing session ended" : "Class ended",
                          body: "Attendance captured from the live roster. Review it on Live classes.",
                        });
                      }}
                    >
                      <Square className="size-3.5" />
                      End
                    </Button>
                  ) : state === "ended" ? (
                    <LinkButton size="sm" variant="outline" href="/faculty/classes">
                      Mark attendance
                    </LinkButton>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setLive((s) => ({ ...s, [t.id]: "live" }));
                        toast({
                          title: t.kind === "doubt" ? "Doubt-clearing session started" : "Class started",
                          body: `${t.where} · learners in the waiting room were admitted`,
                        });
                      }}
                    >
                      <Play className="size-3.5" />
                      {t.kind === "doubt" ? "Start session" : "Start class"}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {weekClasses.filter((c) => !isToday(c.start)).length ? (
            <div className="border-t border-line px-5 pt-4 pb-5">
              <SectionTitle className="mb-2.5">Later this week</SectionTitle>
              <ul className="space-y-2">
                {weekClasses
                  .filter((c) => !isToday(c.start))
                  .map((c) => (
                    <li key={c.id} className="flex min-w-0 items-center gap-3">
                      <span className="w-24 shrink-0 font-mono text-[12px] text-ink-2 tnum">
                        {dayLabel(c.start)} {c.start.slice(11, 16)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
                        <span className="font-semibold">{c.paper}</span> · {c.title}
                      </span>
                      <Link
                        href={`/faculty/classes?class=${c.id}`}
                        className="shrink-0 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                      >
                        Prepare
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          ) : null}
        </Card>

        <div className="grid min-w-0 gap-5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <QueueCard
            icon={<PenLine />}
            title="Scripts to grade"
            count={pendingEvals.length}
            tone="amber"
            href="/faculty/evaluation"
            hrefLabel="Open evaluation"
          >
            {pendingEvals.slice(0, 3).map((e) => (
              <QueueRow
                key={e.id}
                primary={studentName(e.studentId)}
                secondary={`${e.paper} · ${e.title}`}
                end={<StatusPill status={e.status} size="sm" />}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<MessageCircleQuestion />}
            title="Questions waiting"
            count={openDoubts.length}
            tone="info"
            href="/faculty/questions"
            hrefLabel="Answer questions"
          >
            {openDoubts.slice(0, 3).map((d) => (
              <QueueRow
                key={d.id}
                primary={d.topic}
                secondary={`${studentName(d.studentId)} · ${d.paper} · asked ${formatShortDate(d.askedOn)}`}
                end={<span className="text-[12px] font-semibold text-ink-3 tnum">{d.upvotes} +1</span>}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<FileClock />}
            title={isReviewer ? "Content reviews" : "Your content in review"}
            count={reviewRows.filter((r) => r.status === "pending").length}
            tone="violet"
            href="/faculty/content/reviews"
            hrefLabel="Reviews and versions"
          >
            {reviewRows.slice(0, 3).map((r) => (
              <QueueRow
                key={r.id}
                primary={r.title}
                secondary={
                  isReviewer
                    ? `${r.paper} · from ${staffName(r.submittedBy)} · due ${formatShortDate(r.dueOn)}`
                    : `${r.paper} · reviewer ${staffName(r.reviewerId)} · due ${formatShortDate(r.dueOn)}`
                }
                end={<StatusPill status={r.status} size="sm" />}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<Video />}
            title="After-class tasks"
            count={afterClass.length}
            tone="rose"
            href={afterClass[0] ? `/faculty/classes?class=${afterClass[0].id}` : "/faculty/classes"}
            hrefLabel="Finish class records"
          >
            {afterClass.slice(0, 3).map((c) => (
              <QueueRow
                key={c.id}
                primary={`${c.paper} · ${c.title}`}
                secondary={`${dayLabel(c.start)} · ${[
                  c.attendance && !c.attendance.marked ? "attendance not marked" : null,
                  c.recording?.status === "not-uploaded" ? "recording not uploaded" : null,
                  c.notes === "draft" ? "notes in draft" : null,
                ]
                  .filter(Boolean)
                  .join(", ")}`}
              />
            ))}
          </QueueCard>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Weak topics to act on"
            sub="Lowest average scores in your cohorts' mocks and tests"
            action={
              <Link
                href="/faculty/cohorts"
                className="text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              >
                Recommend remedial learning
              </Link>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {weak.map((w) => (
              <li key={`${w.cohortId}-${w.topic}`} className="grid gap-3 px-5 py-3.5 sm:grid-cols-[minmax(0,1fr)_10rem] sm:items-center">
                <div className="min-w-0">
                  <p className="flex min-w-0 items-center gap-2 text-[13.5px] font-semibold text-ink">
                    <Target aria-hidden className="size-4 shrink-0 text-rose" />
                    <span className="truncate">{w.topic}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {w.paper} {w.area} · {areaTitle(w.paper, w.area)} · {cohortById(w.cohortId)?.name} · {w.studentsBelow50} below 50
                  </p>
                </div>
                <ScoreBar value={w.avgScore} marker={50} height={6} />
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Reattempt requests"
            sub={canApprove ? "Awaiting your decision" : "You can review these; approval sits with an authorised reviewer"}
            action={
              <Link
                href="/faculty/evaluation?tab=reattempts"
                className="text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              >
                Review
              </Link>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {reattempts.length === 0 ? <li className="px-5 py-5 text-[13px] text-ink-3">No pending requests.</li> : null}
            {reattempts.map((r) => (
              <QueueRow
                key={r.id}
                primary={studentName(r.studentId)}
                secondary={`${r.paper} · ${r.title} · last score ${r.lastScore}% · ${r.attemptsUsed} of ${r.attemptsAllowed} attempts used`}
                end={<StatusPill status={r.status} size="sm" />}
              />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 text-[12.5px] text-ink-3">
            <RotateCcw aria-hidden className="size-3.5" />
            {canApprove ? "You are authorised to approve reattempts." : "Your role cannot approve reattempts."}
            <GraduationCap aria-hidden className="ml-auto size-3.5" />
            <span>{papers.join(", ")}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

function QueueCard({
  icon,
  title,
  count,
  tone,
  href,
  hrefLabel,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  tone: "amber" | "info" | "violet" | "rose";
  href: string;
  hrefLabel: string;
  children: React.ReactNode;
}) {
  const chip = {
    amber: "bg-amber-soft text-amber",
    info: "bg-info-soft text-info",
    violet: "bg-violet-soft text-violet",
    rose: "bg-rose-soft text-rose",
  }[tone];
  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex items-start gap-3 px-5 pt-4.5">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] [&>svg]:size-[18px]", chip)}>{icon}</span>
        <h3 className="min-w-0 flex-1 pt-1.5 text-[14.5px] leading-snug font-bold text-ink">{title}</h3>
        <span className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{count}</span>
      </div>
      <ul className="mt-3 flex-1 divide-y divide-line border-t border-line">
        {count === 0 ? <li className="px-5 py-4 text-[12.5px] text-ink-3">Nothing waiting.</li> : children}
      </ul>
      <div className="border-t border-line px-5 py-3">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
        >
          {hrefLabel}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}

function QueueRow({ primary, secondary, end }: { primary: React.ReactNode; secondary?: React.ReactNode; end?: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 px-5 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-ink">{primary}</p>
        {secondary ? <p className="truncate text-[12px] text-ink-3">{secondary}</p> : null}
      </div>
      {end ? <div className="shrink-0">{end}</div> : null}
    </li>
  );
}
