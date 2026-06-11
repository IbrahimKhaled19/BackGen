import { Response } from "express";

export function successResponse(
  res: Response,
  data: unknown,
  statusCode = 200
): void {
  res.status(statusCode).json({
    status: statusCode,
    data,
  });
}

export function createdResponse(res: Response, data: unknown): void {
  successResponse(res, data, 201);
}

export function messageResponse(
  res: Response,
  message: string,
  statusCode = 200
): void {
  res.status(statusCode).json({
    status: statusCode,
    message,
  });
}

export function paginatedResponse(
  res: Response,
  items: unknown[],
  total: number,
  page: number,
  limit: number
): void {
  res.status(200).json({
    status: 200,
    data: {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}
