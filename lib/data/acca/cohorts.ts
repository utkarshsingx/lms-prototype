import type { Cohort, CohortSection, CohortType } from "./types";
import { students } from "./students";

type CohortSeed = Omit<Cohort, "studentIds">;

const LIVE = "https://live.zskillup.com";

const seeds: CohortSeed[] = [
  {
    id: "co-fr-dec26-wkd",
    name: "FR · Dec 2026 · Weekend",
    type: "regular",
    mode: "weekend",
    papers: ["FR"],
    programmeId: "pr-graduate",
    examSessionId: "es-2026-dec",
    facultyIds: ["st-marcus"],
    mentorId: "st-aisha",
    size: 38,
    capacity: 40,
    sections: [
      { id: "bt-fr-dec26-sat", cohortId: "co-fr-dec26-wkd", kind: "batch", name: "Saturday batch", size: 20, schedule: "Sat 09:30 to 12:30", facultyId: "st-marcus", onlineLink: `${LIVE}/fr-dec26-sat` },
      { id: "bt-fr-dec26-sun", cohortId: "co-fr-dec26-wkd", kind: "batch", name: "Sunday batch", size: 18, schedule: "Sun 09:30 to 12:30", facultyId: "st-marcus", onlineLink: `${LIVE}/fr-dec26-sun` },
    ],
    schedule: "Sat or Sun 09:30 to 12:30",
    delivery: "Online live",
    startDate: "2026-07-04",
    endDate: "2026-12-06",
    status: "running",
    selectable: true,
  },
  {
    id: "co-pm-dec26-rev",
    name: "PM Revision and Reattempt · Dec 2026",
    type: "revision",
    mode: "weekend",
    papers: ["PM"],
    programmeId: "pr-graduate",
    examSessionId: "es-2026-dec",
    facultyIds: ["st-farah"],
    mentorId: "st-aisha",
    size: 22,
    capacity: 30,
    sections: [
      { id: "bt-pm-dec26-sun", cohortId: "co-pm-dec26-rev", kind: "batch", name: "Sunday revision batch", size: 22, schedule: "Sun 14:00 to 17:00", facultyId: "st-farah", onlineLink: `${LIVE}/pm-dec26-rev` },
    ],
    schedule: "Sun 14:00 to 17:00",
    delivery: "Online live",
    startDate: "2026-08-02",
    endDate: "2026-12-06",
    status: "running",
    selectable: true,
  },
  {
    id: "co-aa-dec26-eve",
    name: "AA · Dec 2026 · Weekday evening",
    type: "regular",
    mode: "weekday",
    papers: ["AA"],
    programmeId: "pr-graduate",
    examSessionId: "es-2026-dec",
    facultyIds: ["st-hana"],
    mentorId: "st-nikhil",
    size: 31,
    capacity: 35,
    sections: [
      { id: "bt-aa-dec26-mwf", cohortId: "co-aa-dec26-eve", kind: "batch", name: "Mon, Wed, Fri evening", size: 31, schedule: "Mon, Wed, Fri 19:00 to 20:30", facultyId: "st-hana", onlineLink: `${LIVE}/aa-dec26-eve` },
    ],
    schedule: "Mon, Wed, Fri 19:00 to 20:30",
    delivery: "Online live",
    startDate: "2026-07-06",
    endDate: "2026-12-04",
    status: "running",
    selectable: true,
  },
  {
    id: "co-fm-fast-dec26",
    name: "FM Fast Track · Dec 2026",
    type: "fast-track",
    mode: "weekday",
    papers: ["FM"],
    programmeId: "pr-fasttrack",
    examSessionId: "es-2026-dec",
    facultyIds: ["st-tomas"],
    mentorId: "st-sana",
    size: 24,
    capacity: 30,
    sections: [
      { id: "bt-fm-dec26-mtw", cohortId: "co-fm-fast-dec26", kind: "batch", name: "Mon to Thu evening", size: 24, schedule: "Mon to Thu 18:00 to 19:30", facultyId: "st-tomas", onlineLink: `${LIVE}/fm-fast-dec26` },
    ],
    schedule: "Mon to Thu 18:00 to 19:30",
    delivery: "Online live",
    startDate: "2026-08-17",
    endDate: "2026-12-03",
    status: "running",
    selectable: true,
  },
  {
    id: "co-sbr-mar27-wkd",
    name: "SBR · Mar 2027 · Weekend",
    type: "regular",
    mode: "weekend",
    papers: ["SBR"],
    programmeId: "pr-strategic",
    examSessionId: "es-2027-mar",
    facultyIds: ["st-marcus"],
    mentorId: "st-sana",
    size: 18,
    capacity: 30,
    sections: [
      { id: "bt-sbr-mar27-sat", cohortId: "co-sbr-mar27-wkd", kind: "batch", name: "Saturday batch", size: 18, schedule: "Sat 14:00 to 17:30", facultyId: "st-marcus", onlineLink: `${LIVE}/sbr-mar27-sat` },
    ],
    schedule: "Sat 14:00 to 17:30",
    delivery: "Online live",
    startDate: "2026-09-05",
    endDate: "2027-02-27",
    status: "running",
    selectable: true,
  },
  {
    id: "co-bw-2025-s3",
    name: "Brightwater · 2025 intake · Semester 3",
    type: "university",
    mode: "weekday",
    papers: ["LW", "FA"],
    programmeId: "pr-bw-bcom",
    universityId: "u-brightwater",
    intakeId: "in-2025-jul",
    semester: 3,
    facultyIds: ["st-vikram", "st-grace"],
    mentorId: "st-nikhil",
    size: 71,
    capacity: 72,
    sections: [
      { id: "sec-bw-2025-s3-a", cohortId: "co-bw-2025-s3", kind: "section", name: "Section A", size: 36, schedule: "Mon and Wed 14:00 to 16:00 (LW) · Fri 10:00 to 12:00 (FA)", facultyId: "st-vikram", room: "Commerce Block, C-204", onlineLink: `${LIVE}/bw-2025-s3-a` },
      { id: "sec-bw-2025-s3-b", cohortId: "co-bw-2025-s3", kind: "section", name: "Section B", size: 35, schedule: "Tue and Thu 14:00 to 16:00 (FA) · Fri 14:00 to 16:00 (LW)", facultyId: "st-grace", room: "Commerce Block, C-206", onlineLink: `${LIVE}/bw-2025-s3-b` },
    ],
    schedule: "Weekday afternoons on campus",
    delivery: "Hybrid",
    startDate: "2026-07-15",
    endDate: "2026-11-20",
    status: "running",
    selectable: false,
  },
  {
    id: "co-bw-2026-s1",
    name: "Brightwater · 2026 intake · Semester 1",
    type: "university",
    mode: "weekday",
    papers: ["BT"],
    programmeId: "pr-bw-bcom",
    universityId: "u-brightwater",
    intakeId: "in-2026-jul",
    semester: 1,
    facultyIds: ["st-vikram"],
    mentorId: "st-nikhil",
    size: 71,
    capacity: 72,
    sections: [
      { id: "sec-bw-2026-s1-a", cohortId: "co-bw-2026-s1", kind: "section", name: "Section A", size: 36, schedule: "Tue and Thu 10:00 to 12:00", facultyId: "st-vikram", room: "Commerce Block, C-101" },
      { id: "sec-bw-2026-s1-b", cohortId: "co-bw-2026-s1", kind: "section", name: "Section B", size: 35, schedule: "Wed and Fri 10:00 to 12:00", facultyId: "st-vikram", room: "Commerce Block, C-102" },
    ],
    schedule: "Weekday mornings on campus",
    delivery: "On campus",
    startDate: "2026-07-15",
    endDate: "2026-11-20",
    status: "running",
    selectable: false,
  },
  {
    id: "co-cl-2025-s3",
    name: "Coastline · 2025 intake · Semester 3",
    type: "university",
    mode: "weekday",
    papers: ["LW", "FA"],
    programmeId: "pr-cl-bcom",
    universityId: "u-coastline",
    intakeId: "in-2025-jul",
    semester: 3,
    facultyIds: ["st-grace"],
    mentorId: "st-sana",
    size: 48,
    capacity: 50,
    sections: [
      { id: "sec-cl-2025-s3-a", cohortId: "co-cl-2025-s3", kind: "section", name: "Section A", size: 48, schedule: "Mon and Wed 15:00 to 17:00", facultyId: "st-grace", room: "Smart Classroom 2", onlineLink: `${LIVE}/cl-2025-s3` },
    ],
    schedule: "Mon and Wed 15:00 to 17:00",
    delivery: "Hybrid",
    startDate: "2026-07-20",
    endDate: "2026-11-27",
    status: "running",
    selectable: false,
  },
  {
    id: "co-fr-dec26-eve",
    name: "FR · Dec 2026 · Weekday evening",
    type: "regular",
    mode: "weekday",
    papers: ["FR"],
    programmeId: "pr-graduate",
    examSessionId: "es-2026-dec",
    facultyIds: ["st-marcus"],
    mentorId: "st-nikhil",
    size: 29,
    capacity: 35,
    sections: [
      { id: "bt-fr-dec26-tth", cohortId: "co-fr-dec26-eve", kind: "batch", name: "Tue and Thu evening", size: 29, schedule: "Tue and Thu 19:30 to 21:30", facultyId: "st-marcus", onlineLink: `${LIVE}/fr-dec26-eve` },
    ],
    schedule: "Tue and Thu 19:30 to 21:30",
    delivery: "Online live",
    startDate: "2026-07-07",
    endDate: "2026-12-03",
    status: "running",
    selectable: true,
  },
  {
    id: "co-fr-mar27-reat",
    name: "FR Reattempt · Mar 2027 · Weekend",
    type: "reattempt",
    mode: "weekend",
    papers: ["FR"],
    programmeId: "pr-graduate",
    examSessionId: "es-2027-mar",
    facultyIds: ["st-marcus"],
    mentorId: "st-aisha",
    size: 14,
    capacity: 25,
    sections: [
      { id: "bt-fr-mar27-sat", cohortId: "co-fr-mar27-reat", kind: "batch", name: "Saturday batch", size: 14, schedule: "Sat 16:00 to 18:30", facultyId: "st-marcus", onlineLink: `${LIVE}/fr-mar27-reat` },
    ],
    schedule: "Sat 16:00 to 18:30",
    delivery: "Online live",
    startDate: "2026-10-03",
    endDate: "2027-02-27",
    status: "enrolling",
    selectable: true,
  },
  {
    id: "co-nf-2026-s1",
    name: "Northfield · 2026 intake · Semester 1",
    type: "university",
    mode: "weekday",
    papers: ["BT"],
    programmeId: "pr-nf-bba",
    universityId: "u-northfield",
    intakeId: "in-2026-jul",
    semester: 1,
    facultyIds: ["st-vikram"],
    mentorId: "st-sana",
    size: 64,
    capacity: 64,
    sections: [
      { id: "sec-nf-2026-s1-a", cohortId: "co-nf-2026-s1", kind: "section", name: "Section A", size: 32, schedule: "Mon and Thu 16:00 to 17:30", facultyId: "st-vikram", onlineLink: `${LIVE}/nf-2026-s1-a` },
      { id: "sec-nf-2026-s1-b", cohortId: "co-nf-2026-s1", kind: "section", name: "Section B", size: 32, schedule: "Tue and Fri 16:00 to 17:30", facultyId: "st-vikram", onlineLink: `${LIVE}/nf-2026-s1-b` },
    ],
    schedule: "Online weekday afternoons",
    delivery: "Online live",
    startDate: "2026-10-05",
    endDate: "2026-12-04",
    status: "onboarding",
    selectable: false,
  },
];

export const cohorts: Cohort[] = seeds.map((c) => ({
  ...c,
  studentIds: students.filter((s) => s.cohortIds.includes(c.id)).map((s) => s.id),
}));

export const COHORT_TYPE_LABELS: Record<CohortType, string> = {
  regular: "Regular",
  revision: "Revision",
  reattempt: "Reattempt",
  "fast-track": "Fast track",
  university: "University",
};

const cohortIndex = new Map(cohorts.map((c) => [c.id, c]));

export function cohortById(id: string | null | undefined): Cohort | undefined {
  return id ? cohortIndex.get(id) : undefined;
}

export const cohortSections: CohortSection[] = cohorts.flatMap((c) => c.sections);

export function sectionById(id: string | null | undefined): CohortSection | undefined {
  return id ? cohortSections.find((s) => s.id === id) : undefined;
}

export function cohortsForUniversity(universityId: string) {
  return cohorts.filter((c) => c.universityId === universityId);
}

export function cohortsForFaculty(staffId: string) {
  return cohorts.filter((c) => c.facultyIds.includes(staffId));
}

export function cohortsForMentor(staffId: string) {
  return cohorts.filter((c) => c.mentorId === staffId);
}

export function cohortsForStudent(studentId: string) {
  return cohorts.filter((c) => c.studentIds.includes(studentId));
}

/** Graduate cohorts a learner can choose between (flexible cohort selection). */
export const selectableCohorts = cohorts.filter((c) => c.selectable);
