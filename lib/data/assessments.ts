import type { Assessment, Rubric, Submission } from "./types";

export const rubrics: Rubric[] = [
  {
    id: "r-system-design",
    name: "System design review",
    total: 40,
    criteria: [
      {
        id: "rc-1",
        name: "Correctness under partition",
        weight: 12,
        levels: [
          {
            label: "Exemplary",
            points: 12,
            descriptor:
              "Invariants hold under every partition described; failure modes are enumerated with recovery paths.",
          },
          {
            label: "Proficient",
            points: 9,
            descriptor:
              "Invariants hold in the common cases; at least one partition scenario is analysed.",
          },
          {
            label: "Developing",
            points: 5,
            descriptor:
              "Partition behaviour is mentioned but not analysed; a data-loss window exists.",
          },
          {
            label: "Not yet",
            points: 0,
            descriptor: "Partition behaviour is not addressed.",
          },
        ],
      },
      {
        id: "rc-2",
        name: "Trade-off reasoning",
        weight: 10,
        levels: [
          {
            label: "Exemplary",
            points: 10,
            descriptor:
              "Alternatives considered and rejected with stated cost, latency or operability reasons.",
          },
          {
            label: "Proficient",
            points: 7,
            descriptor: "One alternative considered with a stated reason.",
          },
          {
            label: "Developing",
            points: 4,
            descriptor: "Choices asserted without alternatives.",
          },
          { label: "Not yet", points: 0, descriptor: "No trade-offs discussed." },
        ],
      },
      {
        id: "rc-3",
        name: "Operability",
        weight: 10,
        levels: [
          {
            label: "Exemplary",
            points: 10,
            descriptor:
              "Signals, alerts and a runbook a stranger could follow at 3am.",
          },
          {
            label: "Proficient",
            points: 7,
            descriptor: "Key metrics identified; a partial runbook exists.",
          },
          {
            label: "Developing",
            points: 4,
            descriptor: "Monitoring mentioned generically.",
          },
          { label: "Not yet", points: 0, descriptor: "Not addressed." },
        ],
      },
      {
        id: "rc-4",
        name: "Communication",
        weight: 8,
        levels: [
          {
            label: "Exemplary",
            points: 8,
            descriptor:
              "A reader outside the team could act on this document unaided.",
          },
          {
            label: "Proficient",
            points: 6,
            descriptor: "Clear to a teammate; some assumed context.",
          },
          {
            label: "Developing",
            points: 3,
            descriptor: "Requires the author present to interpret.",
          },
          { label: "Not yet", points: 0, descriptor: "Not legible." },
        ],
      },
    ],
  },
  {
    id: "r-eval-report",
    name: "LLM evaluation report",
    total: 30,
    criteria: [
      {
        id: "re-1",
        name: "Golden set quality",
        weight: 10,
        levels: [
          {
            label: "Exemplary",
            points: 10,
            descriptor:
              "Drawn from real traffic, covers the long tail, and labels are reviewed by a second person.",
          },
          {
            label: "Proficient",
            points: 7,
            descriptor: "Realistic cases; some tail coverage.",
          },
          {
            label: "Developing",
            points: 4,
            descriptor: "Synthetic or happy-path only.",
          },
          { label: "Not yet", points: 0, descriptor: "No golden set." },
        ],
      },
      {
        id: "re-2",
        name: "Metric choice",
        weight: 10,
        levels: [
          {
            label: "Exemplary",
            points: 10,
            descriptor:
              "Metrics map to a user-visible failure; judge bias is measured, not assumed away.",
          },
          {
            label: "Proficient",
            points: 7,
            descriptor: "Reasonable metrics with a stated rationale.",
          },
          {
            label: "Developing",
            points: 4,
            descriptor: "Generic metrics copied from a blog post.",
          },
          { label: "Not yet", points: 0, descriptor: "No metrics." },
        ],
      },
      {
        id: "re-3",
        name: "Regression gate",
        weight: 10,
        levels: [
          {
            label: "Exemplary",
            points: 10,
            descriptor: "Runs in CI, blocks merge, and has a documented waiver path.",
          },
          {
            label: "Proficient",
            points: 7,
            descriptor: "Runs in CI but does not block.",
          },
          { label: "Developing", points: 4, descriptor: "Run manually." },
          { label: "Not yet", points: 0, descriptor: "Not automated." },
        ],
      },
    ],
  },
];

export const assessments: Assessment[] = [
  {
    id: "a-dist-consensus",
    title: "Consensus and replication",
    courseId: "c-dist",
    kind: "Graded exam",
    minutes: 45,
    attempts: 2,
    passMark: 70,
    autoGraded: true,
    proctored: true,
    status: "open",
    dueAt: "2026-09-14T23:59:00+05:30",
    submissions: 214,
    cohortSize: 318,
    averageScore: 74,
    questions: [
      {
        id: "q1",
        type: "mcq",
        points: 5,
        prompt:
          "A five-node Raft cluster loses network connectivity between two nodes and the other three. Which side can continue to commit new entries?",
        options: [
          "Neither side, until the partition heals",
          "The three-node side, because it holds a majority",
          "The two-node side, if it held the leader",
          "Both sides, each with their own log",
        ],
        answer: 1,
        explanation:
          "Commitment requires a quorum of 3 in a 5-node cluster. The minority side may still have the old leader, but it cannot advance the commit index, so it serves stale reads at worst — it never commits.",
      },
      {
        id: "q2",
        type: "multi",
        points: 8,
        prompt:
          "Which of the following are guaranteed by linearizability but NOT by sequential consistency? Select all that apply.",
        options: [
          "Operations appear to take effect at a single point in time",
          "Real-time ordering across independent clients is respected",
          "All clients observe operations in the same order",
          "A read always returns the most recently committed write",
        ],
        answer: [1, 3],
        explanation:
          "Sequential consistency gives a single global order but is free to ignore real time. Linearizability additionally pins that order to wall-clock ordering, which is what makes read-your-writes hold across clients.",
      },
      {
        id: "q-consistency-match",
        type: "match",
        points: 6,
        prompt: "Match each consistency model to the guarantee it gives",
        pairs: [
          {
            left: "Linearizable",
            right: "Operations respect real-time order across clients",
          },
          {
            left: "Sequential",
            right: "One global order, but real time may be ignored",
          },
          {
            left: "Causal",
            right:
              "Effects never appear before their causes; concurrent writes may diverge",
          },
          { left: "Eventual", right: "Replicas converge once writes stop" },
        ],
        explanation:
          "Read the models from strongest to weakest. Linearizability pins every operation to a point in real time. Sequential consistency keeps one order that every client agrees on, but that order may disagree with the wall clock. Causal consistency only orders operations that depend on each other, so replicas can apply concurrent writes in different orders. Eventual consistency promises only that replicas agree once writes stop arriving.",
      },
      {
        id: "q3",
        type: "truefalse",
        points: 3,
        prompt:
          "In a system using hybrid logical clocks, two events with the same HLC timestamp are guaranteed to be concurrent.",
        options: ["True", "False"],
        answer: 1,
        explanation:
          "HLC timestamps can collide; the tie is broken by node id. Equal timestamps do not imply concurrency.",
      },
      {
        id: "q4",
        type: "short",
        points: 6,
        prompt:
          "In one sentence, state the invariant that log matching gives you in Raft.",
        explanation:
          "If two logs contain an entry with the same index and term, then the logs are identical in all entries up through that index.",
      },
      {
        id: "q5",
        type: "code",
        points: 12,
        prompt:
          "Complete `canGrantVote` so that a follower grants its vote only when the candidate's log is at least as up to date as its own.",
        starter:
          "func (n *Node) canGrantVote(candTerm, candLastIdx, candLastTerm int) bool {\n\tif candTerm < n.currentTerm {\n\t\treturn false\n\t}\n\t// TODO: implement the log up-to-date check\n\treturn false\n}",
        explanation:
          "Compare last log terms first; only if they are equal does the index break the tie. Getting this backwards is the single most common Raft bug.",
      },
    ],
  },
  {
    id: "a-dist-capstone",
    title: "Capstone: replicated store design review",
    courseId: "c-dist",
    kind: "Project",
    minutes: 0,
    attempts: 1,
    passMark: 70,
    autoGraded: false,
    proctored: false,
    status: "open",
    dueAt: "2026-09-28T23:59:00+05:30",
    submissions: 61,
    cohortSize: 318,
    averageScore: 81,
    rubricId: "r-system-design",
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 40,
        prompt:
          "Submit a design document for your replicated key-value store. Cover the consistency model you chose, behaviour under a network partition, the operational signals you would alert on, and one alternative you considered and rejected.",
        rubricId: "r-system-design",
      },
    ],
  },
  {
    id: "a-llm-eval",
    title: "Evaluation report",
    courseId: "c-llm",
    kind: "Assignment",
    minutes: 0,
    attempts: 2,
    passMark: 65,
    autoGraded: false,
    proctored: false,
    status: "open",
    dueAt: "2026-09-19T23:59:00+05:30",
    submissions: 188,
    cohortSize: 402,
    averageScore: 76,
    rubricId: "r-eval-report",
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 30,
        prompt:
          "Submit your eval suite and a short report: how the golden set was built, which metrics you chose and why, and the gate you put in CI.",
        rubricId: "r-eval-report",
      },
    ],
  },
  {
    id: "a-llm-retrieval",
    title: "Retrieval design check",
    courseId: "c-llm",
    kind: "Quiz",
    minutes: 20,
    attempts: 3,
    passMark: 60,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2026-09-11T23:59:00+05:30",
    submissions: 341,
    cohortSize: 402,
    averageScore: 82,
    questions: [
      {
        id: "q1",
        type: "mcq",
        points: 4,
        prompt:
          "Your RAG bot confidently answers a question using a chunk that was retrieved but is irrelevant. Which fix addresses the cause rather than the symptom?",
        options: [
          "Lower the temperature",
          "Add a re-ranking stage and a relevance floor below which you refuse",
          "Increase the number of retrieved chunks",
          "Instruct the model to be more careful in the system prompt",
        ],
        answer: 1,
        explanation:
          "The retrieval stage handed the model bad context. Prompting the model to be careful about context it cannot verify is asking it to do the retriever's job.",
      },
      {
        id: "q2",
        type: "multi",
        points: 6,
        prompt: "Which are genuine reasons to keep BM25 alongside embeddings?",
        options: [
          "Exact identifier and error-code matching",
          "It reduces embedding storage cost",
          "Rare domain terms that the embedding model never saw",
          "It removes the need for chunking",
        ],
        answer: [0, 2],
        explanation:
          "Lexical search wins on exact tokens and out-of-vocabulary terms. It changes neither storage cost nor the need to chunk.",
      },
      {
        id: "q3",
        type: "truefalse",
        points: 3,
        prompt:
          "Larger chunks always improve answer quality because they carry more context.",
        options: ["True", "False"],
        answer: 1,
        explanation:
          "Larger chunks dilute the embedding and push irrelevant text into the window. Chunk size is a precision/recall trade-off, not a monotonic gain.",
      },
      {
        id: "q4",
        type: "short",
        points: 5,
        prompt:
          "Name one measurable signal that tells you your retriever, not your model, is the problem.",
        explanation:
          "Recall@k on the golden set: if the correct chunk is not in the retrieved set, no amount of prompting will fix the answer.",
      },
    ],
  },
  {
    id: "a-sec-final",
    title: "Security foundations certification",
    courseId: "c-sec",
    kind: "Graded exam",
    minutes: 30,
    attempts: 3,
    passMark: 80,
    autoGraded: true,
    proctored: true,
    status: "open",
    dueAt: "2026-10-31T23:59:00+05:30",
    submissions: 4820,
    cohortSize: 5840,
    averageScore: 87,
    questions: [
      {
        id: "q1",
        type: "mcq",
        points: 5,
        prompt:
          "Which code shape most reliably indicates a fail-open authorisation bug?",
        options: [
          "A try/except that logs and re-raises",
          "`profile = qs.filter(...).first()` followed by `if profile and profile.can_view:`",
          "A permission check inside a database transaction",
          "A decorator applied to every view in a module",
        ],
        answer: 1,
        explanation:
          "When the filter returns nothing, `profile` is None, the condition short-circuits to False, and whatever follows the check runs as if unrestricted. The guard silently disappears for exactly the users it should stop.",
      },
      {
        id: "q2",
        type: "multi",
        points: 6,
        prompt: "Which of these are injection vulnerabilities in the same family?",
        options: [
          "SQL injection",
          "Server-side template injection",
          "Cross-site request forgery",
          "Prompt injection",
        ],
        answer: [0, 1, 3],
        explanation:
          "All three mix untrusted data into an instruction stream that a downstream interpreter executes. CSRF is a confused-deputy problem, not an injection.",
      },
      {
        id: "q3",
        type: "truefalse",
        points: 3,
        prompt:
          "Rotating a secret that was committed to git history is sufficient; the history does not need rewriting.",
        options: ["True", "False"],
        answer: 0,
        explanation:
          "Rotation invalidates the leaked value, which is the thing that matters. History rewriting is good hygiene but does not change the security outcome once the old secret is dead.",
      },
    ],
  },
  {
    id: "a-privacy-final",
    title: "Privacy certification 2026",
    courseId: "c-privacy",
    kind: "Graded exam",
    minutes: 25,
    attempts: 3,
    passMark: 80,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2026-10-31T23:59:00+05:30",
    submissions: 4110,
    cohortSize: 6120,
    averageScore: 84,
    questions: [
      {
        id: "q1",
        type: "mcq",
        points: 5,
        prompt:
          "A product team wants to use customer support transcripts to train an internal model. Which lawful basis is most defensible?",
        options: [
          "Consent, collected at signup in the terms of service",
          "Legitimate interests, with a documented balancing test",
          "Contract, because support is part of the service",
          "Legal obligation",
        ],
        answer: 1,
        explanation:
          "Blanket consent buried in terms is not freely given or specific. Legitimate interests with a written balancing test and an opt-out is the basis that survives scrutiny.",
      },
      {
        id: "q2",
        type: "truefalse",
        points: 3,
        prompt:
          "The 72-hour breach notification clock starts when the incident is confirmed by the security team.",
        options: ["True", "False"],
        answer: 1,
        explanation:
          "It starts on awareness, which is earlier and fuzzier than confirmation. Teams routinely lose a day assuming otherwise.",
      },
    ],
  },
  {
    id: "a-design-table",
    title: "Design a Table component API",
    courseId: "c-design",
    kind: "Assignment",
    minutes: 0,
    attempts: 1,
    passMark: 60,
    autoGraded: false,
    proctored: false,
    status: "scheduled",
    dueAt: "2026-09-30T23:59:00+05:30",
    submissions: 0,
    cohortSize: 96,
    averageScore: 0,
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 20,
        prompt:
          "Design the public API for a Table component that must support sorting, selection, sticky columns and an empty state, without exceeding eight props.",
      },
    ],
  },
  {
    id: "a-kube-manifest",
    title: "Production-ready manifest",
    courseId: "c-kube",
    kind: "Assignment",
    minutes: 0,
    attempts: 2,
    passMark: 70,
    autoGraded: false,
    proctored: false,
    status: "draft",
    dueAt: "2026-10-10T23:59:00+05:30",
    submissions: 0,
    cohortSize: 0,
    averageScore: 0,
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 25,
        prompt:
          "Submit a Deployment and Service manifest with probes and resource settings justified by measurement.",
      },
    ],
  },
  {
    id: "a-data-diagnostic",
    title: "Analytics Engineering diagnostic",
    courseId: "c-data",
    kind: "Diagnostic",
    minutes: 12,
    attempts: 1,
    passMark: 0,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2027-12-31T23:59:00+05:30",
    submissions: 1184,
    cohortSize: 1670,
    averageScore: 61,
    questions: [
      {
        id: "d1",
        type: "mcq",
        points: 1,
        moduleIndex: 0,
        prompt:
          "A leaderboard orders scores of 90, 85, 85 and 80 from highest to lowest. Product wants the two 85s to share second place and the 80 to show as third, not fourth. Which function gives that?",
        options: ["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "NTILE(3)"],
        answer: 2,
        explanation:
          "ROW_NUMBER never ties, so it returns 1, 2, 3, 4 and orders the two 85s arbitrarily. RANK gives ties the same rank and then leaves a gap: 1, 2, 2, 4. DENSE_RANK gives ties the same rank with no gap: 1, 2, 2, 3. NTILE(3) splits the rows into three buckets and returns 1, 1, 2, 3.",
      },
      {
        id: "d2",
        type: "mcq",
        points: 1,
        moduleIndex: 0,
        prompt:
          "`SUM(amount) OVER (ORDER BY order_date)` is meant to be a running total, but on a day with two orders both rows show the same figure, already including both orders. Why?",
        options: [
          "SUM skips duplicate values of the ORDER BY column",
          "With ORDER BY and no frame clause, the frame defaults to RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, which includes every row that ties on order_date",
          "A window function needs PARTITION BY before it can order rows",
          "Window functions run before the WHERE clause, so the rows are counted twice",
        ],
        answer: 1,
        explanation:
          "When a window has ORDER BY but no explicit frame, the default is RANGE UNBOUNDED PRECEDING, and RANGE treats rows with equal sort keys as peers of the current row, so both same-day rows see the whole day. Use ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW, and add a tiebreaker such as order_id to the ORDER BY so the result is deterministic.",
      },
      {
        id: "d3",
        type: "mcq",
        points: 1,
        moduleIndex: 1,
        prompt:
          "You are about to build a new fact table. What should you settle before choosing any of its columns?",
        options: [
          "Which dashboards will read from it",
          "Its grain: exactly what one row represents, such as one row per order line",
          "Which dimensions it will join to",
          "Whether it should be built incrementally",
        ],
        answer: 1,
        explanation:
          "Grain decides which measures can be summed and which joins are safe. Once it is declared, every proposed column either fits that grain or belongs in another table. Most double-counting and join fan-out bugs trace back to a grain nobody wrote down.",
      },
      {
        id: "d4",
        type: "multi",
        points: 1,
        moduleIndex: 1,
        prompt:
          "In a subscription product, which of these belong in a fact table rather than a dimension? Select all that apply.",
        options: [
          "The amount charged on each invoice",
          "A customer's country and signup channel",
          "The number of seats added in a plan change",
          "The product category hierarchy",
        ],
        answer: [0, 2],
        explanation:
          "Facts record measurable events at a declared grain, such as an invoice or a seat change. Dimensions describe the context you slice those events by: who the customer is, where they came from, which category a product sits in.",
      },
      {
        id: "d5",
        type: "mcq",
        points: 1,
        moduleIndex: 1,
        prompt:
          "A type 2 slowly changing dimension keeps each customer's plan history with valid_from and valid_to columns. To find the plan a customer was on when an order was placed, how do you join?",
        options: [
          "On customer_id, keeping the row with the latest valid_from",
          "On customer_id where is_current is true",
          "On customer_id where the order time is at or after valid_from and before valid_to",
          "On customer_id where the order time is BETWEEN valid_from AND valid_to",
        ],
        answer: 2,
        explanation:
          "Type 2 adds a row for every change, so a point-in-time lookup needs the business key plus a range on the validity columns. Taking the latest or current row rewrites history with today's plan. Keep the range half-open: BETWEEN is inclusive at both ends, so when one row's valid_to equals the next row's valid_from, an order at that moment matches both rows and is counted twice.",
      },
      {
        id: "d6",
        type: "mcq",
        points: 1,
        moduleIndex: 2,
        prompt:
          "An incremental model only processes rows whose updated_at is later than the latest updated_at already in the table. You fix a bug in how it calculates revenue and deploy. What happens to rows loaded before the fix?",
        options: [
          "They are recalculated on the next scheduled run",
          "They keep the old, wrong values until you run a full refresh or a backfill",
          "The tool notices the changed SQL and rebuilds the table",
          "They are dropped and reloaded from the source",
        ],
        answer: 1,
        explanation:
          "An incremental run only touches rows past the high-water mark, so a logic change applies from now on and history quietly keeps the old calculation. Plan a full refresh or a bounded backfill with every logic change. The same filter also misses late-arriving rows whose updated_at lands behind the mark, which is why many models reprocess a short lookback window.",
      },
      {
        id: "d7",
        type: "multi",
        points: 1,
        moduleIndex: 2,
        prompt:
          "Which of these can a generic schema test (unique, not_null, accepted_values, relationships) catch on its own? Select all that apply.",
        options: [
          "Two rows with the same order_id",
          "An order whose customer_id has no matching customer",
          "A refund larger than the charge it refunds",
          "Daily revenue that no longer reconciles with the finance ledger",
        ],
        answer: [0, 1],
        explanation:
          "Schema tests assert a property of one column: unique, present, one of a known set of values, or pointing at a row that exists. Rules that compare columns or tables, such as a refund never exceeding its charge or revenue matching finance, need a data test: a query that returns the rows breaking the rule and fails if it returns any.",
      },
      {
        id: "d8",
        type: "truefalse",
        points: 1,
        moduleIndex: 2,
        prompt:
          "If every schema test and data test on a model passes, the numbers it shows are current.",
        options: ["True", "False"],
        answer: 1,
        explanation:
          "Tests check the data that is there, not whether new data is still arriving. If a source stopped loading two days ago, every stale row still passes. A freshness check on the source's loaded-at timestamp, with warn and error thresholds, is what catches a pipeline that has quietly stopped.",
      },
    ],
  },
];

export const assessmentById = (id: string) =>
  assessments.find((a) => a.id === id);
export const rubricById = (id?: string) =>
  id ? rubrics.find((r) => r.id === id) : undefined;

export const totalPoints = (a: Assessment) =>
  a.questions.reduce((n, q) => n + q.points, 0);

export const submissions: Submission[] = [
  { id: "s1", assessmentId: "a-dist-consensus", personId: "u-daniel", submittedAt: "2026-09-03T11:20:00+05:30", score: 82, status: "graded", minutesSpent: 38, attempt: 1, flags: [] },
  { id: "s2", assessmentId: "a-dist-consensus", personId: "u-arjun", submittedAt: "2026-09-03T18:04:00+05:30", score: 61, status: "graded", minutesSpent: 45, attempt: 2, flags: ["Time limit reached"] },
  { id: "s3", assessmentId: "a-dist-consensus", personId: "u-yusuf", submittedAt: "2026-09-04T09:12:00+05:30", score: null, status: "awaiting_review", minutesSpent: 41, attempt: 1, flags: ["Manual review: code answer"] },
  { id: "s4", assessmentId: "a-dist-capstone", personId: "u-grace", submittedAt: "2026-09-02T22:47:00+05:30", score: 36, status: "graded", minutesSpent: 0, attempt: 1, flags: [] },
  { id: "s5", assessmentId: "a-dist-capstone", personId: "u-daniel", submittedAt: "2026-09-04T23:58:00+05:30", score: null, status: "awaiting_review", minutesSpent: 0, attempt: 1, flags: [] },
  { id: "s6", assessmentId: "a-llm-eval", personId: "u-mei", submittedAt: "2026-09-01T14:30:00+05:30", score: 27, status: "graded", minutesSpent: 0, attempt: 1, flags: [] },
  { id: "s7", assessmentId: "a-llm-eval", personId: "u-yusuf", submittedAt: "2026-09-05T02:11:00+05:30", score: null, status: "awaiting_review", minutesSpent: 0, attempt: 2, flags: ["Late by 6 days"] },
  { id: "s8", assessmentId: "a-llm-retrieval", personId: "u-anaya", submittedAt: "2026-09-04T16:22:00+05:30", score: 94, status: "graded", minutesSpent: 12, attempt: 1, flags: [] },
  { id: "s9", assessmentId: "a-sec-final", personId: "u-sofia", submittedAt: "2026-08-28T10:05:00+05:30", score: 93, status: "graded", minutesSpent: 18, attempt: 1, flags: [] },
  { id: "s10", assessmentId: "a-sec-final", personId: "u-omar", submittedAt: "", score: null, status: "missing", minutesSpent: 0, attempt: 0, flags: ["Not started · 12 days to deadline"] },
  { id: "s11", assessmentId: "a-privacy-final", personId: "u-lena", submittedAt: "2026-09-02T09:40:00+05:30", score: 100, status: "graded", minutesSpent: 14, attempt: 1, flags: [] },
  { id: "s12", assessmentId: "a-privacy-final", personId: "u-ravi", submittedAt: "", score: null, status: "in_progress", minutesSpent: 6, attempt: 1, flags: [] },
];
