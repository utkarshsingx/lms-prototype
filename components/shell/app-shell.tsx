"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { RoleProvider } from "@/lib/role";
import { AssistantDock } from "@/components/assistant/dock";
import { CommandPalette } from "./command-palette";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = useState(false);
  const [search, setSearch] = useState(false);
  const pathname = usePathname();

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

  useEffect(() => setNav(false), [pathname]);

  return (
    <RoleProvider>
      <div className="min-h-dvh">
        {/* Desktop rail */}
        <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 lg:block">
          <Sidebar />
        </aside>

        {/* Mobile drawer */}
        <AnimatePresence>
          {nav ? (
            <div className="fixed inset-0 z-70 lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setNav(false)}
                className="absolute inset-0 bg-[rgb(12_12_14/0.42)] backdrop-blur-[2px]"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="relative h-full w-72"
              >
                <Sidebar onNavigate={() => setNav(false)} />
              </motion.div>
            </div>
          ) : null}
        </AnimatePresence>

        <div className="lg:pl-64">
          <Topbar onOpenNav={() => setNav(true)} onOpenSearch={() => setSearch(true)} />
          <main className="shell-pad pt-7 pb-24">{children}</main>
        </div>

        <CommandPalette open={search} onClose={() => setSearch(false)} />
        <AssistantDock />
      </div>
    </RoleProvider>
  );
}
