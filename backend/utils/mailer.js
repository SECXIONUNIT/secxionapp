import dotenv from "dotenv";
dotenv.config();

import nodemailer from "nodemailer";
import axios from "axios";
import { readFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const { FRONTEND_URL, BACKEND_URL } = process.env;

// Hostinger SMTP (Primary - for secxion.com)
const {
  HOSTINGER_SMTP_HOST,
  HOSTINGER_SMTP_PORT,
  HOSTINGER_SMTP_USER,
  HOSTINGER_SMTP_PASS,
} = process.env;

// Brevo as fallback
const {
  BREVO_SMTP_HOST,
  BREVO_SMTP_PORT,
  BREVO_SMTP_USER,
  BREVO_SMTP_PASS,
  BREVO_SENDER_FROM_EMAIL,
  BREVO_API_KEY,
} = process.env;

// Gmail as last resort fallback
const { MAIL_USER, MAIL_PASS } = process.env;

const COMPANY_DOMAIN = process.env.MAIL_COMPANY_DOMAIN || "secxion.com";
const SUPPORT_EMAIL = process.env.MAIL_SUPPORT_EMAIL || `support@${COMPANY_DOMAIN}`;
const NEWSLETTER_FROM_EMAIL =
  process.env.NEWSLETTER_FROM_EMAIL || `newsletter@${COMPANY_DOMAIN}`;
const NEWSLETTER_REPLY_TO = process.env.NEWSLETTER_REPLY_TO || SUPPORT_EMAIL;
const NEWSLETTER_LIST_ID =
  process.env.NEWSLETTER_LIST_ID || `Secxion Newsletter <newsletter.${COMPANY_DOMAIN}>`;
const NEWSLETTER_RETURN_PATH =
  process.env.NEWSLETTER_RETURN_PATH || `bounces@${COMPANY_DOMAIN}`;
const NEWSLETTER_BRAND_NAME = process.env.NEWSLETTER_BRAND_NAME || "Secxion";
const NEWSLETTER_BRAND_LOGO_URL = process.env.NEWSLETTER_BRAND_LOGO_URL || "";
const MAILER_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(MAILER_DIR, "..", "..");
const NEWSLETTER_BRAND_LOGO_PATH =
  process.env.NEWSLETTER_BRAND_LOGO_PATH ||
  path.resolve(PROJECT_ROOT, "frontend", "public", "secxion-logo.png");
const NEWSLETTER_BRAND_LOGO_CID = "secxion-brand-logo";
const NEWSLETTER_STRICT_MODE =
  String(process.env.NEWSLETTER_STRICT_MODE || "false").toLowerCase() === "true";
const HOSTINGER_ENFORCE_AUTH_FROM =
  String(process.env.HOSTINGER_ENFORCE_AUTH_FROM || "true").toLowerCase() !== "false";

console.log("Email service initializing");

// Primary Transporter: Hostinger (verify@secxion.com)
let primaryTransporter = null;
if (HOSTINGER_SMTP_HOST && HOSTINGER_SMTP_USER && HOSTINGER_SMTP_PASS) {
  primaryTransporter = nodemailer.createTransport({
    host: HOSTINGER_SMTP_HOST,
    port: parseInt(HOSTINGER_SMTP_PORT || "465", 10),
    secure: parseInt(HOSTINGER_SMTP_PORT || "465", 10) === 465,
    auth: {
      user: HOSTINGER_SMTP_USER,
      pass: HOSTINGER_SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
} else {
  console.warn("⚠️ Hostinger SMTP not configured. Will use fallback mailers.");
}

// Secondary Transporter: Brevo (formerly Sendinblue)
let secondaryTransporter = null;
if (BREVO_SMTP_HOST && BREVO_SMTP_USER && BREVO_SMTP_PASS) {
  secondaryTransporter = nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: parseInt(BREVO_SMTP_PORT || "587", 10),
    secure: parseInt(BREVO_SMTP_PORT || "587", 10) === 465,
    auth: {
      user: BREVO_SMTP_USER,
      pass: BREVO_SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// Tertiary Transporter: Gmail
let gmailTransporter = null;
if (MAIL_USER && MAIL_PASS) {
  gmailTransporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
    secure: true,
    tls: {
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

// Test connection on startup for primary mailer (Hostinger)
const testPrimaryConnection = async () => {
  if (!primaryTransporter) {
    console.warn("⏩ Hostinger SMTP not configured. Skipping connection test.");
    return false;
  }
  try {
    await primaryTransporter.verify();
    console.log("Hostinger SMTP connection verified");
    return true;
  } catch (error) {
    console.error("Hostinger SMTP connection failed");
    return false;
  }
};

// Test connection on startup for secondary mailer if configured
const testSecondaryConnection = async () => {
  if (!secondaryTransporter) {
    console.warn("⏩ Brevo SMTP not configured. Skipping connection test.");
    return false;
  }
  try {
    await secondaryTransporter.verify();
    console.log("Brevo SMTP connection verified");
    return true;
  } catch (error) {
    console.error("Brevo SMTP connection failed");
    return false;
  }
};

// Run connection tests on module load (non-blocking)
testPrimaryConnection().catch(() => {});
testSecondaryConnection().catch(() => {});

// Promise timeout wrapper
const withTimeout = (promise, ms, errorMsg = "Operation timed out") => {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMsg)), ms),
    ),
  ]);
};

const htmlToPlainText = (rawHtml = "") => {
  return String(rawHtml)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};

const decodeHtmlEntities = (value = "") => {
  return String(value)
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&amp;/gi, "&");
};

const normalizeCampaignHtml = (value = "") => {
  const decoded = decodeHtmlEntities(String(value || "").trim());
  if (!decoded) {
    return "";
  }

  const hasHtmlTags = /<\s*([a-z][a-z0-9]*)\b[^>]*>/i.test(decoded);
  if (hasHtmlTags) {
    return decoded;
  }

  const escaped = decoded
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n|\r|\n/g, "<br>");
  return `<p>${escaped}</p>`;
};

const stripDocumentWrapper = (html = "") => {
  return String(html || "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(/<html[^>]*>/gi, "")
    .replace(/<\/html>/gi, "")
    .replace(/<body[^>]*>/gi, "")
    .replace(/<\/body>/gi, "")
    .trim();
};

let cachedNewsletterBrandLogoAssetPromise = null;

const getNewsletterBrandLogoAsset = async () => {
  if (cachedNewsletterBrandLogoAssetPromise) {
    return cachedNewsletterBrandLogoAssetPromise;
  }

  cachedNewsletterBrandLogoAssetPromise = (async () => {
  if (NEWSLETTER_BRAND_LOGO_URL) {
    return {
      src: NEWSLETTER_BRAND_LOGO_URL,
      attachment: null,
    };
  }

  try {
    const logoBytes = await readFile(NEWSLETTER_BRAND_LOGO_PATH);
    const contentBase64 = logoBytes.toString("base64");

    return {
      src: `cid:${NEWSLETTER_BRAND_LOGO_CID}`,
      attachment: {
        filename: "secxion-logo.png",
        content: logoBytes,
        cid: NEWSLETTER_BRAND_LOGO_CID,
        contentType: "image/png",
        contentDisposition: "inline",
        contentBase64,
      },
    };
  } catch (error) {
    console.warn(
      "⚠️ Unable to load newsletter logo asset; falling back to text-only branding:",
      error.message,
    );
    return {
      src: "",
      attachment: null,
    };
  }
  })();

  return cachedNewsletterBrandLogoAssetPromise;
};

const buildNewsletterBrandedHtml = (
  campaignHtml = "",
  unsubscribeHtml = "",
  brandLogoSource = "",
) => {
  const bodyContent = stripDocumentWrapper(campaignHtml);
  const logoImg = brandLogoSource
    ? `<img src="${brandLogoSource}" alt="${NEWSLETTER_BRAND_NAME} logo" width="44" height="44" style="display:block; width:44px; height:44px; border:0; outline:none; text-decoration:none; border-radius:10px;"/>`
    : "";

  return `
    <div style="margin:0; padding:0; background:#f3f6fb;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f3f6fb; padding:24px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:680px; background:#ffffff; border:1px solid #e5e7eb; border-radius:14px; overflow:hidden;">
              <tr>
                <td style="padding:18px 22px; background:#0f172a; color:#ffffff; border-bottom:3px solid #eab308;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="width:52px; vertical-align:middle;">${logoImg}</td>
                      <td style="vertical-align:middle;">
                        <div style="font-size:20px; font-weight:700; letter-spacing:0.2px;">${NEWSLETTER_BRAND_NAME}</div>
                        <div style="font-size:12px; color:#cbd5e1; margin-top:3px;">Weekly Briefing</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 24px; position:relative; color:#111827; font-family:Arial, sans-serif; line-height:1.65; font-size:15px;">
                  <div style="position:relative; z-index:1;">${bodyContent}</div>
                </td>
              </tr>
              <tr>
                <td style="padding:0 24px 22px; color:#6b7280; font-size:12px; line-height:1.6; font-family:Arial, sans-serif;">
                  ${unsubscribeHtml || ""}
                  <div style="margin-top:8px;">This email was sent by ${NEWSLETTER_BRAND_NAME}.</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
};

// Default sender info - always use "Secxion" branding
const DEFAULT_FROM_EMAIL = HOSTINGER_SMTP_USER || "verify@secxion.com";
const DEFAULT_FROM_NAME = "Secxion";
const REPLY_TO_EMAIL = "verify@secxion.com";

/**
 * Send email using Brevo HTTP API (works on Render free tier)
 */
const parseFrom = (fromHeader = "") => {
  const match = String(fromHeader).match(/"?([^"<]+)"?\s*<([^>]+)>/);
  if (!match) {
    return {
      name: DEFAULT_FROM_NAME,
      email: BREVO_SENDER_FROM_EMAIL || DEFAULT_FROM_EMAIL,
    };
  }

  return {
    name: String(match[1] || DEFAULT_FROM_NAME).trim(),
    email: String(match[2] || BREVO_SENDER_FROM_EMAIL || DEFAULT_FROM_EMAIL)
      .trim()
      .toLowerCase(),
  };
};

const sendViaBrevoAPI = async (options, context) => {
  if (!BREVO_API_KEY) {
    throw new Error("BREVO_API_KEY is not set. Cannot use Brevo HTTP API.");
  }

  const from = parseFrom(options.from);
  const senderEmail = BREVO_SENDER_FROM_EMAIL || from.email;
  const replyToEmail = options.replyTo || REPLY_TO_EMAIL;

  const inlineImage = {};
  const attachment = [];

  for (const item of options.attachments || []) {
    let contentBase64 = "";

    if (typeof item.contentBase64 === "string" && item.contentBase64) {
      contentBase64 = item.contentBase64;
    }

    if (!contentBase64 && Buffer.isBuffer(item.content)) {
      contentBase64 = item.content.toString("base64");
    } else if (!contentBase64 && typeof item.content === "string") {
      contentBase64 = item.encoding === "base64"
        ? item.content
        : Buffer.from(item.content).toString("base64");
    } else if (!contentBase64 && item.path) {
      const fileBuffer = await readFile(item.path);
      contentBase64 = fileBuffer.toString("base64");
    }

    if (!contentBase64) {
      continue;
    }

    if (item.cid) {
      inlineImage[String(item.cid)] = contentBase64;
    } else {
      attachment.push({
        name: item.filename || "attachment",
        content: contentBase64,
      });
    }
  }

  const payload = {
    sender: {
      name: from.name,
      email: senderEmail,
    },
    replyTo: {
      name: from.name,
      email: replyToEmail,
    },
    to: [{ email: options.to }],
    subject: options.subject,
    htmlContent: options.html,
    textContent: options.text,
    headers: options.headers,
  };

  if (Object.keys(inlineImage).length > 0) {
    payload.inlineImage = inlineImage;
  }

  if (attachment.length > 0) {
    payload.attachment = attachment;
  }

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          accept: "application/json",
          "api-key": BREVO_API_KEY,
          "content-type": "application/json",
        },
        timeout: 30000,
      },
    );
    return { messageId: response.data.messageId || "brevo-api-success" };
  } catch (error) {
    throw new Error("Brevo HTTP API failed");
  }
};

/**
 * Sends an email using available methods with fallbacks.
 * Priority: 1. Hostinger SMTP, 2. Brevo HTTP API, 3. Brevo SMTP, 4. Gmail SMTP
 * @param {object} options - Nodemailer mail options.
 * @param {string} context - A description of the email's purpose (e.g., "Verification Email").
 * @returns {Promise<object>} - Info object on success.
 * @throws {Error} - If email sending fails through all configured methods.
 */
const sendEmail = async (options, context, sendPolicy = {}) => {
  const errors = [];
  const SMTP_TIMEOUT = 20000; // 20 second hard timeout per method
  const { allowGmailFallback = true } = sendPolicy;

  const extractEmailFromHeader = (headerValue = "") => {
    const match = String(headerValue).match(/<([^>]+)>/);
    if (match?.[1]) {
      return String(match[1]).trim().toLowerCase();
    }
    return String(headerValue || "").trim().toLowerCase();
  };

  const getHostingerSendOptions = (mailOptions) => {
    if (!HOSTINGER_ENFORCE_AUTH_FROM || !HOSTINGER_SMTP_USER) {
      return mailOptions;
    }

    const authMailbox = String(HOSTINGER_SMTP_USER).trim().toLowerCase();
    const fromEmail = extractEmailFromHeader(mailOptions.from);

    if (!authMailbox || !fromEmail || fromEmail === authMailbox) {
      return mailOptions;
    }

    const fromName = parseFrom(mailOptions.from).name || DEFAULT_FROM_NAME;
    const hostingerCompatible = {
      ...mailOptions,
      from: `"${fromName}" <${HOSTINGER_SMTP_USER}>`,
      replyTo: mailOptions.replyTo || NEWSLETTER_REPLY_TO || REPLY_TO_EMAIL,
    };

    return hostingerCompatible;
  };

  // Method 1: Try Hostinger SMTP first (primary)
  if (primaryTransporter) {
    try {
      const hostingerOptions = getHostingerSendOptions(options);
      const info = await withTimeout(
        primaryTransporter.sendMail(hostingerOptions),
        SMTP_TIMEOUT,
        "Hostinger SMTP timeout",
      );
      return info;
    } catch (hostingerError) {
      errors.push("Hostinger SMTP failed");
      console.error("Hostinger SMTP failed");
    }
  }

  // Method 2: Try Brevo HTTP API (works on Render free tier)
  if (BREVO_API_KEY) {
    try {
      return await sendViaBrevoAPI(options, context);
    } catch (apiError) {
      errors.push(`Brevo API: ${apiError.message}`);
    }
  }

  // Method 3: Try Brevo SMTP
  if (secondaryTransporter) {
    try {
      const modifiedOptions = { ...options };
      if (BREVO_SENDER_FROM_EMAIL) {
        modifiedOptions.from = `"${DEFAULT_FROM_NAME}" <${BREVO_SENDER_FROM_EMAIL}>`;
      }
      modifiedOptions.replyTo = REPLY_TO_EMAIL;
      const info = await withTimeout(
        secondaryTransporter.sendMail(modifiedOptions),
        SMTP_TIMEOUT,
        "Brevo SMTP timeout",
      );
      return info;
    } catch (brevoError) {
      errors.push("Brevo SMTP failed");
      console.error("Brevo SMTP failed");
    }
  }

  // Method 4: Try Gmail SMTP as last resort
  if (allowGmailFallback && gmailTransporter) {
    try {
      const modifiedOptions = { ...options };
      modifiedOptions.from = `"${DEFAULT_FROM_NAME}" <${MAIL_USER}>`;
      modifiedOptions.replyTo = REPLY_TO_EMAIL;
      const info = await withTimeout(
        gmailTransporter.sendMail(modifiedOptions),
        SMTP_TIMEOUT,
        "Gmail SMTP timeout",
      );
      return info;
    } catch (gmailError) {
      errors.push("Gmail SMTP failed");
      console.error("Gmail SMTP failed");
    }
  }

  // All methods failed
  throw new Error(`All email methods failed: ${errors.join("; ")}`);
};

export const getNewsletterMailHealth = () => {
  const usesCompanyDomain = (email = "") =>
    String(email).toLowerCase().endsWith(`@${COMPANY_DOMAIN}`);

  const normalizedHostingerUser = String(HOSTINGER_SMTP_USER || "").trim().toLowerCase();
  const normalizedNewsletterFrom = String(NEWSLETTER_FROM_EMAIL || "").trim().toLowerCase();
  const hostingerFromAligned =
    !normalizedHostingerUser || normalizedHostingerUser === normalizedNewsletterFrom;

  const checks = {
    newsletterFromConfigured: Boolean(NEWSLETTER_FROM_EMAIL),
    newsletterReplyToConfigured: Boolean(NEWSLETTER_REPLY_TO),
    newsletterReturnPathConfigured: Boolean(NEWSLETTER_RETURN_PATH),
    senderDomainAligned:
      usesCompanyDomain(NEWSLETTER_FROM_EMAIL) &&
      usesCompanyDomain(NEWSLETTER_REPLY_TO) &&
      usesCompanyDomain(NEWSLETTER_RETURN_PATH),
    hostingerReady: Boolean(primaryTransporter),
    brevoApiReady: Boolean(BREVO_API_KEY),
    brevoSmtpReady: Boolean(secondaryTransporter),
    gmailReady: Boolean(gmailTransporter),
    hostingerAuthFromEnforced: HOSTINGER_ENFORCE_AUTH_FROM,
    hostingerFromAligned,
    strictModeEnabled: NEWSLETTER_STRICT_MODE,
  };

  const hasProvider = NEWSLETTER_STRICT_MODE
    ? checks.hostingerReady || checks.brevoApiReady || checks.brevoSmtpReady
    : checks.hostingerReady || checks.brevoApiReady || checks.brevoSmtpReady || checks.gmailReady;

  const issues = [];
  if (NEWSLETTER_STRICT_MODE) {
    if (!checks.newsletterFromConfigured) {
      issues.push("NEWSLETTER_FROM_EMAIL is not configured.");
    }
    if (!checks.newsletterReplyToConfigured) {
      issues.push("NEWSLETTER_REPLY_TO is not configured.");
    }
    if (!checks.newsletterReturnPathConfigured) {
      issues.push("NEWSLETTER_RETURN_PATH is not configured.");
    }
    if (!checks.senderDomainAligned) {
      issues.push("Newsletter sender, reply-to, and return-path should use the company domain.");
    }
  }
  if (!hasProvider) {
    issues.push("No domain-aligned mail provider is configured (Hostinger or Brevo).");
  }
  if (
    NEWSLETTER_STRICT_MODE &&
    checks.hostingerReady &&
    checks.hostingerAuthFromEnforced &&
    !checks.hostingerFromAligned
  ) {
    issues.push(
      `Hostinger requires sender mailbox alignment. Newsletter sender will be sent via ${HOSTINGER_SMTP_USER}.`,
    );
  }

  return {
    ready: issues.filter((issue) => !issue.includes("will be sent via")).length === 0,
    sender: {
      from: NEWSLETTER_FROM_EMAIL,
      replyTo: NEWSLETTER_REPLY_TO,
      returnPath: NEWSLETTER_RETURN_PATH,
      listId: NEWSLETTER_LIST_ID,
    },
    providers: {
      hostinger: checks.hostingerReady,
      brevoApi: checks.brevoApiReady,
      brevoSmtp: checks.brevoSmtpReady,
      gmailFallbackEnabledForNewsletter: false,
    },
    checks,
    issues,
  };
};

export const sendVerificationEmail = async (email, token) => {
  const backendBaseUrl = BACKEND_URL || FRONTEND_URL;
  const redirectUrl = `${FRONTEND_URL}/verify-email`;
  const verificationLink = `${backendBaseUrl}/api/verify-email?token=${token}&redirect=${encodeURIComponent(redirectUrl)}`;

  const mailOptions = {
    from: `"${DEFAULT_FROM_NAME}" <${DEFAULT_FROM_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: email,
    subject: "🛡️ Verify Your Email - Secxion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to Secxion!</h2>
        <p>Click the button below to verify your email and activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="background-color: #007bff; color: white; padding: 12px 30px;
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          If you did not sign up, you can safely ignore this email.
        </p>
        <p>– Team Secxion</p>
      </div>
    `,
  };

  await sendEmail(mailOptions, "Verification Email");
};

export const sendResetCodeEmail = async (email, code, type) => {
  const label =
    type === "password" ? "Reset Your Password" : "Reset Telegram Number";

  const mailOptions = {
    from: `"${DEFAULT_FROM_NAME}" <${DEFAULT_FROM_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: email,
    subject: `🔐 ${label} Code - Secxion`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${label}</h2>
        <p>Use the verification code below to complete your ${type} reset request:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f8f9fa; border: 2px dashed #007bff;
                      padding: 20px; border-radius: 10px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #007bff;
                          letter-spacing: 4px;">${code}</span>
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">
          This code will expire in 10 minutes.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you did not request this, you can safely ignore this email.
        </p>
        <p>– Team Secxion</p>
      </div>
    `,
  };

  await sendEmail(mailOptions, "Reset Code Email");
};

export const sendBankVerificationCode = async (email, code) => {
  const mailOptions = {
    from: `"${DEFAULT_FROM_NAME}" <${DEFAULT_FROM_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: email,
    subject: `🔐 Confirm Bank Account Addition - Secxion`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Bank Account Verification</h2>
        <p>Use the verification code below to confirm your bank account addition:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f8f9fa; border: 2px dashed #28a745;
                      padding: 20px; border-radius: 10px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #28a745;
                          letter-spacing: 4px;">${code}</span>
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">
          This code will expire in 10 minutes.
        </p>
        <p style="color: #666; font-size: 14px;">
          If you did not attempt to add a bank account, you can safely ignore this email.
        </p>
        <p>– Team Secxion</p>
      </div>
    `,
  };

  await sendEmail(mailOptions, "Bank Verification Email");
};

export const sendKycPhoneVerificationCode = async (email, phoneNumber, code) => {
  const mailOptions = {
    from: `"${DEFAULT_FROM_NAME}" <${DEFAULT_FROM_EMAIL}>`,
    replyTo: REPLY_TO_EMAIL,
    to: email,
    subject: "Phone Verification Code for KYC - Secxion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">KYC Phone Verification</h2>
        <p>You are verifying this phone number for your KYC submission:</p>
        <p style="font-weight: bold; font-size: 16px;">${phoneNumber}</p>
        <p>Use the verification code below to continue:</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f8f9fa; border: 2px dashed #f59e0b;
                      padding: 20px; border-radius: 10px; display: inline-block;">
            <span style="font-size: 32px; font-weight: bold; color: #f59e0b;
                         letter-spacing: 4px;">${code}</span>
          </div>
        </div>
        <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        <p style="color: #666; font-size: 14px;">If you did not request this, ignore this message.</p>
        <p>– Team Secxion</p>
      </div>
    `,
  };

  await sendEmail(mailOptions, "KYC Phone Verification Email");
};

export const sendNewsletterConfirmationEmail = async (email, confirmLink) => {
  const fromEmail = NEWSLETTER_STRICT_MODE ? NEWSLETTER_FROM_EMAIL : DEFAULT_FROM_EMAIL;
  const replyToEmail = NEWSLETTER_STRICT_MODE ? NEWSLETTER_REPLY_TO : REPLY_TO_EMAIL;

  const mailOptions = {
    from: `"${DEFAULT_FROM_NAME}" <${fromEmail}>`,
    replyTo: replyToEmail,
    to: email,
    subject: "Confirm your newsletter subscription - Secxion",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #111827;">Confirm your subscription</h2>
        <p>Thanks for subscribing to Secxion updates.</p>
        <p>Please confirm your email to start receiving our newsletters.</p>
        <div style="margin: 24px 0; text-align: center;">
          <a
            href="${confirmLink}"
            style="display: inline-block; background: #eab308; color: #111827; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 700;"
          >
            Confirm Subscription
          </a>
        </div>
        <p style="font-size: 13px; color: #6b7280;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };

  await sendEmail(mailOptions, "Newsletter Confirmation Email", {
    allowGmailFallback: !NEWSLETTER_STRICT_MODE,
  });
};

export const sendNewsletterCampaignEmail = async ({
  to,
  subject,
  html,
  text,
  unsubscribeLink,
}) => {
  const fallbackHtml = text
    ? `<pre style="white-space: pre-wrap; font-family: Arial, sans-serif;">${text}</pre>`
    : "";
  const normalizedHtml = normalizeCampaignHtml(html || fallbackHtml);
  const unsubscribeHtml = unsubscribeLink
    ? `<p style="font-size: 12px; color: #6b7280; margin-top: 28px;">If you no longer want these emails, <a href="${unsubscribeLink}" style="color: #6b7280;">unsubscribe here</a>.</p>`
    : "";

  const brandLogoAsset = await getNewsletterBrandLogoAsset();
  const brandedHtml = buildNewsletterBrandedHtml(
    normalizedHtml,
    unsubscribeHtml,
    brandLogoAsset.src,
  );
  const htmlBody = `<!doctype html><html><body>${brandedHtml}</body></html>`;
  const baseTextBody = String(text || "").trim() || htmlToPlainText(normalizedHtml);
  const textBody = unsubscribeLink
    ? `${baseTextBody}\n\nUnsubscribe: ${unsubscribeLink}`
    : baseTextBody;

  const newsletterHeaders = {
    "List-ID": NEWSLETTER_LIST_ID,
    Precedence: "bulk",
    "X-Auto-Response-Suppress": "All",
  };

  if (unsubscribeLink) {
    newsletterHeaders["List-Unsubscribe"] = `<${unsubscribeLink}>`;
    newsletterHeaders["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }

  const mailOptions = {
    from: `"${DEFAULT_FROM_NAME}" <${NEWSLETTER_STRICT_MODE ? NEWSLETTER_FROM_EMAIL : DEFAULT_FROM_EMAIL}>`,
    replyTo: NEWSLETTER_STRICT_MODE ? NEWSLETTER_REPLY_TO : REPLY_TO_EMAIL,
    ...(NEWSLETTER_STRICT_MODE ? { returnPath: NEWSLETTER_RETURN_PATH } : {}),
    to,
    subject,
    html: htmlBody,
    text: textBody || undefined,
    headers: newsletterHeaders,
    date: new Date(),
    ...(brandLogoAsset.attachment
      ? { attachments: [brandLogoAsset.attachment] }
      : {}),
  };

  await sendEmail(mailOptions, "Newsletter Campaign Email", {
    allowGmailFallback: !NEWSLETTER_STRICT_MODE,
  });
};
