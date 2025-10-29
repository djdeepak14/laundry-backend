// server.js
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { app } from "./app.js";
import express from "express";
import cors from "cors";
import { connectDB } from "./src/db/index.js";
import bookingRoutes from "./src/routes/booking.router.js";
import machineRoutes from "./src/routes/machine.routes.js";
import userRoutes from "./src/routes/user.routes.js";

// Auth middleware
import { verifyJWT, verifyAdmin, login } from "./src/controllers/auth.controller.js";

// Models for admin routes
import User from "./src/models/user.model.js";
import Booking from "./src/models/booking.model.js";

// Config
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// Middleware
app.use(
  cors({
    origin:
      CORS_ORIGIN === "*"
        ? "*"
        : [CORS_ORIGIN, "http://localhost:3000", "https://your-frontend.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

// --- ✅ Health check routes ---
app.get("/status", (req, res) => {
  res.json({ status: "ok", message: "Server is running" });
});

// ✅ Add this route for frontend compatibility
app.get("/api/v1/status", (req, res) => {
  res.json({ status: "ok", message: "API v1 server is healthy" });
});

// --- API routes ---
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/machines", machineRoutes);
app.use("/api/v1/user", userRoutes);

// --- Login endpoint ---
app.post("/api/v1/user/login", login);

// --- Root endpoint ---
app.get("/api/v1", (req, res) => {
  res.json({ message: "Laundry Booking API running successfully" });
});

// --- Admin routes ---
app.get("/api/v1/admin/users", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password -refreshToken");
    res.json(users);
  } catch (err) {
    console.error("Admin get users error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/v1/admin/bookings", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const bookings = await Booking.find().populate("userId", "username");
    res.json(bookings);
  } catch (err) {
    console.error("Admin get bookings error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/v1/admin/users/:id", verifyJWT, verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: `User ${req.params.id} deleted` });
  } catch (err) {
    console.error("Admin delete user error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("Global error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// --- Connect MongoDB and start server ---
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });
