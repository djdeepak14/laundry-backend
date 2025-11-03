// src/routes/machine.routes.js
import { Router } from "express";
import {
  getAllMachines,
  createMachine,
  updateMachineStatus,
  deleteMachine,
} from "../controllers/machine.controller.js";
import { verifyJWT, isAdmin } from "../controllers/auth.controller.js"; // ✅ Fixed import

const router = Router();

/**
 * ============================
 * 👤 USER ROUTES
 * ============================
 */
router.get("/", verifyJWT, getAllMachines);

/**
 * ============================
 * 🧾 ADMIN ROUTES
 * ============================
 */
router.post("/", verifyJWT, isAdmin, createMachine);
router.patch("/:id", verifyJWT, isAdmin, updateMachineStatus);
router.delete("/:id", verifyJWT, isAdmin, deleteMachine);

/**
 * ============================
 * 💡 HEALTH CHECK
 * ============================
 */
router.get("/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "✅ Machine routes working properly",
  });
});

export default router;
