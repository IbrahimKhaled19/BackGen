import { Request, Response } from "express";
import { UserService } from "./user.service.js";
import type { UserQuery } from "./user.types.js";
import { successResponse, createdResponse, messageResponse, paginatedResponse } from "../../utils/response.js";

const service = new UserService();

export class UserController {
  async create(req: Request, res: Response): Promise<void> {
    const user = await service.create(req.body);
    createdResponse(res, user);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const user = await service.getById(req.params.id as string, req.user?.userId);
    successResponse(res, user);
  }

  async list(req: Request, res: Response): Promise<void> {
    const { items, total } = await service.list(req.query as unknown as UserQuery);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    paginatedResponse(res, items, total, page, limit);
  }

  async update(req: Request, res: Response): Promise<void> {
    const user = await service.update(req.params.id as string, req.body, req.user?.userId);
    successResponse(res, user);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await service.delete(req.params.id as string, req.user?.userId);
    messageResponse(res, "User deleted successfully");
  }

  async restore(req: Request, res: Response): Promise<void> {
    const user = await service.restore(req.params.id as string, req.user?.userId);
    successResponse(res, user);
  }
}
