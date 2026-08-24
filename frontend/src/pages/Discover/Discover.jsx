/**
 * Discover (Main Page)
 *
 * Three view modes: Lists, Both, Map
 * Dynamic in-place Pet & Owner details panel (Wireframe Row 6 & 7 Left)
 * Multi-pet switcher floating bar for discovery search filtering
 * Park / Neighborhood clustering with numbered circle markers & flip-through popup carousel
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Navbar from '../../components/Navbar/Navbar';
import PetCard from '../../components/PetCard/PetCard';
import MatchRing from '../../components/MatchRing/MatchRing';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';

import { loadRecommendationCards, dismissRecommendation } from '../../api/recommendations';
import { sendConnectionRequest } from '../../api/connections';
import { getMyPets, getCachedMyPets, getSavedSelectedPetIds, saveSelectedPetIds } from '../../api/pets';
import { getMyProfile } from '../../api/users';
import { resolveLocationCoords } from '../../utils/locations';
import './Discover.css';

/** Floating "My Location" button inside Leaflet map */
function RecenterMapButton({ userLocation }) {
  const map = useMap();

  const handleRecenter = () => {
    const coords = userLocation || { lat: 60.1778, lng: 24.9247 };
    map.flyTo([coords.lat, coords.lng], 14, { duration: 1.0 });
  };

  return (
    <button
      type="button"
      className="discover__my-location-btn"
      onClick={handleRecenter}
      title="Go to My Location / Neighborhood"
      id="my-location-btn"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        <line x1="12" y1="1" x2="12" y2="5" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="1" y1="12" x2="5" y2="12" />
        <line x1="19" y1="12" x2="23" y2="12" />
      </svg>
    </button>
  );
}

// Custom Leaflet circular pet photo marker
const createCustomPetMarker = (photoUrl, petName, isSelected = false) => {
  const url = photoUrl || '/placeholder-pet.svg';
  return L.divIcon({
    className: `custom-pet-map-marker ${isSelected ? 'custom-pet-map-marker--active' : ''}`,
    html: `
      <div class="map-marker-pin ${isSelected ? 'map-marker-pin--active' : ''}">
        <img src="${url}" alt="${petName}" class="map-marker-img" />
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Park/Neighborhood Cluster Numbered Badge Marker (Wireframe green circle with number)
const createClusterMarker = (count) => {
  return L.divIcon({
    className: 'custom-cluster-marker',
    html: `<div class="cluster-marker-circle" title="${count} pets matched in this park">${count}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Helsinki default center
const DEFAULT_CENTER = [60.1699, 24.9384];
const DEFAULT_ZOOM = 12;

/** Component to fit map bounds ONCE when new pet recommendations load */
function MapBounds({ cards, resetBoundsKey }) {
  const map = useMap();
  const fittedKeyRef = useRef(null);

  useEffect(() => {
    if (cards.length > 0 && fittedKeyRef.current !== resetBoundsKey) {
      const bounds = cards
        .filter((c) => (c.pet?.latitude || c.latitude) && (c.pet?.longitude || c.longitude))
        .map((c) => [c.pet?.latitude || c.latitude, c.pet?.longitude || c.longitude]);
      if (bounds.length > 0) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        fittedKeyRef.current = resetBoundsKey;
      }
    }
  }, [cards, resetBoundsKey, map]);

  return null;
}

/** Component to dynamically fly & zoom towards selected pet's location when explicitly selected */
function FlyToPet({ selectedPet }) {
  const map = useMap();
  const lastSelectedIdRef = useRef(null);

  useEffect(() => {
    if (selectedPet && selectedPet.latitude && selectedPet.longitude) {
      if (lastSelectedIdRef.current !== selectedPet.id) {
        lastSelectedIdRef.current = selectedPet.id;
        const currentZoom = map.getZoom();
        const targetZoom = Math.max(currentZoom, 15);
        map.flyTo([selectedPet.latitude, selectedPet.longitude], targetZoom, {
          duration: 0.8,
        });
      }
    } else {
      lastSelectedIdRef.current = null;
    }
  }, [selectedPet, map]);

  return null;
}

/** Flip-through card carousel inside cluster popup */
function ClusterPopupContent({ pets, onConnect, onRemove, onSelectPet }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const safeIndex = Math.min(currentIndex, Math.max(0, pets.length - 1));
  const currentPet = pets[safeIndex] || pets[0];

  if (!pets || pets.length === 0 || !currentPet) return null;

  return (
    <div className="discover__popup-cluster-card">
      <PetCard
        pet={currentPet}
        matchPercentage={currentPet.match_percentage}
        distanceKm={currentPet.distance_km}
        onConnect={onConnect}
        onRemove={onRemove}
        onSelect={onSelectPet}
      />
      {pets.length > 1 && (
        <div className="cluster-popup-pagination">
          <button
            className="cluster-popup-nav-btn"
            onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : pets.length - 1))}
            id="cluster-prev-btn"
          >
            ◄ Previous
          </button>
          <span className="cluster-popup-count">
            {safeIndex + 1} of {pets.length}
          </span>
          <button
            className="cluster-popup-nav-btn"
            onClick={() => setCurrentIndex((prev) => (prev < pets.length - 1 ? prev + 1 : 0))}
            id="cluster-next-btn"
          >
            Next ►
          </button>
        </div>
      )}
    </div>
  );
}

export default function Discover() {
  const [view, setView] = useState('Both');
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPet, setSelectedPet] = useState(null);

  // User's own pets for multi-pet discovery switcher
  const [myPets, setMyPets] = useState(() => getCachedMyPets());
  const [selectedPetIds, setSelectedPetIds] = useState(() => getSavedSelectedPetIds([]));
  const [userLocation, setUserLocation] = useState({ lat: 60.1778, lng: 24.9247, name: 'Helsinki (Töölö)' });
  const [maxDistance, setMaxDistance] = useState(15);

  // Fetch user's own pets & profile location on mount
  useEffect(() => {
    async function fetchUserPetsAndLocation() {
      try {
        const [petsData, profData] = await Promise.all([
          getMyPets().catch(() => []),
          getMyProfile().catch(() => null),
        ]);
        if (petsData && petsData.length > 0) {
          const allIds = petsData.map((p) => p.id);
          setMyPets(petsData);
          setSelectedPetIds(getSavedSelectedPetIds(allIds));
        }
        if (profData && profData.location) {
          const coords = resolveLocationCoords(profData.location);
          setUserLocation({ ...coords, name: profData.location });
        }
      } catch {}
    }
    fetchUserPetsAndLocation();
  }, []);

  // Load recommendations whenever selectedPetIds or maxDistance changes
  const loadCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await loadRecommendationCards(selectedPetIds, maxDistance);
      setCards(data || []);
    } catch {
      setCards([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPetIds, maxDistance]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleTogglePet = (petId) => {
    setSelectedPetIds((prev) => {
      let updated;
      if (prev.includes(petId)) {
        if (prev.length === 1) return prev; // keep at least 1 selected
        updated = prev.filter((id) => id !== petId);
      } else {
        updated = [...prev, petId];
      }
      saveSelectedPetIds(updated);
      return updated;
    });
  };

  const handleConnect = async (petId) => {
    try {
      await sendConnectionRequest(petId);
    } catch {}
    setCards((prev) => prev.filter((c) => (c.pet?.id || c.id) !== petId));
    setSelectedPet((prev) => (prev && (prev.id === petId || prev.pet?.id === petId) ? null : prev));
  };

  const handleRemove = async (petId) => {
    try {
      await dismissRecommendation(petId);
    } catch {}
    setCards((prev) => prev.filter((c) => (c.pet?.id || c.id) !== petId));
    setSelectedPet((prev) => (prev && (prev.id === petId || prev.pet?.id === petId) ? null : prev));
  };

  const handleSelectPet = (petObj) => {
    const targetPet = petObj.pet || petObj;
    setSelectedPet(targetPet);
  };

  // Group pet cards by park/neighborhood location for map clustering
  const clusteredLocations = useMemo(() => {
    const clusters = {};
    cards.forEach((card) => {
      const pet = card.pet || card;
      if (!pet.latitude || !pet.longitude) return;

      // Group nearby coordinates (rounded to ~300-500m park level)
      const latGroup = (Math.round(pet.latitude * 150) / 150).toFixed(4);
      const lngGroup = (Math.round(pet.longitude * 150) / 150).toFixed(4);
      const key = `${latGroup}_${lngGroup}`;

      if (!clusters[key]) {
        clusters[key] = {
          key,
          latitude: pet.latitude,
          longitude: pet.longitude,
          pets: [],
        };
      }
      clusters[key].pets.push(pet);
    });
    return Object.values(clusters);
  }, [cards]);

  // Render Card Grid (Matches from highest to lowest score)
  const renderCardGrid = () => (
    <div className="discover__card-grid">
      {cards.map((card) => {
        const pet = card.pet || card;
        return (
          <PetCard
            key={pet.id}
            pet={pet}
            matchPercentage={card.match_percentage || pet.match_percentage}
            distanceKm={card.distance_km || pet.distance_km}
            onConnect={handleConnect}
            onRemove={handleRemove}
            onSelect={() => handleSelectPet(card)}
          />
        );
      })}
    </div>
  );

  // Render In-Place Pet Detail Panel matching Wireframe Row 6 & 7 Left
  const renderInPlacePetDetail = (pet) => {
    const ownerName = pet.owner_name || 'Santa Dow';
    const matchScore = pet.match_percentage || 92;

    return (
      <div className="in-place-pet-detail">
        {/* Top-Left Back Button */}
        <button
          className="in-place-pet-detail__back-btn"
          onClick={() => setSelectedPet(null)}
          id="pet-detail-back-btn"
        >
          ← Back
        </button>

        {/* Hero Photo & MatchRing */}
        <div className="in-place-pet-detail__hero">
          <img
            src={pet.pet_photo || '/placeholder-pet.svg'}
            alt={pet.pet_name}
            className="in-place-pet-detail__photo"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = pet.animal_type === 'cat'
                ? 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&auto=format&fit=crop&q=80'
                : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&auto=format&fit=crop&q=80';
            }}
          />
          <div className="in-place-pet-detail__ring">
            <MatchRing percentage={matchScore} size="lg" />
          </div>
        </div>

        {/* Pet Header */}
        <h1 className="in-place-pet-detail__name">{pet.pet_name}</h1>

        {/* Details Line */}
        <div className="in-place-pet-detail__meta">
          <span>{pet.animal_type ? pet.animal_type.toUpperCase() : 'DOG'}</span>
          <span>{pet.breed || 'French Bulldog'}</span>
          <span>{pet.size ? pet.size.toUpperCase() : 'SMALL'}</span>
          {pet.pet_age && <span>{pet.pet_age} YEARS</span>}
        </div>

        {/* Trait Chips */}
        <div className="in-place-pet-detail__chips">
          {pet.energy_level && (
            <span className="in-place-chip in-place-chip--energy">
              {pet.energy_level.toUpperCase()} ENERGY
            </span>
          )}
          {pet.temperament &&
            pet.temperament.map((t) => (
              <span key={t} className="in-place-chip">
                {t.toUpperCase()}
              </span>
            ))}
        </div>

        {/* Pet Bio */}
        {pet.about_me && (
          <p className="in-place-pet-detail__bio">{pet.about_me}</p>
        )}

        <hr className="in-place-divider" />

        {/* Owner Info Section matching Wireframe Row 7 Left */}
        <div className="in-place-owner-section">
          <div className="in-place-owner-header">
            <img
              src={pet.owner_photo || '/placeholder-user.svg'}
              alt={ownerName}
              className="in-place-owner-avatar"
            />
            <div>
              <h2 className="in-place-owner-title">
                {ownerName} <span className="in-place-owner-label">(Owner)</span>
              </h2>
              <div className="in-place-owner-status">
                <StatusBadge isOnline={true} size="sm" />
                <span>Online</span>
              </div>
            </div>
          </div>

          <p className="in-place-owner-bio">
            {pet.owner_bio ||
              'Hey, this is Santa! I enjoy hikes, especially in winter. Surely I love my pets. Send me a message if we connected!'}
          </p>

          <div className="in-place-owner-badges">
            <span className="in-place-badge in-place-badge--verified">✓ Verified user</span>
            <span className="in-place-badge">User since 2 years</span>
            <span className="in-place-badge">&lt; 4 km away</span>
            <span className="in-place-badge">100% response rate</span>
          </div>
        </div>

        {/* Connect & Remove Actions below Owner section */}
        <div className="in-place-pet-detail__actions">
          <Button variant="primary" onClick={() => handleConnect(pet.id)}>
            Connect
          </Button>
          <Button variant="secondary" onClick={() => handleRemove(pet.id)}>
            Remove
          </Button>
        </div>
      </div>
    );
  };

  // Render Leaflet Map with Park/Neighborhood Clustering
  // Renders Leaflet map with persistent overlay banner during empty states
  const renderMap = () => (
    <div className="discover__map-container">
      {cards.length === 0 && (
        <div className="discover__map-overlay-banner">
          {maxDistance >= 40
            ? 'No more paws found nearby today. Check back soon for new buddies!'
            : `No paws found within ${maxDistance} km today. Try expanding your distance radius, or check back later!`}
        </div>
      )}
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        className="discover__map"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Bounds, FlyTo, and Recenter controllers */}
        <MapBounds cards={cards} resetBoundsKey={selectedPetIds.join(',')} />
        <FlyToPet selectedPet={selectedPet} />
        <RecenterMapButton userLocation={userLocation} />

        {clusteredLocations.map((cluster) => {
          const isSingle = cluster.pets.length === 1;
          const mainPet = cluster.pets[0];
          const isSelected = selectedPet && selectedPet.id === mainPet.id;

          const markerIcon = isSingle
            ? createCustomPetMarker(mainPet.pet_photo, mainPet.pet_name, isSelected)
            : createClusterMarker(cluster.pets.length);

          return (
            <Marker
              key={cluster.key}
              position={[cluster.latitude, cluster.longitude]}
              icon={markerIcon}
              eventHandlers={{
                click: (e) => {
                  const marker = e.target;
                  const map = marker._map;
                  if (map) {
                    const targetZoom = map.getZoom() < 15 ? 15 : map.getZoom();
                    // Offset latitude slightly north (+0.003) so the popup pet card (above the marker) is vertically centered
                    map.flyTo([cluster.latitude + 0.007, cluster.longitude], targetZoom, { duration: 0.8 });
                    marker.openPopup();
                  }
                  if (isSingle) {
                    setSelectedPet(mainPet);
                  }
                },
              }}
            >
              <Popup maxWidth={320} autoPan={true} className="discover__map-popup">
                <ClusterPopupContent
                  pets={cluster.pets}
                  onConnect={handleConnect}
                  onRemove={handleRemove}
                  onSelectPet={handleSelectPet}
                />
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );

  return (
    <div className="discover" id="discover-page">
      <Navbar
        showViewToggle={true}
        currentView={view}
        onViewChange={setView}
        myPets={myPets}
        selectedPetIds={selectedPetIds}
        onTogglePet={handleTogglePet}
      />

      <div className="discover__filter-toolbar">
        <div className="discover__distance-box">
          <label htmlFor="distance-radius-select" className="discover__distance-label">
            Distance Radius:
          </label>
          <select
            id="distance-radius-select"
            value={maxDistance}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="discover__distance-select"
          >
            <option value={1}>Within 1 km</option>
            <option value={5}>Within 5 km</option>
            <option value={10}>Within 10 km</option>
            <option value={15}>Within 15 km</option>
            <option value={25}>Within 25 km</option>
            <option value={40}>Within 40 km</option>
          </select>
        </div>
      </div>

      <main className={`discover__content discover__content--${view.toLowerCase()}`}>
        {loading ? (
          <div className="discover__loading">
            <div className="discover__spinner" />
            <p>Finding playmates nearby...</p>
          </div>
        ) : error ? (
          <div className="discover__error">
            <p>{error}</p>
            <Button onClick={loadCards}>Try Again</Button>
          </div>
        ) : cards.length === 0 && view === 'Lists' ? (
          <div className="discover__empty">
            <h2>
              {maxDistance >= 40
                ? 'No more paws found nearby today'
                : `No paws found within ${maxDistance} km today`}
            </h2>
            <p>
              {maxDistance >= 40
                ? 'Looks like you have seen all local playmates for now. Take a stroll with your pet and check back soon for new buddies!'
                : 'Looks like all local playmates in this radius have been explored for now. Try expanding your distance radius, or check back later!'}
            </p>
          </div>
        ) : (
          <>
            {/* LISTS ONLY VIEW */}
            {view === 'Lists' && (selectedPet ? renderInPlacePetDetail(selectedPet) : renderCardGrid())}

            {/* MAP ONLY VIEW */}
            {view === 'Map' && renderMap()}

            {/* BOTH SPLIT VIEW */}
            {view === 'Both' && (
              <div className="discover__split">
                <div className="discover__split-list">
                  {cards.length === 0 ? (
                    <div className="discover__empty" style={{ margin: 'auto' }}>
                      <h2>
                        {maxDistance >= 40
                          ? 'No more paws found nearby today'
                          : `No paws found within ${maxDistance} km today`}
                      </h2>
                      <p>
                        {maxDistance >= 40
                          ? 'Looks like you have seen all local playmates for now. Check back soon for new buddies!'
                          : 'Try expanding your distance radius above, or check back later!'}
                      </p>
                    </div>
                  ) : selectedPet ? (
                    renderInPlacePetDetail(selectedPet)
                  ) : (
                    renderCardGrid()
                  )}
                </div>
                <div className="discover__split-map">
                  {renderMap()}
                </div>
              </div>
            )}
          </>
        )}
      </main>


    </div>
  );
}
