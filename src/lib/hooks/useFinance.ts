import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listPayableInvoices,
  listPayments,
  getPayment,
  createPayment,
  updatePayment,
  type PaymentListParams,
} from '../api/finance';
import type { PaymentCreatePayload, PaymentUpdatePayload } from '../types/finance';

// ── Payable invoices ──────────────────────────────────────────────────────────

export function usePayableInvoices() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['finance', 'payable-invoices'],
    queryFn: listPayableInvoices,
  });
  return { invoices: data ?? [], isLoading, error };
}

// ── Payment records ───────────────────────────────────────────────────────────

export function usePayments(params?: PaymentListParams) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['finance', 'payments', params],
    queryFn: () => listPayments(params),
  });
  return { payments: data ?? [], isLoading, error };
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: ['finance', 'payment', id],
    queryFn: () => getPayment(id!),
    enabled: !!id,
  });
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: PaymentCreatePayload) => createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'payable-invoices'] });
      // Invalidate invoice list so status change is reflected elsewhere
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  return { createPayment: mutateAsync, isCreating: isPending, createError: error };
}

export function useUpdatePayment() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentUpdatePayload }) =>
      updatePayment(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'payments'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'payment', id] });
      // If the payment was completed, the invoice moves to `paid` — sync other lists
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'payable-invoices'] });
    },
  });
  return { updatePayment: mutateAsync, isUpdating: isPending, updateError: error };
}
