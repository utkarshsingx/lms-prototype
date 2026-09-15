"use client";

import { useState } from "react";
import { TICKET_CATEGORIES, supportTurnaround, type Ticket } from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/tabs";
import { LineChart } from "@/components/ui/charts";
import { formatHours, formatMins, median } from "./support-helpers";

export function TurnaroundCard({ tickets }: { tickets: Ticket[] }) {
  const [view, setView] = useState("category");

  const rows = TICKET_CATEGORIES.map((category) => {
    const list = tickets.filter((t) => t.category === category);
    const resolved = list.filter((t) => t.resolutionHours != null);
    const firstResponse = median(list.filter((t) => t.firstResponseMins != null).map((t) => t.firstResponseMins!));
    const resolution = median(resolved.map((t) => t.resolutionHours!));
    const within = resolved.length
      ? Math.round((resolved.filter((t) => t.resolutionHours! <= t.slaHours).length / resolved.length) * 100)
      : null;
    return { category, total: list.length, open: list.length - resolved.length, firstResponse, resolution, within };
  });
  const maxHours = Math.max(1, ...rows.map((r) => r.resolution ?? 0));

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Turnaround time"
        sub="Median first response and resolution, from the tickets on this page"
        action={
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            items={[
              { id: "category", label: "By category" },
              { id: "weekly", label: "Last 4 weeks" },
            ]}
          />
        }
        className="flex-wrap"
      />
      <div className="px-5 pb-5">
        {view === "category" ? (
          <ul className="space-y-3.5">
            {rows.map((r) => {
              const tone = r.within == null ? "bg-ink-3" : r.within >= 80 ? "bg-jade" : r.within >= 60 ? "bg-amber" : "bg-rose";
              return (
                <li key={r.category} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[13px] font-semibold text-ink">{r.category}</span>
                    <span className="shrink-0 font-mono text-[12.5px] font-semibold text-ink tnum">
                      {r.resolution != null ? formatHours(r.resolution) : "No resolved tickets"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className={cn("h-full rounded-full transition-[width] duration-500", tone)}
                      style={{ width: `${((r.resolution ?? 0) / maxHours) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">
                    First response {r.firstResponse != null ? formatMins(r.firstResponse) : "none yet"} ·{" "}
                    {r.within != null ? `${r.within}% within SLA` : "SLA not measured"} · {r.open} open of {r.total}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="space-y-4">
            <LineChart
              height={170}
              labels={supportTurnaround.weekly.map((w) => `w/c ${w.week}`)}
              series={[
                { label: "Raised", values: supportTurnaround.weekly.map((w) => w.raised), tone: "ink-3" },
                { label: "Resolved", values: supportTurnaround.weekly.map((w) => w.resolved), tone: "jade" },
              ]}
            />
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {supportTurnaround.weekly.map((w) => (
                <div key={w.week} className="rounded-[var(--radius-md)] border border-line bg-surface-2 px-3 py-2">
                  <p className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">w/c {w.week}</p>
                  <p className="mt-1 font-display text-[18px] leading-none font-bold text-ink tnum">{w.avgResolutionHours}h</p>
                  <p className="mt-1 text-[11.5px] text-ink-3">average resolution</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
