import { platformNavigation } from "@/lib/navigation";
import { PlatformRole } from "@/types/roles";

export function getNavigationForRole(role: PlatformRole) {
  return platformNavigation.filter((item) => item.roles.includes(role));
}
