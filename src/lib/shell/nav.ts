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
  ListChecks,
  IndianRupee,
} from "lucide-react";
import type { Icon } from "lucide-react";
import type { User } from "@/contexts/AuthContext";

export type NavGroup = "Operations" | "Planning" | "Setup";

// ── Full-access roles (bypass allowlist-only items) ─────────────────────────────

export const FULL_ACCESS_ROLES = ["tenant_admin", "org_admin"];

// ── Nav item definition ────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
  group: NavGroup;
  /**
   * Required capability string for sidebar visibility.
   * If absent, falls back to allowedRoles for backward compat.
   * No requiredCapability AND no allowedRoles → full-access only.
   */
  requiredCapability?: string;
  /** @deprecated Use requiredCapability instead. */
  allowedRoles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  // ── Operations ──────────────────────────────────────────────────────────────
  {
    label: "Home", to: "/", icon: LayoutDashboard, group: "Operations",
    requiredCapability: "budget.view",
  },
  {
    label: "Invoices", to: "/invoices", icon: FileText, group: "Operations",
    requiredCapability: "invoice.view",
  },
  {
    label: "Pending Review", to: "/pending-review", icon: ListChecks, group: "Operations",
    requiredCapability: "workflow.task.view",
  },
  {
    label: "Approval Tasks", to: "/tasks", icon: Inbox, group: "Operations",
    requiredCapability: "workflow.task.view",
  },
  {
    label: "Finance Handoffs", to: "/finance-handoffs", icon: Landmark, group: "Operations",
    requiredCapability: "reporting.view_finance",
  },
  {
    label: "Vendors", to: "/vendors", icon: Users, group: "Operations",
    requiredCapability: "vendor.view",
  },
  {
    label: "Campaigns", to: "/campaigns", icon: Megaphone, group: "Operations",
    requiredCapability: "campaign.view",
  },
  {
    label: "Manual Expenses", to: "/manual-expenses", icon: IndianRupee, group: "Operations",
    requiredCapability: "budget.view",
  },
  // ── Planning ────────────────────────────────────────────────────────────────
  {
    label: "Budgets", to: "/budgets", icon: Wallet, group: "Planning",
    requiredCapability: "budget.view",
  },
  {
    label: "Insights", to: "/insights", icon: BarChart3, group: "Planning",
    requiredCapability: "reporting.view_basic",
  },
  // ── Setup — full-access only (no allowedRoles / no requiredCapability) ───────
  { label: "Users",                  to: "/people",            icon: Users,       group: "Setup" },
  { label: "Organization Structure", to: "/scope-nodes",       icon: Building2,   group: "Setup" },
  { label: "Access Control",         to: "/access-control",    icon: ShieldCheck, group: "Setup" },
  { label: "Workflow Config",       to: "/workflow-config",   icon: GitBranch,   group: "Setup" },
  { label: "Module Activation",     to: "/module-activation", icon: ToggleLeft,  group: "Setup" },
];

// ── Route access matrix ───────────────────────────────────────────────────────
// Maps route path → required capability string.
// "full-access" → tenant_admin/org_admin (or superuser) only.
// Functions (user => boolean) → for complex rules.
// Unknown routes not in KNOWN_PUBLIC_ROUTES are DENIED.

type RouteAccess = string | "full-access" | ((user: User | null) => boolean);

const ROUTE_ACCESS: Record<string, RouteAccess> = {
  // ── Sidebar nav routes ────────────────────────────────────────────────────
  "/":                            "budget.view",
  "/invoices":                    "invoice.view",
  "/pending-review":              "workflow.task.view",
  "/tasks":                       "workflow.task.view",
  "/finance-handoffs":            "reporting.view_finance",
  "/vendors":                     "vendor.view",
  "/campaigns":                   "campaign.view",
  "/manual-expenses":             "budget.view",
  "/budgets":                     "budget.view",
  "/insights":                    "reporting.view_basic",
  // ── Setup (full-access only) ─────────────────────────────────────────────
  "/people":                      "full-access",
  "/scope-nodes":                 "full-access",
  "/access-control":             "full-access",
  "/workflow-config":            "full-access",
  "/module-activation":          "full-access",
  // ── Non-nav internal routes ───────────────────────────────────────────────
  "/notifications":               "workflow.task.view",
  "/workflow-drafts/:instanceId/assign": "workflow.task.view",
  // ── Portal routes ──────────────────────────────────────────────────────────
  "/vendor-portal":              "portal.vendor",
};

/** Routes that bypass all guards (public token pages). */
export const KNOWN_PUBLIC_ROUTES = [
  "/vendor/register",
  "/vendor/activate",
  "/vendor/onboarding",
  "/vendor/finance",
  "/finance/review",
  "/activate",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const _userRoles = (user: User | null): string[] =>
  Array.isArray(user?.roles) ? user.roles : [];

const _userCapabilities = (user: User | null): string[] =>
  Array.isArray(user?.capabilities) ? user.capabilities : [];

const _hasFullAccess = (user: User | null): boolean =>
  !!user && (_userRoles(user).some((r) => FULL_ACCESS_ROLES.includes(r)) || !!user.is_superuser);

/** True when the user is allowed to see this nav item in the sidebar. */
export function canSeeNavItem(user: User | null, item: NavItem): boolean {
  if (_hasFullAccess(user)) return true;

  if (item.requiredCapability) {
    return !!user && _userCapabilities(user).includes(item.requiredCapability);
  }

  if (item.allowedRoles) {
    return !!user && _userRoles(user).some((r) => item.allowedRoles!.includes(r));
  }

  return false;
}

/**
 * True when the user may access a route.
 * Unknown routes not in KNOWN_PUBLIC_ROUTES are DENIED.
 */
export function hasRouteAccess(
  user: User | null,
  routePath: string,
): boolean {
  if (KNOWN_PUBLIC_ROUTES.some((p) => routePath.startsWith(p))) return true;

  const access = ROUTE_ACCESS[routePath];
  if (access === undefined) return false;

  if (access === "full-access") return _hasFullAccess(user);
  if (typeof access === "function") return access(user);

  return !!user && _userCapabilities(user).includes(access as string);
}

/** Nav items for a group, filtered by the user's capabilities. */
export function itemsForGroup(
  group: NavGroup,
  user: User | null,
): NavItem[] {
  return NAV_ITEMS.filter((n) => n.group === group && canSeeNavItem(user, n));
}

/** Groups that have at least one visible item for the user. */
export function visibleGroups(
  user: User | null,
): { label: NavGroup; order: number }[] {
  return NAV_GROUPS.filter(
    (g) => itemsForGroup(g.label, user).length > 0,
  );
}

export const NAV_GROUPS: { label: NavGroup; order: number }[] = [
  { label: "Operations", order: 0 },
  { label: "Planning",   order: 1 },
  { label: "Setup",      order: 2 },
];
