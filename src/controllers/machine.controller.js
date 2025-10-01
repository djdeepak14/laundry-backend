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
    if (type !== "dryer" || type !== "washer") {
        throw new ApiError(400, "the machine must be dryer or washer");
    }

    const createdMachine = await Machine.create({
        code: code,
        type: type
    })

    if (!createdMachine) {
        throw new ApiError(500, "Something went wrong while creating the machine")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, createdMachine, "machine created successfully"))
})


export { createMachine }