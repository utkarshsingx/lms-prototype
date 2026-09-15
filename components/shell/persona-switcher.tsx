"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { ROLE_ICONS } from "@/lib/nav";
import {
  ROLES,
  personaById,
  personaInitials,
  personasForRole,
  roleMeta as metaFor,
  useRole,
  useSwitchPersona,
} from "@/lib/role";
import { toast } from "@/components/ui/toast";

/**
 * The black "Signed in as" card at the top of the sidebar. It opens a popover
 * of all six logins and their demo personas; picking one switches persona and
 * lands on that login's home.
 */
export function PersonaSwitcher({ onNavigate }: { onNavigate?: () => void }) {
  const { persona, roleMeta } = useRole();
  const switchPersona = useSwitchPersona();
  const [open, setOpen] = useState(false);
  const RoleIcon = ROLE_ICONS[persona.role];

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(id: string) {
    setOpen(false);
    if (id === persona.id) return;
    switchPersona(id);
    const next = personaById(id);
    if (next) {
      toast({ title: `Signed in as ${next.name}`, body: metaFor(next.role).label, tone: "info" });
    }
    onNavigate?.();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "group flex w-full items-center gap-3 rounded-[var(--radius-lg)] bg-surface-inv p-3 text-left text-ink-inv transition-[box-shadow,transform] duration-150",
          "hover:shadow-[0_0_0_3px_var(--cta)] active:translate-y-px",
          open && "shadow-[0_0_0_3px_var(--cta)]",
        )}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface text-[13px] font-bold text-ink ring-2 ring-cta ring-offset-2 ring-offset-surface-inv">
          {personaInitials(persona.name)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-bold tracking-[0.12em] text-ink-inv/55 uppercase">
            Signed in as
          </span>
          <span className="mt-0.5 block truncate text-[14px] leading-tight font-bold">
            {persona.name}
          </span>
          <span className="mt-1.5 inline-flex max-w-full items-center gap-1 rounded-full bg-cta px-2 py-0.5 text-[10.5px] font-bold text-cta-ink">
            <RoleIcon className="size-3 shrink-0" strokeWidth={2.4} />
            <span className="truncate">{roleMeta.short}</span>
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-inv/60 transition-colors group-hover:text-ink-inv" />
      </button>

      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] cursor-default"
            />
            <motion.div
              role="dialog"
              aria-label="Switch login"
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.99 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-full left-0 z-[61] mt-2 w-[min(21rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-e4)]"
            >
              <div className="border-b border-line bg-surface-2 px-4 py-3">
                <p className="text-[13.5px] font-bold text-ink">Switch login</p>
                <p className="mt-0.5 text-[12px] text-ink-3">
                  Six logins, each with its own workspace and permissions.
                </p>
              </div>
              <div className="scrollbar-slim max-h-[min(68vh,34rem)] overflow-y-auto p-2">
                {ROLES.map((r) => {
                  const Icon = ROLE_ICONS[r.id];
                  return (
                    <div key={r.id} className="py-1.5 first:pt-0.5">
                      <p className="flex items-center gap-2 px-2 pb-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                        <span className="grid size-5 place-items-center rounded-[6px] bg-nav-active text-nav-active-icon">
                          <Icon className="size-3" strokeWidth={2.4} />
                        </span>
                        {r.label}
                      </p>
                      <div className="space-y-0.5">
                        {personasForRole(r.id).map((p) => {
                          const current = p.id === persona.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => choose(p.id)}
                              aria-current={current ? "true" : undefined}
                              className={cn(
                                "flex w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-2 py-2 text-left transition-colors",
                                current ? "bg-cta-soft" : "hover:bg-cta-soft",
                              )}
                            >
                              <span
                                className={cn(
                                  "grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-bold",
                                  current
                                    ? "bg-surface-inv text-ink-inv ring-2 ring-cta"
                                    : "bg-surface-2 text-ink-2",
                                )}
                              >
                                {personaInitials(p.name)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-semibold text-ink">
                                  {p.name}
                                </span>
                                <span className="block truncate text-[11.5px] text-ink-3">
                                  {p.title} · {p.access}
                                </span>
                              </span>
                              {current ? (
                                <Check className="size-4 shrink-0 text-ink" strokeWidth={2.6} />
                              ) : null}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
