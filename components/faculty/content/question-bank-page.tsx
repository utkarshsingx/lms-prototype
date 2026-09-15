"use client";

import { useMemo, useState } from "react";
import { Database, FilePlus2, KeyRound, Library, ListChecks, Plus, Send, Tags, Upload } from "lucide-react";
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  paperByCode,
  questionBanks,
  staffName,
  syllabusAreaTitle,
  type BankQuestionType,
  type Difficulty,
  type QuestionBank,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import {
  AddQuestionDrawer,
  AnswerKeyDrawer,
  CreateBankDrawer,
  KeyPill,
  QuestionDrawer,
  TagQuestionsDrawer,
  type QuestionTagPatch,
} from "./question-drawers";
import {
  KEY_STATE,
  TYPE_SHORT,
  guideTotal,
  keyState,
  needsGuide,
  seedQuestions,
  type LocalQuestion,
} from "./question-model";
import {
  ActionTile,
  DifficultyMeter,
  GatedButton,
  PaperCodeChip,
  SubmitOnlyChip,
  listPapers,
  plural,
  useAuthor,
} from "./shared";

const DIFF_LEVEL: Record<Difficulty, 1 | 2 | 3> = { foundation: 1, intermediate: 2, "exam-standard": 3 };
const TYPE_BAR: Record<BankQuestionType, string> = { OT: "bg-ink", number: "bg-info", MTQ: "bg-violet", CR: "bg-cta" };
const TYPE_ORDER: BankQuestionType[] = ["OT", "number", "MTQ", "CR"];

export function QuestionBankPage() {
  const { persona } = useRole();
  return <QuestionBankView key={persona.id} />;
}

function QuestionBankView() {
  const author = useAuthor();
  const { papers, canPublish } = author;

  const [banks, setBanks] = useState<QuestionBank[]>(questionBanks);
  const [questions, setQuestions] = useState<LocalQuestion[]>(seedQuestions);

  const [scope, setScope] = useState("mine");
  const [tab, setTab] = useState("questions");
  const [bankId, setBankId] = useState("");
  const [fArea, setFArea] = useState("");
  const [fType, setFType] = useState("");
  const [fDiff, setFDiff] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fKey, setFKey] = useState("");

  const [createBank, setCreateBank] = useState({ open: false, nonce: 0 });
  const [addQ, setAddQ] = useState<{ open: boolean; type: BankQuestionType; bankId?: string; nonce: number }>({ open: false, type: "OT", nonce: 0 });
  const [tagging, setTagging] = useState<{ open: boolean; ids: string[]; nonce: number }>({ open: false, ids: [], nonce: 0 });
  const [detail, setDetail] = useState<{ open: boolean; id: string; nonce: number } | null>(null);
  const [keyFor, setKeyFor] = useState<{ open: boolean; id?: string; nonce: number }>({ open: false, nonce: 0 });

  const openAdd = (type: BankQuestionType, forBank?: string) => setAddQ((a) => ({ open: true, type, bankId: forBank, nonce: a.nonce + 1 }));
  const openTag = (ids: string[]) => setTagging((t) => ({ open: true, ids, nonce: t.nonce + 1 }));
  const openKey = (id?: string) => setKeyFor((k) => ({ open: true, id, nonce: k.nonce + 1 }));

  const myBanks = banks.filter((b) => papers.includes(b.paper));
  const scopedBanks = scope === "mine" ? myBanks : banks;
  const bank = scopedBanks.find((b) => b.id === bankId);
  const mine = useMemo(() => questions.filter((q) => papers.includes(q.paper)), [questions, papers]);
  const scoped = scope === "mine" ? mine : questions;
  const inBank = bank ? scoped.filter((q) => bank.questionIds.includes(q.id)) : scoped;
  const scopePapers = Array.from(new Set(inBank.map((q) => q.paper)));
  const areaPaper = bank?.paper ?? (scopePapers.length === 1 ? scopePapers[0] : undefined);

  const rows = inBank.filter(
    (q) =>
      (!fArea || q.syllabusArea === fArea) &&
      (!fType || q.type === fType) &&
      (!fDiff || q.difficulty === fDiff) &&
      (!fStatus || q.status === fStatus) &&
      (!fKey || keyState(q) === fKey),
  );
  const filtersActive = Boolean(bankId || fArea || fType || fDiff || fStatus || fKey);
  const clearFilters = () => {
    setBankId("");
    setFArea("");
    setFType("");
    setFDiff("");
    setFStatus("");
    setFKey("");
  };

  const crQuestions = inBank.filter((q) => q.type === "CR");
  const needing = mine.filter((q) => keyState(q) === "needs-points" || keyState(q) === "missing");
  const canEditQ = (q: LocalQuestion) => papers.includes(q.paper);

  /* ------------------------------------------------------------------ mutations */

  const patchQuestion = (id: string, patch: Partial<LocalQuestion>) =>
    setQuestions((list) => list.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const applyTags = (ids: string[], patch: QuestionTagPatch) => {
    setQuestions((list) =>
      list.map((q) =>
        ids.includes(q.id)
          ? {
              ...q,
              paper: patch.paper ?? q.paper,
              bankId: patch.paper ? `qb-${patch.paper.toLowerCase()}` : q.bankId,
              syllabusArea: patch.area ?? (patch.paper && patch.paper !== q.paper ? (paperByCode(patch.paper)?.syllabusAreas[0]?.code ?? q.syllabusArea) : q.syllabusArea),
              topic: patch.topic ?? q.topic,
              difficulty: patch.difficulty ?? q.difficulty,
            }
          : q,
      ),
    );
    if (patch.paper) {
      const to = patch.paper;
      setBanks((list) =>
        list.map((b) => {
          const moving = ids.filter((id) => questions.find((q) => q.id === id)?.paper !== to);
          if (b.id === `qb-${to.toLowerCase()}`) return { ...b, questionIds: Array.from(new Set([...b.questionIds, ...ids])) };
          if (b.paper !== to) return { ...b, questionIds: b.questionIds.filter((id) => !moving.includes(id)) };
          return b;
        }),
      );
    }
  };

  const setStatuses = (ids: string[], status: LocalQuestion["status"]) =>
    setQuestions((list) => list.map((q) => (ids.includes(q.id) ? { ...q, status } : q)));

  /* ------------------------------------------------------------------ question table */

  const columns: DataTableColumn<LocalQuestion>[] = [
    {
      key: "stem",
      header: "Question",
      wrap: true,
      className: "min-w-[18rem]",
      sortable: true,
      sortValue: (q) => q.id,
      render: (q) => (
        <span className="block min-w-0">
          <span className="flex items-center gap-2">
            <span className="font-mono text-[11.5px] text-ink-3">{q.id}</span>
            <span className="font-semibold text-ink">{q.topic}</span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-2">{q.stem}</span>
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      render: (q) => (
        <span title={QUESTION_TYPE_LABELS[q.type]} className="inline-flex items-center gap-1.5 whitespace-nowrap">
          <span aria-hidden className={cn("size-2 rounded-full", TYPE_BAR[q.type])} />
          <span className="text-[12.5px] font-semibold text-ink">{TYPE_SHORT[q.type]}</span>
        </span>
      ),
    },
    { key: "paper", header: "Paper", sortable: true, render: (q) => <PaperCodeChip code={q.paper} /> },
    {
      key: "syllabusArea",
      header: "Syllabus area",
      sortable: true,
      sortValue: (q) => `${q.paper}${q.syllabusArea}`,
      render: (q) => (
        <span className="flex max-w-[13rem] min-w-0 items-center gap-1.5" title={syllabusAreaTitle(q.paper, q.syllabusArea)}>
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cta text-[11px] font-bold text-cta-ink">{q.syllabusArea}</span>
          <span className="min-w-0 truncate text-[12.5px] text-ink-2">{syllabusAreaTitle(q.paper, q.syllabusArea)}</span>
        </span>
      ),
    },
    {
      key: "difficulty",
      header: "Difficulty",
      sortable: true,
      sortValue: (q) => DIFF_LEVEL[q.difficulty],
      render: (q) => <DifficultyMeter level={DIFF_LEVEL[q.difficulty]} label={DIFFICULTY_LABELS[q.difficulty]} />,
    },
    { key: "marks", header: "Marks", align: "right", mono: true, sortable: true },
    {
      key: "facilityIndex",
      header: "Facility",
      align: "right",
      sortable: true,
      sortValue: (q) => q.facilityIndex ?? -1,
      render: (q) =>
        q.facilityIndex === null ? (
          <span className="text-[12px] text-ink-3">Not used</span>
        ) : (
          <span className={cn("font-mono tnum", q.facilityIndex < 0.45 ? "text-rose" : "text-ink")}>{Math.round(q.facilityIndex * 100)}%</span>
        ),
    },
    {
      key: "key",
      header: "Answer key",
      sortable: true,
      sortValue: (q) => KEY_STATE[keyState(q)].order,
      render: (q) => <KeyPill question={q} />,
    },
    { key: "status", header: "Status", sortable: true, render: (q) => <StatusPill status={q.status} size="sm" /> },
  ];

  const keyColumns: DataTableColumn<LocalQuestion>[] = [
    {
      key: "topic",
      header: "Question",
      sortable: true,
      wrap: true,
      className: "min-w-[14rem]",
      render: (q) => (
        <span className="block">
          <span className="font-mono text-[11.5px] text-ink-3">{q.id}</span> <span className="font-semibold text-ink">{q.topic}</span>
          <span className="block text-[12px] text-ink-3">
            {q.paper} {q.syllabusArea} · {QUESTION_TYPE_LABELS[q.type]}
          </span>
        </span>
      ),
    },
    {
      key: "answerKey",
      header: "Answer key",
      wrap: true,
      className: "min-w-[16rem]",
      render: (q) => (
        <span className="line-clamp-2 text-[12.5px] leading-snug text-ink-2">
          {q.answerKey || "Not written"}
          {q.unit ? ` ${q.unit}` : ""}
        </span>
      ),
    },
    {
      key: "points",
      header: "Marking guide",
      sortable: true,
      sortValue: (q) => q.guide?.length ?? 0,
      render: (q) =>
        needsGuide(q.type) ? (
          <span className="text-[12.5px] whitespace-nowrap text-ink-2 tnum">
            {plural(q.guide?.length ?? 0, "point")} · {guideTotal(q.guide)} of {q.marks}
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">Not needed</span>
        ),
    },
    {
      key: "state",
      header: "Status",
      sortable: true,
      sortValue: (q) => KEY_STATE[keyState(q)].order,
      render: (q) => <KeyPill question={q} />,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (q) => {
        const s = keyState(q);
        return (
          <GatedButton
            allowed={canEditQ(q)}
            reason={`Only faculty assigned to ${q.paper} write its answer keys`}
            size="xs"
            variant={s === "needs-points" || s === "missing" ? "primary" : "outline"}
            onClick={() => openKey(q.id)}
          >
            <KeyRound className="size-3" />
            {s === "needs-points" || s === "missing" ? "Create answer key" : "Edit answer key"}
          </GatedButton>
        );
      },
    },
  ];

  /* ------------------------------------------------------------------ figures */

  const mineCr = mine.filter((q) => q.type === "CR").length;
  const examStandard = mine.filter((q) => q.difficulty === "exam-standard").length;
  const waiting = mine.filter((q) => q.status === "in-review" || q.status === "draft").length;
  const used = mine.filter((q) => q.facilityIndex !== null);
  const avgFacility = used.length ? Math.round((used.reduce((n, q) => n + (q.facilityIndex ?? 0), 0) / used.length) * 100) : null;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Assessment"
        title="Question bank"
        sub="Create question banks, tag every question by paper, syllabus area, topic and difficulty, and write constructed-response questions with the answer keys markers use."
        badge={
          <>
            <ScopeChip icon={<Database aria-hidden />}>Your banks: {listPapers(papers)}</ScopeChip>
            {canPublish ? null : <SubmitOnlyChip />}
          </>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setCreateBank((c) => ({ open: true, nonce: c.nonce + 1 }))}>
              <Library className="size-4" />
              Create question bank
            </Button>
            <Button onClick={() => openAdd("OT", bank && papers.includes(bank.paper) ? bank.id : undefined)}>
              <Plus className="size-4" />
              Add question
            </Button>
          </>
        }
      />

      <KpiRow cols={5}>
        <KpiTile hero label="Questions in your banks" value={mine.length} sub={`${plural(myBanks.length, "bank")} · ${listPapers(papers)}`} icon={<Database />} />
        <KpiTile label="Constructed response" value={mineCr} tone="info" sub="Scenario questions with requirements" />
        <KpiTile label="Exam standard" value={examStandard} tone="violet" sub={`${mine.length ? Math.round((examStandard / mine.length) * 100) : 0}% of your questions`} />
        <KpiTile label="Answer keys to complete" value={needing.length} tone={needing.length ? "amber" : "jade"} sub={needing.length ? "Need marking points" : "Every key is complete"} />
        <KpiTile label="Average facility" value={avgFacility === null ? "Not used" : `${avgFacility}%`} sub={`${plural(waiting, "question")} in draft or review`} />
      </KpiRow>

      <Card>
        <CardHeader
          title="Build your banks"
          sub={
            canPublish
              ? "Questions you publish are available to quizzes and mock exams straight away."
              : `Questions you write are submitted for review by ${staffName(author.reviewerId)} before they reach a quiz or mock.`
          }
        />
        <div className="grid gap-2.5 border-t border-line px-5 py-5 sm:grid-cols-2 xl:grid-cols-4">
          <ActionTile
            icon={Library}
            label="Create question banks"
            sub="A bank per paper or purpose: topic practice, mock pool, reattempt"
            count={`${plural(myBanks.length, "bank")} for your papers`}
            onClick={() => setCreateBank((c) => ({ open: true, nonce: c.nonce + 1 }))}
          />
          <ActionTile
            icon={Tags}
            label="Tag questions by paper, topic and difficulty"
            sub="Tags the questions in the current view, or select rows in the table first"
            count={`${plural(mine.length, "question")} tagged`}
            onClick={() => {
              const shown = rows.filter((q) => canEditQ(q)).map((q) => q.id);
              openTag(shown.length ? shown : mine.map((q) => q.id));
            }}
          />
          <ActionTile
            icon={FilePlus2}
            label="Create constructed-response questions"
            sub="Scenario, requirements with marks and professional skills marks"
            count={`${mineCr} in your banks`}
            onClick={() => openAdd("CR")}
          />
          <ActionTile
            icon={KeyRound}
            label="Create answer keys"
            sub="Correct answers, tolerances and marking points that add up"
            count={needing.length ? `${plural(needing.length, "key")} need marking points` : "All keys complete"}
            onClick={() => openKey(needing[0]?.id)}
          />
        </div>
      </Card>

      {/* ------------------------------------------------------------------ banks */}
      <section className="space-y-3.5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">Question banks</h2>
            <p className="mt-1 text-[13.5px] text-ink-2">Choose a bank to filter the questions below.</p>
          </div>
          <Segmented
            size="sm"
            value={scope}
            onChange={(v) => {
              setScope(v);
              clearFilters();
            }}
            items={[
              { id: "mine", label: "Your banks" },
              { id: "all", label: "All banks" },
            ]}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {scopedBanks.map((b) => (
            <BankCard
              key={b.id}
              bank={b}
              questions={questions.filter((q) => b.questionIds.includes(q.id))}
              selected={b.id === bankId}
              own={papers.includes(b.paper)}
              onSelect={() => {
                setBankId(b.id === bankId ? "" : b.id);
                setFArea("");
                setTab("questions");
              }}
              onAdd={() => openAdd("OT", b.id)}
            />
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ questions */}
      <section className="space-y-4">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[
            { id: "questions", label: "Questions", count: rows.length },
            { id: "cr", label: "Constructed-response questions", count: crQuestions.length },
            { id: "keys", label: "Answer keys", count: inBank.filter((q) => ["needs-points", "missing"].includes(keyState(q))).length },
          ]}
        />

        {tab === "questions" ? (
          <DataTable
            caption="Questions"
            rows={rows}
            columns={columns}
            getRowId={(q) => q.id}
            search={{
              placeholder: "Search question, topic or id",
              match: (q, s) => q.stem.toLowerCase().includes(s) || q.topic.toLowerCase().includes(s) || q.id.includes(s),
            }}
            filters={
              <FilterBar active={filtersActive} onClear={clearFilters}>
                <FilterSelect
                  label="Bank"
                  allLabel={scope === "mine" ? "All your banks" : "All banks"}
                  value={bankId}
                  onChange={(v) => {
                    setBankId(v);
                    setFArea("");
                  }}
                  options={scopedBanks.map((b) => ({ value: b.id, label: b.name }))}
                />
                {areaPaper ? (
                  <FilterSelect
                    label="Syllabus area"
                    allLabel="All"
                    value={fArea}
                    onChange={setFArea}
                    options={(paperByCode(areaPaper)?.syllabusAreas ?? []).map((a) => ({ value: a.code, label: `${a.code} · ${a.title}` }))}
                  />
                ) : null}
                <FilterSelect
                  label="Type"
                  allLabel="All"
                  value={fType}
                  onChange={setFType}
                  options={TYPE_ORDER.map((t) => ({ value: t, label: QUESTION_TYPE_LABELS[t] }))}
                />
                <FilterSelect
                  label="Difficulty"
                  allLabel="All"
                  value={fDiff}
                  onChange={setFDiff}
                  options={(Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
                />
                <FilterSelect
                  label="Status"
                  allLabel="All"
                  value={fStatus}
                  onChange={setFStatus}
                  options={[
                    { value: "published", label: "Published" },
                    { value: "in-review", label: "In review" },
                    { value: "draft", label: "Draft" },
                    { value: "retired", label: "Retired" },
                  ]}
                />
                <FilterSelect
                  label="Answer key"
                  allLabel="All"
                  value={fKey}
                  onChange={setFKey}
                  options={(Object.keys(KEY_STATE) as (keyof typeof KEY_STATE)[]).map((k) => ({ value: k, label: KEY_STATE[k].label }))}
                />
              </FilterBar>
            }
            selectable
            bulkActions={(ids, clear) => (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    const own = ids.filter((id) => mine.some((q) => q.id === id));
                    if (own.length === 0) {
                      toast({ title: "No questions from your papers selected", body: "You tag questions in the papers assigned to you.", tone: "warning" });
                      return;
                    }
                    openTag(own);
                    clear();
                  }}
                >
                  <Tags className="size-3.5" />
                  Tag selected
                </Button>
                <Button
                  size="sm"
                  variant="inverse"
                  onClick={() => {
                    const drafts = mine.filter((q) => ids.includes(q.id) && q.status === "draft");
                    if (drafts.length === 0) {
                      toast({ title: "No drafts from your papers selected", tone: "warning" });
                      return;
                    }
                    setStatuses(
                      drafts.map((q) => q.id),
                      canPublish ? "published" : "in-review",
                    );
                    toast(
                      canPublish
                        ? { title: `${plural(drafts.length, "question")} published`, body: drafts.map((q) => q.id).join(", ") }
                        : { title: `${plural(drafts.length, "question")} submitted for review`, body: `${staffName(author.reviewerId)} is asked to review them.`, tone: "info" },
                    );
                    clear();
                  }}
                >
                  {canPublish ? <Upload className="size-3.5" /> : <Send className="size-3.5" />}
                  {canPublish ? "Publish selected drafts" : "Submit selected for review"}
                </Button>
              </>
            )}
            onRowClick={(q) => setDetail((d) => ({ open: true, id: q.id, nonce: (d?.nonce ?? 0) + 1 }))}
            rowLabel={(q) => `Open ${q.id}`}
            empty={<p className="py-6 text-center text-[13px] text-ink-3">No questions in this bank yet. Add the first one.</p>}
          />
        ) : null}

        {tab === "cr" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="min-w-0 text-[13.5px] text-ink-2">
                Section C style questions: a scenario, requirements with marks and, where the paper awards them, professional skills marks.
              </p>
              <Button size="sm" onClick={() => openAdd("CR", bank && papers.includes(bank.paper) ? bank.id : undefined)}>
                <FilePlus2 className="size-3.5" />
                Create constructed-response question
              </Button>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {crQuestions.map((q) => (
                <CrCard
                  key={q.id}
                  question={q}
                  own={canEditQ(q)}
                  onOpen={() => setDetail((d) => ({ open: true, id: q.id, nonce: (d?.nonce ?? 0) + 1 }))}
                  onKey={() => openKey(q.id)}
                />
              ))}
              {crQuestions.length === 0 ? (
                <Card className="p-8 text-center text-[13.5px] text-ink-3 lg:col-span-2">No constructed-response questions in this bank yet.</Card>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "keys" ? (
          <DataTable
            caption="Answer keys"
            rows={inBank}
            columns={keyColumns}
            getRowId={(q) => q.id}
            initialSort={{ key: "state", dir: "asc" }}
            search={{ placeholder: "Search question or key", match: (q, s) => q.topic.toLowerCase().includes(s) || q.answerKey.toLowerCase().includes(s) || q.id.includes(s) }}
            toolbar={
              <Button size="sm" onClick={() => openKey(needing[0]?.id)} disabled={mine.length === 0}>
                <KeyRound className="size-3.5" />
                Create answer keys
              </Button>
            }
          />
        ) : null}
      </section>

      {/* ------------------------------------------------------------------ drawers */}
      {myBanks.length ? (
        <CreateBankDrawer
          key={`bank-${createBank.nonce}`}
          open={createBank.open}
          onClose={() => setCreateBank((c) => ({ ...c, open: false }))}
          author={author}
          questions={questions}
          nextId={`qb-new-${banks.length + 1}`}
          onCreate={(b) => {
            setBanks((list) => [...list, b]);
            setScope("mine");
            clearFilters();
            setBankId(b.id);
            setTab("questions");
          }}
        />
      ) : null}

      {myBanks.length ? (
        <AddQuestionDrawer
          key={`add-${addQ.nonce}`}
          open={addQ.open}
          onClose={() => setAddQ((a) => ({ ...a, open: false }))}
          author={author}
          banks={myBanks}
          questions={questions}
          initialBankId={addQ.bankId}
          initialType={addQ.type}
          onCreate={(q, toBank) => {
            setQuestions((list) => [q, ...list]);
            setBanks((list) => list.map((b) => (b.id === toBank ? { ...b, questionIds: [q.id, ...b.questionIds] } : b)));
            setScope("mine");
            setFArea("");
            setFType("");
            setFDiff("");
            setFStatus("");
            setFKey("");
            setBankId(toBank);
            setTab(q.type === "CR" ? "cr" : "questions");
          }}
        />
      ) : null}

      <TagQuestionsDrawer
        key={`tag-${tagging.nonce}`}
        open={tagging.open}
        onClose={() => setTagging((t) => ({ ...t, open: false }))}
        author={author}
        selected={questions.filter((q) => tagging.ids.includes(q.id))}
        questions={questions}
        onApply={applyTags}
      />

      {detail
        ? (() => {
            const q = questions.find((x) => x.id === detail.id);
            return q ? (
              <QuestionDrawer
                key={`q-${detail.nonce}`}
                open={detail.open}
                onClose={() => setDetail((d) => (d ? { ...d, open: false } : d))}
                author={author}
                question={q}
                questions={questions}
                onSave={(id, patch) => applyTags([id], patch)}
                onStatus={(id, status) => setStatuses([id], status)}
                onEditKey={() => {
                  setDetail((d) => (d ? { ...d, open: false } : d));
                  openKey(q.id);
                }}
              />
            ) : null;
          })()
        : null}

      {mine.length ? (
        <AnswerKeyDrawer
          key={`key-${keyFor.nonce}`}
          open={keyFor.open}
          onClose={() => setKeyFor((k) => ({ ...k, open: false }))}
          questions={mine}
          initialId={keyFor.id}
          onSave={patchQuestion}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ pieces */

function BankCard({
  bank,
  questions,
  selected,
  own,
  onSelect,
  onAdd,
}: {
  bank: QuestionBank;
  questions: LocalQuestion[];
  selected: boolean;
  own: boolean;
  onSelect: () => void;
  onAdd: () => void;
}) {
  const total = questions.length;
  const byType = TYPE_ORDER.map((t) => ({ t, n: questions.filter((q) => q.type === t).length })).filter((x) => x.n > 0);
  const byDiff = (Object.keys(DIFFICULTY_LABELS) as Difficulty[]).map((d) => ({ d, n: questions.filter((q) => q.difficulty === d).length }));
  const areas = paperByCode(bank.paper)?.syllabusAreas ?? [];
  const covered = new Set(questions.map((q) => q.syllabusArea));
  const needing = questions.filter((q) => ["needs-points", "missing"].includes(keyState(q))).length;

  return (
    <Card className={cn("flex min-w-0 flex-col transition-shadow", selected ? "ring-2 ring-cta" : "")}>
      <button type="button" onClick={onSelect} aria-pressed={selected} className="flex-1 space-y-3.5 p-5 text-left">
        <div className="flex items-start gap-2.5">
          <PaperCodeChip code={bank.paper} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14.5px] font-bold text-ink">{bank.name}</p>
            <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-ink-3">{bank.description}</p>
          </div>
          <StatusPill status={bank.status} size="sm" />
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-display text-[28px] leading-none font-bold text-ink tnum">{total}</span>
          <span className="text-[12.5px] text-ink-3">questions</span>
          <span className="ml-auto text-[12px] text-ink-3 tnum">
            Areas {covered.size} of {areas.length}
          </span>
        </div>

        <div>
          <div className="flex h-2 overflow-hidden rounded-full bg-surface-3" aria-hidden>
            {byType.map(({ t, n }) => (
              <span key={t} className={TYPE_BAR[t]} style={{ width: `${(n / Math.max(total, 1)) * 100}%` }} />
            ))}
          </div>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-ink-2">
            {byType.map(({ t, n }) => (
              <span key={t} className="inline-flex items-center gap-1">
                <span aria-hidden className={cn("size-2 rounded-full", TYPE_BAR[t])} />
                {TYPE_SHORT[t]} {n}
              </span>
            ))}
            {total === 0 ? <span className="text-ink-3">No questions yet</span> : null}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-2 border-t border-line pt-3">
          {byDiff.map(({ d, n }) => (
            <div key={d} className="min-w-0">
              <dt className="truncate text-[11px] text-ink-3">{DIFFICULTY_LABELS[d]}</dt>
              <dd className="font-mono text-[13px] font-semibold text-ink tnum">{n}</dd>
            </div>
          ))}
        </dl>
      </button>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3">
        <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">
          {staffName(bank.ownerId)}
          {needing ? ` · ${plural(needing, "key")} to complete` : ""}
        </span>
        <GatedButton allowed={own} reason={`Only faculty assigned to ${bank.paper} add to this bank`} size="xs" variant="outline" onClick={onAdd}>
          <Plus className="size-3" />
          Add question
        </GatedButton>
      </div>
    </Card>
  );
}

function CrCard({
  question: q,
  own,
  onOpen,
  onKey,
}: {
  question: LocalQuestion;
  own: boolean;
  onOpen: () => void;
  onKey: () => void;
}) {
  const s = keyState(q);
  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex-1 space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <PaperCodeChip code={q.paper} />
          <span className="font-mono text-[12px] text-ink-3">{q.id}</span>
          <StatusPill status={q.status} size="sm" />
          <span className="ml-auto font-display text-[18px] font-bold text-ink tnum">{q.marks} marks</span>
        </div>
        <h3 className="text-[15px] leading-snug font-bold text-ink">{q.topic}</h3>
        <p className="text-[12.5px] text-ink-3">
          {q.syllabusArea} · {syllabusAreaTitle(q.paper, q.syllabusArea)} · {DIFFICULTY_LABELS[q.difficulty]}
        </p>
        {q.scenario ? <p className="line-clamp-3 text-[13px] leading-relaxed text-ink-2">{q.scenario}</p> : null}
        <ul className="space-y-1.5 rounded-[var(--radius-md)] border border-line bg-surface-2 px-3.5 py-2.5">
          {(q.requirements ?? []).map((r) => (
            <li key={r.id} className="flex gap-2 text-[13px] leading-snug">
              <span className="shrink-0 font-mono font-bold text-ink">{r.label}</span>
              <span className="min-w-0 flex-1 text-ink-2">{r.text}</span>
              <span className="shrink-0 font-mono text-ink tnum">{r.marks}</span>
            </li>
          ))}
          {q.professionalMarks ? (
            <li className="flex gap-2 border-t border-line pt-1.5 text-[13px]">
              <span className="min-w-0 flex-1 text-ink-2">Professional skills marks{q.professionalSkill ? `: ${q.professionalSkill.toLowerCase()}` : ""}</span>
              <span className="shrink-0 font-mono text-ink tnum">{q.professionalMarks}</span>
            </li>
          ) : null}
        </ul>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
          <ListChecks className="size-3.5" />
          {q.guide?.length ? `Marking guide: ${plural(q.guide.length, "point")}, ${guideTotal(q.guide)} of ${q.marks} marks` : "No marking points yet"}
          <KeyPill question={q} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-surface-2 px-5 py-3">
        <GatedButton
          allowed={own}
          reason={`Only faculty assigned to ${q.paper} write its answer keys`}
          size="sm"
          variant={s === "needs-points" || s === "missing" ? "primary" : "outline"}
          onClick={onKey}
        >
          <KeyRound className="size-3.5" />
          {s === "needs-points" || s === "missing" ? "Create answer key" : "Edit answer key"}
        </GatedButton>
        <Button size="sm" variant="ghost" onClick={onOpen}>
          <Tags className="size-3.5" />
          Tags and details
        </Button>
      </div>
    </Card>
  );
}
