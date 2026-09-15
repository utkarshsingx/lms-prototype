import { ShieldCheck } from "lucide-react";
import { FINANCE_SCOPE_NOTE } from "@/lib/data/acca";

/** The finance scope line every Programme Admin finance page carries. */
export function FinanceScopeNote({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-lg)] border border-line bg-surface px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-inv text-cta">
        <ShieldCheck aria-hidden className="size-4" />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2">
        <span className="font-semibold text-ink">{FINANCE_SCOPE_NOTE}</span>
        {children ? <span className="mt-0.5 block text-ink-3">{children}</span> : null}
      </p>
    </div>
  );
}
