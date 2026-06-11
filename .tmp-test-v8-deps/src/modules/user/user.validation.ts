import { z } from "zod";

export const createUserSchema = z.object({
  body: z.object({
    email: z.string(),
  }),
});

export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listUserSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(10),
    search: z.string().optional(),
  }),
});
