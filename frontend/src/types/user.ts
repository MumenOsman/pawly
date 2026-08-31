export interface UserBasic {
  id: number;
  owner_name: string;
  owner_photo: string;
  profile_url: string;
  profile_link: string;
}

export type User = UserBasic;

export interface UserProfile {
  id: number;
  owner_name: string;
  username: string;
  email?: string;
  date_of_birth?: string;
  owner_photo: string;
  about_me: string;
  location: string;
  interests: string[];
}
