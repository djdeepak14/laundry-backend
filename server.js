import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import { DateTime } from "luxon";
import Booking from "./src/models/booking.model.js";
import Machine from "./src/models/machine.model.js";
import { connectDB } from "./src/db/index.js";

import bookingRoutes from "./src/routes/booking.router.js";
import machineRoutes from "./src/routes/machine.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";

dotenv.config({ path: "./.env" });

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: [
      CORS_ORIGIN,
      "http://localhost:3000",
      "http://localhost:3001",
      "https://laundry-frontend-nine.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());

// ✅ Health Check
app.get("/", (req, res) => {
  res.send("🚀 Laundry Backend is running successfully!");
});

app.get("/status", (_, res) => res.json({ status: "ok", message: "Server running" }));
app.get("/api/v1/status", (_, res) => res.json({ status: "ok", message: "API online" }));

// ✅ Main API Routes
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/machines", machineRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);

// ✅ Background job: auto-clean expired bookings
cron.schedule("*/10 * * * *", async () => {
  try {
    const now = DateTime.utc().toJSDate();
    const expired = await Booking.find({ status: "booked", end: { $lte: now } });

    for (const b of expired) {
      b.status = "completed";
      await b.save();

      const machine = await Machine.findById(b.machine);
      if (machine) {
        machine.status = "available";
        await machine.save();
      }
    }

    if (expired.length > 0) {
      console.log(`🧹 Auto-cleaned ${expired.length} expired bookings`);
    }
  } catch (err) {
    console.error("❌ Error during booking cleanup:", err.message);
  }
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
    path: req.originalUrl,
  });
});

// ✅ Global Error Handler
app.use((err, req, res, next) => {
  console.error("❌ Global error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ✅ Start Server
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });

export { app };
