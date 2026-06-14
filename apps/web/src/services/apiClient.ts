import { API_ROOT } from './config';

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

function getApiErrorMessage(payload: unknown, status: number) {
  if (typeof payload !== 'object' || !payload) {
    return `Request failed with status ${status}`;
  }

  const error = 'error' in payload ? String((payload as { error: unknown }).error) : `Request failed with status ${status}`;
  const details = 'details' in payload ? (payload as { details: unknown }).details : null;

  if (!details || typeof details !== 'object') return error;

  const detailMessages = Object.entries(details as Record<string, unknown>)
    .flatMap(([field, messages]) => {
      if (!Array.isArray(messages) || messages.length === 0) return [];
      return [`${field}: ${messages.join(', ')}`];
    });

  return detailMessages.length > 0 ? `${error} (${detailMessages.join('; ')})` : error;
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(path: string, query?: RequestOptions['query']) {
  const url = new URL(`${API_ROOT}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
}

export async function apiClient<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, query, ...init } = options;
  const isFormData = body instanceof FormData;

  const response = await fetch(buildUrl(path, query), {
    credentials: 'include',
    cache: 'no-store',
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('hypercard:session-expired'));
    }
    throw new ApiError(getApiErrorMessage(payload, response.status), response.status, payload);
  }

  return payload as T;
}
