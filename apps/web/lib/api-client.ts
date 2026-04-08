import { ApiResponse } from '@rental/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
  // Also set cookie for middleware
  document.cookie = `auth_token=${token}; path=/; max-age=${8 * 3600}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem('auth_token');
  document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    // Only set Content-Type for requests that have a body
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    const err = new Error(json.error?.message ?? 'Request failed');
    (err as any).code = json.error?.code;
    (err as any).status = res.status;
    throw err;
  }

  return json.data as T;
}

// Multipart upload
export async function uploadFile(path: string, formData: FormData): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error?.message ?? 'Upload failed');
  }
  return json.data;
}

// Typed API client
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
