"use client";

import { useState } from "react";
import { CalendarClock, Check, CheckCheck, Megaphone, MessageCircleQuestion, Pin, Send, Sparkles, ThumbsUp } from "lucide-react";
import {
  announcements as allAnnouncements,
  cohortById,
  doubtSessions,
  doubtsForFaculty,
  formatDateTime,
  formatShortDate,
  staffName,
  studentById,
  type Announcement,
  type Channel,
  type Doubt,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { PageHeader } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, SectionTitle } from "@/components/ui/card";
import { Tabs, Segmented } from "@/components/ui/tabs";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox, Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import { FilterSelect } from "@/components/ui/filter-bar";
import { StatusPill } from "@/components/ui/status";
import { toast } from "@/components/ui/toast";
import { FACULTY_NOW, areaTitle, dayLabel, firstNameOf, plural, useFaculty } from "./shared";

/* Worked answers for the open sample questions, so "Use suggested draft" reads like the paper. */
const DRAFTS: Record<string, string> = {
  "IFRS 16 sale and leaseback":
    "When the transfer is a sale under IFRS 15 and the price is fair value, the seller-lessee measures the right-of-use asset at the proportion of the previous carrying amount it keeps. Only the gain on the rights transferred to the buyer-lessor is recognised immediately; the rest is absorbed in the right-of-use asset.",
  "Unrealised profit":
    "Yes. When the subsidiary is the seller, the unrealised profit sits in the subsidiary's post-acquisition profits, so the adjustment is shared: deduct it in the subsidiary's net assets working, and NCI takes its share through the NCI working.",
  "Step acquisitions":
    "Yes. On the date control is gained the previously held equity interest is remeasured to fair value, with the gain or loss in profit or loss. That fair value is then added to consideration in the goodwill calculation.",
  "Transfer pricing":
    "With spare capacity the selling division gives up no external contribution, so the minimum transfer price is its marginal cost. Any price above that and below the buying division's external price leaves both divisions better off.",
  "Mix and yield variances":
    "Use the actual total quantity in standard mix. The mix variance compares it with the actual quantities in the actual mix, both valued at standard prices; the yield variance compares standard quantity for actual output with the actual total quantity in standard mix.",
  "Consideration":
    "Generally no: performing an existing contractual duty owed to the promisor is not good consideration (Stilk v Myrick). The exception is where the promisor obtains a practical benefit and there is no duress (Williams v Roffey).",
  "Emphasis of matter":
    "No. An emphasis of matter paragraph draws attention to a matter that is properly presented and disclosed, and the opinion stays unmodified. It is added below the opinion paragraph.",
};

const SNIPPETS = [
  { label: "Worked example", text: "\n\nWorked example: " },
  { label: "Link to lesson", text: "\n\nSee the lesson on this topic in your paper player, then retry the question set." },
  { label: "Exam tip", text: "\n\nExam tip: state the rule, apply it to the scenario, then conclude. Method marks need visible workings." },
];

export function FacultyQuestionsPage({ initialTab }: { initialTab?: string }) {
  const f = useFaculty();
  return <QuestionsView key={f.staffId} initialTab={initialTab} />;
}

function QuestionsView({ initialTab }: { initialTab?: string }) {
  const { staffId, me, papers, cohorts } = useFaculty();
  const [tab, setTab] = useState(initialTab === "announcements" ? "announcements" : "questions");
  const [doubts, setDoubts] = useState<Doubt[]>(() => doubtsForFaculty(staffId));
  const [filter, setFilter] = useState("open");
  const [paper, setPaper] = useState("");
  const [selectedId, setSelectedId] = useState(() => doubtsForFaculty(staffId).find((d) => d.status === "open")?.id ?? "");
  const [posted, setPosted] = useState<Announcement[]>(() =>
    allAnnouncements.filter((a) => a.authorId === staffId),
  );

  const visible = doubts
    .filter((d) => (filter === "all" ? true : filter === "answered" ? d.status === "answered" || d.status === "closed" : d.status === (filter === "session" ? "scheduled-for-session" : "open")))
    .filter((d) => !paper || d.paper === paper)
    .sort((a, b) => b.askedOn.localeCompare(a.askedOn));
  const selected = doubts.find((d) => d.id === selectedId) ?? visible[0];

  const open = doubts.filter((d) => d.status === "open");
  const inSession = doubts.filter((d) => d.status === "scheduled-for-session");
  const answered = doubts.filter((d) => d.answeredOn);
  const hours = answered
    .map((d) => {
      const toMin = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / 60000 + +iso.slice(11, 13) * 60 + +iso.slice(14, 16);
      return (toMin(d.answeredOn!) - toMin(d.askedOn)) / 60;
    })
    .sort((a, b) => a - b);
  const median = hours.length ? Math.round(hours[Math.floor(hours.length / 2)]) : null;

  const patch = (id: string, p: Partial<Doubt>) => setDoubts((all) => all.map((d) => (d.id === id ? { ...d, ...p } : d)));

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Teaching"
        title="Student questions"
        sub="Answer student questions from lessons, classes and practice, move them to a doubt-clearing session, and post academic announcements to your cohorts."
        actions={
          <>
            <Button variant="secondary" onClick={() => setTab("announcements")}>
              <Megaphone className="size-4" />
              Post announcement
            </Button>
            {open[0] ? (
              <Button
                onClick={() => {
                  setTab("questions");
                  setFilter("open");
                  setSelectedId(open.slice().sort((a, b) => a.askedOn.localeCompare(b.askedOn))[0].id);
                }}
              >
                <MessageCircleQuestion className="size-4" />
                Answer oldest question
              </Button>
            ) : null}
          </>
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Open questions" value={open.length} sub={papers.join(" and ")} icon={<MessageCircleQuestion />} />
        <KpiTile label="Scheduled for a session" value={inSession.length} tone="info" icon={<CalendarClock />} />
        <KpiTile label="Answered" value={answered.length} tone="jade" icon={<CheckCheck />} sub="Written answers sent" />
        <KpiTile label="Median time to answer" value={median === null ? "No data" : `${median}h`} goodWhen="down" sub="From question to first answer" />
      </KpiRow>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "questions", label: "Answer student questions", count: open.length },
          { id: "announcements", label: "Post academic announcements", count: posted.length },
        ]}
      />

      {tab === "questions" ? (
        <div className="grid gap-5 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                size="sm"
                value={filter}
                onChange={setFilter}
                items={[
                  { id: "open", label: `Open (${open.length})` },
                  { id: "session", label: "For session" },
                  { id: "answered", label: "Answered" },
                  { id: "all", label: "All" },
                ]}
              />
              {papers.length > 1 ? (
                <FilterSelect label="Paper" allLabel="All" value={paper} onChange={setPaper} options={papers} />
              ) : null}
            </div>
            <ul className="scrollbar-slim max-h-[26rem] space-y-2 overflow-y-auto xl:max-h-[44rem]">
              {visible.length === 0 ? (
                <li className="rounded-[var(--radius-lg)] border border-dashed border-line-strong px-4 py-8 text-center text-[13px] text-ink-3">No questions in this view.</li>
              ) : null}
              {visible.map((d) => {
                const on = d.id === selected?.id;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        "w-full min-w-0 rounded-[var(--radius-lg)] border p-3.5 text-left transition-colors",
                        on ? "border-cta-strong bg-cta-soft" : "border-line bg-surface hover:border-line-strong hover:bg-cta-soft",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{d.topic}</span>
                        <StatusPill status={d.status === "scheduled-for-session" ? "scheduled" : d.status} size="sm" />
                      </span>
                      <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-ink-2">{d.question}</span>
                      <span className="mt-1.5 flex items-center gap-2 text-[11.5px] text-ink-3">
                        <span className="min-w-0 truncate">
                          {studentById(d.studentId)?.name} · {d.paper} {d.syllabusArea} · {formatShortDate(d.askedOn)}
                        </span>
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1 tnum">
                          <ThumbsUp aria-hidden className="size-3" /> {d.upvotes}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {selected ? (
            <QuestionDetail
              key={selected.id}
              doubt={selected}
              answerer={me.name}
              onAnswer={(text) => {
                patch(selected.id, { status: "answered", answer: text, answeredOn: FACULTY_NOW });
                toast({ title: "Answer sent", body: `${studentById(selected.studentId)?.name} and ${plural(selected.upvotes, "learner")} following it notified` });
              }}
              onSchedule={(sessionLabel) => {
                patch(selected.id, { status: "scheduled-for-session" });
                toast({ title: "Moved to a doubt-clearing session", body: sessionLabel, tone: "info" });
              }}
              onResolve={() => {
                patch(selected.id, { status: "closed", answer: selected.answer ?? "Resolved in class.", answeredOn: selected.answeredOn ?? FACULTY_NOW });
                toast({ title: "Marked resolved", body: selected.topic, tone: "neutral" });
              }}
            />
          ) : (
            <Card className="grid place-items-center p-10 text-[13px] text-ink-3">Choose a question to answer it.</Card>
          )}
        </div>
      ) : (
        <Announcements
          cohorts={cohorts}
          staffId={staffId}
          posted={posted}
          onPost={(a) => setPosted((list) => [{ ...a, id: `an-new-${list.length + 1}` }, ...list])}
        />
      )}
    </div>
  );
}

function QuestionDetail({
  doubt,
  answerer,
  onAnswer,
  onSchedule,
  onResolve,
}: {
  doubt: Doubt;
  answerer: string;
  onAnswer: (text: string) => void;
  onSchedule: (label: string) => void;
  onResolve: () => void;
}) {
  const student = studentById(doubt.studentId);
  const cohort = cohortById(doubt.cohortId);
  const sessions = doubtSessions.filter((s) => s.paper === doubt.paper && s.status !== "completed" && s.facultyId === doubt.assignedTo);
  const [text, setText] = useState("");
  const [sessionId, setSessionId] = useState(sessions[0]?.id ?? "");
  const [faq, setFaq] = useState(false);
  const draft = DRAFTS[doubt.topic];
  const closed = doubt.status === "answered" || doubt.status === "closed";

  return (
    <Card className="min-w-0">
      <div className="flex flex-wrap items-start gap-3 p-5">
        <Avatar name={student?.name ?? "Learner"} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-ink">{student?.name}</p>
          <p className="text-[12.5px] text-ink-3">
            {cohort?.name} · asked {formatDateTime(doubt.askedOn)} · from {doubt.source}
          </p>
        </div>
        <StatusPill status={doubt.status === "scheduled-for-session" ? "scheduled" : doubt.status} />
      </div>
      <div className="space-y-4 border-t border-line px-5 py-5">
        <div className="flex flex-wrap gap-1.5">
          <StatusPill status="paper" tone="neutral" dot={false} size="sm">
            {doubt.paper} · area {doubt.syllabusArea} · {areaTitle(doubt.paper, doubt.syllabusArea)}
          </StatusPill>
          <StatusPill status="topic" tone="cta" dot={false} size="sm">
            {doubt.topic}
          </StatusPill>
        </div>
        <p className="font-display text-[19px] leading-snug font-semibold tracking-[-0.01em] text-ink">{doubt.question}</p>
        <p className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          <ThumbsUp aria-hidden className="size-3.5" />
          {doubt.upvotes} learners have the same question
        </p>

        {doubt.answer ? (
          <div className="rounded-[var(--radius-md)] border border-jade/30 bg-jade-soft px-4 py-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-jade uppercase">
              Answered{doubt.answeredOn ? ` · ${formatDateTime(doubt.answeredOn)}` : ""}
            </p>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{doubt.answer}</p>
            <p className="mt-1.5 text-[12px] text-ink-3">{staffName(doubt.assignedTo)}</p>
          </div>
        ) : null}
      </div>

      {!closed ? (
        <>
          <div className="space-y-3 border-t border-line px-5 py-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-bold text-ink">Your answer</p>
              <div className="flex flex-wrap gap-1.5">
                {draft ? (
                  <Button size="xs" variant="ghost" onClick={() => setText(draft)}>
                    <Sparkles className="size-3.5" />
                    Use suggested draft
                  </Button>
                ) : null}
                {SNIPPETS.map((s) => (
                  <Button key={s.label} size="xs" variant="outline" onClick={() => setText((t) => (t + s.text).trimStart())}>
                    {s.label}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={`Answer ${firstNameOf(student?.name ?? "the learner")} in plain steps. The answer is shared with everyone following the question.`} />
            <Checkbox checked={faq} onChange={(e) => setFaq(e.target.checked)} label={`Also add to the ${doubt.paper} frequently asked questions`} />
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                disabled={!text.trim()}
                onClick={() => {
                  onAnswer(text.trim());
                  if (faq) toast({ title: `Added to ${doubt.paper} FAQs`, tone: "info" });
                }}
              >
                <Send className="size-4" />
                Send answer
              </Button>
              <Button variant="ghost" onClick={onResolve}>
                <Check className="size-4" />
                Mark resolved
              </Button>
              <span className="ml-auto text-[12px] text-ink-3">Signed as {answerer}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2.5 border-t border-line bg-surface-2 px-5 py-4">
            <Field label="Move to doubt-clearing session" className="min-w-0 flex-1">
              <Select value={sessionId} onChange={(e) => setSessionId(e.target.value)} disabled={sessions.length === 0}>
                {sessions.length === 0 ? <option value="">No upcoming {doubt.paper} sessions</option> : null}
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {dayLabel(s.start)} {s.start.slice(11, 16)} · {cohortById(s.cohortId)?.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              variant="secondary"
              disabled={!sessionId || doubt.status === "scheduled-for-session"}
              onClick={() => {
                const s = sessions.find((x) => x.id === sessionId);
                if (s) onSchedule(`${dayLabel(s.start)} at ${s.start.slice(11, 16)} · ${cohortById(s.cohortId)?.name}`);
              }}
            >
              <CalendarClock className="size-4" />
              {doubt.status === "scheduled-for-session" ? "In a session" : "Move to session"}
            </Button>
          </div>
        </>
      ) : null}
    </Card>
  );
}

const CHANNEL_LABELS: Record<string, string> = { "in-app": "In-app", email: "Email", whatsapp: "WhatsApp", sms: "SMS", push: "Push" };

function Announcements({
  cohorts,
  staffId,
  posted,
  onPost,
}: {
  cohorts: ReturnType<typeof useFaculty>["cohorts"];
  staffId: string;
  posted: Announcement[];
  onPost: (a: Announcement) => void;
}) {
  const [audience, setAudience] = useState(cohorts[0]?.id ?? "all");
  const [batch, setBatch] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channels, setChannels] = useState<Channel[]>(["in-app", "email"]);
  const [when, setWhen] = useState("now");
  const [date, setDate] = useState("2026-09-17");
  const [time, setTime] = useState("18:00");
  const [pinned, setPinned] = useState(false);

  const cohort = cohorts.find((c) => c.id === audience);
  const reach = audience === "all" ? cohorts.reduce((n, c) => n + c.size, 0) : batch ? (cohort?.sections.find((s) => s.id === batch)?.size ?? 0) : (cohort?.size ?? 0);
  const audienceLabel =
    audience === "all" ? "All my cohorts" : `${cohort?.name}${batch ? ` · ${cohort?.sections.find((s) => s.id === batch)?.name}` : ""}`;

  const others = allAnnouncements.filter(
    (a) => a.authorId !== staffId && a.status === "published" && (a.audience === "all" || (a.audience === "cohort" && cohorts.some((c) => c.id === a.audienceId))),
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="min-w-0">
        <CardHeader title="Post academic announcements" sub="Goes to the cohort page and each learner's notifications" />
        <form
          className="space-y-4 border-t border-line p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim() || !body.trim()) {
              toast({ title: "Add a title and a message", tone: "warning" });
              return;
            }
            const scheduled = when === "later";
            onPost({
              id: "",
              title: title.trim(),
              body: body.trim(),
              audience: audience === "all" ? "programme" : "cohort",
              audienceId: audience === "all" ? undefined : audience,
              audienceLabel,
              authorId: staffId,
              publishedOn: scheduled ? date : "2026-09-14",
              status: scheduled ? "scheduled" : "published",
              channels,
              category: "Academic",
              pinned,
              readPct: scheduled ? undefined : 0,
            });
            toast({
              title: scheduled ? "Announcement scheduled" : "Announcement posted",
              body: scheduled
                ? `${audienceLabel} · ${formatShortDate(date)} at ${time}`
                : `${audienceLabel} · ${reach} learners notified by ${channels.map((c) => CHANNEL_LABELS[c]).join(", ")}`,
            });
            setTitle("");
            setBody("");
            setPinned(false);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Audience">
              <Select
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value);
                  setBatch("");
                }}
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                {cohorts.length > 1 ? <option value="all">All my cohorts</option> : null}
              </Select>
            </Field>
            <Field label="Batch" hint={`${reach} learners`}>
              <Select value={batch} onChange={(e) => setBatch(e.target.value)} disabled={!cohort || cohort.sections.length < 2}>
                <option value="">All batches</option>
                {cohort && cohort.sections.length > 1
                  ? cohort.sections.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  : null}
              </Select>
            </Field>
          </div>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Group accounts question set before Saturday's class" required />
          </Field>
          <Field label="Message">
            <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What learners need to do, by when, and where to find it." required />
          </Field>
          <fieldset className="space-y-2">
            <legend className="mb-1 text-[12.5px] font-semibold text-ink-2">Channels</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(["in-app", "email", "whatsapp"] as Channel[]).map((c) => (
                <Checkbox
                  key={c}
                  checked={channels.includes(c)}
                  disabled={c === "in-app"}
                  onChange={(e) => setChannels((list) => (e.target.checked ? [...list, c] : list.filter((x) => x !== c)))}
                  label={CHANNEL_LABELS[c]}
                />
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap items-end gap-3">
            <Segmented
              size="sm"
              value={when}
              onChange={setWhen}
              items={[
                { id: "now", label: "Post now" },
                { id: "later", label: "Schedule" },
              ]}
            />
            {when === "later" ? (
              <>
                <Input aria-label="Date" type="date" value={date} min="2026-09-14" onChange={(e) => setDate(e.target.value)} className="w-40" />
                <Input aria-label="Time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-28" />
              </>
            ) : null}
          </div>
          <Switch checked={pinned} onChange={setPinned} label="Pin to the top of the cohort page" sub="Pinned until the next announcement is pinned" />
          <div className="flex justify-end border-t border-line pt-4">
            <Button type="submit">
              <Megaphone className="size-4" />
              {when === "later" ? "Schedule announcement" : "Post announcement"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="min-w-0 space-y-5">
        <Card className="min-w-0 p-5">
          <SectionTitle>Preview</SectionTitle>
          <div className="rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
            <p className="flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
              {pinned ? <Pin aria-hidden className="size-3.5 text-ink" /> : null}
              Academic · {audienceLabel}
            </p>
            <p className="mt-1.5 text-[15px] font-bold text-ink">{title || "Announcement title"}</p>
            <p className="mt-1 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{body || "Your message appears here."}</p>
            <p className="mt-2 text-[12px] text-ink-3">
              {staffName(staffId)} · {when === "later" ? `${formatShortDate(date)}, ${time}` : "Today"}
            </p>
          </div>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Your announcements" sub={plural(posted.length, "announcement")} />
          <ul className="divide-y divide-line border-t border-line">
            {posted.length === 0 ? <li className="px-5 py-5 text-[13px] text-ink-3">Nothing posted yet.</li> : null}
            {posted.map((a) => (
              <li key={a.id} className="px-5 py-3.5">
                <div className="flex flex-wrap items-start gap-2">
                  <p className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink">
                    {a.pinned ? <Pin aria-label="Pinned" className="mr-1.5 inline size-3.5 align-[-2px]" /> : null}
                    {a.title}
                  </p>
                  <StatusPill status={a.status} size="sm" />
                </div>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  {a.audienceLabel} · {formatShortDate(a.publishedOn)} · {a.channels.map((c) => CHANNEL_LABELS[c]).join(", ")}
                  {typeof a.readPct === "number" ? ` · read by ${a.readPct}%` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="min-w-0">
          <CardHeader title="Also sent to your cohorts" sub="From the programme team" />
          <ul className="divide-y divide-line border-t border-line">
            {others.slice(0, 4).map((a) => (
              <li key={a.id} className="px-5 py-3">
                <p className="truncate text-[13px] font-semibold text-ink">{a.title}</p>
                <p className="truncate text-[12px] text-ink-3">
                  {staffName(a.authorId)} · {a.audienceLabel} · {formatShortDate(a.publishedOn)}
                  {typeof a.readPct === "number" ? ` · read by ${a.readPct}%` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
