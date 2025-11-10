import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// This controller handles admin operations related to users,
// including fetching all users, approving accounts, and deleting users.

/**
 * Fetch all users from the database.
 * Returns basic user information along with deletion request details.
 * Used primarily for the admin dashboard display.
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find(
    {},
    "name email username isApproved role createdAt deletionRequested deletionRequestedAt"
  ).sort({ createdAt: -1 });

  console.log(`Admin fetched ${users.length} users`);
  return res
    .status(200)
    .json(new ApiResponse(200, users, "Users fetched successfully."));
});

/**
 * Approve a user's registration.
 * This marks the user as approved without re-validating the password field.
 * The runValidators flag is turned off to avoid unnecessary password checks.
 */
export const approveUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) throw new ApiError(404, "User not found");

  if (user.isApproved) {
    return res
      .status(200)
      .json(new ApiResponse(200, user, "User is already approved."));
  }

  // Update approval status while skipping validation to prevent regex rechecks
  const updatedUser = await User.findByIdAndUpdate(
    id,
    { $set: { isApproved: true } },
    { new: true, runValidators: false }
  );

  console.log(`User approved: ${updatedUser.email}`);

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "User approved successfully."));
});

/**
 * Delete a user account.
 * Can be triggered when approving a GDPR deletion request or removing a user directly.
 * Prevents an admin from deleting their own account for safety reasons.
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await User.findById(id);

  if (!user) throw new ApiError(404, "User not found");

  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(403, "Cannot delete your own account");
  }

  await User.findByIdAndDelete(id, { runValidators: false });

  console.log(`User deleted by admin: ${user.email}`);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, `User ${user.email} deleted successfully.`));
});
