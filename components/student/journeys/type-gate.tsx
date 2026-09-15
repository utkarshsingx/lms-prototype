"use client";

import { ArrowLeftRight, Building2, GraduationCap } from "lucide-react";
import { studentPersonaFor, useRole, useSwitchPersona, type StudentType } from "@/lib/role";
import { Button, LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";

const COPY: Record<StudentType, { title: string; who: string; features: string }> = {
  graduate: {
    title: "This page is for graduate learners",
    who: "graduate ACCA learners",
    features: "Exemptions, the completion plan, batch selection and the career-transition roadmap follow the graduate route.",
  },
  undergraduate: {
    title: "This page is for university undergraduates",
    who: "university-integrated undergraduates",
    features: "University identity, the semester roadmap and the cohort leaderboard follow a partner university's B.Com timetable.",
  },
};

/**
 * Student-type gate (bible section 3). Renders children for the matching student type;
 * otherwise a friendly notice with a button that switches to the demo student of that type.
 */
export function StudentTypeGate({
  type,
  children,
  eyebrow,
  title,
}: {
  type: StudentType;
  children: React.ReactNode;
  /** Page header shown above the notice, so the page still reads as itself. */
  eyebrow?: string;
  title?: string;
}) {
  const { studentType, persona } = useRole();
  const switchPersona = useSwitchPersona();
  if (studentType === type) return <>{children}</>;

  const target = studentPersonaFor(type);
  const copy = COPY[type];
  const Icon = type === "graduate" ? GraduationCap : Building2;

  return (
    <div className="mx-auto max-w-[86rem] space-y-7">
      {title ? <PageHeader eyebrow={eyebrow} title={title} /> : null}
      <section
        aria-labelledby="type-gate-title"
        className="grid place-items-center rounded-[var(--radius-lg)] border border-dashed border-line-strong bg-surface px-5 py-12 text-center sm:px-8"
      >
        <span className="grid size-14 place-items-center rounded-full bg-surface-inv text-cta">
          <Icon aria-hidden className="size-6" strokeWidth={2.2} />
        </span>
        <h2 id="type-gate-title" className="mt-4 font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
          {copy.title}
        </h2>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-ink-2">
          You are signed in as {persona.name}. This page is part of the journey for {copy.who}. {copy.features}
        </p>
        <p className="mt-1.5 max-w-md text-[13px] text-ink-3">
          Switch to {target.name} ({target.title}) to see it with sample data.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
          <Button onClick={() => switchPersona(target.id, "stay")}>
            <ArrowLeftRight aria-hidden className="size-4" />
            Switch to {target.name}
          </Button>
          <LinkButton href="/dashboard" variant="outline">
            Back to dashboard
          </LinkButton>
        </div>
      </section>
    </div>
  );
}
