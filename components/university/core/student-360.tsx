"use client";

import { useState } from "react";
import { Briefcase, CalendarCheck2, CalendarOff, FileDown, GraduationCap, LifeBuoy, ShieldCheck } from "lucide-react";
import {
  alertsForStudent,
  attemptHistory,
  blackoutsForUniversity,
  cohortById,
  companyReadinessFor,
  formatAccaDate,
  formatDateTime,
  formatGBP,
  interventionsForStudent,
  internshipRecords,
  mentoringSessions,
  PAPER_STATUS_LABELS,
  paperName,
  programmeById,
  RISK_ALERT_LABELS,
  staffName,
  ticketsForStudent,
} from "@/lib/data/acca";
import { Drawer } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { Progress } from "@/components/ui/progress";
import { Timeline } from "@/components/ui/timeline";
import { DataRow } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { inBlackout, intakeShort, VERIFICATION_LABEL, type RosterRow } from "./data";
import { GatedButton, MiniLabel, plural, queueReport, slug } from "./shared";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "acca", label: "Mocks, bookings and results" },
  { id: "mentoring", label: "Mentor interventions" },
  { id: "support", label: "Tickets" },
  { id: "careers", label: "Internships and placement" },
];

function Block({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[16px] border border-line p-4", className)}>
      <MiniLabel className="mb-3">{title}</MiniLabel>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-5 text-center text-[13px] text-ink-3">{children}</p>;
}

export function Student360Drawer({
  row,
  onClose,
  canEdit,
  reason,
  onVerify,
  onUpdateSemester,
}: {
  row: RosterRow | null;
  onClose: () => void;
  canEdit: boolean;
  reason?: string;
  onVerify: (row: RosterRow) => void;
  onUpdateSemester: (row: RosterRow) => void;
}) {
  const [tab, setTab] = useState("overview");
  const s = row?.student;

  return (
    <Drawer
      open={row != null}
      onClose={() => {
        onClose();
        setTab("overview");
      }}
      width="w-full max-w-2xl"
      title={s?.name ?? "Student"}
      sub={row && s ? `${row.roll} · ACCA ID ${s.accaId ?? "not registered"} · ${intakeShort(s.intakeId)} · Semester ${row.semester} · Section ${s.section}` : undefined}
      footer={
        row && s ? (
          <>
            <Button
              type="button"
              variant="ghost"
              className="mr-auto"
              onClick={() => queueReport(`student-report-${slug(s.name)}.pdf`, `${s.name} · full student record`)}
            >
              <FileDown className="size-4" />
              Student report
            </Button>
            <GatedButton allowed={canEdit} reason={reason} variant="outline" onClick={() => onUpdateSemester(row)}>
              Update semester
            </GatedButton>
            {row.verification !== "verified" ? (
              <GatedButton allowed={canEdit} reason={reason} onClick={() => onVerify(row)}>
                <ShieldCheck className="size-4" />
                Verify record
              </GatedButton>
            ) : null}
          </>
        ) : null
      }
    >
      {row && s ? (
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <Avatar name={s.name} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-ink-2">{programmeById(s.programmeId)?.name}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <StatusPill status={row.verification}>{VERIFICATION_LABEL[row.verification]}</StatusPill>
                <RiskBadge level={s.risk.level} />
                <StatusPill status={s.registration.status}>ACCA {s.registration.status.replace("-", " ")}</StatusPill>
              </div>
            </div>
          </div>

          <Tabs items={TABS} value={tab} onChange={setTab} />

          {tab === "overview" ? <OverviewTab row={row} /> : null}
          {tab === "acca" ? <AccaTab row={row} /> : null}
          {tab === "mentoring" ? <MentoringTab row={row} /> : null}
          {tab === "support" ? <SupportTab row={row} /> : null}
          {tab === "careers" ? <CareersTab row={row} /> : null}
        </div>
      ) : null}
    </Drawer>
  );
}

function OverviewTab({ row }: { row: RosterRow }) {
  const s = row.student;
  const inPlay = Object.values(s.papers).filter((p) => p.status === "current" || p.status === "in-progress" || p.status === "failed");
  const cleared = Object.values(s.papers)
    .filter((p) => p.status === "passed" || p.status === "exempt")
    .map((p) => p.code);
  const attTone = s.attendance.total === 0 ? "brand" : s.attendance.pct >= 75 ? "jade" : "rose";
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="Attendance in ACCA sessions">
          {s.attendance.total === 0 ? (
            <p className="text-[13px] text-ink-2">Not started. Classes begin with the first timetabled session.</p>
          ) : (
            <>
              <p className="font-display text-[30px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{s.attendance.pct}%</p>
              <Progress value={s.attendance.pct} tone={attTone} className="mt-3" />
              <p className="mt-2 text-[12.5px] text-ink-3">
                {s.attendance.attended} of {s.attendance.total} classes · {plural(s.attendance.missedClasses, "missed class", "missed classes")}
                {s.attendance.lastMissed ? ` · last missed ${formatAccaDate(s.attendance.lastMissed)}` : ""}
              </p>
            </>
          )}
        </Block>
        <Block title="ACCA readiness score">
          <div className="flex items-center gap-4">
            <ScoreRing value={s.readiness.overall} size={72} label="Overall readiness score" />
            <div className="min-w-0 flex-1 space-y-2.5">
              {Object.entries(s.readiness.byPaper).map(([code, v]) => (
                <ScoreBar key={code} label={`${code} readiness`} value={v ?? 0} marker={70} height={6} />
              ))}
            </div>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">Tick marks the 70 target for exam entry.</p>
        </Block>
      </div>

      <Block title="Learning progress">
        <p className="mb-3 text-[12.5px] text-ink-2">
          {plural(cleared.length, "paper")} cleared{cleared.length ? `: ${cleared.join(", ")}` : ""} · current paper{" "}
          <span className="font-semibold text-ink">{s.currentPaper ? `${s.currentPaper} ${paperName(s.currentPaper)}` : "none"}</span>
        </p>
        <ul className="space-y-3">
          {inPlay.map((p) => (
            <li key={p.code} className="min-w-0">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[13px] font-semibold text-ink">
                  <span className="font-mono">{p.code}</span> · {paperName(p.code)}
                </span>
                <span className="flex items-center gap-2">
                  <StatusPill status={p.status} size="sm">
                    {PAPER_STATUS_LABELS[p.status]}
                  </StatusPill>
                  <span className="font-mono text-[12px] text-ink-2">{p.progress}%</span>
                </span>
              </div>
              <Progress value={p.progress} />
              {p.note ? <p className="mt-1 text-[12px] text-ink-3">{p.note}</p> : null}
            </li>
          ))}
        </ul>
      </Block>

      <div className="grid gap-4 sm:grid-cols-2">
        <Block title="University record">
          <dl>
            <DataRow label="Roll no">
              <span className="font-mono">{row.roll}</span>
            </DataRow>
            <DataRow label="Cohort">{s.cohortIds.map((id) => cohortById(id)?.name.replace(/^[^·]+· /, "")).join(", ")}</DataRow>
            <DataRow label="Semester">Semester {row.semester}</DataRow>
            <DataRow label="Record check">
              {VERIFICATION_LABEL[row.verification]}
              {row.verifiedOn ? ` · ${formatAccaDate(row.verifiedOn)}` : ""}
            </DataRow>
            <DataRow label="Mentor">{staffName(s.mentorId)}</DataRow>
          </dl>
        </Block>
        <Block title="Joint certificate">
          {s.jointCertificate ? (
            <>
              <StatusPill status={s.jointCertificate.status} />
              <ul className="mt-3 space-y-1.5">
                {s.jointCertificate.checks.map((c) => (
                  <li key={c.id} className="flex items-start gap-2 text-[12.5px]">
                    <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", c.met ? "bg-jade" : "bg-amber")} />
                    <span className="min-w-0 text-ink-2">{c.detail}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Empty>Not on a joint certificate programme.</Empty>
          )}
        </Block>
      </div>
    </div>
  );
}

function AccaTab({ row }: { row: RosterRow }) {
  const s = row.student;
  const blackout = blackoutsForUniversity(s.universityId ?? "");
  const results = attemptHistory(s);
  return (
    <div className="space-y-4">
      <Block title="Mocks and assessments">
        {s.mocks.length ? (
          <ul className="divide-y divide-line">
            {s.mocks.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">{m.title}</span>
                  <span className="block text-[12px] text-ink-3">{formatAccaDate(m.date)}</span>
                </span>
                {m.score != null ? (
                  <ScoreBar value={m.score} className="w-28 shrink-0" height={6} marker={50} />
                ) : (
                  <StatusPill status={m.status} size="sm" />
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No mocks yet. The first progress test follows the first month of classes.</Empty>
        )}
      </Block>

      <Block title="Exam bookings">
        <ul className="divide-y divide-line">
          {s.examBookings.map((b) => {
            const clash = b.status !== "sat" ? inBlackout(b.date, blackout) : undefined;
            return (
              <li key={b.id} className="py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0 text-[13px] font-semibold text-ink">
                    <span className="font-mono">{b.paper}</span> · {b.label}
                  </span>
                  <StatusPill status={b.status} size="sm" />
                </div>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {b.entryWindow === "on-demand" ? "On-demand CBE" : `${b.entryWindow} entry`} · {b.centre} · ACCA exam fee{" "}
                  {formatGBP(b.feeGBP)} {b.feeStatus === "paid" ? "paid to ACCA" : "not yet paid"}
                </p>
                {clash ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-rose">
                    <CalendarOff aria-hidden className="size-3.5" />
                    Inside university examinations ({clash.label})
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Block>

      <Block title="Paper attempts and results">
        {results.length ? (
          <ul className="divide-y divide-line">
            {results.map((a) => (
              <li key={`${a.paper}-${a.date}`} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    <span className="font-mono">{a.paper}</span> · {a.paperName}
                  </span>
                  <span className="block text-[12px] text-ink-3">{a.label}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="font-mono text-[13px] font-semibold text-ink">{a.score == null ? "Pending" : `${a.score}%`}</span>
                  <StatusPill status={a.result} size="sm" />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No ACCA exams sat yet.</Empty>
        )}
      </Block>
    </div>
  );
}

function MentoringTab({ row }: { row: RosterRow }) {
  const s = row.student;
  const ivs = interventionsForStudent(s.id);
  const alerts = alertsForStudent(s.id);
  const sessions = mentoringSessions.filter((m) => m.studentId === s.id).sort((a, b) => b.start.localeCompare(a.start));
  return (
    <div className="space-y-4">
      <Block title="Mentor interventions">
        {ivs.length ? (
          <Timeline
            dense
            items={ivs.map((iv) => ({
              id: iv.id,
              title: iv.action,
              meta: `${formatAccaDate(iv.startedOn)}${iv.closedOn ? ` to ${formatAccaDate(iv.closedOn)}` : ""} · ${staffName(iv.mentorId)}`,
              body: (
                <span className="flex flex-wrap items-center gap-2">
                  <span>Trigger: {iv.trigger}.</span>
                  <span className="font-mono text-[12px]">
                    {iv.metric} {iv.before} to {iv.after ?? "open"}
                  </span>
                  <StatusPill status={iv.outcome} size="sm" />
                </span>
              ),
              tone: iv.outcome === "improved" ? "jade" : iv.outcome === "worsened" ? "rose" : "amber",
            }))}
          />
        ) : (
          <Empty>No mentor interventions recorded for {s.name.split(" ")[0]}.</Empty>
        )}
      </Block>
      <Block title="Risk alerts raised">
        {alerts.length ? (
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-ink">{a.title}</span>
                  <span className="block text-[12px] text-ink-3">
                    {RISK_ALERT_LABELS[a.kind]} · {formatAccaDate(a.raisedOn)} · {a.detail}
                  </span>
                </span>
                <StatusPill status={a.status} size="sm" />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No risk alerts.</Empty>
        )}
      </Block>
      <Block title="Mentoring sessions">
        {sessions.length ? (
          <ul className="divide-y divide-line">
            {sessions.map((m) => (
              <li key={m.id} className="flex items-start justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                    <CalendarCheck2 aria-hidden className="size-3.5 text-ink-3" />
                    {formatDateTime(m.start)}
                  </span>
                  <span className="block text-[12px] text-ink-3">
                    {m.mode} · {m.durationMins} min · {m.agenda}
                  </span>
                </span>
                <StatusPill status={m.status} size="sm" />
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No mentoring sessions this month.</Empty>
        )}
      </Block>
    </div>
  );
}

function SupportTab({ row }: { row: RosterRow }) {
  const list = ticketsForStudent(row.student.id);
  return (
    <Block title="Support tickets">
      {list.length ? (
        <ul className="divide-y divide-line">
          {list.map((t) => (
            <li key={t.id} className="py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-ink">
                  <LifeBuoy aria-hidden className="size-3.5 shrink-0 text-ink-3" />
                  <span className="font-mono text-[12px] text-ink-2">{t.id}</span>
                  <span className="min-w-0 truncate">{t.subject}</span>
                </span>
                <StatusPill status={t.status} size="sm" />
              </div>
              <p className="mt-0.5 text-[12px] text-ink-3">
                {t.category} · opened {formatDateTime(t.created)} · {t.priority} priority · SLA {t.slaHours}h
                {t.resolutionHours != null ? ` · resolved in ${t.resolutionHours}h` : ""}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <Empty>No support tickets raised.</Empty>
      )}
    </Block>
  );
}

function CareersTab({ row }: { row: RosterRow }) {
  const s = row.student;
  const cr = companyReadinessFor(s.id);
  const record = internshipRecords.find((r) => r.studentId === s.id);
  const intern = s.career.internship;
  return (
    <div className="space-y-4">
      <Block title="Internship">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-2 text-[13.5px] font-semibold text-ink">
            <Briefcase aria-hidden className="size-4 shrink-0 text-ink-3" />
            <span className="min-w-0">
              {record?.role ?? s.career.targetRole}
              {intern.company ? ` · ${intern.company}` : record && record.company !== "To be matched" ? ` · ${record.company}` : ""}
            </span>
          </p>
          <StatusPill status={intern.status === "none" ? "not-started" : intern.status}>
            {intern.status === "none" ? "Not planned" : undefined}
          </StatusPill>
        </div>
        <p className="mt-1 text-[12.5px] text-ink-3">
          {intern.period ?? (record ? `${formatAccaDate(record.start)} to ${formatAccaDate(record.end)}` : "No internship on record")}
          {record ? ` · ${record.hoursLogged} of ${record.hoursRequired} hours logged` : ""}
        </p>
      </Block>
      <Block title="Placement readiness">
        <div className="flex flex-wrap items-center gap-4">
          {cr ? <ScoreRing value={cr.score} size={88} showBand label="Company Readiness Score" /> : null}
          <div className="min-w-0 flex-1 space-y-2.5">
            <dl>
              <DataRow label="Company Readiness Score">{cr ? `${cr.score} · ${cr.band}` : "Not assessed"}</DataRow>
              <DataRow label="ATS score">{s.career.atsScore ?? "No resume yet"}</DataRow>
              <DataRow label="Placement-eligible">{s.career.placementEligible ? "Yes" : "Not yet"}</DataRow>
              <DataRow label="Target role">{s.career.targetRole}</DataRow>
            </dl>
          </div>
        </div>
        {cr ? (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {cr.components.map((c) => (
              <ScoreBar key={c.label} label={`${c.label} (${c.weight}%)`} value={c.score} height={6} />
            ))}
          </div>
        ) : null}
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3">
          <GraduationCap aria-hidden className="size-3.5" />
          Placement eligibility is set by the career team from papers cleared and the Company Readiness Score.
        </p>
      </Block>
    </div>
  );
}
