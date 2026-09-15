"use client";

import { useSyncExternalStore } from "react";
import {
  ACCA_TODAY,
  addDays,
  alumniOutcomes,
  applications,
  careerProfiles,
  companyReadiness,
  internshipRecords,
  mockInterviews,
  opportunities,
  resumes,
  staffName,
  type AlumniOutcome,
  type Application,
  type CareerProfile,
  type CompanyReadiness,
  type InternshipRecord,
  type MockInterview,
  type Opportunity,
  type Resume,
} from "@/lib/data/acca";

/*
 * Session store for the career team pages. Kept at module level so a shortlist made on
 * Jobs & internships shows up on the Placement pipeline and in Placement reports after a
 * client-side navigation. A full reload starts again from the sample data.
 */

export type ResumeSectionId = "summary" | "acca" | "experience" | "education" | "skills";

export type ResumeComment = {
  id: string;
  section: ResumeSectionId;
  author: string;
  body: string;
  at: string;
  resolved: boolean;
};

export type CareerResume = Resume & { comments: ResumeComment[] };

export type LocationRule = "any" | "preferred";

export type CareerOpportunity = Opportunity & {
  /** Minimum overall ACCA readiness score, 0 = no rule. */
  minReadiness: number;
  /** "preferred": only learners whose preferred cities include the job location. */
  locationRule: LocationRule;
};

export type Competency = { label: string; rating: number };

export type InterviewStatus = "scheduled" | "awaiting-feedback" | "completed";

export type CareerInterview = Omit<MockInterview, "status"> & {
  status: InterviewStatus;
  /** "18:00" for scheduled mentor interviews. */
  time?: string;
  mode?: "Video" | "In person" | "Phone";
  competencies?: Competency[];
  recommendation?: string;
  recordedBy?: string;
  sharedWithStudent?: boolean;
};

export type CareerApplication = Application & {
  recruiterName?: string;
  recruiterRating?: number;
  recruiterOutcome?: string;
  feedbackOn?: string;
};

export type CareerInternship = InternshipRecord & {
  supervisorFeedback: string;
  weeklyLogs: number;
};

export type ReportRun = {
  id: string;
  file: string;
  scope: string;
  period: string;
  format: string;
  requestedBy: string;
  requested: string;
  status: "Ready" | "Queued";
};

export type CareersState = {
  opportunities: CareerOpportunity[];
  applications: CareerApplication[];
  interviews: CareerInterview[];
  readiness: CompanyReadiness[];
  profiles: CareerProfile[];
  resumes: CareerResume[];
  internships: CareerInternship[];
  alumni: AlumniOutcome[];
  reportRuns: ReportRun[];
};

function sectionFor(text: string): ResumeSectionId {
  if (/keyword/i.test(text)) return "skills";
  if (/headline|ACCA progress|TX passed|FR in progress/i.test(text)) return /headline/i.test(text) ? "summary" : "acca";
  return "experience";
}

const MIN_READINESS: Record<string, number> = { "op-03": 65, "op-02": 55, "op-01": 50 };

const LAST_WORKING_DAY = "2026-09-12";
const pastDate = (iso: string) => (iso.slice(0, 10) > LAST_WORKING_DAY ? LAST_WORKING_DAY : iso.slice(0, 10));

/*
 * lib/data/acca/careers.ts already pulls decided records back to the last working day and rounds
 * CTC. This pass is kept as a guard (it is idempotent) so the pipeline always reads in order.
 */
function normaliseApplication(a: Application): Application {
  const decided = a.stage === "offer" || a.stage === "joined" || a.stage === "rejected";
  const interview =
    a.interview && decided && a.interview.date.slice(0, 10) >= ACCA_TODAY
      ? { ...a.interview, date: `${pastDate(addDays(a.appliedOn, 5))}T${a.interview.date.slice(11, 16) || "11:00"}` }
      : a.interview;
  const offer = a.offer
    ? {
        ...a.offer,
        ctcLPA: Math.round(a.offer.ctcLPA * 10) / 10,
        offeredOn: pastDate(a.offer.offeredOn),
      }
    : undefined;
  return { ...a, updated: a.updated > ACCA_TODAY ? pastDate(a.updated) : a.updated, interview, offer };
}

const INTERVIEW_TIMES = ["11:00", "16:30", "18:00", "10:30", "15:00", "19:00"];

function seed(): CareersState {
  let scheduled = 0;
  return {
    opportunities: opportunities.map((o) => ({
      ...o,
      minReadiness: MIN_READINESS[o.id] ?? 0,
      locationRule: "any",
    })),
    applications: applications.map(normaliseApplication).map((a) => ({
      ...a,
      recruiterName: a.recruiterFeedback ? (a.interview?.panel ?? "Hiring panel") : undefined,
      recruiterRating: a.recruiterFeedback ? (a.stage === "rejected" ? 2 : 4) : undefined,
      recruiterOutcome: a.recruiterFeedback
        ? a.stage === "rejected"
          ? "Not selected"
          : a.stage === "offer" || a.stage === "joined"
            ? "Move to offer"
            : "Next round"
        : undefined,
      feedbackOn: a.recruiterFeedback ? a.updated : undefined,
    })),
    interviews: mockInterviews.map((m) => {
      if (m.status !== "scheduled") return { ...m, status: "completed" as const, sharedWithStudent: true };
      const time = INTERVIEW_TIMES[scheduled++ % INTERVIEW_TIMES.length];
      return { ...m, time, mode: "Video" as const };
    }),
    readiness: companyReadiness.map((c) => ({ ...c, components: c.components.map((x) => ({ ...x })), trend: [...c.trend] })),
    profiles: careerProfiles.map((p) => ({ ...p })),
    resumes: resumes.map((r) => ({
      ...r,
      comments:
        r.status === "draft"
          ? []
          : r.feedback.map((body, i) => ({
              id: `${r.id}-c${i + 1}`,
              section: sectionFor(body),
              author: r.reviewerId ? staffName(r.reviewerId) : "Rahul Verma",
              body,
              at: r.updated,
              resolved: r.status === "approved",
            })),
    })),
    internships: internshipRecords.map((r) => ({
      ...r,
      supervisorFeedback:
        r.status === "completed"
          ? "Dependable on reconciliations and vouching. Ready for a full-time role after the next ACCA session."
          : r.status === "ongoing"
            ? "Mid-point review due. Accurate work, needs to raise questions earlier."
            : "Not started",
      weeklyLogs: r.status === "completed" ? 12 : r.status === "ongoing" ? 6 : 0,
    })),
    alumni: alumniOutcomes.map((a) => ({ ...a })),
    reportRuns: [
      { id: "pr-003", file: "placement-report-all-learners-sep-2026.csv", scope: "All placement-eligible learners", period: "Last 30 days", format: "CSV", requestedBy: "Rahul Verma", requested: "14 Sep 2026, 09:10", status: "Ready" },
      { id: "pr-002", file: "placement-report-graduate-pathway-q2.xlsx", scope: "ACCA Graduate Pathway", period: "Apr to Jun 2026", format: "XLSX", requestedBy: "Scheduled · weekly", requested: "7 Sep 2026, 06:00", status: "Ready" },
      { id: "pr-001", file: "alumni-career-outcomes-2026.pdf", scope: "Alumni 2024 to 2026", period: "Year to date", format: "PDF", requestedBy: "Meera Pillai", requested: "1 Sep 2026, 11:45", status: "Ready" },
    ],
  };
}

const SEED = seed();
let state: CareersState = SEED;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCareers(): CareersState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SEED,
  );
}

export function updateCareers(update: (s: CareersState) => Partial<CareersState>) {
  state = { ...state, ...update(state) };
  listeners.forEach((l) => l());
}

/**
 * Folds a new mock interview score into a Company Readiness record: the mock interview
 * component moves halfway to the new score and the headline moves by its weighted change,
 * so unrelated components are untouched. The September point is replaced.
 */
export function applyInterviewScore(cr: CompanyReadiness, interviewScore: number): CompanyReadiness {
  const comp = cr.components.find((c) => c.label === "Mock interviews");
  if (!comp) return cr;
  const nextComp = Math.round((comp.score + interviewScore) / 2);
  const score = Math.max(0, Math.min(100, cr.score + Math.round(((nextComp - comp.score) * comp.weight) / 100)));
  const trend = [...cr.trend.slice(0, -1), score];
  return {
    ...cr,
    score,
    band: score >= 70 ? "Ready" : score >= 55 ? "Nearly ready" : "Developing",
    components: cr.components.map((c) => (c.label === "Mock interviews" ? { ...c, score: nextComp } : c)),
    trend,
  };
}

export const TODAY = ACCA_TODAY;
