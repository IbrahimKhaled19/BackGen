import { Request, Response } from "express";
import { prisma } from "../../config/database.js";

export function healthCheck(_req: Request, res: Response): void {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
}

export async function readyCheck(_req: Request, res: Response): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready", timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(503).json({
      status: "not_ready",
      message: "Database unreachable",
      error: "Database unreachable",
    });
  }
}
