/**
 * Pets API
 *
 * Pet CRUD endpoint wrappers.
 */
import { apiFetch } from './client';

/** Get a specific pet by ID */
export function getPet(id) {
  return apiFetch(`/pets/${id}`);
}

/** Get all pets owned by the authenticated user */
export async function getMyPets() {
  const pets = await apiFetch('/me/pets');
  if (Array.isArray(pets) && pets.length > 0) {
    setCachedMyPets(pets);
  }
  return pets;
}

/** Retrieve cached my pets from localStorage */
export function getCachedMyPets() {
  try {
    const raw = localStorage.getItem('pawly_cached_my_pets');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
}

/** Save my pets to localStorage cache */
export function setCachedMyPets(pets) {
  try {
    localStorage.setItem('pawly_cached_my_pets', JSON.stringify(pets));
  } catch {}
}

/**
 * Retrieve saved selected pet IDs from localStorage.
 * Defaults to all pet IDs if none saved or invalid.
 */
export function getSavedSelectedPetIds(allPetIds = []) {
  try {
    const raw = localStorage.getItem('pawly_selected_pet_ids');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        if (allPetIds && allPetIds.length > 0) {
          const valid = parsed.filter((id) => allPetIds.includes(id));
          if (valid.length > 0) return valid;
        } else {
          return parsed;
        }
      }
    }
  } catch {}
  return allPetIds;
}

/**
 * Save selected pet IDs to localStorage.
 */
export function saveSelectedPetIds(petIds) {
  try {
    localStorage.setItem('pawly_selected_pet_ids', JSON.stringify(petIds));
  } catch {}
}

/** Create a new pet */
export function createPet(data) {
  return apiFetch('/pets', {
    method: 'POST',
    body: data,
  });
}

/** Update an existing pet */
export function updatePet(id, data) {
  return apiFetch(`/pets/${id}`, {
    method: 'PUT',
    body: data,
  });
}

/** Delete a pet */
export function deletePet(id) {
  return apiFetch(`/pets/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Upload a pet photo.
 * Uses FormData instead of JSON since we're sending a file.
 *
 * @param {number} petId - Pet ID to upload photo for
 * @param {File} file - The image file
 * @returns {Promise<{url: string}>} The uploaded photo URL
 */
export async function uploadPetPhoto(petId, file) {
  const formData = new FormData();
  formData.append('photo', file);

  const headers = {};
  const token = localStorage.getItem('pawly_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`http://localhost:3000/pets/${petId}/photo`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to upload photo');
  }

  return response.json();
}
