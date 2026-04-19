import { apiClient } from './client';
import type {
  Vendor,
  VendorBankAccount,
  VendorDocument,
  VendorInvite,
  VendorInviteValidation,
  VendorRegistrationRequest,
} from '../types/vendors';

// ── Portal: bound vendor ──────────────────────────────────────────────────────

/**
 * GET /api/v1/vendors/my-vendor/
 *
 * Returns the Vendor bound to the authenticated portal user via
 * UserVendorAssignment.  Only works for users with portal.vendor capability.
 * Throws ApiError 404 if the user has no binding.
 */
export function getMyVendor(): Promise<Vendor> {
  return apiClient.get<Vendor>('/api/v1/vendors/my-vendor/');
}

// ── Vendors ──────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/vendors/vendors/ — returns a plain array (no pagination).
 *
 * Supported query params (per VendorListCreateView.get_queryset):
 *   ?status=        filter by status value
 *   ?organization=  filter by organization UUID
 *   ?active_only=   default true — backend filters is_active=True
 *
 * NOTE: ?search= is NOT supported by the backend — filter client-side.
 */
export function listVendors(params?: {
  status?: string;
  organization?: string;
  active_only?: string;
}): Promise<Vendor[]> {
  return apiClient.get<Vendor[]>('/api/v1/vendors/vendors/', params);
}

export function getVendor(id: string): Promise<Vendor> {
  return apiClient.get<Vendor>(`/api/v1/vendors/vendors/${id}/`);
}

/**
 * POST /api/v1/vendors/vendors/
 * Requires vendor.create capability.
 */
export function createVendor(data: Partial<Vendor>): Promise<Vendor> {
  return apiClient.post<Vendor>('/api/v1/vendors/vendors/', data);
}

/**
 * PATCH /api/v1/vendors/vendors/<id>/
 * Requires vendor.manage capability.
 */
export function updateVendor(id: string, data: Partial<Vendor>): Promise<Vendor> {
  return apiClient.patch<Vendor>(`/api/v1/vendors/vendors/${id}/`, data);
}

// ── Bank Accounts ─────────────────────────────────────────────────────────────

export function listVendorBankAccounts(vendorId: string): Promise<VendorBankAccount[]> {
  return apiClient.get<VendorBankAccount[]>(
    `/api/v1/vendors/vendors/${vendorId}/bank-accounts/`,
  );
}

export function createVendorBankAccount(
  vendorId: string,
  data: Partial<VendorBankAccount>,
): Promise<VendorBankAccount> {
  return apiClient.post<VendorBankAccount>(
    `/api/v1/vendors/vendors/${vendorId}/bank-accounts/`,
    data,
  );
}

export function updateVendorBankAccount(
  vendorId: string,
  accountId: string,
  data: Partial<VendorBankAccount>,
): Promise<VendorBankAccount> {
  return apiClient.patch<VendorBankAccount>(
    `/api/v1/vendors/vendors/${vendorId}/bank-accounts/${accountId}/`,
    data,
  );
}

export function deleteVendorBankAccount(vendorId: string, accountId: string): Promise<void> {
  return apiClient.delete<void>(
    `/api/v1/vendors/vendors/${vendorId}/bank-accounts/${accountId}/`,
  );
}

// ── Portal Users ──────────────────────────────────────────────────────────────

export interface VendorPortalUser {
  id: string;
  email: string;
  full_name: string;
}

/**
 * GET /api/v1/vendors/vendors/{id}/portal-users/
 *
 * Returns all active portal users bound to this vendor via UserVendorAssignment.
 * Requires invoice.manage capability.
 */
export function listVendorPortalUsers(vendorId: string): Promise<VendorPortalUser[]> {
  return apiClient.get<VendorPortalUser[]>(
    `/api/v1/vendors/vendors/${vendorId}/portal-users/`,
  );
}

// ── Registration Requests ─────────────────────────────────────────────────────

/**
 * GET /api/v1/vendors/registration-requests/ — returns a plain array (no pagination).
 */
export function listRegistrationRequests(params?: {
  status?: string;
  organization?: string;
  requested_by?: string;
}): Promise<VendorRegistrationRequest[]> {
  return apiClient.get<VendorRegistrationRequest[]>(
    '/api/v1/vendors/registration-requests/',
    params,
  );
}

export function getRegistrationRequest(id: string): Promise<VendorRegistrationRequest> {
  return apiClient.get<VendorRegistrationRequest>(
    `/api/v1/vendors/registration-requests/${id}/`,
  );
}

export function createRegistrationRequest(
  data: Partial<VendorRegistrationRequest>,
): Promise<VendorRegistrationRequest> {
  return apiClient.post<VendorRegistrationRequest>(
    '/api/v1/vendors/registration-requests/',
    data,
  );
}

/**
 * Document payload sent alongside the registration request via multipart/form-data.
 * Matches VendorRegistrationDocumentSerializer fields.
 */
export interface RegistrationDocumentPayload {
  document_type: string;
  name: string;
  file: File;
  expiry_date?: string;
  notes?: string;
}

/**
 * POST /api/v1/vendors/registration-requests/ with document uploads.
 *
 * Files are sent as multipart/form-data (one "documents" entry per file)
 * with the other registration fields as plain string fields.
 *
 * DRF's nested serializer reads the files from request.FILES automatically
 * when using multipart parsing.
 */
export function createRegistrationRequestWithDocuments(
  payload: {
    organization: string;
    vendor_name: string;
    vendor_legal_name: string;
    vendor_tax_id: string;
    vendor_type: string;
    contact_email: string;
    contact_phone: string;
    notes: string;
    bank_accounts: VendorBankAccount[];
    invite_token?: string;
  },
  documents: RegistrationDocumentPayload[],
): Promise<VendorRegistrationRequest> {
  const fd = new FormData();

  // Flatten simple fields
  const fields: Record<string, string> = {
    organization: payload.organization,
    vendor_name: payload.vendor_name,
    vendor_legal_name: payload.vendor_legal_name,
    vendor_tax_id: payload.vendor_tax_id,
    vendor_type: payload.vendor_type,
    contact_email: payload.contact_email,
    contact_phone: payload.contact_phone,
    notes: payload.notes,
  };
  if (payload.invite_token) fields.invite_token = payload.invite_token;

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) fd.append(key, value);
  }

  // Bank accounts as JSON string (matches nested serializer)
  fd.append('bank_accounts', JSON.stringify(payload.bank_accounts));

  // Documents as individual entries — DRF nested serializer reads from FILES
  // and form fields. We send each document's metadata + file.
  documents.forEach((doc, i) => {
    fd.append(`documents[${i}][document_type]`, doc.document_type);
    fd.append(`documents[${i}][name]`, doc.name);
    fd.append(`documents[${i}][file]`, doc.file);
    if (doc.expiry_date) fd.append(`documents[${i}][expiry_date]`, doc.expiry_date);
    if (doc.notes) fd.append(`documents[${i}][notes]`, doc.notes);
  });

  return apiClient.multipart<VendorRegistrationRequest>(
    '/api/v1/vendors/registration-requests/',
    fd,
  );
}

export function approveRegistrationRequest(
  id: string,
  payload?: { comment?: string; vendor_code?: string },
): Promise<VendorRegistrationRequest> {
  return apiClient.post<VendorRegistrationRequest>(
    `/api/v1/vendors/registration-requests/${id}/approve/`,
    payload ?? {},
  );
}

export function rejectRegistrationRequest(
  id: string,
  payload: { reason: string },
): Promise<VendorRegistrationRequest> {
  return apiClient.post<VendorRegistrationRequest>(
    `/api/v1/vendors/registration-requests/${id}/reject/`,
    payload,
  );
}

// ── Vendor Invites ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/vendors/invites/
 *
 * Admin creates an invite.  Backend sends the registration email immediately.
 * Requires vendor.manage capability.
 */
export function createVendorInvite(data: {
  contact_email: string;
  contact_name?: string;
  organization: string;
}): Promise<VendorInvite> {
  return apiClient.post<VendorInvite>('/api/v1/vendors/invites/', data);
}

/**
 * GET /api/v1/vendors/invites/validate/?token=<uuid>
 *
 * Public endpoint.  Validates an invite token and returns org context so the
 * registration page can pre-fill the organization without the vendor knowing
 * the UUID.
 */
export function validateVendorInvite(token: string): Promise<VendorInviteValidation> {
  return apiClient.get<VendorInviteValidation>('/api/v1/vendors/invites/validate/', { token });
}
