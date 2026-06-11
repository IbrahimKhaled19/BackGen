import { Request, Response } from "express";
import { CommentService } from "./comment.service.js";
import type { CommentQuery } from "./comment.types.js";
import { successResponse, createdResponse, messageResponse, paginatedResponse } from "../../utils/response.js";

const service = new CommentService();

export class CommentController {
  async create(req: Request, res: Response): Promise<void> {
    const comment = await service.create(req.body);
    createdResponse(res, comment);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const comment = await service.getById(req.params.id as string, req.user?.userId);
    successResponse(res, comment);
  }

  async list(req: Request, res: Response): Promise<void> {
    const { items, total } = await service.list(req.query as unknown as CommentQuery);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    paginatedResponse(res, items, total, page, limit);
  }

  async update(req: Request, res: Response): Promise<void> {
    const comment = await service.update(req.params.id as string, req.body, req.user?.userId);
    successResponse(res, comment);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await service.delete(req.params.id as string, req.user?.userId);
    messageResponse(res, "Comment deleted successfully");
  }
}
