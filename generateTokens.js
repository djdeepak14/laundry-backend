import jwt from "jsonwebtoken";
import crypto from "crypto";

// Generate secure random secrets
const ACCESS_TOKEN_SECRET = crypto.randomBytes(64).toString("hex");
const REFRESH_TOKEN_SECRET = crypto.randomBytes(64).toString("hex");

console.log("ACCESS_TOKEN_SECRET =", ACCESS_TOKEN_SECRET);
console.log("REFRESH_TOKEN_SECRET =", REFRESH_TOKEN_SECRET);

// Example payload
const payload = {
  Role: "Admin",
  Issuer: "Issuer",
  Username: "JavaInUse"
};

// Generate tokens
const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: "1d" });
const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: "10d" });

console.log("\nACCESS_TOKEN =", accessToken);
console.log("REFRESH_TOKEN =", refreshToken);
