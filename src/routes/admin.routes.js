import { Router } from "express";
import { getAllUsers, approveUser, deleteUser } from "../controllers/admin.controller.js";
import { verifyJWT, verifyAdmin } from "../controllers/auth.controller.js";

const router = Router();

// Middleware: protect all admin routes
router.use(verifyJWT, verifyAdmin);

/**
 * @route   GET /api/v1/admin/users
 * @desc    Get all users (includes deletion requests)
 * @access  Admin
 */
router.get("/users", getAllUsers);

/**
 * @route   PATCH /api/v1/admin/users/:id/approve
 * @desc    Approve a user registration
 * @access  Admin
 */
router.patch("/users/:id/approve", approveUser);

/**
 * @route   DELETE /api/v1/admin/users/:id
 * @desc    Permanently delete a user (used to approve GDPR deletion or direct deletion)
 * @access  Admin
 */
router.delete("/users/:id", deleteUser);

export default router;