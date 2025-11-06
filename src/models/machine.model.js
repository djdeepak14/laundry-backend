import mongoose from "mongoose";

const machineSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ["washer", "dryer"],
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "booked", "out_of_service", "maintenance"],
    default: "available",
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  booking: {
    enabled: {
      type: Boolean,
      default: true,
    },
  },
  location: {
    type: String,
    default: "Laundry Room",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Machine", machineSchema);
