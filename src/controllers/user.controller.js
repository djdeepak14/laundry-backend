import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";

/**
 * Generate access and refresh tokens for a user.
 * Also stores the new refresh token in the database for future validation.
 */
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError(500, "Failed to generate tokens");
  }
};

/**
 * Register a new user account.
 * Validates input fields, enforces password security, and prevents duplicates.
 */
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  // Basic field validation
  if (!name || !email || !password || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  // Ensure email is not already registered
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  // Validate password strength (GDPR-compliant)
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    throw new ApiError(
      400,
      "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character."
    );
  }

  // Create user record
  let user;
  try {
    user = await User.create({
      name,
      username: name,
      password,
      email,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const message = Object.values(err.errors)
        .map((e) => e.message)
        .join(", ");
      throw new ApiError(400, message);
    }
    if (err.code === 11000) {
      throw new ApiError(400, "Email or username already exists");
    }

    console.error("Registration error:", err);
    throw new ApiError(500, "Failed to register user");
  }

  // Generate and return tokens after successful registration
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        201,
        {
          user: createdUser,
          role: createdUser.role,
          userId: createdUser._id,
          accessToken,
          refreshToken,
        },
        "User registered successfully"
      )
    );
});

/**
 * Log in an existing user.
 * Validates credentials and checks if the account has been approved by an admin.
 */
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Both email and password are required");
  }

  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(400, "User with this email does not exist");
  }

  const isValidPass = await user.isPasswordCorrect(password);
  if (!isValidPass) {
    throw new ApiError(400, "Invalid password");
  }

  if (!user.isApproved) {
    throw new ApiError(403, "Your account is awaiting admin approval.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          role: loggedInUser.role,
          userId: loggedInUser._id,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

/**
 * Log out a user.
 * Clears authentication tokens from cookies and invalidates the stored refresh token.
 */
const logoutUser = asyncHandler(async (req, res) => {
  if (!req.user?._id) {
    throw new ApiError(401, "Unauthorized access");
  }

  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

/**
 * Return details of the currently authenticated user.
 * Used to verify session or display user information on the frontend.
 */
const getCurrentUser = asyncHandler(async (req, res) => {
  const currUser = req.user;
  if (!currUser) {
    throw new ApiError(400, "No user found in request");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, currUser, "User data fetched successfully"));
});

/**
 * Allow a user to request account deletion.
 * The request must later be approved by an admin (GDPR compliance).
 */
const requestAccountDeletion = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const user = await User.findById(userId);

  if (!user) throw new ApiError(404, "User not found");

  if (user.deletionRequested) {
    throw new ApiError(
      400,
      "You have already requested account deletion. Please wait for admin approval."
    );
  }

  user.deletionRequested = true;
  user.deletionRequestedAt = new Date();
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        userId: user._id,
        email: user.email,
        requestedAt: user.deletionRequestedAt,
      },
      "Your account deletion request has been submitted to the admin."
    )
  );
});

/**
 * Allow an admin to toggle another user's role between 'admin' and 'user'.
 * The current admin cannot change their own role.
 */
const toggleUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");

  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, "Cannot change your own role");
  }

  const newRole = user.role === "admin" ? "user" : "admin";

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: { role: newRole } },
    { new: true, runValidators: false }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { role: updatedUser.role },
        "User role updated successfully"
      )
    );
});

// Export controller functions
export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestAccountDeletion,
  toggleUserRole,
};
