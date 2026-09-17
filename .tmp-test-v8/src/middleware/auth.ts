import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/database.js";
import { ApiError } from "../utils/api-error.js";

export interface AuthPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

/**
 * Express middleware that authenticates requests via JWT Bearer token.
 * Verifies the token signature (whitelisting only the HS256 algorithm to prevent alg confusion),
 * looks up the user to validate tokenVersion (enables instant session revocation),
 * and attaches the current role from the database so role changes take effect immediately.
 * @throws {ApiError} 401 Unauthorized if the token is missing, invalid, expired, or revoked
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing or invalid authorization header");
  }

  const token = authHeader.split(" ")[1];

  try {
    // Explicit algorithm whitelist prevents alg confusion attacks
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as AuthPayload;

    // Verify token version - allows immediate revocation of all user tokens
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { tokenVersion: true, role: true },
    });

    if (!user) {
      throw ApiError.unauthorized("User not found");
    }

    if (payload.tokenVersion !== user.tokenVersion) {
      throw ApiError.unauthorized("Token revoked. Please login again.");
    }

    // Fetch current role from DB so role changes take effect immediately
    req.user = { ...payload, role: user.role };
    next();
  } catch {
    throw ApiError.unauthorized("Invalid or expired token");
  }
}
