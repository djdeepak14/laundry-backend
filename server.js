import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./src/db/index.js";
import bookingRoutes from "./src/routes/booking.router.js";
import machineRoutes from "./src/routes/machine.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";

// --- Load environment variables ---
// If running locally, load from .env
if (process.env.NODE_ENV !== "production") {
  dotenv.config({ path: "./.env" });
  console.log("🧩 Loaded local .env configuration");
}

const app = express();

// --- Config ---
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN =
  process.env.CORS_ORIGIN || "http://localhost:3000";

console.log("🌍 Environment:", process.env.NODE_ENV || "development");
console.log("🔗 CORS_ORIGIN:", CORS_ORIGIN);

// --- CORS setup ---
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

// --- Health check routes ---
app.get("/", (req, res) =>
  res.send("🚀 Laundry Backend is running successfully!")
);
app.get("/status", (req, res) =>
  res.json({ status: "ok", message: "Server running" })
);
app.get("/api/v1/status", (req, res) =>
  res.json({ status: "ok", message: "API online" })
);

// --- Main API Routes ---
app.use("/api/v1/booking", bookingRoutes);
app.use("/api/v1/machines", machineRoutes);
app.use("/api/v1/user", userRoutes);
app.use("/api/v1/admin", adminRoutes);

// --- Global Error Handler ---
app.use((err, req, res, next) => {
  console.error("Global error:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

// --- Connect DB + Start Server ---
connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`✅ Server running on port ${PORT}`)
    );
  })
  .catch((error) => {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  });

export { app };
