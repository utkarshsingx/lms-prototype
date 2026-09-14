"use client";

import { Check, Palette, Type } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { ModeToggle, ThemeGallery } from "./theme-picker";

/**
 * The landing page's theme switcher. Picking here changes the entire product
 * (colour, typography and geometry) and the choice persists, so the app you
 * land in afterwards is the one you chose.
 */
export function ThemeSection() {
  const { theme, themes } = useTheme();

  return (
    <section id="themes" className="border-b border-line bg-surface-2">
      <div className="mx-auto max-w-[80rem] px-5 py-20 sm:px-8 sm:py-24">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
              <Palette className="size-3.5" />
              Themes
            </p>
            <h2 className="mt-3.5 font-display text-[clamp(2rem,1.5rem+2.2vw,3.2rem)] leading-[1.06] tracking-[var(--display-tracking)] text-ink">
              {themes.length} themes. One platform.
            </h2>
            <p className="mt-5 text-[15.5px] leading-relaxed text-ink-2">
              Each one changes the palette, the typefaces and the geometry, not
              just a hue. Pick one and every workspace follows, for all six
              logins. Your choice is remembered on this device.
            </p>
          </div>
          <ModeToggle />
        </div>

        <ThemeGallery className="mt-10" />

        {/* Live specimen: the type actually in use right now */}
        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-e1)] sm:p-8">
            <p className="inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
              <Type className="size-3.5" />
              Now set in {theme.faces.display} and {theme.faces.sans}
            </p>
            <p className="mt-5 font-display text-[clamp(2.2rem,1.6rem+2.6vw,3.6rem)] leading-[1.02] tracking-[var(--display-tracking)] text-ink">
              One paper at a time, all the way to SBR.
            </p>
            <p className="mt-5 max-w-xl text-[15px] leading-[1.7] text-ink-2">
              ACCA LMS plans each paper around the exam session a learner is
              booked into, checks readiness with timed mocks, and brings in
              their mentor the week they start to slip.
            </p>
            <pre className="mt-6 overflow-x-auto rounded-[var(--radius-md)] border border-line bg-surface-2 p-4 font-mono text-[12.5px] leading-relaxed text-ink-2">
{`// ${theme.faces.mono}
ACCA ID      4382917
FR           Dec 2026 · booked
Goodwill     5,200 + 1,100 - 4,800 = $1,500k`}
            </pre>
          </div>

          <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-e1)] sm:p-8">
            <p className="text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
              What a theme controls
            </p>
            <ul className="mt-4 space-y-3">
              {[
                ["Surfaces and ink", "Ground, panels, hairlines and four levels of text"],
                ["Call to action", "The primary button, the active navigation item and progress fills"],
                ["Semantic accents", "Success, live, caution, danger and assistant keep their meaning"],
                ["Typography", "Display, interface and monospace faces, plus display tracking"],
                ["Geometry", "Corner radius, from square to fully rounded"],
                ["Light and dark", "Every theme is drawn in both, not auto-inverted"],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-jade"
                    strokeWidth={2.5}
                  />
                  <span>
                    <span className="block text-[13.5px] font-semibold text-ink">
                      {t}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">
                      {d}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-2 border-t border-line pt-5">
              {(
                [
                  ["Ground", theme.light.paper, theme.dark.paper],
                  ["Ink", theme.light.ink, theme.dark.ink],
                  ["Action", theme.light.cta, theme.dark.cta],
                  ["Identity", theme.light.brand, theme.dark.brand],
                  ["Success", theme.light.jade, theme.dark.jade],
                  ["Danger", theme.light.rose, theme.dark.rose],
                ] as const
              ).map(([label, l, d]) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-[11.5px] text-ink-3">
                    {label}
                  </span>
                  <span
                    className="h-5 min-w-0 flex-1 rounded-[var(--radius-xs)] border border-line"
                    style={{ background: l }}
                  />
                  <span
                    className="h-5 min-w-0 flex-1 rounded-[var(--radius-xs)] border border-line"
                    style={{ background: d }}
                  />
                  <span className="w-20 shrink-0 text-right font-mono text-[10.5px] text-ink-3">
                    {l}
                  </span>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-ink-3">
                Light and dark values, side by side.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
