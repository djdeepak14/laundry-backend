import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import User from "../models/user.model.js";


const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken = refreshToken

        await user.save({ validateBeforeSave: false });
        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(400, "Something went wrong while generating access and refresh token", error)
    }
}

const registerUser = asyncHandler(async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password || !confirmPassword) {
        throw new ApiError(400, "All fields are required");
    }

    if (password !== confirmPassword) {
        throw new ApiError(400, "passwords do not match")
    }

    const existingUser = await User.findOne({ email: email })

    if (existingUser) {
        throw new ApiError(400, "user with the email already exists")
    }

    //TODO check if both email and password are valid or not

    const user = await User.create({
        name: name,
        username: name,
        password: password,
        email: email
    })

    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) {
        throw new ApiError(500, "Soomething went wrong while saving the data")
    }
    return res
        .status(200)
        .json(new ApiResponse(200, createdUser, "user registered successfully"))
})

const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    if (!email || !password) {
        throw new ApiError(400, "both fields are required")
    }

    const user = await User.findOne({ email: email }).select("-refreshToken")

    if (!user) {
        throw new ApiError(400, "user with email does not exist")
    }

    const isValidPass = await user.isPasswordCorrect(password);

    if (!isValidPass) {
        throw new ApiError(400, "invalid password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { loggedInUser, accessToken, refreshToken }, "User logged in successfully"))

})

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged out successfully"));
})

const getCurrentUser = asyncHandler(async (req, res) => {
    const currUser = req.user

    if (!currUser) {
        throw new ApiError(400, "no user")
    }

    return res
        .status(200)
        .json(new ApiResponse(200, currUser, "User data fetched successfully"))
})


export {
    registerUser,
    loginUser,
    logoutUser,
    getCurrentUser
}