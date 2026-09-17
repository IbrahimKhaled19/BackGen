import { Router } from "express";
import { PostController } from "./post.controller.js";
import { authMiddleware } from "../../middleware/auth.js";
import { validate } from "../../middleware/core/validate.js";
import { createPostSchema, updatePostSchema, getPostSchema, listPostSchema } from "./post.validation.js";
import { asyncHandler } from "../../utils/async-handler.js";

const router = Router();
const controller = new PostController();

// All resource routes require authentication
router.use(authMiddleware);

/**
 * @swagger
 * /api/posts:
 *   post:
 *     summary: Create a post
 *     tags: [Post]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *     responses:
 *       201:
 *         description: Post created
 *       400:
 *         description: Validation failed
 */
router.post("/", validate(createPostSchema), asyncHandler(controller.create.bind(controller)));

/**
 * @swagger
 * /api/posts:
 *   get:
 *     summary: List posts
 *     tags: [Post]
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
 *         description: List of posts
 */
router.get("/", validate(listPostSchema), asyncHandler(controller.list.bind(controller)));

/**
 * @swagger
 * /api/posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Post]
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
 *         description: Post details
 *       404:
 *         description: Post not found
 */
router.get("/:id", validate(getPostSchema), asyncHandler(controller.getById.bind(controller)));

/**
 * @swagger
 * /api/posts/{id}:
 *   patch:
 *     summary: Update post
 *     tags: [Post]
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
 *         description: Post updated
 *       404:
 *         description: Post not found
 */
router.patch("/:id", validate(updatePostSchema), asyncHandler(controller.update.bind(controller)));

/**
 * @swagger
 * /api/posts/{id}:
 *   delete:
 *     summary: Delete post
 *     tags: [Post]
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
 *         description: Post deleted
 *       404:
 *         description: Post not found
 */
router.delete("/:id", validate(getPostSchema), asyncHandler(controller.delete.bind(controller)));

export default router;
