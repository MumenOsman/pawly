/**
 * Auth API
 *
 * Authentication endpoint wrappers.
 * Token storage is handled here so the rest of the app
 * just calls login/register/logout.
 */
import { apiFetch } from './client';

const TOKEN_KEY = 'pawly_token';

/**
 * Register a new account.
 * @param {string} email
 * @param {string} password
 * @param {object} [extraData] - username, owner_name, date_of_birth
 * @returns {Promise<{token: string}>}
 */
export async function register(email, password, extraData = {}) {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: { email, password, ...extraData },
  });
  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    window.dispatchEvent(new Event('pawly_auth_changed'));
  }
  return data;
}

/**
 * Login with existing credentials.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string}>}
 */
export async function login(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  if (data.token) {
    localStorage.setItem(TOKEN_KEY, data.token);
    window.dispatchEvent(new Event('pawly_auth_changed'));
  }
  return data;
}

/**
 * Logout — clear the stored token.
 * No server call needed since JWT is stateless.
 */
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('pawly_auth_changed'));
}

/**
 * Check if a token exists in storage.
 * @returns {boolean}
 */
export function isLoggedIn() {
  return !!localStorage.getItem(TOKEN_KEY);
}

/**
 * Get the stored token.
 * @returns {string|null}
 */
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
