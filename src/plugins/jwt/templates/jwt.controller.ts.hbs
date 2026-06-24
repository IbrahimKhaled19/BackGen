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

  /**
   * Refresh an access token. Accepts a refreshToken in the request body,
   * rotates it (old token consumed, new pair issued), and returns both new tokens.
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    // refresh() now returns both new access AND refresh token (rotation)
    const result = await authService.refresh(refreshToken);
    successResponse(res, result);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken);
    messageResponse(res, "Logged out successfully");
  }

  /**
   * Change the authenticated user's password. Validates the current password,
   * sets the new one, increments tokenVersion to invalidate all existing sessions,
   * and deletes all refresh tokens for the user.
   * Requires a valid Bearer token (authMiddleware).
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.userId;
    await authService.changePassword(userId, currentPassword, newPassword);
    messageResponse(res, "Password changed. All sessions have been invalidated.");
  }
}
