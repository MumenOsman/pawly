export interface PetRecommendation {
  id: number;
  owner_id: number;
  pet_name: string;
  animal_type: string;
  breed: string;
  size: string;
  about_me: string;
  pet_photo: string;
  photos: string[];
  energy_level: string;
  pet_age: number;
  temperament: string[];
  latitude: number;
  longitude: number;
  owner_name: string;
  owner_photo: string;
  owner_bio: string;
  match_score?: number;
  match_percentage?: number;
  distance_km?: number;
}
