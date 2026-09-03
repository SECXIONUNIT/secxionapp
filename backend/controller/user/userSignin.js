import bcrypt from "bcryptjs";
import userModel from "../../models/userModel.js";
import jwt from "jsonwebtoken";
import {
  generateAccessToken,
  generateRefreshToken
} from "../../middleware/securityMiddleware.js";
import { verifyTurnstileToken } from "../../utils/turnstileVerification.js";

async function userSignInController(req, res, next) {
  try {
    const { email: rawEmail, password, turnstileToken, puzzleSolved } = req.body;
    const email = rawEmail?.toLowerCase().trim();

    if (!email || !password) {
      const err = new Error("Please provide email and password.");
      err.status = 400;
      throw err;
    }

    // Skip verification for mobile app or if custom puzzle was solved
    const platform = req.headers["x-platform"] || req.headers["X-Platform"];
    const isMobileApp = platform === "mobile";
    const skipVerification = isMobileApp || puzzleSolved === true;

    if (!skipVerification) {
      // Verify Cloudflare Turnstile token for standard web requests
      const remoteIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
      const turnstileResult = await verifyTurnstileToken(turnstileToken, remoteIp);
      
      if (!turnstileResult.success) {
        console.log("Turnstile verification failed");
        const err = new Error("Human verification failed. Please try again.");
        err.status = 403;
        throw err;
      }
    } else {
    }

    const user = await userModel.findOne({ email }).select("+password");
    if (!user) {
      const err = new Error("User not found.");
      err.status = 404;
      throw err;
    }
    const checkPassword = await bcrypt.compare(password, user.password);
    if (!checkPassword) {
      const err = new Error("Incorrect password.");
      err.status = 401;
      throw err;
    }
    if (!user.isVerified) {
      const err = new Error("Please verify your email before logging in.");
      err.status = 403;
      throw err;
    }
    const tokenData = {
      _id: user._id,
      email: user.email,
    };

    // Pass metadata for refresh token storage
    const metadata = {
      ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    };

    const token = await generateAccessToken(user._id, user.email, user.role);
    const { refreshToken } = await generateRefreshToken(user._id, metadata);

    const isProduction = process.env.NODE_ENV === "production";
    const tokenOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    };
    res
      .cookie("token", token, tokenOptions)
      .cookie("refreshToken", refreshToken, tokenOptions)
      .status(200)
      .json({
        message: "Login successful",
        data: {
          token,
          refreshToken,
          user: {
            _id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
          },
        },
        success: true,
        error: false,
      });
  } catch (err) {
    console.error("🔥 Sign-in Error:", err);
    err.message = err.message || "Internal server error.";
    err.status = err.status || 500;
    next(err);
  }
}

export default userSignInController;
