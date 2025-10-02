import { DateTime } from "luxon";
import Booking from "../models/booking.model.js";
import Machine from "../models/machine.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import mongoose from "mongoose";

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


const cancelBooking = asyncHandler(async (req, res) => {
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

const PastBookings = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "unauthorized request");

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const includeCancelled = parseBool(req.query.includeCancelled, false);
    const now = DateTime.utc().toJSDate();

    const statusMatch = includeCancelled ? { $in: ["completed", "cancelled"] } : "completed";
    const parseBool = (v, d=false) => (v === undefined ? d : String(v) === "true");

    const pipeline = [
        {
            $match: {
                user: mongoose.Types.ObjectId(userId),
                status: statusMatch,
                end: { $lt: now },
            }
        },
        {
            $lookup: {
                from: "machines",
                localField: "machine",
                foreignField: "_id",
                pipeline: [
                    { $project: { _id: 1, code: 1, type: 1, status: 1, isActive: 1, booking: 1 } }
                ],
                as: "machine"
            }
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
            }
        },
        {
            $facet: {
                items: [
                    { $sort: { start: -1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit }
                ],
                total: [
                    { $count: "count" }
                ]
            }
        },
        {
            $project: {
                items: 1,
                total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] }
            }
        }
    ];

    const [result] = await Booking.aggregate(pipeline);
    return res.status(200).json(new ApiResponse(200, {
        page, limit, total: result?.total ?? 0, items: result?.items ?? []
    }, "past bookings"));
});

const UpcomingBookings = asyncHandler(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "unauthorized request");

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
    const includeCancelled = parseBool(req.query.includeCancelled, false);
    const now = DateTime.utc().toJSDate();

    const statusMatch = includeCancelled ? { $in: ["booked", "cancelled"] } : "booked";

    const parseBool = (v, d = false) => (v === undefined ? d : String(v) === "true");

    const pipeline = [
        {
            $match: {
                user: mongoose.Types.ObjectId(userId),
                status: statusMatch,
                start: { $gte: now },
            }
        },

        {
            $lookup: {
                from: "machines",
                localField: "machine",
                foreignField: "_id",
                pipeline: [
                    { $project: { _id: 1, code: 1, type: 1, status: 1, isActive: 1, booking: 1 } }
                ],
                as: "machine"
            }
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
            }
        },

        {
            $facet: {
                items: [
                    { $sort: { start: 1 } },
                    { $skip: (page - 1) * limit },
                    { $limit: limit }
                ],
                total: [
                    { $count: "count" }
                ]
            }
        },
        {
            $project: {
                items: 1,
                total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] }
            }
        }
    ];

    const [result] = await Booking.aggregate(pipeline);
    return res.status(200).json(new ApiResponse(200, {
        page, limit, total: result?.total ?? 0, items: result?.items ?? []
    }, "upcoming bookings"));
});

export { createBooking, cancelBooking, PastBookings, UpcomingBookings }
