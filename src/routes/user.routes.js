import { Router } from "express";
import { registerUser, loginUser, logoutUser, getCurrentUser } from "../controllers/user.controller.js";

const router = Router()


router.route("/register")
    .post(registerUser)

router.route("/login")
    .post(loginUser)

router.route("/login")
    .post(logoutUser)

router.route("info")
    .get(getCurrentUser)

export default router