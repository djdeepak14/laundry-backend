// seedMachines.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import Machine from "./src/models/machine.model.js";

dotenv.config({ path: "./.env" });

const MONGO_URL = `${process.env.MONGODB_URI}/${process.env.DB_NAME}`;

const seedMachines = async () => {
  try {
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected to MongoDB");

    const machines = [
      {
        name: "Washing Machine 1",
        code: "WM1",
        type: "washer",
        status: "available",
        isActive: true,
        booking: { enabled: true },
        location: "Hostel A - Floor 1",
      },
      {
        name: "Washing Machine 2",
        code: "WM2",
        type: "washer",
        status: "available",
        isActive: true,
        booking: { enabled: true },
        location: "Hostel A - Floor 2",
      },
      {
        name: "Dryer 1",
        code: "DR1",
        type: "dryer",
        status: "available",
        isActive: true,
        booking: { enabled: true },
        location: "Hostel A - Floor 1",
      },
      {
        name: "Dryer 2",
        code: "DR2",
        type: "dryer",
        status: "available",
        isActive: true,
        booking: { enabled: true },
        location: "Hostel A - Floor 2",
      },
    ];

    await Machine.deleteMany({});
    await Machine.insertMany(machines);

    console.log("✅ Machines added successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
};

seedMachines();
