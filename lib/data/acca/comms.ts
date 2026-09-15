import { ACCA_TODAY, addDays } from "./types";
import type { Announcement, ChannelConfig, Doubt, MessageTemplate, StudentNotification } from "./types";
import { paperByCode } from "./papers";
import { studentsInCohort } from "./students";
import { universityAnnouncements } from "./universities";

/* ------------------------------------------------------------------------------------------
 * Announcements (all audiences; university ones come from universities.ts)
 * ---------------------------------------------------------------------------------------- */

const generalAnnouncements: Announcement[] = [
  { id: "an-all-01", title: "Dec 2026 early entry closes 5 October", body: "Book December exams before 5 October to pay the early entry fee. Standard entry closes 2 November and late entry 16 November.", audience: "all", audienceLabel: "All learners", authorId: "st-priya", publishedOn: "2026-09-08", status: "published", channels: ["in-app", "email", "whatsapp"], category: "Exams", pinned: true, readPct: 81 },
  { id: "an-all-02", title: "Sep 2026 results are released on 12 October", body: "Results will be recorded on your Exams and results page within 48 hours of release. Mentors will contact anyone who needs a reattempt plan.", audience: "all", audienceLabel: "All learners", authorId: "st-priya", publishedOn: "2026-09-11", status: "published", channels: ["in-app", "email"], category: "Exams", readPct: 64 },
  { id: "an-all-03", title: "Audit hiring drive with Ashgrove Audit Partners", body: "Six audit associate roles in Bengaluru and ten winter audit internships in Pune. Placement-eligible learners can apply from the Career centre until 30 September.", audience: "all", audienceLabel: "All learners", authorId: "st-rahul", publishedOn: "2026-09-05", status: "published", channels: ["in-app", "email"], category: "Careers", readPct: 58 },
  { id: "an-all-04", title: "ACCA annual subscription reminders", body: "Your ACCA annual subscription is due on 1 January 2027. We will remind you from 1 December.", audience: "all", audienceLabel: "All registered learners", authorId: "st-imran", publishedOn: "2026-12-01", status: "draft", channels: ["in-app", "email"], category: "Operations" },
  { id: "an-prog-01", title: "Orientation for the September 2026 intake", body: "Orientation is on Saturday 19 September at 10:00 online. We will cover exemptions, ACCA registration, cohort selection and the platform.", audience: "programme", audienceId: "pr-graduate", audienceLabel: "ACCA Graduate Pathway · September 2026 intake", authorId: "st-priya", publishedOn: "2026-09-15", status: "scheduled", channels: ["in-app", "email", "whatsapp"], category: "Operations" },
  { id: "an-prog-02", title: "Complete EPSM before sitting SBL", body: "Strategic Professional learners should finish the Ethics and Professional Skills Module before their SBL session. Check your EPSM progress on the ACCA journey page.", audience: "programme", audienceId: "pr-strategic", audienceLabel: "Strategic Professional Track", authorId: "st-priya", publishedOn: "2026-09-02", status: "published", channels: ["in-app"], category: "Academic", readPct: 72 },
  { id: "an-prog-03", title: "Planning two papers per session", body: "Fast Track learners sitting PM and FM together in Dec 2026 should book both before early entry closes.", audience: "programme", audienceId: "pr-fasttrack", audienceLabel: "ACCA Fast Track", authorId: "st-priya", publishedOn: "2026-09-16", status: "draft", channels: ["in-app", "email"], category: "Exams" },
  { id: "an-coh-01", title: "FR mock exam on Saturday 24 October", body: "The Dec 2026 FR mock is proctored and runs 180 minutes. Complete the device check by 22 October. Group accounts revision notes are now published.", audience: "cohort", audienceId: "co-fr-dec26-wkd", audienceLabel: "FR · Dec 2026 · Weekend", authorId: "st-marcus", publishedOn: "2026-09-10", status: "published", channels: ["in-app", "email"], category: "Academic", pinned: true, readPct: 77 },
  { id: "an-coh-02", title: "Extra PM class on mix and yield variances", body: "An extra 90-minute class on mix and yield variances runs on Thursday 17 September at 20:00, before the doubt-clearing session.", audience: "cohort", audienceId: "co-pm-dec26-rev", audienceLabel: "PM Revision and Reattempt · Dec 2026", authorId: "st-farah", publishedOn: "2026-09-12", status: "published", channels: ["in-app", "whatsapp"], category: "Academic", readPct: 69 },
  { id: "an-coh-03", title: "AA class moves to Thursday this week", body: "Friday's AA class moves to Thursday 17 September, same time. The recording will be up the same night.", audience: "cohort", audienceId: "co-aa-dec26-eve", audienceLabel: "AA · Dec 2026 · Weekday evening", authorId: "st-hana", publishedOn: "2026-09-13", status: "published", channels: ["in-app", "whatsapp"], category: "Academic", readPct: 55 },
];

export const announcements: Announcement[] = [...generalAnnouncements, ...universityAnnouncements].sort((a, b) =>
  b.publishedOn.localeCompare(a.publishedOn),
);

export function announcementsFor(opts: { programmeId?: string; universityId?: string; cohortIds?: string[] }) {
  return announcements.filter(
    (a) =>
      a.status === "published" &&
      (a.audience === "all" ||
        (a.audience === "programme" && a.audienceId === opts.programmeId) ||
        (a.audience === "university" && a.audienceId === opts.universityId) ||
        (a.audience === "cohort" && !!a.audienceId && (opts.cohortIds ?? []).includes(a.audienceId))),
  );
}

export const programmeResources = [
  { id: "res-01", title: "ACCA exemption document checklist", kind: "Guide", audience: "Graduate learners", owner: "st-imran", updated: "2026-09-08", size: "2 pages", downloads: 412 },
  { id: "res-02", title: "Dec 2026 exam entry timeline", kind: "Timetable", audience: "All learners", owner: "st-priya", updated: "2026-09-01", size: "1 page", downloads: 988 },
  { id: "res-03", title: "Brightwater semester and ACCA calendar 2026-27", kind: "Timetable", audience: "Brightwater University", owner: "st-priya", updated: "2026-07-02", size: "3 pages", downloads: 604 },
  { id: "res-04", title: "CBE exam day guide", kind: "Guide", audience: "All learners", owner: "st-priya", updated: "2026-06-20", size: "4 pages", downloads: 1210 },
  { id: "res-05", title: "Refund and cohort transfer policy", kind: "Policy", audience: "All learners", owner: "st-deepa", updated: "2026-04-01", size: "2 pages", downloads: 233 },
  { id: "res-06", title: "PER supervisor briefing", kind: "Guide", audience: "Graduate learners", owner: "st-priya", updated: "2026-05-14", size: "3 pages", downloads: 187 },
  { id: "res-07", title: "Weekly study planner template", kind: "Template", audience: "All learners", owner: "st-aisha", updated: "2026-08-10", size: "XLSX", downloads: 741 },
];

/* ------------------------------------------------------------------------------------------
 * Student notifications (the two demo students)
 * ---------------------------------------------------------------------------------------- */

export const studentNotifications: StudentNotification[] = [
  { id: "nt-a-01", studentId: "s-anaya", title: "Instalment 5 due on 20 Sep", body: "₹24,500 for the Graduate Pathway plan is due in 6 days.", at: "2026-09-14T09:00", kind: "payment", read: false, href: "/payments" },
  { id: "nt-a-02", studentId: "s-anaya", title: "Mentoring session today at 19:30", body: "Aisha Khan: PM reattempt plan and FR mock 1 review.", at: "2026-09-14T08:30", kind: "mentor", read: false, href: "/my-mentor" },
  { id: "nt-a-03", studentId: "s-anaya", title: "Book PM before early entry closes", body: "Your PM reattempt for Dec 2026 is not booked. Early entry closes 5 Oct.", at: "2026-09-13T18:00", kind: "exam", read: false, href: "/exams" },
  { id: "nt-a-04", studentId: "s-anaya", title: "Your doubt on goodwill was answered", body: "Marcus Bell replied to your question about NCI at fair value.", at: "2026-09-13T11:42", kind: "doubt", read: true, href: "/doubts" },
  { id: "nt-a-05", studentId: "s-anaya", title: "Recording ready: consolidated statement of financial position", body: "Saturday batch recording is available.", at: "2026-09-12T19:10", kind: "class", read: true, href: "/classes" },
  { id: "nt-a-06", studentId: "s-anaya", title: "FR mock exam on 24 October", body: "Proctored, 180 minutes. Complete the device check by 22 October.", at: "2026-09-10T17:00", kind: "announcement", read: true, href: "/mocks" },
  { id: "nt-a-07", studentId: "s-anaya", title: "Resume received by the placement team", body: "Rahul Verma will review your resume for audit associate roles.", at: "2026-09-10T15:20", kind: "career", read: true, href: "/careers/resume" },
  { id: "nt-a-08", studentId: "s-anaya", title: "New job matching your profile", body: "Audit associate at Ashgrove Audit Partners, Bengaluru.", at: "2026-09-05T10:00", kind: "career", read: true, href: "/careers/jobs" },
  { id: "nt-a-09", studentId: "s-anaya", title: "FR booked for Dec 2026", body: "Early entry confirmed. Exam fee £256 recorded as paid to ACCA.", at: "2026-09-02T14:05", kind: "exam", read: true, href: "/exams" },
  { id: "nt-a-10", studentId: "s-anaya", title: "Readiness score updated", body: "FR readiness rose to 64 after mock exam 1.", at: "2026-08-23T09:00", kind: "result", read: true, href: "/readiness" },
  { id: "nt-r-01", studentId: "s-rohan", title: "No ACCA classes 23 Nov to 12 Dec", body: "Brightwater University: classes and mocks pause during university examinations.", at: "2026-09-14T08:00", kind: "announcement", read: false, href: "/my-university" },
  { id: "nt-r-02", studentId: "s-rohan", title: "LW class today at 14:00", body: "Section A · Commerce Block, C-204 · Vikram Joshi.", at: "2026-09-14T07:30", kind: "class", read: false, href: "/classes" },
  { id: "nt-r-03", studentId: "s-rohan", title: "You moved to rank 4 in your cohort", body: "Brightwater 2025 intake leaderboard, 4 of 71.", at: "2026-09-13T20:00", kind: "result", read: false, href: "/leaderboard" },
  { id: "nt-r-04", studentId: "s-rohan", title: "Mentor check-in on 16 Sep", body: "Nikhil Bose: FA exam readiness and LW plan.", at: "2026-09-12T12:00", kind: "mentor", read: true, href: "/my-mentor" },
  { id: "nt-r-05", studentId: "s-rohan", title: "Book FA before 20 November", body: "Brightwater University announcement: book on-demand FA before the blackout.", at: "2026-09-08T10:00", kind: "announcement", read: true, href: "/my-university" },
  { id: "nt-r-06", studentId: "s-rohan", title: "FA mock exam scored 70%", body: "Readiness for FA is now 72.", at: "2026-09-05T13:30", kind: "result", read: true, href: "/mocks" },
  { id: "nt-r-07", studentId: "s-rohan", title: "FA exam booked for 18 Nov 2026", body: "On-demand CBE at the Pune centre. Fee £133 recorded as paid to ACCA.", at: "2026-09-04T16:45", kind: "exam", read: true, href: "/exams" },
  { id: "nt-r-08", studentId: "s-rohan", title: "Joint certificate: on track", body: "You need FA and LW to meet the exam criteria.", at: "2026-09-01T09:00", kind: "announcement", read: true, href: "/certificates" },
  { id: "nt-r-09", studentId: "s-rohan", title: "Your doubt on suspense accounts was answered", body: "Grace Whitfield replied with a worked example.", at: "2026-08-29T18:20", kind: "doubt", read: true, href: "/doubts" },
];

export function notificationsForStudent(studentId: string) {
  return studentNotifications.filter((n) => n.studentId === studentId);
}

/* ------------------------------------------------------------------------------------------
 * Channels and templates (Super Admin: configure communication channels)
 * ---------------------------------------------------------------------------------------- */

export const communicationChannels: ChannelConfig[] = [
  { id: "in-app", name: "In-app notifications", provider: "ACCA LMS", status: "connected", sender: "ACCA LMS", quietHours: "None", dailyCapPerStudent: 20, sent30d: 48210, deliveryRate: 100, useFor: ["Classes", "Exams", "Results", "Mentoring", "Announcements"] },
  { id: "email", name: "Email", provider: "SendGrid", status: "connected", sender: "acca@zskillup.com", quietHours: "None", dailyCapPerStudent: 5, sent30d: 21480, deliveryRate: 98.6, useFor: ["Receipts", "Exam bookings", "Announcements", "Reports"] },
  { id: "whatsapp", name: "WhatsApp", provider: "WhatsApp Business Platform", status: "connected", sender: "+91 80 4718 2200 (ZSkillup ACCA)", quietHours: "21:30 to 08:00 IST", dailyCapPerStudent: 3, sent30d: 16930, deliveryRate: 97.2, useFor: ["Payment reminders", "Class changes", "Mentor reminders"] },
  { id: "sms", name: "SMS", provider: "MSG91", status: "paused", sender: "ZSKACC", quietHours: "21:00 to 09:00 IST", dailyCapPerStudent: 2, sent30d: 1240, deliveryRate: 94.8, useFor: ["One-time codes", "Exam day alerts"] },
  { id: "push", name: "Mobile push", provider: "Firebase Cloud Messaging", status: "not-configured", sender: "ACCA LMS app", quietHours: "22:00 to 07:00 IST", dailyCapPerStudent: 6, sent30d: 0, deliveryRate: 0, useFor: [] },
];

export const messageTemplates: MessageTemplate[] = [
  { id: "tpl-fee-due", name: "Instalment due", channel: "whatsapp", category: "Payments", body: "Hi {{first_name}}, instalment {{instalment_no}} of {{amount}} for {{plan_name}} is due on {{due_date}}. Pay from Payments in ACCA LMS.", status: "approved", lastUsed: "2026-09-13" },
  { id: "tpl-fee-overdue", name: "Instalment overdue", channel: "whatsapp", category: "Payments", body: "Hi {{first_name}}, instalment {{instalment_no}} of {{amount}} was due on {{due_date}}. Reply HELP if you need to talk to Finance Operations.", status: "approved", lastUsed: "2026-09-12" },
  { id: "tpl-class-reminder", name: "Class reminder", channel: "whatsapp", category: "Classes", body: "{{paper}} class today at {{time}}: {{topic}}. Join: {{link}}", status: "approved", lastUsed: "2026-09-14" },
  { id: "tpl-recording-ready", name: "Recording ready", channel: "in-app", category: "Classes", body: "The recording of {{topic}} is ready to watch.", status: "approved", lastUsed: "2026-09-13" },
  { id: "tpl-entry-deadline", name: "Exam entry deadline", channel: "email", category: "Exams", body: "{{session}} {{window}} entry closes on {{date}}. You have {{papers}} planned and not booked.", status: "approved", lastUsed: "2026-09-08" },
  { id: "tpl-results", name: "Results recorded", channel: "email", category: "Exams", body: "Your {{session}} result for {{paper}} has been recorded: {{score}}%.", status: "approved", lastUsed: "2026-07-15" },
  { id: "tpl-mentor-checkin", name: "Mentor check-in", channel: "whatsapp", category: "Mentoring", body: "Hi {{first_name}}, {{mentor_name}} here. Can we talk for 20 minutes this week about {{topic}}?", status: "approved", lastUsed: "2026-09-12" },
  { id: "tpl-exemption-docs", name: "Exemption documents needed", channel: "email", category: "Exemptions", body: "To complete your exemption evaluation we still need: {{documents}}. Upload them on the Exemptions page.", status: "approved", lastUsed: "2026-09-09" },
  { id: "tpl-interview", name: "Interview scheduled", channel: "email", category: "Careers", body: "Your {{round}} with {{company}} is on {{date}} ({{mode}}).", status: "approved", lastUsed: "2026-09-11" },
  { id: "tpl-blackout", name: "Blackout booking warning", channel: "whatsapp", category: "University", body: "Your {{paper}} exam on {{date}} falls in {{university}} examinations ({{blackout}}). Please rebook before {{blackout_start}}.", status: "pending", lastUsed: "2026-09-13" },
  { id: "tpl-university-announcement", name: "University announcement", channel: "email", category: "University", body: "{{university}}: {{title}}. {{body}}", status: "approved", lastUsed: "2026-09-08" },
];

/* ------------------------------------------------------------------------------------------
 * Doubts (student questions to faculty)
 * ---------------------------------------------------------------------------------------- */

type DoubtSeed = Omit<Doubt, "id" | "studentId" | "assignedTo"> & { who: string | [string, number] };

const doubtSeeds: DoubtSeed[] = [
  { who: "s-anaya", paper: "FR", cohortId: "co-fr-dec26-wkd", syllabusArea: "D", topic: "Goodwill on acquisition", question: "In the workspace goodwill came to $1,500k but I got $1,360k. Why is NCI at fair value added to consideration before deducting net assets?", askedOn: "2026-09-12T21:04", source: "Lesson", status: "answered", answer: "Both methods are allowed. The workspace measures NCI at fair value: $5,200k + $1,100k − $4,800k = $1,500k. You used the proportionate method, 20% × $4,800k = $960k, which gives $1,360k. Use the method the question specifies.", answeredOn: "2026-09-13T11:42", upvotes: 14 },
  { who: "s-anaya", paper: "PM", cohortId: "co-pm-dec26-rev", syllabusArea: "C", topic: "Mix and yield variances", question: "For the mix variance, do I use the actual total quantity in standard mix or the standard total quantity?", askedOn: "2026-09-13T19:30", source: "Practice", status: "scheduled-for-session", upvotes: 9 },
  { who: "s-anaya", paper: "FR", cohortId: "co-fr-dec26-wkd", syllabusArea: "B", topic: "IFRS 16 sale and leaseback", question: "When the sale is at fair value, how much of the gain is recognised immediately?", askedOn: "2026-09-14T07:55", source: "Live class", status: "open", upvotes: 6 },
  { who: "s-rohan", paper: "FA", cohortId: "co-bw-2025-s3", syllabusArea: "E", topic: "Suspense accounts", question: "If a purchase invoice is entered twice in the payables ledger only, does the suspense account change?", askedOn: "2026-08-28T20:10", source: "Practice", status: "answered", answer: "No. The payables ledger is a memorandum record, so the trial balance is unaffected and no suspense entry is needed. Correct the ledger and the reconciliation.", answeredOn: "2026-08-29T18:20", upvotes: 11 },
  { who: "s-rohan", paper: "LW", cohortId: "co-bw-2025-s3", syllabusArea: "B", topic: "Consideration", question: "Is performing an existing contractual duty ever good consideration?", askedOn: "2026-09-13T22:15", source: "Lesson", status: "open", upvotes: 4 },
  { who: ["co-fr-dec26-wkd", 2], paper: "FR", cohortId: "co-fr-dec26-wkd", syllabusArea: "D", topic: "Unrealised profit", question: "When the subsidiary sells to the parent, is the unrealised profit adjustment shared with NCI?", askedOn: "2026-09-13T10:02", source: "Mock review", status: "open", upvotes: 12 },
  { who: ["co-fr-dec26-eve", 0], paper: "FR", cohortId: "co-fr-dec26-eve", syllabusArea: "D", topic: "Statement of cash flows", question: "Where do dividends paid to NCI appear in the group statement of cash flows?", askedOn: "2026-09-11T21:40", source: "Live class", status: "answered", answer: "Financing activities, as dividends paid to non-controlling interests, calculated from the NCI working.", answeredOn: "2026-09-12T09:15", upvotes: 7 },
  { who: ["co-pm-dec26-rev", 1], paper: "PM", cohortId: "co-pm-dec26-rev", syllabusArea: "B", topic: "Relevant costing", question: "Is the original purchase price of material in inventory ever relevant?", askedOn: "2026-09-10T18:22", source: "AI tutor handoff", status: "answered", answer: "No, it is a sunk cost. Use replacement cost if the material is regularly used, otherwise the higher of resale value and value in an alternative use.", answeredOn: "2026-09-11T08:40", upvotes: 5 },
  { who: ["co-pm-dec26-rev", 3], paper: "PM", cohortId: "co-pm-dec26-rev", syllabusArea: "D", topic: "Transfer pricing", question: "What is the minimum transfer price when there is spare capacity?", askedOn: "2026-09-14T06:48", source: "Practice", status: "open", upvotes: 3 },
  { who: ["co-aa-dec26-eve", 0], paper: "AA", cohortId: "co-aa-dec26-eve", syllabusArea: "D", topic: "Receivables circularisation", question: "What should the auditor do if a customer does not reply to a positive confirmation?", askedOn: "2026-09-12T20:35", source: "Live class", status: "answered", answer: "Perform alternative procedures: review after-date cash receipts, and check invoices and dispatch notes for the balance.", answeredOn: "2026-09-13T10:05", upvotes: 8 },
  { who: ["co-aa-dec26-eve", 2], paper: "AA", cohortId: "co-aa-dec26-eve", syllabusArea: "E", topic: "Emphasis of matter", question: "Is an emphasis of matter paragraph a modified opinion?", askedOn: "2026-09-14T08:10", source: "Lesson", status: "open", upvotes: 2 },
  { who: ["co-fm-fast-dec26", 0], paper: "FM", cohortId: "co-fm-fast-dec26", syllabusArea: "D", topic: "Tax-allowable depreciation", question: "Do I take the balancing allowance in the final year or the year after?", askedOn: "2026-09-13T21:00", source: "Practice", status: "scheduled-for-session", upvotes: 10 },
  { who: ["co-fm-fast-dec26", 1], paper: "FM", cohortId: "co-fm-fast-dec26", syllabusArea: "E", topic: "WACC", question: "Should WACC use book values or market values?", askedOn: "2026-09-08T19:45", source: "Lesson", status: "closed", answer: "Market values, because they reflect the current cost of each source of finance.", answeredOn: "2026-09-09T09:30", upvotes: 6 },
  { who: ["co-sbr-mar27-wkd", 0], paper: "SBR", cohortId: "co-sbr-mar27-wkd", syllabusArea: "D", topic: "Step acquisitions", question: "On gaining control, is the previously held interest remeasured through profit or loss?", askedOn: "2026-09-12T16:30", source: "Live class", status: "open", upvotes: 4 },
  { who: ["co-cl-2025-s3", 1], paper: "LW", cohortId: "co-cl-2025-s3", syllabusArea: "B", topic: "Offer and acceptance", question: "Does the postal rule apply to emails?", askedOn: "2026-09-11T15:20", source: "Live class", status: "answered", answer: "No. Instantaneous communications take effect when received, not when sent.", answeredOn: "2026-09-12T10:00", upvotes: 9 },
  { who: ["co-bw-2025-s3", 5], paper: "FA", cohortId: "co-bw-2025-s3", syllabusArea: "G", topic: "Simple consolidation", question: "Our Corporate Accounting class uses the proportionate method for NCI. Which method will FA test?", askedOn: "2026-09-13T17:05", source: "Lesson", status: "open", upvotes: 15 },
  { who: ["co-bw-2026-s1", 0], paper: "BT", cohortId: "co-bw-2026-s1", syllabusArea: "B", topic: "Corporate governance", question: "What is the difference between executive and non-executive directors in a unitary board?", askedOn: "2026-09-10T11:30", source: "Live class", status: "answered", answer: "Executive directors run the business day to day. Non-executive directors are not employees and provide independent oversight.", answeredOn: "2026-09-10T16:00", upvotes: 5 },
];

export const doubts: Doubt[] = doubtSeeds.map(({ who, ...rest }, i) => {
  const studentId = typeof who === "string" ? who : studentsInCohort(who[0])[who[1] % studentsInCohort(who[0]).length].id;
  return { ...rest, id: `db-${String(i + 1).padStart(3, "0")}`, studentId, assignedTo: rest.cohortId === "co-bw-2025-s3" && rest.paper === "LW" ? "st-vikram" : paperByCode(rest.paper)!.leadFacultyId };
});

export function doubtsForStudent(studentId: string) {
  return doubts.filter((d) => d.studentId === studentId);
}

export function doubtsForFaculty(staffId: string) {
  return doubts.filter((d) => d.assignedTo === staffId);
}

export const unreadNotificationCount = (studentId: string) =>
  studentNotifications.filter((n) => n.studentId === studentId && !n.read && n.at.slice(0, 10) <= ACCA_TODAY).length;

/** Announcements published within the last `days` days. */
export function recentAnnouncements(days = 14) {
  const from = addDays(ACCA_TODAY, -days);
  return announcements.filter((a) => a.status === "published" && a.publishedOn >= from);
}
