/**
 * Pet Types
 *
 * Maps to backend tables: pets, pet_preferences
 */

export type AnimalType = 'dog' | 'cat' | 'rabbit' | 'small_pet';
export type PetSize = 'small' | 'medium' | 'large';
export type EnergyLevel = 'low' | 'medium' | 'high';

/** Pet record returned by the API */
export interface Pet {
  id: number;
  owner_id: number;
  pet_name: string;
  animal_type: AnimalType;
  breed: string;
  size: PetSize;
  about_me: string;
  pet_photo: string;
  energy_level: EnergyLevel;
  pet_age: number;
  temperament: string[];
  latitude: number;
  longitude: number;
  created_at: string;
}

/** Playmate preferences for a specific pet */
export interface PetPreferences {
  pet_id: number;
  preferred_sizes: PetSize[];
  preferred_animal_types: AnimalType[];
  preferred_energy_levels: EnergyLevel[];
  max_distance_km: number;
}

/** Data needed to create or update a pet */
export interface PetFormData {
  pet_name: string;
  animal_type: AnimalType;
  breed?: string;
  size: PetSize;
  about_me?: string;
  pet_photo?: string;
  energy_level: EnergyLevel;
  pet_age?: number;
  temperament?: string[];
  latitude?: number;
  longitude?: number;
}

/**
 * A fully hydrated recommendation card — combines pet data
 * with owner info and match scoring for display on the Discover page.
 */
export interface RecommendationCard {
  pet: Pet;
  owner: import('./user').User;
  match_percentage: number;
  distance_km: number;
}
