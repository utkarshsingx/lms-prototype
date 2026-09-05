import type { ChatMessage } from "./data";

export type Reply = Omit<ChatMessage, "id" | "at">;

type Rule = { match: RegExp; reply: Reply };

/* A scripted assistant. Every answer is grounded in the mock data elsewhere in
   /lib/data, which is what makes the prototype feel like it knows the learner
   rather than like a chat box glued onto a dashboard. */
const rules: Rule[] = [
  {
    match: /(due|deadline|this week|overdue)/i,
    reply: {
      from: "bot",
      action: "checked your deadlines across 4 enrolments",
      text: "Three things need you this week.\n\n**Tomorrow 16:00 IST** — Incident walkthrough, live, Distributed Systems.\n**In 9 days** — Consensus and replication, graded exam, 45 minutes, 2 attempts.\n**31 October** — Privacy certification, the last outstanding compliance item on your record.\n\nThe live session is the only one you cannot move. Want me to block 90 minutes for exam prep on Thursday?",
      citations: [
        { label: "Assessments", href: "/assessments" },
        { label: "Distributed Systems in Practice", href: "/learn/distributed-systems-in-practice" },
      ],
    },
  },
  {
    match: /(l4|promotion|on track|progress|career|path)/i,
    reply: {
      from: "bot",
      action: "compared your record against Backend Engineer, L3 → L4",
      text: "You are 2 of 5 steps through the path and roughly on pace.\n\nDone: Kubernetes for Application Teams, Cloud Cost Engineering.\nIn flight: Distributed Systems in Practice at 62%, gated on the log-replication lab.\nNot started: Security Foundations (6h) and Writing for Engineers, which needs a staff-reviewed RFC.\n\nAt your recent pace of 2.4 hours a week that is about nine weeks. The cycle closes in eleven, so the margin is real but thin — the RFC review is the piece that usually slips.",
      citations: [{ label: "Backend Engineer, L3 → L4", href: "/paths/backend-engineer-l3-to-l4" }],
    },
  },
  {
    match: /(quorum|consensus|raft|partition|replica)/i,
    reply: {
      from: "bot",
      action: "answered from Distributed Systems in Practice, module 3",
      text: "Quorum sizing is one inequality: any two quorums must overlap, so `R + W > N`.\n\nWith N=5, W=3 and R=3 every read set shares at least one node with the last write set, which is what gives you read-your-writes. Dropping to W=2 makes writes cheaper and quietly gives up that guarantee — the failure only shows up under a partition, which is why it survives code review.\n\nThe operational corollary: a 5-node cluster tolerates 2 failures, not 3. Sizing for \"three nines of nodes\" and then running with 2 healthy is how split-brain incidents start.",
      citations: [
        { label: "Module 3 · Consensus you can implement", href: "/learn/distributed-systems-in-practice" },
        { label: "Reference: quorum sizing cheat sheet", href: "/learn/distributed-systems-in-practice" },
      ],
    },
  },
  {
    match: /(certificate|certification|certif)/i,
    reply: {
      from: "bot",
      action: "checked certificate criteria on 3 completed courses",
      text: "You hold 7 certificates. One is pending: **Analytics Engineering With SQL** has all lessons complete, but the certificate also requires a pass on *Submit a tested model*, which is still with an instructor.\n\nCertificates issue within an hour of the grade landing. I have flagged that submission as certificate-blocking so it moves to the front of the grading queue.",
      citations: [{ label: "Profile and certificates", href: "/profile" }],
    },
  },
  {
    match: /(submit|upload|hand in|assignment)/i,
    reply: {
      from: "bot",
      action: "looked up your enrolment state",
      text: "The capstone upload in Distributed Systems unlocks once both module 3 labs are complete. Leader election is done; log replication is still in progress, which is why you cannot see the button.\n\nFinish that lab and **Assignment: submit your replicated store** appears in the same module. It is due 28 September and the median submission in your cohort lands four days early.",
      citations: [{ label: "Capstone: replicated store design review", href: "/assessments/a-dist-capstone" }],
    },
  },
  {
    match: /(book|schedule|calendar|remind)/i,
    reply: {
      from: "bot",
      action: "created 2 calendar holds and 1 reminder",
      text: "Booked. Thursday 09:30–11:00 and Friday 14:00–15:30 for exam prep, both in your working hours and clear of your existing meetings. I will send the exam link fifteen minutes before the first block.\n\nIf either slot moves, reply here and I will find the next free window rather than dropping the block.",
    },
  },
  {
    match: /(whatsapp|phone|call|sms|text me)/i,
    reply: {
      from: "bot",
      action: "checked your channel preferences",
      text: "You are opted in on WhatsApp at +91 98••• ••432 and opted out of voice. On WhatsApp you currently get deadline reminders and grade notifications, and nothing else — no marketing templates.\n\nI can switch reminders to voice, or turn a channel off entirely. Voice calls only ever go out inside 09:00–18:00 in your own timezone, and the agent identifies itself as automated in its first sentence.",
      citations: [{ label: "Channel settings", href: "/settings" }],
    },
  },
  {
    match: /(privacy|gdpr|compliance|security training)/i,
    reply: {
      from: "bot",
      action: "checked compliance record",
      text: "One item outstanding: **Privacy certification 2026**, due 31 October, 25 minutes, three attempts, pass mark 80.\n\nSecurity Foundations is already certified — you scored 93 on 28 August and it is valid for twelve months. Your course progress on the privacy course sits at 45%, so the remaining reading is about 40 minutes before the exam itself.",
      citations: [{ label: "Privacy certification 2026", href: "/assessments/a-privacy-final" }],
    },
  },
  {
    match: /(eval|rag|retrieval|llm|prompt|model)/i,
    reply: {
      from: "bot",
      action: "answered from Building With Large Language Models, module 3",
      text: "The rule from module 3 is that the eval suite comes before the feature, because a suite written afterwards encodes the behaviour you happen to have rather than the behaviour you want.\n\nThe practical minimum is a golden set of 50+ cases drawn from real traffic, at least one metric that maps to a user-visible failure, and a gate in CI that blocks merge. LLM-as-judge is fine for fluency and grounding, but measure the judge against human labels before trusting it — an unmeasured judge flatters the system that produced it.",
      citations: [{ label: "Module 3 · Evaluation before features", href: "/learn/building-with-large-language-models" }],
    },
  },
];

const fallback: Reply = {
  from: "bot",
  text: "I can answer from your enrolments, deadlines, path progress and course content, and I can act on the platform — enrol you, book study time, or open a ticket.\n\nWhat I will not do is guess at grades or attempt limits. Those go to a human every time.",
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
