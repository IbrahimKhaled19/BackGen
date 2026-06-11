export interface Post {
  id: string;
  title: string;
  body: string;
  published: boolean;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostInput {
  title: string;
  body: string;
  published: boolean;
  authorId: string;
}

export interface UpdatePostInput {
  title?: string;
  body?: string;
  published?: boolean;
  authorId?: string;
}

export interface PostQuery {
  page?: number;
  limit?: number;
  search?: string;
}
