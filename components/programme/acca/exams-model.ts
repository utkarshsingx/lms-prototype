import {
  PAPER_CODES,
  cohorts as allCohorts,
  students as allStudents,
  type Cohort,
  type ExamBooking,
  type PaperAttempt,
  type PaperCode,
  type Student,
} from "@/lib/data/acca";

export const studentIndex = new Map(allStudents.map((s) => [s.id, s]));

export type BookingRow = ExamBooking & {
  studentId: string;
  name: string;
  accaId: string | null;
  universityId?: string;
};

export type AttemptRow = PaperAttempt & {
  id: string;
  studentId: string;
  name: string;
  accaId: string | null;
  paper: PaperCode;
  recordedOn?: string;
};

export type RevisionCohort = {
  id: string;
  name: string;
  type: "revision" | "reattempt";
  paper: PaperCode;
  sessionId: string;
  mode: "weekday" | "weekend";
  facultyId: string;
  mentorId: string;
  capacity: number;
  size: number;
  studentIds: string[];
  startDate: string;
  status: string;
  created?: boolean;
};

export const SEED_BOOKINGS: BookingRow[] = allStudents.flatMap((s) =>
  s.examBookings
    .filter((b) => b.status !== "sat")
    .map((b) => ({ ...b, studentId: s.id, name: s.name, accaId: s.accaId, universityId: s.universityId })),
);

export const SEED_ATTEMPTS: AttemptRow[] = allStudents.flatMap((s) =>
  Object.values(s.papers).flatMap((p) =>
    p.attempts.map((a, i) => ({
      ...a,
      id: `${s.id}-${p.code}-${i}`,
      studentId: s.id,
      name: s.name,
      accaId: s.accaId,
      paper: p.code,
    })),
  ),
);

export const SEED_REVISION_COHORTS: RevisionCohort[] = allCohorts
  .filter((c): c is Cohort => c.type === "revision" || c.type === "reattempt")
  .map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type as "revision" | "reattempt",
    paper: c.papers[0],
    sessionId: c.examSessionId ?? "es-2026-dec",
    mode: c.mode,
    facultyId: c.facultyIds[0],
    mentorId: c.mentorId,
    capacity: c.capacity,
    size: c.size,
    studentIds: c.studentIds,
    startDate: c.startDate,
    status: c.status,
  }));

export const paperIndex = (p: string) => PAPER_CODES.indexOf(p as PaperCode);

/** Deterministic mark for a pending result in the sample results file. */
export function sampleMark(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 38 + (h % 35);
}

export const CBE_CENTRES = [
  "CBE centre · Bengaluru",
  "CBE centre · Mumbai",
  "CBE centre · Pune",
  "CBE centre · Kochi",
  "CBE centre · New Delhi",
  "CBE centre · Gurugram",
  "CBE centre · Coimbatore",
];

export function studentOf(id: string): Student {
  return studentIndex.get(id)!;
}
