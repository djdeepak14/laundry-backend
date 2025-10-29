// machine.routes.js
import { Router } from "express";
import {
  createMachine,
  deleteMachine,
  machinesByType,
  getAllMachines,
} from "../controllers/machine.controller.js";
import { verifyJWT, verifyAdmin } from "../controllers/auth.controller.js";

const router = Router();

// ✅ Public endpoints
router.get("/type/:type", machinesByType);
router.get("/", getAllMachines);

// ✅ Protected admin-only routes
router.post("/", verifyJWT, verifyAdmin, createMachine);
router.delete("/id/:id", verifyJWT, verifyAdmin, deleteMachine);
router.delete("/code/:code", verifyJWT, verifyAdmin, deleteMachine);

export default router;
