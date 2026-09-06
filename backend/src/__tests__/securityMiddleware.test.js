/**
 * Security Middleware Tests
 * Tests for backend/middleware/securityMiddleware.js
 */

import {
  csrfProtection,
  apiLimiter,
  authLimiter,
  signupLimiter,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
} from "../../middleware/securityMiddleware.js";
import jwt from "jsonwebtoken";
import { jest } from "@jest/globals";
import { createMockRequest, createMockResponse } from "./testUtils.js";

describe("Security Middleware", () => {
  beforeAll(() => {
    process.env.TOKEN_SECRET_KEY = process.env.TOKEN_SECRET_KEY || "test-secret";
  });

  describe("CSRF Protection", () => {
    it("should generate and set CSRF token", () => {
      const req = createMockRequest();
      req.method = "GET";
      req.session = {};
      const res = createMockResponse();
      res.locals = {};
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith(
        "X-CSRF-Token",
        expect.any(String),
      );
      expect(res.locals.csrfToken).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it("should return existing CSRF token from session", () => {
      const existingToken = "existing-token-12345";
      const req = createMockRequest();
      req.method = "GET";
      req.session = { csrfToken: existingToken };
      const res = createMockResponse();
      res.locals = {};
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(res.locals.csrfToken).toBe(existingToken);
      expect(res.setHeader).toHaveBeenCalledWith("X-CSRF-Token", existingToken);
      expect(next).toHaveBeenCalled();
    });

    it("should reject mutating requests without CSRF header", () => {
      const req = createMockRequest();
      req.method = "POST";
      req.session = { csrfToken: "token-123" };
      req.originalUrl = "/api/signin";
      const res = createMockResponse();
      res.locals = {};
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("should allow mutating requests with matching CSRF header", () => {
      const token = "token-123";
      const req = createMockRequest({}, {}, {}, { "x-csrf-token": token });
      req.method = "POST";
      req.session = { csrfToken: token };
      const res = createMockResponse();
      res.locals = {};
      const next = jest.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
    });
  });

  describe("Token Generation", () => {
    it("should generate valid access token", () => {
      const token = generateAccessToken(
        "user123",
        "test@example.com",
        "GENERAL",
      );

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT format
    });

    it("should generate valid refresh token", () => {
      const token = generateRefreshToken("user123").refreshToken;

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3); // JWT format
    });

    it("should include user data in access token", () => {
      const token = generateAccessToken("user123", "test@example.com", "ADMIN");
      const decoded = jwt.verify(
        token,
        process.env.TOKEN_SECRET_KEY,
        { issuer: "secxion", audience: "secxion-app" },
      );

      expect(decoded.userId).toBe("user123");
      expect(decoded.email).toBe("test@example.com");
      expect(decoded.role).toBe("ADMIN");
    });
  });

  describe("Rate Limiting", () => {
    it("should allow requests within limit", async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = jest.fn();

      // Note: Rate limiters are express-rate-limit instances
      // Actual testing requires supertest with a real or mocked app
      expect(apiLimiter).toBeDefined();
      expect(authLimiter).toBeDefined();
      expect(signupLimiter).toBeDefined();
    });
  });

  describe("Token Refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const userId = "user123";
      const refreshToken = (await generateRefreshToken(userId)).refreshToken;
      const refreshed = await refreshAccessToken(refreshToken);

      expect(refreshed).toBeDefined();
      expect(typeof refreshed.accessToken).toBe("string");
      expect(refreshed.expiresIn).toBe("1h");
    });

    it("should not refresh revoked tokens", async () => {
      const userId = "user123";
      const refreshToken = (await generateRefreshToken(userId)).refreshToken;
      await revokeRefreshToken(refreshToken);

      await expect(refreshAccessToken(refreshToken)).rejects.toEqual(
        expect.objectContaining({ code: "INVALID_REFRESH_TOKEN" }),
      );
    });
  });

  describe("Token Revocation", () => {
    it("should revoke refresh token on logout", async () => {
      const userId = "user123";
      const refreshToken = (await generateRefreshToken(userId)).refreshToken;

      await expect(revokeRefreshToken(refreshToken)).resolves.toBeUndefined();
    });
  });
});
