"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { cn } from "@/lib/cn";
import { activeHref, navFor, type NavItem } from "@/lib/nav";
import { PERMISSION_LABELS, useRole } from "@/lib/role";
import { universityById } from "@/lib/data/acca/universities";
import { PersonaSwitcher } from "./persona-switcher";
import { Wordmark } from "./brand";

function Item({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const lockedHint =
    item.locked && item.requires
      ? `Locked: needs the ${PERMISSION_LABELS[item.requires]} permission`
      : undefined;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      title={lockedHint}
      className={cn(
        "group relative flex items-center gap-2 rounded-[var(--radius-md)] py-1.5 pr-2 pl-1.5 text-[13.5px] transition-colors duration-150",
        active
          ? "bg-nav-active font-semibold text-nav-active-ink"
          : item.locked
            ? "font-medium text-ink-3 hover:bg-cta-soft"
            : "font-medium text-ink-2 hover:bg-cta-soft hover:text-ink",
      )}
    >
      {active ? (
        <span
          aria-hidden
          className="absolute top-1/2 -left-3 h-6 w-1 -translate-y-1/2 rounded-r-full bg-cta"
        />
      ) : null}
      <span
        aria-hidden
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-[var(--radius-sm)] transition-colors",
          active
            ? "text-nav-active-icon"
            : "text-ink-3 group-hover:text-ink",
        )}
      >
        <Icon className="size-[17px]" strokeWidth={active ? 2.3 : 1.9} />
      </span>
      <span className="min-w-0 flex-1 truncate">{item.label}</span>
      {item.locked ? (
        <>
          <Lock className="size-3.5 shrink-0 text-ink-3" aria-hidden />
          <span className="sr-only">(locked)</span>
        </>
      ) : item.badge ? (
        <span className="min-w-5 shrink-0 rounded-full bg-cta px-1.5 py-px text-center text-[10.5px] font-bold text-cta-ink tnum">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Workspace line at the foot of the rail: whose space this is. */
function Workspace() {
  const { persona, role } = useRole();
  const university = universityById(persona.universityId);
  const name = university
    ? university.name
    : role === "student"
      ? "ACCA Graduate Pathway"
      : "ZSkillup ACCA programmes";
  const sub = university
    ? role === "student"
      ? university.programmeName
      : `University workspace · ${university.city}`
    : role === "student"
      ? "ZSkillup direct"
      : "Central workspace";

  return (
    <div className="flex items-center gap-2.5 border-t border-line px-4 py-3">
      {university ? (
        // The partner's own brand colour is data, not theme.
        <span
          className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[11px] font-bold text-white"
          style={{ backgroundColor: university.branding.primary }}
        >
          {university.branding.logoInitials}
        </span>
      ) : (
        <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-nav-active text-[11px] font-bold text-nav-active-icon">
          ZS
        </span>
      )}
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-[12.5px] font-semibold text-ink">{name}</span>
        <span className="block truncate text-[11px] text-ink-3">{sub}</span>
      </span>
    </div>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { role, persona, studentType, roleMeta } = useRole();
  const sections = navFor(role, persona, studentType);
  const current = activeHref(pathname, sections.flatMap((s) => s.items));

  return (
    <div className="flex h-full flex-col border-r border-line bg-surface">
      <div className="px-4 pt-5 pb-4">
        <Wordmark href={roleMeta.home} onNavigate={onNavigate} />
      </div>

      <div className="px-3">
        <PersonaSwitcher onNavigate={onNavigate} />
      </div>

      <nav
        aria-label={`${roleMeta.label} navigation`}
        className="scrollbar-slim mt-3 min-h-0 flex-1 space-y-5 overflow-y-auto px-3 pt-2 pb-5"
      >
        {sections.map((section) => (
          <div key={section.heading}>
            <p className="mb-1.5 px-2 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <Item
                  key={item.href}
                  item={item}
                  active={item.href === current}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <Workspace />
    </div>
  );
}
