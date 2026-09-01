export interface Pet {
  id: number;
  owner_id: number;
  pet_name: string;
  animal_type: 'dog' | 'cat' | string;
  breed: string;
  size: 'small' | 'medium' | 'large' | 'giant' | string;
  about_me: string;
  pet_photo: string;
  energy_level: 'low' | 'medium' | 'high' | string;
  pet_age: number;
  temperament: string[];
  photos: string[];
  latitude?: number;
  longitude?: number;
  preferred_sizes?: string[];
  preferred_animal_types?: string[];
  preferred_energy_levels?: string[];
  max_distance_km?: number;
}

export interface PetPreferences {
  pet_id: number;
  preferred_sizes: string[];
  preferred_animal_types: string[];
  preferred_energy_levels: string[];
  max_distance_km: number;
}
