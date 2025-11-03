// src/routes/booking.router.js
import { Router } from "express";
import {
  createBooking,
  cancelBooking,
  getAllBookings,
  PastBookings,
  UpcomingBookings,
  adminGetAllBookings,
  adminCancelAnyBooking,
} from "../controllers/booking.controller.js";
import { verifyJWT, isAdmin } from "../controllers/auth.controller.js";

const router = Router();

/**
 * ============================
 * 🧾 ADMIN ROUTES
 * ============================
 * Admin can view & cancel all bookings
 */
router.get("/admin/all", verifyJWT, isAdmin, adminGetAllBookings);
router.delete("/admin/cancel/:id", verifyJWT, isAdmin, adminCancelAnyBooking);

/**
 * ============================
 * 👤 USER ROUTES
 * ============================
 * Authenticated users can manage their own bookings
 */
router.get("/", verifyJWT, getAllBookings);
router.post("/", verifyJWT, createBooking);
router.delete("/:id", verifyJWT, cancelBooking);
router.get("/past", verifyJWT, PastBookings);
router.get("/upcoming", verifyJWT, UpcomingBookings);

/**
 * ============================
 * 💡 HEALTH CHECK
 * ============================
 */
router.get("/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "✅ Booking routes working properly",
  });
});

export default router;
