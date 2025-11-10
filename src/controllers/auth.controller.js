// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Middleware to verify a user's JWT token.
// It ensures the request is authenticated before allowing access to protected routes.
export const verifyJWT = async (req, res, next) => {
  try {
    // Read the authorization header (case-insensitive)
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing or invalid format" });
    }

    // Verify the token using the server's secret key
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      console.error("JWT verification failed:", err.message);

      // Handle expired or malformed tokens gracefully
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Session expired. Please log in again." });
      }
      return res.status(401).json({ message: "Invalid or malformed token" });
    }

    // Once verified, fetch the corresponding user and attach it to the request
    const user = await User.findById(decoded._id).select("-password -refreshToken");
    if (!user) {
      return res.status(401).json({ message: "User not found or deactivated" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("JWT Middleware Error:", err.message);
    return res.status(500).json({ message: "Internal authentication error" });
  }
};

// Middleware to ensure that only admin users can access specific routes.
// It should be used after verifyJWT, since it depends on req.user being set.
export const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== "admin") {
      console.warn(`Unauthorized access attempt by ${req.user.email}`);
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    next();
  } catch (err) {
    console.error("Admin verification error:", err.message);
    return res.status(500).json({ message: "Internal admin verification error" });
  }
};

// For backward compatibility with other modules that might use a different name
export const verifyAdmin = isAdmin;

// Controller for manual login.
// This endpoint verifies user credentials, checks approval status,
// and issues a JWT token if authentication is successful.
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Basic validation for missing fields
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.warn(`Login failed: No user found for ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check if the password matches the stored hash
    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      console.warn(`Login failed: Wrong password for ${email}`);
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Only approved users can log in
    if (!user.isApproved) {
      console.warn(`User not approved yet: ${email}`);
      return res.status(403).json({
        message: "Your account is awaiting admin approval",
      });
    }

    // Generate a signed access token containing user ID and role
    const accessToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
    );

    console.log(`Login success: ${user.email} (${user.role})`);

    // Return token and basic user info
    return res.status(200).json({
      message: "Login successful",
      accessToken,
      role: user.role,
      userId: user._id,
    });
  } catch (err) {
    console.error("Login controller error:", err.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};
