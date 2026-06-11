import "dotenv/config";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { requestId } from "./middleware/observability/request-id.js";
import { requestTimeout } from "./middleware/observability/request-timeout.js";
import { healthCheck, readyCheck } from "./middleware/observability/health.js";
import { corsStrict } from "./middleware/security/cors-strict.js";
import { sanitizeBody, sanitizeNoSql } from "./middleware/security/sanitize.js";
import { requestLogger } from "./middleware/core/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/core/errors.js";
import { setupSwagger } from "./config/swagger.js";

const app = express();

// {{REGISTER_AUTH_MIDDLEWARE}}

// Security + observability baseline
app.use(helmet());
app.use(corsStrict);
app.use(requestId);
app.use(requestTimeout);
app.use(express.json({ limit: env.BODY_SIZE_LIMIT }));
app.use(sanitizeNoSql);
app.use(sanitizeBody);
app.use(requestLogger);

// {{REGISTER_MIDDLEWARE}}

// Swagger
setupSwagger(app);

// Health endpoints
app.get("/health", healthCheck);
app.get("/ready", readyCheck);

import authRoutes from "./modules/auth/auth.routes.js";
import postRoutes from "./modules/post/post.routes.js";
import commentRoutes from "./modules/comment/comment.routes.js";
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
  app.use("/api/comments", commentRoutes);
  // {{REGISTER_ROUTES}}

// 404 + error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export { app };
