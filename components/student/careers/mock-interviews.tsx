"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Mic,
  Play,
  RotateCcw,
  SkipForward,
  Sparkles,
  Square,
  Timer,
  Trophy,
  Video,
} from "lucide-react";
import {
  companyReadinessFor,
  formatAccaDate,
  interviewsForStudent,
  staffById,
  type MockInterview,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KpiRow, KpiTile } from "@/components/ui/kpi";
import { PageHeader } from "@/components/ui/misc";
import { Segmented } from "@/components/ui/tabs";
import { ScoreBar, ScoreRing } from "@/components/ui/score";
import { toast } from "@/components/ui/toast";
import { DEMO_TODAY, useStudentRecord } from "@/components/student/help/shared";

type Track = "Audit associate" | "Financial analyst" | "Accounts executive";
type Mode = "technical" | "behavioural" | "mixed";
type Format = "video" | "voice";
type Question = { q: string; kind: "technical" | "behavioural"; covers: string };

const TRACKS: Track[] = ["Audit associate", "Financial analyst", "Accounts executive"];

const BANK: Record<Track, Question[]> = {
  "Audit associate": [
    { q: "Walk me through how you would audit trade receivables at the year end.", kind: "technical", covers: "Existence and valuation, circularisation, after-date cash, allowance for doubtful debts" },
    { q: "What is the difference between tests of control and substantive procedures?", kind: "technical", covers: "Purpose of each, when you rely on controls, one example of each" },
    { q: "A client refuses to let you circularise a major customer. What do you do?", kind: "technical", covers: "Reasons, alternative procedures, impact on the audit report if unresolved" },
    { q: "Tell me about a time you found an error in someone else's work.", kind: "behavioural", covers: "Situation, how you raised it, the outcome, what changed afterwards" },
    { q: "How would you explain materiality to a client who has never been audited?", kind: "technical", covers: "Plain definition, why it is judgement, overall and performance materiality" },
    { q: "Why are you moving from accounts into audit?", kind: "behavioural", covers: "A clear motive, what you bring from accounts, your ACCA plan with AA" },
  ],
  "Financial analyst": [
    { q: "How do you calculate goodwill when NCI is measured at fair value?", kind: "technical", covers: "Consideration plus NCI at fair value, less fair value of net assets, a worked example" },
    { q: "Revenue rose 18% but operating cash flow fell. What would you look at first?", kind: "technical", covers: "Working capital movements, receivables days, revenue recognition, one-off items" },
    { q: "Explain the difference between WACC and the cost of equity.", kind: "technical", covers: "Definitions, when each is used, market values rather than book values" },
    { q: "Tell me about a report you built that changed a decision.", kind: "behavioural", covers: "The question, your analysis, how you presented it, the decision taken" },
    { q: "How would you build a three-statement forecast in Excel?", kind: "technical", covers: "Drivers, linking the statements, balancing checks, scenarios" },
    { q: "Where do you want to be in three years?", kind: "behavioural", covers: "Realistic goal, link to ACCA papers, why this employer" },
  ],
  "Accounts executive": [
    { q: "Talk me through your month-end close checklist.", kind: "technical", covers: "Accruals, prepayments, reconciliations, review and sign-off" },
    { q: "How do you clear an unreconciled bank item?", kind: "technical", covers: "Investigate timing versus error, supporting evidence, journal and approval" },
    { q: "What does a balance on the suspense account tell you?", kind: "technical", covers: "Trial balance errors that break double entry, how you clear it" },
    { q: "Tell me about a deadline you nearly missed.", kind: "behavioural", covers: "What caused it, how you recovered, what you now do differently" },
    { q: "How do you handle a vendor disputing a payment?", kind: "behavioural", covers: "Listening, checking the ledger and contract, clear communication" },
    { q: "Which ERP have you used, and what did you automate?", kind: "technical", covers: "System named, one process improved, the time or error saved" },
  ],
};

const GENERIC: Question[] = [
  { q: "Tell me about yourself and your ACCA journey so far.", kind: "behavioural", covers: "Two minutes: background, papers cleared, current paper, why this role" },
  { q: "Describe a time you had to learn something difficult quickly.", kind: "behavioural", covers: "The topic, your method, how you checked you understood it" },
];

/* Undergraduates have no accounts job to move from, so that question is swapped. */
const UNDERGRAD_SWAP: Record<string, Question> = {
  "Why are you moving from accounts into audit?": { q: "Why do you want an audit internship while you are still studying?", kind: "behavioural", covers: "What you want to learn, how it links to AA and FA, how you will balance it with university" },
};

function questionsFor(track: Track, mode: Mode, undergrad: boolean): Question[] {
  const bank = undergrad ? BANK[track].map((q) => UNDERGRAD_SWAP[q.q] ?? q) : BANK[track];
  if (mode === "technical") return bank.filter((q) => q.kind === "technical");
  if (mode === "behavioural") return [...GENERIC, ...bank.filter((q) => q.kind === "behavioural")];
  return [GENERIC[0], ...bank];
}

const SECONDS_PER_QUESTION = 120;
const ON_DARK_GHOST =
  "inline-flex h-10.5 items-center gap-2 rounded-[var(--radius-md)] px-4 text-[14px] font-semibold text-ink-inv/75 transition-colors hover:bg-ink-inv/10 hover:text-ink-inv";
const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;

export function MockInterviews() {
  const s = useStudentRecord();
  return <MockInterviewsView key={s.id} s={s} />;
}

function MockInterviewsView({ s }: { s: Student }) {
  const cr = companyReadinessFor(s.id);
  const defaultTrack: Track = s.career.targetRole.toLowerCase().includes("audit") ? "Audit associate" : "Accounts executive";
  const [history, setHistory] = useState<MockInterview[]>(() =>
    [...interviewsForStudent(s.id)].sort((a, b) => b.date.localeCompare(a.date)),
  );
  const [track, setTrack] = useState<Track>(defaultTrack);
  const [mode, setMode] = useState<Mode>("mixed");
  const [format, setFormat] = useState<Format>("video");
  const [phase, setPhase] = useState<"setup" | "live" | "done">("setup");
  const [index, setIndex] = useState(0);
  const [seconds, setSeconds] = useState(SECONDS_PER_QUESTION);
  const [recording, setRecording] = useState(false);
  const [answered, setAnswered] = useState<Record<number, boolean>>({});
  const [skipped, setSkipped] = useState(0);
  const [result, setResult] = useState<MockInterview | null>(null);
  const [openId, setOpenId] = useState<string | null>(() => interviewsForStudent(s.id).find((m) => m.status === "completed")?.id ?? null);

  const questions = useMemo(() => questionsFor(track, mode, s.type === "undergraduate"), [track, mode, s.type]);
  const current = questions[index];
  const completed = history.filter((m) => m.status === "completed" && m.score !== null);
  const best = completed.reduce((m, x) => Math.max(m, x.score ?? 0), 0);
  const latest = completed[0];
  const interviewWeight = cr?.components.find((c) => c.label === "Mock interviews");

  useEffect(() => {
    if (phase !== "live") return;
    const id = window.setInterval(() => setSeconds((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => window.clearInterval(id);
  }, [phase, index]);

  function start() {
    setIndex(0);
    setSeconds(SECONDS_PER_QUESTION);
    setRecording(false);
    setAnswered({});
    setSkipped(0);
    setResult(null);
    setPhase("live");
    toast({ title: `${track} interview started`, body: `${questions.length} questions · ${mode === "mixed" ? "technical and behavioural" : mode}`, tone: "ai" });
  }

  function advance(skip = false) {
    const wasAnswered = answered[index] || recording;
    if (recording) setAnswered((a) => ({ ...a, [index]: true }));
    setRecording(false);
    if (skip && !wasAnswered) setSkipped((n) => n + 1);
    if (index + 1 >= questions.length) {
      finish({ ...answered, ...(wasAnswered ? { [index]: true } : {}) }, skip && !wasAnswered ? skipped + 1 : skipped);
      return;
    }
    setIndex((i) => i + 1);
    setSeconds(SECONDS_PER_QUESTION);
  }

  function finish(done: Record<number, boolean>, skips: number) {
    const count = Object.values(done).filter(Boolean).length;
    const baseScore = latest?.score ?? 50;
    const coverage = count / Math.max(1, questions.length);
    const score = Math.max(35, Math.min(92, Math.round(baseScore + coverage * 8 - skips * 4 + (format === "video" ? 1 : 0))));
    const tilt = mode === "technical" ? [4, -2, 1, -1] : mode === "behavioural" ? [-3, 4, 1, 2] : [1, 1, 0, -1];
    const interview: MockInterview = {
      id: `mi-new-${history.length + 1}`,
      studentId: s.id,
      kind: "ai",
      role: track,
      date: DEMO_TODAY,
      durationMins: Math.max(5, Math.round((questions.length * SECONDS_PER_QUESTION) / 60)),
      status: "completed",
      score,
      rubric: ["Technical accuracy", "Communication", "Structured thinking", "Professional presence"].map((label, i) => ({
        label,
        score: Math.max(30, Math.min(95, score + tilt[i])),
      })),
      strengths: count >= questions.length - 1 ? ["Answered every question with a clear structure"] : ["Strong opening on the questions you answered"],
      improvements: skips ? ["Attempt every question, even briefly: a skipped answer scores zero"] : ["Use the STAR format for behavioural answers"],
      feedback: `AI interviewer: ${count} of ${questions.length} questions answered. ${mode !== "behavioural" ? "Name the standard or procedure before explaining it." : "Keep each answer to about 90 seconds."}`,
    };
    setHistory((h) => [interview, ...h]);
    setResult(interview);
    setOpenId(interview.id);
    setPhase("done");
    toast({ title: `Interview scored: ${score}`, body: `${track} · saved to your past interviews` });
  }

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      <PageHeader
        eyebrow="Career"
        title="AI mock interviews"
        sub="Practise the interviews ACCA employers run. Pick a role track and mode, answer out loud against the clock, and get scores per competency with feedback you can act on."
        actions={
          phase === "setup" ? (
            <Button onClick={start}>
              <Play className="size-4" /> Start interview
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setPhase("setup")}>
              <RotateCcw className="size-4" /> New interview
            </Button>
          )
        }
      />

      <KpiRow cols={4}>
        <KpiTile hero label="Interviews completed" value={completed.length} icon={<Mic />} sub={`${s.career.targetRole} track`} />
        <KpiTile label="Best score" value={best || "None yet"} tone="jade" icon={<Trophy />} />
        <KpiTile label="Latest score" value={latest?.score ?? "None yet"} tone="info" icon={<Sparkles />} sub={latest ? formatAccaDate(latest.date) : undefined} />
        <KpiTile
          label="Share of Company Readiness Score"
          value={`${interviewWeight?.weight ?? 25}%`}
          tone="violet"
          icon={<Timer />}
          sub={interviewWeight ? `Your interview component: ${interviewWeight.score}` : undefined}
        />
      </KpiRow>

      {phase === "setup" ? (
        <Card className="min-w-0">
          <CardHeader title="Set up your interview" sub="Questions are drawn from real first-round interviews for each role" />
          <div className="grid gap-5 border-t border-line px-5 py-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4">
              <div>
                <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Role track</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {TRACKS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={track === t}
                      onClick={() => setTrack(t)}
                      className={cn(
                        "rounded-[var(--radius-md)] border px-3.5 py-3 text-left transition-colors",
                        track === t ? "border-transparent bg-nav-active text-nav-active-ink" : "border-line bg-surface text-ink hover:border-cta hover:bg-cta-soft",
                      )}
                    >
                      <span className="block text-[13.5px] font-bold">{t}</span>
                      <span className={cn("block text-[12px]", track === t ? "text-nav-active-ink/70" : "text-ink-3")}>
                        {t === defaultTrack ? "Matches your target role" : `${BANK[t].length} question bank`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-5">
                <div>
                  <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Mode</p>
                  <Segmented
                    size="sm"
                    value={mode}
                    onChange={(id) => setMode(id as Mode)}
                    items={[
                      { id: "mixed", label: "Mixed" },
                      { id: "technical", label: "Technical" },
                      { id: "behavioural", label: "Behavioural" },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-[12.5px] font-semibold text-ink-2">Format</p>
                  <Segmented
                    size="sm"
                    value={format}
                    onChange={(id) => setFormat(id as Format)}
                    items={[
                      { id: "video", label: "Video" },
                      { id: "voice", label: "Voice only" },
                    ]}
                  />
                </div>
              </div>
              <Button onClick={start} size="lg">
                <Play className="size-4" /> Start interview
              </Button>
            </div>
            <div className="min-w-0 rounded-[var(--radius-md)] border border-line bg-surface-2 p-4">
              <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                {questions.length} questions · about {Math.round((questions.length * SECONDS_PER_QUESTION) / 60)} minutes
              </p>
              <ol className="mt-3 space-y-2">
                {questions.map((q, i) => (
                  <li key={q.q} className="flex gap-2.5 text-[13px] leading-snug text-ink-2">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold text-ink tnum">{i + 1}</span>
                    <span className="min-w-0">
                      {q.q} <Badge className="ml-1 align-middle">{q.kind === "technical" ? "Technical" : "Behavioural"}</Badge>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>
      ) : null}

      {phase === "live" && current ? (
        <section aria-label="Interview in progress" className="relative isolate overflow-hidden rounded-[var(--radius-xl)] bg-surface-inv p-5 text-ink-inv sm:p-7">
          <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-cta" />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-bold tracking-[0.12em] text-cta uppercase">
              {track} · {mode} · Question {index + 1} of {questions.length}
            </p>
            <p className={cn("font-display text-[30px] leading-none font-bold tnum", seconds <= 20 ? "text-rose-soft" : "text-cta")} aria-live="polite">
              {mmss(seconds)}
            </p>
          </div>
          <div className="mt-2 flex gap-1" aria-hidden>
            {questions.map((_, i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full", i < index ? "bg-cta" : i === index ? "bg-ink-inv/70" : "bg-ink-inv/15")} />
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-cta text-cta-ink">
                  <Sparkles className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] text-ink-inv/60">AI interviewer asks</p>
                  <h2 className="mt-1 font-display text-[clamp(1.25rem,1rem+1vw,1.75rem)] leading-snug font-bold tracking-[-0.02em]">{current.q}</h2>
                </div>
              </div>
              <div className="mt-5 min-h-28 rounded-[var(--radius-md)] border border-ink-inv/15 bg-ink-inv/5 p-4">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">Transcript</p>
                {recording ? (
                  <p className="mt-2 flex items-center gap-2 text-[13.5px] text-ink-inv/85">
                    <span className="flex items-end gap-0.5" aria-hidden>
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="w-1 animate-pulse rounded-full bg-cta" style={{ height: 8 + ((i * 5) % 12), animationDelay: `${i * 120}ms` }} />
                      ))}
                    </span>
                    Listening. Your answer is transcribed here as you speak.
                  </p>
                ) : answered[index] ? (
                  <p className="mt-2 text-[13.5px] text-ink-inv/85">Answer recorded. The transcript is analysed when you finish the interview.</p>
                ) : (
                  <p className="mt-2 text-[13.5px] text-ink-inv/55">Press record and answer out loud. Aim for about 90 seconds.</p>
                )}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2.5">
                <Button
                  variant={recording ? "danger" : "primary"}
                  aria-pressed={recording}
                  onClick={() => {
                    if (recording) setAnswered((a) => ({ ...a, [index]: true }));
                    setRecording((r) => !r);
                  }}
                >
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                  {recording ? "Stop recording" : answered[index] ? "Record again" : "Record answer"}
                </Button>
                <Button variant="inverse" onClick={() => advance(false)}>
                  {index + 1 >= questions.length ? "Finish interview" : "Next question"}
                </Button>
                <button type="button" className={ON_DARK_GHOST} onClick={() => advance(true)}>
                  <SkipForward className="size-4" /> Skip
                </button>
              </div>
            </div>
            <div className="min-w-0 space-y-3">
              <div className="grid aspect-video max-w-full place-items-center rounded-[var(--radius-md)] border border-ink-inv/15 bg-ink-inv/5">
                {format === "video" ? (
                  <span className="flex flex-col items-center gap-1.5 text-[12px] text-ink-inv/60">
                    <Video className="size-5" /> Your camera
                  </span>
                ) : (
                  <span className="flex flex-col items-center gap-1.5 text-[12px] text-ink-inv/60">
                    <Mic className="size-5" /> Voice only
                  </span>
                )}
              </div>
              <div className="rounded-[var(--radius-md)] border border-ink-inv/15 p-3">
                <p className="text-[11px] font-bold tracking-[0.12em] text-ink-inv/60 uppercase">A strong answer covers</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-inv/80">{current.covers}</p>
              </div>
              <button
                type="button"
                className={ON_DARK_GHOST}
                onClick={() => finish({ ...answered, ...(recording ? { [index]: true } : {}) }, skipped + (questions.length - index - 1))}
              >
                End interview now
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {phase === "done" && result ? (
        <Card className="min-w-0 border-cta">
          <CardHeader title="Your result" sub={`${result.role} · ${result.durationMins} minutes · AI interviewer`} />
          <div className="grid gap-6 border-t border-line px-5 py-5 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
            <ScoreRing value={result.score ?? 0} size={112} stroke={9} showBand label="Interview score" />
            <div className="min-w-0 space-y-3">
              {result.rubric.map((r) => (
                <ScoreBar key={r.label} label={r.label} value={r.score} height={6} />
              ))}
            </div>
            <div className="min-w-0 space-y-2 text-[13px] leading-relaxed text-ink-2">
              <p>
                <span className="font-semibold text-jade">Strength:</span> {result.strengths.join(" ")}
              </p>
              <p>
                <span className="font-semibold text-amber">Work on:</span> {result.improvements.join(" ")}
              </p>
              <p className="text-ink-3">{result.feedback}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" onClick={start}>
                  <RotateCcw className="size-3.5" /> Try again
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPhase("setup")}>
                  Change track
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card className="min-w-0">
        <CardHeader title="Past interviews" sub="Scores per competency, with the interviewer's feedback" />
        <ul className="divide-y divide-[var(--line)] border-t border-line">
          {history.map((m) => {
            const open = openId === m.id;
            const interviewer = m.kind === "mentor" ? staffById(m.interviewerId) : undefined;
            return (
              <li key={m.id}>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => setOpenId(open ? null : m.id)}
                  className="flex w-full min-w-0 items-center gap-4 px-5 py-3.5 text-left hover:bg-cta-soft"
                >
                  {m.score !== null ? (
                    <ScoreRing value={m.score} size={48} stroke={5} label={`${m.role} interview score`} />
                  ) : (
                    <span className="grid size-12 shrink-0 place-items-center rounded-full border border-dashed border-line-strong text-[11px] text-ink-3">Due</span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-ink">{m.role}</span>
                    <span className="block truncate text-[12px] text-ink-3">
                      {formatAccaDate(m.date)} · {m.durationMins} min · {m.kind === "ai" ? "AI interviewer" : `Mentor interview with ${interviewer?.name ?? "the placement team"}`}
                    </span>
                  </span>
                  <Badge tone={m.kind === "ai" ? "violet" : "dark"} className="hidden sm:inline-flex">
                    {m.kind === "ai" ? "AI" : "Mentor"}
                  </Badge>
                  <ChevronDown className={cn("size-4 shrink-0 text-ink-3 transition-transform", open && "rotate-180")} />
                </button>
                {open && m.status === "completed" ? (
                  <div className="grid gap-5 bg-surface-2/60 px-5 pt-1 pb-5 md:grid-cols-2">
                    <div className="min-w-0 space-y-3">
                      {m.rubric.map((r) => (
                        <ScoreBar key={r.label} label={r.label} value={r.score} height={6} />
                      ))}
                    </div>
                    <div className="min-w-0 space-y-2 text-[13px] leading-relaxed text-ink-2">
                      <p>
                        <span className="font-semibold text-jade">Strengths:</span> {m.strengths.join(" · ")}
                      </p>
                      <p>
                        <span className="font-semibold text-amber">Improve:</span> {m.improvements.join(" · ")}
                      </p>
                      <p className="text-ink-3">{m.feedback}</p>
                    </div>
                  </div>
                ) : null}
                {open && m.status !== "completed" ? (
                  <p className="bg-surface-2/60 px-5 pb-4 text-[13px] text-ink-3">Scheduled. Scores appear here after the interview.</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
