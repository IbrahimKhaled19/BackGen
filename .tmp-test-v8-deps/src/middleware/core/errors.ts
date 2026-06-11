import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/api-error.js";
import { logger } from "../../services/logger.service.js";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as Request & { id?: string }).id;

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      requestId,
      ...(err.errors && { errors: err.errors }),
    });
    return;
  }

  logger.error("Unhandled error:", err);

  res.status(500).json({
    status: 500,
    message: "Internal server error",
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  const requestId = (req as Request & { id?: string }).id;
  res.status(404).json({
    status: 404,
    message: `Route ${req.method} ${req.path} not found`,
    requestId,
  });
}
