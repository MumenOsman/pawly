/**
 * Recommendations API
 *
 * Endpoint wrappers for the recommendation system.
 * Key design: /recommendations returns only IDs. We must fetch
 * user + bio data separately for each, then combine into cards.
 */
import { apiFetch } from './client';
import { getUser, getUserBio } from './users';

/** Get recommendation cards, optionally filtered by active pet IDs */
export function getRecommendations(petIds = []) {
  const query = petIds && petIds.length > 0 ? `?pet_ids=${petIds.join(',')}` : '';
  return apiFetch(`/recommendations${query}`);
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
 * @returns {Promise<Array>} Array of recommendation cards
 */
export async function loadRecommendationCards(petIds = []) {
  const recommendations = await getRecommendations(petIds);
  if (!recommendations || !Array.isArray(recommendations)) {
    return [];
  }
  return recommendations;
}
