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
  privateKey,
}) {

  let inputString =
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
    String(isTest);

  inputString += privateKey;

  return crypto
    .createHash("sha512")
    .update(inputString.toLowerCase())
    .digest("hex");
}

export async function createOzowPayment({
  amount,
  transactionReference,
  bankReference,
  businessId,
  purpose = "qr_payment"
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

  /* =============================
     REDIRECT URLS
  ============================= */

  let successUrl;
  let cancelUrl;
  let errorUrl;

  if (purpose === "registration_fee") {

    successUrl = process.env.OZOW_SUCCESS_URL;
    cancelUrl = process.env.OZOW_CANCEL_URL;
    errorUrl = process.env.OZOW_ERROR_URL;

  } else {

    successUrl = `${process.env.FRONTEND_URL}/qr-success`;
    cancelUrl = `${process.env.FRONTEND_URL}/qr-cancel`;
    errorUrl = `${process.env.FRONTEND_URL}/qr-error`;

  }

  const notifyUrl = process.env.OZOW_NOTIFY_URL?.trim();

  if (!cancelUrl || !errorUrl || !successUrl || !notifyUrl) {
    throw new Error("Ozow redirect URLs not configured");
  }

  /* =============================
     VALIDATE AMOUNT
  ============================= */

  const numericAmount = Number(amount);

  if (isNaN(numericAmount)) {
    throw new Error("Invalid amount supplied to Ozow");
  }

  const formattedAmount = numericAmount.toFixed(2);

  /* =============================
     HASH
  ============================= */

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
    privateKey,
  });

  /* =============================
     REQUEST PAYLOAD
  ============================= */

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
    hashCheck,

    // Optional metadata (helps webhook logic)
    optional1: businessId || "",
    optional2: purpose || "",
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
    throw new Error(data.errorMessage || "Ozow payment failed");
  }

  return data;
}