import Wallet from "../../models/walletModel.js";
import { createTransactionNotification } from "../notifications/notificationsController.js";
import userModel from "../../models/userModel.js";
import {
  getKycFinancialLimits,
  UNVERIFIED_MAX_CREDIT_TRANSACTION_VOLUME_NGN,
} from "../../utils/kycLimitPolicy.js";

const KYC_BALANCE_CAPPED_REFERENCE_TYPES = new Set([
  "User",
  "userproduct",
  "OtherType",
]);

const COUNTABLE_CREDIT_STATUSES = new Set(["completed", "approved"]);

const getNonKycCreditTransactionVolume = (transactions = []) =>
  transactions.reduce((sum, tx) => {
    const txType = String(tx?.type || "").toLowerCase();
    const txStatus = String(tx?.status || "completed").toLowerCase();
    const txModel = String(tx?.onModel || "");
    const txAmount = Number(tx?.amount || 0);

    if (txType !== "credit" || txAmount <= 0) return sum;
    if (!COUNTABLE_CREDIT_STATUSES.has(txStatus)) return sum;
    if (!KYC_BALANCE_CAPPED_REFERENCE_TYPES.has(txModel)) return sum;

    return sum + txAmount;
  }, 0);

// Ensure wallet exists for a user
export const ensureWalletExists = async (userId, { session = null } = {}) => {
  let walletQuery = Wallet.findOne({ userId });
  if (session) walletQuery = walletQuery.session(session);

  let wallet = await walletQuery;
  if (!wallet) {
    wallet = new Wallet({ userId });
    await wallet.save(session ? { session } : undefined);
  }
  return wallet;
};

// Get balance for logged-in user
export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.userId;

    const wallet = await ensureWalletExists(userId);

    res.status(200).json({
      success: true,
      balance: wallet.balance,
      transactions: wallet.transactions || [],
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet balance",
      error: error.message,
    });
  }
};

// Admin: Get another user's wallet balance
export const getOtherUserWalletBalance = async (req, res) => {
  try {
    const userId = req.params.userId;
    const wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      return res
        .status(404)
        .json({ success: false, message: "Wallet not found for this user." });
    }

    res.status(200).json({ success: true, balance: wallet.balance });
  } catch (error) {
    console.error("Error fetching user wallet balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user wallet balance",
      error: error.message,
    });
  }
};

// Update wallet balance and log transaction
export const updateWalletBalance = async (
  userId,
  amount,
  type,
  description,
  referenceId,
  referenceType,
  status = "completed",
  {
    session = null,
    skipNotification = false,
    throwOnError = false,
  } = {},
) => {
  try {
    const validModels = [
      "PaymentRequest",
      "EthWithdrawalRequest",
      "OtherType",
      "User",
      "userproduct",
    ];
    if (!validModels.includes(referenceType)) {
      throw new Error(`Invalid referenceType: ${referenceType}`);
    }

    const wallet = await ensureWalletExists(userId, { session });

    if (amount < 0) {
      if (Math.abs(amount) < 1000) {
        return {
          success: false,
          message: "Minimum withdrawal amount is ₦1000.",
        };
      }
      if (wallet.balance + amount < 0) {
        return {
          success: false,
          message: "Insufficient balance. Cannot go below ₦0.",
        };
      }
    }

    // Only immediately apply balance if transaction is approved/completed
    if (status === "completed" || status === "approved") {
      if (
        amount > 0 &&
        type === "credit" &&
        KYC_BALANCE_CAPPED_REFERENCE_TYPES.has(referenceType)
      ) {
        let userQuery = userModel.findById(userId).select("kycStatus");
        if (session) userQuery = userQuery.session(session);
        const user = await userQuery;
        const limits = getKycFinancialLimits(user?.kycStatus);

        if (limits.isRestricted) {
          const usedCreditVolume = getNonKycCreditTransactionVolume(
            wallet.transactions,
          );
          const projectedCreditVolume = usedCreditVolume + amount;

          if (
            projectedCreditVolume >
            UNVERIFIED_MAX_CREDIT_TRANSACTION_VOLUME_NGN
          ) {
            return {
              success: false,
              message: `Unverified accounts can receive up to ₦${UNVERIFIED_MAX_CREDIT_TRANSACTION_VOLUME_NGN.toLocaleString()} in cumulative credited transactions. Complete KYC verification to continue.`,
              code: "UNVERIFIED_CREDIT_TRANSACTION_LIMIT_EXCEEDED",
              currentBalance: wallet.balance,
              usedCreditVolume,
              attemptedCredit: amount,
              projectedCreditVolume,
              maxCreditVolume:
                UNVERIFIED_MAX_CREDIT_TRANSACTION_VOLUME_NGN,
            };
          }
        }
      }

      wallet.balance += amount;
    }

    // Record transaction
    const transaction = {
      type, // 'credit' | 'debit'
      amount,
      description,
      referenceId,
      onModel: referenceType,
      status, // new field
      timestamp: new Date(),
    };

    wallet.transactions.push(transaction);
    await wallet.save(session ? { session } : undefined);

    // Skip notification for ETH withdrawals - they have their own local toast in the frontend
    if (!skipNotification && referenceType !== "EthWithdrawalRequest") {
      const formattedAmount = `₦${Math.abs(amount).toLocaleString()}`;
      const message =
        type === "credit"
          ? `Your wallet has been credited with ${formattedAmount} (${status})`
          : type === "debit"
            ? `Your wallet has been debited by ${formattedAmount} (${status})`
            : `A wallet transaction of ${formattedAmount} (${status}) occurred`;

      await createTransactionNotification(
        userId,
        Math.abs(amount),
        type,
        message,
        "/wallet",
        referenceId,
      );
    }

    return {
      success: true,
      message: `Wallet transaction recorded with status: ${status}`,
      transaction,
      newBalance: wallet.balance,
    };
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    if (throwOnError) throw error;

    return {
      success: false,
      message: "Failed to update wallet balance.",
      error: error.message,
    };
  }
};

// Optional: Update transaction status (useful for ETH confirmations)
export const updateTransactionStatus = async (
  userId,
  transactionId,
  newStatus,
) => {
  try {
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) return { success: false, message: "Wallet not found" };

    const transaction = wallet.transactions.id(transactionId);
    if (!transaction)
      return { success: false, message: "Transaction not found" };

    transaction.status = newStatus;

    // Apply balance update if it's now completed or approved
    if (
      (newStatus === "completed" || newStatus === "approved") &&
      !transaction.appliedToBalance
    ) {
      wallet.balance += transaction.amount;
      transaction.appliedToBalance = true;
    }

    await wallet.save();

    return {
      success: true,
      message: `Transaction status updated to ${newStatus}`,
      newBalance: wallet.balance,
    };
  } catch (error) {
    console.error("Failed to update transaction status:", error);
    return {
      success: false,
      message: "Failed to update transaction status",
      error: error.message,
    };
  }
};
