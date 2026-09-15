export const COMPETENCIES = [
  "Technical knowledge",
  "Communication",
  "Commercial awareness",
  "Ethics and professional judgement",
] as const;

export type CompetencyName = (typeof COMPETENCIES)[number];

export type InterviewQuestion = {
  id: string;
  competency: CompetencyName;
  text: string;
  followUp: string;
};

export const INTERVIEW_TRACKS = [
  "Audit associate",
  "Financial reporting analyst",
  "FP&A analyst",
  "Management accountant",
  "Tax associate (UK tax)",
] as const;

export type InterviewTrack = (typeof INTERVIEW_TRACKS)[number];

export function trackFor(role: string): InterviewTrack {
  const r = role.toLowerCase();
  if (r.includes("audit")) return "Audit associate";
  if (r.includes("fp&a") || r.includes("planning")) return "FP&A analyst";
  if (r.includes("management accountant") || r.includes("costing")) return "Management accountant";
  if (r.includes("tax")) return "Tax associate (UK tax)";
  return "Financial reporting analyst";
}

export const QUESTION_BANK: Record<InterviewTrack, InterviewQuestion[]> = {
  "Audit associate": [
    { id: "aud-1", competency: "Technical knowledge", text: "Walk me through how you would test the existence of trade receivables at the year end.", followUp: "A customer does not reply to the confirmation. What do you do next?" },
    { id: "aud-2", competency: "Technical knowledge", text: "What is the difference between tests of controls and substantive procedures, and when would you rely on controls?", followUp: "Which control would you test first for purchases?" },
    { id: "aud-3", competency: "Commercial awareness", text: "A manufacturing client's inventory has grown 40% while revenue is flat. What risks does that raise for the audit?", followUp: "Which procedures would you add to the plan?" },
    { id: "aud-4", competency: "Communication", text: "Explain materiality to a client's finance manager who thinks the audit team is being too picky.", followUp: "How would you put it in one sentence?" },
    { id: "aud-5", competency: "Ethics and professional judgement", text: "The client's CFO offers you a staff discount at their stores during fieldwork. How do you respond?", followUp: "Which fundamental principle is at risk?" },
    { id: "aud-6", competency: "Communication", text: "Tell me about a time you found an error in someone else's work. What did you do?", followUp: "What did you learn about raising issues early?" },
  ],
  "Financial reporting analyst": [
    { id: "fr-1", competency: "Technical knowledge", text: "Talk me through calculating goodwill on acquisition when non-controlling interest is measured at fair value.", followUp: "What changes if NCI is measured at its share of net assets?" },
    { id: "fr-2", competency: "Technical knowledge", text: "How does IFRS 15 decide when revenue is recognised on a contract with several performance obligations?", followUp: "How do you allocate the transaction price?" },
    { id: "fr-3", competency: "Technical knowledge", text: "What adjustment do you make for intra-group sales when the inventory is still held at the year end?", followUp: "Who bears the unrealised profit when the subsidiary is the seller?" },
    { id: "fr-4", competency: "Commercial awareness", text: "Gross margin fell 3 points this quarter. Which lines in the statements would you look at first?", followUp: "What would you ask the business before concluding?" },
    { id: "fr-5", competency: "Ethics and professional judgement", text: "Your manager asks you to delay recording an impairment until after the covenant test date. What do you do?", followUp: "Who would you escalate to?" },
    { id: "fr-6", competency: "Communication", text: "Summarise the month-end close you run today in two minutes.", followUp: "Which step would you automate first?" },
  ],
  "FP&A analyst": [
    { id: "fpa-1", competency: "Technical knowledge", text: "Explain the difference between a sales price variance and a sales volume variance.", followUp: "Which one should the sales team own?" },
    { id: "fpa-2", competency: "Technical knowledge", text: "How would you build a rolling forecast for a business with seasonal demand?", followUp: "How often would you reforecast?" },
    { id: "fpa-3", competency: "Commercial awareness", text: "Raw material costs are up 12%. How would you show the impact to the leadership team?", followUp: "What levers would you put in front of them?" },
    { id: "fpa-4", competency: "Communication", text: "How do you present a budget miss to a business head who disagrees with the numbers?", followUp: "What if they ask you to change the forecast?" },
    { id: "fpa-5", competency: "Ethics and professional judgement", text: "A sales head asks you to move revenue between months to hit a target. What do you do?", followUp: "How do you keep the relationship working?" },
  ],
  "Management accountant": [
    { id: "ma-1", competency: "Technical knowledge", text: "When is activity-based costing more useful than traditional absorption costing?", followUp: "What does it cost the business to run?" },
    { id: "ma-2", competency: "Technical knowledge", text: "How would you decide whether to make or buy a component using relevant costing?", followUp: "Which non-financial factors would you add?" },
    { id: "ma-3", competency: "Commercial awareness", text: "Which three KPIs would you track for route profitability in a logistics business?", followUp: "How would you show them on one page?" },
    { id: "ma-4", competency: "Communication", text: "Explain contribution margin to an operations manager with no finance background.", followUp: "Give an example from their own depot." },
    { id: "ma-5", competency: "Ethics and professional judgement", text: "You find a cost centre has been miscoded for months, which protected a manager's bonus. How do you raise it?", followUp: "What evidence would you gather first?" },
  ],
  "Tax associate (UK tax)": [
    { id: "tx-1", competency: "Technical knowledge", text: "Walk me through computing taxable total profits for a UK company.", followUp: "Where do chargeable gains fit in?" },
    { id: "tx-2", competency: "Technical knowledge", text: "How are capital gains taxed for a UK company compared with an individual?", followUp: "Which reliefs are available to each?" },
    { id: "tx-3", competency: "Commercial awareness", text: "A client wants to extract profits as salary or dividends. What factors matter?", followUp: "How does NIC change the answer?" },
    { id: "tx-4", competency: "Communication", text: "How would you explain a late filing penalty to an anxious client?", followUp: "What would you put in the follow-up email?" },
    { id: "tx-5", competency: "Ethics and professional judgement", text: "A client asks you not to disclose rental income they received in cash. How do you respond?", followUp: "What are your obligations if they refuse?" },
  ],
};
