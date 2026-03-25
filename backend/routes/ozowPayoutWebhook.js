import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 🔥 Helper to send EXACT Ozow-compliant response
function sendOzowResponse(res, payload) {
  return res
    .status(200)
    .set("Content-Type", "application/json")
    .send(JSON.stringify(payload));
}

/* ======================================================
   🔐 OZOW VERIFY WEBHOOK (FINAL WORKING VERSION)
====================================================== */
router.post("/verify", async (req, res) => {
  console.log("🔐 OZOW VERIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const accessToken = req.headers.accesstoken;

    if (accessToken !== process.env.OZOW_ACCESS_TOKEN) {
      return sendOzowResponse(res, {
        PayoutId: req.body?.payoutId,
        IsVerified: false,
        Reason: "Invalid AccessToken",
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

    if (
      !payoutId ||
      !siteCode ||
      !bankingDetails ||
      !bankingDetails.accountNumber ||
      !bankingDetails.branchCode
    ) {
      return sendOzowResponse(res, {
        PayoutId: payoutId,
        IsVerified: false,
        Reason: "Invalid request payload",
      });
    }

    const apiKey = process.env.OZOW_PAYOUT_API_KEY;

    const inputString =
      payoutId +
      siteCode +
      Math.floor(amount * 100) +
      merchantReference +
      (customerBankReference || "") +
      String(isRtc).toLowerCase() +
      (notifyUrl || "") +
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
      console.log("Expected:", calculatedHash);
      console.log("Received:", hashCheck);

      return sendOzowResponse(res, {
        PayoutId: payoutId,
        IsVerified: false,
        Reason: "Invalid hash",
      });
    }

    const { data: payout, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("merchant_ref", merchantReference)
      .single();

    if (error || !payout) {
      return sendOzowResponse(res, {
        PayoutId: payoutId,
        IsVerified: false,
        Reason: "Payout not found",
      });
    }

    if (!payout.encryption_key) {
      return sendOzowResponse(res, {
        PayoutId: payoutId,
        IsVerified: false,
        Reason: "Missing encryption key",
      });
    }

    console.log("✅ VERIFIED SUCCESS");
    console.log("🔑 KEY:", payout.encryption_key);

    return sendOzowResponse(res, {
      PayoutId: payoutId,
      IsVerified: true,
      AccountNumberDecryptionKey: payout.encryption_key,
      Reason: "",
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);

    return sendOzowResponse(res, {
      PayoutId: req.body?.payoutId,
      IsVerified: false,
      Reason: "Server error",
    });
  }
});

/* ======================================================
   ✅ OZOW NOTIFY WEBHOOK
====================================================== */

router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW NOTIFY WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const data = req.body;

    const PayoutId = data.PayoutId;
    const merchantRef = data.MerchantReference;
    const status = data.PayoutStatus?.Status;
    const subStatus = data.PayoutStatus?.SubStatus;
    const errorMessage = data.PayoutStatus?.ErrorMessage;

    console.log(`📊 STATUS UPDATE: ${PayoutId} → status=${status} sub=${subStatus}`);

    const { data: existing } = await supabase
      .from("payouts")
      .select("id, provider_ref")
      .eq("merchant_ref", merchantRef)
      .maybeSingle();

    if (existing && !existing.provider_ref) {
      await supabase
        .from("payouts")
        .update({ provider_ref: PayoutId })
        .eq("merchant_ref", merchantRef);
    }

    let updateData = {
      provider_ref: PayoutId,
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

    let { data: updated } = await supabase
      .from("payouts")
      .update(updateData)
      .eq("provider_ref", PayoutId)
      .select();

    if (!updated || updated.length === 0) {
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

/* ======================================================
   🔁 OZOW COMPATIBILITY ROUTE
====================================================== */
router.post("/payout-verify", async (req, res) => {
  req.url = "/verify";
  return router.handle(req, res);
});

export default router;
