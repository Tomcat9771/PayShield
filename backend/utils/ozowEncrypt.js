import crypto from "crypto";

function sha512(input) {
  return crypto.createHash("sha512").update(input).digest("hex");
}

export function encryptAccountNumber(
  accountNumber,
  encryptionKey,
  merchantReference,
  amount
) {
  // Build IV string
  const ivString =
    merchantReference + Math.round(amount * 100) + encryptionKey;

  const iv = Buffer.from(sha512(ivString.toLowerCase()).slice(0, 16));

  // Ensure key is 32 bytes
  let key = encryptionKey;
  while (key.length < 32) {
    key += key;
  }
  key = key.slice(0, 32);

  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(key),
    iv
  );

  let encrypted = cipher.update(accountNumber, "utf8", "base64");
  encrypted += cipher.final("base64");

  return encrypted;
}

