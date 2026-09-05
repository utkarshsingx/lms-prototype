"use client";

import Link from "next/link";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import { Kbd } from "@/components/ui/misc";
import { useTheme } from "@/components/theme-provider";
import { Wordmark } from "./brand";

export function Topbar({
  onOpenNav,
  onOpenSearch,
}: {
  onOpenNav: () => void;
  onOpenSearch: () => void;
}) {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-xl">
      <div className="shell-pad flex h-14 items-center gap-3">
        <button
          onClick={onOpenNav}
          aria-label="Open navigation"
          className="-ml-1 grid size-9 place-items-center rounded-[var(--radius-sm)] text-ink-2 hover:bg-surface-2 lg:hidden"
        >
          <Menu className="size-4.5" />
        </button>
        <div className="lg:hidden">
          <Wordmark />
        </div>

        <button
          onClick={onOpenSearch}
          className="group ml-auto flex h-9 w-full max-w-sm items-center gap-2.5 rounded-[var(--radius-md)] border border-line bg-surface px-3 text-left text-ink-3 shadow-[var(--shadow-e1)] transition-colors hover:border-line-strong lg:ml-0 lg:mr-auto"
        >
          <Search className="size-4 shrink-0" strokeWidth={2} />
          <span className="hidden min-w-0 flex-1 truncate text-[13px] sm:block">
            Search courses, people, assessments
          </span>
          <span className="ml-auto hidden shrink-0 sm:flex">
            <Kbd>⌘K</Kbd>
          </span>
        </button>

        <div className="flex items-center gap-1">
          <IconButton
            label={theme === "dark" ? "Switch to light" : "Switch to dark"}
            size="sm"
            onClick={toggle}
          >
            {theme === "dark" ? (
              <Sun className="size-4" />
            ) : (
              <Moon className="size-4" />
            )}
          </IconButton>
          <Link
            href="/assessments"
            aria-label="Notifications"
            className="relative grid size-9 place-items-center rounded-[var(--radius-sm)] text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <Bell className="size-4" />
            <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-ember ring-2 ring-paper" />
          </Link>
        </div>
      </div>
    </header>
  );
}
