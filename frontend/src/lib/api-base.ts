const DEFAULT_API_BASE = "http://localhost:8000";

const API_BASE = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
  const normalized = (raw || DEFAULT_API_BASE).replace(/\/+$/, "");
  const withApi =
    normalized.toLowerCase().endsWith("/api") ? normalized : `${normalized}/api`;

  return withApi;
})();

export { API_BASE };

