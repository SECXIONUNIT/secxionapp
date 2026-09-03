import axios from "axios";

const getConfig = () => ({
  accountSid: String(process.env.TWILIO_ACCOUNT_SID || "").trim(),
  authToken: String(process.env.TWILIO_AUTH_TOKEN || "").trim(),
  serviceSid: String(process.env.TWILIO_VERIFY_SERVICE_SID || "").trim(),
});

const getEndpoint = (serviceSid, action) =>
  `https://verify.twilio.com/v2/Services/${serviceSid}/${action}`;

const getProviderError = (error, fallbackMessage) => {
  const providerStatus = error?.response?.status;
  const providerMessage = error?.response?.data?.message;
  const providerError = new Error(providerMessage || fallbackMessage);
  providerError.providerStatus = providerStatus;
  return providerError;
};

export const isTwilioVerifyConfigured = () => {
  const { accountSid, authToken, serviceSid } = getConfig();
  return Boolean(accountSid && authToken && serviceSid);
};

const requireConfig = () => {
  if (!isTwilioVerifyConfigured()) {
    throw new Error(
      "Twilio Verify is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_VERIFY_SERVICE_SID.",
    );
  }
  return getConfig();
};

export const startTwilioVerification = async (phoneNumber) => {
  const { accountSid, authToken, serviceSid } = requireConfig();
  const requestConfig = {
    auth: { username: accountSid, password: authToken },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10000,
  };
  const body = new URLSearchParams({
    To: phoneNumber,
    Channel: "sms",
    CustomFriendlyName: "Secxion KYC",
  });

  try {
    const response = await axios.post(
      getEndpoint(serviceSid, "Verifications"),
      body,
      requestConfig,
    );

    return response.data;
  } catch (error) {
    if (
      error?.response?.status === 403 &&
      error?.response?.data?.message === "Custom friendly name not allowed"
    ) {
      const trialCompatibleBody = new URLSearchParams({
        To: phoneNumber,
        Channel: "sms",
      });
      const response = await axios.post(
        getEndpoint(serviceSid, "Verifications"),
        trialCompatibleBody,
        requestConfig,
      );
      return response.data;
    }

    throw getProviderError(error, "Twilio could not send the verification code.");
  }
};

export const checkTwilioVerification = async (phoneNumber, code) => {
  const { accountSid, authToken, serviceSid } = requireConfig();
  const body = new URLSearchParams({
    To: phoneNumber,
    Code: code,
  });

  try {
    const response = await axios.post(
      getEndpoint(serviceSid, "VerificationCheck"),
      body,
      {
        auth: { username: accountSid, password: authToken },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 10000,
      },
    );

    return response.data;
  } catch (error) {
    throw getProviderError(error, "Twilio could not verify the code.");
  }
};

export const getTwilioVerifyHealth = () => ({
  provider: "twilio",
  configured: isTwilioVerifyConfigured(),
});
