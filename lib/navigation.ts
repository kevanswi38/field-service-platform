import { PlatformRole } from "@/types/roles";

export type PlatformNavItem = {
  label: string;
  href: string;
  roles: PlatformRole[];
};

export const platformNavigation: PlatformNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "operations_manager", "support", "sales", "technician"],
  },
  {
    label: "Leads",
    href: "/leads",
    roles: ["admin", "operations_manager", "support", "sales"],
  },
  {
    label: "Customers",
    href: "/customers",
    roles: ["admin", "operations_manager", "support", "sales"],
  },
  {
    label: "Sites",
    href: "/sites",
    roles: ["admin", "operations_manager", "support", "sales", "technician"],
  },
  {
    label: "Work Orders",
    href: "/work-orders",
    roles: ["admin", "operations_manager", "support", "technician"],
  },
  {
    label: "Scheduling",
    href: "/scheduling",
    roles: ["admin", "operations_manager", "support", "sales", "technician"],
  },
  {
    label: "Walkthroughs",
    href: "/walkthroughs",
    roles: ["admin", "operations_manager", "support", "sales"],
  },
  {
    label: "Estimates",
    href: "/estimates",
    roles: ["admin", "operations_manager", "support", "sales"],
  },
];
