import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.object({
    content: z.string(),
    postId: z.string().uuid(),
    authorId: z.string().uuid(),
  }),
});

export const updateCommentSchema = z.object({
  body: z.object({
    content: z.string().optional(),
    postId: z.string().uuid().optional(),
    authorId: z.string().uuid().optional(),
  }),
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const getCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const listCommentSchema = z.object({
  query: z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(10),
    search: z.string().optional(),
  }),
});
