import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cors from "cors";
import { connectDB } from "./src/db/index.js";
import bookingRoutes from "./src/routes/booking.router.js";
import machineRoutes from "./src/routes/machine.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import adminRoutes from "./src/routes/admin.routes.js"; // ✅ fixed import
import { verifyJWT, verifyAdmin } from "./src/controllers/auth.controller.js";

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// ✅ CORS setup
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

// --- Health Check ---
app.get("/status", (req, res) => res.json({ status: "ok", message: "Server running" }));
app.get("/api/v1/status", (req, res) => res.json({ status: "ok", message: "API online" }));

// --- Main API Routes ---
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/machines", machineRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes); // ✅ admin routes are properly registered

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Global error:", err.message);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// --- Connect DB + Start Server ---
connectDB()
  .then(() => {
    app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });

export { app };
