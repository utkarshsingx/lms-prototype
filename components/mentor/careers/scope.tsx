"use client";

import { useMemo } from "react";
import { ArrowRightLeft, BadgeCheck, Eye, Users } from "lucide-react";
import { placementEligibleStudents, studentsForMentor, type Student } from "@/lib/data/acca";
import { useRole, useSwitchPersona } from "@/lib/role";
import { Button } from "@/components/ui/button";
import { ScopeChip, ViewOnlyChip } from "@/components/ui/page-toolbar";

export const READ_ONLY_REASON =
  "Read-only: career records are managed by the placement team. Ask a ZSkillup Super Admin for placement:manage.";

export type CareerScope = {
  /** placement:manage (Rahul Verma): may publish, shortlist, move stages and record feedback. */
  canEdit: boolean;
  /** Placement users see placement-eligible learners; mentors see their allocated students. */
  placement: boolean;
  staffId: string;
  personaName: string;
  students: Student[];
  ids: ReadonlySet<string>;
  label: string;
};

export function useCareerScope(): CareerScope {
  const { persona, can } = useRole();
  const canEdit = can("placement:manage");
  const placement = can("students:placement-eligible");
  const staffId = persona.staffId ?? "st-aisha";

  return useMemo(() => {
    const list = placement ? placementEligibleStudents() : studentsForMentor(staffId);
    return {
      canEdit,
      placement,
      staffId,
      personaName: persona.name,
      students: list,
      ids: new Set(list.map((s) => s.id)),
      label: placement
        ? `Showing ${list.length} placement-eligible learners`
        : `Showing your ${list.length} allocated students`,
    };
  }, [canEdit, placement, staffId, persona.name]);
}

/** Scope chip plus, for mentors without placement:manage, the view-only chip. */
export function CareerBadges({ scope }: { scope: CareerScope }) {
  return (
    <>
      <ScopeChip icon={scope.placement ? <BadgeCheck aria-hidden strokeWidth={2.2} /> : <Users aria-hidden strokeWidth={2.2} />}>
        {scope.label}
      </ScopeChip>
      {scope.canEdit ? null : <ViewOnlyChip reason={READ_ONLY_REASON} />}
    </>
  );
}

/**
 * One-line notice for mentors without placement:manage. The mentor role opens as Aisha Khan,
 * so the demo offers a switch to the Placement Lead instead of leaving every control disabled.
 */
export function ReadOnlyNotice({ scope, what }: { scope: CareerScope; what: string }) {
  const switchPersona = useSwitchPersona();
  if (scope.canEdit) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3">
      <p className="flex min-w-0 items-start gap-2.5 text-[13px] leading-snug text-ink-2">
        <Eye aria-hidden className="mt-0.5 size-4 shrink-0 text-amber" strokeWidth={2.2} />
        <span className="min-w-0">
          <span className="font-semibold text-ink">View-only for {scope.personaName}.</span> {what} are managed by the placement
          team. Rahul Verma, Placement Lead, can edit them.
        </span>
      </p>
      <Button size="sm" variant="secondary" onClick={() => switchPersona("p-rahul", "stay")}>
        <ArrowRightLeft className="size-3.5" />
        Switch to Rahul Verma
      </Button>
    </div>
  );
}

/** Tooltip wrapper: a disabled Button ignores pointer events, so the title sits on a span. */
export function Guard({ allowed, reason = READ_ONLY_REASON, children }: { allowed: boolean; reason?: string; children: React.ReactNode }) {
  return (
    <span title={allowed ? undefined : reason} className="inline-flex">
      {children}
    </span>
  );
}
