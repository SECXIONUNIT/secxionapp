import PaymentRequest from "../../models/paymentRequestModel.js";
import EthWithdrawalRequest from "../../models/ethWithdrawalRequestModel.js";
import Wallet from "../../models/walletModel.js";
import userModel from "../../models/userModel.js";
import mongoose from "mongoose";
import { createTransactionNotification } from "../notifications/notificationsController.js";
import { updateWalletBalance } from "../wallet/walletController.js";
import {
  getKycFinancialLimits,
  UNVERIFIED_WITHDRAWAL_TOTAL_LIMIT_NGN,
} from "../../utils/kycLimitPolicy.js";
import {
  FinancialOperationError,
  getIdempotencyKey,
  isDuplicateKeyError,
  isValidIdempotencyKey,
} from "../../utils/idempotency.js";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
  }).format(amount);
};

export const createPaymentRequest = async (req, res) => {
  const idempotencyKey = getIdempotencyKey(req);
  let session;

  try {
    const userId = req.userId;
    const { amount, paymentMethod, bankAccountId } = req.body;
    const requestedAmount = Number(amount);

    if (!isValidIdempotencyKey(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_IDEMPOTENCY_KEY",
        message:
          "A valid Idempotency-Key header (16-128 letters, numbers, _ or -) is required.",
      });
    }

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid withdrawal amount.",
      });
    }

    const replay = await PaymentRequest.findOne({ userId, idempotencyKey });
    if (replay) {
      return res.status(200).json({
        success: true,
        message: "Payment request already submitted.",
        data: replay,
        idempotentReplay: true,
      });
    }

    session = await mongoose.startSession();
    let savedRequest;
    let idempotentReplay = false;

    await session.withTransaction(async () => {
      const existingRequest = await PaymentRequest.findOne({
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
        const projectedUsed = usedWithoutKyc + requestedAmount;

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
          "Wallet not found for this user.",
          404,
          "WALLET_NOT_FOUND",
        );
      }

      if (requestedAmount > wallet.balance) {
        throw new FinancialOperationError(
          "Requested amount exceeds your current wallet balance.",
          400,
          "INSUFFICIENT_BALANCE",
        );
      }

      const selectedBankAccount = wallet.bankAccounts.id(bankAccountId);
      if (!selectedBankAccount) {
        throw new FinancialOperationError(
          "Invalid bank account selected.",
          400,
          "INVALID_BANK_ACCOUNT",
        );
      }

      [savedRequest] = await PaymentRequest.create(
        [
          {
            userId,
            walletId: wallet._id,
            amount: requestedAmount,
            paymentMethod,
            bankAccountDetails: {
              accountNumber: selectedBankAccount.accountNumber,
              bankName: selectedBankAccount.bankName,
              accountHolderName: selectedBankAccount.accountHolderName,
            },
            idempotencyKey,
          },
        ],
        { session },
      );

      const walletUpdateResult = await updateWalletBalance(
        userId,
        -requestedAmount,
        "debit",
        "Payment request initiated",
        savedRequest._id,
        "PaymentRequest",
        "completed",
        { session, skipNotification: true, throwOnError: true },
      );

      if (!walletUpdateResult.success) {
        throw new FinancialOperationError(
          walletUpdateResult.message || "Failed to debit wallet.",
          400,
          "WALLET_DEBIT_FAILED",
        );
      }
    });

    if (!idempotentReplay) {
      try {
        await createTransactionNotification(
          userId,
          requestedAmount,
          "debit",
          `Payment request of ${formatCurrency(requestedAmount)} initiated.`,
          `/payment-requests`,
          savedRequest._id,
        );
      } catch (notificationError) {
        console.error(
          "Payment request committed, but notification failed:",
          notificationError,
        );
      }
    }

    return res.status(idempotentReplay ? 200 : 201).json({
      success: true,
      message: idempotentReplay
        ? "Payment request already submitted."
        : "Payment request submitted successfully.",
      data: savedRequest,
      idempotentReplay,
    });
  } catch (error) {
    if (isDuplicateKeyError(error) && idempotencyKey) {
      const replay = await PaymentRequest.findOne({
        userId: req.userId,
        idempotencyKey,
      });
      if (replay) {
        return res.status(200).json({
          success: true,
          message: "Payment request already submitted.",
          data: replay,
          idempotentReplay: true,
        });
      }
    }

    console.error("Error creating payment request:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to submit payment request.",
      code: error.code || "PAYMENT_REQUEST_FAILED",
      ...(error.details || {}),
    });
  } finally {
    await session?.endSession();
  }
};

export const getAllPaymentRequests = async (req, res) => {
  try {
    const paymentRequests = await PaymentRequest.find().populate(
      "userId",
      "name email",
    );
    res.status(200).json({
      success: true,
      data: paymentRequests,
    });
  } catch (error) {
    console.error("Error fetching all payment requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment requests.",
      error: error.message,
    });
  }
};

export const getUserPaymentRequests = async (req, res) => {
  try {
    const userId = req.userId;
    const paymentRequests = await PaymentRequest.find({ userId }).sort({
      requestDate: -1,
    });
    res.status(200).json({
      success: true,
      data: paymentRequests,
    });
  } catch (error) {
    console.error("Error fetching user payment requests:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your payment requests.",
      error: error.message,
    });
  }
};

export const updatePaymentRequestStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const paymentRequest = await PaymentRequest.findById(id);
    if (!paymentRequest) {
      return res.status(404).json({
        success: false,
        message: "Payment request not found.",
      });
    }

    if (
      !["pending", "approved-processing", "rejected", "completed"].includes(
        status,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment request status.",
      });
    }

    const userId = paymentRequest.userId;
    const amount = paymentRequest.amount;
    const previousStatus = paymentRequest.status;

    if (previousStatus === status) {
      return res.status(409).json({
        success: false,
        message: "Payment request already has this status.",
      });
    }

    if (["rejected", "completed"].includes(previousStatus)) {
      return res.status(409).json({
        success: false,
        message: "Payment request is already in a final state.",
      });
    }

    paymentRequest.status = status;

    if (status === "rejected") {
      paymentRequest.rejectionReason = rejectionReason || "Rejected by admin";

      const refundResult = await updateWalletBalance(
        userId,
        amount,
        "credit",
        "Payment request rejected - refund",
        paymentRequest._id,
        "PaymentRequest",
      );

      if (!refundResult.success) {
        console.error(
          "Error crediting wallet after rejecting payment request:",
          refundResult.error,
        );
      } else {
        await createTransactionNotification(
          userId,
          amount,
          "credit",
          `Payment request rejected. Refund of ${formatCurrency(amount)} credited to your wallet. Reason: ${rejectionReason}`,
          `/payment-requests`,
          paymentRequest._id,
        );
      }

      const wallet = await Wallet.findOne({ userId });
      if (wallet) {
        wallet.transactions = wallet.transactions.map((tx) =>
          tx.referenceId && tx.referenceId.equals(paymentRequest._id)
            ? { ...tx, status: "rejected" }
            : tx,
        );
        await wallet.save();
      }
    } else if (status !== "rejected") {
      paymentRequest.rejectionReason = undefined;
    }

    if (status === "approved-processing") {
      const walletUpdateResult = await updateWalletBalance(
        userId,
        0,
        "withdrawal",
        "Payment request approved",
        paymentRequest._id,
        "PaymentRequest",
      );

      if (!walletUpdateResult.success) {
        return res.status(500).json({
          success: false,
          message:
            "Failed to update wallet transaction status after approving request.",
          error: walletUpdateResult.error,
        });
      }

      paymentRequest.approvalDate = new Date();

      const wallet = await Wallet.findOne({ userId });
      if (wallet) {
        wallet.transactions = wallet.transactions.map((tx) =>
          tx.referenceId && tx.referenceId.equals(paymentRequest._id)
            ? { ...tx, status: "approved-processing" }
            : tx,
        );
        await wallet.save();
      }

      await createTransactionNotification(
        userId,
        amount,
        "withdrawal",
        `Your payment request of ${formatCurrency(amount)} approved and processing.`,
        `/payment-requests`,
        paymentRequest._id,
      );
    } else if (status === "completed") {
      const wallet = await Wallet.findOne({ userId });
      if (wallet) {
        wallet.transactions = wallet.transactions.map((tx) =>
          tx.referenceId && tx.referenceId.equals(paymentRequest._id)
            ? { ...tx, status: "completed" }
            : tx,
        );
        await wallet.save();
      }

      await createTransactionNotification(
        userId,
        amount,
        "payment_completed",
        `Your payment request of ${formatCurrency(amount)} completed.`,
        `/payment-requests`,
        paymentRequest._id,
      );
    }

    const updatedRequest = await paymentRequest.save();

    res.status(200).json({
      success: true,
      message: "Payment request status updated successfully.",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("Error updating payment request status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment request status.",
      error: error.message,
    });
  }
};
