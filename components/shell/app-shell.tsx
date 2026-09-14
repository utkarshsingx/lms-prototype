"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { RoleProvider, useRole } from "@/lib/role";
import { AssistantDock } from "@/components/assistant/dock";
import { Toaster } from "@/components/ui/toast";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * The in-app frame for all six logins. RoleProvider follows the route, so a
 * link to /programme/... opens as a Programme Admin even from a student tab.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <Shell>{children}</Shell>
    </RoleProvider>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The drawer remembers the path it was opened on, so navigating closes it
  // without an effect.
  const [navOpenedOn, setNavOpenedOn] = useState<string | null>(null);
  const navOpen = navOpenedOn !== null && navOpenedOn === pathname;
  const closeNav = () => setNavOpenedOn(null);
  const [search, setSearch] = useState(false);
  const { role } = useRole();
  const tutor = role === "student";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-paper">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile drawer: the same sidebar */}
      <AnimatePresence>
        {navOpen ? (
          <div className="fixed inset-0 z-70 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeNav}
              className="absolute inset-0 bg-[rgb(12_12_14/0.5)] backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-72 max-w-[85vw] shadow-[var(--shadow-e4)]"
            >
              <Sidebar onNavigate={closeNav} />
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>

      <div className="lg:pl-64">
        <Topbar onOpenNav={() => setNavOpenedOn(pathname)} onOpenSearch={() => setSearch(true)} />
        <main className="shell-pad pt-7 pb-24">{children}</main>
      </div>

      <CommandPalette open={search} onClose={() => setSearch(false)} />
      {tutor ? <AssistantDock /> : null}
      <Toaster aboveDock={tutor && pathname !== "/assistant"} />
    </div>
  );
}
