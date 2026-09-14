import { createRng } from "./types";
import type {
  AccaRoleId,
  AccessLevel,
  AuditLog,
  Capability,
  CertificateTemplate,
  ExemptionRule,
  Integration,
  PaperCode,
  PaymentRule,
  PlatformRole,
  PlatformUser,
  PrivacyPolicy,
  ReportDefinition,
  Student,
} from "./types";
import { alumniOutcomes, applications, internshipRecords, placementSummary } from "./careers";
import { cohorts } from "./cohorts";
import { PAPER_CODES, APPLIED_KNOWLEDGE, APPLIED_SKILLS } from "./papers";
import { programmes } from "./programmes";
import { staff } from "./staff";
import { tickets } from "./support";
import { papersCleared, students } from "./students";
import { universities } from "./universities";

/* ------------------------------------------------------------------------------------------
 * Roles, capabilities and the permission matrix
 * ---------------------------------------------------------------------------------------- */

export const SUPER_ADMIN_SEAT_LIMIT = 3;

export const platformRoles: PlatformRole[] = [
  { id: "super-admin", name: "ZSkillup Super Admin", description: "Management, technology and central operations", users: 2, seatLimit: SUPER_ADMIN_SEAT_LIMIT, scope: "Whole platform" },
  { id: "programme-admin", name: "Programme Admin", description: "Programme operations, ACCA coordination and university coordination", users: 5, scope: "All programmes; finance only where granted" },
  { id: "university-admin", name: "University Admin", description: "University management and university programme coordinator", users: 6, scope: "Own university workspace; editor or view-only" },
  { id: "faculty", name: "Faculty and Academic Team", description: "Faculty, content creators, reviewers and evaluators", users: 10, scope: "Assigned papers and cohorts; publish or submit" },
  { id: "mentor", name: "Mentor and Career Team", description: "Student success, mentoring, placement and internships", users: 7, scope: "Allocated students or placement-eligible learners" },
  { id: "student", name: "Student", description: "Graduate ACCA learner and university undergraduate", users: 610, scope: "Own record" },
];

export const capabilities: Capability[] = [
  { id: "universities", label: "Partner universities, workspaces and branding", group: "Network" },
  { id: "programmes", label: "Programmes, intakes, cohorts and batches", group: "Network" },
  { id: "users", label: "Platform users", group: "Users and roles" },
  { id: "roles", label: "Roles and permissions", group: "Users and roles" },
  { id: "acca-structure", label: "ACCA paper structure", group: "Academic framework" },
  { id: "exemption-rules", label: "Exemption rules", group: "Academic framework" },
  { id: "curriculum-mapping", label: "Curriculum mapping", group: "Academic framework" },
  { id: "content", label: "Content repository", group: "Academic framework" },
  { id: "assessment-framework", label: "Assessment framework", group: "Academic framework" },
  { id: "student-allocation", label: "Student allocation to cohorts, universities and semesters", group: "Operations" },
  { id: "calendars", label: "Calendars, exam cycles and live class schedule", group: "Operations" },
  { id: "announcements", label: "Announcements", group: "Operations" },
  { id: "acca-records", label: "ACCA IDs, registration and subscriptions", group: "ACCA records" },
  { id: "exemptions", label: "Exemption evaluation and tracking", group: "ACCA records" },
  { id: "exams", label: "Exam bookings, results and attempts", group: "ACCA records" },
  { id: "progression", label: "EPSM and PER tracking", group: "ACCA records" },
  { id: "university-records", label: "University student records and semesters", group: "Universities" },
  { id: "support", label: "Support tickets and FAQs", group: "Support" },
  { id: "escalation", label: "Support escalation matrix", group: "Support" },
  { id: "finance-view", label: "Fee status and payment plans", group: "Finance" },
  { id: "finance-record", label: "Record payments, receipts, refunds, reconciliation", group: "Finance" },
  { id: "teaching", label: "Live classes, attendance and recordings", group: "Teaching" },
  { id: "publish", label: "Publish content", group: "Teaching" },
  { id: "grading", label: "Grading and feedback", group: "Teaching" },
  { id: "reattempts", label: "Approve reattempts", group: "Teaching" },
  { id: "mentoring", label: "Allocated students, risk alerts and action plans", group: "Student success" },
  { id: "careers", label: "Career profiles, jobs and placement pipeline", group: "Careers" },
  { id: "reports", label: "Reports and exports", group: "Governance" },
  { id: "audit", label: "Audit logs", group: "Governance" },
  { id: "privacy", label: "Data and privacy policies", group: "Governance" },
];

const M = (sa: AccessLevel, pa: AccessLevel, ua: AccessLevel, fa: AccessLevel, me: AccessLevel, st: AccessLevel): Record<AccaRoleId, AccessLevel> => ({
  "super-admin": sa,
  "programme-admin": pa,
  "university-admin": ua,
  faculty: fa,
  mentor: me,
  student: st,
});

export const permissionMatrix: Record<string, Record<AccaRoleId, AccessLevel>> = {
  universities: M("full", "view", "edit", "none", "none", "none"),
  programmes: M("full", "edit", "view", "view", "view", "none"),
  users: M("full", "none", "edit", "none", "none", "none"),
  roles: M("full", "none", "none", "none", "none", "none"),
  "acca-structure": M("full", "view", "view", "view", "view", "view"),
  "exemption-rules": M("full", "view", "none", "none", "none", "none"),
  "curriculum-mapping": M("full", "edit", "edit", "view", "none", "view"),
  content: M("full", "view", "none", "edit", "none", "view"),
  "assessment-framework": M("full", "view", "none", "edit", "none", "none"),
  "student-allocation": M("full", "edit", "edit", "none", "none", "none"),
  calendars: M("full", "edit", "edit", "view", "view", "view"),
  announcements: M("full", "edit", "edit", "edit", "view", "view"),
  "acca-records": M("full", "edit", "view", "none", "view", "view"),
  exemptions: M("full", "edit", "view", "none", "view", "edit"),
  exams: M("full", "edit", "view", "view", "view", "view"),
  progression: M("full", "edit", "view", "none", "view", "view"),
  "university-records": M("full", "edit", "edit", "none", "none", "none"),
  support: M("full", "edit", "view", "edit", "edit", "edit"),
  escalation: M("full", "view", "none", "none", "none", "none"),
  "finance-view": M("full", "view", "none", "none", "none", "view"),
  "finance-record": M("full", "edit", "none", "none", "none", "none"),
  teaching: M("view", "edit", "view", "full", "view", "view"),
  publish: M("full", "none", "none", "edit", "none", "none"),
  grading: M("view", "none", "none", "full", "none", "none"),
  reattempts: M("full", "view", "none", "edit", "none", "none"),
  mentoring: M("view", "view", "view", "none", "full", "none"),
  careers: M("view", "view", "view", "none", "full", "edit"),
  reports: M("full", "edit", "view", "view", "view", "none"),
  audit: M("full", "none", "none", "none", "none", "none"),
  privacy: M("full", "none", "none", "none", "none", "none"),
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = { full: "Full", edit: "Edit", view: "View", none: "No access" };

/** The permission strings personas carry (lib/personas.ts) and what each grants. */
export const permissionDefinitions: { id: string; label: string; description: string; roles: AccaRoleId[] }[] = [
  { id: "platform:all", label: "Platform administration", description: "Every configuration, user, report and audit function.", roles: ["super-admin"] },
  { id: "programme:ops", label: "Programme operations", description: "Cohorts, batches, allocation, calendars, staffing, announcements.", roles: ["programme-admin"] },
  { id: "programme:acca", label: "ACCA operations", description: "ACCA IDs, registration, exemptions, bookings, results, EPSM and PER.", roles: ["programme-admin"] },
  { id: "programme:universities", label: "University coordination", description: "Curriculum, calendars, blackouts, university reports and joint certification.", roles: ["programme-admin"] },
  { id: "programme:support", label: "Student support", description: "Tickets, FAQs, recurring problems and escalation.", roles: ["programme-admin"] },
  { id: "finance:view", label: "View finance", description: "Fee status, payment plans and ACCA-related payments.", roles: ["programme-admin"] },
  { id: "finance:record", label: "Record finance", description: "Record offline payments, receipts, refunds, reminders and reconciliation.", roles: ["programme-admin"] },
  { id: "university:edit", label: "University editor", description: "Edit records, semesters, calendar, curriculum, announcements and users. Without it, University Admin is view-only.", roles: ["university-admin"] },
  { id: "content:publish", label: "Publish content", description: "Publish content and approve reviews.", roles: ["faculty"] },
  { id: "content:submit", label: "Submit content", description: "Create content and submit it for review.", roles: ["faculty"] },
  { id: "faculty:grade", label: "Grade", description: "Grade scripts, give feedback, flag misconduct, join re-evaluation.", roles: ["faculty"] },
  { id: "faculty:approve-reattempt", label: "Approve reattempts", description: "Approve or decline reattempt requests.", roles: ["faculty"] },
  { id: "students:allocated", label: "Allocated students", description: "See only students allocated to this mentor.", roles: ["mentor"] },
  { id: "placement:manage", label: "Manage placements", description: "Publish jobs and internships, shortlist and move pipeline stages.", roles: ["mentor"] },
  { id: "students:placement-eligible", label: "Placement-eligible learners", description: "See learners marked placement-eligible.", roles: ["mentor"] },
];

/* ------------------------------------------------------------------------------------------
 * Platform users
 * ---------------------------------------------------------------------------------------- */

const PERSONA_PERMISSIONS: Record<string, string[]> = {
  "st-neha": ["platform:all"],
  "st-arjun": ["platform:all"],
  "st-priya": ["programme:ops", "programme:acca", "programme:universities", "programme:support", "finance:view", "finance:record"],
  "st-imran": ["programme:ops", "programme:acca", "programme:universities", "programme:support"],
  "st-deepa": ["programme:support", "finance:view", "finance:record"],
  "st-suresh": ["university:edit"],
  "st-lakshmi": [],
  "st-joseph": ["university:edit"],
  "st-marcus": ["content:publish", "faculty:grade", "faculty:approve-reattempt"],
  "st-farah": ["content:submit", "faculty:grade"],
  "st-hana": ["content:publish", "faculty:grade", "faculty:approve-reattempt"],
  "st-tomas": ["content:publish", "faculty:grade", "faculty:approve-reattempt"],
  "st-grace": ["content:publish", "faculty:grade"],
  "st-vikram": ["content:submit", "faculty:grade"],
  "st-aisha": ["students:allocated"],
  "st-nikhil": ["students:allocated"],
  "st-sana": ["students:allocated"],
  "st-rahul": ["placement:manage", "students:placement-eligible"],
  "st-meera": ["placement:manage", "students:placement-eligible"],
};

const orgFor = (universityId?: string) => universities.find((u) => u.id === universityId)?.name ?? "ZSkillup";

const extraUsers: PlatformUser[] = [
  { id: "pu-x01", name: "Kavitha Raman", email: "kavitha.raman@zskillup.com", role: "programme-admin", title: "Academic Operations Executive", organisation: "ZSkillup", status: "active", lastActive: "2026-09-14T10:12", mfa: true, permissions: ["programme:ops", "programme:acca"] },
  { id: "pu-x02", name: "Ajay Nambiar", email: "ajay.nambiar@zskillup.com", role: "programme-admin", title: "University Relationship Coordinator", organisation: "ZSkillup", status: "active", lastActive: "2026-09-13T17:40", mfa: true, permissions: ["programme:ops", "programme:universities"] },
  { id: "pu-x03", name: "Ritu Malhotra", email: "ritu.malhotra@northfield.edu", role: "university-admin", title: "Programme Coordinator · Northfield University", organisation: "Northfield University", status: "invited", lastActive: "", mfa: false, permissions: ["university:edit"] },
  { id: "pu-x04", name: "Dr Anil Kulkarni", email: "anil.kulkarni@brightwater.edu", role: "university-admin", title: "Controller of Examinations · Brightwater University", organisation: "Brightwater University", status: "active", lastActive: "2026-09-11T12:05", mfa: true, permissions: [] },
  { id: "pu-x05", name: "Sister Mary Thomas", email: "mary.thomas@coastline.edu", role: "university-admin", title: "Principal · Coastline University", organisation: "Coastline University", status: "active", lastActive: "2026-09-02T09:30", mfa: false, permissions: [] },
  { id: "pu-x06", name: "Leena Fernandes", email: "leena.fernandes@zskillup.com", role: "faculty", title: "Academic Reviewer", organisation: "ZSkillup", status: "active", lastActive: "2026-09-14T08:55", mfa: true, permissions: ["content:publish"] },
  { id: "pu-x07", name: "Omar Haddad", email: "omar.haddad@zskillup.com", role: "faculty", title: "Evaluator · AA and SBL", organisation: "ZSkillup", status: "active", lastActive: "2026-09-12T22:10", mfa: true, permissions: ["faculty:grade"] },
  { id: "pu-x08", name: "Priyanka Das", email: "priyanka.das@zskillup.com", role: "faculty", title: "Assessment Creator · FA and MA", organisation: "ZSkillup", status: "active", lastActive: "2026-09-13T14:20", mfa: true, permissions: ["content:submit"] },
  { id: "pu-x09", name: "Benjamin Okafor", email: "benjamin.okafor@zskillup.com", role: "faculty", title: "Subject Matter Expert · ATX", organisation: "ZSkillup", status: "invited", lastActive: "", mfa: false, permissions: ["content:submit"] },
  { id: "pu-x10", name: "Shalini Menon", email: "shalini.menon@zskillup.com", role: "mentor", title: "Retention Executive", organisation: "ZSkillup", status: "active", lastActive: "2026-09-14T09:40", mfa: true, permissions: ["students:allocated"] },
  { id: "pu-x11", name: "Vivek Saxena", email: "vivek.saxena@zskillup.com", role: "mentor", title: "Career Coach", organisation: "ZSkillup", status: "suspended", lastActive: "2026-07-30T18:00", mfa: true, permissions: ["students:placement-eligible"] },
];

export const platformUsers: PlatformUser[] = [
  ...staff.map((s, i) => ({
    id: `pu-${s.id.slice(3)}`,
    name: s.name,
    email: s.email,
    role: s.loginRole,
    title: s.title,
    organisation: orgFor(s.universityId),
    staffId: s.id,
    status: s.status === "invited" ? ("invited" as const) : ("active" as const),
    lastActive: `2026-09-${i % 3 === 0 ? "14" : "13"}T${String(8 + (i % 11)).padStart(2, "0")}:${String((i * 13) % 60).padStart(2, "0")}`,
    mfa: s.loginRole !== "university-admin" || s.access === "editor",
    permissions: PERSONA_PERMISSIONS[s.id] ?? [],
  })),
  ...extraUsers,
  ...students.map((s) => ({
    id: `pu-${s.id.slice(2)}`,
    name: s.name,
    email: s.email,
    role: "student" as const,
    title: s.type === "graduate" ? "Graduate ACCA learner" : `${s.background.qualification.split(",")[0]} · Semester ${s.semester}`,
    organisation: orgFor(s.universityId),
    studentId: s.id,
    status: s.enrolmentStatus === "onboarding" && s.registration.status === "not-registered" ? ("invited" as const) : ("active" as const),
    lastActive: s.enrolmentStatus === "onboarding" ? "" : `2026-09-${String(Math.max(1, 14 - s.lastActiveDaysAgo)).padStart(2, "0")}T20:00`,
    mfa: false,
    permissions: [],
  })),
];

/* ------------------------------------------------------------------------------------------
 * Audit logs
 * ---------------------------------------------------------------------------------------- */

const AUDIT_SEEDS: Omit<AuditLog, "id" | "ip">[] = [
  { at: "2026-09-14T10:02", actor: "Priya Menon", actorRole: "programme-admin", action: "Exported report", target: "ACCA progression report · Dec 2026 cycle.csv", category: "Reports", result: "success" },
  { at: "2026-09-14T09:48", actor: "Imran Sheikh", actorRole: "programme-admin", action: "Opened finance page", target: "/programme/finance", category: "Access", result: "denied" },
  { at: "2026-09-14T09:31", actor: "Deepa Iyer", actorRole: "programme-admin", action: "Recorded offline payment", target: "Bank transfer ₹38,000 · Brightwater semester instalment", category: "Finance", result: "success" },
  { at: "2026-09-14T09:12", actor: "Arjun Shetty", actorRole: "super-admin", action: "Updated integration", target: "WhatsApp Business Platform · quiet hours 21:30 to 08:00", category: "Configuration", result: "success" },
  { at: "2026-09-14T08:40", actor: "Prof. Lakshmi Rao", actorRole: "university-admin", action: "Attempted to edit semester", target: "Brightwater · 2025 intake student record", category: "Access", result: "denied" },
  { at: "2026-09-13T22:15", actor: "System", actorRole: "system", action: "Nightly backup completed", target: "Primary database · Mumbai region", category: "Configuration", result: "success" },
  { at: "2026-09-13T19:05", actor: "Marcus Bell", actorRole: "faculty", action: "Published content", target: "Group accounts revision notes v2.1", category: "Content", result: "success" },
  { at: "2026-09-13T18:44", actor: "Farah Siddiqui", actorRole: "faculty", action: "Attempted to publish content", target: "Variance analysis: mix and yield", category: "Content", result: "denied" },
  { at: "2026-09-13T17:20", actor: "Dr Suresh Nair", actorRole: "university-admin", action: "Verified student records", target: "Brightwater · 12 records", category: "ACCA records", result: "success" },
  { at: "2026-09-13T16:02", actor: "Imran Sheikh", actorRole: "programme-admin", action: "Updated ACCA student ID", target: "Registration record · Coastline learner", category: "ACCA records", result: "success" },
  { at: "2026-09-13T12:30", actor: "Neha Kapoor", actorRole: "super-admin", action: "Changed role permissions", target: "Programme Admin · added programme:universities to Kavitha Raman", category: "Users", result: "success" },
  { at: "2026-09-12T20:11", actor: "Aisha Khan", actorRole: "mentor", action: "Sent authorised reminder", target: "Missed mock reminder · WhatsApp", category: "Access", result: "success" },
  { at: "2026-09-12T18:25", actor: "Aisha Khan", actorRole: "mentor", action: "Opened student profile", target: "Learner not allocated to this mentor", category: "Access", result: "denied" },
  { at: "2026-09-12T15:00", actor: "Deepa Iyer", actorRole: "programme-admin", action: "Approved refund", target: "RF-0112 · ₹32,000", category: "Finance", result: "success" },
  { at: "2026-09-12T11:47", actor: "Rahul Verma", actorRole: "mentor", action: "Published job", target: "FP&A analyst · Orchid Pharma Finance", category: "Content", result: "success" },
  { at: "2026-09-11T17:10", actor: "Arjun Shetty", actorRole: "super-admin", action: "Enabled multi-factor authentication requirement", target: "All ZSkillup staff accounts", category: "Privacy", result: "success" },
  { at: "2026-09-11T10:02", actor: "Neha Kapoor", actorRole: "super-admin", action: "Invited user", target: "Ritu Malhotra · Northfield University", category: "Users", result: "success" },
  { at: "2026-09-10T16:35", actor: "Priya Menon", actorRole: "programme-admin", action: "Added blackout period", target: "Coastline · 30 Nov to 18 Dec 2026", category: "Configuration", result: "success" },
  { at: "2026-09-10T09:20", actor: "System", actorRole: "system", action: "Data retention job", target: "Proctoring recordings older than 180 days deleted (412 files)", category: "Privacy", result: "success" },
  { at: "2026-09-09T14:55", actor: "Neha Kapoor", actorRole: "super-admin", action: "Suspended user", target: "Vivek Saxena · Career Coach", category: "Users", result: "success" },
  { at: "2026-09-09T11:15", actor: "Dr Suresh Nair", actorRole: "university-admin", action: "Downloaded report", target: "Brightwater executive report · Aug 2026.pdf", category: "Reports", result: "success" },
  { at: "2026-09-08T18:30", actor: "Joseph Mathew", actorRole: "university-admin", action: "Published announcement", target: "Semester 3 internal assessment week", category: "Content", result: "success" },
  { at: "2026-09-08T10:05", actor: "Arjun Shetty", actorRole: "super-admin", action: "Rotated API credentials", target: "Payment gateway integration", category: "Configuration", result: "success" },
  { at: "2026-09-07T13:22", actor: "Priya Menon", actorRole: "programme-admin", action: "Recorded ACCA results", target: "Jun 2026 session · 0 pending", category: "ACCA records", result: "success" },
  { at: "2026-09-05T09:00", actor: "Neha Kapoor", actorRole: "super-admin", action: "Updated privacy policy", target: "Data sharing with partner universities v3", category: "Privacy", result: "success" },
  { at: "2026-09-04T12:40", actor: "Unknown", actorRole: "system", action: "Failed sign-in, 5 attempts", target: "deepa.iyer@zskillup.com · account locked 15 minutes", category: "Access", result: "denied" },
];

export const auditLogs: AuditLog[] = AUDIT_SEEDS.map((l, i) => ({ ...l, id: `au-${String(i + 1).padStart(4, "0")}`, ip: l.actorRole === "system" && l.actor === "System" ? "internal" : `10.24.${(i * 7) % 255}.${(i * 31) % 255}` }));

/* ------------------------------------------------------------------------------------------
 * Usage and activity
 * ---------------------------------------------------------------------------------------- */

export const TOTAL_LEARNERS = programmes.reduce((s, p) => s + p.learners, 0);

export const usageWeekLabels = ["22 Jun", "29 Jun", "6 Jul", "13 Jul", "20 Jul", "27 Jul", "3 Aug", "10 Aug", "17 Aug", "24 Aug", "31 Aug", "7 Sep"];

export const platformUsage = {
  totals: { learners: TOTAL_LEARNERS, staffUsers: platformRoles.filter((r) => r.id !== "student").reduce((s, r) => s + r.users, 0), universities: universities.length, activeCohorts: cohorts.filter((c) => c.status === "running").length },
  weeklyActiveLearners: [352, 361, 388, 412, 447, 468, 489, 502, 516, 531, 544, 553],
  weeklyActiveFaculty: [9, 9, 10, 10, 11, 11, 11, 11, 10, 11, 11, 11],
  weeklyActiveMentors: [5, 5, 6, 6, 6, 7, 7, 7, 6, 7, 7, 6],
  liveClassHours: [96, 101, 118, 131, 140, 142, 146, 149, 151, 150, 153, 155],
  mockAttempts: [120, 96, 88, 104, 132, 141, 168, 172, 190, 214, 236, 251],
  aiTutorSessions: [820, 860, 910, 1010, 1150, 1210, 1290, 1340, 1415, 1490, 1560, 1622],
  avgMinutesPerLearner: [182, 185, 191, 204, 212, 219, 223, 228, 231, 236, 240, 246],
  logins7d: 3920,
  byRole: [
    { role: "Students", active7d: 553, share: 91 },
    { role: "Faculty", active7d: 11, share: 100 },
    { role: "Mentors and career", active7d: 6, share: 86 },
    { role: "Programme Admin", active7d: 7, share: 100 },
    { role: "University Admin", active7d: 4, share: 67 },
  ],
};

export const facultyActivity = staff
  .filter((s) => s.kind === "faculty")
  .map((s, i) => {
    const rng = createRng(700 + i);
    return {
      staffId: s.id,
      classesTaught30d: rng.int(8, 22),
      recordingsUploaded30d: rng.int(6, 20),
      questionsAnswered30d: rng.int(12, 60),
      scriptsGraded30d: rng.int(10, 70),
      contentPublished30d: s.id === "st-farah" || s.id === "st-vikram" ? 0 : rng.int(1, 6),
      avgResponseHours: rng.int(3, 20),
      lastActive: "2026-09-14",
    };
  });

export const mentorActivity = staff
  .filter((s) => s.kind === "mentor" || s.kind === "career")
  .map((s, i) => {
    const rng = createRng(800 + i);
    return {
      staffId: s.id,
      students: s.kind === "career" ? students.filter((x) => x.career.placementEligible).length : students.filter((x) => x.mentorId === s.id).length,
      sessions30d: rng.int(14, 40),
      alertsActioned30d: s.kind === "career" ? 0 : rng.int(10, 32),
      remindersSent30d: rng.int(8, 45),
      interventionsOpen: s.kind === "career" ? 0 : rng.int(2, 9),
      placementsMoved30d: s.kind === "career" ? rng.int(8, 22) : 0,
      lastActive: "2026-09-14",
    };
  });

/* ------------------------------------------------------------------------------------------
 * Cross-university, cohort comparison, progression and career outcomes
 * ---------------------------------------------------------------------------------------- */

const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

function attemptsIn2026(list: Student[]) {
  return list.flatMap((s) => Object.values(s.papers).flatMap((p) => p.attempts)).filter((a) => a.date >= "2026-01-01" && (a.result === "passed" || a.result === "failed"));
}

export const crossUniversityReport = universities.map((u) => {
  const sample = students.filter((s) => s.universityId === u.id);
  const attempts = attemptsIn2026(sample);
  return {
    universityId: u.id,
    name: u.name,
    status: u.status,
    students: u.students,
    cohorts: cohorts.filter((c) => c.universityId === u.id).length,
    avgAttendance: u.headline.avgAttendance,
    avgReadiness: u.headline.avgReadiness,
    atRisk: u.headline.atRisk,
    registeredPct: u.headline.registeredPct,
    passRate2026: pct(attempts.filter((a) => a.result === "passed").length, attempts.length),
    jointCertOnTrackPct: u.headline.jointCertOnTrackPct,
    internshipsPlanned: u.headline.internshipsPlanned,
    openTickets: tickets.filter((t) => t.universityId === u.id && t.status !== "resolved").length,
  };
});

export const studentTypeComparison = (["graduate", "undergraduate"] as const).map((type) => {
  const list = students.filter((s) => s.type === type && s.enrolmentStatus !== "completed");
  const attempts = attemptsIn2026(list);
  const withClasses = list.filter((s) => s.attendance.total > 0);
  return {
    type,
    label: type === "graduate" ? "Graduate learners" : "University undergraduates",
    headcount: type === "graduate" ? 308 : 302,
    sampleSize: list.length,
    avgReadiness: avg(list.map((s) => s.readiness.overall)),
    avgAttendance: avg(withClasses.map((s) => s.attendance.pct)),
    passRate2026: pct(attempts.filter((a) => a.result === "passed").length, attempts.length),
    avgPapersCleared: Math.round((list.reduce((sum, s) => sum + papersCleared(s), 0) / Math.max(1, list.length)) * 10) / 10,
    atRiskPct: pct(list.filter((s) => s.risk.level !== "low").length, list.length),
    feesOverduePct: pct(list.filter((s) => s.fees.status === "overdue").length, list.length),
    placementEligiblePct: pct(list.filter((s) => s.career.placementEligible).length, list.length),
    avgWeeklyHours: Math.round((list.reduce((sum, s) => sum + s.activityHours.slice(-4).reduce((a, b) => a + b, 0) / 4, 0) / Math.max(1, list.length)) * 10) / 10,
  };
});

export const accaProgression = (() => {
  const cleared = (s: Student, codes: PaperCode[]) => codes.every((c) => s.papers[c].status === "passed" || s.papers[c].status === "exempt");
  const registered = students.filter((s) => s.registration.status === "registered");
  const byPaper = PAPER_CODES.map((code) => {
    const attempts = students.flatMap((s) => s.papers[code].attempts).filter((a) => a.result === "passed" || a.result === "failed");
    return {
      paper: code,
      exempt: students.filter((s) => s.papers[code].status === "exempt").length,
      passed: students.filter((s) => s.papers[code].status === "passed").length,
      current: students.filter((s) => ["current", "in-progress"].includes(s.papers[code].status)).length,
      failedOutstanding: students.filter((s) => s.papers[code].status === "failed").length,
      attempts: attempts.length,
      passRate: pct(attempts.filter((a) => a.result === "passed").length, attempts.length),
    };
  });
  return {
    funnel: [
      { label: "Enrolled", value: students.length },
      { label: "ACCA registered", value: registered.length },
      { label: "Applied Knowledge complete", value: students.filter((s) => cleared(s, APPLIED_KNOWLEDGE)).length },
      { label: "Applied Skills complete", value: students.filter((s) => cleared(s, APPLIED_SKILLS)).length },
      { label: "Strategic Professional started", value: students.filter((s) => ["SBL", "SBR"].some((c) => s.papers[c as PaperCode].status !== "not-started")).length },
      { label: "All exams complete", value: students.filter((s) => s.enrolmentStatus === "completed").length },
    ],
    byPaper,
    epsm: {
      complete: students.filter((s) => s.epsm.status === "complete").length,
      inProgress: students.filter((s) => s.epsm.status === "in-progress").length,
      notStarted: students.filter((s) => s.epsm.status === "not-started").length,
    },
    per: {
      complete: students.filter((s) => s.per.status === "complete").length,
      inProgress: students.filter((s) => s.per.status === "in-progress").length,
      avgMonths: avg(students.filter((s) => s.per.status !== "not-started").map((s) => s.per.months)),
    },
    exemptionsApproved: students.reduce((n, s) => n + s.exemptions.filter((e) => e.state === "approved").length, 0),
    exemptionsPending: students.reduce((n, s) => n + s.exemptions.filter((e) => e.state === "estimated" || e.state === "submitted").length, 0),
  };
})();

export const careerOutcomes = {
  ...placementSummary,
  applications: applications.length,
  internships: internshipRecords.length,
  alumniTracked: alumniOutcomes.length,
  alumniAvgCtcLPA: Math.round((alumniOutcomes.reduce((s, a) => s + a.ctcLPA, 0) / alumniOutcomes.length) * 10) / 10,
  alumniByStatus: (["Member", "Affiliate", "Finalist"] as const).map((st) => ({ status: st, count: alumniOutcomes.filter((a) => a.accaStatus === st).length })),
};

/* ------------------------------------------------------------------------------------------
 * Configuration: integrations, certificates, payment rules, exemption rules, mapping, privacy
 * ---------------------------------------------------------------------------------------- */

export const integrations: Integration[] = [
  { id: "int-zoom", name: "Zoom", category: "Video", status: "connected", lastSync: "2026-09-14T09:55", detail: "Live classes, attendance import and cloud recordings", ownerId: "st-arjun" },
  { id: "int-razorpay", name: "Razorpay", category: "Payments", status: "attention", lastSync: "2026-09-13T23:00", detail: "Settlement file delayed by one day. 1 payment awaiting settlement.", ownerId: "st-deepa" },
  { id: "int-whatsapp", name: "WhatsApp Business Platform", category: "Messaging", status: "connected", lastSync: "2026-09-14T10:01", detail: "Reminders, class changes and the assisted inbox", ownerId: "st-arjun" },
  { id: "int-sendgrid", name: "SendGrid", category: "Email", status: "connected", lastSync: "2026-09-14T10:00", detail: "Transactional email and receipts", ownerId: "st-arjun" },
  { id: "int-google", name: "Google Workspace single sign-on", category: "Identity", status: "connected", lastSync: "2026-09-14T08:00", detail: "Staff and Brightwater university sign-in", ownerId: "st-arjun" },
  { id: "int-s3", name: "Amazon S3 (Mumbai)", category: "Storage", status: "connected", lastSync: "2026-09-14T10:02", detail: "Recordings, documents and exports, encrypted at rest", ownerId: "st-arjun" },
  { id: "int-proctor", name: "Proctoring service", category: "Proctoring", status: "connected", lastSync: "2026-09-13T18:00", detail: "Webcam proctoring for mocks, 180-day retention", ownerId: "st-arjun" },
  { id: "int-results", name: "ACCA results import (CSV)", category: "Data", status: "connected", lastSync: "2026-07-15T12:00", detail: "Programme team uploads result files exported from ACCA. No direct ACCA connection.", ownerId: "st-priya" },
  { id: "int-sis-bw", name: "Brightwater student information system", category: "Data", status: "connected", lastSync: "2026-09-14T06:00", detail: "Nightly semester and enrolment sync", ownerId: "st-arjun" },
  { id: "int-sis-nf", name: "Northfield student information system", category: "Data", status: "not-connected", lastSync: "", detail: "Credentials awaited from Northfield IT before go-live on 1 Oct", ownerId: "st-arjun" },
];

export const certificateTemplates: CertificateTemplate[] = [
  { id: "cert-bw-joint", name: "B.Com (Hons) with ACCA · joint certificate of completion", kind: "joint", issuers: ["Brightwater University", "ZSkillup"], universityId: "u-brightwater", rule: "Applied Knowledge complete (BT, MA, FA passed or exempt) + LW passed + attendance in ACCA sessions at least 75% + no overdue fees", signatories: ["Dr Suresh Nair, Programme Director", "Neha Kapoor, Platform Director"], status: "active", issued: 0 },
  { id: "cert-cl-pathway", name: "B.Com with ACCA Pathway · certificate of completion", kind: "joint", issuers: ["Coastline University", "ZSkillup"], universityId: "u-coastline", rule: "Applied Knowledge complete + LW passed + attendance at least 75% + no overdue fees", signatories: ["Joseph Mathew, Programme Coordinator", "Neha Kapoor, Platform Director"], status: "draft", issued: 0 },
  { id: "cert-paper", name: "Paper completion certificate", kind: "paper", issuers: ["ZSkillup"], rule: "Course completed and one full mock at 50% or above", signatories: ["Priya Menon, ACCA Programme Lead"], status: "active", issued: 1284 },
  { id: "cert-programme", name: "ACCA Graduate Pathway · programme completion", kind: "programme", issuers: ["ZSkillup"], rule: "All planned papers passed or exempt and fees cleared", signatories: ["Neha Kapoor, Platform Director"], status: "active", issued: 96 },
  { id: "cert-internship", name: "Internship completion", kind: "internship", issuers: ["ZSkillup"], rule: "480 hours logged and supervisor rating received", signatories: ["Meera Pillai, Internship Coordinator"], status: "active", issued: 41 },
  { id: "cert-epsm", name: "EPSM study support completion", kind: "epsm-support", issuers: ["ZSkillup"], rule: "All EPSM support sessions attended. ACCA confirms EPSM completion separately.", signatories: ["Priya Menon, ACCA Programme Lead"], status: "draft", issued: 0 },
];

export const paymentRules: PaymentRule[] = [
  { id: "pr-late-fee", name: "Late fee", appliesTo: "All instalment plans", rule: "Charged after the plan's grace period", value: "₹500 graduate plans, ₹1,000 university plans", status: "active" },
  { id: "pr-grace", name: "Grace period", appliesTo: "All instalment plans", rule: "Days after due date before an instalment is overdue", value: "7 days graduate, 15 days university", status: "active" },
  { id: "pr-reminders", name: "Reminder schedule", appliesTo: "All instalment plans", rule: "Automatic reminders before and after due date", value: "7 days before, on due date, 8 days after, then weekly", status: "active" },
  { id: "pr-upfront", name: "Upfront discount", appliesTo: "ACCA Graduate Pathway", rule: "Full payment within 7 days of enrolment", value: "5%", status: "active" },
  { id: "pr-refund", name: "Refund window", appliesTo: "Open-market programmes", rule: "Full refund within 14 days of enrolment, less classes attended", value: "14 days", status: "active" },
  { id: "pr-transfer", name: "Cohort transfer", appliesTo: "Graduate cohorts", rule: "Fee difference refunded or charged when moving cohort", value: "Pro rata", status: "active" },
  { id: "pr-acca-fees", name: "ACCA fees tracking", appliesTo: "All learners", rule: "Registration, subscription, exemption and exam fees are paid by learners to ACCA and recorded here for tracking only", value: "GBP, not collected by ZSkillup", status: "active" },
  { id: "pr-block", name: "Mock booking hold", appliesTo: "All learners", rule: "Hold proctored mock booking when an instalment is overdue by more than 30 days", value: "30 days", status: "draft" },
];

export const exemptionRules: ExemptionRule[] = [
  { id: "ex-bcom-in", qualification: "B.Com (recognised Indian university)", body: "Indian universities", exemptPapers: ["BT", "MA", "FA", "LW"], conditions: "Estimated from the degree and mark sheets. LW needs law subjects in the syllabus. ACCA confirms each case.", status: "active", lastReviewed: "2026-06-15", claimsThisYear: 142 },
  { id: "ex-mcom-in", qualification: "M.Com (recognised Indian university)", body: "Indian universities", exemptPapers: ["BT", "MA", "FA", "LW"], conditions: "As B.Com. Additional exemptions only if ACCA's database lists them.", status: "active", lastReviewed: "2026-06-15", claimsThisYear: 18 },
  { id: "ex-bba-fin", qualification: "BBA Finance", body: "Indian universities", exemptPapers: ["BT", "MA", "FA"], conditions: "Estimated from the syllabus. ACCA confirms each case.", status: "under-review", lastReviewed: "2026-09-02", claimsThisYear: 7 },
  { id: "ex-ca-inter", qualification: "CA Intermediate (both groups)", body: "ICAI", exemptPapers: ["BT", "MA", "FA", "LW"], conditions: "Both groups cleared. ACCA confirms each case.", status: "active", lastReviewed: "2026-04-10", claimsThisYear: 23 },
  { id: "ex-ca-final", qualification: "Chartered Accountant (member)", body: "ICAI", exemptPapers: ["BT", "MA", "FA", "LW", "PM", "TX", "FR", "AA", "FM"], conditions: "Estimate up to Applied Knowledge and Applied Skills. ACCA's decision is final.", status: "active", lastReviewed: "2026-04-10", claimsThisYear: 9 },
  { id: "ex-cma-inter", qualification: "CMA Intermediate", body: "ICMAI", exemptPapers: ["BT", "MA", "FA"], conditions: "Estimated from the certificate. ACCA confirms each case.", status: "active", lastReviewed: "2026-03-22", claimsThisYear: 5 },
  { id: "ex-bsc-other", qualification: "Non-commerce degree", body: "Any university", exemptPapers: [], conditions: "No exemptions estimated. Learner starts at Applied Knowledge.", status: "active", lastReviewed: "2026-01-12", claimsThisYear: 31 },
];

export const curriculumMappingFramework = {
  version: "v3.0",
  updated: "2026-06-30",
  ownerId: "st-neha",
  coverageLevels: [
    { id: "full", label: "Full", definition: "The university subject teaches the syllabus area to ACCA exam depth. Learners use ACCA question practice only.", weight: 1 },
    { id: "partial", label: "Partial", definition: "Some outcomes overlap. Learners study the ACCA lessons for the gaps shown in the mapping.", weight: 0.5 },
    { id: "conceptual-only", label: "Conceptual only", definition: "Concepts transfer but rules differ (for example Indian tax against TX-UK). Learners study the full ACCA paper.", weight: 0.2 },
  ],
  rules: [
    "Map at syllabus area level (paper and area letter), never at paper level alone, except conceptual-only mappings.",
    "Faculty for the paper reviews every mapping before it appears on a student roadmap.",
    "University B.Com subjects are taught and managed by the university. The mapping does not deliver them.",
    "Re-review mappings when a university uploads a revised syllabus or ACCA publishes a new syllabus.",
  ],
  approvalFlow: ["Programme Admin uploads curriculum", "Faculty proposes mappings", "Programme Lead approves", "University Admin reviews the semester-to-ACCA roadmap"],
};

export const privacyPolicies: PrivacyPolicy[] = [
  { id: "pp-retention-records", title: "Learner record retention", category: "Retention", setting: "7 years after programme completion", description: "ACCA progress, results and fees are kept for audit, then anonymised.", ownerId: "st-neha", updated: "2026-05-02", status: "enforced" },
  { id: "pp-retention-proctoring", title: "Proctoring recording retention", category: "Retention", setting: "180 days", description: "Webcam recordings are deleted automatically unless a misconduct case is open.", ownerId: "st-arjun", updated: "2026-05-02", status: "enforced" },
  { id: "pp-consent", title: "Consent for university data sharing", category: "Consent", setting: "Collected at enrolment, withdrawable", description: "University-linked learners consent to their ACCA progress being shared with their university.", ownerId: "st-neha", updated: "2026-09-05", status: "enforced" },
  { id: "pp-university-scope", title: "University access scope", category: "Sharing", setting: "Own university learners only", description: "University Admins see learners of their own university. Fees and support tickets show status only.", ownerId: "st-neha", updated: "2026-09-05", status: "enforced" },
  { id: "pp-finance-access", title: "Finance data access", category: "Access", setting: "finance:view permission required", description: "Programme Admins without finance permission cannot open fee or payment pages.", ownerId: "st-arjun", updated: "2026-07-18", status: "enforced" },
  { id: "pp-export", title: "Report exports containing personal data", category: "Access", setting: "Authorised roles, logged", description: "Every export with personal data is logged in the audit log with the requesting user.", ownerId: "st-arjun", updated: "2026-07-18", status: "enforced" },
  { id: "pp-rights", title: "Access and erasure requests", category: "Rights", setting: "Respond within 30 days", description: "Requests under the Digital Personal Data Protection Act, 2023 are handled by the Platform Director.", ownerId: "st-neha", updated: "2026-03-14", status: "enforced" },
  { id: "pp-mfa", title: "Multi-factor authentication", category: "Security", setting: "Required for staff, optional for learners", description: "All ZSkillup staff must use MFA. University editors are prompted to enable it.", ownerId: "st-arjun", updated: "2026-09-11", status: "enforced" },
  { id: "pp-ai-tutor", title: "AI tutor conversation storage", category: "Retention", setting: "90 days, excluded from model training", description: "Conversations are stored for quality review and deleted after 90 days.", ownerId: "st-arjun", updated: "2026-08-20", status: "draft" },
];

export const reportCatalogue: ReportDefinition[] = [
  { id: "rpt-cross-university", name: "Cross-university performance", description: "Attendance, readiness, pass rates and risk by university.", category: "Cross-university", formats: ["CSV", "XLSX", "PDF"], authorisedRoles: ["super-admin"], schedule: "Monthly, 1st", lastRun: "2026-09-01", containsPII: false },
  { id: "rpt-cohort-compare", name: "Graduate and undergraduate comparison", description: "Readiness, attendance, pass rate and outcomes by student type.", category: "Cross-university", formats: ["CSV", "PDF"], authorisedRoles: ["super-admin"], schedule: "On demand", lastRun: "2026-09-10", containsPII: false },
  { id: "rpt-progression", name: "ACCA progression report", description: "Papers cleared, exemptions, EPSM and PER by learner.", category: "Progression", formats: ["CSV", "XLSX"], authorisedRoles: ["super-admin", "programme-admin"], schedule: "After each results release", lastRun: "2026-07-15", containsPII: true },
  { id: "rpt-exam-cycle", name: "Exam cycle bookings", description: "Booked, not booked and entry window by paper for the current session.", category: "Progression", formats: ["CSV"], authorisedRoles: ["super-admin", "programme-admin"], schedule: "Weekly, Monday", lastRun: "2026-09-14", containsPII: true },
  { id: "rpt-careers", name: "Career outcomes", description: "Placement pipeline, offers, joining and alumni outcomes.", category: "Careers", formats: ["CSV", "PDF"], authorisedRoles: ["super-admin", "mentor", "university-admin"], schedule: "Monthly", lastRun: "2026-09-01", containsPII: true },
  { id: "rpt-placement", name: "Placement report", description: "Applications, shortlists, interviews and offers by opportunity.", category: "Careers", formats: ["CSV", "XLSX"], authorisedRoles: ["super-admin", "mentor"], schedule: "Weekly", lastRun: "2026-09-14", containsPII: true },
  { id: "rpt-fees", name: "Enrolled-student fee status", description: "Instalments paid, due and overdue by programme.", category: "Finance", formats: ["CSV", "XLSX"], authorisedRoles: ["super-admin", "programme-admin"], schedule: "Weekly, Monday", lastRun: "2026-09-14", containsPII: true },
  { id: "rpt-reconciliation", name: "Reconciliation summary", description: "Matched and unmatched transactions and refunds.", category: "Finance", formats: ["XLSX"], authorisedRoles: ["super-admin", "programme-admin"], schedule: "Weekly, Friday", lastRun: "2026-09-11", containsPII: false },
  { id: "rpt-support", name: "Support turnaround", description: "Tickets by category, first response and resolution time.", category: "Support", formats: ["CSV", "PDF"], authorisedRoles: ["super-admin", "programme-admin"], schedule: "Weekly", lastRun: "2026-09-14", containsPII: false },
  { id: "rpt-usage", name: "Platform usage", description: "Active learners, faculty and mentors, sessions and minutes.", category: "Usage", formats: ["CSV", "PDF"], authorisedRoles: ["super-admin"], schedule: "Weekly", lastRun: "2026-09-14", containsPII: false },
  { id: "rpt-university-student", name: "University student report", description: "One row per learner: semester, ACCA progress, attendance, readiness, risk.", category: "University", formats: ["CSV", "XLSX"], authorisedRoles: ["super-admin", "programme-admin", "university-admin"], schedule: "On demand", lastRun: "2026-09-09", containsPII: true },
  { id: "rpt-university-cohort", name: "University cohort report", description: "Section-level attendance, mocks and pass rates.", category: "University", formats: ["CSV", "PDF"], authorisedRoles: ["super-admin", "programme-admin", "university-admin"], schedule: "Monthly", lastRun: "2026-09-01", containsPII: false },
  { id: "rpt-university-executive", name: "University executive report", description: "Two-page summary for university leadership.", category: "University", formats: ["PDF"], authorisedRoles: ["super-admin", "programme-admin", "university-admin"], schedule: "Monthly", lastRun: "2026-09-01", containsPII: false },
];
