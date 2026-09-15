"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CornerDownLeft,
  Landmark,
  Layers,
  Lock,
  Search,
  UserRound,
} from "lucide-react";
import { courses } from "@/lib/data";
// Module paths rather than "@/lib/data/acca": that barrel did not exist yet.
import {
  placementEligibleStudents,
  students,
  studentsForMentor,
  studentsForUniversity,
} from "@/lib/data/acca/students";
import {
  cohorts,
  cohortsForFaculty,
  cohortsForMentor,
  cohortsForStudent,
  cohortsForUniversity,
} from "@/lib/data/acca/cohorts";
import { universities } from "@/lib/data/acca/universities";
import { navItemsFor } from "@/lib/nav";
import { PERMISSION_LABELS, useRole, type Persona, type RoleId } from "@/lib/role";
import { cn } from "@/lib/cn";
import { Kbd } from "@/components/ui/misc";

type Entry = {
  id: string;
  label: string;
  sub: string;
  href: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  locked?: boolean;
};

/** Where a paper opens for each login. */
const PAPER_HREF: Record<RoleId, (slug: string) => string> = {
  student: (slug) => `/courses/${slug}`,
  faculty: (slug) => `/faculty/content/${slug}`,
  "super-admin": () => "/admin/content",
  "programme-admin": () => "/programme/cohorts",
  "university-admin": () => "/university/curriculum",
  mentor: () => "/mentor/students",
};

/** Where a student, cohort or university result opens for each login. */
const RECORD_HREF: Record<RoleId, { student?: string; cohort?: string; university?: string }> = {
  "super-admin": { student: "/admin/users", cohort: "/admin/programmes", university: "/admin/universities" },
  "programme-admin": {
    student: "/programme/students",
    cohort: "/programme/cohorts",
    university: "/programme/universities/operations",
  },
  "university-admin": { student: "/university/students", cohort: "/university/cohorts", university: "/university" },
  faculty: { student: "/faculty/cohorts", cohort: "/faculty/cohorts" },
  mentor: { student: "/mentor/students", cohort: "/mentor/students" },
  student: { cohort: "/batches", university: "/my-university" },
};

/** The records a persona may search, following the scope rules of bible section 3. */
function scopedRecords(persona: Persona) {
  const staff = persona.staffId ?? "";
  const uni = persona.universityId ?? "";
  switch (persona.role) {
    case "super-admin":
    case "programme-admin":
      return { students, cohorts, universities };
    case "university-admin":
      return {
        students: studentsForUniversity(uni),
        cohorts: cohortsForUniversity(uni),
        universities: universities.filter((u) => u.id === uni),
      };
    case "faculty": {
      const mine = cohortsForFaculty(staff);
      const ids = new Set(mine.flatMap((c) => c.studentIds));
      return { students: students.filter((s) => ids.has(s.id)), cohorts: mine, universities: [] };
    }
    case "mentor":
      return {
        students: persona.permissions.includes("students:placement-eligible")
          ? placementEligibleStudents()
          : studentsForMentor(staff),
        cohorts: cohortsForMentor(staff),
        universities: [],
      };
    case "student":
      return {
        students: [],
        cohorts: cohortsForStudent(persona.studentId ?? ""),
        universities: universities.filter((u) => u.id === uni),
      };
  }
}

const noopSubscribe = () => () => {};

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-100 flex items-start justify-center p-4 pt-[12vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgb(12_12_14/0.45)] backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Search"
            className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-line bg-surface shadow-[var(--shadow-e4)]"
          >
            {/* Mounted only while open, so every open starts with an empty query. */}
            <PaletteBody onClose={onClose} />
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function PaletteBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { role, persona, studentType, roleMeta } = useRole();
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);

  const entries = useMemo<Entry[]>(() => {
    const nav: Entry[] = navItemsFor(role, persona, studentType).map((n) => ({
      id: `nav-${n.href}`,
      label: n.label,
      sub:
        n.locked && n.requires
          ? `Locked · needs ${PERMISSION_LABELS[n.requires]}`
          : `Go to · ${roleMeta.short}`,
      href: n.href,
      group: "Pages",
      icon: n.locked ? Lock : n.icon,
      locked: n.locked,
    }));
    const papers: Entry[] = courses.map((c) => ({
      id: `paper-${c.id}`,
      label: c.title,
      sub: `${c.category} · ${c.hours}h`,
      href: PAPER_HREF[role](c.slug),
      group: "Papers",
      icon: BookOpen,
    }));
    const scope = scopedRecords(persona);
    const hrefs = RECORD_HREF[role];
    const records: Entry[] = [
      ...(hrefs.student
        ? scope.students.map((st) => ({
            id: `student-${st.id}`,
            label: st.name,
            sub: [
              st.type === "graduate" ? "Graduate" : "Undergraduate",
              st.currentPaper ? `Current paper ${st.currentPaper}` : null,
              st.accaId ? `ACCA ID ${st.accaId}` : "Not yet registered",
            ]
              .filter(Boolean)
              .join(" · "),
            href: hrefs.student!,
            group: "Students",
            icon: UserRound,
          }))
        : []),
      ...(hrefs.cohort
        ? scope.cohorts.map((c) => ({
            id: `cohort-${c.id}`,
            label: c.name,
            sub: `${c.papers.join(", ")} · ${c.size} students`,
            href:
              role === "student" && studentType === "undergraduate" ? "/my-university" : hrefs.cohort!,
            group: "Cohorts",
            icon: Layers,
          }))
        : []),
      ...(hrefs.university
        ? scope.universities.map((u) => ({
            id: `university-${u.id}`,
            label: u.name,
            sub: `${u.city} · ${u.programmeName} · ${u.status}`,
            href: hrefs.university!,
            group: "Universities",
            icon: Landmark,
          }))
        : []),
    ];
    return [...nav, ...papers, ...records];
  }, [role, persona, studentType, roleMeta]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return entries.filter((e) => e.group === "Pages");
    return entries
      .filter(
        (e) =>
          e.label.toLowerCase().includes(needle) ||
          e.sub.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [q, entries]);

  const active = Math.min(cursor, Math.max(results.length - 1, 0));

  function go(entry: Entry | undefined) {
    if (!entry) return;
    router.push(entry.href);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor(Math.min(active + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor(Math.max(active - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  }

  let lastGroup = "";

  return (
    <div onKeyDown={onKeyDown}>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-4 shrink-0 text-ink-2" strokeWidth={2.2} />
        <input
          autoFocus
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setCursor(0);
          }}
          placeholder={
            role === "student"
              ? "Search pages, papers and cohorts"
              : "Search pages, papers, students and cohorts"
          }
          aria-label="Search"
          className="h-13 w-full bg-transparent text-[15px] text-ink placeholder:text-ink-3 focus:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>

      <div className="scrollbar-slim max-h-[52vh] overflow-y-auto p-2" role="listbox">
        {results.length === 0 ? (
          <p className="px-3 py-10 text-center text-[13px] text-ink-3">
            Nothing matches &ldquo;{q}&rdquo;.
          </p>
        ) : (
          results.map((r, i) => {
            const head = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            const Icon = r.icon;
            const on = i === active;
            return (
              <div key={r.id}>
                {head ? (
                  <p className="px-3 pt-3 pb-1.5 text-[11px] font-bold tracking-[0.12em] text-ink-3 uppercase">
                    {head}
                  </p>
                ) : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={on}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => go(r)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left transition-colors",
                    on ? "bg-cta-soft" : "hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-[var(--radius-sm)]",
                      on ? "bg-nav-active text-nav-active-icon" : "bg-surface-2 text-ink-3",
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[13.5px] font-semibold",
                        r.locked ? "text-ink-3" : "text-ink",
                      )}
                    >
                      {r.label}
                    </span>
                    <span className="block truncate text-[12px] text-ink-3">{r.sub}</span>
                  </span>
                  {on ? (
                    <CornerDownLeft className="size-3.5 shrink-0 text-ink-2" />
                  ) : (
                    <ArrowRight className="size-3.5 shrink-0 text-ink-3 opacity-0" />
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-4 py-2.5 text-[11.5px] text-ink-3">
        <span className="flex items-center gap-1.5">
          <Kbd>↑</Kbd>
          <Kbd>↓</Kbd> move
        </span>
        <span className="flex items-center gap-1.5">
          <Kbd>↵</Kbd> open
        </span>
        <span className="ml-auto tnum">
          {results.length} {results.length === 1 ? "result" : "results"}
        </span>
      </div>
    </div>
  );
}
