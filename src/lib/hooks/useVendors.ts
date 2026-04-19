import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMyVendor,
  listVendors,
  createVendor,
  updateVendor,
  listRegistrationRequests,
  getRegistrationRequest,
  createRegistrationRequest,
  approveRegistrationRequest,
  rejectRegistrationRequest,
  listVendorBankAccounts,
  createVendorBankAccount,
  updateVendorBankAccount,
  deleteVendorBankAccount,
  createVendorInvite,
  validateVendorInvite,
} from '../api/vendors';
import type { Vendor, VendorBankAccount, VendorInvite, VendorRegistrationRequest } from '../types/vendors';

/**
 * Fetch the bound vendor for the authenticated portal user.
 * Uses GET /api/v1/vendors/my-vendor/ — no vendor.view cap needed.
 * Returns { data, isLoading, isError } from react-query directly.
 */
export function useMyVendor() {
  return useQuery({
    queryKey: ['my-vendor'],
    queryFn: getMyVendor,
    retry: false,           // 404 = "not configured" — don't retry
    staleTime: 5 * 60_000, // vendor binding changes rarely
  });
}

/**
 * Fetch vendors from the backend.
 *
 * Backend returns a plain array (no pagination).
 * Text filtering applied client-side in consuming components.
 */
export function useVendors(params?: {
  status?: string;
  organization?: string;
  active_only?: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vendors', params],
    queryFn: () => listVendors(params),
  });

  return {
    vendors: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    error,
  };
}

export function useCreateVendor() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: Partial<Vendor>) => createVendor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  return {
    createVendor: mutateAsync,
    isCreating: isPending,
    createError: error,
  };
}

export function useUpdateVendor() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Vendor> }) =>
      updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  return {
    updateVendor: mutateAsync,
    isUpdating: isPending,
    updateError: error,
  };
}

// ── Registration Requests ─────────────────────────────────────────────────────

export function useRegistrationDetail(id: string | null) {
  return useQuery({
    queryKey: ['registration', id],
    queryFn: () => getRegistrationRequest(id!),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useRegistrations(params?: {
  status?: string;
  organization?: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['registrations', params],
    queryFn: () => listRegistrationRequests(params),
  });

  return {
    registrations: data ?? [],
    total: data?.length ?? 0,
    isLoading,
    error,
  };
}

export function useCreateRegistration() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: Partial<VendorRegistrationRequest>) => createRegistrationRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });

  return {
    createRegistration: mutateAsync,
    isCreating: isPending,
    createError: error,
  };
}

export function useApproveRegistration() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload?: { comment?: string; vendor_code?: string } }) =>
      approveRegistrationRequest(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  return {
    approveRegistration: mutateAsync,
    isApproving: isPending,
    approveError: error,
  };
}

export function useRejectRegistration() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectRegistrationRequest(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    },
  });

  return {
    rejectRegistration: mutateAsync,
    isRejecting: isPending,
    rejectError: error,
  };
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

export function useVendorBankAccounts(vendorId: string | null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['vendorBankAccounts', vendorId],
    queryFn: () => listVendorBankAccounts(vendorId!),
    enabled: Boolean(vendorId),
  });

  return {
    bankAccounts: data ?? [],
    isLoading,
    error,
  };
}

export function useCreateBankAccount(vendorId: string) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: Partial<VendorBankAccount>) => createVendorBankAccount(vendorId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorBankAccounts', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  return {
    createBankAccount: mutateAsync,
    isCreating: isPending,
    createError: error,
  };
}

export function useUpdateBankAccount(vendorId: string) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ accountId, data }: { accountId: string; data: Partial<VendorBankAccount> }) =>
      updateVendorBankAccount(vendorId, accountId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorBankAccounts', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  return {
    updateBankAccount: mutateAsync,
    isUpdating: isPending,
    updateError: error,
  };
}

export function useDeactivateBankAccount(vendorId: string) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (accountId: string) => deleteVendorBankAccount(vendorId, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorBankAccounts', vendorId] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });

  return {
    deactivateBankAccount: mutateAsync,
    isDeactivating: isPending,
    deactivateError: error,
  };
}

// ── Invites ───────────────────────────────────────────────────────────────────

export function useCreateInvite() {
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: { contact_email: string; contact_name?: string; organization: string }) =>
      createVendorInvite(data),
  });

  return {
    sendInvite: mutateAsync,
    isSending: isPending,
    sendError: error,
  };
}

export function useValidateInvite(token: string | null) {
  return useQuery({
    queryKey: ['vendorInvite', token],
    queryFn: () => validateVendorInvite(token!),
    enabled: Boolean(token),
    retry: false,
    staleTime: 60_000,
  });
}
