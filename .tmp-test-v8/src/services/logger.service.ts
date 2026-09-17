import pino from "pino";
import { env } from "../config/env.js";

const isProduction = env.NODE_ENV === "production";

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(isProduction
    ? {
        // Production: pure JSON for log shipping (Datadog, ELK, Grafana Loki)
        formatters: {
          level(label) {
            return { level: label };
          },
        },
        serializers: {
          req: pino.stdSerializers.req,
          res: pino.stdSerializers.res,
          err: pino.stdSerializers.err,
        },
      }
    : {
        // Dev: human-readable with colorized output
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss.l",
            ignore: "pid,hostname",
          },
        },
      }),
});
