import { Request, Response, NextFunction } from "express";
import xss from "xss";
import mongoSanitize from "express-mongo-sanitize";

const DENY_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function xssSanitizeString(value: unknown): unknown {
  if (typeof value === "string") return xss(value);
  if (Array.isArray(value)) return value.map(xssSanitizeString);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (DENY_KEYS.has(k)) continue;
      out[k] = xssSanitizeString(v);
    }
    return out;
  }
  return value;
}

export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
  if (req.body) req.body = xssSanitizeString(req.body);
  next();
}

export const sanitizeNoSql = mongoSanitize({
  replaceWith: "_",
  onSanitize: ({ req, key }) => {
    // eslint-disable-next-line no-console
    console.warn(`[sanitize] stripped NoSQL operator from ${key}`);
  },
});
