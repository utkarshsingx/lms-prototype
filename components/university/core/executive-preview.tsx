"use client";

import { useMemo } from "react";
import { CalendarOff } from "lucide-react";
import {
  ACCA_TODAY,
  blackoutsForUniversity,
  cohortsForUniversity,
  crossUniversityReport,
  examSessionById,
  formatAccaDate,
  interventions,
  internshipRecords,
  paperName,
  semesters as allSemesters,
  staffName,
  type PaperCode,
} from "@/lib/data/acca";
import { LineChart } from "@/components/ui/charts";
import { StatusPill } from "@/components/ui/status";
import { ScoreBar, scoreBand } from "@/components/ui/score";
import { formatRange } from "@/components/ui/calendar";
import { cn } from "@/lib/cn";
import { attendanceOf, average, inBlackout, intakeShort, universityClasses, universityStudents } from "./data";
import { MiniLabel, plural, UniversityMark, useUniversityWorkspace } from "./shared";

export const EXEC_SECTIONS = [
  { id: "cohorts", label: "Cohorts and sections" },
  { id: "results", label: "ACCA exams and results" },
  { id: "readiness", label: "Readiness and risk" },
  { id: "careers", label: "Joint certificate and internships" },
  { id: "dates", label: "Dates ahead" },
] as const;

export type ExecSectionId = (typeof EXEC_SECTIONS)[number]["id"];

export const EXEC_PERIODS = [
  { id: "sep-2026", label: "September 2026", window: "1 to 14 Sep 2026", from: "2026-09-01", file: "sep-2026" },
  { id: "sem-3", label: "Semester 3 to date", window: "15 Jul to 14 Sep 2026", from: "2026-07-15", file: "semester-3-to-date" },
] as const;

export type ExecPeriodId = (typeof EXEC_PERIODS)[number]["id"];

const TREND_LABELS = ["Apr", "May", "Jun", "Jul", "Aug", "Sep"];

function Figure({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone?: "rose" | "jade" }) {
  return (
    <div className="min-w-0 rounded-[14px] border border-line bg-surface px-3.5 py-3">
      <p className="truncate text-[11.5px] text-ink-3">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-[26px] leading-none font-bold tracking-[-0.03em] tnum",
          tone === "rose" ? "text-rose" : tone === "jade" ? "text-jade" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="mt-1.5 text-[11.5px] leading-snug text-ink-3">{hint}</p>
    </div>
  );
}

function DocSection({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-5">
      <h3 className="mb-3 flex items-baseline gap-2.5 text-[15px] font-bold text-ink">
        <span className="font-mono text-[12px] text-ink-3">{String(n).padStart(2, "0")}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ExecutiveSummaryPreview({
  period,
  include,
  format,
}: {
  period: ExecPeriodId;
  include: ExecSectionId[];
  format: "PDF" | "CSV";
}) {
  const { uni } = useUniversityWorkspace();
  const h = uni.headline;
  const p = EXEC_PERIODS.find((x) => x.id === period) ?? EXEC_PERIODS[0];

  const roster = useMemo(() => universityStudents(uni.id), [uni.id]);
  const cohorts = useMemo(() => cohortsForUniversity(uni.id), [uni.id]);
  const classes = useMemo(() => universityClasses(uni.id), [uni.id]);
  const cross = crossUniversityReport.find((r) => r.universityId === uni.id);
  const ids = new Set(roster.map((s) => s.id));

  const periodClasses = classes.filter((c) => c.start.slice(0, 10) >= p.from && c.start.slice(0, 10) <= ACCA_TODAY);
  const periodAttendance = attendanceOf(periodClasses);

  const attempts = roster.flatMap((s) =>
    Object.values(s.papers).flatMap((pp) => pp.attempts.filter((a) => a.date.startsWith("2026")).map((a) => ({ ...a, paper: pp.code }))),
  );
  const byPaper = [...new Set(attempts.map((a) => a.paper))].map((code) => {
    const list = attempts.filter((a) => a.paper === code);
    const decided = list.filter((a) => a.result === "passed" || a.result === "failed");
    const passed = decided.filter((a) => a.result === "passed").length;
    return { code: code as PaperCode, attempts: list.length, passed, rate: decided.length ? Math.round((passed / decided.length) * 100) : 0 };
  });

  const blackout = blackoutsForUniversity(uni.id).find((b) => b.end >= ACCA_TODAY);
  const booked = roster.flatMap((s) =>
    s.examBookings.filter((b) => b.status === "booked" && b.date >= ACCA_TODAY).map((b) => ({ ...b, student: s })),
  );
  const clashes = blackout ? booked.filter((b) => inBlackout(b.date, [blackout])) : [];

  const openInterventions = interventions.filter((i) => ids.has(i.studentId) && i.outcome === "pending").length;
  const bands = (["Strong", "Borderline", "At risk"] as const).map((label) => ({
    label,
    count: roster.filter((s) => scoreBand(s.readiness.overall).label === label).length,
  }));
  const intakes = [...new Set(roster.map((s) => s.intakeId))].sort();
  const trend = intakes.map((id, i) => {
    const group = roster.filter((s) => s.intakeId === id && s.readinessTrend.length === TREND_LABELS.length);
    return {
      label: intakeShort(id),
      values: TREND_LABELS.map((_, w) => average(group.map((s) => s.readinessTrend[w]))),
      tone: i === 0 ? "info" : "violet",
    };
  });

  const jc = roster.filter((s) => s.jointCertificate);
  const jcCount = (status: string) => jc.filter((s) => s.jointCertificate?.status === status).length;
  const internships = internshipRecords.filter((r) => ids.has(r.studentId));

  const sepSession = examSessionById("es-2026-sep");
  const decSession = examSessionById("es-2026-dec");
  const semesterEnd = allSemesters
    .filter((s) => s.universityId === uni.id && s.status === "in-progress")
    .sort((a, b) => a.end.localeCompare(b.end))[0];
  const dates = [
    decSession?.earlyEntryCloses ? { date: decSession.earlyEntryCloses, label: "Dec 2026 ACCA early entry closes" } : null,
    sepSession ? { date: sepSession.resultsDate, label: "Sep 2026 ACCA results released" } : null,
    decSession?.standardEntryCloses ? { date: decSession.standardEntryCloses, label: "Dec 2026 ACCA standard entry closes" } : null,
    semesterEnd ? { date: semesterEnd.end, label: `${semesterEnd.label} teaching ends` } : null,
    blackout ? { date: blackout.start, label: `University examinations ${formatRange(blackout.start, blackout.end)}: ACCA blackout` } : null,
  ].filter((d): d is { date: string; label: string } => d != null);

  const messages = [
    `Attendance in ACCA sessions is ${h.avgAttendance}% across ${h.students} students, above the 75% joint certificate rule.`,
    `${h.registeredPct}% of students are registered with ACCA. The 2026 intake registers during Semester 1.`,
    `ACCA pass rate in 2026 is ${cross?.passRate2026 ?? 0}%. ${sepSession ? `Sep 2026 results are due ${formatAccaDate(sepSession.resultsDate)}.` : ""}`,
    `${h.atRisk} students are at risk. Mentors have ${plural(openInterventions, "intervention")} open on the synced records.`,
    clashes.length
      ? `${plural(clashes.length, "ACCA exam booking")} fall inside the university examinations and need rebooking.`
      : "No ACCA exam bookings fall inside the university examinations.",
  ];

  let n = 1;
  const on = (id: ExecSectionId) => include.includes(id);

  return (
    <div className="min-w-0 overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-5 py-2.5">
        <MiniLabel>Preview · {format === "PDF" ? "2-page PDF" : "CSV, figures only"}</MiniLabel>
        <span className="text-[12px] text-ink-3">Updates as you change the options</span>
      </div>

      <div className="space-y-5 p-5 sm:p-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <UniversityMark uni={uni} size="lg" />
            <div className="min-w-0">
              <p className="text-[12.5px] text-ink-3">
                {uni.name} · {uni.programmeName}
              </p>
              <h2 className="font-display text-[26px] leading-tight font-bold tracking-[-0.03em] text-ink">Executive summary</h2>
              <p className="text-[13px] text-ink-2">
                {p.label} · {p.window}
              </p>
            </div>
          </div>
          <div className="text-left text-[12px] text-ink-3 sm:text-right">
            <p>Prepared {formatAccaDate(ACCA_TODAY)}</p>
            <p>For university leadership</p>
            <p>ZSkillup programme team</p>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
          <Figure label="Students" value={h.students} hint={`${plural(h.intakes, "intake")} · ${h.sections} sections`} />
          <Figure label="ACCA registered" value={`${h.registeredPct}%`} hint={`${Math.round((h.students * h.registeredPct) / 100)} of ${h.students}`} />
          <Figure
            label="Attendance in ACCA sessions"
            value={`${h.avgAttendance}%`}
            hint={periodAttendance == null ? "No classes marked in period" : `${periodAttendance}% in ${p.label}`}
            tone="jade"
          />
          <Figure label="Average readiness score" value={h.avgReadiness} hint="Target 70 before exam entry" />
          <Figure label="At-risk students" value={h.atRisk} hint={`${Math.round((h.atRisk / h.students) * 100)}% of students`} tone="rose" />
          <Figure label="ACCA pass rate, 2026" value={`${cross?.passRate2026 ?? 0}%`} hint="Pass mark 50% on every paper" />
        </div>

        <div>
          <MiniLabel className="mb-2">Key messages</MiniLabel>
          <ul className="space-y-1.5">
            {messages.map((m) => (
              <li key={m} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-ink">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-cta-strong" />
                <span className="min-w-0">{m}</span>
              </li>
            ))}
          </ul>
        </div>

        {on("cohorts") ? (
          <DocSection n={n++} title="Cohorts and sections">
            <div className="overflow-x-auto rounded-[12px] border border-line">
              <table className="w-full min-w-[30rem] text-[13px]">
                <thead className="bg-surface-2 text-left text-[12px] text-ink-3">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Cohort</th>
                    <th className="px-3 py-2 text-right font-semibold">Students</th>
                    <th className="px-3 py-2 font-semibold">Sections</th>
                    <th className="px-3 py-2 text-right font-semibold">Attendance</th>
                    <th className="px-3 py-2 font-semibold">Mentor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {cohorts.map((c) => {
                    const att = attendanceOf(classes.filter((x) => x.cohortId === c.id));
                    return (
                      <tr key={c.id}>
                        <td className="px-3 py-2 font-semibold text-ink">
                          {intakeShort(c.intakeId ?? "")} · Semester {c.semester}
                          <span className="block text-[12px] font-normal text-ink-3">{c.papers.join(", ")}</span>
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-ink">{c.size}</td>
                        <td className="px-3 py-2 text-ink-2">{c.sections.map((s) => `${s.name.replace("Section ", "")} (${s.size})`).join(", ")}</td>
                        <td className="px-3 py-2 text-right font-mono text-ink">{att == null ? "Not started" : `${att}%`}</td>
                        <td className="px-3 py-2 text-ink-2">{staffName(c.mentorId)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DocSection>
        ) : null}

        {on("results") ? (
          <DocSection n={n++} title="ACCA exams and results">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-3">
                {byPaper.map((r) => (
                  <ScoreBar
                    key={r.code}
                    value={r.rate}
                    label={`${r.code} ${paperName(r.code)} · ${r.passed} of ${plural(r.attempts, "attempt")} passed`}
                    marker={50}
                  />
                ))}
                <p className="text-[12px] text-ink-3">2026 attempts on synced learner records. Pass rate shown against the 50% mark.</p>
              </div>
              <div className="min-w-0 rounded-[12px] border border-line p-3.5">
                <p className="text-[13px] font-semibold text-ink">{plural(booked.length, "ACCA exam")} booked ahead</p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {[...new Set(booked.map((b) => b.paper))].join(", ")} on-demand CBEs, booked with ACCA
                </p>
                {clashes.length ? (
                  <ul className="mt-2.5 space-y-1.5">
                    {clashes.map((b) => (
                      <li key={b.id} className="flex items-start gap-2 text-[12.5px] text-ink">
                        <CalendarOff aria-hidden className="mt-0.5 size-3.5 shrink-0 text-rose" />
                        <span className="min-w-0">
                          {b.student.name} · {b.paper} on {formatAccaDate(b.date)} is inside the university examinations
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2.5 text-[12.5px] text-jade">No bookings inside the university examinations.</p>
                )}
              </div>
            </div>
          </DocSection>
        ) : null}

        {on("readiness") ? (
          <DocSection n={n++} title="Readiness and risk">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <LineChart series={trend} labels={TREND_LABELS} min={30} max={90} height={140} />
              </div>
              <ul className="min-w-0 space-y-2">
                {bands.map((b) => (
                  <li key={b.label} className="flex items-center justify-between gap-3 rounded-[10px] border border-line px-3 py-2">
                    <StatusPill status={b.label} tone={b.label === "Strong" ? "jade" : b.label === "Borderline" ? "amber" : "rose"}>
                      {b.label}
                    </StatusPill>
                    <span className="font-mono text-[13px] font-semibold text-ink">{plural(b.count, "learner")}</span>
                  </li>
                ))}
                <li className="text-[12px] text-ink-3">
                  Bands on the {roster.length} synced records. Headline at-risk count: {h.atRisk}.
                </li>
              </ul>
            </div>
          </DocSection>
        ) : null}

        {on("careers") ? (
          <DocSection n={n++} title="Joint certificate and internships">
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              <Figure label="Joint certificate on track" value={`${h.jointCertOnTrackPct}%`} hint="2025 intake" tone="jade" />
              <Figure label="Eligible now" value={jcCount("eligible")} hint="Synced records" />
              <Figure label="Criteria at risk" value={jcCount("at-risk")} hint="Synced records" tone="rose" />
              <Figure label="Internships planned" value={h.internshipsPlanned} hint={`${plural(internships.length, "internship record")} synced`} />
            </div>
          </DocSection>
        ) : null}

        {on("dates") ? (
          <DocSection n={n++} title="Dates ahead">
            <ul className="divide-y divide-line rounded-[12px] border border-line">
              {dates.map((d) => (
                <li key={d.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-3.5 py-2">
                  <span className="min-w-0 text-[13px] text-ink">{d.label}</span>
                  <span className="font-mono text-[12.5px] text-ink-2">{formatAccaDate(d.date)}</span>
                </li>
              ))}
            </ul>
          </DocSection>
        ) : null}

        {include.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-4 text-center text-[13px] text-ink-3">
            Headline figures and key messages only. Tick sections on the Executive summary card to add them.
          </p>
        ) : null}

        <p className="border-t border-line pt-3 text-[11.5px] text-ink-3">
          Headline figures cover all {h.students} students. Section detail uses the {roster.length} learner records synced to this workspace.
        </p>
      </div>
    </div>
  );
}
