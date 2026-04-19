import { getAccessToken, clearTokens } from '../auth/session';

const BASE_URL: string =
  (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL ?? 'http://localhost:8000';

function buildUrl(path: string): string {
  const base = BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

// ── Error class ───────────────────────────────────────────────────────────────

type DRFErrorPayload =
  | Record<string, string[]>
  | { detail: string }
  | { non_field_errors: string[] };

export class ApiError extends Error {
  status: number;
  errors: Record<string, string[]>;

  constructor(status: number, payload: DRFErrorPayload) {
    const errors = normalizeErrors(payload);
    const message =
      errors['detail']?.[0] ??
      errors['non_field_errors']?.[0] ??
      Object.values(errors).flat()[0] ??
      `HTTP ${status}`;
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

function normalizeErrors(payload: unknown): Record<string, string[]> {
  if (!payload || typeof payload !== 'object') {
    return { detail: [String(payload)] };
  }

  const result: Record<string, string[]> = {};

  for (const [key, val] of Object.entries(payload as Record<string, unknown>)) {
    if (Array.isArray(val)) {
      result[key] = val.map(String);
    } else if (typeof val === 'string') {
      result[key] = [val];
    } else {
      result[key] = [String(val)];
    }
  }

  return result;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  let url = buildUrl(path);

  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) qs.set(k, String(v));
    }
    const str = qs.toString();
    if (str) url += `?${str}`;
  }

  const token = getAccessToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = JSON.stringify(body);

  const res = await fetch(url, init);

  if (res.status === 401) {
    clearTokens();
    let payload: DRFErrorPayload = { detail: 'Unauthorized' };
    try { payload = await res.json(); } catch { /* ignore */ }
    return Promise.reject(new ApiError(res.status, payload));
  }

  if (!res.ok) {
    let payload: DRFErrorPayload = { detail: `HTTP ${res.status}` };
    try { payload = await res.json(); } catch { /* ignore */ }
    return Promise.reject(new ApiError(res.status, payload));
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  return res.json() as Promise<T>;
}

// ── Exported client ───────────────────────────────────────────────────────────

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return request<T>('GET', path, undefined, params);
  },

  post<T>(path: string, data?: unknown): Promise<T> {
    return request<T>('POST', path, data);
  },

  patch<T>(path: string, data?: unknown): Promise<T> {
    return request<T>('PATCH', path, data);
  },

  put<T>(path: string, data?: unknown): Promise<T> {
    return request<T>('PUT', path, data);
  },

  delete<T = void>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },

  /**
   * Multipart POST — for FormData payloads (e.g., file uploads).
   * Content-Type is omitted so the browser sets the correct multipart boundary.
   */
  multipart<T>(path: string, formData: FormData): Promise<T> {
    return this._multipart('POST', path, formData);
  },

  multipartPatch<T>(path: string, formData: FormData): Promise<T> {
    return this._multipart('PATCH', path, formData);
  },

  _multipart<T>(method: string, path: string, formData: FormData): Promise<T> {
    return this._formDataRequest<T>(method, path, formData);
  },

  _formDataRequest<T>(
    method: string,
    path: string,
    formData: FormData,
  ): Promise<T> {
    const url = buildUrl(path);
    const token = getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    // NOTE: Content-Type is NOT set here — browser auto-generates the boundary.

    return fetch(url, {
      method,
      headers,
      body: formData,
    }).then(async res => {
      if (res.status === 401) {
        clearTokens();
        return Promise.reject(new ApiError(401, { detail: 'Unauthorized' }));
      }
      if (!res.ok) {
        let payload: DRFErrorPayload = { detail: `HTTP ${res.status}` };
        try {
          payload = await res.json() as DRFErrorPayload;
        } catch { /* body empty or not JSON — use fallback message */ }
        return Promise.reject(new ApiError(res.status, payload));
      }
      if (res.status === 204) return undefined as T;
      return res.json() as Promise<T>;
    });
  },
};
