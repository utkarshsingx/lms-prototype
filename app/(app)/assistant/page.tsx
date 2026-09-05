import {
  BookOpen,
  CalendarCheck,
  MessageSquareText,
  PhoneCall,
  ShieldAlert,
  Sparkles,
  Wrench,
} from "lucide-react";
import { channelStats, conversations } from "@/lib/data";
import { Chat } from "@/components/assistant/chat";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, LiveDot } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/misc";

export const metadata = { title: "Assistant" };

const TOOLS = [
  { icon: BookOpen, label: "Read your record", detail: "Enrolments, progress, scores, path position" },
  { icon: CalendarCheck, label: "Book study time", detail: "Writes calendar holds inside your working hours" },
  { icon: Wrench, label: "Enrol and unenrol", detail: "Any course you are eligible for" },
  { icon: MessageSquareText, label: "Open a ticket", detail: "Routes to the instructor who owns the course" },
];

const LIMITS = [
  "It will not change a grade, waive an attempt limit or lift an account suspension. Those go to a person, every time.",
  "It answers course questions from the course, and says so when the answer is not there rather than improvising.",
  "It never sees another learner's answers, scores or messages.",
];

export default function AssistantPage() {
  const recent = conversations.filter((c) => c.channel === "web").slice(0, 4);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Assistant"
        title="Ask it anything about your learning"
        sub="It is grounded in your record and the course content, and it can act on the platform. Where it cannot act, it says so and hands off to a person with the context attached."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="flex h-[min(660px,78vh)] flex-col overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
            <span className="grid size-8 place-items-center rounded-full bg-violet-soft text-violet">
              <Sparkles className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-ink">
                Meridian assistant
              </p>
              <p className="flex items-center gap-1.5 text-[12px] text-ink-3">
                <LiveDot tone="jade" /> Reading your enrolments, deadlines and
                path
              </p>
            </div>
            <Badge tone="neutral">Web</Badge>
          </div>
          <Chat compact className="flex-1" />
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader title="What it can do" sub="Tools it is allowed to call" />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {TOOLS.map((t) => (
                <li key={t.label} className="flex gap-3 px-5 py-3.5">
                  <t.icon className="mt-0.5 size-4 shrink-0 text-ink-3" />
                  <div>
                    <p className="text-[13px] font-medium text-ink">{t.label}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-3">
                      {t.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <CardHeader
              title="Where it stops"
              sub="The boundary is deliberate"
              action={<ShieldAlert className="size-4 text-amber" />}
            />
            <ul className="space-y-3 border-t border-line px-5 py-4">
              {LIMITS.map((l) => (
                <li
                  key={l}
                  className="flex gap-2.5 text-[12.5px] leading-relaxed text-ink-2"
                >
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-ink-3" />
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
                  <p className="text-[11.5px] text-ink-3 tnum">
                    +91 98••• ••432 · opted in
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
                  <p className="text-[11.5px] text-ink-3">
                    Reminders and coaching check-ins
                  </p>
                </div>
                <Badge tone="neutral">Off</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Recent"
              sub={`${channelStats.assistant.conversations7d.toLocaleString()} conversations across the org this week`}
            />
            <ul className="divide-y divide-[var(--line)] border-t border-line">
              {recent.map((c) => (
                <li key={c.id} className="px-5 py-3">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {c.topic}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-[11.5px] text-ink-3">
                    <Badge
                      tone={
                        c.status === "resolved"
                          ? "jade"
                          : c.status === "escalated"
                            ? "rose"
                            : "amber"
                      }
                    >
                      {c.status}
                    </Badge>
                    {c.messages.length} messages
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
