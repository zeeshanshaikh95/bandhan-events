import type { ApiResponse } from "@bandhan/shared";

/**
 * ---------------------------------------------------------------------------
 * API CLIENT
 * ---------------------------------------------------------------------------
 * The single door between the dashboard/website and the API.
 *
 * Security rules encoded here:
 *   - the session lives in an httpOnly cookie, so `credentials: "include"` is
 *     the only credential mechanism — no token is ever read from or written to
 *     localStorage;
 *   - state-changing requests echo the CSRF cookie in the X-CSRF-Token header,
 *     matching the server's double-submit check;
 *   - the API base URL is configuration, never a hardcoded host.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/api/v1";

const CSRF_COOKIE = "bandhan_csrf";
const CSRF_HEADER = "X-CSRF-Token";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, string[]>;

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }

  /** True when the account must set a new password before doing anything else. */
  get requiresPasswordChange(): boolean {
    return this.code === "PASSWORD_CHANGE_REQUIRED";
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }
}

/**
 * The double-submit CSRF token, for callers that cannot use `apiClient` —
 * namely the raw-body upload, which is not JSON.
 */
export function csrfToken(): string {
  return readCookie(CSRF_COOKIE) ?? "";
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** Abort signal from react-query or a caller. */
  signal?: AbortSignal;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  if (method !== "GET") {
    const csrf = readCookie(CSRF_COOKIE);
    if (csrf) headers[CSRF_HEADER] = csrf;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (error) {
    // Network-level failure: the API is unreachable, not rejecting us.
    throw new ApiClientError(
      0,
      "NETWORK_ERROR",
      "We could not reach the server. Check your connection and try again."
    );
  }

  const text = await response.text();
  let payload: ApiResponse<T> | null = null;
  try {
    payload = text ? (JSON.parse(text) as ApiResponse<T>) : null;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload || payload.success === false) {
    const error =
      payload && payload.success === false
        ? payload.error
        : { code: `HTTP_${response.status}`, message: "Something went wrong. Please try again." };
    throw new ApiClientError(response.status, error.code, error.message, error.details);
  }

  return payload.data;
}

export const apiClient = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
  put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Builds a query string, dropping empty values so URLs stay readable. */
export function toQueryString(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
