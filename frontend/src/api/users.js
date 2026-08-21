/**
 * Users API
 *
 * User data endpoint wrappers.
 * Follows the REST pattern defined in the task spec:
 *   - /users/{id}         → name + photo
 *   - /users/{id}/profile → about-me info
 *   - /users/{id}/bio     → recommendation factors
 *   - /me                 → shortcut for authenticated user
 */
import { apiFetch } from './client';

/** Get basic user info (name, photo) */
export function getUser(id) {
  return apiFetch(`/users/${id}`);
}

/** Get user profile (about-me, interests, location) */
export function getUserProfile(id) {
  return apiFetch(`/users/${id}/profile`);
}

/** Get user bio data (recommendation factors) */
export function getUserBio(id) {
  return apiFetch(`/users/${id}/bio`);
}

/** Get authenticated user's basic info */
export function getMe() {
  return apiFetch('/me');
}

/** Get authenticated user's profile */
export function getMyProfile() {
  return apiFetch('/me/profile');
}

/** Get authenticated user's bio data */
export function getMyBio() {
  return apiFetch('/me/bio');
}

/** Update authenticated user's profile */
export function updateProfile(data) {
  return apiFetch('/me/profile', {
    method: 'PUT',
    body: data,
  });
}

/**
 * Upload profile photo for authenticated user.
 *
 * @param {File} file - The image file
 * @returns {Promise<{url: string}>}
 */
export async function uploadUserPhoto(file) {
  const formData = new FormData();
  formData.append('photo', file);

  const token = localStorage.getItem('pawly_token');
  const response = await fetch('http://localhost:3000/me/photo', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to upload photo');
  }

  return response.json();
}

/**
 * Load full user data by combining multiple endpoints.
 * Used when you need the complete picture of a user.
 *
 * @param {number} id - User ID
 * @returns {Promise<{user, profile, bio}>}
 */
export async function getFullUser(id) {
  const [user, profile, bio] = await Promise.all([
    getUser(id),
    getUserProfile(id).catch(() => null),
    getUserBio(id).catch(() => null),
  ]);
  return { user, profile, bio };
}
