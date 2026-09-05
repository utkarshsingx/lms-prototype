import Link from "next/link";
import { cn } from "@/lib/cn";

/** The mark: three stacked rules that shorten, like a path narrowing to a point. */
export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-[9px] bg-surface-inv text-ink-inv",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
        <g fill="currentColor">
          <rect x="4" y="5" width="16" height="2.6" rx="1.3" />
          <rect x="4" y="10.7" width="11" height="2.6" rx="1.3" opacity="0.72" />
          <rect x="4" y="16.4" width="6" height="2.6" rx="1.3" opacity="0.45" />
        </g>
      </svg>
    </span>
  );
}

export function Wordmark({
  href = "/dashboard",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-2.5", className)}
    >
      <Mark className="transition-transform duration-300 ease-[var(--ease-spring)] group-hover:-rotate-6" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-ink">
          Meridian
        </span>
        <span className="mt-0.5 text-[10px] tracking-[0.14em] text-ink-3 uppercase">
          Northwind
        </span>
      </span>
    </Link>
  );
}
