// routes/webhooks/payfast.js
const express = require("express");
const crypto = require("crypto");
const router = express.Router();

const { getSupabaseClient, getCommission } = require("../../lib/supabaseClient");
const supabase = getSupabaseClient();

/**
 * PayFast webhook
 * POST /api/webhooks/payfast
 */
router.post(
  "/payfast",
  express.urlencoded({ extended: false }),
  async (req, res) => {
    try {
      const payload = req.body;

      // 1️⃣ Verify signature
      if (!verifyPayFastSignature(payload)) {
        console.warn("❌ PayFast webhook: invalid signature");
        return res.status(200).send("OK");
      }

      // 2️⃣ Only process completed payments
      if (payload.payment_status !== "COMPLETE") {
        return res.status(200).send("OK");
      }

      const providerRef = payload.m_payment_id;
      const guardId = payload.custom_str1;
      const amountGross = parseFloat(payload.amount_gross);

      if (!providerRef || !guardId || !amountGross) {
        console.warn("❌ PayFast webhook: missing required fields");
        return res.status(200).send("OK");
      }

      // 3️⃣ Idempotency check (Supabase)
      const { data: existing } = await supabase
        .from("transactions")
        .select("id")
        .eq("provider", "PAYFAST")
        .eq("provider_ref", providerRef)
        .maybeSingle();

      if (existing) {
        return res.status(200).send("OK");
      }

      // 4️⃣ Calculate commission + net
      const commissionRate = getCommission(); // e.g. 0.05
      const commissionAmount = Number((amountGross * commissionRate).toFixed(2));
      const amountNet = Number((amountGross - commissionAmount).toFixed(2));

      // 5️⃣ Insert transaction
      const { error } = await supabase.from("transactions").insert({
        guard_id: guardId,
        amount_gross: amountGross,
        commission_amount: commissionAmount,
        amount_net: amountNet,
        status: "CONFIRMED",
        payment_method: "PENDING", // resolved at payout time
        provider: "PAYFAST",
        provider_ref: providerRef,
      });

      if (error) {
        console.error("❌ Transaction insert failed:", error);
        return res.status(200).send("OK");
      }

      console.log(
        `✅ PayFast payment confirmed | Ref: ${providerRef} | Guard: ${guardId} | Gross: R${amountGross}`
      );

      return res.status(200).send("OK");
    } catch (err) {
      console.error("🔥 PayFast webhook error:", err);
      return res.status(200).send("OK");
    }
  }
);

module.exports = router;

/**
 * PayFast signature verification
 */
function verifyPayFastSignature(data) {
  const passphrase = process.env.PAYFAST_PASSPHRASE || "";

  const payload = { ...data };
  const receivedSignature = payload.signature;
  delete payload.signature;

  const paramString = Object.keys(payload)
    .sort()
    .map(
      (key) =>
        `${key}=${encodeURIComponent(payload[key]).replace(/%20/g, "+")}`
    )
    .join("&");

  const signatureString = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase)}`
    : paramString;

  const calculatedSignature = crypto
    .createHash("md5")
    .update(signatureString)
    .digest("hex");

  return calculatedSignature === receivedSignature;
}
