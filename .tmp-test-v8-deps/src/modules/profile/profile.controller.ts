import { Request, Response } from "express";
import { ProfileService } from "./profile.service.js";
import type { ProfileQuery } from "./profile.types.js";
import { successResponse, createdResponse, messageResponse, paginatedResponse } from "../../utils/response.js";

const service = new ProfileService();

export class ProfileController {
  async create(req: Request, res: Response): Promise<void> {
    const profile = await service.create(req.body);
    createdResponse(res, profile);
  }

  async getById(req: Request, res: Response): Promise<void> {
    const profile = await service.getById(req.params.id as string, req.user?.userId);
    successResponse(res, profile);
  }

  async list(req: Request, res: Response): Promise<void> {
    const { items, total } = await service.list(req.query as unknown as ProfileQuery);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    paginatedResponse(res, items, total, page, limit);
  }

  async update(req: Request, res: Response): Promise<void> {
    const profile = await service.update(req.params.id as string, req.body, req.user?.userId);
    successResponse(res, profile);
  }

  async delete(req: Request, res: Response): Promise<void> {
    await service.delete(req.params.id as string, req.user?.userId);
    messageResponse(res, "Profile deleted successfully");
  }
}
