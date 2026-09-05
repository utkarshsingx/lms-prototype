import { Clock, PhoneCall, TrendingUp, Zap } from "lucide-react";
import { campaigns, channelStats } from "@/lib/data";
import { PageHeader, StatTile } from "@/components/ui/misc";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { VoiceConsole } from "@/components/channels/voice-console";

export const metadata = { title: "Voice agent" };

const statusTone: Record<string, Tone> = {
  running: "jade",
  scheduled: "amber",
  paused: "neutral",
  done: "neutral",
};

export default function VoicePage() {
  const v = channelStats.voice;
  return (
    <div className="mx-auto max-w-[92rem] space-y-7">
      <PageHeader
        eyebrow="Channels · Voice"
        title="An agent that picks up the phone"
        sub="For the learners who never open email. Nova calls about deadlines, activation and coaching check-ins, acts on what it hears, and hands anything consequential to a person within the same call."
        actions={
          <>
            <Button variant="secondary" size="sm">
              Call logs
            </Button>
            <Button size="sm">New campaign</Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Calls placed, 7 days"
          value={v.calls7d}
          icon={<PhoneCall />}
          spark={[402, 448, 470, 512, 536, 558, 574, 596, 611]}
        />
        <StatTile
          label="Connect rate"
          value={`${v.connectRate}%`}
          tone="jade"
          delta={{ value: "4 pts", up: true }}
        />
        <StatTile
          label="Median call length"
          value={`${v.avgSeconds}s`}
          tone="violet"
          icon={<Clock />}
        />
        <StatTile
          label="Completion lift"
          value={`+${v.completionLift}%`}
          tone="ember"
          icon={<TrendingUp />}
        />
      </div>

      <section>
        <SectionTitle
          action={
            <span className="text-[12px] text-ink-3">
              Measured against an email-only holdout of 400 learners
            </span>
          }
        >
          Campaigns
        </SectionTitle>
        <div className="grid gap-4 lg:grid-cols-2">
          {campaigns.map((c) => (
            <Card key={c.id} className="flex flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={statusTone[c.status]} dot>
                  {c.status}
                </Badge>
                <Badge tone={c.channel === "voice" ? "ember" : "jade"}>
                  {c.channel === "voice" ? "Voice" : "WhatsApp"}
                </Badge>
                <span className="ml-auto text-[11.5px] text-ink-3">
                  {c.agent}
                </span>
              </div>

              <p className="mt-3 text-[15px] font-semibold tracking-[-0.012em] text-ink">
                {c.name}
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                {c.goal}
              </p>
              <p className="mt-2 text-[12px] text-ink-3">{c.audience}</p>

              <div className="mt-auto pt-4">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11.5px] text-ink-3">Reached</span>
                  <span className="text-[11.5px] font-medium text-ink tnum">
                    {c.reached.toLocaleString()} of {c.target.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={(c.reached / c.target) * 100}
                  height={5}
                  tone={c.status === "done" ? "jade" : "brand"}
                />
              </div>

              <dl className="mt-3.5 flex gap-x-7 border-t border-line pt-3">
                <div>
                  <dt className="text-[11px] text-ink-3">Connect</dt>
                  <dd className="mt-0.5 text-[13px] font-medium text-ink tnum">
                    {c.connectRate}%
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-ink-3">Converted</dt>
                  <dd className="mt-0.5 text-[13px] font-medium text-ink tnum">
                    {c.conversion}%
                  </dd>
                </div>
                <div className="ml-auto self-end">
                  <Button variant="ghost" size="xs">
                    {c.status === "running" ? "Pause" : "Open"}
                  </Button>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <SectionTitle>Call log</SectionTitle>
        <VoiceConsole />
      </section>

      <Card>
        <CardHeader
          title="Why a phone call, and where it stops"
          action={<Zap className="size-4 text-ember" />}
        />
        <div className="grid gap-6 border-t border-line px-5 py-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
              What it is good at
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              The 186 people at risk of missing a compliance deadline have all
              had four emails. A two-minute call converts 38% of them, and more
              usefully it finds out <em>why</em> — a suspended account, a wrong
              address, a deadline nobody knew about. Those causes never appear in
              an email open rate.
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
              What it never does
            </p>
            <p className="mt-2.5 text-[13px] leading-relaxed text-ink-2">
              It does not grant an extension, waive an attempt, change a grade or
              lift a suspension. It opens a ticket with the transcript attached
              and tells the learner who now owns it. Every call opens by saying
              it is automated, and calls only go to numbers with a logged
              consent event, inside the learner&rsquo;s own working hours.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
