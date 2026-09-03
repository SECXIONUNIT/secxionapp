import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

import userSignUpController from "../controller/user/userSignUp.js";
import userSignInController from "../controller/user/userSignin.js";
import adminSignInController from "../controller/user/adminSignin.js";
import userDetailsController from "../controller/user/userDetails.js";
import authToken from "../middleware/authToken.js";
import userLogout from "../controller/user/userLogout.js";
import allUsers from "../controller/user/allUsers.js";
import updateUser from "../controller/user/UpdateUser.js";
import UploadProductController from "../controller/product/uploadProduct.js";
import getProductController from "../controller/product/getProduct.js";
import updateProductController from "../controller/product/updateProduct.js";
import getCategoryProduct from "../controller/product/getCategoryProductOne.js";
import getCategoryWiseProduct from "../controller/product/getCategoryWiseProduct.js";
import getProductDetails from "../controller/product/getProductDetails.js";
import SearchProduct from "../controller/product/searchProduct.js";
import filterProductController from "../controller/product/filterProduct.js";
import UserUploadMarketController from "../controller/product/userUploadMarket.js";
import getMarketController from "../controller/product/getUserMarket.js";
import marketRecordController from "../controller/product/marketRecord.js";
import {
  getAllUserMarkets,
  updateMarketStatus,
} from "../controller/product/userMarketController.js";
import {
  createBlogNote,
  getAllBlogNotes,
  updateBlogNote,
  deleteBlogNote,
} from "../controller/blogNoteController.js";
import submitReportController from "../controller/user/submitReportController.js";
import getUserReportsController from "../controller/user/getUserReportsController.js";
import {
  getAllReportsController,
  replyToReportController,
} from "../controller/user/adminReports.js";
import {
  getAllDataPads,
  createDataPad,
  updateDataPad,
  deleteDataPad,
} from "../controller/dataPadController.js";
import {
  createContactUsMessage,
  getAllContactUsMessages,
} from "../controller/contactUsController.js";
import { getAllUserDataPadsForAdmin } from "../controller/user/adminDataPadController.js";
import {
  getWalletBalance,
  getOtherUserWalletBalance,
} from "../controller/wallet/walletController.js";
import {
  createPaymentRequest,
  getAllPaymentRequests,
  getUserPaymentRequests,
  updatePaymentRequestStatus,
} from "../controller/wallet/paymentRequestController.js";
import {
  addBankAccount,
  getBankAccounts,
  deleteBankAccount,
  sendBankAddCode,
  verifyAndAddBankAccount,
} from "../controller/wallet/bankAccounController.js";
import { getUserTransactions } from "../controller/wallet/transactionsController.js";
import {
  getUserTransactionNotifications,
  markNotificationAsRead,
  deleteNotification,
  markAllNotificationsAsRead,
  deleteAllNotifications,
  getUserReportNotifications,
  fetchReportDetails,
  getUnreadNotificationCount,
  getNewNotifications,
  getMarketNotifications,
} from "../controller/notifications/notificationsController.js";
import getReportDetailsController from "../controller/user/getReportDetailsController.js";
import userReplyReportController from "../controller/report/userReplyReportController.js";
import getReportChatController from "../controller/report/getReportChatController.js";
import sendChatMessageController from "../controller/report/sendChatMessageController.js";
import userProfileController from "../controller/userProfileController.js";
import getMarketByIdController from "../controller/product/getMarketByIDController.js";
import {
  getApprovedPostsController,
  submitNewPostController,
  deletePostController,
  addCommentController,
} from "../controller/user/communityController.js";
import {
  getPendingPostsController,
  approvePostController,
  rejectPostController,
} from "../controller/user/adminCommunityController.js";
import getUserPostsController from "../controller/user/getUserPostsController.js";
import { verifyEmailController } from "../controller/user/verifyEmailController.js";
import deleteUser from "../controller/user/deleteUser.js";
import {
  sendResetCode,
  verifyReset,
} from "../controller/user/resetController.js";
import { resendVerificationEmailController } from "../controller/user/resendVerificationEmailController.js";
import {
  getPaystackBanks,
  resolveBankAccount,
} from "../controller/wallet/paystackController.js";
import {
  getUserEthWallet,
  saveEthWalletAddress,
  withdrawEth,
} from "../controller/wallet/ethWalletController.js";
import {
  createEthWithdrawalRequest,
  getAllEthWithdrawalRequests,
  getEthWithdrawalStatus,
  getSingleEthWithdrawalRequest,
  updateEthWithdrawalStatus,
} from "../controller/ethWithdrawalController.js";
import {
  getAdminEarningsSummary,
  getAdminEarnings,
  getCommissionRates,
  updateCommissionRate,
  getAdminWallets,
  getMyAdminWallet,
  getPlatformBalance,
  getAuthorizedAdmins,
  createAdminPayout,
  getPayoutHistory,
} from "../controller/admin/adminEarningsController.js";
import {
  getAuthorizedAdminsList,
  authorizeAdmin,
  revokeAuthorization,
  toggleAdminStatus,
  migrateHardcodedAdmins,
} from "../controller/admin/adminAuthorizationController.js";
import {
  createLiveScriptRequest,
  getUserLiveScriptRequests,
  getLiveScriptRequestById,
  deleteLiveScriptRequest,
  getAllLiveScriptRequests,
  updateLiveScriptStatus,
  replyToLiveScriptRequest,
  adminReplyToLiveScriptRequest,
} from "../controller/liveScriptController.js";
import {
  submitKyc,
  getMyKyc,
  getAllKycSubmissions,
  reviewKycSubmission,
  deleteKycSubmission,
  getKycStats,
  ingestKycFaceMatchResult,
  sendKycPhoneVerificationCode,
  verifyKycPhoneCode,
} from "../controller/kycController.js";
import {
  confirmNewsletterSubscription,
  getNewsletterHealth,
  getNewsletterStats,
  getNewsletterSubscribers,
  sendNewsletterCampaign,
  subscribeNewsletter,
  unsubscribeNewsletter,
} from "../controller/newsletterController.js";
import { getSmsHealthStatus } from "../utils/smsService.js";
import { generateSliderVerification } from "../utils/sliderVerification.js";
import getLastUserMarketStatusController from "../controller/product/getLastUserMarketStatusController.js";
import noCache from "../middleware/noCache.js";
import { verifyAdmin } from "../middleware/authMiddleware.js";
import {
  csrfProtection,
  issueCsrfToken,
  apiLimiter,
  authLimiter,
  signupLimiter,
  passwordResetLimiter,
  generateAccessToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
} from "../middleware/securityMiddleware.js";
import verifyDepartmentAccess, {
  assertDepartmentRouteMappings,
} from "../middleware/departmentAuth.js";

const router = express.Router();

assertDepartmentRouteMappings();

// Apply department access verification to all routes
router.use(verifyDepartmentAccess);

// Apply helmet middleware to all routes
router.use(
  helmet({
    frameguard: { action: "deny" }, // Set X-Frame-Options to 'DENY'
  }),
);

const rateLimitBypassPaths = new Set([
  "/eth-price",
  "/eth-market",
  "/eth-chart",
  "/ping",
]);

router.use((req, res, next) => {
  if (rateLimitBypassPaths.has(req.path)) {
    return next();
  }
  return apiLimiter(req, res, next);
});

const cache = {};
const CACHE_TTL = 5 * 60 * 1000;
const ETH_PRICE_CACHE_TTL = 30 * 1000;
const ETH_MARKET_CACHE_TTL = 60 * 1000;
const ETH_CHART_CACHE_TTL = 60 * 1000;
const USD_NGN_CACHE_TTL = 60 * 1000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function verifyApiKey(req, res, next) {
  const apiKey = req.header("x-api-key");
  if (!apiKey || apiKey !== process.env.ETH_PRICE_API_KEY) {
    return res.status(401).json({ error: "Unauthorized: Invalid API Key" });
  }
  next();
}

async function axiosGetWithRetry(
  url,
  options = {},
  retries = 3,
  backoff = 500,
) {
  try {
    const response = await axios.get(url, options);
    return response;
  } catch (error) {
    const status = error.response?.status;
    if ([401, 429].includes(status) || retries === 0) throw error;
    await sleep(backoff);
    return axiosGetWithRetry(url, options, retries - 1, backoff * 2);
  }
}

// Helper function to fetch ETH price from multiple sources
async function fetchEthPriceFromSources() {
  const fetchUsdToNgn = async () => {
    const fxSources = [
      async () => {
        const response = await axios.get("https://open.er-api.com/v6/latest/USD", {
          timeout: 5000,
        });
        const rate = response.data?.rates?.NGN;
        if (!rate) throw new Error("open.er-api missing NGN");
        return rate;
      },
      async () => {
        const response = await axios.get("https://api.exchangerate.host/latest?base=USD&symbols=NGN", {
          timeout: 5000,
        });
        const rate = response.data?.rates?.NGN;
        if (!rate) throw new Error("exchangerate.host missing NGN");
        return rate;
      },
    ];

    for (const source of fxSources) {
      try {
        return await source();
      } catch (error) {
        console.warn(`[eth-price] USD/NGN source failed: ${error.message}`);
      }
    }

    return 1600;
  };

  const sources = [
    // Source 1: CoinGecko (primary)
    async () => {
      const url = new URL("https://api.coingecko.com/api/v3/simple/price");
      url.searchParams.set("ids", "ethereum");
      url.searchParams.set("vs_currencies", "usd,ngn");
      url.searchParams.set("include_24hr_change", "true");
      const response = await axios.get(url.toString(), {
        headers: { Accept: "application/json", "User-Agent": "Secxion-App/1.0" },
        timeout: 8000,
      });
      const data = response.data.ethereum;
      if (!data || !data.usd) throw new Error("Invalid CoinGecko response");
      return { usd: data.usd, ngn: data.ngn, change_24h: data.usd_24h_change, source: "coingecko" };
    },
    // Source 2: Binance (fallback - high rate limits)
    async () => {
      const response = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT", {
        timeout: 8000,
      });
      const usdPrice = parseFloat(response.data.price);
      if (!usdPrice) throw new Error("Invalid Binance response");
      const ngnRate = await fetchUsdToNgn();
      return { usd: usdPrice, ngn: usdPrice * ngnRate, change_24h: null, source: "binance" };
    },
    // Source 3: CryptoCompare (fallback)
    async () => {
      const response = await axios.get(
        "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,NGN",
        { timeout: 8000 }
      );
      const data = response.data;
      if (!data || !data.USD) throw new Error("Invalid CryptoCompare response");
      return { usd: data.USD, ngn: data.NGN, change_24h: null, source: "cryptocompare" };
    },
    // Source 4: Coinbase spot ETH-USD + external FX conversion
    async () => {
      const response = await axios.get("https://api.coinbase.com/v2/prices/ETH-USD/spot", {
        timeout: 8000,
        headers: { Accept: "application/json", "User-Agent": "Secxion-App/1.0" },
      });
      const usdPrice = parseFloat(response.data?.data?.amount);
      if (!usdPrice) throw new Error("Invalid Coinbase spot response");
      const ngnRate = await fetchUsdToNgn();
      return { usd: usdPrice, ngn: usdPrice * ngnRate, change_24h: null, source: "coinbase-spot" };
    },
  ];

  for (const fetchFn of sources) {
    try {
      return await fetchFn();
    } catch (error) {
      console.warn(`[eth-price] Source failed: ${error.message}`);
      continue;
    }
  }
  return null; // All sources failed
}

// Updated ETH price endpoint with multiple API fallbacks
router.get("/eth-price", async (req, res) => {
  const cacheKey = "eth-price";
  const now = Date.now();

  // Check cache first (serve fresh cache)
  if (cache[cacheKey] && cache[cacheKey].expiry > now) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const priceData = await fetchEthPriceFromSources();
    
    if (!priceData) {
      throw new Error("All price sources failed");
    }

    const result = {
      ethereum: {
        usd: priceData.usd,
        ngn: priceData.ngn,
        change_24h: priceData.change_24h,
        last_updated: Math.floor(now / 1000),
      },
      source: priceData.source,
      timestamp: now,
    };

    // Cache the result for CACHE_TTL duration
    cache[cacheKey] = { data: result, expiry: now + ETH_PRICE_CACHE_TTL };
    res.json(result);
  } catch (error) {
    console.error("[eth-price] All sources failed:", error.message);
    
    // Serve stale cache if available
    if (cache[cacheKey] && cache[cacheKey].data) {
      console.log("[eth-price] Serving stale cache due to API errors");
      return res.json({ ...cache[cacheKey].data, stale: true });
    }
    
    // Last resort: return a fallback response so frontend doesn't break
    console.log("[eth-price] No cache available, returning fallback");
    res.json({
      ethereum: {
        usd: 2800,
        ngn: 2800 * 1600,
        change_24h: 0,
        last_updated: Math.floor(now / 1000),
      },
      source: "fallback",
      timestamp: now,
      stale: true,
    });
  }
});

// Additional endpoint for detailed market data
router.get("/eth-market", async (req, res) => {
  const cacheKey = "eth-market";
  const now = Date.now();

  // Check cache first
  if (cache[cacheKey] && cache[cacheKey].expiry > now) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const url = new URL("https://api.coingecko.com/api/v3/coins/markets");
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("ids", "ethereum");
    url.searchParams.set("price_change_percentage", "1h,24h,7d,30d");
    url.searchParams.set("order", "market_cap_desc");
    url.searchParams.set("sparkline", "true");

    const response = await axios.get(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Secxion-App/1.0",
      },
      timeout: 10000,
    });

    const result = response.data[0];
    cache[cacheKey] = { data: result, expiry: now + ETH_MARKET_CACHE_TTL };
    res.json(result);
  } catch (error) {
    console.error("[eth-market] Error fetching ETH market data:", error.message);
    
    // Serve stale cache on error
    if (cache[cacheKey] && cache[cacheKey].data) {
      console.log("[eth-market] Serving stale cache due to API error");
      return res.json({ ...cache[cacheKey].data, stale: true });
    }
    
    res.status(500).json({ error: "Failed to fetch ETH market data" });
  }
});

// Additional endpoint for intraday chart data
router.get("/eth-chart", async (req, res) => {
  const cacheKey = "eth-chart";
  const now = Date.now();

  // Check cache first
  if (cache[cacheKey] && cache[cacheKey].expiry > now) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const url = new URL(
      "https://api.coingecko.com/api/v3/coins/ethereum/market_chart",
    );
    url.searchParams.set("vs_currency", "usd");
    url.searchParams.set("days", "1");
    url.searchParams.set("interval", "minute");

    const response = await axios.get(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Secxion-App/1.0",
      },
      timeout: 10000,
    });

    const result = response.data;
    cache[cacheKey] = { data: result, expiry: now + ETH_CHART_CACHE_TTL };
    res.json(result);
  } catch (error) {
    console.error("[eth-chart] Error fetching ETH chart data:", error.message);
    
    // Serve stale cache on error
    if (cache[cacheKey] && cache[cacheKey].data) {
      console.log("[eth-chart] Serving stale cache due to API error");
      return res.json({ ...cache[cacheKey].data, stale: true });
    }
    
    res.status(500).json({ error: "Failed to fetch ETH chart data" });
  }
});

router.get("/usd-to-ngn", verifyApiKey, async (req, res) => {
  const cacheKey = "usd-to-ngn";
  const now = Date.now();

  if (cache[cacheKey] && cache[cacheKey].expiry > now) {
    return res.json(cache[cacheKey].data);
  }

  try {
    const { data } = await axiosGetWithRetry(
      "https://open.er-api.com/v6/latest/USD",
    );
    const rate = data?.rates?.NGN;
    if (!rate) throw new Error("NGN rate not found");
    const result = { rate };
    cache[cacheKey] = { data: result, expiry: now + USD_NGN_CACHE_TTL };
    res.json(result);
  } catch (error) {
    console.error("[usd-to-ngn] Fetch failed:", error.message);
    res.status(500).json({ error: "Failed to fetch USD to NGN rate" });
  }
});

router.get("/ping", (req, res) => {
  res.json({ status: "ok", message: "pong" });
});

router.get("/health/sms", (req, res) => {
  const health = getSmsHealthStatus();
  const statusCode = health.configured ? 200 : 503;

  return res.status(statusCode).json({
    success: health.configured,
    error: !health.configured,
    data: health,
    message: health.configured
      ? "SMS provider is configured."
      : "SMS provider is not configured.",
  });
});

// Get CSRF token (required for POST requests) - No middleware, pure JSON response
router.get("/csrf-token", (req, res) => {
  const csrfToken = issueCsrfToken(req, res);

  if (!csrfToken) {
    return res.status(500).json({
      success: false,
      message: "Unable to create CSRF token",
    });
  }

  req.session.save((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Unable to persist CSRF session",
      });
    }

    res.json({
      success: true,
      csrfToken,
      message: "CSRF token retrieved successfully",
    });
  });
});

router.get("/slider-verification", (req, res) => {
  const { target, signature } = generateSliderVerification();
  res.json({ target, signature });
});

// Authentication routes with rate limiting (no CSRF - unauthenticated endpoints)
router.post("/signup", csrfProtection, signupLimiter, userSignUpController);
router.get("/verify-email", verifyEmailController);
router.post("/signin", csrfProtection, authLimiter, userSignInController);
router.post("/admin-signin", csrfProtection, authLimiter, adminSignInController);
router.post("/refresh-token", noCache, async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: "Refresh token required" });
    }
    const result = await refreshAccessToken(refreshToken);

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      path: "/",
    });

    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});
router.get("/user-details", authToken, noCache, userDetailsController);
router.get("/userLogout", authToken, noCache, userLogout);
router.post("/request-reset", passwordResetLimiter, sendResetCode);
router.post("/confirm-reset", verifyReset);
router.post("/resend-verification", resendVerificationEmailController);
router.post("/send-bank-code", authToken, sendBankAddCode);
router.post("/verify-add-bank", authToken, verifyAndAddBankAccount);
router.post("/kyc/submit", authToken, noCache, submitKyc);
router.get("/kyc/me", authToken, noCache, getMyKyc);
router.post("/kyc/phone/send", authToken, noCache, sendKycPhoneVerificationCode);
router.post("/kyc/phone/send-code", authToken, noCache, sendKycPhoneVerificationCode);
router.post("/kyc/phone/verify", authToken, noCache, verifyKycPhoneCode);
router.post("/kyc/phone/verify-code", authToken, noCache, verifyKycPhoneCode);
router.post("/kyc/face-match/result", noCache, ingestKycFaceMatchResult);

// Admin panel
router.get("/all-user", authToken, verifyAdmin, noCache, allUsers);
router.post("/update-user", authToken, verifyAdmin, csrfProtection, noCache, updateUser);
router.get("/get-all-users-market", authToken, verifyAdmin, noCache, getAllUserMarkets);
router.post("/update-market-status/:id", authToken, verifyAdmin, csrfProtection, updateMarketStatus);
router.get(
  "/getAllDataForAdmin",
  authToken,
  noCache,
  getAllUserDataPadsForAdmin,
);
router.delete("/delete-user", authToken, verifyAdmin, csrfProtection, deleteUser);

// Wallet balance
router.get(
  "/wallet/balance/:userId",
  authToken,
  verifyAdmin,
  noCache,
  getOtherUserWalletBalance,
);

// ETH
router.post("/save-eth-address", authToken, csrfProtection, noCache, saveEthWalletAddress);
router.get("/eth-wallet", authToken, noCache, getUserEthWallet);
router.post(
  "/eth/withdrawal-request",
  authToken,
  csrfProtection,
  noCache,
  createEthWithdrawalRequest,
);
router.get(
  "/eth/get-withdrawal-status",
  authToken,
  noCache,
  getEthWithdrawalStatus,
);

// Admin routes
router.get("/eth-withdrawals", authToken, verifyAdmin, noCache, getAllEthWithdrawalRequests);
router.get(
  "/eth-withdrawal/:requestId",
  authToken,
  verifyAdmin,
  noCache,
  getSingleEthWithdrawalRequest,
);
router.put(
  "/eth-withdrawal-status/:requestId",
  authToken,
  verifyAdmin,
  noCache,
  updateEthWithdrawalStatus,
);

// Product
router.post("/upload-product", authToken, verifyAdmin, csrfProtection, noCache, UploadProductController);
router.get("/get-product", getProductController);
router.post("/update-product", authToken, verifyAdmin, csrfProtection, noCache, updateProductController);
router.get("/get-categoryProduct", getCategoryProduct);
router.post("/category-product", csrfProtection, getCategoryWiseProduct);
router.post("/product-details", csrfProtection, getProductDetails);
router.get("/search", SearchProduct);
router.post("/filter-product", csrfProtection, filterProductController);

// User market
router.post("/upload-market", authToken, csrfProtection, noCache, UserUploadMarketController);
router.get("/get-market", authToken, noCache, getMarketController);
router.get(
  "/get-market/:marketId",
  authToken,
  noCache,
  getMarketByIdController,
);
router.get("/market-record", authToken, noCache, marketRecordController);
router.get(
  "/last-market-status",
  authToken,
  noCache,
  getLastUserMarketStatusController,
);

// System blog
router.post("/create-blog", authToken, verifyAdmin, csrfProtection, createBlogNote);
router.get("/get-blogs", getAllBlogNotes);
router.put("/update-blog/:id", authToken, verifyAdmin, csrfProtection, updateBlogNote);
router.delete("/delete-blog/:id", authToken, verifyAdmin, csrfProtection, deleteBlogNote);

// Reports
router.post("/submit-report", authToken, csrfProtection, noCache, submitReportController);
router.get("/get-reports", authToken, noCache, getUserReportsController);
router.get("/all-reports", authToken, verifyAdmin, noCache, getAllReportsController);
router.post("/reply-report/:id", authToken, verifyAdmin, csrfProtection, noCache, replyToReportController);
router.post(
  "/reports/:id/reply",
  authToken,
  csrfProtection,
  noCache,
  userReplyReportController,
);
router.get(
  "/reports/admin/:id/chat",
  authToken,
  verifyAdmin,
  noCache,
  getReportChatController,
);
router.post(
  "/reports/admin/:id/sendchat",
  authToken,
  verifyAdmin,
  noCache,
  sendChatMessageController,
);

// DataPad
router.get("/alldata", authToken, noCache, getAllDataPads);
router.post("/createdata", authToken, csrfProtection, noCache, createDataPad);
router.put("/updatedata/:id", authToken, csrfProtection, noCache, updateDataPad);
router.delete("/deletedata/:id", authToken, csrfProtection, noCache, deleteDataPad);

// Contact us
router.post("/contact-us-message", createContactUsMessage);
router.get("/get-contact-us-messages", authToken, verifyAdmin, getAllContactUsMessages);

// Newsletter
router.post("/newsletter/subscribe", noCache, subscribeNewsletter);
router.get("/newsletter/confirm", noCache, confirmNewsletterSubscription);
router.get("/newsletter/unsubscribe", noCache, unsubscribeNewsletter);

// LiveScript (Custom Development Requests)
router.post("/livescript/create", authToken, csrfProtection, noCache, createLiveScriptRequest);
router.get("/livescript/user", authToken, noCache, getUserLiveScriptRequests);
router.get("/livescript/admin/all", authToken, verifyAdmin, noCache, getAllLiveScriptRequests);
router.patch("/livescript/admin/:id", authToken, verifyAdmin, csrfProtection, noCache, updateLiveScriptStatus);
router.post("/livescript/admin/:id/reply", authToken, verifyAdmin, csrfProtection, noCache, adminReplyToLiveScriptRequest);
router.post("/livescript/:id/reply", authToken, csrfProtection, noCache, replyToLiveScriptRequest);
router.get("/livescript/:id", authToken, noCache, getLiveScriptRequestById);
router.delete("/livescript/:id", authToken, csrfProtection, noCache, deleteLiveScriptRequest);

// Admin Earnings & Commission
router.get("/admin/earnings/summary", authToken, verifyAdmin, noCache, getAdminEarningsSummary);
router.get("/admin/earnings", authToken, verifyAdmin, noCache, getAdminEarnings);
router.get("/admin/commission-rates", authToken, verifyAdmin, noCache, getCommissionRates);
router.put("/admin/commission-rates", authToken, verifyAdmin, csrfProtection, noCache, updateCommissionRate);

// Admin Wallets & Payouts
router.get("/admin/wallets", authToken, verifyAdmin, noCache, getAdminWallets);
router.get("/admin/wallet/me", authToken, verifyAdmin, noCache, getMyAdminWallet);
router.get("/admin/platform-balance", authToken, verifyAdmin, noCache, getPlatformBalance);
router.get("/admin/authorized-admins", authToken, verifyAdmin, noCache, getAuthorizedAdmins);
router.post("/admin/payout", authToken, verifyAdmin, csrfProtection, noCache, createAdminPayout);
router.get("/admin/payouts", authToken, verifyAdmin, noCache, getPayoutHistory);

// Admin Authorization Management (Super Admin only)
router.get("/admin/authorized-list", authToken, verifyAdmin, noCache, getAuthorizedAdminsList);
router.post("/admin/authorize", authToken, verifyAdmin, csrfProtection, noCache, authorizeAdmin);
router.delete("/admin/authorize/:id", authToken, verifyAdmin, csrfProtection, noCache, revokeAuthorization);
router.put("/admin/authorize/:id/toggle", authToken, verifyAdmin, csrfProtection, noCache, toggleAdminStatus);
router.post("/admin/migrate-admins", authToken, verifyAdmin, csrfProtection, noCache, migrateHardcodedAdmins);

// Admin Newsletter
router.get("/admin/newsletter/subscribers", authToken, verifyAdmin, noCache, getNewsletterSubscribers);
router.get("/admin/newsletter/stats", authToken, verifyAdmin, noCache, getNewsletterStats);
router.get("/admin/newsletter/health", authToken, verifyAdmin, noCache, getNewsletterHealth);
router.post("/admin/newsletter/send", authToken, verifyAdmin, csrfProtection, noCache, sendNewsletterCampaign);

// Wallet
router.get("/wallet/balance", authToken, noCache, getWalletBalance);

// Payment request
router.post("/pr/create", authToken, csrfProtection, noCache, createPaymentRequest);
router.get("/pr/getall", authToken, verifyAdmin, noCache, getAllPaymentRequests);
router.get("/pr/getuser", authToken, noCache, getUserPaymentRequests);
router.patch("/pr/update/:id", authToken, verifyAdmin, csrfProtection, noCache, updatePaymentRequestStatus);

// Bank account
router.post("/ba/add", authToken, csrfProtection, noCache, addBankAccount);
router.get("/ba/get", authToken, noCache, getBankAccounts);
router.delete("/ba/delete/:accountId", authToken, csrfProtection, noCache, deleteBankAccount);
router.post("/verify-account", authToken, csrfProtection, noCache, resolveBankAccount);
router.get("/banks", authToken, noCache, getPaystackBanks);

// Transactions
router.get("/transactions/get", authToken, noCache, getUserTransactions);

// Notifications
router.get(
  "/tr-notifications/get",
  authToken,
  noCache,
  getUserTransactionNotifications,
);
router.patch(
  "/tr-notifications/read/:notificationId",
  authToken,
  csrfProtection,
  noCache,
  markNotificationAsRead,
);
router.delete(
  "/tr-notifications/delete/:notificationId",
  authToken,
  csrfProtection,
  noCache,
  deleteNotification,
);
router.put(
  "/tr-notifications/read-all",
  authToken,
  csrfProtection,
  noCache,
  markAllNotificationsAsRead,
);
router.delete(
  "/tr-notifications/all",
  authToken,
  csrfProtection,
  noCache,
  deleteAllNotifications,
);
router.get(
  "/report/notifications",
  authToken,
  noCache,
  getUserReportNotifications,
);
router.get("/report-details/:reportId", authToken, noCache, fetchReportDetails);
router.get(
  "/user-report-details/:reportId",
  authToken,
  noCache,
  getReportDetailsController,
);
router.get(
  "/unread-notificationCount",
  authToken,
  noCache,
  getUnreadNotificationCount,
);
router.get("/get-new-notifications", authToken, noCache, getNewNotifications);
router.get(
  "/get-market-notifications",
  authToken,
  noCache,
  getMarketNotifications,
);

// Profile

router.get(
  "/profile",
  authToken,
  noCache,
  userProfileController.userProfileController,
);
router.get(
  "/profile/bank-accounts",
  authToken,
  noCache,
  userProfileController.getUserBankAccountsController,
);
router.get(
  "/profile/wallet-balance",
  authToken,
  noCache,
  userProfileController.getUserWalletBalanceController,
);
router.put(
  "/profile/edit",
  authToken,
  csrfProtection,
  noCache,
  userProfileController.editProfileController,
);

// Community
router.get("/posts/approved", getApprovedPostsController);
router.post("/posts/submit", authToken, csrfProtection, noCache, submitNewPostController);
router.delete(
  "/posts/:postId/delete",
  authToken,
  csrfProtection,
  noCache,
  deletePostController,
);
router.post("/posts/:postId/comment", authToken, csrfProtection, noCache, addCommentController);

// Admin community
router.get("/community/pending", authToken, noCache, getPendingPostsController);
router.put(
  "/community/post/:postId/approve",
  authToken,
  csrfProtection,
  noCache,
  approvePostController,
);
router.put(
  "/community/post/:postId/reject",
  authToken,
  csrfProtection,
  noCache,
  rejectPostController,
);
router.get("/myposts", authToken, noCache, getUserPostsController);

// KYC Admin
router.get("/kyc/admin/submissions", authToken, verifyAdmin, noCache, getAllKycSubmissions);
router.patch("/kyc/admin/submissions/:id", authToken, verifyAdmin, csrfProtection, noCache, reviewKycSubmission);
router.delete("/kyc/admin/submissions/:id", authToken, verifyAdmin, csrfProtection, noCache, deleteKycSubmission);
router.get("/kyc/admin/stats", authToken, verifyAdmin, noCache, getKycStats);

export default router;
