"use client";

import { useState } from "react";
import { Megaphone, Pause, PhoneCall, PhoneForwarded, Play, Timer } from "lucide-react";
import { calls, campaigns as seedCampaigns, type Campaign } from "@/lib/data";
import { PageHeader } from "@/components/ui/misc";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { VoiceConsole } from "@/components/channels/voice-console";

const connected = calls.filter((c) => c.transcript.length > 0).length;
const escalated = calls.filter((c) => c.outcome === "escalated").length;
const avgSeconds = Math.round(calls.reduce((s, c) => s + c.seconds, 0) / Math.max(1, calls.length));

export function VoicePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(seedCampaigns.filter((c) => c.status !== "done"));
  const running = campaigns.filter((c) => c.status === "running").length;

  const toggle = (c: Campaign) => {
    const next = c.status === "running" ? "paused" : "running";
    setCampaigns((list) => list.map((x) => (x.id === c.id ? { ...x, status: next } : x)));
    toast({
      title: next === "paused" ? `Paused: ${c.name}` : `Running: ${c.name}`,
      body: next === "paused" ? "No new calls or messages go out until you resume." : "Calls resume within quiet hours.",
      tone: next === "paused" ? "warning" : "success",
    });
  };

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student support"
        title="Voice agent"
        sub="Review calls the voice agent placed and received, read what it changed on each learner record, and set what it may say."
        actions={
          <LinkButton href="/programme/whatsapp" variant="secondary">
            <PhoneForwarded className="size-4" /> WhatsApp inbox
          </LinkButton>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Recent calls" value={calls.length} icon={<PhoneCall />} sub={`${connected} connected · since 5 Sep`} />
        <KpiTile label="Escalated to the team" value={escalated} tone="rose" icon={<PhoneForwarded />} sub="Routed with the call attached" />
        <KpiTile label="Average call" value={`${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`} tone="info" icon={<Timer />} />
        <KpiTile label="Campaigns running" value={running} tone="jade" icon={<Megaphone />} sub={`${campaigns.length} active or scheduled`} />
      </KpiRow>

      <section className="space-y-3">
        <h2 className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Outreach campaigns</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {campaigns.map((c) => {
            const pct = Math.round((c.reached / Math.max(1, c.target)) * 100);
            return (
              <Card key={c.id} className="flex min-w-0 flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-[13.5px] leading-snug font-semibold text-ink">{c.name}</p>
                  <StatusPill status={c.status} size="sm" />
                </div>
                <p className="mt-1 text-[12px] leading-snug text-ink-3">{c.audience}</p>
                <div className="mt-3">
                  <div className="mb-1 flex justify-between text-[12px] text-ink-2 tnum">
                    <span>
                      {c.reached} of {c.target} reached
                    </span>
                    <span className="font-semibold text-ink">{pct}%</span>
                  </div>
                  <Progress value={pct} />
                </div>
                <p className="mt-2 text-[12px] text-ink-3">
                  {c.channel === "voice" ? "Voice" : "WhatsApp"} · {c.agent}
                  {c.status === "running" && c.reached > 0 ? ` · ${c.connectRate}% connect, ${c.conversion}% acted` : ""}
                </p>
                <div className="mt-auto pt-3">
                  {c.status === "scheduled" ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setCampaigns((list) => list.map((x) => (x.id === c.id ? { ...x, status: "running" } : x)));
                        toast({ title: `Started early: ${c.name}`, body: "The first calls go out in the next quiet-hours window." });
                      }}
                    >
                      <Play className="size-3.5" /> Start now
                    </Button>
                  ) : (
                    <Button size="xs" variant="outline" onClick={() => toggle(c)}>
                      {c.status === "running" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                      {c.status === "running" ? "Pause" : "Resume"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <VoiceConsole />
    </div>
  );
}
