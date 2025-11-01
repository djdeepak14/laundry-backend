import dotenv from "dotenv";
import mongoose from "mongoose";

// ✅ Always load .env from the project root
dotenv.config({ path: "./.env" });

export const connectDB = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const DB_NAME = process.env.DB_NAME || "laundrydb";

    if (!MONGODB_URI) {
      throw new Error("❌ MONGODB_URI not found in environment variables");
    }

    // ✅ If URI already includes a DB name (Atlas usually does), don’t append it
    const fullURI = MONGODB_URI.includes(DB_NAME)
      ? MONGODB_URI
      : `${MONGODB_URI.replace(/\/$/, "")}/${DB_NAME}`;

    const connectionInstance = await mongoose.connect(fullURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB connected successfully: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};
