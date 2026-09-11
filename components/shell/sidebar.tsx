"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, LogOut, ShieldCheck, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { channelNav, isActive, learnNav, manageNav, settingsNav, type NavItem } from "@/lib/nav";
import { useRole } from "@/lib/role";
import { Avatar } from "@/components/ui/avatar";
import { Wordmark } from "./brand";

function Item({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-2.5 rounded-[var(--radius-sm)] px-2.5 py-2 text-[13.5px] font-medium transition-colors duration-150",
        active
          ? "bg-surface text-ink shadow-[var(--shadow-e1)]"
          : "text-ink-2 hover:bg-surface/70 hover:text-ink",
      )}
    >
      {active ? (
        <span className="absolute top-1/2 -left-2.5 h-4.5 w-[3px] -translate-y-1/2 rounded-full bg-brand" />
      ) : null}
      <Icon
        className={cn(
          "size-4 shrink-0 transition-colors",
          active ? "text-brand" : "text-ink-3 group-hover:text-ink-2",
        )}
        strokeWidth={1.9}
      />
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10.5px] font-semibold tnum",
            active ? "bg-brand text-on-brand" : "bg-surface-3 text-ink-2",
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function Group({
  label,
  items,
  onNavigate,
}: {
  label?: string;
  items: NavItem[];
  onNavigate?: () => void;
}) {
  return (
    <div>
      {label ? (
        <p className="mb-1.5 px-2.5 text-[10px] font-semibold tracking-[0.15em] text-ink-3 uppercase">
          {label}
        </p>
      ) : null}
      <div className="space-y-0.5">
        {items.map((i) => (
          <Item key={i.href} item={i} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { role, setRole, user } = useRole();
  const [menu, setMenu] = useState(false);
  const managing = role !== "learner";

  return (
    <div className="flex h-full flex-col gap-5 border-r border-line bg-surface-2 px-4 py-5">
      <Wordmark />

      {/* Role switch — the prototype's way of showing both sides of the product. */}
      <div className="rounded-[var(--radius-md)] border border-line bg-surface p-1 shadow-[var(--shadow-e1)]">
        <div className="flex gap-0.5">
          {(
            [
              ["learner", "Learner", User],
              ["admin", "Admin", ShieldCheck],
            ] as const
          ).map(([r, label, Icon]) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-xs)] px-2 py-1.5 text-[12px] font-medium transition-all",
                (r === "learner") === !managing
                  ? "bg-surface-inv text-ink-inv shadow-[var(--shadow-e2)]"
                  : "text-ink-3 hover:text-ink",
              )}
            >
              <Icon className="size-3.5" strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <nav className="scrollbar-slim -mx-1 min-h-0 flex-1 space-y-5 overflow-y-auto px-1">
        <Group items={learnNav} onNavigate={onNavigate} />
        {managing ? (
          <>
            <Group label="Manage" items={manageNav} onNavigate={onNavigate} />
            <Group label="Channels" items={channelNav} onNavigate={onNavigate} />
            <Group items={settingsNav} onNavigate={onNavigate} />
          </>
        ) : null}
      </nav>

      <div className="relative">
        <button
          onClick={() => setMenu((m) => !m)}
          className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-transparent px-1.5 py-1.5 text-left transition-colors hover:border-line hover:bg-surface"
        >
          <Avatar name={user.name} size="sm" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium text-ink">
              {user.name}
            </span>
            <span className="block truncate text-[11.5px] text-ink-3">
              {user.title}
            </span>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-ink-3" />
        </button>
        {menu ? (
          <div className="absolute bottom-full left-0 z-20 mb-1.5 w-full overflow-hidden rounded-[var(--radius-md)] border border-line bg-surface p-1 shadow-[var(--shadow-e4)]">
            <Link
              href="/profile"
              onClick={() => setMenu(false)}
              className="flex items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <User className="size-3.5" /> Profile and certificates
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 rounded-[var(--radius-xs)] px-2.5 py-2 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink"
            >
              <LogOut className="size-3.5" /> Sign out
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
