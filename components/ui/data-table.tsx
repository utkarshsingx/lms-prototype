"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown, Inbox, Search, X } from "lucide-react";
import { cn } from "@/lib/cn";

export type SortDirection = "asc" | "desc";
type SortPrimitive = string | number | boolean | Date | null | undefined;

export type DataTableColumn<T> = {
  key: string;
  header: React.ReactNode;
  /** Cell content. Defaults to `row[key]`. */
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  /** Value used for sorting. Defaults to `row[key]`. */
  sortValue?: (row: T) => SortPrimitive;
  align?: "left" | "center" | "right";
  /** Applied to both the header and body cells of this column. */
  className?: string;
  /** Set the cell in JetBrains Mono (IDs, codes, figures). */
  mono?: boolean;
  /** Allow the cell to wrap. Cells stay on one line by default and the table scrolls. */
  wrap?: boolean;
};

export type DataTableProps<T> = {
  rows: readonly T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** `match` receives the query trimmed and lower-cased. */
  search?: { placeholder: string; match: (row: T, q: string) => boolean };
  /** FilterSelect controls, shown next to the search box. Filter `rows` yourself. */
  filters?: React.ReactNode;
  /** Right-aligned actions in the toolbar (Export, Add). */
  toolbar?: React.ReactNode;
  selectable?: boolean;
  /** Rendered in the bar that appears while rows are selected. */
  bulkActions?: (selectedIds: string[], clearSelection: () => void) => React.ReactNode;
  onRowClick?: (row: T) => void;
  /** Accessible label for a clickable row, e.g. (row) => `Open ${row.name}`. */
  rowLabel?: (row: T) => string;
  pageSize?: number;
  /** Shown when `rows` is empty (not when a search has no matches). */
  empty?: React.ReactNode;
  dense?: boolean;
  initialSort?: { key: string; dir: SortDirection };
  rowClassName?: (row: T) => string | undefined;
  /** Accessible name for the table. */
  caption?: string;
  /** Drop the outer border and radius when the table already sits inside a Card. */
  bare?: boolean;
  /** CSS max-height of the scroll area; the header sticks inside it. Pass "none" to let the table grow. */
  maxHeight?: string;
  className?: string;
};

function readKey<T>(row: T, key: string): unknown {
  return row != null && typeof row === "object" ? (row as Record<string, unknown>)[key] : undefined;
}

/** Compares two non-blank sort values. */
function compare(a: SortPrimitive, b: SortPrimitive): number {
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), "en", { numeric: true, sensitivity: "base" });
}

const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role=menu],[role=menuitem],[data-row-click-ignore]";

export function DataTable<T>({
  rows,
  columns,
  getRowId,
  search,
  filters,
  toolbar,
  selectable = false,
  bulkActions,
  onRowClick,
  rowLabel,
  pageSize = 10,
  empty,
  dense = false,
  initialSort,
  rowClassName,
  caption,
  bare = false,
  maxHeight = "min(75vh, 48rem)",
  className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: SortDirection } | null>(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  // Back to page 1 when outside filters change the row count. Keyed on length, not
  // identity, so callers may pass a freshly filtered array on every render.
  const [seenCount, setSeenCount] = useState(rows.length);
  if (seenCount !== rows.length) {
    setSeenCount(rows.length);
    setPage(0);
  }

  const q = query.trim().toLowerCase();

  const filtered = useMemo(
    () => (search && q ? rows.filter((r) => search.match(r, q)) : rows),
    [rows, search, q],
  );

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const value = (r: T) => (col.sortValue ? col.sortValue(r) : (readKey(r, col.key) as SortPrimitive));
    const factor = sort.dir === "asc" ? 1 : -1;
    // Stable: ties keep their incoming order.
    return filtered
      .map((row, i) => ({ row, i, v: value(row) }))
      .sort((a, b) => {
        const nullA = a.v == null || a.v === "";
        const nullB = b.v == null || b.v === "";
        // Blanks sink to the bottom in both directions.
        if (nullA !== nullB) return nullA ? 1 : -1;
        return compare(a.v, b.v) * factor || a.i - b.i;
      })
      .map((x) => x.row);
  }, [filtered, sort, columns]);

  const size = Math.max(1, pageSize);
  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(page, pageCount - 1);
  const start = current * size;
  const visible = sorted.slice(start, start + size);

  const allIds = useMemo(() => new Set(rows.map(getRowId)), [rows, getRowId]);
  // Selection survives filtering and paging, but never points at a row that no longer exists.
  const selectedIds = useMemo(() => [...selected].filter((id) => allIds.has(id)), [selected, allIds]);
  const pageIds = visible.map(getRowId);
  const pageSelected = pageIds.filter((id) => selected.has(id)).length;
  const allPageSelected = pageIds.length > 0 && pageSelected === pageIds.length;

  const clearSelection = () => setSelected(new Set());
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  const selectAllFiltered = () => setSelected(new Set(sorted.map(getRowId)));

  const cycleSort = (key: string) => {
    setPage(0);
    setSort((s) => {
      if (!s || s.key !== key) return { key, dir: "asc" };
      if (s.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  const colCount = columns.length + (selectable ? 1 : 0);
  const cellPad = dense ? "px-3 py-2" : "px-4 py-3";
  const alignClass = (a?: DataTableColumn<T>["align"]) =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  const hasToolbar = Boolean(search || filters || toolbar);
  const showBulk = selectable && selectedIds.length > 0;

  return (
    <div
      className={cn(
        "min-w-0",
        !bare && "overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface",
        className,
      )}
    >
      {hasToolbar ? (
        <div className={cn("flex flex-wrap items-center gap-2.5 border-b border-line", bare ? "pb-3" : "px-4 py-3")}>
          {search ? (
            <div className="relative w-full min-w-0 sm:w-64">
              <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder={search.placeholder}
                aria-label={search.placeholder}
                className="h-9 w-full rounded-[12px] border border-line bg-surface pr-8 pl-9 text-[13px] text-ink placeholder:text-ink-3 transition-[border-color,box-shadow] hover:border-line-strong focus:border-ink focus:shadow-[0_0_0_3px_var(--ring)] focus:outline-none [&::-webkit-search-cancel-button]:hidden"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(0);
                  }}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
          {filters ? <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div> : null}
          {toolbar ? <div className="ml-auto flex flex-wrap items-center gap-2">{toolbar}</div> : null}
        </div>
      ) : null}

      {showBulk ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className={cn(
            "flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line bg-surface-inv text-ink-inv",
            dense ? "px-3 py-2" : "px-4 py-2.5",
          )}
        >
          <span className="text-[13px] font-semibold tnum">
            <span className="text-cta">{selectedIds.length}</span> selected
          </span>
          {selectedIds.length < total ? (
            <button
              type="button"
              onClick={selectAllFiltered}
              className="text-[12.5px] font-medium text-ink-inv/80 underline decoration-cta underline-offset-4 hover:text-ink-inv"
            >
              Select all {total}
            </button>
          ) : null}
          <button
            type="button"
            onClick={clearSelection}
            className="text-[12.5px] font-medium text-ink-inv/80 underline decoration-ink-inv/40 underline-offset-4 hover:text-ink-inv"
          >
            Clear
          </button>
          {bulkActions ? (
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              {bulkActions(selectedIds, clearSelection)}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="scrollbar-slim relative overflow-auto overscroll-x-contain" style={{ maxHeight }}>
        <table className="w-full min-w-full border-separate border-spacing-0 text-[13px]">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead>
            <tr>
              {selectable ? (
                <th
                  scope="col"
                  className={cn(
                    "sticky top-0 z-10 w-10 bg-surface-2 shadow-[inset_0_-1px_0_var(--line)]",
                    dense ? "px-3 py-2" : "px-4 py-2.5",
                  )}
                >
                  <input
                    type="checkbox"
                    aria-label={allPageSelected ? "Deselect rows on this page" : "Select rows on this page"}
                    checked={allPageSelected}
                    disabled={pageIds.length === 0}
                    ref={(el) => {
                      if (el) el.indeterminate = pageSelected > 0 && !allPageSelected;
                    }}
                    onChange={togglePage}
                    className="size-4 cursor-pointer align-middle accent-ink"
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const active = sort?.key === col.key;
                const ariaSort = col.sortable
                  ? active
                    ? sort!.dir === "asc"
                      ? "ascending"
                      : "descending"
                    : "none"
                  : undefined;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      "sticky top-0 z-10 bg-surface-2 text-[11px] font-bold tracking-[0.08em] whitespace-nowrap text-ink-2 uppercase shadow-[inset_0_-1px_0_var(--line)]",
                      dense ? "px-3 py-2" : "px-4 py-2.5",
                      alignClass(col.align),
                      col.className,
                    )}
                  >
                    {col.sortable ? (
                      <button
                        type="button"
                        onClick={() => cycleSort(col.key)}
                        className={cn(
                          "group inline-flex items-center gap-1 rounded-md uppercase transition-colors hover:text-ink",
                          col.align === "right" && "flex-row-reverse",
                          active && "text-ink",
                        )}
                      >
                        {col.header}
                        <span aria-hidden className={cn("grid size-4 place-items-center", active ? "text-ink" : "text-ink-3 group-hover:text-ink-2")}>
                          {active ? (
                            sort!.dir === "asc" ? (
                              <ArrowUp className="size-3.5" strokeWidth={2.4} />
                            ) : (
                              <ArrowDown className="size-3.5" strokeWidth={2.4} />
                            )
                          ) : (
                            <ChevronsUpDown className="size-3.5" />
                          )}
                        </span>
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-12">
                  {rows.length === 0 ? (
                    (empty ?? (
                      <div className="grid place-items-center text-center">
                        <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-3">
                          <Inbox aria-hidden className="size-5" />
                        </span>
                        <p className="mt-3 text-[14px] font-semibold text-ink">Nothing here yet</p>
                        <p className="mt-1 text-[13px] text-ink-3">Records will appear as soon as they are added.</p>
                      </div>
                    ))
                  ) : (
                    <div className="grid place-items-center text-center">
                      <span className="grid size-10 place-items-center rounded-full bg-surface-2 text-ink-3">
                        <Search aria-hidden className="size-5" />
                      </span>
                      <p className="mt-3 text-[14px] font-semibold text-ink">
                        {q ? <>No results for &ldquo;{query.trim()}&rdquo;</> : "No rows match these filters"}
                      </p>
                      <p className="mt-1 text-[13px] text-ink-3">Try a different search or clear the filters.</p>
                      {q ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery("");
                            setPage(0);
                          }}
                          className="mt-3 text-[13px] font-semibold text-ink underline decoration-cta decoration-2 underline-offset-4"
                        >
                          Clear search
                        </button>
                      ) : null}
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              visible.map((row, i) => {
                const id = getRowId(row);
                const isSelected = selected.has(id);
                const clickable = Boolean(onRowClick);
                return (
                  <tr
                    key={id}
                    tabIndex={clickable ? 0 : undefined}
                    aria-label={clickable && rowLabel ? rowLabel(row) : undefined}
                    onClick={
                      clickable
                        ? (e) => {
                            const target = e.target as HTMLElement;
                            const hit = target.closest(INTERACTIVE);
                            if (hit && e.currentTarget.contains(hit)) return;
                            onRowClick!(row);
                          }
                        : undefined
                    }
                    onKeyDown={
                      clickable
                        ? (e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick!(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "transition-colors duration-100",
                      isSelected ? "bg-cta-soft" : "hover:bg-cta-soft",
                      clickable && "cursor-pointer focus-visible:bg-cta-soft focus-visible:outline-offset-[-2px]",
                      rowClassName?.(row),
                    )}
                  >
                    {selectable ? (
                      <td className={cn("w-10 border-b border-line align-middle", cellPad)} data-row-click-ignore>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${start + i + 1}`}
                          checked={isSelected}
                          onChange={() => toggle(id)}
                          className="size-4 cursor-pointer align-middle accent-ink"
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => {
                      const content = col.render ? col.render(row, start + i) : (readKey(row, col.key) as React.ReactNode);
                      return (
                        <td
                          key={col.key}
                          className={cn(
                            "border-b border-line align-middle text-ink",
                            cellPad,
                            col.wrap ? "min-w-48" : "whitespace-nowrap",
                            col.mono && "font-mono text-[12px] text-ink-2 tnum",
                            alignClass(col.align),
                            col.align === "right" && "tnum",
                            col.className,
                          )}
                        >
                          {content ?? <span className="text-ink-3">·</span>}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-3 text-[12.5px] text-ink-3",
          bare ? "pt-3" : "border-t border-line px-4 py-2.5",
        )}
      >
        <p aria-live="polite" className="tnum">
          {total === 0 ? (
            "0 of 0"
          ) : (
            <>
              <span className="font-semibold text-ink">
                {start + 1}–{Math.min(start + size, total)}
              </span>{" "}
              of <span className="font-semibold text-ink">{total}</span>
              {q || rows.length !== total ? <span> (filtered from {rows.length})</span> : null}
            </>
          )}
        </p>
        {pageCount > 1 ? (
          <nav aria-label="Pagination" className="flex items-center gap-1.5">
            <span className="mr-1 hidden tnum sm:inline">
              Page {current + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.max(0, current - 1))}
              disabled={current === 0}
              aria-label="Previous page"
              className="grid size-8 place-items-center rounded-[10px] border border-line bg-surface text-ink transition-colors hover:border-ink hover:bg-cta-soft disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount - 1, current + 1))}
              disabled={current >= pageCount - 1}
              aria-label="Next page"
              className="grid size-8 place-items-center rounded-[10px] border border-line bg-surface text-ink transition-colors hover:border-ink hover:bg-cta-soft disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="size-4" />
            </button>
          </nav>
        ) : null}
      </div>
    </div>
  );
}
