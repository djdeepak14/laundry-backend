// src/routes/booking.router.js
import { Router } from "express";
import {
  createBooking,
  cancelBooking,
  PastBookings,
  UpcomingBookings,
  getAllBookings,
  adminGetAllBookings,
  adminCancelAnyBooking,
} from "../controllers/booking.controller.js";
import { verifyJWT, verifyAdmin } from "../controllers/auth.controller.js";

const router = Router();

// === USER ROUTES ===
router.get("/", verifyJWT, getAllBookings);
router.post("/", verifyJWT, createBooking);
router.delete("/:id", verifyJWT, cancelBooking);
router.get("/past", verifyJWT, PastBookings);
router.get("/upcoming", verifyJWT, UpcomingBookings);

// === ADMIN ROUTES ===
router.get("/admin/all", verifyJWT, verifyAdmin, adminGetAllBookings);
router.delete("/admin/cancel/:id", verifyJWT, verifyAdmin, adminCancelAnyBooking);

export default router;