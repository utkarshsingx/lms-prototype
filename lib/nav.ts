import {
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  BookMarked,
  BookOpen,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Compass,
  CreditCard,
  Database,
  FileBarChart,
  FileCheck2,
  FileText,
  FileUp,
  FolderKanban,
  Gauge,
  GitBranch,
  GraduationCap,
  HeartHandshake,
  History,
  IdCard,
  Landmark,
  LayoutDashboard,
  Layers,
  LibraryBig,
  LifeBuoy,
  ListChecks,
  Map as MapIcon,
  Megaphone,
  MessageCircleQuestion,
  MessageSquareText,
  MessagesSquare,
  Mic,
  MonitorPlay,
  PhoneCall,
  Plug,
  Presentation,
  Receipt,
  Route,
  Scale,
  ScrollText,
  ShieldCheck,
  Siren,
  Sparkles,
  SquareKanban,
  Stamp,
  Target,
  TrendingUp,
  TriangleAlert,
  Trophy,
  UserCog,
  UserRoundCheck,
  Users,
  UsersRound,
  Video,
  Wallet,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  personaCan,
  roleMeta,
  type Permission,
  type Persona,
  type RoleIconName,
  type RoleId,
  type StudentType,
} from "./personas";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Count shown as a yellow pill. Static, but each number is a lib/data/acca
   *  count (listed above the registry), so pages must show the same figure. */
  badge?: string;
  /** Permission needed to use the page. Missing it keeps the item visible, locked. */
  requires?: Permission;
  /** Student items shown to one student type only. */
  studentType?: StudentType;
  /** Extra path prefixes that also light this item (e.g. /learn for Papers). */
  match?: string[];
  /** Set by navFor when the persona lacks `requires`. */
  locked?: boolean;
};

export type NavSection = { heading: string; items: NavItem[] };

const ICONS_BY_NAME: Record<RoleIconName, LucideIcon> = {
  ShieldCheck,
  Workflow,
  Landmark,
  Presentation,
  HeartHandshake,
  GraduationCap,
};

/** The lucide icon for each login (its `RoleMeta.icon`). Index it, e.g.
 *  `const Icon = ROLE_ICONS[role]`, so lint sees a static component. */
export const ROLE_ICONS = Object.fromEntries(
  (["super-admin", "programme-admin", "university-admin", "faculty", "mentor", "student"] as RoleId[]).map(
    (role) => [role, ICONS_BY_NAME[roleMeta(role).icon]],
  ),
) as Record<RoleId, LucideIcon>;

/** Function form of ROLE_ICONS. */
export function roleIcon(role: RoleId): LucideIcon {
  return ROLE_ICONS[role];
}

/* ------------------------------------------------------------ registry */

/* Badge sources in lib/data/acca, for the default persona of each login:
   Mock exams 2   = studentById("s-anaya").mocks with status "scheduled"
   Doubts 1       = doubtsForStudent("s-anaya") with status "answered"
   Notifications 3 = unreadNotificationCount("s-anaya")
   Exemptions 9   = exemption records (all students) in state "estimated"
   Support tickets 20 = supportTurnaround.open (tickets not resolved)
   WhatsApp 3     = lib/data conversations on WhatsApp that are open or escalated
   Support escalation 4 = tickets with status "escalated"
   Student questions 3 = doubtsForFaculty("st-marcus") with status "open"
   Reviews & versions 3 = reviewRequests for reviewer st-marcus, status "pending"
   Evaluation 5   = evaluationsForGrader("st-marcus") not graded or returned
   Risk alerts 10 = alertsForMentor("st-aisha") with status "new" */

const STUDENT: NavSection[] = [
  {
    heading: "Learn",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/journey", label: "ACCA journey", icon: Route, match: ["/paths"] },
      {
        href: "/papers",
        label: "Papers",
        icon: BookOpen,
        match: ["/courses", "/learn", "/catalog", "/my-learning"],
      },
      { href: "/classes", label: "Live classes", icon: Video },
      { href: "/practice", label: "Practice", icon: Target },
      {
        href: "/mocks",
        label: "Mock exams",
        icon: FileCheck2,
        badge: "2",
        match: ["/assessments"],
      },
      { href: "/readiness", label: "Readiness", icon: Gauge, match: ["/progress"] },
      { href: "/exams", label: "Exams & results", icon: CalendarCheck },
    ],
  },
  {
    heading: "Your plan",
    items: [
      { href: "/exemptions", label: "Exemptions", icon: FileUp, studentType: "graduate" },
      { href: "/plan", label: "Completion plan", icon: ListChecks, studentType: "graduate" },
      { href: "/batches", label: "Batches & cohorts", icon: CalendarRange, studentType: "graduate" },
      { href: "/career-transition", label: "Career transition", icon: Compass, studentType: "graduate" },
    ],
  },
  {
    heading: "Your university",
    items: [
      { href: "/my-university", label: "My university", icon: Building2, studentType: "undergraduate" },
      { href: "/roadmap", label: "Semester roadmap", icon: MapIcon, studentType: "undergraduate" },
      { href: "/leaderboard", label: "Cohort leaderboard", icon: Trophy, studentType: "undergraduate" },
    ],
  },
  {
    heading: "Help",
    items: [
      { href: "/assistant", label: "AI tutor", icon: Sparkles },
      { href: "/doubts", label: "Doubts", icon: MessageCircleQuestion, badge: "1" },
      { href: "/my-mentor", label: "My mentor", icon: UserRoundCheck },
      { href: "/discussions", label: "Community", icon: MessagesSquare },
      { href: "/notifications", label: "Notifications", icon: Bell, badge: "3" },
      { href: "/support", label: "Support tickets", icon: LifeBuoy },
    ],
  },
  {
    heading: "Career",
    items: [
      { href: "/careers", label: "Career centre", icon: Briefcase },
      { href: "/careers/resume", label: "Resume builder", icon: FileText },
      { href: "/careers/interviews", label: "AI mock interviews", icon: Mic },
      { href: "/careers/jobs", label: "Jobs & internships", icon: BriefcaseBusiness },
    ],
  },
  {
    heading: "Account",
    items: [
      { href: "/certificates", label: "Certificates", icon: Award },
      { href: "/payments", label: "Payments", icon: CreditCard },
    ],
  },
];

const SUPER_ADMIN: NavSection[] = [
  {
    heading: "Overview",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    heading: "Network",
    items: [
      { href: "/admin/universities", label: "Universities", icon: Landmark },
      { href: "/admin/programmes", label: "Programmes", icon: Layers },
      { href: "/admin/users", label: "Users & roles", icon: UserCog },
    ],
  },
  {
    heading: "Academic framework",
    items: [
      { href: "/admin/acca-framework", label: "ACCA framework", icon: GitBranch },
      { href: "/admin/content", label: "Content repository", icon: LibraryBig },
      { href: "/admin/assessment-framework", label: "Assessment framework", icon: ClipboardCheck },
    ],
  },
  {
    heading: "Configuration",
    items: [
      { href: "/admin/communications", label: "Communications", icon: Megaphone },
      { href: "/admin/integrations", label: "Integrations", icon: Plug },
      { href: "/admin/certificates", label: "Certificates", icon: Award },
      { href: "/admin/payment-rules", label: "Payment rules", icon: Wallet },
    ],
  },
  {
    heading: "Governance",
    items: [
      { href: "/admin/escalations", label: "Support escalation", icon: Siren, badge: "4" },
      { href: "/admin/audit", label: "Audit logs", icon: ScrollText },
      { href: "/admin/privacy", label: "Data & privacy", icon: ShieldCheck },
    ],
  },
];

const PROGRAMME_ADMIN: NavSection[] = [
  {
    heading: "Operations",
    items: [
      { href: "/programme", label: "Dashboard", icon: LayoutDashboard },
      { href: "/programme/students", label: "Students", icon: Users },
      { href: "/programme/cohorts", label: "Cohorts & batches", icon: Layers },
      { href: "/programme/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/programme/staffing", label: "Faculty & mentors", icon: UsersRound },
      { href: "/programme/announcements", label: "Announcements & resources", icon: Megaphone },
    ],
  },
  {
    heading: "ACCA operations",
    items: [
      { href: "/programme/acca/registrations", label: "Registrations", icon: IdCard },
      { href: "/programme/acca/exemptions", label: "Exemptions", icon: FileCheck2, badge: "9" },
      { href: "/programme/acca/exams", label: "Exams & results", icon: CalendarCheck },
      { href: "/programme/acca/progression", label: "Progression", icon: TrendingUp },
    ],
  },
  {
    heading: "University coordination",
    items: [
      { href: "/programme/universities", label: "Curriculum mapping", icon: GitBranch },
      { href: "/programme/universities/calendars", label: "Academic calendars", icon: CalendarRange },
      { href: "/programme/universities/operations", label: "University operations", icon: Building2 },
    ],
  },
  {
    heading: "Student support",
    items: [
      { href: "/programme/support", label: "Support tickets", icon: LifeBuoy, badge: "20" },
      { href: "/programme/support/faqs", label: "FAQs & trends", icon: BookMarked },
      {
        href: "/programme/whatsapp",
        label: "WhatsApp",
        icon: MessageSquareText,
        badge: "3",
        match: ["/channels/whatsapp"],
      },
      { href: "/programme/voice", label: "Voice agent", icon: PhoneCall, match: ["/channels/voice"] },
    ],
  },
  {
    heading: "Finance",
    items: [
      { href: "/programme/finance", label: "Fees & payments", icon: Receipt, requires: "finance:view" },
      {
        href: "/programme/finance/reconciliation",
        label: "Reconciliation & refunds",
        icon: Scale,
        requires: "finance:view",
      },
    ],
  },
];

const UNIVERSITY_ADMIN: NavSection[] = [
  {
    heading: "Overview",
    items: [
      { href: "/university", label: "Dashboard", icon: LayoutDashboard },
      { href: "/university/reports", label: "Reports", icon: FileBarChart },
    ],
  },
  {
    heading: "Students",
    items: [
      { href: "/university/students", label: "Students", icon: Users },
      { href: "/university/cohorts", label: "Intakes & cohorts", icon: Layers },
      { href: "/university/acca", label: "ACCA progress", icon: Route },
      { href: "/university/performance", label: "Performance", icon: Gauge },
    ],
  },
  {
    heading: "Academics",
    items: [
      { href: "/university/curriculum", label: "Curriculum & mapping", icon: GitBranch },
      { href: "/university/calendar", label: "Academic calendar", icon: CalendarRange },
    ],
  },
  {
    heading: "Engagement",
    items: [
      { href: "/university/announcements", label: "Announcements", icon: Megaphone },
      { href: "/university/support", label: "Support tickets", icon: LifeBuoy },
      { href: "/university/careers", label: "Careers", icon: Briefcase },
    ],
  },
  {
    heading: "Administration",
    items: [
      { href: "/university/certificates", label: "Joint certificates", icon: Stamp },
      { href: "/university/users", label: "University users", icon: UserCog },
    ],
  },
];

const FACULTY: NavSection[] = [
  {
    heading: "Teaching",
    items: [
      { href: "/faculty", label: "Dashboard", icon: LayoutDashboard },
      { href: "/faculty/cohorts", label: "Papers & cohorts", icon: BookOpen },
      { href: "/faculty/classes", label: "Live classes", icon: MonitorPlay },
      { href: "/faculty/questions", label: "Student questions", icon: MessageCircleQuestion, badge: "3" },
    ],
  },
  {
    heading: "Content",
    items: [
      { href: "/faculty/content", label: "Content studio", icon: FolderKanban, match: ["/studio"] },
      { href: "/faculty/content/reviews", label: "Reviews & versions", icon: History, badge: "3" },
    ],
  },
  {
    heading: "Assessment",
    items: [
      { href: "/faculty/question-bank", label: "Question bank", icon: Database },
      { href: "/faculty/mocks", label: "Quizzes & mocks", icon: ClipboardList },
      {
        href: "/faculty/evaluation",
        label: "Evaluation",
        icon: BadgeCheck,
        badge: "5",
        match: ["/grading"],
      },
      { href: "/faculty/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
];

const MENTOR: NavSection[] = [
  {
    heading: "Student success",
    items: [
      { href: "/mentor", label: "Dashboard", icon: LayoutDashboard },
      { href: "/mentor/students", label: "My students", icon: Users },
      { href: "/mentor/alerts", label: "Risk alerts", icon: TriangleAlert, badge: "10" },
      { href: "/mentor/plans", label: "Action plans & sessions", icon: ListChecks },
      { href: "/mentor/recovery", label: "Recovery & escalations", icon: LifeBuoy },
    ],
  },
  {
    heading: "Careers",
    items: [
      { href: "/mentor/careers", label: "Career profiles", icon: IdCard },
      { href: "/mentor/interviews", label: "Mock interviews", icon: Mic },
      { href: "/mentor/opportunities", label: "Jobs & internships", icon: BriefcaseBusiness },
      { href: "/mentor/placements", label: "Placement pipeline", icon: SquareKanban },
      { href: "/mentor/reports", label: "Placement reports", icon: FileBarChart },
    ],
  },
];

const REGISTRY: Record<RoleId, NavSection[]> = {
  student: STUDENT,
  "super-admin": SUPER_ADMIN,
  "programme-admin": PROGRAMME_ADMIN,
  "university-admin": UNIVERSITY_ADMIN,
  faculty: FACULTY,
  mentor: MENTOR,
};

/**
 * Sidebar sections for a login. Student items for the other student type are
 * dropped (and their section with them); items the persona lacks permission
 * for stay visible with `locked: true`.
 */
export function navFor(
  role: RoleId,
  persona?: Persona,
  studentType?: StudentType,
): NavSection[] {
  const type = role === "student" ? (studentType ?? persona?.studentType) : undefined;
  return REGISTRY[role]
    .map((section) => ({
      heading: section.heading,
      items: section.items
        .filter((item) => !item.studentType || !type || item.studentType === type)
        .map((item) => ({
          ...item,
          locked: item.requires && persona ? !personaCan(persona, item.requires) : false,
        })),
    }))
    .filter((section) => section.items.length > 0);
}

/** Every item for a login, flattened (palette, breadcrumbs). */
export function navItemsFor(role: RoleId, persona?: Persona, studentType?: StudentType) {
  return navFor(role, persona, studentType).flatMap((s) => s.items);
}

/** The section heading a path sits under, for page eyebrows. */
export function sectionFor(pathname: string, role: RoleId, persona?: Persona): string | undefined {
  const sections = navFor(role, persona);
  const href = activeHref(pathname, sections.flatMap((s) => s.items));
  return sections.find((s) => s.items.some((i) => i.href === href))?.heading;
}

const HOMES = new Set(["/dashboard", "/admin", "/programme", "/university", "/faculty", "/mentor"]);

function matchLength(pathname: string, item: NavItem): number {
  if (pathname === item.href) return item.href.length + 1;
  // A workspace home only lights on its own page, never on its children.
  if (!HOMES.has(item.href) && pathname.startsWith(item.href + "/")) return item.href.length;
  let best = 0;
  for (const m of item.match ?? []) {
    if (pathname === m || pathname.startsWith(m + "/")) best = Math.max(best, m.length);
  }
  return best;
}

/** The one nav href that should light for a path: the longest match wins, so
 *  /careers/resume lights Resume builder, not Career centre. */
export function activeHref(pathname: string, items: NavItem[]): string | undefined {
  let best: NavItem | undefined;
  let bestLen = 0;
  for (const item of items) {
    const len = matchLength(pathname, item);
    if (len > bestLen) {
      best = item;
      bestLen = len;
    }
  }
  return best?.href;
}

/**
 * Whether an item is the active one. Pass the sibling items so a longer match
 * (a sub page in the same nav) wins; without them the item's own match is used.
 */
export function isActive(pathname: string, item: NavItem, items?: NavItem[]): boolean {
  if (items) return activeHref(pathname, items) === item.href;
  return matchLength(pathname, item) > 0;
}
