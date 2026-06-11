import { z } from "zod";

export const createPostSchema = z.object({
  body: z.object({
    title: z.string(),
    body: z.string(),
    published: z.boolean(),
    authorId: z.string().uuid(),
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    body: z.string().optional(),
    published: z.boolean().optional(),
    authorId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getPostSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listPostSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(10),
    search: z.string().optional(),
  }),
});
