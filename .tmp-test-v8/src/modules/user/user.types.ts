export interface User {
  id: string;
  email: string;
  name: string;
  age: number;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  email: string;
  name: string;
  age: number;
}

export interface UpdateUserInput {
  email?: string;
  name?: string;
  age?: number;
}

export interface UserQuery {
  page?: number;
  limit?: number;
  search?: string;
}
