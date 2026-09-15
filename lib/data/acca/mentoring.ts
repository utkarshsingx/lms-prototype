import { ACCA_TODAY, addDays, createRng } from "./types";
import type {
  ActionPlan,
  Escalation,
  Intervention,
  MentoringSession,
  MentorNote,
  MentorReminder,
  RecoveryPlan,
  RiskAlert,
  RiskAlertKind,
  Student,
} from "./types";
import { examSessionById, paperByCode } from "./papers";
import { students } from "./students";
import { tickets } from "./support";

export const RISK_ALERT_LABELS: Record<RiskAlertKind, string> = {
  inactive: "Inactive learner",
  "missed-class": "Missed classes",
  "missed-mock": "Missed mock",
  "low-readiness": "Low readiness",
  "failed-paper": "Failed paper",
  "payment-overdue": "Payment overdue",
};

const active = students.filter((s) => s.enrolmentStatus === "active");

function recentFailure(s: Student) {
  for (const p of Object.values(s.papers)) {
    const last = p.attempts[p.attempts.length - 1];
    if (last && last.result === "failed" && last.date >= "2026-06-01") return { paper: p.code, attempt: last };
  }
  return null;
}

/* ------------------------------------------------------------------------------------------
 * Risk alerts (derived from each learner's record)
 * ---------------------------------------------------------------------------------------- */

function buildAlerts(): RiskAlert[] {
  const out: RiskAlert[] = [];
  let n = 1;
  // Open alerts only for live signals; failed-paper alerts are already actioned through recovery plans.
  const STATUS_BY_KIND: Record<RiskAlertKind, RiskAlert["status"][]> = {
    inactive: ["new"],
    "missed-class": ["new", "acknowledged"],
    "missed-mock": ["new", "acknowledged"],
    "low-readiness": ["new", "actioned"],
    "failed-paper": ["actioned"],
    "payment-overdue": ["acknowledged", "new"],
  };
  const add = (s: Student, kind: RiskAlertKind, severity: RiskAlert["severity"], daysAgo: number, title: string, detail: string, status?: RiskAlert["status"]) => {
    const options = STATUS_BY_KIND[kind];
    out.push({ id: `ra-${String(n).padStart(3, "0")}`, studentId: s.id, mentorId: s.mentorId, kind, severity, raisedOn: addDays(ACCA_TODAY, -daysAgo), title, detail, status: status ?? options[n % options.length] });
    n++;
  };
  // Historical alerts that were resolved, for learners who are now low risk.
  for (const s of active.filter((x) => x.risk.level === "low" && x.attendance.total > 0).slice(0, 5)) {
    add(s, "missed-class", "medium", 24, "3 classes missed in a row", "Attendance recovered after a mentor call and a weekly study slot.", "resolved");
  }
  for (const s of active) {
    if (s.lastActiveDaysAgo >= 14) add(s, "inactive", "high", s.lastActiveDaysAgo - 14, `No activity for ${s.lastActiveDaysAgo} days`, `Last login ${s.lastActiveDaysAgo} days ago. Study hours fell to ${s.activityHours[7]} last week.`);
    if (s.attendance.total > 0 && (s.attendance.pct < 75 || s.attendance.missedClasses >= 8)) add(s, "missed-class", "medium", 1, `${s.attendance.missedClasses} classes missed`, `Attendance ${s.attendance.pct}%. Last missed on ${s.attendance.lastMissed ?? "a recent class"}.`);
    if (s.missedMocks > 0) {
      const m = s.mocks.find((x) => x.status === "missed");
      add(s, "missed-mock", s.missedMocks > 1 ? "high" : "medium", 2, `Missed ${m?.title ?? "a mock exam"}`, `${s.missedMocks} mock${s.missedMocks > 1 ? "s" : ""} missed this cycle.`);
    }
    const cur = s.currentPaper;
    const r = cur ? s.readiness.byPaper[cur] : undefined;
    if (cur && r !== undefined && r < 50) add(s, "low-readiness", "high", 3, `${cur} readiness ${r}`, `Readiness for ${paperByCode(cur)?.name} is below 50 with the exam planned for ${s.papers[cur].plannedLabel ?? "the next session"}.`);
    const fail = recentFailure(s);
    if (fail) add(s, "failed-paper", "medium", 60, `Failed ${fail.paper} in ${fail.attempt.label}`, `Scored ${fail.attempt.score}%. Recovery plan ${s.papers[fail.paper].plannedLabel ? `targets ${s.papers[fail.paper].plannedLabel}` : "to be agreed"}.`);
    if (s.fees.status === "overdue") {
      const inst = s.fees.instalments.find((i) => i.status === "overdue")!;
      add(s, "payment-overdue", "medium", 5, `Instalment ${inst.n} overdue`, `Due ${inst.dueDate}. Only authorised reminders can be sent from the mentor workspace.`);
    }
  }
  return out.sort((a, b) => b.raisedOn.localeCompare(a.raisedOn));
}

export const riskAlerts: RiskAlert[] = buildAlerts();

export function alertsForMentor(mentorId: string) {
  return riskAlerts.filter((a) => a.mentorId === mentorId);
}

export function alertsForStudent(studentId: string) {
  return riskAlerts.filter((a) => a.studentId === studentId);
}

/* ------------------------------------------------------------------------------------------
 * Action plans, sessions, notes, reminders
 * ---------------------------------------------------------------------------------------- */

const atRisk = active.filter((s) => s.risk.level !== "low");

export const actionPlans: ActionPlan[] = atRisk.slice(0, 16).map((s, i) => {
  const fail = recentFailure(s);
  const isAnaya = s.id === "s-anaya";
  const focus = fail ? fail.paper : s.currentPaper ?? "BT";
  const alertIds = riskAlerts.filter((a) => a.studentId === s.id).map((a) => a.id);
  return {
    id: `pl-${String(i + 1).padStart(2, "0")}`,
    studentId: s.id,
    mentorId: s.mentorId,
    title: isAnaya ? "PM reattempt and FR on track for Dec 2026" : fail ? `${fail.paper} recovery before ${s.papers[fail.paper].plannedLabel ?? "the next session"}` : s.lastActiveDaysAgo >= 14 ? "Re-engage and rebuild study routine" : `${focus} readiness to 60`,
    goal: isAnaya ? "PM readiness from 58 to 65 and FR from 64 to 70 by the 24 Oct mocks" : `Clear the ${s.risk.reasons.length} risk signal${s.risk.reasons.length > 1 ? "s" : ""} within four weeks`,
    createdOn: addDays(ACCA_TODAY, -(4 + (i % 12))),
    dueOn: addDays(ACCA_TODAY, 21 + (i % 10)),
    status: i % 7 === 6 ? "completed" : i % 9 === 8 ? "paused" : "active",
    tasks: isAnaya
      ? [
          { id: "t1", label: "Book PM for Dec 2026 before early entry closes on 5 Oct", due: "2026-10-05", owner: "student", done: false },
          { id: "t2", label: "Complete PM mix and yield variance drill", due: "2026-09-20", owner: "student", done: false },
          { id: "t3", label: "Attend the Sunday PM revision class every week", due: "2026-10-31", owner: "student", done: true },
          { id: "t4", label: "Review FR mock exam 1 answers with Marcus", due: "2026-09-18", owner: "mentor", done: false },
          { id: "t5", label: "Check readiness after the 24 Oct FR mock", due: "2026-10-26", owner: "mentor", done: false },
        ]
      : [
          { id: "t1", label: s.lastActiveDaysAgo >= 14 ? "Call the learner and agree a weekly study slot" : `Complete the ${focus} weak-topic practice set`, due: addDays(ACCA_TODAY, 3), owner: s.lastActiveDaysAgo >= 14 ? "mentor" : "student", done: i % 3 === 0 },
          { id: "t2", label: "Watch the two most recent class recordings", due: addDays(ACCA_TODAY, 7), owner: "student", done: i % 4 === 0 },
          { id: "t3", label: s.missedMocks ? "Reschedule the missed mock" : "Sit the next progress test", due: addDays(ACCA_TODAY, 12), owner: "student", done: false },
          { id: "t4", label: "Review progress in a mentoring session", due: addDays(ACCA_TODAY, 14), owner: "mentor", done: false },
        ],
    alertIds,
  };
});

function buildSessions(): MentoringSession[] {
  const rng = createRng(1812);
  const out: MentoringSession[] = [];
  let n = 1;
  const add = (s: MentoringSession) => out.push(s);
  add({ id: "ms-001", studentId: "s-anaya", mentorId: "st-aisha", start: "2026-09-14T19:30", durationMins: 30, mode: "Video", agenda: "PM reattempt plan, booking before 5 Oct, FR mock 1 review", status: "scheduled" });
  add({ id: "ms-002", studentId: "s-anaya", mentorId: "st-aisha", start: "2026-08-24T19:30", durationMins: 30, mode: "Video", agenda: "Jun 2026 PM result debrief and recovery plan", status: "completed" });
  add({ id: "ms-003", studentId: "s-rohan", mentorId: "st-nikhil", start: "2026-09-16T16:30", durationMins: 20, mode: "In person", agenda: "FA exam readiness and LW study plan before university exams", status: "scheduled" });
  n = 4;
  const mentees = active.filter((s) => s.id !== "s-anaya" && s.id !== "s-rohan");
  mentees.forEach((s, i) => {
    if (i % 2 === 1 && s.risk.level === "low") return;
    const future = i % 3 !== 0;
    const day = future ? addDays(ACCA_TODAY, i % 5) : addDays(ACCA_TODAY, -(3 + (i % 10)));
    const time = `${String(17 + (i % 4)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`;
    const missed = !future && s.lastActiveDaysAgo >= 14;
    add({
      id: `ms-${String(n++).padStart(3, "0")}`,
      studentId: s.id,
      mentorId: s.mentorId,
      start: `${day}T${time}`,
      durationMins: [20, 30, 45][rng.int(0, 2)],
      mode: s.type === "undergraduate" && i % 2 === 0 ? "In person" : i % 5 === 0 ? "Phone" : "Video",
      agenda: s.risk.reasons.length ? `Discuss: ${s.risk.reasons[0].toLowerCase()}` : "Monthly check-in",
      status: future ? "scheduled" : missed ? "missed" : "completed",
    });
  });
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export const mentoringSessions: MentoringSession[] = buildSessions();

export function sessionsForMentor(mentorId: string) {
  return mentoringSessions.filter((m) => m.mentorId === mentorId);
}

export const mentorNotes: MentorNote[] = [
  { id: "mn-001", studentId: "s-anaya", mentorId: "st-aisha", date: "2026-08-24", body: "PM 46% in June. Lost most marks in Section C variance discussion. Agreed to join the Sunday revision cohort and keep FR on the Saturday batch. Work pressure peaks at month end, so study slots moved to Tuesday and Thursday evenings.", tags: ["PM", "Recovery", "Work-life"] },
  { id: "mn-002", studentId: "s-anaya", mentorId: "st-aisha", date: "2026-09-07", body: "FR mock 1 at 61%. Group accounts improving. PM revision test 55%. Reminded about early entry for PM before 5 Oct. Resume sent to Rahul for audit roles.", tags: ["FR", "PM", "Careers"] },
  { id: "mn-003", studentId: "s-rohan", mentorId: "st-nikhil", date: "2026-09-02", body: "On track. FA mock 70%. Booked FA for 18 Nov, before the Brightwater blackout. Suggested starting LW revision after the FA exam.", tags: ["FA", "Blackout"] },
  ...atRisk
    .filter((s) => s.id !== "s-anaya")
    .slice(0, 14)
    .map((s, i) => ({
      id: `mn-${String(i + 4).padStart(3, "0")}`,
      studentId: s.id,
      mentorId: s.mentorId,
      date: addDays(ACCA_TODAY, -(1 + (i % 9))),
      body:
        s.lastActiveDaysAgo >= 14
          ? `No response to two messages. Called on ${addDays(ACCA_TODAY, -(1 + (i % 9)))}, learner cited a family commitment. Agreed to restart with recordings this week.`
          : s.fees.status === "overdue"
            ? "Learner raised a payment delay. Referred to Finance Operations for a revised date. Academic progress otherwise steady."
            : `Discussed ${s.risk.reasons[0]?.toLowerCase() ?? "progress"}. Learner will complete the weak-topic practice set before the next class.`,
      tags: [s.currentPaper ?? "Onboarding", s.risk.level === "high" ? "High risk" : "Follow-up"],
    })),
];

export const mentorReminders: MentorReminder[] = atRisk.slice(0, 12).map((s, i) => ({
  id: `mr-${String(i + 1).padStart(3, "0")}`,
  studentId: s.id,
  mentorId: s.mentorId,
  channel: i % 3 === 0 ? "email" : "whatsapp",
  message:
    s.missedMocks > 0
      ? "You missed the last mock. Book a slot this week so your readiness score stays current."
      : s.lastActiveDaysAgo >= 14
        ? "We have not seen you on the platform for two weeks. Reply to book a 20-minute check-in."
        : `Your next ${s.currentPaper ?? "ACCA"} class is this week. Recordings from the last two classes are ready.`,
  sentOn: addDays(ACCA_TODAY, -(i % 6)),
  status: i % 5 === 4 ? "failed" : i % 2 ? "read" : "delivered",
}));

/* ------------------------------------------------------------------------------------------
 * Interventions, recovery plans, escalations
 * ---------------------------------------------------------------------------------------- */

export const interventions: Intervention[] = [
  { id: "iv-001", studentId: "s-anaya", mentorId: "st-aisha", trigger: "Failed PM in Jun 2026 (46%)", action: "Moved to PM Revision and Reattempt cohort, weekly check-ins", startedOn: "2026-07-20", metric: "PM readiness", before: 44, after: 58, outcome: "improved" },
  ...students
    .filter((s) => s.id !== "s-anaya" && s.enrolmentStatus === "active" && s.risk.level !== "low")
    .slice(0, 15)
    .map((s, i): Intervention => {
      const before = s.attendance.total ? Math.max(40, s.attendance.pct - 10 + (i % 7)) : 40;
      const outcomes: Intervention["outcome"][] = ["improved", "pending", "no-change", "improved", "worsened"];
      const outcome = outcomes[i % outcomes.length];
      const after = outcome === "pending" ? null : outcome === "improved" ? before + 8 + (i % 5) : outcome === "worsened" ? before - 6 : before + 1;
      const failure = recentFailure(s);
      return {
        id: `iv-${String(i + 2).padStart(3, "0")}`,
        studentId: s.id,
        mentorId: s.mentorId,
        trigger: s.risk.reasons[0] ?? "Mentor review",
        action: failure ? `${failure.paper} recovery plan with faculty remedial set` : s.lastActiveDaysAgo >= 14 ? "Phone call and restart plan" : "Attendance contract and weekly reminder",
        startedOn: addDays(ACCA_TODAY, -(10 + i * 3)),
        metric: failure ? `${failure.paper} readiness` : "Attendance %",
        before,
        after,
        outcome,
        closedOn: outcome === "pending" ? undefined : addDays(ACCA_TODAY, -(i % 6)),
      };
    }),
];

export function interventionsForStudent(studentId: string) {
  return interventions.filter((iv) => iv.studentId === studentId);
}

export const recoveryPlans: RecoveryPlan[] = active
  .filter((s) => recentFailure(s))
  .map((s, i) => {
    const fail = recentFailure(s)!;
    const planned = s.papers[fail.paper].plannedSessionId;
    const onDemand = s.examBookings.find((b) => b.paper === fail.paper && b.entryWindow === "on-demand" && b.status !== "sat");
    const cohortId = s.cohortIds.find((c) => c.includes(fail.paper.toLowerCase())) ?? s.cohortIds[0];
    return {
      id: `rec-${String(i + 1).padStart(2, "0")}`,
      studentId: s.id,
      mentorId: s.mentorId,
      facultyId: paperByCode(fail.paper)!.leadFacultyId,
      paper: fail.paper,
      failedSessionLabel: fail.attempt.label,
      score: fail.attempt.score ?? 0,
      targetSessionId: planned,
      targetLabel: planned ? (examSessionById(planned)?.label ?? planned) : onDemand ? `${onDemand.label} (on-demand)` : "To be booked",
      cohortId,
      weakAreas: paperByCode(fail.paper)!.syllabusAreas.slice(1, 3).map((a) => `${a.code} ${a.title}`),
      steps: [
        { label: "Debrief result and examiner feedback", due: addDays(fail.attempt.date, 45), status: "done" },
        { label: "Join revision or reattempt cohort", due: addDays(fail.attempt.date, 60), status: "done" },
        { label: "Weak-area practice sets", due: addDays(ACCA_TODAY, 14), status: "current" },
        { label: "Full mock above 55%", due: "2026-10-31", status: "upcoming" },
        { label: "Exam booked", due: "2026-10-05", status: s.examBookings.some((b) => b.paper === fail.paper && b.status === "booked") ? "done" : "upcoming" },
      ],
      status: (s.readiness.byPaper[fail.paper] ?? s.readiness.overall) < 50 ? "at-risk" : s.id === "s-anaya" ? "on-track" : i % 3 === 0 ? "active" : "on-track",
    };
  });

const ticketBySubject = (subject: string) => tickets.find((t) => t.subject === subject);

export const escalations: Escalation[] = [
  { id: "mesc-01", studentId: ticketBySubject("Move PM from Dec 2026 to Mar 2027")?.studentId ?? "s-anaya", kind: "academic", subject: "Learner wants to defer PM to Mar 2027", detail: "Readiness below 50 and several classes missed. Faculty view needed on whether a Dec attempt is realistic.", raisedBy: "st-aisha", raisedOn: "2026-09-11", toId: "st-farah", priority: "medium", status: "in-progress", ticketId: ticketBySubject("Move PM from Dec 2026 to Mar 2027")?.id },
  { id: "mesc-02", studentId: ticketBySubject("Goodwill with NCI at fair value")?.studentId ?? "s-rohan", kind: "academic", subject: "Goodwill method differs from university notes", detail: "University Corporate Accounting uses the proportionate method only. Learner confused about NCI at fair value.", raisedBy: "st-nikhil", raisedOn: "2026-09-12", toId: "st-marcus", priority: "low", status: "open", ticketId: ticketBySubject("Goodwill with NCI at fair value")?.id },
  { id: "mesc-03", studentId: ticketBySubject("UPI payment not reflected")?.studentId ?? "s-anaya", kind: "operational", subject: "Payment shown overdue after UPI payment", detail: "Learner shared the UPI reference. Overdue alert is blocking mock booking.", raisedBy: "st-aisha", raisedOn: "2026-09-11", toId: "st-deepa", priority: "high", status: "in-progress", ticketId: ticketBySubject("UPI payment not reflected")?.id },
  { id: "mesc-04", studentId: ticketBySubject("FA on-demand date falls in university exams")?.studentId ?? "s-rohan", kind: "operational", subject: "FA booking inside Brightwater blackout", detail: "Booked 2 Dec 2026. Needs rebooking before 20 Nov.", raisedBy: "st-nikhil", raisedOn: "2026-09-13", toId: "st-imran", priority: "urgent", status: "open", ticketId: ticketBySubject("FA on-demand date falls in university exams")?.id },
  { id: "mesc-05", studentId: ticketBySubject("Record mismatch with university")?.studentId ?? "s-rohan", kind: "operational", subject: "University record mismatch blocks verification", detail: "Date of birth differs between the ACCA registration and the Brightwater record.", raisedBy: "st-nikhil", raisedOn: "2026-09-10", toId: "st-priya", priority: "medium", status: "in-progress", ticketId: ticketBySubject("Record mismatch with university")?.id },
  { id: "mesc-06", studentId: active.filter((s) => s.lastActiveDaysAgo >= 14)[0].id, kind: "academic", subject: "Inactive 3 weeks before the Dec session", detail: "Learner has not attended since August. Requesting a faculty call and a decision on the Dec booking.", raisedBy: "st-aisha", raisedOn: "2026-09-09", toId: "st-marcus", priority: "high", status: "open" },
  { id: "mesc-07", studentId: ticketBySubject("Extra class on IFRS 16 before the mock")?.studentId ?? "s-anaya", kind: "academic", subject: "Extra IFRS 16 session requested by weekend batch", detail: "Six learners asked for sale and leaseback before the 24 Oct mock.", raisedBy: "st-aisha", raisedOn: "2026-09-08", toId: "st-marcus", priority: "low", status: "resolved", ticketId: ticketBySubject("Extra class on IFRS 16 before the mock")?.id },
  { id: "mesc-08", studentId: active.filter((s) => s.subscription.status === "overdue")[0].id, kind: "operational", subject: "ACCA subscription overdue", detail: "Subscription unpaid since 1 Jan 2026. Exam booking will fail until it is paid.", raisedBy: "st-aisha", raisedOn: "2026-09-12", toId: "st-imran", priority: "high", status: "open" },
];
