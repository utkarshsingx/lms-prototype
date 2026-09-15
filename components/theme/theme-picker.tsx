"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/cn";
import { ThemePreview } from "./theme-preview";

/* ------------------------------------------------------------ mode toggle */

export function ModeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[var(--radius-pill)] border border-line bg-surface p-1",
        className,
      )}
    >
      {(
        [
          ["light", Sun, "Light"],
          ["dark", Moon, "Dark"],
        ] as const
      ).map(([m, Icon, label]) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          aria-pressed={mode === m}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-pill)] px-3 py-1.5 text-[12.5px] font-semibold transition-colors duration-150",
            mode === m
              ? "bg-nav-active text-nav-active-ink"
              : "text-ink-3 hover:bg-cta-soft hover:text-ink",
          )}
        >
          <Icon className="size-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- gallery */

/** The full picker: a card per theme, each rendered in its own palette and type. */
export function ThemeGallery({ className }: { className?: string }) {
  const { themes, themeId, setThemeId, mode } = useTheme();

  return (
    <div
      className={cn(
        "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {themes.map((t) => {
        const active = t.id === themeId;
        return (
          <button
            key={t.id}
            onClick={() => setThemeId(t.id)}
            aria-pressed={active}
            className={cn(
              "group relative rounded-[var(--radius-lg)] border p-3 text-left transition-[box-shadow,border-color] duration-200 ease-[var(--ease-out-quint)]",
              active
                ? "border-ink bg-cta-soft shadow-[0_0_0_3px_var(--ring-cta)]"
                : "border-line bg-surface hover:border-line-strong hover:shadow-[var(--shadow-e2)]",
            )}
          >
            <ThemePreview theme={t} mode={mode} className="w-full" />

            <div className="mt-3 flex items-start gap-2 px-0.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[13.5px] font-bold tracking-[-0.01em] text-ink">
                  {t.name}
                  {active ? (
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-nav-active text-nav-active-icon">
                      <Check className="size-2.5" strokeWidth={3.5} />
                    </span>
                  ) : null}
                </p>
                <p className="mt-0.5 truncate text-[11.5px] text-ink-3">
                  {t.tagline}
                </p>
              </div>
            </div>

            <p className="mt-2 truncate px-0.5 text-[10.5px] text-ink-3">
              {t.faces.display} · {t.faces.sans}
            </p>
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ menu */

/** Compact popover for the app chrome and the landing nav. */
export function ThemeMenu({
  align = "right",
  label,
}: {
  align?: "left" | "right";
  label?: string;
}) {
  const { themes, themeId, setThemeId, theme, mode } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Change theme"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-[var(--radius-md)] px-2.5 text-[13px] font-semibold text-ink-2 transition-colors hover:bg-cta-soft hover:text-ink",
          open && "bg-cta-soft text-ink",
        )}
      >
        <Palette className="size-4" />
        {label ? <span className="hidden sm:inline">{label}</span> : null}
        <span className="flex gap-0.5">
          {(
            [theme.light.cta, theme.light["surface-inv"], theme.light.jade] as const
          ).map((c, i) => (
            <span
              key={i}
              className="size-2 rounded-full ring-1 ring-line"
              style={{ background: c }}
            />
          ))}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                "absolute top-full z-50 mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface p-2 shadow-[var(--shadow-e4)]",
                align === "right" ? "right-0" : "left-0",
              )}
            >
              <p className="px-2 pt-1 pb-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                Theme
              </p>
              <div className="scrollbar-slim max-h-[22rem] space-y-1 overflow-y-auto">
                {themes.map((t) => {
                  const active = t.id === themeId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        setThemeId(t.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[var(--radius-md)] p-2 text-left transition-colors",
                        active ? "bg-cta-soft" : "hover:bg-surface-2",
                      )}
                    >
                      <ThemePreview
                        theme={t}
                        mode={mode}
                        className="w-20 shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate text-[13px]",
                            active ? "font-bold text-ink" : "font-semibold text-ink",
                          )}
                        >
                          {t.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                          {t.tagline}
                        </span>
                        <span className="mt-1 block truncate text-[10.5px] text-ink-3">
                          {t.faces.display} · {t.faces.sans}
                        </span>
                      </span>
                      {active ? (
                        <Check className="size-4 shrink-0 text-ink" strokeWidth={2.5} />
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 border-t border-line px-1 pt-2">
                <ModeToggle className="w-full [&>button]:flex-1" />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
