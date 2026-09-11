import { courseById } from "./courses";

/** One reply on a course discussion thread. An assistant draft is never an
 *  answer and never lives in this list: see `DiscussionThread.assistantDraft`. */
export type DiscussionAnswer = {
  id: string;
  authorId: string;
  body: string;
  /** Minutes before the prototype's fixed "now". Labels are derived with
   *  `timeAgo`, so a label and a sort order can never disagree. */
  minutesAgo: number;
  upvotes: number;
  /** Verified by the course instructor. At most one per thread. */
  accepted?: boolean;
};

export type DiscussionThread = {
  id: string;
  courseId: string;
  authorId: string;
  title: string;
  body: string;
  tags: string[];
  /** The lesson the question was asked from, when there is one. */
  lesson?: string;
  minutesAgo: number;
  views: number;
  upvotes: number;
  answers: DiscussionAnswer[];
  /** Written by the assistant on an unanswered thread and held for the
   *  instructor. Not counted as an answer, and it can never be accepted. */
  assistantDraft?: { body: string; sources: string[] };
};

export const discussionThreads: DiscussionThread[] = [
  {
    id: "t-01",
    courseId: "c-privacy",
    authorId: "u-anaya",
    title:
      "Is legitimate interest enough for product analytics, or do we need consent?",
    body: "We are adding event tracking to the onboarding flow: page views, button clicks and time on each step, tied to a pseudonymous user id. The lesson on lawful bases makes legitimate interest sound right for this, but our cookie banner already asks for consent to analytics. If someone declines the banner, can we still send these events under legitimate interest, or does declining win?",
    tags: ["Lawful basis", "Analytics", "Consent"],
    lesson: "Scenario: choosing a basis for a new feature",
    minutesAgo: 180,
    views: 38,
    upvotes: 6,
    answers: [],
    assistantDraft: {
      body: "Two separate rules are in play, and the lesson covers only one of them. GDPR asks for a lawful basis, and legitimate interest can work for first-party product analytics if you run and record a legitimate interests assessment and honour objections. The cookie rules are separate: storing or reading an identifier on the device for analytics needs consent unless it is strictly necessary. So if these events depend on a cookie or a local storage id, a declined banner should stop them. Events logged server-side with nothing stored on the device are a different case, and one to take to the privacy team with the DPIA template.",
      sources: [
        "The six lawful bases",
        "Scenario: choosing a basis for a new feature",
        "Reference: DPIA template",
      ],
    },
  },
  {
    id: "t-02",
    courseId: "c-dist",
    authorId: "u-arjun",
    title:
      "Removing the current leader in a membership change: does its own vote count toward the new majority?",
    body: "In a five-node test cluster I am removing node 1, which is the leader. During joint consensus it keeps replicating entries for C_old,new. Does its own acknowledgement count toward the C_new majority when node 1 is not in C_new? My implementation counts it, and I think that is why a later test commits an entry that only two of the four remaining nodes have.",
    tags: ["Raft", "Membership changes"],
    lesson: "Membership changes without losing the cluster",
    minutesAgo: 50,
    views: 22,
    upvotes: 3,
    answers: [],
    assistantDraft: {
      body: "It should not count. A leader that is not part of C_new keeps managing the cluster until C_new is committed, but it leaves itself out when counting the C_new majority, and it steps down once C_new commits. Counting its own acknowledgement lets an entry commit with two of the four new members, which matches the failure you describe. Check the function that advances the commit index: it should count matches separately within each configuration.",
      sources: [
        "Membership changes without losing the cluster",
        "Log replication and the commit index",
      ],
    },
  },
  {
    id: "t-03",
    courseId: "c-comms",
    authorId: "u-lena",
    title: "One incident report or two, when a regulator will also read it?",
    body: "The structure lesson says to write for the reader, not the author. For a data incident we have two readers with opposite needs. Engineers want the timeline and the contributing causes. The regulator wants scope, impact and what we notified, with no speculation. Is the answer two documents from one set of facts, or one document with a regulator summary on top?",
    tags: ["Incident reports", "Audience"],
    lesson: "The four documents engineers actually write",
    minutesAgo: 1500,
    views: 17,
    upvotes: 2,
    answers: [],
  },
  {
    id: "t-04",
    courseId: "c-dist",
    authorId: "u-daniel",
    title:
      "Why does randomising the election timeout fix split votes, and how wide should the range be?",
    body: "I get that two followers timing out together can split the vote. What I do not get is how to pick the range. The paper uses 150 to 300 ms, but our nodes sit in two regions with about 70 ms between them. Do I shift the whole range up, widen it, or both?",
    tags: ["Raft", "Leader election"],
    lesson: "Leader election, terms and the split-vote problem",
    minutesAgo: 3080,
    views: 312,
    upvotes: 24,
    answers: [
      {
        id: "t-04-a1",
        authorId: "u-marcus",
        body: "Both, for different reasons. The floor has to sit well above your broadcast time, or healthy followers start elections during ordinary jitter, and with 70 ms round trips a 150 ms floor is too tight. The width is what prevents split votes: you want the gap between the first and second timeout to usually be longer than one round of RequestVote, so the first candidate collects its votes before anyone else wakes up. Start around 500 to 1000 ms for your topology, then watch elections per hour from module 5 rather than guessing.",
        minutesAgo: 2900,
        upvotes: 18,
        accepted: true,
      },
      {
        id: "t-04-a2",
        authorId: "u-arjun",
        body: "We hit this in the lab. With 150 to 300 ms across two regions we saw three or four elections in a row after every leader restart. Moving to 600 to 1200 ms made it one election almost every time.",
        minutesAgo: 300,
        upvotes: 5,
      },
    ],
  },
  {
    id: "t-05",
    courseId: "c-dist",
    authorId: "u-grace",
    title: "Is there ever a good reason to run a four-node cluster?",
    body: "My team wants four nodes, two in each availability zone, because it feels symmetrical. The quorum sizing cheat sheet says odd numbers only. I want to explain why in a way that lands with people who have not taken the course.",
    tags: ["Quorums", "Availability"],
    lesson: "Reference: quorum sizing cheat sheet",
    minutesAgo: 8700,
    views: 188,
    upvotes: 15,
    answers: [
      {
        id: "t-05-a1",
        authorId: "u-marcus",
        body: "Four nodes need three for a majority, so they survive one failure. Three nodes also survive one failure. You pay for a fourth replica and get slower commits in return. The two-zone layout is worse than it looks: lose a zone and you have two of four, no majority, and the cluster stops accepting writes. Three zones with one node each survives a zone. If you only have two zones, put a lightweight voting member in a third location.",
        minutesAgo: 7300,
        upvotes: 14,
        accepted: true,
      },
      {
        id: "t-05-a2",
        authorId: "u-daniel",
        body: "The line that worked on my team: an even node adds cost, not tolerance. Five is the first size that survives two failures.",
        minutesAgo: 7250,
        upvotes: 4,
      },
    ],
  },
  {
    id: "t-06",
    courseId: "c-llm",
    authorId: "u-anaya",
    title:
      "Smaller chunks raised recall@5, but the answers got worse. What am I measuring wrong?",
    body: "In the retrieval lab I went from 800-token chunks to 200. Recall@5 on my golden set rose from 0.71 to 0.86, but faithfulness dropped and the bot started answering with half a procedure. The metric and the product seem to be pointing in opposite directions.",
    tags: ["RAG", "Chunking", "Evaluation"],
    lesson: "Chunking strategies and the boundary problem",
    minutesAgo: 6000,
    views: 241,
    upvotes: 19,
    answers: [
      {
        id: "t-06-a1",
        authorId: "u-tomas",
        body: "Your recall label is at chunk level, so smaller chunks are easier to hit and the metric rewards them. The generator needs the whole procedure, not the sentence that matched. Keep small chunks for retrieval, return the parent section to the model, and score recall against the section that contains the answer. Measure faithfulness on the same golden set, so a gain in one and a loss in the other show up in the same report.",
        minutesAgo: 4400,
        upvotes: 16,
        accepted: true,
      },
      {
        id: "t-06-a2",
        authorId: "u-daniel",
        body: "Same thing happened on our runbook bot. Retrieving 200-token chunks and expanding to the parent heading fixed the half-procedure answers without giving the recall back.",
        minutesAgo: 1200,
        upvotes: 3,
      },
    ],
  },
  {
    id: "t-07",
    courseId: "c-llm",
    authorId: "u-sofia",
    title:
      "Our LLM judge keeps preferring the longer reply. How do we correct for that?",
    body: "We grade support bot replies with a judge prompt on a 1 to 5 scale. Compared with our team leads' scores, the judge rated long replies higher even when the short one fixed the problem. We cannot have a person score every reply. What is the cheapest correction that actually works?",
    tags: ["Evaluation", "LLM-as-judge"],
    lesson: "LLM-as-judge: when it works and when it flatters",
    minutesAgo: 2000,
    views: 97,
    upvotes: 11,
    answers: [
      {
        id: "t-07-a1",
        authorId: "u-tomas",
        body: "Three changes, cheapest first. Replace the 1 to 5 score with a pairwise comparison, and run each pair twice with the order swapped to cancel position bias. Put resolution in the rubric as a yes or no question the judge answers before it compares anything else. Then keep 100 replies scored by your team leads and report agreement with them on every prompt change. If agreement drops, the judge changed, not the bot.",
        minutesAgo: 540,
        upvotes: 9,
      },
      {
        id: "t-07-a2",
        authorId: "u-mei",
        body: "We also give the judge each reply's length in tokens and ask it to justify any preference for the longer one. It cut the bias a lot, though not to zero.",
        minutesAgo: 130,
        upvotes: 2,
      },
    ],
  },
  {
    id: "t-08",
    courseId: "c-sec",
    authorId: "u-arjun",
    title:
      "Is `if profile and profile.org_id != org_id: deny` the fail-open shape from the lesson?",
    body: "I found this in a permission check during review. It reads as correct to me, but the lesson on fail-open authorisation has me doubting it. What happens when the profile lookup returns nothing?",
    tags: ["Authorisation", "Code review"],
    lesson: "Fail-open authorisation: the shape to grep for",
    minutesAgo: 20500,
    views: 406,
    upvotes: 31,
    answers: [
      {
        id: "t-08-a1",
        authorId: "u-marcus",
        body: "Yes, that is exactly the shape. When the lookup returns nothing, `profile` is empty, the whole condition is false, and the request falls through to allow. A missing profile is also the case an attacker can most easily arrange. Invert it so access is denied unless it is positively established: `if not profile or profile.org_id != org_id: deny`. Better still, make the lookup raise, so nobody can write the condition the wrong way round again.",
        minutesAgo: 20200,
        upvotes: 27,
        accepted: true,
      },
    ],
  },
  {
    id: "t-09",
    courseId: "c-data",
    authorId: "u-yusuf",
    title:
      "SCD type 2: is the grain of dim_customer one row per customer, or one per change?",
    body: "We track plan changes on customers. With type 2 I get several rows per customer, and now the revenue dashboard double counts whenever someone joins facts on customer_id. Is the dimension grain wrong, or is the join wrong?",
    tags: ["Modelling", "SCD", "Grain"],
    lesson: "Slowly changing dimensions, types 1 through 4",
    minutesAgo: 13000,
    views: 159,
    upvotes: 12,
    answers: [
      {
        id: "t-09-a1",
        authorId: "u-tomas",
        body: "The join is wrong, and the grain is fine once you name it. A type 2 dimension is one row per customer per version, with a surrogate key, valid_from and valid_to. The fact table should store the surrogate key of the version that was current when the event happened, captured at load time. Joining on the natural customer_id matches every version, which is your double count. Add a dim_customer_current view for the people who only ever want today's attributes.",
        minutesAgo: 12000,
        upvotes: 11,
        accepted: true,
      },
      {
        id: "t-09-a2",
        authorId: "u-mei",
        body: "The current view fixed our reporting too. Most dashboard questions only wanted today's plan, and the double counting stopped the day we pointed them at it.",
        minutesAgo: 8800,
        upvotes: 3,
      },
    ],
  },
  {
    id: "t-10",
    courseId: "c-design",
    authorId: "u-mei",
    title:
      "When does a component token earn its place over an alias to a semantic token?",
    body: "Our button has `button-primary-bg` pointing straight at `color-brand`, and it never differs in any theme. The token tiers lesson says component tokens can be a smell, but deleting them feels like it will hurt the day we need one.",
    tags: ["Tokens", "Theming"],
    lesson: "Component tokens and when they are a smell",
    minutesAgo: 7400,
    views: 133,
    upvotes: 9,
    answers: [
      {
        id: "t-10-a1",
        authorId: "u-anaya",
        body: "We removed ours in the dashboard rebuild. Forty component tokens turned out to be aliases, and deleting them made the theme files readable again. We added back two, both for components that really did differ in dark mode.",
        minutesAgo: 6500,
        upvotes: 4,
      },
      {
        id: "t-10-a2",
        authorId: "u-hana",
        body: "A component token earns its place when at least one theme gives it a different value from its semantic parent. Until then it is a rename with no decision behind it, and every rename is one more place for a theme to drift. Delete the aliases and add a component token on the day a theme needs one. That is a one-line change, not a migration.",
        minutesAgo: 4600,
        upvotes: 8,
        accepted: true,
      },
    ],
  },
  {
    id: "t-11",
    courseId: "c-a11y",
    authorId: "u-daniel",
    title:
      "Where should focus go when a modal closes and its trigger no longer exists?",
    body: "Our delete dialog removes the row that opened it. The lab says to return focus to the trigger on close, but the trigger is gone by then, so focus falls back to the body and a screen reader starts again from the top of the page.",
    tags: ["Focus management", "WCAG"],
    lesson: "Focus order, focus traps and focus visible",
    minutesAgo: 720,
    views: 41,
    upvotes: 4,
    answers: [
      {
        id: "t-11-a1",
        authorId: "u-mei",
        body: "We move focus to the next row, or to the table heading when the deleted row was the last one, and announce the deletion in a polite live region. Our screen reader testers found that the least surprising option, but I would like Hana to confirm it.",
        minutesAgo: 430,
        upvotes: 2,
      },
    ],
  },
  {
    id: "t-12",
    courseId: "c-onboard",
    authorId: "u-sofia",
    title:
      "The change process lesson says two reviewers, but the repo only asks for one. Which is the rule?",
    body: "I am shipping my first change for the assignment, a copy fix in the help centre. The lesson says every change needs two approvals, but my pull request merged with one. Did I skip a step, or is the lesson out of date?",
    tags: ["Change process", "Code review"],
    lesson: "The change process end to end",
    minutesAgo: 31000,
    views: 520,
    upvotes: 27,
    answers: [
      {
        id: "t-12-a1",
        authorId: "u-priya",
        body: "The lesson is right about production code and out of date for content. Changes to services need two approvals, and branch protection enforces it. Help centre copy moved to a one-approval rule in July, and the repo matches that. I have updated the lesson so the next cohort does not trip over the same thing. Thank you for asking in the open.",
        minutesAgo: 30700,
        upvotes: 22,
        accepted: true,
      },
    ],
  },
];

/** Deterministic relative time. Never call Date.now() for these labels:
 *  the server and the client would render different strings. */
export function timeAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  const unit = (n: number, word: string) =>
    `${n} ${word}${n === 1 ? "" : "s"} ago`;
  if (minutes < 60) return unit(minutes, "minute");
  if (minutes < 1440) return unit(Math.floor(minutes / 60), "hour");
  if (minutes < 10080) return unit(Math.floor(minutes / 1440), "day");
  return unit(Math.floor(minutes / 10080), "week");
}

/** The course's own instructor, not anyone whose role is instructor: Grace
 *  is a learner in the directory but teaches Writing for Engineers. */
export const isCourseInstructor = (personId: string, courseId: string) =>
  courseById(courseId)?.instructorId === personId;

/** Minutes since the question or its latest answer, whichever is newer. */
export const lastActivityMinutes = (t: DiscussionThread) =>
  Math.min(t.minutesAgo, ...t.answers.map((a) => a.minutesAgo));

export const hasAcceptedAnswer = (t: DiscussionThread) =>
  t.answers.some((a) => a.accepted);

export type ThreadStatus = "instructor" | "peer" | "unanswered";

/** An assistant draft does not change the status: a thread with only a
 *  draft is still unanswered. */
export function threadStatus(t: DiscussionThread): ThreadStatus {
  if (t.answers.length === 0) return "unanswered";
  return t.answers.some((a) => isCourseInstructor(a.authorId, t.courseId))
    ? "instructor"
    : "peer";
}

const STOPWORDS = new Set(
  (
    // Forum words: every thread is a question with answers, so these match everything.
    "answer answers question questions toward towards " +
    "about after all also and any are because been before being but can cannot could did does doing " +
    "each enough for from get gets got had has have here how into its just like make more most much " +
    "need needs not now one only other our out over same should some still than that the their them " +
    "then there these they this those under use used using very was way were what when where which " +
    "while who why will with without work works would you your"
  ).split(" "),
);

/** Lowercase keywords with a crude stem, so "chunks" meets "chunking" and
 *  "votes" meets "vote" without a stemming library. */
function keywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9@]+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    .map((w) => (w.length > 4 && /[^siu]s$/.test(w) ? w.slice(0, -1) : w))
    .map((w) => w.slice(0, 5));
  return Array.from(new Set(words));
}

/** Existing threads whose titles share keywords with a draft title. Only
 *  matches at least half as strong as the best one are kept, so one shared
 *  word does not surface an unrelated thread next to a close match. */
export function similarThreads(
  title: string,
  threads: DiscussionThread[],
  limit = 3,
): DiscussionThread[] {
  const wanted = keywords(title);
  if (wanted.length === 0) return [];
  const scored = threads
    .map((t) => {
      const have = new Set(keywords(t.title));
      return { t, score: wanted.filter((w) => have.has(w)).length };
    })
    .filter((s) => s.score > 0);
  if (scored.length === 0) return [];
  const best = Math.max(...scored.map((s) => s.score));
  return scored
    .filter((s) => s.score >= Math.ceil(best / 2))
    .sort((a, b) => b.score - a.score || b.t.upvotes - a.t.upvotes)
    .slice(0, limit)
    .map((s) => s.t);
}
