"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Crown, EyeOff, Flame, Medal, MessagesSquare, Minus, Target, Trophy } from "lucide-react";
import {
  cohortById,
  groupIndian,
  leaderboardFor,
  universityById,
  type LeaderboardEntry,
  type Student,
} from "@/lib/data/acca";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/tabs";
import { FilterSelect } from "@/components/ui/filter-bar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatusPill, type StatusTone } from "@/components/ui/status";
import { Switch } from "@/components/ui/field";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { MicroLabel, UniversityMark, useStudentRecord } from "./shared";
import { StudentTypeGate } from "./type-gate";

type Row = LeaderboardEntry & {
  weekly: number;
  parts: { practice: number; mocks: number; attendance: number; streak: number };
  badges: { label: string; tone: StatusTone }[];
  shownRank: number;
};

const PART_META = [
  { key: "practice", label: "Practice", fill: "bg-info" },
  { key: "mocks", label: "Mocks", fill: "bg-violet" },
  { key: "attendance", label: "Attendance", fill: "bg-jade" },
  { key: "streak", label: "Streak", fill: "bg-cta-strong" },
] as const;

/** Points split and weekly points, derived deterministically from the cohort entry. */
function enrich(e: LeaderboardEntry, me: Student): Omit<Row, "shownRank"> {
  const streak = e.streak * 40;
  const attendance = Math.round(e.points * 0.22);
  const mocks = Math.round(e.points * (0.28 + (e.rank % 4) * 0.01));
  const practice = Math.max(0, e.points - streak - attendance - mocks);
  const weekly = Math.round(e.points / 16 + e.change * 14 + e.streak * 5 + ((e.rank * 37) % 23));
  const badges: Row["badges"] = [];
  if (e.rank <= 10) badges.push({ label: "Top 10", tone: "cta" });
  if (e.streak >= 14) badges.push({ label: `${e.streak}-day streak`, tone: "amber" });
  if (e.studentId === me.id) {
    if (me.attendance.pct >= 90) badges.push({ label: "Attendance 90%+", tone: "jade" });
    const bestMock = Math.max(0, ...me.mocks.map((m) => m.score ?? 0));
    if (bestMock >= 70) badges.push({ label: `Mock ${bestMock}%`, tone: "violet" });
    if (e.streak >= 10 && e.streak < 14) badges.push({ label: `${e.streak}-day streak`, tone: "amber" });
  } else {
    if (e.rank % 5 === 1) badges.push({ label: "Attendance 90%+", tone: "jade" });
    if (e.rank % 7 === 2) badges.push({ label: "Mock 70%+", tone: "violet" });
    if (e.change >= 3) badges.push({ label: "Climber", tone: "info" });
  }
  return { ...e, weekly, parts: { practice, mocks, attendance, streak }, badges };
}

export function LeaderboardPage() {
  const student = useStudentRecord();
  return (
    <StudentTypeGate type="undergraduate" eyebrow="Your university" title="Cohort leaderboard">
      <LeaderboardView key={student.id} student={student} />
    </StudentTypeGate>
  );
}

export function LeaderboardView({ student }: { student: Student }) {
  const cohortId = student.cohortIds.find((id) => cohortById(id)?.type === "university") ?? student.cohortIds[0];
  const cohort = cohortById(cohortId);
  const university = universityById(student.universityId);
  const base = useMemo(() => leaderboardFor(cohortId).map((e) => enrich(e, student)), [cohortId, student]);

  const [period, setPeriod] = useState("overall");
  const [section, setSection] = useState("");
  const [showName, setShowName] = useState(true);

  const ranked: Row[] = useMemo(() => {
    const byPeriod = [...base].sort((a, b) => (period === "overall" ? a.rank - b.rank : b.weekly - a.weekly || a.rank - b.rank));
    return byPeriod.map((r, i) => ({ ...r, shownRank: i + 1 }));
  }, [base, period]);
  const rows = section ? ranked.filter((r) => r.section === section) : ranked;

  const me = ranked.find((r) => r.studentId === student.id);
  const ahead = me ? ranked.find((r) => r.shownRank === me.shownRank - 1) : undefined;
  const sectionRank = me ? ranked.filter((r) => r.section === me.section).findIndex((r) => r.studentId === student.id) + 1 : 0;
  const sectionSize = me ? ranked.filter((r) => r.section === me.section).length : 0;
  const score = (r: Row) => (period === "overall" ? r.points : r.weekly);
  const podium = ranked.slice(0, 3);
  const movers = [...base].sort((a, b) => b.change - a.change || a.rank - b.rank).slice(0, 4);

  const displayName = (r: Row) => (r.studentId === student.id ? (showName ? `${r.name} (you)` : "You · hidden from others") : r.name);

  const columns: DataTableColumn<Row>[] = [
    {
      key: "shownRank",
      header: "Rank",
      sortable: true,
      render: (r) => (
        <span className="flex items-center gap-2">
          <span className={cn("grid size-7 place-items-center rounded-full font-mono text-[12px] font-bold tnum", r.shownRank <= 3 ? "bg-cta text-cta-ink" : "bg-surface-2 text-ink")}>{r.shownRank}</span>
          {period === "overall" ? (
            <span className={cn("inline-flex items-center text-[11.5px] font-semibold tnum", r.change > 0 ? "text-jade" : r.change < 0 ? "text-rose" : "text-ink-3")}>
              {r.change > 0 ? <ArrowUp aria-hidden className="size-3" /> : r.change < 0 ? <ArrowDown aria-hidden className="size-3" /> : <Minus aria-hidden className="size-3" />}
              {r.change !== 0 ? Math.abs(r.change) : ""}
              <span className="sr-only">{r.change > 0 ? `up ${r.change}` : r.change < 0 ? `down ${-r.change}` : "no change"}</span>
            </span>
          ) : null}
        </span>
      ),
    },
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (r) => (
        <span className="flex min-w-0 items-center gap-2.5">
          {r.studentId === student.id && !showName ? (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-inv text-cta">
              <EyeOff aria-hidden className="size-3.5" />
            </span>
          ) : (
            <Avatar name={r.name} size="sm" />
          )}
          <span className={cn("truncate", r.studentId === student.id ? "font-bold text-ink" : "font-semibold text-ink")}>{displayName(r)}</span>
        </span>
      ),
    },
    { key: "section", header: "Section", sortable: true, render: (r) => `Section ${r.section}` },
    {
      key: "points",
      header: period === "overall" ? "Points" : "Points this week",
      align: "right",
      mono: true,
      sortable: true,
      sortValue: (r) => score(r),
      render: (r) => groupIndian(score(r)),
    },
    {
      key: "breakdown",
      header: "Breakdown",
      className: "min-w-40",
      render: (r) => (
        <span className="flex h-2 w-36 overflow-hidden rounded-full bg-surface-3" title={PART_META.map((p) => `${p.label} ${groupIndian(r.parts[p.key])}`).join(" · ")}>
          {PART_META.map((p) => (
            <span key={p.key} className={p.fill} style={{ width: `${(r.parts[p.key] / r.points) * 100}%` }} />
          ))}
        </span>
      ),
    },
    {
      key: "streak",
      header: "Streak",
      align: "right",
      sortable: true,
      render: (r) => (
        <span className="inline-flex items-center gap-1 font-mono tnum">
          <Flame aria-hidden className={cn("size-3.5", r.streak >= 10 ? "text-ember" : "text-ink-3")} />
          {r.streak}
        </span>
      ),
    },
    {
      key: "badges",
      header: "Badges",
      render: (r) => (
        <span className="flex gap-1.5">
          {r.badges.slice(0, 3).map((b) => (
            <StatusPill key={b.label} status={b.label} tone={b.tone} size="sm" dot={false} />
          ))}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Your university"
        title="Cohort leaderboard"
        sub={`${cohort?.name ?? "Your cohort"}, ranked by points from practice, mocks, attendance and streaks.`}
        badge={<ScopeChip>{cohort?.size ?? ranked.length} learners in your cohort</ScopeChip>}
        actions={
          <LinkButton href="/discussions" variant="outline">
            <MessagesSquare aria-hidden className="size-4" />
            Cohort community
          </LinkButton>
        }
      />

      {me ? (
        <section className="relative isolate overflow-hidden rounded-[var(--radius-lg)] bg-surface-inv px-5 py-6 text-ink-inv sm:px-7">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-cta" />
          <span aria-hidden className="pointer-events-none absolute -top-24 -right-16 -z-10 size-72 rounded-full bg-cta opacity-[0.14] blur-3xl" />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              {university ? <UniversityMark university={university} size="lg" /> : null}
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">Your position · {period === "overall" ? "overall" : "this week"}</p>
                <p className="mt-1 font-display text-[clamp(1.8rem,1.4rem+1.6vw,2.6rem)] leading-none font-bold tracking-[-0.03em] text-ink-inv">
                  Rank {me.shownRank} <span className="text-ink-inv/60">of {ranked.length}</span>
                </p>
                <p className="mt-2 text-[13px] text-ink-inv/75">
                  {ahead
                    ? `${groupIndian(score(ahead) - score(me))} points behind ${ahead.name} at rank ${ahead.shownRank}.`
                    : "You lead the cohort."}{" "}
                  Section {me.section} rank {sectionRank} of {sectionSize}.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-3 gap-x-6 gap-y-3 border-t border-ink-inv/15 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
              <div className="min-w-0">
                <dt className="text-[12px] text-ink-inv/65">{period === "overall" ? "Points" : "This week"}</dt>
                <dd className="mt-1 font-display text-[24px] leading-none font-bold text-cta tnum">{groupIndian(score(me))}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] text-ink-inv/65">Streak</dt>
                <dd className="mt-1 font-display text-[24px] leading-none font-bold text-ink-inv tnum">{me.streak} days</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[12px] text-ink-inv/65">This week</dt>
                <dd className="mt-1 font-display text-[24px] leading-none font-bold text-ink-inv tnum">{me.change > 0 ? `+${me.change}` : me.change}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-4">
            {PART_META.map((p) => (
              <div key={p.key} className="min-w-0 rounded-[var(--radius-md)] border border-ink-inv/15 px-3 py-2.5">
                <p className="flex items-center gap-2 text-[12px] text-ink-inv/70">
                  <span aria-hidden className={cn("size-2 rounded-full", p.fill)} />
                  {p.label}
                </p>
                <p className="mt-1 font-mono text-[15px] font-semibold text-ink-inv tnum">{groupIndian(me.parts[p.key])}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {podium.map((r, i) => (
              <Card key={r.rank} className={cn("flex min-w-0 items-center gap-3 p-4", r.studentId === student.id && "border-cta bg-cta-soft")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", i === 0 ? "bg-cta text-cta-ink" : "bg-surface-inv text-cta")}>
                  {i === 0 ? <Crown aria-hidden className="size-5" /> : <Medal aria-hidden className="size-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Rank {r.shownRank}</span>
                  <span className="block truncate text-[14px] font-bold text-ink">{displayName(r)}</span>
                  <span className="block font-mono text-[12.5px] text-ink-2 tnum">
                    {groupIndian(score(r))} points · Section {r.section}
                  </span>
                </span>
              </Card>
            ))}
          </div>

          <DataTable
            caption="Cohort leaderboard"
            rows={rows}
            columns={columns}
            getRowId={(r) => String(r.rank)}
            rowClassName={(r) => (r.studentId === student.id ? "bg-cta-soft" : undefined)}
            search={{ placeholder: "Search learners", match: (r, q) => r.name.toLowerCase().includes(q) }}
            filters={
              <>
                <Segmented
                  value={period}
                  onChange={setPeriod}
                  items={[
                    { id: "overall", label: "Overall" },
                    { id: "weekly", label: "This week" },
                  ]}
                />
                <FilterSelect
                  label="Section"
                  value={section}
                  onChange={setSection}
                  allLabel="All sections"
                  options={[...new Set(base.map((r) => r.section))].sort().map((s) => ({ value: s, label: `Section ${s}` }))}
                />
              </>
            }
          />
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <MicroLabel>How points work</MicroLabel>
            <ul className="mt-3 space-y-2.5 text-[13px] text-ink-2">
              {[
                { icon: <Target className="size-4" />, label: "Practice", text: "2 points for each correct question bank answer" },
                { icon: <Trophy className="size-4" />, label: "Mocks", text: "50 points for sitting a mock, plus your score" },
                { icon: <Medal className="size-4" />, label: "Attendance", text: "20 points for each ACCA live class attended" },
                { icon: <Flame className="size-4" />, label: "Streak", text: "40 points for each day in your current study streak" },
              ].map((x) => (
                <li key={x.label} className="flex gap-2.5">
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-ink">
                    {x.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink">{x.label}</span>
                    {x.text}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Climbing this week" sub="Biggest rank gains since last Monday" />
            <ul className="divide-y divide-line border-t border-line">
              {movers.map((m) => (
                <li key={m.rank} className="flex items-center gap-3 px-5 py-2.5">
                  <Avatar name={m.name} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{m.studentId === student.id ? "You" : m.name}</span>
                  <span className="inline-flex items-center gap-0.5 font-mono text-[12.5px] font-semibold text-jade tnum">
                    <ArrowUp aria-hidden className="size-3" />
                    {m.change}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <Switch
              checked={showName}
              onChange={(v) => {
                setShowName(v);
                toast({
                  title: v ? "Your name is visible on the leaderboard" : "Your name is hidden from other learners",
                  body: v ? undefined : "You still see your own rank. Faculty and mentors see your name.",
                  tone: "neutral",
                });
              }}
              label="Show my name to the cohort"
              sub="Turn off to appear as an anonymous learner to classmates."
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
