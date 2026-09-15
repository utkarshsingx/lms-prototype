import {
  PLACEMENT_STAGES,
  isEligibleFor,
  opportunities,
  type Application,
  type Opportunity,
  type Student,
} from "@/lib/data/acca";
import { dayLabel } from "@/components/student/help/shared";

/** Turns the data's eligibility reasons into short learner-facing pill text. */
export function friendlyReason(reason: string, opp: Opportunity): string {
  if (reason === "Student type") {
    const types = opp.eligibility.studentTypes;
    return types.length === 1 ? (types[0] === "graduate" ? "Graduates only" : "Undergraduates only") : "Student type";
  }
  if (reason === "Not placement-eligible") return "Placement-eligible learners only";
  const paper = reason.match(/^([A-Z]{2,3}) not cleared$/);
  if (paper) return `Needs ${paper[1]} passed`;
  const crs = reason.match(/^Company Readiness Score below (\d+)$/);
  if (crs) return `Company Readiness Score ${crs[1]}+`;
  const ats = reason.match(/^ATS score below (\d+)$/);
  if (ats) return `ATS score ${ats[1]}+`;
  return reason;
}

export type Eligibility = { eligible: boolean; label: string; reasons: string[] };

export function eligibilityFor(s: Student, opp: Opportunity): Eligibility {
  const { eligible, reasons } = isEligibleFor(s, opp);
  // Missing papers lead, since they are the reason a learner can act on first ("Needs FR passed").
  const friendly = reasons
    .map((r) => friendlyReason(r, opp))
    .sort((a, b) => Number(/ passed$/.test(b)) - Number(/ passed$/.test(a)));
  return {
    eligible,
    label: eligible ? "Eligible" : friendly.length > 1 ? `${friendly[0]} +${friendly.length - 1}` : friendly[0],
    reasons: friendly,
  };
}

export function openOpportunities(kind?: Opportunity["kind"]) {
  return opportunities.filter((o) => o.status === "open" && (!kind || o.kind === kind));
}

/** Opportunities a learner is eligible for first, then by closing date. */
export function rankedFor(s: Student, kind?: Opportunity["kind"]) {
  return openOpportunities(kind)
    .map((o) => ({ opp: o, elig: eligibilityFor(s, o) }))
    .sort((a, b) => Number(b.elig.eligible) - Number(a.elig.eligible) || a.opp.closesOn.localeCompare(b.opp.closesOn));
}

/** "Applied", "Shortlisted", "Interview Tue 22 Sep". */
export function stageLabel(app: Pick<Application, "stage" | "interview">) {
  if (app.stage === "interview" && app.interview) return `Interview ${dayLabel(app.interview.date)}`;
  return PLACEMENT_STAGES.find((st) => st.id === app.stage)?.label ?? app.stage;
}

export const PIPELINE = PLACEMENT_STAGES.filter((st) => st.id !== "rejected");
