import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const existing = req.header("x-request-id");
  const id = existing ?? randomUUID();
  req.id = id;
  res.setHeader("x-request-id", id);
  next();
}
