"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DEFAULT_PERSONA,
  defaultPersonaFor,
  homeFor,
  personaById,
  personaCan,
  roleForPath,
  roleMeta,
  type Permission,
  type Persona,
  type RoleId,
  type RoleMeta,
  type StudentType,
} from "./personas";

// Named re-exports only: a "use client" module cannot `export *`. Server
// components should import these from "@/lib/personas" instead.
export {
  DEFAULT_PERSONA,
  DEFAULT_PERSONA_ID,
  PERMISSION_LABELS,
  PERSONAS,
  ROLES,
  defaultPersonaFor,
  homeFor,
  personaById,
  personaCan,
  personaInitials,
  personasForRole,
  roleForPath,
  roleMeta,
  studentPersonaFor,
} from "./personas";
export type {
  Permission,
  Persona,
  RoleIconName,
  RoleId,
  RoleMeta,
  StudentType,
} from "./personas";

/** Who the current student is. Look the full record up in lib/data/acca by `id`. */
export type StudentIdentity = {
  /** Student record id: "s-anaya" or "s-rohan". */
  id: string;
  personaId: string;
  name: string;
  type: StudentType;
  universityId?: string;
};

export type RoleState = {
  role: RoleId;
  roleMeta: RoleMeta;
  persona: Persona;
  setPersona: (personaId: string) => void;
  can: (permission: Permission) => boolean;
  /** Set only for the student role. */
  studentType: StudentType | undefined;
  /** Set only for the student role. */
  student: StudentIdentity | null;
  /** Alias of `persona` for older components that read `user.name` / `user.title`. */
  user: Persona;
};

/* ------------------------------------------------------------ persistence */

const STORAGE_KEY = "acca-persona";
let memoryId: string | null = null;
const listeners = new Set<() => void>();

function readStoredId(): string | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v !== null) return v;
  } catch {
    /* storage blocked: fall back to this tab's memory */
  }
  return memoryId;
}

function writeStoredId(id: string) {
  if (!personaById(id)) return;
  memoryId = id;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* private mode: the choice lasts for this tab only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function useStoredPersona(): Persona {
  const id = useSyncExternalStore(subscribe, readStoredId, () => null);
  return personaById(id) ?? DEFAULT_PERSONA;
}

/* ------------------------------------------------------------ state */

function useRoleState(persona: Persona): RoleState {
  const can = useCallback(
    (permission: Permission) => personaCan(persona, permission),
    [persona],
  );
  return useMemo(() => {
    const isStudent = persona.role === "student";
    return {
      role: persona.role,
      roleMeta: roleMeta(persona.role),
      persona,
      setPersona: writeStoredId,
      can,
      studentType: isStudent ? persona.studentType : undefined,
      student:
        isStudent && persona.studentId && persona.studentType
          ? {
              id: persona.studentId,
              personaId: persona.id,
              name: persona.name,
              type: persona.studentType,
              universityId: persona.universityId,
            }
          : null,
      user: persona,
    };
  }, [persona, can]);
}

const RoleContext = createContext<RoleState | null>(null);

/**
 * Provides the signed-in persona. With `followPath` (the app shell), the route
 * decides the role: a page of another login renders as that login's first
 * persona straight away, and the choice is persisted. The current persona is
 * kept whenever it already has the route's role.
 */
export function RoleProvider({
  children,
  followPath = true,
}: {
  children: React.ReactNode;
  followPath?: boolean;
}) {
  const pathname = usePathname();
  const stored = useStoredPersona();
  const target = followPath && pathname ? roleForPath(pathname) : null;
  const persona =
    target && stored.role !== target ? defaultPersonaFor(target) : stored;

  // Runs on navigation only, and re-reads storage rather than trusting the
  // render: during hydration `stored` is still the server default, and a
  // persona just picked in the switcher must survive until its route loads.
  useEffect(() => {
    if (!followPath || !pathname) return;
    const want = roleForPath(pathname);
    const live = personaById(readStoredId()) ?? DEFAULT_PERSONA;
    if (live.role !== want) writeStoredId(defaultPersonaFor(want).id);
  }, [followPath, pathname]);

  const value = useRoleState(persona);
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  const stored = useStoredPersona();
  const standalone = useRoleState(stored);
  return ctx ?? standalone;
}

/** `true` when the current persona holds the permission. */
export function useCan(permission: Permission): boolean {
  return useRole().can(permission);
}

/**
 * Switch persona and move to a page. `href` defaults to the new role's home;
 * pass `"stay"` to remain on the current page (gated student pages).
 */
export function useSwitchPersona() {
  const router = useRouter();
  return useCallback(
    (personaId: string, href?: string) => {
      const next = personaById(personaId);
      if (!next) return;
      writeStoredId(next.id);
      if (href === "stay") return;
      router.push(href ?? homeFor(next.role));
    },
    [router],
  );
}
