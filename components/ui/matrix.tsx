import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export type MatrixRow = { id: string; label: React.ReactNode; sub?: React.ReactNode };
export type MatrixCol = { id: string; label: React.ReactNode; sub?: React.ReactNode };

/** Rows × columns grid with a sticky first column, e.g. roles × permissions or subjects × syllabus areas. */
export function Matrix({
  rows,
  cols,
  cell,
  corner,
  caption,
  dense = false,
  maxHeight,
  className,
}: {
  rows: MatrixRow[];
  cols: MatrixCol[];
  cell: (rowId: string, colId: string) => React.ReactNode;
  /** Header text above the first column. */
  corner?: React.ReactNode;
  caption?: string;
  dense?: boolean;
  /** Set to make the header row stick while the body scrolls. */
  maxHeight?: string;
  className?: string;
}) {
  const pad = dense ? "px-2.5 py-2" : "px-3.5 py-3";
  return (
    <div
      className={cn(
        "scrollbar-slim min-w-0 overflow-auto overscroll-x-contain rounded-[var(--radius-lg)] border border-line bg-surface",
        className,
      )}
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            <th
              scope="col"
              className={cn(
                "sticky top-0 left-0 z-20 min-w-44 bg-surface-2 text-left text-[11px] font-bold tracking-[0.08em] text-ink-2 uppercase shadow-[inset_-1px_-1px_0_var(--line)] sm:min-w-56",
                pad,
              )}
            >
              {corner}
            </th>
            {cols.map((c) => (
              <th
                key={c.id}
                scope="col"
                className={cn(
                  "sticky top-0 z-10 min-w-24 bg-surface-2 text-center align-bottom shadow-[inset_0_-1px_0_var(--line)]",
                  pad,
                )}
              >
                <span className="block text-[11.5px] leading-tight font-bold whitespace-nowrap text-ink">{c.label}</span>
                {c.sub ? <span className="mt-0.5 block text-[11px] font-medium whitespace-nowrap text-ink-3">{c.sub}</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="group">
              <th
                scope="row"
                className={cn(
                  "sticky left-0 z-[5] bg-surface text-left font-normal shadow-[inset_-1px_-1px_0_var(--line)] transition-colors group-hover:bg-cta-soft",
                  pad,
                )}
              >
                <span className="block text-[13px] leading-snug font-semibold text-ink">{r.label}</span>
                {r.sub ? <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">{r.sub}</span> : null}
              </th>
              {cols.map((c) => (
                <td
                  key={c.id}
                  className={cn(
                    "border-b border-line text-center align-middle transition-colors group-hover:bg-cta-soft",
                    pad,
                  )}
                >
                  {cell(r.id, c.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Toggle cell for permission and mapping grids. Without `onChange` it renders a static mark.
 * `disabled` + `disabledReason` for view-only personas.
 */
export function MatrixCheck({
  checked,
  onChange,
  label,
  disabled,
  disabledReason,
}: {
  checked: boolean;
  onChange?: (next: boolean) => void;
  /** Accessible name, e.g. "Programme Admin: finance:view". */
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const mark = (
    <span
      className={cn(
        "grid size-6 place-items-center rounded-[7px] border transition-colors",
        checked ? "border-ink bg-surface-inv text-cta" : "border-line-strong bg-surface text-ink-3",
      )}
    >
      {checked ? <Check className="size-3.5" strokeWidth={3} /> : <Minus className="size-3" strokeWidth={2.4} />}
    </span>
  );
  if (!onChange) {
    return (
      <span role="img" aria-label={`${label}: ${checked ? "yes" : "no"}`} className="inline-grid place-items-center">
        {mark}
      </span>
    );
  }
  // The tooltip sits on a wrapper: a disabled button swallows hover in some browsers.
  return (
    <span title={disabled ? disabledReason : undefined} className="inline-grid">
      <button
        type="button"
        aria-pressed={checked}
        aria-label={disabled && disabledReason ? `${label}. ${disabledReason}` : label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="inline-grid place-items-center rounded-[8px] p-0.5 transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
      >
        {mark}
      </button>
    </span>
  );
}
