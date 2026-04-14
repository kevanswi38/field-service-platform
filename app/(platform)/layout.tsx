import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import PlatformShell from "@/components/layout/PlatformShell";
import { RoleProvider } from "@/components/providers/RoleProvider";
import { AUTHORITY_COOKIE_NAME } from "@/lib/authority-bridge";
import { resolveSessionUserFromCookie } from "@/lib/serverUser";

type PlatformLayoutProps = {
  children: ReactNode;
};

export default async function PlatformLayout({ children }: PlatformLayoutProps) {
  const cookieStore = await cookies();
  const sessionUser = await resolveSessionUserFromCookie(
    cookieStore.get(AUTHORITY_COOKIE_NAME)?.value
  );

  if (!sessionUser) {
    redirect("/");
  }

  return (
    <RoleProvider initialUser={sessionUser}>
      <PlatformShell>{children}</PlatformShell>
    </RoleProvider>
  );
}
