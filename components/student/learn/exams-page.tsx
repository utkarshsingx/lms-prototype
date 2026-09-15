"use client";

import { useState } from "react";
import { AlertTriangle, CalendarCheck, CalendarClock, Download, History, Trophy } from "lucide-react";
import {
  ACCA_TODAY,
  addDays,
  attemptHistory,
  blackoutOn,
  blackoutsForUniversity,
  cohortById,
  examFeeGBP,
  examSessionById,
  examSessions,
  formatAccaDate,
  formatGBP,
  openEntryWindow,
  paperByCode,
  paperName,
  universityById,
  type EntryWindow,
  type ExamBooking,
  type ExamSession,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Tabs, Segmented } from "@/components/ui/tabs";
import { StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { toast } from "@/components/ui/toast";
import { formatRange } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { PaperCodeChip, SectionLabel, useStudentRecord } from "./bits";
import { plural, relativeDays } from "./derive";

const CENTRES = ["CBE centre · Bengaluru", "CBE centre · Pune", "CBE centre · Mumbai", "CBE centre · Kochi", "Remote invigilated CBE"];
const WINDOW_LABEL: Record<EntryWindow, string> = { early: "Early entry", standard: "Standard entry", late: "Late entry", "on-demand": "On-demand" };

type Attempt = ReturnType<typeof attemptHistory>[number];

function isOnDemand(code: PaperCode) {
  return paperByCode(code)?.examFormat === "on-demand";
}

function sessionWindow(session: ExamSession): { window: EntryWindow; closes?: string; open: boolean } {
  const w = openEntryWindow(session);
  if (w) {
    const closes = w === "early" ? session.earlyEntryCloses : w === "standard" ? session.standardEntryCloses : session.lateEntryCloses;
    return { window: w, closes, open: true };
  }
  return { window: "standard", closes: session.standardEntryCloses, open: false };
}

export function ExamsPage() {
  const s = useStudentRecord();
  return <Exams key={s.id} s={s} />;
}

function Exams({ s }: { s: Student }) {
  const [tab, setTab] = useState("bookings");
  const [bookings, setBookings] = useState<ExamBooking[]>(s.examBookings);
  const [showPast, setShowPast] = useState("upcoming");
  const [booking, setBooking] = useState(false);
  const [notify, setNotify] = useState(true);
  const [paperFilter, setPaperFilter] = useState("");
  const [resultFilter, setResultFilter] = useState("");

  const bookable = (Object.values(s.papers) as Student["papers"][PaperCode][])
    .filter((p) => ["current", "in-progress", "failed", "upcoming"].includes(p.status) && !bookings.some((b) => b.paper === p.code && b.status === "booked"))
    .map((p) => p.code);
  const defaultPaper = bookings.find((b) => b.status === "planned" && bookable.includes(b.paper))?.paper ?? bookable[0];

  const [draftPaper, setDraftPaper] = useState<PaperCode | undefined>(defaultPaper);
  const [draftSession, setDraftSession] = useState<string>("es-2026-dec");
  const [draftDate, setDraftDate] = useState<string>("");

  const uni = universityById(s.universityId);
  const blackouts = s.universityId ? blackoutsForUniversity(s.universityId).filter((b) => b.end >= ACCA_TODAY) : [];
  const dec = examSessionById("es-2026-dec")!;
  const futureSessions = examSessions.filter((x) => !x.past);
  const history = attemptHistory(s);
  const upcomingBookings = bookings.filter((b) => b.status === "booked" || b.status === "planned" || b.status === "not-booked");
  const pastBookings = bookings.filter((b) => b.status === "sat" || b.status === "cancelled");
  const nextBooked = upcomingBookings.filter((b) => b.status === "booked").sort((a, b) => a.date.localeCompare(b.date))[0];
  const paidToAcca = bookings.filter((b) => b.feeStatus === "paid").reduce((n, b) => n + b.feeGBP, 0);

  const openDrawer = (paper?: PaperCode) => {
    const p = paper ?? defaultPaper;
    setDraftPaper(p);
    const planned = bookings.find((b) => b.paper === p && b.status === "planned");
    setDraftSession(planned?.sessionId ?? "es-2026-dec");
    setDraftDate(planned && p && isOnDemand(p) ? planned.date : addDays(ACCA_TODAY, 21));
    setBooking(true);
  };

  /* Live values for the drawer. */
  const onDemand = draftPaper ? isOnDemand(draftPaper) : false;
  const session = examSessionById(draftSession);
  const sw = session ? sessionWindow(session) : undefined;
  const draftWindow: EntryWindow = onDemand ? "on-demand" : (sw?.window ?? "standard");
  const draftFee = draftPaper ? examFeeGBP(draftPaper, draftWindow) : 0;
  const draftBlackout =
    s.universityId && draftPaper
      ? onDemand
        ? draftDate
          ? blackoutOn(s.universityId, draftDate)
          : undefined
        : session
          ? blackouts.find((b) => session.examStart <= b.end && session.examEnd >= b.start)
          : undefined
      : undefined;
  const dateInPast = onDemand && draftDate !== "" && draftDate < ACCA_TODAY;

  const bookNow = (b: ExamBooking) => {
    const ses = b.sessionId ? examSessionById(b.sessionId) : undefined;
    const w = ses ? sessionWindow(ses) : undefined;
    if (ses && !w?.open) {
      toast({ title: `${ses.label} entry is not open yet`, body: `Standard entry closes ${formatAccaDate(ses.standardEntryCloses ?? ses.examStart)}. We will remind you when entry opens.`, tone: "warning" });
      return;
    }
    const window = ses ? w!.window : b.entryWindow;
    const fee = examFeeGBP(b.paper, window);
    setBookings((list) =>
      list.map((x) => (x.id === b.id ? { ...x, status: "booked", entryWindow: window, entryClosesOn: w?.closes, feeGBP: fee, feeStatus: "paid", bookedOn: ACCA_TODAY } : x)),
    );
    toast({ title: `Exam booked: ${b.paper} · ${ses ? `${ses.label} session` : formatAccaDate(b.date)}`, body: `${WINDOW_LABEL[window]} fee ${formatGBP(fee)} paid to ACCA and recorded here.` });
  };

  const bookingColumns: DataTableColumn<ExamBooking>[] = [
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      render: (b) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <PaperCodeChip code={b.paper} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{paperName(b.paper)}</span>
            <span className="block text-[12px] text-ink-3">{isOnDemand(b.paper) ? "On-demand CBE" : "Session CBE"} · {paperByCode(b.paper)?.durationLabel}</span>
          </span>
        </span>
      ),
    },
    {
      key: "date",
      header: "Exam",
      sortable: true,
      render: (b) => (
        <span>
          <span className="block font-semibold text-ink">{b.sessionId ? `${b.label} session` : formatAccaDate(b.date)}</span>
          <span className="block text-[12px] text-ink-3">
            {b.sessionId ? formatRange(examSessionById(b.sessionId)!.examStart, examSessionById(b.sessionId)!.examEnd) : "Book any available date"}
            {b.status !== "sat" ? ` · ${relativeDays(b.date)}` : ""}
          </span>
        </span>
      ),
    },
    {
      key: "window",
      header: "Entry window",
      render: (b) => (
        <span>
          <span className="block text-ink">{WINDOW_LABEL[b.entryWindow]}</span>
          {b.entryClosesOn && b.status !== "sat" ? (
            <span className={cn("block text-[12px]", b.status === "planned" ? "font-semibold text-amber" : "text-ink-3")}>
              Closes {formatAccaDate(b.entryClosesOn)} · {relativeDays(b.entryClosesOn)}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (b) => (
        <span className="flex flex-col items-start gap-1">
          <StatusPill status={b.status} size="sm" />
          {b.blackoutWarning || (s.universityId && blackoutOn(s.universityId, b.date)) ? (
            <StatusPill status="warning" tone="rose" size="sm">
              Blackout clash
            </StatusPill>
          ) : null}
        </span>
      ),
    },
    {
      key: "fee",
      header: "ACCA exam fee",
      align: "right",
      sortable: true,
      sortValue: (b) => b.feeGBP,
      render: (b) => (
        <span className="text-right">
          <span className="block font-mono font-semibold text-ink">{formatGBP(b.feeGBP)}</span>
          <span className={cn("block text-[12px]", b.feeStatus === "paid" ? "text-jade" : "text-ink-3")}>{b.feeStatus === "paid" ? "Paid to ACCA" : "Not paid"}</span>
        </span>
      ),
    },
    { key: "centre", header: "Centre", className: "text-ink-2" },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      align: "right",
      render: (b) =>
        b.status === "planned" || b.status === "not-booked" ? (
          <Button size="xs" onClick={() => bookNow(b)}>
            Book now
          </Button>
        ) : b.status === "booked" ? (
          <Button size="xs" variant="outline" onClick={() => toast({ title: "Download started: booking confirmation", body: `${b.paper} · ${b.sessionId ? `${b.label} session` : formatAccaDate(b.date)} · ${b.centre}`, tone: "info" })}>
            <Download className="size-3" />
            Confirmation
          </Button>
        ) : (
          <span className="text-[12px] text-ink-3">Sat {formatAccaDate(b.date)}</span>
        ),
    },
  ];

  const attemptRows = history.filter((a) => (!paperFilter || a.paper === paperFilter) && (!resultFilter || a.result === resultFilter));
  const attemptNumber = (a: Attempt) => {
    const same = history.filter((x) => x.paper === a.paper).sort((x, y) => x.date.localeCompare(y.date));
    return same.findIndex((x) => x.date === a.date) + 1;
  };

  const attemptColumns: DataTableColumn<Attempt>[] = [
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      render: (a) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <PaperCodeChip code={a.paper} />
          <span className="truncate font-semibold text-ink">{a.paperName}</span>
        </span>
      ),
    },
    { key: "label", header: "Exam session", sortable: true, sortValue: (a) => a.date, render: (a) => (a.sessionId ? `${a.label} session` : `On-demand · ${a.label}`) },
    { key: "date", header: "Sat on", sortable: true, render: (a) => formatAccaDate(a.date) },
    { key: "attempt", header: "Attempt", align: "right", mono: true, render: (a) => `#${attemptNumber(a)}` },
    {
      key: "score",
      header: "Score",
      sortable: true,
      sortValue: (a) => a.score ?? -1,
      render: (a) => (a.score != null ? <ScoreBar value={a.score} marker={50} className="w-32" height={6} /> : <span className="text-ink-3">Pending</span>),
    },
    { key: "result", header: "Result", sortable: true, render: (a) => <StatusPill status={a.result} size="sm" /> },
  ];

  const resultSessions = examSessions.filter((x) => ["es-2026-jun", "es-2026-sep", "es-2026-dec"].includes(x.id));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="Exams & results"
        sub="Exam bookings, attempt history and results for every ACCA paper. Exam fees are paid to ACCA and recorded here for tracking."
        actions={
          <Button onClick={() => openDrawer()} disabled={!bookable.length}>
            <CalendarCheck className="size-4" />
            Book an exam
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Next exam" value={nextBooked ? formatAccaDate(nextBooked.date) : "Not booked"} sub={nextBooked ? `${nextBooked.paper} · ${nextBooked.sessionId ? `${nextBooked.label} session` : "on-demand CBE"} · ${relativeDays(nextBooked.date)}` : undefined} />
        <KpiTile
          label="Dec 2026 standard entry closes"
          value={formatAccaDate(dec.standardEntryCloses!)}
          sub={`${relativeDays(dec.standardEntryCloses!)} · early entry closes ${formatAccaDate(dec.earlyEntryCloses!)}`}
          tone="amber"
          icon={<CalendarClock />}
        />
        <KpiTile label="Attempts" value={history.length} sub={`${history.filter((a) => a.result === "passed").length} passed · ${history.filter((a) => a.result === "failed").length} failed`} tone="info" icon={<History />} />
        <KpiTile label="Exam fees paid to ACCA" value={formatGBP(paidToAcca)} sub="Recorded for tracking" tone="jade" icon={<Trophy />} />
      </KpiRow>

      <Card className="min-w-0 overflow-hidden">
        <div className="px-5 pt-3.5">
          <Tabs
            value={tab}
            onChange={setTab}
            items={[
              { id: "bookings", label: "Exam bookings", count: upcomingBookings.length },
              { id: "attempts", label: "Attempt history", count: history.length },
              { id: "results", label: "Results", count: history.length },
            ]}
          />
        </div>

        {tab === "bookings" ? (
          <div className="space-y-5 p-5">
            <div>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <SectionLabel>Entry windows · Dec 2026 exam session</SectionLabel>
                <span className="text-[12.5px] text-ink-3">
                  Exams {formatRange(dec.examStart, dec.examEnd)} · results {formatAccaDate(dec.resultsDate)}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["early", "Early entry closes", dec.earlyEntryCloses!],
                    ["standard", "Standard entry closes", dec.standardEntryCloses!],
                    ["late", "Late entry closes", dec.lateEntryCloses!],
                  ] as const
                ).map(([id, label, date]) => {
                  const open = openEntryWindow(dec) === id;
                  return (
                    <div key={id} className={cn("min-w-0 rounded-[16px] border p-4", open ? "border-cta bg-cta-soft" : "border-line bg-surface")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-semibold text-ink-2">{label}</p>
                        {open ? (
                          <StatusPill status="Open" tone="cta" dot={false} size="sm">
                            Open now
                          </StatusPill>
                        ) : null}
                      </div>
                      <p className="mt-1 font-display text-[22px] leading-none font-bold tracking-[-0.02em] text-ink">{formatAccaDate(date)}</p>
                      <p className="mt-1.5 text-[12.5px] text-ink-3 tnum">
                        {relativeDays(date)} · Applied Skills papers {formatGBP(examFeeGBP("PM", id))}
                      </p>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-ink-3">
                Applied Knowledge papers and LW are on-demand CBEs: book any available date. Mar 2027 standard entry closes {formatAccaDate(examSessionById("es-2027-mar")!.standardEntryCloses!)}.
              </p>
            </div>

            {blackouts.length && uni ? (
              <div className="flex gap-3 rounded-[14px] border border-amber/30 bg-amber-soft p-4">
                <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-amber" />
                <div className="min-w-0 text-[13px] text-ink-2">
                  <p className="font-semibold text-ink">
                    {uni.shortName} examination blackout: {formatRange(blackouts[0].start, blackouts[0].end)}
                  </p>
                  <p className="mt-0.5">
                    Avoid booking ACCA exams in university examination periods. Session exams in {dec.label} ({formatRange(dec.examStart, dec.examEnd)}) fall inside it, so book on-demand papers before{" "}
                    {formatAccaDate(addDays(blackouts[0].start, -3))} or after {formatAccaDate(blackouts[0].end)}.
                  </p>
                </div>
              </div>
            ) : null}

            <DataTable
              bare
              caption="Exam bookings"
              rows={showPast === "upcoming" ? upcomingBookings : pastBookings}
              columns={bookingColumns}
              getRowId={(b) => b.id}
              initialSort={{ key: "date", dir: showPast === "upcoming" ? "asc" : "desc" }}
              filters={
                <Segmented
                  size="sm"
                  value={showPast}
                  onChange={setShowPast}
                  items={[
                    { id: "upcoming", label: `Booked and planned (${upcomingBookings.length})` },
                    { id: "past", label: `Sat (${pastBookings.length})` },
                  ]}
                />
              }
              toolbar={
                <Button size="sm" variant="secondary" onClick={() => openDrawer()} disabled={!bookable.length}>
                  <CalendarCheck className="size-4" />
                  Book an exam
                </Button>
              }
              empty={<EmptyState title="No bookings here" sub="Use Book an exam to add one." />}
            />
          </div>
        ) : null}

        {tab === "attempts" ? (
          <div className="space-y-4 p-5">
            <DataTable
              bare
              caption="Attempt history"
              rows={attemptRows}
              columns={attemptColumns}
              getRowId={(a) => `${a.paper}-${a.date}`}
              initialSort={{ key: "date", dir: "desc" }}
              filters={
                <FilterBar
                  active={Boolean(paperFilter || resultFilter)}
                  onClear={() => {
                    setPaperFilter("");
                    setResultFilter("");
                  }}
                >
                  <FilterSelect label="Paper" value={paperFilter} onChange={setPaperFilter} allLabel="All papers" options={[...new Set(history.map((a) => a.paper))].map((c) => ({ value: c, label: `${c} · ${paperName(c)}` }))} />
                  <FilterSelect
                    label="Result"
                    value={resultFilter}
                    onChange={setResultFilter}
                    allLabel="Any"
                    options={[
                      { value: "passed", label: "Passed" },
                      { value: "failed", label: "Failed" },
                      { value: "pending", label: "Pending" },
                    ]}
                  />
                </FilterBar>
              }
              empty={<EmptyState title="No attempts yet" sub="Your first exam attempt appears here once you sit it." />}
            />
            {s.exemptions.length ? (
              <p className="flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-3">
                No attempt needed for exempt papers:
                {s.exemptions.map((e) => (
                  <StatusPill key={e.paper} status={e.state} size="sm">
                    {e.paper} {e.state === "approved" ? "exempt" : e.state}
                  </StatusPill>
                ))}
              </p>
            ) : null}
            <p className="text-[12px] text-ink-3">Pass mark is 50% for every ACCA exam. Attempts are recorded by the programme team when results are released.</p>
          </div>
        ) : null}

        {tab === "results" ? (
          <div className="space-y-5 p-5">
            <div className="grid gap-3 md:grid-cols-3">
              {resultSessions.map((x) => {
                const mine = history.filter((a) => a.sessionId === x.id);
                return (
                  <div key={x.id} className={cn("min-w-0 rounded-[16px] border p-4", x.status === "results-pending" ? "border-amber/40 bg-amber-soft" : "border-line bg-surface")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-[17px] font-bold tracking-[-0.02em] text-ink">{x.label} session</p>
                      <StatusPill status={x.status} size="sm" />
                    </div>
                    <p className="mt-1.5 text-[13px] font-semibold text-ink">
                      {x.status === "results-pending"
                        ? `Results due ${formatAccaDate(x.resultsDate)}`
                        : x.status === "results-released"
                          ? x.statusLabel
                          : `Results ${formatAccaDate(x.resultsDate)}`}
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {mine.length
                        ? `Your papers: ${mine.map((a) => `${a.paper} ${a.score ?? ""}%`).join(", ")}`
                        : x.past
                          ? "You did not sit papers in this session"
                          : `Your papers: ${bookings.filter((b) => b.sessionId === x.id).map((b) => `${b.paper} (${b.status})`).join(", ") || "none booked"}`}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="rounded-[14px] border border-line p-4">
              <Switch
                checked={notify}
                onChange={(v) => {
                  setNotify(v);
                  toast({ title: v ? "Results alert on" : "Results alert off", body: v ? "We will notify you in the app, by email and on WhatsApp on 12 Oct 2026." : "You can still check this page on results day.", tone: "info" });
                }}
                label="Notify me when Sep 2026 results are released"
                sub="Results due 12 Oct 2026. They are recorded here within 48 hours of release."
              />
            </div>

            <div>
              <SectionLabel className="mb-3">Latest results</SectionLabel>
              {history.length ? (
                <ul className="grid gap-3 md:grid-cols-2">
                  {history.map((a) => {
                    const x = a.sessionId ? examSessionById(a.sessionId) : undefined;
                    const p = s.papers[a.paper];
                    const recoveryCohort = s.cohortIds.map((id) => cohortById(id)).find((c) => c && c.papers.includes(a.paper) && (c.type === "revision" || c.type === "reattempt"));
                    return (
                      <li key={`${a.paper}-${a.date}`} className="flex min-w-0 gap-4 rounded-[16px] border border-line p-4">
                        <div className={cn("grid size-16 shrink-0 place-items-center rounded-[14px] font-display text-[22px] font-bold tnum", a.result === "passed" ? "bg-jade-soft text-jade" : a.result === "failed" ? "bg-rose-soft text-rose" : "bg-surface-2 text-ink-2")}>
                          {a.score != null ? `${a.score}%` : "·"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <PaperCodeChip code={a.paper} />
                            <span className="truncate text-[14px] font-semibold text-ink">{a.paperName}</span>
                            <StatusPill status={a.result} size="sm" />
                          </div>
                          <p className="mt-1 text-[12.5px] text-ink-3">
                            {x ? `${x.label} session · released ${formatAccaDate(x.resultsDate)}` : `On-demand CBE · sat ${formatAccaDate(a.date)} · provisional result on the day`}
                          </p>
                          <p className="mt-1.5 text-[13px] text-ink-2">
                            {a.result === "passed"
                              ? `Passed with ${a.score}% against the 50% pass mark. Credit recorded on your ACCA journey.`
                              : a.result === "failed"
                                ? `${50 - (a.score ?? 0)} marks short of the pass mark. ${p.plannedLabel ? `Reattempt planned for ${p.plannedLabel}` : "Plan a reattempt"}${recoveryCohort ? ` in ${recoveryCohort.name}` : ""}.`
                                : "Result pending."}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Button size="xs" variant="outline" onClick={() => toast({ title: `Report queued: result-statement-${a.paper.toLowerCase()}-${a.label.toLowerCase().replace(/\s+/g, "-")}.pdf`, tone: "info" })}>
                              <Download className="size-3" />
                              Result statement
                            </Button>
                            {a.result === "failed" && p.status === "failed" ? (
                              <LinkButton size="xs" href={s.type === "graduate" ? "/batches" : "/my-mentor"}>
                                {s.type === "graduate" ? "Reattempt cohorts" : "Talk to your mentor"}
                              </LinkButton>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <EmptyState title="No results yet" sub="Results appear here once you have sat your first exam." />
              )}
            </div>
          </div>
        ) : null}
      </Card>

      <FormDrawer
        open={booking}
        onClose={() => setBooking(false)}
        title="Book an exam"
        sub="Choose the paper, then the exam session or an on-demand date and centre. Exam fees are paid to ACCA."
        submitLabel={onDemand || sw?.open ? `Book and pay ${formatGBP(draftFee)}` : "Save as planned"}
        disabled={!draftPaper || dateInPast || (onDemand && !draftDate)}
        disabledReason={dateInPast ? "Pick a date from today onwards" : "Choose a paper and date"}
        footerNote="Booking confirmation arrives by email from ACCA."
        onSubmit={(data) => {
          if (!draftPaper) return;
          const centre = String(data.get("centre") ?? CENTRES[0]);
          const confirmed = onDemand || Boolean(sw?.open);
          const next: ExamBooking = {
            id: `eb-${s.id}-${draftPaper.toLowerCase()}-${onDemand ? draftDate : draftSession}`,
            paper: draftPaper,
            sessionId: onDemand ? undefined : (draftSession as ExamBooking["sessionId"]),
            date: onDemand ? draftDate : (session?.examStart ?? draftDate),
            label: onDemand ? formatAccaDate(draftDate) : (session?.label ?? ""),
            entryWindow: draftWindow,
            entryClosesOn: onDemand ? undefined : sw?.closes,
            status: confirmed ? "booked" : "planned",
            bookedOn: confirmed ? ACCA_TODAY : undefined,
            feeGBP: draftFee,
            feeStatus: confirmed ? "paid" : "unpaid",
            centre,
            blackoutWarning: draftBlackout ? `Inside ${draftBlackout.label}` : undefined,
          };
          setBookings((list) => {
            const i = list.findIndex((b) => b.paper === draftPaper && (b.status === "planned" || b.status === "not-booked"));
            return i >= 0 ? list.map((b, j) => (j === i ? { ...next, id: b.id } : b)) : [...list, next];
          });
          setShowPast("upcoming");
          setTab("bookings");
          setBooking(false);
          toast({
            title: confirmed ? `Exam booked: ${draftPaper} ${onDemand ? `on ${formatAccaDate(draftDate)}` : `· ${session?.label} session`}` : `${draftPaper} saved as planned for ${session?.label}`,
            body: confirmed ? `${WINDOW_LABEL[draftWindow]} fee ${formatGBP(draftFee)} paid to ACCA and recorded · ${centre}` : "Entry for this session is not open yet. We will remind you.",
            tone: draftBlackout ? "warning" : "success",
          });
        }}
      >
        <Field label="Paper">
          <Select
            name="paper"
            value={draftPaper ?? ""}
            onChange={(e) => {
              const p = e.target.value as PaperCode;
              setDraftPaper(p);
              const planned = bookings.find((b) => b.paper === p && b.status === "planned");
              if (planned?.sessionId) setDraftSession(planned.sessionId);
              if (isOnDemand(p)) setDraftDate(planned?.date ?? addDays(ACCA_TODAY, 21));
            }}
          >
            {bookable.map((c) => (
              <option key={c} value={c}>
                {c} · {paperName(c)} · {isOnDemand(c) ? "on-demand CBE" : "session CBE"}
              </option>
            ))}
          </Select>
        </Field>

        {onDemand ? (
          <Field label="Exam date" hint="On-demand: any available date">
            <Input type="date" name="date" value={draftDate} min={ACCA_TODAY} onChange={(e) => setDraftDate(e.target.value)} />
          </Field>
        ) : (
          <Field label="Exam session">
            <Select name="session" value={draftSession} onChange={(e) => setDraftSession(e.target.value)}>
              {futureSessions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label} · exams {formatRange(x.examStart, x.examEnd)} · {x.statusLabel}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="Exam centre">
          <Select name="centre" defaultValue={s.type === "undergraduate" ? CENTRES[1] : CENTRES[0]}>
            {CENTRES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>

        {draftPaper ? (
          <div className="rounded-[14px] border border-line bg-surface-2 p-4 text-[13px]">
            <dl className="space-y-1.5">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Entry window</dt>
                <dd className="font-semibold text-ink">
                  {onDemand ? "On-demand" : sw?.open ? `${WINDOW_LABEL[draftWindow]} · closes ${formatAccaDate(sw.closes!)}` : `Not open yet · standard entry closes ${sw?.closes ? formatAccaDate(sw.closes) : "later"}`}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">ACCA exam fee</dt>
                <dd className="font-mono font-semibold text-ink">{formatGBP(draftFee)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-3">Duration</dt>
                <dd className="font-semibold text-ink">{paperByCode(draftPaper)?.durationLabel} · pass mark 50%</dd>
              </div>
            </dl>
            <p className="mt-2 text-[12px] text-ink-3">The fee is paid to ACCA and recorded here for tracking.</p>
          </div>
        ) : null}

        {draftBlackout ? (
          <div role="alert" className="flex gap-3 rounded-[14px] border border-rose/30 bg-rose-soft p-4">
            <AlertTriangle className="mt-0.5 size-4.5 shrink-0 text-rose" />
            <div className="text-[13px] text-ink-2">
              <p className="font-semibold text-ink">Clashes with {uni?.shortName} university examinations</p>
              <p className="mt-0.5">
                {onDemand ? formatAccaDate(draftDate) : `${session?.label} exams`} fall inside {draftBlackout.label.toLowerCase()} ({formatRange(draftBlackout.start, draftBlackout.end)}). Pick a date before {formatAccaDate(addDays(draftBlackout.start, -3))} or after {formatAccaDate(draftBlackout.end)}.
              </p>
            </div>
          </div>
        ) : null}
        {dateInPast ? <p className="text-[12.5px] font-semibold text-rose">Pick a date from today onwards.</p> : null}
        <p className="text-[12px] text-ink-3">
          {plural(bookings.filter((b) => b.status === "booked").length, "exam")} already booked
          {onDemand ? ". On-demand results are provisional on the day and confirmed within 72 hours." : "."}
        </p>
      </FormDrawer>
    </div>
  );
}
