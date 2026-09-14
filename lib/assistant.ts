import type { ChatMessage } from "./data";

export type Reply = Omit<ChatMessage, "id" | "at">;

type Rule = { match: RegExp; reply: Reply };

/* A scripted AI tutor. Every answer is grounded in the mock data elsewhere in
   /lib/data (Anaya's papers, deadlines, readiness and the FR goodwill
   workspace), which is what makes the prototype feel like it knows the learner
   rather than like a chat box glued onto a dashboard. Rules are checked in
   order, so the narrower ones come first. */
const rules: Rule[] = [
  {
    match: /\b(entry|enter|entered|sitting|exam session|exam date)\b/i,
    reply: {
      from: "bot",
      action: "checked the December 2026 exam calendar and your bookings",
      text: "December 2026 exam entry: **early** entry closes 5 October, **standard** entry closes 2 November and **late** entry closes 16 November. Exams run 7 to 10 December, and results are released on 25 January 2027.\n\nYour FR exam is booked. Your PM reattempt is not entered yet, and entering by 5 October keeps you on the early entry fee. You enter on myACCA, not here: once you have, add the booking on Exams & results so your mentor and the programme team can see it.",
      citations: [
        { label: "Exams & results", href: "/exams" },
        { label: "ACCA journey", href: "/journey" },
      ],
    },
  },
  {
    match: /(due|deadline|this week|overdue)/i,
    reply: {
      from: "bot",
      action: "checked your deadlines across 2 papers in progress",
      text: "Three things need you this week.\n\n**Wednesday 19:00 IST**: mentor session with Aisha Khan on your PM reattempt plan.\n**Saturday 10:00 IST**: Live class: group accounts exam technique, FR weekend batch.\n**Sunday 20 September**: Group accounts test, 45 minutes, 2 attempts, pass mark 50%.\n\nFurther out, early entry for the December exams closes on 5 October and your PM reattempt is not entered yet. The live class is the only one you cannot move. Want me to block 90 minutes on Friday evening to prepare for the test?",
      citations: [
        { label: "Group accounts test", href: "/assessments/a-fr-groups" },
        { label: "Financial Reporting (FR)", href: "/learn/financial-reporting-fr" },
      ],
    },
  },
  {
    match: /(on track|progress|readiness|\bready\b|december|chance)/i,
    reply: {
      from: "bot",
      action: "compared your readiness scores with the December 2026 session",
      text: "You are on track for FR and at risk on PM.\n\n**FR · December 2026**: readiness 64, paper 62% complete, exam booked. The gap is group accounts, and your consolidation workings are the next step.\n**PM reattempt · December 2026**: readiness 58, paper 34% complete, not yet entered. You scored 46% in June, and your practice results point to decision-making techniques as the weakest area.\n\nLearners here usually sit their final mock with a readiness score of 70 or more. At your recent pace of about 10 hours a week, FR gets there by mid-November. PM needs roughly 3 more hours a week to do the same.",
      citations: [
        { label: "Readiness", href: "/readiness" },
        { label: "Performance Management (PM)", href: "/learn/performance-management-pm" },
      ],
    },
  },
  {
    match: /(goodwill|\bnci\b|non-controlling|consolidat|group accounts|subsidiar)/i,
    reply: {
      from: "bot",
      action: "answered from Financial Reporting (FR), module 3",
      text: "Goodwill is what the parent paid for the subsidiary, plus the non-controlling interest, minus the fair value of the subsidiary's net assets at acquisition.\n\nIn the module 3 workspace, consideration is **$5,200k** (cash $3,000k plus 1,000k shares at $2.20), NCI at fair value is **$1,100k**, and net assets at acquisition are **$4,800k** (share capital $1,000k, retained earnings $3,300k and the $500k fair value uplift on land). Goodwill is 5,200 + 1,100 − 4,800 = **$1,500k**.\n\nThe common slip is leaving out the fair value uplift, which overstates goodwill by $500k. Measuring NCI at fair value also means a later goodwill impairment is shared with the NCI, 80:20.",
      citations: [
        { label: "Module 3 · Group accounts", href: "/learn/financial-reporting-fr" },
        { label: "Workspace: calculate goodwill on acquisition", href: "/learn/financial-reporting-fr" },
      ],
    },
  },
  {
    match: /(certificate|certification|certif)/i,
    reply: {
      from: "bot",
      action: "checked certificate criteria on your 5 papers and courses",
      text: "You hold 2 course certificates here: **Taxation (TX-UK)** and the **Ethics and Professional Skills Module (EPSM)**. One is in progress: **ACCA Exam Technique and CBE Practice** is 45% complete, and its certificate issues when you finish the lessons and pass the timed CBE mock.\n\nCertificates on this platform record your study with ZSkillup. Your ACCA exam passes and exemptions are recorded by ACCA on myACCA.",
      citations: [{ label: "Certificates", href: "/certificates" }],
    },
  },
  {
    match: /(submit|upload|hand in|assignment|workings)/i,
    reply: {
      from: "bot",
      action: "looked up your progress in Financial Reporting (FR)",
      text: "Both workspace lessons in FR module 3 are complete, so **Assignment: submit your consolidation workings** is open now. It is the lesson you are on.\n\nUpload your spreadsheet, or a PDF of your workings, from that lesson. Marcus Bell marks it within five working days, and the feedback feeds your FR readiness score before the Group accounts test on 20 September.",
      citations: [
        { label: "Financial Reporting (FR) · Module 3", href: "/learn/financial-reporting-fr" },
      ],
    },
  },
  {
    match: /(book|schedule|calendar|remind)/i,
    reply: {
      from: "bot",
      action: "booked 1 mock exam slot and 1 calendar hold",
      text: "Booked. **FR mock exam · Dec 2026** on Saturday 21 November, 10:00 to 13:00 IST, timed and proctored like the real session CBE. I have also kept Friday evening before it free of study blocks.\n\nThat leaves two weeks to act on the result before exams start on 7 December. If the slot moves, reply here and I will find the next free window rather than dropping it.",
      citations: [{ label: "FR mock exam · Dec 2026", href: "/assessments/a-fr-mock" }],
    },
  },
  {
    match: /(whatsapp|phone|call|sms|text me)/i,
    reply: {
      from: "bot",
      action: "checked your channel preferences",
      text: "You are opted in on WhatsApp at +91 98••• ••432 and opted out of voice. On WhatsApp you get live class reminders, mock exam reminders, exam entry deadlines and marks, and nothing else: no marketing templates.\n\nI can switch reminders to voice, or turn a channel off entirely. Voice calls only go out between 09:00 and 18:00 on weekdays, and the agent says it is automated in its first sentence.",
      citations: [{ label: "Notifications", href: "/notifications" }],
    },
  },
  {
    match: /(exemption|exempt|registration|registered|subscription|acca id|student id|\bper\b|epsm)/i,
    reply: {
      from: "bot",
      action: "checked your ACCA record",
      text: "**Registered** with ACCA on 12 February 2025, ACCA ID 4382917. **Annual subscription** paid, next due 1 January 2027.\n\n**Exemptions**: BT, MA, FA and LW, estimated in January 2025 and confirmed by ACCA in March 2025, with exemption fees paid. **EPSM** is complete. **PER** stands at 14 of 36 months, with 3 of 9 performance objectives signed off.",
      citations: [{ label: "ACCA journey", href: "/journey" }],
    },
  },
  {
    match: /(variance|standard cost|budget|planning and operational)/i,
    reply: {
      from: "bot",
      action: "answered from Performance Management (PM), module 3",
      text: "Split a variance before you judge anyone. Revise the standard to what it should have been, given conditions nobody controlled: the difference between the original and the revised standard is the **planning variance**, and it belongs to whoever set the budget. The difference between the revised standard and actual is the **operational variance**, the one a manager answers for.\n\nIn Section C, check that planning plus operational equals the total variance, then explain the links between variances. Cheaper material often shows up later as a poorer yield or an adverse labour efficiency variance.",
      citations: [
        { label: "Module 3 · Budgeting and control", href: "/learn/performance-management-pm" },
      ],
    },
  },
  {
    match: /(npv|irr|wacc|cost of capital|cost of equity|capm|dividend growth)/i,
    reply: {
      from: "bot",
      action: "answered from Financial Management (FM), module 3",
      text: "FM gives you two routes to the cost of equity. The **dividend growth model** is Ke = D0(1 + g) / P0 + g, using the ex div share price. **CAPM** is Rf + β(Rm − Rf), where the bracket is the market risk premium, not the market return.\n\nFor the **WACC**, weight each source by market value, and use the after-tax cost of debt, because interest is tax deductible. Then use the WACC to discount a project only if the project does not change the company's business risk or gearing.",
      citations: [
        { label: "Module 3 · Business finance and cost of capital", href: "/learn/financial-management-fm" },
      ],
    },
  },
];

const fallback: Reply = {
  from: "bot",
  text: "I can answer from your papers, deadlines, exam entries, readiness scores and study material, and I can act on the platform: book a mock exam, block study time, or raise a support ticket.\n\nWhat I will not do is guess at marks, attempt limits, exemptions or fees. Those go to a person every time.",
};

export function answer(question: string): Reply {
  const hit = rules.find((r) => r.match.test(question));
  return hit ? hit.reply : fallback;
}

export function now() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}
