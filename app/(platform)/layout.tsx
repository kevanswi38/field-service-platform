import { ReactNode } from "react";
import PlatformShell from "@/components/layout/PlatformShell";

type PlatformLayoutProps = {
  children: ReactNode;
};

export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return <PlatformShell>{children}</PlatformShell>;
}
