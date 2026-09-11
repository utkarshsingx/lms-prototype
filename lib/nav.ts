import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Compass,
  GraduationCap,
  LayoutGrid,
  MessageSquareText,
  MessagesSquare,
  PenSquare,
  PhoneCall,
  Route,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof BookOpen;
  badge?: string;
  /** Also highlight the item when the path starts with one of these. */
  match?: string[];
};

export const learnNav: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutGrid },
  {
    href: "/my-learning",
    label: "My learning",
    icon: BookOpen,
    match: ["/learn"],
  },
  { href: "/catalog", label: "Catalog", icon: Compass, match: ["/courses"] },
  { href: "/paths", label: "Learning paths", icon: Route },
  {
    href: "/assessments",
    label: "Assessments",
    icon: ClipboardCheck,
    badge: "3",
  },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/discussions", label: "Discussions", icon: MessagesSquare },
  { href: "/assistant", label: "Assistant", icon: Sparkles },
];

export const manageNav: NavItem[] = [
  { href: "/manage", label: "Overview", icon: BarChart3 },
  { href: "/studio", label: "Course studio", icon: PenSquare },
  { href: "/grading", label: "Grading queue", icon: GraduationCap, badge: "12" },
  { href: "/people", label: "People", icon: Users },
];

export const channelNav: NavItem[] = [
  { href: "/channels/whatsapp", label: "WhatsApp", icon: MessageSquareText, badge: "3" },
  { href: "/channels/voice", label: "Voice agent", icon: PhoneCall },
];

export const settingsNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function isActive(pathname: string, item: NavItem) {
  if (pathname === item.href) return true;
  if (item.href !== "/" && pathname.startsWith(item.href + "/")) return true;
  return (item.match ?? []).some((m) => pathname.startsWith(m));
}

/** Routes that only make sense with the manage nav visible. */
const ADMIN_PREFIXES = [
  "/manage",
  "/studio",
  "/grading",
  "/people",
  "/channels",
  "/settings",
];

export const isAdminPath = (pathname: string) =>
  ADMIN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
