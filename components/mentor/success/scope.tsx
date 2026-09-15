"use client";

import { useMemo } from "react";
import { BadgeCheck, Users } from "lucide-react";
import {
  placementEligibleStudents,
  staffById,
  studentsForMentor,
  type Student,
} from "@/lib/data/acca";
import { useRole } from "@/lib/role";
import { ScopeChip } from "@/components/ui/page-toolbar";

export type MentorScope = {
  /** Placement users (p-rahul) see placement-eligible learners; mentors see their allocation. */
  placement: boolean;
  staffId: string;
  mentorName: string;
  firstName: string;
  students: Student[];
  ids: ReadonlySet<string>;
  label: string;
  capacity?: number;
};

/**
 * The learners the signed-in mentor persona may see. Every page on the student
 * success surface filters its records through `ids`.
 */
export function useMentorScope(): MentorScope {
  const { persona, can } = useRole();
  const placement = can("students:placement-eligible");
  const staffId = persona.staffId ?? "st-aisha";

  return useMemo(() => {
    const list = placement ? placementEligibleStudents() : studentsForMentor(staffId);
    const member = staffById(staffId);
    const firstName = persona.name.replace(/^(Dr|Prof\.)\s+/, "").split(" ")[0];
    return {
      placement,
      staffId,
      mentorName: persona.name,
      firstName,
      students: list,
      ids: new Set(list.map((s) => s.id)),
      label: placement
        ? `Showing ${list.length} placement-eligible learners`
        : `Showing your ${list.length} allocated students`,
      capacity: member?.allocation.capacity,
    };
  }, [placement, staffId, persona.name]);
}

export function MentorScopeChip({ scope }: { scope: MentorScope }) {
  return (
    <ScopeChip icon={scope.placement ? <BadgeCheck aria-hidden strokeWidth={2.2} /> : <Users aria-hidden strokeWidth={2.2} />}>
      {scope.label}
    </ScopeChip>
  );
}
