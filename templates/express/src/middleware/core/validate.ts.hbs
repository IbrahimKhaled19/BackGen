import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validate<T>(schema: ZodSchema<T>, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      res.status(400).json({
        status: 400,
        message: "Validation failed",
        requestId: (req as Request & { id?: string }).id,
        errors,
      });
      return;
    }
    // Replace with parsed (and possibly transformed) value
    (req as Request & Record<string, unknown>)[source] = result.data;
    next();
  };
}
