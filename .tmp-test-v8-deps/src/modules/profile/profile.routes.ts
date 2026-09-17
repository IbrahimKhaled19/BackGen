import { Router } from "express";
import { ProfileController } from "./profile.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/core/validate.js";
import { createProfileSchema, updateProfileSchema, getProfileSchema, listProfileSchema } from "./profile.validation.js";
import { asyncHandler } from "../../utils/async-handler.js";

const router = Router();
const controller = new ProfileController();

// All resource routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Create a profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Profile created
 *       400:
 *         description: Validation failed
 */
router.post("/", validate(createProfileSchema), asyncHandler(controller.create.bind(controller)));

/**
 * @swagger
 * /api/profiles:
 *   get:
 *     summary: List profiles
 *     tags: [Profile]
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
 *         description: List of profiles
 */
router.get("/", validate(listProfileSchema), asyncHandler(controller.list.bind(controller)));

/**
 * @swagger
 * /api/profiles/{id}:
 *   get:
 *     summary: Get profile by ID
 *     tags: [Profile]
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
 *         description: Profile details
 *       404:
 *         description: Profile not found
 */
router.get("/:id", validate(getProfileSchema), asyncHandler(controller.getById.bind(controller)));

/**
 * @swagger
 * /api/profiles/{id}:
 *   patch:
 *     summary: Update profile
 *     tags: [Profile]
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
 *         description: Profile updated
 *       404:
 *         description: Profile not found
 */
router.patch("/:id", validate(updateProfileSchema), asyncHandler(controller.update.bind(controller)));

/**
 * @swagger
 * /api/profiles/{id}:
 *   delete:
 *     summary: Delete profile
 *     tags: [Profile]
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
 *         description: Profile deleted
 *       404:
 *         description: Profile not found
 */
router.delete("/:id", validate(getProfileSchema), asyncHandler(controller.delete.bind(controller)));

export default router;
