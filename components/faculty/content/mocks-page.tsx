"use client";

import { useMemo, useState } from "react";
import { CalendarClock, ClipboardList, Copy, FileCheck2, ListChecks, Plus, ShieldCheck, Send, Upload } from "lucide-react";
import {
  ACCA_TODAY,
  cohortById,
  examSessions,
  formatAccaDate,
  staffName,
  type PaperCode,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button, LinkButton } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { StatusPill } from "@/components/ui/status";
import { Drawer } from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { formatCalendarDate, formatRange } from "@/components/ui/calendar";
import { MockBuilder, QuizBuilder, RubricBuilder } from "./mock-builders";
import { KIND_LABELS, MOCK_SESSIONS, defaultWindow, seedQuizzes, seedRubrics, type LocalQuiz, type LocalRubric } from "./mock-model";
import { GatedButton, PaperCodeChip, SubmitOnlyChip, listPapers, plural, useAuthor } from "./shared";

function durationLabel(mins: number) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function sectionLetters(q: LocalQuiz) {
  return q.blueprint.map((b) => `${b.section.replace(/^Section\s+/, "")} ${b.marks}`).join(" · ");
}

export function MocksPage() {
  const { persona } = useRole();
  return <Mocks key={persona.id} />;
}

function Mocks() {
  const author = useAuthor();
  const { papers, canPublish, staffId } = author;

  const [quizzes, setQuizzes] = useState<LocalQuiz[]>(seedQuizzes);
  const [rubrics, setRubrics] = useState<LocalRubric[]>(seedRubrics);
  const [tab, setTab] = useState("list");
  const [scope, setScope] = useState("mine");
  const [fKind, setFKind] = useState("");
  const [fPaper, setFPaper] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ id: string; open: boolean } | null>(null);
  const [nonce, setNonce] = useState({ quiz: 0, mock: 0, rubric: 0 });
  const [rubricSeed, setRubricSeed] = useState<string | undefined>(undefined);

  const mine = useMemo(() => quizzes.filter((q) => papers.includes(q.paper)), [quizzes, papers]);
  const scoped = scope === "mine" ? mine : quizzes;
  const rows = scoped.filter((q) => (!fKind || q.kind === fKind) && (!fPaper || q.paper === fPaper) && (!fStatus || q.status === fStatus));
  const filtersActive = Boolean(fKind || fPaper || fStatus);
  const clearFilters = () => {
    setFKind("");
    setFPaper("");
    setFStatus("");
  };

  const myRubrics = rubrics.filter((r) => (r.paper ? papers.includes(r.paper) : r.createdBy === staffId));
  const selected = detail ? quizzes.find((q) => q.id === detail.id) : undefined;

  const openTab = (id: string) => {
    setTab(id);
    if (id === "quiz" || id === "mock" || id === "rubric") setNonce((n) => ({ ...n, [id]: n[id as keyof typeof n] + 1 }));
  };

  const addQuiz = (q: LocalQuiz) => {
    setQuizzes((list) => [q, ...list]);
    setScope("mine");
    clearFilters();
    setHighlight(q.id);
    setTab("list");
  };

  const setStatus = (id: string, status: LocalQuiz["status"]) => setQuizzes((list) => list.map((q) => (q.id === id ? { ...q, status } : q)));

  const duplicate = (q: LocalQuiz) => {
    const idx = examSessions.findIndex((s) => q.title.includes(s.label));
    const next = idx >= 0 ? MOCK_SESSIONS.find((s) => examSessions.indexOf(s) > idx) : undefined;
    const win = next ? defaultWindow(next.id) : null;
    const copy: LocalQuiz = {
      ...q,
      id: `qm-copy-${quizzes.length + 1}`,
      title: next && idx >= 0 ? q.title.replace(examSessions[idx].label, next.label) : `${q.title} (copy)`,
      status: "draft",
      attempts: 0,
      avgScore: null,
      createdBy: staffId,
      opensOn: win?.opens ?? q.opensOn,
      closesOn: win?.closes ?? q.closesOn,
      cohortIds: next ? q.cohortIds.filter((id) => cohortById(id)?.examSessionId === next.id) : q.cohortIds,
    };
    addQuiz(copy);
    toast({ title: "Duplicated as a draft", body: `${copy.title} · ${formatRange(copy.opensOn, copy.closesOn)}` });
  };

  /* ------------------------------------------------------------------ table */

  const columns: DataTableColumn<LocalQuiz>[] = [
    {
      key: "title",
      header: "Quiz or mock",
      sortable: true,
      wrap: true,
      className: "min-w-[15rem]",
      render: (q) => (
        <span className="block">
          <span className="block font-semibold text-ink">{q.title}</span>
          <span className="block text-[12px] text-ink-3">
            {KIND_LABELS[q.kind]} · {staffName(q.createdBy)}
            {q.proctored ? " · proctored" : ""}
          </span>
        </span>
      ),
    },
    { key: "paper", header: "Paper", sortable: true, render: (q) => <PaperCodeChip code={q.paper} /> },
    {
      key: "blueprint",
      header: "Blueprint",
      render: (q) => (
        <span className="font-mono text-[12px] whitespace-nowrap text-ink-2" title={q.blueprint.map((b) => `${b.section}: ${b.format}`).join("\n")}>
          {sectionLetters(q)}
        </span>
      ),
    },
    { key: "durationMins", header: "Duration", sortable: true, render: (q) => <span className="whitespace-nowrap">{durationLabel(q.durationMins)}</span> },
    {
      key: "opensOn",
      header: "Window",
      sortable: true,
      render: (q) => <span className="whitespace-nowrap">{formatRange(q.opensOn, q.closesOn)}</span>,
    },
    {
      key: "cohorts",
      header: "Cohorts",
      sortValue: (q) => q.cohortIds.length,
      sortable: true,
      render: (q) => (
        <span className="block max-w-[12rem] truncate text-[12.5px] text-ink-2" title={q.cohortIds.map((id) => cohortById(id)?.name).join(", ")}>
          {q.cohortIds.length ? `${cohortById(q.cohortIds[0])?.name}${q.cohortIds.length > 1 ? ` +${q.cohortIds.length - 1}` : ""}` : "None yet"}
        </span>
      ),
    },
    {
      key: "attempts",
      header: "Attempts",
      align: "right",
      sortable: true,
      render: (q) => (
        <span className="whitespace-nowrap tnum">
          {q.attempts}
          {q.avgScore !== null ? <span className="text-ink-3"> · avg {q.avgScore}%</span> : null}
        </span>
      ),
    },
    { key: "status", header: "Status", sortable: true, render: (q) => <StatusPill status={q.status} size="sm" /> },
  ];

  /* ------------------------------------------------------------------ figures */

  const scheduledMocks = mine.filter((q) => q.kind === "mock" && q.status === "scheduled");
  const live = mine.filter((q) => q.kind !== "mock" && q.status === "published" && q.opensOn <= ACCA_TODAY && q.closesOn >= ACCA_TODAY);
  const attempts = mine.reduce((n, q) => n + q.attempts, 0);
  const scored = mine.filter((q) => q.avgScore !== null && q.attempts > 0);
  const avg = scored.length ? Math.round(scored.reduce((n, q) => n + (q.avgScore ?? 0) * q.attempts, 0) / scored.reduce((n, q) => n + q.attempts, 0)) : null;
  const upcoming = [...mine].filter((q) => q.closesOn >= ACCA_TODAY && q.status !== "closed").sort((a, b) => a.opensOn.localeCompare(b.opensOn)).slice(0, 3);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Assessment"
        title="Quizzes & mocks"
        sub="Create quizzes from the question bank, build mock examinations to the ACCA exam blueprint, and write the rubrics evaluators mark against."
        badge={
          <>
            <ScopeChip icon={<ClipboardList aria-hidden />}>Your papers: {listPapers(papers)}</ScopeChip>
            {canPublish ? null : <SubmitOnlyChip />}
          </>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => openTab("rubric")}>
              <ListChecks className="size-4" />
              Create rubric
            </Button>
            <Button variant="secondary" onClick={() => openTab("quiz")}>
              <Plus className="size-4" />
              Create quiz
            </Button>
            <Button onClick={() => openTab("mock")}>
              <FileCheck2 className="size-4" />
              Create mock exam
            </Button>
          </>
        }
      />

      <KpiRow cols={5}>
        <KpiTile hero label="Mock exams scheduled" value={scheduledMocks.length} sub={scheduledMocks[0] ? `Next opens ${formatCalendarDate(scheduledMocks[0].opensOn, "day")}` : "None scheduled"} icon={<CalendarClock />} />
        <KpiTile label="Quizzes and tests open now" value={live.length} tone="jade" sub={live[0] ? `${live[0].title}, closes ${formatCalendarDate(live[0].closesOn, "day")}` : "None open"} />
        <KpiTile label="Attempts so far" value={attempts} tone="info" sub={`Across ${plural(mine.length, "quiz and mock", "quizzes and mocks")}`} />
        <KpiTile label="Average score" value={avg === null ? "No attempts" : `${avg}%`} tone={avg !== null && avg < 50 ? "rose" : "amber"} sub="Weighted by attempts, pass mark 50%" />
        <KpiTile label="Evaluation rubrics" value={myRubrics.length} tone="violet" sub="For your papers and assignments" />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={openTab}
        items={[
          { id: "list", label: "Quizzes and mocks", count: rows.length },
          { id: "quiz", label: "Create quizzes" },
          { id: "mock", label: "Create mock examinations" },
          { id: "rubric", label: "Create evaluation rubrics", count: myRubrics.length },
        ]}
      />

      {tab === "list" ? (
        <div className="space-y-5">
          {upcoming.length ? (
            <div className="grid gap-3 md:grid-cols-3">
              {upcoming.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setDetail({ id: q.id, open: true })}
                  className="flex min-w-0 items-start gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 text-left transition-colors hover:border-ink hover:bg-cta-soft"
                >
                  <span className="grid w-12 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-surface-inv py-1.5 text-center">
                    <span className="text-[10.5px] font-bold tracking-[0.08em] text-ink-inv/70 uppercase">{formatCalendarDate(q.opensOn, "day").split(" ")[2]}</span>
                    <span className="font-display text-[20px] leading-none font-bold text-cta tnum">{formatCalendarDate(q.opensOn, "day").split(" ")[1]}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold text-ink">{q.title}</span>
                    <span className="block text-[12px] text-ink-3">
                      {q.opensOn <= ACCA_TODAY ? `Open until ${formatCalendarDate(q.closesOn, "day")}` : `Opens ${formatCalendarDate(q.opensOn, "day")}`} · {durationLabel(q.durationMins)}
                    </span>
                    <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill status={q.status} size="sm" />
                      <span className="text-[12px] text-ink-3">{plural(q.cohortIds.length, "cohort")}</span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <DataTable
            caption="Quizzes and mocks"
            rows={rows}
            columns={columns}
            getRowId={(q) => q.id}
            initialSort={{ key: "opensOn", dir: "desc" }}
            search={{ placeholder: "Search title", match: (q, s) => q.title.toLowerCase().includes(s) }}
            filters={
              <FilterBar active={filtersActive} onClear={clearFilters}>
                <Segmented
                  size="sm"
                  value={scope}
                  onChange={(v) => {
                    setScope(v);
                    clearFilters();
                  }}
                  items={[
                    { id: "mine", label: "Your papers" },
                    { id: "all", label: "All papers" },
                  ]}
                />
                <FilterSelect
                  label="Kind"
                  allLabel="All"
                  value={fKind}
                  onChange={setFKind}
                  options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
                />
                <FilterSelect label="Paper" allLabel="All" value={fPaper} onChange={setFPaper} options={Array.from(new Set(scoped.map((q) => q.paper)))} />
                <FilterSelect
                  label="Status"
                  allLabel="All"
                  value={fStatus}
                  onChange={setFStatus}
                  options={[
                    { value: "published", label: "Published" },
                    { value: "scheduled", label: "Scheduled" },
                    { value: "in-review", label: "In review" },
                    { value: "draft", label: "Draft" },
                    { value: "closed", label: "Closed" },
                  ]}
                />
              </FilterBar>
            }
            onRowClick={(q) => setDetail({ id: q.id, open: true })}
            rowLabel={(q) => `Open ${q.title}`}
            rowClassName={(q) => (q.id === highlight ? "bg-cta-soft" : undefined)}
          />
        </div>
      ) : null}

      {tab === "quiz" ? <QuizBuilder key={`quiz-${nonce.quiz}`} author={author} nextId={`qm-new-${quizzes.length + 1}`} onSave={addQuiz} /> : null}

      {tab === "mock" ? (
        <MockBuilder key={`mock-${nonce.mock}`} author={author} nextId={`qm-new-${quizzes.length + 1}`} rubrics={rubrics} existing={quizzes} onSave={addQuiz} />
      ) : null}

      {tab === "rubric" ? (
        <div className="space-y-5">
          <Card>
            <CardHeader title="Evaluation rubrics" sub="Rubrics for your papers and the shared assignment and project rubrics. Start a new one from any of them." />
            <ul className="divide-y divide-line border-t border-line">
              {rubrics
                .filter((r) => (r.paper ? papers.includes(r.paper) : true))
                .map((r) => {
                  const marks = r.criteria.reduce((n, c) => n + c.marks, 0);
                  const usedBy = quizzes.filter((q) => q.rubricId === r.id).length;
                  return (
                    <li key={r.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3", rubricSeed === r.id && "bg-cta-soft")}>
                      {r.paper ? <PaperCodeChip code={r.paper} /> : <span className="rounded-[var(--radius-xs)] border border-line px-1.5 py-0.5 text-[11px] font-semibold text-ink-3">Any</span>}
                      <span className="min-w-0 flex-1 basis-56">
                        <span className="block text-[13.5px] font-semibold text-ink">{r.name}</span>
                        <span className="block text-[12px] text-ink-3">
                          {plural(r.criteria.length, "criterion", "criteria")} · {marks} marks · {r.appliesTo}
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-wrap items-center gap-2">
                        <span className="text-[12px] text-ink-3">
                          {staffName(r.createdBy)} · {formatAccaDate(r.updated)}
                          {usedBy ? ` · used by ${plural(usedBy, "mock")}` : ""}
                        </span>
                        <StatusPill status={r.status} size="sm" />
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => {
                            setRubricSeed(r.id);
                            setNonce((n) => ({ ...n, rubric: n.rubric + 1 }));
                          }}
                        >
                          <Copy className="size-3" />
                          Start from this
                        </Button>
                      </span>
                    </li>
                  );
                })}
            </ul>
          </Card>
          <RubricBuilder
            key={`rubric-${nonce.rubric}`}
            author={author}
            rubrics={rubrics}
            seedId={rubricSeed}
            nextId={`rb-new-${rubrics.length + 1}`}
            onSave={(r) => {
              setRubrics((list) => [r, ...list]);
              setRubricSeed(r.id);
              setNonce((n) => ({ ...n, rubric: n.rubric + 1 }));
            }}
          />
        </div>
      ) : null}

      {/* ------------------------------------------------------------------ detail */}
      {selected ? (
        <DetailDrawer
          quiz={selected}
          open={Boolean(detail?.open)}
          onClose={() => setDetail((d) => (d ? { ...d, open: false } : d))}
          author={author}
          rubricName={rubrics.find((r) => r.id === selected.rubricId)?.name}
          onStatus={(status) => {
            setStatus(selected.id, status);
            toast(
              status === "in-review"
                ? { title: "Submitted for review", body: `${staffName(author.reviewerId)} is asked to review ${selected.title}.`, tone: "info" }
                : status === "closed"
                  ? { title: `Closed: ${selected.title}`, body: "Learners can no longer start an attempt.", tone: "warning" }
                  : { title: status === "scheduled" ? `Scheduled: ${selected.title}` : `Published: ${selected.title}`, body: formatRange(selected.opensOn, selected.closesOn) },
            );
          }}
          onDuplicate={() => {
            setDetail((d) => (d ? { ...d, open: false } : d));
            duplicate(selected);
          }}
        />
      ) : null}
    </div>
  );
}

function DetailDrawer({
  quiz: q,
  open,
  onClose,
  author,
  rubricName,
  onStatus,
  onDuplicate,
}: {
  quiz: LocalQuiz;
  open: boolean;
  onClose: () => void;
  author: ReturnType<typeof useAuthor>;
  rubricName?: string;
  onStatus: (status: LocalQuiz["status"]) => void;
  onDuplicate: () => void;
}) {
  const own = author.papers.includes(q.paper as PaperCode);
  const reason = `Only faculty assigned to ${q.paper} change this. Created by ${staffName(q.createdBy)}.`;
  const learners = q.cohortIds.reduce((n, id) => n + (cohortById(id)?.size ?? 0), 0);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="w-full max-w-xl"
      title={q.title}
      sub={`${KIND_LABELS[q.kind]} · ${q.paper} · ${staffName(q.createdBy)}`}
      footer={
        <div className="flex w-full flex-wrap items-center gap-2">
          {q.status === "draft" ? (
            <GatedButton
              allowed={own}
              reason={reason}
              onClick={() => onStatus(author.canPublish ? (q.opensOn > ACCA_TODAY ? "scheduled" : "published") : "in-review")}
            >
              {author.canPublish ? <Upload className="size-4" /> : <Send className="size-4" />}
              {author.publishLabel}
            </GatedButton>
          ) : null}
          {(q.status === "published" || q.status === "scheduled") && q.closesOn >= ACCA_TODAY ? (
            <GatedButton allowed={own && author.canPublish} reason={own ? "Faculty with publish rights close a window" : reason} variant="outline" onClick={() => onStatus("closed")}>
              Close the window
            </GatedButton>
          ) : null}
          <GatedButton allowed={own} reason={reason} variant="ghost" onClick={onDuplicate}>
            <Copy className="size-4" />
            {q.kind === "mock" ? "Duplicate for the next session" : "Duplicate"}
          </GatedButton>
          {q.attempts > 0 && q.rubricId ? (
            <LinkButton href="/faculty/evaluation" variant="ghost" className="ml-auto">
              Grade in Evaluation
            </LinkButton>
          ) : null}
        </div>
      }
    >
      <div className="space-y-5 px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <PaperCodeChip code={q.paper} />
          <StatusPill status={q.status} size="sm" />
          {q.proctored ? (
            <span className="inline-flex items-center gap-1 text-[12.5px] text-ink-2">
              <ShieldCheck className="size-3.5" /> Proctored
            </span>
          ) : null}
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Marks", q.totalMarks],
            ["Duration", durationLabel(q.durationMins)],
            ["Attempts", q.attempts],
            ["Average", q.avgScore === null ? "None yet" : `${q.avgScore}%`],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0 rounded-[var(--radius-md)] border border-line px-3 py-2.5">
              <dt className="text-[11px] font-bold tracking-[0.1em] text-ink-3 uppercase">{k}</dt>
              <dd className="mt-0.5 font-display text-[18px] font-bold text-ink tnum">{v}</dd>
            </div>
          ))}
        </dl>

        <section>
          <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Blueprint</p>
          <ul className="divide-y divide-line rounded-[var(--radius-md)] border border-line">
            {q.blueprint.map((b, i) => (
              <li key={`${b.section}-${i}`} className="flex items-start gap-3 px-3.5 py-2.5">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink">{b.section}</span>
                  <span className="block text-[12.5px] text-ink-2">{b.format}</span>
                  <span className="block text-[12px] text-ink-3">
                    Areas {b.areas.join(", ") || "not set"}
                    {b.questionIds?.length ? ` · ${plural(b.questionIds.length, "bank question")} linked` : ""}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-[14px] font-bold text-ink tnum">{b.marks}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-1.5 text-[13px] text-ink-2">
          <p className="mb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Window and cohorts</p>
          <p>
            <span className="font-semibold text-ink">{formatRange(q.opensOn, q.closesOn)}</span> · {q.attemptsAllowed ?? 1} attempt{(q.attemptsAllowed ?? 1) === 1 ? "" : "s"} allowed
          </p>
          <ul className="space-y-1">
            {q.cohortIds.map((id) => {
              const c = cohortById(id);
              return (
                <li key={id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{c?.name ?? id}</span>
                  <span className="shrink-0 text-ink-3 tnum">{c?.size ?? 0} learners</span>
                </li>
              );
            })}
            {q.cohortIds.length === 0 ? <li className="text-ink-3">No cohorts assigned yet.</li> : null}
          </ul>
          {learners ? <p className="text-[12px] text-ink-3">{learners} learners in total</p> : null}
          {rubricName ? (
            <p className="pt-2">
              Rubric: <span className="font-semibold text-ink">{rubricName}</span>
            </p>
          ) : null}
        </section>
      </div>
    </Drawer>
  );
}
