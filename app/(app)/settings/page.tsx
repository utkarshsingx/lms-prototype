"use client";

import { useState } from "react";
import {
  Bell,
  Building2,
  Globe,
  KeyRound,
  MessageSquareText,
  Palette,
  PhoneCall,
  Plug,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Switch } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { ThemeGallery } from "@/components/theme/theme-picker";

const INTEGRATIONS = [
  { name: "WhatsApp Business", detail: "Meta Cloud API · +91 98765 43210", on: true, icon: MessageSquareText, tone: "jade" },
  { name: "Voice telephony", detail: "Outbound agent Nova · 4 numbers", on: true, icon: PhoneCall, tone: "ember" },
  { name: "Okta SCIM", detail: "Users and groups sync every 15 minutes", on: true, icon: KeyRound, tone: "brand" },
  { name: "Google Calendar", detail: "Study holds and live sessions", on: true, icon: Globe, tone: "violet" },
  { name: "Slack", detail: "Deadline nudges to a DM", on: false, icon: Plug, tone: "neutral" },
  { name: "Workday", detail: "Job role drives path assignment", on: false, icon: Building2, tone: "neutral" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState("workspace");
  const { mode, setMode, theme } = useTheme();
  const [flags, setFlags] = useState<Record<string, boolean>>({
    digest: true,
    deadline: true,
    whatsapp: true,
    voice: false,
    social: false,
    manager: true,
  });
  const set = (k: string) => (v: boolean) => setFlags((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl space-y-7">
      <PageHeader
        eyebrow="Settings"
        title="Workspace and channels"
        sub="What the platform is allowed to do, and to whom."
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "workspace", label: "Workspace" },
          { id: "notifications", label: "Notifications" },
          { id: "integrations", label: "Integrations", count: INTEGRATIONS.filter((i) => i.on).length },
          { id: "privacy", label: "Privacy" },
        ]}
      />

      {tab === "workspace" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Organisation" sub="Shown to every learner" />
            <div className="space-y-5 border-t border-line px-5 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Workspace name">
                  <Input defaultValue="Northwind" />
                </Field>
                <Field label="Domain" hint="Anyone with this domain can join">
                  <Input defaultValue="northwind.co" />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Default language">
                  <Select defaultValue="English (UK)">
                    {["English (UK)", "English (US)", "Hindi", "Japanese", "Portuguese"].map(
                      (l) => (
                        <option key={l}>{l}</option>
                      ),
                    )}
                  </Select>
                </Field>
                <Field label="Working week">
                  <Select defaultValue="Monday to Friday">
                    {["Monday to Friday", "Sunday to Thursday", "Custom"].map((l) => (
                      <option key={l}>{l}</option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Appearance"
              sub="Applies to your account only"
              action={<Palette className="size-4 text-ink-3" />}
            />
            <div className="border-t border-line px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {(["light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMode(t)}
                    className={
                      "flex items-center gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-left transition-all " +
                      (mode === t
                        ? "border-brand bg-brand-soft shadow-[0_0_0_3px_var(--ring)]"
                        : "border-line bg-surface hover:border-line-strong")
                    }
                  >
                    <span
                      className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-sm)] border border-line"
                      style={{
                        background:
                          t === "light" ? theme.light.paper : theme.dark.surface,
                      }}
                    >
                      <span
                        className="size-4 rounded-full"
                        style={{
                          background:
                            t === "light" ? theme.light.brand : theme.dark.brand,
                        }}
                      />
                    </span>
                    <span>
                      <span className="block text-[13.5px] font-medium text-ink capitalize">
                        {t}
                      </span>
                      <span className="text-[12px] text-ink-3">
                        {t === "light" ? "Warm paper ground" : "Low-light reading"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 border-t border-line pt-5">
                <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-3 uppercase">
                  Theme
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
                  Changes colour, typography and geometry across the whole
                  product. Light and dark are available in every theme.
                </p>
                <ThemeGallery className="mt-4" />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Enrolment defaults" />
            <div className="space-y-4 border-t border-line px-5 py-5">
              <Switch
                checked={flags.manager}
                onChange={set("manager")}
                label="Managers can assign courses"
                sub="Assignments carry a deadline and appear in the learner's dashboard"
              />
              <Switch
                checked
                onChange={() => {}}
                label="Auto-assign onboarding on start date"
                sub="New Joiner Onboarding, plus the two compliance courses"
              />
              <Switch
                checked
                onChange={() => {}}
                label="Self-enrolment open by default"
                sub="New published courses appear in the catalog for everyone"
              />
            </div>
          </Card>
        </div>
      ) : null}

      {tab === "notifications" ? (
        <Card>
          <CardHeader
            title="How the platform reaches you"
            sub="These are your own preferences. Compliance deadlines ignore them, which is the one exception and it is deliberate."
            action={<Bell className="size-4 text-ink-3" />}
          />
          <div className="space-y-4 border-t border-line px-5 py-5">
            <Switch
              checked={flags.deadline}
              onChange={set("deadline")}
              label="Deadline reminders"
              sub="14, 7 and 1 days before anything is due"
            />
            <Switch
              checked={flags.digest}
              onChange={set("digest")}
              label="Weekly digest"
              sub="Monday morning: what moved, what is next"
            />
            <Switch
              checked={flags.whatsapp}
              onChange={set("whatsapp")}
              label="WhatsApp"
              sub="+91 98••• ••432 · utility templates only, never marketing"
            />
            <Switch
              checked={flags.voice}
              onChange={set("voice")}
              label="Voice calls"
              sub="Weekdays 09:00–18:00 in your timezone. The agent says it is automated in its first sentence."
            />
            <Switch
              checked={flags.social}
              onChange={set("social")}
              label="Cohort activity"
              sub="Replies to your questions, and answers accepted"
            />
          </div>
        </Card>
      ) : null}

      {tab === "integrations" ? (
        <Card>
          <CardHeader title="Connected systems" />
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {INTEGRATIONS.map((i) => (
              <li key={i.name} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-md)]"
                  style={{
                    backgroundColor:
                      i.tone === "neutral"
                        ? "var(--surface-2)"
                        : `var(--${i.tone}-soft)`,
                    color:
                      i.tone === "neutral" ? "var(--ink-3)" : `var(--${i.tone})`,
                  }}
                >
                  <i.icon className="size-4.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-medium text-ink">{i.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-ink-3">
                    {i.detail}
                  </p>
                </div>
                {i.on ? (
                  <Badge tone="jade" dot>
                    Connected
                  </Badge>
                ) : null}
                <Button variant={i.on ? "secondary" : "primary"} size="xs">
                  {i.on ? "Configure" : "Connect"}
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {tab === "privacy" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader
              title="What your manager can see"
              action={<ShieldCheck className="size-4 text-jade" />}
            />
            <div className="grid gap-6 border-t border-line px-5 py-5 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-jade uppercase">
                  Visible
                </p>
                <ul className="mt-2.5 space-y-1.5 text-[13px] text-ink-2">
                  {[
                    "Which courses you completed",
                    "Whether you passed or failed",
                    "Compliance status and deadlines",
                    "Certificates held",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-jade" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.12em] text-rose uppercase">
                  Never visible
                </p>
                <ul className="mt-2.5 space-y-1.5 text-[13px] text-ink-2">
                  {[
                    "Your answers to any question",
                    "How many attempts you took",
                    "Anything you said to the assistant",
                    "Call and WhatsApp transcripts",
                    "Time of day you study",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-rose" />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Retention" />
            <div className="space-y-4 border-t border-line px-5 py-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Call audio">
                  <Select defaultValue="30 days">
                    {["Do not record", "7 days", "30 days", "90 days"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Transcripts">
                  <Select defaultValue="12 months">
                    {["3 months", "12 months", "24 months"].map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Switch
                checked
                onChange={() => {}}
                label="Export on request"
                sub="A learner can download everything the platform holds on them, in one file, without asking anyone"
              />
              <Switch
                checked
                onChange={() => {}}
                label="Delete on leaving"
                sub="Transcripts and chat history are purged 30 days after an account is deactivated. Certificates and compliance records are kept, because an auditor will ask for them."
              />
            </div>
          </Card>
        </div>
      ) : null}

      <div className="flex justify-end gap-3">
        <Button variant="secondary">Discard</Button>
        <Button>Save changes</Button>
      </div>
    </div>
  );
}
