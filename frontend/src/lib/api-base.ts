const DEFAULT_API_BASE = "http://localhost:8000";

const API_BASE = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
  const normalized = raw.replace(/\/+$/, "");

  return normalized || DEFAULT_API_BASE;
})();

export { API_BASE };

