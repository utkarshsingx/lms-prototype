"use client";

import { useMemo, useState } from "react";
import { BadgeCheck, CalendarCheck2, CalendarOff, Download, FileBadge, GraduationCap, IdCard, Info, ScrollText } from "lucide-react";
import {
  ACCA_TODAY,
  APPLIED_KNOWLEDGE,
  blackoutsForUniversity,
  exemptionRules,
  formatAccaDate,
  formatGBP,
  paperName,
  type ExamBooking,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { Tabs } from "@/components/ui/tabs";
import { ScoreBar } from "@/components/ui/score";
import { StackedBar } from "@/components/ui/charts";
import { formatRange } from "@/components/ui/calendar";
import { inBlackout, intakeShort, rollNumber, universityStudents } from "./data";
import { plural, queueReport, RecordsNote, UniversityHeader, useUniversityWorkspace } from "./shared";

const TAB_IDS = ["registrations", "exemptions", "bookings", "results"] as const;
type TabId = (typeof TAB_IDS)[number];

function StudentCell({ s }: { s: Student }) {
  return (
    <span className="block min-w-0">
      <span className="block font-semibold text-ink">{s.name}</span>
      <span className="block font-mono text-[11.5px] text-ink-3">
        {rollNumber(s.id)} · {intakeShort(s.intakeId).replace(" intake", "")} · {s.section}
      </span>
    </span>
  );
}

const byName = (s: Student) => s.name;

export function UniversityAccaPage({ initialTab }: { initialTab?: string }) {
  const { uni } = useUniversityWorkspace();
  const roster = useMemo(() => universityStudents(uni.id), [uni.id]);
  const start = (TAB_IDS as readonly string[]).includes(initialTab ?? "") ? (initialTab as TabId) : "registrations";
  const [tab, setTab] = useState<TabId>(start);

  const bookings = useMemo(
    () => roster.flatMap((s) => s.examBookings.map((b) => ({ ...b, student: s }))),
    [roster],
  );
  const results = useMemo(
    () =>
      roster.flatMap((s) =>
        Object.values(s.papers).flatMap((p) =>
          p.attempts.map((a, i) => ({ ...a, id: `${s.id}-${p.code}-${a.date}`, paper: p.code, attemptNo: i + 1, student: s })),
        ),
      ),
    [roster],
  );

  const tabs = [
    { id: "registrations", label: "ACCA registrations" },
    { id: "exemptions", label: "Exemptions" },
    { id: "bookings", label: "Exam bookings", count: bookings.filter((b) => b.status === "booked" && b.date >= ACCA_TODAY).length },
    { id: "results", label: "Paper attempts and results" },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-6">
      <UniversityHeader
        section="Students"
        title="ACCA progress"
        sub="View ACCA registrations, exemptions, exam bookings, and paper attempts and results for your students. Records are maintained by the ZSkillup programme team."
        actions={
          <Button variant="outline" onClick={() => queueReport(`${uni.workspace.slug}-acca-${tab}.csv`, tabs.find((t) => t.id === tab)?.label)}>
            <Download className="size-4" />
            Export this view
          </Button>
        }
      />

      <Tabs items={tabs} value={tab} onChange={(id) => setTab(id as TabId)} />

      {tab === "registrations" ? <RegistrationsTab roster={roster} /> : null}
      {tab === "exemptions" ? <ExemptionsTab roster={roster} /> : null}
      {tab === "bookings" ? <BookingsTab bookings={bookings} /> : null}
      {tab === "results" ? <ResultsTab results={results} /> : null}

      <RecordsNote total={uni.headline.students} listed={roster.length} />
    </div>
  );
}

/* ------------------------------------------------------------------ registrations */

const REG_LABEL: Record<Student["registration"]["status"], string> = {
  registered: "Registered",
  pending: "Registration pending",
  "not-registered": "Not registered",
};

function RegistrationsTab({ roster }: { roster: Student[] }) {
  const { uni } = useUniversityWorkspace();
  const [reg, setReg] = useState("");
  const [sub, setSub] = useState("");
  const [intake, setIntake] = useState("");

  const rows = roster.filter(
    (s) => (!reg || s.registration.status === reg) && (!sub || s.subscription.status === sub) && (!intake || s.intakeId === intake),
  );
  const count = (f: (s: Student) => boolean) => roster.filter(f).length;

  const columns: DataTableColumn<Student>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: byName, render: (s) => <StudentCell s={s} /> },
    { key: "accaId", header: "ACCA ID", mono: true, sortable: true, render: (s) => s.accaId ?? <span className="text-ink-3">Not issued</span> },
    {
      key: "registration",
      header: "ACCA registration",
      sortable: true,
      sortValue: (s) => s.registration.status,
      render: (s) => <StatusPill status={s.registration.status}>{REG_LABEL[s.registration.status]}</StatusPill>,
    },
    {
      key: "registered",
      header: "Registered on",
      sortable: true,
      sortValue: (s) => s.registration.date,
      render: (s) => (s.registration.date ? formatAccaDate(s.registration.date) : <span className="text-ink-3">Documents with the programme team</span>),
    },
    {
      key: "subscription",
      header: "Annual subscription",
      sortable: true,
      sortValue: (s) => s.subscription.status,
      render: (s) =>
        s.subscription.status === "not-applicable" ? (
          <StatusPill status="not-due">Not due yet</StatusPill>
        ) : (
          <StatusPill status={s.subscription.status}>
            {s.subscription.status === "paid" ? "Paid" : "Overdue"}
          </StatusPill>
        ),
    },
    {
      key: "due",
      header: "Next due",
      sortable: true,
      sortValue: (s) => s.subscription.dueDate,
      render: (s) => (s.subscription.dueDate ? formatAccaDate(s.subscription.dueDate) : "After registration"),
    },
    {
      key: "amount",
      header: "Paid to ACCA",
      align: "right",
      mono: true,
      render: (s) => (s.subscription.paidOn ? `${formatGBP(s.subscription.amountGBP)} · ${formatAccaDate(s.subscription.paidOn)}` : "None"),
    },
  ];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile hero label="ACCA registered" value={`${uni.headline.registeredPct}%`} icon={<IdCard />} sub={`of ${uni.headline.students} students`} />
        <KpiTile label="Registration pending" value={count((s) => s.registration.status === "pending")} tone="amber" sub="With the programme team" />
        <KpiTile label="Not registered" value={count((s) => s.registration.status === "not-registered")} tone="neutral" sub="Registration not started" />
        <KpiTile label="Subscription overdue" value={count((s) => s.subscription.status === "overdue")} tone="rose" sub="Annual subscription due 1 Jan" goodWhen="down" />
      </KpiRow>
      <DataTable
        caption="ACCA registrations"
        rows={rows}
        columns={columns}
        getRowId={(s) => s.id}
        pageSize={20}
        search={{ placeholder: "Search name or ACCA ID", match: (s, q) => s.name.toLowerCase().includes(q) || (s.accaId ?? "").includes(q) }}
        filters={
          <FilterBar
            active={Boolean(reg || sub || intake)}
            onClear={() => {
              setReg("");
              setSub("");
              setIntake("");
            }}
          >
            <FilterSelect label="Intake" allLabel="All" value={intake} onChange={setIntake} options={[...new Set(roster.map((s) => s.intakeId))].map((id) => ({ value: id, label: intakeShort(id) }))} />
            <FilterSelect label="Registration" allLabel="All" value={reg} onChange={setReg} options={Object.entries(REG_LABEL).map(([value, label]) => ({ value, label }))} />
            <FilterSelect
              label="Subscription"
              allLabel="All"
              value={sub}
              onChange={setSub}
              options={[
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "not-applicable", label: "Not due yet" },
              ]}
            />
          </FilterBar>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ exemptions */

function akState(s: Student, code: PaperCode) {
  return s.papers[code]?.status ?? "not-started";
}

function ExemptionsTab({ roster }: { roster: Student[] }) {
  const [claim, setClaim] = useState("");
  const rows = roster.filter((s) => !claim || s.exemptionClaim.status === claim);
  const exemptPapers = roster.reduce((n, s) => n + s.exemptions.filter((e) => e.state === "approved").length, 0);
  const pendingDocs = roster.filter((s) => s.exemptions.some((e) => e.documents.some((d) => d.status !== "verified"))).length;
  const akByExam = roster.filter((s) => APPLIED_KNOWLEDGE.every((p) => s.papers[p]?.status === "passed")).length;

  const columns: DataTableColumn<Student>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: byName, render: (s) => <StudentCell s={s} /> },
    {
      key: "claim",
      header: "Exemption claim",
      sortable: true,
      sortValue: (s) => s.exemptionClaim.status,
      render: (s) => <StatusPill status={s.exemptionClaim.status === "none" ? "not-claimed" : s.exemptionClaim.status}>{s.exemptionClaim.status === "none" ? "None claimed" : undefined}</StatusPill>,
    },
    {
      key: "exempt",
      header: "Papers exempt",
      render: (s) => {
        const list = s.exemptions.filter((e) => e.state === "approved").map((e) => e.paper);
        return list.length ? list.join(", ") : <span className="text-ink-3">None</span>;
      },
    },
    {
      key: "ak",
      header: "Applied Knowledge (BT, MA, FA)",
      render: (s) => (
        <span className="flex gap-1.5">
          {APPLIED_KNOWLEDGE.map((p) => (
            <StatusPill key={p} status={akState(s, p)} size="sm" dot={false}>
              {p} {akState(s, p).replace("-", " ")}
            </StatusPill>
          ))}
        </span>
      ),
    },
    { key: "note", header: "Note", wrap: true, render: (s) => <span className="text-[12.5px] text-ink-2">{s.exemptionClaim.note}</span> },
  ];

  return (
    <div className="space-y-5">
      <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
        <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-info-soft text-info">
          <Info className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-ink">Brightwater learners follow the integrated route</h2>
          <p className="mt-1 max-w-3xl text-[13.5px] leading-relaxed text-ink-2">
            Applied Knowledge and Applied Skills papers are sat alongside the degree, so no exemptions are claimed for them. A learner who joins
            with a prior qualification is evaluated by the ZSkillup programme team: estimated exemptions, the ACCA decision and exemption fees
            paid to ACCA then show here.
          </p>
        </div>
      </Card>

      <KpiRow cols={4}>
        <KpiTile label="Exemption claims" value={roster.filter((s) => s.exemptionClaim.status !== "none").length} icon={<FileBadge />} sub="Integrated route" />
        <KpiTile label="Papers exempt" value={exemptPapers} tone="jade" icon={<BadgeCheck />} sub="ACCA-approved" />
        <KpiTile label="Documents pending" value={pendingDocs} tone="amber" icon={<ScrollText />} sub="With the programme team" />
        <KpiTile label="Applied Knowledge by exam" value={akByExam} tone="info" icon={<GraduationCap />} sub="BT, MA and FA passed" />
      </KpiRow>

      <DataTable
        caption="Exemptions"
        rows={rows}
        columns={columns}
        getRowId={(s) => s.id}
        pageSize={20}
        search={{ placeholder: "Search name", match: (s, q) => s.name.toLowerCase().includes(q) }}
        filters={
          <FilterSelect
            label="Claim"
            allLabel="All"
            value={claim}
            onChange={setClaim}
            options={[
              { value: "none", label: "None claimed" },
              { value: "documents-pending", label: "Documents pending" },
              { value: "estimated", label: "Estimated" },
              { value: "decided", label: "ACCA decided" },
            ]}
          />
        }
      />

      <Card className="min-w-0">
        <CardHeader title="Exemption rules for lateral entry" sub="Set by ZSkillup. ACCA confirms every exemption and charges a fee per exempt paper." />
        <div className="px-5 pb-5">
          <DataTable
            bare
            dense
            caption="Exemption rules"
            rows={exemptionRules}
            getRowId={(r) => r.id}
            pageSize={10}
            columns={[
              { key: "qualification", header: "Qualification", render: (r) => <span className="font-semibold text-ink">{r.qualification}</span> },
              { key: "papers", header: "Estimated exemptions", mono: true, render: (r) => (r.exemptPapers.length ? r.exemptPapers.join(", ") : "None") },
              { key: "conditions", header: "Conditions", wrap: true, render: (r) => <span className="text-[12.5px] text-ink-2">{r.conditions}</span> },
              { key: "status", header: "Status", render: (r) => <StatusPill status={r.status} size="sm" /> },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ exam bookings */

type BookingRow = ExamBooking & { student: Student };

function BookingsTab({ bookings }: { bookings: BookingRow[] }) {
  const { uni } = useUniversityWorkspace();
  const blackout = blackoutsForUniversity(uni.id);
  const nextBlackout = blackout.find((b) => b.end >= ACCA_TODAY);
  const [when, setWhen] = useState("upcoming");
  const [paper, setPaper] = useState("");
  const [status, setStatus] = useState("");
  const [clashOnly, setClashOnly] = useState("");

  const clashOf = (b: BookingRow) => (b.status === "sat" || b.status === "cancelled" ? undefined : inBlackout(b.date, blackout));

  const rows = bookings.filter(
    (b) =>
      (when === "all" || (when === "upcoming" ? b.date >= ACCA_TODAY : b.date < ACCA_TODAY)) &&
      (!paper || b.paper === paper) &&
      (!status || b.status === status) &&
      (!clashOnly || Boolean(clashOf(b))),
  );
  const upcoming = bookings.filter((b) => b.date >= ACCA_TODAY);
  const clashes = upcoming.filter((b) => clashOf(b));

  const columns: DataTableColumn<BookingRow>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: (b) => b.student.name, render: (b) => <StudentCell s={b.student} /> },
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      render: (b) => (
        <span className="text-ink-2">
          <span className="font-mono font-semibold text-ink">{b.paper}</span> {paperName(b.paper)}
        </span>
      ),
    },
    { key: "date", header: "Exam date", sortable: true, render: (b) => formatAccaDate(b.date) },
    {
      key: "entryWindow",
      header: "Entry",
      sortable: true,
      render: (b) => (b.entryWindow === "on-demand" ? "On-demand CBE" : `${b.entryWindow[0].toUpperCase()}${b.entryWindow.slice(1)} entry`),
    },
    { key: "status", header: "Booking", sortable: true, render: (b) => <StatusPill status={b.status} /> },
    { key: "bookedOn", header: "Booked on", sortable: true, render: (b) => (b.bookedOn ? formatAccaDate(b.bookedOn) : <span className="text-ink-3">Not yet</span>) },
    {
      key: "fee",
      header: "ACCA exam fee",
      align: "right",
      sortable: true,
      sortValue: (b) => b.feeStatus,
      render: (b) => (
        <span className="inline-flex items-center gap-2">
          <span className="font-mono">{formatGBP(b.feeGBP)}</span>
          <StatusPill status={b.feeStatus} size="sm" />
        </span>
      ),
    },
    { key: "centre", header: "Centre", className: "text-ink-2" },
    {
      key: "clash",
      header: "University calendar",
      render: (b) => {
        const clash = clashOf(b);
        return clash ? (
          <StatusPill status="Blackout clash" tone="rose">
            Inside university examinations
          </StatusPill>
        ) : (
          <span className="text-[12.5px] text-ink-3">Clear</span>
        );
      },
    },
  ];

  const papers = [...new Set(bookings.map((b) => b.paper))];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile label="Booked" value={upcoming.filter((b) => b.status === "booked").length} tone="info" icon={<CalendarCheck2 />} sub="Upcoming exams" />
        <KpiTile label="Planned, not yet booked" value={upcoming.filter((b) => b.status === "planned").length} tone="amber" sub="Not yet booked with ACCA" />
        <KpiTile label="Not booked" value={upcoming.filter((b) => b.status === "not-booked").length} tone="neutral" sub="Current paper without a date" goodWhen="down" />
        <KpiTile label="Inside university examinations" value={clashes.length} tone="rose" icon={<CalendarOff />} sub="Need rebooking" goodWhen="down" />
      </KpiRow>

      {nextBlackout ? (
        <p className="flex items-start gap-2.5 rounded-[14px] border border-rose/30 bg-rose-soft px-4 py-3 text-[13px] text-ink">
          <CalendarOff aria-hidden className="mt-0.5 size-4 shrink-0 text-rose" />
          <span>
            <span className="font-semibold">University examinations {formatRange(nextBlackout.start, nextBlackout.end)}.</span> ACCA exam bookings in
            this period are flagged and the programme team asks the student to rebook.
          </span>
        </p>
      ) : null}

      <DataTable
        caption="Exam bookings"
        rows={rows}
        columns={columns}
        getRowId={(b) => b.id}
        pageSize={15}
        initialSort={{ key: "date", dir: "asc" }}
        rowClassName={(b) => (clashOf(b) ? "bg-rose-soft/40" : undefined)}
        search={{ placeholder: "Search name or paper", match: (b, q) => b.student.name.toLowerCase().includes(q) || b.paper.toLowerCase().includes(q) }}
        filters={
          <FilterBar
            active={Boolean(when !== "upcoming" || paper || status || clashOnly)}
            onClear={() => {
              setWhen("upcoming");
              setPaper("");
              setStatus("");
              setClashOnly("");
            }}
          >
            <FilterSelect
              label="When"
              value={when}
              onChange={setWhen}
              options={[
                { value: "upcoming", label: "Upcoming" },
                { value: "past", label: "Sat" },
                { value: "all", label: "All" },
              ]}
            />
            <FilterSelect label="Paper" allLabel="All" value={paper} onChange={setPaper} options={papers} />
            <FilterSelect
              label="Booking"
              allLabel="All"
              value={status}
              onChange={setStatus}
              options={[
                { value: "booked", label: "Booked" },
                { value: "planned", label: "Planned" },
                { value: "not-booked", label: "Not booked" },
                { value: "sat", label: "Sat" },
              ]}
            />
            <FilterSelect label="Calendar" allLabel="All" value={clashOnly} onChange={setClashOnly} options={[{ value: "clash", label: "Blackout clashes" }]} />
          </FilterBar>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ attempts and results */

type ResultRow = { id: string; paper: PaperCode; attemptNo: number; student: Student; date: string; label: string; score: number | null; result: "passed" | "failed" | "pending" | "absent" };

function ResultsTab({ results }: { results: ResultRow[] }) {
  const [paper, setPaper] = useState("");
  const [result, setResult] = useState("");
  const rows = results.filter((r) => (!paper || r.paper === paper) && (!result || r.result === result));

  const decided = results.filter((r) => r.result === "passed" || r.result === "failed");
  const passRate = decided.length ? Math.round((decided.filter((r) => r.result === "passed").length / decided.length) * 100) : 0;
  const scored = results.filter((r) => r.score != null);
  const avg = scored.length ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : 0;
  const papers = [...new Set(results.map((r) => r.paper))];

  const columns: DataTableColumn<ResultRow>[] = [
    { key: "name", header: "Student", sortable: true, sortValue: (r) => r.student.name, render: (r) => <StudentCell s={r.student} /> },
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      render: (r) => (
        <span className="text-ink-2">
          <span className="font-mono font-semibold text-ink">{r.paper}</span> {paperName(r.paper)}
        </span>
      ),
    },
    { key: "label", header: "Sitting", sortable: true, sortValue: (r) => r.date, render: (r) => `${r.label} · ${formatAccaDate(r.date)}` },
    { key: "attemptNo", header: "Attempt", align: "center", mono: true, sortable: true },
    {
      key: "score",
      header: "Score",
      sortable: true,
      render: (r) => (r.score == null ? <span className="text-ink-3">Awaiting result</span> : <ScoreBar value={r.score} marker={50} className="w-32" height={6} />),
    },
    { key: "result", header: "Result", sortable: true, render: (r) => <StatusPill status={r.result} /> },
  ];

  return (
    <div className="space-y-5">
      <KpiRow cols={4}>
        <KpiTile label="Paper attempts" value={results.length} icon={<ScrollText />} sub={`${plural(papers.length, "paper")} sat`} />
        <KpiTile label="Pass rate" value={`${passRate}%`} tone="jade" sub="ACCA pass mark 50%" />
        <KpiTile label="Average score" value={`${avg}%`} tone="info" sub="Across all attempts" />
        <KpiTile label="Failed attempts" value={decided.filter((r) => r.result === "failed").length} tone="rose" sub="With a recovery plan" goodWhen="down" />
      </KpiRow>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <Card className="min-w-0 p-5">
          <h2 className="text-[15px] font-bold text-ink">Results by paper</h2>
          <p className="mt-1 mb-4 text-[12.5px] text-ink-3">Attempts passed and failed</p>
          <StackedBar
            rows={papers.map((p) => ({
              label: `${p} ${paperName(p)}`,
              parts: [
                { label: "Passed", value: results.filter((r) => r.paper === p && r.result === "passed").length, tone: "jade" },
                { label: "Failed", value: results.filter((r) => r.paper === p && r.result === "failed").length, tone: "rose" },
              ],
            }))}
          />
        </Card>
        <div className="min-w-0">
          <DataTable
            caption="Paper attempts and results"
            rows={rows}
            columns={columns}
            getRowId={(r) => r.id}
            pageSize={12}
            initialSort={{ key: "label", dir: "desc" }}
            search={{ placeholder: "Search name", match: (r, q) => r.student.name.toLowerCase().includes(q) }}
            filters={
              <FilterBar
                active={Boolean(paper || result)}
                onClear={() => {
                  setPaper("");
                  setResult("");
                }}
              >
                <FilterSelect label="Paper" allLabel="All" value={paper} onChange={setPaper} options={papers} />
                <FilterSelect
                  label="Result"
                  allLabel="All"
                  value={result}
                  onChange={setResult}
                  options={[
                    { value: "passed", label: "Passed" },
                    { value: "failed", label: "Failed" },
                    { value: "pending", label: "Pending" },
                  ]}
                />
              </FilterBar>
            }
          />
        </div>
      </div>
    </div>
  );
}
