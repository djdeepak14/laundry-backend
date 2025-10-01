import { DateTime } from "luxon";
import Booking from "../models/booking.model.js";
import Machine from "../models/machine.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const createBooking = asyncHandler(async (req, res) => {
    const { machineId, start } = req.body;
    const userId = req.user?.id;

    if (!userId) throw new ApiError(401, "unauthorized request");
    if (!machineId || !start) throw new ApiError(400, "machineId and start time are required");

    const machine = await Machine.findById(machineId);
    if (!machine) throw new ApiError(404, "Machine not found");

    if (!machine.isActive) throw new ApiError(409, "Machine is inactive");
    if (machine.status === "out_of_service" || machine.booking?.enabled === false) {
        throw new ApiError(409, "Machine is not available for booking");
    }

    const startUtc = DateTime.fromISO(start, { zone: "utc" });
    if (!startUtc.isValid) throw new ApiError(400, "Invalid start ISO (UTC)");

    if (startUtc.minute !== 0 || startUtc.second !== 0 || startUtc.millisecond !== 0) {
        throw new ApiError(400, "Start must be exactly at HH:00");
    }

    const nowUtc = DateTime.utc();
    if (startUtc <= nowUtc) throw new ApiError(400, "Start must be in the future");

    const endUtc = startUtc.plus({ hours: 1 });

    const overlap = await Booking.findOne({
        machine: machineId,
        status: "booked",
        start: { $lt: endUtc.toJSDate() },
        end: { $gt: startUtc.toJSDate() }
    });
    if (overlap) throw new ApiError(409, "Time slot already booked");

    const booking = await Booking.create({
        machine: machineId,
        user: userId,
        start: startUtc.toJSDate(),
        end: endUtc.toJSDate(),
        status: "booked"
    });

    return res
        .status(201)
        .json(new ApiResponse(201, booking, "booked successfully"));
});


export const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "unauthorized request");

  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.status !== "booked") {
    return res.status(200).json(new ApiResponse(200, booking, "already not active"));
  }
  booking.status = "cancelled";
  await booking.save();

  return res.status(200).json(new ApiResponse(200, booking, "cancelled"));
});



export { createBooking }
