import {
  BadgeCheck,
  CheckCheck,
  MessageSquareText,
  Reply,
  ShieldCheck,
  UserMinus,
} from "lucide-react";
import { channelStats, whatsappTemplates } from "@/lib/data";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WhatsappInbox } from "@/components/channels/whatsapp-inbox";

export const metadata = { title: "WhatsApp" };

export default function WhatsappPage() {
  const w = channelStats.whatsapp;
  return (
    <div className="mx-auto max-w-[92rem] space-y-7">
      <PageHeader
        eyebrow="Channels · WhatsApp"
        title="The learner's phone, used sparingly"
        sub="The same assistant, reachable where people actually reply. Utility templates only, opted-in numbers only, and a human takes over the moment the assistant hits its boundary."
        actions={
          <>
            <Button variant="secondary" size="sm">
              Manage opt-ins
            </Button>
            <Button size="sm">New template</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatTile
          label="Delivered, 7 days"
          value={w.delivered7d.toLocaleString()}
          icon={<MessageSquareText />}
          spark={[1980, 2140, 2260, 2380, 2440, 2590, 2680, 2790, 2870]}
        />
        <StatTile label="Read rate" value={`${w.readRate}%`} tone="jade" icon={<CheckCheck />} />
        <StatTile label="Reply rate" value={`${w.replyRate}%`} tone="violet" icon={<Reply />} />
        <StatTile
          label="Learners reactivated"
          value={w.reactivated}
          tone="ember"
          delta={{ value: "38 this week" }}
        />
        <StatTile
          label="Opt-out rate"
          value={`${w.optOut}%`}
          tone="rose"
          icon={<UserMinus />}
        />
      </div>

      <section>
        <SectionTitle>Inbox</SectionTitle>
        <WhatsappInbox />
      </section>

      <section>
        <SectionTitle
          action={
            <span className="text-[12px] text-ink-3">
              Templates are reviewed by Meta before they can be sent
            </span>
          }
        >
          Message templates
        </SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {whatsappTemplates.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-[var(--radius-xs)] border border-line bg-surface-2 px-2 py-0.5 font-mono text-[12px] text-ink">
                  {t.name}
                </code>
                <Badge tone={t.category === "Utility" ? "brand" : "amber"}>
                  {t.category}
                </Badge>
                <Badge tone={t.status === "Approved" ? "jade" : "amber"} dot>
                  {t.status}
                </Badge>
                <span className="ml-auto text-[11.5px] text-ink-3 uppercase">
                  {t.language}
                </span>
              </div>

              <div className="mt-3.5 rounded-[var(--radius-md)] rounded-bl-[4px] border border-line bg-jade-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">
                {t.body.split(/(\{\{\d\}\})/g).map((part, i) =>
                  /^\{\{\d\}\}$/.test(part) ? (
                    <span
                      key={i}
                      className="rounded-[4px] bg-surface px-1 py-px font-mono text-[11.5px] text-ink-3"
                    >
                      {part}
                    </span>
                  ) : (
                    <span key={i}>{part}</span>
                  ),
                )}
              </div>

              <dl className="mt-3.5 flex flex-wrap gap-x-7 gap-y-2 border-t border-line pt-3">
                {[
                  ["Sent, 7d", t.sent7d.toLocaleString()],
                  ["Read", `${t.readRate}%`],
                  ["Replied", `${t.replyRate}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] text-ink-3">{k}</dt>
                    <dd className="mt-0.5 text-[13px] font-medium text-ink tnum">
                      {v}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <CardHeader
          title="Rules this channel runs under"
          sub="Enforced by the platform, not by convention"
          action={<ShieldCheck className="size-4 text-jade" />}
        />
        <ul className="grid gap-x-8 gap-y-3 border-t border-line px-5 py-4 sm:grid-cols-2">
          {[
            "Only numbers with a logged opt-in event ever receive a message.",
            "Outside the 24-hour session window, only approved utility templates send.",
            "STOP opts out immediately and permanently, across every campaign.",
            "Marketing templates are capped at one per learner per fortnight.",
            "A learner who replies with a question gets the assistant, not a template.",
            "Grades, attempt limits and account decisions escalate to a human.",
          ].map((r) => (
            <li key={r} className="flex gap-2.5">
              <BadgeCheck className="mt-0.5 size-4 shrink-0 text-jade" />
              <span className="text-[13px] leading-relaxed text-ink-2">{r}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
