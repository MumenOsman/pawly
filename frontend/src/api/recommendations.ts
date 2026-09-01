import { apiFetch } from './client';
import { getUser, getUserProfile } from './users';
import { getPet } from './pets';

/** Get recommendation IDs, optionally filtered by active pet IDs and max distance */
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
 * /recommendations returns only IDs [{ id: 1 }, ...].
 * This function fetches the pet and user details per card in parallel.
 *
 * @param {Array<number>} petIds - Optional active pet IDs for filtering
 * @param {number|null} maxDistance - Optional max distance radius (1 to 40 km)
 * @returns {Promise<Array>} Array of fully hydrated recommendation cards
 */
export async function loadRecommendationCards(petIds = [], maxDistance = null) {
  const recommendations = await getRecommendations(petIds, maxDistance);
  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    return [];
  }

  // Hydrate each recommended pet ID
  const cards = await Promise.all(
    recommendations.map(async (rec) => {
      const petId = typeof rec === 'number' ? rec : rec.id;
      if (!petId) return null;

      try {
        const pet = await getPet(petId);
        if (!pet) return null;

        let ownerName = 'Pet Owner';
        let ownerPhoto = '';
        let ownerBio = '';

        if (pet.owner_id) {
          try {
            const [userBasic, userProfile] = await Promise.all([
              getUser(pet.owner_id).catch(() => null),
              getUserProfile(pet.owner_id).catch(() => null),
            ]);

            if (userBasic) {
              ownerName = userBasic.owner_name || ownerName;
              ownerPhoto = userBasic.owner_photo || ownerPhoto;
            }
            if (userProfile) {
              ownerName = userProfile.owner_name || ownerName;
              ownerPhoto = userProfile.owner_photo || ownerPhoto;
              ownerBio = userProfile.about_me || ownerBio;
            }
          } catch {}
        }

        return {
          id: pet.id,
          owner_id: pet.owner_id,
          pet_name: pet.pet_name,
          animal_type: pet.animal_type,
          breed: pet.breed,
          size: pet.size,
          about_me: pet.about_me,
          pet_photo: pet.pet_photo,
          photos: pet.photos || (pet.pet_photo ? [pet.pet_photo] : []),
          energy_level: pet.energy_level,
          pet_age: pet.pet_age,
          temperament: pet.temperament || [],
          latitude: pet.latitude,
          longitude: pet.longitude,
          owner_name: ownerName,
          owner_photo: ownerPhoto,
          owner_bio: ownerBio,
          match_percentage: rec.match_percentage || 85,
          distance_km: rec.distance_km || 2.5,
          pet,
        };
      } catch {
        return null;
      }
    })
  );

  return cards.filter(Boolean);
}
