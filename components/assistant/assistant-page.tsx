"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarRange,
  FileSearch,
  MessageCircleQuestion,
  MessageSquareText,
  PhoneCall,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { paperName, type PaperCode, type Student } from "@/lib/data/acca";
import { Chat, TutorRecord } from "@/components/assistant/chat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, LiveDot } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";
import { ScopeChip } from "@/components/ui/page-toolbar";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { firstName, studyPapers, useStudentRecord } from "@/components/student/help/shared";

const TOOLS = [
  {
    icon: FileSearch,
    label: "Read your ACCA record",
    detail: "Papers, exemptions, exam bookings, attempts, mock results and readiness scores",
  },
  {
    icon: BookOpenCheck,
    label: "Explain a topic",
    detail: "From the study material, examiner's reports and model answers for your papers",
  },
  {
    icon: CalendarRange,
    label: "Plan revision",
    detail: "Against your exam date, your weakest syllabus areas and your batch timetable",
  },
  {
    icon: MessageSquareText,
    label: "Raise a doubt",
    detail: "Sends the question to your paper's faculty with the conversation attached",
  },
];

const LIMITS = [
  "It never changes a mark or a result. Marks come from faculty evaluation and, for the real exam, from ACCA.",
  "It never grants an extra attempt or a reattempt. Faculty approve those where authorised.",
  "It never enters or books an exam for you. Exam entries are made with ACCA in your own account.",
  "It answers from your papers' material and says so when the answer is not there, rather than improvising.",
  "It never sees another learner's answers, marks or messages.",
];

/* Prompts per paper. Each one maps to a grounded answer in the tutor script. */
const PAPER_PROMPTS: Partial<Record<PaperCode, string[]>> = {
  FR: ["Am I ready for FR in December?", "Explain goodwill on acquisition", "What is on the FR mock exam?", "Explain the FR exam format", "Can you change my mock mark?"],
  PM: ["Plan my PM reattempt", "Explain mix and yield variances", "When does December exam entry close?", "Can you grant me another attempt at PM?"],
  FA: ["When is my FA exam?", "Am I on track for FA?", "Explain suspense accounts", "What is on the FA mock exam?", "Can you change my mock mark?"],
  LW: ["Explain consideration in contract law", "When is my LW exam?", "How do classes work around university exams?", "Explain the LW exam format"],
};

function promptsFor(s: Student, paper: PaperCode | null): string[] {
  if (!paper) {
    return s.type === "undergraduate"
      ? ["When is my FA exam?", "Am I on track for FA?", "Why don't I have exemptions?", "What were my exam results?", "Can you change my mock mark?"]
      : ["When does December exam entry close?", "Am I ready for FR in December?", "Plan my PM reattempt", "What were my exam results?", "Can you change my mock mark?"];
  }
  return PAPER_PROMPTS[paper] ?? [`Explain the ${paper} exam format`, "What were my exam results?", "Talk to my mentor about planning", "Can you change my mock mark?"];
}

export function AssistantPage() {
  const s = useStudentRecord();
  return <AssistantView key={s.id} s={s} />;
}

function AssistantView({ s }: { s: Student }) {
  const papers = studyPapers(s).slice(0, 6);
  const [paper, setPaper] = useState<PaperCode | null>(s.currentPaper);
  const prompts = promptsFor(s, paper);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Help"
        title="AI tutor"
        sub="Ask about your papers, exams and readiness, or ask it to explain a topic. It is grounded in your ACCA record and your study material, and hands anything it cannot do to your faculty or the academic team."
        badge={<ScopeChip icon={<Sparkles />}>Grounded in {firstName(s.name)}&apos;s ACCA record</ScopeChip>}
        actions={
          <Link
            href="/doubts"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
          >
            <MessageCircleQuestion className="size-4" /> Ask faculty instead
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-4">
          <Card className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Paper context</p>
                <p className="mt-1 text-[13px] text-ink-2">
                  {paper ? (
                    <>
                      Answers lean on <span className="font-semibold text-ink">{paper} · {paperName(paper)}</span>
                    </>
                  ) : (
                    "Answers draw on all of your papers"
                  )}
                </p>
              </div>
              {paper ? <StatusPill status={s.papers[paper].status} size="sm" /> : null}
            </div>
            <div role="radiogroup" aria-label="Paper context" className="scrollbar-none mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
              {[null, ...papers].map((code) => {
                const active = code === paper;
                return (
                  <button
                    key={code ?? "all"}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setPaper(code);
                      toast({
                        title: code ? `Tutor context: ${code} · ${paperName(code)}` : "Tutor context: all papers",
                        tone: "ai",
                      });
                    }}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors",
                      active
                        ? "border-transparent bg-nav-active text-nav-active-ink"
                        : "border-line bg-surface text-ink-2 hover:border-cta hover:bg-cta-soft hover:text-ink",
                    )}
                  >
                    {code ?? "All papers"}
                  </button>
                );
              })}
            </div>
          </Card>

          <Card className="flex h-[min(640px,76vh)] min-w-0 flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-line bg-surface-inv px-5 py-3.5 text-ink-inv">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cta text-cta-ink">
                <Sparkles className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-bold">ACCA tutor{paper ? ` · ${paper}` : ""}</p>
                <p className="flex items-center gap-1.5 text-[12px] text-ink-inv/65">
                  <LiveDot tone="jade" />
                  <span className="truncate">Reading your papers, bookings and readiness scores</span>
                </p>
              </div>
              <Badge tone="cta">AI</Badge>
            </div>
            <Chat compact className="flex-1" paper={paper} suggestions={prompts} pinnedSuggestions />
          </Card>

        </div>

        <div className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="What it is reading" sub="Your record, updated as the team records it" />
            <TutorRecord />
          </Card>

          <Card>
            <CardHeader title="What it can do" sub="The only actions it is allowed to take" />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {TOOLS.map((t) => (
                <li key={t.label} className="flex gap-3 px-5 py-3.5">
                  <t.icon className="mt-0.5 size-4 shrink-0 text-ink-3" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-ink">{t.label}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-3">{t.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Where it stops"
              sub="Marks, attempts and exam entries stay with people"
              action={<ShieldAlert className="size-4 text-amber" />}
            />
            <ul className="space-y-3 border-t border-line px-5 py-4">
              {LIMITS.map((l) => (
                <li key={l} className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                  {l}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader title="Also reachable on" />
            <div className="space-y-3 border-t border-line px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-jade-soft text-jade">
                  <MessageSquareText className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">WhatsApp</p>
                  <p className="truncate text-[11.5px] text-ink-3">Class reminders, entry deadlines, results</p>
                </div>
                <Badge tone="jade" dot>
                  On
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-2 text-ink-3">
                  <PhoneCall className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">Voice calls</p>
                  <p className="truncate text-[11.5px] text-ink-3">Exam entry and fee reminders</p>
                </div>
                <Badge tone="neutral">Off</Badge>
              </div>
              <Link
                href="/notifications"
                className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
              >
                Channel preferences <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
