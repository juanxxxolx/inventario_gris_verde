import type { CsrfResponse, ProblemDetails } from '@induinventory/contracts';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal | undefined;
}

const UNSAFE_METHODS = new Set<HttpMethod>(['POST', 'PUT', 'PATCH', 'DELETE']);
const DEFAULT_BASE_URL = '/api';

let cachedCsrfToken: string | undefined;

export class ApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetails | undefined;

  constructor(status: number, problem: ProblemDetails | undefined) {
    super(problem?.detail ?? `La API respondió con el estado HTTP ${status}.`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
  }
}

function baseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const value = configured && configured.length > 0 ? configured : DEFAULT_BASE_URL;
  return value.replace(/\/$/, '');
}

async function readProblem(response: Response): Promise<ProblemDetails | undefined> {
  const contentType = response.headers?.get('content-type') ?? '';
  if (!contentType.includes('json')) {
    return undefined;
  }

  try {
    return (await response.json()) as ProblemDetails;
  } catch {
    return undefined;
  }
}

async function getCsrfToken(signal?: AbortSignal): Promise<string> {
  if (cachedCsrfToken) {
    return cachedCsrfToken;
  }

  const response = await fetch(`${baseUrl()}/auth/csrf`, {
    method: 'GET',
    credentials: 'include',
    signal: signal ?? null,
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  const data = (await response.json()) as CsrfResponse;
  cachedCsrfToken = data.csrfToken;
  return data.csrfToken;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = {};

  if (options.body !== undefined) {
    headers['content-type'] = 'application/json';
  }

  if (UNSAFE_METHODS.has(method)) {
    headers['x-csrf-token'] = await getCsrfToken(options.signal);
  }

  const response = await fetch(`${baseUrl()}${path}`, {
    method,
    headers,
    credentials: 'include',
    signal: options.signal ?? null,
    body: options.body === undefined ? null : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new ApiError(response.status, await readProblem(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> => request<T>(path, { ...options, method: 'POST', body }),
};

export function setCsrfToken(token: string): void {
  cachedCsrfToken = token;
}
