import { Router } from "express";
import { createMachine, deleteMachine, machinesByType } from "../controllers/machine.controller.js";

const router = Router();

router.route("/")
    .post(createMachine);

router.route("/type/:type")
    .get(machinesByType);

router.route("/id/:id")
    .delete(deleteMachine);

router.route("/code/:code")
    .delete(deleteMachine);

export default router;
