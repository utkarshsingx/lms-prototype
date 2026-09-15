"use client";

import { useState } from "react";
import { CalendarPlus, Camera, FileCheck2, Play, ShieldCheck, TrendingUp } from "lucide-react";
import {
  ACCA_TODAY,
  formatAccaDate,
  formatShortDate,
  paperByCode,
  paperName,
  quizzesAndMocks,
  type MockAttempt,
  type Student,
} from "@/lib/data/acca";
import { PageHeader, EmptyState } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { StatusPill } from "@/components/ui/status";
import { ScoreBar } from "@/components/ui/score";
import { LineChart } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterSelect } from "@/components/ui/filter-bar";
import { toast } from "@/components/ui/toast";
import { PaperCodeChip, SectionLabel, useStudentRecord } from "./bits";
import { MOCK_RUNNER, dayLabel, mockPercentile, relativeDays } from "./derive";

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

/** The faculty-set mock behind a student's mock attempt, if one exists. */
function blueprintFor(s: Student, m: MockAttempt) {
  return (
    quizzesAndMocks.find((q) => q.assessmentId && q.assessmentId === m.assessmentId) ??
    quizzesAndMocks.find((q) => q.kind === "mock" && q.paper === m.paper && q.cohortIds.some((c) => s.cohortIds.includes(c)))
  );
}

export function MocksPage() {
  const s = useStudentRecord();
  return <Mocks key={s.id} s={s} />;
}

function Mocks({ s }: { s: Student }) {
  const [checked, setChecked] = useState<string[]>([]);
  const [paper, setPaper] = useState("");

  const upcoming = s.mocks.filter((m) => m.status === "scheduled").sort((a, b) => a.date.localeCompare(b.date));
  const past = s.mocks.filter((m) => m.status !== "scheduled").sort((a, b) => b.date.localeCompare(a.date));
  const scored = past.filter((m) => m.status === "completed" && m.score != null);
  const avg = scored.length ? Math.round(scored.reduce((n, m) => n + (m.score ?? 0), 0) / scored.length) : 0;
  const best = scored.reduce<MockAttempt | undefined>((b, m) => ((m.score ?? 0) > (b?.score ?? -1) ? m : b), undefined);
  const next = upcoming[0];
  const nextRunner = next ? (next.assessmentId ?? MOCK_RUNNER[next.paper]) : undefined;

  const chrono = [...scored].reverse();
  const rows = paper ? past.filter((m) => m.paper === paper) : past;

  const columns: DataTableColumn<MockAttempt>[] = [
    {
      key: "title",
      header: "Mock",
      sortable: true,
      render: (m) => (
        <span className="flex min-w-0 items-center gap-2.5">
          <PaperCodeChip code={m.paper} />
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{m.title}</span>
            <span className="block text-[12px] text-ink-3">
              {paperByCode(m.paper)?.examFormat === "on-demand" ? "On-demand CBE format" : "Session CBE format"} · {paperByCode(m.paper)?.durationLabel}
            </span>
          </span>
        </span>
      ),
    },
    { key: "date", header: "Sat on", sortable: true, render: (m) => formatAccaDate(m.date) },
    {
      key: "score",
      header: "Score",
      sortable: true,
      sortValue: (m) => m.score ?? -1,
      render: (m) => (m.score != null ? <ScoreBar value={m.score} marker={50} className="w-32" height={6} /> : <span className="text-ink-3">No score</span>),
    },
    {
      key: "percentile",
      header: "Percentile",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (m) => (m.score != null ? mockPercentile(m.score) : -1),
      render: (m) => (m.score != null ? ordinal(mockPercentile(m.score)) : "·"),
    },
    {
      key: "result",
      header: "Result",
      sortable: true,
      sortValue: (m) => m.score ?? -1,
      render: (m) =>
        m.status === "missed" ? (
          <StatusPill status="Missed" tone="rose" size="sm" />
        ) : (m.score ?? 0) >= 50 ? (
          <StatusPill status="Passed" size="sm">
            Above pass mark
          </StatusPill>
        ) : (
          <StatusPill status="Failed" size="sm">
            Below pass mark
          </StatusPill>
        ),
    },
    {
      key: "review",
      header: <span className="sr-only">Review</span>,
      align: "right",
      render: (m) =>
        m.assessmentId ? (
          <LinkButton size="xs" variant="outline" href={`/assessments/${m.assessmentId}`}>
            Review
          </LinkButton>
        ) : (
          <Button
            size="xs"
            variant="outline"
            onClick={() => toast({ title: `Opening marked script: ${m.title}`, body: m.score != null ? `${m.score}% · faculty feedback on Section C included` : "Missed mock", tone: "info" })}
          >
            Review
          </Button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Learn"
        title="Mock exams"
        sub="Mock examinations in the ACCA CBE format: availability windows, your scores and percentile, and the results trend."
        actions={
          next && nextRunner ? (
            <LinkButton href={`/assessments/${nextRunner}`}>
              <Play className="size-4 fill-current" />
              Start {next.paper} mock
            </LinkButton>
          ) : null
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Next mock" value={next ? formatShortDate(next.date) : "None"} sub={next ? `${next.title} · ${relativeDays(next.date)}` : "No mock scheduled"} />
        <KpiTile label="Mocks and tests completed" value={scored.length} sub={`${s.missedMocks} missed`} tone="info" icon={<FileCheck2 />} />
        <KpiTile label="Average score" value={`${avg}%`} sub="Pass mark 50%" tone={avg >= 50 ? "jade" : "rose"} icon={<TrendingUp />} />
        <KpiTile label="Best score" value={best ? `${best.score}%` : "·"} sub={best ? `${best.title} · ${ordinal(mockPercentile(best.score ?? 0))} percentile` : undefined} tone="jade" />
      </KpiRow>

      <section className="space-y-3">
        <SectionLabel>Upcoming mock examinations · {upcoming.length}</SectionLabel>
        {upcoming.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {upcoming.map((m) => {
              const qm = blueprintFor(s, m);
              const p = paperByCode(m.paper);
              const runner = m.assessmentId ?? MOCK_RUNNER[m.paper];
              const ready = checked.includes(m.id);
              const windowOpen = qm ? qm.opensOn <= ACCA_TODAY && qm.closesOn >= ACCA_TODAY : false;
              return (
                <Card key={m.id} className="flex min-w-0 flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <PaperCodeChip code={m.paper} />
                      <div className="min-w-0">
                        <p className="truncate font-display text-[17px] font-bold tracking-[-0.02em] text-ink">{m.title}</p>
                        <p className="text-[12.5px] text-ink-3">{paperName(m.paper)}</p>
                      </div>
                    </div>
                    <StatusPill status="Scheduled" className="shrink-0">
                      {dayLabel(m.date)}
                    </StatusPill>
                  </div>

                  <dl className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="min-w-0 rounded-[12px] bg-surface-2 px-3 py-2.5">
                      <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">CBE format</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-ink">{p?.examFormat === "on-demand" ? "On-demand CBE" : "Session CBE"}</dd>
                    </div>
                    <div className="min-w-0 rounded-[12px] bg-surface-2 px-3 py-2.5">
                      <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">Duration</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-ink">{qm ? `${qm.durationMins} min` : p?.durationLabel}</dd>
                    </div>
                    <div className="min-w-0 rounded-[12px] bg-surface-2 px-3 py-2.5">
                      <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">Window</dt>
                      <dd className="mt-0.5 text-[13px] font-semibold text-ink">
                        {qm ? (qm.opensOn === m.date || qm.opensOn > ACCA_TODAY ? `${formatShortDate(qm.opensOn)} to ${formatShortDate(qm.closesOn)}` : `Until ${formatShortDate(qm.closesOn)}`) : formatShortDate(m.date)}
                      </dd>
                    </div>
                  </dl>

                  {qm ? (
                    <ul className="mt-3 space-y-1 text-[12.5px] text-ink-2">
                      {qm.blueprint.map((b) => (
                        <li key={b.section} className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0">
                            <span className="font-semibold text-ink">{b.section}:</span> {b.format}
                          </span>
                          <span className="shrink-0 font-mono text-ink-3 tnum">{b.marks} marks</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                    <ShieldCheck className="size-3.5 shrink-0" />
                    {qm?.proctored ? "Proctored: complete the device check before the window opens." : "Not proctored: sit it at home in exam conditions."}
                    {` Scheduled ${formatAccaDate(m.date)}, ${relativeDays(m.date)}.`}
                    {windowOpen ? " The window is open now." : ""}
                  </p>

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {runner ? (
                      <LinkButton href={`/assessments/${runner}`} size="sm">
                        <Play className="size-3.5 fill-current" />
                        Start mock
                      </LinkButton>
                    ) : null}
                    {qm?.proctored ? (
                      <Button
                        size="sm"
                        variant={ready ? "outline" : "secondary"}
                        onClick={() => {
                          setChecked((c) => (c.includes(m.id) ? c : [...c, m.id]));
                          toast({ title: "Device check passed", body: "Camera, microphone, screen share and browser are ready for the proctored mock." });
                        }}
                      >
                        <Camera className="size-3.5" />
                        {ready ? "Device check passed" : "Run device check"}
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => toast({ title: "Added to your calendar", body: `${m.title} · ${dayLabel(m.date)}`, tone: "info" })}>
                      <CalendarPlus className="size-3.5" />
                      Add to calendar
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No mock exams scheduled" sub="Your faculty schedule mocks about six weeks before each exam." />
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader title="Results trend" sub="Mock and progress test scores against your cohort and the 50% pass mark" />
          <div className="px-5 pb-5">
            {chrono.length ? (
              <LineChart
                min={0}
                max={100}
                unit="%"
                height={220}
                labels={chrono.map((m) => `${m.paper} ${formatShortDate(m.date)}`)}
                series={[
                  { label: "Your score", values: chrono.map((m) => m.score ?? 0), tone: "brand" },
                  { label: "Cohort average", values: chrono.map((m, i) => (m.score ?? 0) - 5 + ((i * 3) % 7)), tone: "info" },
                  { label: "Pass mark", values: chrono.map(() => 50), tone: "rose" },
                ]}
              />
            ) : (
              <EmptyState title="No scores yet" sub="Your trend appears after the first mock." />
            )}
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Percentile by mock" sub="Where each score placed you among learners who sat the same mock" />
          <ul className="space-y-3 px-5 pb-5">
            {scored.map((m) => (
              <li key={m.id} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="min-w-0 truncate text-ink-2">
                    <span className="font-mono font-semibold text-ink">{m.paper}</span> · {m.title}
                  </span>
                  <span className="shrink-0 font-semibold text-ink tnum">{ordinal(mockPercentile(m.score ?? 0))}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-surface-inv" style={{ width: `${mockPercentile(m.score ?? 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="min-w-0">
        <CardHeader title="Past mock examinations" sub="Every mock and progress test you have sat, with score, percentile and result" />
        <div className="px-5 pb-5">
        <DataTable
          bare
          caption="Past mock examinations"
          rows={rows}
          columns={columns}
          getRowId={(m) => m.id}
          initialSort={{ key: "date", dir: "desc" }}
          filters={
            <FilterSelect
              label="Paper"
              value={paper}
              onChange={setPaper}
              allLabel="All papers"
              options={[...new Set(past.map((m) => m.paper))].map((c) => ({ value: c, label: `${c} · ${paperName(c)}` }))}
            />
          }
          empty={<EmptyState title="No past mocks" sub="Completed mocks and progress tests appear here." />}
        />
        </div>
      </Card>
    </div>
  );
}
