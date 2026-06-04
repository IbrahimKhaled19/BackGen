import "dotenv/config";
import { createServer } from "http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./services/logger.service.js";
import { attachGracefulShutdown } from "./middleware/graceful-shutdown.js";

const PORT = env.PORT;
const server = createServer(app);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Swagger docs: http://localhost:${PORT}/docs`);
});

attachGracefulShutdown(server);
