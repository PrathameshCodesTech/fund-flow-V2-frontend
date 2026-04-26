// ── V2 Vendor Hooks ─────────────────────────────────────────────────────────────────

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listInvitations,
  getInvitation,
  createInvitation,
  cancelInvitation,
  listSubmissions,
  getSubmission,
  sendToFinance,
  reopenSubmission,
  listAttachments,
  getAttachment,
  listVendors,
  getVendor,
  getMyVendor,
  updateVendor,
  marketingApprove,
  marketingReject,
  resendVendorActivation,
  listVendorSubmissionRoutes,
  createVendorSubmissionRoute,
  updateVendorSubmissionRoute,
} from "../api/v2vendor";
import type {
  CreateInvitationRequest,
  CreateVendorSubmissionRouteRequest,
  ReopenSubmissionRequest,
  MarketingApproveRequest,
  MarketingRejectRequest,
  Vendor,
  UpdateVendorSubmissionRouteRequest,
} from "../types/v2vendor";

// ── Invitations ─────────────────────────────────────────────────────────────

export function useInvitations(params?: {
  org?: string;
  scope_node?: string;
  status?: string;
  vendor_email?: string;
}) {
  return useQuery({
    queryKey: ["v2", "vendor", "invitations", params],
    queryFn: async () => {
      const res = await listInvitations(params);
      return res.results;
    },
  });
}

export function useInvitation(id: string | null) {
  return useQuery({
    queryKey: ["v2", "vendor", "invitation", id],
    queryFn: () => getInvitation(id!),
    enabled: !!id,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInvitationRequest) => createInvitation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "invitations"] });
    },
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "invitations"] });
    },
  });
}

// ── Submissions ──────────────────────────────────────────────────────────────

export function useSubmissions(params?: {
  org?: string;
  scope_node?: string;
  status?: string;
  invitation?: string;
  normalized_vendor_name?: string;
  normalized_email?: string;
}) {
  return useQuery({
    queryKey: ["v2", "vendor", "submissions", params],
    queryFn: async () => {
      const res = await listSubmissions(params);
      return res.results;
    },
  });
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: ["v2", "vendor", "submission", id],
    queryFn: () => getSubmission(id!),
    enabled: !!id,
  });
}

export function useSendToFinance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => sendToFinance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "submissions"] });
    },
  });
}

export function useReopenSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: ReopenSubmissionRequest }) =>
      reopenSubmission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "submissions"] });
    },
  });
}

// ── Attachments ─────────────────────────────────────────────────────────────

export function useAttachments(params?: { submission?: string }) {
  return useQuery({
    queryKey: ["v2", "vendor", "attachments", params],
    queryFn: async () => {
      const res = await listAttachments(params);
      return res.results;
    },
  });
}

export function useAttachment(id: string | null) {
  return useQuery({
    queryKey: ["v2", "vendor", "attachment", id],
    queryFn: () => getAttachment(id!),
    enabled: !!id,
  });
}

// ── Vendors ──────────────────────────────────────────────────────────────────

export function useVendors(params?: {
  org?: string;
  scope_node?: string;
  operational_status?: string;
  marketing_status?: string;
  po_mandate_enabled?: string;
}) {
  return useQuery({
    queryKey: ["v2", "vendor", "vendors", params],
    queryFn: async () => {
      const res = await listVendors(params);
      return res.results;
    },
  });
}

export function useVendor(id: string | null) {
  return useQuery({
    queryKey: ["v2", "vendor", "vendor", id],
    queryFn: () => getVendor(id!),
    enabled: !!id,
  });
}

export function useMyVendor() {
  return useQuery({
    queryKey: ["v2", "vendor", "my-vendor"],
    queryFn: getMyVendor,
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<Vendor, "email" | "phone" | "po_mandate_enabled">>;
    }) => updateVendor(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendors"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendor", id] });
    },
  });
}

export function useMarketingApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: MarketingApproveRequest }) =>
      marketingApprove(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendors"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendor", id] });
    },
  });
}

export function useMarketingReject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data?: MarketingRejectRequest }) =>
      marketingReject(id, data),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendors"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendor", id] });
    },
  });
}

export function useResendVendorActivation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resendVendorActivation(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendors"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "vendor", id] });
    },
  });
}

export function useVendorSubmissionRoutes(params?: {
  org?: string;
  is_active?: string;
}) {
  return useQuery({
    queryKey: ["v2", "vendor", "send-to-routes", params],
    queryFn: async () => {
      const res = await listVendorSubmissionRoutes(params);
      return Array.isArray(res) ? res : (res?.results ?? []);
    },
    enabled: !!params?.org,
  });
}

export function useCreateVendorSubmissionRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateVendorSubmissionRouteRequest) =>
      createVendorSubmissionRoute(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "send-to-routes"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor-send-to-options"] });
    },
  });
}

export function useUpdateVendorSubmissionRoute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVendorSubmissionRouteRequest }) =>
      updateVendorSubmissionRoute(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor", "send-to-routes"] });
      queryClient.invalidateQueries({ queryKey: ["v2", "vendor-send-to-options"] });
    },
  });
}
