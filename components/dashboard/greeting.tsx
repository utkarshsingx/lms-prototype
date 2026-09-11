"use client";

import { useSyncExternalStore } from "react";

/* The home page is prerendered, so a greeting computed on the server freezes
   at build time: a link opened next week would still say "Friday 11 September,
   good morning". Read the clock in the viewer's browser instead. */
const subscribe = () => () => {};

function readClock() {
  const d = new Date();
  const h = d.getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const date = d.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  // A string snapshot compares by value, so this stays stable between renders.
  return `${date}|${part}`;
}

export function Greeting({ firstName }: { firstName: string }) {
  const clock = useSyncExternalStore(subscribe, readClock, () => null);
  const [date, part] = clock ? clock.split("|") : [null, "Welcome back"];
  return (
    <div>
      <p className="min-h-[1.2em] text-[12px] font-medium tracking-[0.02em] text-ink-3">
        {date}
      </p>
      <h1 className="mt-1.5 font-display text-[clamp(1.8rem,1.4rem+1.4vw,2.5rem)] leading-[1.05] tracking-[var(--display-tracking)] text-ink">
        {part}, {firstName}
      </h1>
    </div>
  );
}
