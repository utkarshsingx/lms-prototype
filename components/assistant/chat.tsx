"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUp, Link2, Sparkles, Wrench } from "lucide-react";
import type { ChatMessage } from "@/lib/data";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import { RichText } from "./rich-text";

export type TutorStudentType = "graduate" | "undergraduate";
export type TutorReply = Omit<ChatMessage, "id" | "at">;

type Rule = {
  test: (q: string) => boolean;
  reply: TutorReply | Record<TutorStudentType, TutorReply>;
};

const re = (pattern: RegExp) => (q: string) => pattern.test(q);

/* A scripted tutor. Every answer is grounded in the demo learner's ACCA record
   (bible section 6), so the prototype reads like a tutor that knows the learner
   rather than a chat box glued onto a dashboard. The boundary rule is first so
   a request to change a mark never falls through to a friendlier answer. */
const rules: Rule[] = [
  {
    test: re(
      /((change|increase|raise|fix|update|improve)\b.*\b(mark|grade|score|result))|re-?mark|(extra|another|more|additional) attempt|((enter|book|sit|register)\b.*\b(exam|paper)\b.*\bfor me)/i,
    ),
    reply: {
      from: "bot",
      action: "checked what the tutor is allowed to do",
      text: "I can't do that one. I never change a mark or a result, grant an extra attempt, or enter an exam on your behalf.\n\n**Marks** come from faculty evaluation on this platform and from ACCA for the real exam. **Reattempts** are approved by faculty where authorised. **Exam entries** are made with ACCA in your own account.\n\nWhat I can do is open a re-evaluation request with the faculty member who marked the script, with your answer and the rubric attached, or raise a support ticket so the academic team replies in writing.",
      citations: [
        { label: "Raise a doubt", href: "/doubts" },
        { label: "Support tickets", href: "/support" },
      ],
    },
  },
  {
    test: re(/(due|deadline|this week|entry|entries|book(ed|ing)?|when is my|exam date)/i),
    reply: {
      graduate: {
        from: "bot",
        action: "checked exam bookings, entry windows and open mocks",
        text: "Your **FR** entry for the December 2026 session is booked. Your **PM reattempt** is planned for the same session but not booked yet.\n\n**5 Oct 2026**: early entry closes (lowest ACCA fee).\n**2 Nov 2026**: standard entry closes.\n**16 Nov 2026**: late entry closes.\n**7 to 10 Dec 2026**: exams. Results on 25 Jan 2027.\n\nOn the platform, your **FR mock exam · Dec 2026** is in progress and the **Group accounts test** has a retake available. Entering PM before 5 October keeps the fee at the early rate.",
        citations: [
          { label: "Exams & results", href: "/exams" },
          { label: "FR mock exam · Dec 2026", href: "/assessments/a-fr-mock" },
        ],
      },
      undergraduate: {
        from: "bot",
        action: "checked exam bookings and your university calendar",
        text: "Your **FA** exam is an on-demand CBE booked for **18 Nov 2026**, five days before Brightwater's examination blackout starts on 23 Nov.\n\n**LW** is in progress this semester and the exam is planned for **January 2027**, after your university examinations finish on 12 Dec.\n\nBefore 18 November, sit the **FA mock exam** (2 hours, same format as the CBE). Mocks and live classes are not scheduled during the blackout, so the mock needs to happen in October or early November.",
        citations: [
          { label: "Exams & results", href: "/exams" },
          { label: "FA mock exam", href: "/assessments/a-fa-mock" },
        ],
      },
    },
  },
  {
    test: re(/(ready|readiness|on track|will i pass|chance|confident)/i),
    reply: {
      graduate: {
        from: "bot",
        action: "read your readiness scores and mock history",
        text: "Your **FR readiness score is 64** and **PM is 58**. Both are above the 50% pass mark, but neither has much margin yet.\n\nFR is held back by **D Preparation of financial statements**, mostly group accounts: your Group accounts test has a retake available and the FR mock is still in progress. PM is held back by **C Budgeting and control**, the area that cost you marks in June.\n\nThe quickest way to move both scores: finish the FR mock under timed conditions, retake the group accounts test, and rework your PM variance analysis report using the faculty feedback. Your attendance of 88% already counts in your favour.",
        citations: [
          { label: "Readiness", href: "/readiness" },
          { label: "Group accounts test", href: "/assessments/a-fr-groups" },
        ],
      },
      undergraduate: {
        from: "bot",
        action: "read your readiness score and mock history",
        text: "Your **FA readiness score is 72**, which is in the green band and comfortably above the 50% pass mark.\n\nYour strongest areas are **C Double entry and accounting systems** and **E Preparing a trial balance**, which overlap with your university Financial Accounting subject. The one to watch is **G Simple consolidated financial statements**: your B.Com covers it only partially.\n\nSit the FA mock before 18 November and spend two sessions on consolidation. Your 92% attendance and rank of 4 of 71 in the cohort leaderboard show the habits are already there.",
        citations: [
          { label: "Readiness", href: "/readiness" },
          { label: "FA mock exam", href: "/assessments/a-fa-mock" },
        ],
      },
    },
  },
  {
    test: re(/(goodwill|consolidat|group accounts|\bnci\b|non-controlling|subsidiar)/i),
    reply: {
      from: "bot",
      action: "answered from Financial Reporting (FR), syllabus area D",
      text: "Goodwill on acquisition is one line: **consideration transferred + NCI at fair value, minus the fair value of net assets at acquisition**.\n\nIn the workspace example the parent buys 80% of S. Consideration is cash of $3,000k plus 1,000k shares at $2.20 ($2,200k), so $5,200k. NCI at fair value is $1,100k. S's net assets at acquisition are share capital $1,000k, retained earnings $3,300k and a fair value uplift on land of $500k, so $4,800k.\n\nGoodwill = 5,200 + 1,100 − 4,800 = **$1,500k**.\n\nThe common exam mistake is using the carrying amount of the land instead of its fair value. Examiner's reports regularly flag it, and it moves goodwill by exactly the uplift.",
      citations: [
        { label: "Workspace: calculate goodwill on acquisition", href: "/learn/financial-reporting-fr" },
        { label: "Financial Reporting (FR)", href: "/courses/financial-reporting-fr" },
      ],
    },
  },
  {
    test: re(/(\bpm\b|performance management|variance|fail|failed|reattempt|retake|resit)/i),
    reply: {
      graduate: {
        from: "bot",
        action: "read your PM attempt history and revision cohort",
        text: "You sat **PM in June 2026 and scored 46%**, four marks below the pass mark. Your mock and question bank history point to **C Budgeting and control**, especially explaining what mix and yield variances mean in the written section.\n\nYou are in **PM Revision and Reattempt · Dec 2026** (weekend batch) with Farah Siddiqui. A plan that fits before December:\n\n**September**: work through Farah Siddiqui's feedback on your variance analysis report. You scored 94% on the budgeting and standard costing check, so the gap is written interpretation, not calculation.\n**October**: two timed constructed-response questions a week from the question bank.\n**November**: the PM mock exam under exam conditions, then a review call with Aisha Khan.\n\nRemember the entry itself: early entry for December closes on 5 October.",
        citations: [
          { label: "Variance analysis report", href: "/assessments/a-pm-variance" },
          { label: "PM mock exam · Dec 2026", href: "/assessments/a-pm-mock" },
        ],
      },
      undergraduate: {
        from: "bot",
        action: "read your attempt history",
        text: "You have not failed a paper. **BT passed in March 2026 (71%)** and **MA passed in June 2026 (64%)**.\n\nPM sits in **Semester 4** on the Brightwater roadmap, after FA and LW. Your university Management Accounting subject covers part of PM syllabus area A, so the first weeks will feel familiar.\n\nIf you ever do need a retake, your mentor Nikhil Bose sets up a recovery plan and the programme team places you in a revision cohort.",
        citations: [{ label: "Semester roadmap", href: "/roadmap" }],
      },
    },
  },
  {
    test: re(/(exempt)/i),
    reply: {
      graduate: {
        from: "bot",
        action: "read your exemption record",
        text: "You hold **four ACCA-approved exemptions: BT, MA, FA and LW**. The academic team estimated them from your B.Com in January 2025, ACCA confirmed them in March 2025, and the exemption fees are paid.\n\nThat is why your journey starts at Applied Skills. Further exemptions would need a new qualification to be evaluated: upload it on the Exemptions page and the team gives you an estimate before anything is sent to ACCA.",
        citations: [
          { label: "Exemptions", href: "/exemptions" },
          { label: "ACCA journey", href: "/journey" },
        ],
      },
      undergraduate: {
        from: "bot",
        action: "read your exemption record",
        text: "You have **no exemptions claimed**, and that is by design. On the B.Com (Hons) with ACCA route you sit the papers yourself alongside your university subjects, starting with BT in Semester 1.\n\nYour university subjects still help: Financial Accounting fully covers FA areas C to F, and Business Law partly covers LW area B. That overlap is mapped on your semester roadmap.",
        citations: [
          { label: "Semester roadmap", href: "/roadmap" },
          { label: "ACCA journey", href: "/journey" },
        ],
      },
    },
  },
  {
    test: (q) =>
      /(epsm|ethics|practical experience|performance objective)/i.test(q) ||
      /\bPER\b/.test(q),
    reply: {
      graduate: {
        from: "bot",
        action: "read your EPSM and PER progress",
        text: "The **Ethics and Professional Skills Module is complete**, with 93% on the final assessment.\n\nFor the **Practical Experience Requirement** you have **14 of 36 months** recorded and **3 of 9 performance objectives** signed off. You need all 5 essential objectives plus 4 technical ones.\n\nYour accounts executive role counts as relevant experience. Keep your workplace supervisor signing off months as you go: catching up on a year of records at the end is where most learners stall.",
        citations: [{ label: "ACCA journey", href: "/journey" }],
      },
      undergraduate: {
        from: "bot",
        action: "read your EPSM and PER progress",
        text: "You have not started the **Ethics and Professional Skills Module** yet. Most Brightwater learners complete it after the Applied Skills papers.\n\nThe **Practical Experience Requirement** is 36 months of relevant experience and 9 performance objectives. Your internship planned for summer 2027 can count towards it if a qualified supervisor signs off the months.",
        citations: [{ label: "ACCA journey", href: "/journey" }],
      },
    },
  },
  {
    test: re(/(class|recording|live|timetable|batch|cohort|attendance)/i),
    reply: {
      graduate: {
        from: "bot",
        action: "read your cohorts and attendance",
        text: "You are in two cohorts, both weekend batches:\n\n**FR · Dec 2026 · Weekend** with Marcus Bell.\n**PM Revision and Reattempt · Dec 2026** with Farah Siddiqui.\n\nYour attendance across ACCA sessions is **88%**. Every class recording appears in Live classes a few hours after the class ends, with the slides and class notes attached.",
        citations: [
          { label: "Live classes", href: "/classes" },
          { label: "Batches & cohorts", href: "/batches" },
        ],
      },
      undergraduate: {
        from: "bot",
        action: "read your cohort and attendance",
        text: "You are in **Brightwater · 2025 intake · Semester 3**, section A. This semester's ACCA papers are **LW** with Vikram Joshi and **FA** with Grace Whitfield, on weekdays.\n\nYour attendance across ACCA sessions is **92%**, above the 75% the joint certificate needs. No classes are scheduled during the university examination blackout, 23 Nov to 12 Dec.",
        citations: [
          { label: "Live classes", href: "/classes" },
          { label: "My university", href: "/my-university" },
        ],
      },
    },
  },
  {
    test: re(/(mentor|talk to (a|someone)|speak to|stuck|overwhelmed)/i),
    reply: {
      graduate: {
        from: "bot",
        action: "checked your mentor allocation",
        text: "Your academic mentor is **Aisha Khan**. She already has your PM reattempt plan on her list and usually replies within a working day.\n\nI can send her a session request with this conversation attached, so you don't have to explain it twice.",
        citations: [{ label: "My mentor", href: "/my-mentor" }],
      },
      undergraduate: {
        from: "bot",
        action: "checked your mentor allocation",
        text: "Your mentor is **Nikhil Bose**, who looks after the Brightwater Semester 3 cohort.\n\nI can send him a session request with this conversation attached, so you don't have to explain it twice.",
        citations: [{ label: "My mentor", href: "/my-mentor" }],
      },
    },
  },
  {
    test: re(/(whatsapp|phone|call me|sms|text me|remind|notification)/i),
    reply: {
      from: "bot",
      action: "checked your notification preferences",
      text: "You are opted in on WhatsApp at +91 98••• ••432 for **class reminders, exam entry deadlines and result notifications**, and nothing promotional.\n\nThe programme team's voice agent only calls about exam entry and fee reminders, on weekdays between 09:00 and 18:00, and says it is automated in its first sentence. You can switch either channel off in Notifications.",
      citations: [{ label: "Notifications", href: "/notifications" }],
    },
  },
];

const fallback: TutorReply = {
  from: "bot",
  text: "I answer from your ACCA record (papers, exemptions, exam bookings, mock results and readiness scores) and from the study material, examiner reports and model answers for your papers. I can explain a topic, plan revision against your exam date, or raise a doubt with your faculty.\n\nI never change marks, grant attempts or enter exams. Those stay with the academic team and ACCA.",
};

/** Answers a learner question the way the demo tutor would. */
function tutorAnswer(question: string, type: TutorStudentType = "graduate"): TutorReply {
  const hit = rules.find((r) => r.test(question));
  if (!hit) return fallback;
  return "from" in hit.reply ? hit.reply : hit.reply[type];
}

const tutorSuggestions: Record<TutorStudentType, string[]> = {
  graduate: [
    "When does December exam entry close?",
    "Am I ready for FR in December?",
    "Explain goodwill on acquisition",
    "Plan my PM reattempt",
    "Can you change my mock mark?",
  ],
  undergraduate: [
    "When is my FA exam?",
    "Am I on track for FA?",
    "Explain goodwill on acquisition",
    "Why don't I have exemptions?",
    "Can you change my mock mark?",
  ],
};

const openers: Record<TutorStudentType, string> = {
  graduate:
    "I have your ACCA record in front of me: FR booked for December, your PM reattempt, readiness scores and both cohorts. Ask me about any of it, or ask me to explain a topic from your papers.",
  undergraduate:
    "I have your ACCA record in front of me: FA booked for 18 November, LW this semester, your readiness score and the Brightwater calendar. Ask me about any of it, or ask me to explain a topic from your papers.",
};

const clock = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function Chat({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { studentType } = useRole();
  const type: TutorStudentType = studentType === "undergraduate" ? "undergraduate" : "graduate";
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // The opener is derived, not stored, so switching demo student re-grounds it.
  const thread: ChatMessage[] = [
    { id: "seed", from: "bot", at: "now", text: openers[type] },
    ...messages,
  ];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, thinking]);

  function send(text: string) {
    const q = text.trim();
    if (!q || thinking) return;
    setDraft("");
    setMessages((m) => [...m, { id: `u${m.length}`, from: "learner", at: clock(), text: q }]);
    setThinking(true);
    // The delay is deliberate: an instant answer reads as canned, and the
    // "reading your record" beat is what the real product would be doing.
    window.setTimeout(
      () => {
        const r = tutorAnswer(q, type);
        setThinking(false);
        setMessages((m) => [...m, { ...r, id: `b${m.length}`, at: clock() }]);
      },
      680 + ((q.length * 37) % 420),
    );
  }

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div
        className={cn(
          "scrollbar-slim min-h-0 flex-1 space-y-5 overflow-y-auto",
          compact ? "px-4 py-4" : "px-1 py-2",
        )}
      >
        {thread.map((m) =>
          m.from === "learner" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-[var(--radius-lg)] rounded-br-[6px] bg-surface-inv px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink-inv">
                {m.text}
              </div>
            </div>
          ) : (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex gap-2.5"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                {m.action ? (
                  <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[11px] text-ink-3">
                    <Wrench className="size-3" />
                    {m.action}
                  </p>
                ) : null}
                <div className="text-[13.5px] leading-relaxed text-ink-2">
                  <RichText text={m.text} />
                </div>
                {m.citations?.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {m.citations.map((c) => (
                      <Link
                        key={c.label}
                        href={c.href}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink-2 transition-colors hover:border-cta hover:bg-cta-soft hover:text-ink"
                      >
                        <Link2 className="size-3 shrink-0" />
                        <span className="truncate">{c.label}</span>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </motion.div>
          ),
        )}

        {thinking ? (
          <div className="flex gap-2.5">
            <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-violet-soft text-violet">
              <Sparkles className="size-3.5" />
            </span>
            <div className="flex items-center gap-1 pt-2">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-ink-3"
                  style={{ animationDelay: `${i * 130}ms` }}
                />
              ))}
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {messages.length === 0 ? (
        <div className={cn("flex flex-wrap gap-1.5", compact ? "px-4 pb-3" : "px-1 pb-3")}>
          {tutorSuggestions[type].slice(0, compact ? 3 : 5).map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink-2 transition-colors hover:border-cta hover:bg-cta-soft hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className={cn("relative shrink-0", compact ? "border-t border-line p-3" : "pt-1")}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about your papers, exams or a topic"
          aria-label="Ask the AI tutor"
          className="h-11 w-full rounded-[var(--radius-md)] border border-line bg-surface pr-11 pl-3.5 text-[13.5px] text-ink placeholder:text-ink-3 focus:border-ink focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={!draft.trim() || thinking}
          className={cn(
            "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[var(--radius-sm)] transition-all",
            compact ? "right-4.5" : "right-1.5",
            draft.trim() && !thinking ? "bg-cta text-cta-ink" : "bg-surface-3 text-ink-3",
          )}
        >
          <ArrowUp className="size-4" strokeWidth={2.4} />
        </button>
      </form>
    </div>
  );
}

const records: Record<TutorStudentType, { label: string; value: string }[]> = {
  graduate: [
    { label: "Current paper", value: "FR · booked Dec 2026" },
    { label: "Reattempt", value: "PM · Dec 2026" },
    { label: "Readiness", value: "FR 64 · PM 58" },
    { label: "Exemptions", value: "BT, MA, FA, LW approved" },
    { label: "EPSM", value: "Complete" },
    { label: "PER", value: "14 of 36 months" },
  ],
  undergraduate: [
    { label: "Current paper", value: "FA · 18 Nov 2026" },
    { label: "In progress", value: "LW · exam Jan 2027" },
    { label: "Readiness", value: "FA 72" },
    { label: "Passed", value: "BT 71% · MA 64%" },
    { label: "Semester", value: "3 · Brightwater" },
    { label: "Attendance", value: "92%" },
  ],
};

/** What the tutor is reading for the signed-in demo learner. */
export function TutorRecord() {
  const { studentType } = useRole();
  const type: TutorStudentType = studentType === "undergraduate" ? "undergraduate" : "graduate";
  return (
    <dl className="border-t border-line px-5 py-1">
      {records[type].map((r) => (
        <div
          key={r.label}
          className="flex items-baseline justify-between gap-4 border-b border-line py-2.5 last:border-0"
        >
          <dt className="text-[12.5px] text-ink-3">{r.label}</dt>
          <dd className="text-right text-[13px] font-medium text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
