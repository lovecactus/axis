const DEFAULT_API_BASE = "http://localhost:8000";
const SERVER_API_BASE = "http://localhost:8000/api";

/**
 * Get the API base URL. On the server (SSR), use localhost to avoid SSL issues.
 * On the client, use the public URL from environment variables.
 */
function getApiBase(): string {
  // Server-side: use localhost to avoid self-signed certificate issues
  if (typeof window === "undefined") {
    return SERVER_API_BASE;
  }

  // Client-side: use the public URL
  const raw = process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
  const normalized = (raw || DEFAULT_API_BASE).replace(/\/+$/, "");
  const withApi =
    normalized.toLowerCase().endsWith("/api") ? normalized : `${normalized}/api`;

  return withApi;
}

const API_BASE = (() => {
  const base = getApiBase();

  const globalMarker = "__AXIS_API_BASE_LOGGED__";
  if (typeof globalThis !== "undefined" && !(globalMarker in globalThis)) {
    Object.defineProperty(globalThis, globalMarker, {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false,
    });
    // eslint-disable-next-line no-console
    console.log(
      "[Axis] NEXT_PUBLIC_API_BASE resolved to:",
      base,
      typeof window === "undefined" ? "(server-side)" : "(client-side)",
    );
  }

  return base;
})();

export { API_BASE };

