import { Request, Response, NextFunction } from "express";
import { env } from "../../config/env.js";

export function requestTimeout(req: Request, res: Response, next: NextFunction): void {
  const ms = env.REQUEST_TIMEOUT_MS;
  res.setTimeout(ms, () => {
    if (!res.headersSent) {
      const requestId = (req as Request & { id?: string }).id;
      res.status(503).json({
        status: 503,
        message: `Request timed out after ${ms}ms`,
        requestId,
      });
    }
  });
  next();
}
