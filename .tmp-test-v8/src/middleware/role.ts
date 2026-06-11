import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/api-error.js";

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden("Insufficient permissions");
    }

    next();
  };
}
