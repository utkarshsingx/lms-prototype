"use client";

import { usePathname } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { LinkButton } from "./button";

/** Plain-language names for the permission codes in the role model. */
export const PERMISSION_LABELS: Record<string, string> = {
  "platform:all": "Full platform administration",
  "programme:ops": "Programme operations",
  "programme:acca": "ACCA operations",
  "programme:universities": "University coordination",
  "programme:support": "Student support",
  "finance:view": "View fee status and payment plans",
  "finance:record": "Record payments, receipts and refunds",
  "university:edit": "Edit university records",
  "content:publish": "Publish content",
  "content:submit": "Submit content for review",
  "faculty:grade": "Grade and give feedback",
  "faculty:approve-reattempt": "Approve reattempts",
  "students:allocated": "Allocated students",
  "placement:manage": "Manage placements",
  "students:placement-eligible": "Placement-eligible learners",
};

const HOMES: [prefix: string, href: string, label: string][] = [
  ["/admin", "/admin", "Back to overview"],
  ["/programme", "/programme", "Back to dashboard"],
  ["/university", "/university", "Back to dashboard"],
  ["/faculty", "/faculty", "Back to dashboard"],
  ["/mentor", "/mentor", "Back to dashboard"],
];

function homeFor(pathname: string) {
  const hit = HOMES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`));
  return hit ? { href: hit[1], label: hit[2] } : { href: "/dashboard", label: "Back to dashboard" };
}

export function RestrictedNotice({
  permission,
  who = "Ask a ZSkillup Super Admin to update your role.",
  title = "You don't have access to this",
  homeHref,
  homeLabel,
  className,
}: {
  /** The missing permission code, e.g. "finance:view". */
  permission: string;
  who?: string;
  title?: string;
  /** Defaults to the home of the workspace the current path belongs to. */
  homeHref?: string;
  homeLabel?: string;
  className?: string;
}) {
  const pathname = usePathname() ?? "/";
  const home = homeFor(pathname);
  const label = PERMISSION_LABELS[permission];
  return (
    <section
      role="status"
      className={cn(
        "mx-auto grid max-w-xl place-items-center rounded-[var(--radius-xl)] border border-line bg-surface px-6 py-12 text-center sm:px-10",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-full bg-surface-inv text-cta">
        <Lock aria-hidden className="size-6" strokeWidth={2.2} />
      </span>
      <h2 className="mt-5 font-display text-[22px] leading-tight font-bold tracking-[-0.02em] text-ink">
        {title}
      </h2>
      <p className="mt-2.5 max-w-md text-[14px] leading-relaxed text-ink-2">
        This page needs the{" "}
        <code className="rounded-md border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[12.5px] text-ink">
          {permission}
        </code>{" "}
        permission{label ? <> ({label})</> : null}, which your role does not include.
      </p>
      <p className="mt-2 text-[13.5px] text-ink-3">{who}</p>
      <LinkButton href={homeHref ?? home.href} className="mt-6">
        <ArrowLeft aria-hidden className="size-4" strokeWidth={2.4} />
        {homeLabel ?? home.label}
      </LinkButton>
    </section>
  );
}
