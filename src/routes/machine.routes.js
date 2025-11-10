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

// User routes: allow authenticated users to view machine information
router.get("/", verifyJWT, getAllMachines);
router.get("/type/:type", verifyJWT, machinesByType);

// Admin routes: allow administrators to manage machine data
router.post("/", verifyJWT, isAdmin, createMachine);
router.patch("/:id", verifyJWT, isAdmin, updateMachineStatus);
router.delete("/:id", verifyJWT, isAdmin, deleteMachine);
router.delete("/code/:code", verifyJWT, isAdmin, deleteMachine);

// Health check route to confirm machine routes are operational
router.get("/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Machine routes working properly",
  });
});

export default router;
