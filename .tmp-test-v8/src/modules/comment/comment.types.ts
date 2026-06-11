export interface Comment {
  id: string;
  content: string;
  postId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCommentInput {
  content: string;
  postId: string;
  authorId: string;
}

export interface UpdateCommentInput {
  content?: string;
  postId?: string;
  authorId?: string;
}

export interface CommentQuery {
  page?: number;
  limit?: number;
  search?: string;
}
