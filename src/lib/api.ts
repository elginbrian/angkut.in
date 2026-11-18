const DEFAULT_PROD_API = "https://angkutin-be.elginbrian.com/api/v1";
const DEFAULT_LOCAL_API = "http://localhost:8001/api/v1";

export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? DEFAULT_PROD_API
    : DEFAULT_LOCAL_API)
).replace(/\/$/, "");

export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, "");

export function getWsUrl(): string {
  return `${API_BASE_URL.replace(/^http/, "ws")}/ws`;
}

export function resolveMediaUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/uploads/")) {
    return `${BACKEND_ORIGIN}${url}`;
  }
  return url;
}

export async function apiRequest<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const errBody = await response.json();
      if (typeof errBody?.detail === "string") {
        message = errBody.detail;
      }
    } catch {
      // ignore non-json body
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
