"use client";

import { useSyncExternalStore } from "react";

/* The demo world is fixed at Monday 14 September 2026, so the date line never
   moves. Only the part of the day follows the viewer's clock, read in the
   browser because the page is prerendered. */
export const DEMO_DATE = "Monday 14 September";

const subscribe = () => () => {};

function readPartOfDay() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

/** "Good morning" in the browser, "Welcome back" on the server render. */
export function usePartOfDay() {
  return useSyncExternalStore(subscribe, readPartOfDay, () => "Welcome back");
}

export function Greeting({ firstName }: { firstName: string }) {
  const part = usePartOfDay();
  return (
    <div>
      <p className="min-h-[1.2em] text-[12px] font-medium tracking-[0.02em] text-ink-3">
        {DEMO_DATE}
      </p>
      <h1 className="mt-1.5 font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
        {part}, {firstName}
      </h1>
    </div>
  );
}
