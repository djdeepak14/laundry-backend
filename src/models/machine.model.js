import mongoose from "mongoose";

const MachineSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            trim: true,
            unique: true,
            index: true
        },
        type: {
            type: String,
            enum: ['washer', 'dryer'],
            required: true
        },

        booking: {
            enabled: { type: Boolean, default: true },
            timezone: { type: String, default: 'Europe/Berlin' },
        },

        status: {
            type: String,
            enum: ['available', 'in_use', 'out_of_service'],
            default: 'available',
            index: true
        },
        isActive: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);


const Machine = mongoose.model('Machine', MachineSchema);

export default Machine
