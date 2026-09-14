"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowRightLeft, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { toneFill, type StatusTone } from "./status";

export type KanbanColumn = {
  id: string;
  title: string;
  tone?: StatusTone;
  /** Small line under the title, e.g. "Offer to joining". */
  sub?: string;
};

type MenuPos = { top: number; left: number };
const MENU_WIDTH = 224;

function MoveMenu({
  columns,
  current,
  itemLabel,
  onMove,
}: {
  columns: KanbanColumn[];
  current: string;
  itemLabel: string;
  onMove: (to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<MenuPos | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const place = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const height = Math.min(columns.length * 38 + 44, 360);
    const below = r.bottom + 6 + height <= window.innerHeight;
    setPos({
      top: below ? r.bottom + 6 : Math.max(8, r.top - 6 - height),
      left: Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>("[role=menuitem]:not([aria-disabled=true])")?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t)) close();
    };
    // A fixed menu would drift from its button, so any outside scroll closes it.
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  const closeAndFocus = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]:not([aria-disabled=true])") ?? [],
    );
    const idx = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape" || e.key === "Tab") {
      e.preventDefault();
      closeAndFocus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Move ${itemLabel} to another stage`}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          place();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            place();
            setOpen(true);
          }
        }}
        className={cn(
          "inline-flex h-7 items-center gap-1.5 rounded-[9px] border px-2 text-[11.5px] font-semibold transition-colors",
          open
            ? "border-ink bg-surface-inv text-ink-inv"
            : "border-line bg-surface text-ink-2 hover:border-ink hover:bg-cta-soft hover:text-ink",
        )}
      >
        <ArrowRightLeft aria-hidden className="size-3.5" />
        Move to
      </button>
      {open && pos && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={`Move ${itemLabel} to`}
              onKeyDown={onMenuKey}
              style={{ top: pos.top, left: pos.left, width: MENU_WIDTH }}
              className="scrollbar-slim fixed z-[120] max-h-[360px] overflow-y-auto rounded-[14px] border border-line bg-surface p-1.5 shadow-[var(--shadow-e4)]"
            >
              <p className="px-2.5 pt-1.5 pb-1 text-[10.5px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                Move to
              </p>
              {columns.map((c) => {
                const here = c.id === current;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="menuitem"
                    aria-disabled={here || undefined}
                    tabIndex={-1}
                    onClick={() => {
                      if (here) return;
                      onMove(c.id);
                      closeAndFocus();
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[13px] outline-none",
                      here
                        ? "cursor-default text-ink-3"
                        : "font-medium text-ink hover:bg-cta-soft focus-visible:bg-cta-soft",
                    )}
                  >
                    <span aria-hidden className={cn("size-2 shrink-0 rounded-full", toneFill[c.tone ?? "neutral"])} />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    {here ? <Check aria-label="Current stage" className="size-3.5" /> : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function Kanban<T>({
  columns,
  items,
  getColumn,
  getId,
  getLabel,
  renderCard,
  onMove,
  emptyLabel = "Nothing in this stage",
  className,
}: {
  columns: KanbanColumn[];
  items: readonly T[];
  getColumn: (item: T) => string;
  /** Stable key per card. Strongly recommended when `onMove` is used. */
  getId?: (item: T) => string;
  /** Names the card for screen readers in the Move menu, e.g. the student's name. */
  getLabel?: (item: T) => string;
  renderCard: (item: T) => React.ReactNode;
  /** Omit for a read-only board (no Move menu). */
  onMove?: (item: T, toColumnId: string) => void;
  emptyLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "scrollbar-slim -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-3 sm:snap-none",
        className,
      )}
    >
      {columns.map((col) => {
        const colItems = items.filter((it) => getColumn(it) === col.id);
        return (
          <section
            key={col.id}
            aria-label={`${col.title}, ${colItems.length}`}
            className="flex w-[17.5rem] shrink-0 snap-start flex-col rounded-[var(--radius-lg)] border border-line bg-surface-2"
          >
            <header className="flex items-start justify-between gap-2 px-3.5 pt-3 pb-2.5">
              <div className="min-w-0">
                <h3 className="flex items-center gap-2 text-[13px] font-bold text-ink">
                  <span aria-hidden className={cn("size-2 shrink-0 rounded-full", toneFill[col.tone ?? "neutral"])} />
                  <span className="truncate">{col.title}</span>
                </h3>
                {col.sub ? <p className="mt-0.5 pl-4 text-[11.5px] text-ink-3">{col.sub}</p> : null}
              </div>
              <span className="shrink-0 rounded-full bg-surface-inv px-2 py-px text-[11px] font-bold text-ink-inv tnum">
                {colItems.length}
              </span>
            </header>
            <ul className="flex min-h-24 flex-1 flex-col gap-2 px-2 pb-2">
              {colItems.length === 0 ? (
                <li className="grid flex-1 place-items-center rounded-[12px] border border-dashed border-line-strong px-3 py-6 text-center text-[12px] text-ink-3">
                  {emptyLabel}
                </li>
              ) : (
                colItems.map((item, i) => (
                  <li
                    key={getId ? getId(item) : `${col.id}-${i}`}
                    className="rounded-[14px] border border-line bg-surface p-3 transition-colors hover:border-line-strong"
                  >
                    {renderCard(item)}
                    {onMove ? (
                      <div className="mt-2.5 flex justify-end border-t border-line pt-2.5">
                        <MoveMenu
                          columns={columns}
                          current={col.id}
                          itemLabel={getLabel ? getLabel(item) : "card"}
                          onMove={(to) => onMove(item, to)}
                        />
                      </div>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
