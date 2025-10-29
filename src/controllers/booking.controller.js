// booking.controller.js
import { DateTime } from "luxon";
import Booking from "../models/booking.model.js";
import Machine from "../models/machine.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

// Helper for parsing boolean query params
const parseBool = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue;
  return String(value).toLowerCase() === "true";
};

// ✅ CREATE BOOKING
const createBooking = asyncHandler(async (req, res) => {
  console.log("Create booking payload:", req.body);
  const { machineId, start } = req.body;
  const userId = req.user?._id;

  if (!userId) throw new ApiError(401, "Unauthorized request");
  if (!machineId || !start)
    throw new ApiError(400, "Machine ID and start time are required");

  const machine = await Machine.findById(machineId);
  if (!machine) throw new ApiError(404, "Machine not found");

  if (!machine.isActive)
    throw new ApiError(409, "Machine is inactive");
  if (machine.status === "out_of_service" || machine.booking?.enabled === false)
    throw new ApiError(409, "Machine is not available for booking");

  const startUtc = DateTime.fromISO(start, { zone: "utc" });
  if (!startUtc.isValid) throw new ApiError(400, "Invalid start ISO (UTC)");
  if (startUtc.minute !== 0 || startUtc.second !== 0 || startUtc.millisecond !== 0)
    throw new ApiError(400, "Start time must be exactly at HH:00");

  const nowUtc = DateTime.utc();
  if (startUtc <= nowUtc)
    throw new ApiError(400, "Start time must be in the future");

  const endUtc = startUtc.plus({ hours: 1 });

  // Check for overlapping booking
  const overlap = await Booking.findOne({
    machine: machineId,
    status: "booked",
    start: { $lt: endUtc.toJSDate() },
    end: { $gt: startUtc.toJSDate() },
  });
  if (overlap) throw new ApiError(409, "Time slot already booked");

  const booking = await Booking.create({
    machine: machineId,
    user: userId,
    start: startUtc.toJSDate(),
    end: endUtc.toJSDate(),
    status: "booked",
  });

  if (!booking) throw new ApiError(500, "Failed to create booking");

  // Update machine status automatically
  machine.status = "booked";
  await machine.save();

  return res
    .status(201)
    .json(new ApiResponse(201, booking, "Booked successfully"));
});

// ✅ CANCEL BOOKING
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized request");

  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  if (booking.user.toString() !== userId.toString()) {
    throw new ApiError(403, "Not authorized to cancel this booking");
  }

  if (booking.status !== "booked") {
    return res
      .status(200)
      .json(new ApiResponse(200, booking, "Booking already not active"));
  }

  booking.status = "cancelled";
  await booking.save();

  const machine = await Machine.findById(booking.machine);
  if (machine) {
    machine.status = "available";
    await machine.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking cancelled"));
});

// ✅ GET ALL BOOKINGS (for frontend sync)
const getAllBookings = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) throw new ApiError(401, "Unauthorized request");

  // Optional: show all active bookings, or just user’s
  const showAll = parseBool(req.query.all, false);

  const query = showAll
    ? { status: { $in: ["booked", "in_progress"] } }
    : { user: new mongoose.Types.ObjectId(userId) };

  const bookings = await Booking.find(query)
    .populate("machine", "code type status isActive booking")
    .sort({ start: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "Bookings retrieved successfully"));
});

// ✅ PAST BOOKINGS
const PastBookings = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized request");

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const includeCancelled = parseBool(req.query.includeCancelled, false);
  const now = DateTime.utc().toJSDate();

  const statusMatch = includeCancelled
    ? { $in: ["completed", "cancelled"] }
    : "completed";

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: statusMatch,
        end: { $lt: now },
      },
    },
    {
      $lookup: {
        from: "machines",
        localField: "machine",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              code: 1,
              type: 1,
              status: 1,
              isActive: 1,
              booking: 1,
            },
          },
        ],
        as: "machine",
      },
    },
    { $unwind: { path: "$machine", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        start: 1,
        end: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        "machine._id": 1,
        "machine.code": 1,
        "machine.type": 1,
        "machine.status": 1,
        "machine.isActive": 1,
        "machine.booking": 1,
      },
    },
    {
      $facet: {
        items: [{ $sort: { start: -1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
    {
      $project: {
        items: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
      },
    },
  ];

  const [result] = await Booking.aggregate(pipeline);
  return res.status(200).json(
    new ApiResponse(
      200,
      { page, limit, total: result?.total ?? 0, items: result?.items ?? [] },
      "Past bookings retrieved"
    )
  );
});

// ✅ UPCOMING BOOKINGS
const UpcomingBookings = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized request");

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const includeCancelled = parseBool(req.query.includeCancelled, false);
  const now = DateTime.utc().toJSDate();

  const statusMatch = includeCancelled
    ? { $in: ["booked", "cancelled"] }
    : "booked";

  const pipeline = [
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: statusMatch,
        start: { $gte: now },
      },
    },
    {
      $lookup: {
        from: "machines",
        localField: "machine",
        foreignField: "_id",
        pipeline: [
          {
            $project: {
              _id: 1,
              code: 1,
              type: 1,
              status: 1,
              isActive: 1,
              booking: 1,
            },
          },
        ],
        as: "machine",
      },
    },
    { $unwind: { path: "$machine", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        start: 1,
        end: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        "machine._id": 1,
        "machine.code": 1,
        "machine.type": 1,
        "machine.status": 1,
        "machine.isActive": 1,
        "machine.booking": 1,
      },
    },
    {
      $facet: {
        items: [{ $sort: { start: 1 } }, { $skip: (page - 1) * limit }, { $limit: limit }],
        total: [{ $count: "count" }],
      },
    },
    {
      $project: {
        items: 1,
        total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
      },
    },
  ];

  const [result] = await Booking.aggregate(pipeline);
  return res.status(200).json(
    new ApiResponse(
      200,
      { page, limit, total: result?.total ?? 0, items: result?.items ?? [] },
      "Upcoming bookings retrieved"
    )
  );
});

export {
  createBooking,
  cancelBooking,
  getAllBookings,
  PastBookings,
  UpcomingBookings,
};
