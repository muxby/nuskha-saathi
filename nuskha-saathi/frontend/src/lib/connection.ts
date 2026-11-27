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

