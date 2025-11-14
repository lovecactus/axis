const DEFAULT_API_BASE = "http://localhost:8000";

const API_BASE = (() => {
  const raw = process.env.NEXT_PUBLIC_API_BASE ?? DEFAULT_API_BASE;
  const normalized = (raw || DEFAULT_API_BASE).replace(/\/+$/, "");
  const withApi =
    normalized.toLowerCase().endsWith("/api") ? normalized : `${normalized}/api`;

  const globalMarker = "__AXIS_API_BASE_LOGGED__";
  if (typeof globalThis !== "undefined" && !(globalMarker in globalThis)) {
    Object.defineProperty(globalThis, globalMarker, {
      value: true,
      enumerable: false,
      configurable: false,
      writable: false,
    });
    // eslint-disable-next-line no-console
    console.log("[Axis] NEXT_PUBLIC_API_BASE resolved to:", withApi);
  }

  return withApi;
})();

export { API_BASE };

