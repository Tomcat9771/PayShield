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

  const hashString =
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
    isTest +
    privateKey;

  return crypto
    .createHash("sha512")
    .update(hashString)
    .digest("hex");
}

export async function createOzowPayment({
  amount,
  transactionReference,
  bankReference,
  businessId,
  purpose = "qr_payment",
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

  const isTestString = isTest ? "true" : "false";

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
    isTest: isTestString,
    privateKey,
  });

  const payload = {
    SiteCode: siteCode,
    CountryCode: countryCode,
    CurrencyCode: currencyCode,
    Amount: formattedAmount,
    TransactionReference: transactionReference,
    BankReference: bankReference,
    CancelUrl: cancelUrl,
    ErrorUrl: errorUrl,
    SuccessUrl: successUrl,
    NotifyUrl: notifyUrl,
    IsTest: isTestString,
    HashCheck: hashCheck,

    // Optional context fields
    Optional1: businessId,
    Optional2: purpose,
    Optional3: transactionReference,
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