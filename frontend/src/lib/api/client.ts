import { getSupabaseAccessToken } from '../supabase/client';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let unauthorizedHandler: ((requestToken: string | null) => void) | null = null;

export function setUnauthorizedHandler(handler: ((requestToken: string | null) => void) | null) {
  unauthorizedHandler = handler;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getSupabaseAccessToken();
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed.';

    try {
      const errorPayload = await response.json();
      const detail = errorPayload?.detail ?? errorPayload?.message;
      message = typeof detail === 'string' ? detail : message;
    } catch {
      message = response.statusText || message;
    }

    if (response.status === 401) {
      unauthorizedHandler?.(token);
    }

    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
