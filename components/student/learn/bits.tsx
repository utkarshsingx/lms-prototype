"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEMO_GRADUATE_ID, studentById, type Student } from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";
import type { StatusTone } from "@/components/ui/status";

/** The signed-in student's full record. Student routes always resolve to a
    student persona; Anaya is the server-render default. */
export function useStudentRecord(): Student {
  const { student } = useRole();
  return studentById(student?.id) ?? studentById(DEMO_GRADUATE_ID)!;
}

/** Black paper code chip: "FR", "EPSM". */
export function PaperCodeChip({ code, className }: { code: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-grid h-6 min-w-9 shrink-0 place-items-center rounded-[7px] bg-surface-inv px-1.5 font-mono text-[11px] font-bold tracking-[0.02em] text-ink-inv",
        className,
      )}
    >
      {code}
    </span>
  );
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const tileTone: Partial<Record<StatusTone, string>> = {
  rose: "border-transparent bg-rose-soft text-rose",
  amber: "border-transparent bg-amber-soft text-amber",
  cta: "border-transparent bg-cta text-cta-ink",
};

/** Calendar date tile: day over month. `strong` renders the black identity tile. */
export function DateTile({ iso, strong, tone }: { iso: string; strong?: boolean; tone?: StatusTone }) {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return (
    <span
      className={cn(
        "grid w-11 shrink-0 place-items-center rounded-[10px] border py-1.5 leading-none",
        strong ? "border-transparent bg-surface-inv text-ink-inv" : (tone && tileTone[tone]) || "border-line bg-surface text-ink",
      )}
    >
      <span className="font-display text-[16px] font-bold tnum">{d}</span>
      <span className={cn("mt-1 text-[10px] font-bold tracking-[0.08em] uppercase", strong ? "text-cta" : "opacity-70")}>
        {MONTHS[m - 1]}
      </span>
    </span>
  );
}

/** Underlined text link with the gold decoration used across the prototype. */
export function TextLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4 hover:decoration-cta-strong",
        className,
      )}
    >
      {children}
      <ArrowRight aria-hidden className="size-3.5" />
    </Link>
  );
}

/** Small key/value row used inside summary cards. */
export function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-baseline justify-between gap-3 py-2">
      <dt className="shrink-0 text-[12.5px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-semibold text-ink">{children}</dd>
    </div>
  );
}
