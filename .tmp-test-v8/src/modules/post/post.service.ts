import { PostRepository } from "./post.repository.js";
import { ApiError } from "../../utils/api-error.js";
import type { CreatePostInput, UpdatePostInput, PostQuery } from "./post.types.js";

const repository = new PostRepository();

export class PostService {
  async create(input: CreatePostInput) {
    return repository.create(input);
  }

  async getById(id: string, userId?: string) {
    const post = await repository.findById(id, userId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }
    return post;
  }

  async list(query: PostQuery) {
    return repository.findAll(query);
  }

  async update(id: string, input: UpdatePostInput, userId?: string) {
    const post = await repository.findById(id, userId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }
    return repository.update(id, input);
  }

  async delete(id: string, userId?: string) {
    const post = await repository.findById(id, userId);
    if (!post) {
      throw ApiError.notFound("Post not found");
    }
    return repository.delete(id);
  }
}
