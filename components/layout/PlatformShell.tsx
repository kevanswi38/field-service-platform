import { ReactNode } from "react";
import PlatformHeader from "./PlatformHeader";
import PlatformSidebar from "./PlatformSidebar";

type PlatformShellProps = {
  children: ReactNode;
};

export default function PlatformShell({ children }: PlatformShellProps) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <PlatformSidebar />

      <div className="flex min-h-screen flex-1 flex-col">
        <PlatformHeader />

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
