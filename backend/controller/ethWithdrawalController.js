import EthWithdrawalRequest from "../models/ethWithdrawalRequestModel.js";
import PaymentRequest from "../models/paymentRequestModel.js";
import axios from "axios";
import mongoose from "mongoose";
import { updateWalletBalance } from "./wallet/walletController.js";
import { createTransactionNotification } from "./notifications/notificationsController.js";
import Wallet from "../models/walletModel.js";
import userModel from "../models/userModel.js";
import {
  getKycFinancialLimits,
  UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_NGN,
} from "../utils/kycLimitPolicy.js";
import {
  FinancialOperationError,
  getIdempotencyKey,
  isDuplicateKeyError,
  isValidIdempotencyKey,
} from "../utils/idempotency.js";

export const createEthWithdrawalRequest = async (req, res) => {
  const idempotencyKey = getIdempotencyKey(req);
  let session;

  try {
    const { ethRecipientAddress, nairaRequestedAmount, ethNetAmountToSend } =
      req.body;
    const userId = req.userId;
    const requestedNaira = Number(nairaRequestedAmount);
    const submittedNetEth = Number(ethNetAmountToSend);

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_IDEMPOTENCY_KEY",
        message:
          "A valid Idempotency-Key header (16-128 letters, numbers, _ or -) is required.",
      });
    }

    if (!ethRecipientAddress || !nairaRequestedAmount || !ethNetAmountToSend) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required." });
    }

    if (!Number.isFinite(requestedNaira) || requestedNaira <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid withdrawal amount.",
      });
    }

    if (!Number.isFinite(submittedNetEth) || submittedNetEth <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid net ETH amount.",
      });
    }

    const replay = await EthWithdrawalRequest.findOne({
      userId,
      idempotencyKey,
    });
    if (replay) {
      return res.status(200).json({
        success: true,
        message: "ETH withdrawal request already submitted.",
        data: replay,
        idempotentReplay: true,
      });
    }

    const ethRateRes = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      {
        params: { ids: "ethereum", vs_currencies: "ngn" },
        timeout: 8000,
      },
    );
    const ethRate = Number(ethRateRes.data?.ethereum?.ngn);
    if (!Number.isFinite(ethRate) || ethRate <= 0) {
      return res
        .status(502)
        .json({ success: false, message: "Unable to fetch ETH rate." });
    }

    const ethCalculatedAmount = requestedNaira / ethRate;
    if (submittedNetEth > ethCalculatedAmount) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ETH_NET_AMOUNT",
        message: "Net ETH amount cannot exceed the server-calculated amount.",
      });
    }

    session = await mongoose.startSession();
    let savedRequest;
    let idempotentReplay = false;

    await session.withTransaction(async () => {
      const existingRequest = await EthWithdrawalRequest.findOne({
        userId,
        idempotencyKey,
      }).session(session);

      if (existingRequest) {
        savedRequest = existingRequest;
        idempotentReplay = true;
        return;
      }

      const user = await userModel
        .findById(userId)
        .select("kycStatus")
        .session(session);
      const limits = getKycFinancialLimits(user?.kycStatus);

      if (limits.isRestricted) {
        const [paymentRequests, ethRequests] = await Promise.all([
          PaymentRequest.find(
            {
              userId,
              status: { $ne: "rejected" },
            },
            { amount: 1 },
          )
            .session(session)
            .lean(),
          EthWithdrawalRequest.find(
            {
              userId,
              status: { $ne: "Rejected" },
            },
            { nairaRequestedAmount: 1 },
          )
            .session(session)
            .lean(),
        ]);

        const paymentUsed = paymentRequests.reduce(
          (sum, item) => sum + Number(item.amount || 0),
          0,
        );
        const ethUsed = ethRequests.reduce(
          (sum, item) => sum + Number(item.nairaRequestedAmount || 0),
          0,
        );

        const usedWithoutKyc = paymentUsed + ethUsed;
        const projectedUsed = usedWithoutKyc + requestedNaira;

        if (projectedUsed > UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_NGN) {
          const remainingAmount = Math.max(
            0,
            UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_NGN - usedWithoutKyc,
          );

          const error = new FinancialOperationError(
            `Unverified accounts can withdraw up to a total of ₦${UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_NGN.toLocaleString()}. Your non-KYC available withdrawal is ₦${remainingAmount.toLocaleString()}. Please complete KYC to continue withdrawing. Unlimited balance and withdrawals are available once KYC is verified.`,
            403,
            "UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_REACHED",
          );
          error.details = {
            totalLimit: UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_NGN,
            usedAmount: usedWithoutKyc,
            remainingAmount,
            kycRedirectPath: "/kyc",
          };
          throw error;
        }
      }

      const wallet = await Wallet.findOne({ userId }).session(session);
      if (!wallet) {
        throw new FinancialOperationError(
          "Wallet not found.",
          404,
          "WALLET_NOT_FOUND",
        );
      }

      if (requestedNaira > wallet.balance) {
        throw new FinancialOperationError(
          "Withdrawal amount exceeds wallet balance.",
          400,
          "INSUFFICIENT_BALANCE",
        );
      }

      [savedRequest] = await EthWithdrawalRequest.create(
        [
          {
            userId,
            ethRecipientAddress,
            nairaRequestedAmount: requestedNaira,
            ethCalculatedAmount,
            ethNetAmountToSend: submittedNetEth,
            status: "Pending",
            idempotencyKey,
          },
        ],
        { session },
      );

      const walletUpdate = await updateWalletBalance(
        userId,
        -requestedNaira,
        "debit",
        "ETH withdrawal initiated",
        savedRequest._id,
        "EthWithdrawalRequest",
        "completed",
        { session, skipNotification: true, throwOnError: true },
      );

      if (!walletUpdate.success) {
        throw new FinancialOperationError(
          walletUpdate.message || "Failed to debit wallet.",
          400,
          "WALLET_DEBIT_FAILED",
        );
      }
    });

    if (!idempotentReplay) {
      try {
        await createTransactionNotification(
          userId,
          requestedNaira,
          "debit",
          `${submittedNetEth} ETH to ${ethRecipientAddress} initiated.`,
          `/eth-withdrawals`,
          savedRequest._id,
        );
      } catch (notificationError) {
        console.error(
          "ETH withdrawal committed, but notification failed:",
          notificationError,
        );
      }
    }

    return res.status(idempotentReplay ? 200 : 201).json({
      success: true,
      message: idempotentReplay
        ? "ETH withdrawal request already submitted."
        : "ETH withdrawal request submitted successfully.",
      data: savedRequest,
      idempotentReplay,
    });
  } catch (error) {
    if (isDuplicateKeyError(error) && idempotencyKey) {
      const replay = await EthWithdrawalRequest.findOne({
        userId: req.userId,
        idempotencyKey,
      });
      if (replay) {
        return res.status(200).json({
          success: true,
          message: "ETH withdrawal request already submitted.",
          data: replay,
          idempotentReplay: true,
        });
      }
    }

    console.error("ETH withdrawal error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Error processing ETH withdrawal.",
      code: error.code || "ETH_WITHDRAWAL_FAILED",
      ...(error.details || {}),
    });
  } finally {
    await session?.endSession();
  }
};

export const getAllEthWithdrawalRequests = async (req, res) => {
  try {
    const requests = await EthWithdrawalRequest.find()
      .populate("userId", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: requests });
  } catch (error) {
    console.error("Error fetching withdrawal requests:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching requests",
        error: error.message,
      });
  }
};

export const updateEthWithdrawalStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionReason } = req.body;

    const validStatuses = ["Pending", "Processed", "Rejected"];
    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status." });
    }

    const request = await EthWithdrawalRequest.findById(requestId);
    if (!request) {
      return res
        .status(404)
        .json({ success: false, message: "Request not found." });
    }

    const userId = request.userId;
    const nairaAmount = request.nairaRequestedAmount;

    if (request.status === status) {
      return res.status(409).json({
        success: false,
        message: "ETH withdrawal already has this status.",
      });
    }

    if (["Rejected", "Processed"].includes(request.status)) {
      return res.status(409).json({
        success: false,
        message: "ETH withdrawal is already in a final state.",
      });
    }

    if (status === "Rejected") {
      request.status = "Rejected";
      request.rejectionReason = rejectionReason || "Rejected by admin";

      const refundResult = await updateWalletBalance(
        userId,
        nairaAmount,
        "credit",
        "ETH withdrawal rejected - refund",
        request._id,
        "EthWithdrawalRequest",
      );

      if (!refundResult.success) {
        console.error("Refund failed for ETH withdrawal:", refundResult.error);
      } else {
        await createTransactionNotification(
          userId,
          nairaAmount,
          "credit",
          `ETH withdrawal of ₦${nairaAmount} was rejected. Refund issued.`,
          `/eth-withdrawals`,
          request._id,
        );
      }
    } else if (status === "Processed") {
      request.status = "Processed";
      request.processedAt = new Date();

      const detailsMessage =
        `ETH withdrawal processed:\n` +
        `• Recipient: ${request.ethRecipientAddress}\n` +
        `• Amount (₦): ₦${nairaAmount}\n` +
        `• ETH Sent: ${request.ethNetAmountToSend} ETH\n` +
        `• Time: ${new Date().toLocaleString()}`;

      await createTransactionNotification(
        userId,
        request.ethNetAmountToSend,
        "eth_processed",
        detailsMessage,
        `/eth-withdrawals`,
        request._id,
      );
    } else {
      request.status = status;
      if (request.rejectionReason) request.rejectionReason = undefined;
    }

    await request.save();

    return res.status(200).json({
      success: true,
      message: "ETH withdrawal status updated successfully.",
      data: request,
    });
  } catch (error) {
    console.error("Status update error (ETH withdrawal):", error);
    return res.status(500).json({
      success: false,
      message: "Error updating ETH withdrawal status.",
      error: error.message,
    });
  }
};

export const getSingleEthWithdrawalRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await EthWithdrawalRequest.findById(requestId).populate(
      "userId",
      "name email",
    );

    if (!request)
      return res
        .status(404)
        .json({ success: false, message: "Request not found." });

    return res.status(200).json({ success: true, data: request });
  } catch (error) {
    console.error("Error fetching request:", error);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching request",
        error: error.message,
      });
  }
};

export const getEthWithdrawalStatus = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const latestRequest = await EthWithdrawalRequest.findOne({ userId }).sort({
      createdAt: -1,
    });

    if (!latestRequest) {
      return res.status(200).json({ success: true, status: "" });
    }

    return res.status(200).json({
      success: true,
      status: latestRequest.status,
      requestId: latestRequest._id,
    });
  } catch (error) {
    console.error("Error checking withdrawal status:", error);
    return res.status(500).json({
      success: false,
      message: "Error checking withdrawal status.",
      error: error.message,
    });
  }
};
