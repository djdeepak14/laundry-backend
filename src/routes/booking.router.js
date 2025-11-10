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

// Admin routes: allow admins to view all bookings and cancel any booking
router.get("/admin/all", verifyJWT, isAdmin, adminGetAllBookings);
router.delete("/admin/cancel/:id", verifyJWT, isAdmin, adminCancelAnyBooking);

// User routes: allow authenticated users to manage their own bookings
router.get("/", verifyJWT, getAllBookings);
router.post("/", verifyJWT, createBooking);
router.delete("/:id", verifyJWT, cancelBooking);
router.get("/past", verifyJWT, PastBookings);
router.get("/upcoming", verifyJWT, UpcomingBookings);

// Health check route to confirm booking routes are working
router.get("/status", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Booking routes working properly",
  });
});

export default router;
