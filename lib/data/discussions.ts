import { courseById } from "./courses";

/** One reply on a paper's discussion thread. An assistant draft is never an
 *  answer and never lives in this list: see `DiscussionThread.assistantDraft`. */
export type DiscussionAnswer = {
  id: string;
  authorId: string;
  body: string;
  /** Minutes before the prototype's fixed "now". Labels are derived with
   *  `timeAgo`, so a label and a sort order can never disagree. */
  minutesAgo: number;
  upvotes: number;
  /** Verified by the paper's tutor. At most one per thread. */
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
   *  tutor. Not counted as an answer, and it can never be accepted. */
  assistantDraft?: { body: string; sources: string[] };
};

export const discussionThreads: DiscussionThread[] = [
  {
    id: "t-01",
    courseId: "c-fr",
    authorId: "u-anaya",
    title:
      "Goodwill impairment with NCI at fair value: why does part of it reduce the NCI?",
    body: "In the goodwill workspace the NCI is measured at fair value, and the lesson says a later impairment of that goodwill is split 80:20 between the group and the NCI. In a past question that used the proportionate share method, all of the impairment went to group retained earnings. Why does the method chosen at acquisition decide who bears an impairment years later?",
    tags: ["Goodwill", "NCI", "IAS 36"],
    lesson: "Goodwill and non-controlling interest under IFRS 3",
    minutesAgo: 180,
    views: 38,
    upvotes: 6,
    answers: [],
    assistantDraft: {
      body: "Because the two methods put a different goodwill figure on the statement of financial position. With NCI at fair value, goodwill includes the NCI's share, so an impairment of it is shared in the same proportion as profits: 80% to group retained earnings and 20% to the NCI. With the proportionate share method, the NCI is measured at its share of net assets, so the goodwill recognised is the parent's goodwill only, and any impairment is charged in full to group retained earnings. The choice at acquisition fixes what the goodwill figure represents, which is why it still matters later.",
      sources: [
        "Goodwill and non-controlling interest under IFRS 3",
        "Workspace: calculate goodwill on acquisition",
      ],
    },
  },
  {
    id: "t-02",
    courseId: "c-fr",
    authorId: "u-daniel",
    title:
      "Intra-group sale at a 25% mark-up: which company takes the unrealised profit?",
    body: "Sable sold goods to Pinewood for $400,000 at cost plus 25%, and a quarter of them are still in Pinewood's inventory at the year end. I took 25% of $100,000 as the unrealised profit and deducted it from Pinewood's retained earnings. The model answer differs on both the figure and where it goes.",
    tags: ["Intra-group trading", "Unrealised profit"],
    lesson: "Intra-group trading: unrealised profit and current accounts",
    minutesAgo: 50,
    views: 22,
    upvotes: 3,
    answers: [],
    assistantDraft: {
      body: "Two things change. A 25% mark-up is on cost, so profit is 25/125 of the selling price, not 25% of it. The goods still held are $100,000 at selling price, so the unrealised profit is $100,000 × 25/125 = $20,000. And Sable is the seller, so the profit sits in Sable's results: deduct the $20,000 in Sable's net assets working, which means the NCI bears its 20% share, and reduce group inventory by $20,000. In the consolidated statement of profit or loss, remove the $400,000 from both revenue and cost of sales, and add the $20,000 to cost of sales.",
      sources: [
        "Intra-group trading: unrealised profit and current accounts",
        "Workspace: consolidated statement of financial position",
      ],
    },
  },
  {
    id: "t-03",
    courseId: "c-aa",
    authorId: "u-sofia",
    title:
      "Material uncertainty over going concern: a separate section or an emphasis of matter?",
    body: "A client with a loan due in four months has disclosed a material uncertainty about going concern. My revision notes say the auditor adds an emphasis of matter paragraph, but a past exam answer used a separate section with its own heading. Which is current, and does the opinion change if the disclosure is weak?",
    tags: ["Going concern", "Auditor's report"],
    lesson: "Subsequent events and going concern",
    minutesAgo: 1500,
    views: 17,
    upvotes: 2,
    answers: [],
  },
  {
    id: "t-04",
    courseId: "c-fr",
    authorId: "u-mei",
    title:
      "Fair value uplift on land versus plant: why does only the plant change post-acquisition profit?",
    body: "Both uplifts go into net assets at acquisition in the goodwill working. At the reporting date I adjusted the land uplift the same way as the plant, and lost marks on the subsidiary's post-acquisition retained earnings. What is different about the plant?",
    tags: ["Fair value adjustments", "Consolidation"],
    lesson: "Fair value adjustments and post-acquisition reserves",
    minutesAgo: 3080,
    views: 312,
    upvotes: 24,
    answers: [
      {
        id: "t-04-a1",
        authorId: "u-marcus",
        body: "Depreciation. Land is not depreciated, so its uplift is the same at acquisition and at the reporting date and has no effect on post-acquisition profit. Plant is depreciated, so the group charges extra depreciation on the uplift every year after acquisition. That extra depreciation reduces the subsidiary's post-acquisition retained earnings, which the NCI shares, and the uplift at the reporting date is the original uplift less the extra depreciation to date. In your net assets working, show the land uplift in both columns, and the reduced plant uplift in the reporting date column.",
        minutesAgo: 2900,
        upvotes: 18,
        accepted: true,
      },
      {
        id: "t-04-a2",
        authorId: "u-daniel",
        body: "What fixed it for me was the net assets table with two columns, at acquisition and at the reporting date. The difference between the columns is post-acquisition profit, so the extra depreciation drops out on its own.",
        minutesAgo: 300,
        upvotes: 5,
      },
    ],
  },
  {
    id: "t-05",
    courseId: "c-fm",
    authorId: "u-lena",
    title: "Why does the dividend growth model use the ex div share price?",
    body: "The lesson says to use the ex div price in Ke = D0(1 + g) / P0 + g. My practice question gave a cum div price of $2.70 with a $0.20 dividend about to be paid. I used $2.70 and got a lower cost of equity than the answer. I want to understand why, not just remember the rule.",
    tags: ["Cost of equity", "Dividend growth model"],
    lesson: "Cost of equity: the dividend growth model and CAPM",
    minutesAgo: 8700,
    views: 188,
    upvotes: 15,
    answers: [
      {
        id: "t-05-a1",
        authorId: "u-tomas",
        body: "The model values the dividends a buyer will receive, starting with next year's D0(1 + g). A cum div price also includes the dividend about to be paid, which goes to the current holder and is not part of that future stream. So take it off first: $2.70 − $0.20 = $2.50 ex div. With the cum div price in the denominator the dividend yield looks smaller than it is, which is why your cost of equity came out too low.",
        minutesAgo: 7300,
        upvotes: 14,
        accepted: true,
      },
      {
        id: "t-05-a2",
        authorId: "u-yusuf",
        body: "The check that works for me: if the question says a dividend is about to be paid, or the shares are cum div, take the dividend off the price before doing anything else.",
        minutesAgo: 7250,
        upvotes: 4,
      },
    ],
  },
  {
    id: "t-06",
    courseId: "c-pm",
    authorId: "u-anaya",
    title:
      "Planning and operational variances: which standard do I compare with actual?",
    body: "In my practice question the market price of a material rose after the budget was set. I compared actual with the original standard and called the whole difference operational, but the answer split it in two. How do I decide which part the manager is responsible for?",
    tags: ["Variances", "Planning and operational"],
    lesson: "Planning and operational variances",
    minutesAgo: 6000,
    views: 241,
    upvotes: 19,
    answers: [
      {
        id: "t-06-a1",
        authorId: "u-farah",
        body: "Start by revising the standard to what it should have been, given conditions nobody in the business controlled, such as that market price rise. The difference between the original and the revised standard is the planning variance, and it belongs to whoever set the budget. The difference between the revised standard and actual is the operational variance, and that is the one the manager answers for. Calculate both on the actual quantity, and check that planning plus operational equals the total variance you started with.",
        minutesAgo: 4400,
        upvotes: 16,
        accepted: true,
      },
      {
        id: "t-06-a2",
        authorId: "u-yusuf",
        body: "The question usually tells you why the standard was wrong. If the cause was outside the manager's control, like a market price or a new regulation, it goes in planning.",
        minutesAgo: 1200,
        upvotes: 3,
      },
    ],
  },
  {
    id: "t-07",
    courseId: "c-pm",
    authorId: "u-yusuf",
    title: "A TA ratio below 1: should the company stop making the product?",
    body: "Product Z has a throughput accounting ratio of 0.9. My first answer said stop making it, because it does not cover factory costs. The model answer looked at ways to improve it instead. When is stopping the right call?",
    tags: ["Throughput accounting", "Decision-making"],
    lesson: "Throughput accounting and the TA ratio",
    minutesAgo: 2000,
    views: 97,
    upvotes: 11,
    answers: [
      {
        id: "t-07-a1",
        authorId: "u-farah",
        body: "A ratio below 1 means Z's throughput per bottleneck hour does not cover factory cost per bottleneck hour. But factory costs are fixed in the short term, so dropping Z only helps if its bottleneck hours can go to a product with higher throughput per hour. Rank the products by throughput per bottleneck hour first. Then look at the levers: raise the price, cut material cost, reduce the time Z spends in the bottleneck, or add bottleneck capacity. Stopping is the answer when none of those can lift Z and the hours have a better use.",
        minutesAgo: 540,
        upvotes: 9,
      },
      {
        id: "t-07-a2",
        authorId: "u-mei",
        body: "I also point out that the ratio treats all factory costs as fixed. If some of them would really go when Z stops, that changes the answer.",
        minutesAgo: 130,
        upvotes: 2,
      },
    ],
  },
  {
    id: "t-08",
    courseId: "c-tx",
    authorId: "u-anaya",
    title: "Indexation allowance for companies: why does it stop at December 2017?",
    body: "A company sells a building it bought in 2009. I calculated indexation up to the date of disposal and got a much smaller gain than the answer. Why does indexation stop at December 2017, and can it ever make a loss bigger?",
    tags: ["Chargeable gains", "Corporation tax"],
    lesson: "Chargeable gains for companies and indexation",
    minutesAgo: 20500,
    views: 406,
    upvotes: 31,
    answers: [
      {
        id: "t-08-a1",
        authorId: "u-grace",
        body: "The indexation allowance was frozen from 1 January 2018. For any disposal after that, indexation runs from the month of acquisition to December 2017 only, however much later the sale is. And no, it cannot make a loss bigger: indexation can reduce a gain to nil, but it can never create or increase a capital loss. In your answer, show the indexation factor from acquisition to December 2017, and cap the allowance at the unindexed gain.",
        minutesAgo: 20200,
        upvotes: 27,
        accepted: true,
      },
    ],
  },
  {
    id: "t-09",
    courseId: "c-aa",
    authorId: "u-sofia",
    title: "Why is performance materiality set lower than overall materiality?",
    body: "In the materiality lesson, overall materiality is $250,000 and performance materiality is $187,500. If a misstatement below $250,000 would not change users' decisions, why do we test to a lower figure?",
    tags: ["Materiality", "ISA 320"],
    lesson: "Materiality and performance materiality under ISA 320",
    minutesAgo: 13000,
    views: 159,
    upvotes: 12,
    answers: [
      {
        id: "t-09-a1",
        authorId: "u-hana",
        body: "Because misstatements add up, and some will not be found. If you tested each area to $250,000, several smaller undetected and uncorrected misstatements could together exceed materiality without any one of them looking significant. ISA 320 has you set performance materiality below overall materiality to reduce, to an appropriately low level, the chance that the total of uncorrected and undetected misstatements exceeds materiality. How far below depends on risk: lower for a new client or one with a history of errors, higher where controls are strong.",
        minutesAgo: 12000,
        upvotes: 11,
        accepted: true,
      },
      {
        id: "t-09-a2",
        authorId: "u-ravi",
        body: "My audit manager put it simply: materiality is for the financial statements as a whole, performance materiality is for the work on each area.",
        minutesAgo: 8800,
        upvotes: 3,
      },
    ],
  },
  {
    id: "t-10",
    courseId: "c-fa",
    authorId: "u-rohan",
    title: "Does every error in the trial balance go through the suspense account?",
    body: "I corrected four errors in the suspense account question and put all of them through suspense. Two were marked wrong. How do I tell which corrections touch the suspense account?",
    tags: ["Suspense accounts", "Errors"],
    lesson: "Correction of errors and suspense accounts",
    minutesAgo: 7400,
    views: 133,
    upvotes: 9,
    answers: [
      {
        id: "t-10-a1",
        authorId: "u-mei",
        body: "I ask one question for each error: did it make the debits and credits different? If not, the suspense account never saw it. An invoice left out of the books entirely did not.",
        minutesAgo: 6500,
        upvotes: 4,
      },
      {
        id: "t-10-a2",
        authorId: "u-grace",
        body: "Only errors that made the trial balance disagree go through suspense. A one-sided entry, or a debit and credit of different amounts, created the suspense balance, so its correction clears it. Errors of omission, commission, principle, original entry and complete reversal leave debits equal to credits, so they are corrected between the accounts involved and never touch suspense. After your journals, the suspense account should be nil.",
        minutesAgo: 4600,
        upvotes: 8,
        accepted: true,
      },
    ],
  },
  {
    id: "t-11",
    courseId: "c-cbe",
    authorId: "u-sofia",
    title:
      "Spreadsheet response area: do I lose marks for typing numbers instead of formulas?",
    body: "In the CBE walkthrough I typed my calculated figures straight into the spreadsheet response area because it felt faster. If one figure is wrong, can the marker still give method marks, or do I need formulas in every cell?",
    tags: ["CBE", "Workings"],
    lesson: "Using the spreadsheet and word processing response areas",
    minutesAgo: 720,
    views: 41,
    upvotes: 4,
    answers: [
      {
        id: "t-11-a1",
        authorId: "u-daniel",
        body: "The feedback on my mock said formulas let the marker follow the method, so a wrong input still earned the later marks. I now use formulas for anything with more than one step and type simple figures directly. I'd like Marcus to confirm that is how the real exam is marked.",
        minutesAgo: 430,
        upvotes: 2,
      },
    ],
  },
  {
    id: "t-12",
    courseId: "c-epsm",
    authorId: "u-mei",
    title:
      "Does completing the Ethics and Professional Skills Module count towards my PER?",
    body: "I work as an accounts payable analyst and I am close to finishing the ethics module. A colleague told me that completing it counts as one of the performance objectives for the practical experience requirement. Is that right, or are they separate?",
    tags: ["EPSM", "PER"],
    lesson: "The fundamental principles of the ACCA Code of Ethics and Conduct",
    minutesAgo: 31000,
    views: 520,
    upvotes: 27,
    answers: [
      {
        id: "t-12-a1",
        authorId: "u-vikram",
        body: "They are separate requirements, and you need both for membership. The module does not count as experience or as a performance objective. PER needs 36 months of relevant work experience and 9 performance objectives, all 5 essential and 4 technical, signed off by your practical experience supervisor. The module does help: its content lines up closely with the essential objective on ethics and professionalism, so record real examples from your work while it is fresh. I have added a note to the lesson so the next group does not get the same advice.",
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

/** The paper's own tutor, not anyone whose role is instructor: Tomas teaches
 *  FM, so his reply on an FR thread would count as a peer answer. */
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

/** Lowercase keywords with a crude stem, so "variances" meets "variance" and
 *  "consolidating" meets "consolidation" without a stemming library. */
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
