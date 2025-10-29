// machine.controller.js
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import Machine from "../models/machine.model.js";

// ✅ Create new machine (admin only)
const createMachine = asyncHandler(async (req, res) => {
  const { code, type } = req.body;

  if (!code || !type) {
    throw new ApiError(400, "Both machine code and type are required");
  }

  if (type !== "dryer" && type !== "washer") {
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
  });

  if (!createdMachine) {
    throw new ApiError(500, "Failed to create machine");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdMachine, "Machine created successfully"));
});

// ✅ Delete machine by ID or code
const deleteMachine = asyncHandler(async (req, res) => {
  const { id, code } = req.params;

  if (!id && !code) {
    throw new ApiError(400, "Provide either machine id or code");
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

// ✅ Fetch machines by type (public)
const machinesByType = asyncHandler(async (req, res) => {
  const { type } = req.params;

  if (type !== "washer" && type !== "dryer") {
    throw new ApiError(400, "Invalid type. Must be 'washer' or 'dryer'");
  }

  const machines = await Machine.find({ type, isActive: true })
    .select("_id code type isActive")
    .lean();

  if (!machines.length) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], `No ${type}s found in the database`));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, machines, `${type}s fetched successfully`));
});

// ✅ Fetch all machines (useful for admin or debugging)
const getAllMachines = asyncHandler(async (req, res) => {
  const machines = await Machine.find()
    .select("_id code type isActive")
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, machines, "All machines fetched successfully"));
});

export { createMachine, deleteMachine, machinesByType, getAllMachines };
