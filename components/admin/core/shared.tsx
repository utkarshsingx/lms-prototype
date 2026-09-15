import { cn } from "@/lib/cn";
import { platformRoles, type AccaRoleId } from "@/lib/data/acca";

/** Demo clock for "how long ago" figures: Monday 14 September 2026, mid-morning IST. */
export const DEMO_NOW = "2026-09-14T10:30";

/** Brand colour presets offered by the branding editor (data swatches, used in style only). */
export const BRAND_SWATCHES = ["#1f3a8a", "#0f766e", "#7c2d12", "#6d28d9", "#9f1239", "#0e7490", "#15803d", "#16171d"];

const MINUTES_PER_HOUR = 60;

function toUtcMinutes(iso: string) {
  const [date, time = "00:00"] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return Date.UTC(y, m - 1, d, hh, mm) / 60000;
}

/** Whole hours between two IST datetimes, deterministic (no clock). */
export function hoursBetween(from: string, to: string = DEMO_NOW) {
  return Math.max(0, Math.round((toUtcMinutes(to) - toUtcMinutes(from)) / MINUTES_PER_HOUR));
}

/** "Today", "Yesterday", "6 days ago" relative to the demo date. */
export function daysAgoLabel(days: number) {
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function lastActiveLabel(iso: string) {
  if (!iso) return "Never signed in";
  const hours = hoursBetween(iso);
  if (hours < 24 && iso.slice(0, 10) === DEMO_NOW.slice(0, 10)) return `Today, ${iso.slice(11, 16)}`;
  const days = Math.max(1, Math.round(hours / 24));
  return days === 1 ? `Yesterday, ${iso.slice(11, 16)}` : `${days} days ago`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Short role names for chips and filters. */
export const ROLE_SHORT: Record<AccaRoleId, string> = {
  "super-admin": "Super Admin",
  "programme-admin": "Programme Admin",
  "university-admin": "University Admin",
  faculty: "Faculty",
  mentor: "Mentor and Career",
  student: "Student",
};

export function roleName(role: AccaRoleId) {
  return platformRoles.find((r) => r.id === role)?.name ?? ROLE_SHORT[role];
}

/** Legible text colour on an arbitrary brand colour (relative luminance). */
export function inkOn(hex: string) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return "#ffffff";
  const channel = (i: number) => {
    const c = parseInt(clean.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
  return lum > 0.42 ? "#16171d" : "#ffffff";
}

/** University logo tile: initials on the university's own brand colour. */
export function UniversityMark({
  initials,
  color,
  size = "md",
  className,
}: {
  initials: string;
  color: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = { sm: "size-8 text-[11px] rounded-[9px]", md: "size-10 text-[13px] rounded-[11px]", lg: "size-14 text-[18px] rounded-[14px]" }[size];
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center font-display font-bold tracking-[-0.02em]", box, className)}
      style={{ backgroundColor: color, color: inkOn(color) }}
    >
      {initials}
    </span>
  );
}

/** Small uppercase label used inside cards. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** Heading block that names a client requirement above a page section. */
export function SectionHead({
  title,
  sub,
  action,
  className,
}: {
  title: string;
  sub?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-4 gap-y-2", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[20px] leading-tight font-bold tracking-[-0.02em] text-ink">{title}</h2>
        {sub ? <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-3">{sub}</p> : null}
      </div>
      {action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
