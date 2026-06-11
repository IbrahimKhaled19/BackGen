export interface Post {
  id: string;
  title: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePostInput {
  title: string;
  authorId: string;
}

export interface UpdatePostInput {
  title?: string;
  authorId?: string;
}

export interface PostQuery {
  page?: number;
  limit?: number;
  search?: string;
}
