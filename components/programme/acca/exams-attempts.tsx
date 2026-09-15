"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { paperName, type PaperCode } from "@/lib/data/acca";
import { Card, CardHeader } from "@/components/ui/card";
import { BarChart, Sparkline } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { MiniLabel } from "./common";
import { paperIndex, type AttemptRow } from "./exams-model";

type Outcome = "first-time" | "reattempt-pass" | "not-passed" | "awaiting";

const OUTCOME_LABEL: Record<Outcome, string> = {
  "first-time": "Passed first time",
  "reattempt-pass": "Passed on reattempt",
  "not-passed": "Failed, not yet passed",
  awaiting: "Awaiting result",
};
const OUTCOME_TONE = { "first-time": "jade", "reattempt-pass": "jade", "not-passed": "rose", awaiting: "amber" } as const;

type PaperRow = {
  id: string;
  studentId: string;
  name: string;
  accaId: string | null;
  paper: PaperCode;
  attempts: AttemptRow[];
  latest: AttemptRow;
  outcome: Outcome;
  change: number | null;
};

export function AttemptsTab({ attempts }: { attempts: AttemptRow[] }) {
  const [paper, setPaper] = useState("");
  const [outcome, setOutcome] = useState("");

  const rows: PaperRow[] = useMemo(() => {
    const groups = new Map<string, AttemptRow[]>();
    for (const a of attempts) {
      const key = `${a.studentId}-${a.paper}`;
      groups.set(key, [...(groups.get(key) ?? []), a]);
    }
    return [...groups.entries()].map(([id, list]) => {
      const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
      const latest = sorted[sorted.length - 1];
      const scored = sorted.filter((a) => a.score != null);
      const passedAt = sorted.findIndex((a) => a.result === "passed");
      const out: Outcome =
        latest.result === "pending"
          ? "awaiting"
          : passedAt === 0
            ? "first-time"
            : passedAt > 0
              ? "reattempt-pass"
              : "not-passed";
      return {
        id,
        studentId: latest.studentId,
        name: latest.name,
        accaId: latest.accaId,
        paper: latest.paper,
        attempts: sorted,
        latest,
        outcome: out,
        change: scored.length > 1 ? scored[scored.length - 1].score! - scored[scored.length - 2].score! : null,
      };
    });
  }, [attempts]);

  const visible = rows.filter((r) => (!paper || r.paper === paper) && (!outcome || r.outcome === outcome));

  const byPaper = useMemo(() => {
    const papers = [...new Set(attempts.map((a) => a.paper))].sort((a, b) => paperIndex(a) - paperIndex(b));
    return papers
      .map((p) => {
        const decided = attempts.filter((a) => a.paper === p && (a.result === "passed" || a.result === "failed"));
        return { paper: p, total: decided.length, rate: decided.length ? Math.round((decided.filter((a) => a.result === "passed").length / decided.length) * 100) : 0 };
      })
      .filter((x) => x.total >= 3);
  }, [attempts]);

  const decided = attempts.filter((a) => a.result === "passed" || a.result === "failed");
  const multi = rows.filter((r) => r.attempts.length > 1);

  const columns: DataTableColumn<PaperRow>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (r) => (
        <span className="block min-w-0">
          <span className="block font-semibold text-ink">{r.name}</span>
          <span className="block font-mono text-[11.5px] text-ink-3">{r.accaId ?? "ACCA ID pending"}</span>
        </span>
      ),
    },
    {
      key: "paper",
      header: "Paper",
      sortable: true,
      sortValue: (r) => paperIndex(r.paper),
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className="font-mono text-[12px] font-semibold text-ink">{r.paper}</span>
          <span className="text-ink-3">{paperName(r.paper)}</span>
        </span>
      ),
    },
    { key: "count", header: "Attempts", align: "right", mono: true, sortable: true, sortValue: (r) => r.attempts.length, render: (r) => r.attempts.length },
    {
      key: "history",
      header: "Attempt history",
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.attempts.map((a) => (
            <StatusPill key={a.id} status={a.result === "pending" ? "pending" : a.result} size="sm" dot={false}>
              {a.label} · {a.score == null ? "pending" : `${a.score}%`}
            </StatusPill>
          ))}
        </span>
      ),
    },
    {
      key: "trend",
      header: "Trend",
      render: (r) => {
        const scores = r.attempts.map((a) => a.score).filter((s): s is number => s != null);
        return scores.length > 1 ? (
          <span className="flex items-center gap-2">
            <span className="block w-16">
              <Sparkline data={scores} tone={r.change != null && r.change >= 0 ? "jade" : "rose"} height={22} fill={false} />
            </span>
            {r.change != null ? (
              <span className={r.change >= 0 ? "inline-flex items-center font-mono text-[12px] font-semibold text-jade" : "inline-flex items-center font-mono text-[12px] font-semibold text-rose"}>
                {r.change >= 0 ? <ArrowUpRight aria-hidden className="size-3.5" /> : <ArrowDownRight aria-hidden className="size-3.5" />}
                {r.change >= 0 ? `+${r.change}` : r.change}
              </span>
            ) : null}
          </span>
        ) : (
          <span className="text-[12px] text-ink-3">First attempt</span>
        );
      },
    },
    {
      key: "outcome",
      header: "Outcome",
      sortable: true,
      sortValue: (r) => ["not-passed", "awaiting", "reattempt-pass", "first-time"].indexOf(r.outcome),
      render: (r) => (
        <StatusPill status={r.outcome} tone={OUTCOME_TONE[r.outcome]}>
          {OUTCOME_LABEL[r.outcome]}
        </StatusPill>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="grid grid-cols-2 gap-3 self-start">
          {[
            ["Recorded attempts", decided.length],
            ["Pass rate", `${decided.length ? Math.round((decided.filter((a) => a.result === "passed").length / decided.length) * 100) : 0}%`],
            ["Learners with reattempts", multi.length],
            ["Failed, not yet passed", rows.filter((r) => r.outcome === "not-passed").length],
          ].map(([label, value]) => (
            <Card key={label as string} className="min-w-0 p-4">
              <MiniLabel>{label}</MiniLabel>
              <p className="mt-2 font-display text-[24px] leading-none font-bold text-ink tnum">{value}</p>
            </Card>
          ))}
        </div>
        <Card className="min-w-0">
          <CardHeader title="Pass rate by paper" sub="All recorded attempts by listed learners, pass mark 50%." />
          <div className="px-5 pb-5">
            <BarChart data={byPaper.map((p) => p.rate)} labels={byPaper.map((p) => p.paper)} tone="info" height={120} />
          </div>
        </Card>
      </div>

      <DataTable
        caption="Paper attempts"
        rows={visible}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ key: "outcome", dir: "asc" }}
        search={{ placeholder: "Search learner or ACCA ID", match: (r, q) => r.name.toLowerCase().includes(q) || (r.accaId ?? "").includes(q) }}
        filters={
          <FilterBar
            active={Boolean(paper || outcome)}
            onClear={() => {
              setPaper("");
              setOutcome("");
            }}
          >
            <FilterSelect
              label="Paper"
              value={paper}
              onChange={setPaper}
              allLabel="All"
              options={[...new Set(rows.map((r) => r.paper))].sort((a, b) => paperIndex(a) - paperIndex(b))}
            />
            <FilterSelect
              label="Outcome"
              value={outcome}
              onChange={setOutcome}
              allLabel="All"
              options={(Object.keys(OUTCOME_LABEL) as Outcome[]).map((o) => ({ value: o, label: OUTCOME_LABEL[o] }))}
            />
          </FilterBar>
        }
        toolbar={
          <Button type="button" size="sm" variant="outline" onClick={() => toast({ title: "Report queued: paper-attempts.csv", tone: "info" })}>
            Export
          </Button>
        }
      />
    </div>
  );
}
