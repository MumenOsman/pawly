/**
 * API Client
 *
 * Base fetch wrapper used by all API modules.
 * - Automatically attaches JWT from localStorage
 * - Handles JSON request/response
 * - Throws ApiError on non-OK responses
 *
 * Usage:
 *   import { apiFetch } from './client';
 *   const user = await apiFetch('/users/1');
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Custom error class for API responses.
 * Carries the HTTP status code and server error message.
 */
export class ApiError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core fetch wrapper.
 *
 * @param {string} endpoint - API path (e.g. '/users/1')
 * @param {object} options - Fetch options override
 * @param {string} options.method - HTTP method (default: 'GET')
 * @param {object} options.body - Request body (auto-serialized to JSON)
 * @param {object} options.headers - Additional headers
 * @returns {Promise<any>} Parsed JSON response
 * @throws {ApiError} On non-OK responses
 */
export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('pawly_token');

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach JWT if available
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method: options.method || 'GET',
    headers,
  };

  // Serialize body for non-GET requests
  if (options.body && config.method !== 'GET') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  // Handle no-content responses
  if (response.status === 204) {
    return null;
  }

  // Parse JSON response
  let data;
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
      data.error || data.message || response.statusText,
      data
    );
  }

  return data;
}
