// src/routes/user.routes.js
import { Router } from "express";
import { registerUser, loginUser, logoutUser, getCurrentUser } from "../controllers/user.controller.js";
import { verifyJWT } from "../controllers/auth.controller.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/logout").post(verifyJWT, logoutUser); 
router.route("/info").get(verifyJWT, getCurrentUser); 

export default router;