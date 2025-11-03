// src/controllers/machine.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Machine from "../models/machine.model.js";

/**
 * ✅ Create a new machine (admin only)
 */
const createMachine = asyncHandler(async (req, res) => {
  const { code, type } = req.body;

  if (!code || !type) {
    throw new ApiError(400, "Both machine code and type are required");
  }

  if (!["dryer", "washer"].includes(type)) {
    throw new ApiError(400, "Type must be either 'dryer' or 'washer'");
  }

  const existing = await Machine.findOne({ code });
  if (existing) {
    throw new ApiError(409, "Machine with this code already exists");
  }

  const createdMachine = await Machine.create({
    code: code.trim(),
    type,
    isActive: true,
    status: "available",
  });

  return res
    .status(201)
    .json(new ApiResponse(201, createdMachine, "Machine created successfully"));
});

/**
 * ✅ Delete machine by ID or code
 */
const deleteMachine = asyncHandler(async (req, res) => {
  const { id, code } = req.params;

  if (!id && !code) {
    throw new ApiError(400, "Provide either machine ID or code");
  }

  let machine;
  if (id) {
    machine = await Machine.findByIdAndDelete(id);
  } else if (code) {
    machine = await Machine.findOneAndDelete({ code });
  }

  if (!machine) {
    throw new ApiError(404, "Machine not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, machine, "Machine deleted successfully"));
});

/**
 * ✅ Fetch machines by type (public)
 */
const machinesByType = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (!["washer", "dryer"].includes(type)) {
    throw new ApiError(400, "Invalid type. Must be 'washer' or 'dryer'");
  }

  const machines = await Machine.find({ type, isActive: true })
    .select("_id code type isActive status")
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, machines, `${type}s fetched successfully`));
});

/**
 * ✅ Fetch all machines (admin)
 */
const getAllMachines = asyncHandler(async (req, res) => {
  const machines = await Machine.find()
    .select("_id code type isActive status")
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, machines, "All machines fetched successfully"));
});

/**
 * ✅ Update machine status (admin only)
 */
const updateMachineStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["available", "booked", "maintenance"].includes(status)) {
    throw new ApiError(400, "Invalid machine status");
  }

  const machine = await Machine.findByIdAndUpdate(
    id,
    { status },
    { new: true }
  );

  if (!machine) {
    throw new ApiError(404, "Machine not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, machine, "Machine status updated successfully"));
});

export {
  createMachine,
  deleteMachine,
  machinesByType,
  getAllMachines,
  updateMachineStatus, 
};
