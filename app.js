import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// Enable Cross-Origin Resource Sharing with credentials support
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Parse incoming JSON requests (limit set to 16 KB)
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded request bodies (for form data)
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files from the "public" directory
app.use(express.static("public"));

// Parse cookies from client requests
app.use(cookieParser());

// Import route modules
import userRouter from "./src/routes/user.routes.js";
import machineRouter from "./src/routes/machine.routes.js";
import bookingRouter from "./src/routes/booking.router.js";

// Register API routes
app.use("/api/v1/user", userRouter);
app.use("/api/v1/machine", machineRouter);
app.use("/api/v1/booking", bookingRouter);

// Basic route for verifying that the server is running
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Everything is working correctly" });
});

// Export the Express application
export { app };
