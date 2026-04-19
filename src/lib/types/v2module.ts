// ── V2 Module Activation Types ───────────────────────────────────────────────
// Reflects NewBackend/apps/modules/models.py and serializers

// ── Module codes ────────────────────────────────────────────────────────────

export const MODULE_OPTIONS = [
  { value: "invoice", label: "Invoice" },
  { value: "campaign", label: "Campaign" },
  { value: "vendor", label: "Vendor" },
  { value: "budget", label: "Budget" },
] as const;

export type ModuleCode = (typeof MODULE_OPTIONS)[number]["value"];

// ── Module Activation ───────────────────────────────────────────────────────

export interface ModuleActivation {
  id: string;
  module: ModuleCode;
  scope_node: string; // FK pk as string
  is_active: boolean;
  override_parent: boolean;
  created_at: string;
  updated_at: string;
}

// ── Resolve response ─────────────────────────────────────────────────────────

export interface ModuleActivationResolveResponse {
  module: ModuleCode;
  scope_node: string;
  is_active: boolean;
}

// ── Request shapes ────────────────────────────────────────────────────────────

export interface CreateModuleActivationRequest {
  module: ModuleCode;
  scope_node: string;
  is_active: boolean;
  override_parent?: boolean;
}

export interface UpdateModuleActivationRequest {
  is_active?: boolean;
  override_parent?: boolean;
}
