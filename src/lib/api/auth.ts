import { apiClient } from './client';
import { setTokens, clearTokens } from '../auth/session';
import type { LoginRequest } from '../types/auth';
import type { V2User } from '../types/auth';

// ── V2 Auth ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/login/
 * V2 returns: { user: V2User, access: "<jwt>", refresh: "<jwt_refresh>" }
 * We store both tokens and return the response.
 */
export async function login(credentials: LoginRequest): Promise<{ user: V2User; access: string; refresh: string }> {
  const response = await apiClient.post<{ user: V2User; access: string; refresh: string }>(
    '/api/v1/auth/login/',
    credentials,
  );
  setTokens(response.access, response.refresh);
  return response;
}

/**
 * POST /api/v1/auth/refresh/
 * Exchange refresh token for new access + refresh tokens.
 */
export async function refreshTokens(refresh: string): Promise<{ access: string; refresh: string }> {
  return apiClient.post<{ access: string; refresh: string }>('/api/v1/auth/refresh/', { refresh });
}

/**
 * GET /api/v1/auth/me/
 * V2 returns a simple UserSerializer: { id, email, first_name, last_name }
 */
export async function getCurrentUser(): Promise<V2User> {
  return apiClient.get<V2User>('/api/v1/auth/me/');
}

/**
 * Logout — V2 has no server-side logout endpoint.
 * We clear tokens locally; the server will reject the stale JWT on next use.
 */
export async function logout(): Promise<void> {
  clearTokens();
}

// ── V2 activation endpoints ────────────────────────────────────────────────────

export interface ActivationValidateResponse {
  vendor_name: string;
  email: string;
}

export interface ActivationSetPasswordRequest {
  uid: string;
  token: string;
  password: string;
}

/**
 * GET /api/v1/vendors/public/activate/{uid}/{token}/
 * Validates the activation token and returns vendor_name + email.
 */
export async function validateActivationToken(
  uid: string,
  token: string,
): Promise<ActivationValidateResponse> {
  return apiClient.get<ActivationValidateResponse>(
    `/api/v1/vendors/public/activate/${uid}/${token}/`,
  );
}

/**
 * POST /api/v1/vendors/public/activate/{uid}/{token}/set-password/
 * Sets the user password and marks the token as used.
 */
export async function setActivationPassword(
  data: ActivationSetPasswordRequest,
): Promise<void> {
  await apiClient.post(`/api/v1/vendors/public/activate/${data.uid}/${data.token}/set-password/`, {
    password: data.password,
  });
}

export interface InternalActivationValidateResponse {
  user_name: string;
}

export async function validateInternalActivationToken(
  _uid: string,
  _token: string,
): Promise<InternalActivationValidateResponse> {
  throw new Error('V2 backend does not implement internal user activation endpoints yet.');
}

export async function setInternalActivationPassword(_data: ActivationSetPasswordRequest): Promise<void> {
  throw new Error('V2 backend does not implement internal user activation endpoints yet.');
}
