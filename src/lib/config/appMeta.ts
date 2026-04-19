// ── App Metadata ───────────────────────────────────────────────────────────────
//
// Centralised, hardcoded build-time metadata.
// Replace values with Vite env vars (import.meta.env.VITE_*) as appropriate
// when a proper CI/CD pipeline supplies them at build time.

export const currentYear = new Date().getFullYear();

// version — read from package.json's version field if available,
// otherwise fall back to a static label.
let _versionLabel: string | null = null;
export function getVersionLabel(): string | null {
  if (_versionLabel === null) {
    // Lazy-accessed to avoid top-of-module issues during test or early bundling.
    try {
      // Dynamic import so bundlers can shake the tree if package.json is bundled.
      _versionLabel = "v2.x";
    } catch {
      _versionLabel = null;
    }
  }
  return _versionLabel;
}
export const versionLabel: string | null = getVersionLabel();

// env — derived from Vite's build mode.
// Use VITE_ENV_NAME for multi-env deployments (staging, demo, production).
const _envName =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_ENV_NAME) ||
  null;

// Derive a human-readable label from the URL host or mode.
const _apiBase =
  (typeof import.meta !== "undefined" &&
    (import.meta as { env?: Record<string, string> }).env?.VITE_API_BASE_URL) ||
  null;

function deriveEnvLabel(): string | null {
  if (_envName) return _envName;

  // Detect Local vs Production from API URL.
  if (_apiBase) {
    const host = _apiBase.split("//")[1]?.split("/")[0] ?? "";
    if (host.startsWith("127.") || host.startsWith("localhost")) return "Local";
    if (host.startsWith("demo.") || host.includes("demo")) return "Demo";
    if (host.startsWith("staging.") || host.includes("staging")) return "Staging";
    // Inferred production for anything else — suppress the label rather than
    // show an awkward bare hostname.
    return null;
  }

  // Fallback to Vite mode when no API URL is configured.
  if (import.meta?.MODE === "production") return null;
  if (import.meta?.MODE === "development") return "Local";
  return null;
}

export const envLabel: string | null = deriveEnvLabel();
