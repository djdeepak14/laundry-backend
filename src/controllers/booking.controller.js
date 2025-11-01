// src/controllers/booking.controller.js
import { DateTime } from "luxon";
import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import Machine from "../models/machine.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const hourDiff = (a, b) => Math.max(0, Math.round((b - a) / 3600000));
const extractIndex = (s = "") => {
  const m = String(s).match(/(\d+)\s*$/);
  return m ? m[1] : null;
};

const findBestDryer = async ({ afterStart, afterEnd, preferIndex, session }) => {
  const base = {
    type: "dryer",
    isActive: true,
    status: { $ne: "out_of_service" },
  };

  let dryers = [];
  if (preferIndex) {
    dryers = await Machine.find({
      ...base,
      $or: [
        { code: new RegExp(`${preferIndex}$`) },
        { name: new RegExp(`${preferIndex}$`) },
      ],
    }).session(session);
  }
  if (!dryers.length) dryers = await Machine.find(base).session(session);

  for (const d of dryers) {
    const overlap = await Booking.findOne({
      machine: d._id,
      status: "booked",
      start: { $lt: afterEnd },
      end: { $gt: afterStart },
    }).session(session);
    if (!overlap) return d;
  }
  return null;
};

const getWeeklyBookedHours = async ({ userId, weekStart, weekEnd, session }) => {
  const bookings = await Booking.find({
    user: userId,
    status: "booked",
    start: { $gte: weekStart, $lte: weekEnd },
  }).session(session);

  return bookings.reduce((acc, b) => acc + hourDiff(b.start, b.end), 0);
};

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
      // 1. User can't have active booking
      const active = await Booking.findOne({
        user: userId,
        status: "booked",
        end: { $gt: nowUtc.toJSDate() },
      }).session(session);
      if (active) {
        throw new ApiError(
          403,
          "You already have an active reservation. Please wait until it finishes or cancel before booking again."
        );
      }

      // 2. Machine exists & is bookable
      const machine = await Machine.findById(machineId).session(session);
      if (!machine) throw new ApiError(404, "Machine not found");
      if (!machine.isActive)
        throw new ApiError(409, "This machine is inactive.");
      if (machine.status === "out_of_service" || machine.booking?.enabled === false)
        throw new ApiError(409, "This machine cannot be booked now.");

      // 3. PREVENT OVERLAP – FULLY ROBUST
      const overlap = await Booking.findOne({
        machine: machineId,
        status: "booked",
        $or: [
          { start: { $lt: endUtc.toJSDate(), $gte: startUtc.toJSDate() } },
          { end: { $gt: startUtc.toJSDate(), $lte: endUtc.toJSDate() } },
          { start: { $lte: startUtc.toJSDate() }, end: { $gte: endUtc.toJSDate() } },
        ],
      }).session(session);

      if (overlap) {
        const conflictStart = DateTime.fromJSDate(overlap.start).toFormat("HH:mm");
        const conflictEnd = DateTime.fromJSDate(overlap.end).toFormat("HH:mm");
        throw new ApiError(
          409,
          `This machine is already booked from ${conflictStart} to ${conflictEnd} UTC.`
        );
      }

      // 4. Weekly 2-hour limit
      const weekStart = startUtc.startOf("week").toJSDate();
      const weekEnd = startUtc.endOf("week").toJSDate();
      const totalHours = await getWeeklyBookedHours({
        userId,
        weekStart,
        weekEnd,
        session,
      });
      const nextWeekStart = DateTime.fromJSDate(weekStart)
        .plus({ weeks: 1 })
        .toFormat("dd LLL yyyy");

      const hoursToAdd = machine.type === "washer" ? 2 : 1;
      if (totalHours + hoursToAdd > 2) {
        throw new ApiError(
          403,
          `You’ve reached your weekly 2-hour booking limit. You can book again after ${nextWeekStart}, or cancel an existing booking.`
        );
      }

      // 5. Auto-dryer for washer
      if (machine.type === "washer") {
        const dryerStart = endUtc.toJSDate();
        const dryerEnd = endUtc.plus({ hours: 1 }).toJSDate();
        const preferIndex = extractIndex(machine.code || machine.name);
        const dryer = await findBestDryer({
          afterStart: dryerStart,
          afterEnd: dryerEnd,
          preferIndex,
          session,
        });
        if (!dryer)
          throw new ApiError(
            409,
            "No dryer available for the hour immediately after your washer booking."
          );

        const washerBooking = await Booking.create(
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
        const dryerBooking = await Booking.create(
          [
            {
              machine: dryer._id,
              user: userId,
              start: dryerStart,
              end: dryerEnd,
              status: "booked",
            },
          ],
          { session }
        );

        machine.status = "booked";
        dryer.status = "booked";
        await machine.save({ session });
        await dryer.save({ session });

        const [washerPop, dryerPop] = await Promise.all([
          washerBooking[0].populate("machine", "code name type"),
          dryerBooking[0].populate("machine", "code name type"),
        ]);

        responseData = { washer: washerPop, autoDryer: dryerPop };
      } else {
        const booking = await Booking.create(
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
        const populated = await booking[0].populate("machine", "code name type");
        responseData = populated;
      }
    });

    return res
      .status(201)
      .json(new ApiResponse(201, responseData, "Booked successfully"));
  } catch (err) {
    // HANDLE RACE CONDITION: MongoDB duplicate key error
    if (err.code === 11000 || err.name === "MongoServerError") {
      throw new ApiError(409, "This time slot was just booked by someone else. Please choose another.");
    }
    throw err;
  } finally {
    session.endSession();
  }
});

// === USER ROUTES ===
const cancelBooking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.user.toString() !== userId.toString())
    throw new ApiError(403, "Not authorized to cancel this booking");

  booking.status = "cancelled";
  await booking.save();

  const machine = await Machine.findById(booking.machine);
  if (machine) {
    machine.status = "available";
    await machine.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking cancelled successfully."));
});

const PastBookings = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
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
  const userId = req.user?._id;
  if (!userId) throw new ApiError(401, "Unauthorized");
  const now = DateTime.utc().toJSDate();

  const bookings = await Booking.find({
    user: userId,
    status: "booked",
    start: { $gte: now },
  }).populate("machine", "code name type");

  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "Upcoming bookings retrieved"));
});

const getAllBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate("user", "name email")
    .populate("machine", "code name type status");
  return res
    .status(200)
    .json(new ApiResponse(200, bookings, "All bookings retrieved successfully"));
});

// === ADMIN ROUTES ===
const adminGetAllBookings = asyncHandler(async (req, res) => {
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

  const booking = await Booking.findById(id);
  if (!booking) throw new ApiError(404, "Booking not found");

  booking.status = "cancelled";
  await booking.save();

  const machine = await Machine.findById(booking.machine);
  if (machine) {
    machine.status = "available";
    await machine.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, booking, "Booking cancelled by admin"));
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