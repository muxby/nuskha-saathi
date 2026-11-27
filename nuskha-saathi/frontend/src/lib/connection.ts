import { API_BASE, fetchHealth, type HealthStatus } from "@/lib/api";

/**
 * Why the app cannot use live scanning, in the order a person can fix it.
 * `ready` means the backend answered and the reader has a key.
 */
export type BackendState = "checking" | "ready" | "no-api-url" | "unreachable" | "reader-not-configured";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]);

/**
 * True when a deployed page still points at a localhost API. That happens
 * when NEXT_PUBLIC_API_BASE_URL was missing at build time: the value is baked
 * into the bundle, so it must be set before building, not after.
 */
export function isApiUrlMissing(apiBase: string, pageHost: string): boolean {
  let apiHost: string;
  try {
    apiHost = new URL(apiBase).hostname;
  } catch {
    return true;
  }
  return LOCAL_HOSTS.has(apiHost) && !LOCAL_HOSTS.has(pageHost);
}

/** An https page cannot call an http API: browsers block it as mixed content. */
export function isMixedContent(apiBase: string, pageProtocol: string): boolean {
  return pageProtocol === "https:" && apiBase.startsWith("http://");
}

export function stateFromHealth(health: HealthStatus | null): BackendState {
  if (!health) return "unreachable";
  if (health.capabilities && !health.capabilities.vision_configured) return "reader-not-configured";
  return "ready";
}

export async function probeBackend(signal?: AbortSignal): Promise<BackendState> {
  if (typeof window !== "undefined") {
    if (isApiUrlMissing(API_BASE, window.location.hostname)) return "no-api-url";
    if (isMixedContent(API_BASE, window.location.protocol)) return "no-api-url";
  }
  const timeout = new AbortController();
  // Free hosting tiers sleep; a cold start can take most of a minute.
  const timer = setTimeout(() => timeout.abort(), 60_000);
  signal?.addEventListener("abort", () => timeout.abort(), { once: true });
  try {
    return stateFromHealth(await fetchHealth(timeout.signal));
  } finally {
    clearTimeout(timer);
  }
}

export function apiHostLabel(): string {
  try {
    return new URL(API_BASE).host;
  } catch {
    return API_BASE;
  }
}
