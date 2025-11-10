import { Router } from "express";
import {
  getAllUsers,
  approveUser,
  deleteUser,
} from "../controllers/admin.controller.js";
import { verifyJWT, verifyAdmin } from "../controllers/auth.controller.js";

const router = Router();

// Protect all admin routes so that only logged-in admins can access them
router.use(verifyJWT, verifyAdmin);

// Get all users, including their approval and deletion request status
router.get("/users", getAllUsers);

// Approve a user account (used when admin reviews and activates new users)
router.patch("/users/:id/approve", approveUser);

// Permanently delete a user account (for GDPR deletion requests or manual removal)
router.delete("/users/:id", deleteUser);

// Export the admin router
export default router;
