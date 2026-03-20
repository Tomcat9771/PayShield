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
  ApiKey,
}) {
  // 🔥 Convert amount to CENTS
  const amountInCents = Math.round(Number(amount) * 100);

  // 🔥 Build string EXACTLY as Ozow expects
  const inputString =
    siteCode +
    amountInCents +
    merchantReference +
    customerBankReference +
    isRtc +
    notifyUrl +
    bankGroupId +
    accountNumber +
    branchCode +
    ApiKey;

  // 🔥 MUST be lowercase BEFORE hashing
  const lowerString = inputString.toLowerCase();

  return crypto
    .createHash("sha512")
    .update(lowerString)
    .digest("hex");
}