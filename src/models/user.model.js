import dotenv from "dotenv";
dotenv.config({ path: "./.env" });
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

/**
 * User Schema
 * Defines the structure of user data stored in MongoDB.
 * Includes password validation, GDPR-related fields, and authentication helpers.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address",
      ],
    },

    /**
     * Password field with validation for strong security.
     * Only validated when creating or updating the password.
     */
    password: {
      type: String,
      required: [true, "Password is required"],
      validate: {
        validator: function (value) {
          // Validate only if password is new or modified
          if (!this.isModified("password")) return true;

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

    // Indicates whether the user has been approved by an admin
    isApproved: {
      type: Boolean,
      default: false,
    },

    // Stores the exact date/time when admin approved the user
    approvedAt: {
      type: Date,
      default: null,
    },

    refreshToken: {
      type: String,
      select: false, // Exclude by default for security
    },

    // GDPR-related fields for account deletion tracking
    deletionRequested: {
      type: Boolean,
      default: false,
    },
    deletionRequestedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

/**
 * Pre-save hook
 * Hashes the password before saving it to the database.
 * This ensures that plain text passwords are never stored.
 */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Instance method to compare a plain-text password
 * with the stored hashed password.
 */
userSchema.methods.isPasswordCorrect = async function (password) {
  return bcrypt.compare(password, this.password);
};

/**
 * Instance method to generate a short-lived access token (JWT).
 * Used for authentication in protected routes.
 */
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, role: this.role },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
  );
};

/**
 * Instance method to generate a long-lived refresh token (JWT).
 * Used to issue new access tokens without re-login.
 */
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d" }
  );
};

/**
 * Modify the JSON output to exclude sensitive data.
 * This prevents exposure of passwords, tokens, or internal fields.
 */
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.refreshToken;
  delete userObject.__v;
  return userObject;
};

/**
 * Export the User model.
 * Represents users in the database and provides helper methods.
 */
const User = mongoose.model("User", userSchema);
export default User;
