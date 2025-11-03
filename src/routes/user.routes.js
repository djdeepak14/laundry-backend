import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestAccountDeletion, // ✅ New Controller Function
} from "../controllers/user.controller.js";
import { verifyJWT } from "../controllers/auth.controller.js";

const router = Router();

/**
 * 📝 Public Routes
 */
router.post("/register", registerUser); // User registration
router.post("/login", loginUser);       // User login

/**
 * 🔐 Protected Routes
 */
router.post("/logout", verifyJWT, logoutUser); // Logout only if logged in
router.get("/info", verifyJWT, getCurrentUser); // Get logged-in user info

/**
 * ⚖️ GDPR - Account Deletion Request
 * Users can request account deletion, handled by admins later.
 */
router.post("/request-deletion", verifyJWT, requestAccountDeletion);

export default router;
