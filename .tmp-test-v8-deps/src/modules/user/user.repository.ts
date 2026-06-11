import { prisma } from "../../config/database.js";
import type { CreateUserInput, UpdateUserInput, UserQuery } from "./user.types.js";

export class UserRepository {
  async create(data: CreateUserInput) {
    return prisma.user.create({
      data,
    });
  }

  async findById(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) {
      where.userId = userId;
    }
    return prisma.user.findFirst({
      where,
    });
  }

  async findAll(query: UserQuery) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }

}
