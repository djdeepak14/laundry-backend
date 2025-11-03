import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * ✅ Get all users (includes deletion request fields)
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find(
    {},
    "name email username isApproved role createdAt deletionRequested deletionRequestedAt"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully."));
});

/**
 * ✅ Approve user registration
 */
export const approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  user.isApproved = true;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User approved successfully."));
});

/**
 * ✅ Approve account deletion (GDPR)
 * Admin permanently deletes user after review
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) throw new ApiError(404, "User not found");

  await User.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, `User ${user.email} deleted successfully.`));
});
