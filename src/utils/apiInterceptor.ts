/**
 * Client-Side API Authentication & RBAC Credential Interceptor
 * Automatically injects the active user role into the 'x-user-role' header
 * for all backend API requests, ensuring server-side RBAC validation.
 */

const ROLE_STORAGE_KEY = "gp_active_user_role";

export function setActiveUserRole(role: string | null | undefined): void {
  if (typeof window === "undefined") return;
  if (role) {
    sessionStorage.setItem(ROLE_STORAGE_KEY, role);
  } else {
    sessionStorage.removeItem(ROLE_STORAGE_KEY);
  }
}

export function getActiveUserRole(): string {
  if (typeof window === "undefined") return "";
  return sessionStorage.getItem(ROLE_STORAGE_KEY) || "";
}

let interceptorInstalled = false;

export function installApiInterceptor(): void {
  if (interceptorInstalled || typeof window === "undefined") return;
  interceptorInstalled = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlStr =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.toString()
        : input.url;

    // Only intercept requests directed to our backend API endpoints
    const isApiRequest =
      urlStr.startsWith("/api") ||
      urlStr.includes(":3001/api") ||
      urlStr.startsWith("api/");

    if (isApiRequest) {
      const activeRole = getActiveUserRole();
      const headers = new Headers(init?.headers);

      if (!headers.has("x-user-role") && activeRole) {
        headers.set("x-user-role", activeRole);
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    }

    return originalFetch(input, init);
  };
}
