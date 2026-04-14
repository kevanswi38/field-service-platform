import { ReactNode } from "react";
import PlatformHeader from "./PlatformHeader";
import PlatformSidebar from "./PlatformSidebar";

type PlatformShellProps = {
  children: ReactNode;
};

export default function PlatformShell({ children }: PlatformShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f7fb]">
      <PlatformSidebar />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <PlatformHeader />

        <main className="flex-1 overflow-y-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
