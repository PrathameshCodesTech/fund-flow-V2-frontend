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

// ── Full-access roles (bypass all allowlists) ──────────────────────────────────

export const FULL_ACCESS_ROLES = ["tenant_admin", "org_admin"];

/** All roles that are internal (non-vendor). */
const ALL_INTERNAL_ROLES = [
  "tenant_admin", "org_admin",
  "marketing_head", "entity_manager",
  "ho_executive", "ho_head", "finance_team",
];

// ── Nav item definition ────────────────────────────────────────────────────────

export interface NavItem {
  label: string;
  to: string;
  icon: Icon;
  group: NavGroup;
  /**
   * Roles that may see this item in the sidebar.
   * If absent, the item is full-access only (tenant_admin / org_admin).
   */
  allowedRoles?: string[];
}

export const NAV_ITEMS: NavItem[] = [
  // ── Operations ──────────────────────────────────────────────────────────────
  {
    label: "Home", to: "/", icon: LayoutDashboard, group: "Operations",
    allowedRoles: ALL_INTERNAL_ROLES,
  },
  {
    label: "Invoices", to: "/invoices", icon: FileText, group: "Operations",
    allowedRoles: ["tenant_admin", "org_admin", "marketing_head", "ho_executive", "ho_head", "finance_team"],
  },
  {
    label: "Approval Tasks", to: "/tasks", icon: Inbox, group: "Operations",
    allowedRoles: ["tenant_admin", "org_admin", "marketing_head", "entity_manager", "ho_executive", "ho_head"],
  },
  {
    label: "Finance Handoffs", to: "/finance-handoffs", icon: Landmark, group: "Operations",
    allowedRoles: ["tenant_admin", "org_admin", "finance_team", "ho_head"],
  },
  {
    label: "Vendors", to: "/vendors", icon: Users, group: "Operations",
    allowedRoles: ["tenant_admin", "org_admin", "marketing_head"],
  },
  {
    label: "Campaigns", to: "/campaigns", icon: Megaphone, group: "Operations",
    allowedRoles: ALL_INTERNAL_ROLES,
  },
  // ── Planning ────────────────────────────────────────────────────────────────
  {
    label: "Budgets", to: "/budgets", icon: Wallet, group: "Planning",
    allowedRoles: ALL_INTERNAL_ROLES,
  },
  {
    label: "Insights", to: "/insights", icon: BarChart3, group: "Planning",
    allowedRoles: ALL_INTERNAL_ROLES,
  },
  // ── Setup — full-access only (no allowedRoles) ────────────────────────────
  { label: "Users",                  to: "/people",             icon: Users,       group: "Setup" },
  { label: "Organization Structure", to: "/scope-nodes",       icon: Building2,   group: "Setup" },
  { label: "Access Control",         to: "/access-control",    icon: ShieldCheck, group: "Setup" },
  { label: "Workflow Config",        to: "/workflow-config",   icon: GitBranch,   group: "Setup" },
  { label: "Module Activation",      to: "/module-activation",icon: ToggleLeft,  group: "Setup" },
];

// ── Route access matrix ───────────────────────────────────────────────────────
// Controls which authenticated roles may *access* each route (guards in App.tsx).
// Some routes are not in NAV_ITEMS (not in sidebar) but still need guarding.
// Safe default: unknown routes are DENIED unless they are in KNOWN_PUBLIC_ROUTES.

/**
 * Routes accessible to all authenticated internal roles.
 * Not in NAV_ITEMS (hidden in sidebar) but must still be reachable.
 */
const INTERNAL_ALL_ROLES = ALL_INTERNAL_ROLES;

/** Routes accessible only to tenant_admin / org_admin. */
const ADMIN_ONLY: string[] = [];

type RouteRoles = string[] | "full-access" | "none";

const ROUTE_ACCESS: Record<string, RouteRoles> = {
  // ── Sidebar nav routes ────────────────────────────────────────────────────
  "/":                            INTERNAL_ALL_ROLES,
  "/invoices":                    ["tenant_admin","org_admin","marketing_head","ho_executive","ho_head","finance_team"],
  "/tasks":                       ["tenant_admin","org_admin","marketing_head","entity_manager","ho_executive","ho_head"],
  "/finance-handoffs":            ["tenant_admin","org_admin","finance_team","ho_head"],
  "/vendors":                     ["tenant_admin","org_admin","marketing_head"],
  "/campaigns":                   INTERNAL_ALL_ROLES,
  "/budgets":                     INTERNAL_ALL_ROLES,
  "/insights":                    INTERNAL_ALL_ROLES,
  "/people":                      "full-access",
  "/scope-nodes":                 "full-access",
  "/access-control":              "full-access",
  "/workflow-config":             "full-access",
  "/module-activation":           "full-access",
  // ── Non-nav internal routes ───────────────────────────────────────────────
  "/notifications":               INTERNAL_ALL_ROLES,
  "/workflow-drafts/:instanceId/assign": ["tenant_admin","org_admin","marketing_head"],
  // ── Portal routes ──────────────────────────────────────────────────────────
  "/vendor-portal":               "none", // handled by isVendorPortalUser in App.tsx
};

/** Routes that bypass all role guards (public token pages). */
export const KNOWN_PUBLIC_ROUTES = [
  "/vendor/register",
  "/vendor/activate",
  "/vendor/onboarding",
  "/vendor/finance",
  "/finance/review",
  "/activate",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** True when the user (by their role codes) is allowed to see this nav item in the sidebar. */
export function canSeeNavItem(userRoles: string[], item: NavItem): boolean {
  if (userRoles.some((r) => FULL_ACCESS_ROLES.includes(r))) return true;
  if (!item.allowedRoles) return false;
  return userRoles.some((r) => item.allowedRoles!.includes(r));
}

/**
 * True when the user may access a route identified by its nav-item path.
 * Safe: denies unknown authenticated routes that are not in KNOWN_PUBLIC_ROUTES.
 */
export function hasRouteAccess(
  userRoles: string[],
  routePath: string,
): boolean {
  // Public token routes — always allowed
  if (KNOWN_PUBLIC_ROUTES.some((p) => routePath.startsWith(p))) return true;

  // Look up the route in the matrix
  const access = ROUTE_ACCESS[routePath];

  // Unknown route (not in matrix, not public) → DENY
  if (access === undefined) return false;

  // Admin-only routes
  if (access === "full-access") {
    return userRoles.some((r) => FULL_ACCESS_ROLES.includes(r));
  }

  // Role-specific routes
  if (Array.isArray(access)) {
    if (userRoles.some((r) => FULL_ACCESS_ROLES.includes(r))) return true;
    return userRoles.some((r) => (access as string[]).includes(r));
  }

  // "none" → vendor portal; handled separately in App.tsx via isVendorPortalUser
  return false;
}

/** Nav items for a group, filtered by the user's roles. */
export function itemsForGroup(
  group: NavGroup,
  userRoles: string[] = [],
): NavItem[] {
  return NAV_ITEMS.filter((n) => n.group === group && canSeeNavItem(userRoles, n));
}

/** Groups that have at least one visible item for the user. */
export function visibleGroups(
  userRoles: string[],
): { label: NavGroup; order: number }[] {
  return NAV_GROUPS.filter(
    (g) => itemsForGroup(g.label, userRoles).length > 0,
  );
}

export const NAV_GROUPS: { label: NavGroup; order: number }[] = [
  { label: "Operations", order: 0 },
  { label: "Planning",   order: 1 },
  { label: "Setup",      order: 2 },
];
