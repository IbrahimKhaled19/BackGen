import morgan from "morgan";
import { logger } from "../services/logger.service.js";

const stream = {
  write: (message: string) => logger.info(message.trim()),
};

export const requestLogger = morgan("combined", { stream });
