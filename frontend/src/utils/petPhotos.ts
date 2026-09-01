/**
 * Pet Photos & Avatar Utility
 *
 * Provides full URL resolution for uploaded media and a diverse, deterministic
 * pool of fallback avatars for pets without custom uploaded photos.
 */

export const DOG_FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=600&auto=format&fit=crop&q=80',
];

export const CAT_FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=600&auto=format&fit=crop&q=80',
];

export const SMALL_PET_FALLBACK_PHOTOS = [
  'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=600&auto=format&fit=crop&q=80',
];

/**
 * Returns a stable, distinct fallback photo URL based on pet ID, animal type, or name.
 */
export function getDefaultPetPhoto(petId: any = 0, animalType: string = 'dog', petName: string = '') {
  const type = (animalType || 'dog').toLowerCase();
  let pool = DOG_FALLBACK_PHOTOS;
  if (type === 'cat') {
    pool = CAT_FALLBACK_PHOTOS;
  } else if (type === 'rabbit' || type === 'small_pet' || type === 'bird') {
    pool = SMALL_PET_FALLBACK_PHOTOS;
  }

  let seed = Number(petId) || 0;
  if (!seed && petName) {
    seed = petName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }
  const idx = Math.abs(seed) % pool.length;
  return pool[idx];
}

/**
 * Resolves full URL for backend uploaded photos (/uploads/...) or returns fallback.
 */
export function getFullPhotoUrl(url?: string | null, fallback: string = '') {
  if (!url || url === '/paw-icon.svg' || url === '/placeholder-pet.svg' || url === '/placeholder-user.svg') {
    return fallback || url || '/placeholder-pet.svg';
  }
  if (url.startsWith('/uploads')) {
    return `http://localhost:3000${url}`;
  }
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }
  return fallback || url;
}
