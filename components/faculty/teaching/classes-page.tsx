"use client";

import { useState } from "react";
import { Download, Link2, MonitorPlay, Play, UsersRound } from "lucide-react";
import { classesForFaculty, formatAccaDate, type LiveClass } from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, Segmented } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { LiveDot } from "@/components/ui/badge";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { AttendancePanel, LiveConsole, NotesPanel, UploadsPanel, type ClassPatch } from "./class-workspace";
import { DoubtSessions } from "./doubt-sessions";
import { FACULTY_NOW, PaperMark, WEEK_END, areaTitle, batchSize, cohortBatchLabel, dayLabel, endTime, useFaculty } from "./shared";

const WORK_TABS = [
  { id: "console", label: "Live class console" },
  { id: "attendance", label: "Mark attendance" },
  { id: "uploads", label: "Upload recordings and resources" },
  { id: "notes", label: "Class notes" },
];

function needsAction(c: LiveClass) {
  return c.status === "completed" && (Boolean(c.attendance && !c.attendance.marked) || c.recording?.status !== "published" || c.notes !== "published");
}

export function FacultyClassesPage({ initialClassId, initialTab }: { initialClassId?: string; initialTab?: string }) {
  const f = useFaculty();
  return <ClassesView key={f.staffId} initialClassId={initialClassId} initialTab={initialTab} />;
}

function ClassesView({ initialClassId, initialTab }: { initialClassId?: string; initialTab?: string }) {
  const { staffId, papers } = useFaculty();
  const [classes, setClasses] = useState<LiveClass[]>(() => classesForFaculty(staffId));
  const [top, setTop] = useState(initialTab === "doubts" ? "doubts" : "classes");

  const nextUp = classes.find((c) => c.start > FACULTY_NOW && c.status !== "cancelled");
  const initial = classes.find((c) => c.id === initialClassId) ?? nextUp ?? classes[classes.length - 1];
  const [selectedId, setSelectedId] = useState(initial?.id ?? "");
  const [segment, setSegment] = useState(initial && initial.status === "completed" ? (needsAction(initial) ? "action" : "past") : "upcoming");
  const [work, setWork] = useState(initialTab && WORK_TABS.some((t) => t.id === initialTab) ? initialTab : initial?.status === "completed" ? "attendance" : "console");

  const selected = classes.find((c) => c.id === selectedId);
  const update = (id: string, patch: ClassPatch) => setClasses((all) => all.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const list = classes
    .filter((c) =>
      segment === "upcoming"
        ? c.status !== "completed"
        : segment === "past"
          ? c.status === "completed"
          : needsAction(c),
    )
    .sort((a, b) => (segment === "upcoming" ? a.start.localeCompare(b.start) : b.start.localeCompare(a.start)));

  const week = classes.filter((c) => c.start >= "2026-09-14" && c.start.slice(0, 10) <= WEEK_END && c.status !== "cancelled");
  const toMark = classes.filter((c) => c.status === "completed" && c.attendance && !c.attendance.marked);
  const toUpload = classes.filter((c) => c.status === "completed" && c.recording?.status !== "published");
  const drafts = classes.filter((c) => c.status === "completed" && c.notes !== "published");

  const select = (c: LiveClass, tab?: string) => {
    setTop("classes");
    setSelectedId(c.id);
    setWork(tab ?? (c.status === "completed" ? "attendance" : "console"));
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Teaching"
        title="Live classes"
        sub="Conduct live classes, mark attendance, upload recordings, upload presentations and resources, publish class notes and conduct doubt-clearing sessions."
        actions={
          <>
            <Button variant="secondary" onClick={() => toast({ title: `Report queued: ${papers.join("-").toLowerCase()}-attendance-register.csv`, tone: "info" })}>
              <Download className="size-4" />
              Attendance register
            </Button>
            {nextUp ? (
              <Button
                onClick={() => {
                  setSegment("upcoming");
                  select(nextUp, "console");
                }}
              >
                <MonitorPlay className="size-4" />
                Open next class
              </Button>
            ) : null}
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Classes this week" value={week.length} sub={nextUp ? `Next ${dayLabel(nextUp.start)}, ${nextUp.start.slice(11, 16)}` : undefined} icon={<MonitorPlay />} />
        <KpiTile label="Attendance to mark" value={toMark.length} tone={toMark.length ? "rose" : "jade"} sub={toMark[0] ? `${toMark[0].paper} · ${dayLabel(toMark[0].start)}` : "All registers saved"} icon={<UsersRound />} />
        <KpiTile label="Recordings not published" value={toUpload.length} tone={toUpload.length ? "amber" : "jade"} sub="Uploaded or processing" />
        <KpiTile label="Class notes not published" value={drafts.length} tone={drafts.length ? "amber" : "jade"} sub="Drafts from recent classes" />
      </KpiRow>

      <Tabs
        value={top}
        onChange={setTop}
        items={[
          { id: "classes", label: "Conduct live classes", count: week.length },
          { id: "doubts", label: "Conduct doubt-clearing sessions" },
        ]}
      />

      {top === "doubts" ? (
        <DoubtSessions />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <Segmented
              size="sm"
              value={segment}
              onChange={setSegment}
              items={[
                { id: "upcoming", label: "Upcoming" },
                { id: "past", label: "Past" },
                { id: "action", label: `Needs action (${classes.filter(needsAction).length})` },
              ]}
            />
            <ul className="scrollbar-slim max-h-[24rem] space-y-2 overflow-y-auto pr-0.5 xl:max-h-[46rem]">
              {list.length === 0 ? <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">Nothing here.</li> : null}
              {list.map((c) => {
                const on = c.id === selectedId;
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => select(c)}
                      className={cn(
                        "flex w-full min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
                        on ? "border-cta-strong bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                      )}
                    >
                      <PaperMark code={c.paper} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-mono text-[12px] text-ink-2 tnum">
                          {dayLabel(c.start)} · {c.start.slice(11, 16)} to {endTime(c.start, c.durationMins)}
                        </span>
                        <span className="block truncate text-[13.5px] font-semibold text-ink">{c.title}</span>
                        <span className="block truncate text-[12px] text-ink-3">{cohortBatchLabel(c.cohortId, c.sectionId)}</span>
                        {c.status === "completed" ? (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {c.attendance && !c.attendance.marked ? <StatusPill status="overdue" size="sm">Attendance</StatusPill> : null}
                            {c.recording?.status === "not-uploaded" ? <StatusPill status="missing" tone="rose" size="sm">Recording</StatusPill> : null}
                            {c.recording?.status === "processing" ? <StatusPill status="processing" size="sm">Recording</StatusPill> : null}
                            {c.notes === "draft" ? <StatusPill status="draft" tone="amber" size="sm">Notes draft</StatusPill> : null}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0">
                        {c.status === "live" ? (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-rose">
                            <LiveDot /> Live
                          </span>
                        ) : (
                          <StatusPill status={c.status} size="sm" />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <div className="min-w-0 space-y-4">
              <Card className="min-w-0">
                <div className="flex flex-wrap items-start gap-4 p-5">
                  <PaperMark code={selected.paper} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                      {selected.paper} · area {selected.syllabusArea} · {areaTitle(selected.paper, selected.syllabusArea)}
                    </p>
                    <h2 className="mt-1 font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">{selected.title}</h2>
                    <p className="mt-1 text-[13px] text-ink-2">
                      {formatAccaDate(selected.start)} · {selected.start.slice(11, 16)} to {endTime(selected.start, selected.durationMins)} · {cohortBatchLabel(selected.cohortId, selected.sectionId)} · {batchSize(selected)} learners
                    </p>
                    {selected.link ? (
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12.5px] text-ink-3">
                        <Link2 aria-hidden className="size-3.5 shrink-0" />
                        <span className="truncate">{selected.link.replace("https://", "")}</span>
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {selected.status === "live" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-soft px-2.5 py-1 text-[12px] font-bold text-rose">
                        <LiveDot /> Live now
                      </span>
                    ) : (
                      <StatusPill status={selected.status} />
                    )}
                    {selected.status !== "completed" && selected.status !== "live" && selected.status !== "cancelled" && work !== "console" ? (
                      <Button size="sm" onClick={() => setWork("console")}>
                        <Play className="size-3.5" />
                        Start class
                      </Button>
                    ) : null}
                  </div>
                </div>
                <Tabs value={work} onChange={setWork} items={WORK_TABS} className="px-5" />
              </Card>

              {work === "console" ? (
                <LiveConsole key={selected.id} cls={selected} onUpdate={(p) => update(selected.id, p)} onGoTo={setWork} />
              ) : work === "attendance" ? (
                <AttendancePanel key={`${selected.id}-${selected.status}`} cls={selected} onUpdate={(p) => update(selected.id, p)} onGoTo={setWork} />
              ) : work === "uploads" ? (
                <UploadsPanel key={selected.id} cls={selected} onUpdate={(p) => update(selected.id, p)} />
              ) : (
                <NotesPanel key={selected.id} cls={selected} onUpdate={(p) => update(selected.id, p)} />
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
