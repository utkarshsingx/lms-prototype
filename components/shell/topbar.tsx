"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Bell, LogOut, Menu, Moon, Search, Sun, User } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { useTheme } from "@/components/theme-provider";
import { ThemeMenu } from "@/components/theme/theme-picker";
import { cn } from "@/lib/cn";
import { personaInitials, useRole } from "@/lib/role";
import { Wordmark } from "./brand";

const menuItem =
  "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-[13px] font-medium text-ink-2 transition-colors hover:bg-cta-soft hover:text-ink";

function AccountMenu() {
  const { persona, roleMeta, role } = useRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${persona.name}`}
        className="ml-1 grid size-9 place-items-center rounded-full bg-surface-inv text-[12px] font-bold text-ink-inv ring-2 ring-cta ring-offset-2 ring-offset-paper transition-transform active:scale-95"
      >
        {personaInitials(persona.name)}
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <motion.div
              role="menu"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-full right-0 z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e4)]"
            >
              <div className="border-b border-line bg-surface-2 px-3.5 py-3">
                <p className="truncate text-[13.5px] font-bold text-ink">{persona.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-ink-3">{persona.title}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-ink-3">{persona.email}</p>
                <span className="mt-2 inline-flex rounded-full bg-cta px-2 py-0.5 text-[10.5px] font-bold text-cta-ink">
                  {roleMeta.label}
                </span>
              </div>
              <div className="p-1.5">
                {role === "student" ? (
                  <Link role="menuitem" href="/profile" onClick={() => setOpen(false)} className={menuItem}>
                    <User className="size-4 text-ink-3" /> Profile
                  </Link>
                ) : null}
                <Link role="menuitem" href="/login" onClick={() => setOpen(false)} className={menuItem}>
                  <ArrowLeftRight className="size-4 text-ink-3" /> Switch login
                </Link>
                <Link role="menuitem" href="/login" onClick={() => setOpen(false)} className={menuItem}>
                  <LogOut className="size-4 text-ink-3" /> Sign out
                </Link>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export function Topbar({
  onOpenNav,
  onOpenSearch,
}: {
  onOpenNav: () => void;
  onOpenSearch: () => void;
}) {
  const { mode, toggleMode } = useTheme();
  const { role, roleMeta } = useRole();
  const bellHref = role === "student" ? "/notifications" : roleMeta.home;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-xl">
      <div className="shell-pad flex h-15 items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 grid size-9 shrink-0 place-items-center rounded-[var(--radius-sm)] text-ink-2 hover:bg-cta-soft hover:text-ink lg:hidden"
        >
          <Menu className="size-5" />
        </button>
        <div className="hidden sm:block lg:hidden">
          <Wordmark href={roleMeta.home} />
        </div>

        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Search"
          className="group flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-left text-ink-3 transition-colors hover:border-line-strong sm:max-w-sm lg:max-w-md"
        >
          <Search className="size-4 shrink-0 text-ink-2" strokeWidth={2.2} />
          <span className="min-w-0 flex-1 truncate text-[13px]">
            Search pages, papers and people
          </span>
          <span className="ml-auto hidden shrink-0 sm:flex">
            <Kbd>⌘K</Kbd>
          </span>
        </button>

        <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
          <span className="hidden sm:contents">
            <ThemeMenu />
          </span>
          <IconButton
            label={mode === "dark" ? "Switch to light" : "Switch to dark"}
            size="sm"
            onClick={toggleMode}
          >
            {mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </IconButton>
          <Link
            href={bellHref}
            aria-label="Notifications"
            className={cn(
              "relative grid size-9 place-items-center rounded-[var(--radius-sm)] text-ink-2 transition-colors hover:bg-cta-soft hover:text-ink",
            )}
          >
            <Bell className="size-[18px]" />
            <span className="absolute top-1.5 right-1.5 size-2.5 rounded-full bg-cta ring-2 ring-paper" />
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
