"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { toneFill, toneSoft, type StatusTone } from "./status";

export type CalendarEvent = {
  id: string;
  /** ISO date, "2026-09-14". */
  date: string;
  title: string;
  tone?: StatusTone;
  /** Short type label, e.g. "Live class", "Exam", "Entry deadline". */
  kind?: string;
  /** Optional time or range, e.g. "18:30 IST". */
  time?: string;
};

export type BlackoutRange = {
  /** ISO dates, inclusive. */
  start: string;
  end: string;
  label: string;
};

/** Demo "today" for the whole prototype. */
export const DEMO_TODAY = "2026-09-14";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKDAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/* Dates are handled as UTC calendar days so no timezone can shift them. */
function parts(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d: d || 1 };
}
function toIso(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(dt.getUTCDate()).padStart(2, "0")}`;
}
function addDays(iso: string, n: number) {
  const { y, m, d } = parts(iso);
  return toIso(y, m, d + n);
}
function addMonths(month: string, n: number) {
  const { y, m } = parts(month);
  return toIso(y, m + n, 1).slice(0, 7);
}
/** 0 = Monday. */
function weekday(iso: string) {
  const { y, m, d } = parts(iso);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}
function inRange(iso: string, r: BlackoutRange) {
  return iso >= r.start && iso <= r.end;
}

/** "Mon 14 Sep 2026" style labels without Intl, so server and client always agree. */
export function formatCalendarDate(iso: string, style: "short" | "long" | "day" = "short") {
  const { y, m, d } = parts(iso);
  const wd = weekday(iso);
  if (style === "long") return `${WEEKDAYS_LONG[wd]} ${d} ${MONTHS[m - 1]} ${y}`;
  if (style === "day") return `${WEEKDAYS[wd]} ${d} ${MONTHS_SHORT[m - 1]}`;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

export function formatRange(start: string, end: string) {
  const a = parts(start);
  const b = parts(end);
  if (a.y === b.y && a.m === b.m) return `${a.d} to ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS_SHORT[a.m - 1]} to ${b.d} ${MONTHS_SHORT[b.m - 1]} ${b.y}`;
  return `${formatCalendarDate(start)} to ${formatCalendarDate(end)}`;
}

const STRIPES =
  "bg-[repeating-linear-gradient(135deg,var(--rose-soft)_0_7px,transparent_7px_14px)]";

export function MonthCalendar({
  month,
  events,
  onSelectDay,
  selected: selectedProp,
  blackout = [],
  today = DEMO_TODAY,
  onMonthChange,
  maxPerDay = 3,
  className,
}: {
  /** "2026-09". Seeds the visible month; the header arrows move it. */
  month: string;
  events: CalendarEvent[];
  onSelectDay?: (date: string, events: CalendarEvent[]) => void;
  /** Controlled selected day (ISO). Omit to let the calendar track it. */
  selected?: string | null;
  blackout?: BlackoutRange[];
  today?: string;
  onMonthChange?: (month: string) => void;
  maxPerDay?: number;
  className?: string;
}) {
  const [seed, setSeed] = useState(month);
  const [view, setView] = useState(month);
  // Follow the prop when the parent changes it (React's "adjust state on prop change" pattern).
  if (seed !== month) {
    setSeed(month);
    setView(month);
  }
  const [innerSelected, setInnerSelected] = useState<string | null>(null);
  const selected = selectedProp !== undefined ? selectedProp : innerSelected;
  const [focusDate, setFocusDate] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const list = map.get(e.date);
      if (list) list.push(e);
      else map.set(e.date, [e]);
    }
    return map;
  }, [events]);

  const first = `${view}-01`;
  const gridStart = addDays(first, -weekday(first));
  const lastOfMonth = addDays(`${addMonths(view, 1)}-01`, -1);
  const weeks = Math.ceil((weekday(first) + parts(lastOfMonth).d) / 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const gridEnd = days[days.length - 1];
  const { y, m } = parts(first);

  const visibleBlackouts = blackout.filter((b) => b.start <= gridEnd && b.end >= gridStart);
  const blackoutFor = (iso: string) => blackout.find((b) => inRange(iso, b));

  const tabbable =
    focusDate && days.includes(focusDate)
      ? focusDate
      : selected && selected.startsWith(view)
        ? selected
        : today.startsWith(view)
          ? today
          : first;

  useEffect(() => {
    if (!pendingFocus.current) return;
    const el = gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${pendingFocus.current}"]`);
    pendingFocus.current = null;
    el?.focus();
  });

  const go = (next: string) => {
    setView(next);
    onMonthChange?.(next);
  };

  const select = (iso: string) => {
    if (selectedProp === undefined) setInnerSelected(iso);
    setFocusDate(iso);
    onSelectDay?.(iso, byDate.get(iso) ?? []);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const from = (e.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!from) return;
    const step: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let target: string | null = null;
    if (e.key in step) target = addDays(from, step[e.key]);
    else if (e.key === "Home") target = addDays(from, -weekday(from));
    else if (e.key === "End") target = addDays(from, 6 - weekday(from));
    if (!target) return;
    e.preventDefault();
    setFocusDate(target);
    if (!days.includes(target)) {
      pendingFocus.current = target;
      go(target.slice(0, 7));
    } else {
      gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus();
    }
  };

  return (
    <div className={cn("min-w-0 rounded-[var(--radius-lg)] border border-line bg-surface", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h3 aria-live="polite" className="font-display text-[18px] leading-none font-bold tracking-[-0.02em] text-ink">
          {MONTHS[m - 1]} {y}
        </h3>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go(today.slice(0, 7))}
            className="h-8 rounded-[10px] border border-line px-2.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink hover:bg-cta-soft"
          >
            Today
          </button>
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => go(addMonths(view, -1))}
            className="grid size-8 place-items-center rounded-[10px] border border-line text-ink transition-colors hover:border-ink hover:bg-cta-soft"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => go(addMonths(view, 1))}
            className="grid size-8 place-items-center rounded-[10px] border border-line text-ink transition-colors hover:border-ink hover:bg-cta-soft"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      <div className="scrollbar-slim overflow-x-auto">
        <div className="min-w-[20rem]">
          <div className="grid grid-cols-7 border-b border-line bg-surface-2" aria-hidden>
            {WEEKDAYS.map((w) => (
              <div key={w} className="px-2 py-2 text-center text-[10.5px] font-bold tracking-[0.1em] text-ink-3 uppercase sm:text-left">
                {w}
              </div>
            ))}
          </div>
          <div ref={gridRef} role="group" aria-label={`${MONTHS[m - 1]} ${y}`} onKeyDown={onKeyDown} className="grid grid-cols-7">
            {days.map((iso, i) => {
              const inMonth = iso.startsWith(view);
              const dayEvents = byDate.get(iso) ?? [];
              const bo = blackoutFor(iso);
              // Label the band where it starts and again at the start of each week row it spans.
              const boStart = bo && (iso === bo.start || weekday(iso) === 0);
              const isToday = iso === today;
              const isSelected = iso === selected;
              const shown = dayEvents.slice(0, maxPerDay);
              const more = dayEvents.length - shown.length;
              const label = [
                formatCalendarDate(iso, "long"),
                isToday ? "today" : null,
                dayEvents.length ? `${dayEvents.length} ${dayEvents.length === 1 ? "event" : "events"}: ${dayEvents.map((e) => e.title).join(", ")}` : "no events",
                bo ? `blackout: ${bo.label}` : null,
              ]
                .filter(Boolean)
                .join(", ");
              return (
                <button
                  key={iso}
                  type="button"
                  data-date={iso}
                  tabIndex={iso === tabbable ? 0 : -1}
                  aria-label={label}
                  aria-pressed={isSelected}
                  onClick={() => select(iso)}
                  className={cn(
                    "group relative flex min-h-16 flex-col items-stretch gap-1 border-line p-1.5 text-left align-top transition-colors sm:min-h-[6.5rem] sm:p-2",
                    i % 7 !== 6 && "border-r",
                    i < days.length - 7 && "border-b",
                    // One background-color utility per state (cn does not merge conflicts); stripes are an image layer on top.
                    isSelected
                      ? "bg-cta-soft shadow-[inset_0_0_0_2px_var(--cta)]"
                      : cn(inMonth ? "bg-surface" : "bg-surface-2/60", "hover:bg-cta-soft"),
                    bo && STRIPES,
                    "focus-visible:z-[1] focus-visible:outline-offset-[-2px]",
                  )}
                >
                  <span className="flex items-center gap-1">
                    <span
                      className={cn(
                        "grid size-6 place-items-center rounded-full text-[12px] font-semibold tnum",
                        isToday
                          ? "bg-surface-inv text-ink-inv"
                          : inMonth
                            ? "text-ink"
                            : "text-ink-3",
                      )}
                    >
                      {parts(iso).d}
                    </span>
                    {bo ? <Ban aria-hidden className="absolute top-1 right-1 size-3 text-rose sm:hidden" strokeWidth={2.4} /> : null}
                  </span>
                  {boStart ? (
                    <span className="hidden truncate rounded-md bg-rose-soft px-1.5 py-px text-[10.5px] font-bold text-rose sm:block">
                      {bo!.label}
                    </span>
                  ) : null}
                  {shown.length ? (
                    <>
                      <span className="flex flex-wrap gap-0.5 sm:hidden" aria-hidden>
                        {dayEvents.slice(0, 4).map((e) => (
                          <span key={e.id} className={cn("size-1.5 rounded-full", toneFill[e.tone ?? "info"])} />
                        ))}
                      </span>
                      <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden>
                        {shown.map((e) => (
                          <span
                            key={e.id}
                            className={cn(
                              "flex min-w-0 items-center gap-1 rounded-md border px-1.5 py-px text-[11px] leading-snug font-medium",
                              toneSoft[e.tone ?? "info"],
                            )}
                          >
                            <span className={cn("size-1.5 shrink-0 rounded-full", toneFill[e.tone ?? "info"])} />
                            <span className="truncate">{e.title}</span>
                          </span>
                        ))}
                        {more > 0 ? <span className="px-1 text-[10.5px] font-semibold text-ink-3">+{more} more</span> : null}
                      </span>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {visibleBlackouts.length ? (
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-2.5">
          {visibleBlackouts.map((b) => (
            <li key={`${b.start}-${b.label}`} className="flex min-w-0 items-center gap-2 text-[12px] text-ink-2">
              <span aria-hidden className={cn("size-3.5 shrink-0 rounded-[4px] border border-rose/40", STRIPES)} />
              <span className="font-semibold text-ink">Blackout</span>
              <span className="min-w-0 truncate">
                {b.label} · {formatRange(b.start, b.end)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AgendaList({
  events,
  blackout = [],
  day,
  from,
  to,
  limit,
  onSelect,
  empty = "Nothing scheduled.",
  blackoutNote = "No ACCA mocks or live classes are scheduled.",
  today = DEMO_TODAY,
  className,
}: {
  events: CalendarEvent[];
  /** Blackout ranges that overlap the listed dates are shown as warning rows. */
  blackout?: BlackoutRange[];
  /** Only this ISO day (pairs with MonthCalendar's onSelectDay). */
  day?: string | null;
  /** Only events on or after this ISO day. */
  from?: string;
  /** Only events on or before this ISO day ("2026-11-31" works as a month end). */
  to?: string;
  limit?: number;
  onSelect?: (event: CalendarEvent) => void;
  empty?: React.ReactNode;
  /** Sentence under each blackout row. */
  blackoutNote?: string;
  today?: string;
  className?: string;
}) {
  const list = events
    .filter((e) => (day ? e.date === day : true) && (from ? e.date >= from : true) && (to ? e.date <= to : true))
    .slice()
    .sort((a, b) => (a.date === b.date ? (a.time ?? "").localeCompare(b.time ?? "") : a.date < b.date ? -1 : 1))
    .slice(0, limit ?? Infinity);

  const groups: { date: string; items: CalendarEvent[] }[] = [];
  for (const e of list) {
    const g = groups[groups.length - 1];
    if (g && g.date === e.date) g.items.push(e);
    else groups.push({ date: e.date, items: [e] });
  }

  // The window a blackout must overlap to be shown: the chosen day, the from/to range, or the listed events.
  const lo = day ?? from ?? list[0]?.date;
  const hi = day ?? to ?? list[list.length - 1]?.date;
  const blackouts = lo && hi ? blackout.filter((b) => b.start <= hi && b.end >= lo) : [];

  if (groups.length === 0 && blackouts.length === 0) {
    return <p className={cn("py-6 text-center text-[13px] text-ink-3", className)}>{empty}</p>;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {blackouts.map((b) => (
        <div
          key={`${b.start}-${b.label}`}
          className={cn("flex items-start gap-3 rounded-[12px] border border-rose/30 p-3", STRIPES)}
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-rose text-on-accent">
            <Ban aria-hidden className="size-3.5" strokeWidth={2.6} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-ink">Examination blackout · {formatRange(b.start, b.end)}</p>
            <p className="text-[12.5px] text-ink-2">{b.label}. {blackoutNote}</p>
          </div>
        </div>
      ))}
      {groups.length === 0 ? <p className="text-[13px] text-ink-3">{empty}</p> : null}
      {groups.map((g) => (
        <section key={g.date} aria-label={formatCalendarDate(g.date, "long")}>
          <h4 className="mb-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
            {formatCalendarDate(g.date, "day")}
            {g.date === today ? <span className="ml-2 rounded-full bg-cta px-1.5 py-px text-cta-ink">Today</span> : null}
          </h4>
          <ul className="overflow-hidden rounded-[12px] border border-line bg-surface">
            {g.items.map((e) => {
              const inner = (
                <>
                  <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneFill[e.tone ?? "info"])} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-ink">{e.title}</span>
                    {e.kind || e.time ? (
                      <span className="mt-0.5 block text-[12px] text-ink-3">
                        {[e.time, e.kind].filter(Boolean).join(" · ")}
                      </span>
                    ) : null}
                  </span>
                  {blackout.some((b) => inRange(e.date, b)) ? (
                    <span className="shrink-0 rounded-full bg-rose-soft px-2 py-px text-[11px] font-semibold text-rose">
                      In blackout
                    </span>
                  ) : null}
                </>
              );
              return (
                <li key={e.id} className="border-b border-line last:border-0">
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(e)}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-cta-soft"
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="flex items-start gap-3 px-3 py-2.5">{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
