import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestAccountDeletion,
  toggleUserRole,
} from "../controllers/user.controller.js";
import { verifyJWT, verifyAdmin } from "../controllers/auth.controller.js";

const router = Router();

// Public routes (accessible without authentication)
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes (require a valid JWT)
router.post("/logout", verifyJWT, logoutUser);
router.get("/info", verifyJWT, getCurrentUser);

// GDPR-related route: allows a user to request account deletion
router.post("/request-deletion", verifyJWT, requestAccountDeletion);

// Admin-only route: allows an admin to toggle another user's role
router.patch("/toggle-role/:userId", verifyJWT, verifyAdmin, toggleUserRole);

export default router;
