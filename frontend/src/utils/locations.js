/**
 * Locations Utility
 *
 * Dictionary of Finnish cities and neighborhood coordinates.
 * Provides lookup and geocoding helper functions for location updating.
 */

export const FINNISH_LOCATIONS = [
  { name: 'Helsinki (Töölö)', lat: 60.1778, lng: 24.9247 },
  { name: 'Helsinki (Kallio)', lat: 60.1833, lng: 24.9533 },
  { name: 'Helsinki (Punavuori)', lat: 60.1611, lng: 24.9389 },
  { name: 'Helsinki (Eira)', lat: 60.1556, lng: 24.9389 },
  { name: 'Helsinki (Tali)', lat: 60.2117, lng: 24.8583 },
  { name: 'Helsinki (Pitäjänmäki)', lat: 60.2233, lng: 24.8583 },
  { name: 'Helsinki (Lauttasaari)', lat: 60.1583, lng: 24.8783 },
  { name: 'Espoo (Tapiola)', lat: 60.1767, lng: 24.8050 },
  { name: 'Vantaa (Tikkurila)', lat: 60.2933, lng: 25.0417 },
  { name: 'Kuopio (Center)', lat: 62.8924, lng: 27.6770 },
  { name: 'Kuopio (Puijo)', lat: 62.9083, lng: 27.6550 },
  { name: 'Kuopio (Väinölänniemi)', lat: 62.8867, lng: 27.7000 },
  { name: 'Kuopio (Saaristokaupunki)', lat: 62.8550, lng: 27.6833 },
  { name: 'Tampere (Center)', lat: 61.4978, lng: 23.7610 },
  { name: 'Tampere (Pyynikki)', lat: 61.4933, lng: 23.7333 },
  { name: 'Tampere (Hatanpää)', lat: 61.4817, lng: 23.7550 },
  { name: 'Turku (Center)', lat: 60.4518, lng: 22.2666 },
  { name: 'Turku (Ruissalo)', lat: 60.4333, lng: 22.1667 },
  { name: 'Oulu (Center)', lat: 65.0121, lng: 25.4651 },
  { name: 'Rovaniemi (Center)', lat: 66.5039, lng: 25.7294 },
  { name: 'Porvoo', lat: 60.3923, lng: 25.6651 },
  { name: 'Lahti', lat: 60.9827, lng: 25.6612 },
  { name: 'Jyväskylä', lat: 62.2426, lng: 25.7473 },
];

/**
 * Resolve a location string to coordinates (lat, lng).
 * Checks exact match first, then partial case-insensitive match,
 * defaulting to Helsinki (Töölö) if unknown.
 */
export function resolveLocationCoords(locationName) {
  if (!locationName) return { lat: 60.1778, lng: 24.9247 };

  const query = locationName.trim().toLowerCase();

  // 1. Exact match
  const exact = FINNISH_LOCATIONS.find(
    (loc) => loc.name.toLowerCase() === query
  );
  if (exact) return { lat: exact.lat, lng: exact.lng };

  // 2. Partial match (e.g. "Kuopio" matches "Kuopio (Center)")
  const partial = FINNISH_LOCATIONS.find(
    (loc) => loc.name.toLowerCase().includes(query) || query.includes(loc.name.toLowerCase().split(' ')[0])
  );
  if (partial) return { lat: partial.lat, lng: partial.lng };

  // Default fallback
  return { lat: 60.1778, lng: 24.9247 };
}
