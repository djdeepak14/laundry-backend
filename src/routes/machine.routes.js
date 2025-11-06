// src/routes/machine.routes.js
import { Router } from "express";
import {
  getAllMachines,
  createMachine,
  updateMachineStatus,
  deleteMachine,
  machinesByType,
} from "../controllers/machine.controller.js";
import { verifyJWT, isAdmin } from "../controllers/auth.controller.js";

const router = Router();

/**
 * ============================
 * 👤 USER ROUTES
 * ============================
 */
router.get("/", verifyJWT, getAllMachines);
router.get("/type/:type", verifyJWT, machinesByType);

/**
 * ============================
 * 🧾 ADMIN ROUTES
 * ============================
 */
router.post("/", verifyJWT, isAdmin, createMachine);
router.patch("/:id", verifyJWT, isAdmin, updateMachineStatus);
router.delete("/:id", verifyJWT, isAdmin, deleteMachine);
router.delete("/code/:code", verifyJWT, isAdmin, deleteMachine);

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
