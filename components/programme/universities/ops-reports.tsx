"use client";

import { useState } from "react";
import { FileBarChart2, FileText } from "lucide-react";
import { ACCA_TODAY, cohorts, formatAccaDate, reportCatalogue, type University } from "@/lib/data/acca";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Checkbox, Field, Select } from "@/components/ui/field";
import { StatusPill } from "@/components/ui/status";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { MiniLabel, slug } from "../acca/common";
import { UniversityMark } from "./common";

const UNIVERSITY_REPORTS = reportCatalogue.filter((r) => r.category === "University");

const PERIODS = ["Semester to date", "Last 30 days", "Academic year 2026-27", "Since partnership began"];

export type ReportRun = { id: string; universityId: string; file: string; report: string; scope: string; period: string; by: string; on: string; shared: boolean };

export const SEED_RUNS: ReportRun[] = [
  { id: "run-3", universityId: "u-brightwater", file: "brightwater-university-student-report-all-cohorts.xlsx", report: "University student report", scope: "All cohorts", period: "Semester to date", by: "Priya Menon", on: "2026-09-09", shared: true },
  { id: "run-2", universityId: "u-brightwater", file: "brightwater-university-executive-report-all-cohorts.pdf", report: "University executive report", scope: "All cohorts", period: "Last 30 days", by: "Priya Menon", on: "2026-09-01", shared: true },
  { id: "run-1", universityId: "u-coastline", file: "coastline-university-cohort-report-all-cohorts.csv", report: "University cohort report", scope: "All cohorts", period: "Last 30 days", by: "Imran Sheikh", on: "2026-09-01", shared: false },
];

export function ReportsTab({
  university,
  runs,
  setRuns,
  persona,
}: {
  university: University;
  runs: ReportRun[];
  setRuns: React.Dispatch<React.SetStateAction<ReportRun[]>>;
  persona: string;
}) {
  const uniCohorts = cohorts.filter((c) => c.universityId === university.id);
  const scopes = ["All cohorts", ...uniCohorts.map((c) => c.name), ...uniCohorts.flatMap((c) => c.sections.map((s) => `${c.name} · ${s.name}`))];
  const [settings, setSettings] = useState<Record<string, { scope: string; period: string; format: string; share: boolean }>>(() =>
    Object.fromEntries(UNIVERSITY_REPORTS.map((r) => [r.id, { scope: "All cohorts", period: PERIODS[0], format: r.formats[0], share: true }])),
  );
  const h = university.headline;
  const uniRuns = runs.filter((r) => r.universityId === university.id);

  const generate = (id: string) => {
    const r = UNIVERSITY_REPORTS.find((x) => x.id === id)!;
    const s = settings[id];
    const file = `${university.workspace.slug}-${slug(r.name)}-${slug(s.scope)}.${s.format.toLowerCase()}`;
    setRuns((list) => [
      { id: `run-${list.length + 1}`, universityId: university.id, file, report: r.name, scope: s.scope, period: s.period, by: persona, on: ACCA_TODAY, shared: s.share },
      ...list,
    ]);
    toast({
      title: `Report queued: ${file}`,
      body: `${s.period}${s.share ? ` · shared with ${university.contact.name}` : ""}`,
      tone: "info",
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        {UNIVERSITY_REPORTS.map((r) => {
          const s = settings[r.id];
          const set = (patch: Partial<typeof s>) => setSettings((all) => ({ ...all, [r.id]: { ...all[r.id], ...patch } }));
          return (
            <Card key={r.id} className="flex min-w-0 flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface-inv text-cta">
                  <FileText aria-hidden className="size-5" />
                </span>
                {r.containsPII ? <StatusPill status="Personal data" tone="amber" size="sm" /> : <StatusPill status="Aggregated" tone="neutral" size="sm" />}
              </div>
              <p className="mt-3 font-display text-[17px] leading-tight font-bold tracking-[-0.02em] text-ink">{r.name}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-3">{r.description}</p>
              <div className="mt-4 flex-1 space-y-3">
                <Field label="Scope">
                  <Select value={s.scope} onChange={(e) => set({ scope: e.target.value })}>
                    {scopes.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Period">
                  <Select value={s.period} onChange={(e) => set({ period: e.target.value })}>
                    {PERIODS.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </Select>
                </Field>
                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-ink-2">Format</p>
                  <Segmented size="sm" value={s.format} onChange={(f) => set({ format: f })} items={r.formats.map((f) => ({ id: f, label: f }))} />
                </div>
                <Checkbox checked={s.share} onChange={(e) => set({ share: e.target.checked })} label={`Share with ${university.shortName} admins`} />
              </div>
              <Button type="button" className="mt-4 w-full" onClick={() => generate(r.id)}>
                <FileBarChart2 className="size-4" /> Generate university report
              </Button>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="min-w-0">
          <CardHeader title="Executive summary preview" sub="The first page of the University executive report." />
          <div className="px-5 pb-5">
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
              <div className="flex items-center gap-3">
                <UniversityMark university={university} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-bold text-ink">{university.name}</p>
                  <p className="truncate text-[12px] text-ink-3">
                    {university.programmeName} · report date {formatAccaDate(ACCA_TODAY)}
                  </p>
                </div>
              </div>
              {h.avgAttendance === 0 ? (
                <p className="mt-4 text-[13px] text-ink-2">
                  {university.shortName} is onboarding. {h.students} learners enrolled, {h.registeredPct}% registered with ACCA; classes start{" "}
                  {formatAccaDate(university.workspace.goLive)}.
                </p>
              ) : (
                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    ["Learners", h.students],
                    ["Registered with ACCA", `${h.registeredPct}%`],
                    ["Attendance in ACCA sessions", `${h.avgAttendance}%`],
                    ["Average readiness score", h.avgReadiness],
                    ["At risk", h.atRisk],
                    ["Joint certificate on track", `${h.jointCertOnTrackPct}%`],
                  ].map(([label, value]) => (
                    <div key={label as string} className="min-w-0 rounded-[10px] bg-surface p-2.5">
                      <dt className="truncate text-[11.5px] text-ink-3">{label}</dt>
                      <dd className="mt-1 font-display text-[20px] leading-none font-bold text-ink tnum">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <p className="mt-3 text-[12px] text-ink-3">{h.internshipsPlanned} internships planned · {h.activeCohorts} active cohorts · {h.sections} sections</p>
            </div>
          </div>
        </Card>
        <div className="min-w-0">
          <MiniLabel className="mb-2.5">Generated university reports</MiniLabel>
          <DataTable
            caption="Generated university reports"
            rows={uniRuns}
            getRowId={(r) => r.id}
            dense
            pageSize={6}
            empty={<p className="text-center text-[13px] text-ink-3">No reports generated for {university.shortName} yet.</p>}
            columns={[
              { key: "file", header: "File", mono: true },
              { key: "period", header: "Period", className: "text-ink-2" },
              { key: "by", header: "By" },
              { key: "on", header: "On", render: (r) => formatAccaDate(r.on) },
              { key: "shared", header: "Shared", render: (r) => (r.shared ? <StatusPill status="Shared" tone="jade" size="sm" /> : <StatusPill status="Internal" size="sm" />) },
              {
                key: "dl",
                header: <span className="sr-only">Download</span>,
                align: "right",
                render: (r) => (
                  <Button type="button" size="xs" variant="ghost" onClick={() => toast({ title: `Downloading ${r.file}`, tone: "info" })}>
                    Download
                  </Button>
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}
