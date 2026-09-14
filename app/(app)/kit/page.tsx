"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  Briefcase,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Download,
  FileCheck2,
  GraduationCap,
  IndianRupee,
  Plus,
  Send,
  ShieldCheck,
  UserCheck,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { RiskBadge, StatusPill, type RiskLevel } from "@/components/ui/status";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { HeroBand } from "@/components/ui/hero-band";
import { PageToolbar, ScopeChip, ViewOnlyChip } from "@/components/ui/page-toolbar";
import { RestrictedNotice } from "@/components/ui/restricted";
import { Kanban, type KanbanColumn } from "@/components/ui/kanban";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { Stepper, type Step } from "@/components/ui/stepper";
import { AgendaList, MonthCalendar, formatCalendarDate, type BlackoutRange, type CalendarEvent } from "@/components/ui/calendar";
import { Matrix, MatrixCheck } from "@/components/ui/matrix";
import { FileDrop } from "@/components/ui/file-drop";
import { FormDrawer } from "@/components/ui/form-drawer";
import { ScoreBar, ScoreRing, scoreBand } from "@/components/ui/score";

/* ------------------------------------------------------------ sample data */

type StudentRow = {
  id: string;
  name: string;
  accaId: string | null;
  type: "Graduate" | "Undergraduate";
  cohort: string;
  paper: string;
  readiness: number;
  attendance: number;
  exam: string;
  fee: string;
  risk: RiskLevel;
};

const COHORTS = [
  "FR · Dec 2026 · Weekend",
  "PM Revision and Reattempt · Dec 2026",
  "AA · Dec 2026 · Weekday evening",
  "FM Fast Track · Dec 2026",
  "SBR · Mar 2027 · Weekend",
  "Brightwater · 2025 intake · Semester 3",
  "Brightwater · 2026 intake · Semester 1",
  "Coastline · 2025 intake · Semester 3",
];

const STUDENTS: StudentRow[] = [
  { id: "s-anaya", name: "Anaya Rao", accaId: "4382917", type: "Graduate", cohort: COHORTS[0], paper: "FR", readiness: 64, attendance: 88, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-rohan", name: "Rohan Iyer", accaId: "5129044", type: "Undergraduate", cohort: COHORTS[5], paper: "FA", readiness: 72, attendance: 92, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-ishaan", name: "Ishaan Mehta", accaId: "4417820", type: "Graduate", cohort: COHORTS[1], paper: "PM", readiness: 41, attendance: 63, exam: "Not booked", fee: "Overdue", risk: "high" },
  { id: "s-kavya", name: "Kavya Nair", accaId: "4520193", type: "Graduate", cohort: COHORTS[2], paper: "AA", readiness: 57, attendance: 81, exam: "Not booked", fee: "Paid", risk: "medium" },
  { id: "s-aditya", name: "Aditya Kulkarni", accaId: null, type: "Undergraduate", cohort: COHORTS[6], paper: "BT", readiness: 48, attendance: 70, exam: "Not booked", fee: "Due", risk: "medium" },
  { id: "s-diya", name: "Diya Sharma", accaId: "4603381", type: "Graduate", cohort: COHORTS[3], paper: "FM", readiness: 69, attendance: 90, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-arnav", name: "Arnav Gupta", accaId: "5133907", type: "Undergraduate", cohort: COHORTS[5], paper: "LW", readiness: 55, attendance: 76, exam: "In progress", fee: "Paid", risk: "medium" },
  { id: "s-saanvi", name: "Saanvi Reddy", accaId: "5140226", type: "Undergraduate", cohort: COHORTS[7], paper: "FA", readiness: 78, attendance: 95, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-vihaan", name: "Vihaan Malhotra", accaId: "4391154", type: "Graduate", cohort: COHORTS[4], paper: "SBR", readiness: 62, attendance: 84, exam: "Not booked", fee: "Paid", risk: "low" },
  { id: "s-tara", name: "Tara Menon", accaId: "4478012", type: "Graduate", cohort: COHORTS[0], paper: "FR", readiness: 38, attendance: 52, exam: "Not booked", fee: "Overdue", risk: "high" },
  { id: "s-kabir", name: "Kabir Singh", accaId: "5127735", type: "Undergraduate", cohort: COHORTS[5], paper: "FA", readiness: 66, attendance: 88, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-ananya", name: "Ananya Das", accaId: "4502269", type: "Graduate", cohort: COHORTS[2], paper: "AA", readiness: 73, attendance: 91, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-reyansh", name: "Reyansh Patil", accaId: "5151840", type: "Undergraduate", cohort: COHORTS[7], paper: "LW", readiness: 44, attendance: 58, exam: "Not booked", fee: "Due", risk: "high" },
  { id: "s-myra", name: "Myra Bhatia", accaId: "4611473", type: "Graduate", cohort: COHORTS[3], paper: "FM", readiness: 59, attendance: 79, exam: "Pending", fee: "Paid", risk: "medium" },
  { id: "s-advait", name: "Advait Chauhan", accaId: "5136652", type: "Undergraduate", cohort: COHORTS[6], paper: "BT", readiness: 71, attendance: 94, exam: "In progress", fee: "Paid", risk: "low" },
  { id: "s-riya", name: "Riya Deshmukh", accaId: "4489930", type: "Graduate", cohort: COHORTS[1], paper: "PM", readiness: 52, attendance: 72, exam: "Booked", fee: "Due", risk: "medium" },
  { id: "s-dhruv", name: "Dhruv Saxena", accaId: "4575518", type: "Graduate", cohort: COHORTS[0], paper: "FR", readiness: 81, attendance: 96, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-ira", name: "Ira Banerjee", accaId: "5144409", type: "Undergraduate", cohort: COHORTS[7], paper: "FA", readiness: 63, attendance: 83, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-kiara", name: "Kiara Fernandes", accaId: "4430387", type: "Graduate", cohort: COHORTS[4], paper: "SBR", readiness: 47, attendance: 66, exam: "Not booked", fee: "Overdue", risk: "medium" },
  { id: "s-aarav", name: "Aarav Pandey", accaId: "5129981", type: "Undergraduate", cohort: COHORTS[5], paper: "LW", readiness: 69, attendance: 87, exam: "In progress", fee: "Paid", risk: "low" },
  { id: "s-nisha", name: "Nisha Agarwal", accaId: "4598826", type: "Graduate", cohort: COHORTS[2], paper: "AA", readiness: 35, attendance: 49, exam: "Not booked", fee: "Overdue", risk: "high" },
  { id: "s-yash", name: "Yash Thakur", accaId: "5158813", type: "Undergraduate", cohort: COHORTS[6], paper: "BT", readiness: 58, attendance: 80, exam: "In progress", fee: "Paid", risk: "medium" },
  { id: "s-pooja", name: "Pooja Venkatesh", accaId: "4466271", type: "Graduate", cohort: COHORTS[3], paper: "FM", readiness: 74, attendance: 93, exam: "Booked", fee: "Paid", risk: "low" },
  { id: "s-siddharth", name: "Siddharth Kamath", accaId: "5147730", type: "Undergraduate", cohort: COHORTS[7], paper: "LW", readiness: 61, attendance: 82, exam: "In progress", fee: "Paid", risk: "low" },
];

const RISK_ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

const JOURNEY: Step[] = [
  { id: "bt", label: "BT", sub: "ACCA-approved Mar 2025", state: "exempt" },
  { id: "ma", label: "MA", sub: "ACCA-approved Mar 2025", state: "exempt" },
  { id: "fa", label: "FA", sub: "ACCA-approved Mar 2025", state: "exempt" },
  { id: "lw", label: "LW", sub: "ACCA-approved Mar 2025", state: "exempt" },
  { id: "tx", label: "TX", sub: "Passed Mar 2026 · 58%", state: "done" },
  { id: "pm", label: "PM", sub: "46% Jun 2026 · reattempt Dec", state: "failed" },
  { id: "fr", label: "FR", sub: "Booked Dec 2026", state: "current" },
  { id: "aa", label: "AA", sub: "Planned Mar 2027", state: "upcoming" },
  { id: "fm", label: "FM", sub: "Planned Jun 2027", state: "upcoming" },
  { id: "sbl", label: "SBL", sub: "After Applied Skills", state: "locked" },
  { id: "sbr", label: "SBR", sub: "After Applied Skills", state: "locked" },
  { id: "opt", label: "Options", sub: "Choose two", state: "locked" },
];

const EXEMPTION_FLOW: Step[] = [
  { id: "up", label: "Qualification documents uploaded", sub: "B.Com transcript and degree certificate · 2 Sep 2026", state: "done" },
  { id: "chk", label: "Document check", sub: "Semester 5 marksheet unreadable · re-upload requested 4 Sep 2026", state: "failed" },
  { id: "est", label: "Exemption evaluation", sub: "Estimated: BT, MA, FA · due 18 Sep 2026", state: "current" },
  { id: "acca", label: "Apply to ACCA", sub: "Submitted through myACCA once the estimate is agreed", state: "upcoming" },
  { id: "dec", label: "ACCA decision", sub: "Unlocks after the application is submitted", state: "locked" },
  { id: "fee", label: "Exemption fees", sub: "Paid to ACCA per exempt paper, recorded here", state: "locked" },
];

const BLACKOUT: BlackoutRange[] = [
  { start: "2026-11-23", end: "2026-12-12", label: "Brightwater University examinations" },
];

const EVENTS: CalendarEvent[] = [
  { id: "e1", date: "2026-09-19", title: "FR live class · Revenue from contracts", tone: "info", kind: "Live class", time: "10:00 IST" },
  { id: "e2", date: "2026-09-26", title: "FR live class · Leases", tone: "info", kind: "Live class", time: "10:00 IST" },
  { id: "e3", date: "2026-10-05", title: "Dec 2026 early entry closes", tone: "amber", kind: "Entry deadline" },
  { id: "e4", date: "2026-10-12", title: "Sep 2026 results released", tone: "jade", kind: "Results" },
  { id: "e5", date: "2026-11-02", title: "Dec 2026 standard entry closes", tone: "amber", kind: "Entry deadline" },
  { id: "e6", date: "2026-11-07", title: "FR mock exam 1", tone: "cta", kind: "Mock exam", time: "09:30 IST" },
  { id: "e7", date: "2026-11-09", title: "PM revision · Variance analysis", tone: "info", kind: "Live class", time: "18:30 IST" },
  { id: "e8", date: "2026-11-14", title: "FR live class · Group accounts", tone: "info", kind: "Live class", time: "10:00 IST" },
  { id: "e9", date: "2026-11-14", title: "FA doubt-clearing session", tone: "info", kind: "Doubt clearing", time: "16:00 IST" },
  { id: "e10", date: "2026-11-16", title: "Dec 2026 late entry closes", tone: "rose", kind: "Entry deadline" },
  { id: "e11", date: "2026-11-18", title: "Rohan Iyer · FA on-demand CBE", tone: "info", kind: "Exam booking", time: "11:00 IST" },
  { id: "e12", date: "2026-11-20", title: "Brightwater Semester 3 ends", tone: "neutral", kind: "University calendar" },
  { id: "e13", date: "2026-11-21", title: "FR mock exam 2", tone: "cta", kind: "Mock exam", time: "09:30 IST" },
  { id: "e14", date: "2026-12-07", title: "Dec 2026 exam session opens", tone: "rose", kind: "ACCA exams" },
  { id: "e15", date: "2026-12-08", title: "FR session CBE", tone: "rose", kind: "ACCA exams" },
  { id: "e16", date: "2026-12-10", title: "Dec 2026 exam session closes", tone: "rose", kind: "ACCA exams" },
  { id: "e17", date: "2026-12-19", title: "FR live class · Exam debrief", tone: "info", kind: "Live class", time: "10:00 IST" },
];

type Placement = {
  id: string;
  student: string;
  role: string;
  company: string;
  ats: number;
  crs: number;
  stage: string;
  note: string;
};

const STAGES: KanbanColumn[] = [
  { id: "eligible", title: "Eligible", tone: "neutral", sub: "Matched on eligibility" },
  { id: "shortlisted", title: "Shortlisted", tone: "info" },
  { id: "interview", title: "Interview scheduled", tone: "amber" },
  { id: "offer", title: "Offer", tone: "cta" },
  { id: "joined", title: "Joined", tone: "jade" },
  { id: "closed", title: "Not selected", tone: "rose" },
];

const PLACEMENTS: Placement[] = [
  { id: "pl-1", student: "Anaya Rao", role: "Audit associate", company: "Grant Rowe & Co.", ats: 71, crs: 62, stage: "interview", note: "Panel interview 17 Sep, 11:00 IST" },
  { id: "pl-2", student: "Dhruv Saxena", role: "Financial analyst", company: "Kestrel Capital Advisors", ats: 84, crs: 78, stage: "offer", note: "₹6,20,000 a year · reply by 21 Sep" },
  { id: "pl-3", student: "Ananya Das", role: "Audit trainee", company: "Halden Assurance LLP", ats: 76, crs: 69, stage: "shortlisted", note: "CV sent 11 Sep" },
  { id: "pl-4", student: "Pooja Venkatesh", role: "Accounts payable analyst", company: "Larkfield Global Services", ats: 79, crs: 74, stage: "joined", note: "Joined 1 Sep 2026" },
  { id: "pl-5", student: "Vihaan Malhotra", role: "Reporting associate", company: "Oakridge Shared Services", ats: 68, crs: 60, stage: "eligible", note: "Meets SBR-in-progress rule" },
  { id: "pl-6", student: "Saanvi Reddy", role: "Tax intern · Summer 2027", company: "Coral & Finch Advisory", ats: 73, crs: 58, stage: "shortlisted", note: "Internship · 8 weeks" },
  { id: "pl-7", student: "Kavya Nair", role: "Internal audit intern", company: "Bayview Retail Group", ats: 61, crs: 49, stage: "closed", note: "Feedback: strengthen IFRS 15 answers" },
  { id: "pl-8", student: "Diya Sharma", role: "Treasury analyst", company: "Kestrel Capital Advisors", ats: 70, crs: 66, stage: "interview", note: "Case round 22 Sep, 15:00 IST" },
];

const HISTORY: TimelineItem[] = [
  { id: "h6", title: "Mentor session with Aisha Khan", meta: "14 Sep 2026 · Action plan", body: "Two FR mocks before the 2 Nov standard entry deadline; PM variance drills every Wednesday.", tone: "info", icon: <UserCheck /> },
  { id: "h5", title: "Jun 2026 results recorded", meta: "13 Jul 2026 · Priya Menon", tone: "neutral" },
  { id: "h4", title: "PM failed · 46%", meta: "Jun 2026 session", body: "Moved to PM Revision and Reattempt · Dec 2026 (weekend).", tone: "rose", icon: <ClipboardList /> },
  { id: "h3", title: "TX passed · 58%", meta: "Mar 2026 session", tone: "jade", icon: <BookOpenCheck /> },
  { id: "h2", title: "Exemptions approved by ACCA", meta: "Mar 2025 · BT, MA, FA, LW", body: "Estimated in Jan 2025 from the B.Com transcript. Exemption fees paid to ACCA and recorded.", tone: "jade", icon: <ShieldCheck /> },
  { id: "h1", title: "Registered with ACCA", meta: "12 Feb 2025 · ACCA ID 4382917", tone: "neutral" },
];

const PERSONAS = [
  { id: "p-priya", label: "Priya Menon", sub: "ACCA Programme Lead" },
  { id: "p-imran", label: "Imran Sheikh", sub: "Student Support Executive" },
  { id: "p-deepa", label: "Deepa Iyer", sub: "Finance Operations" },
];
const PERMISSIONS = [
  { id: "programme:ops", label: "Operations", sub: "programme:ops" },
  { id: "programme:acca", label: "ACCA ops", sub: "programme:acca" },
  { id: "programme:universities", label: "Universities", sub: "programme:universities" },
  { id: "programme:support", label: "Support", sub: "programme:support" },
  { id: "finance:view", label: "Finance view", sub: "finance:view" },
  { id: "finance:record", label: "Finance record", sub: "finance:record" },
];
const GRANTS: Record<string, string[]> = {
  "p-priya": ["programme:ops", "programme:acca", "programme:universities", "programme:support", "finance:view", "finance:record"],
  "p-imran": ["programme:ops", "programme:acca", "programme:universities", "programme:support"],
  "p-deepa": ["programme:support", "finance:view", "finance:record"],
};

const SECTIONS = [
  ["hero", "HeroBand"],
  ["kpi", "KpiTile"],
  ["status", "StatusPill"],
  ["table", "DataTable"],
  ["stepper", "Stepper"],
  ["calendar", "MonthCalendar"],
  ["kanban", "Kanban"],
  ["timeline", "Timeline"],
  ["matrix", "Matrix"],
  ["files", "FileDrop"],
  ["score", "Score"],
  ["access", "Access"],
] as const;

/* ------------------------------------------------------------ page */

function KitSection({
  id,
  name,
  file,
  note,
  children,
}: {
  id: string;
  name: string;
  file: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b border-line pb-3">
        <div className="min-w-0">
          <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">{name}</h2>
          <p className="mt-1 max-w-2xl text-[13.5px] text-ink-2">{note}</p>
        </div>
        <code className="rounded-md border border-line bg-surface-2 px-2 py-0.5 font-mono text-[11.5px] text-ink-2">{file}</code>
      </div>
      {children}
    </section>
  );
}

export default function KitPage() {
  /* table */
  const [students, setStudents] = useState<StudentRow[]>(STUDENTS);
  const [typeFilter, setTypeFilter] = useState("");
  const [riskFilter, setRiskFilter] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [added, setAdded] = useState(0);

  const filteredStudents = useMemo(
    () => students.filter((s) => (!typeFilter || s.type === typeFilter) && (!riskFilter || s.risk === riskFilter)),
    [students, typeFilter, riskFilter],
  );

  const columns: DataTableColumn<StudentRow>[] = [
    {
      key: "name",
      header: "Student",
      sortable: true,
      render: (s) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar name={s.name} size="sm" />
          <span className="min-w-0">
            <span className="block font-semibold text-ink">{s.name}</span>
            <span className="block text-[12px] text-ink-3">{s.type}</span>
          </span>
        </span>
      ),
    },
    {
      key: "accaId",
      header: "ACCA ID",
      mono: true,
      sortable: true,
      render: (s) => s.accaId ?? <StatusPill status="Unregistered" size="sm" />,
    },
    { key: "cohort", header: "Cohort", sortable: true, className: "text-ink-2" },
    { key: "paper", header: "Paper", mono: true, sortable: true },
    {
      key: "readiness",
      header: "Readiness",
      sortable: true,
      render: (s) => <ScoreBar value={s.readiness} className="w-28" height={6} />,
    },
    { key: "attendance", header: "Attendance", align: "right", mono: true, sortable: true, render: (s) => `${s.attendance}%` },
    { key: "exam", header: "Exam booking", sortable: true, render: (s) => <StatusPill status={s.exam} /> },
    { key: "fee", header: "Fees", sortable: true, render: (s) => <StatusPill status={s.fee} /> },
    {
      key: "risk",
      header: "Risk",
      sortable: true,
      sortValue: (s) => RISK_ORDER[s.risk],
      render: (s) => <RiskBadge level={s.risk} />,
    },
  ];

  /* calendar */
  const [calMonth, setCalMonth] = useState("2026-11");
  const [calDay, setCalDay] = useState<string | null>(null);

  /* kanban */
  const [placements, setPlacements] = useState<Placement[]>(PLACEMENTS);

  /* matrix */
  const [grants, setGrants] = useState<Record<string, string[]>>(GRANTS);
  const [access, setAccess] = useState("edit");
  const viewOnly = access === "view";

  /* files and drawer */
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimates, setEstimates] = useState<{ id: string; student: string; papers: string[]; files: string[] }[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);

  return (
    <div className="mx-auto max-w-[92rem] space-y-12">
      <PageHeader
        eyebrow="Design system"
        title="UI kit"
        sub="Every shared component the ACCA LMS pages are built from, shown with sample programme data. Not linked from navigation."
        actions={
          <Button variant="secondary" onClick={() => toast({ title: "Report queued: ui-kit-inventory.csv", tone: "info" })}>
            <Download className="size-4" />
            Export inventory
          </Button>
        }
      />

      <nav aria-label="Kit sections" className="-mt-6 flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <a
            key={id}
            href={`#${id}`}
            className="rounded-full border border-line bg-surface px-3 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink hover:bg-cta-soft hover:text-ink"
          >
            {label}
          </a>
        ))}
      </nav>

      {/* ---------------------------------------------------------- hero */}
      <KitSection id="hero" name="HeroBand" file="components/ui/hero-band.tsx" note="Opens every dashboard: greeting, two to four white headline figures and a yellow call to action.">
        <HeroBand
          titleAs="h2"
          eyebrow="Programme operations"
          title="Good morning, Priya"
          sub="Monday 14 September 2026 · 6 live classes today, 14 exemption files waiting, and Dec 2026 early entry closes in 21 days."
          actions={
            <>
              <Button onClick={() => toast({ title: "Opening the exemption queue" })}>
                <FileCheck2 className="size-4" />
                Review exemption queue
              </Button>
              <Button variant="inverse" onClick={() => toast({ title: "Opening the programme calendar", tone: "info" })}>
                <CalendarDays className="size-4" />
                Open calendar
              </Button>
            </>
          }
          stats={[
            { label: "Enrolled learners", value: "610", hint: "6 programmes" },
            { label: "Live classes today", value: "6", hint: "2 start before noon" },
            { label: "Open support tickets", value: "23", hint: "5 past turnaround" },
            { label: "Exemption queue", value: "14", hint: "3 new since Friday" },
          ]}
          aside={
            <div className="w-full rounded-[16px] border border-ink-inv/15 bg-ink-inv/5 p-4 lg:w-64">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">Next ACCA deadline</p>
              <p className="mt-2 text-[15px] font-semibold text-ink-inv">Dec 2026 early entry closes</p>
              <p className="mt-1 font-display text-[28px] leading-none font-bold text-cta">5 Oct</p>
              <p className="mt-1.5 text-[12.5px] text-ink-inv/65">21 days away · 186 learners booked</p>
            </div>
          }
        />
      </KitSection>

      {/* ---------------------------------------------------------- kpi */}
      <KitSection id="kpi" name="KpiTile and KpiRow" file="components/ui/kpi.tsx" note="Headline figures. One hero tile per page at most; trend colour follows whether up is good.">
        <KpiRow cols={4}>
          <KpiTile hero label="Dec 2026 exam bookings" value="186" delta="+22 this week" trend="up" icon={<CalendarClock />} sub="of 248 eligible" />
          <KpiTile label="Exemption queue" value="14" delta="+3 since Friday" trend="up" goodWhen="down" tone="amber" icon={<FileCheck2 />} />
          <KpiTile label="Fees overdue" value="₹3,92,000" delta="−₹48,500 this week" trend="down" goodWhen="down" tone="rose" icon={<IndianRupee />} />
          <KpiTile label="Attendance in ACCA sessions" value="84%" delta="No change" trend="flat" tone="jade" icon={<UserCheck />} href="#table" />
        </KpiRow>
      </KitSection>

      {/* ---------------------------------------------------------- status */}
      <KitSection id="status" name="StatusPill and RiskBadge" file="components/ui/status.tsx" note="Pass any status string; common ones map to a tone automatically. Override with tone when a page means something else.">
        <Card className="space-y-4 p-5">
          {[
            ["Success", ["Passed", "Approved", "Paid", "Resolved", "Live", "Verified"]],
            ["Attention", ["Due", "Pending", "In review", "Scheduled", "Estimated"]],
            ["Problem", ["Failed", "Overdue", "Escalated", "At risk", "Rejected"]],
            ["Neutral", ["Draft", "Not started"]],
            ["Informational", ["In progress", "Open", "Booked"]],
          ].map(([group, list]) => (
            <div key={group as string} className="flex flex-wrap items-center gap-2">
              <span className="w-28 shrink-0 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">{group}</span>
              {(list as string[]).map((s) => (
                <StatusPill key={s} status={s} />
              ))}
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 shrink-0 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Risk</span>
            <RiskBadge level="low" />
            <RiskBadge level="medium" />
            <RiskBadge level="high" />
            <StatusPill status="Exemption fee unpaid" size="sm" />
            <StatusPill status="Mock" tone="cta">
              Mock exam
            </StatusPill>
          </div>
        </Card>
      </KitSection>

      {/* ---------------------------------------------------------- table */}
      <KitSection id="table" name="DataTable and FilterBar" file="components/ui/data-table.tsx · filter-bar.tsx" note="Sort by clicking a header, search, filter, select rows for bulk actions, click a row to open it. Wide tables scroll inside their own frame.">
        <DataTable
          caption="Students"
          rows={filteredStudents}
          columns={columns}
          getRowId={(s) => s.id}
          search={{
            placeholder: "Search name, ACCA ID or cohort",
            match: (s, q) => s.name.toLowerCase().includes(q) || (s.accaId ?? "").includes(q) || s.cohort.toLowerCase().includes(q),
          }}
          filters={
            <FilterBar
              active={Boolean(typeFilter || riskFilter)}
              onClear={() => {
                setTypeFilter("");
                setRiskFilter("");
              }}
            >
              <FilterSelect label="Type" allLabel="All" value={typeFilter} onChange={setTypeFilter} options={["Graduate", "Undergraduate"]} />
              <FilterSelect
                label="Risk"
                allLabel="Any"
                value={riskFilter}
                onChange={setRiskFilter}
                options={[
                  { value: "high", label: "High" },
                  { value: "medium", label: "Medium" },
                  { value: "low", label: "Low" },
                ]}
              />
            </FilterBar>
          }
          toolbar={
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add student
            </Button>
          }
          selectable
          bulkActions={(ids, clear) => (
            <>
              <Button
                size="sm"
                variant="inverse"
                onClick={() => {
                  toast({ title: `Reminder sent to ${ids.length} ${ids.length === 1 ? "student" : "students"}`, body: "Dec 2026 standard entry closes 2 Nov 2026." });
                  clear();
                }}
              >
                <Send className="size-3.5" />
                Send reminder
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast({ title: `Aisha Khan assigned to ${ids.length} ${ids.length === 1 ? "student" : "students"}` });
                  clear();
                }}
              >
                <UserCheck className="size-3.5" />
                Assign mentor
              </Button>
            </>
          )}
          onRowClick={(s) => setEditing(s)}
          rowLabel={(s) => `Open ${s.name}`}
          initialSort={{ key: "risk", dir: "desc" }}
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Dense, empty" sub="dense and the default empty state" />
            <div className="px-5 pb-5">
              <DataTable<StudentRow>
                rows={[]}
                columns={columns.slice(0, 4)}
                getRowId={(s) => s.id}
                dense
                empty={
                  <div className="grid place-items-center text-center">
                    <span className="grid size-10 place-items-center rounded-full bg-cta text-cta-ink">
                      <GraduationCap className="size-5" />
                    </span>
                    <p className="mt-3 text-[14px] font-semibold text-ink">No refunds requested</p>
                    <p className="mt-1 text-[13px] text-ink-3">Refund requests from enrolled students appear here.</p>
                  </div>
                }
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Dense, bare inside a card" sub="bare drops the frame when a Card already provides one" />
            <div className="px-5 pb-4">
              <DataTable
                bare
                dense
                pageSize={4}
                rows={STUDENTS.filter((s) => s.risk === "high")}
                getRowId={(s) => s.id}
                columns={[
                  { key: "name", header: "Student", sortable: true, className: "font-semibold" },
                  { key: "paper", header: "Paper", mono: true },
                  { key: "attendance", header: "Attendance", align: "right", mono: true, sortable: true, render: (s) => `${s.attendance}%` },
                  { key: "fee", header: "Fees", render: (s) => <StatusPill status={s.fee} size="sm" /> },
                ]}
              />
            </div>
          </Card>
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- stepper */}
      <KitSection id="stepper" name="Stepper" file="components/ui/stepper.tsx" note="Six states: done, current, upcoming, exempt, failed, locked. Horizontal scrolls in its own frame; vertical suits workflows.">
        <Card className="p-5">
          <p className="mb-3 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Anaya Rao · ACCA journey</p>
          <Stepper steps={JOURNEY} aria-label="Anaya Rao ACCA papers" />
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Myra Bhatia · exemption evaluation</p>
            <Stepper steps={EXEMPTION_FLOW} orientation="vertical" aria-label="Exemption evaluation" />
          </Card>
          <Card className="p-5">
            <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">State reference</p>
            <Stepper
              orientation="vertical"
              steps={[
                { id: "a", label: "done", sub: "Solid jade with a tick", state: "done" },
                { id: "b", label: "current", sub: "Black marker, yellow ring", state: "current" },
                { id: "c", label: "upcoming", sub: "Numbered outline", state: "upcoming" },
                { id: "d", label: "exempt", sub: "Dashed jade with a shield", state: "exempt" },
                { id: "e", label: "failed", sub: "Solid rose with a cross", state: "failed" },
                { id: "f", label: "locked", sub: "Muted with a lock", state: "locked" },
              ]}
            />
          </Card>
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- calendar */}
      <KitSection id="calendar" name="MonthCalendar and AgendaList" file="components/ui/calendar.tsx" note="Exam sessions, entry deadlines and classes with the Brightwater examination blackout (23 Nov to 12 Dec 2026). Arrow keys move between days.">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <MonthCalendar
            month={calMonth}
            onMonthChange={(m) => {
              setCalMonth(m);
              setCalDay(null);
            }}
            events={EVENTS}
            blackout={BLACKOUT}
            selected={calDay}
            onSelectDay={(d) => setCalDay((cur) => (cur === d ? null : d))}
          />
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-[14.5px] font-semibold text-ink">
                {calDay ? formatCalendarDate(calDay, "long") : "This month"}
              </h3>
              {calDay ? (
                <Button size="xs" variant="ghost" onClick={() => setCalDay(null)}>
                  Show month
                </Button>
              ) : null}
            </div>
            <AgendaList
              events={EVENTS}
              day={calDay}
              from={calDay ? undefined : `${calMonth}-01`}
              to={calDay ? undefined : `${calMonth}-31`}
              blackout={BLACKOUT}
              empty="Nothing scheduled on this day."
              onSelect={(e) => toast({ title: e.title, body: `${formatCalendarDate(e.date, "long")}${e.time ? ` · ${e.time}` : ""}`, tone: "info" })}
            />
          </Card>
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- kanban */}
      <KitSection id="kanban" name="Kanban" file="components/ui/kanban.tsx" note="Placement pipeline. Each card has a Move to menu (keyboard: arrow keys, Escape); no drag library.">
        <Kanban
          columns={STAGES}
          items={placements}
          getColumn={(p) => p.stage}
          getId={(p) => p.id}
          getLabel={(p) => p.student}
          onMove={(p, to) => {
            setPlacements((list) => list.map((x) => (x.id === p.id ? { ...x, stage: to } : x)));
            toast({ title: `${p.student} moved to ${STAGES.find((s) => s.id === to)?.title}`, body: `${p.role} · ${p.company}` });
          }}
          renderCard={(p) => (
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Avatar name={p.student} size="xs" />
                <p className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{p.student}</p>
              </div>
              <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] text-ink-2">
                <Briefcase aria-hidden className="size-3.5 shrink-0 text-ink-3" />
                <span className="min-w-0 truncate">
                  {p.role} · {p.company}
                </span>
              </p>
              <p className="mt-1 text-[12px] text-ink-3">{p.note}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusPill status="ATS" tone={scoreBand(p.ats).tone} size="sm" dot={false}>
                  ATS {p.ats}
                </StatusPill>
                <StatusPill status="CRS" tone={scoreBand(p.crs).tone} size="sm" dot={false}>
                  Company Readiness {p.crs}
                </StatusPill>
              </div>
            </div>
          )}
        />
      </KitSection>

      {/* ---------------------------------------------------------- timeline */}
      <KitSection id="timeline" name="Timeline" file="components/ui/timeline.tsx" note="Support history, attempt history, audit trails. Tone dots or icons.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Anaya Rao · ACCA record</p>
            <Timeline items={HISTORY} />
          </Card>
          <Card className="p-5">
            <p className="mb-4 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Ticket TK-2041 · dense</p>
            <Timeline
              dense
              items={[
                { id: "t4", title: "Resolved by Imran Sheikh", meta: "12 Sep 2026, 16:40 · turnaround 1 day 3 hours", tone: "jade" },
                { id: "t3", title: "Escalated to Marcus Bell", meta: "11 Sep 2026, 18:05 · academic question", body: "Treatment of NCI at fair value in the FR mock, question 3.", tone: "rose" },
                { id: "t2", title: "Categorised as Exemptions and assigned", meta: "11 Sep 2026, 14:20 · Imran Sheikh", tone: "amber" },
                { id: "t1", title: "Opened by Tara Menon", meta: "11 Sep 2026, 13:32 · web", tone: "neutral" },
              ]}
            />
          </Card>
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- matrix */}
      <KitSection id="matrix" name="Matrix and MatrixCheck" file="components/ui/matrix.tsx" note="Roles by permissions, subjects by syllabus areas. The first column stays put while the grid scrolls.">
        <PageToolbar start={viewOnly ? <ViewOnlyChip /> : <ScopeChip icon={<ShieldCheck />}>3 Programme Admin personas</ScopeChip>}>
          <Segmented
            size="sm"
            value={access}
            onChange={setAccess}
            items={[
              { id: "edit", label: "Editor" },
              { id: "view", label: "View-only" },
            ]}
          />
        </PageToolbar>
        <Matrix
          caption="Programme Admin permissions"
          corner="Persona"
          rows={PERSONAS}
          cols={PERMISSIONS}
          cell={(row, col) => {
            const on = grants[row]?.includes(col) ?? false;
            return (
              <MatrixCheck
                checked={on}
                label={`${PERSONAS.find((p) => p.id === row)?.label}: ${col}`}
                disabled={viewOnly}
                disabledReason="View-only access: ask a ZSkillup Super Admin to change roles"
                onChange={(next) => {
                  setGrants((g) => ({
                    ...g,
                    [row]: next ? [...(g[row] ?? []), col] : (g[row] ?? []).filter((x) => x !== col),
                  }));
                  toast({ title: `${next ? "Granted" : "Removed"} ${col}`, body: PERSONAS.find((p) => p.id === row)?.label });
                }}
              />
            );
          }}
        />
      </KitSection>

      {/* ---------------------------------------------------------- files + drawer */}
      <KitSection id="files" name="FileDrop and FormDrawer" file="components/ui/file-drop.tsx · form-drawer.tsx" note="FileDrop keeps chosen file names (click or drag, nothing uploads). FormDrawer is a Drawer with Cancel and a primary submit.">
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-4 p-5">
            <FileDrop
              label="Upload qualification documents"
              accept=".pdf,.jpg,.png"
              hint="Transcript, degree certificate and marksheets. Up to 10 MB each."
              initialFiles={["BCom-transcript-2024.pdf"]}
              onFiles={(_, newOnes) => {
                if (newOnes.length) toast({ title: `${newOnes.length} ${newOnes.length === 1 ? "file" : "files"} added`, body: newOnes.join(", ") });
              }}
            />
            <FileDrop
              label="Upload academic calendar"
              accept=".pdf,.xlsx"
              disabled
              disabledReason="View-only access: Prof. Lakshmi Rao cannot upload"
              initialFiles={["Brightwater-2026-27-academic-calendar.pdf"]}
            />
          </Card>
          <Card>
            <CardHeader
              title="Estimated exemptions"
              sub="Recorded by the programme team before ACCA confirms"
              action={
                <Button size="sm" onClick={() => setEstimateOpen(true)}>
                  <Plus className="size-4" />
                  Record estimate
                </Button>
              }
            />
            <div className="px-5 pb-5">
              {estimates.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">
                  No estimates recorded in this session. Use Record estimate to open the form drawer.
                </p>
              ) : (
                <ul className="divide-y divide-line rounded-[12px] border border-line">
                  {estimates.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                      <span className="min-w-0">
                        <span className="block text-[13.5px] font-semibold text-ink">{e.student}</span>
                        <span className="block text-[12px] text-ink-3">
                          {e.files.length ? e.files.join(", ") : "No evidence attached"}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {e.papers.map((p) => (
                          <StatusPill key={p} status="Estimated" size="sm">
                            {p} estimated
                          </StatusPill>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- score */}
      <KitSection id="score" name="ScoreRing and ScoreBar" file="components/ui/score.tsx" note="Readiness, ATS and Company Readiness Scores. 70 and above jade, 50 to 69 amber, below 50 rose.">
        <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
          <Card className="flex flex-wrap items-center justify-center gap-6 p-5">
            {[
              { label: "FA readiness · Rohan", value: 72 },
              { label: "FR readiness · Anaya", value: 64 },
              { label: "FR readiness · Tara", value: 38 },
            ].map((s) => (
              <div key={s.label} className="grid justify-items-center gap-2 text-center">
                <ScoreRing value={s.value} size={96} stroke={8} showBand label={s.label} />
                <span className="text-[12px] text-ink-3">{s.label}</span>
              </div>
            ))}
          </Card>
          <Card className="space-y-4 p-5">
            <ScoreBar label="FR readiness score" value={64} marker={50} />
            <ScoreBar label="PM readiness score" value={58} marker={50} />
            <ScoreBar label="ATS score" value={71} />
            <ScoreBar label="Company Readiness Score" value={46} />
            <p className="text-[12px] text-ink-3">The black tick marks the ACCA pass mark of 50%.</p>
          </Card>
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- access */}
      <KitSection id="access" name="PageToolbar, ViewOnlyChip, ScopeChip, RestrictedNotice" file="components/ui/page-toolbar.tsx · restricted.tsx" note="Permission states from the role model: restricted pages, view-only personas and scoped lists.">
        <Card className="space-y-4 p-5">
          <PageToolbar start={<ViewOnlyChip />}>
            <span title="View-only access" className="inline-flex">
              <Button variant="outline" size="sm" disabled>
                Verify records
              </Button>
            </span>
            <span title="View-only access" className="inline-flex">
              <Button size="sm" disabled>
                <Plus className="size-4" />
                Add semester dates
              </Button>
            </span>
          </PageToolbar>
          <PageToolbar start={<ScopeChip>Showing your 18 allocated students</ScopeChip>}>
            <Button variant="outline" size="sm" onClick={() => toast({ title: "Report queued: allocated-students.csv", tone: "info" })}>
              <Download className="size-4" />
              Export
            </Button>
            <Button size="sm" onClick={() => toast({ title: "Mentoring session scheduled", body: "Anaya Rao · 17 Sep 2026, 18:00 IST" })}>
              <CalendarClock className="size-4" />
              Schedule session
            </Button>
          </PageToolbar>
        </Card>
        <div className="rounded-[var(--radius-xl)] border border-dashed border-line-strong bg-paper p-4 sm:p-8">
          <RestrictedNotice permission="finance:view" homeHref="#hero" homeLabel="Back to the top" />
        </div>
      </KitSection>

      {/* ---------------------------------------------------------- drawers */}
      <FormDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add student"
        sub="Creates the learner record and allocates a cohort."
        submitLabel="Add student"
        footerNote="The student receives a welcome email."
        onSubmit={(data) => {
          const name = String(data.get("name") ?? "").trim();
          const type = (String(data.get("type")) as StudentRow["type"]) || "Graduate";
          const next = added + 1;
          setAdded(next);
          setStudents((list) => [
            {
              id: `s-new-${next}`,
              name,
              accaId: String(data.get("acca") ?? "").trim() || null,
              type,
              cohort: String(data.get("cohort")),
              paper: String(data.get("paper")),
              readiness: 50,
              attendance: 100,
              exam: "Not booked",
              fee: "Due",
              risk: "low",
            },
            ...list,
          ]);
          setAddOpen(false);
          toast({ title: "Student added", body: `${name} · ${String(data.get("cohort"))}` });
        }}
      >
        <Field label="Full name">
          <Input name="name" required placeholder="e.g. Neel Joshi" />
        </Field>
        <Field label="ACCA student ID" hint="Optional">
          <Input name="acca" inputMode="numeric" pattern="[0-9]{7}" placeholder="7 digits" className="font-mono" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Student type">
            <Select name="type" defaultValue="Graduate">
              <option>Graduate</option>
              <option>Undergraduate</option>
            </Select>
          </Field>
          <Field label="Current paper">
            <Select name="paper" defaultValue="FR">
              {["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM", "SBL", "SBR"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Cohort">
          <Select name="cohort" defaultValue={COHORTS[0]}>
            {COHORTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
      </FormDrawer>

      <FormDrawer
        open={editing != null}
        onClose={() => setEditing(null)}
        title={editing?.name ?? "Student"}
        sub={editing ? `${editing.type} · ACCA ID ${editing.accaId ?? "not registered"}` : undefined}
        submitLabel="Save changes"
        onSubmit={(data) => {
          if (!editing) return;
          const cohort = String(data.get("cohort"));
          const exam = String(data.get("exam"));
          setStudents((list) => list.map((s) => (s.id === editing.id ? { ...s, cohort, exam } : s)));
          toast({ title: "Student updated", body: `${editing.name} · ${cohort} · exam ${exam.toLowerCase()}` });
          setEditing(null);
        }}
      >
        {editing ? (
          <>
            <div className="flex items-center gap-4 rounded-[16px] border border-line bg-surface-2 p-4">
              <ScoreRing value={editing.readiness} size={64} stroke={6} label={`${editing.paper} readiness score`} />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink">{editing.paper} readiness score</p>
                <p className="text-[12.5px] text-ink-3">
                  Attendance {editing.attendance}% · <RiskBadge level={editing.risk} className="align-middle" />
                </p>
              </div>
            </div>
            <Field label="Cohort">
              <Select name="cohort" defaultValue={editing.cohort} key={`${editing.id}-cohort`}>
                {COHORTS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Exam booking status">
              <Select name="exam" defaultValue={editing.exam} key={`${editing.id}-exam`}>
                {["Booked", "Not booked", "Pending", "In progress"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </>
        ) : null}
      </FormDrawer>

      <FormDrawer
        open={estimateOpen}
        onClose={() => {
          setEstimateOpen(false);
          setEvidence([]);
        }}
        title="Record estimated exemption"
        sub="Estimates are confirmed later by ACCA. Exemption fees are paid to ACCA per exempt paper."
        submitLabel="Record estimate"
        onSubmit={(data) => {
          const papers = data.getAll("papers").map(String);
          if (papers.length === 0) {
            toast({ title: "Choose at least one paper", tone: "warning" });
            return;
          }
          const student = String(data.get("student"));
          setEstimates((list) => [{ id: `est-${list.length + 1}`, student, papers, files: evidence }, ...list]);
          toast({ title: "Estimated exemptions recorded", body: `${student} · ${papers.join(", ")}` });
          setEstimateOpen(false);
          setEvidence([]);
        }}
      >
        <Field label="Student">
          <Select name="student" defaultValue="Myra Bhatia">
            {STUDENTS.filter((s) => s.type === "Graduate").map((s) => (
              <option key={s.id}>{s.name}</option>
            ))}
          </Select>
        </Field>
        <fieldset>
          <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Papers estimated exempt</legend>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["BT", "Business and Technology"],
              ["MA", "Management Accounting"],
              ["FA", "Financial Accounting"],
              ["LW", "Corporate and Business Law"],
            ].map(([code, name]) => (
              <Checkbox key={code} name="papers" value={code} defaultChecked={code !== "LW"} label={`${code} · ${name}`} />
            ))}
          </div>
        </fieldset>
        <FileDrop label="Attach evidence" accept=".pdf,.jpg,.png" onFiles={(all) => setEvidence(all)} />
        <Field label="Evaluator note">
          <Textarea name="note" rows={3} placeholder="e.g. LW not estimated: B.Com Business Law covers contract law only." />
        </Field>
        <p className="flex items-center gap-2 text-[12px] text-ink-3">
          <Wallet className="size-3.5" />
          Fees paid to ACCA (£) are recorded on the student&apos;s payments page.
        </p>
      </FormDrawer>
    </div>
  );
}
