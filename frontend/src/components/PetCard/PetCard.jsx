/**
 * PetCard
 *
 * Summary card for a pet displayed in grids and lists.
 * Matches wireframe: photo → name → traits → Connect/Remove buttons.
 */
import { Link } from 'react-router-dom';
import MatchRing from '../MatchRing/MatchRing';
import Button from '../Button/Button';
import { getFullPhotoUrl, getDefaultPetPhoto } from '../../utils/petPhotos';
import './PetCard.css';

export default function PetCard({
  pet,
  matchPercentage,
  distanceKm,
  onConnect,
  onRemove,
  onDisconnect,
  onSelect,
  isConnected = false,
  showActions = true,
  compact = false,
}) {
  const fallbackPetPhoto = getDefaultPetPhoto(pet?.id, pet?.animal_type, pet?.pet_name);
  const photoUrl = getFullPhotoUrl(pet?.pet_photo, fallbackPetPhoto);
  const ownerPhotoUrl = getFullPhotoUrl(pet?.owner_photo, '/placeholder-user.svg');

  // Pick badge color based on animal type
  const getTypeColor = (type) => {
    switch (type) {
      case 'dog': return 'pet-card__badge--dog';
      case 'cat': return 'pet-card__badge--cat';
      case 'rabbit':
      case 'small_pet': return 'pet-card__badge--small';
      default: return '';
    }
  };

  // Format animal type for display
  const formatType = (type) => {
    switch (type) {
      case 'small_pet': return 'Small Pet';
      default: return type ? type.charAt(0).toUpperCase() + type.slice(1) : '';
    }
  };

  const handleCardClick = (e) => {
    if (onSelect) {
      e.preventDefault();
      onSelect(pet);
    }
  };

  return (
    <div className={`pet-card ${compact ? 'pet-card--compact' : ''}`} id={`pet-card-${pet.id}`}>
      {/* Photo */}
      <div onClick={handleCardClick} className="pet-card__photo-link" style={{ cursor: 'pointer' }}>
        <div className="pet-card__photo-wrapper">
          <img
            src={photoUrl}
            alt={pet.pet_name}
            className="pet-card__photo"
            loading="lazy"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackPetPhoto;
            }}
          />
          {matchPercentage !== undefined && (
            <div className="pet-card__match-badge">
              {matchPercentage}% match{pet.matched_pet_name ? `ed with ${pet.matched_pet_name}` : ''}
            </div>
          )}
          {pet.owner_name && (
            <div className="pet-card__owner-chip">
              <img
                src={ownerPhotoUrl}
                alt={pet.owner_name}
                className="pet-card__owner-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/placeholder-user.svg';
                }}
              />
              <span>Owner: {pet.owner_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="pet-card__info">
        <div onClick={handleCardClick} className="pet-card__name-link" style={{ cursor: 'pointer' }}>
          <h3 className="pet-card__name">{pet.pet_name}</h3>
        </div>

        {/* Trait chips */}
        <div className="pet-card__traits">
          <span className={`pet-card__badge ${getTypeColor(pet.animal_type)}`}>
            {formatType(pet.animal_type)}
          </span>

          {pet.energy_level && (
            <span className="pet-card__badge pet-card__badge--energy">
              {pet.energy_level === 'high' ? 'High energy' :
               pet.energy_level === 'medium' ? 'Moderate' : 'Calm'}
            </span>
          )}

          {pet.size && (
            <span className="pet-card__badge">
              {pet.size.charAt(0).toUpperCase() + pet.size.slice(1)}
            </span>
          )}

          {pet.temperament && pet.temperament.slice(0, 2).map((trait) => (
            <span key={trait} className="pet-card__badge pet-card__badge--trait">
              {trait.charAt(0).toUpperCase() + trait.slice(1)}
            </span>
          ))}
        </div>

        {/* Distance */}
        {distanceKm !== undefined && (
          <p className="pet-card__distance">
            {distanceKm < 1
              ? `${Math.round(distanceKm * 1000)}m away`
              : `${distanceKm.toFixed(1)} km away`
            }
          </p>
        )}

        {/* About (truncated) */}
        {pet.about_me && !compact && (
          <p className="pet-card__about truncate">{pet.about_me}</p>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="pet-card__actions">
          {isConnected ? (
            <Button
              variant="danger-outline"
              size="sm"
              onClick={() => onDisconnect?.(pet.id)}
              id={`disconnect-${pet.id}`}
            >
              Disconnect
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRemove?.(pet.id)}
                id={`remove-${pet.id}`}
              >
                Remove
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onConnect?.(pet.id)}
                id={`connect-${pet.id}`}
              >
                Connect
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
