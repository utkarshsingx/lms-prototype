import { addDays, createRng } from "./types";
import type {
  AlumniOutcome,
  Application,
  CareerProfile,
  CompanyReadiness,
  InternshipRecord,
  MockInterview,
  Opportunity,
  PlacementStage,
  Resume,
  Student,
  TransitionRoadmap,
} from "./types";
import { papersCleared, students } from "./students";

export const PLACEMENT_STAGES: { id: PlacementStage; label: string; tone: "info" | "amber" | "violet" | "jade" | "rose" }[] = [
  { id: "applied", label: "Applied", tone: "info" },
  { id: "shortlisted", label: "Shortlisted", tone: "amber" },
  { id: "interview", label: "Interview", tone: "violet" },
  { id: "offer", label: "Offer", tone: "jade" },
  { id: "joined", label: "Joined", tone: "jade" },
  { id: "rejected", label: "Rejected", tone: "rose" },
];

const careerStudents = students.filter((s) => s.career.atsScore !== null);

/* ------------------------------------------------------------------------------------------
 * Opportunities
 * ---------------------------------------------------------------------------------------- */

export const opportunities: Opportunity[] = [
  { id: "op-01", title: "Audit associate", company: "Ashgrove Audit Partners", kind: "job", location: "Bengaluru", workMode: "Hybrid", compensation: "₹5.5 to 6.5 LPA", openings: 6, postedOn: "2026-08-25", closesOn: "2026-09-30", postedBy: "st-rahul", status: "open", eligibility: { studentTypes: ["graduate"], minPapersCleared: 5, requiredPapers: ["FA"], minCompanyReadiness: 55, minAts: 60, placementEligibleOnly: true, note: "Applied Skills in progress, AA preferred" }, description: "Statutory audits for mid-sized manufacturing and services clients across Karnataka.", skills: ["ISA fundamentals", "Excel", "Audit documentation"] },
  { id: "op-02", title: "Financial reporting analyst", company: "Lumen Global Services", kind: "job", location: "Hyderabad", workMode: "On-site", compensation: "₹6 to 7.5 LPA", openings: 4, postedOn: "2026-08-18", closesOn: "2026-09-26", postedBy: "st-rahul", status: "open", eligibility: { studentTypes: ["graduate"], minPapersCleared: 6, requiredPapers: [], minCompanyReadiness: 60, minAts: 62, placementEligibleOnly: true, note: "FR in progress or passed" }, description: "Monthly close and IFRS reporting for UK and European clients of a shared services centre.", skills: ["IFRS", "Consolidation", "Reconciliations"] },
  { id: "op-03", title: "Assistant manager, financial reporting", company: "Crescent Fintech", kind: "job", location: "Mumbai", workMode: "Hybrid", compensation: "₹12 to 15 LPA", openings: 2, postedOn: "2026-08-10", closesOn: "2026-09-20", postedBy: "st-rahul", status: "open", eligibility: { studentTypes: ["graduate"], minPapersCleared: 10, requiredPapers: ["FR"], minCompanyReadiness: 70, minAts: 70, placementEligibleOnly: true, note: "Strategic Professional learners" }, description: "Group reporting, IFRS 9 and board packs for a regulated lending business.", skills: ["IFRS 9", "Group reporting", "Stakeholder communication"] },
  { id: "op-04", title: "FP&A analyst", company: "Orchid Pharma Finance", kind: "job", location: "Ahmedabad", workMode: "On-site", compensation: "₹7 to 8 LPA", openings: 3, postedOn: "2026-09-01", closesOn: "2026-10-10", postedBy: "st-rahul", status: "open", eligibility: { studentTypes: ["graduate"], minPapersCleared: 5, requiredPapers: [], minCompanyReadiness: 55, minAts: 58, placementEligibleOnly: true, note: "FM or PM studied" }, description: "Budgeting, forecasting and variance commentary for the formulations business.", skills: ["Budgeting", "Variance analysis", "Power BI"] },
  { id: "op-05", title: "Tax associate (UK tax)", company: "Marlow and Iyer Chartered Accountants", kind: "job", location: "Pune", workMode: "Hybrid", compensation: "₹5 to 6 LPA", openings: 3, postedOn: "2026-09-03", closesOn: "2026-10-03", postedBy: "st-rahul", status: "open", eligibility: { studentTypes: ["graduate"], minPapersCleared: 5, requiredPapers: ["TX"], minCompanyReadiness: 50, minAts: 55, placementEligibleOnly: true, note: "TX passed" }, description: "UK personal and corporate tax compliance for an outsourcing practice.", skills: ["TX-UK", "Tax computations", "Client communication"] },
  { id: "op-06", title: "Management accountant", company: "Kestrel Logistics", kind: "job", location: "Gurugram", workMode: "On-site", compensation: "₹6.5 LPA", openings: 2, postedOn: "2026-09-05", closesOn: "2026-10-15", postedBy: "st-rahul", status: "open", eligibility: { studentTypes: ["graduate"], minPapersCleared: 5, requiredPapers: ["MA"], minCompanyReadiness: 55, minAts: 55, placementEligibleOnly: true, note: "PM in progress acceptable" }, description: "Costing, route profitability and monthly management packs.", skills: ["Costing", "Excel", "Performance reporting"] },
  { id: "op-07", title: "Audit intern", company: "Ashgrove Audit Partners", kind: "internship", location: "Pune", workMode: "On-site", compensation: "₹18,000 per month", openings: 10, postedOn: "2026-09-02", closesOn: "2026-10-20", postedBy: "st-meera", status: "open", eligibility: { studentTypes: ["undergraduate", "graduate"], minPapersCleared: 2, requiredPapers: [], minCompanyReadiness: 40, minAts: 45, placementEligibleOnly: false, note: "Starts 14 Dec 2026, after Brightwater examinations" }, description: "Six-week winter internship on year-end audits.", skills: ["Vouching", "Excel", "Attention to detail"] },
  { id: "op-08", title: "Finance operations intern", company: "Tidewater Shared Services", kind: "internship", location: "Bengaluru", workMode: "Hybrid", compensation: "₹15,000 per month", openings: 8, postedOn: "2026-08-28", closesOn: "2026-10-05", postedBy: "st-meera", status: "open", eligibility: { studentTypes: ["undergraduate", "graduate"], minPapersCleared: 2, requiredPapers: ["FA"], minCompanyReadiness: 40, minAts: 45, placementEligibleOnly: false, note: "FA passed or current" }, description: "Accounts payable and bank reconciliation for global clients.", skills: ["Reconciliations", "ERP basics"] },
  { id: "op-09", title: "Summer internship: transaction advisory", company: "Veda Capital Advisors", kind: "internship", location: "Mumbai", workMode: "On-site", compensation: "₹25,000 per month", openings: 4, postedOn: "2026-09-10", closesOn: "2026-12-15", postedBy: "st-meera", status: "open", eligibility: { studentTypes: ["undergraduate"], minPapersCleared: 3, requiredPapers: ["MA"], minCompanyReadiness: 50, minAts: 50, placementEligibleOnly: false, note: "May to Jun 2027" }, description: "Financial due diligence support on mid-market deals.", skills: ["Financial analysis", "Excel modelling"] },
  { id: "op-10", title: "Reporting analyst", company: "Silverline Retail", kind: "job", location: "Chennai", workMode: "On-site", compensation: "₹5.5 LPA", openings: 2, postedOn: "2026-09-13", closesOn: "2026-10-31", postedBy: "st-rahul", status: "draft", eligibility: { studentTypes: ["graduate"], minPapersCleared: 6, requiredPapers: [], minCompanyReadiness: 55, minAts: 60, placementEligibleOnly: true, note: "Draft, awaiting salary confirmation" }, description: "Store profitability and monthly reporting.", skills: ["Excel", "Retail KPIs"] },
  { id: "op-11", title: "Audit semi-senior", company: "Northstar Consulting", kind: "job", location: "Kochi", workMode: "Hybrid", compensation: "₹8 to 9 LPA", openings: 2, postedOn: "2026-07-01", closesOn: "2026-08-15", postedBy: "st-rahul", status: "closed", eligibility: { studentTypes: ["graduate"], minPapersCleared: 9, requiredPapers: ["AA"], minCompanyReadiness: 65, minAts: 65, placementEligibleOnly: true, note: "AA passed" }, description: "Lead fieldwork on statutory audits.", skills: ["AA", "Team supervision"] },
];

export function opportunityById(id: string) {
  return opportunities.find((o) => o.id === id);
}

/** Eligibility check used by "Match eligible students". */
export function isEligibleFor(student: Student, opp: Opportunity) {
  const e = opp.eligibility;
  const cleared = (c: string) => student.papers[c as keyof Student["papers"]]?.status === "passed" || student.papers[c as keyof Student["papers"]]?.status === "exempt";
  const reasons: string[] = [];
  if (!e.studentTypes.includes(student.type)) reasons.push("Student type");
  if (e.placementEligibleOnly && !student.career.placementEligible) reasons.push("Not placement-eligible");
  if (papersCleared(student) < e.minPapersCleared) reasons.push(`Needs ${e.minPapersCleared} papers cleared`);
  for (const p of e.requiredPapers) if (!cleared(p)) reasons.push(`${p} not cleared`);
  if ((student.career.companyReadiness ?? 0) < e.minCompanyReadiness) reasons.push(`Company Readiness Score below ${e.minCompanyReadiness}`);
  if ((student.career.atsScore ?? 0) < e.minAts) reasons.push(`ATS score below ${e.minAts}`);
  return { eligible: reasons.length === 0, reasons };
}

export function eligibleStudentsFor(opportunityId: string) {
  const opp = opportunityById(opportunityId);
  return opp ? students.filter((s) => isEligibleFor(s, opp).eligible) : [];
}

/* ------------------------------------------------------------------------------------------
 * Applications and placement pipeline
 * ---------------------------------------------------------------------------------------- */

const PROFILE_OPPORTUNITY: Record<string, string> = {
  "fr-current": "op-02",
  "fr-weekday": "op-02",
  "fr-reattempt": "op-06",
  "pm-reattempt": "op-04",
  "aa-current": "op-01",
  "fm-fast": "op-04",
  "sbr-current": "op-03",
  alumni: "op-03",
};

function buildApplications(): Application[] {
  const rng = createRng(6060);
  const out: Application[] = [];
  let n = 1;
  const add = (a: Omit<Application, "id">) => out.push({ ...a, id: `ap-${String(n++).padStart(3, "0")}` });
  for (const s of students) {
    const stage = s.career.placementStage;
    if (stage) {
      const profile = s.scenarioTags.find((t) => PROFILE_OPPORTUNITY[t]);
      const oppId = s.id === "s-anaya" ? "op-01" : profile ? PROFILE_OPPORTUNITY[profile] : "op-02";
      const rank = ["applied", "shortlisted", "interview", "offer", "joined"].indexOf(stage);
      const appliedOn = stage === "joined" ? `2026-0${rng.int(3, 6)}-1${rng.int(0, 9)}` : `2026-0${rng.int(8, 9)}-0${rng.int(1, 9)}`;
      const interviewDate = stage === "interview" ? `2026-09-${15 + rng.int(0, 10)}T${10 + rng.int(0, 6)}:00` : addDays(appliedOn, 12) + "T11:00";
      add({
        opportunityId: oppId,
        studentId: s.id,
        stage,
        appliedOn,
        updated: stage === "applied" ? appliedOn : addDays(appliedOn, rng.int(5, 20)),
        matchScore: Math.min(97, (s.career.companyReadiness ?? 50) + rng.int(5, 15)),
        shortlistedBy: rank >= 1 || stage === "rejected" ? "st-rahul" : undefined,
        interview: rank >= 2 || stage === "rejected" ? { date: interviewDate, round: stage === "interview" ? "Technical round" : "Final round", mode: rng.chance(0.5) ? "Video" : "On-site", panel: `${opportunityById(oppId)!.company} hiring panel` } : undefined,
        recruiterFeedback:
          stage === "rejected"
            ? "Good technical base but struggled to explain consolidation adjustments. Encourage to reapply after FR."
            : rank >= 3
              ? "Clear communicator, strong IFRS basics, practical Excel skills."
              : undefined,
        offer:
          rank >= 3
            ? {
                ctcLPA: oppId === "op-03" ? 13.5 : oppId === "op-04" ? 7.4 : 6.2 + rng.int(0, 8) / 10,
                offeredOn: addDays(appliedOn, 24),
                joiningDate: stage === "joined" ? addDays(appliedOn, 60) : "2026-12-14",
                status: stage === "joined" ? "joined" : "accepted",
              }
            : undefined,
      });
    }
    if (s.type === "undergraduate" && (s.career.internship.status === "applied" || s.scenarioTags.includes("intern-planned"))) {
      const shortlisted = s.career.internship.status === "applied" && papersCleared(s) >= 3;
      add({ opportunityId: s.career.internship.status === "applied" ? "op-07" : "op-09", studentId: s.id, stage: shortlisted ? "shortlisted" : "applied", appliedOn: `2026-09-0${rng.int(3, 9)}`, updated: "2026-09-12", matchScore: 55 + rng.int(0, 25), shortlistedBy: shortlisted ? "st-meera" : undefined });
    }
  }
  // Extra applications so the pipeline has depth per opportunity.
  const eligible = students.filter((s) => s.career.placementEligible && s.id !== "s-anaya");
  eligible.slice(0, 8).forEach((s, i) => {
    add({ opportunityId: i % 2 ? "op-05" : "op-01", studentId: s.id, stage: i % 4 === 3 ? "rejected" : "applied", appliedOn: `2026-09-${10 + (i % 4)}`, updated: "2026-09-13", matchScore: 60 + rng.int(0, 20), recruiterFeedback: i % 4 === 3 ? "Profile shortlisted for a later drive after TX results." : undefined });
  });
  return out;
}

export const applications: Application[] = buildApplications();

export function applicationsForStudent(studentId: string) {
  return applications.filter((a) => a.studentId === studentId);
}

export function applicationsForOpportunity(opportunityId: string) {
  return applications.filter((a) => a.opportunityId === opportunityId);
}

export const interviewSchedule = applications
  .filter((a) => a.interview && a.interview.date >= "2026-09-14")
  .map((a) => ({ applicationId: a.id, studentId: a.studentId, opportunityId: a.opportunityId, ...a.interview! }))
  .sort((a, b) => a.date.localeCompare(b.date));

/* ------------------------------------------------------------------------------------------
 * Career profiles, resumes, interviews, readiness
 * ---------------------------------------------------------------------------------------- */

const SKILLS: Record<string, string[]> = {
  graduate: ["IFRS reporting", "Month-end close", "Excel (pivot tables, XLOOKUP)", "Reconciliations", "Tally ERP", "Stakeholder communication"],
  undergraduate: ["Excel", "Tally ERP", "Bookkeeping", "Presentation skills"],
};

export const careerProfiles: CareerProfile[] = careerStudents.map((s, i) => ({
  studentId: s.id,
  headline: s.type === "graduate" ? `${s.background.occupation ?? "Finance graduate"} · ACCA ${papersCleared(s)} of 13 exams cleared` : `${s.background.qualification} · ACCA learner`,
  targetRoles: [s.career.targetRole, ...(s.type === "graduate" ? ["Financial analyst"] : ["Accounts intern"])],
  preferredCities: s.type === "graduate" ? [s.city, i % 2 ? "Bengaluru" : "Hyderabad"].filter((c, k, arr) => arr.indexOf(c) === k) : [s.city],
  skills: SKILLS[s.type].slice(0, 3 + (i % 3)),
  experience: s.background.occupation ? [{ role: s.background.occupation.split(",")[0], organisation: s.background.occupation.split(", ")[1] ?? "", period: `${2023 + (i % 2)} to present` }] : [],
  completeness: Math.min(100, 45 + (s.career.atsScore ?? 40) / 2 + (s.career.placementEligible ? 10 : 0)),
  updated: s.career.resume.updated ?? "2026-08-01",
  ownerId: s.career.placementEligible ? "st-rahul" : s.mentorId,
}));

const MISSING_KEYWORDS = ["IFRS 15", "Consolidation", "Variance analysis", "Audit sampling", "Power BI", "SAP", "Stakeholder reporting"];

export const resumes: Resume[] = careerStudents.map((s, i) => {
  const ats = s.career.atsScore!;
  const status: Resume["status"] = s.career.resume.status === "not-started" ? "draft" : s.career.resume.status;
  return {
    id: `rs-${s.id.slice(2)}`,
    studentId: s.id,
    version: `v${1 + (i % 3)}`,
    updated: s.career.resume.updated ?? "2026-08-01",
    atsScore: ats,
    status,
    reviewerId: status === "draft" ? undefined : "st-rahul",
    breakdown: [
      { label: "Format and parsing", score: Math.min(100, ats + 12) },
      { label: "Keywords for target role", score: Math.max(20, ats - 9) },
      { label: "Quantified impact", score: Math.max(20, ats - 14 + (i % 7)) },
      { label: "ACCA progress shown", score: Math.min(100, ats + 6) },
    ],
    feedback:
      s.id === "s-anaya"
        ? ["Lead with audit-relevant work: reconciliations and vendor audits at Tidewater.", "Show TX passed and FR in progress in the headline.", "Quantify the month-end close improvement."]
        : ats >= 75
          ? ["Strong structure. Add one quantified achievement per role."]
          : ["Move ACCA progress above education.", "Replace duties with outcomes and numbers.", "Add keywords from the target job description."],
    missingKeywords: MISSING_KEYWORDS.slice(i % 4, (i % 4) + (ats >= 75 ? 1 : 3)),
  };
});

export function resumeForStudent(studentId: string) {
  return resumes.find((r) => r.studentId === studentId);
}

function buildInterviews(): MockInterview[] {
  const rng = createRng(4242);
  const out: MockInterview[] = [];
  let n = 1;
  for (const s of careerStudents) {
    const base = s.career.companyReadiness ?? 50;
    const count = s.career.placementEligible ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const mentor = s.career.placementEligible && k === 1;
      const done = !(mentor && n % 5 === 0);
      const score = done ? Math.max(35, Math.min(92, base + rng.int(-8, 8))) : null;
      out.push({
        id: `mi-${String(n++).padStart(3, "0")}`,
        studentId: s.id,
        kind: mentor ? "mentor" : "ai",
        interviewerId: mentor ? (s.type === "undergraduate" ? "st-meera" : "st-rahul") : undefined,
        role: s.career.targetRole,
        date: done ? `2026-0${rng.int(7, 9)}-0${rng.int(1, 9)}` : `2026-09-${16 + rng.int(0, 9)}`,
        durationMins: mentor ? 45 : 20,
        status: done ? "completed" : "scheduled",
        score,
        rubric: done
          ? [
              { label: "Technical accuracy", score: Math.max(30, (score ?? 0) + rng.int(-6, 6)) },
              { label: "Communication", score: Math.max(30, (score ?? 0) + rng.int(-6, 6)) },
              { label: "Structured thinking", score: Math.max(30, (score ?? 0) + rng.int(-6, 6)) },
              { label: "Professional presence", score: Math.max(30, (score ?? 0) + rng.int(-6, 6)) },
            ]
          : [],
        strengths: done ? ["Explains accounting treatment with examples", "Calm under follow-up questions"].slice(0, 1 + (n % 2)) : [],
        improvements: done ? ["Use the STAR format for behavioural answers", "Link answers to the employer's clients"].slice(0, 1 + ((n + 1) % 2)) : [],
        feedback: done ? (mentor ? "Solid technical answers. Practise a two-minute summary of your ACCA journey and current role." : "AI interviewer: answers were accurate but long. Aim for 90 seconds per answer.") : "",
      });
    }
  }
  return out;
}

export const mockInterviews: MockInterview[] = buildInterviews();

export function interviewsForStudent(studentId: string) {
  return mockInterviews.filter((m) => m.studentId === studentId);
}

export const companyReadiness: CompanyReadiness[] = careerStudents
  .filter((s) => s.career.companyReadiness !== null)
  .map((s, i) => {
    const score = s.career.companyReadiness!;
    const academic = Math.min(100, Math.round((papersCleared(s) / 13) * 100) + 20);
    const ats = s.career.atsScore ?? 50;
    const attendance = s.attendance.total ? s.attendance.pct : 80;
    const professional = s.epsm.progress;
    const interview = Math.max(20, Math.min(95, Math.round((score * 100 - (30 * academic + 20 * ats + 15 * attendance + 10 * professional)) / 25)));
    return {
      studentId: s.id,
      score,
      band: score >= 70 ? "Ready" : score >= 55 ? "Nearly ready" : "Developing",
      components: [
        { label: "ACCA progress", weight: 30, score: academic },
        { label: "ATS resume score", weight: 20, score: ats },
        { label: "Mock interviews", weight: 25, score: interview },
        { label: "Attendance and engagement", weight: 15, score: attendance },
        { label: "Professional skills (EPSM)", weight: 10, score: professional },
      ],
      trend: [score - 12 + (i % 3), score - 9, score - 6 + (i % 2), score - 4, score - 2, score],
    };
  });

export function companyReadinessFor(studentId: string) {
  return companyReadiness.find((c) => c.studentId === studentId);
}

/* ------------------------------------------------------------------------------------------
 * Internships, alumni and Anaya's transition roadmap
 * ---------------------------------------------------------------------------------------- */

export const internshipRecords: InternshipRecord[] = students
  .filter((s) => ["ongoing", "completed", "planned"].includes(s.career.internship.status))
  .map((s, i) => {
    const st = s.career.internship.status as InternshipRecord["status"];
    return {
      id: `in-rec-${String(i + 1).padStart(2, "0")}`,
      studentId: s.id,
      company: s.career.internship.company ?? (st === "planned" ? "To be matched" : "Tidewater Shared Services"),
      role: s.type === "undergraduate" ? "Audit intern" : "Finance intern",
      start: st === "completed" ? "2026-05-04" : st === "ongoing" ? "2026-08-03" : "2027-05-03",
      end: st === "completed" ? "2026-07-24" : st === "ongoing" ? "2026-11-27" : "2027-06-25",
      status: st,
      hoursLogged: st === "completed" ? 480 : st === "ongoing" ? 190 + i * 7 : 0,
      hoursRequired: 480,
      supervisor: st === "planned" ? "Not assigned" : "Kiran Desai",
      rating: st === "completed" ? 4.5 : null,
      certificate: st === "completed" ? "issued" : st === "ongoing" ? "pending" : "not-due",
    };
  });

export const alumniOutcomes: AlumniOutcome[] = [
  ...students
    .filter((s) => s.enrolmentStatus === "completed")
    .map((s, i) => ({
      id: `al-${String(i + 1).padStart(2, "0")}`,
      name: s.name,
      studentId: s.id,
      programmeId: s.programmeId,
      completedYear: 2026,
      accaStatus: "Affiliate" as const,
      role: i === 0 ? "Assistant manager, financial reporting" : "Senior associate, audit",
      company: i === 0 ? "Crescent Fintech" : "Northstar Consulting",
      city: s.city,
      ctcLPA: i === 0 ? 13.5 : 9.8,
    })),
  { id: "al-10", name: "Rhea Kulkarni", programmeId: "pr-graduate", completedYear: 2025, accaStatus: "Member", role: "Manager, group reporting", company: "Lumen Global Services", city: "Hyderabad", ctcLPA: 18 },
  { id: "al-11", name: "Mohit Arora", programmeId: "pr-graduate", completedYear: 2025, accaStatus: "Affiliate", role: "Audit senior", company: "Ashgrove Audit Partners", city: "Bengaluru", ctcLPA: 9.2 },
  { id: "al-12", name: "Fatima Sheikh", programmeId: "pr-strategic", completedYear: 2025, accaStatus: "Affiliate", role: "FP&A lead", company: "Orchid Pharma Finance", city: "Ahmedabad", ctcLPA: 12.4 },
  { id: "al-13", name: "Arvind Menon", programmeId: "pr-fasttrack", completedYear: 2024, accaStatus: "Member", role: "Tax manager (UK)", company: "Marlow and Iyer Chartered Accountants", city: "Pune", ctcLPA: 16.5 },
  { id: "al-14", name: "Revathi Pillai", programmeId: "pr-graduate", completedYear: 2024, accaStatus: "Member", role: "Internal audit manager", company: "Kestrel Logistics", city: "Gurugram", ctcLPA: 17.2 },
  { id: "al-15", name: "Tarun Bhatia", programmeId: "pr-graduate", completedYear: 2025, accaStatus: "Finalist", role: "Reporting analyst", company: "Silverline Retail", city: "Chennai", ctcLPA: 7.1 },
  { id: "al-16", name: "Nabeel Khan", programmeId: "pr-strategic", completedYear: 2026, accaStatus: "Affiliate", role: "Transaction advisory associate", company: "Veda Capital Advisors", city: "Mumbai", ctcLPA: 11 },
  { id: "al-17", name: "Ishita Das", programmeId: "pr-graduate", completedYear: 2024, accaStatus: "Member", role: "Finance business partner", company: "Tidewater Shared Services", city: "Bengaluru", ctcLPA: 15.6 },
];

export const careerTransitionRoadmaps: TransitionRoadmap[] = [
  {
    studentId: "s-anaya",
    from: "Accounts executive",
    to: "Audit associate",
    targetDate: "2027-06-30",
    progressPct: 42,
    milestones: [
      { id: "m1", label: "Clear Applied Knowledge and LW", due: "2025-03-18", status: "done", detail: "BT, MA, FA and LW exempt, approved by ACCA in Mar 2025." },
      { id: "m2", label: "Pass TX", due: "2026-03-05", status: "done", detail: "Passed Mar 2026 with 58%." },
      { id: "m3", label: "Resume refocused on audit", due: "2026-09-20", status: "current", detail: "ATS score 71. Resume in review with the placement team." },
      { id: "m4", label: "Pass FR and PM in Dec 2026", due: "2026-12-10", status: "upcoming", detail: "FR readiness 64, PM reattempt readiness 58." },
      { id: "m5", label: "Two mentor mock interviews for audit roles", due: "2026-11-15", status: "upcoming", detail: "Company Readiness Score target 70." },
      { id: "m6", label: "Pass AA in Mar 2027", due: "2027-03-04", status: "upcoming", detail: "Core paper for audit associate roles." },
      { id: "m7", label: "Move into an audit associate role", due: "2027-06-30", status: "upcoming", detail: "Applied to Ashgrove Audit Partners, Bengaluru." },
    ],
    skillGaps: [
      { skill: "ISA fundamentals", current: 35, target: 70 },
      { skill: "Audit documentation", current: 30, target: 65 },
      { skill: "IFRS reporting", current: 60, target: 75 },
      { skill: "Excel data analysis", current: 70, target: 80 },
      { skill: "Client communication", current: 55, target: 70 },
    ],
    targetRoles: [
      { title: "Audit associate", fit: 68, note: "Best fit once AA is in progress" },
      { title: "Financial reporting analyst", fit: 64, note: "Strong after FR" },
      { title: "Internal audit analyst", fit: 58, note: "Needs AA and governance exposure" },
    ],
  },
];

export function transitionRoadmapFor(studentId: string) {
  return careerTransitionRoadmaps.find((r) => r.studentId === studentId);
}

/* ------------------------------------------------------------------------------------------
 * Placement report aggregates
 * ---------------------------------------------------------------------------------------- */

export const placementSummary = (() => {
  const byStage = Object.fromEntries(PLACEMENT_STAGES.map((st) => [st.id, applications.filter((a) => a.stage === st.id).length])) as Record<PlacementStage, number>;
  const offers = applications.filter((a) => a.offer);
  const avgCtc = offers.length ? Math.round((offers.reduce((s, a) => s + a.offer!.ctcLPA, 0) / offers.length) * 10) / 10 : 0;
  return {
    placementEligible: students.filter((s) => s.career.placementEligible).length,
    applications: applications.length,
    byStage,
    offers: offers.length,
    joined: byStage.joined,
    avgOfferLPA: avgCtc,
    internshipsOngoing: internshipRecords.filter((r) => r.status === "ongoing").length,
    internshipsCompleted: internshipRecords.filter((r) => r.status === "completed").length,
    openOpportunities: opportunities.filter((o) => o.status === "open").length,
    monthly: [
      { month: "Apr 2026", offers: 3, joined: 2 },
      { month: "May 2026", offers: 4, joined: 3 },
      { month: "Jun 2026", offers: 6, joined: 4 },
      { month: "Jul 2026", offers: 5, joined: 5 },
      { month: "Aug 2026", offers: 7, joined: 4 },
      { month: "Sep 2026", offers: offers.length, joined: byStage.joined },
    ],
  };
})();
