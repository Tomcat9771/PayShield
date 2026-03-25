import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔐 Hash helper
function generateHash(input) {
  return crypto
    .createHash("sha512")
    .update(input.toLowerCase())
    .digest("hex");
}

/* ======================================================
   🔥 OZOW VERIFY WEBHOOK (FINAL - PAYSHIELD READY)
====================================================== */
router.post("/verify", async (req, res) => {
  console.log("🔐 OZOW VERIFY WEBHOOK HIT");

  try {
    const accessToken = req.headers.accesstoken;

    // ✅ USE YOUR EXISTING ENV
    if (accessToken !== process.env.OZOW_ACCESS_TOKEN) {
      console.log("❌ Invalid AccessToken:", accessToken);

      return res.status(200).json({
        payoutId: req.body.payoutId,
        isVerified: false,
        reason: "Invalid AccessToken",
      });
    }

    const {
      payoutId,
      siteCode,
      amount,
      merchantReference,
      customerBankReference,
      isRtc,
      notifyUrl,
      bankingDetails,
      hashCheck,
    } = req.body;

    const apiKey = process.env.OZOW_PAYOUT_API_KEY;

    // 🔥 CRITICAL: MUST MATCH OZOW ORDER EXACTLY
    const inputString =
      payoutId +
      siteCode +
      Math.floor(amount * 100) +
      merchantReference +
      customerBankReference +
      isRtc +
      notifyUrl +
      bankingDetails.bankGroupId +
      bankingDetails.accountNumber +
      bankingDetails.branchCode +
      apiKey;

    const calculatedHash = generateHash(inputString);

    if (calculatedHash !== hashCheck) {
      console.log("❌ HASH MISMATCH");

      return res.status(200).json({
        payoutId,
        isVerified: false,
        reason: "Invalid hash",
      });
    }

    // 🔎 FIND PAYOUT (IMPORTANT: merchant_ref match)
    const { data: payout, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("merchant_ref", merchantReference)
      .single();

    if (error || !payout) {
      console.log("❌ Payout not found:", merchantReference);

      return res.status(200).json({
        payoutId,
        isVerified: false,
        reason: "Payout not found",
      });
    }

    console.log("✅ VERIFIED → Sending decryption key");

    return res.status(200).json({
      payoutId,
      isVerified: true,
      accountNumberDecryptionKey: payout.encryption_key,
      reason: "",
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    return res.status(200).json({
      payoutId: req.body?.payoutId,
      isVerified: false,
      reason: "Server error",
    });
  }
});

export default router;