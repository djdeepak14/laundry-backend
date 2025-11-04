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

/**
 * 📝 Public Routes
 */
router.post("/register", registerUser);
router.post("/login", loginUser);

/**
 * 🔐 Protected Routes
 */
router.post("/logout", verifyJWT, logoutUser);
router.get("/info", verifyJWT, getCurrentUser);

/**
 * ⚖️ GDPR - Account Deletion Request
 */
router.post("/request-deletion", verifyJWT, requestAccountDeletion);

/**
 * 🛠️ Admin - Toggle User Role
 */
router.patch("/toggle-role/:userId", verifyJWT, verifyAdmin, toggleUserRole);

export default router;
