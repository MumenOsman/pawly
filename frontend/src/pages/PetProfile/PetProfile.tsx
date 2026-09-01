/**
 * PetProfile — Full detail view of a single pet
 * Matches wireframe row 6 (left) and row 7 (left).
 */
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import Navbar from '../../components/Navbar/Navbar';
import MatchRing from '../../components/MatchRing/MatchRing';
import StatusBadge from '../../components/StatusBadge/StatusBadge';
import Button from '../../components/Button/Button';
import { getUser, getUserBio } from '../../api/users';
import { getPet } from '../../api/pets';
import { sendConnectionRequest } from '../../api/connections';
import { dismissRecommendation } from '../../api/recommendations';
import './PetProfile.css';

const createCustomPetMarker = (photoUrl, petName) => {
  const url = photoUrl || '/placeholder-pet.svg';
  return L.divIcon({
    className: 'custom-pet-map-marker',
    html: `
      <div class="map-marker-pin">
        <img src="${url}" alt="${petName}" class="map-marker-img" />
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
};

export default function PetProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pet, setPet] = useState(null);
  const [owner, setOwner] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const petData = await getPet(id);
        setPet(petData);
        if (petData.owner_id) {
          const ownerData = await getUser(petData.owner_id);
          setOwner(ownerData);
        }
      } catch {
        // Use mock if backend unavailable
        setPet(getMockPet(id));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      await sendConnectionRequest(pet.id);
      navigate('/connections');
    } catch {
      // Backend may not be ready
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemove = async () => {
    try {
      await dismissRecommendation(pet.id);
    } catch {}
    navigate('/discover');
  };

  const formatType = (type) => {
    if (type === 'small_pet') return 'Small Pet';
    return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
  };

  if (loading) {
    return (
      <div className="pet-profile">
        <Navbar />
        <div className="pet-profile__loading">
          <div className="pet-profile__spinner" />
        </div>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="pet-profile">
        <Navbar />
        <div className="pet-profile__error">
          <h2>Pet not found</h2>
          <Button onClick={() => navigate('/discover')}>Back to Discover</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pet-profile" id="pet-profile-page">
      <Navbar />

      <main className="pet-profile__content">
        {/* Back button */}
        <button className="pet-profile__back" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <div className="pet-profile__layout">
          {/* Left: Pet info */}
          <div className="pet-profile__main">
            {/* Hero photo */}
            <div className="pet-profile__hero">
              <img
                src={pet.pet_photo || '/placeholder-pet.svg'}
                alt={pet.pet_name}
                className="pet-profile__photo"
              />
              {pet.match_percentage && (
                <div className="pet-profile__match">
                  <MatchRing percentage={pet.match_percentage || 85} size="lg" />
                </div>
              )}
            </div>

            {/* Name & basic info */}
            <div className="pet-profile__header">
              <h1 className="pet-profile__name">{pet.pet_name}</h1>
              {owner && (
                <div className="pet-profile__owner">
                  <img
                    src={owner.owner_photo_url || '/placeholder-user.svg'}
                    alt={owner.owner_name}
                    className="pet-profile__owner-photo"
                  />
                  <span className="pet-profile__owner-name">{owner.owner_name}</span>
                  <StatusBadge isOnline={false} size="sm" />
                </div>
              )}
            </div>

            {/* Details grid */}
            <div className="pet-profile__details">
              <div className="pet-profile__detail">
                <span className="pet-profile__detail-label">Type</span>
                <span className="pet-profile__detail-value">{formatType(pet.animal_type)}</span>
              </div>
              {pet.breed && (
                <div className="pet-profile__detail">
                  <span className="pet-profile__detail-label">Breed</span>
                  <span className="pet-profile__detail-value">{pet.breed}</span>
                </div>
              )}
              <div className="pet-profile__detail">
                <span className="pet-profile__detail-label">Size</span>
                <span className="pet-profile__detail-value">{pet.size}</span>
              </div>
              {pet.pet_age > 0 && (
                <div className="pet-profile__detail">
                  <span className="pet-profile__detail-label">Age</span>
                  <span className="pet-profile__detail-value">
                    {pet.pet_age} {pet.pet_age === 1 ? 'year' : 'years'}
                  </span>
                </div>
              )}
              <div className="pet-profile__detail">
                <span className="pet-profile__detail-label">Energy</span>
                <span className="pet-profile__detail-value">
                  {pet.energy_level === 'high' ? 'High energy' : pet.energy_level === 'medium' ? 'Moderate' : 'Calm'}
                </span>
              </div>
            </div>

            {/* Temperament chips */}
            {pet.temperament && pet.temperament.length > 0 && (
              <div className="pet-profile__traits">
                <h3 className="pet-profile__section-title">Traits</h3>
                <div className="pet-profile__trait-chips">
                  {pet.temperament.map((trait) => (
                    <span key={trait} className="pet-profile__chip">
                      {trait.charAt(0).toUpperCase() + trait.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {pet.about_me && (
              <div className="pet-profile__bio">
                <h3 className="pet-profile__section-title">About</h3>
                <p className="pet-profile__bio-text">{pet.about_me}</p>
              </div>
            )}

            {/* Actions */}
            <div className="pet-profile__actions">
              <Button
                variant="primary"
                size="lg"
                onClick={handleConnect}
                loading={actionLoading}
                id="pet-profile-connect"
              >
                Connect
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleRemove}
                id="pet-profile-remove"
              >
                Remove
              </Button>
            </div>
          </div>

          {/* Right: Map Location View matching wireframe */}
          <div className="pet-profile__map-wrapper">
            <MapContainer
              center={[pet.latitude || 60.1699, pet.longitude || 24.9384]}
              zoom={13}
              className="pet-profile__map"
              scrollWheelZoom={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Marker
                position={[pet.latitude || 60.1699, pet.longitude || 24.9384]}
                icon={createCustomPetMarker(pet.pet_photo, pet.pet_name)}
              />
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

function getMockPet(id) {
  return {
    id: Number(id),
    pet_name: 'Poppy',
    animal_type: 'dog',
    breed: 'French Bulldog',
    size: 'small',
    energy_level: 'high',
    pet_age: 3,
    about_me: 'Loves snowy park walks in city and playing fetch at hiking trips. Super friendly with calm dogs.',
    pet_photo: '',
    temperament: ['friendly', 'playful'],
    latitude: 60.1699,
    longitude: 24.9384,
    owner_id: 1,
    match_percentage: 92,
  };
}
