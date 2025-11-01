import { DateTime } from "luxon";
import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Machine from "../models/machine.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// Helper to calculate hours between start and end times
const hourDiff = (a, b) => Math.max(0, Math.round((b - a) / 3600000));

// Helper to count active user bookings by machine type
const getActiveBookingsCount = async ({ userId, type, session }) => {
  const filter = {
    user: userId,
    status: "booked",
    end: { $gt: DateTime.utc().toJSDate() }, // Only count active (future) bookings
  };

  if (type) {
    const machines = await Machine.find({ type }).select("_id").lean();
    filter.machine = { $in: machines.map((m) => m._id) };
  }

  return Booking.countDocuments(filter).session(session);
};

// Create a new booking
const createBooking = asyncHandler(async (req, res) => {
  const { machineId, start } = req.body;
  const userId = req.user?._id;

  console.log(`Booking attempt: user=${userId}, machine=${machineId}, start=${start}`);

  if (!userId) throw new ApiError(401, "Unauthorized request");
  if (!machineId || !start) throw new ApiError(400, "Machine ID and start time are required");

  const startUtc = DateTime.fromISO(start, { zone: "utc" });
  if (!startUtc.isValid) throw new ApiError(400, "Invalid start time");
  if (startUtc.minute !== 0) throw new ApiError(400, "Start time must be exactly on the hour");

  const nowUtc = DateTime.utc();
  if (startUtc <= nowUtc) throw new ApiError(400, "Start time must be in the future");

  const endUtc = startUtc.plus({ hours: 1 });
  const session = await mongoose.startSession();

  try {
    let responseData = null;
    await session.withTransaction(async () => {
      // Validate machine
      const machine = await Machine.findById(machineId).session(session);
      if (!machine) throw new ApiError(404, "Machine not found");
      if (!machine.isActive) throw new ApiError(409, "This machine is inactive.");
      if (machine.status === "out_of_service" || machine.booking?.enabled === false)
        throw new ApiError(409, "This machine cannot be booked now.");

      // Check for overlapping bookings by user
      const userOverlap = await Booking.findOne({
        user: userId,
        status: "booked",
        $or: [
          { start: { $lt: endUtc.toJSDate(), $gte: startUtc.toJSDate() } },
          { end: { $gt: startUtc.toJSDate(), $lte: endUtc.toJSDate() } },
          { start: { $lte: startUtc.toJSDate() }, end: { $gte: endUtc.toJSDate() } },
        ],
      }).session(session);

      if (userOverlap) {
        const conflictStart = DateTime.fromJSDate(userOverlap.start).toFormat("HH:mm");
        const conflictEnd = DateTime.fromJSDate(userOverlap.end).toFormat("HH:mm");
        throw new ApiError(409, `You already have a booking from ${conflictStart} to ${conflictEnd} UTC.`);
      }

      // Check for overlapping bookings on the machine
      const machineOverlap = await Booking.findOne({
        machine: machineId,
        status: "booked",
        $or: [
          { start: { $lt: endUtc.toJSDate(), $gte: startUtc.toJSDate() } },
          { end: { $gt: startUtc.toJSDate(), $lte: endUtc.toJSDate() } },
          { start: { $lte: startUtc.toJSDate() }, end: { $gte: endUtc.toJSDate() } },
        ],
      }).session(session);

      if (machineOverlap) {
        throw new ApiError(409, "This machine is already booked for the selected time.");
      }

      // Check 2-booking limit per machine type
      const washerCount = await getActiveBookingsCount({ userId, type: "washer", session });
      const dryerCount = await getActiveBookingsCount({ userId, type: "dryer", session });

      if (machine.type === "washer" && washerCount >= 2) {
        throw new ApiError(403, "You have reached the maximum of 2 active washer bookings.");
      }
      if (machine.type === "dryer" && dryerCount >= 2) {
        throw new ApiError(403, "You have reached the maximum of 2 active dryer bookings.");
      }

      // Create booking
      const booking = await Booking.create(
        [{
          machine: machine._id,
          user: userId,
          start: startUtc.toJSDate(),
          end: endUtc.toJSDate(),
          status: "booked",
        }],
        { session }
      );

      machine.status = "booked";
      await machine.save({ session });
      const populated = await booking[0].populate("machine", "code name type");
      responseData = populated;
    });

    console.log(`Booking created: user=${userId}, machine=${machineId}, start=${start}`);
    return res.status(201).json(new ApiResponse(201, responseData, "Booked successfully"));
  } catch (err) {
    console.error("Transaction error:", err);
    if (err.code === 11000 || err.name === "MongoServerError") {
      throw new ApiError(409, "This time slot was just booked by someone else.");
    }
    throw new ApiError(err.statusCode || 500, err.message || "Booking failed due to server error.");
  } finally {
    session.endSession();
  }
});

// Cancel a booking (user)
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const session = await mongoose.startSession();
  try {
    let responseData = null;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) throw new ApiError(404, "Booking not found");
      if (booking.user.toString() !== userId.toString())
        throw new ApiError(403, "Not authorized to cancel this booking");

      booking.status = "cancelled";
      await booking.save({ session });

      const machine = await Machine.findById(booking.machine).session(session);
      if (!machine) throw new ApiError(404, "Associated machine not found");
      machine.status = "available";
      await machine.save({ session });

      responseData = booking;
    });

    return res.status(200).json(new ApiResponse(200, responseData, "Booking cancelled successfully."));
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
});

// Get past bookings for a user
const PastBookings = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const now = DateTime.utc().toJSDate();

  const bookings = await Booking.find({
    user: userId,
    status: { $in: ["completed", "cancelled"] },
    end: { $lt: now },
  }).populate("machine", "code name type");

  return res.status(200).json(new ApiResponse(200, bookings, "Past bookings retrieved"));
});

// Get upcoming bookings for a user
const UpcomingBookings = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const now = DateTime.utc().toJSDate();

  const bookings = await Booking.find({
    user: userId,
    status: "booked",
    start: { $gte: now },
  }).populate("machine", "code name type");

  return res.status(200).json(new ApiResponse(200, bookings, "Upcoming bookings retrieved"));
});

// Get all bookings (user)
const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("machine", "code name type status");
  return res.status(200).json(new ApiResponse(200, bookings, "All bookings retrieved successfully"));
});

// Get all bookings (admin)
const adminGetAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({})
    .populate("user", "name email role")
    .populate("machine", "code name type status isActive")
    .sort({ start: -1 });

  return res.status(200).json(new ApiResponse(200, bookings, "Admin: All bookings retrieved"));
});

// Cancel any booking (admin)
const adminCancelAnyBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    let responseData = null;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(id).session(session);
      if (!booking) throw new ApiError(404, "Booking not found");

      booking.status = "cancelled";
      await booking.save({ session });

      const machine = await Machine.findById(booking.machine).session(session);
      if (!machine) throw new ApiError(404, "Associated machine not found");
      machine.status = "available";
      await machine.save({ session });

      responseData = booking;
    });

    return res.status(200).json(new ApiResponse(200, responseData, "Booking cancelled by admin"));
  } catch (err) {
    throw err;
  } finally {
    session.endSession();
  }
});

export {
  createBooking,
  cancelBooking,
  PastBookings,
  UpcomingBookings,
  getAllBookings,
  adminGetAllBookings,
  adminCancelAnyBooking,
};