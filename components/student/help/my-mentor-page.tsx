"use client";

import { useMemo, useRef, useState } from "react";
import {
  CalendarClock,
  CalendarPlus,
  Clock3,
  Mail,
  MapPin,
  MessageSquareText,
  Phone,
  Send,
  Video,
} from "lucide-react";
import {
  actionPlans,
  formatAccaDate,
  mentorNotes,
  mentoringSessions,
  staffById,
  type ActionPlan,
  type MentoringSession,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Select, Textarea } from "@/components/ui/field";
import { FormDrawer } from "@/components/ui/form-drawer";
import { PageHeader } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { StatusPill } from "@/components/ui/status";
import { Timeline } from "@/components/ui/timeline";
import { toast } from "@/components/ui/toast";
import { DEMO_NOW, DEMO_TODAY, dayLabel, dayTimeLabel, firstName, useStudentRecord } from "./shared";

type Message = { id: string; from: "mentor" | "student" | "system"; at: string; body: string };
type Slot = { start: string; note?: string };

/* Rohan has no mentor-built plan in the sample data; this one follows Nikhil
   Bose's 2 Sep note (FA before the blackout, LW after). */
const FALLBACK_PLAN: ActionPlan = {
  id: "pl-rohan",
  studentId: "s-rohan",
  mentorId: "st-nikhil",
  title: "FA exam on 18 Nov, then LW before university exams",
  goal: "FA readiness from 72 to 78 before the exam, and an LW revision timetable that avoids the blackout",
  createdOn: "2026-09-02",
  dueOn: "2026-11-18",
  status: "active",
  tasks: [
    { id: "t1", label: "Confirm the FA booking for 18 Nov at the Pune centre", due: "2026-09-04", owner: "student", done: true },
    { id: "t2", label: "Two practice sets on G Simple consolidated financial statements", due: "2026-09-30", owner: "student", done: false },
    { id: "t3", label: "Sit FA mock exam 2 on 31 Oct under timed conditions", due: "2026-10-31", owner: "student", done: false },
    { id: "t4", label: "Share an LW revision timetable that avoids 23 Nov to 12 Dec", due: "2026-09-16", owner: "mentor", done: false },
  ],
  alertIds: [],
};

const THREADS: Record<string, Message[]> = {
  "s-anaya": [
    { id: "m1", from: "mentor", at: "2026-09-07T18:10", body: "FR mock 1 at 61% is a real step up. Can you book PM before 5 October so the fee stays at the early rate?" },
    { id: "m2", from: "student", at: "2026-09-07T21:02", body: "Will do this week. Could we use our next session to go through Section C of the PM revision test?" },
    { id: "m3", from: "mentor", at: "2026-09-13T09:15", body: "Yes. See you Monday at 19:30. Bring your variance workings and I will ask Farah for the marking notes." },
  ],
  "s-rohan": [
    { id: "m1", from: "mentor", at: "2026-09-02T16:40", body: "Good work on the FA mock. Book FA before the university blackout: 18 November looks right." },
    { id: "m2", from: "student", at: "2026-09-04T17:05", body: "Booked for 18 Nov at the Pune centre. Should I start LW revision now or after FA?" },
    { id: "m3", from: "mentor", at: "2026-09-12T12:00", body: "After FA. We will plan it at our check-in on Wednesday 16 Sep at 16:30." },
  ],
};

const SLOTS: Record<string, Slot[]> = {
  "s-anaya": [
    { start: "2026-09-15T19:30" },
    { start: "2026-09-16T18:30", note: "Before the FR doubt-clearing session" },
    { start: "2026-09-19T12:30", note: "After Saturday FR class" },
    { start: "2026-09-21T19:30" },
    { start: "2026-09-22T19:30" },
  ],
  "s-rohan": [
    { start: "2026-09-17T16:00" },
    { start: "2026-09-18T12:30", note: "After Friday FA class" },
    { start: "2026-09-28T16:30", note: "No slots 21 to 25 Sep: internal assessment week" },
    { start: "2026-09-29T16:30" },
  ],
};

function whenLabel(iso: string) {
  return iso.slice(0, 10) === DEMO_TODAY ? `Today, ${iso.slice(11, 16)}` : dayTimeLabel(iso);
}

export function MyMentorPage() {
  const s = useStudentRecord();
  return <MyMentorView key={s.id} s={s} />;
}

function MyMentorView({ s }: { s: Student }) {
  const mentor = staffById(s.mentorId);
  const mentorName = mentor?.name ?? "Your mentor";
  const mentorFirst = firstName(mentorName);
  const slots = SLOTS[s.id] ?? SLOTS["s-anaya"];

  const [sessions, setSessions] = useState<MentoringSession[]>(() =>
    mentoringSessions.filter((m) => m.studentId === s.id),
  );
  const [plan, setPlan] = useState<ActionPlan>(() => actionPlans.find((p) => p.studentId === s.id) ?? { ...FALLBACK_PLAN, studentId: s.id, mentorId: s.mentorId });
  const [messages, setMessages] = useState<Message[]>(() => THREADS[s.id] ?? []);
  const [draft, setDraft] = useState("");
  const [bookOpen, setBookOpen] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const upcoming = useMemo(
    () => sessions.filter((m) => m.status === "scheduled" && m.start >= DEMO_NOW).sort((a, b) => a.start.localeCompare(b.start)),
    [sessions],
  );
  const past = useMemo(
    () => sessions.filter((m) => m.start < DEMO_NOW).sort((a, b) => b.start.localeCompare(a.start)),
    [sessions],
  );
  const next = upcoming[0];
  const notes = mentorNotes.filter((n) => n.studentId === s.id).sort((a, b) => b.date.localeCompare(a.date));
  const done = plan.tasks.filter((t) => t.done).length;

  function toggleTask(id: string, value: boolean) {
    const task = plan.tasks.find((t) => t.id === id);
    setPlan((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: value } : t)) }));
    toast({
      title: value ? "Task marked done" : "Task reopened",
      body: `${task?.label}. ${mentorFirst} sees the update.`,
      tone: value ? "success" : "neutral",
    });
  }

  function sendMessage() {
    const body = draft.trim();
    if (!body) return;
    setMessages((m) => {
      const out: Message[] = [...m, { id: `m${m.length + 1}`, from: "student", at: DEMO_NOW, body }];
      if (!m.some((x) => x.from === "system")) {
        out.push({ id: `m${m.length + 2}`, from: "system", at: DEMO_NOW, body: `${mentorFirst} usually replies within a working day.` });
      }
      return out;
    });
    setDraft("");
    toast({ title: `Message sent to ${mentorName}` });
    requestAnimationFrame(() => threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" }));
  }

  function openBook() {
    setFormKey((k) => k + 1);
    setBookOpen(true);
  }

  function openReschedule(id: string) {
    setFormKey((k) => k + 1);
    setRescheduleId(id);
  }

  const rescheduling = sessions.find((m) => m.id === rescheduleId);

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Help"
        title="Mentor support"
        sub={`${mentorName} helps you plan your papers, stay on track and recover from a difficult result. Book time, work through your action plan and message ${mentorFirst} here.`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => {
                document.getElementById("mentor-messages")?.scrollIntoView({ behavior: "smooth" });
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              <MessageSquareText className="size-4" /> Message {mentorFirst}
            </Button>
            <Button onClick={openBook}>
              <CalendarPlus className="size-4" /> Book a session
            </Button>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="relative isolate min-w-0 overflow-hidden rounded-[var(--radius-lg)] bg-surface-inv p-5 text-ink-inv sm:p-6">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-cta" />
          <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">Your mentor</p>
          <div className="mt-3 flex min-w-0 items-center gap-4">
            <Avatar name={mentorName} size="xl" className="shrink-0 ring-2 ring-cta" />
            <div className="min-w-0">
              <h2 className="truncate font-display text-[26px] leading-tight font-bold tracking-[-0.03em]">{mentorName}</h2>
              <p className="truncate text-[13px] text-ink-inv/70">{mentor?.title}</p>
            </div>
          </div>
          <p className="mt-4 text-[13.5px] leading-relaxed text-ink-inv/80">{mentor?.bio}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(mentor?.focusPapers ?? []).map((p) => (
              <span key={p} className="rounded-full border border-ink-inv/20 px-2.5 py-0.5 text-[11.5px] font-semibold text-ink-inv">
                {p}
              </span>
            ))}
          </div>
          <ul className="mt-4 grid gap-2 text-[13px] sm:grid-cols-2">
            <li className="flex min-w-0 items-center gap-2">
              <Mail className="size-4 shrink-0 text-cta" />
              <span className="truncate">{mentor?.email}</span>
            </li>
            <li className="flex min-w-0 items-center gap-2">
              <Phone className="size-4 shrink-0 text-cta" />
              <span className="truncate tnum">{mentor?.phone}</span>
            </li>
            <li className="flex min-w-0 items-center gap-2">
              <Clock3 className="size-4 shrink-0 text-cta" />
              <span className="truncate">Replies within a working day</span>
            </li>
            <li className="flex min-w-0 items-center gap-2">
              <MapPin className="size-4 shrink-0 text-cta" />
              <span className="truncate">{mentor?.location}</span>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Button onClick={openBook}>
              <CalendarPlus className="size-4" /> Book a session
            </Button>
            <Button
              variant="inverse"
              onClick={() => {
                document.getElementById("mentor-messages")?.scrollIntoView({ behavior: "smooth" });
                inputRef.current?.focus({ preventScroll: true });
              }}
            >
              <MessageSquareText className="size-4" /> Message
            </Button>
          </div>
        </section>

        <Card className="min-w-0">
          <CardHeader
            title="Next session"
            sub={next ? `${next.durationMins} minutes · ${next.mode}` : "Nothing booked yet"}
            action={next ? <StatusPill status="scheduled" /> : null}
          />
          {next ? (
            <div className="border-t border-line px-5 py-4">
              <p className="font-display text-[28px] leading-none font-bold tracking-[-0.03em] text-ink tnum">{whenLabel(next.start)}</p>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{next.agenda}</p>
              <p className="mt-2 flex items-center gap-1.5 text-[12.5px] text-ink-3">
                {next.mode === "In person" ? <MapPin className="size-3.5" /> : next.mode === "Phone" ? <Phone className="size-3.5" /> : <Video className="size-3.5" />}
                {next.mode === "In person"
                  ? "Commerce Block, C-204, after your LW class"
                  : next.mode === "Phone"
                    ? `${mentorFirst} calls you on your registered number`
                    : "Video link opens 10 minutes before the start"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {next.mode === "Video" ? (
                  <span title="The join link opens 10 minutes before the session" className="inline-flex">
                    <Button size="sm" variant="secondary" disabled>
                      <Video className="size-4" /> Join call
                    </Button>
                  </span>
                ) : null}
                <Button size="sm" variant="outline" onClick={() => openReschedule(next.id)}>
                  <CalendarClock className="size-4" /> Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => toast({ title: "Added to your calendar", body: `${mentorName} · ${whenLabel(next.start)}`, tone: "info" })}
                >
                  <CalendarPlus className="size-4" /> Add to calendar
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t border-line px-5 py-5">
              <Button size="sm" onClick={openBook}>
                <CalendarPlus className="size-4" /> Book a session
              </Button>
            </div>
          )}
          {upcoming.length > 1 || past.length ? (
            <div className="border-t border-line px-5 py-4">
              <p className="mb-2.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">Sessions</p>
              <ul className="space-y-2.5">
                {[...upcoming.slice(1), ...past].map((m) => (
                  <li key={m.id} className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-ink tnum">{whenLabel(m.start)}</p>
                      <p className="truncate text-[12px] text-ink-3">{m.agenda}</p>
                    </div>
                    <StatusPill status={m.start >= DEMO_NOW ? "scheduled" : m.status} size="sm" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader
            title="Your action plan"
            sub={`Agreed with ${mentorFirst} on ${formatAccaDate(plan.createdOn)} · due ${formatAccaDate(plan.dueOn)}`}
            action={<StatusPill status={plan.status} />}
          />
          <div className="border-t border-line px-5 py-4">
            <p className="text-[15px] font-bold text-ink">{plan.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-ink-2">Goal: {plan.goal}</p>
            <div className="mt-3.5 flex items-center gap-3">
              <Progress value={(done / Math.max(1, plan.tasks.length)) * 100} className="min-w-0 flex-1" height={8} />
              <span className="shrink-0 text-[12.5px] font-semibold text-ink tnum">
                {done} of {plan.tasks.length} done
              </span>
            </div>
          </div>
          <ul className="divide-y divide-[var(--line)] border-t border-line">
            {plan.tasks.map((t) => {
              const mine = t.owner === "student";
              return (
                <li key={t.id} className={cn("flex items-start gap-3 px-5 py-3.5", t.done && "bg-surface-2/60")}>
                  <div className="min-w-0 flex-1">
                    {mine ? (
                      <Checkbox
                        checked={t.done}
                        onChange={(e) => toggleTask(t.id, e.target.checked)}
                        label={<span className={cn("font-medium text-ink", t.done && "text-ink-3 line-through")}>{t.label}</span>}
                      />
                    ) : (
                      <span title={`${mentorName} ticks this one off`} className="block">
                        <Checkbox
                          checked={t.done}
                          disabled
                          readOnly
                          label={<span className={cn("font-medium text-ink", t.done && "text-ink-3 line-through")}>{t.label}</span>}
                        />
                      </span>
                    )}
                    <p className="mt-1 pl-7 text-[12px] text-ink-3 tnum">Due {dayLabel(t.due)}</p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      mine ? "bg-cta-soft text-ink" : "bg-surface-2 text-ink-2",
                    )}
                  >
                    {mine ? "You" : mentorFirst}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Notes shared with you" sub={`Written by ${mentorFirst} after your sessions`} />
          <div className="border-t border-line px-5 py-5">
            <Timeline
              items={notes.map((n) => ({
                id: n.id,
                title: formatAccaDate(n.date),
                meta: n.tags.join(" · "),
                body: n.body,
                tone: "info" as const,
              }))}
              empty="No shared notes yet."
            />
          </div>
        </Card>
      </div>

      <Card id="mentor-messages" className="min-w-0 scroll-mt-24 overflow-hidden">
        <CardHeader title={`Messages with ${mentorName}`} sub="Private to you and your mentor" />
        <div ref={threadRef} className="scrollbar-slim max-h-[26rem] space-y-3 overflow-y-auto border-t border-line bg-surface-2/50 px-4 py-4 sm:px-5">
          {messages.map((m) =>
            m.from === "system" ? (
              <p key={m.id} className="text-center text-[12px] text-ink-3">
                {m.body}
              </p>
            ) : (
              <div key={m.id} className={cn("flex gap-2.5", m.from === "student" && "flex-row-reverse")}>
                <Avatar name={m.from === "mentor" ? mentorName : s.name} size="sm" className="shrink-0" />
                <div className={cn("min-w-0 max-w-[80%]", m.from === "student" && "text-right")}>
                  <div
                    className={cn(
                      "inline-block rounded-[var(--radius-lg)] px-3.5 py-2.5 text-left text-[13.5px] leading-relaxed [overflow-wrap:anywhere]",
                      m.from === "student" ? "rounded-br-[6px] bg-surface-inv text-ink-inv" : "rounded-bl-[6px] border border-line bg-surface text-ink",
                    )}
                  >
                    {m.body}
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-3 tnum">{whenLabel(m.at)}</p>
                </div>
              </div>
            ),
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex flex-col gap-2.5 border-t border-line px-4 py-3.5 sm:flex-row sm:items-end sm:px-5"
        >
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder={`Write to ${mentorFirst}`}
            aria-label={`Message ${mentorName}`}
            className="min-h-11 w-full min-w-0 flex-1 resize-none rounded-[var(--radius-md)] border border-line bg-surface px-3.5 py-2.5 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-ink focus:shadow-[0_0_0_3px_var(--ring-cta)] focus:outline-none"
          />
          <Button type="submit" disabled={!draft.trim()} className="shrink-0">
            <Send className="size-4" /> Send
          </Button>
        </form>
      </Card>

      <FormDrawer
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        title={`Book a session with ${mentorName}`}
        sub={`Choose one of ${mentorFirst}'s open slots.`}
        submitLabel="Book session"
        footerNote={`${mentorFirst} gets a calendar invite`}
        onSubmit={(data) => {
          const start = String(data.get("slot"));
          const session: MentoringSession = {
            id: `ms-new-${sessions.length + 1}`,
            studentId: s.id,
            mentorId: s.mentorId,
            start,
            durationMins: Number(data.get("duration")) || 30,
            mode: String(data.get("mode")) as MentoringSession["mode"],
            agenda: String(data.get("agenda") ?? "").trim() || "Check-in",
            status: "scheduled",
          };
          setSessions((list) => [...list, session]);
          toast({ title: `Session booked with ${mentorName}`, body: `${dayTimeLabel(start)} · ${session.mode}` });
          setBookOpen(false);
        }}
      >
        <SlotPicker key={`book-${formKey}`} slots={slots} taken={sessions.map((m) => m.start)} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode">
            <Select name="mode" defaultValue={s.type === "undergraduate" ? "In person" : "Video"} key={`mode-${formKey}`}>
              <option>Video</option>
              <option>Phone</option>
              <option>In person</option>
            </Select>
          </Field>
          <Field label="Length">
            <Select name="duration" defaultValue="30" key={`dur-${formKey}`}>
              <option value="20">20 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
            </Select>
          </Field>
        </div>
        <Field label="What do you want to cover?">
          <Textarea name="agenda" required rows={3} key={`agenda-${formKey}`} placeholder="e.g. My PM Section C answers and whether to book the late entry window" />
        </Field>
        <Checkbox name="share" defaultChecked label="Share my latest readiness scores and mock results before the session" key={`share-${formKey}`} />
      </FormDrawer>

      <FormDrawer
        open={rescheduling !== undefined}
        onClose={() => setRescheduleId(null)}
        title="Reschedule session"
        sub={rescheduling ? `Currently ${whenLabel(rescheduling.start)} · ${rescheduling.agenda}` : undefined}
        submitLabel="Move session"
        onSubmit={(data) => {
          if (!rescheduling) return;
          const start = String(data.get("slot"));
          setSessions((list) => list.map((m) => (m.id === rescheduling.id ? { ...m, start } : m)));
          toast({ title: "Session moved", body: `${mentorName} · ${dayTimeLabel(start)}` });
          setRescheduleId(null);
        }}
      >
        <SlotPicker key={`move-${formKey}`} slots={slots} taken={sessions.map((m) => m.start)} />
        <Field label="Reason">
          <Select name="reason" defaultValue="Work commitment" key={`reason-${formKey}`}>
            <option>Work commitment</option>
            <option>Class or exam clash</option>
            <option>Health</option>
            <option>Other</option>
          </Select>
        </Field>
      </FormDrawer>
    </div>
  );
}

function SlotPicker({ slots, taken }: { slots: Slot[]; taken: string[] }) {
  const open = slots.filter((sl) => !taken.includes(sl.start));
  const [value, setValue] = useState(open[0]?.start ?? "");
  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-semibold text-ink-2">Open slots</legend>
      <div className="grid gap-2">
        {open.map((sl) => {
          const active = sl.start === value;
          return (
            <label
              key={sl.start}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 transition-colors",
                active ? "border-ink bg-cta-soft" : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <input
                type="radio"
                name="slot"
                value={sl.start}
                checked={active}
                onChange={() => setValue(sl.start)}
                required
                className="size-4 accent-ink"
              />
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-ink tnum">{dayTimeLabel(sl.start)}</span>
                {sl.note ? <span className="block text-[12px] text-ink-3">{sl.note}</span> : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
