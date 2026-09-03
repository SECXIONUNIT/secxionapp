import rateLimit from "express-rate-limit";
import logger from "../utils/logger.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const CSRF_HEADER_NAME = "x-csrf-token";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const issueCsrfToken = (req, res) => {
  if (!req.session) {
    return null;
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  res.locals.csrfToken = req.session.csrfToken;
  res.setHeader("X-CSRF-Token", req.session.csrfToken);
  return req.session.csrfToken;
};

const tokensMatch = (tokenA, tokenB) => {
  if (!tokenA || !tokenB) {
    return false;
  }

  const a = Buffer.from(String(tokenA));
  const b = Buffer.from(String(tokenB));

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

/**
 * Security Middleware Suite
 * - CSRF Protection
 * - Rate Limiting
 * - Token Refresh
 */

// ============================================
// CSRF PROTECTION MIDDLEWARE
// ============================================

export const csrfProtection = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    const safeToken = issueCsrfToken(req, res);

    if (!safeToken) {
      return res.status(500).json({
        success: false,
        message: "Session unavailable for CSRF validation",
        code: "CSRF_SESSION_UNAVAILABLE",
      });
    }

    return next();
  }

  const sessionToken = req.session?.csrfToken;

  if (!sessionToken) {
    return res.status(403).json({
      success: false,
      message: "CSRF token required",
      code: "CSRF_VALIDATION_FAILED",
    });
  }

  res.setHeader("X-CSRF-Token", sessionToken);

  const tokenFromHeader = req.headers[CSRF_HEADER_NAME];

  if (!tokenFromHeader) {
    logger.logError(
      "CSRF",
      "CSRF token validation failed - no token in header",
      null,
      {
        userId: req.user?.id,
        endpoint: req.originalUrl,
        method: req.method,
      },
    );

    return res.status(403).json({
      success: false,
      message: "CSRF token required",
      code: "CSRF_VALIDATION_FAILED",
    });
  }

  if (!tokensMatch(tokenFromHeader, sessionToken)) {
    logger.logError(
      "CSRF",
      "CSRF token mismatch",
      null,
      {
        userId: req.user?.id,
        endpoint: req.originalUrl,
        method: req.method,
      },
    );

    return res.status(403).json({
      success: false,
      message: "Invalid CSRF token",
      code: "CSRF_VALIDATION_FAILED",
    });
  }

  next();
};

export { issueCsrfToken };

// ============================================
// RATE LIMITING MIDDLEWARE
// ============================================

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => {
    // Skip global limiter for authenticated traffic and auth lifecycle endpoints.
    // Login/signup/reset keep their dedicated strict limiters.
    const path = req.originalUrl || req.path || "";
    const hasAuthToken = Boolean(
      req.cookies?.token || req.headers.authorization,
    );

    if (hasAuthToken) {
      return true;
    }

    const alwaysBypassPaths = [
      "/api/health",
      "/api/signin",
      "/api/signup",
      "/api/admin-signin",
      "/api/request-reset",
      "/api/confirm-reset",
      "/api/resend-verification",
      "/api/verify-email",
      "/api/csrf-token",
    ];

    return alwaysBypassPaths.some((bypassPath) => path.startsWith(bypassPath));
  },
  handler: (req, res) => {
    logger.logError("RATE_LIMIT", "Rate limit exceeded", null, {
      endpoint: req.originalUrl,
    });

    res.status(429).json({
      success: false,
      message: "Too many requests. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 attempts per windowMs
  skipSuccessfulRequests: true, // Don't count successful requests
  skipFailedRequests: false, // Count failed requests
  message: "Too many login attempts, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for mobile app requests
    const platform = req.headers["x-platform"];
    return platform === "mobile";
  },
  handler: (req, res) => {
    logger.logAuth("LOGIN_ATTEMPT", "BRUTE_FORCE", "blocked", {
      attempts: req.rateLimit.current,
    });

    res.status(429).json({
      success: false,
      message: "Too many login attempts. Please try again in 15 minutes.",
      code: "AUTH_RATE_LIMIT_EXCEEDED",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Moderate rate limiter for signup
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signup attempts per hour
  message: "Too many accounts created for this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logError("SIGNUP_RATE_LIMIT", "Signup rate limit exceeded");

    res.status(429).json({
      success: false,
      message: "Too many signup attempts. Please try again in 1 hour.",
      code: "SIGNUP_RATE_LIMIT_EXCEEDED",
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Rate limiter for password reset
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 reset requests per hour
  message: "Too many password reset attempts.",
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logError(
      "PASSWORD_RESET_LIMIT",
      "Password reset rate limit exceeded",
    );

    res.status(429).json({
      success: false,
      message: "Too many password reset attempts. Please try again in 1 hour.",
      code: "PASSWORD_RESET_RATE_LIMIT_EXCEEDED",
    });
  },
});

// ============================================
// TOKEN REFRESH MECHANISM
// ============================================

import RefreshToken from "../models/refreshTokenModel.js";

/**
 * Generate new access token
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {string} role - User role
 * @returns {string} JWT access token
 */
export const generateAccessToken = (userId, email, role = "GENERAL") => {
  const token = jwt.sign(
    {
      _id: userId,
      email,
      role,
      type: "access",
    },
    process.env.TOKEN_SECRET_KEY,
    {
      expiresIn: "1h", // Increased from 15m for production balance
      issuer: "secxion",
      audience: "secxion-app",
    },
  );

  return token;
};

/**
 * Generate new refresh token and store in DB
 * @param {string} userId - User ID
 * @param {object} metadata - req info (ip, userAgent)
 * @returns {object} Refresh token and expiry
 */
export const generateRefreshToken = async (userId, metadata = {}) => {
  const tokenId = crypto.randomBytes(32).toString("hex");

  const token = jwt.sign(
    {
      _id: userId,
      tokenId,
      type: "refresh",
    },
    process.env.TOKEN_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "secxion",
      audience: "secxion-app",
    },
  );

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    tokenId,
    token,
    expiresAt,
    ip: metadata.ip,
    userAgent: metadata.userAgent,
  });

  logger.logAuth("REFRESH_TOKEN_GENERATED", "AUTHENTICATED_USER", "success");

  return {
    refreshToken: token,
    expiresAt,
    expiresIn: "7d",
  };
};

/**
 * Refresh access token using refresh token from DB
 */
export const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.TOKEN_SECRET_KEY, {
      issuer: "secxion",
      audience: "secxion-app",
    });

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    const storedToken = await RefreshToken.findOne({
      tokenId: decoded.tokenId,
      userId: decoded._id
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new Error("Refresh token has been revoked or not found");
    }

    if (new Date() > storedToken.expiresAt) {
      throw new Error("Refresh token has expired");
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(decoded._id, null, "GENERAL");

    logger.logAuth("TOKEN_REFRESHED", "AUTHENTICATED_USER", "success");

    return {
      accessToken: newAccessToken,
      expiresIn: "1h",
    };
  } catch (error) {
    logger.logError("REFRESH_TOKEN", "Token refresh failed", error, {
      error: error.message,
    });

    throw {
      code: "INVALID_REFRESH_TOKEN",
      message: "Refresh token is invalid or expired",
    };
  }
};

/**
 * Revoke refresh token (logout)
 */
export const revokeRefreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.TOKEN_SECRET_KEY);

    const result = await RefreshToken.updateOne(
      {},
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      logger.logAuth("TOKEN_REVOKED", decoded._id, "success");
    }
  } catch (error) {
    logger.logError("REVOKE_TOKEN", "Failed to revoke token", error);
  }
};

/**
 * Cleanup expired refresh tokens (MongoDB TTL index handles this mostly)
 */
export const cleanupExpiredTokens = async () => {
  try {
    const result = await RefreshToken.deleteMany({ expiresAt: { $lt: new Date() } });
    if (result.deletedCount > 0) {
      logger.info(`[TOKEN_CLEANUP] Removed ${result.deletedCount} expired refresh tokens`);
    }
  } catch (error) {
    logger.logError("TOKEN_CLEANUP", "Failed to cleanup tokens", error);
  }
};

// Run cleanup every hour outside test environment.
if (process.env.NODE_ENV !== "test") {
  setInterval(cleanupExpiredTokens, 60 * 60 * 1000);
}

export default {
  csrfProtection,
  apiLimiter,
  authLimiter,
  signupLimiter,
  passwordResetLimiter,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
};
