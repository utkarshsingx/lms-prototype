"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bell,
  BookOpenCheck,
  Briefcase,
  Building2,
  CalendarClock,
  CheckCheck,
  FileCheck2,
  MessageCircleQuestion,
  Trophy,
  UserRoundCheck,
  Video,
  Wallet,
} from "lucide-react";
import {
  communicationChannels,
  notificationsForStudent,
  type Student,
  type StudentNotification,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/field";
import { Matrix, MatrixCheck } from "@/components/ui/matrix";
import { toast } from "@/components/ui/toast";
import { DEMO_TODAY, addHours, dayTimeLabel, useStudentRecord } from "./shared";

type Filter = "all" | "exams" | "classes" | "payments" | "mentor" | "university";
type Channel = "in-app" | "email" | "whatsapp";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "exams", label: "Exams" },
  { id: "classes", label: "Classes" },
  { id: "payments", label: "Payments" },
  { id: "mentor", label: "Mentor" },
  { id: "university", label: "University" },
];

const UNIVERSITY_HREFS = ["/my-university", "/certificates", "/leaderboard", "/roadmap"];

function filterOf(n: StudentNotification): Filter | null {
  if (UNIVERSITY_HREFS.includes(n.href)) return "university";
  if (n.kind === "exam" || n.kind === "result" || n.href === "/mocks") return "exams";
  if (n.kind === "class" || n.kind === "doubt") return "classes";
  if (n.kind === "payment") return "payments";
  if (n.kind === "mentor") return "mentor";
  return null;
}

const ICONS: Record<StudentNotification["kind"], React.ComponentType<{ className?: string }>> = {
  class: Video,
  exam: CalendarClock,
  result: BookOpenCheck,
  payment: Wallet,
  mentor: UserRoundCheck,
  doubt: MessageCircleQuestion,
  announcement: Bell,
  career: Briefcase,
  exemption: FileCheck2,
};

const TINT: Record<StudentNotification["kind"], string> = {
  class: "bg-info-soft text-info",
  exam: "bg-amber-soft text-amber",
  result: "bg-jade-soft text-jade",
  payment: "bg-rose-soft text-rose",
  mentor: "bg-violet-soft text-violet",
  doubt: "bg-info-soft text-info",
  announcement: "bg-cta-soft text-ink",
  career: "bg-surface-2 text-ink-2",
  exemption: "bg-jade-soft text-jade",
};

const TOPICS = [
  { id: "exams", label: "Exams and results", sub: "Entry deadlines, bookings, results" },
  { id: "classes", label: "Classes and doubts", sub: "Reminders, recordings, answers" },
  { id: "payments", label: "Payments", sub: "Instalments and receipts" },
  { id: "mentor", label: "Mentor", sub: "Sessions and messages" },
  { id: "university", label: "University", sub: "Announcements and calendar" },
  { id: "career", label: "Career", sub: "Jobs, interviews, resume reviews" },
];

const CHANNELS: { id: Channel; label: string; sub: string }[] = [
  { id: "in-app", label: "In-app", sub: "Always on for exams" },
  { id: "email", label: "Email", sub: "" },
  { id: "whatsapp", label: "WhatsApp", sub: "" },
];

const DEFAULT_GRID: Record<string, Channel[]> = {
  exams: ["in-app", "email", "whatsapp"],
  classes: ["in-app", "whatsapp"],
  payments: ["in-app", "email", "whatsapp"],
  mentor: ["in-app", "whatsapp"],
  university: ["in-app", "email"],
  career: ["in-app", "email"],
};

export function NotificationsPage() {
  const s = useStudentRecord();
  return <NotificationsView key={s.id} s={s} />;
}

function NotificationsView({ s }: { s: Student }) {
  const [items, setItems] = useState<StudentNotification[]>(() =>
    [...notificationsForStudent(s.id)].sort((a, b) => b.at.localeCompare(a.at)),
  );
  const [filter, setFilter] = useState<Filter>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [channelsOn, setChannelsOn] = useState<Record<Channel, boolean>>({ "in-app": true, email: true, whatsapp: true });
  const [grid, setGrid] = useState<Record<string, Channel[]>>(DEFAULT_GRID);

  const whatsapp = communicationChannels.find((c) => c.id === "whatsapp");
  const unread = items.filter((n) => !n.read).length;
  const weekStart = addHours(`${DEMO_TODAY}T00:00`, -24 * 6).slice(0, 10);

  const visible = items.filter((n) => (filter === "all" || filterOf(n) === filter) && (!unreadOnly || !n.read));
  const groups = useMemo(
    () =>
      [
        { id: "today", label: "Today", rows: visible.filter((n) => n.at.slice(0, 10) === DEMO_TODAY) },
        { id: "week", label: "This week", rows: visible.filter((n) => n.at.slice(0, 10) < DEMO_TODAY && n.at.slice(0, 10) >= weekStart) },
        { id: "earlier", label: "Earlier", rows: visible.filter((n) => n.at.slice(0, 10) < weekStart) },
      ].filter((g) => g.rows.length > 0),
    [visible, weekStart],
  );

  const counts = Object.fromEntries(
    FILTERS.map((f) => [f.id, items.filter((n) => f.id === "all" || filterOf(n) === f.id).length]),
  ) as Record<Filter, number>;

  function setRead(id: string, read: boolean) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read } : n)));
  }

  function markAllRead() {
    if (unread === 0) return;
    setItems((list) => list.map((n) => ({ ...n, read: true })));
    toast({ title: `${unread} notifications marked read`, tone: "neutral" });
  }

  function toggleChannel(ch: Channel, on: boolean) {
    setChannelsOn((c) => ({ ...c, [ch]: on }));
    toast({
      title: `${CHANNELS.find((c) => c.id === ch)?.label} notifications ${on ? "on" : "off"}`,
      body: on ? "You will receive the topics ticked below." : "Nothing will be sent on this channel.",
      tone: on ? "success" : "neutral",
    });
  }

  function toggleCell(topic: string, ch: Channel, on: boolean) {
    setGrid((g) => ({ ...g, [topic]: on ? [...(g[topic] ?? []), ch] : (g[topic] ?? []).filter((x) => x !== ch) }));
    toast({
      title: `${TOPICS.find((t) => t.id === topic)?.label}: ${CHANNELS.find((c) => c.id === ch)?.label} ${on ? "on" : "off"}`,
      tone: "neutral",
    });
  }

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Help"
        title="Notifications"
        sub="Exam deadlines, classes, payments, your mentor and university updates in one place. Choose which ones also reach you by email or WhatsApp."
        badge={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-cta px-2.5 py-1 text-[12px] font-bold text-cta-ink tnum">
            {unread} unread
          </span>
        }
        actions={
          <Button onClick={markAllRead} disabled={unread === 0}>
            <CheckCheck className="size-4" /> Mark all read
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Segmented
              value={filter}
              onChange={(id) => setFilter(id as Filter)}
              items={FILTERS.map((f) => ({ id: f.id, label: `${f.label} ${counts[f.id]}` }))}
            />
            <label className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-2">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="size-4 accent-ink"
              />
              Unread only
            </label>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={filter === "university" ? <Building2 /> : <Bell />}
              title={filter === "university" && s.type === "graduate" ? "No university notifications" : "You are all caught up"}
              sub={
                filter === "university" && s.type === "graduate"
                  ? "University announcements reach learners on a university programme. Your programme updates arrive under Exams and Classes."
                  : "Nothing matches these filters."
              }
            />
          ) : (
            groups.map((g) => (
              <Card key={g.id} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-line bg-surface-2 px-5 py-2.5">
                  <h2 className="text-[11px] font-bold tracking-[0.12em] text-ink-2 uppercase">{g.label}</h2>
                  <span className="text-[12px] text-ink-3 tnum">{g.rows.length}</span>
                </div>
                <ul className="divide-y divide-[var(--line)]">
                  {g.rows.map((n) => {
                    const Icon = n.href === "/leaderboard" ? Trophy : ICONS[n.kind];
                    return (
                      <li
                        key={n.id}
                        className={cn("relative flex gap-3.5 px-4 py-3.5 transition-colors hover:bg-cta-soft sm:px-5", !n.read && "bg-cta-soft/50")}
                      >
                        {!n.read ? <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-cta" /> : null}
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TINT[n.kind])}>
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                            <p className={cn("min-w-0 text-[14px] leading-snug text-ink", n.read ? "font-medium" : "font-bold")}>
                              {n.title}
                              {!n.read ? <span className="sr-only"> (unread)</span> : null}
                            </p>
                            <span className="shrink-0 text-[12px] text-ink-3 tnum">
                              {g.id === "today" ? n.at.slice(11, 16) : dayTimeLabel(n.at)}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{n.body}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <Link
                              href={n.href}
                              onClick={() => setRead(n.id, true)}
                              className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                            >
                              Open
                            </Link>
                            <button
                              type="button"
                              onClick={() => setRead(n.id, !n.read)}
                              className="text-[12.5px] font-semibold text-ink-3 hover:text-ink"
                            >
                              {n.read ? "Mark unread" : "Mark read"}
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            ))
          )}
        </section>

        <aside className="min-w-0 space-y-5">
          <Card>
            <CardHeader title="Channel preferences" sub="Where your notifications reach you" />
            <div className="space-y-4 border-t border-line px-5 py-4">
              <Switch
                checked={channelsOn["in-app"]}
                onChange={(v) => toggleChannel("in-app", v)}
                label="In-app"
                sub="This page and the bell in the top bar"
              />
              <Switch
                checked={channelsOn.email}
                onChange={(v) => toggleChannel("email", v)}
                label="Email"
                sub={s.email}
              />
              <Switch
                checked={channelsOn.whatsapp}
                onChange={(v) => toggleChannel("whatsapp", v)}
                label="WhatsApp"
                sub={`+91 98••• ••432 · quiet hours ${whatsapp?.quietHours ?? "21:30 to 08:00 IST"}`}
              />
            </div>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="What each channel sends" sub="Tick a topic to receive it on that channel" />
            <div className="border-t border-line p-3">
              <Matrix
                dense
                caption="Notification topics by channel"
                corner="Topic"
                rows={TOPICS}
                cols={CHANNELS.map((c) => ({ id: c.id, label: c.label }))}
                className="[&_th:first-child]:min-w-32 [&_thead_th:not(:first-child)]:min-w-[4.5rem]"
                cell={(topic, col) => {
                  const ch = col as Channel;
                  const locked = ch === "in-app" && topic === "exams";
                  const channelOff = !channelsOn[ch];
                  return (
                    <MatrixCheck
                      checked={(grid[topic] ?? []).includes(ch) && !channelOff}
                      label={`${topic} on ${ch}`}
                      disabled={locked || channelOff}
                      disabledReason={locked ? "Exam deadlines always appear in-app" : "Turn this channel on above first"}
                      onChange={(v) => toggleCell(topic, ch, v)}
                    />
                  );
                }}
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3">
              <p className="text-[12px] text-ink-3">Nothing promotional is ever sent.</p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => toast({ title: "Notification preferences saved" })}
              >
                Save preferences
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
