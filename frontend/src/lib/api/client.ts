import { getSupabaseAccessToken } from '../supabase/client';
import { resolveApiBaseUrl } from './apiConfig';

const API_BASE_URL = resolveApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL,
  import.meta.env.PROD
);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function getErrorMessage(status: number, payload: unknown): string {
  const detail = typeof payload === 'object' && payload !== null && 'detail' in payload
    ? payload.detail
    : typeof payload === 'object' && payload !== null && 'message' in payload
      ? payload.message
      : undefined;

  if (status >= 500) {
    return status === 503
      ? 'StoryForge AI is temporarily unavailable. Please try again later.'
      : 'Something went wrong on the server. Please try again later.';
  }

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail.flatMap((item: unknown) => {
      if (typeof item !== 'object' || item === null || !('msg' in item) || typeof item.msg !== 'string') {
        return [];
      }
      const location = 'loc' in item && Array.isArray(item.loc)
        ? item.loc.filter((part: unknown): part is string | number => typeof part === 'string' || typeof part === 'number')
          .filter((part: string | number) => part !== 'body')
          .join('.')
        : '';
      return [location ? `${location}: ${item.msg}` : item.msg];
    });
    if (messages.length > 0) {
      return messages.join(' ');
    }
  }

  switch (status) {
    case 400:
      return 'Please check your request and try again.';
    case 401:
      return 'Your session is no longer authorized. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested project or conversation could not be found.';
    case 422:
      return 'Some of the submitted information is invalid. Please check it and try again.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    default:
      return 'Request failed.';
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiError(
        'The request timed out. The backend may still finish processing it; check conversation history before resubmitting.',
        408
      );
    }
    if (error instanceof TypeError) {
      throw new ApiError(
        'Unable to reach StoryForge AI. Check your connection and make sure the backend is running.',
        0
      );
    }
    throw error;
  }

  if (!response.ok) {
    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      payload = undefined;
    }

    if (response.status === 401) {
      unauthorizedHandler?.(token);
    }

    throw new ApiError(getErrorMessage(response.status, payload), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export { API_BASE_URL };
