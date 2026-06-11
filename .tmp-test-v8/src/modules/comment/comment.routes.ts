import { Router } from "express";
import { CommentController } from "./comment.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/core/validate.js";
import { createCommentSchema, updateCommentSchema, getCommentSchema, listCommentSchema } from "./comment.validation.js";
import { asyncHandler } from "../../utils/async-handler.js";

const router = Router();
const controller = new CommentController();

// All resource routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/comments:
 *   post:
 *     summary: Create a comment
 *     tags: [Comment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Comment created
 *       400:
 *         description: Validation failed
 */
router.post("/", validate(createCommentSchema), asyncHandler(controller.create.bind(controller)));

/**
 * @swagger
 * /api/comments:
 *   get:
 *     summary: List comments
 *     tags: [Comment]
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
 *         description: List of comments
 */
router.get("/", validate(listCommentSchema), asyncHandler(controller.list.bind(controller)));

/**
 * @swagger
 * /api/comments/{id}:
 *   get:
 *     summary: Get comment by ID
 *     tags: [Comment]
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
 *         description: Comment details
 *       404:
 *         description: Comment not found
 */
router.get("/:id", validate(getCommentSchema), asyncHandler(controller.getById.bind(controller)));

/**
 * @swagger
 * /api/comments/{id}:
 *   patch:
 *     summary: Update comment
 *     tags: [Comment]
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
 *         description: Comment updated
 *       404:
 *         description: Comment not found
 */
router.patch("/:id", validate(updateCommentSchema), asyncHandler(controller.update.bind(controller)));

/**
 * @swagger
 * /api/comments/{id}:
 *   delete:
 *     summary: Delete comment
 *     tags: [Comment]
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
 *         description: Comment deleted
 *       404:
 *         description: Comment not found
 */
router.delete("/:id", validate(getCommentSchema), asyncHandler(controller.delete.bind(controller)));

export default router;
