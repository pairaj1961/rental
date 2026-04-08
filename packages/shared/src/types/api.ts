export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: unknown;
  } | null;
  meta: {
    page?: number;
    limit?: number;
    total?: number;
    [key: string]: unknown;
  } | null;
}

export function successResponse<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return { success: true, data, error: null, meta: meta ?? null };
}

export function errorResponse(
  code: string,
  message: string,
  details?: unknown,
): ApiResponse<never> {
  return { success: false, data: null, error: { code, message, details }, meta: null };
}
