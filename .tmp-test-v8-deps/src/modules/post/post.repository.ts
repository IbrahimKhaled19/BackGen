import { prisma } from "../../config/database.js";
import type { CreatePostInput, UpdatePostInput, PostQuery } from "./post.types.js";

export class PostRepository {
  async create(data: CreatePostInput) {
    return prisma.post.create({
      data,
      include: {
        author: true,
      },
    });
  }

  async findById(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) {
      where.userId = userId;
    }
    return prisma.post.findFirst({
      where,
      include: {
        author: true,
      },
    });
  }

  async findAll(query: PostQuery, userId?: string) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) {
      where.userId = userId;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.post.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          author: true,
        },
      }),
      prisma.post.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: UpdatePostInput) {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined)
    );
    return prisma.post.update({
      where: { id },
      data: cleanData,
      include: {
        author: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.post.delete({ where: { id } });
  }

}
