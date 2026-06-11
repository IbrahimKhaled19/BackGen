import { z } from "zod";

export const createProfileSchema = z.object({
  body: z.object({
    bio: z.string(),
    userId: z.string().uuid(),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    bio: z.string().optional(),
    userId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listProfileSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(10),
    search: z.string().optional(),
  }),
});
