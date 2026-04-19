import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listModuleActivations,
  createModuleActivation,
  updateModuleActivation,
  deleteModuleActivation,
  resolveModuleActivation,
} from "../api/v2module";
import type {
  CreateModuleActivationRequest,
  UpdateModuleActivationRequest,
} from "../types/v2module";

// ── List ─────────────────────────────────────────────────────────────────

export function useModuleActivations(params?: {
  scope_node?: string;
  module?: string;
}) {
  return useQuery({
    queryKey: ["v2", "moduleActivations", params],
    queryFn: () => listModuleActivations(params),
  });
}

// ── Resolve ────────────────────────────────────────────────────────────────

export function useResolveModuleActivation(params: {
  module: string;
  scope_node: string;
}) {
  return useQuery({
    queryKey: ["v2", "moduleResolve", params],
    queryFn: () => resolveModuleActivation(params),
    enabled: !!params.module && !!params.scope_node,
  });
}

// ── Create ─────────────────────────────────────────────────────────────────

export function useCreateModuleActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModuleActivationRequest) =>
      createModuleActivation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "moduleActivations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["v2", "moduleResolve"],
      });
    },
  });
}

// ── Update ────────────────────────────────────────────────────────────────

export function useUpdateModuleActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: UpdateModuleActivationRequest;
    }) => updateModuleActivation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "moduleActivations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["v2", "moduleResolve"],
      });
    },
  });
}

// ── Delete ────────────────────────────────────────────────────────────────

export function useDeleteModuleActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteModuleActivation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["v2", "moduleActivations"],
      });
      queryClient.invalidateQueries({
        queryKey: ["v2", "moduleResolve"],
      });
    },
  });
}
