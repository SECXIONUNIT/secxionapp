import mongoose from "mongoose";

const phoneVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    phoneNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 25,
    },
    codeHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

const PhoneVerification = mongoose.model(
  "PhoneVerification",
  phoneVerificationSchema,
);

export default PhoneVerification;
