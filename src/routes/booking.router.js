// src/routes/booking.router.js
import { Router } from "express";
import {
  createBooking,
  cancelBooking,
  PastBookings,
  UpcomingBookings,
  getAllBookings,
} from "../controllers/booking.controller.js";
import { verifyJWT } from "../controllers/auth.controller.js";

const router = Router();

// ✅ Get all bookings (for logged-in user or all active if ?all=true)
router.get("/", verifyJWT, async (req, res, next) => {
  try {
    await getAllBookings(req, res, next);
  } catch (err) {
    console.error("Failed to fetch bookings:", err.message);
    res.status(500).json({ message: "Failed to fetch bookings" });
  }
});

// ✅ Create a new booking
router.post("/", verifyJWT, async (req, res, next) => {
  try {
    await createBooking(req, res, next);
  } catch (err) {
    console.error("Create booking error:", err.message);
    res.status(500).json({ message: "Failed to create booking" });
  }
});

// ✅ Cancel a booking
router.delete("/:id", verifyJWT, async (req, res, next) => {
  try {
    await cancelBooking(req, res, next);
  } catch (err) {
    console.error("Cancel booking error:", err.message);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// ✅ Past bookings
router.get("/past", verifyJWT, async (req, res, next) => {
  try {
    await PastBookings(req, res, next);
  } catch (err) {
    console.error("Past bookings error:", err.message);
    res.status(500).json({ message: "Failed to fetch past bookings" });
  }
});

// ✅ Upcoming bookings
router.get("/upcoming", verifyJWT, async (req, res, next) => {
  try {
    await UpcomingBookings(req, res, next);
  } catch (err) {
    console.error("Upcoming bookings error:", err.message);
    res.status(500).json({ message: "Failed to fetch upcoming bookings" });
  }
});

export default router;
