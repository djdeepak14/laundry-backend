// server.js
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

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: "./.env" });
  console.log("Loaded local .env configuration");
}

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

console.log("Environment:", NODE_ENV);
console.log("Allowed Origin:", CORS_ORIGIN);

// CORS setup
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

// Middleware
app.use(express.json());

// Health check routes
app.get("/", (req, res) =>
  res.send("🚀 Laundry Backend is running successfully!")
);

app.get("/status", (req, res) =>
  res.json({ status: "ok", message: "Server running" })
);

app.get("/api/v1/status", (req, res) =>
  res.json({ status: "ok", message: "API online" })
);

// API routes
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/machines", machineRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);

// Background job: auto-release expired bookings every 10 minutes
cron.schedule("*/10 * * * *", async () => {
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
    console.log(`Auto-cleaned ${expired.length} expired bookings`);
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Global error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// Start server after DB connection
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log("✅ MongoDB connected");
      console.log(`✅ Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error);
    process.exit(1);
  });

export { app };
