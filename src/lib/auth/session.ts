const ACCESS_TOKEN_KEY = 'ff_access_token';
const REFRESH_TOKEN_KEY = 'ff_refresh_token';
const EMBED_SESSION_KEY = 'ff_embed_session';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function setEmbedSession(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem(EMBED_SESSION_KEY, '1');
    return;
  }
  localStorage.removeItem(EMBED_SESSION_KEY);
}

export function isEmbedSession(): boolean {
  return localStorage.getItem(EMBED_SESSION_KEY) === '1';
}

export function isRunningInIframe(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(EMBED_SESSION_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAccessToken();
}

export function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
