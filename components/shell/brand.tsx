import Link from "next/link";
import { cn } from "@/lib/cn";

/** The mark: three rising bars, the three ACCA levels climbing to Strategic
 *  Professional. Yellow fill with dark ink, never yellow on white. */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[10px] bg-cta text-cta-ink",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <g fill="currentColor">
          <rect x="4" y="13" width="4" height="7" rx="1.2" />
          <rect x="10" y="8.5" width="4" height="11.5" rx="1.2" />
          <rect x="16" y="4" width="4" height="16" rx="1.2" />
        </g>
      </svg>
    </span>
  );
}

export function Wordmark({
  href = "/",
  className,
  inverse = false,
  onNavigate,
}: {
  href?: string;
  className?: string;
  /** For black panels: white name, muted line. */
  inverse?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-label="ACCA LMS, powered by ZSkillup"
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Mark className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-[16px] font-extrabold tracking-[-0.03em]",
            inverse ? "text-ink-inv" : "text-ink",
          )}
        >
          ACCA LMS
        </span>
        <span
          className={cn(
            "mt-1 text-[10px] font-semibold tracking-[0.08em] uppercase",
            inverse ? "text-ink-inv/60" : "text-ink-3",
          )}
        >
          Powered by ZSkillup
        </span>
      </span>
    </Link>
  );
}
