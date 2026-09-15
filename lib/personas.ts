/**
 * The six logins and their demo personas (bible section 3).
 *
 * Plain data and pure helpers only, no "use client", so server components
 * (redirect pages, layouts) can import from here directly. Client hooks live in
 * lib/role.tsx, which re-exports everything below.
 */

export type RoleId =
  | "super-admin"
  | "programme-admin"
  | "university-admin"
  | "faculty"
  | "mentor"
  | "student";

export type Permission =
  | "platform:all"
  | "programme:ops"
  | "programme:acca"
  | "programme:universities"
  | "programme:support"
  | "finance:view"
  | "finance:record"
  | "university:edit"
  | "content:publish"
  | "content:submit"
  | "faculty:grade"
  | "faculty:approve-reattempt"
  | "students:allocated"
  | "placement:manage"
  | "students:placement-eligible";

export type StudentType = "graduate" | "undergraduate";

export type Persona = {
  id: string;
  name: string;
  /** The title shown under the name ("ACCA Programme Lead"). */
  title: string;
  role: RoleId;
  permissions: Permission[];
  email: string;
  /** One short phrase describing what this persona can do, for chips. */
  access: string;
  /** Staff record id in lib/data/acca (st-*). Absent for students. */
  staffId?: string;
  /** Students only. */
  studentType?: StudentType;
  /** Student record id in lib/data/acca (s-*). Students only. */
  studentId?: string;
  /** Rohan and the Brightwater university admins. */
  universityId?: string;
};

export type RoleIconName =
  | "ShieldCheck"
  | "Workflow"
  | "Landmark"
  | "Presentation"
  | "HeartHandshake"
  | "GraduationCap";

export type RoleMeta = {
  id: RoleId;
  /** Full login name, e.g. "ZSkillup Super Admin". */
  label: string;
  /** Compact form for chips and tight spaces. */
  short: string;
  /** Who the login is for, verbatim from requirements.md. */
  who: string;
  /** Workspace home route. */
  home: string;
  /** lucide-react icon name; `roleIcon(role)` in lib/nav.ts returns the component. */
  icon: RoleIconName;
  /** Persona ids for this role, first one is the default. */
  personaIds: string[];
};

export const PERSONAS: Persona[] = [
  {
    id: "p-neha",
    name: "Neha Kapoor",
    title: "Platform Director · ZSkillup",
    role: "super-admin",
    permissions: ["platform:all"],
    email: "neha.kapoor@zskillup.com",
    access: "Full platform access",
    staffId: "st-neha",
  },
  {
    id: "p-arjun",
    name: "Arjun Shetty",
    title: "Technology Administrator · ZSkillup",
    role: "super-admin",
    permissions: ["platform:all"],
    email: "arjun.shetty@zskillup.com",
    access: "Full platform access",
    staffId: "st-arjun",
  },
  {
    id: "p-priya",
    name: "Priya Menon",
    title: "ACCA Programme Lead",
    role: "programme-admin",
    permissions: [
      "programme:ops",
      "programme:acca",
      "programme:universities",
      "programme:support",
      "finance:view",
      "finance:record",
    ],
    email: "priya.menon@zskillup.com",
    access: "All programme areas, with finance",
    staffId: "st-priya",
  },
  {
    id: "p-imran",
    name: "Imran Sheikh",
    title: "Student Support Executive",
    role: "programme-admin",
    permissions: [
      "programme:ops",
      "programme:acca",
      "programme:universities",
      "programme:support",
    ],
    email: "imran.sheikh@zskillup.com",
    access: "No finance access",
    staffId: "st-imran",
  },
  {
    id: "p-deepa",
    name: "Deepa Iyer",
    title: "Finance Operations",
    role: "programme-admin",
    permissions: ["programme:support", "finance:view", "finance:record"],
    email: "deepa.iyer@zskillup.com",
    access: "Finance and support, operations read-only",
    staffId: "st-deepa",
  },
  {
    id: "p-suresh",
    name: "Dr Suresh Nair",
    title: "Programme Director · Brightwater University",
    role: "university-admin",
    permissions: ["university:edit"],
    email: "suresh.nair@brightwater.edu",
    access: "Editor",
    staffId: "st-suresh",
    universityId: "u-brightwater",
  },
  {
    id: "p-lakshmi",
    name: "Prof. Lakshmi Rao",
    title: "Dean of Commerce · Brightwater University",
    role: "university-admin",
    permissions: [],
    email: "lakshmi.rao@brightwater.edu",
    access: "View-only",
    staffId: "st-lakshmi",
    universityId: "u-brightwater",
  },
  {
    id: "p-marcus",
    name: "Marcus Bell",
    title: "Faculty · FR and SBR",
    role: "faculty",
    permissions: ["content:publish", "faculty:grade", "faculty:approve-reattempt"],
    email: "marcus.bell@zskillup.com",
    access: "Can publish content",
    staffId: "st-marcus",
  },
  {
    id: "p-farah",
    name: "Farah Siddiqui",
    title: "Content Author · PM",
    role: "faculty",
    permissions: ["content:submit", "faculty:grade"],
    email: "farah.siddiqui@zskillup.com",
    access: "Submits content for review",
    staffId: "st-farah",
  },
  {
    id: "p-aisha",
    name: "Aisha Khan",
    title: "Academic Mentor",
    role: "mentor",
    permissions: ["students:allocated"],
    email: "aisha.khan@zskillup.com",
    access: "Allocated students only",
    staffId: "st-aisha",
  },
  {
    id: "p-rahul",
    name: "Rahul Verma",
    title: "Placement Lead",
    role: "mentor",
    permissions: ["placement:manage", "students:placement-eligible"],
    email: "rahul.verma@zskillup.com",
    access: "Placement-eligible learners",
    staffId: "st-rahul",
  },
  {
    id: "p-anaya",
    name: "Anaya Rao",
    title: "Graduate ACCA learner",
    role: "student",
    permissions: [],
    email: "anaya.rao@students.zskillup.com",
    access: "Graduate ACCA learner",
    studentType: "graduate",
    studentId: "s-anaya",
  },
  {
    id: "p-rohan",
    name: "Rohan Iyer",
    title: "B.Com (Hons) with ACCA · Semester 3",
    role: "student",
    permissions: [],
    email: "rohan.iyer@students.zskillup.com",
    access: "University undergraduate",
    studentType: "undergraduate",
    studentId: "s-rohan",
    universityId: "u-brightwater",
  },
];

export const ROLES: RoleMeta[] = [
  {
    id: "super-admin",
    label: "ZSkillup Super Admin",
    short: "Super Admin",
    who: "Management, technology and central operations",
    home: "/admin",
    icon: "ShieldCheck",
    personaIds: ["p-neha", "p-arjun"],
  },
  {
    id: "programme-admin",
    label: "Programme Admin",
    short: "Programme Admin",
    who: "Programme operations, ACCA coordination and university coordination",
    home: "/programme",
    icon: "Workflow",
    personaIds: ["p-priya", "p-imran", "p-deepa"],
  },
  {
    id: "university-admin",
    label: "University Admin",
    short: "University Admin",
    who: "University management and university programme coordinator",
    home: "/university",
    icon: "Landmark",
    personaIds: ["p-suresh", "p-lakshmi"],
  },
  {
    id: "faculty",
    label: "Faculty and Academic Team",
    short: "Faculty",
    who: "Faculty, content creators, reviewers and evaluators",
    home: "/faculty",
    icon: "Presentation",
    personaIds: ["p-marcus", "p-farah"],
  },
  {
    id: "mentor",
    label: "Mentor and Career Team",
    short: "Mentor and Career",
    who: "Student success, mentoring, placement and internships",
    home: "/mentor",
    icon: "HeartHandshake",
    personaIds: ["p-aisha", "p-rahul"],
  },
  {
    id: "student",
    label: "Student",
    short: "Student",
    who: "Graduate ACCA learner and university undergraduate",
    home: "/dashboard",
    icon: "GraduationCap",
    personaIds: ["p-anaya", "p-rohan"],
  },
];

export const DEFAULT_PERSONA_ID = "p-anaya";

/** Plain-English names for permissions, for RestrictedNotice and tooltips. */
export const PERMISSION_LABELS: Record<Permission, string> = {
  "platform:all": "Full platform administration",
  "programme:ops": "Programme operations",
  "programme:acca": "ACCA operations",
  "programme:universities": "University coordination",
  "programme:support": "Student support",
  "finance:view": "View finance",
  "finance:record": "Record payments",
  "university:edit": "Edit university workspace",
  "content:publish": "Publish content",
  "content:submit": "Submit content for review",
  "faculty:grade": "Grade and give feedback",
  "faculty:approve-reattempt": "Approve reattempts",
  "students:allocated": "Allocated students",
  "placement:manage": "Manage placements",
  "students:placement-eligible": "Placement-eligible learners",
};

const PERSONA_INDEX = new Map(PERSONAS.map((p) => [p.id, p]));
const ROLE_INDEX = new Map(ROLES.map((r) => [r.id, r]));

export const DEFAULT_PERSONA = PERSONA_INDEX.get(DEFAULT_PERSONA_ID)!;

export function personaById(id: string | null | undefined): Persona | undefined {
  return id ? PERSONA_INDEX.get(id) : undefined;
}

export function roleMeta(role: RoleId): RoleMeta {
  return ROLE_INDEX.get(role)!;
}

export function personasForRole(role: RoleId): Persona[] {
  return roleMeta(role).personaIds.map((id) => PERSONA_INDEX.get(id)!);
}

/** The persona a role opens as when nothing better is known. */
export function defaultPersonaFor(role: RoleId): Persona {
  return personasForRole(role)[0];
}

export function homeFor(role: RoleId): string {
  return roleMeta(role).home;
}

/** The demo student persona for a student type (the gated-page switch button). */
export function studentPersonaFor(type: StudentType): Persona {
  return type === "graduate" ? PERSONA_INDEX.get("p-anaya")! : PERSONA_INDEX.get("p-rohan")!;
}

const PREFIX_ROLES: [string, RoleId][] = [
  ["/admin", "super-admin"],
  ["/programme", "programme-admin"],
  ["/university", "university-admin"],
  ["/faculty", "faculty"],
  ["/mentor", "mentor"],
];

/** Which login a route belongs to. Every in-app route outside the five staff
 *  workspaces is a student route. */
export function roleForPath(pathname: string): RoleId {
  for (const [prefix, role] of PREFIX_ROLES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return role;
  }
  return "student";
}

/** Two-letter initials, ignoring honorifics ("Dr Suresh Nair" is SN). */
export function personaInitials(name: string): string {
  return name
    .replace(/^(Dr|Prof)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/** Whether a persona holds a permission. `platform:all` holds every one. */
export function personaCan(persona: Persona, permission: Permission): boolean {
  return (
    persona.permissions.includes("platform:all") ||
    persona.permissions.includes(permission)
  );
}
