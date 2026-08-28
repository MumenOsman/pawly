/**
 * Locations Utility
 *
 * Dynamic Global Place Search & Geocoding using OpenStreetMap (Nominatim) & Photon.
 * Provides real-time autocomplete suggestions and GPS coordinates for ANY city or address globally with ZERO hardcoded restrictions.
 */

// Popular suggestions when input is empty
export const POPULAR_LOCATIONS = [
  { name: 'Helsinki, Finland', lat: 60.1699, lng: 24.9384 },
  { name: 'Espoo, Finland', lat: 60.2055, lng: 24.6559 },
  { name: 'Tampere, Finland', lat: 61.4978, lng: 23.7610 },
  { name: 'Vantaa, Finland', lat: 60.2934, lng: 25.0378 },
  { name: 'Oulu, Finland', lat: 65.0121, lng: 25.4651 },
  { name: 'Turku, Finland', lat: 60.4518, lng: 22.2666 },
  { name: 'Jyväskylä, Finland', lat: 62.2426, lng: 25.7473 },
  { name: 'Vaasa, Finland', lat: 63.0960, lng: 21.6158 },
  { name: 'Seinäjoki, Finland', lat: 62.7877, lng: 22.8404 },
  { name: 'Stockholm, Sweden', lat: 59.3293, lng: 18.0686 },
  { name: 'Oslo, Norway', lat: 59.9139, lng: 10.7522 },
  { name: 'Copenhagen, Denmark', lat: 55.6761, lng: 12.5683 },
];

export const FINNISH_LOCATIONS = POPULAR_LOCATIONS;

const geoCache = new Map();

/**
 * Live search for any city/location globally.
 * Returns array of { name, lat, lng }
 */
export async function searchLocations(query) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return POPULAR_LOCATIONS;
  }

  const cleanQuery = query.trim();
  const cacheKey = `search_${cleanQuery.toLowerCase()}`;
  if (geoCache.has(cacheKey)) {
    return geoCache.get(cacheKey);
  }

  // 1. Query OpenStreetMap Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&addressdetails=1&limit=6`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en,fi,sv',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const results = data.map((item) => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || item.name || '';
          const state = addr.state || '';
          const country = addr.country || '';

          // Format clean readable display name like "Stockholm, Sweden" or "Vaasa, Finland"
          let displayName = item.display_name;
          const parts = [city];
          if (state && state !== city) parts.push(state);
          if (country) parts.push(country);
          if (parts.filter(Boolean).length >= 2) {
            displayName = parts.filter(Boolean).join(', ');
          }

          return {
            name: displayName,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          };
        });

        geoCache.set(cacheKey, results);
        return results;
      }
    }
  } catch (err) {
    console.warn('Nominatim search error, trying Photon fallback:', err);
  }

  // 2. Fallback to Photon (fast global OSM geocoder)
  try {
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(cleanQuery)}&limit=6`;
    const response = await fetch(photonUrl);
    if (response.ok) {
      const data = await response.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        const results = data.features.map((f) => {
          const props = f.properties || {};
          const city = props.city || props.name || props.county || '';
          const country = props.country || '';
          const displayName = country ? `${city}, ${country}` : (props.name || city);
          const [lng, lat] = f.geometry.coordinates;
          return {
            name: displayName,
            lat,
            lng,
          };
        });
        geoCache.set(cacheKey, results);
        return results;
      }
    }
  } catch (err) {
    console.warn('Photon search fallback failed:', err);
  }

  // 3. Fallback to local filter if network fails
  const lower = cleanQuery.toLowerCase();
  const localMatches = POPULAR_LOCATIONS.filter((loc) =>
    loc.name.toLowerCase().includes(lower)
  );
  return localMatches.length > 0 ? localMatches : POPULAR_LOCATIONS.slice(0, 5);
}

/**
 * Dynamically resolves any location string (city, district, address) to { lat, lng }.
 */
export async function geocodeLocation(locationName) {
  if (!locationName || typeof locationName !== 'string') {
    return { lat: 60.1699, lng: 24.9384 };
  }

  const query = locationName.trim();
  const lowerQuery = query.toLowerCase();

  // 1. Check in-memory cache
  if (geoCache.has(lowerQuery)) {
    return geoCache.get(lowerQuery);
  }

  // 2. Check predefined dictionary
  const exact = POPULAR_LOCATIONS.find(
    (loc) => loc.name.toLowerCase() === lowerQuery
  );
  if (exact) {
    const coords = { lat: exact.lat, lng: exact.lng };
    geoCache.set(lowerQuery, coords);
    return coords;
  }

  // 3. Fast Geocoding via Photon (No CORS restrictions, global coverage)
  try {
    const cleanCity = query.split(',')[0].trim();
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(photonUrl);
    if (res.ok) {
      const data = await res.json();
      if (data?.features?.[0]?.geometry?.coordinates) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        const coords = { lat: Number(lat), lng: Number(lng) };
        geoCache.set(lowerQuery, coords);
        return coords;
      }
    }
    if (cleanCity && cleanCity.toLowerCase() !== lowerQuery) {
      const res2 = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(cleanCity)}&limit=1`);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2?.features?.[0]?.geometry?.coordinates) {
          const [lng, lat] = data2.features[0].geometry.coordinates;
          const coords = { lat: Number(lat), lng: Number(lng) };
          geoCache.set(lowerQuery, coords);
          return coords;
        }
      }
    }
  } catch {}

  // 4. OpenStreetMap Nominatim Fallback
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en,fi,sv',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const coords = {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
        geoCache.set(lowerQuery, coords);
        return coords;
      }
    }
  } catch (err) {
    console.warn('Nominatim geocoding failed:', err);
  }

  return { lat: 60.1699, lng: 24.9384 };
}

/**
 * Synchronous resolver for immediate rendering.
 */
export function resolveLocationCoords(locationName) {
  if (!locationName) return { lat: 60.1699, lng: 24.9384 };
  const lowerQuery = locationName.trim().toLowerCase();

  if (geoCache.has(lowerQuery)) {
    return geoCache.get(lowerQuery);
  }

  const match = POPULAR_LOCATIONS.find(
    (loc) => loc.name.toLowerCase() === lowerQuery || loc.name.toLowerCase().includes(lowerQuery)
  );
  if (match) return { lat: match.lat, lng: match.lng };

  return { lat: 60.1699, lng: 24.9384 };
}

/**
 * Reverse geocodes device GPS coordinates (lat, lng) to a friendly city/neighborhood name.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en,fi,sv',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const addr = data.address || {};
      const city = addr.city || addr.town || addr.municipality || addr.village || addr.suburb || 'Helsinki';
      const country = addr.country || '';
      return country ? `${city}, ${country}` : city;
    }
  } catch (err) {
    console.warn('Reverse geocoding error:', err);
  }

  return 'Helsinki, Finland';
}
