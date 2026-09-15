import {
  ACCA_TODAY,
  addDays,
  cohortsForUniversity,
  daysBetween,
  intakeById,
  liveClasses,
  students as allStudents,
  studentsForUniversity,
  universityById,
  type Cohort,
  type CohortSection,
  type Student,
} from "@/lib/data/acca";

/* Derived views over the Brightwater world for the University Admin core pages. Pure, deterministic. */

export type VerificationStatus = Student["verification"]["status"];

export const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  pending: "Pending verification",
  mismatch: "Mismatch",
  "not-required": "Not required",
};

/** A student as the university register sees it; semester and verification are editable locally. */
export type RosterRow = {
  id: string;
  student: Student;
  roll: string;
  semester: number;
  verification: VerificationStatus;
  verifiedBy?: string;
  verifiedOn?: string;
  note?: string;
};

export function rosterRows(universityId: string): RosterRow[] {
  return universityStudents(universityId).map((s) => ({
    id: s.id,
    student: s,
    roll: rollNumber(s.id),
    semester: s.semester ?? 1,
    verification: s.verification.status,
    verifiedBy: s.verification.by,
    verifiedOn: s.verification.on,
    note: s.verification.note,
  }));
}

/** Date of birth on each side of the record check. Only a mismatch differs. */
export function datesOfBirth(row: RosterRow) {
  const h = hash(`${row.id}-dob`);
  const year = Number(intakeYear(row.student.intakeId)) - 19;
  const month = 1 + (h % 12);
  const day = 1 + ((h >> 4) % 27);
  const iso = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const platform = row.verification === "mismatch" ? addDays(iso, 9) : iso;
  return { university: iso, platform };
}

export function intakeYear(intakeId: string) {
  return intakeId.slice(3, 7);
}

/** "2025 intake", matching the cohort names. */
export function intakeShort(intakeId: string) {
  return `${intakeYear(intakeId)} intake`;
}

export function intakeLabel(intakeId: string) {
  return intakeById(intakeId)?.label ?? intakeShort(intakeId);
}

function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Assigned once in a fixed order so server and client agree on every number.
const ROLLS = (() => {
  const map = new Map<string, string>();
  const used = new Set<string>();
  for (const s of [...allStudents].filter((x) => x.universityId).sort((a, b) => a.id.localeCompare(b.id))) {
    const prefix = universityById(s.universityId)?.branding.logoInitials ?? "UN";
    let n = 100 + (hash(s.id) % 900);
    let roll = `${prefix}-${intakeYear(s.intakeId)}-${String(n).padStart(4, "0")}`;
    while (used.has(roll)) {
      n += 1;
      roll = `${prefix}-${intakeYear(s.intakeId)}-${String(n).padStart(4, "0")}`;
    }
    used.add(roll);
    map.set(s.id, roll);
  }
  return map;
})();

/** University roll number in the workspace format BU-YYYY-NNNN, stable per student. */
export function rollNumber(studentId: string) {
  return ROLLS.get(studentId) ?? "Not on roll";
}

export type SectionInfo = CohortSection & { cohort: Cohort; label: string; short: string };

export function sectionsForUniversity(universityId: string): SectionInfo[] {
  return cohortsForUniversity(universityId).flatMap((c) =>
    c.sections.map((s) => ({
      ...s,
      cohort: c,
      label: `${intakeShort(c.intakeId ?? "")} · Semester ${c.semester ?? ""} · ${s.name}`,
      short: `${intakeYear(c.intakeId ?? "")} · ${s.name}`,
    })),
  );
}

export function universityStudents(universityId: string) {
  return [...studentsForUniversity(universityId)].sort(
    (a, b) =>
      a.intakeId.localeCompare(b.intakeId) ||
      (a.section ?? "").localeCompare(b.section ?? "") ||
      a.name.localeCompare(b.name),
  );
}

export function universityClasses(universityId: string) {
  const ids = new Set(cohortsForUniversity(universityId).map((c) => c.id));
  return liveClasses.filter((c) => ids.has(c.cohortId)).sort((a, b) => a.start.localeCompare(b.start));
}

/** Weighted attendance over marked classes: present / enrolled. */
export function attendanceOf(classes: { attendance: { marked: boolean; present: number; total: number } | null }[]) {
  let present = 0;
  let total = 0;
  for (const c of classes) {
    if (!c.attendance?.marked) continue;
    present += c.attendance.present;
    total += c.attendance.total;
  }
  return total ? Math.round((present / total) * 100) : null;
}

export function average(values: number[]) {
  return values.length ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 0;
}

/** Monday on or before the given date. */
export function weekStart(iso: string) {
  // 14 Sep 2026 is a Monday.
  const offset = ((daysBetween(ACCA_TODAY, iso.slice(0, 10)) % 7) + 7) % 7;
  return addDays(iso.slice(0, 10), -offset);
}

export const RISK_ORDER = { high: 0, medium: 1, low: 2 } as const;

export function inBlackout<T extends { start: string; end: string }>(date: string, ranges: T[]): T | undefined {
  const d = date.slice(0, 10);
  return ranges.find((r) => d >= r.start && d <= r.end);
}
