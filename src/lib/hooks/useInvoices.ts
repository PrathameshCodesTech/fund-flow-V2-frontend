import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  submitInvoice,
  cancelInvoice,
  listAllocations,
  replaceAllocations,
  listTaxComponents,
  replaceTaxComponents,
  listComments,
  createComment,
  listIssues,
  attachWorkflow,
  type InvoiceListParams,
} from '../api/invoices';
import type {
  InvoiceAllocationLine,
  InvoiceTaxComponent,
  InvoiceCreatePayload,
} from '../types/invoices';

export function useInvoices(params?: InvoiceListParams) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', params],
    queryFn: () => listInvoices(params),
  });
  return { invoices: data ?? [], isLoading, error };
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: () => getInvoice(id!),
    enabled: !!id,
  });
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: InvoiceCreatePayload) => createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
  return { createInvoice: mutateAsync, isCreating: isPending, createError: error };
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InvoiceCreatePayload> }) =>
      updateInvoice(id, data),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
  return { updateInvoice: mutateAsync, isUpdating: isPending, updateError: error };
}

export function useSubmitInvoice() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (id: string) => submitInvoice(id),
    onSuccess: (_result, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
  return { submitInvoice: mutateAsync, isSubmitting: isPending, submitError: error };
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      cancelInvoice(id, reason),
    onSuccess: (_result, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    },
  });
  return { cancelInvoice: mutateAsync, isCancelling: isPending, cancelError: error };
}

export function useInvoiceAllocations(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoiceAllocations', invoiceId],
    queryFn: () => listAllocations(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useReplaceAllocations(invoiceId: string | undefined) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (allocations: Partial<InvoiceAllocationLine>[]) =>
      replaceAllocations(invoiceId!, allocations),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceAllocations', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
  return { replaceAllocations: mutateAsync, isReplacing: isPending, replaceError: error };
}

export function useInvoiceTaxComponents(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoiceTaxComponents', invoiceId],
    queryFn: () => listTaxComponents(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useReplaceTaxComponents(invoiceId: string | undefined) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (components: Partial<InvoiceTaxComponent>[]) =>
      replaceTaxComponents(invoiceId!, components),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceTaxComponents', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
  return { replaceTaxComponents: mutateAsync, isReplacing: isPending, replaceError: error };
}

export function useInvoiceComments(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoiceComments', invoiceId],
    queryFn: () => listComments(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useCreateComment(invoiceId: string | undefined) {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: { body: string; is_internal?: boolean; parent?: string }) =>
      createComment(invoiceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoiceComments', invoiceId] });
    },
  });
  return { createComment: mutateAsync, isCreating: isPending, createError: error };
}

export function useInvoiceIssues(invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoiceIssues', invoiceId],
    queryFn: () => listIssues(invoiceId!),
    enabled: !!invoiceId,
  });
}

export function useAttachWorkflow() {
  const queryClient = useQueryClient();
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({
      invoiceId,
      templateVersionId,
      vendorUserId,
      comment,
    }: {
      invoiceId: string;
      templateVersionId: string;
      vendorUserId: string;
      comment?: string;
    }) => attachWorkflow(invoiceId, {
      template_version_id: templateVersionId,
      vendor_user_id: vendorUserId,
      comment,
    }),
    onSuccess: (_result, { invoiceId }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
    },
  });
  return { attachWorkflow: mutateAsync, isAttaching: isPending, attachError: error };
}

