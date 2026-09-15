import { addDays, createRng } from "./types";
import type { EscalationRule, Faq, RecurringProblem, Ticket, TicketCategory, TicketPriority, TicketStatus } from "./types";
import { staffName } from "./staff";
import { students } from "./students";

export const TICKET_CATEGORIES: TicketCategory[] = ["Registration", "Exemption", "Exam booking", "Payments", "Technical", "Academic", "Career"];

export const SLA_HOURS: Record<TicketPriority, number> = { urgent: 4, high: 24, medium: 48, low: 72 };

type TicketSeed = {
  subject: string;
  body: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  /** Student id, or a scenario tag / type used to pick a matching sample student. */
  who: string;
  assignee: string | null;
  daysAgo: number;
  channel?: Ticket["channel"];
  escalatedTo?: string;
};

const SEEDS: TicketSeed[] = [
  { subject: "Can I pay instalment 5 on 25 September?", body: "My salary is credited on the 24th. Can the instalment due on 20 September be paid on 25 September without a late fee?", category: "Payments", priority: "medium", status: "open", who: "s-anaya", assignee: "st-deepa", daysAgo: 0 },
  { subject: "PM reattempt: which entry window should I use?", body: "I failed PM in June and want to sit again in December. Is early entry still open and what does it cost?", category: "Exam booking", priority: "medium", status: "resolved", who: "s-anaya", assignee: "st-imran", daysAgo: 21 },
  { subject: "FA exam booking confirmation not received", body: "I booked FA for 18 November on 4 September but have not received the confirmation email.", category: "Exam booking", priority: "high", status: "resolved", who: "s-rohan", assignee: "st-imran", daysAgo: 10, channel: "whatsapp" },
  { subject: "Leaderboard points not updated after FA mock", body: "My FA mock exam on 5 September is not showing in the cohort leaderboard points.", category: "Technical", priority: "low", status: "in-progress", who: "s-rohan", assignee: "st-arjun", daysAgo: 8 },
  { subject: "ACCA registration stuck at document verification", body: "I uploaded my ID and mark sheets a week ago and the registration still says pending.", category: "Registration", priority: "high", status: "in-progress", who: "registration-pending", assignee: "st-imran", daysAgo: 4 },
  { subject: "Need my ACCA student ID added to the university record", body: "Brightwater needs my ACCA student ID for the semester record, but I am not registered yet.", category: "Registration", priority: "medium", status: "waiting-on-student", who: "unregistered", assignee: "st-imran", daysAgo: 6, channel: "email" },
  { subject: "Name on ACCA account differs from passport", body: "My ACCA account shows my middle name but my passport does not. Will this affect my exam booking?", category: "Registration", priority: "medium", status: "resolved", who: "fr-current", assignee: "st-imran", daysAgo: 26 },
  { subject: "Registration fee paid but status unchanged", body: "Paid the ACCA registration fee by card on the ACCA portal. The programme dashboard still shows not registered.", category: "Registration", priority: "high", status: "open", who: "new-graduate", assignee: null, daysAgo: 1 },
  { subject: "Which documents do I need for exemption evaluation?", body: "I have a B.Com degree certificate and five semester mark sheets. Do I also need the syllabus?", category: "Exemption", priority: "low", status: "resolved", who: "new-graduate", assignee: "st-imran", daysAgo: 7 },
  { subject: "LW exemption not showing on the ACCA portal", body: "The exemption team estimated LW but the ACCA portal only shows BT, MA and FA.", category: "Exemption", priority: "high", status: "in-progress", who: "docs-pending", assignee: "st-priya", daysAgo: 3 },
  { subject: "LW exemption rejected, what are my options?", body: "ACCA rejected my LW exemption. Can I appeal or should I book the exam?", category: "Exemption", priority: "medium", status: "resolved", who: "exempt-rejected", assignee: "st-priya", daysAgo: 18 },
  { subject: "Exemption fee not paid, is my exemption at risk?", body: "I have not paid the exemption fee to ACCA yet. What happens if I pay after the Dec 2026 entry deadline?", category: "Exemption", priority: "high", status: "open", who: "exempt-fee-unpaid", assignee: "st-imran", daysAgo: 2 },
  { subject: "FA on-demand date falls in university exams", body: "I booked FA for 2 December. Brightwater has exams from 23 November. Can I move it?", category: "Exam booking", priority: "urgent", status: "in-progress", who: "blackout-booking", assignee: "st-imran", daysAgo: 1, channel: "whatsapp" },
  { subject: "No FR December slot at my nearest centre", body: "The Hyderabad centre shows no availability on 8 December. Are other centres possible?", category: "Exam booking", priority: "medium", status: "waiting-on-student", who: "fr-weekday", assignee: "st-imran", daysAgo: 5 },
  { subject: "Move PM from Dec 2026 to Mar 2027", body: "I have fallen behind after missing classes and would like to move PM to March.", category: "Exam booking", priority: "medium", status: "escalated", who: "pm-reattempt", assignee: "st-imran", daysAgo: 4, escalatedTo: "st-aisha" },
  { subject: "Early entry deadline for December", body: "What is the last date for early entry for the December session?", category: "Exam booking", priority: "low", status: "resolved", who: "aa-current", assignee: "st-imran", daysAgo: 12 },
  { subject: "UPI payment not reflected", body: "Paid the August instalment by UPI on 5 August, reference 6021 8844 1290. It still shows overdue.", category: "Payments", priority: "high", status: "in-progress", who: "fees-overdue", assignee: "st-deepa", daysAgo: 3 },
  { subject: "Invoice needed for tuition payment", body: "My employer needs an invoice with GST details for the last two instalments.", category: "Payments", priority: "low", status: "resolved", who: "sbr-current", assignee: "st-deepa", daysAgo: 15, channel: "email" },
  { subject: "Refund after moving to the March reattempt cohort", body: "I moved from the December FR cohort to the March reattempt cohort. Is the price difference refunded?", category: "Payments", priority: "medium", status: "resolved", who: "refund", assignee: "st-deepa", daysAgo: 20 },
  { subject: "Late fee charged although paid on time", body: "I paid on 20 July but a late fee of ₹500 was added.", category: "Payments", priority: "medium", status: "open", who: "fr-current", assignee: "st-deepa", daysAgo: 2 },
  { subject: "Mock exam froze at question 12", body: "The FR progress test froze and I lost 10 minutes. The timer kept running.", category: "Technical", priority: "high", status: "resolved", who: "fr-current", assignee: "st-arjun", daysAgo: 9 },
  { subject: "Sunday FR class recording missing", body: "The recording for Sunday's FR class is not on the Live classes page yet.", category: "Technical", priority: "medium", status: "open", who: "fr-current", assignee: "st-imran", daysAgo: 0 },
  { subject: "Device check fails before proctored test", body: "Camera permission is granted but the device check says no camera found on Chrome.", category: "Technical", priority: "urgent", status: "resolved", who: "aa-current", assignee: "st-arjun", daysAgo: 14 },
  { subject: "Cannot sign in with university email", body: "Single sign-on with my Brightwater email loops back to the login page.", category: "Technical", priority: "high", status: "resolved", who: "ug-bw26", assignee: "st-arjun", daysAgo: 24 },
  { subject: "Goodwill with NCI at fair value", body: "Why is NCI at fair value added to consideration before deducting net assets? My university notes use the proportionate method.", category: "Academic", priority: "medium", status: "escalated", who: "ug-bw25", assignee: "st-imran", daysAgo: 2, escalatedTo: "st-marcus" },
  { subject: "Extra class on IFRS 16 before the mock", body: "Several of us in the weekend batch would like an extra session on sale and leaseback.", category: "Academic", priority: "low", status: "escalated", who: "fr-current", assignee: "st-priya", daysAgo: 6, escalatedTo: "st-marcus" },
  { subject: "Written case marks look wrong", body: "I think part of my interpretation section was not marked. Can it be checked?", category: "Academic", priority: "medium", status: "resolved", who: "fr-current", assignee: "st-imran", daysAgo: 11, escalatedTo: "st-marcus" },
  { subject: "Variance report feedback unclear", body: "The feedback says to link variances to controllability. Could the tutor give an example?", category: "Academic", priority: "low", status: "in-progress", who: "pm-reattempt", assignee: "st-imran", daysAgo: 5, escalatedTo: "st-farah" },
  { subject: "Resume review has been pending for a week", body: "I submitted my resume for review last Monday and have not heard back.", category: "Career", priority: "medium", status: "in-progress", who: "fm-fast", assignee: "st-rahul", daysAgo: 7 },
  { subject: "Am I eligible for internship listings?", body: "I am in Semester 3. The internship list shows most roles as not eligible.", category: "Career", priority: "low", status: "resolved", who: "ug-cl25", assignee: "st-meera", daysAgo: 16 },
  { subject: "Interview time clashes with FR class", body: "Ashgrove Audit Partners scheduled my interview on Saturday at 10:00, during FR class.", category: "Career", priority: "high", status: "resolved", who: "fr-current", assignee: "st-rahul", daysAgo: 13 },
  { subject: "Offer letter joining date change", body: "Can the placement team ask the employer to move my joining date after the December exams?", category: "Career", priority: "medium", status: "waiting-on-student", who: "placement-offer", assignee: "st-rahul", daysAgo: 3 },
  { subject: "Subscription renewal reminder shows overdue", body: "The dashboard says my ACCA subscription is overdue. I thought it was paid.", category: "Registration", priority: "high", status: "open", who: "sub-overdue", assignee: "st-imran", daysAgo: 1 },
  { subject: "Semester shows 1 instead of 3", body: "My profile shows Semester 1 although I am in Semester 3 at Coastline.", category: "Registration", priority: "medium", status: "resolved", who: "ug-cl25", assignee: "st-imran", daysAgo: 30 },
  { subject: "Record mismatch with university", body: "The university says my date of birth does not match their record.", category: "Registration", priority: "medium", status: "escalated", who: "verify-mismatch", assignee: "st-imran", daysAgo: 4, escalatedTo: "st-suresh" },
  { subject: "Result for TX not visible", body: "I sat TX in September. When will the result appear on the platform?", category: "Exam booking", priority: "low", status: "resolved", who: "results-pending", assignee: "st-imran", daysAgo: 3 },
  { subject: "Northfield workspace not opening", body: "The login page says the workspace is not active yet.", category: "Technical", priority: "medium", status: "resolved", who: "ug-nf26", assignee: "st-arjun", daysAgo: 5 },
  { subject: "Cannot find weekday batch for AA", body: "I want to switch to a weekday AA batch. Which one has seats?", category: "Academic", priority: "low", status: "resolved", who: "aa-current", assignee: "st-priya", daysAgo: 19 },
];

function pickStudent(who: string, used: Map<string, number>) {
  if (who.startsWith("s-")) return students.find((s) => s.id === who)!;
  const matches = students.filter((s) => s.id !== "s-anaya" && s.id !== "s-rohan" && s.scenarioTags.includes(who));
  const n = used.get(who) ?? 0;
  used.set(who, n + 1);
  return matches[n % matches.length];
}

function buildTickets(): Ticket[] {
  const rng = createRng(2041);
  const used = new Map<string, number>();
  return SEEDS.map((seed, i) => {
    const student = pickStudent(seed.who, used);
    const createdDate = addDays("2026-09-14", -seed.daysAgo);
    const created = `${createdDate}T${String(9 + (i % 9)).padStart(2, "0")}:${String((i * 17) % 60).padStart(2, "0")}`;
    const responded = seed.assignee !== null && !(seed.status === "open" && seed.daysAgo === 0);
    const firstResponseMins = responded ? rng.int(8, seed.priority === "urgent" ? 45 : 220) : null;
    const resolutionHours = seed.status === "resolved" ? rng.int(seed.priority === "urgent" ? 2 : 4, seed.priority === "low" ? 70 : 44) : null;
    const actor = seed.assignee ? staffName(seed.assignee) : "Unassigned";
    const history: Ticket["history"] = [{ id: "h1", at: created, actor: student.name, action: "Raised ticket", note: seed.channel ? `Via ${seed.channel}` : undefined }];
    if (responded) {
      history.push({ id: "h2", at: created, actor: "System", action: `Categorised as ${seed.category} and assigned to ${actor}` });
      history.push({ id: "h3", at: created, actor, action: "First response sent", note: `${firstResponseMins} minutes after the ticket was raised` });
    }
    if (seed.escalatedTo) {
      history.push({ id: "h4", at: addDays(createdDate, Math.min(1, seed.daysAgo)), actor, action: `Escalated to ${staffName(seed.escalatedTo)}`, note: seed.category === "Academic" ? "Academic question, faculty to answer" : "Needs decision outside support" });
    }
    if (seed.status === "waiting-on-student") history.push({ id: "h5", at: addDays(createdDate, 1), actor, action: "Asked the learner for more information" });
    if (seed.status === "resolved") history.push({ id: "h6", at: addDays(createdDate, Math.ceil((resolutionHours ?? 24) / 24)), actor, action: "Resolved", note: "Learner confirmed the answer" });
    const updated = history[history.length - 1].at;
    return {
      id: `TK-${2041 + i}`,
      subject: seed.subject,
      body: seed.body,
      category: seed.category,
      priority: seed.priority,
      status: seed.status,
      studentId: student.id,
      universityId: student.universityId,
      assigneeId: seed.assignee,
      channel: seed.channel ?? "portal",
      created,
      updated: updated.length === 10 ? `${updated}T17:30` : updated,
      firstResponseMins,
      resolutionHours,
      slaHours: SLA_HOURS[seed.priority],
      escalatedTo: seed.escalatedTo,
      history,
    };
  }).sort((a, b) => b.created.localeCompare(a.created));
}

export const tickets: Ticket[] = buildTickets();

export function ticketById(id: string) {
  return tickets.find((t) => t.id === id);
}

export function ticketsForStudent(studentId: string) {
  return tickets.filter((t) => t.studentId === studentId);
}

export function ticketsForUniversity(universityId: string) {
  return tickets.filter((t) => t.universityId === universityId);
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  "waiting-on-student": "Waiting on learner",
  escalated: "Escalated",
  resolved: "Resolved",
};

/** Turnaround summary for the support dashboard. */
export const supportTurnaround = (() => {
  const responded = tickets.filter((t) => t.firstResponseMins !== null);
  const resolved = tickets.filter((t) => t.resolutionHours !== null);
  const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
  return {
    open: tickets.filter((t) => t.status !== "resolved").length,
    avgFirstResponseMins: avg(responded.map((t) => t.firstResponseMins!)),
    avgResolutionHours: avg(resolved.map((t) => t.resolutionHours!)),
    withinSlaPct: Math.round((resolved.filter((t) => (t.resolutionHours ?? 0) <= t.slaHours).length / Math.max(1, resolved.length)) * 100),
    weekly: [
      { week: "17 Aug", raised: 31, resolved: 28, avgResolutionHours: 26 },
      { week: "24 Aug", raised: 38, resolved: 33, avgResolutionHours: 24 },
      { week: "31 Aug", raised: 44, resolved: 39, avgResolutionHours: 22 },
      { week: "7 Sep", raised: 52, resolved: 47, avgResolutionHours: 19 },
    ],
  };
})();

export const faqs: Faq[] = [
  { id: "faq-01", question: "How are exemptions decided?", answer: "The exemption team reviews your qualification documents and records an estimate. Your claim is then submitted to ACCA, which confirms the final exemptions. ACCA charges an exemption fee for each exempt paper.", category: "Exemption", audience: "graduate", views: 1840, helpfulPct: 91, updated: "2026-08-02", status: "published" },
  { id: "faq-02", question: "Which documents do I need for exemption evaluation?", answer: "Your degree certificate, all semester mark sheets and, for LW, the syllabus of your law subjects. Upload clear scans on the Exemptions page.", category: "Exemption", audience: "graduate", views: 1422, helpfulPct: 88, updated: "2026-09-08", status: "published" },
  { id: "faq-03", question: "When is the ACCA annual subscription due?", answer: "Every 1 January. Pay it on the ACCA portal and the team records it here. An unpaid subscription can stop you booking exams.", category: "Registration", audience: "all", views: 2310, helpfulPct: 94, updated: "2026-01-05", status: "published" },
  { id: "faq-04", question: "What are the early, standard and late entry deadlines for Dec 2026?", answer: "Early entry closes 5 October 2026, standard entry 2 November 2026 and late entry 16 November 2026. Fees rise after each deadline.", category: "Exam booking", audience: "all", views: 2980, helpfulPct: 96, updated: "2026-09-01", status: "published" },
  { id: "faq-05", question: "Can I book an on-demand exam during university examinations?", answer: "The platform warns you if a date falls in your university's examination blackout. Book before or after the blackout period.", category: "Exam booking", audience: "undergraduate", views: 864, helpfulPct: 90, updated: "2026-09-08", status: "published" },
  { id: "faq-06", question: "When will my Sep 2026 results appear?", answer: "ACCA releases Sep 2026 results on 12 October 2026. The programme team records them on the platform within 48 hours.", category: "Exam booking", audience: "all", views: 1205, helpfulPct: 85, updated: "2026-09-11", status: "published" },
  { id: "faq-07", question: "How do I pay an instalment offline?", answer: "Pay by bank transfer or cheque and send the reference to Finance Operations. An authorised team member records it and a receipt is issued.", category: "Payments", audience: "all", views: 976, helpfulPct: 82, updated: "2026-07-20", status: "published" },
  { id: "faq-08", question: "Is there a late fee for missed instalments?", answer: "A late fee applies after the grace period for your fee plan. Contact support before the due date if you need more time.", category: "Payments", audience: "all", views: 1120, helpfulPct: 79, updated: "2026-06-14", status: "published" },
  { id: "faq-09", question: "My proctored test device check fails. What should I do?", answer: "Use Chrome or Edge, allow camera and microphone, close other apps using the camera and restart the browser. If it still fails, raise a Technical ticket.", category: "Technical", audience: "all", views: 1634, helpfulPct: 87, updated: "2026-08-30", status: "published" },
  { id: "faq-10", question: "Where are class recordings?", answer: "Recordings appear on the Live classes page, usually within 24 hours of the class.", category: "Technical", audience: "all", views: 2104, helpfulPct: 93, updated: "2026-05-18", status: "published" },
  { id: "faq-11", question: "Who can see the career centre jobs?", answer: "Jobs are open to placement-eligible learners. Internships are also open to undergraduates from Semester 3 when the eligibility rules match.", category: "Career", audience: "all", views: 1388, helpfulPct: 84, updated: "2026-08-12", status: "published" },
  { id: "faq-12", question: "How is the joint certificate awarded?", answer: "Brightwater learners need Applied Knowledge complete, LW passed, at least 75% attendance in ACCA sessions and no overdue fees. Your checklist is on the Certificates page.", category: "Academic", audience: "undergraduate", views: 642, helpfulPct: 92, updated: "2026-09-02", status: "published" },
  { id: "faq-13", question: "Can I change my batch mid-cohort?", answer: "Yes, if the target batch has seats. Request it on Batches and cohorts. Changes take effect from the next week.", category: "Academic", audience: "graduate", views: 0, helpfulPct: 0, updated: "2026-09-13", status: "draft" },
];

export const recurringProblems: RecurringProblem[] = [
  { id: "rp-01", title: "UPI payments not reflecting for 48 hours", category: "Payments", count30d: 23, trend: [2, 3, 4, 5, 4, 5], rootCause: "Settlement file from the payment gateway arrives a day late, so reconciliation marks instalments overdue.", ownerId: "st-deepa", status: "fix-in-progress", fix: "Match on gateway reference in real time instead of the settlement file.", linkedTicketIds: tickets.filter((t) => t.category === "Payments" && t.status !== "resolved").map((t) => t.id) },
  { id: "rp-02", title: "Device check fails on Chrome camera permission", category: "Technical", count30d: 17, trend: [1, 2, 5, 4, 3, 2], rootCause: "A browser update changed how camera permission is reported to the proctoring check.", ownerId: "st-arjun", status: "monitoring", fix: "Proctoring integration updated on 2 Sep. Watching for a week.", linkedTicketIds: tickets.filter((t) => t.subject.startsWith("Device check")).map((t) => t.id) },
  { id: "rp-03", title: "LW exemption estimate differs from ACCA decision", category: "Exemption", count30d: 11, trend: [1, 1, 2, 2, 3, 2], rootCause: "Law subject syllabus not collected before submission, so ACCA decides on the degree title alone.", ownerId: "st-priya", status: "investigating", fix: "Make the law syllabus a required document before an LW estimate.", linkedTicketIds: tickets.filter((t) => t.category === "Exemption").map((t) => t.id) },
  { id: "rp-04", title: "On-demand bookings inside university blackout", category: "Exam booking", count30d: 8, trend: [0, 0, 1, 2, 2, 3], rootCause: "Learners book on the ACCA portal before checking the university calendar.", ownerId: "st-imran", status: "fix-in-progress", fix: "Blackout warning on Exams and bookings, plus a WhatsApp reminder to Semester 3 learners.", linkedTicketIds: tickets.filter((t) => t.subject.includes("university exams")).map((t) => t.id) },
  { id: "rp-05", title: "Weekend recordings published late", category: "Technical", count30d: 9, trend: [1, 2, 1, 2, 1, 2], rootCause: "Sunday recordings wait for manual upload on Monday.", ownerId: "st-marcus", status: "resolved", fix: "Automatic upload from the video integration enabled for weekend batches.", linkedTicketIds: tickets.filter((t) => t.subject.includes("recording")).map((t) => t.id) },
];

export const escalationMatrix: EscalationRule[] = [
  { id: "esc-registration", category: "Registration", trigger: "Registration pending more than 10 days or ACCA ID mismatch", levels: [{ level: 1, team: "Student support", ownerId: "st-imran", slaHours: 24 }, { level: 2, team: "ACCA programme lead", ownerId: "st-priya", slaHours: 48 }, { level: 3, team: "Platform director", ownerId: "st-neha", slaHours: 72 }] },
  { id: "esc-exemption", category: "Exemption", trigger: "ACCA decision differs from estimate, or fee unpaid within 14 days of an entry deadline", levels: [{ level: 1, team: "Student support", ownerId: "st-imran", slaHours: 24 }, { level: 2, team: "ACCA programme lead", ownerId: "st-priya", slaHours: 48 }, { level: 3, team: "Platform director", ownerId: "st-neha", slaHours: 96 }] },
  { id: "esc-exam-booking", category: "Exam booking", trigger: "Booking inside a blackout, or within 7 days of an entry deadline", levels: [{ level: 1, team: "Student support", ownerId: "st-imran", slaHours: 8 }, { level: 2, team: "ACCA programme lead", ownerId: "st-priya", slaHours: 24 }, { level: 3, team: "Platform director", ownerId: "st-neha", slaHours: 48 }] },
  { id: "esc-payments", category: "Payments", trigger: "Payment not reflected after 48 hours, refund above ₹25,000, or disputed late fee", levels: [{ level: 1, team: "Finance operations", ownerId: "st-deepa", slaHours: 24 }, { level: 2, team: "ACCA programme lead", ownerId: "st-priya", slaHours: 48 }, { level: 3, team: "Platform director", ownerId: "st-neha", slaHours: 72 }] },
  { id: "esc-technical", category: "Technical", trigger: "Assessment or live class blocked for more than one learner", levels: [{ level: 1, team: "Student support", ownerId: "st-imran", slaHours: 4 }, { level: 2, team: "Technology administration", ownerId: "st-arjun", slaHours: 8 }, { level: 3, team: "Platform director", ownerId: "st-neha", slaHours: 24 }] },
  { id: "esc-academic", category: "Academic", trigger: "Subject question support cannot answer, or a marking dispute", levels: [{ level: 1, team: "Student support", ownerId: "st-imran", slaHours: 24 }, { level: 2, team: "Paper faculty", ownerId: "st-marcus", slaHours: 48 }, { level: 3, team: "ACCA programme lead", ownerId: "st-priya", slaHours: 72 }] },
  { id: "esc-career", category: "Career", trigger: "Employer escalation, offer dispute or interview clash", levels: [{ level: 1, team: "Placement team", ownerId: "st-rahul", slaHours: 24 }, { level: 2, team: "ACCA programme lead", ownerId: "st-priya", slaHours: 48 }, { level: 3, team: "Platform director", ownerId: "st-neha", slaHours: 72 }] },
];
