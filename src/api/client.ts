import { supabase } from '@/src/lib/supabase';

export class ApiError extends Error {
  status: number;
  /** The response was the website's HTML page, i.e. the API route itself is not deployed. */
  routeMissing: boolean;
  constructor(message: string, status: number, routeMissing = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.routeMissing = routeMissing;
  }
}

export function isRouteMissing(error: unknown): boolean {
  return error instanceof ApiError && error.routeMissing;
}

function apiBase(): string {
  const url = process.env.EXPO_PUBLIC_API_URL ?? '';
  if (!url.trim()) {
    throw new ApiError('Store URL is not configured.', 0);
  }
  return url.replace(/\/$/, '');
}

function looksLikeHtml(text: string): boolean {
  const start = text.trimStart().slice(0, 32).toLowerCase();
  return start.startsWith('<!doctype') || start.startsWith('<html');
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new ApiError(fallbackMessage, response.status);
    }
    return {} as T;
  }
  if (looksLikeHtml(text)) {
    throw new ApiError(fallbackMessage, response.status === 200 ? 502 : response.status || 502, response.status === 404);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(fallbackMessage, response.status || 502);
  }
}

async function accessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

type FetchOptions = {
  method?: 'GET' | 'POST';
  body?: unknown;
  auth?: boolean;
  fallbackMessage?: string;
  timeoutMs?: number;
  cache?: RequestCache;
};

async function rawFetch(path: string, options: FetchOptions, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth) {
    if (!token) {
      throw new ApiError('Please sign in.', 401);
    }
    headers.Authorization = `Bearer ${token}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? (options.method === 'POST' ? 45_000 : 25_000),
  );
  try {
    return await fetch(`${apiBase()}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
      cache: options.cache,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(NETWORK_MESSAGE, 0);
  } finally {
    clearTimeout(timeout);
  }
}

export const NETWORK_MESSAGE = "Can't reach the store. Try again.";

export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const fallback = options.fallbackMessage ?? "Can't load the shop";
  let token = options.auth ? await accessToken() : null;
  let response = await rawFetch(path, options, token);

  // A 401 from one store route must not end the session: Supabase clears it by itself
  // when the refresh token is truly invalid.
  if (options.auth && response.status === 401) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) {
      throw new ApiError('Please sign in.', 401);
    }
    token = data.session.access_token;
    response = await rawFetch(path, options, token);
    if (response.status === 401) {
      throw new ApiError('Please sign in.', 401);
    }
  }

  const json = await readJson<T & { error?: string }>(response, fallback);
  if (!response.ok) {
    throw new ApiError(typeof json.error === 'string' && json.error ? json.error : fallback, response.status);
  }
  return json as T;
}

export function shopUrl(): string {
  return apiBase();
}

export function isUnavailableStatus(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404 && !error.routeMissing;
}
