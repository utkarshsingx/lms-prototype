import {
  ACCA_TODAY,
  addDays,
  blackoutOn,
  cohortById,
  examSessions,
  liveClasses,
  universityCalendarEvents,
  type PaperCode,
} from "@/lib/data/acca";

/** One timetabled teaching slot, real (lib data) or projected from the weekly timetable. */
export type ClassSlot = {
  id: string;
  cohortId: string;
  sectionId?: string;
  paper: PaperCode;
  title: string;
  facultyId: string;
  date: string;
  time: string;
  mins: number;
  delivery: "online" | "on-campus";
  room?: string;
  status: "completed" | "today" | "upcoming" | "cancelled";
  source: "timetable" | "scheduled";
  note?: string;
};

const PROJECT_UNTIL = "2026-11-30";
const PATTERN_WEEK = { start: "2026-09-07", end: "2026-09-13" };

function universityPause(universityId: string | undefined, date: string) {
  if (!universityId) return undefined;
  if (blackoutOn(universityId, date)) return "blackout";
  const ev = universityCalendarEvents.find(
    (e) =>
      e.universityId === universityId &&
      (e.kind === "holiday" || e.kind === "university-exam") &&
      date >= e.date &&
      date <= (e.endDate ?? e.date),
  );
  return ev ? ev.title : undefined;
}

function fromLiveClasses(): ClassSlot[] {
  return liveClasses.map((c) => ({
    id: c.id,
    cohortId: c.cohortId,
    sectionId: c.sectionId,
    paper: c.paper,
    title: c.title,
    facultyId: c.facultyId,
    date: c.start.slice(0, 10),
    time: c.start.slice(11, 16),
    mins: c.durationMins,
    delivery: c.delivery,
    room: c.room,
    status: c.status === "live" ? "today" : c.status,
    source: "timetable",
    note: c.note,
  }));
}

/** Repeat the 7 to 13 Sep timetable week forward to the end of November, respecting cohort end dates and university pauses. */
function projected(real: ClassSlot[]): ClassSlot[] {
  const lastReal = real.reduce((max, c) => (c.date > max ? c.date : max), ACCA_TODAY);
  const pattern = real.filter((c) => c.date >= PATTERN_WEEK.start && c.date <= PATTERN_WEEK.end && c.status !== "cancelled");
  const out: ClassSlot[] = [];
  for (const p of pattern) {
    const cohort = cohortById(p.cohortId);
    if (!cohort) continue;
    for (let week = 1; week <= 14; week++) {
      const date = addDays(p.date, week * 7);
      if (date <= lastReal) continue;
      if (date > PROJECT_UNTIL || date > cohort.endDate) break;
      if (universityPause(cohort.universityId, date)) continue;
      out.push({ ...p, id: `${p.id}-w${week}`, date, status: "upcoming", title: "Timetabled class", note: undefined });
    }
  }
  return out;
}

const real = fromLiveClasses();
export const timetableSlots: ClassSlot[] = [...real, ...projected(real)].sort((a, b) =>
  a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date),
);

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export type Clash = {
  date: string;
  kind: "blackout" | "university" | "faculty" | "cohort" | "exam";
  message: string;
  blocking: boolean;
};

/** Every clash for the proposed occurrences. Blackout occurrences are skipped when scheduling. */
export function detectClashes({
  cohortId,
  sectionId,
  facultyId,
  dates,
  time,
  mins,
  existing,
  facultyName,
}: {
  cohortId: string;
  sectionId?: string;
  facultyId: string;
  dates: string[];
  time: string;
  mins: number;
  existing: ClassSlot[];
  facultyName: string;
}): Clash[] {
  const cohort = cohortById(cohortId);
  const start = toMinutes(time);
  const end = start + mins;
  const clashes: Clash[] = [];
  for (const date of dates) {
    const uid = cohort?.universityId;
    const blackout = uid ? blackoutOn(uid, date) : undefined;
    if (blackout) {
      clashes.push({
        date,
        kind: "blackout",
        blocking: true,
        message: `Inside the examination blackout (${blackout.reason}). No ACCA live classes are scheduled.`,
      });
      continue;
    }
    const pause = universityPause(uid, date);
    if (pause) clashes.push({ date, kind: "university", blocking: false, message: `University calendar: ${pause}.` });
    const exam = examSessions.find((s) => !s.past && date >= s.examStart && date <= s.examEnd);
    if (exam) clashes.push({ date, kind: "exam", blocking: false, message: `ACCA ${exam.label} exams run this day.` });
    for (const slot of existing) {
      if (slot.date !== date || slot.status === "cancelled") continue;
      const s = toMinutes(slot.time);
      const e = s + slot.mins;
      if (s >= end || e <= start) continue;
      if (slot.facultyId === facultyId) {
        clashes.push({
          date,
          kind: "faculty",
          blocking: false,
          message: `${facultyName} already teaches ${slot.paper} at ${slot.time} (${cohortById(slot.cohortId)?.name ?? slot.cohortId}).`,
        });
      } else if (slot.cohortId === cohortId && (!sectionId || !slot.sectionId || slot.sectionId === sectionId)) {
        clashes.push({ date, kind: "cohort", blocking: false, message: `This cohort already has ${slot.paper} at ${slot.time}.` });
      }
    }
  }
  return clashes;
}
