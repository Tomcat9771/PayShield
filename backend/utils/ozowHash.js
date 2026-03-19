import crypto from "crypto";

export function generateOzowHash({
  siteCode,
  amount,
  merchantReference,
  customerBankReference,
  isRtc,
  notifyUrl,
  bankGroupId,
  accountNumber,
  branchCode,
  apiKey,
}) {
  const inputString =
    siteCode +
    Math.round(amount * 100) +
    merchantReference +
    customerBankReference +
    isRtc +
    notifyUrl +
    bankGroupId +
    accountNumber +
    branchCode +
    apiKey;

  return crypto
    .createHash("sha512")
    .update(inputString.toLowerCase())
    .digest("hex");
}

