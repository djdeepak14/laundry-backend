// src/models/booking.model.js
import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  machine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Machine",
    required: true,
  },
  start: {
    type: Date,
    required: true,
  },
  end: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["booked", "completed", "cancelled"],
    default: "booked",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update `updatedAt` on every save
bookingSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

// CRITICAL: PREVENT OVERLAPPING BOOKINGS
// Only applies when status is "booked"
bookingSchema.index(
  {
    machine: 1,
    start: 1,
    end: 1,
  },
  {
    unique: true,
    partialFilterExpression: { status: "booked" },
    name: "no_overlap_booked_machine",
  }
);

// Optional: Speed up user & admin queries
bookingSchema.index({ user: 1, status: 1, start: -1 });
bookingSchema.index({ start: -1 });

export default mongoose.model("Booking", bookingSchema);