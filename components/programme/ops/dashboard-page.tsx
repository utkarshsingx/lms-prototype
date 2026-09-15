"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  FileCheck2,
  IndianRupee,
  Layers,
  LifeBuoy,
  MapPin,
  Megaphone,
  MessageCircleQuestion,
  UserPlus,
  UsersRound,
  Video,
} from "lucide-react";
import {
  ACCA_TODAY,
  cohortById,
  daysBetween,
  doubtSessions,
  examSessionById,
  formatAccaDate,
  formatINR,
  formatShortDate,
  formatTime,
  groupIndian,
  paperName,
  programmeCalendarEvents,
  sectionById,
  staffName,
  students as allStudents,
  studentName,
  tickets,
  todaysClasses,
  TOTAL_LEARNERS,
  cohorts as allCohorts,
  blackoutRanges,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { HeroBand } from "@/components/ui/hero-band";
import { LinkButton } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status";
import { Avatar } from "@/components/ui/avatar";
import { AgendaList } from "@/components/ui/calendar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { GatedButton, hoursBetween, OPS_NOW, plural } from "./shared";

const DEC = examSessionById("es-2026-dec")!;
const SEP = examSessionById("es-2026-sep")!;

/* ------------------------------------------------------------------ queue data (static, derived once) */

const exemptionEstimates = allStudents.flatMap((s) =>
  s.exemptions.filter((e) => e.state === "estimated").map((e) => ({ student: s, record: e })),
);

type DocRow = { id: string; studentId: string; name: string; doc: string; papers: string[] };
const pendingDocs: DocRow[] = (() => {
  const map = new Map<string, DocRow>();
  for (const { student, record } of exemptionEstimates) {
    for (const d of record.documents) {
      if (d.status === "verified") continue;
      const key = `${student.id}-${d.name}`;
      const row = map.get(key) ?? { id: key, studentId: student.id, name: student.name, doc: d.name, papers: [] };
      row.papers.push(record.paper);
      map.set(key, row);
    }
  }
  return [...map.values()];
})();
const readyToSubmit = (() => {
  const byStudent = new Map<string, { name: string; papers: string[] }>();
  for (const { student, record } of exemptionEstimates) {
    if (record.documents.some((d) => d.status !== "verified")) continue;
    const row = byStudent.get(student.id) ?? { name: student.name, papers: [] };
    row.papers.push(record.paper);
    byStudent.set(student.id, row);
  }
  return [...byStudent.entries()].map(([id, v]) => ({ id, ...v }));
})();

const missingBookings = allStudents.flatMap((s) =>
  s.examBookings
    .filter((b) => b.sessionId === DEC.id && (b.status === "not-booked" || b.status === "planned"))
    .map((b) => ({ id: b.id, studentId: s.id, name: s.name, paper: b.paper, status: b.status })),
);

const pendingResults = allStudents.flatMap((s) =>
  Object.values(s.papers).flatMap((p) =>
    p.attempts
      .filter((a) => a.sessionId === SEP.id && a.result === "pending")
      .map((a) => ({ id: `${s.id}-${p.code}`, name: s.name, paper: p.code, date: a.date })),
  ),
);

const openTickets = tickets.filter((t) => t.status !== "resolved");
// Waiting on the student pauses the SLA clock.
const breaching = openTickets
  .filter((t) => t.status !== "waiting-on-student")
  .map((t) => ({ ticket: t, over: hoursBetween(t.created, OPS_NOW) - t.slaHours }))
  .filter((x) => x.over > 0)
  .sort((a, b) => b.over - a.over);

const overdueFees = allStudents
  .filter((s) => s.fees.status === "overdue")
  .map((s) => ({
    id: s.id,
    name: s.name,
    amount: s.fees.due,
    since: s.fees.nextDueDate ?? ACCA_TODAY,
  }))
  .sort((a, b) => a.since.localeCompare(b.since));

const runningCohorts = allCohorts.filter((c) => c.status === "running");

function formatOverdue(hours: number) {
  if (hours < 24) return `${hours}h past SLA`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return h ? `${d}d ${h}h past SLA` : `${d}d past SLA`;
}

/* ------------------------------------------------------------------ pieces */

function QueueCard({
  icon,
  title,
  count,
  sub,
  href,
  hrefLabel,
  tone = "neutral",
  children,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  count: React.ReactNode;
  sub: React.ReactNode;
  href: string;
  hrefLabel: string;
  tone?: "neutral" | "amber" | "rose" | "info" | "jade";
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  const chip = {
    neutral: "bg-surface-2 text-ink-2",
    amber: "bg-amber-soft text-amber",
    rose: "bg-rose-soft text-rose",
    info: "bg-info-soft text-info",
    jade: "bg-jade-soft text-jade",
  }[tone];
  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex items-start gap-3 px-5 pt-4.5">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-[10px] [&>svg]:size-[18px]", chip)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[14.5px] leading-snug font-bold text-ink">{title}</h3>
          <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{sub}</p>
        </div>
        <span className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{count}</span>
      </div>
      <ul className="mt-3 flex-1 divide-y divide-line border-t border-line">{children}</ul>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4 hover:decoration-cta-strong"
        >
          {hrefLabel}
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
        {action}
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

/* ------------------------------------------------------------------ page */

export function ProgrammeDashboard() {
  const { persona, can } = useRole();
  const firstName = persona.name.replace(/^(Dr|Prof\.)\s+/, "").split(" ")[0];
  const canAcca = can("programme:acca");
  const canSupport = can("programme:support");
  const canFinance = can("finance:view");
  const canRecord = can("finance:record");
  const canOps = can("programme:ops");
  const [reminded, setReminded] = useState<string[]>([]);

  const [remindedBookings, setRemindedBookings] = useState<string[]>([]);
  const [requestedDocs, setRequestedDocs] = useState<string[]>([]);
  const [nudged, setNudged] = useState<string[]>([]);
  const [feeReminded, setFeeReminded] = useState<string[]>([]);

  const daysToEarly = daysBetween(ACCA_TODAY, DEC.earlyEntryCloses!);
  const daysToStandard = daysBetween(ACCA_TODAY, DEC.standardEntryCloses!);
  const daysToResults = daysBetween(ACCA_TODAY, SEP.resultsDate);

  const todayRows = useMemo(() => {
    const classes = todaysClasses.map((c) => {
      const cohort = cohortById(c.cohortId);
      const section = sectionById(c.sectionId);
      return {
        id: c.id,
        time: formatTime(c.start),
        kind: "Live class" as const,
        paper: c.paper,
        title: c.title,
        where: `${cohort?.name ?? ""}${section && (cohort?.sections.length ?? 0) > 1 ? ` · ${section.name}` : ""}`,
        faculty: staffName(c.facultyId),
        place: c.delivery === "on-campus" && c.room ? c.room : "Online live",
        mins: c.durationMins,
      };
    });
    const doubts = doubtSessions
      .filter((d) => d.start.startsWith(ACCA_TODAY))
      .map((d) => ({
        id: d.id,
        time: formatTime(d.start),
        kind: "Doubt-clearing" as const,
        paper: d.paper,
        title: `${d.title} · ${plural(d.questionsQueued, "question")} queued`,
        where: cohortById(d.cohortId)?.name ?? "",
        faculty: staffName(d.facultyId),
        place: "Online live",
        mins: d.durationMins,
      }));
    return [...classes, ...doubts].sort((a, b) => a.time.localeCompare(b.time));
  }, []);

  const upcomingEvents = useMemo(
    () =>
      programmeCalendarEvents
        .filter((e) => e.date >= ACCA_TODAY && e.kind !== "blackout")
        .map((e) => ({ id: e.id, date: e.date, title: e.title, tone: e.tone, kind: KIND_LABEL[e.kind] ?? "Event" })),
    [],
  );

  const accaReason = "Needs the ACCA operations permission.";

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <HeroBand
        eyebrow="Programme operations · Monday 14 September 2026"
        title={`Good morning, ${firstName}`}
        sub={`${plural(todayRows.length, "session")} on the timetable today, ${plural(pendingDocs.length, "exemption document")} to evaluate, and Dec 2026 early entry closes in ${daysToEarly} days.`}
        stats={[
          { label: "Active students", value: groupIndian(TOTAL_LEARNERS), hint: "6 programmes · 3 universities" },
          { label: "Cohorts running", value: runningCohorts.length, hint: `${allCohorts.length - runningCohorts.length} enrolling or onboarding` },
          { label: "Classes today", value: todaysClasses.length, hint: `First at ${formatTime(todaysClasses[0].start)}` },
          { label: "Open tickets", value: openTickets.length, hint: `${breaching.length} past SLA` },
        ]}
        actions={
          <>
            <LinkButton href="/programme/calendar">
              <CalendarPlus className="size-4" />
              Schedule live class
            </LinkButton>
            <LinkButton href="/programme/students" variant="inverse">
              <UsersRound className="size-4" />
              Allocate students
            </LinkButton>
          </>
        }
        aside={
          <div className="w-full rounded-[16px] border border-ink-inv/15 bg-ink-inv/5 p-4 lg:w-64">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">Next ACCA deadline</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-inv">Dec 2026 early entry closes</p>
            <p className="mt-1 font-display text-[28px] leading-none font-bold text-cta">{formatShortDate(DEC.earlyEntryCloses!)}</p>
            <p className="mt-1.5 text-[12.5px] text-ink-inv/65">
              {daysToEarly} days away · standard entry closes {formatShortDate(DEC.standardEntryCloses!)}
            </p>
          </div>
        }
      />

      <section aria-labelledby="queues">
        <SectionTitle>
          <span id="queues">Work queues</span>
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <QueueCard
            icon={<FileCheck2 />}
            tone="amber"
            title="Exemption documents to evaluate"
            count={exemptionEstimates.length}
            sub={`${plural(exemptionEstimates.length, "estimated exemption")} awaiting ACCA · ${plural(pendingDocs.length, "document")} still to evaluate`}
            href="/programme/acca/exemptions"
            hrefLabel="Open exemption queue"
          >
            {pendingDocs.map((d) => (
              <QueueRow
                key={d.id}
                primary={d.name}
                secondary={`${d.doc} · ${d.papers.join(", ")}`}
                end={
                  requestedDocs.includes(d.id) ? (
                    <StatusPill status="Requested" tone="info" size="sm" />
                  ) : (
                    <GatedButton
                      allowed={canAcca}
                      reason={accaReason}
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setRequestedDocs((l) => [...l, d.id]);
                        toast({ title: `Document requested from ${d.name}`, body: `${d.doc} for ${d.papers.join(", ")} exemption evaluation` });
                      }}
                    >
                      Request
                    </GatedButton>
                  )
                }
              />
            ))}
            {readyToSubmit.map((r) => (
              <QueueRow
                key={r.id}
                primary={r.name}
                secondary={`Documents verified · ${r.papers.join(", ")} ready to submit to ACCA`}
                end={<StatusPill status="Estimated" size="sm" />}
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<CalendarClock />}
            tone="rose"
            title="Exam bookings missing"
            count={missingBookings.length}
            sub={`Dec 2026 standard entry closes ${formatAccaDate(DEC.standardEntryCloses!)} · ${daysToStandard} days left`}
            href="/programme/acca/exams"
            hrefLabel="Track examination bookings"
            action={
              <GatedButton
                allowed={canAcca}
                reason={accaReason}
                size="xs"
                disabled={remindedBookings.length === missingBookings.length}
                onClick={() => {
                  setRemindedBookings(missingBookings.map((b) => b.id));
                  toast({
                    title: `Booking reminder sent to ${plural(missingBookings.length, "learner")}`,
                    body: `Dec 2026 early entry closes ${formatAccaDate(DEC.earlyEntryCloses!)}, standard entry ${formatAccaDate(DEC.standardEntryCloses!)}.`,
                  });
                }}
              >
                <BellRing className="size-3.5" />
                Remind all
              </GatedButton>
            }
          >
            {missingBookings.map((b) => (
              <QueueRow
                key={b.id}
                primary={b.name}
                secondary={`${b.paper} · ${paperName(b.paper)}`}
                end={
                  remindedBookings.includes(b.id) ? (
                    <StatusPill status="Reminder sent" tone="jade" size="sm" />
                  ) : (
                    <StatusPill status={b.status === "planned" ? "Planned, not booked" : "Not booked"} tone={b.status === "planned" ? "amber" : "rose"} size="sm" />
                  )
                }
              />
            ))}
          </QueueCard>

          <QueueCard
            icon={<ClipboardCheck />}
            tone="info"
            title="Results to record"
            count={pendingResults.length}
            sub={`Sep 2026 session · results due ${formatAccaDate(SEP.resultsDate)}, in ${daysToResults} days`}
            href="/programme/acca/exams"
            hrefLabel="Upload or record results"
          >
            {pendingResults.map((r) => (
              <QueueRow
                key={r.id}
                primary={r.name}
                secondary={`${r.paper} · sat ${formatShortDate(r.date)}`}
                end={<StatusPill status="Results pending" size="sm" />}
              />
            ))}
            <li className="px-5 py-2.5 text-[12px] text-ink-3">Record each result within 48 hours of release on 12 Oct.</li>
          </QueueCard>

          <QueueCard
            icon={<LifeBuoy />}
            tone="rose"
            title="Tickets breaching SLA"
            count={breaching.length}
            sub={`${plural(openTickets.length, "open ticket")} · waiting-on-student tickets pause the clock`}
            href="/programme/support"
            hrefLabel="Open support tickets"
          >
            {breaching.slice(0, 5).map(({ ticket, over }) => (
              <QueueRow
                key={ticket.id}
                primary={
                  <>
                    <span className="font-mono text-[12px] text-ink-3">{ticket.id}</span> {ticket.subject}
                  </>
                }
                secondary={`${studentName(ticket.studentId)} · ${ticket.category} · ${staffName(ticket.assigneeId)} · ${formatOverdue(over)}`}
                end={
                  nudged.includes(ticket.id) ? (
                    <StatusPill status="Nudged" tone="jade" size="sm" />
                  ) : (
                    <GatedButton
                      allowed={canSupport}
                      reason="Needs the Student support permission."
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setNudged((l) => [...l, ticket.id]);
                        toast({
                          title: ticket.assigneeId ? `Nudge sent to ${staffName(ticket.assigneeId)}` : "Nudge sent to the support queue",
                          body: `${ticket.id} · ${formatOverdue(over)}`,
                          tone: "warning",
                        });
                      }}
                    >
                      Nudge
                    </GatedButton>
                  )
                }
              />
            ))}
            {breaching.length > 5 ? (
              <li className="px-5 py-2.5 text-[12px] text-ink-3">{plural(breaching.length - 5, "more ticket")} past SLA in the support queue.</li>
            ) : null}
          </QueueCard>

          {canFinance ? (
            <QueueCard
              icon={<IndianRupee />}
              tone="amber"
              title="Payments overdue"
              count={overdueFees.length}
              sub={`${formatINR(overdueFees.reduce((s, f) => s + f.amount, 0))} overdue from enrolled students`}
              href="/programme/finance"
              hrefLabel="Open fees and payments"
              action={
                <GatedButton
                  allowed={canRecord}
                  reason="Needs the Record finance permission."
                  size="xs"
                  disabled={feeReminded.length === overdueFees.length}
                  onClick={() => {
                    setFeeReminded(overdueFees.map((f) => f.id));
                    toast({ title: `Payment reminder sent to ${plural(overdueFees.length, "student")}`, body: "Template: Instalment overdue · WhatsApp and email" });
                  }}
                >
                  <BellRing className="size-3.5" />
                  Send reminders
                </GatedButton>
              }
            >
              {overdueFees.map((f) => (
                <QueueRow
                  key={f.id}
                  primary={f.name}
                  secondary={`Due ${formatAccaDate(f.since)} · ${daysBetween(f.since, ACCA_TODAY)} days overdue`}
                  end={
                    feeReminded.includes(f.id) ? (
                      <StatusPill status="Reminder sent" tone="jade" size="sm" />
                    ) : (
                      <span className="font-mono text-[12.5px] font-semibold text-rose tnum">{formatINR(f.amount)}</span>
                    )
                  }
                />
              ))}
            </QueueCard>
          ) : null}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Today's classes"
            sub={`Monday 14 September · ${plural(todaysClasses.length, "live class", "live classes")} and ${plural(todayRows.length - todaysClasses.length, "doubt-clearing session")}`}
            action={
              <LinkButton href="/programme/calendar" size="sm" variant="outline">
                <CalendarDays className="size-4" />
                Calendar
              </LinkButton>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {todayRows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5">
                <div className="w-14 shrink-0">
                  <p className="font-mono text-[15px] font-semibold text-ink tnum">{r.time}</p>
                  <p className="text-[11.5px] text-ink-3">{r.mins} min</p>
                </div>
                <div className="min-w-0 flex-1 basis-56">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface-inv px-1.5 py-px font-mono text-[11px] font-bold text-ink-inv">{r.paper}</span>
                    <StatusPill status={r.kind} tone={r.kind === "Live class" ? "info" : "violet"} size="sm" />
                  </div>
                  <p className="mt-1 truncate text-[13.5px] font-semibold text-ink">{r.title}</p>
                  <p className="truncate text-[12px] text-ink-3">{r.where}</p>
                </div>
                <div className="flex min-w-0 items-center gap-2 sm:w-52">
                  <Avatar name={r.faculty} size="xs" />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-ink-2">{r.faculty}</p>
                    <p className="flex items-center gap-1 truncate text-[11.5px] text-ink-3">
                      {r.place === "Online live" ? <Video aria-hidden className="size-3 shrink-0" /> : <MapPin aria-hidden className="size-3 shrink-0" />}
                      <span className="truncate">{r.place}</span>
                    </p>
                  </div>
                </div>
                {reminded.includes(r.id) ? (
                  <StatusPill status="Reminder sent" tone="jade" size="sm" />
                ) : (
                  <GatedButton
                    allowed={canOps}
                    reason="Needs the Programme operations permission."
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setReminded((l) => [...l, r.id]);
                      toast({ title: `Class reminder sent · ${r.paper} ${r.time}`, body: `${r.where} · template Class reminder`, tone: "info" });
                    }}
                  >
                    <BellRing className="size-3.5" />
                    Remind cohort
                  </GatedButton>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Coming up" sub="Entry deadlines, mocks, results and cohort starts" />
          <div className="px-5 pb-5">
            <AgendaList
              events={upcomingEvents}
              blackout={blackoutRanges()}
              from={ACCA_TODAY}
              to="2026-11-30"
              limit={8}
              onSelect={(e) => toast({ title: e.title, body: formatAccaDate(e.date), tone: "info" })}
            />
          </div>
        </Card>
      </div>

      <section aria-labelledby="quick">
        <SectionTitle>
          <span id="quick">Quick actions</span>
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {QUICK.map((q) => (
            <Link
              key={q.href + q.label}
              href={q.href}
              className="group flex min-w-0 flex-col gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-ink"
            >
              <span className="grid size-9 place-items-center rounded-[10px] bg-surface-inv text-cta [&>svg]:size-[18px]">
                <q.icon aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-[13.5px] leading-snug font-bold text-ink">{q.label}</span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{q.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

const QUICK = [
  { href: "/programme/students", label: "Allocate students", sub: "To cohorts, universities and semesters", icon: UserPlus },
  { href: "/programme/cohorts", label: "Create a cohort", sub: "ACCA or university-linked", icon: Layers },
  { href: "/programme/calendar", label: "Schedule live class", sub: "With blackout clash check", icon: CalendarPlus },
  { href: "/programme/staffing", label: "Assign faculty", sub: "And mentors", icon: UsersRound },
  { href: "/programme/announcements", label: "Post announcement", sub: "In-app, email, WhatsApp", icon: Megaphone },
  { href: "/programme/support", label: "Support queue", sub: "Registration and exemption queries", icon: MessageCircleQuestion },
];

const KIND_LABEL: Record<string, string> = {
  "acca-exam": "ACCA exams",
  "entry-deadline": "Entry deadline",
  results: "Results",
  mock: "Mock exam",
  class: "Cohort start",
  orientation: "Orientation",
  subscription: "Subscription",
  payment: "Payment due",
};

