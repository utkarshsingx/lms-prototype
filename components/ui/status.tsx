import { cn } from "@/lib/cn";

/** Semantic tones shared by the kit (pills, calendar dots, kanban columns, timeline). */
export type StatusTone =
  | "jade"
  | "amber"
  | "rose"
  | "neutral"
  | "info"
  | "violet"
  | "cta";

/** Soft pill surfaces: tinted ground, full-strength text. */
export const toneSoft: Record<StatusTone, string> = {
  jade: "bg-jade-soft text-jade border-transparent",
  amber: "bg-amber-soft text-amber border-transparent",
  rose: "bg-rose-soft text-rose border-transparent",
  neutral: "bg-surface-2 text-ink-2 border-line",
  info: "bg-info-soft text-info border-transparent",
  violet: "bg-violet-soft text-violet border-transparent",
  cta: "bg-cta-soft text-ink border-cta",
};

/** Solid fills for dots, bars and rails. */
export const toneFill: Record<StatusTone, string> = {
  jade: "bg-jade",
  amber: "bg-amber",
  rose: "bg-rose",
  neutral: "bg-ink-3",
  info: "bg-info",
  violet: "bg-violet",
  cta: "bg-cta",
};

/** Text colour only. `cta` maps to ink because yellow text on white is illegible. */
export const toneText: Record<StatusTone, string> = {
  jade: "text-jade",
  amber: "text-amber",
  rose: "text-rose",
  neutral: "text-ink-2",
  info: "text-info",
  violet: "text-violet",
  cta: "text-ink",
};

const JADE = [
  "passed", "pass", "approved", "acca approved", "paid", "resolved", "live", "verified",
  "completed", "complete", "published", "active", "present", "eligible", "on track",
  "registered", "confirmed", "joined", "offer accepted", "exempt", "exempted", "done",
  "submitted to acca", "reconciled", "matched", "healthy", "ready", "placed", "hired",
  "attended", "success", "sent", "delivered", "connected", "enabled",
  "answered", "graded", "returned", "improved", "accepted", "actioned", "issued", "mapped",
  "enforced", "processed", "decided", "results released", "read", "full", "offer",
];
const AMBER = [
  "due", "due soon", "pending", "in review", "under review", "scheduled", "estimated",
  "awaiting", "awaiting acca", "documents pending", "partially paid", "part paid",
  "onboarding", "results pending", "waiting", "needs review", "late", "late entry",
  "on hold", "borderline", "medium", "needs attention", "reattempt", "revision",
  "awaiting approval", "submitted for review", "unmatched", "partial", "offer made",
  "action needed", "expiring", "invited", "watch",
  "to grade", "attention", "investigating", "requested", "waiting on student",
  "changes requested", "outdated", "callback", "nearly ready",
];
const ROSE = [
  "failed", "fail", "overdue", "escalated", "at risk", "rejected", "absent", "inactive",
  "cancelled", "canceled", "blocked", "missed", "suspended", "expired", "not eligible",
  "flagged", "high", "high risk", "critical", "declined", "breached", "withdrawn",
  "dropped", "unpaid", "error", "disconnected", "misconduct", "offer declined",
  "mismatch", "worsened", "denied", "not paid",
];
const NEUTRAL = [
  "draft", "not started", "archived", "closed", "planned", "unregistered", "none",
  "not claimed", "locked", "inactive user", "disabled", "low", "n/a", "not booked",
  "unbooked", "refunded", "alumni", "paused",
  "not registered", "not due", "not required", "not applicable", "entry not open",
  "no change", "conceptual only",
];
const INFO = [
  "in progress", "open", "booked", "enrolled", "shortlisted", "interviewing", "applied",
  "upcoming", "assigned", "queued", "processing", "refund initiated", "new", "screening",
  "interview scheduled", "in class", "running", "recording", "submitted", "current",
  "studying", "internship", "on demand",
  "ongoing", "today", "monitoring", "revised",
];
const VIOLET = ["ai draft", "assistant", "ai reviewed", "ai"];

/** Lower-cased status → tone. Extend by passing `tone` to `StatusPill`. */
export const STATUS_TONES: Record<string, StatusTone> = Object.fromEntries([
  ...NEUTRAL.map((s) => [s, "neutral"] as const),
  ...INFO.map((s) => [s, "info"] as const),
  ...VIOLET.map((s) => [s, "violet"] as const),
  ...AMBER.map((s) => [s, "amber"] as const),
  ...JADE.map((s) => [s, "jade"] as const),
  ...ROSE.map((s) => [s, "rose"] as const),
]);

function normalise(status: string) {
  return status.trim().toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ");
}

/** Resolve a status string to a tone: exact match first, then keyword heuristics, else neutral. */
export function statusTone(status: string): StatusTone {
  const s = normalise(status);
  const exact = STATUS_TONES[s];
  if (exact) return exact;
  // A negated state ("Not verified") must not pick up the keyword it negates.
  if (s.startsWith("not ")) return "neutral";
  if (/fail|overdue|risk|reject|escalat|cancel|miss|block|expir|declin|unpaid/.test(s)) return "rose";
  if (/pending|due|review|estimat|await|schedul|partial|hold/.test(s)) return "amber";
  if (/pass|approv|paid|resolv|verif|complet|publish|confirm|exempt|eligib|regist/.test(s)) return "jade";
  if (/progress|open|book|enrol|shortlist|interview|applied|assign|upcoming/.test(s)) return "info";
  return "neutral";
}

/** Raw data values read as words: "results-pending" becomes "Results pending".
 *  Text that already has capitals, digits first or punctuation is shown as given. */
export function statusLabel(status: string): string {
  if (!/^[a-z][a-z0-9 _-]*$/.test(status)) return status;
  const words = status.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function StatusPill({
  status,
  tone,
  dot = true,
  size = "md",
  className,
  children,
}: {
  status: string;
  tone?: StatusTone;
  dot?: boolean;
  size?: "sm" | "md";
  className?: string;
  /** Optional visible text; `status` still drives the tone. Without it, `statusLabel(status)` shows. */
  children?: React.ReactNode;
}) {
  const t = tone ?? statusTone(status);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap",
        size === "sm" ? "px-2 py-px text-[11px]" : "px-2.5 py-0.5 text-[11.5px]",
        toneSoft[t],
        className,
      )}
    >
      {dot ? (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", t === "cta" ? "bg-cta-strong" : "bg-current")}
        />
      ) : null}
      <span className="truncate">{children ?? statusLabel(status)}</span>
    </span>
  );
}

export type RiskLevel = "low" | "medium" | "high";

const RISK: Record<RiskLevel, { tone: StatusTone; label: string; bars: number }> = {
  low: { tone: "jade", label: "Low risk", bars: 1 },
  medium: { tone: "amber", label: "Medium risk", bars: 2 },
  high: { tone: "rose", label: "High risk", bars: 3 },
};

export function RiskBadge({
  level,
  label,
  className,
}: {
  level: RiskLevel | Capitalize<RiskLevel>;
  label?: string;
  className?: string;
}) {
  const key = level.toLowerCase() as RiskLevel;
  const r = RISK[key] ?? RISK.low;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold whitespace-nowrap",
        toneSoft[r.tone],
        className,
      )}
    >
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full",
              i === 1 ? "h-1.5" : i === 2 ? "h-2" : "h-2.5",
              i <= r.bars ? "bg-current" : "bg-current opacity-25",
            )}
          />
        ))}
      </span>
      {label ?? r.label}
    </span>
  );
}
