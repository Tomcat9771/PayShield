import crypto from "crypto";

const QR_SECRET = process.env.QR_SECRET;

/**
 * Generate signed QR code
 */
export function generateQR(businessId) {
  const signature = crypto
    .createHmac("sha256", QR_SECRET)
    .update(businessId)
    .digest("hex")
    .substring(0, 6);

  return `PSQR-${businessId}-${signature}`;
}

/**
 * Verify QR code signature
 */
export function verifyQR(qrCode) {
  if (!qrCode.startsWith("PSQR-")) return false;

  const parts = qrCode.split("-");

  const signature = parts.pop();
  const businessId = parts.slice(1).join("-");

  const expected = crypto
    .createHmac("sha256", QR_SECRET)
    .update(businessId)
    .digest("hex")
    .substring(0, 6);

  return signature === expected;
}