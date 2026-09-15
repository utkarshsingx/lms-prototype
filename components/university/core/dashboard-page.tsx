"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Award,
  Briefcase,
  CalendarOff,
  CalendarRange,
  Download,
  LifeBuoy,
  MapPin,
  Megaphone,
  UserCheck,
} from "lucide-react";
import {
  ACCA_TODAY,
  announcementsForUniversity,
  blackoutsForUniversity,
  cohortsForUniversity,
  daysBetween,
  examPeriods,
  formatAccaDate,
  formatShortDate,
  formatTime,
  paperName,
  staffName,
  ticketsForUniversity,
} from "@/lib/data/acca";
import { HeroBand } from "@/components/ui/hero-band";
import { LinkButton, Button } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { Avatar, AvatarStack } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ViewOnlyChip } from "@/components/ui/page-toolbar";
import { formatCalendarDate, formatRange } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import {
  attendanceOf,
  average,
  intakeShort,
  RISK_ORDER,
  sectionsForUniversity,
  universityClasses,
  universityStudents,
} from "./data";
import { MiniLabel, plural, queueReport, TextLink, UniversityMark, useUniversityWorkspace } from "./shared";

export function UniversityDashboard() {
  const { uni, firstName, canEdit, reason } = useUniversityWorkspace();
  const h = uni.headline;

  const roster = useMemo(() => universityStudents(uni.id), [uni.id]);
  const cohorts = useMemo(() => cohortsForUniversity(uni.id), [uni.id]);
  const classes = useMemo(() => universityClasses(uni.id), [uni.id]);
  const sections = useMemo(() => sectionsForUniversity(uni.id), [uni.id]);

  const nextExam = examPeriods
    .filter((p) => p.universityId === uni.id && p.end >= ACCA_TODAY)
    .sort((a, b) => a.start.localeCompare(b.start))[0];
  const daysToExam = nextExam ? daysBetween(ACCA_TODAY, nextExam.start) : null;
  const registeredCount = Math.round((h.students * h.registeredPct) / 100);
  const openTickets = ticketsForUniversity(uni.id).filter((t) => t.status !== "resolved").length;

  const atRisk = roster
    .filter((s) => s.risk.level !== "low")
    .sort((a, b) => RISK_ORDER[a.risk.level] - RISK_ORDER[b.risk.level] || a.readiness.overall - b.readiness.overall)
    .slice(0, 4);

  const upcoming = classes.filter((c) => c.status === "today" || c.status === "upcoming").slice(0, 6);
  const cancelled = classes.filter((c) => c.status === "cancelled");
  const cancelledWeek = cancelled.length
    ? formatRange(cancelled[0].start.slice(0, 10), cancelled[cancelled.length - 1].start.slice(0, 10))
    : null;
  const blackout = blackoutsForUniversity(uni.id).find((b) => b.end >= ACCA_TODAY);

  const latest = announcementsForUniversity(uni.id)
    .filter((a) => a.status !== "draft")
    .sort((a, b) => b.publishedOn.localeCompare(a.publishedOn))
    .slice(0, 3);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <HeroBand
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <UniversityMark uni={uni} size="xs" />
            {uni.name} · University-specific dashboard
          </span>
        }
        title={`Good morning, ${firstName}`}
        sub={`${uni.programmeName} · ${h.students} students across ${plural(h.intakes, "intake")} and ${h.sections} sections.${
          nextExam && daysToExam != null
            ? ` ACCA classes pause for university examinations from ${formatShortDate(nextExam.start)}, ${daysToExam} days away.`
            : ""
        }`}
        stats={[
          { label: "Students", value: h.students, hint: `${plural(h.intakes, "intake")} · ${h.sections} sections` },
          { label: "ACCA registered", value: `${h.registeredPct}%`, hint: `${registeredCount} of ${h.students} students` },
          { label: "Average readiness", value: h.avgReadiness, hint: "Target 70 before exam entry" },
          { label: "At-risk students", value: h.atRisk, hint: `${Math.round((h.atRisk / h.students) * 100)}% of students` },
        ]}
        actions={
          <>
            <LinkButton href="/university/performance?tab=at-risk">
              <AlertTriangle className="size-4" />
              View at-risk students
            </LinkButton>
            <Button
              variant="inverse"
              onClick={() =>
                queueReport(`${uni.workspace.slug}-executive-summary-sep-2026.pdf`, "Executive summary · September 2026")
              }
            >
              <Download className="size-4" />
              Executive report
            </Button>
            {canEdit ? null : <ViewOnlyChip reason={reason} />}
          </>
        }
        aside={
          <div className="w-full rounded-[16px] border border-ink-inv/15 bg-ink-inv/5 p-4 lg:w-72">
            <div className="flex items-center gap-3">
              <UniversityMark uni={uni} size="md" />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-ink-inv">{uni.name}</p>
                <p className="truncate text-[12px] text-ink-inv/60">
                  {uni.city} · {uni.branding.tagline}
                </p>
              </div>
            </div>
            {nextExam ? (
              <div className="mt-4 border-t border-ink-inv/15 pt-3.5">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">Next university exam period</p>
                <p className="mt-2 font-display text-[24px] leading-none font-bold tracking-[-0.02em] text-cta">
                  {formatShortDate(nextExam.start)} to {formatShortDate(nextExam.end)}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-snug text-ink-inv/65">
                  {daysToExam} days away · ACCA blackout: no live classes or mocks
                </p>
              </div>
            ) : null}
          </div>
        }
      />

      <KpiRow cols={4}>
        <KpiTile
          label="Attendance in ACCA sessions"
          value={`${h.avgAttendance}%`}
          tone="jade"
          icon={<UserCheck />}
          sub="Joint certificate needs 75%"
          href="/university/performance?tab=attendance"
        />
        <KpiTile
          label="Joint certificate on track"
          value={`${h.jointCertOnTrackPct}%`}
          tone="info"
          icon={<Award />}
          sub="2025 intake"
          href="/university/certificates"
        />
        <KpiTile
          label="Internships planned"
          value={h.internshipsPlanned}
          tone="violet"
          icon={<Briefcase />}
          sub="Summer 2027"
          href="/university/careers"
        />
        <KpiTile
          label="Open support tickets"
          value={openTickets}
          tone="amber"
          icon={<LifeBuoy />}
          sub="Raised by your students"
          href="/university/support"
        />
      </KpiRow>

      <section aria-labelledby="ua-cohorts">
        <SectionTitle action={<TextLink href="/university/cohorts">Intakes and cohorts</TextLink>}>
          <span id="ua-cohorts">Cohorts</span>
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-2">
          {cohorts.map((c) => {
            const cohortClasses = classes.filter((x) => x.cohortId === c.id);
            const att = attendanceOf(cohortClasses);
            const members = roster.filter((s) => s.cohortIds.includes(c.id));
            const readiness = average(members.map((s) => s.readiness.overall));
            const faculty = c.facultyIds.map((id) => staffName(id));
            const cohortSections = sections.filter((s) => s.cohortId === c.id);
            return (
              <Card key={c.id} className="flex min-w-0 flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <MiniLabel>{intakeShort(c.intakeId ?? "")}</MiniLabel>
                    <h3 className="mt-1 font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">
                      Semester {c.semester}
                    </h3>
                    <p className="mt-1 text-[12.5px] text-ink-3">
                      {formatAccaDate(c.startDate)} to {formatAccaDate(c.endDate)} · {c.delivery}
                    </p>
                  </div>
                  <StatusPill status={c.status} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.papers.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 text-[12px] text-ink-2"
                    >
                      <span className="font-mono font-semibold text-ink">{p}</span>
                      {paperName(p)}
                    </span>
                  ))}
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-line py-3.5">
                  <div className="min-w-0">
                    <dt className="text-[11.5px] text-ink-3">Students</dt>
                    <dd className="mt-0.5 font-display text-[22px] leading-none font-bold text-ink tnum">{c.size}</dd>
                    <dd className="mt-1 text-[11.5px] text-ink-3">of {c.capacity} seats</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11.5px] text-ink-3">Attendance</dt>
                    <dd className="mt-0.5 font-display text-[22px] leading-none font-bold text-ink tnum">
                      {att == null ? "Not started" : `${att}%`}
                    </dd>
                    <dd className="mt-1 text-[11.5px] text-ink-3">{plural(cohortClasses.filter((x) => x.attendance?.marked).length, "class", "classes")} marked</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[11.5px] text-ink-3">Readiness</dt>
                    <dd className="mt-0.5 font-display text-[22px] leading-none font-bold text-ink tnum">{readiness}</dd>
                    <dd className="mt-1 text-[11.5px] text-ink-3">average score</dd>
                  </div>
                </dl>

                <ul className="mt-3 space-y-1.5">
                  {cohortSections.map((s) => (
                    <li key={s.id} className="flex min-w-0 items-baseline justify-between gap-3 text-[12.5px]">
                      <span className="shrink-0 font-semibold text-ink">
                        {s.name} · {s.size}
                      </span>
                      <span className="min-w-0 truncate text-right text-ink-3">{s.schedule}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div className="flex min-w-0 items-center gap-2">
                    <AvatarStack names={faculty} size="xs" />
                    <span className="min-w-0 truncate text-[12.5px] text-ink-2">{faculty.join(", ")}</span>
                  </div>
                  <span className="text-[12.5px] text-ink-3">
                    Mentor <span className="font-semibold text-ink">{staffName(c.mentorId)}</span>
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader
          title="At-risk students"
          sub={`${h.atRisk} students are at risk. Highest risk first, with the reasons mentors have flagged.`}
          action={<TextLink href="/university/performance?tab=at-risk">View all</TextLink>}
        />
        <div className="grid gap-3 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
          {atRisk.map((s) => (
            <div key={s.id} className="min-w-0 rounded-[14px] border border-line bg-surface-2 p-3.5">
              <div className="flex items-center gap-2.5">
                <Avatar name={s.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{s.name}</p>
                  <p className="truncate text-[12px] text-ink-3">
                    {intakeShort(s.intakeId)} · Section {s.section}
                  </p>
                </div>
              </div>
              <RiskBadge level={s.risk.level} className="mt-3" />
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{s.risk.reasons.join(". ")}</p>
              <p className="mt-2 text-[12px] text-ink-3">
                Mentor {staffName(s.mentorId)} · active {s.lastActiveDaysAgo === 0 ? "today" : `${s.lastActiveDaysAgo}d ago`}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Upcoming ACCA sessions"
            sub="Live classes for your cohorts this week"
            action={<TextLink href="/university/performance?tab=attendance">Attendance</TextLink>}
          />
          <ul className="divide-y divide-line border-t border-line">
            {upcoming.map((c) => {
              const section = sections.find((s) => s.id === c.sectionId);
              const today = c.status === "today";
              return (
                <li key={c.id} className={cn("flex gap-3.5 px-5 py-3", today && "bg-cta-soft")}>
                  <div className="w-16 shrink-0">
                    <p className="text-[12px] font-semibold text-ink">{formatCalendarDate(c.start.slice(0, 10), "day")}</p>
                    <p className="font-mono text-[12px] text-ink-3">{formatTime(c.start)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="flex min-w-0 items-center gap-2">
                      <span className="shrink-0 rounded-[6px] bg-surface-inv px-1.5 py-px font-mono text-[11px] font-bold text-ink-inv">
                        {c.paper}
                      </span>
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{c.title}</span>
                    </p>
                    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-ink-3">
                      <MapPin aria-hidden className="size-3.5 shrink-0" />
                      <span className="min-w-0 truncate">
                        {section?.short ?? ""} · {c.room ?? "Online"} · {staffName(c.facultyId)}
                      </span>
                    </p>
                  </div>
                  {today ? <StatusPill status="today" className="self-start" /> : null}
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 border-t border-line px-5 py-3.5">
            {cancelledWeek ? (
              <p className="flex items-start gap-2 text-[12.5px] text-ink-2">
                <CalendarRange aria-hidden className="mt-0.5 size-3.5 shrink-0 text-amber" />
                <span>
                  <span className="font-semibold text-ink">{cancelledWeek}:</span> continuous internal assessment 1.{" "}
                  {plural(cancelled.length, "ACCA class", "ACCA classes")} move to recordings.
                </span>
              </p>
            ) : null}
            {blackout ? (
              <p className="flex items-start gap-2 text-[12.5px] text-ink-2">
                <CalendarOff aria-hidden className="mt-0.5 size-3.5 shrink-0 text-rose" />
                <span>
                  <span className="font-semibold text-ink">{formatRange(blackout.start, blackout.end)}:</span> university
                  examinations. No ACCA live classes or mocks are scheduled.
                </span>
              </p>
            ) : null}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader
            title="Latest announcements"
            sub={`Published to ${uni.shortName} ACCA learners`}
            action={<TextLink href="/university/announcements">All</TextLink>}
          />
          <ul className="divide-y divide-line border-t border-line">
            {latest.map((a) => (
              <li key={a.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="flex min-w-0 items-start gap-2 text-[13.5px] leading-snug font-semibold text-ink">
                    <Megaphone aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-3" />
                    <span className="min-w-0">{a.title}</span>
                  </p>
                  <StatusPill status={a.status} size="sm" />
                </div>
                <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{a.body}</p>
                <p className="mt-2 text-[12px] text-ink-3">
                  {formatAccaDate(a.publishedOn)} · {staffName(a.authorId)} · {a.audienceLabel.replace(`${uni.name} · `, "")}
                </p>
                {a.readPct != null ? (
                  <div className="mt-2 flex items-center gap-2.5">
                    <Progress value={a.readPct} tone="brand" height={5} className="flex-1" />
                    <span className="shrink-0 font-mono text-[11.5px] text-ink-3">{a.readPct}% read</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
