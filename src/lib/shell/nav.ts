import {
  LayoutDashboard,
  FileText,
  Inbox,
  Landmark,
  Users,
  Megaphone,
  Wallet,
  BarChart3,
  Building2,
  ShieldCheck,
  GitBranch,
  ToggleLeft,
} from "lucide-react";
import type { Icon } from "lucide-react";

export type NavGroup = "Operations" | "Planning" | "Setup";

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
  group: NavGroup;
}

export const NAV_GROUPS: { label: NavGroup; order: number }[] = [
  { label: "Operations", order: 0 },
  { label: "Planning",   order: 1 },
  { label: "Setup",      order: 2 },
];

export const NAV_ITEMS: NavItem[] = [
  // Operations
  { label: "Home",               to: "/",                    icon: LayoutDashboard, group: "Operations" },
  { label: "Invoices",          to: "/invoices",            icon: FileText,        group: "Operations" },
  { label: "Approval Tasks",    to: "/tasks",               icon: Inbox,           group: "Operations" },
  { label: "Finance Handoffs",  to: "/finance-handoffs",    icon: Landmark,        group: "Operations" },
  { label: "Vendors",           to: "/vendors",             icon: Users,           group: "Operations" },
  { label: "Campaigns",         to: "/campaigns",            icon: Megaphone,       group: "Operations" },
  // Planning
  { label: "Budgets",           to: "/budgets",             icon: Wallet,          group: "Planning" },
  { label: "Insights",          to: "/insights",            icon: BarChart3,       group: "Planning" },
  // Setup
  { label: "Users",               to: "/people",              icon: Users,           group: "Setup" },
  { label: "Organization Structure", to: "/scope-nodes",   icon: Building2,       group: "Setup" },
  { label: "Access Control",    to: "/access-control",      icon: ShieldCheck,     group: "Setup" },
  { label: "Workflow Config",   to: "/workflow-config",     icon: GitBranch,       group: "Setup" },
  { label: "Module Activation", to: "/module-activation",   icon: ToggleLeft,      group: "Setup" },
];

export function itemsForGroup(group: NavGroup): NavItem[] {
  return NAV_ITEMS.filter(n => n.group === group);
}
