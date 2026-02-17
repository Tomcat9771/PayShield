const express = require("express");
const crypto = require("crypto");
const router = express.Router();

console.log("🔥 PAYMENTS ROUTE LOADED AT", __filename);

router.post("/payfast/create", async (req, res) => {
  try {
    const { guard_id, amount, payout_method } = req.body;

    if (!guard_id || !amount) {
      return res.status(400).json({ error: "Missing guard_id or amount" });
    }

    const merchant_id = process.env.PAYFAST_MERCHANT_ID;
    const merchant_key = process.env.PAYFAST_MERCHANT_KEY;

    if (!merchant_id || !merchant_key) {
      throw new Error("Missing PayFast merchant credentials");
    }

    // 🔑 PayFast-safe guard reference (ALPHANUMERIC ONLY)
    const safeGuardRef = `G${guard_id.replace(/[^a-zA-Z0-9]/g, "")}`;

    const paymentData = {
  merchant_id,
  merchant_key,
  return_url: `${process.env.PAYFAST_RETURN_URL}/${guard_id}`,
  cancel_url: `${process.env.PAYFAST_CANCEL_URL}/${guard_id}`,
  notify_url: process.env.PAYFAST_NOTIFY_URL,
  m_payment_id: `GP${Date.now()}`,
  amount: Number(amount).toFixed(2),
  item_name: "Guard support payment",
  custom_str1: safeGuardRef,
  payment_method:
    payout_method === "CASH" ? "dc" : "eft"
};

    // 1️⃣ Sort keys alphabetically
    const sortedKeys = Object.keys(paymentData).sort();

    // 2️⃣ Build signature string (NO signature field)
    const paramString = sortedKeys
      .map(key =>
        `${key}=${encodeURIComponent(paymentData[key]).replace(/%20/g, "+")}`
      )
      .join("&");

    console.log("🔥 PAYFAST SIGN STRING:", paramString);

    // 3️⃣ Generate MD5 signature
    const signature = crypto
      .createHash("md5")
      .update(paramString)
      .digest("hex");

    // 4️⃣ Return fields to frontend (NOT a URL)
console.log("🚨 PAYFAST RETURN URL:", paymentData.return_url);
console.log("🚨 PAYFAST CANCEL URL:", paymentData.cancel_url);
console.log("🚨 PAYFAST GUARD ID:", guard_id);

    return res.json({
      action: "https://sandbox.payfast.co.za/eng/process",
      fields: {
        ...paymentData,
        signature
      }
    });

  } catch (err) {
    console.error("❌ PayFast create error:", err);
    return res.status(500).json({ error: "Failed to create PayFast payment" });
  }
});

module.exports = router;
