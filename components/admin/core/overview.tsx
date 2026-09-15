"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Briefcase,
  CalendarClock,
  Clock,
  Download,
  GraduationCap,
  Landmark,
  LogIn,
  Route,
  Siren,
} from "lucide-react";
import {
  accaProgression,
  activityWeekLabels,
  careerOutcomes,
  communicationChannels,
  crossUniversityReport,
  daysBetween,
  groupIndian,
  facultyActivity,
  mentorActivity,
  platformUsage,
  programmeById,
  staffById,
  staffName,
  studentName,
  students as allStudents,
  tickets,
  universities,
  universityById,
  usageWeekLabels,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { HeroBand } from "@/components/ui/hero-band";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { BarChart, LineChart, StackedBar } from "@/components/ui/charts";
import { Progress } from "@/components/ui/progress";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Drawer } from "@/components/ui/modal";
import { DataRow } from "@/components/ui/misc";
import { toast } from "@/components/ui/toast";
import { DEMO_NOW, MiniLabel, SectionHead, daysAgoLabel, hoursBetween } from "./shared";

/* ------------------------------------------------------------------ derived figures */

const LAST_SESSION = { id: "es-2026-jun", label: "Jun 2026" };

const lastSessionAttempts = allStudents
  .flatMap((s) => Object.values(s.papers).flatMap((p) => p.attempts))
  .filter((a) => a.sessionId === LAST_SESSION.id && (a.result === "passed" || a.result === "failed"));
const lastSessionPassRate = Math.round(
  (lastSessionAttempts.filter((a) => a.result === "passed").length / Math.max(1, lastSessionAttempts.length)) * 100,
);

const latestWeek = platformUsage.weeklyActiveLearners.length - 1;
const loginsPerActiveLearner = platformUsage.logins7d / platformUsage.weeklyActiveLearners[latestWeek];

const USAGE_SERIES = {
  logins: [
    {
      label: "Logins",
      values: platformUsage.weeklyActiveLearners.map((v) => Math.round(v * loginsPerActiveLearner)),
      tone: "brand",
    },
    { label: "Weekly active learners", values: platformUsage.weeklyActiveLearners, tone: "info" },
  ],
  study: [
    {
      label: "Study hours",
      values: platformUsage.weeklyActiveLearners.map((v, i) => Math.round((v * platformUsage.avgMinutesPerLearner[i]) / 60)),
      tone: "brand",
    },
    { label: "AI tutor sessions", values: platformUsage.aiTutorSessions, tone: "violet" },
  ],
  classes: [
    { label: "Live class hours", values: platformUsage.liveClassHours, tone: "brand" },
    { label: "Mock attempts", values: platformUsage.mockAttempts, tone: "jade" },
  ],
} as const;

const USAGE_METRICS = [
  { id: "logins", label: "Logins" },
  { id: "study", label: "Study hours" },
  { id: "classes", label: "Classes and mocks" },
];

/* Device split is sampled from sign-in sessions over the last 30 days. */
const DEVICE_SPLIT = [
  { label: "Mobile app", value: 47, tone: "brand" },
  { label: "Desktop web", value: 39, tone: "info" },
  { label: "Mobile web", value: 14, tone: "violet" },
];

const CHANNEL_TONES: Record<string, string> = { "in-app": "brand", email: "info", whatsapp: "jade", sms: "amber", push: "ink-3" };

const liveUniversities = universities.filter((u) => u.status === "Live").length;
const onboardingUniversity = universities.find((u) => u.status === "Onboarding");
const escalatedTickets = tickets.filter((t) => t.status === "escalated");

type FacultyRow = (typeof facultyActivity)[number];
type MentorRow = (typeof mentorActivity)[number];

/* ------------------------------------------------------------------ page */

export function AdminOverview() {
  const { persona } = useRole();
  const firstName = persona.name.replace(/^(Dr|Prof\.)\s+/, "").split(" ")[0];

  const [metric, setMetric] = useState<keyof typeof USAGE_SERIES>("logins");
  const [activityTab, setActivityTab] = useState("students");

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <HeroBand
        eyebrow="ZSkillup Super Admin · Overview"
        title={`Good morning, ${firstName}`}
        sub={`Monday 14 September 2026 · platform usage and activity across ${universities.length} partner universities and the open-market programmes.`}
        stats={[
          {
            label: "Active learners",
            value: platformUsage.weeklyActiveLearners[latestWeek],
            hint: `of ${platformUsage.totals.learners} enrolled · last 7 days`,
          },
          {
            label: "Partner universities",
            value: universities.length,
            hint: `${liveUniversities} live · ${onboardingUniversity?.shortName ?? "none"} onboarding`,
          },
          { label: "Live cohorts", value: platformUsage.totals.activeCohorts, hint: "running this exam cycle" },
          {
            label: "Pass rate, last session",
            value: `${lastSessionPassRate}%`,
            hint: `${LAST_SESSION.label} · ${lastSessionAttempts.length} attempts`,
          },
        ]}
        actions={
          <>
            <LinkButton href="/admin/reports">
              <BarChart3 className="size-4" />
              Open reports
            </LinkButton>
            <Button variant="inverse" onClick={() => toast({ title: "Report queued: platform-usage.csv", tone: "info" })}>
              <Download className="size-4" />
              Export usage
            </Button>
          </>
        }
        aside={
          <div className="w-full rounded-[16px] border border-ink-inv/15 bg-ink-inv/5 p-4 lg:w-64">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">Next ACCA milestone</p>
            <p className="mt-2 text-[15px] font-semibold text-ink-inv">Dec 2026 early entry closes</p>
            <p className="mt-1 font-display text-[28px] leading-none font-bold text-cta">5 Oct</p>
            <p className="mt-1.5 text-[12.5px] text-ink-inv/65">
              {daysBetween(DEMO_NOW.slice(0, 10), "2026-10-05")} days away · Sep 2026 results due 12 Oct
            </p>
          </div>
        }
      />

      {/* ------------------------------------------------------------ platform usage */}
      <section className="space-y-4">
        <SectionHead
          title="View platform usage"
          sub="Sign-ins, study time, live classes and mocks across every login for the last 12 weeks."
        />
        <KpiRow cols={4}>
          <KpiTile
            hero
            label="Logins, last 7 days"
            value={groupIndian(platformUsage.logins7d)}
            delta={`+${Math.round(((platformUsage.weeklyActiveLearners[latestWeek] - platformUsage.weeklyActiveLearners[latestWeek - 1]) / platformUsage.weeklyActiveLearners[latestWeek - 1]) * 100)}% on last week`}
            trend="up"
            icon={<LogIn />}
          />
          <KpiTile
            label="Minutes per active learner"
            value={platformUsage.avgMinutesPerLearner[latestWeek]}
            delta={`+${platformUsage.avgMinutesPerLearner[latestWeek] - platformUsage.avgMinutesPerLearner[latestWeek - 1]} min`}
            trend="up"
            tone="info"
            icon={<Clock />}
          />
          <KpiTile
            label="AI tutor sessions this week"
            value={groupIndian(platformUsage.aiTutorSessions[latestWeek])}
            delta={`+${platformUsage.aiTutorSessions[latestWeek] - platformUsage.aiTutorSessions[latestWeek - 1]}`}
            trend="up"
            tone="violet"
            icon={<Bot />}
          />
          <KpiTile
            label="Mock attempts this week"
            value={platformUsage.mockAttempts[latestWeek]}
            delta={`+${platformUsage.mockAttempts[latestWeek] - platformUsage.mockAttempts[latestWeek - 1]}`}
            trend="up"
            tone="jade"
            icon={<Activity />}
          />
        </KpiRow>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Card className="min-w-0">
            <CardHeader
              title="Platform usage"
              sub={`Weekly, ${usageWeekLabels[0]} to ${usageWeekLabels[latestWeek]} 2026`}
            />
            <div className="space-y-4 px-5 pb-5">
              <Segmented
                size="sm"
                items={USAGE_METRICS}
                value={metric}
                onChange={(id) => setMetric(id as keyof typeof USAGE_SERIES)}
              />
              <LineChart
                series={USAGE_SERIES[metric].map((s) => ({ ...s, values: [...s.values] }))}
                labels={usageWeekLabels}
                height={220}
              />
            </div>
          </Card>

          <div className="grid min-w-0 gap-4">
            <Card className="min-w-0 p-5">
              <MiniLabel>Active in the last 7 days, by login</MiniLabel>
              <ul className="mt-3 space-y-3">
                {platformUsage.byRole.map((r) => (
                  <li key={r.role} className="min-w-0">
                    <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="min-w-0 truncate font-semibold text-ink">{r.role}</span>
                      <span className="shrink-0 text-ink-3 tnum">
                        {r.active7d} · {r.share}%
                      </span>
                    </div>
                    <Progress value={r.share} tone={r.share >= 90 ? "jade" : r.share >= 75 ? "cta" : "amber"} />
                  </li>
                ))}
              </ul>
            </Card>
            <Card className="min-w-0 p-5">
              <MiniLabel>Device and channel split</MiniLabel>
              <p className="mt-1 text-[12px] text-ink-3">Last 30 days. Channels count messages sent to learners.</p>
              <StackedBar
                className="mt-3"
                normalize
                unit="%"
                rows={[
                  { label: "Devices", parts: DEVICE_SPLIT },
                  {
                    label: "Channels",
                    parts: communicationChannels
                      .filter((c) => c.sent30d > 0)
                      .map((c) => ({ label: c.name, value: c.sent30d, tone: CHANNEL_TONES[c.id] })),
                  },
                ]}
              />
            </Card>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ activity */}
      <section className="space-y-4">
        <SectionHead
          title="View student, faculty and mentor activity"
          sub="Who is learning, teaching and mentoring, and who has gone quiet."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast({ title: `Report queued: ${activityTab}-activity.csv`, tone: "info" })}
            >
              <Download className="size-4" />
              Export activity
            </Button>
          }
        />
        <Tabs
          items={[
            { id: "students", label: "Student activity", count: allStudents.length },
            { id: "faculty", label: "Faculty activity", count: facultyActivity.length },
            { id: "mentors", label: "Mentor activity", count: mentorActivity.length },
          ]}
          value={activityTab}
          onChange={setActivityTab}
        />
        {activityTab === "students" ? <StudentActivity /> : null}
        {activityTab === "faculty" ? <FacultyActivity /> : null}
        {activityTab === "mentors" ? <MentorActivity /> : null}
      </section>

      {/* ------------------------------------------------------------ report links */}
      <section className="space-y-4">
        <SectionHead title="Headline reports" sub="Cross-university, progression and career figures. Open a report for the full view." />
        <div className="grid gap-4 md:grid-cols-3">
          <ReportLink
            href="/admin/reports?tab=cross-university"
            icon={<Landmark />}
            title="Cross-university reports"
            figures={[
              { label: "Brightwater readiness", value: `${crossUniversityReport[0].avgReadiness}` },
              { label: "Coastline readiness", value: `${crossUniversityReport[1].avgReadiness}` },
            ]}
            note={`${crossUniversityReport.reduce((n, u) => n + u.atRisk, 0)} university learners at risk`}
          />
          <ReportLink
            href="/admin/reports?tab=progression"
            icon={<Route />}
            title="ACCA progression"
            figures={[
              { label: "Exemptions approved", value: `${accaProgression.exemptionsApproved}` },
              { label: "EPSM complete", value: `${accaProgression.epsm.complete}` },
            ]}
            note={`${accaProgression.exemptionsPending} exemptions awaiting ACCA · sample records`}
          />
          <ReportLink
            href="/admin/reports?tab=careers"
            icon={<Briefcase />}
            title="Career outcomes"
            figures={[
              { label: "Offers", value: `${careerOutcomes.offers}` },
              { label: "Joined", value: `${careerOutcomes.joined}` },
            ]}
            note={`Average offer ₹${careerOutcomes.avgOfferLPA} LPA · ${careerOutcomes.placementEligible} placement-eligible`}
          />
        </div>
      </section>

      {/* ------------------------------------------------------------ escalations */}
      <Card className="min-w-0">
        <CardHeader
          title={
            <span className="inline-flex items-center gap-2">
              <Siren className="size-4 text-rose" aria-hidden />
              Support escalations
            </span>
          }
          sub={`${escalatedTickets.length} tickets escalated past Programme Admin. Breach timers count from ticket creation.`}
          action={
            <LinkButton href="/admin/escalations" variant="outline" size="sm">
              Manage
              <ArrowRight className="size-4" />
            </LinkButton>
          }
        />
        <ul className="divide-y divide-line border-t border-line">
          {escalatedTickets.map((t) => {
            const age = hoursBetween(t.created);
            const breached = age > t.slaHours;
            return (
              <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
                <span className="font-mono text-[12px] text-ink-3">{t.id}</span>
                <span className="min-w-0 flex-1 basis-56">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{t.subject}</span>
                  <span className="block truncate text-[12px] text-ink-3">
                    {studentName(t.studentId)} · escalated to {staffName(t.escalatedTo)}
                  </span>
                </span>
                <StatusPill status={t.category} tone="neutral" size="sm" dot={false} />
                <StatusPill status={breached ? "Breached" : "Pending"} size="sm">
                  {breached ? `SLA breached · ${age}h open` : `${t.slaHours - age}h left`}
                </StatusPill>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ report link card */

function ReportLink({
  href,
  icon,
  title,
  figures,
  note,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  figures: { label: string; value: string }[];
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group block min-w-0 rounded-[var(--radius-lg)] border border-line bg-surface p-5 transition-[border-color,transform] duration-150 hover:-translate-y-px hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 place-items-center rounded-[10px] bg-surface-inv text-cta [&>svg]:size-4.5">{icon}</span>
        <ArrowRight className="size-4 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
      </div>
      <h3 className="mt-3 text-[15px] font-bold text-ink">{title}</h3>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {figures.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="truncate text-[12px] text-ink-3">{f.label}</dt>
            <dd className="font-display text-[24px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{f.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[12.5px] text-ink-2 underline decoration-cta decoration-2 underline-offset-4">{note}</p>
    </Link>
  );
}

/* ------------------------------------------------------------------ student activity */

function StudentActivity() {
  const [type, setType] = useState("");
  const [activity, setActivity] = useState("");
  const [risk, setRisk] = useState("");
  const [open, setOpen] = useState<Student | null>(null);

  const rows = useMemo(
    () =>
      allStudents.filter(
        (s) =>
          (!type || s.type === type) &&
          (!risk || s.risk.level === risk) &&
          (!activity ||
            (activity === "week" && s.lastActiveDaysAgo <= 7) ||
            (activity === "inactive" && s.lastActiveDaysAgo >= 14)),
      ),
    [type, activity, risk],
  );

  const columns: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={s.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{s.name}</span>
            <span className="block text-[12px] text-ink-3">
              {universityById(s.universityId)?.shortName ?? programmeById(s.programmeId)?.name}
            </span>
          </span>
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (s) => (
        <Badge tone={s.type === "graduate" ? "dark" : "info"}>{s.type === "graduate" ? "Graduate" : "Undergraduate"}</Badge>
      ),
    },
    {
      key: "lastActive",
      header: "Last active",
      sortable: true,
      sortValue: (s) => s.lastActiveDaysAgo,
      render: (s) => (
        <span className={s.lastActiveDaysAgo >= 14 ? "font-semibold text-rose" : "text-ink-2"}>
          {daysAgoLabel(s.lastActiveDaysAgo)}
        </span>
      ),
    },
    {
      key: "classes",
      header: "Classes attended",
      sortable: true,
      sortValue: (s) => s.attendance.pct,
      render: (s) =>
        s.attendance.total === 0 ? (
          <span className="text-ink-3">Not started</span>
        ) : (
          <span className="tnum">
            {s.attendance.attended} of {s.attendance.total} <span className="text-ink-3">· {s.attendance.pct}%</span>
          </span>
        ),
    },
    {
      key: "mocks",
      header: "Mocks",
      sortable: true,
      sortValue: (s) => s.mocks.filter((m) => m.status === "completed").length,
      render: (s) => (
        <span className="tnum">
          {s.mocks.filter((m) => m.status === "completed").length} done
          {s.missedMocks ? <span className="text-rose"> · {s.missedMocks} missed</span> : null}
        </span>
      ),
    },
    {
      key: "hours",
      header: "Study hours, last week",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (s) => s.activityHours[s.activityHours.length - 1] ?? 0,
      render: (s) => `${s.activityHours[s.activityHours.length - 1] ?? 0}h`,
    },
    {
      key: "readiness",
      header: "Readiness score",
      sortable: true,
      sortValue: (s) => s.readiness.overall,
      render: (s) => <ScoreBar value={s.readiness.overall} className="w-28" height={6} />,
    },
    {
      key: "risk",
      header: "Risk",
      sortable: true,
      sortValue: (s) => ({ low: 0, medium: 1, high: 2 })[s.risk.level],
      render: (s) => <RiskBadge level={s.risk.level} />,
    },
  ];

  return (
    <>
      <DataTable
        caption="Student activity"
        rows={rows}
        columns={columns}
        getRowId={(s) => s.id}
        initialSort={{ key: "lastActive", dir: "desc" }}
        search={{ placeholder: "Search students", match: (s, q) => s.name.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(type || activity || risk)}
            onClear={() => {
              setType("");
              setActivity("");
              setRisk("");
            }}
          >
            <FilterSelect
              label="Type"
              allLabel="All types"
              value={type}
              onChange={setType}
              options={[
                { value: "graduate", label: "Graduate" },
                { value: "undergraduate", label: "Undergraduate" },
              ]}
            />
            <FilterSelect
              label="Activity"
              allLabel="Any activity"
              value={activity}
              onChange={setActivity}
              options={[
                { value: "week", label: "Active this week" },
                { value: "inactive", label: "Inactive 14+ days" },
              ]}
            />
            <FilterSelect
              label="Risk"
              allLabel="Any risk"
              value={risk}
              onChange={setRisk}
              options={[
                { value: "high", label: "High" },
                { value: "medium", label: "Medium" },
                { value: "low", label: "Low" },
              ]}
            />
          </FilterBar>
        }
        onRowClick={setOpen}
        rowLabel={(s) => `Open activity for ${s.name}`}
      />
      <Drawer
        open={open != null}
        onClose={() => setOpen(null)}
        title={open?.name ?? "Student"}
        sub={
          open
            ? `${open.type === "graduate" ? "Graduate learner" : "University undergraduate"} · ${
                universityById(open.universityId)?.name ?? programmeById(open.programmeId)?.name
              }`
            : undefined
        }
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              if (open) toast({ title: `Report queued: activity-${open.id}.csv`, tone: "info" });
            }}
          >
            <Download className="size-4" />
            Export activity
          </Button>
        }
      >
        {open ? (
          <div className="space-y-5 px-5 py-5">
            <div>
              <MiniLabel>Study hours per week</MiniLabel>
              <div className="mt-3">
                <BarChart data={open.activityHours} labels={activityWeekLabels} height={120} highlight={open.activityHours.length - 1} />
              </div>
            </div>
            <dl>
              <DataRow label="Last active">{daysAgoLabel(open.lastActiveDaysAgo)}</DataRow>
              <DataRow label="Current paper">{open.currentPaper ?? "None"}</DataRow>
              <DataRow label="Attendance in ACCA sessions">
                {open.attendance.total === 0 ? "Not started" : `${open.attendance.pct}% · ${open.attendance.missedClasses} missed`}
              </DataRow>
              <DataRow label="Mocks completed">
                {open.mocks.filter((m) => m.status === "completed").length} · {open.missedMocks} missed
              </DataRow>
              <DataRow label="Readiness score">{open.readiness.overall}</DataRow>
              <DataRow label="Mentor">{staffName(open.mentorId)}</DataRow>
            </dl>
            {open.risk.reasons.length ? (
              <div>
                <MiniLabel>Risk reasons</MiniLabel>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {open.risk.reasons.map((r) => (
                    <StatusPill key={r} status={r} tone={open.risk.level === "high" ? "rose" : "amber"} size="sm" />
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </Drawer>
    </>
  );
}

/* ------------------------------------------------------------------ faculty activity */

function FacultyActivity() {
  const columns: DataTableColumn<FacultyRow>[] = [
    {
      key: "name",
      header: "Faculty",
      sortable: true,
      sortValue: (r) => staffName(r.staffId),
      render: (r) => {
        const s = staffById(r.staffId);
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={s?.name ?? ""} size="sm" />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{s?.name}</span>
              <span className="block text-[12px] text-ink-3">{s?.focusPapers.join(", ")}</span>
            </span>
          </span>
        );
      },
    },
    { key: "classesTaught30d", header: "Classes taught", align: "right", mono: true, sortable: true },
    { key: "recordingsUploaded30d", header: "Recordings uploaded", align: "right", mono: true, sortable: true },
    { key: "questionsAnswered30d", header: "Questions answered", align: "right", mono: true, sortable: true },
    { key: "scriptsGraded30d", header: "Scripts graded", align: "right", mono: true, sortable: true },
    {
      key: "contentPublished30d",
      header: "Content published",
      align: "right",
      sortable: true,
      render: (r) =>
        r.contentPublished30d === 0 ? (
          <span className="text-ink-3">Submits for review</span>
        ) : (
          <span className="font-mono">{r.contentPublished30d}</span>
        ),
    },
    {
      key: "avgResponseHours",
      header: "Avg response",
      align: "right",
      sortable: true,
      render: (r) => (
        <span className={r.avgResponseHours > 12 ? "font-mono text-amber" : "font-mono"}>{r.avgResponseHours}h</span>
      ),
    },
    { key: "lastActive", header: "Last active", render: () => "Today" },
  ];
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] text-ink-3">Last 30 days. Response time is the average wait on a student question.</p>
      <DataTable caption="Faculty activity" rows={facultyActivity} columns={columns} getRowId={(r) => r.staffId} initialSort={{ key: "classesTaught30d", dir: "desc" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ mentor activity */

function MentorActivity() {
  const columns: DataTableColumn<MentorRow>[] = [
    {
      key: "name",
      header: "Mentor",
      sortable: true,
      sortValue: (r) => staffName(r.staffId),
      render: (r) => {
        const s = staffById(r.staffId);
        return (
          <span className="flex min-w-0 items-center gap-2.5">
            <Avatar name={s?.name ?? ""} size="sm" />
            <span className="min-w-0">
              <span className="block font-semibold text-ink">{s?.name}</span>
              <span className="block text-[12px] text-ink-3">{s?.title}</span>
            </span>
          </span>
        );
      },
    },
    {
      key: "team",
      header: "Team",
      render: (r) =>
        staffById(r.staffId)?.kind === "career" ? (
          <Badge tone="violet">Career team</Badge>
        ) : (
          <Badge tone="info">Academic mentor</Badge>
        ),
    },
    {
      key: "students",
      header: "Students in scope",
      align: "right",
      sortable: true,
      render: (r) => (
        <span className="font-mono">
          {r.students}
          {staffById(r.staffId)?.kind === "career" ? <span className="text-ink-3"> eligible</span> : null}
        </span>
      ),
    },
    { key: "sessions30d", header: "Sessions", align: "right", mono: true, sortable: true },
    { key: "alertsActioned30d", header: "Alerts actioned", align: "right", mono: true, sortable: true },
    { key: "remindersSent30d", header: "Reminders sent", align: "right", mono: true, sortable: true },
    { key: "interventionsOpen", header: "Interventions open", align: "right", mono: true, sortable: true },
    { key: "placementsMoved30d", header: "Placement moves", align: "right", mono: true, sortable: true },
  ];
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
        <CalendarClock className="size-3.5" aria-hidden /> Last 30 days. Mentors see allocated students; the career team sees placement-eligible learners.
      </p>
      <DataTable caption="Mentor activity" rows={mentorActivity} columns={columns} getRowId={(r) => r.staffId} />
      <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
        <GraduationCap className="size-3.5" aria-hidden /> {allStudents.filter((s) => s.lastActiveDaysAgo >= 14).length} learners inactive for 14 days or more are flagged to their mentor.
      </p>
    </div>
  );
}
