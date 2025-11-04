// src/controllers/booking.controller.js
import { DateTime } from "luxon";
import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Machine from "../models/machine.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

/* ===============================
   🧩 Utility Helpers
   =============================== */

// Calculate hours between two Date objects
const hourDiff = (a, b) => Math.max(0, Math.round((b - a) / 3600000));

// Auto-complete expired bookings and release machines
const autoUpdateExpiredBookings = async () => {
  const now = DateTime.utc().toJSDate();

  const expired = await Booking.find({
    status: "booked",
    end: { $lte: now },
  });

  for (const b of expired) {
    b.status = "completed";
    await b.save();

    const machine = await Machine.findById(b.machine);
    if (machine) {
      machine.status = "available";
      await machine.save();
    }
  }

  if (expired.length > 0) {
    console.log(`✅ Auto-completed ${expired.length} expired bookings`);
  }
};

// Get number of active bookings per machine type for a user
const getActiveBookingsCount = async ({ userId, type, session }) => {
  const filter = {
    user: userId,
    status: "booked",
    end: { $gt: DateTime.utc().toJSDate() },
  };

  if (type) {
    const machines = await Machine.find({ type }).select("_id").lean();
    filter.machine = { $in: machines.map((m) => m._id) };
  }

  return Booking.countDocuments(filter).session(session);
};

/* ===============================
   🧾 CREATE BOOKING
   =============================== */
const createBooking = asyncHandler(async (req, res) => {
  const { machineId, start } = req.body;
  const userId = req.user?._id;

  if (!userId) throw new ApiError(401, "Unauthorized request");
  if (!machineId || !start)
    throw new ApiError(400, "Machine ID and start time are required");

  const startUtc = DateTime.fromISO(start, { zone: "utc" });
  if (!startUtc.isValid) throw new ApiError(400, "Invalid start time");
  if (startUtc.minute !== 0)
    throw new ApiError(400, "Start time must be exactly on the hour");

  const nowUtc = DateTime.utc();
  if (startUtc <= nowUtc)
    throw new ApiError(400, "Start time must be in the future");

  const endUtc = startUtc.plus({ hours: 1 });
  const session = await mongoose.startSession();

  try {
    let responseData = null;

    await session.withTransaction(async () => {
      const machine = await Machine.findById(machineId).session(session);
      if (!machine) throw new ApiError(404, "Machine not found");
      if (!machine.isActive)
        throw new ApiError(409, "This machine is inactive.");
      if (
        machine.status === "out_of_service" ||
        machine.booking?.enabled === false
      )
        throw new ApiError(409, "This machine cannot be booked now.");

      // User overlap check
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
        throw new ApiError(409, "You already have a booking during this period.");
      }

      // Machine overlap check
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
        throw new ApiError(409, "This machine is already booked for that time slot.");
      }

      // Booking limits
      const washerCount = await getActiveBookingsCount({ userId, type: "washer", session });
      const dryerCount = await getActiveBookingsCount({ userId, type: "dryer", session });

      if (machine.type === "washer" && washerCount >= 2)
        throw new ApiError(403, "You have reached the maximum of 2 active washer bookings.");
      if (machine.type === "dryer" && dryerCount >= 2)
        throw new ApiError(403, "You have reached the maximum of 2 active dryer bookings.");

      // Create booking
      const [booking] = await Booking.create(
        [
          {
            machine: machine._id,
            user: userId,
            start: startUtc.toJSDate(),
            end: endUtc.toJSDate(),
            status: "booked",
          },
        ],
        { session }
      );

      machine.status = "booked";
      await machine.save({ session });

      // ✅ Populate with machine & user for better response
      const populated = await Booking.findById(booking._id)
        .populate("machine", "code name type status")
        .populate("user", "name email");

      responseData = populated;
    });

    return res
      .status(201)
      .json(new ApiResponse(201, responseData, "Booked successfully"));
  } catch (err) {
    console.error("Booking creation error:", err);
    throw new ApiError(err.statusCode || 500, err.message || "Booking failed");
  } finally {
    session.endSession();
  }
});

/* ===============================
   ❌ CANCEL BOOKING
   =============================== */
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
        throw new ApiError(403, "You cannot cancel this booking");

      booking.status = "cancelled";
      await booking.save({ session });

      const machine = await Machine.findById(booking.machine).session(session);
      if (machine) {
        machine.status = "available";
        await machine.save({ session });
      }

      responseData = booking;
    });

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, "Booking cancelled successfully"));
  } finally {
    session.endSession();
  }
});

/* ===============================
   📅 USER BOOKINGS
   =============================== */
const PastBookings = asyncHandler(async (req, res) => {
  await autoUpdateExpiredBookings();
  const userId = req.user?._id;
  const now = DateTime.utc().toJSDate();

  const bookings = await Booking.find({
    user: userId,
    status: { $in: ["completed", "cancelled"] },
    end: { $lt: now },
  }).populate("machine", "code name type");

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "Past bookings retrieved"));
});

const UpcomingBookings = asyncHandler(async (req, res) => {
  await autoUpdateExpiredBookings();
  const userId = req.user?._id;
  const now = DateTime.utc().toJSDate();

  const bookings = await Booking.find({
    user: userId,
    status: "booked",
    start: { $gte: now },
  }).populate("machine", "code name type status");

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "Upcoming bookings retrieved"));
});

/* ===============================
   🧮 ADMIN BOOKINGS
   =============================== */
const getAllBookings = asyncHandler(async (req, res) => {
  await autoUpdateExpiredBookings();

  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("machine", "code name type status");

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "All bookings retrieved successfully"));
});

const adminGetAllBookings = asyncHandler(async (req, res) => {
  await autoUpdateExpiredBookings();

  const bookings = await Booking.find({})
    .populate("user", "name email role")
    .populate("machine", "code name type status isActive")
    .sort({ start: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "Admin: All bookings retrieved"));
});

const adminCancelAnyBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const session = await mongoose.startSession();

  try {
    let responseData = null;
    await session.withTransaction(async () => {
      const booking = await Booking.findById(id)
        .populate("machine", "name code")
        .populate("user", "name email")
        .session(session);

      if (!booking) throw new ApiError(404, "Booking not found");

      booking.status = "cancelled";
      await booking.save({ session });

      const machine = await Machine.findById(booking.machine).session(session);
      if (machine) {
        machine.status = "available";
        await machine.save({ session });
      }

      responseData = booking;
    });

    return res
      .status(200)
      .json(new ApiResponse(200, responseData, "Booking cancelled by admin"));
  } finally {
    session.endSession();
  }
});

/* ===============================
   ✅ EXPORTS
   =============================== */
export {
  createBooking,
  cancelBooking,
  PastBookings,
  UpcomingBookings,
  getAllBookings,
  adminGetAllBookings,
  adminCancelAnyBooking,
};
