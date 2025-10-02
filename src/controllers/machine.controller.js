import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";
import Machine from "../models/machine.model.js";


const createMachine = asyncHandler(async (req, res) => {
    const { code, type } = req.body
    if (!code || !type) {
        throw new ApiError(400, "both machine code and type are required")
    }
    if (type !== "dryer" && type !== "washer") {
        throw new ApiError(400, "the machine must be dryer or washer");
    }

    const machineExists = await Machine.findOne({code:code})

    if(machineExists){
        throw new ApiError(409, "machine with the code already exists")
    }

    const createdMachine = await Machine.create({
        code: code.trim(),
        type: type
    })

    if (!createdMachine) {
        throw new ApiError(500, "Something went wrong while creating the machine")
    }
    return res
        .status(200)
        .json(new ApiResponse(201, createdMachine, "machine created successfully"))
})

const deleteMachine = asyncHandler(async (req, res) => {
  const { id, code } = req.params; 

  if (!id && !code) {
    throw new ApiError(400, "You must provide either machine id or code");
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

const machinesByType = asyncHandler(async (req, res) => {
  const { type } = req.params; 

  if (type !== "washer" && type !== "dryer") {
    throw new ApiError(400, "Invalid type. Must be 'washer' or 'dryer'");
  }

  const machines = await Machine.find({ type, isActive: true }).lean();

  return res
    .status(200)
    .json(new ApiResponse(200, machines, `${type}s fetched successfully`));
});



export { createMachine, deleteMachine, machinesByType }