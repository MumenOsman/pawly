/**
 * Recommendations API
 *
 * Endpoint wrappers for the recommendation system.
 * Key design: /recommendations returns only IDs. We must fetch
 * user + bio data separately for each, then combine into cards.
 */
import { apiFetch } from './client';
import { getUser, getUserBio } from './users';

/** Get recommendation cards, optionally filtered by active pet IDs and max distance */
export function getRecommendations(petIds = [], maxDistance = null) {
  const params = new URLSearchParams();
  if (petIds && petIds.length > 0) {
    params.set('pet_ids', petIds.join(','));
  }
  if (maxDistance !== null && maxDistance !== undefined) {
    params.set('max_distance', maxDistance);
  }
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return apiFetch(`/recommendations${queryString}`);
}

/** Dismiss a recommendation so it doesn't reappear */
export function dismissRecommendation(id) {
  return apiFetch(`/recommendations/${id}/dismiss`, {
    method: 'POST',
  });
}

/**
 * Load fully hydrated recommendation cards.
 *
 * @param {Array<number>} petIds - Optional active pet IDs for filtering
 * @param {number|null} maxDistance - Optional max distance radius (1 to 40 km)
 * @returns {Promise<Array>} Array of recommendation cards
 */
export async function loadRecommendationCards(petIds = [], maxDistance = null) {
  const recommendations = await getRecommendations(petIds, maxDistance);
  if (!recommendations || !Array.isArray(recommendations)) {
    return [];
  }
  return recommendations;
}
