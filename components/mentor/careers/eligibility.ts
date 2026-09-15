import {
  PAPER_CODES,
  papersCleared,
  type CareerProfile,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import type { CareerOpportunity } from "./store";

export type EligibilityCheck = { id: string; label: string; met: boolean; detail: string };

export type EligibilityResult = {
  eligible: boolean;
  checks: EligibilityCheck[];
  /** Failed checks only, short enough for a pill: "FR not cleared". */
  reasons: string[];
};

export type MatchContext = {
  crs: number | null;
  ats: number | null;
  profile?: CareerProfile;
};

function cleared(s: Student, code: PaperCode) {
  const status = s.papers[code]?.status;
  return status === "passed" || status === "exempt";
}

function locationFit(s: Student, opp: CareerOpportunity, profile?: CareerProfile) {
  if (opp.workMode === "Remote") return true;
  const cities = profile?.preferredCities ?? [s.city];
  return cities.includes(opp.location) || s.city === opp.location;
}

/**
 * The career team's eligibility rules: the data rules (type, papers, Company Readiness Score,
 * ATS score, placement-eligible) plus the two rules this page adds (readiness score, location).
 */
export function checkEligibility(s: Student, opp: CareerOpportunity, ctx: MatchContext): EligibilityResult {
  const e = opp.eligibility;
  const count = papersCleared(s);
  const missingPapers = e.requiredPapers.filter((p) => !cleared(s, p));
  const crs = ctx.crs ?? 0;
  const ats = ctx.ats ?? 0;
  const fits = locationFit(s, opp, ctx.profile);

  const checks: EligibilityCheck[] = [
    {
      id: "type",
      label: "Student type",
      met: e.studentTypes.includes(s.type),
      detail: e.studentTypes.map((t) => (t === "graduate" ? "Graduate" : "Undergraduate")).join(" or "),
    },
    {
      id: "placement",
      label: "Placement-eligible",
      met: !e.placementEligibleOnly || s.career.placementEligible,
      detail: e.placementEligibleOnly ? "Placement-eligible learners only" : "Open to every learner",
    },
    {
      id: "papers",
      label: "Papers passed",
      met: count >= e.minPapersCleared,
      detail: `${count} of ${e.minPapersCleared} needed`,
    },
    {
      id: "required",
      label: "Required papers",
      met: missingPapers.length === 0,
      detail: e.requiredPapers.length ? e.requiredPapers.join(", ") : "None",
    },
    {
      id: "readiness",
      label: "Readiness score",
      met: s.readiness.overall >= opp.minReadiness,
      detail: opp.minReadiness ? `${s.readiness.overall} of ${opp.minReadiness}` : "No minimum",
    },
    {
      id: "crs",
      label: "Company Readiness Score",
      met: crs >= e.minCompanyReadiness,
      detail: `${ctx.crs ?? "Not scored"} of ${e.minCompanyReadiness}`,
    },
    {
      id: "ats",
      label: "ATS score",
      met: ats >= e.minAts,
      detail: `${ctx.ats ?? "No resume"} of ${e.minAts}`,
    },
    {
      id: "location",
      label: "Location",
      met: opp.locationRule === "any" || fits,
      detail: opp.locationRule === "any" ? "Any location" : `Prefers ${opp.location}`,
    },
  ];

  const reasons: string[] = [];
  for (const c of checks) {
    if (c.met) continue;
    if (c.id === "type") reasons.push(`${s.type === "graduate" ? "Graduate" : "Undergraduate"} not eligible`);
    else if (c.id === "placement") reasons.push("Not placement-eligible");
    else if (c.id === "papers") reasons.push(`Needs ${e.minPapersCleared} papers passed`);
    else if (c.id === "required") reasons.push(`${missingPapers.join(", ")} not cleared`);
    else if (c.id === "readiness") reasons.push(`Readiness below ${opp.minReadiness}`);
    else if (c.id === "crs") reasons.push(`Company Readiness Score below ${e.minCompanyReadiness}`);
    else if (c.id === "ats") reasons.push(`ATS score below ${e.minAts}`);
    else if (c.id === "location") reasons.push(`Not looking in ${opp.location}`);
  }
  return { eligible: reasons.length === 0, checks, reasons };
}

/** 0 to 99. Weighted on the scores recruiters ask for, plus skills and location fit. */
export function matchScore(s: Student, opp: CareerOpportunity, ctx: MatchContext) {
  const crs = ctx.crs ?? 40;
  const ats = ctx.ats ?? 40;
  const paperFit = Math.min(1, papersCleared(s) / Math.max(1, opp.eligibility.minPapersCleared));
  const skills = (ctx.profile?.skills ?? []).map((k) => k.toLowerCase());
  const overlap = opp.skills.filter((k) => skills.some((x) => x.includes(k.toLowerCase().split(" ")[0]))).length;
  const skillFit = opp.skills.length ? overlap / opp.skills.length : 0;
  const raw =
    crs * 0.3 +
    ats * 0.2 +
    s.readiness.overall * 0.2 +
    paperFit * 15 +
    skillFit * 10 +
    (locationFit(s, opp, ctx.profile) ? 5 : 0);
  return Math.max(15, Math.min(99, Math.round(raw)));
}

export const PAPER_OPTIONS = PAPER_CODES;
