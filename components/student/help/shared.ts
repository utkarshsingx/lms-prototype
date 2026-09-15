import {
  PAPER_CODES,
  cohortById,
  paperByCode,
  staffById,
  studentById,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { formatCalendarDate } from "@/components/ui/calendar";

/** The prototype's fixed clock: Monday 14 September 2026, mid-morning IST. */
export const DEMO_NOW = "2026-09-14T10:30";
export const DEMO_TODAY = "2026-09-14";

/** Full record of the signed-in demo student (Anaya until a stored persona takes over). */
export function useStudentRecord(): Student {
  const { student } = useRole();
  return studentById(student?.id) ?? studentById("s-anaya")!;
}

export const firstName = (name: string) => name.split(" ")[0];

/** "2026-09-17T20:00" → "Thu 17 Sep". The kit helper expects a bare date. */
export function dayLabel(iso: string) {
  return formatCalendarDate(iso.slice(0, 10), "day");
}

/** "2026-09-17T20:00" → "Thu 17 Sep, 20:00". */
export function dayTimeLabel(iso: string) {
  const time = iso.length > 10 ? iso.slice(11, 16) : "";
  return time ? `${dayLabel(iso)}, ${time}` : dayLabel(iso);
}

const pad = (n: number) => String(n).padStart(2, "0");

function toUtc(iso: string) {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh || 0, mm || 0);
}

/** Adds whole hours to an IST datetime string without touching the real clock. */
export function addHours(iso: string, hours: number) {
  const dt = new Date(toUtc(iso) + hours * 3_600_000);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

export function hoursBetween(from: string, to: string) {
  return Math.round((toUtc(to) - toUtc(from)) / 3_600_000);
}

const STUDY_ORDER: Record<string, number> = {
  current: 0,
  failed: 1,
  "in-progress": 2,
  "results-pending": 3,
  upcoming: 4,
  passed: 5,
  exempt: 6,
  "not-started": 7,
};

/** Papers a learner is studying or has studied, most relevant first (current, reattempt, in progress, planned, passed). */
export function studyPapers(s: Student, opts: { includePassed?: boolean; includeUpcoming?: boolean } = {}) {
  const { includePassed = true, includeUpcoming = true } = opts;
  const cohortPapers = new Set(s.cohortIds.flatMap((id) => cohortById(id)?.papers ?? []));
  return PAPER_CODES.filter((code) => {
    const st = s.papers[code].status;
    if (cohortPapers.has(code)) return true;
    if (st === "current" || st === "failed" || st === "in-progress" || st === "results-pending") return true;
    if (includeUpcoming && st === "upcoming" && s.examBookings.some((b) => b.paper === code && b.status === "planned")) return true;
    if (includePassed && st === "passed") return true;
    return false;
  }).sort((a, b) => (STUDY_ORDER[s.papers[a].status] ?? 9) - (STUDY_ORDER[s.papers[b].status] ?? 9));
}

/** The faculty member who answers a learner's questions on a paper: the cohort teacher first, then the paper lead. */
export function facultyFor(s: Student, paper: PaperCode) {
  for (const id of s.cohortIds) {
    const c = cohortById(id);
    if (!c?.papers.includes(paper)) continue;
    const teacher = c.facultyIds.find((f) => staffById(f)?.focusPapers.includes(paper));
    if (teacher) return teacher;
  }
  return paperByCode(paper)?.leadFacultyId ?? "st-marcus";
}

/** The learner's cohort that teaches a paper, if any. */
export function cohortFor(s: Student, paper: PaperCode) {
  return s.cohortIds.find((id) => cohortById(id)?.papers.includes(paper));
}
