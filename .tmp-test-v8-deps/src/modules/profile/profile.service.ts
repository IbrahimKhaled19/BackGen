import { ProfileRepository } from "./profile.repository.js";
import { ApiError } from "../../utils/api-error.js";
import type { CreateProfileInput, UpdateProfileInput, ProfileQuery } from "./profile.types.js";

const repository = new ProfileRepository();

export class ProfileService {
  async create(input: CreateProfileInput) {
    return repository.create(input);
  }

  async getById(id: string, userId?: string) {
    const profile = await repository.findById(id, userId);
    if (!profile) {
      throw ApiError.notFound("Profile not found");
    }
    return profile;
  }

  async list(query: ProfileQuery) {
    return repository.findAll(query);
  }

  async update(id: string, input: UpdateProfileInput, userId?: string) {
    const profile = await repository.findById(id, userId);
    if (!profile) {
      throw ApiError.notFound("Profile not found");
    }
    return repository.update(id, input);
  }

  async delete(id: string, userId?: string) {
    const profile = await repository.findById(id, userId);
    if (!profile) {
      throw ApiError.notFound("Profile not found");
    }
    return repository.delete(id);
  }
}
