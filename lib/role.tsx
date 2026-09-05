"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { adminUser, currentUser, type Person, type Role } from "@/lib/data";

type Ctx = { role: Role; setRole: (r: Role) => void; user: Person };

const RoleContext = createContext<Ctx>({
  role: "learner",
  setRole: () => {},
  user: currentUser,
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>("learner");

  useEffect(() => {
    try {
      const s = localStorage.getItem("meridian-role") as Role | null;
      if (s) setRoleState(s);
    } catch {
      /* no persistence in private mode */
    }
  }, []);

  const setRole = useCallback((r: Role) => {
    setRoleState(r);
    try {
      localStorage.setItem("meridian-role", r);
    } catch {
      /* ignore */
    }
  }, []);

  const user = role === "learner" ? currentUser : adminUser;

  return (
    <RoleContext.Provider value={{ role, setRole, user }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
