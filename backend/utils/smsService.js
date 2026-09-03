import axios from "axios";

const DEFAULT_TERMII_BASE_URL = "https://api.ng.termii.com/api/sms/send";
const DEFAULT_AT_BASE_URL = "https://api.sandbox.africastalking.com/version1/messaging";

const getSmsProvider = () =>
  String(process.env.SMS_PROVIDER || "termii").trim().toLowerCase();

export const getSmsHealthStatus = () => ({
  provider: getSmsProvider(),
  configured:
    getSmsProvider() === "dev"
      ? true
      : getSmsProvider() === "africastalking"
      ? Boolean(process.env.AT_API_KEY && process.env.AT_USERNAME)
      : Boolean(process.env.TERMII_API_KEY),
  baseUrl:
    getSmsProvider() === "africastalking"
      ? process.env.AT_BASE_URL || DEFAULT_AT_BASE_URL
      : process.env.TERMII_BASE_URL || DEFAULT_TERMII_BASE_URL,
  senderId:
    getSmsProvider() === "africastalking"
      ? process.env.AT_SENDER_ID || ""
      : process.env.TERMII_SENDER_ID || "Secxion",
  channel: process.env.TERMII_CHANNEL || "generic",
});

const normalizePhoneNumber = (value = "") =>
  String(value).trim().replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");

const providerError = (error, fallbackMessage) => {
  const wrapped = new Error(
    error?.response?.data?.message || error?.response?.data?.error || fallbackMessage,
  );
  wrapped.providerStatus = error?.response?.status;
  return wrapped;
};

const sendWithTermii = async (phoneNumber, message) => {
  if (!process.env.TERMII_API_KEY) {
    throw new Error("Termii SMS is not configured. Set TERMII_API_KEY.");
  }

  const endpoint = process.env.TERMII_BASE_URL || DEFAULT_TERMII_BASE_URL;
  const requestBody = {
    api_key: process.env.TERMII_API_KEY,
    to: phoneNumber,
    from: process.env.TERMII_SENDER_ID || "Secxion",
    sms: message,
    type: "plain",
    channel: process.env.TERMII_CHANNEL || "generic",
  };

  try {
    const response = await axios.post(endpoint, requestBody, { timeout: 10000 });
    return response.data;
  } catch (error) {
    const messageText = String(error?.response?.data?.message || "");
    if (
      error?.response?.status === 422 &&
      messageText.includes("SENDER_ID_NOT_APPROVED")
    ) {
      const fallbackBody = { ...requestBody };
      delete fallbackBody.from;
      const response = await axios.post(endpoint, fallbackBody, {
        timeout: 10000,
      });
      return response.data;
    }

    throw providerError(error, "Termii could not send the SMS.");
  }
};

const sendWithAfricasTalking = async (phoneNumber, message) => {
  if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
    throw new Error(
      "Africa's Talking SMS is not configured. Set AT_API_KEY and AT_USERNAME.",
    );
  }

  try {
    const body = new URLSearchParams({
      username: process.env.AT_USERNAME,
      to: phoneNumber,
      message,
    });
    if (process.env.AT_SENDER_ID) body.set("from", process.env.AT_SENDER_ID);

    const response = await axios.post(
      process.env.AT_BASE_URL || DEFAULT_AT_BASE_URL,
      body,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
          apiKey: process.env.AT_API_KEY,
        },
        timeout: 10000,
      },
    );
    return response.data;
  } catch (error) {
    throw providerError(error, "Africa's Talking could not send the SMS.");
  }
};

export const sendKycPhoneOtpSms = async (phoneNumber, code) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  const message = `Secxion KYC verification code: ${code}. This code expires in 10 minutes.`;
  const provider = getSmsProvider();

  if (provider === "termii") {
    return sendWithTermii(normalizedPhone, message);
  }
  if (provider === "africastalking") {
    return sendWithAfricasTalking(normalizedPhone, message);
  }

  throw new Error(
    `SMS provider is not supported for production KYC: ${provider}. Use SMS_PROVIDER=termii or SMS_PROVIDER=africastalking.`,
  );
};

