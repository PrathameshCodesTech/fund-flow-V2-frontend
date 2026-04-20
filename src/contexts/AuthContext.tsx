import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { login as apiLogin, logout as apiLogout, getCurrentUser } from "@/lib/api/auth";
import { isAuthenticated as hasToken, clearTokens } from "@/lib/auth/session";
import type { V2User } from "@/lib/types/auth";

// ── Role codes (match backend Role.code values) ────────────────────────────────

export type UserRole =
  | "tenant_admin"
  | "org_admin"
  | "marketing_head"
  | "entity_manager"
  | "ho_executive"
  | "ho_head"
  | "finance_team"
  | "vendor"
  | "unknown";

// ── Role display labels ────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  tenant_admin:    "Tenant Admin",
  org_admin:       "Org Admin",
  marketing_head:  "Marketing Head",
  entity_manager:  "Entity Manager",
  ho_executive:    "HO Executive",
  ho_head:         "HO Head",
  finance_team:    "Finance Team",
  vendor:          "Vendor",
  unknown:         "User",
};

// ── Full-access roles (bypass all nav gating) ─────────────────────────────────

export const FULL_ACCESS_ROLES: UserRole[] = ["tenant_admin", "org_admin"];

// ── Frontend-normalised User shape ────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  /** All role codes from backend assigned_roles (union for multi-role users). */
  roles: string[];
  /** Primary role for display — highest-priority role from roles[]. */
  role: UserRole;
  avatar: string;
  is_staff: boolean;
  is_superuser: boolean;
  employee_id: string | null;
  organization_id: string | null;
  organization_name: string | null;
  capabilities: string[];
  /** True when user has an active vendor portal binding. */
  isVendorPortalUser: boolean;
  vendorId: string | null;
  vendorName: string | null;
}

// ── Role priority (for picking a single display role) ─────────────────────────

const ROLE_PRIORITY: UserRole[] = [
  "tenant_admin",
  "org_admin",
  "marketing_head",
  "ho_head",
  "ho_executive",
  "finance_team",
  "entity_manager",
  "vendor",
];

// ── Mapping function ──────────────────────────────────────────────────────────

function mapCurrentUser(v2User: V2User): User {
  const name =
    [v2User.first_name, v2User.last_name].filter(Boolean).join(" ") ||
    v2User.email;

  const avatar = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Collect role codes from backend assignments
  const roleCodes = (v2User.assigned_roles ?? []).map((r) => r.code);

  // Superusers always get tenant_admin access
  const effectiveRoles: string[] =
    v2User.is_superuser && !roleCodes.includes("tenant_admin")
      ? [...roleCodes, "tenant_admin"]
      : roleCodes;

  // Pick primary display role by priority order
  const primaryRole: UserRole =
    ROLE_PRIORITY.find((r) => effectiveRoles.includes(r)) ??
    (effectiveRoles[0] as UserRole | undefined) ??
    "unknown";

  return {
    id: v2User.id,
    name,
    email: v2User.email,
    roles: effectiveRoles,
    role: primaryRole,
    avatar,
    is_staff: v2User.is_staff ?? false,
    is_superuser: v2User.is_superuser ?? false,
    employee_id: v2User.employee_id ?? null,
    organization_id: null,
    organization_name: null,
    capabilities: [],
    isVendorPortalUser: v2User.is_vendor_portal_user ?? false,
    vendorId: v2User.vendor_id ?? null,
    vendorName: v2User.vendor_name ?? null,
  };
}

// ── Context definition ────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!hasToken()) {
      setIsLoading(false);
      return;
    }

    getCurrentUser()
      .then((ctx) => {
        setUser(mapCurrentUser(ctx));
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await apiLogin({ email, password });
      setUser(mapCurrentUser(response.user));
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
