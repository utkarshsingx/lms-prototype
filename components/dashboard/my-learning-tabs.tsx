"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Video } from "lucide-react";
import { formatAccaDate, formatShortDate, staffName, type Student } from "@/lib/data/acca";
import { Card } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { LiveDot } from "@/components/ui/badge";
import { PaperCodeChip } from "@/components/student/learn/bits";
import {
  MOCK_RUNNER,
  batchName,
  dayLabel,
  joinState,
  paperEntries,
  upcomingClasses,
} from "@/components/student/learn/derive";

function Row({
  href,
  lead,
  title,
  meta,
  aside,
}: {
  href: string;
  lead: React.ReactNode;
  title: string;
  meta: string;
  aside: React.ReactNode;
}) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors hover:bg-cta-soft">
        {lead}
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold text-ink">{title}</p>
            <p className="mt-0.5 truncate text-[12px] text-ink-3 tnum">{meta}</p>
          </div>
          {aside}
        </div>
      </Link>
    </li>
  );
}

/** Papers · Mocks · Live classes, for the signed-in student. */
export function MyLearningTabs({ student: s }: { student: Student }) {
  const [tab, setTab] = useState("papers");

  const papers = paperEntries(s).filter((p) => p.group === "now" || p.group === "next").slice(0, 5);
  const scheduled = s.mocks.filter((m) => m.status === "scheduled");
  const mocks = [
    ...scheduled.sort((a, b) => a.date.localeCompare(b.date)),
    ...s.mocks.filter((m) => m.status !== "scheduled").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3),
  ];
  const classes = upcomingClasses(s).slice(0, 4);

  const footer = {
    papers: { href: "/papers", label: "All papers and study material" },
    mocks: { href: "/mocks", label: "Mock exams and results trend" },
    classes: { href: "/classes", label: "Live classes and recordings" },
  }[tab]!;

  return (
    <Card className="overflow-hidden">
      <div className="px-5 pt-3.5">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "papers", label: "Papers", count: papers.length },
            { id: "mocks", label: "Mocks", count: scheduled.length },
            { id: "classes", label: "Live classes", count: classes.length },
          ]}
        />
      </div>

      <ul className="divide-y divide-line">
        {tab === "papers"
          ? papers.map((p) => (
              <Row
                key={p.code}
                href={p.course ? (p.group === "now" ? `/learn/${p.course.slug}` : `/courses/${p.course.slug}`) : "/papers"}
                lead={<PaperCodeChip code={p.code} />}
                title={p.name}
                meta={[p.statusLabel, p.semester ?? p.examLine].join(" · ")}
                aside={
                  <div className="flex items-center gap-3 sm:w-40 sm:shrink-0 sm:flex-col sm:items-stretch sm:gap-1.5">
                    <Progress value={p.progress} height={5} tone={p.progress >= 100 ? "jade" : "cta"} className="flex-1" />
                    <span className="shrink-0 text-[12px] text-ink-2 tnum sm:text-right">{p.progress}% studied</span>
                  </div>
                }
              />
            ))
          : null}

        {tab === "mocks"
          ? mocks.map((m) => (
              <Row
                key={m.id}
                href={m.status === "scheduled" && MOCK_RUNNER[m.paper] ? `/assessments/${m.assessmentId ?? MOCK_RUNNER[m.paper]}` : "/mocks"}
                lead={
                  <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-ink-2">
                    <ClipboardCheck className="size-4.5" />
                  </span>
                }
                title={m.title}
                meta={`${m.paper} · ${formatAccaDate(m.date)}`}
                aside={
                  m.status === "scheduled" ? (
                    <StatusPill status="Scheduled" className="w-fit shrink-0">
                      Scheduled · {formatShortDate(m.date)}
                    </StatusPill>
                  ) : m.status === "missed" ? (
                    <StatusPill status="Missed" className="w-fit shrink-0" />
                  ) : (
                    <StatusPill status={(m.score ?? 0) >= 50 ? "Passed" : "Failed"} className="w-fit shrink-0">
                      Scored {m.score}%
                    </StatusPill>
                  )
                }
              />
            ))
          : null}

        {tab === "classes"
          ? classes.map((c) => {
              const state = joinState(c);
              return (
                <Row
                  key={c.id}
                  href="/classes"
                  lead={
                    <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-surface-2 text-ink-2">
                      <Video className="size-4.5" />
                    </span>
                  }
                  title={`${c.paper} · ${c.title}`}
                  meta={`${dayLabel(c.start)}, ${c.start.slice(11, 16)} IST · ${staffName(c.facultyId)} · ${batchName(c)}`}
                  aside={
                    state === "live" ? (
                      <span className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-cta px-2.5 py-1 text-[12px] font-bold text-cta-ink">
                        <LiveDot tone="jade" /> Join now
                      </span>
                    ) : state === "cancelled" ? (
                      <StatusPill status="Cancelled" tone="neutral" className="w-fit shrink-0">
                        Moved to recording
                      </StatusPill>
                    ) : (
                      <StatusPill status="Scheduled" tone="info" className="w-fit shrink-0">
                        {dayLabel(c.start)}
                      </StatusPill>
                    )
                  }
                />
              );
            })
          : null}
      </ul>

      <div className="border-t border-line px-5 py-3">
        <Link
          href={footer.href}
          className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
        >
          {footer.label} <ArrowRight className="size-3.5" />
        </Link>
      </div>
    </Card>
  );
}
