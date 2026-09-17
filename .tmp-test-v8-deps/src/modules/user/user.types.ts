export interface User {
  id: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
}

export interface UpdateUserInput {
  email?: string;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
}
