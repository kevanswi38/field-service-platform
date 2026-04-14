"use client";

import { createContext, useContext, ReactNode } from "react";
import { PlatformRole } from "@/types/roles";

type RoleContextType = {
  user: {
    id: string;
    email: string;
    role: PlatformRole;
    firstName: string | null;
    lastName: string | null;
  };
  role: PlatformRole;
  signOut: () => Promise<void>;
};

const RoleContext = createContext<RoleContextType | null>(null);

type RoleProviderProps = {
  children: ReactNode;
  initialUser: {
    id: string;
    email: string;
    role: PlatformRole;
    firstName: string | null;
    lastName: string | null;
  };
};

export function RoleProvider({ children, initialUser }: RoleProviderProps) {
  const user = initialUser;

  async function signOut() {
    try {
      await fetch("/api/auth/session", {
        method: "DELETE",
      });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <RoleContext.Provider value={{ user, role: user.role, signOut }}>
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
