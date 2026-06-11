import { UserRepository } from "./user.repository.js";
import { ApiError } from "../../utils/api-error.js";
import type { CreateUserInput, UpdateUserInput, UserQuery } from "./user.types.js";

const repository = new UserRepository();

export class UserService {
  async create(input: CreateUserInput) {
    return repository.create(input);
  }

  async getById(id: string, userId?: string) {
    const user = await repository.findById(id, userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return user;
  }

  async list(query: UserQuery) {
    return repository.findAll(query);
  }

  async update(id: string, input: UpdateUserInput, userId?: string) {
    const user = await repository.findById(id, userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return repository.update(id, input);
  }

  async delete(id: string, userId?: string) {
    const user = await repository.findById(id, userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }
    return repository.delete(id);
  }
}
