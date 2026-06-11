import { prisma } from "../../config/database.js";
import type { CreateProfileInput, UpdateProfileInput, ProfileQuery } from "./profile.types.js";

export class ProfileRepository {
  async create(data: CreateProfileInput) {
    return prisma.profile.create({
      data,
      include: {
        user: true,
      },
    });
  }

  async findById(id: string, userId?: string) {
    const where: Record<string, unknown> = { id };
    if (userId) {
      where.userId = userId;
    }
    return prisma.profile.findFirst({
      where,
      include: {
        user: true,
      },
    });
  }

  async findAll(query: ProfileQuery) {
    const { page = 1, limit = 10, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { bio: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.profile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: true,
        },
      }),
      prisma.profile.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: UpdateProfileInput) {
    return prisma.profile.update({
      where: { id },
      data,
      include: {
        user: true,
      },
    });
  }

  async delete(id: string) {
    return prisma.profile.delete({ where: { id } });
  }

}
