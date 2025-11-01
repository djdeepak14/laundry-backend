import { Router } from "express";
import { getAllUsers, approveUser, deleteUser } from "../controllers/admin.controller.js";
import { verifyJWT, verifyAdmin } from "../controllers/auth.controller.js";

const router = Router();

// 🔐 All admin routes require authentication and admin role
router.use(verifyJWT, verifyAdmin);

// ✅ GET all users
router.get("/users", getAllUsers);

// ✅ Approve a user by ID
router.patch("/users/:id/approve", approveUser);

// ✅ Delete a user by ID
router.delete("/users/:id", deleteUser);

export default router;
