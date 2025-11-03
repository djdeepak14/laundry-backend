import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    // ✅ Password with validation
    password: {
      type: String,
      required: [true, "Password required"],
      validate: {
        validator: function (value) {
          // Require: 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
          const regex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
          return regex.test(value);
        },
        message:
          "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, one number, and one special character.",
      },
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
    },

    // ✅ GDPR-related fields (fixed names)
    deletionRequested: {
      type: Boolean,
      default: false, // true = user requested account deletion
    },
    deletionRequestedAt: {
      type: Date,
      default: null, // timestamp when user requested deletion
    },
  },
  { timestamps: true } // adds createdAt and updatedAt automatically
);

// ✅ Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// ✅ Compare password for login
userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

// ✅ Generate JWT access token
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
  );
};

// ✅ Generate JWT refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};

const User = mongoose.model("User", userSchema);
export default User;
