import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* ======================================================
   🔐 OZOW VERIFY WEBHOOK (CRITICAL FIX)
====================================================== */
router.post("/verify", async (req, res) => {
  console.log("🔐 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const accessToken = req.headers.accesstoken;

    // 🔒 AUTH CHECK
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

    // 🔥 EXACT HASH ORDER REQUIRED BY OZOW
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

    const calculatedHash = crypto
      .createHash("sha512")
      .update(inputString.toLowerCase())
      .digest("hex");

    if (calculatedHash !== hashCheck) {
      console.log("❌ HASH MISMATCH");

      return res.status(200).json({
        payoutId,
        isVerified: false,
        reason: "Invalid hash",
      });
    }

    // 🔎 FIND PAYOUT IN DB
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

    console.log("✅ VERIFIED → returning AES key");

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

/* ======================================================
   ✅ OZOW NOTIFY WEBHOOK (UNCHANGED)
====================================================== */

router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW NOTIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const data = req.body;

    const payoutId = data.PayoutId;
    const merchantRef = data.MerchantReference;
    const status = data.PayoutStatus?.Status;
    const subStatus = data.PayoutStatus?.SubStatus;
    const errorMessage = data.PayoutStatus?.ErrorMessage;

    console.log(`📊 STATUS UPDATE: ${payoutId} → status=${status} sub=${subStatus}`);

    // 🔥 STEP 1: Ensure provider_ref exists
    const { data: existing } = await supabase
      .from("payouts")
      .select("id, provider_ref")
      .eq("merchant_ref", merchantRef)
      .maybeSingle();

    if (existing && !existing.provider_ref) {
      console.log("🧩 Linking provider_ref...");
      await supabase
        .from("payouts")
        .update({ provider_ref: payoutId })
        .eq("merchant_ref", merchantRef);
    }

    // 🔥 STEP 2: Build update payload ONCE
    let updateData = {
      provider_ref: payoutId,
      last_error: status === 99 ? errorMessage : null,
    };

    if (status === 1 && subStatus === 201) {
      updateData.status = "COMPLETED";
      updateData.completed_at = new Date().toISOString();
      updateData.last_error = null;
    } else if (status === 99) {
      updateData.status = "FAILED";
    } else {
      updateData.status = "PROCESSING";
    }

    // 🔥 STEP 3: Try update by provider_ref first
    let { data: updated } = await supabase
      .from("payouts")
      .update(updateData)
      .eq("provider_ref", payoutId)
      .select();

    // 🔥 STEP 4: Fallback to merchant_ref
    if (!updated || updated.length === 0) {
      console.log("⚠️ Fallback → merchant_ref");

      await supabase
        .from("payouts")
        .update(updateData)
        .eq("merchant_ref", merchantRef);
    }

    console.log("✅ DB UPDATE COMPLETE");

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ NOTIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;