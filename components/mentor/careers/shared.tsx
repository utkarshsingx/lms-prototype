import {
  PAPER_CODES,
  PLACEMENT_STAGES,
  cohortById,
  papersCleared,
  type PaperCode,
  type PlacementStage,
  type Student,
} from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { KanbanColumn } from "@/components/ui/kanban";

export const SECTION = "Careers";

export const STAGE_COLUMNS: KanbanColumn[] = PLACEMENT_STAGES.map((s) => ({
  id: s.id,
  title: s.label,
  tone: s.tone,
  sub:
    s.id === "applied"
      ? "Awaiting shortlist"
      : s.id === "shortlisted"
        ? "Profile sent to recruiter"
        : s.id === "interview"
          ? "Recruiter rounds"
          : s.id === "offer"
            ? "Offer to joining"
            : s.id === "joined"
              ? "Placed"
              : "Closed with feedback",
}));

export function stageLabel(stage: PlacementStage) {
  return PLACEMENT_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

export const ROLE_TRACKS = [
  "Audit associate",
  "Financial reporting analyst",
  "FP&A analyst",
  "Management accountant",
  "Tax associate (UK tax)",
  "Assistant manager, financial reporting",
] as const;

export const CITIES = ["Bengaluru", "Hyderabad", "Mumbai", "Pune", "Chennai", "Kochi", "Gurugram", "Ahmedabad", "Kolkata", "Remote"];

export const SKILL_OPTIONS = [
  "IFRS reporting",
  "Consolidation",
  "Month-end close",
  "Reconciliations",
  "Excel (pivot tables, XLOOKUP)",
  "Power BI",
  "Tally ERP",
  "SAP FICO",
  "Audit documentation",
  "ISA fundamentals",
  "Variance analysis",
  "Budgeting and forecasting",
  "TX-UK computations",
  "Stakeholder communication",
];

export function firstName(name: string) {
  return name.replace(/^(Dr|Prof\.)\s+/, "").split(" ")[0];
}

export function typeLabel(type: Student["type"]) {
  return type === "graduate" ? "Graduate" : "Undergraduate";
}

export function TypeBadge({ type }: { type: Student["type"] }) {
  return <Badge tone={type === "graduate" ? "dark" : "info"}>{typeLabel(type)}</Badge>;
}

export function StudentCell({ student, sub, size = "sm" }: { student: Student; sub?: React.ReactNode; size?: "xs" | "sm" | "md" }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={student.name} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-semibold text-ink">{student.name}</span>
        {sub ? <span className="block truncate text-[12px] text-ink-3">{sub}</span> : null}
      </span>
    </span>
  );
}

export type ClearedPaper = { code: PaperCode; status: "passed" | "exempt"; score: number | null };

/** Papers passed or exempt, in syllabus order, with the passing score when there is one. */
export function clearedPapers(s: Student): ClearedPaper[] {
  return PAPER_CODES.flatMap((code) => {
    const p = s.papers[code];
    if (p.status !== "passed" && p.status !== "exempt") return [];
    const pass = [...p.attempts].reverse().find((a) => a.result === "passed");
    return [{ code, status: p.status, score: p.status === "passed" ? (pass?.score ?? null) : null }];
  });
}

export function papersSummary(s: Student) {
  return `${papersCleared(s)} of 13`;
}

export function primaryCohort(s: Student) {
  return cohortById(s.cohortIds[0])?.name ?? (s.enrolmentStatus === "completed" ? "Programme completed" : "No cohort");
}

export function formatLPA(n: number) {
  return `₹${Number.isInteger(n) ? n : n.toFixed(1)} LPA`;
}

export function ctcBand(lpa: number) {
  if (lpa < 5) return "Below ₹5 LPA";
  if (lpa < 7) return "₹5 to 7 LPA";
  if (lpa < 10) return "₹7 to 10 LPA";
  if (lpa < 15) return "₹10 to 15 LPA";
  return "₹15 LPA and above";
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function average(values: number[]) {
  return values.length ? Math.round(values.reduce((n, v) => n + v, 0) / values.length) : 0;
}

/** Uppercase section label used inside cards. */
export function MiniLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

/** A labelled figure used in detail panels. */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11.5px] font-semibold text-ink-3">{label}</dt>
      <dd className="mt-0.5 truncate text-[13.5px] font-semibold text-ink">{children}</dd>
    </div>
  );
}
