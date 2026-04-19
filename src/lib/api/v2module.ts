import { apiClient } from "./client";
import type {
  ModuleActivation,
  CreateModuleActivationRequest,
  UpdateModuleActivationRequest,
  ModuleActivationResolveResponse,
} from "../types/v2module";

// ── List ───────────────────────────────────────────────────────────────────

export function listModuleActivations(params?: {
  scope_node?: string;
  module?: string;
}): Promise<ModuleActivation[]> {
  return apiClient
    .get<{ count: number; next: string | null; previous: string | null; results: ModuleActivation[] }>(
      "/api/v1/modules/activations/",
      params,
    )
    .then((r) => r.results);
}

// ── Create ──────────────────────────────────────────────────────────────────

export function createModuleActivation(
  data: CreateModuleActivationRequest,
): Promise<ModuleActivation> {
  return apiClient.post<ModuleActivation>(
    "/api/v1/modules/activations/",
    data,
  );
}

// ── Update ─────────────────────────────────────────────────────────────────

export function updateModuleActivation(
  id: string,
  data: UpdateModuleActivationRequest,
): Promise<ModuleActivation> {
  return apiClient.patch<ModuleActivation>(
    `/api/v1/modules/activations/${id}/`,
    data,
  );
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function deleteModuleActivation(id: string): Promise<void> {
  return apiClient.delete<void>(`/api/v1/modules/activations/${id}/`);
}

// ── Resolve ────────────────────────────────────────────────────────────────

export function resolveModuleActivation(params: {
  module: string;
  scope_node: string;
}): Promise<ModuleActivationResolveResponse> {
  return apiClient.get<ModuleActivationResolveResponse>(
    "/api/v1/modules/resolve/",
    params,
  );
}
