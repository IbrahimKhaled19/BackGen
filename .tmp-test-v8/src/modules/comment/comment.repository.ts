import { prisma } from "../../config/database.js";
import type { CreateCommentInput, UpdateCommentInput, CommentQuery } from "./comment.types.js";

export class CommentRepository {
  async create(data: CreateCommentInput) {
    return prisma.comment.create({
      data,
      include: {
        post: true,
        author: true,
      },
    });
  }

  async findById(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) {
      where.userId = userId;
    }
    return prisma.comment.findFirst({
      where,
      include: {
        post: true,
        author: true,
      },
    });
  }

  async findAll(query: CommentQuery) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { content: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.comment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          post: true,
          author: true,
        },
      }),
      prisma.comment.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: UpdateCommentInput) {
    return prisma.comment.update({
      where: { id },
      data,
      include: {
        post: true,
        author: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.comment.delete({ where: { id } });
  }

}
