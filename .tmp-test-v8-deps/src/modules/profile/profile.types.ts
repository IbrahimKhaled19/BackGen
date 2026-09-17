export interface Profile {
  id: string;
  bio: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProfileInput {
  bio: string;
  userId: string;
}

export interface UpdateProfileInput {
  bio?: string;
  userId?: string;
}

export interface ProfileQuery {
  page?: number;
  limit?: number;
  search?: string;
}
