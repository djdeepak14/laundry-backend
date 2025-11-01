// seedAdminAndMachines.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import Machine from "./src/models/machine.model.js";
import User from "./src/models/user.model.js";

dotenv.config({ path: "./.env" });

// ▶️ CONFIG
const MONGO_URL =
  process.env.MONGODB_URI && process.env.DB_NAME
    ? `${process.env.MONGODB_URI}/${process.env.DB_NAME}`
    : process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/laundry";

const ADMIN_EMAIL = "deepak.khanal@seamk.fi";
const ADMIN_NAME = "System Admin";
const ADMIN_USERNAME = "admin"; // will be unique if not taken
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "ChangeMe123!"; // change later in prod

const machinesSeed = [
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

async function connect() {
  await mongoose.connect(MONGO_URL);
  console.log("✅ Connected to MongoDB:", MONGO_URL);
}

async function seedMachines() {
  console.log("⏳ Seeding machines...");
  await Machine.deleteMany({});
  await Machine.insertMany(machinesSeed);
  console.log("✅ Machines added successfully!");
}

async function seedAdmin() {
  console.log("⏳ Ensuring admin account exists...");

  // Try to find existing user by email
  let user = await User.findOne({ email: ADMIN_EMAIL });

  if (!user) {
    // Create brand new admin (pre-save hook will hash the password)
    user = await User.create({
      name: ADMIN_NAME,
      username: ADMIN_USERNAME,
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      isApproved: true,
    });
    console.log(`✅ Admin created: ${ADMIN_EMAIL}`);
  } else {
    // Ensure role + approval; reset password only if ADMIN_PASSWORD is set explicitly
    user.role = "admin";
    user.isApproved = true;

    if (process.env.ADMIN_PASSWORD) {
      user.password = ADMIN_PASSWORD; // will be re-hashed by pre-save
      console.log("🔐 Admin password reset from ADMIN_PASSWORD env var.");
    }

    await user.save();
    console.log(`✅ Admin ensured/updated: ${ADMIN_EMAIL}`);
  }
}

async function run() {
  try {
    await connect();
    await seedMachines();
    await seedAdmin();
    console.log("🎉 Seeding complete.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err?.message || err);
    process.exit(1);
  }
}

run();
