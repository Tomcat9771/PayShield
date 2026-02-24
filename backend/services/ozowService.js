import crypto from "crypto";

/**
 * Generate Ozow SHA512 hash
 */
function generateHash({
  siteCode,
  countryCode,
  currencyCode,
  amount,
  transactionReference,
  bankReference,
  cancelUrl,
  errorUrl,
  successUrl,
  notifyUrl,
  isTest,
  optional1 = "",
  optional2 = "",
  optional3 = "",
  optional4 = "",
  optional5 = "",
  privateKey,
}) {
  const inputString =
    siteCode +
    countryCode +
    currencyCode +
    amount +
    transactionReference +
    bankReference +
    cancelUrl +
    errorUrl +
    successUrl +
    notifyUrl +
    String(isTest) +
    optional1 +
    optional2 +
    optional3 +
    optional4 +
    optional5 +
    privateKey;

  return crypto
    .createHash("sha512")
    .update(inputString.toLowerCase())
    .digest("hex");
}

export async function createOzowPayment({
  amount,
  transactionReference,
  bankReference,
}) {
  const siteCode = process.env.OZOW_SITE_CODE?.trim();
  const apiKey = process.env.OZOW_API_KEY?.trim();
  const privateKey = process.env.OZOW_PRIVATE_KEY?.trim();

  if (!siteCode || !apiKey || !privateKey) {
    throw new Error("Ozow environment variables missing");
  }

  const countryCode = "ZA";
  const currencyCode = "ZAR";
  const isTest = process.env.OZOW_IS_TEST === "true";

  const cancelUrl = process.env.OZOW_CANCEL_URL?.trim();
  const errorUrl = process.env.OZOW_ERROR_URL?.trim();
  const successUrl = process.env.OZOW_SUCCESS_URL?.trim();
  const notifyUrl = process.env.OZOW_NOTIFY_URL?.trim();

  if (!cancelUrl || !errorUrl || !successUrl || !notifyUrl) {
    throw new Error("Ozow redirect URLs not configured");
  }

  const numericAmount = Number(amount);
  if (isNaN(numericAmount)) {
    throw new Error("Invalid amount supplied to Ozow");
  }

  const formattedAmount = numericAmount.toFixed(2);
  const optional1 = "registration_fee";

  const hashCheck = generateHash({
    siteCode,
    countryCode,
    currencyCode,
    amount: formattedAmount,
    transactionReference,
    bankReference,
    cancelUrl,
    errorUrl,
    successUrl,
    notifyUrl,
    isTest,
    optional1,
    privateKey,
  });

  const payload = {
    siteCode,
    countryCode,
    currencyCode,
    amount: formattedAmount,
    transactionReference,
    bankReference,
    cancelUrl,
    errorUrl,
    successUrl,
    notifyUrl,
    isTest,
    optional1,
    hashCheck,
  };

  const apiUrl = isTest
    ? "https://stagingapi.ozow.com/PostPaymentRequest"
    : "https://api.ozow.com/PostPaymentRequest";

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ApiKey: apiKey,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok || data.errorMessage) {
    console.error("Ozow raw response:", data);
    throw new Error(data.errorMessage || "Ozow payment failed");
  }

  return data;
}