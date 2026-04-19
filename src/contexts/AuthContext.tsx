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
import { ApiError } from "@/lib/api/client";
import type { V2User } from "@/lib/types/auth";

// ── UserRole ──────────────────────────────────────────────────────────────────

export type UserRole =
  | "marketing_executive"
  | "regional_manager"
  | "ho_head"
  | "finance_team"
  | "admin"
  | "vendor";

// ── Frontend-normalised User shape ────────────────────────────────────────────
// This is what every component in the app uses — it is NOT the raw backend shape.

export interface User {
  id: string;
  name: string;       // derived: full_name or first_name + last_name or email
  email: string;
  role: UserRole;     // derived from assigned_roles (see mapBackendRoleToUserRole)
  avatar: string;     // derived: up to 2 initials from name
  // backend extras exposed for permission checks
  is_staff: boolean;
  employee_id: string | null;
  organization_id: string | null;   // from primary_org_assignment.org_unit.organization_id
  organization_name: string | null; // from primary_org_assignment.org_unit.organization_name
  /** Stable capability strings from backend — use these for UI gating, not role names. */
  capabilities: string[];
}

// ── Role label map ────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<UserRole, string> = {
  marketing_executive: "Marketing Executive",
  regional_manager: "Regional Marketing Manager",
  ho_head: "HO Marketing Head",
  finance_team: "Finance Team",
  admin: "Admin",
  vendor: "Vendor",
};

// ── Role derivation ───────────────────────────────────────────────────────────

/**
 * Map a backend role code/name string to one of our known UserRole values.
 *
 * Rule:
 *   1. Normalise the incoming string (lowercase, replace spaces/hyphens with underscores).
 *   2. Check for direct match against known UserRole values.
 *   3. Fall through partial-match heuristics for common aliases.
 *   4. Default: "finance_team" (minimal access, logged so it is easy to spot in the console).
 */
export function mapBackendRoleToUserRole(roleName: string): UserRole {
  const known: UserRole[] = [
    "marketing_executive",
    "regional_manager",
    "ho_head",
    "finance_team",
    "admin",
    "vendor",
  ];

  const normalised = roleName.toLowerCase().replace(/[\s-]+/g, "_");

  // Direct match
  if (known.includes(normalised as UserRole)) return normalised as UserRole;

  // Partial heuristics
  if (normalised.includes("admin")) return "admin";
  if (
    normalised.includes("finance_team")
    || normalised.includes("finance_head")
    || normalised.includes("head_finance")
    || normalised.includes("finance")
  ) return "finance_team";
  if (normalised.includes("ho_head") || (normalised.includes("ho") && normalised.includes("head"))) return "ho_head";
  if (normalised.includes("regional")) return "regional_manager";
  if (normalised.includes("vendor")) return "vendor";
  if (normalised.includes("marketing")) return "marketing_executive";

  // Default — fail closed: unknown roles get minimal access (no Campaigns, no Insights, no Admin)
  console.warn(
    `[AuthContext] Unknown backend role "${roleName}" — defaulting to "finance_team" (minimal access). ` +
      "Update mapBackendRoleToUserRole() if a new role is added to the backend."
  );
  return "finance_team";
}

// ── Mapping function ──────────────────────────────────────────────────────────

/**
 * Map a V2 /me/ UserSerializer response into the frontend User shape.
 *
 * V2's /me/ returns: { id, email, first_name, last_name }
 * V2 does NOT yet return roles, capabilities, or org assignments in /me/.
 *
 * Consequences for Phase B.1:
 *   - role: defaults to "finance_team" with a console warning
 *   - capabilities: empty — no UI gating works yet
 *   - organization_id / organization_name: null
 *   - is_staff: false (not in V2User)
 *   - employee_id: null (not in V2User)
 *
 * These will be populated once V2's /me/ is extended with role/capability data.
 */
function mapCurrentUser(v2User: V2User): User {
  // Name — derive from first_name + last_name
  const name =
    [v2User.first_name, v2User.last_name].filter(Boolean).join(" ") ||
    v2User.email;

  // Avatar — up to 2 initials
  const avatar = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Role — V2 /me/ does not yet return role assignments.
  // Default to finance_team so the app shell is accessible.
  // TODO: wire correctly once V2 /me/ returns role data.
  console.warn(
    "[AuthContext] V2 backend /me/ does not yet return assigned_roles — " +
      "defaulting to 'finance_team'. Role-based UI gating will not work until " +
      "V2 /me/ is extended with role assignment data."
  );

  return {
    id: v2User.id,
    name,
    email: v2User.email,
    role: "finance_team",
    avatar,
    is_staff: false,
    employee_id: null,
    organization_id: null,
    organization_name: null,
    capabilities: [],
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

  // On mount: restore session if a token already exists in storage
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
        // Token invalid or expired — wipe it so the user sees the login page
        clearTokens();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      // V2 login returns: { user: V2User, access: string, refresh: string }
      // Tokens are stored by apiLogin() internally.
      const response = await apiLogin({ email, password });
      setUser(mapCurrentUser(response.user));
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    // V2 has no server-side logout endpoint — just clear local tokens.
    // apiLogout() calls clearTokens() internally.
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
