"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, CalendarCheck, Download, Target } from "lucide-react";
import {
  examSessionById,
  formatAccaDate,
  paperName,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { ScoreBar, ScoreRing, scoreBand } from "@/components/ui/score";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { LineChart, StackedBar } from "@/components/ui/charts";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { PaperCodeChip, SectionLabel, useStudentRecord } from "./bits";
import { READINESS_TARGET, readinessDrivers, readinessPapers, relativeDays, weakAreasFor } from "./derive";

const TREND_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];
const DRIVER_TONES = ["brand", "cta-strong", "info", "jade"] as const;

export function ReadinessPage() {
  const s = useStudentRecord();
  return <Readiness key={s.id} s={s} />;
}

function recommendation(s: Student, code: PaperCode, score: number) {
  const booking = s.examBookings.find((b) => b.paper === code && (b.status === "booked" || b.status === "planned"));
  const session = booking?.sessionId ? examSessionById(booking.sessionId) : undefined;
  const mock = s.mocks.find((m) => m.paper === code && m.status === "scheduled");
  const gap = READINESS_TARGET - score;
  const when = booking ? (booking.entryWindow === "on-demand" ? formatAccaDate(booking.date) : `the ${booking.label} session`) : undefined;

  if (score >= READINESS_TARGET) {
    return {
      verdict: booking?.status === "booked" ? "Ready: keep it above 70" : "Ready to book",
      tone: "jade" as const,
      body: booking?.status === "booked"
        ? `You are above the 70 target and booked for ${when}. Keep practising weekly so the score holds until the exam.`
        : `You are above the 70 target. Book your ${code} exam${session?.standardEntryCloses ? ` before standard entry closes on ${formatAccaDate(session.standardEntryCloses)}` : ""}.`,
    };
  }
  if (score >= 60) {
    return {
      verdict: booking?.status === "booked" ? "Booked: close the gap" : "Book early entry, keep practising",
      tone: "amber" as const,
      body: `${gap} points below the 70 target recommended for exam entry.${booking?.status === "booked" ? ` You are booked for ${when}.` : ""}${
        mock ? ` Aim to reach 70 by the ${code} mock on ${formatAccaDate(mock.date)}.` : ""
      }`,
    };
  }
  return {
    verdict: "Hold the booking decision",
    tone: "rose" as const,
    body: `${gap} points below the 70 target.${
      booking?.status === "planned" && booking.entryClosesOn
        ? ` Your ${code} booking for ${when} is planned: ${session?.standardEntryCloses ? `standard entry closes ${formatAccaDate(session.standardEntryCloses)}` : `entry closes ${formatAccaDate(booking.entryClosesOn)}`}.`
        : booking?.entryWindow === "on-demand" || booking?.status === "planned"
          ? ` ${code} is planned for ${when}: book once you reach 70.`
          : ""
    }${mock ? ` Use the ${code} mock on ${formatAccaDate(mock.date)} as the checkpoint.` : ""}`,
  };
}

function Readiness({ s }: { s: Student }) {
  const papers = readinessPapers(s);
  const [paper, setPaper] = useState<PaperCode>(s.currentPaper && papers.includes(s.currentPaper) ? s.currentPaper : papers[0]);
  const weak = weakAreasFor(s);
  const weakest = weak[0];
  const drivers = readinessDrivers(s, paper);
  const overall = s.readiness.overall;
  const trend = s.readinessTrend;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="Readiness score"
        sub="How ready you are to sit each paper, what drives the score, and what to practise next. Aim for 70 before exam entry."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => toast({ title: `Report queued: readiness-${s.accaId ?? s.id}.pdf`, body: "Includes drivers, weak areas and the trend for each paper.", tone: "info" })}
            >
              <Download className="size-4" />
              Download report
            </Button>
            {weakest ? (
              <LinkButton href={`/practice?paper=${weakest.paper}&area=${weakest.area}`}>
                <Target className="size-4" />
                Practise weakest area
              </LinkButton>
            ) : null}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="flex min-w-0 flex-col items-center p-6 text-center">
          <SectionLabel>Overall readiness score</SectionLabel>
          <ScoreRing value={overall} size={168} stroke={14} showBand label="Overall readiness score" className="mt-4" />
          <p className="mt-3 text-[13px] text-ink-2">
            Across {papers.join(" and ")}, the papers you are preparing now.
            {trend.length > 1 ? ` Up ${overall - trend[0]} points since ${TREND_LABELS[6 - trend.length]}.` : ""}
          </p>
          <div className="mt-5 grid w-full grid-cols-2 gap-2">
            {papers.map((c) => {
              const v = s.readiness.byPaper[c] ?? 0;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setPaper(c)}
                  aria-pressed={paper === c}
                  className={cn(
                    "flex min-w-0 items-center gap-3 rounded-[14px] border p-3 text-left transition-colors",
                    paper === c ? "border-ink bg-cta-soft" : "border-line bg-surface hover:bg-cta-soft",
                  )}
                >
                  <ScoreRing value={v} size={48} stroke={5} label={`${c} readiness score`} />
                  <span className="min-w-0">
                    <span className="block font-mono text-[13px] font-bold text-ink">{c}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{scoreBand(v).label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Exam entry recommendation" sub="Readiness of 70 or more is the target before you sit a paper" />
          <ul className="divide-y divide-line border-t border-line">
            {papers.map((c) => {
              const v = s.readiness.byPaper[c] ?? 0;
              const rec = recommendation(s, c, v);
              const booking = s.examBookings.find((b) => b.paper === c && (b.status === "booked" || b.status === "planned"));
              return (
                <li key={c} className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:items-center">
                  <div className="min-w-0">
                    <p className="mb-2 flex items-center gap-2">
                      <PaperCodeChip code={c} />
                      <span className="truncate text-[13.5px] font-semibold text-ink">{paperName(c)}</span>
                    </p>
                    <ScoreBar value={v} marker={READINESS_TARGET} label="Readiness score" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={rec.verdict} tone={rec.tone} />
                      {booking ? (
                        <StatusPill status={booking.status} size="sm">
                          {booking.status === "booked" ? "Exam booked" : "Exam planned"} · {booking.entryWindow === "on-demand" ? formatAccaDate(booking.date) : booking.label}
                        </StatusPill>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[13px] text-ink-2">{rec.body}</p>
                    {booking ? <p className="mt-1 text-[12px] text-ink-3">Exam {relativeDays(booking.date)}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3">
            <LinkButton href="/exams" size="sm" variant="outline">
              <CalendarCheck className="size-3.5" />
              Exam bookings
            </LinkButton>
          </div>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader
          className="flex-wrap"
          title={`What drives your ${paper} readiness score`}
          sub="Mock exams 40% · practice coverage 25% · attendance 15% · syllabus completion 20%"
          action={<Segmented size="sm" value={paper} onChange={(v) => setPaper(v as PaperCode)} items={papers.map((c) => ({ id: c, label: c }))} />}
        />
        <div className="grid gap-6 border-t border-line p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <ul className="grid gap-3 sm:grid-cols-2">
            {drivers.parts.map((d) => (
              <li key={d.id} className="min-w-0 rounded-[14px] border border-line p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{d.label}</p>
                  <span className="shrink-0 rounded-full bg-surface-inv px-2 py-0.5 font-mono text-[11px] font-bold text-ink-inv">{d.weight}%</span>
                </div>
                <ScoreBar value={d.value} className="mt-3" />
                <p className="mt-2 text-[12px] text-ink-3">{d.note}</p>
                <p className="mt-2 text-[12.5px] font-semibold text-ink tnum">
                  Adds {d.points} of {d.weight} points
                </p>
              </li>
            ))}
          </ul>
          <div className="min-w-0 space-y-4">
            <div className="rounded-[14px] bg-surface-2 p-4">
              <SectionLabel>Score build-up</SectionLabel>
              <StackedBar
                className="mt-3"
                rows={papers.map((c) => ({
                  label: `${c} readiness`,
                  parts: readinessDrivers(s, c).parts.map((p, i) => ({ label: p.label, value: p.points, tone: DRIVER_TONES[i] })),
                }))}
              />
            </div>
            <p className="text-[12.5px] text-ink-2">
              Readiness score = 0.40 × mock average + 0.25 × practice coverage + 0.15 × attendance + 0.20 × syllabus completion. It updates overnight after each mock, practice set or class.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Weakest syllabus areas" sub="From your mock and practice answers, lowest first" />
          <ul className="divide-y divide-line border-t border-line">
            {weak.slice(0, 5).map((w) => (
              <li key={w.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2">
                    <PaperCodeChip code={w.paper} />
                    <span className="grid size-6 shrink-0 place-items-center rounded-[6px] bg-surface-inv font-mono text-[11px] font-bold text-cta">{w.area}</span>
                    <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{w.topic}</span>
                  </p>
                  <p className="mt-1 truncate text-[12px] text-ink-3">{w.areaTitle}</p>
                  <ScoreBar value={w.score} marker={50} className="mt-2 max-w-72" height={6} label="Your score in this area" />
                  <p className="mt-1.5 text-[12.5px] text-ink-2">{w.recommendation}</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
                  <LinkButton size="sm" href={`/practice?paper=${w.paper}&area=${w.area}`}>
                    <Target className="size-3.5" />
                    Practise this
                  </LinkButton>
                  <Link
                    href={`/papers?paper=${w.paper}&tab=material`}
                    className="inline-flex items-center gap-1.5 px-1 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                  >
                    <BookOpen className="size-3.5" />
                    Study material
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Readiness trend" sub={`Overall readiness score by month against the ${READINESS_TARGET} target`} />
          <div className="px-5 pb-5">
            <LineChart
              min={30}
              max={90}
              height={230}
              labels={TREND_LABELS.slice(6 - trend.length)}
              series={[
                { label: "Readiness score", values: trend, tone: "brand" },
                { label: "Exam entry target", values: trend.map(() => READINESS_TARGET), tone: "jade" },
              ]}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
