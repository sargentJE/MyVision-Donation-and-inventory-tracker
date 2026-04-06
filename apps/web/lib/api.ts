// In dev, Next.js rewrites /api/* to the NestJS backend.
// In production, both apps share the same origin behind nginx.
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '/api';

interface ApiError extends Error {
  status: number;
  body: unknown;
}

async function request<T>(
  path: string,
  options?: RequestInit & { skipAuthRedirect?: boolean },
): Promise<T> {
  const { skipAuthRedirect, ...fetchOptions } = options ?? {};

  const res = await fetch(`${BASE_URL}${path}`, {
    ...fetchOptions,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions?.headers,
    },
  });

  if (res.status === 401 && !skipAuthRedirect) {
    if (typeof window !== 'undefined') {
      // Session expiry toast via URL param — picked up by login page
      window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}&expired=1`;
    }
    throw new Error('Unauthenticated');
  }

  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new Error(
      `Server returned ${res.status} with non-JSON response`,
    ) as ApiError;
  }

  if (!res.ok) {
    const parsed = body as Record<string, unknown>;
    const error = new Error(
      (parsed.message as string) ?? 'Request failed',
    ) as ApiError;
    error.status = res.status;
    error.body = body;
    throw error;
  }

  return body as T;
}

interface RequestOptions {
  skipAuthRedirect?: boolean;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts }),
  post: <T>(path: string, data?: unknown, opts?: RequestOptions) =>
    request<T>(path, {
      method: 'POST',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...opts,
    }),
  patch: <T>(path: string, data?: unknown, opts?: RequestOptions) =>
    request<T>(path, {
      method: 'PATCH',
      body: data !== undefined ? JSON.stringify(data) : undefined,
      ...opts,
    }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...opts }),
};
