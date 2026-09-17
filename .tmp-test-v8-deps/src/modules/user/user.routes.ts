import { Router } from "express";
import { UserController } from "./user.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/core/validate.js";
import { createUserSchema, updateUserSchema, getUserSchema, listUserSchema } from "./user.validation.js";
import { asyncHandler } from "../../utils/async-handler.js";

const router = Router();
const controller = new UserController();

// All resource routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: User created
 *       400:
 *         description: Validation failed
 */
router.post("/", validate(createUserSchema), asyncHandler(controller.create.bind(controller)));

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List users
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/", validate(listUserSchema), asyncHandler(controller.list.bind(controller)));

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
router.get("/:id", validate(getUserSchema), asyncHandler(controller.getById.bind(controller)));

/**
 * @swagger
 * /api/users/{id}:
 *   patch:
 *     summary: Update user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User updated
 *       404:
 *         description: User not found
 */
router.patch("/:id", validate(updateUserSchema), asyncHandler(controller.update.bind(controller)));

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 *       404:
 *         description: User not found
 */
router.delete("/:id", validate(getUserSchema), asyncHandler(controller.delete.bind(controller)));

export default router;
