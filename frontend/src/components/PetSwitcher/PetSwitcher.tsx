import React from 'react';
import './PetSwitcher.css';

/**
 * PetSwitcher
 *
 * Floating bottom bar showing user's owned pets.
 * Allows toggling selection for multi-pet discovery filtering.
 */
export default function PetSwitcher({ pets = [], selectedPetIds = [], onTogglePet }) {
  if (!pets || pets.length === 0) return null;

  return (
    <div className="pet-switcher-container" id="pet-switcher">
      <div className="pet-switcher-bar">
        <span className="pet-switcher-label">My Pets:</span>
        <div className="pet-switcher-items">
          {pets.map((pet) => {
            const isSelected = selectedPetIds.includes(pet.id);
            return (
              <button
                key={pet.id}
                type="button"
                className={`pet-switcher-item ${isSelected ? 'pet-switcher-item--active' : 'pet-switcher-item--muted'}`}
                onClick={() => onTogglePet && onTogglePet(pet.id)}
                title={`${isSelected ? 'Filter by' : 'Include'} ${pet.pet_name} (${pet.animal_type})`}
                id={`pet-switcher-item-${pet.id}`}
              >
                <div className="pet-switcher-avatar-wrapper">
                  <img
                    src={pet.pet_photo || '/placeholder-pet.svg'}
                    alt={pet.pet_name}
                    className="pet-switcher-avatar"
                  />
                  {isSelected && <span className="pet-switcher-check">✓</span>}
                </div>
                <span className="pet-switcher-name">{pet.pet_name}</span>
                <span className="pet-switcher-type">{pet.animal_type}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
