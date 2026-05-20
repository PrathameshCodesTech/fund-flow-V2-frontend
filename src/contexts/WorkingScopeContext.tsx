import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

type WorkingScopeState = {
  orgId: string | null;
  nodeIdsByOrg: Record<string, string | null>;
};

interface WorkingScopeContextValue {
  orgId: string | null;
  nodeId: string | null;
  setOrgId: (orgId: string | null) => void;
  setNodeId: (nodeId: string | null) => void;
}

const STORAGE_KEY = "vims-working-scope";

const WorkingScopeContext = createContext<WorkingScopeContextValue | null>(null);

function readStoredState(): WorkingScopeState {
  if (typeof window === "undefined") {
    return { orgId: null, nodeIdsByOrg: {} };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { orgId: null, nodeIdsByOrg: {} };
    }
    const parsed = JSON.parse(raw) as Partial<WorkingScopeState>;
    return {
      orgId: typeof parsed.orgId === "string" ? parsed.orgId : null,
      nodeIdsByOrg:
        parsed.nodeIdsByOrg && typeof parsed.nodeIdsByOrg === "object"
          ? Object.fromEntries(
              Object.entries(parsed.nodeIdsByOrg).map(([key, value]) => [
                key,
                typeof value === "string" ? value : null,
              ]),
            )
          : {},
    };
  } catch {
    return { orgId: null, nodeIdsByOrg: {} };
  }
}

export function WorkingScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<WorkingScopeState>(() => readStoredState());

  useEffect(() => {
    if (!state.orgId && user?.organization_id) {
      setState((prev) => ({ ...prev, orgId: user.organization_id }));
    }
  }, [state.orgId, user?.organization_id]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setOrgId = useCallback((orgId: string | null) => {
    setState((prev) => ({
      ...prev,
      orgId,
    }));
  }, []);

  const setNodeId = useCallback((nodeId: string | null) => {
    setState((prev) => {
      if (!prev.orgId) {
        return prev;
      }
      return {
        ...prev,
        nodeIdsByOrg: {
          ...prev.nodeIdsByOrg,
          [prev.orgId]: nodeId,
        },
      };
    });
  }, []);

  const value = useMemo<WorkingScopeContextValue>(() => {
    const nodeId = state.orgId ? state.nodeIdsByOrg[state.orgId] ?? null : null;
    return {
      orgId: state.orgId,
      nodeId,
      setOrgId,
      setNodeId,
    };
  }, [setNodeId, setOrgId, state.nodeIdsByOrg, state.orgId]);

  return (
    <WorkingScopeContext.Provider value={value}>
      {children}
    </WorkingScopeContext.Provider>
  );
}

export function useWorkingScope() {
  const ctx = useContext(WorkingScopeContext);
  if (!ctx) {
    throw new Error("useWorkingScope must be used within WorkingScopeProvider");
  }
  return ctx;
}
