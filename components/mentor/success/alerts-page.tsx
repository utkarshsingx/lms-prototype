"use client";

import { useState } from "react";
import {
  BellRing,
  CalendarX2,
  Check,
  Clock3,
  Download,
  MoonStar,
  RotateCcw,
  Send,
  TriangleAlert,
  UserX,
  Zap,
} from "lucide-react";
import {
  RISK_ALERT_LABELS,
  addDays,
  cohortById,
  formatAccaDate,
  isoDaysAgo,
  riskAlerts,
  studentById,
  type MentorReminder,
  type RiskAlert,
  type RiskAlertKind,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/charts";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { FormDrawer } from "@/components/ui/form-drawer";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { PageHeader } from "@/components/ui/misc";
import { RiskBadge, StatusPill } from "@/components/ui/status";
import { Segmented, Tabs } from "@/components/ui/tabs";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { ReminderDrawer } from "./drawers";
import { MentorScopeChip, useMentorScope } from "./scope";
import { RISK_RANK, StudentCell, TODAY, TypePill, ago, nextMock, plural } from "./shared";
import { Student360Drawer, type Student360Tab } from "./student-360";

type AlertRow = Omit<RiskAlert, "status"> & { status: RiskAlert["status"] | "snoozed"; snoozedUntil?: string; action?: string };

const ACTIONS = [
  "Schedule a mentoring session",
  "Send an authorised reminder",
  "Add a task to the action plan",
  "Escalate academic issue to faculty",
  "Escalate operational issue to the programme team",
  "Call the learner",
];

const SEVERITY_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

export function MentorAlertsPage() {
  const { persona } = useRole();
  return <AlertsView key={persona.id} />;
}

function AlertsView() {
  const scope = useMentorScope();
  const [tab, setTab] = useState("alerts");
  const [alerts, setAlerts] = useState<AlertRow[]>(() => riskAlerts.filter((a) => scope.ids.has(a.studentId)));
  const [log, setLog] = useState<TimelineItem[]>([]);
  const [acting, setActing] = useState<AlertRow | null>(null);
  const [snoozing, setSnoozing] = useState<string | null>(null);
  const [view, setView] = useState("open");
  const [severity, setSeverity] = useState("");
  const [kind, setKind] = useState("");
  const [prefs, setPrefs] = useState({ inApp: true, email: true, whatsapp: false });

  const [threshold, setThreshold] = useState("14");
  const [missFilter, setMissFilter] = useState("all");
  const [nudged, setNudged] = useState<Record<string, string>>({});
  const [followed, setFollowed] = useState<string[]>([]);
  const [reminding, setReminding] = useState<string[] | null>(null);
  const [profile, setProfile] = useState<{ student: Student; tab: Student360Tab } | null>(null);

  const newCount = alerts.filter((a) => a.status === "new").length;
  const inactive = scope.students.filter((s) => s.lastActiveDaysAgo >= Number(threshold)).sort((a, b) => b.lastActiveDaysAgo - a.lastActiveDaysAgo);
  const inactive14 = scope.students.filter((s) => s.lastActiveDaysAgo >= 14);
  const missers = scope.students
    .filter((s) => s.attendance.missedClasses > 0 || s.missedMocks > 0)
    .filter((s) => (missFilter === "classes" ? s.attendance.missedClasses >= 3 : missFilter === "mocks" ? s.missedMocks > 0 : true));

  const feed = alerts
    .filter((a) => {
      if (view === "open") return a.status === "new" || a.status === "acknowledged";
      if (view === "all") return true;
      return a.status === view;
    })
    .filter((a) => (!severity || a.severity === severity) && (!kind || a.kind === kind))
    .sort((a, b) => {
      const order = { new: 0, acknowledged: 1, snoozed: 2, actioned: 3, resolved: 4 };
      return order[a.status] - order[b.status] || RISK_RANK[b.severity] - RISK_RANK[a.severity] || b.raisedOn.localeCompare(a.raisedOn);
    });

  const update = (a: AlertRow, patch: Partial<AlertRow>, title: string, body?: string) => {
    setAlerts((list) => list.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));
    const s = studentById(a.studentId);
    setLog((l) => [
      { id: `${a.id}-${l.length}`, title: `${title} · ${s?.name}`, meta: `Today · ${a.title}`, body, tone: patch.status === "resolved" ? "jade" : patch.status === "actioned" ? "info" : "amber" },
      ...l,
    ]);
    toast({ title, body: `${s?.name} · ${a.title}` });
  };

  const tabs = [
    { id: "alerts", label: "Risk alerts", count: newCount },
    { id: "inactive", label: "Inactive learners", count: inactive14.length },
    { id: "missed", label: "Missed classes and mocks", count: scope.students.filter((s) => s.attendance.missedClasses >= 3 || s.missedMocks > 0).length },
  ];

  const inactiveCols: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (s) => (
        <span className="flex flex-col gap-1">
          <StudentCell student={s} sub={`${s.currentPaper ?? "Onboarding"} · ${s.type === "graduate" ? "Graduate" : "Undergraduate"}`} />
        </span>
      ),
    },
    {
      key: "last",
      header: "Last active",
      sortable: true,
      sortValue: (s) => s.lastActiveDaysAgo,
      render: (s) => (
        <span>
          <span className={cn("block font-semibold", s.lastActiveDaysAgo >= 14 ? "text-rose" : "text-amber")}>{s.lastActiveDaysAgo} days</span>
          <span className="block text-[11.5px] text-ink-3">since {formatAccaDate(isoDaysAgo(s.lastActiveDaysAgo))}</span>
        </span>
      ),
    },
    {
      key: "hours",
      header: "Study hours · 8 weeks",
      render: (s) => (
        <span className="flex w-44 items-center gap-2.5">
          <span className="w-20 shrink-0">
            <Sparkline data={s.activityHours} tone="rose" height={24} fill={false} />
          </span>
          <span className="text-[12px] text-ink-3">{s.activityHours[7]}h last week</span>
        </span>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      align: "right",
      sortable: true,
      sortValue: (s) => s.attendance.pct,
      render: (s) => (s.attendance.total ? `${s.attendance.pct}%` : "Not started"),
    },
    { key: "risk", header: "Risk", sortable: true, sortValue: (s) => RISK_RANK[s.risk.level], render: (s) => <RiskBadge level={s.risk.level} /> },
    {
      key: "nudge",
      header: "Nudge",
      render: (s) =>
        nudged[s.id] ? (
          <StatusPill status="sent" size="sm">
            {nudged[s.id]}
          </StatusPill>
        ) : (
          <Button size="xs" variant="outline" onClick={() => setReminding([s.id])}>
            <Send className="size-3.5" /> Nudge
          </Button>
        ),
    },
  ];

  const missedCols: DataTableColumn<Student>[] = [
    {
      key: "name",
      header: "Learner",
      sortable: true,
      render: (s) => <StudentCell student={s} sub={s.cohortIds.map((c) => cohortById(c)?.name).filter(Boolean)[0] ?? "No cohort"} />,
    },
    {
      key: "classes",
      header: "Missed classes",
      align: "right",
      sortable: true,
      sortValue: (s) => s.attendance.missedClasses,
      render: (s) => (
        <span>
          <span className={cn("block font-mono font-semibold tnum", s.attendance.missedClasses >= 8 ? "text-rose" : "text-ink")}>
            {s.attendance.missedClasses} of {s.attendance.total}
          </span>
          <span className="block text-[11.5px] text-ink-3">{s.attendance.lastMissed ? `last ${formatAccaDate(s.attendance.lastMissed)}` : "none recently"}</span>
        </span>
      ),
    },
    {
      key: "attendance",
      header: "Attendance",
      align: "right",
      sortable: true,
      sortValue: (s) => s.attendance.pct,
      render: (s) => <span className={cn("font-mono font-semibold tnum", s.attendance.pct < 75 ? "text-rose" : "text-ink")}>{s.attendance.pct}%</span>,
    },
    {
      key: "mocks",
      header: "Missed mocks",
      sortable: true,
      sortValue: (s) => s.missedMocks,
      wrap: true,
      render: (s) =>
        s.missedMocks ? (
          <span>
            <span className="block font-semibold text-rose">{plural(s.missedMocks, "mock")}</span>
            <span className="block text-[11.5px] text-ink-3">
              {s.mocks
                .filter((m) => m.status === "missed")
                .map((m) => `${m.title} (${formatAccaDate(m.date)})`)
                .join(", ")}
            </span>
          </span>
        ) : (
          <span className="text-ink-3">None</span>
        ),
    },
    {
      key: "next",
      header: "Next mock",
      render: (s) => {
        const m = nextMock(s);
        return m ? (
          <span>
            <span className="block text-[12.5px] font-semibold text-ink">{m.title}</span>
            <span className="block text-[11.5px] text-ink-3">{formatAccaDate(m.date)}</span>
          </span>
        ) : (
          <span className="text-ink-3">Not scheduled</span>
        );
      },
    },
    {
      key: "follow",
      header: "Follow-up",
      render: (s) =>
        followed.includes(s.id) ? (
          <StatusPill status="done" size="sm">
            Followed up today
          </StatusPill>
        ) : (
          <Button
            size="xs"
            variant="outline"
            onClick={() => {
              setFollowed((f) => [...f, s.id]);
              toast({
                title: "Follow-up logged",
                body: `${s.name} · ${s.missedMocks ? "missed mock rebooked with the learner" : "attendance discussed"}`,
              });
            }}
          >
            <Check className="size-3.5" /> Log follow-up
          </Button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Student success"
        title="Risk alerts"
        sub="Receive risk alerts raised from attendance, activity, mocks, readiness, results and fees, identify inactive learners, and track missed classes and mocks."
        badge={<MentorScopeChip scope={scope} />}
        actions={
          <Button variant="secondary" onClick={() => toast({ title: "Report queued: risk-alerts.csv", body: plural(alerts.length, "alert"), tone: "info" })}>
            <Download className="size-4" /> Export
          </Button>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="New risk alerts" value={newCount} sub="waiting for you" icon={<BellRing />} />
        <KpiTile
          label="High severity open"
          value={alerts.filter((a) => a.severity === "high" && (a.status === "new" || a.status === "acknowledged")).length}
          tone="rose"
          icon={<TriangleAlert />}
        />
        <KpiTile label="Inactive 14+ days" value={inactive14.length} tone="amber" icon={<UserX />} sub="no login or study time" />
        <KpiTile
          label="Missed mocks this cycle"
          value={scope.students.reduce((a, s) => a + s.missedMocks, 0)}
          tone="info"
          icon={<CalendarX2 />}
          sub={plural(scope.students.filter((s) => s.missedMocks > 0).length, "learner")}
        />
      </KpiRow>

      <Tabs items={tabs} value={tab} onChange={setTab} />

      {tab === "alerts" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Segmented
                size="sm"
                value={view}
                onChange={setView}
                items={[
                  { id: "open", label: "Open" },
                  { id: "new", label: "New" },
                  { id: "snoozed", label: "Snoozed" },
                  { id: "actioned", label: "Actioned" },
                  { id: "resolved", label: "Resolved" },
                  { id: "all", label: "All" },
                ]}
              />
              <FilterBar
                active={Boolean(severity || kind)}
                onClear={() => {
                  setSeverity("");
                  setKind("");
                }}
              >
                <FilterSelect
                  label="Severity"
                  allLabel="Any"
                  value={severity}
                  onChange={setSeverity}
                  options={[
                    { value: "high", label: "High" },
                    { value: "medium", label: "Medium" },
                  ]}
                />
                <FilterSelect
                  label="Reason"
                  allLabel="All"
                  value={kind}
                  onChange={setKind}
                  options={(Object.keys(RISK_ALERT_LABELS) as RiskAlertKind[]).map((k) => ({ value: k, label: RISK_ALERT_LABELS[k] }))}
                />
              </FilterBar>
            </div>

            <p className="text-[12.5px] text-ink-3" aria-live="polite">
              {plural(feed.length, "alert")} shown
            </p>

            <ul className="space-y-3">
              {feed.map((a) => {
                const s = studentById(a.studentId)!;
                const open = a.status === "new" || a.status === "acknowledged";
                return (
                  <li
                    key={a.id}
                    className={cn(
                      "min-w-0 rounded-[var(--radius-lg)] border bg-surface p-4 sm:p-5",
                      a.status === "new" ? "border-line-strong" : "border-line",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <RiskBadge level={a.severity} label={`${SEVERITY_LABEL[a.severity]} severity`} />
                        <span className="text-[12px] font-semibold text-ink-2">{RISK_ALERT_LABELS[a.kind]}</span>
                        <span className="text-[12px] text-ink-3">· raised {ago(a.raisedOn).toLowerCase()}</span>
                      </div>
                      <StatusPill status={a.status === "snoozed" ? "on hold" : a.status}>
                        {a.status === "snoozed" && a.snoozedUntil ? `Snoozed until ${formatAccaDate(a.snoozedUntil)}` : undefined}
                      </StatusPill>
                    </div>
                    <div className="mt-3 flex min-w-0 flex-wrap items-start justify-between gap-x-6 gap-y-3">
                      <div className="min-w-0 flex-1 basis-72">
                        <p className="text-[15px] font-bold text-ink">{a.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{a.detail}</p>
                        <button
                          type="button"
                          onClick={() => setProfile({ student: s, tab: a.kind === "inactive" ? "activity" : a.kind === "missed-mock" ? "mocks" : a.kind === "missed-class" ? "attendance" : a.kind === "low-readiness" ? "readiness" : a.kind === "failed-paper" ? "attempts" : "journey" })}
                          className="mt-2.5 flex min-w-0 items-center gap-2 text-left"
                        >
                          <StudentCell student={s} sub={`${s.currentPaper ?? "Onboarding"} · attendance ${s.attendance.pct}% · last active ${ago(isoDaysAgo(s.lastActiveDaysAgo)).toLowerCase()}`} />
                        </button>
                        {a.action ? <p className="mt-2 text-[12.5px] font-semibold text-ink">Action taken: {a.action}</p> : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {open && snoozing === a.id ? (
                          <>
                            <span className="text-[12px] text-ink-3">Snooze for</span>
                            {[
                              ["3 days", 3],
                              ["1 week", 7],
                            ].map(([label, days]) => (
                              <Button
                                key={label}
                                size="xs"
                                variant="outline"
                                onClick={() => {
                                  const until = addDays(TODAY, Number(days));
                                  update(a, { status: "snoozed", snoozedUntil: until }, `Alert snoozed until ${formatAccaDate(until)}`);
                                  setSnoozing(null);
                                }}
                              >
                                {label}
                              </Button>
                            ))}
                            <Button size="xs" variant="ghost" onClick={() => setSnoozing(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : null}
                        {open && snoozing !== a.id ? (
                          <>
                            {a.status === "new" ? (
                              <Button size="sm" variant="outline" onClick={() => update(a, { status: "acknowledged" }, "Alert acknowledged")}>
                                <Check className="size-4" /> Acknowledge
                              </Button>
                            ) : null}
                            <Button size="sm" variant="ghost" onClick={() => setSnoozing(a.id)}>
                              <MoonStar className="size-4" /> Snooze
                            </Button>
                            <Button size="sm" onClick={() => setActing(a)}>
                              <Zap className="size-4" /> Act
                            </Button>
                          </>
                        ) : null}
                        {a.status === "actioned" ? (
                          <Button size="sm" variant="outline" onClick={() => update(a, { status: "resolved" }, "Alert resolved")}>
                            <Check className="size-4" /> Resolve
                          </Button>
                        ) : null}
                        {a.status === "snoozed" || a.status === "resolved" ? (
                          <Button size="sm" variant="ghost" onClick={() => update(a, { status: "new", snoozedUntil: undefined }, "Alert reopened")}>
                            <RotateCcw className="size-4" /> Reopen
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
              {feed.length === 0 ? (
                <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-6 py-10 text-center text-[13px] text-ink-3">
                  No alerts match this view.
                </li>
              ) : null}
            </ul>
          </div>

          <div className="min-w-0 space-y-5">
            <Card>
              <CardHeader title="Receive risk alerts" sub="How new alerts reach you" />
              <div className="space-y-4 px-5 pb-5">
                <Switch
                  checked={prefs.inApp}
                  onChange={(v) => {
                    setPrefs((p) => ({ ...p, inApp: v }));
                    toast({ title: v ? "In-app alerts on" : "In-app alerts off", tone: "info" });
                  }}
                  label="In-app"
                  sub="Badge on Risk alerts and a bell notification"
                />
                <Switch
                  checked={prefs.email}
                  onChange={(v) => {
                    setPrefs((p) => ({ ...p, email: v }));
                    toast({ title: v ? "Daily email digest on" : "Daily email digest off", tone: "info" });
                  }}
                  label="Email digest"
                  sub="08:00 IST, new and still-open alerts"
                />
                <Switch
                  checked={prefs.whatsapp}
                  onChange={(v) => {
                    setPrefs((p) => ({ ...p, whatsapp: v }));
                    toast({ title: v ? "WhatsApp alerts on for high severity" : "WhatsApp alerts off", tone: "info" });
                  }}
                  label="WhatsApp"
                  sub="High severity only, within quiet hours 21:00 to 08:00"
                />
              </div>
              <div className="border-t border-line px-5 py-4">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Alert rules</p>
                <ul className="mt-2.5 space-y-2 text-[12.5px] leading-snug text-ink-2">
                  <li>No activity for 14 days or more · high</li>
                  <li>Attendance below 75% or 8 classes missed · medium</li>
                  <li>A missed mock · medium, two or more · high</li>
                  <li>Current paper readiness below 50 · high</li>
                  <li>Failed paper or instalment overdue · medium</li>
                </ul>
                <p className="mt-2.5 text-[12px] text-ink-3">Rules are set by the programme team.</p>
              </div>
            </Card>
            <Card>
              <CardHeader title="Action log" sub="What you did with alerts in this session" />
              <div className="px-5 pb-5">
                <Timeline dense items={log} empty="Acknowledge, snooze or act on an alert and it is logged here." />
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === "inactive" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink">Identify inactive learners</h2>
              <p className="text-[13px] text-ink-3">No login, lesson or practice activity for the chosen number of days.</p>
            </div>
            <Segmented
              size="sm"
              value={threshold}
              onChange={setThreshold}
              items={[
                { id: "7", label: "7+ days" },
                { id: "14", label: "14+ days" },
                { id: "21", label: "21+ days" },
              ]}
            />
          </div>
          <DataTable
            caption="Inactive learners"
            rows={inactive}
            columns={inactiveCols}
            getRowId={(s) => s.id}
            selectable
            bulkActions={(ids, clear) => (
              <Button
                size="sm"
                variant="inverse"
                onClick={() => {
                  setReminding(ids);
                  clear();
                }}
              >
                <Send className="size-3.5" /> Nudge selected
              </Button>
            )}
            onRowClick={(s) => setProfile({ student: s, tab: "activity" })}
            rowLabel={(s) => `Open ${s.name}`}
            empty={<p className="text-center text-[13px] text-ink-3">Every learner has been active in the last {threshold} days.</p>}
          />
        </div>
      ) : null}

      {tab === "missed" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[15px] font-bold text-ink">Track missed classes and mocks</h2>
              <p className="text-[13px] text-ink-3">Live-class misses this cycle and mocks not sat, with the next mock to protect.</p>
            </div>
            <Segmented
              size="sm"
              value={missFilter}
              onChange={setMissFilter}
              items={[
                { id: "all", label: "All" },
                { id: "classes", label: "3+ missed classes" },
                { id: "mocks", label: "Missed mocks" },
              ]}
            />
          </div>
          <DataTable
            caption="Missed classes and mocks"
            rows={missers}
            columns={missedCols}
            getRowId={(s) => s.id}
            initialSort={{ key: "classes", dir: "desc" }}
            onRowClick={(s) => setProfile({ student: s, tab: s.missedMocks ? "mocks" : "attendance" })}
            rowLabel={(s) => `Open ${s.name}`}
            search={{ placeholder: "Search learner", match: (s, q) => s.name.toLowerCase().includes(q) }}
          />
        </div>
      ) : null}

      <ActDrawer
        alert={acting}
        onClose={() => setActing(null)}
        onSubmit={(a, action, followUp, note) => {
          update(a, { status: "actioned", action }, "Alert actioned", `${action}${followUp ? ` · follow up by ${formatAccaDate(followUp)}` : ""}${note ? ` · ${note}` : ""}`);
          setActing(null);
        }}
      />

      <ReminderDrawer
        open={reminding != null}
        onClose={() => setReminding(null)}
        scope={scope}
        studentIds={reminding ?? []}
        defaultTemplateId="tpl-mentor-checkin"
        onSent={(rows: MentorReminder[]) =>
          setNudged((n) => {
            const next = { ...n };
            rows.forEach((r) => (next[r.studentId] = `Nudged today · ${r.channel === "whatsapp" ? "WhatsApp" : r.channel === "email" ? "Email" : "In-app"}`));
            return next;
          })
        }
      />

      <Student360Drawer student={profile?.student ?? null} initialTab={profile?.tab} showMentor={scope.placement} onClose={() => setProfile(null)} />
    </div>
  );
}

function ActDrawer({
  alert,
  onClose,
  onSubmit,
}: {
  alert: AlertRow | null;
  onClose: () => void;
  onSubmit: (a: AlertRow, action: string, followUp: string, note: string) => void;
}) {
  const s = alert ? studentById(alert.studentId) : undefined;
  const suggested =
    alert?.kind === "inactive"
      ? ACTIONS[5]
      : alert?.kind === "missed-mock" || alert?.kind === "missed-class"
        ? ACTIONS[1]
        : alert?.kind === "low-readiness"
          ? ACTIONS[3]
          : alert?.kind === "payment-overdue"
            ? ACTIONS[4]
            : ACTIONS[0];
  return (
    <FormDrawer
      open={alert != null}
      onClose={onClose}
      title="Act on risk alert"
      sub={alert && s ? `${s.name} · ${alert.title}` : undefined}
      submitLabel="Record action"
      footerNote="Marks the alert as actioned"
      onSubmit={(data) => {
        if (!alert) return;
        onSubmit(alert, String(data.get("action")), String(data.get("follow") ?? ""), String(data.get("note") ?? "").trim());
      }}
    >
      {alert && s ? (
        <>
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge level={alert.severity} />
              <TypePill student={s} />
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{alert.detail}</p>
            {s.risk.reasons.length ? <p className="mt-1.5 text-[12.5px] text-ink-3">Also: {s.risk.reasons.join(" · ")}</p> : null}
          </div>
          <Field label="Action">
            <Select name="action" defaultValue={suggested} key={alert.id}>
              {ACTIONS.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </Select>
          </Field>
          <Field label="Follow up by" hint={<span className="inline-flex items-center gap-1"><Clock3 className="size-3" /> IST</span>}>
            <Input type="date" name="follow" min={TODAY} defaultValue={addDays(TODAY, 3)} />
          </Field>
          <Field label="Note">
            <Textarea name="note" rows={3} placeholder="What you agreed with the learner" />
          </Field>
        </>
      ) : null}
    </FormDrawer>
  );
}
