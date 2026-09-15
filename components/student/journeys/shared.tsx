"use client";

import { studentById, type Student, type University } from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { cn } from "@/lib/cn";

/** The signed-in student's full record. Falls back to Anaya outside the student role. */
export function useStudentRecord(): Student {
  const { student } = useRole();
  return studentById(student?.id) ?? studentById("s-anaya")!;
}

/** Logo initials on the university's own brand colour (data-driven swatch). */
export function UniversityMark({
  university,
  size = "md",
  className,
}: {
  university: University;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const box = { sm: "size-9 text-[12px]", md: "size-12 text-[15px]", lg: "size-16 text-[20px]" }[size];
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center rounded-[var(--radius-md)] font-display font-bold tracking-[-0.02em] text-ink-inv ring-2 ring-ink-inv/25",
        box,
        className,
      )}
      style={{ backgroundColor: university.branding.primary }}
    >
      {university.branding.logoInitials}
    </span>
  );
}

/** Uppercase 11px label used above groups inside cards. */
export function MicroLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase", className)}>{children}</p>;
}

export function pluralise(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}
