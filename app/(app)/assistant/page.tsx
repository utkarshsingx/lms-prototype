import {
  BookOpenCheck,
  CalendarRange,
  FileSearch,
  MessageSquareText,
  PhoneCall,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Chat, TutorRecord } from "@/components/assistant/chat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, LiveDot } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "AI tutor" };

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

export default function AssistantPage() {
  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Help"
        title="AI tutor"
        sub="Ask about your papers, exams and readiness, or ask it to explain a topic. It is grounded in your ACCA record and your study material, and hands anything it cannot do to your faculty or the academic team."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card className="flex h-[min(680px,78vh)] min-w-0 flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <span className="grid size-8 place-items-center rounded-full bg-violet-soft text-violet">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">ACCA tutor</p>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                <LiveDot tone="jade" />
                <span className="truncate">Reading your papers, bookings and readiness scores</span>
              </p>
            </div>
            <Badge tone="violet">AI</Badge>
          </div>
          <Chat compact className="flex-1" />
        </Card>

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
                    <p className="text-[13px] font-medium text-ink">{t.label}</p>
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
                  <p className="text-[13px] font-medium text-ink">WhatsApp</p>
                  <p className="truncate text-[11.5px] text-ink-3 tnum">
                    Class reminders, entry deadlines, results
                  </p>
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
                  <p className="text-[13px] font-medium text-ink">Voice calls</p>
                  <p className="truncate text-[11.5px] text-ink-3">
                    Exam entry and fee reminders
                  </p>
                </div>
                <Badge tone="neutral">Off</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
