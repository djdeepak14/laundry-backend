import mongoose from "mongoose";

const machineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
    unique: true,
  },
  type: {
    type: String,
    enum: ["washer", "dryer"],
    required: true,
  },
  status: {
    type: String,
    enum: ["available", "booked", "out_of_service"], // added "booked"
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
    default: "Laundry Room", // optional, just helps show where it is
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Machine", machineSchema);
  