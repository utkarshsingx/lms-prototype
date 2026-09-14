import type {
  Announcement,
  BlackoutPeriod,
  CalendarEvent,
  ExamPeriod,
  JointCertificateRule,
  RoadmapStage,
  Semester,
  University,
  UniversitySubject,
} from "./types";

export const universities: University[] = [
  {
    id: "u-brightwater",
    name: "Brightwater University",
    shortName: "Brightwater",
    city: "Pune",
    state: "Maharashtra",
    programmeId: "pr-bw-bcom",
    programmeName: "B.Com (Hons) with ACCA",
    status: "Live",
    students: 142,
    partnerSince: "2024-05-02",
    semesterSystem: { semesters: 6, academicYear: "Jul to Apr" },
    branding: {
      primary: "#1f3a8a",
      logoInitials: "BU",
      tagline: "Commerce with a global qualification",
      certificateSeal: "Brightwater University · Faculty of Commerce",
    },
    workspace: {
      slug: "brightwater",
      domain: "brightwater.acca.zskillup.com",
      loginMethods: ["University email single sign-on", "Email and one-time code"],
      enabledModules: [
        "Student records",
        "ACCA progress",
        "Performance",
        "Curriculum mapping",
        "Academic calendar",
        "Announcements",
        "Joint certificates",
        "Careers",
        "Reports",
      ],
      studentIdFormat: "BU-YYYY-NNNN",
      supportEmail: "acca.support@brightwater.edu",
      dataRegion: "India (Mumbai)",
      defaultTimezone: "Asia/Kolkata",
      status: "Live",
      goLive: "2025-07-01",
    },
    adminIds: ["st-suresh", "st-lakshmi"],
    headline: {
      students: 142,
      intakes: 2,
      activeCohorts: 2,
      sections: 4,
      avgAttendance: 86,
      avgReadiness: 63,
      atRisk: 17,
      registeredPct: 65,
      jointCertOnTrackPct: 78,
      internshipsPlanned: 38,
    },
    contact: { name: "Dr Suresh Nair", email: "suresh.nair@brightwater.edu", phone: "+91 98220 31406" },
  },
  {
    id: "u-coastline",
    name: "Coastline University",
    shortName: "Coastline",
    city: "Kochi",
    state: "Kerala",
    programmeId: "pr-cl-bcom",
    programmeName: "B.Com with ACCA Pathway",
    status: "Live",
    students: 96,
    partnerSince: "2024-11-18",
    semesterSystem: { semesters: 6, academicYear: "Jul to Apr" },
    branding: {
      primary: "#0f766e",
      logoInitials: "CU",
      tagline: "Where commerce meets the coast",
      certificateSeal: "Coastline University · School of Commerce",
    },
    workspace: {
      slug: "coastline",
      domain: "coastline.acca.zskillup.com",
      loginMethods: ["Email and one-time code"],
      enabledModules: ["Student records", "ACCA progress", "Performance", "Curriculum mapping", "Academic calendar", "Announcements", "Reports"],
      studentIdFormat: "CU/BCOM/YY/NNN",
      supportEmail: "acca@coastline.edu",
      dataRegion: "India (Mumbai)",
      defaultTimezone: "Asia/Kolkata",
      status: "Live",
      goLive: "2025-07-14",
    },
    adminIds: ["st-joseph"],
    headline: {
      students: 96,
      intakes: 1,
      activeCohorts: 1,
      sections: 1,
      avgAttendance: 81,
      avgReadiness: 59,
      atRisk: 14,
      registeredPct: 71,
      jointCertOnTrackPct: 64,
      internshipsPlanned: 21,
    },
    contact: { name: "Joseph Mathew", email: "joseph.mathew@coastline.edu", phone: "+91 94470 21983" },
  },
  {
    id: "u-northfield",
    name: "Northfield University",
    shortName: "Northfield",
    city: "Gurugram",
    state: "Haryana",
    programmeId: "pr-nf-bba",
    programmeName: "BBA Finance with ACCA",
    status: "Onboarding",
    students: 64,
    partnerSince: "2026-06-10",
    semesterSystem: { semesters: 6, academicYear: "Aug to May" },
    branding: {
      primary: "#7c2d12",
      logoInitials: "NU",
      tagline: "Finance leaders from day one",
      certificateSeal: "Northfield University · School of Business",
    },
    workspace: {
      slug: "northfield",
      domain: "northfield.acca.zskillup.com",
      loginMethods: ["Email and one-time code"],
      enabledModules: ["Student records", "ACCA progress", "Academic calendar", "Announcements"],
      studentIdFormat: "NFU-BBA-YY-NNN",
      supportEmail: "acca.office@northfield.edu",
      dataRegion: "India (Mumbai)",
      defaultTimezone: "Asia/Kolkata",
      status: "Onboarding",
      goLive: "2026-10-01",
    },
    adminIds: [],
    headline: {
      students: 64,
      intakes: 1,
      activeCohorts: 1,
      sections: 2,
      avgAttendance: 0,
      avgReadiness: 0,
      atRisk: 0,
      registeredPct: 12,
      jointCertOnTrackPct: 0,
      internshipsPlanned: 0,
    },
    contact: { name: "Ritu Malhotra", email: "ritu.malhotra@northfield.edu", phone: "+91 98110 46230" },
  },
];

const universityIndex = new Map(universities.map((u) => [u.id as string, u]));

export function universityById(id: string | null | undefined): University | undefined {
  return id ? universityIndex.get(id) : undefined;
}

export function universityBySlug(slug: string) {
  return universities.find((u) => u.workspace.slug === slug);
}

/** The workspace the University Admin personas open. */
export const DEFAULT_UNIVERSITY_ID = "u-brightwater";

/* ------------------------------------------------------------------------------------------
 * Semesters, calendars, examination and blackout periods
 * ---------------------------------------------------------------------------------------- */

export const semesters: Semester[] = [
  { id: "sem-bw-2025-1", universityId: "u-brightwater", intakeId: "in-2025-jul", number: 1, label: "Semester 1", start: "2025-07-15", end: "2025-11-21", examStart: "2025-11-24", examEnd: "2025-12-13", status: "completed" },
  { id: "sem-bw-2025-2", universityId: "u-brightwater", intakeId: "in-2025-jul", number: 2, label: "Semester 2", start: "2026-01-05", end: "2026-04-17", examStart: "2026-04-20", examEnd: "2026-05-09", status: "completed" },
  { id: "sem-bw-2025-3", universityId: "u-brightwater", intakeId: "in-2025-jul", number: 3, label: "Semester 3", start: "2026-07-15", end: "2026-11-20", examStart: "2026-11-23", examEnd: "2026-12-12", status: "in-progress" },
  { id: "sem-bw-2025-4", universityId: "u-brightwater", intakeId: "in-2025-jul", number: 4, label: "Semester 4", start: "2027-01-04", end: "2027-04-16", examStart: "2027-04-19", examEnd: "2027-05-08", status: "upcoming" },
  { id: "sem-bw-2026-1", universityId: "u-brightwater", intakeId: "in-2026-jul", number: 1, label: "Semester 1", start: "2026-07-15", end: "2026-11-20", examStart: "2026-11-23", examEnd: "2026-12-12", status: "in-progress" },
  { id: "sem-bw-2026-2", universityId: "u-brightwater", intakeId: "in-2026-jul", number: 2, label: "Semester 2", start: "2027-01-04", end: "2027-04-16", examStart: "2027-04-19", examEnd: "2027-05-08", status: "upcoming" },
  { id: "sem-cl-2025-3", universityId: "u-coastline", intakeId: "in-2025-jul", number: 3, label: "Semester 3", start: "2026-07-20", end: "2026-11-27", examStart: "2026-11-30", examEnd: "2026-12-18", status: "in-progress" },
  { id: "sem-cl-2025-4", universityId: "u-coastline", intakeId: "in-2025-jul", number: 4, label: "Semester 4", start: "2027-01-11", end: "2027-04-23", examStart: "2027-04-26", examEnd: "2027-05-14", status: "upcoming" },
  { id: "sem-nf-2026-1", universityId: "u-northfield", intakeId: "in-2026-jul", number: 1, label: "Semester 1", start: "2026-08-03", end: "2026-12-04", examStart: "2026-12-07", examEnd: "2026-12-19", status: "in-progress" },
];

export const examPeriods: ExamPeriod[] = [
  { id: "ep-bw-2026-odd", universityId: "u-brightwater", label: "Semester 1 and 3 university examinations", start: "2026-11-23", end: "2026-12-12", semesters: [1, 3], intakeIds: ["in-2025-jul", "in-2026-jul"] },
  { id: "ep-bw-2027-even", universityId: "u-brightwater", label: "Semester 2 and 4 university examinations", start: "2027-04-19", end: "2027-05-08", semesters: [2, 4], intakeIds: ["in-2025-jul", "in-2026-jul"] },
  { id: "ep-cl-2026-odd", universityId: "u-coastline", label: "Semester 3 university examinations", start: "2026-11-30", end: "2026-12-18", semesters: [3], intakeIds: ["in-2025-jul"] },
  { id: "ep-nf-2026-odd", universityId: "u-northfield", label: "Semester 1 end-term examinations", start: "2026-12-07", end: "2026-12-19", semesters: [1], intakeIds: ["in-2026-jul"] },
];

const BLACKOUT_RULES = [
  "No ACCA mock examinations scheduled",
  "No ACCA live classes scheduled",
  "ACCA exam bookings inside the period show a warning",
];

export const blackoutPeriods: BlackoutPeriod[] = [
  {
    id: "bo-bw-2026-nov",
    universityId: "u-brightwater",
    start: "2026-11-23",
    end: "2026-12-12",
    label: "University examinations · Semester 1 and 3",
    reason: "Brightwater end-semester examinations",
    rules: BLACKOUT_RULES,
    addedBy: "st-priya",
    addedOn: "2026-07-02",
  },
  {
    id: "bo-bw-2027-apr",
    universityId: "u-brightwater",
    start: "2027-04-19",
    end: "2027-05-08",
    label: "University examinations · Semester 2 and 4",
    reason: "Brightwater end-semester examinations",
    rules: BLACKOUT_RULES,
    addedBy: "st-priya",
    addedOn: "2026-07-02",
  },
  {
    id: "bo-cl-2026-nov",
    universityId: "u-coastline",
    start: "2026-11-30",
    end: "2026-12-18",
    label: "University examinations · Semester 3",
    reason: "Coastline end-semester examinations",
    rules: BLACKOUT_RULES,
    addedBy: "st-priya",
    addedOn: "2026-07-20",
  },
];

export function blackoutsForUniversity(universityId: string) {
  return blackoutPeriods.filter((b) => b.universityId === universityId);
}

/** The blackout period containing `date` for a university, if any. */
export function blackoutOn(universityId: string, date: string) {
  const d = date.slice(0, 10);
  return blackoutPeriods.find((b) => b.universityId === universityId && d >= b.start && d <= b.end);
}

export const universityCalendarEvents: CalendarEvent[] = [
  { id: "uc-bw-01", universityId: "u-brightwater", date: "2026-07-13", endDate: "2026-07-14", title: "Orientation · 2026 intake", kind: "orientation", tone: "info" },
  { id: "uc-bw-02", universityId: "u-brightwater", date: "2026-07-15", title: "Semester 1 and 3 teaching begins", kind: "semester", tone: "jade" },
  { id: "uc-bw-03", universityId: "u-brightwater", date: "2026-08-15", title: "Independence Day · campus closed", kind: "holiday", tone: "neutral" },
  { id: "uc-bw-04", universityId: "u-brightwater", date: "2026-09-21", endDate: "2026-09-25", title: "Continuous internal assessment 1", kind: "university-exam", tone: "amber" },
  { id: "uc-bw-05", universityId: "u-brightwater", date: "2026-10-02", title: "Gandhi Jayanti · campus closed", kind: "holiday", tone: "neutral" },
  { id: "uc-bw-06", universityId: "u-brightwater", date: "2026-10-26", endDate: "2026-10-30", title: "Continuous internal assessment 2", kind: "university-exam", tone: "amber" },
  { id: "uc-bw-07", universityId: "u-brightwater", date: "2026-11-07", endDate: "2026-11-11", title: "Diwali break", kind: "holiday", tone: "neutral" },
  { id: "uc-bw-08", universityId: "u-brightwater", date: "2026-11-20", title: "Semester 1 and 3 teaching ends", kind: "semester", tone: "jade" },
  { id: "uc-bw-09", universityId: "u-brightwater", date: "2026-11-23", endDate: "2026-12-12", title: "University examinations (ACCA blackout)", kind: "blackout", tone: "rose" },
  { id: "uc-bw-10", universityId: "u-brightwater", date: "2026-12-14", endDate: "2027-01-01", title: "Winter break", kind: "holiday", tone: "neutral" },
  { id: "uc-bw-11", universityId: "u-brightwater", date: "2027-01-04", title: "Semester 2 and 4 teaching begins", kind: "semester", tone: "jade" },
  { id: "uc-bw-12", universityId: "u-brightwater", date: "2027-04-19", endDate: "2027-05-08", title: "University examinations (ACCA blackout)", kind: "blackout", tone: "rose" },
  { id: "uc-cl-01", universityId: "u-coastline", date: "2026-07-20", title: "Semester 3 teaching begins", kind: "semester", tone: "jade" },
  { id: "uc-cl-02", universityId: "u-coastline", date: "2026-08-25", endDate: "2026-08-28", title: "Onam holidays", kind: "holiday", tone: "neutral" },
  { id: "uc-cl-03", universityId: "u-coastline", date: "2026-10-12", endDate: "2026-10-16", title: "Internal assessment week", kind: "university-exam", tone: "amber" },
  { id: "uc-cl-04", universityId: "u-coastline", date: "2026-11-27", title: "Semester 3 teaching ends", kind: "semester", tone: "jade" },
  { id: "uc-cl-05", universityId: "u-coastline", date: "2026-11-30", endDate: "2026-12-18", title: "University examinations (ACCA blackout)", kind: "blackout", tone: "rose" },
  { id: "uc-nf-01", universityId: "u-northfield", date: "2026-08-03", title: "Semester 1 teaching begins", kind: "semester", tone: "jade" },
  { id: "uc-nf-02", universityId: "u-northfield", date: "2026-10-01", title: "ACCA workspace go-live", kind: "event", tone: "info" },
  { id: "uc-nf-03", universityId: "u-northfield", date: "2026-12-07", endDate: "2026-12-19", title: "End-term examinations (blackout pending approval)", kind: "university-exam", tone: "amber" },
];

export function calendarForUniversity(universityId: string) {
  return universityCalendarEvents.filter((e) => e.universityId === universityId);
}

export const calendarUploads = [
  { id: "cu-bw-2026", universityId: "u-brightwater", fileName: "Brightwater_Academic_Calendar_2026-27.pdf", uploadedBy: "st-suresh", uploadedOn: "2026-06-24", status: "applied" as const, events: 12 },
  { id: "cu-cl-2026", universityId: "u-coastline", fileName: "Coastline_Calendar_AY2026-27.xlsx", uploadedBy: "st-joseph", uploadedOn: "2026-07-08", status: "applied" as const, events: 5 },
  { id: "cu-nf-2026", universityId: "u-northfield", fileName: "NFU_BBA_Calendar_Draft_v2.pdf", uploadedBy: "st-priya", uploadedOn: "2026-09-02", status: "in-review" as const, events: 3 },
];

/* ------------------------------------------------------------------------------------------
 * Curriculum subjects and ACCA mapping (bible section 5)
 * ---------------------------------------------------------------------------------------- */

export const COVERAGE_LABELS = {
  full: "Full",
  partial: "Partial",
  "conceptual-only": "Conceptual only",
} as const;

export const universitySubjects: UniversitySubject[] = [
  // Brightwater · B.Com (Hons) with ACCA
  { id: "sub-bw-101", universityId: "u-brightwater", code: "BCH101", name: "Financial Accounting", semester: 1, credits: 4, mappingStatus: "mapped", reviewedBy: "st-grace", mappings: [{ paper: "FA", areas: ["C", "D", "E", "F"], coverage: "full" }] },
  { id: "sub-bw-102", universityId: "u-brightwater", code: "BCH102", name: "Business Organisation and Management", semester: 1, credits: 4, mappingStatus: "mapped", reviewedBy: "st-vikram", mappings: [{ paper: "BT", areas: ["A", "B", "D"], coverage: "partial" }] },
  { id: "sub-bw-103", universityId: "u-brightwater", code: "BCH103", name: "Business Economics", semester: 1, credits: 4, mappingStatus: "not-mapped", mappings: [], note: "No direct ACCA syllabus overlap." },
  { id: "sub-bw-104", universityId: "u-brightwater", code: "BCH104", name: "Business Communication", semester: 1, credits: 2, mappingStatus: "not-mapped", mappings: [], note: "Supports written answers; not mapped to a syllabus area." },
  { id: "sub-bw-201", universityId: "u-brightwater", code: "BCH201", name: "Business Statistics", semester: 2, credits: 4, mappingStatus: "mapped", reviewedBy: "st-tomas", mappings: [{ paper: "MA", areas: ["B"], coverage: "partial" }] },
  { id: "sub-bw-202", universityId: "u-brightwater", code: "BCH202", name: "Business Law", semester: 2, credits: 4, mappingStatus: "mapped", reviewedBy: "st-vikram", mappings: [{ paper: "LW", areas: ["B"], coverage: "partial" }] },
  { id: "sub-bw-203", universityId: "u-brightwater", code: "BCH203", name: "Cost Accounting", semester: 2, credits: 4, mappingStatus: "mapped", reviewedBy: "st-tomas", mappings: [{ paper: "MA", areas: ["C"], coverage: "full" }] },
  { id: "sub-bw-204", universityId: "u-brightwater", code: "BCH204", name: "Environmental Studies", semester: 2, credits: 2, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-bw-301", universityId: "u-brightwater", code: "BCH301", name: "Corporate Accounting", semester: 3, credits: 4, mappingStatus: "mapped", reviewedBy: "st-marcus", mappings: [{ paper: "FA", areas: ["G"], coverage: "partial" }, { paper: "FR", areas: ["D"], coverage: "partial" }] },
  { id: "sub-bw-302", universityId: "u-brightwater", code: "BCH302", name: "Company Law", semester: 3, credits: 4, mappingStatus: "mapped", reviewedBy: "st-vikram", mappings: [{ paper: "LW", areas: ["D", "E", "F"], coverage: "partial" }] },
  { id: "sub-bw-303", universityId: "u-brightwater", code: "BCH303", name: "Indian Economy", semester: 3, credits: 3, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-bw-304", universityId: "u-brightwater", code: "BCH304", name: "E-Commerce", semester: 3, credits: 2, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-bw-401", universityId: "u-brightwater", code: "BCH401", name: "Management Accounting", semester: 4, credits: 4, mappingStatus: "mapped", reviewedBy: "st-farah", mappings: [{ paper: "MA", areas: ["D", "E"], coverage: "full" }, { paper: "PM", areas: ["A"], coverage: "partial" }] },
  { id: "sub-bw-402", universityId: "u-brightwater", code: "BCH402", name: "Income Tax Law and Practice", semester: 4, credits: 4, mappingStatus: "mapped", reviewedBy: "st-grace", mappings: [{ paper: "TX", areas: [], coverage: "conceptual-only" }], note: "TX-UK is UK law. Indian income tax builds concepts only." },
  { id: "sub-bw-403", universityId: "u-brightwater", code: "BCH403", name: "Goods and Services Tax", semester: 4, credits: 3, mappingStatus: "not-mapped", mappings: [], note: "Indian indirect tax. Not mapped to TX-UK value added tax." },
  { id: "sub-bw-404", universityId: "u-brightwater", code: "BCH404", name: "Entrepreneurship Development", semester: 4, credits: 2, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-bw-501", universityId: "u-brightwater", code: "BCH501", name: "Auditing", semester: 5, credits: 4, mappingStatus: "mapped", reviewedBy: "st-hana", mappings: [{ paper: "AA", areas: ["A", "C", "D"], coverage: "partial" }] },
  { id: "sub-bw-502", universityId: "u-brightwater", code: "BCH502", name: "Financial Markets and Services", semester: 5, credits: 3, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-bw-503", universityId: "u-brightwater", code: "BCH503", name: "Research Methodology", semester: 5, credits: 2, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-bw-601", universityId: "u-brightwater", code: "BCH601", name: "Financial Management", semester: 6, credits: 4, mappingStatus: "mapped", reviewedBy: "st-tomas", mappings: [{ paper: "FM", areas: ["C", "D", "E"], coverage: "partial" }] },
  { id: "sub-bw-602", universityId: "u-brightwater", code: "BCH602", name: "Corporate Governance and Ethics", semester: 6, credits: 3, mappingStatus: "in-review", mappings: [{ paper: "BT", areas: ["B", "F"], coverage: "partial" }], note: "Proposed by Brightwater on 2 Sep 2026, awaiting faculty review." },
  { id: "sub-bw-603", universityId: "u-brightwater", code: "BCH603", name: "Project Work", semester: 6, credits: 4, mappingStatus: "not-mapped", mappings: [] },

  // Coastline · B.Com with ACCA Pathway
  { id: "sub-cl-101", universityId: "u-coastline", code: "CUB1C01", name: "Financial Accounting", semester: 1, credits: 4, mappingStatus: "mapped", reviewedBy: "st-grace", mappings: [{ paper: "FA", areas: ["C", "D", "E", "F"], coverage: "full" }] },
  { id: "sub-cl-102", universityId: "u-coastline", code: "CUB1C02", name: "Business Organisation and Management", semester: 1, credits: 4, mappingStatus: "mapped", reviewedBy: "st-vikram", mappings: [{ paper: "BT", areas: ["A", "B", "D"], coverage: "partial" }] },
  { id: "sub-cl-201", universityId: "u-coastline", code: "CUB2C01", name: "Business Statistics", semester: 2, credits: 3, mappingStatus: "mapped", reviewedBy: "st-tomas", mappings: [{ paper: "MA", areas: ["B"], coverage: "partial" }] },
  { id: "sub-cl-202", universityId: "u-coastline", code: "CUB2C02", name: "Business Law", semester: 2, credits: 4, mappingStatus: "mapped", reviewedBy: "st-vikram", mappings: [{ paper: "LW", areas: ["B"], coverage: "partial" }] },
  { id: "sub-cl-301", universityId: "u-coastline", code: "CUB3C01", name: "Cost Accounting", semester: 3, credits: 4, mappingStatus: "mapped", reviewedBy: "st-tomas", mappings: [{ paper: "MA", areas: ["C"], coverage: "full" }] },
  { id: "sub-cl-302", universityId: "u-coastline", code: "CUB3C02", name: "Company Law", semester: 3, credits: 4, mappingStatus: "mapped", reviewedBy: "st-vikram", mappings: [{ paper: "LW", areas: ["D", "E", "F"], coverage: "partial" }] },
  { id: "sub-cl-401", universityId: "u-coastline", code: "CUB4C01", name: "Corporate Accounting", semester: 4, credits: 4, mappingStatus: "mapped", reviewedBy: "st-marcus", mappings: [{ paper: "FA", areas: ["G"], coverage: "partial" }, { paper: "FR", areas: ["D"], coverage: "partial" }] },
  { id: "sub-cl-402", universityId: "u-coastline", code: "CUB4C02", name: "Income Tax Law and Practice", semester: 4, credits: 4, mappingStatus: "mapped", reviewedBy: "st-grace", mappings: [{ paper: "TX", areas: [], coverage: "conceptual-only" }], note: "TX-UK is UK law. Indian income tax builds concepts only." },
  { id: "sub-cl-501", universityId: "u-coastline", code: "CUB5C01", name: "Management Accounting", semester: 5, credits: 4, mappingStatus: "mapped", reviewedBy: "st-farah", mappings: [{ paper: "MA", areas: ["D", "E"], coverage: "full" }, { paper: "PM", areas: ["A"], coverage: "partial" }] },
  { id: "sub-cl-502", universityId: "u-coastline", code: "CUB5C02", name: "Auditing", semester: 5, credits: 4, mappingStatus: "mapped", reviewedBy: "st-hana", mappings: [{ paper: "AA", areas: ["A", "C", "D"], coverage: "partial" }] },
  { id: "sub-cl-601", universityId: "u-coastline", code: "CUB6C01", name: "Financial Management", semester: 6, credits: 4, mappingStatus: "mapped", reviewedBy: "st-tomas", mappings: [{ paper: "FM", areas: ["C", "D", "E"], coverage: "partial" }] },

  // Northfield · BBA Finance with ACCA (onboarding)
  { id: "sub-nf-101", universityId: "u-northfield", code: "BBF101", name: "Financial Accounting", semester: 1, credits: 4, mappingStatus: "in-review", mappings: [{ paper: "FA", areas: ["C", "D", "E", "F"], coverage: "full" }], note: "Syllabus uploaded 2 Sep 2026, mapping awaiting faculty review." },
  { id: "sub-nf-102", universityId: "u-northfield", code: "BBF102", name: "Principles of Management", semester: 1, credits: 4, mappingStatus: "in-review", mappings: [{ paper: "BT", areas: ["A", "B", "D"], coverage: "partial" }] },
  { id: "sub-nf-103", universityId: "u-northfield", code: "BBF103", name: "Business Statistics", semester: 1, credits: 3, mappingStatus: "in-review", mappings: [{ paper: "MA", areas: ["B"], coverage: "partial" }] },
  { id: "sub-nf-201", universityId: "u-northfield", code: "BBF201", name: "Cost Accounting", semester: 2, credits: 4, mappingStatus: "not-mapped", mappings: [] },
  { id: "sub-nf-202", universityId: "u-northfield", code: "BBF202", name: "Business Law", semester: 2, credits: 3, mappingStatus: "not-mapped", mappings: [] },
];

export function subjectsForUniversity(universityId: string) {
  return universitySubjects.filter((s) => s.universityId === universityId);
}

export function subjectById(id: string) {
  return universitySubjects.find((s) => s.id === id);
}

export const curriculumUploads = [
  { id: "cur-bw-1", universityId: "u-brightwater", fileName: "BCom_Hons_Syllabus_2025_Scheme.pdf", uploadedBy: "st-suresh", uploadedOn: "2025-05-20", subjects: 22, status: "mapped" as const },
  { id: "cur-bw-2", universityId: "u-brightwater", fileName: "BCH602_Corporate_Governance_Revised.pdf", uploadedBy: "st-suresh", uploadedOn: "2026-09-02", subjects: 1, status: "in-review" as const },
  { id: "cur-cl-1", universityId: "u-coastline", fileName: "Coastline_BCom_ACCA_Pathway_Scheme.xlsx", uploadedBy: "st-joseph", uploadedOn: "2025-06-11", subjects: 11, status: "mapped" as const },
  { id: "cur-nf-1", universityId: "u-northfield", fileName: "NFU_BBA_Finance_Curriculum_2026.pdf", uploadedBy: "st-priya", uploadedOn: "2026-09-02", subjects: 5, status: "in-review" as const },
];

/* ------------------------------------------------------------------------------------------
 * Semester-to-ACCA roadmaps
 * ---------------------------------------------------------------------------------------- */

export const semesterRoadmaps: RoadmapStage[] = [
  { id: "rm-bw-1", universityId: "u-brightwater", semester: 1, label: "Semester 1", window: "Jul to Nov", papers: ["BT"], examWindowPapers: ["BT"], focus: "Business and Technology alongside Business Organisation and Management.", overlapSubjectIds: ["sub-bw-102", "sub-bw-101"] },
  { id: "rm-bw-2", universityId: "u-brightwater", semester: 2, label: "Semester 2", window: "Jan to Apr", papers: ["MA", "FA"], examWindowPapers: ["MA"], focus: "Management Accounting exam this semester, Financial Accounting studied ready for Semester 3.", overlapSubjectIds: ["sub-bw-201", "sub-bw-203"] },
  { id: "rm-bw-3", universityId: "u-brightwater", semester: 3, label: "Semester 3", window: "Jul to Nov", papers: ["LW"], examWindowPapers: ["FA"], focus: "Corporate and Business Law, and the FA on-demand exam window before university examinations.", overlapSubjectIds: ["sub-bw-202", "sub-bw-302", "sub-bw-301"] },
  { id: "rm-bw-4", universityId: "u-brightwater", semester: 4, label: "Semester 4", window: "Jan to Apr", papers: ["PM", "TX"], examWindowPapers: ["LW"], focus: "Performance Management and Taxation, LW on-demand exam in January.", overlapSubjectIds: ["sub-bw-401", "sub-bw-402"] },
  { id: "rm-bw-5", universityId: "u-brightwater", semester: 5, label: "Semester 5", window: "Jul to Nov", papers: ["FR", "AA"], examWindowPapers: ["PM", "TX"], focus: "Financial Reporting and Audit and Assurance.", overlapSubjectIds: ["sub-bw-301", "sub-bw-501"] },
  { id: "rm-bw-6", universityId: "u-brightwater", semester: 6, label: "Semester 6", window: "Jan to Apr", papers: ["FM"], examWindowPapers: ["FR", "AA"], focus: "Financial Management, completing Applied Skills.", overlapSubjectIds: ["sub-bw-601"] },
  { id: "rm-bw-7", universityId: "u-brightwater", semester: null, label: "After graduation", window: "From Jun of final year", papers: ["SBL", "SBR"], examWindowPapers: ["FM"], focus: "Strategic Professional: SBL, SBR and two options (learner chooses from AFM, APM, ATX, AAA).", overlapSubjectIds: [] },

  { id: "rm-cl-1", universityId: "u-coastline", semester: 1, label: "Semester 1", window: "Jul to Nov", papers: ["BT"], examWindowPapers: ["BT"], focus: "Business and Technology.", overlapSubjectIds: ["sub-cl-102"] },
  { id: "rm-cl-2", universityId: "u-coastline", semester: 2, label: "Semester 2", window: "Jan to Apr", papers: ["MA"], examWindowPapers: ["MA"], focus: "Management Accounting alongside Business Statistics.", overlapSubjectIds: ["sub-cl-201"] },
  { id: "rm-cl-3", universityId: "u-coastline", semester: 3, label: "Semester 3", window: "Jul to Nov", papers: ["FA", "LW"], examWindowPapers: ["FA"], focus: "Financial Accounting exam window and Corporate and Business Law.", overlapSubjectIds: ["sub-cl-101", "sub-cl-302", "sub-cl-301"] },
  { id: "rm-cl-4", universityId: "u-coastline", semester: 4, label: "Semester 4", window: "Jan to Apr", papers: ["TX", "PM"], examWindowPapers: ["LW"], focus: "Taxation and Performance Management.", overlapSubjectIds: ["sub-cl-402"] },
  { id: "rm-cl-5", universityId: "u-coastline", semester: 5, label: "Semester 5", window: "Jul to Nov", papers: ["FR", "AA"], examWindowPapers: ["TX", "PM"], focus: "Financial Reporting and Audit and Assurance.", overlapSubjectIds: ["sub-cl-401", "sub-cl-502", "sub-cl-501"] },
  { id: "rm-cl-6", universityId: "u-coastline", semester: 6, label: "Semester 6", window: "Jan to Apr", papers: ["FM"], examWindowPapers: ["FR", "AA"], focus: "Financial Management.", overlapSubjectIds: ["sub-cl-601"] },

  { id: "rm-nf-1", universityId: "u-northfield", semester: 1, label: "Semester 1 (draft)", window: "Aug to Dec", papers: ["BT"], examWindowPapers: [], focus: "Draft roadmap awaiting Northfield sign-off.", overlapSubjectIds: ["sub-nf-102"] },
  { id: "rm-nf-2", universityId: "u-northfield", semester: 2, label: "Semester 2 (draft)", window: "Jan to May", papers: ["FA", "MA"], examWindowPapers: ["BT"], focus: "Draft roadmap awaiting Northfield sign-off.", overlapSubjectIds: ["sub-nf-101", "sub-nf-103"] },
];

export function roadmapForUniversity(universityId: string) {
  return semesterRoadmaps.filter((r) => r.universityId === universityId);
}

export const roadmapApprovals = [
  { universityId: "u-brightwater", status: "approved" as const, approvedBy: "st-suresh", approvedOn: "2025-06-30", version: "v2.1", note: "Semester 3 FA exam window moved before university examinations." },
  { universityId: "u-coastline", status: "approved" as const, approvedBy: "st-joseph", approvedOn: "2025-07-10", version: "v1.0", note: "" },
  { universityId: "u-northfield", status: "in-review" as const, approvedBy: null, approvedOn: null, version: "v0.3", note: "Awaiting Northfield programme committee on 22 Sep 2026." },
];

/* ------------------------------------------------------------------------------------------
 * Joint certificate
 * ---------------------------------------------------------------------------------------- */

export const jointCertificateRule: JointCertificateRule = {
  title: "B.Com (Hons) with ACCA · joint certificate of completion from Brightwater University and ZSkillup",
  issuers: ["Brightwater University", "ZSkillup"],
  criteria: [
    { id: "applied-knowledge", label: "Applied Knowledge complete (BT, MA, FA passed or exempt)" },
    { id: "lw-passed", label: "LW passed" },
    { id: "attendance", label: "Attendance in ACCA sessions at least 75%" },
    { id: "no-overdue-fees", label: "No overdue fees" },
  ],
  summary:
    "Applied Knowledge complete (BT, MA, FA passed or exempt) + LW passed + attendance in ACCA sessions at least 75% + no overdue fees.",
};

/* ------------------------------------------------------------------------------------------
 * University announcements (also merged into comms `announcements`)
 * ---------------------------------------------------------------------------------------- */

export const universityAnnouncements: Announcement[] = [
  {
    id: "an-bw-01",
    title: "Book FA on-demand exams before 20 November",
    body: "Semester 3 learners sitting Financial Accounting should book an on-demand slot on or before 20 November. University examinations run 23 November to 12 December and no ACCA exams should be booked in that window.",
    audience: "university",
    audienceId: "u-brightwater",
    audienceLabel: "Brightwater University · 2025 intake",
    authorId: "st-suresh",
    publishedOn: "2026-09-08",
    status: "published",
    channels: ["in-app", "email"],
    category: "Exams",
    pinned: true,
    readPct: 74,
  },
  {
    id: "an-bw-02",
    title: "No ACCA classes during university examinations",
    body: "ACCA live classes and mock examinations pause from 23 November to 12 December 2026. Recordings stay available and doubt-clearing resumes on 14 December.",
    audience: "university",
    audienceId: "u-brightwater",
    audienceLabel: "Brightwater University · all ACCA learners",
    authorId: "st-suresh",
    publishedOn: "2026-09-01",
    status: "published",
    channels: ["in-app", "email", "whatsapp"],
    category: "University",
    readPct: 88,
  },
  {
    id: "an-bw-03",
    title: "Continuous internal assessment 1 timetable",
    body: "CIA 1 runs 21 to 25 September. ACCA afternoon and morning classes that week move to recordings, with a live doubt-clearing hour on Saturday 26 September.",
    audience: "university",
    audienceId: "u-brightwater",
    audienceLabel: "Brightwater University · Semester 1 and 3",
    authorId: "st-suresh",
    publishedOn: "2026-09-11",
    status: "published",
    channels: ["in-app"],
    category: "University",
    readPct: 52,
  },
  {
    id: "an-bw-04",
    title: "Guest session: careers in audit and assurance",
    body: "A panel of audit managers joins the Commerce auditorium on 25 September at 15:00. Open to all ACCA learners, attendance counts towards Career centre points.",
    audience: "university",
    audienceId: "u-brightwater",
    audienceLabel: "Brightwater University · all ACCA learners",
    authorId: "st-suresh",
    publishedOn: "2026-09-18",
    status: "scheduled",
    channels: ["in-app", "email"],
    category: "Careers",
  },
  {
    id: "an-bw-05",
    title: "Joint certificate eligibility check for the 2025 intake",
    body: "The first eligibility check for the joint certificate of completion runs after Semester 3 results. Learners can see their checklist on the Certificates page.",
    audience: "university",
    audienceId: "u-brightwater",
    audienceLabel: "Brightwater University · 2025 intake",
    authorId: "st-suresh",
    publishedOn: "2026-09-14",
    status: "draft",
    channels: ["in-app"],
    category: "University",
  },
  {
    id: "an-cl-01",
    title: "Semester 3 internal assessment week",
    body: "Internal assessments run 12 to 16 October. ACCA weekday classes that week are recorded and uploaded the same evening.",
    audience: "university",
    audienceId: "u-coastline",
    audienceLabel: "Coastline University · 2025 intake",
    authorId: "st-joseph",
    publishedOn: "2026-09-05",
    status: "published",
    channels: ["in-app", "whatsapp"],
    category: "University",
    readPct: 69,
  },
  {
    id: "an-nf-01",
    title: "Welcome to BBA Finance with ACCA",
    body: "Your ACCA workspace opens on 1 October 2026. Please complete ACCA registration documents with the programme office before then.",
    audience: "university",
    audienceId: "u-northfield",
    audienceLabel: "Northfield University · 2026 intake",
    authorId: "st-priya",
    publishedOn: "2026-09-25",
    status: "scheduled",
    channels: ["email"],
    category: "University",
  },
];

export function announcementsForUniversity(universityId: string) {
  return universityAnnouncements.filter((a) => a.audienceId === universityId);
}
