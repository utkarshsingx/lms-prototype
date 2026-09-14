"use client";

import { useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronDown,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Voicemail,
  Waves,
  Zap,
} from "lucide-react";
import { calls, personById, voiceGuardrails, type VoiceCall } from "@/lib/data";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, LiveDot, type Tone } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/field";
import { Segmented } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";

const outcomeTone: Record<VoiceCall["outcome"], Tone> = {
  completed: "jade",
  callback: "brand",
  escalated: "rose",
  no_answer: "neutral",
  voicemail: "amber",
};

const outcomeIcon: Record<VoiceCall["outcome"], React.ComponentType<{ className?: string }>> = {
  completed: CheckCircle2,
  callback: PhoneCall,
  escalated: Zap,
  no_answer: PhoneMissed,
  voicemail: Voicemail,
};

/** Bar heights seeded from the call id, so a waveform never reshuffles. */
function waveBars(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const bars: number[] = [];
  for (let i = 0; i < 44; i++) {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    bars.push(12 + ((h >> (i % 7)) % 88));
  }
  return bars;
}

function Waveform({ seed, active }: { seed: string; active?: boolean }) {
  const bars = waveBars(seed);
  return (
    <div className="flex h-8 items-center gap-[2px]">
      {bars.map((b, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] shrink-0 rounded-full",
            active ? "bg-ember" : "bg-line-strong",
          )}
          style={{ height: `${b}%`, opacity: active ? 0.5 + (b / 200) : 0.8 }}
        />
      ))}
    </div>
  );
}

export function VoiceConsole() {
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(calls[0].id);
  const [guards, setGuards] = useState(
    Object.fromEntries(voiceGuardrails.map((g) => [g.id, g.on])),
  );

  const shown =
    filter === "all"
      ? calls
      : filter === "escalated"
        ? calls.filter((c) => c.outcome === "escalated")
        : calls.filter((c) => c.transcript.length > 0);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <Segmented
          value={filter}
          onChange={setFilter}
          size="sm"
          items={[
            { id: "all", label: "All calls" },
            { id: "connected", label: "Connected" },
            { id: "escalated", label: "Escalated" },
          ]}
        />

        {shown.map((c) => {
          const p = personById(c.personId);
          const agentName = c.agent.split(" · ")[0];
          const Icon = outcomeIcon[c.outcome];
          const expanded = open === c.id;
          const mins = `${Math.floor(c.seconds / 60)}:${String(c.seconds % 60).padStart(2, "0")}`;
          return (
            <Card key={c.id} className="overflow-hidden">
              <button
                onClick={() => setOpen(expanded ? null : c.id)}
                className="flex w-full flex-wrap items-center gap-4 p-4.5 text-left transition-colors hover:bg-surface-2"
              >
                <span
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-full",
                    c.direction === "outbound"
                      ? "bg-brand-soft text-brand"
                      : "bg-violet-soft text-violet",
                  )}
                >
                  {c.direction === "outbound" ? (
                    <PhoneOutgoing className="size-4" />
                  ) : (
                    <PhoneIncoming className="size-4" />
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    {p ? <Avatar name={p.name} size="xs" /> : null}
                    <span className="text-[13.5px] font-medium text-ink">
                      {p?.name}
                    </span>
                    <span className="text-[12px] text-ink-3">·</span>
                    <span className="text-[12.5px] text-ink-3">{c.agent}</span>
                  </p>
                  <p className="mt-1 truncate text-[12.5px] text-ink-2">
                    {c.intent}
                  </p>
                </div>

                <div className="hidden w-28 shrink-0 sm:block">
                  <Waveform seed={c.id} active={c.transcript.length > 0} />
                </div>

                <div className="shrink-0 text-right">
                  <Badge tone={outcomeTone[c.outcome]} dot>
                    <Icon className="size-3" />
                    {c.outcome.replace("_", " ")}
                  </Badge>
                  <p className="mt-1.5 text-[11.5px] text-ink-3 tnum">
                    {mins} ·{" "}
                    {new Date(c.startedAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>

                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-ink-3 transition-transform",
                    expanded && "rotate-180",
                  )}
                />
              </button>

              {expanded ? (
                <div className="border-t border-line">
                  {c.transcript.length ? (
                    <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_16rem]">
                      <div className="scrollbar-slim max-h-80 space-y-3.5 overflow-y-auto p-5">
                        {c.transcript.map((t, i) => (
                          <div key={i} className="flex gap-3">
                            <span
                              className={cn(
                                "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                                t.speaker === "agent"
                                  ? "bg-ember-soft text-ember"
                                  : "bg-surface-2 text-ink-3",
                              )}
                            >
                              {t.speaker === "agent" ? (
                                <Bot className="size-3" />
                              ) : (
                                <Waves className="size-3" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="flex items-baseline gap-2">
                                <span className="text-[11.5px] font-semibold text-ink-2">
                                  {t.speaker === "agent" ? agentName : p?.name.split(" ")[0]}
                                </span>
                                <span className="font-mono text-[10.5px] text-ink-3 tnum">
                                  {t.at}
                                </span>
                              </p>
                              <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink-2">
                                {t.text}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-line bg-surface-2 p-5 lg:border-t-0 lg:border-l">
                        <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                          What the agent updated
                        </p>
                        <ul className="mt-3 space-y-2.5">
                          {c.effects.map((e) => (
                            <li key={e} className="flex gap-2.5">
                              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-brand" />
                              <span className="text-[12.5px] leading-snug text-ink-2">
                                {e}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-relaxed text-ink-3">
                          Sentiment: {c.sentiment}. Every update above is written
                          to the learner&rsquo;s record and the audit log, with
                          the call attached.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-5">
                      <p className="text-[13px] text-ink-3">
                        No transcript: the call was not answered.{" "}
                        {c.effects.join(". ")}.
                      </p>
                    </div>
                  )}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Card>
          <CardHeader
            title="Voice agent"
            sub="Outbound calls for the programme team"
            action={<Badge tone="jade" dot>Live</Badge>}
          />
          <div className="space-y-3.5 border-t border-line px-5 py-4">
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-ember-soft text-ember">
                <PhoneCall className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-[12.5px] font-medium text-ink">
                  <LiveDot /> 3 calls in progress
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-3">
                  Exam entry, fee and class reminders
                </p>
              </div>
            </div>

            <dl className="space-y-2 text-[12.5px]">
              {[
                ["Voice", "Indian English, warm and unhurried"],
                ["Languages", "English, Hindi, Marathi, Malayalam"],
                ["Response time", "Under half a second"],
                ["Interruptions", "Learner can cut in at any time"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>

            <Button variant="secondary" size="sm" className="w-full">
              Edit call script
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Guardrails"
            sub="What the agent may say to a learner, and when it stops"
          />
          <div className="space-y-4 border-t border-line px-5 py-4">
            {voiceGuardrails.map((g) => (
              <Switch
                key={g.id}
                checked={guards[g.id]}
                onChange={(v) => {
                  setGuards((s) => ({ ...s, [g.id]: v }));
                  toast({
                    title: `${g.label} ${v ? "turned on" : "turned off"}`,
                    body: "Applies from the next call placed.",
                    tone: v ? "success" : "warning",
                  });
                }}
                label={g.label}
                sub={g.value}
              />
            ))}
          </div>
        </Card>
      </aside>
    </div>
  );
}
