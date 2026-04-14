import { ReactNode } from "react";
import PlatformShell from "@/components/layout/PlatformShell";
import { RoleProvider } from "@/components/providers/RoleProvider";

type PlatformLayoutProps = {
  children: ReactNode;
};

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <RoleProvider>
      <PlatformShell>{children}</PlatformShell>
    </RoleProvider>
  );
}
