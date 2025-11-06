// src/controllers/machine.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Machine from "../models/machine.model.js";

// Create a new machine (admin only)
const createMachine = asyncHandler(async (req, res) => {
  const { name, code, type, location } = req.body;

  if (!name || !code || !type) {
    throw new ApiError(400, "Machine name, code, and type are required");
  }
  if (!["washer", "dryer"].includes(type)) {
    throw new ApiError(400, "Type must be either 'washer' or 'dryer'");
  }

  const existing = await Machine.findOne({ code });
  if (existing) {
    throw new ApiError(409, "Machine with this code already exists");
  }

  const createdMachine = await Machine.create({
    name: name.trim(),
    code: code.trim(),
    type,
    location: location?.trim() || "Laundry Room",
    isActive: true,
    status: "available",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdMachine, "Machine created successfully"));
});

// Delete machine by ID or code
const deleteMachine = asyncHandler(async (req, res) => {
  const { id, code } = req.params;

  if (!id && !code) {
    throw new ApiError(400, "Provide either machine ID or code");
  }

  let machine;
  if (id) {
    machine = await Machine.findByIdAndDelete(id);
  } else {
    machine = await Machine.findOneAndDelete({ code });
  }

  if (!machine) {
    throw new ApiError(404, "Machine not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, machine, "Machine deleted successfully"));
});

// Fetch machines by type (user/admin)
const machinesByType = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!["washer", "dryer"].includes(type)) {
    throw new ApiError(400, "Invalid type. Must be 'washer' or 'dryer'");
  }

  const machines = await Machine.find({ type, isActive: true })
    .select("_id name code type status isActive")
    .sort({ code: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, machines, `${type}s fetched successfully`));
});

// Fetch all machines (admin)
const getAllMachines = asyncHandler(async (req, res) => {
  const machines = await Machine.find()
    .select("_id name code type isActive status location createdAt")
    .sort({ code: 1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, machines, "All machines fetched successfully"));
});

// Update machine status / active state (admin)
const updateMachineStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, isActive, booking } = req.body;

  const allowedStatuses = ["available", "booked", "out_of_service"];
  if (status && !allowedStatuses.includes(status)) {
    throw new ApiError(400, "Invalid machine status");
  }

  const updateData = {};
  if (status) updateData.status = status;
  if (typeof isActive === "boolean") updateData.isActive = isActive;
  if (booking && typeof booking.enabled === "boolean") {
    updateData["booking.enabled"] = booking.enabled;
  }

  const machine = await Machine.findByIdAndUpdate(id, updateData, { new: true });
  if (!machine) {
    throw new ApiError(404, "Machine not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, machine, "Machine updated successfully"));
});

export {
  createMachine,
  deleteMachine,
  machinesByType,
  getAllMachines,
  updateMachineStatus,
};
