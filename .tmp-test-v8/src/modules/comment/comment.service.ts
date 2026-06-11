import { CommentRepository } from "./comment.repository.js";
import { ApiError } from "../../utils/api-error.js";
import type { CreateCommentInput, UpdateCommentInput, CommentQuery } from "./comment.types.js";

const repository = new CommentRepository();

export class CommentService {
  async create(input: CreateCommentInput) {
    return repository.create(input);
  }

  async getById(id: string, userId?: string) {
    const comment = await repository.findById(id, userId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }
    return comment;
  }

  async list(query: CommentQuery) {
    return repository.findAll(query);
  }

  async update(id: string, input: UpdateCommentInput, userId?: string) {
    const comment = await repository.findById(id, userId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }
    return repository.update(id, input);
  }

  async delete(id: string, userId?: string) {
    const comment = await repository.findById(id, userId);
    if (!comment) {
      throw ApiError.notFound("Comment not found");
    }
    return repository.delete(id);
  }
}
