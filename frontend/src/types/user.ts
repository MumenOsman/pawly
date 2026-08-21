/**
 * User Types
 *
 * Maps to backend tables: users, user_profiles
 */

/** Basic user info returned by GET /users/{id} */
export interface User {
  id: number;
  owner_name: string;
  owner_photo_url: string;
}

/** Extended profile returned by GET /users/{id}/profile */
export interface UserProfile {
  user_id: number;
  owner_name: string;
  owner_photo: string;
  about_me: string;
  location: string;
  interests: string[];
}

/** Bio data used for recommendations, returned by GET /users/{id}/bio */
export interface UserBio {
  user_id: number;
  owner_name: string;
  interests: string[];
  location: string;
}

/** The authenticated user's own data (superset — includes private fields) */
export interface AuthUser {
  id: number;
  email: string;
  owner_name: string;
  owner_photo_url: string;
  created_at: string;
}
