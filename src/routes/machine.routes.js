import { Router } from "express";
import { createMachine, deleteMachine, getMachinesByType } from "../controllers/machine.controller.js";

const router = Router()

router.post('/', createMachine);                                

router.get('/:type', getMachinesByType);                     

router.delete('/:id', deleteMachine); 

router.delete('/:code', deleteMachine)


export default router