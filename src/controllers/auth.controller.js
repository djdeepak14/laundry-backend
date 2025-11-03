// src/controllers/auth.controller.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

/* ========================================
   🛡️ Middleware: Verify JWT Token
   ======================================== */
export const verifyJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing or invalid format" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      console.error("❌ JWT verification failed:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token has expired" });
      }
      return res.status(401).json({ message: "Invalid or malformed token" });
    }

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

/* ========================================
   👑 Middleware: Verify Admin Role
   ======================================== */
export const isAdmin = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied: Admins only" });
    }

    next();
  } catch (err) {
    console.error("Admin verification error:", err.message);
    return res.status(500).json({ message: "Internal admin verification error" });
  }
};

// ✅ For backward compatibility with routes importing verifyAdmin
export const verifyAdmin = isAdmin;

/* ========================================
   🔐 Controller: Manual Login (Optional)
   ======================================== */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await user.isPasswordCorrect(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    if (!user.isApproved) {
      return res
        .status(403)
        .json({ message: "Your account is awaiting admin approval" });
    }

    const accessToken = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "1d" }
    );

    console.log(`✅ Login success for: ${user.email} (${user.role})`);

    return res.json({
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
