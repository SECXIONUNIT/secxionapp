import KycSubmission from "../models/kycSubmissionModel.js";
import PhoneVerification from "../models/phoneVerificationModel.js";
import userModel from "../models/userModel.js";
import crypto from "crypto";
import { runFaceMatchEngine } from "../utils/faceMatchEngine.js";
import { sendKycPhoneOtpSms } from "../utils/smsService.js";

const ALLOWED_KYC_STATUSES = ["pending", "approved", "rejected"];
const ALLOWED_FACE_MATCH_STATUSES = [
  "not_started",
  "pending",
  "passed",
  "failed",
];
const PHONE_CODE_TTL_MS = 10 * 60 * 1000;
const MAX_PHONE_CODE_ATTEMPTS = 5;
const normalizeText = (value = "") => String(value).trim();
const normalizePhoneNumber = (value = "") =>
  String(value)
    .trim()
    .replace(/[^\d+]/g, "")
    .replace(/(?!^)\+/g, "");

const isValidPhoneNumber = (value = "") => {
  const normalized = normalizePhoneNumber(value);
  return /^\+?\d{7,15}$/.test(normalized);
};

const hashPhoneCode = (code) =>
  crypto
    .createHash("sha256")
    .update(`${process.env.TOKEN_SECRET_KEY}:${code}`)
    .digest("hex");

const buildKycPayload = (body) => ({
  fullName: normalizeText(body.fullName),
  dateOfBirth: body.dateOfBirth,
  country: normalizeText(body.country),
  address: normalizeText(body.address),
  phoneNumber: normalizePhoneNumber(body.phoneNumber),
  consent: {
    accepted: body?.consent?.accepted === true,
    acceptedAt: body?.consent?.acceptedAt || null,
  },
  idType: normalizeText(body.idType),
  idNumber: normalizeText(body.idNumber),
  documents: {
    frontUrl: normalizeText(body?.documents?.frontUrl),
    backUrl: normalizeText(body?.documents?.backUrl),
    selfieUrl: normalizeText(body?.documents?.selfieUrl),
    selfieCaptureMethod: normalizeText(body?.documents?.selfieCaptureMethod),
    selfieCapturedAt: body?.documents?.selfieCapturedAt || null,
  },
});

const validateKycPayload = (payload) => {
  const missing = [];

  if (!payload.fullName) missing.push("fullName");
  if (!payload.dateOfBirth) missing.push("dateOfBirth");
  if (!payload.country) missing.push("country");
  if (!payload.address) missing.push("address");
  if (!payload.phoneNumber) missing.push("phoneNumber");
  if (!payload.consent?.accepted) missing.push("consent.accepted");
  if (!payload.idType) missing.push("idType");
  if (!payload.idNumber) missing.push("idNumber");
  if (!payload.documents.frontUrl) missing.push("documents.frontUrl");
  if (!payload.documents.selfieUrl) missing.push("documents.selfieUrl");
  if (!payload.documents.selfieCaptureMethod) {
    missing.push("documents.selfieCaptureMethod");
  }
  if (!payload.documents.selfieCapturedAt) {
    missing.push("documents.selfieCapturedAt");
  }

  if (missing.length) {
    return `Identity verification requires: ${missing.join(", ")}. Please ensure all documents and the live selfie are provided.`;
  }

  const dob = new Date(payload.dateOfBirth);
  if (Number.isNaN(dob.getTime())) {
    return "Invalid dateOfBirth value";
  }

  if (dob > new Date()) {
    return "dateOfBirth cannot be in the future";
  }

  if (!isValidPhoneNumber(payload.phoneNumber)) {
    return "Invalid phoneNumber value";
  }

  if (payload.consent?.acceptedAt) {
    const consentAcceptedAt = new Date(payload.consent.acceptedAt);
    if (Number.isNaN(consentAcceptedAt.getTime())) {
      return "Invalid consent.acceptedAt value";
    }
  }

  if (payload.documents.selfieCaptureMethod !== "live_camera") {
    return "Selfie must be captured using live camera verification.";
  }

  const selfieCapturedAt = new Date(payload.documents.selfieCapturedAt);
  if (Number.isNaN(selfieCapturedAt.getTime())) {
    return "Invalid documents.selfieCapturedAt value";
  }

  if (selfieCapturedAt > new Date()) {
    return "documents.selfieCapturedAt cannot be in the future";
  }

  return null;
};

export const sendKycPhoneVerificationCode = async (req, res) => {
  try {
    const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);

    if (!isValidPhoneNumber(phoneNumber)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Please enter a valid phone number with country code.",
      });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await PhoneVerification.findOneAndUpdate(
      { userId: req.userId },
      {
        userId: req.userId,
        phoneNumber,
        codeHash: hashPhoneCode(code),
        expiresAt: new Date(Date.now() + PHONE_CODE_TTL_MS),
        attempts: 0,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    try {
      await sendKycPhoneOtpSms(phoneNumber, code);
    } catch (error) {
      await PhoneVerification.deleteOne({ userId: req.userId });
      throw error;
    }

    return res.status(200).json({
      success: true,
      error: false,
      message: "Verification code sent. Enter the code to verify your phone.",
    });
  } catch (error) {
    console.error("[KYC] sendKycPhoneVerificationCode error:", error);
    const providerStatus = Number(error?.providerStatus) || null;
    const statusCode = error?.message?.includes("not configured")
      ? 503
      : providerStatus && providerStatus < 500
        ? 400
        : 502;

    return res.status(statusCode).json({
      success: false,
      error: true,
      message:
        statusCode === 503
          ? error.message
          : "Could not send the verification code. Please check the number and try again.",
    });
  }
};

export const verifyKycPhoneCode = async (req, res) => {
  try {
    const phoneNumber = normalizePhoneNumber(req.body?.phoneNumber);
    const code = normalizeText(req.body?.code);

    if (!isValidPhoneNumber(phoneNumber) || !/^\d{4,10}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Phone number and a valid verification code are required.",
      });
    }

    const pendingVerification = await PhoneVerification.findOne({
      userId: req.userId,
      phoneNumber,
    });

    if (!pendingVerification || pendingVerification.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Verification code has expired. Please request a new code.",
      });
    }

    if (pendingVerification.attempts >= MAX_PHONE_CODE_ATTEMPTS) {
      await PhoneVerification.deleteOne({ _id: pendingVerification._id });
      return res.status(400).json({
        success: false,
        error: true,
        message: "Too many invalid attempts. Please request a new code.",
      });
    }

    if (pendingVerification.codeHash !== hashPhoneCode(code)) {
      pendingVerification.attempts += 1;
      await pendingVerification.save();
      return res.status(400).json({
        success: false,
        error: true,
        message: "Invalid verification code.",
      });
    }

    const verifiedAt = new Date();
    await PhoneVerification.deleteOne({ _id: pendingVerification._id });
    await userModel.findByIdAndUpdate(req.userId, {
      $set: {
        phoneNumber,
        isPhoneVerified: true,
        phoneVerifiedAt: verifiedAt,
      },
    });

    return res.status(200).json({
      success: true,
      error: false,
      message: "Phone number verified successfully for KYC.",
      data: { phoneNumber, isVerified: true, verifiedAt },
    });
  } catch (error) {
    console.error("[KYC] verifyKycPhoneCode error:", error);
    const providerStatus = Number(error?.providerStatus) || null;
    const statusCode = error?.message?.includes("not configured")
      ? 503
      : providerStatus && providerStatus < 500
        ? 400
        : 502;

    return res.status(statusCode).json({
      success: false,
      error: true,
      message:
        statusCode === 503
          ? error.message
          : "Could not verify the code. Please try again.",
    });
  }
};

export const submitKyc = async (req, res) => {
  try {
    const payload = buildKycPayload(req.body);
    const validationError = validateKycPayload(payload);

    if (validationError) {
      console.warn("[KYC] Validation failed for user:", req.userId, "Error:", validationError);
      return res.status(400).json({
        success: false,
        error: true,
        message: validationError,
      });
    }

    const user = await userModel
      .findById(req.userId)
      .select("_id phoneNumber isPhoneVerified phoneVerifiedAt");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "User account not found.",
      });
    }

    if (!user.isPhoneVerified || user.phoneNumber !== payload.phoneNumber) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Verify this phone number before submitting KYC.",
      });
    }

    const existing = await KycSubmission.findOne({ userId: req.userId });

    if (existing && ["pending", "approved"].includes(existing.status)) {
      return res.status(409).json({
        success: false,
        error: true,
        message:
          existing.status === "approved"
            ? "KYC is already approved for this account."
            : "KYC is already pending review.",
      });
    }

    const now = new Date();

    let kycRecord;

    if (!existing) {
      kycRecord = await KycSubmission.create({
        userId: req.userId,
        ...payload,
        phoneVerification: {
          isVerified: true,
          verifiedAt: user.phoneVerifiedAt || now,
          method: "otp",
        },
        consent: {
          accepted: true,
          acceptedAt: payload.consent?.acceptedAt
            ? new Date(payload.consent.acceptedAt)
            : now,
        },
        faceMatch: {
          status: "pending",
          score: null,
          provider: "",
          referenceId: "",
          evidenceUrl: "",
          notes: "Awaiting automated face match verification.",
          checkedAt: null,
        },
        status: "pending",
        submittedAt: now,
        history: [
          {
            status: "pending",
            changedBy: req.userId,
            changedByEmail: req?.user?.email || "",
            notes: "KYC submitted by user",
            changedAt: now,
          },
        ],
      });
    } else {
      existing.fullName = payload.fullName;
      existing.dateOfBirth = payload.dateOfBirth;
      existing.country = payload.country;
      existing.address = payload.address;
      existing.phoneNumber = payload.phoneNumber;
      existing.phoneVerification = {
        isVerified: true,
        verifiedAt: user.phoneVerifiedAt || now,
        method: "otp",
      };
      existing.consent = {
        accepted: true,
        acceptedAt: payload.consent?.acceptedAt
          ? new Date(payload.consent.acceptedAt)
          : now,
      };
      existing.faceMatch = {
        status: "pending",
        score: null,
        provider: "",
        referenceId: "",
        evidenceUrl: "",
        notes: "Awaiting automated face match verification.",
        checkedAt: null,
      };
      existing.idType = payload.idType;
      existing.idNumber = payload.idNumber;
      existing.documents = payload.documents;
      existing.status = "pending";
      existing.submissionCount = (existing.submissionCount || 1) + 1;
      existing.submittedAt = now;
      existing.reviewedAt = null;
      existing.reviewedBy = null;
      existing.reviewedByEmail = "";
      existing.rejectionReason = "";
      existing.adminNotes = "";
      existing.history.push({
        status: "pending",
        changedBy: req.userId,
        changedByEmail: req?.user?.email || "",
        notes: "KYC resubmitted by user",
        changedAt: now,
      });

      kycRecord = await existing.save();
    }

    try {
      const faceMatchResult = await runFaceMatchEngine({
        idImage: payload.documents.frontUrl,
        selfieImage: payload.documents.selfieUrl,
        submissionId: String(kycRecord._id),
      });

      kycRecord.faceMatch = {
        status: faceMatchResult.status,
        score: faceMatchResult.score,
        provider: faceMatchResult.provider,
        referenceId: faceMatchResult.referenceId,
        evidenceUrl: faceMatchResult.evidenceUrl || payload.documents.selfieUrl,
        notes:
          faceMatchResult.notes ||
          "Automated face engine completed during KYC submission.",
        checkedAt: faceMatchResult.checkedAt || now,
      };

      kycRecord.history.push({
        status: kycRecord.status,
        changedBy: req.userId,
        changedByEmail: req?.user?.email || "",
        notes: `Automated face match completed: ${faceMatchResult.status} (${faceMatchResult.score}%)`,
        changedAt: new Date(),
      });

      await kycRecord.save();
    } catch (faceMatchError) {
      console.error("[KYC] face match engine error:", faceMatchError);
      kycRecord.faceMatch = {
        status: "pending",
        score: null,
        provider: "local-baseline",
        referenceId: String(kycRecord._id),
        evidenceUrl: payload.documents.selfieUrl,
        notes:
          faceMatchError?.message ||
          "Automated face engine unavailable. Review required.",
        checkedAt: new Date(),
      };
      await kycRecord.save();
    }

    await userModel.findByIdAndUpdate(req.userId, {
      $set: {
        phoneNumber: payload.phoneNumber,
      },
    });

    await userModel.findByIdAndUpdate(req.userId, {
      $set: {
        kycStatus: "pending",
      },
      $unset: {
        kycVerifiedAt: 1,
      },
    });

    return res.status(201).json({
      success: true,
      error: false,
      message: "KYC submitted successfully. Our team will review shortly.",
      data: kycRecord,
    });
  } catch (error) {
    console.error("[KYC] submitKyc error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to submit KYC.",
    });
  }
};

export const getMyKyc = async (req, res) => {
  try {
    const kycRecord = await KycSubmission.findOne({ userId: req.userId });

    if (!kycRecord) {
      return res.status(200).json({
        success: true,
        error: false,
        message: "No KYC submission found.",
        data: null,
      });
    }

    return res.status(200).json({
      success: true,
      error: false,
      data: kycRecord,
    });
  } catch (error) {
    console.error("[KYC] getMyKyc error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to fetch KYC status.",
    });
  }
};

export const getAllKycSubmissions = async (req, res) => {
  try {
    const { status = "all", search = "", page = 1, limit = 25 } = req.query;

    const query = {};

    if (status !== "all") {
      if (!ALLOWED_KYC_STATUSES.includes(status)) {
        return res.status(400).json({
          success: false,
          error: true,
          message: "Invalid status filter.",
        });
      }
      query.status = status;
    }

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);

    const submissions = await KycSubmission.find(query)
      .populate("userId", "name email role")
      .sort({ submittedAt: -1 })
      .lean();

    const normalizedSearch = normalizeText(search).toLowerCase();
    const filtered = normalizedSearch
      ? submissions.filter((item) => {
          const fields = [
            item.fullName,
            item.idNumber,
            item?.userId?.name,
            item?.userId?.email,
            item.phoneNumber,
            item.country,
            item.idType,
          ]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase());

          return fields.some((field) => field.includes(normalizedSearch));
        })
      : submissions;

    const total = filtered.length;
    const start = (pageNum - 1) * limitNum;
    const paginated = filtered.slice(start, start + limitNum);

    return res.status(200).json({
      success: true,
      error: false,
      data: paginated,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error("[KYC] getAllKycSubmissions error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to fetch KYC submissions.",
    });
  }
};

export const reviewKycSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes = "", rejectionReason = "" } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Status must be either approved or rejected.",
      });
    }

    if (status === "rejected" && !normalizeText(rejectionReason)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Rejection reason is required when rejecting KYC.",
      });
    }

    const kycRecord = await KycSubmission.findById(id);

    if (!kycRecord) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "KYC submission not found.",
      });
    }

    const now = new Date();
    const reviewerEmail = req?.user?.email || "";

    kycRecord.status = status;
    kycRecord.reviewedAt = now;
    kycRecord.reviewedBy = req.userId;
    kycRecord.reviewedByEmail = reviewerEmail;
    kycRecord.adminNotes = normalizeText(adminNotes);
    kycRecord.rejectionReason =
      status === "rejected" ? normalizeText(rejectionReason) : "";
    kycRecord.history.push({
      status,
      changedBy: req.userId,
      changedByEmail: reviewerEmail,
      notes: normalizeText(adminNotes),
      reason: status === "rejected" ? normalizeText(rejectionReason) : "",
      changedAt: now,
    });

    const saved = await kycRecord.save();

    const userUpdate = {
      kycStatus: status,
    };

    if (status === "approved") {
      userUpdate.kycVerifiedAt = now;
    } else {
      userUpdate.kycVerifiedAt = null;
    }

    await userModel.findByIdAndUpdate(kycRecord.userId, {
      $set: userUpdate,
    });

    return res.status(200).json({
      success: true,
      error: false,
      message: `KYC ${status} successfully.`,
      data: saved,
    });
  } catch (error) {
    console.error("[KYC] reviewKycSubmission error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to update KYC review status.",
    });
  }
};

export const deleteKycSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const kycRecord = await KycSubmission.findById(id);
    if (!kycRecord) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "KYC submission not found.",
      });
    }

    await KycSubmission.deleteOne({ _id: kycRecord._id });

    await userModel.findByIdAndUpdate(kycRecord.userId, {
      $set: {
        kycStatus: "unverified",
        kycVerifiedAt: null,
      },
    });

    return res.status(200).json({
      success: true,
      error: false,
      message: "KYC submission deleted successfully.",
      data: {
        deletedSubmissionId: String(kycRecord._id),
        userId: String(kycRecord.userId),
      },
    });
  } catch (error) {
    console.error("[KYC] deleteKycSubmission error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to delete KYC submission.",
    });
  }
};

export const ingestKycFaceMatchResult = async (req, res) => {
  try {
    const callbackKey = normalizeText(process.env.KYC_FACE_MATCH_CALLBACK_KEY);
    if (!callbackKey) {
      return res.status(503).json({
        success: false,
        error: true,
        message:
          "Face match callback is not configured. Set KYC_FACE_MATCH_CALLBACK_KEY.",
      });
    }

    const providedKey = normalizeText(req.headers["x-kyc-face-match-key"]);
    if (!providedKey || providedKey !== callbackKey) {
      return res.status(401).json({
        success: false,
        error: true,
        message: "Unauthorized face match callback request.",
      });
    }

    const submissionId = normalizeText(req.body?.submissionId || req.params?.id);
    if (!submissionId) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "submissionId is required.",
      });
    }

    const {
      status,
      score = null,
      provider = "",
      referenceId = "",
      evidenceUrl = "",
      notes = "",
    } = req.body || {};

    const normalizedStatus = normalizeText(status).toLowerCase();
    if (!ALLOWED_FACE_MATCH_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: true,
        message:
          "Face match status must be one of: not_started, pending, passed, failed.",
      });
    }

    const parsedScore =
      score === null || score === "" ? null : Number(String(score));
    if (parsedScore !== null && !Number.isFinite(parsedScore)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Face match score must be a valid number between 0 and 100.",
      });
    }

    if (parsedScore !== null && (parsedScore < 0 || parsedScore > 100)) {
      return res.status(400).json({
        success: false,
        error: true,
        message: "Face match score must be between 0 and 100.",
      });
    }

    const kycRecord = await KycSubmission.findById(submissionId);
    if (!kycRecord) {
      return res.status(404).json({
        success: false,
        error: true,
        message: "KYC submission not found.",
      });
    }

    const now = new Date();
    const checkedAt =
      normalizedStatus === "not_started" ? null : now;

    kycRecord.faceMatch = {
      status: normalizedStatus,
      score: parsedScore,
      provider: normalizeText(provider),
      referenceId: normalizeText(referenceId),
      evidenceUrl: normalizeText(evidenceUrl),
      notes: normalizeText(notes),
      checkedAt,
    };

    kycRecord.history.push({
      status: kycRecord.status,
      changedBy: null,
      changedByEmail: "face-match-callback",
      notes: `Automated face match updated to ${normalizedStatus}`,
      changedAt: now,
    });

    const saved = await kycRecord.save();

    return res.status(200).json({
      success: true,
      error: false,
      message: "Face match callback accepted successfully.",
      data: saved,
    });
  } catch (error) {
    console.error("[KYC] ingestKycFaceMatchResult error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to process face match callback.",
    });
  }
};

export const getKycStats = async (req, res) => {
  try {
    const [pending, approved, rejected, total] = await Promise.all([
      KycSubmission.countDocuments({ status: "pending" }),
      KycSubmission.countDocuments({ status: "approved" }),
      KycSubmission.countDocuments({ status: "rejected" }),
      KycSubmission.countDocuments({}),
    ]);

    return res.status(200).json({
      success: true,
      error: false,
      data: {
        total,
        pending,
        approved,
        rejected,
      },
    });
  } catch (error) {
    console.error("[KYC] getKycStats error:", error);
    return res.status(500).json({
      success: false,
      error: true,
      message: "Failed to fetch KYC stats.",
    });
  }
};
