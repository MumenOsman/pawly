/**
 * API Client
 *
 * Base fetch wrapper used by all API modules.
 * - Automatically attaches JWT from localStorage
 * - Handles JSON request/response
 * - Throws ApiError on non-OK responses
 */

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';

/**
 * Custom error class for API responses.
 * Carries the HTTP status code and server error message.
 */
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export interface ApiFetchOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
}

/**
 * Core fetch wrapper.
 */
export async function apiFetch(endpoint: string, options: ApiFetchOptions = {}): Promise<any> {
  const token = localStorage.getItem('pawly_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  // Attach JWT if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method: options.method || 'GET',
    headers,
  };

  // Serialize body for non-GET requests
  if (options.body && config.method !== 'GET') {
    config.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle no-content responses
  if (response.status === 204) {
    return null;
  }

  // Parse JSON response
  let data: any;
  try {
    data = await response.json();
  } catch {
    // Response wasn't JSON
    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }
    return null;
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data?.error || data?.message || response.statusText,
      data
    );
  }

  return data;
}
