import { Router } from "express";
import { AuthController } from "./auth.controller.js";
import { validate } from "../../middleware/core/validate.js";
import { rateLimitMw } from "../../middleware/security/rate-limit.js";
import { registerSchema, loginSchema, refreshSchema, logoutSchema, changePasswordSchema } from "./auth.validation.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { authMiddleware } from "../../middleware/auth.js";

const router = Router();
const controller = new AuthController();

// Rate limiting for auth endpoints to mitigate brute force attacks
router.use(rateLimitMw);

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Email already exists
 */
router.post("/register", validate(registerSchema), asyncHandler(controller.register.bind(controller)));

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post("/login", validate(loginSchema), asyncHandler(controller.login.bind(controller)));

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token (rotates refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: New access + refresh token issued
 *       401:
 *         description: Invalid or revoked refresh token
 */
router.post("/refresh", validate(refreshSchema), asyncHandler(controller.refresh.bind(controller)));

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (no auth header required, just refresh token)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post("/logout", validate(logoutSchema), asyncHandler(controller.logout.bind(controller)));

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (invalidates all existing sessions)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed, all sessions invalidated
 *       401:
 *         description: Current password is incorrect
 */
router.post(
  "/change-password",
  authMiddleware,
  validate(changePasswordSchema),
  asyncHandler(controller.changePassword.bind(controller))
);

export default router;
