import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
    {
        machine: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Machine",
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        start: {
            type: Date,
            required: true
        },
        end: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ["booked", "completed", "cancelled"],
            default: "booked",
            index: true
        }
    },
    { timestamps: true }
);

BookingSchema.index(
    { machine: 1, start: 1, end: 1 },
    { unique: false }
);

const Booking = mongoose.model("Booking", BookingSchema);

export default Booking;
