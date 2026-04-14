"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { PlatformRole } from "@/types/roles";

type RoleContextType = {
  role: PlatformRole;
  setRole: (role: PlatformRole) => void;
};

const RoleContext = createContext<RoleContextType | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<PlatformRole>("admin");

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);

  if (!context) {
    throw new Error("useRole must be used inside RoleProvider");
  }

  return context;
}
