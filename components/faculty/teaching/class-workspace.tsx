"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Check,
  CircleStop,
  FileText,
  Hand,
  Mic,
  MicOff,
  MonitorUp,
  Play,
  Radio,
  Send,
  UsersRound,
  Video,
  VideoOff,
} from "lucide-react";
import { formatAccaDate, type LiveClass, type PaperCode, type Student } from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Button, IconButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { LiveDot } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { FileDrop } from "@/components/ui/file-drop";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { MiniLabel, batchSize, cohortBatchLabel, dayLabel, endTime, firstNameOf, hashOf, plural, rosterFor } from "./shared";

export type ClassPatch = Partial<Pick<LiveClass, "status" | "attendance" | "recording" | "notes" | "resources">>;

/** Deterministic "was in the room" for a listed learner, weighted by their attendance record. */
function joined(student: Student, classId: string) {
  return hashOf(`${student.id}:${classId}`) % 100 < student.attendance.pct;
}

function headcount(c: LiveClass) {
  return Math.round(batchSize(c) * 0.86);
}

const POLLS: Partial<Record<PaperCode, { q: string; options: string[] }>> = {
  FR: {
    q: "An 80% subsidiary sells inventory to the parent at a profit. Who bears the unrealised profit adjustment?",
    options: ["The parent only", "The parent and NCI in proportion", "NCI only", "No adjustment is needed"],
  },
  SBR: {
    q: "On gaining control in a step acquisition, how is the previously held interest treated?",
    options: ["Remeasured to fair value through profit or loss", "Kept at original cost", "Remeasured through other comprehensive income", "Derecognised with no gain or loss"],
  },
  PM: {
    q: "Actual total quantity in standard mix is the starting point for which variance?",
    options: ["Material mix variance", "Material yield variance", "Material price variance", "Labour efficiency variance"],
  },
};
const POLL_WEIGHTS = [14, 57, 18, 11];

function mmss(total: number) {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ------------------------------------------------------------------ console */

export function LiveConsole({
  cls,
  onUpdate,
  onGoTo,
}: {
  cls: LiveClass;
  onUpdate: (patch: ClassPatch) => void;
  onGoTo: (tab: string) => void;
}) {
  const roster = rosterFor(cls);
  const total = batchSize(cls);
  const inRoom = headcount(cls);
  const listedIn = roster.filter((s) => joined(s, cls.id));
  const isLive = cls.status === "live";

  const [elapsed, setElapsed] = useState(0);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [hands, setHands] = useState<{ id: string; name: string; speaking: boolean }[]>(() =>
    listedIn.slice(0, 2).map((s) => ({ id: s.id, name: s.name, speaking: false })),
  );
  const preset = POLLS[cls.paper] ?? {
    q: `Which part of ${cls.title.toLowerCase()} should we revisit before the next class?`,
    options: ["Core principles", "Calculations", "Exam technique", "Nothing, move on"],
  };
  const [question, setQuestion] = useState(preset.q);
  const [options, setOptions] = useState(preset.options);
  const [poll, setPoll] = useState<"draft" | "running" | "closed">("draft");

  useEffect(() => {
    if (!isLive) return;
    const t = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [isLive]);

  const responses = Math.max(1, inRoom - 2);
  const votes = POLL_WEIGHTS.map((w) => Math.round((w / 100) * responses));

  if (cls.status === "cancelled") {
    return <EmptyState title="This class was cancelled" sub={cls.note ?? "No live session runs for this slot."} />;
  }

  if (cls.status === "completed") {
    const items = [
      { tab: "attendance", label: "Attendance", value: cls.attendance?.marked ? `${cls.attendance.present} of ${cls.attendance.total} present` : "Not marked", status: cls.attendance?.marked ? "completed" : "overdue" },
      { tab: "uploads", label: "Recording", value: cls.recording?.status === "published" ? `Published · ${cls.recording.views ?? 0} views` : cls.recording?.status === "processing" ? "Processing" : "Not uploaded", status: cls.recording?.status ?? "not-uploaded" },
      { tab: "notes", label: "Class notes", value: cls.notes === "published" ? "Published" : cls.notes === "draft" ? "Draft" : "Not started", status: cls.notes },
    ];
    return (
      <Card className="min-w-0">
        <CardHeader title="Class held" sub={`${dayLabel(cls.start)} · ${cls.start.slice(11, 16)} to ${endTime(cls.start, cls.durationMins)} · ${total} learners in the batch`} />
        <ul className="grid gap-3 border-t border-line p-5 sm:grid-cols-3">
          {items.map((i) => (
            <li key={i.tab} className="min-w-0 rounded-[var(--radius-md)] border border-line p-3.5">
              <MiniLabel>{i.label}</MiniLabel>
              <p className="mt-1.5 text-[14px] font-semibold text-ink">{i.value}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <StatusPill status={i.status} size="sm" />
                <button type="button" onClick={() => onGoTo(i.tab)} className="text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4">
                  Open
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[var(--radius-lg)] bg-surface-inv text-ink-inv">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4">
          {isLive ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-ink-inv/10 px-3 py-1 text-[12.5px] font-bold">
              <LiveDot /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-ink-inv/10 px-3 py-1 text-[12.5px] font-semibold text-ink-inv/80">
              <Radio aria-hidden className="size-3.5 text-cta" /> Waiting room open
            </span>
          )}
          <span className="font-mono text-[15px] font-semibold tnum" aria-live="off">
            {isLive ? mmss(elapsed) : `${cls.start.slice(11, 16)} start`}
          </span>
          <span className="text-[12.5px] text-ink-inv/65">
            {isLive ? `${inRoom} of ${total} in the room · recording to cloud` : `${plural(total, "learner")} · ${cls.link?.replace("https://", "") ?? cls.room ?? "Online"}`}
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {isLive ? (
              <>
                <IconButton label={mic ? "Mute microphone" : "Unmute microphone"} variant="inverse" size="sm" onClick={() => setMic((v) => !v)}>
                  {mic ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                </IconButton>
                <IconButton label={cam ? "Turn camera off" : "Turn camera on"} variant="inverse" size="sm" onClick={() => setCam((v) => !v)}>
                  {cam ? <Video className="size-4" /> : <VideoOff className="size-4" />}
                </IconButton>
                <Button
                  size="sm"
                  variant="inverse"
                  aria-pressed={sharing}
                  onClick={() => {
                    setSharing((v) => !v);
                    if (!sharing) toast({ title: "Sharing your screen", body: `${cls.paper} ${cls.title} slides`, tone: "info" });
                  }}
                >
                  <MonitorUp className="size-4" />
                  {sharing ? "Stop sharing" : "Share slides"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    onUpdate({
                      status: "completed",
                      attendance: { marked: false, present: inRoom, total, pct: Math.round((inRoom / total) * 100) },
                      recording: { status: "processing" },
                      notes: "draft",
                    });
                    toast({ title: "Class ended", body: `Attendance captured from the live roster: ${inRoom} of ${total}. Review and save it.` });
                    onGoTo("attendance");
                  }}
                >
                  <CircleStop className="size-4" />
                  End class
                </Button>
              </>
            ) : (
              <Button
                onClick={() => {
                  onUpdate({ status: "live" });
                  setElapsed(0);
                  toast({ title: "Class started", body: `${cohortBatchLabel(cls.cohortId, cls.sectionId)} · learners in the waiting room were admitted` });
                }}
              >
                <Play className="size-4" />
                Start class
              </Button>
            )}
          </div>
        </div>
        {!isLive ? (
          <p className="border-t border-ink-inv/10 px-5 py-2.5 text-[12.5px] text-ink-inv/60">
            {formatAccaDate(cls.start)} · learners can join the waiting room 15 minutes before the start. The class records to the cloud automatically.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Live roster"
            sub={isLive ? `${inRoom} of ${total} joined` : `${total} learners expected`}
            action={<UsersRound aria-hidden className="size-4 text-ink-3" />}
          />
          <ul className="divide-y divide-line border-t border-line">
            {roster.map((s) => {
              const here = isLive && joined(s, cls.id);
              const hand = hands.find((h) => h.id === s.id);
              return (
                <li key={s.id} className="flex items-center gap-2.5 px-5 py-2.5">
                  <Avatar name={s.name} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{s.name}</span>
                  {isLive && hand ? <Hand aria-label="Hand raised" className="size-4 text-amber" /> : null}
                  <span className={cn("text-[12px]", here ? "text-jade" : "text-ink-3")}>
                    {!isLive ? "Expected" : here ? `Joined ${cls.start.slice(11, 13)}:${String(Math.max(0, Number(cls.start.slice(14, 16)) - (hashOf(s.id) % 5))).padStart(2, "0")}` : "Not joined"}
                  </span>
                </li>
              );
            })}
            {isLive && inRoom > listedIn.length ? (
              <li className="px-5 py-2.5 text-[12.5px] text-ink-3">and {inRoom - listedIn.length} more learners in the room</li>
            ) : null}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="min-w-0">
            <CardHeader title="Raised hands" sub={isLive ? plural(hands.length, "learner") + " waiting" : "Hands appear here once the class is live"} />
            <ul className="divide-y divide-line border-t border-line">
              {!isLive || hands.length === 0 ? (
                <li className="px-5 py-4 text-[12.5px] text-ink-3">{isLive ? "No hands raised." : "Start the class to take questions."}</li>
              ) : (
                hands.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-2.5 px-5 py-2.5">
                    <Avatar name={h.name} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{h.name}</span>
                    {h.speaking ? (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-jade">
                        <Mic aria-hidden className="size-3.5" /> Speaking
                      </span>
                    ) : (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setHands((list) => list.map((x) => (x.id === h.id ? { ...x, speaking: true } : x)));
                          toast({ title: `${firstNameOf(h.name)} can speak now`, tone: "info" });
                        }}
                      >
                        Allow to speak
                      </Button>
                    )}
                    <Button size="xs" variant="ghost" onClick={() => setHands((list) => list.filter((x) => x.id !== h.id))}>
                      Lower hand
                    </Button>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card className="min-w-0">
            <CardHeader
              title="Poll"
              sub={poll === "draft" ? "Check understanding in one question" : poll === "running" ? `${responses} of ${inRoom} responded` : "Results shared with the class"}
              action={<BarChart3 aria-hidden className="size-4 text-ink-3" />}
            />
            <div className="space-y-3 border-t border-line px-5 py-4">
              {poll === "draft" ? (
                <>
                  <Field label="Question">
                    <Textarea rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} />
                  </Field>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {options.map((o, i) => (
                      <Input
                        key={i}
                        aria-label={`Option ${i + 1}`}
                        value={o}
                        onChange={(e) => setOptions((list) => list.map((x, j) => (j === i ? e.target.value : x)))}
                      />
                    ))}
                  </div>
                  <span title={isLive ? undefined : "Start the class to launch a poll"} className="inline-flex">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={!isLive || !question.trim()}
                      onClick={() => {
                        setPoll("running");
                        toast({ title: "Poll launched", body: question, tone: "info" });
                      }}
                    >
                      <Send className="size-3.5" />
                      Launch poll
                    </Button>
                  </span>
                </>
              ) : (
                <>
                  <p className="text-[13.5px] font-semibold text-ink">{question}</p>
                  <ul className="space-y-2">
                    {options.map((o, i) => {
                      const pct = Math.round((votes[i] / Math.max(1, votes.reduce((a, b) => a + b, 0))) * 100);
                      const best = i === votes.indexOf(Math.max(...votes));
                      return (
                        <li key={i}>
                          <div className="mb-1 flex items-baseline justify-between gap-3 text-[12.5px]">
                            <span className={cn("min-w-0", best ? "font-semibold text-ink" : "text-ink-2")}>{o}</span>
                            <span className="font-mono text-ink-2 tnum">{pct}%</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                            <div className={cn("h-full rounded-full", best ? "bg-cta-strong" : "bg-ink-3")} style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    {poll === "running" ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPoll("closed");
                          toast({ title: "Poll closed and results shared", body: `${responses} responses` });
                        }}
                      >
                        <Check className="size-3.5" />
                        Close and share results
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setPoll("draft")}>
                      New poll
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ attendance */

type Mark = "present" | "late" | "absent";

export function AttendancePanel({ cls, onUpdate, onGoTo }: { cls: LiveClass; onUpdate: (patch: ClassPatch) => void; onGoTo: (tab: string) => void }) {
  const roster = rosterFor(cls);
  const total = batchSize(cls);
  const prefilled = Boolean(cls.attendance && (cls.attendance.marked || cls.attendance.present > 0));
  const [marks, setMarks] = useState<Record<string, Mark>>(() =>
    prefilled ? Object.fromEntries(roster.map((s) => [s.id, joined(s, cls.id) ? "present" : "absent"])) : {},
  );
  const [present, setPresent] = useState<number>(cls.attendance?.present || 0);
  const [importKey, setImportKey] = useState(0);

  if (cls.status === "upcoming" || cls.status === "today" || cls.status === "live") {
    return (
      <EmptyState
        icon={<UsersRound />}
        title={cls.status === "live" ? "Class in progress" : "Attendance opens when the class starts"}
        sub={cls.status === "live" ? "End the class to review the roster captured from the room." : `Scheduled ${dayLabel(cls.start)} at ${cls.start.slice(11, 16)}. The live roster fills the register for you.`}
        action={
          <Button variant="secondary" onClick={() => onGoTo("console")}>
            Open live class console
          </Button>
        }
      />
    );
  }
  if (cls.status === "cancelled") return <EmptyState title="No attendance for a cancelled class" sub={cls.note} />;

  const unmarked = roster.filter((s) => !marks[s.id]);
  const absent = roster.filter((s) => marks[s.id] === "absent");

  return (
    <Card className="min-w-0">
      <CardHeader
        title="Mark attendance"
        sub={`${cohortBatchLabel(cls.cohortId, cls.sectionId)} · ${dayLabel(cls.start)} · ${plural(total, "learner")}`}
        action={cls.attendance?.marked ? <StatusPill status="completed" size="sm">Saved</StatusPill> : <StatusPill status="overdue" size="sm">Not saved</StatusPill>}
      />
      <div className="grid gap-4 border-t border-line p-5 md:grid-cols-[minmax(0,1fr)_16rem]">
        <FileDrop
          key={importKey}
          label="Import Zoom participants report"
          accept=".csv"
          multiple={false}
          hint="Matches learners by registered email and fills the register"
          onFiles={(_, added) => {
            if (!added.length) return;
            const next = Object.fromEntries(roster.map((s) => [s.id, joined(s, cls.id) ? "present" : "absent"])) as Record<string, Mark>;
            setMarks(next);
            const count = Math.round(total * 0.83);
            setPresent(count);
            toast({ title: "Participants report imported", body: `${added[0]} · ${count} of ${total} matched as present` });
          }}
        />
        <div className="space-y-3">
          <Field label="Present in class" hint={`of ${total}`}>
            <Input type="number" min={0} max={total} value={present} onChange={(e) => setPresent(Math.max(0, Math.min(total, Number(e.target.value) || 0)))} />
          </Field>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => {
              setMarks(Object.fromEntries(roster.map((s) => [s.id, "present"])));
              setPresent(total);
              setImportKey((k) => k + 1);
            }}
          >
            Mark all present
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-line border-t border-line">
        {roster.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
            <Avatar name={s.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold text-ink">{s.name}</p>
              <p className="truncate text-[12px] text-ink-3">
                Attendance {s.attendance.pct}% · {s.attendance.missedClasses} missed so far
              </p>
            </div>
            <Segmented
              size="sm"
              value={marks[s.id] ?? ""}
              onChange={(v) => setMarks((m) => ({ ...m, [s.id]: v as Mark }))}
              items={[
                { id: "present", label: "Present" },
                { id: "late", label: "Late" },
                { id: "absent", label: "Absent" },
              ]}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-line bg-surface-2 px-5 py-3.5">
        <p className="mr-auto text-[12.5px] text-ink-3">
          {roster.length} learner records listed · {unmarked.length ? `${unmarked.length} not marked` : `${absent.length} absent`}
        </p>
        <Button
          onClick={() => {
            if (unmarked.length) {
              toast({ title: "Mark every listed learner first", body: unmarked.map((s) => s.name).join(", "), tone: "warning" });
              return;
            }
            const count = Math.max(present, roster.length - absent.length);
            onUpdate({ attendance: { marked: true, present: count, total, pct: Math.round((count / total) * 100) } });
            toast({
              title: "Attendance saved",
              body: `${count} of ${total} present (${Math.round((count / total) * 100)}%)${absent.length ? ` · ${plural(absent.length, "absent learner")} flagged to their mentors` : ""}`,
            });
          }}
        >
          <Check className="size-4" />
          Save attendance
        </Button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ uploads */

function kindFor(name: string): LiveClass["resources"][number]["kind"] {
  const n = name.toLowerCase();
  if (n.endsWith(".xlsx") || n.endsWith(".csv")) return "worksheet";
  if (n.endsWith(".docx")) return "notes";
  return "slides";
}

export function UploadsPanel({ cls, onUpdate }: { cls: LiveClass; onUpdate: (patch: ClassPatch) => void }) {
  const [dropKey, setDropKey] = useState(0);
  const [recKey, setRecKey] = useState(0);
  const [visibleTo, setVisibleTo] = useState("batch");
  const [added, setAdded] = useState<string[]>([]);
  const ended = cls.status === "completed";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader
          title="Upload recordings"
          sub={ended ? "Learners find recordings on their Live classes page" : "Available after the class ends"}
          action={cls.recording ? <StatusPill status={cls.recording.status} size="sm" /> : <StatusPill status="not started" size="sm">Not held yet</StatusPill>}
        />
        <div className="space-y-3 border-t border-line p-5">
          {cls.recording?.status === "published" ? (
            <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
              <span className="grid size-10 shrink-0 place-items-center rounded-[10px] bg-surface-inv text-cta">
                <Video aria-hidden className="size-4.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-semibold text-ink">
                  {cls.paper} · {cls.title}
                </p>
                <p className="text-[12px] text-ink-3">
                  {cls.recording.durationMins ?? cls.durationMins} min · {cls.recording.views ?? 0} views · published
                </p>
              </div>
            </div>
          ) : null}
          {cls.recording?.status === "processing" ? (
            <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-3.5">
              <p className="text-[13px] font-semibold text-ink">Cloud recording is processing</p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">Trimmed and captioned automatically. Check it, then publish to the batch.</p>
              <Button
                size="sm"
                className="mt-3"
                onClick={() => {
                  onUpdate({ recording: { status: "published", durationMins: cls.durationMins - 9, views: 0 } });
                  toast({ title: "Recording published", body: `${cohortBatchLabel(cls.cohortId, cls.sectionId)} notified in-app` });
                }}
              >
                <Check className="size-3.5" />
                Publish recording
              </Button>
            </div>
          ) : null}
          <FileDrop
            key={recKey}
            label={cls.recording?.status === "published" ? "Replace the recording" : "Upload a recording file"}
            accept=".mp4,.mov,.m4a"
            multiple={false}
            disabled={!ended}
            disabledReason="Upload the recording after the class ends"
            hint="Use this when the class was not recorded to the cloud"
            onFiles={(_, newOnes) => {
              if (!newOnes.length) return;
              onUpdate({ recording: { status: "processing" } });
              setRecKey((k) => k + 1);
              toast({ title: "Recording uploaded", body: `${newOnes[0]} · processing, ready to publish shortly` });
            }}
          />
        </div>
      </Card>

      <Card className="min-w-0">
        <CardHeader title="Upload presentations and resources" sub="Slides, worksheets and question sets for this class" />
        <div className="space-y-3 border-t border-line p-5">
          <ul className="space-y-2">
            {cls.resources.length === 0 ? <li className="text-[12.5px] text-ink-3">No resources yet.</li> : null}
            {cls.resources.map((r) => (
              <li key={r.name} className="flex min-w-0 items-center gap-2.5 rounded-[var(--radius-md)] border border-line px-3 py-2">
                <FileText aria-hidden className="size-4 shrink-0 text-ink-3" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{r.name}</span>
                {added.includes(r.name) ? <StatusPill status="new" size="sm">New</StatusPill> : null}
                <StatusPill status="neutral" tone="neutral" size="sm" dot={false}>
                  {r.kind === "question-set" ? "Question set" : r.kind === "slides" ? "Slides" : r.kind === "worksheet" ? "Worksheet" : "Notes"}
                </StatusPill>
              </li>
            ))}
          </ul>
          <Field label="Visible to">
            <Select value={visibleTo} onChange={(e) => setVisibleTo(e.target.value)}>
              <option value="batch">This batch only</option>
              <option value="cohort">The whole cohort</option>
              <option value="paper">All my {cls.paper} cohorts</option>
            </Select>
          </Field>
          <FileDrop
            key={dropKey}
            label="Add presentations and resources"
            accept=".pdf,.pptx,.ppt,.xlsx,.docx"
            onFiles={(_, newOnes) => {
              if (!newOnes.length) return;
              onUpdate({ resources: [...cls.resources, ...newOnes.filter((n) => !cls.resources.some((r) => r.name === n)).map((n) => ({ name: n, kind: kindFor(n) }))] });
              setAdded((a) => [...a, ...newOnes]);
              setDropKey((k) => k + 1);
              toast({
                title: `${plural(newOnes.length, "resource")} shared`,
                body: `${newOnes.join(", ")} · ${visibleTo === "batch" ? cohortBatchLabel(cls.cohortId, cls.sectionId) : visibleTo === "cohort" ? "whole cohort" : `all ${cls.paper} cohorts`}`,
              });
            }}
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ notes */

export function NotesPanel({ cls, onUpdate }: { cls: LiveClass; onUpdate: (patch: ClassPatch) => void }) {
  const started = cls.notes !== "not-started";
  const topic = cls.title.toLowerCase();
  const [summary, setSummary] = useState(
    started ? `We worked through ${topic} using the class question set, starting from the syllabus rules and moving to an exam-style scenario.` : "",
  );
  const [points, setPoints] = useState(
    started
      ? `1. Read the requirement first and set out a proforma before calculating.\n2. Show every working with a reference, so method marks survive an arithmetic slip.\n3. Link each explanation to a fact from the scenario.`
      : "",
  );
  const [practice, setPractice] = useState(started ? `Complete the ${cls.title} question set before the next class and post doubts on the Doubts page.` : "");
  const [attach, setAttach] = useState<string[]>(cls.resources.map((r) => r.name));
  const upcoming = cls.status !== "completed";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Card className="min-w-0">
        <CardHeader title="Class notes" sub={upcoming ? "Publishing before the class shares these as pre-reading" : "Summary, key points and practice for learners who attended or missed"} action={<StatusPill status={cls.notes} size="sm" />} />
        <div className="space-y-4 border-t border-line p-5">
          <Field label="Summary">
            <Textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What the class covered, in two or three sentences" />
          </Field>
          <Field label="Key points and exam tips">
            <Textarea rows={5} value={points} onChange={(e) => setPoints(e.target.value)} placeholder="One point per line" />
          </Field>
          <Field label="Practice before the next class">
            <Textarea rows={2} value={practice} onChange={(e) => setPractice(e.target.value)} />
          </Field>
          {cls.resources.length ? (
            <fieldset>
              <MiniLabel className="mb-2">Attach resources</MiniLabel>
              <div className="flex flex-wrap gap-2">
                {cls.resources.map((r) => {
                  const on = attach.includes(r.name);
                  return (
                    <button
                      key={r.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setAttach((a) => (on ? a.filter((x) => x !== r.name) : [...a, r.name]))}
                      className={cn(
                        "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-semibold",
                        on ? "border-cta bg-cta-soft text-ink" : "border-line bg-surface text-ink-3 hover:border-line-strong",
                      )}
                    >
                      {on ? <Check aria-hidden className="size-3.5 shrink-0" /> : <FileText aria-hidden className="size-3.5 shrink-0" />}
                      <span className="truncate">{r.name}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line bg-surface-2 px-5 py-3.5">
          <Button
            variant="ghost"
            onClick={() => {
              onUpdate({ notes: "draft" });
              toast({ title: "Draft saved", tone: "neutral" });
            }}
          >
            Save draft
          </Button>
          <Button
            disabled={!summary.trim()}
            onClick={() => {
              onUpdate({ notes: "published" });
              toast({ title: "Class notes published", body: `${cohortBatchLabel(cls.cohortId, cls.sectionId)} notified in-app and by email` });
            }}
          >
            <Send className="size-4" />
            Publish class notes
          </Button>
        </div>
      </Card>

      <Card className="min-w-0">
        <CardHeader title="Learner preview" sub="How the notes appear under the class" />
        <div className="space-y-3 border-t border-line p-5 text-[13px] leading-relaxed text-ink-2">
          <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
            {cls.paper} · {dayLabel(cls.start)}
          </p>
          <p className="font-display text-[18px] leading-tight font-bold tracking-[-0.02em] text-ink">{cls.title}</p>
          {summary ? <p>{summary}</p> : <p className="text-ink-3">Add a summary to preview it.</p>}
          {points ? (
            <ul className="list-disc space-y-1 pl-5">
              {points
                .split("\n")
                .map((l) => l.replace(/^\d+\.\s*/, "").trim())
                .filter(Boolean)
                .map((l) => (
                  <li key={l}>{l}</li>
                ))}
            </ul>
          ) : null}
          {practice ? (
            <p className="rounded-[var(--radius-md)] bg-cta-soft px-3 py-2 text-ink">
              <span className="font-semibold">Practice: </span>
              {practice}
            </p>
          ) : null}
          {attach.length ? <p className="text-[12px] text-ink-3">Attached: {attach.join(", ")}</p> : null}
        </div>
      </Card>
    </div>
  );
}
