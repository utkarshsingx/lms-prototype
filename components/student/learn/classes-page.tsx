"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Ban, CalendarPlus, CheckCircle2, MapPin, MessageCircleQuestion, NotebookPen, Play, Video } from "lucide-react";
import {
  ACCA_TODAY,
  blackoutRanges,
  doubtSessions,
  formatAccaDate,
  formatShortDate,
  paperName,
  staffName,
  syllabusAreaTitle,
  universityById,
  type LiveClass,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Tabs } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status";
import { LiveDot } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { toast } from "@/components/ui/toast";
import { formatRange } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { PaperCodeChip, SectionLabel, useStudentRecord } from "./bits";
import { DEMO_NOW, batchName, cohortRecordings, dayLabel, joinState, longDayLabel, minutesBetween, plural, upcomingClasses } from "./derive";

function durationLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h}h${m ? ` ${m}m` : ""}` : `${m}m`;
}

function addMinutes(start: string, mins: number) {
  const total = Number(start.slice(11, 13)) * 60 + Number(start.slice(14, 16)) + mins;
  const h = Math.floor((((total % 1440) + 1440) % 1440) / 60);
  const m = (((total % 1440) + 1440) % 1440) % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function ClassesPage() {
  const s = useStudentRecord();
  return <Classes key={s.id} s={s} />;
}

function Classes({ s }: { s: Student }) {
  const upcoming = upcomingClasses(s);
  const recordings = useMemo(() => cohortRecordings(s), [s]);
  const doubts = doubtSessions.filter((d) => s.cohortIds.includes(d.cohortId));
  const uni = universityById(s.universityId);
  const blackouts = s.universityId ? blackoutRanges(s.universityId).filter((b) => b.end >= ACCA_TODAY) : [];
  const cancelled = upcoming.filter((c) => c.status === "cancelled");

  const [tab, setTab] = useState("upcoming");
  const [watched, setWatched] = useState<string[]>(() =>
    recordings.filter((r) => r.recording?.status === "published" && r.start < "2026-09-05").map((r) => r.id),
  );
  const [paper, setPaper] = useState("");
  const [watchFilter, setWatchFilter] = useState("");

  const nextLive = upcoming.find((c) => c.status !== "cancelled");
  const liveNow = upcoming.find((c) => joinState(c) === "live");
  const published = recordings.filter((r) => r.recording?.status === "published");

  const join = (c: LiveClass) =>
    toast({
      title: `Joining ${c.paper} live class`,
      body: `${c.title} · ${c.delivery === "on-campus" && c.room ? `${c.room} or online` : "online classroom"}`,
    });
  const addToCalendar = (title: string, when: string) => toast({ title: "Added to your calendar", body: `${title} · ${when} IST`, tone: "info" });

  const byDay = upcoming.reduce<Record<string, LiveClass[]>>((acc, c) => {
    (acc[c.start.slice(0, 10)] ??= []).push(c);
    return acc;
  }, {});

  const rows = recordings.filter(
    (r) =>
      (!paper || r.paper === paper) &&
      (!watchFilter || (watchFilter === "watched" ? watched.includes(r.id) : !watched.includes(r.id) && r.recording?.status === "published")),
  );

  const columns: DataTableColumn<LiveClass>[] = [
    {
      key: "title",
      header: "Recording",
      sortable: true,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <PaperCodeChip code={r.paper} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{r.title}</span>
            <span className="block truncate text-[12px] text-ink-3">
              Area {r.syllabusArea} · {batchName(r)}
            </span>
          </span>
        </span>
      ),
    },
    { key: "start", header: "Class date", sortable: true, render: (r) => `${formatAccaDate(r.start)}, ${r.start.slice(11, 16)}` },
    { key: "faculty", header: "Faculty", sortable: true, sortValue: (r) => staffName(r.facultyId), render: (r) => staffName(r.facultyId) },
    {
      key: "duration",
      header: "Duration",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (r) => r.recording?.durationMins ?? 0,
      render: (r) => (r.recording?.durationMins ? durationLabel(r.recording.durationMins) : "Not ready"),
    },
    {
      key: "notes",
      header: "Notes attached",
      render: (r) =>
        r.notes === "published" ? (
          <span className="inline-flex items-center gap-1.5 text-ink-2">
            <NotebookPen className="size-3.5" /> Class notes · {plural(r.resources.length, "file")}
          </span>
        ) : (
          <span className="text-ink-3">Notes in draft</span>
        ),
    },
    {
      key: "watched",
      header: "Watched",
      sortable: true,
      sortValue: (r) => (watched.includes(r.id) ? 1 : 0),
      render: (r) =>
        r.recording?.status !== "published" ? (
          <StatusPill status="Processing" size="sm">
            {r.recording?.status === "processing" ? "Processing" : "Upload pending"}
          </StatusPill>
        ) : watched.includes(r.id) ? (
          <StatusPill status="Watched" tone="jade" size="sm" />
        ) : (
          <StatusPill status="Not watched" tone="neutral" size="sm" />
        ),
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (r) =>
        r.recording?.status === "published" ? (
          <span className="inline-flex gap-1.5">
            <Button
              size="xs"
              variant={watched.includes(r.id) ? "outline" : "primary"}
              onClick={(ev) => {
                ev.stopPropagation();
                if (!watched.includes(r.id)) setWatched((w) => [...w, r.id]);
                toast({ title: `Playing recording: ${r.title}`, body: `${r.paper} · ${durationLabel(r.recording?.durationMins ?? 0)} · marked as watched`, tone: "info" });
              }}
            >
              <Play className="size-3 fill-current" />
              {watched.includes(r.id) ? "Rewatch" : "Watch"}
            </Button>
            {watched.includes(r.id) ? (
              <Button
                size="xs"
                variant="ghost"
                onClick={(ev) => {
                  ev.stopPropagation();
                  setWatched((w) => w.filter((x) => x !== r.id));
                  toast({ title: "Marked as not watched", body: r.title, tone: "neutral" });
                }}
              >
                Unmark
              </Button>
            ) : null}
          </span>
        ) : (
          <span className="text-[12px] text-ink-3">Available within 24 hours</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="Live classes"
        sub="Live classes for your batch or section, doubt-clearing sessions, and recordings of every class in your cohort."
        actions={
          liveNow ? (
            <Button onClick={() => join(liveNow)}>
              <LiveDot tone="jade" />
              Join {liveNow.paper} class now
            </Button>
          ) : (
            <Button onClick={() => toast({ title: `${plural(upcoming.filter((c) => c.status !== "cancelled").length, "class", "classes")} added to your calendar`, body: "Calendar invites include the class link and syllabus area.", tone: "info" })}>
              <CalendarPlus className="size-4" />
              Add schedule to calendar
            </Button>
          )
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Attendance in ACCA sessions" value={`${s.attendance.pct}%`} sub={`${s.attendance.attended} of ${s.attendance.total} classes attended`} />
        <KpiTile
          label="Next live class"
          value={nextLive ? dayLabel(nextLive.start) : "None scheduled"}
          sub={nextLive ? `${nextLive.start.slice(11, 16)} IST · ${nextLive.paper} ${nextLive.title}` : undefined}
          tone="info"
          icon={<Video />}
        />
        <KpiTile label="Recordings" value={published.length} sub={`${watched.length} watched · ${published.length - watched.length} to watch · ${recordings.length - published.length} processing`} tone="violet" icon={<Play />} />
        <KpiTile
          label="Missed classes"
          value={s.attendance.missedClasses}
          sub={s.attendance.lastMissed ? `Last missed ${formatAccaDate(s.attendance.lastMissed)}` : "None missed"}
          tone={s.attendance.missedClasses > 3 ? "rose" : "amber"}
        />
      </KpiRow>

      {blackouts.length && uni ? (
        <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-rose/30 bg-rose-soft p-4 sm:flex-row sm:items-start">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-rose text-on-accent">
            <Ban className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">
              {uni.shortName} examination blackout: {formatRange(blackouts[0].start, blackouts[0].end)}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-2">
              No ACCA live classes or mocks are scheduled during university examinations. Recordings stay available and doubt-clearing resumes after the blackout.
              {cancelled.length
                ? ` Continuous internal assessment week moves ${plural(cancelled.length, "class", "classes")} to recordings (${cancelled.map((c) => formatShortDate(c.start)).join(", ")}).`
                : ""}
            </p>
          </div>
          <StatusPill status="Blackout" tone="rose" className="w-fit shrink-0">
            {plural(blackouts.length, "blackout period")}
          </StatusPill>
        </div>
      ) : null}

      <Card className="min-w-0 overflow-hidden">
        <div className="px-5 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "upcoming", label: "Upcoming live classes", count: upcoming.length },
              { id: "recordings", label: "Recordings", count: recordings.length },
              { id: "doubts", label: "Doubt-clearing sessions", count: doubts.filter((d) => d.status !== "completed").length },
            ]}
          />
        </div>

        {tab === "upcoming" ? (
          <div className="space-y-6 p-5">
            {!upcoming.some((c) => c.start.startsWith(ACCA_TODAY)) && nextLive ? (
              <p className="rounded-[12px] border border-line bg-surface-2 px-4 py-3 text-[13px] text-ink-2">
                No live class today. Your next class is <span className="font-semibold text-ink">{longDayLabel(nextLive.start)} at {nextLive.start.slice(11, 16)} IST</span>.
              </p>
            ) : null}
            {Object.entries(byDay).map(([day, list]) => {
              const today = day === ACCA_TODAY;
              return (
                <section key={day}>
                  <SectionLabel className="mb-2.5">
                    {today ? `Today · ${longDayLabel(day)}` : longDayLabel(day)}
                  </SectionLabel>
                  <ul className="space-y-2.5">
                    {list.map((c) => {
                      const state = joinState(c);
                      const toStart = minutesBetween(DEMO_NOW, c.start);
                      return (
                        <li
                          key={c.id}
                          className={cn(
                            "flex flex-col gap-3 rounded-[16px] border p-4 sm:flex-row sm:items-center",
                            today && state !== "cancelled" ? "border-cta bg-cta-soft" : "border-line bg-surface",
                            state === "cancelled" && "opacity-80",
                          )}
                        >
                          <div className="flex shrink-0 items-baseline gap-2 sm:w-24 sm:flex-col sm:gap-0">
                            <span className={cn("font-display text-[20px] leading-none font-bold tnum", state === "cancelled" ? "text-ink-3 line-through" : "text-ink")}>
                              {c.start.slice(11, 16)}
                            </span>
                            <span className="text-[12px] text-ink-3">to {addMinutes(c.start, c.durationMins)} · {durationLabel(c.durationMins)}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="flex min-w-0 items-center gap-2">
                              <PaperCodeChip code={c.paper} />
                              <span className="min-w-0 truncate text-[14.5px] font-semibold text-ink">{c.title}</span>
                              {today && state !== "cancelled" ? (
                                <StatusPill status="Today" tone="cta" size="sm" dot={false} className="shrink-0">
                                  Today
                                </StatusPill>
                              ) : null}
                            </p>
                            <p className="mt-1 truncate text-[12.5px] text-ink-3">
                              Area {c.syllabusArea} · {syllabusAreaTitle(c.paper, c.syllabusArea)} · {staffName(c.facultyId)} · {batchName(c)}
                            </p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                              <MapPin className="size-3.5 shrink-0" />
                              <span className="truncate">{c.delivery === "on-campus" && c.room ? `${c.room}, or join online` : "Online live classroom"}</span>
                            </p>
                            {c.note ? <p className="mt-1 text-[12.5px] font-medium text-ink-2">{c.note}</p> : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {state === "live" ? (
                              <Button size="sm" onClick={() => join(c)}>
                                <LiveDot tone="jade" />
                                {toStart > 0 ? `Join now · starts in ${toStart} min` : "Join now"}
                              </Button>
                            ) : state === "cancelled" ? (
                              <StatusPill status="Cancelled" tone="neutral">
                                Moved to recording
                              </StatusPill>
                            ) : (
                              <span title="Join opens 15 minutes before the class starts" className="inline-flex">
                                <Button size="sm" variant="outline" disabled>
                                  Join opens {addMinutes(c.start, -15)}
                                </Button>
                              </span>
                            )}
                            {state !== "cancelled" ? (
                              <Button size="sm" variant="ghost" onClick={() => addToCalendar(`${c.paper} · ${c.title}`, `${dayLabel(c.start)}, ${c.start.slice(11, 16)}`)}>
                                <CalendarPlus className="size-3.5" />
                                Add to calendar
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
            {!upcoming.length ? <EmptyState title="No live classes scheduled" sub="Your next timetable is published two weeks ahead." /> : null}
          </div>
        ) : null}

        {tab === "recordings" ? (
          <div className="p-5">
            <DataTable
              bare
              caption="Recordings"
              rows={rows}
              columns={columns}
              getRowId={(r) => r.id}
              pageSize={8}
              initialSort={{ key: "start", dir: "desc" }}
              search={{
                placeholder: "Search recordings by topic or faculty",
                match: (r, q) => r.title.toLowerCase().includes(q) || staffName(r.facultyId).toLowerCase().includes(q),
              }}
              filters={
                <FilterBar
                  active={Boolean(paper || watchFilter)}
                  onClear={() => {
                    setPaper("");
                    setWatchFilter("");
                  }}
                >
                  <FilterSelect
                    label="Paper"
                    value={paper}
                    onChange={setPaper}
                    allLabel="All papers"
                    options={[...new Set(recordings.map((r) => r.paper))].map((p) => ({ value: p, label: `${p} · ${paperName(p)}` }))}
                  />
                  <FilterSelect
                    label="Watched"
                    value={watchFilter}
                    onChange={setWatchFilter}
                    allLabel="Any"
                    options={[
                      { value: "watched", label: "Watched" },
                      { value: "unwatched", label: "Not watched" },
                    ]}
                  />
                </FilterBar>
              }
              empty={<EmptyState title="No recordings match" sub="Clear the filters to see every recording in your cohort." />}
            />
          </div>
        ) : null}

        {tab === "doubts" ? (
          <ul className="grid gap-3 p-5 md:grid-cols-2">
            {doubts.map((d) => {
              const done = d.status === "completed";
              return (
                <li key={d.id} className={cn("flex min-w-0 flex-col rounded-[16px] border p-4", done ? "border-line bg-surface-2" : "border-line bg-surface")}>
                  <div className="flex items-start justify-between gap-3">
                    <p className="flex min-w-0 items-center gap-2">
                      <PaperCodeChip code={d.paper} />
                      <span className="truncate text-[14px] font-semibold text-ink">{d.title}</span>
                    </p>
                    <StatusPill status={done ? "Completed" : d.status === "today" ? "Today" : "Scheduled"} size="sm" className="shrink-0" />
                  </div>
                  <p className="mt-2 text-[12.5px] text-ink-2">
                    {longDayLabel(d.start)}, {d.start.slice(11, 16)} IST · {d.durationMins} min · {staffName(d.facultyId)}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                    {done ? `${d.attendees} learners attended` : `${plural(d.questionsQueued, "question")} queued so far`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {done ? (
                      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3">
                        <CheckCircle2 className="size-3.5 text-jade" /> Answers added to the doubt threads
                      </span>
                    ) : (
                      <>
                        <Button size="xs" variant="outline" onClick={() => addToCalendar(d.title, `${dayLabel(d.start)}, ${d.start.slice(11, 16)}`)}>
                          <CalendarPlus className="size-3.5" />
                          Add to calendar
                        </Button>
                        <Link
                          href="/doubts"
                          className="inline-flex items-center gap-1.5 px-1 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                        >
                          <MessageCircleQuestion className="size-3.5" />
                          Queue a doubt
                        </Link>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Card>
    </div>
  );
}
