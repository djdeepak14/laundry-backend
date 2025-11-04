import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";

/**
 * Generate both Access and Refresh Tokens
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
    console.error("❌ Token generation error:", error);
    throw new ApiError(500, "Failed to generate tokens");
  }
};

/**
 * ✅ Register User
 */
const registerUser = asyncHandler(async (req, res) => {
  console.log("🟢 Register payload:", req.body);
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    throw new ApiError(400, "All fields are required");
  }

  if (password !== confirmPassword) {
    throw new ApiError(400, "Passwords do not match");
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiError(400, "Invalid email format");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(400, "User with this email already exists");
  }

  const user = await User.create({
    name,
    username: name,
    password,
    email,
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  console.log("✅ User registered:", { email: user.email, id: user._id });

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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
 * ✅ Login User
 */
const loginUser = asyncHandler(async (req, res) => {
  console.log("🔐 Login payload:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Both fields are required");
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

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  console.log("✅ User logged in:", {
    email: loggedInUser.email,
    role: loggedInUser.role,
  });

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
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
 * ✅ Logout User
 */
const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    { $unset: { refreshToken: 1 } },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  console.log("🚪 User logged out:", req.user.email);

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

/**
 * ✅ Get Current User (for /user/info)
 */
const getCurrentUser = asyncHandler(async (req, resp) => {
  const currUser = req.user;
  if (!currUser) {
    throw new ApiError(400, "No user found in request");
  }

  console.log("👤 Current user fetched:", currUser.email);

  return res
    .status(200)
    .json(new ApiResponse(200, currUser, "User data fetched successfully"));
});

/**
 * ⚖️ GDPR - Request Account Deletion
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

  console.log(`🧾 User requested account deletion: ${user.email}`);

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
 * ✅ Toggle User Role (admin <-> user)
 */
const toggleUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, "User not found");
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, "Cannot change your own role");
  }
  user.role = user.role === "admin" ? "user" : "admin";
  await user.save();
  console.log(`🔄 User role toggled: ${user.email} to ${user.role}`);
  return res.status(200).json(
    new ApiResponse(200, { role: user.role }, "User role updated successfully")
  );
});

/**
 * ✅ Exports
 */
export {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  requestAccountDeletion,
  toggleUserRole,
};