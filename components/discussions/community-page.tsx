"use client";

import { useState } from "react";
import { Building2, Globe2 } from "lucide-react";
import { cohortById, universityById, type Student } from "@/lib/data/acca";
import { cn } from "@/lib/cn";
import { useStudentRecord } from "@/components/student/help/shared";
import { CohortCommunity } from "./cohort-community";
import { Forum } from "./forum";

type Space = "all" | "cohort";

export function CommunityPage({ initialSpace }: { initialSpace?: string } = {}) {
  const s = useStudentRecord();
  return <CommunityView key={s.id} s={s} initialSpace={initialSpace === "cohort" ? "cohort" : "all"} />;
}

function CommunityView({ s, initialSpace }: { s: Student; initialSpace: Space }) {
  const uni = universityById(s.universityId);
  const universityCohort = s.cohortIds.map((id) => cohortById(id)).find((c) => c?.type === "university");
  const hasCohortSpace = s.type === "undergraduate" && Boolean(universityCohort);
  const [space, setSpace] = useState<Space>(initialSpace);

  const switcher = hasCohortSpace ? (
    <div role="tablist" aria-label="Community spaces" className="flex flex-wrap gap-2">
      {(
        [
          { id: "all", label: "All learners", sub: "Every ACCA learner and faculty", icon: Globe2 },
          { id: "cohort", label: "University cohort community", sub: universityCohort?.name ?? uni?.name ?? "", icon: Building2 },
        ] as const
      ).map((t) => {
        const active = space === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setSpace(t.id)}
            className={cn(
              "flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] border px-3.5 py-2.5 text-left transition-colors",
              active ? "border-transparent bg-nav-active text-nav-active-ink" : "border-line bg-surface text-ink hover:border-cta hover:bg-cta-soft",
            )}
          >
            <t.icon className={cn("size-4 shrink-0", active ? "text-nav-active-icon" : "text-ink-3")} />
            <span className="min-w-0">
              <span className="block text-[13.5px] font-bold">{t.label}</span>
              <span className={cn("block truncate text-[12px]", active ? "text-nav-active-ink/70" : "text-ink-3")}>{t.sub}</span>
            </span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      {space === "cohort" && hasCohortSpace ? <CohortCommunity s={s} switcher={switcher} /> : <Forum switcher={switcher} />}
    </div>
  );
}
