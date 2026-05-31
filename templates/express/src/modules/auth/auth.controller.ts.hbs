import { Request, Response } from "express";
import { AuthService } from "./auth.service.js";
import { successResponse, createdResponse, messageResponse } from "../../utils/response.js";

const authService = new AuthService();

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const result = await authService.register(req.body);
    createdResponse(res, result);
  }

  async login(req: Request, res: Response): Promise<void> {
    const result = await authService.login(req.body);
    successResponse(res, result);
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    successResponse(res, result);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    messageResponse(res, "Logged out successfully");
  }
}
