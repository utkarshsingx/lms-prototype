import type { Assessment, Rubric, Submission } from "./types";

export const rubrics: Rubric[] = [
  {
    id: "r-fr-interpretation",
    name: "Interpreting financial statements",
    total: 30,
    criteria: [
      {
        id: "rfi-1",
        name: "Relevant ratios, calculated correctly",
        weight: 6,
        levels: [
          {
            label: "Exemplary",
            points: 6,
            descriptor:
              "The ratios chosen answer the stakeholder's question, and every one is calculated correctly with its formula shown.",
          },
          {
            label: "Proficient",
            points: 4,
            descriptor:
              "Relevant ratios with one or two calculation slips that do not change the conclusion.",
          },
          {
            label: "Developing",
            points: 2,
            descriptor:
              "A long list of ratios, several irrelevant to the question, or errors that change the picture.",
          },
          {
            label: "Not yet",
            points: 0,
            descriptor: "No ratios, or ratios that cannot be traced to the figures.",
          },
        ],
      },
      {
        id: "rfi-2",
        name: "Analysis of performance",
        weight: 8,
        levels: [
          {
            label: "Exemplary",
            points: 8,
            descriptor:
              "Explains why revenue, margins and returns moved, using the scenario: pricing, sales mix, one-off items and new leases.",
          },
          {
            label: "Proficient",
            points: 6,
            descriptor: "Explains most movements, with some link to the scenario.",
          },
          {
            label: "Developing",
            points: 3,
            descriptor:
              "Describes movements, such as \"gross margin fell\", without explaining them.",
          },
          { label: "Not yet", points: 0, descriptor: "Performance is not analysed." },
        ],
      },
      {
        id: "rfi-3",
        name: "Analysis of position",
        weight: 8,
        levels: [
          {
            label: "Exemplary",
            points: 8,
            descriptor:
              "Links liquidity, working capital and gearing, and explains how new IFRS 16 lease liabilities affect the gearing comparison.",
          },
          {
            label: "Proficient",
            points: 6,
            descriptor: "Covers liquidity and gearing, with reasons for most changes.",
          },
          {
            label: "Developing",
            points: 3,
            descriptor: "Lists position ratios with little explanation.",
          },
          { label: "Not yet", points: 0, descriptor: "Position is not analysed." },
        ],
      },
      {
        id: "rfi-4",
        name: "Conclusion for the stakeholder",
        weight: 4,
        levels: [
          {
            label: "Exemplary",
            points: 4,
            descriptor:
              "A clear recommendation for the named stakeholder, the points that drive it, and the further information needed.",
          },
          {
            label: "Proficient",
            points: 3,
            descriptor: "A reasoned conclusion that is not tied to the stakeholder's decision.",
          },
          {
            label: "Developing",
            points: 1,
            descriptor: "A summary of points without a conclusion.",
          },
          { label: "Not yet", points: 0, descriptor: "No conclusion." },
        ],
      },
      {
        id: "rfi-5",
        name: "Professional presentation",
        weight: 4,
        levels: [
          {
            label: "Exemplary",
            points: 4,
            descriptor:
              "Report format with headings, ratios in an appendix, and concise professional language.",
          },
          {
            label: "Proficient",
            points: 3,
            descriptor: "Organised, with minor lapses in structure or tone.",
          },
          {
            label: "Developing",
            points: 1,
            descriptor: "Hard to follow, with calculations mixed into the narrative.",
          },
          { label: "Not yet", points: 0, descriptor: "Not in a usable form." },
        ],
      },
    ],
  },
  {
    id: "r-pm-report",
    name: "Variance analysis report",
    total: 30,
    criteria: [
      {
        id: "rpr-1",
        name: "Variance calculations",
        weight: 8,
        levels: [
          {
            label: "Exemplary",
            points: 8,
            descriptor:
              "Material price, mix and yield, labour rate and efficiency variances all correct, each labelled adverse or favourable.",
          },
          {
            label: "Proficient",
            points: 6,
            descriptor: "Most variances correct, with one method error.",
          },
          {
            label: "Developing",
            points: 3,
            descriptor: "Several variances wrong or unlabelled.",
          },
          { label: "Not yet", points: 0, descriptor: "Variances not calculated." },
        ],
      },
      {
        id: "rpr-2",
        name: "Planning and operational split",
        weight: 6,
        levels: [
          {
            label: "Exemplary",
            points: 6,
            descriptor:
              "The revised standard is justified from the scenario, and planning and operational variances reconcile to the total.",
          },
          {
            label: "Proficient",
            points: 4,
            descriptor:
              "The split is mostly correct, but the revised standard is not justified.",
          },
          {
            label: "Developing",
            points: 2,
            descriptor: "The split is confused, or the variances do not reconcile.",
          },
          { label: "Not yet", points: 0, descriptor: "No split attempted." },
        ],
      },
      {
        id: "rpr-3",
        name: "Causes and interdependence",
        weight: 8,
        levels: [
          {
            label: "Exemplary",
            points: 8,
            descriptor:
              "Likely causes drawn from the scenario, with variances linked to each other, such as cheaper fruit causing a poorer yield.",
          },
          {
            label: "Proficient",
            points: 6,
            descriptor: "Plausible causes for most variances, with some links drawn.",
          },
          {
            label: "Developing",
            points: 3,
            descriptor: "Generic causes that are not drawn from the scenario.",
          },
          { label: "Not yet", points: 0, descriptor: "Causes not discussed." },
        ],
      },
      {
        id: "rpr-4",
        name: "Recommendations for control",
        weight: 4,
        levels: [
          {
            label: "Exemplary",
            points: 4,
            descriptor: "Specific actions, each owned by the responsible manager.",
          },
          {
            label: "Proficient",
            points: 3,
            descriptor: "Sensible actions that are not assigned to anyone.",
          },
          { label: "Developing", points: 1, descriptor: "Vague recommendations." },
          { label: "Not yet", points: 0, descriptor: "No recommendations." },
        ],
      },
      {
        id: "rpr-5",
        name: "Report for management",
        weight: 4,
        levels: [
          {
            label: "Exemplary",
            points: 4,
            descriptor:
              "A concise report a production director could act on, with workings in an appendix.",
          },
          {
            label: "Proficient",
            points: 3,
            descriptor: "Clear, with some workings left in the body of the report.",
          },
          {
            label: "Developing",
            points: 1,
            descriptor: "Calculations presented without a report around them.",
          },
          { label: "Not yet", points: 0, descriptor: "Not in a usable form." },
        ],
      },
    ],
  },
];

export const assessments: Assessment[] = [
  {
    id: "a-fr-groups",
    title: "Group accounts test",
    courseId: "c-fr",
    kind: "Graded exam",
    minutes: 45,
    attempts: 2,
    passMark: 50,
    autoGraded: true,
    proctored: true,
    status: "open",
    dueAt: "2026-09-20T23:59:00+05:30",
    submissions: 29,
    cohortSize: 38,
    averageScore: 61,
    questions: [
      {
        id: "q1",
        type: "mcq",
        points: 4,
        prompt:
          "Pinewood Co acquired 80% of Sable Co and measured the non-controlling interest at fair value. This year goodwill of $200,000 is impaired. How much of the impairment is charged against the non-controlling interest in the consolidated statement of financial position?",
        options: ["$0", "$40,000", "$160,000", "$200,000"],
        answer: 1,
        explanation:
          "When NCI is measured at fair value, goodwill includes the NCI's share, so an impairment is shared in the same proportion as profits: 20% of $200,000, or $40,000, reduces NCI, and $160,000 reduces group retained earnings. Under the proportionate share method, goodwill belongs to the parent only and none of the impairment is charged to NCI.",
      },
      {
        id: "q2",
        type: "multi",
        points: 6,
        prompt:
          "In which of these situations does Pinewood Co control the investee under IFRS 10? Select all that apply.",
        options: [
          "It holds 45% of the voting shares and has a contractual right to appoint a majority of the board",
          "It holds 30% of the voting shares and participates in policy decisions",
          "It holds 60% of the voting shares and no agreement restricts its rights",
          "It holds 50% and shares control with one other investor under a contractual arrangement",
        ],
        answer: [0, 2],
        explanation:
          "Control needs power over the investee, exposure to variable returns, and the ability to use that power to affect those returns. The right to appoint a majority of the board gives power even at 45%, and 60% of the votes with no restrictions gives power in the ordinary way. Participating in policy decisions at 30% is significant influence, which makes an associate under IAS 28. Control shared under a contractual arrangement is joint control, which makes a joint arrangement.",
      },
      {
        id: "q3",
        type: "truefalse",
        points: 3,
        prompt:
          "Sable Co, the subsidiary, sold goods to Pinewood Co at a profit, and some of them are still in Pinewood Co's inventory at the year end. The unrealised profit adjustment reduces the non-controlling interest's share of profit.",
        options: ["True", "False"],
        answer: 0,
        explanation:
          "When the subsidiary is the seller, the profit sits in the subsidiary's results, so the adjustment reduces the subsidiary's profit before it is split between the group and the NCI. When the parent is the seller, the whole adjustment is made against group retained earnings and NCI is unaffected.",
      },
      {
        id: "q4",
        type: "match",
        points: 5,
        prompt: "Match each standard to the subject it covers",
        pairs: [
          { left: "IFRS 3", right: "Business combinations" },
          { left: "IFRS 10", right: "Consolidated financial statements" },
          { left: "IAS 28", right: "Investments in associates and joint ventures" },
          { left: "IAS 36", right: "Impairment of assets" },
          { left: "IFRS 13", right: "Fair value measurement" },
        ],
        explanation:
          "IFRS 3 sets out the acquisition method, including goodwill and NCI. IFRS 10 defines control and requires consolidation. IAS 28 applies the equity method to associates and joint ventures. IAS 36 covers impairment, including the annual goodwill test. IFRS 13 defines fair value, which you need for the consideration, the NCI and the subsidiary's net assets.",
      },
      {
        id: "q5",
        type: "number",
        points: 8,
        prompt:
          "Pinewood Co acquired 800,000 of Sable Co's 1,000,000 $1 equity shares (80%). It paid $3,000,000 in cash and issued 1,000,000 of its own shares, which had a market value of $2.20 each. The non-controlling interest was measured at its fair value of $1,100,000. At acquisition Sable Co's retained earnings were $3,300,000, and the fair value of its land was $500,000 above its carrying amount. Calculate goodwill on acquisition.",
        value: 1500,
        tolerance: 0,
        unit: "$000",
        explanation:
          "Consideration is cash $3,000k plus shares of 1,000k × $2.20 = $2,200k, so $5,200k. Add NCI at fair value of $1,100k. Deduct net assets at acquisition: share capital $1,000k, retained earnings $3,300k and the fair value uplift on land $500k, a total of $4,800k. Goodwill is 5,200 + 1,100 − 4,800 = $1,500k. Leaving out the fair value uplift is the most common error, and it overstates goodwill by $500k.",
      },
      {
        id: "q6",
        type: "short",
        points: 4,
        prompt:
          "When NCI is measured at fair value at acquisition, how is the non-controlling interest in the consolidated statement of financial position built up at the reporting date?",
        explanation:
          "NCI at fair value at acquisition, plus the NCI's share of the subsidiary's post-acquisition retained earnings (after adjustments such as extra depreciation on fair value uplifts, and unrealised profit where the subsidiary was the seller), less the NCI's share of any goodwill impairment.",
      },
    ],
  },
  {
    id: "a-fr-mock",
    title: "FR mock exam · Dec 2026",
    courseId: "c-fr",
    kind: "Graded exam",
    minutes: 180,
    attempts: 1,
    passMark: 50,
    autoGraded: false,
    proctored: true,
    status: "open",
    dueAt: "2026-10-25T23:59:00+05:30",
    submissions: 6,
    cohortSize: 38,
    averageScore: 54,
    questions: [
      {
        id: "m1",
        type: "mcq",
        points: 2,
        prompt:
          "Section A. Larch Co sells a machine with two years of maintenance for a single price of $1,200,000. Sold separately, the machine would sell for $1,000,000 and the maintenance for $400,000. How much of the transaction price is allocated to the machine under IFRS 15?",
        options: ["$800,000", "$857,143", "$1,000,000", "$1,200,000"],
        answer: 1,
        explanation:
          "The transaction price is allocated in proportion to stand-alone selling prices: $1,200,000 × 1,000,000 / 1,400,000 = $857,143. That amount is recognised when control of the machine passes. The $342,857 allocated to maintenance is recognised over the two years as the service is provided.",
      },
      {
        id: "m2",
        type: "mcq",
        points: 2,
        prompt:
          "Section A. On 1 January Larch Co leases a machine for five years, paying $100,000 annually in arrears. The present value of the payments at the interest rate implicit in the lease is $399,300. Larch Co pays initial direct costs of $10,000. What is the initial carrying amount of the right-of-use asset?",
        options: ["$399,300", "$409,300", "$500,000", "$510,000"],
        answer: 1,
        explanation:
          "Under IFRS 16 the right-of-use asset starts at the initial lease liability of $399,300, plus initial direct costs of $10,000. Payments made at or before commencement would also be added, but these payments are in arrears.",
      },
      {
        id: "m3",
        type: "truefalse",
        points: 2,
        prompt:
          "Section A. A dividend declared after the reporting date, but before the financial statements are authorised for issue, is recognised as a liability at the reporting date.",
        options: ["True", "False"],
        answer: 1,
        explanation:
          "Under IAS 10 a dividend declared after the reporting date is a non-adjusting event. There was no obligation at the reporting date, so the dividend is disclosed in the notes, not recognised.",
      },
      {
        id: "m4",
        type: "multi",
        points: 2,
        prompt:
          "Section B. Which conditions must all be met for a provision to be recognised under IAS 37? Select all that apply.",
        options: [
          "There is a present obligation as a result of a past event",
          "An outflow of economic benefits is probable",
          "A reliable estimate of the obligation can be made",
          "The amount is material to the financial statements",
        ],
        answer: [0, 1, 2],
        explanation:
          "IAS 37 requires all three: a present obligation from a past event, a probable outflow, and a reliable estimate. Materiality decides whether an item matters to users, but it is not a recognition criterion for a provision.",
      },
      {
        id: "m5",
        type: "number",
        points: 2,
        prompt:
          "Section B. At the reporting date an item of plant has a carrying amount of $800,000 and a tax base of $500,000. The tax rate is 25%. Calculate the deferred tax liability.",
        value: 75,
        tolerance: 0,
        unit: "$000",
        explanation:
          "The taxable temporary difference is $800,000 − $500,000 = $300,000. At 25%, the deferred tax liability is $75,000.",
      },
      {
        id: "m6",
        type: "essay",
        points: 20,
        prompt:
          "Section C. The draft financial statements of Holly Co and its 75% subsidiary Ivy Co are in the exhibits, with notes on a fair value adjustment, intra-group sales and a goodwill impairment. Prepare the consolidated statement of financial position of the Holly group at 30 September 20X6.",
      },
      {
        id: "m7",
        type: "essay",
        points: 20,
        prompt:
          "Section C. Using the financial statements and ratios for Juniper Co for the last two years, analyse its financial performance and position for a bank that is considering an increase in its overdraft. Include the effect of the leases recognised for the first time this year.",
      },
    ],
  },
  {
    id: "a-fr-case",
    title: "Written case: interpreting financial statements",
    courseId: "c-fr",
    kind: "Project",
    minutes: 0,
    attempts: 1,
    passMark: 50,
    autoGraded: false,
    proctored: false,
    status: "open",
    dueAt: "2026-10-04T23:59:00+05:30",
    submissions: 11,
    cohortSize: 38,
    averageScore: 63,
    rubricId: "r-fr-interpretation",
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 30,
        prompt:
          "Tanager Co is a retailer asking its bank for a larger overdraft. Revenue grew 14% this year, but gross margin fell from 38% to 33%, the receivables collection period rose from 34 to 51 days, and new store leases added $6.2m of lease liabilities under IFRS 16. Using the financial statements in the case pack, write a report for the bank's credit committee that analyses Tanager Co's performance and position and recommends whether the overdraft should be increased.",
        rubricId: "r-fr-interpretation",
      },
    ],
  },
  {
    id: "a-pm-variance",
    title: "Variance analysis report",
    courseId: "c-pm",
    kind: "Assignment",
    minutes: 0,
    attempts: 1,
    passMark: 50,
    autoGraded: false,
    proctored: false,
    status: "closed",
    dueAt: "2026-09-10T23:59:00+05:30",
    submissions: 19,
    cohortSize: 22,
    averageScore: 58,
    rubricId: "r-pm-report",
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 30,
        prompt:
          "Kite Co makes a juice drink from a mix of three fruits. Last month material costs were over budget and output was below the expected yield. Using the standard cost card and actual results in the case pack, calculate the material price, mix and yield variances and the labour rate and efficiency variances. A poor harvest raised the market price of one fruit, so split the material price variance into planning and operational elements. Write a report for the production director that explains the likely causes and recommends action.",
        rubricId: "r-pm-report",
      },
    ],
  },
  {
    id: "a-pm-budgeting",
    title: "Budgeting and standard costing check",
    courseId: "c-pm",
    kind: "Quiz",
    minutes: 20,
    attempts: 3,
    passMark: 50,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2026-09-18T23:59:00+05:30",
    submissions: 19,
    cohortSize: 22,
    averageScore: 64,
    questions: [
      {
        id: "b1",
        type: "mcq",
        points: 4,
        prompt:
          "The standard for product P is 4 kg of material at $3 per kg. This month 1,000 units were made using 4,300 kg, which cost $12,470. What is the material usage variance?",
        options: ["$430 favourable", "$900 adverse", "$900 favourable", "$1,290 adverse"],
        answer: 1,
        explanation:
          "The standard quantity for actual output is 1,000 × 4 = 4,000 kg. The usage variance is (4,000 − 4,300) × $3 = $900 adverse. Usage variances are valued at the standard price, so the actual price paid does not enter this calculation.",
      },
      {
        id: "b2",
        type: "number",
        points: 4,
        prompt:
          "Using the same data, calculate the material price variance. Enter a favourable variance as a positive figure and an adverse variance as a negative figure.",
        value: 430,
        tolerance: 0,
        unit: "$",
        explanation:
          "The 4,300 kg used should have cost 4,300 × $3 = $12,900. They cost $12,470, so the price variance is $430 favourable.",
      },
      {
        id: "b3",
        type: "multi",
        points: 4,
        prompt:
          "Which of these are advantages of zero-based budgeting? Select all that apply.",
        options: [
          "It challenges spending carried forward from previous budgets",
          "It is quick and cheap to prepare",
          "It allocates resources according to need and benefit",
          "It suits costs that are largely committed, such as direct materials in manufacturing",
        ],
        answer: [0, 2],
        explanation:
          "ZBB builds each activity's budget from zero, so inefficient spending cannot simply roll forward, and resources follow the benefit each activity brings. It is time-consuming to prepare, and it suits discretionary costs such as training or marketing rather than committed production costs.",
      },
      {
        id: "b4",
        type: "truefalse",
        points: 3,
        prompt:
          "A rolling budget is extended by a further period, such as a month or a quarter, as each period ends.",
        options: ["True", "False"],
        answer: 0,
        explanation:
          "A rolling, or continuous, budget always looks the same distance ahead: when a period ends, another is added and the remaining periods are revised.",
      },
      {
        id: "b5",
        type: "mcq",
        points: 4,
        prompt:
          "The first batch of a new product takes 100 hours, and an 80% learning curve applies. What is the cumulative average time per batch when 4 batches have been produced?",
        options: ["51.2 hours", "64 hours", "80 hours", "256 hours"],
        answer: 1,
        explanation:
          "Each time cumulative output doubles, the cumulative average time falls to 80% of its previous value: 100 hours for 1 batch, 80 hours for 2 and 64 hours for 4. The total for 4 batches is 256 hours, and 51.2 hours is the average after 8 batches.",
      },
      {
        id: "b6",
        type: "short",
        points: 4,
        prompt:
          "In one sentence, explain how a favourable material price variance could be linked to an adverse labour efficiency variance.",
        explanation:
          "Cheaper, lower-quality material can be harder to work with or cause more waste, so staff take longer than standard to make each unit.",
      },
    ],
  },
  {
    id: "a-pm-mock",
    title: "PM mock exam · Dec 2026",
    courseId: "c-pm",
    kind: "Graded exam",
    minutes: 180,
    attempts: 1,
    passMark: 50,
    autoGraded: false,
    proctored: true,
    status: "open",
    dueAt: "2026-11-01T23:59:00+05:30",
    submissions: 4,
    cohortSize: 22,
    averageScore: 49,
    questions: [
      {
        id: "pm1",
        type: "mcq",
        points: 2,
        prompt:
          "Section A. Product X sells for $50 and uses $20 of materials and 0.25 hours in the bottleneck. Total factory costs are $1,080,000 for 10,000 bottleneck hours. What is product X's throughput accounting ratio?",
        options: ["0.90", "1.11", "1.20", "2.78"],
        answer: 1,
        explanation:
          "Throughput per bottleneck hour is ($50 − $20) / 0.25 = $120. Factory cost per bottleneck hour is $1,080,000 / 10,000 = $108. The TA ratio is 120 / 108 = 1.11, so product X more than covers its share of factory costs.",
      },
      {
        id: "pm2",
        type: "mcq",
        points: 2,
        prompt:
          "Section A. A division has net assets of $2m and annual profit of $300,000. Its manager is offered a project costing $500,000 that would earn $60,000 a year. The company's cost of capital is 10%. Which statement is correct?",
        options: [
          "The manager would accept the project if judged on either ROI or RI",
          "The manager would reject the project if judged on ROI, but accept it if judged on RI",
          "The manager would accept the project if judged on ROI, but reject it if judged on RI",
          "The manager would reject the project if judged on either ROI or RI",
        ],
        answer: 1,
        explanation:
          "Current ROI is 15%. The project earns 12%, so divisional ROI would fall to 360 / 2,500 = 14.4%, and a manager judged on ROI would reject it. Residual income from the project is $60,000 − 10% × $500,000 = $10,000, so a manager judged on RI would accept it. The project beats the cost of capital, so RI gives the goal-congruent answer.",
      },
      {
        id: "pm3",
        type: "multi",
        points: 2,
        prompt:
          "Section A. Which of these measures belong to the customer perspective of the balanced scorecard? Select all that apply.",
        options: [
          "Customer retention rate",
          "Return on capital employed",
          "Customer satisfaction score",
          "Training hours per employee",
        ],
        answer: [0, 2],
        explanation:
          "Retention and satisfaction measure how customers see the business. ROCE belongs to the financial perspective, and training hours to the innovation and learning perspective.",
      },
      {
        id: "pm4",
        type: "number",
        points: 2,
        prompt:
          "Section B. A contract needs 500 kg of material M. There are 300 kg in inventory, bought for $4 per kg, and material M is used regularly in other production. Its replacement cost is $5 per kg. What is the relevant cost of material M for the contract?",
        value: 2500,
        tolerance: 0,
        unit: "$",
        explanation:
          "Material M is in regular use, so every kilogram used on the contract must be replaced and is valued at its $5 replacement cost: 500 × $5 = $2,500. The $4 historical cost is a sunk cost.",
      },
      {
        id: "pm5",
        type: "essay",
        points: 20,
        prompt:
          "Section C. Using the budget, actual results and revised market information for Wren Co in the exhibits, calculate the sales price and sales volume variances, split the material price variance into planning and operational variances, and discuss whether the production manager should be held responsible for the adverse material variances.",
      },
    ],
  },
  {
    id: "a-fa-mock",
    title: "FA mock exam",
    courseId: "c-fa",
    kind: "Graded exam",
    minutes: 120,
    attempts: 2,
    passMark: 50,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2027-03-31T23:59:00+05:30",
    submissions: 64,
    cohortSize: 119,
    averageScore: 62,
    questions: [
      {
        id: "fa1",
        type: "mcq",
        points: 2,
        prompt:
          "A machine costs $60,000, has an expected residual value of $6,000 and a useful life of six years. What is the annual straight-line depreciation charge?",
        options: ["$6,000", "$9,000", "$10,000", "$11,000"],
        answer: 1,
        explanation:
          "The depreciable amount is $60,000 − $6,000 = $54,000, spread over six years: $9,000 a year. $10,000 ignores the residual value.",
      },
      {
        id: "fa2",
        type: "mcq",
        points: 2,
        prompt:
          "The cash book shows a debit balance of $1,200. Cheques of $400 have not yet been presented, lodgements of $250 have not yet cleared, and bank charges of $30 appear on the bank statement but not in the cash book. What is the corrected cash book balance?",
        options: ["$1,020", "$1,170", "$1,230", "$1,320"],
        answer: 1,
        explanation:
          "Only items missing from the cash book change it: $1,200 − $30 of bank charges = $1,170. Unpresented cheques and outstanding lodgements are timing differences that explain the gap to the bank statement ($1,170 + $400 − $250 = $1,320). They are not errors in the cash book.",
      },
      {
        id: "fa3",
        type: "truefalse",
        points: 1,
        prompt:
          "Under IAS 2, inventory is measured at the lower of cost and net realisable value.",
        options: ["True", "False"],
        answer: 0,
        explanation:
          "IAS 2 requires the lower of cost and net realisable value, assessed item by item or for groups of similar items.",
      },
      {
        id: "fa4",
        type: "number",
        points: 2,
        prompt:
          "At the year end, receivables are $50,000 after writing off irrecoverable debts of $2,000. The allowance for receivables is to be 4% of receivables, and the opening allowance was $1,500. What is the total charge to profit or loss for irrecoverable debts and the allowance?",
        value: 2500,
        tolerance: 0,
        unit: "$",
        explanation:
          "The closing allowance is 4% × $50,000 = $2,000, an increase of $500 on the opening $1,500. The charge is the $2,000 written off plus the $500 increase in the allowance: $2,500.",
      },
      {
        id: "fa5",
        type: "multi",
        points: 2,
        prompt:
          "Which of these errors would cause the trial balance totals to disagree? Select all that apply.",
        options: [
          "A purchase invoice was left out of the books entirely",
          "A debit to the telephone expense account was posted with no corresponding credit",
          "A sale of $1,200 was recorded as $2,100 in both sales and receivables",
          "A payment to a supplier was debited to payables as $540 and credited to cash as $450",
        ],
        answer: [1, 3],
        explanation:
          "An error of omission, and a transposition made the same way on both sides, keep debits equal to credits, so the trial balance still agrees. A one-sided entry, or unequal debit and credit amounts, make the totals disagree, and the difference goes to a suspense account.",
      },
      {
        id: "fa6",
        type: "mcq",
        points: 2,
        prompt:
          "Pine Co acquired 75% of Spruce Co when Spruce Co's retained earnings were $160,000. At the reporting date Pine Co's retained earnings are $900,000 and Spruce Co's are $400,000. There are no other adjustments. What are consolidated retained earnings?",
        options: ["$1,020,000", "$1,080,000", "$1,200,000", "$1,300,000"],
        answer: 1,
        explanation:
          "Group retained earnings are the parent's own plus its share of the subsidiary's post-acquisition retained earnings: $900,000 + 75% × ($400,000 − $160,000) = $1,080,000. The $160,000 earned before acquisition is part of the net assets acquired, not group profit.",
      },
    ],
  },
  {
    id: "a-epsm-final",
    title: "EPSM final assessment",
    courseId: "c-epsm",
    kind: "Graded exam",
    minutes: 60,
    attempts: 3,
    passMark: 50,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2026-12-31T23:59:00+05:30",
    submissions: 176,
    cohortSize: 214,
    averageScore: 78,
    questions: [
      {
        id: "e1",
        type: "mcq",
        points: 3,
        prompt:
          "Which of these is NOT one of the five fundamental principles in the ACCA Code of Ethics and Conduct?",
        options: ["Integrity", "Objectivity", "Transparency", "Confidentiality"],
        answer: 2,
        explanation:
          "The five fundamental principles are integrity, objectivity, professional competence and due care, confidentiality, and professional behaviour. Transparency is good practice, but it is not one of the five.",
      },
      {
        id: "e2",
        type: "mcq",
        points: 3,
        prompt:
          "An audit senior is asked to audit the fixed asset register she maintained while on secondment to the client's finance team last year. Which threat to the fundamental principles does this create?",
        options: [
          "Self-interest threat",
          "Self-review threat",
          "Familiarity threat",
          "Intimidation threat",
        ],
        answer: 1,
        explanation:
          "She would be evaluating her own work, which is a self-review threat. A safeguard is to assign the fixed asset work to someone who was not involved, with a review by a senior member of the team.",
      },
      {
        id: "e3",
        type: "multi",
        points: 4,
        prompt:
          "In which situations may a professional accountant disclose confidential client information without the client's consent? Select all that apply.",
        options: [
          "When disclosure is required by law, such as a report of suspected money laundering",
          "When responding to an inquiry by ACCA as the accountant's professional body",
          "To show a prospective employer the kind of clients they have worked with",
          "To a friend in the same industry who asks for general advice",
        ],
        answer: [0, 1],
        explanation:
          "Disclosure is permitted where the law requires it, or where there is a professional duty or right to disclose, such as responding to an inquiry by a professional body. Using client information for personal advantage, or sharing it casually, breaches confidentiality.",
      },
      {
        id: "e4",
        type: "truefalse",
        points: 2,
        prompt:
          "Professional scepticism means assuming that management is dishonest until proven otherwise.",
        options: ["True", "False"],
        answer: 1,
        explanation:
          "Professional scepticism is a questioning mind and a critical assessment of evidence. It neither assumes dishonesty nor accepts explanations at face value.",
      },
      {
        id: "e5",
        type: "short",
        points: 3,
        prompt: "Name one safeguard that reduces a self-review threat.",
        explanation:
          "For example: have the work reviewed by a professional who was not involved in preparing it, or give the engagement to separate team members.",
      },
    ],
  },
  {
    id: "a-aa-planning",
    title: "Audit planning memo",
    courseId: "c-aa",
    kind: "Assignment",
    minutes: 0,
    attempts: 1,
    passMark: 50,
    autoGraded: false,
    proctored: false,
    status: "scheduled",
    dueAt: "2026-10-11T23:59:00+05:30",
    submissions: 0,
    cohortSize: 31,
    averageScore: 0,
    questions: [
      {
        id: "q1",
        type: "essay",
        points: 25,
        prompt:
          "Linnet Co manufactures kitchen appliances. This year it opened a new warehouse, moved to a perpetual inventory system, and took out a bank loan with a covenant based on gearing. Using the case pack, write an audit planning memo that calculates preliminary materiality, identifies and explains six audit risks, and sets out the auditor's response to each.",
      },
    ],
  },
  {
    id: "a-fm-diagnostic",
    title: "Financial Management diagnostic",
    courseId: "c-fm",
    kind: "Diagnostic",
    minutes: 12,
    attempts: 1,
    passMark: 0,
    autoGraded: true,
    proctored: false,
    status: "open",
    dueAt: "2027-12-31T23:59:00+05:30",
    submissions: 41,
    cohortSize: 102,
    averageScore: 57,
    questions: [
      {
        id: "d1",
        type: "mcq",
        points: 1,
        moduleIndex: 0,
        prompt:
          "A project costs $100,000 now and returns $40,000 a year for three years, starting in one year. The cost of capital is 10%, and the three-year annuity factor at 10% is 2.487. What is the net present value?",
        options: ["$20,000", "$520", "−$520", "$99,480"],
        answer: 2,
        explanation:
          "The present value of the inflows is $40,000 × 2.487 = $99,480, so NPV is $99,480 − $100,000 = −$520. The undiscounted surplus of $20,000 disappears once the timing of the cash flows is taken into account, so the project should be rejected.",
      },
      {
        id: "d2",
        type: "mcq",
        points: 1,
        moduleIndex: 0,
        prompt:
          "A company is appraising a new production line. Which of these is a relevant cash flow?",
        options: [
          "Market research carried out last year",
          "A share of head office costs that will not change",
          "Extra working capital needed when the line starts",
          "Depreciation on the new machinery",
        ],
        answer: 2,
        explanation:
          "Relevant cash flows are future, incremental cash flows. The research is sunk, the head office cost does not change, and depreciation is not a cash flow (its tax effect comes in through tax-allowable depreciation). The working capital is an extra outflow at the start, released at the end of the project.",
      },
      {
        id: "d3",
        type: "mcq",
        points: 1,
        moduleIndex: 1,
        prompt:
          "A company has inventory days of 45, receivables days of 60 and payables days of 50. What is its cash operating cycle?",
        options: ["35 days", "55 days", "65 days", "155 days"],
        answer: 1,
        explanation:
          "The cash operating cycle is inventory days plus receivables days minus payables days: 45 + 60 − 50 = 55 days.",
      },
      {
        id: "d4",
        type: "mcq",
        points: 1,
        moduleIndex: 1,
        prompt:
          "Annual demand is 40,000 units, the cost of placing an order is $50, and holding one unit for a year costs $4. What is the economic order quantity?",
        options: ["500 units", "707 units", "1,000 units", "2,000 units"],
        answer: 2,
        explanation:
          "EOQ = √(2 × ordering cost × annual demand / holding cost) = √(2 × 50 × 40,000 / 4) = √1,000,000 = 1,000 units. Leaving out the 2 gives 707 units.",
      },
      {
        id: "d5",
        type: "multi",
        points: 1,
        moduleIndex: 1,
        prompt:
          "Which of these would shorten a company's cash operating cycle? Select all that apply.",
        options: [
          "Offering customers an early settlement discount",
          "Taking longer credit from suppliers",
          "Holding more safety inventory",
          "Giving customers longer to pay",
        ],
        answer: [0, 1],
        explanation:
          "Collecting sooner and paying later both shorten the cycle, while more inventory and longer customer credit lengthen it. Taking longer credit can cost supplier goodwill or early payment discounts, so it is a trade-off rather than a free gain.",
      },
      {
        id: "d6",
        type: "mcq",
        points: 1,
        moduleIndex: 2,
        prompt:
          "A company's shares trade at $2.50 ex div. It has just paid a dividend of $0.20, and dividends are expected to grow at 4% a year. Using the dividend growth model, what is the cost of equity?",
        options: ["8.0%", "8.3%", "12.0%", "12.3%"],
        answer: 3,
        explanation:
          "Ke = D0(1 + g) / P0 + g = (0.20 × 1.04) / 2.50 + 0.04 = 0.0832 + 0.04 = 12.3%. Using the dividend just paid without growing it gives 12.0%.",
      },
      {
        id: "d7",
        type: "mcq",
        points: 1,
        moduleIndex: 2,
        prompt:
          "The risk-free rate is 3%, the return on the market is 9%, and a company's equity beta is 1.2. Using CAPM, what is the cost of equity?",
        options: ["7.2%", "10.2%", "10.8%", "13.8%"],
        answer: 1,
        explanation:
          "CAPM gives Rf + β(Rm − Rf) = 3% + 1.2 × (9% − 3%) = 10.2%. Multiplying the market return itself by beta gives 10.8%, and adding the risk-free rate to that gives 13.8%. Both skip the market risk premium.",
      },
      {
        id: "d8",
        type: "truefalse",
        points: 1,
        moduleIndex: 2,
        prompt:
          "Under Modigliani and Miller's theory with corporate tax, a company's weighted average cost of capital falls as its gearing increases.",
        options: ["True", "False"],
        answer: 0,
        explanation:
          "With corporate tax, interest is tax deductible, so debt carries a tax shield. The cost of equity still rises with gearing, but not by enough to offset the cheaper after-tax debt, so the WACC falls and the value of the company rises.",
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
  { id: "s1", assessmentId: "a-fr-groups", personId: "u-daniel", submittedAt: "2026-09-12T11:20:00+05:30", score: 47, status: "graded", minutesSpent: 45, attempt: 2, flags: ["Time limit reached"] },
  { id: "s2", assessmentId: "a-fr-groups", personId: "u-mei", submittedAt: "2026-09-13T18:04:00+05:30", score: 68, status: "graded", minutesSpent: 39, attempt: 1, flags: [] },
  { id: "s3", assessmentId: "a-fa-mock", personId: "u-rohan", submittedAt: "2026-08-30T10:40:00+05:30", score: 64, status: "graded", minutesSpent: 112, attempt: 1, flags: [] },
  { id: "s4", assessmentId: "a-fr-case", personId: "u-daniel", submittedAt: "2026-09-11T22:47:00+05:30", score: 22, status: "graded", minutesSpent: 0, attempt: 1, flags: [] },
  { id: "s5", assessmentId: "a-fr-case", personId: "u-mei", submittedAt: "2026-09-13T23:58:00+05:30", score: null, status: "awaiting_review", minutesSpent: 0, attempt: 1, flags: [] },
  { id: "s6", assessmentId: "a-pm-variance", personId: "u-lena", submittedAt: "2026-09-09T14:30:00+05:30", score: 23, status: "graded", minutesSpent: 0, attempt: 1, flags: [] },
  { id: "s7", assessmentId: "a-pm-variance", personId: "u-yusuf", submittedAt: "2026-09-14T08:20:00+05:30", score: null, status: "awaiting_review", minutesSpent: 0, attempt: 1, flags: ["Late by 4 days", "Late cap waived by Farah Siddiqui"] },
  { id: "s8", assessmentId: "a-pm-budgeting", personId: "u-anaya", submittedAt: "2026-09-08T16:22:00+05:30", score: 94, status: "graded", minutesSpent: 18, attempt: 1, flags: [] },
  { id: "s9", assessmentId: "a-epsm-final", personId: "u-sofia", submittedAt: "2026-08-28T10:05:00+05:30", score: 86, status: "graded", minutesSpent: 41, attempt: 1, flags: [] },
  { id: "s10", assessmentId: "a-epsm-final", personId: "u-omar", submittedAt: "", score: null, status: "missing", minutesSpent: 0, attempt: 0, flags: ["Not started · account not yet activated"] },
  { id: "s11", assessmentId: "a-epsm-final", personId: "u-mei", submittedAt: "2026-09-07T09:40:00+05:30", score: null, status: "awaiting_review", minutesSpent: 22, attempt: 1, flags: ["Manual review: short answer", "Blocking a certificate"] },
  { id: "s12", assessmentId: "a-pm-mock", personId: "u-lena", submittedAt: "2026-09-12T17:31:00+05:30", score: null, status: "awaiting_review", minutesSpent: 180, attempt: 1, flags: ["Manual review: Section C answer", "Response area slow to load · 19 minutes"] },
  { id: "s13", assessmentId: "a-pm-budgeting", personId: "u-yusuf", submittedAt: "", score: null, status: "in_progress", minutesSpent: 6, attempt: 1, flags: [] },
  { id: "s14", assessmentId: "a-pm-variance", personId: "u-anaya", submittedAt: "2026-09-09T21:15:00+05:30", score: 21, status: "graded", minutesSpent: 0, attempt: 1, flags: [] },
];
