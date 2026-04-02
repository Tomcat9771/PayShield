import express from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sendOzowResponse(res, payload) {
  return res
    .status(200)
    .set("Content-Type", "application/json")
    .send(JSON.stringify(payload));
}

router.post("/verify", async (req, res) => {
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

router.post("/notify", async (req, res) => {
  try {
    const data = req.body;

    const PayoutId = data.PayoutId;
    const merchantRef = data.MerchantReference;
    const status = data.PayoutStatus?.Status;
    const subStatus = data.PayoutStatus?.SubStatus;
    const errorMessage = data.PayoutStatus?.ErrorMessage;

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

    const payoutStatus =
      status === 1 && subStatus === 201
        ? "COMPLETED"
        : status === 99
        ? "FAILED"
        : "PROCESSING";

    let updateData = {
      provider_ref: PayoutId,
      last_error: status === 99 ? errorMessage : null,
      status: payoutStatus,
    };

    if (payoutStatus === "COMPLETED") {
      updateData.completed_at = new Date().toISOString();
    }

    let { data: updated } = await supabase
      .from("payouts")
      .update(updateData)
      .eq("provider_ref", PayoutId)
      .select("id");

    if (!updated || updated.length === 0) {
      const fallback = await supabase
        .from("payouts")
        .update(updateData)
        .eq("merchant_ref", merchantRef)
        .select("id");

      updated = fallback.data;
    }

    const payoutId = updated?.[0]?.id;

    if (payoutId) {
      const transactionStatus =
        payoutStatus === "COMPLETED"
          ? "PAID_OUT"
          : payoutStatus === "FAILED"
          ? "FAILED"
          : "PROCESSING";

      const { data: attempts } = await supabase
        .from("transactions")
        .select("id")
        .eq("payout_id", payoutId)
        .eq("provider_ref", PayoutId)
        .limit(1);

      const matchingAttemptId = attempts?.[0]?.id;

      if (matchingAttemptId) {
        await supabase
          .from("transactions")
          .update({
            status: transactionStatus,
            provider_ref: PayoutId,
          })
          .eq("id", matchingAttemptId);
      } else {
        await supabase
          .from("transactions")
          .update({
            status: transactionStatus,
            provider_ref: PayoutId,
          })
          .eq("payout_id", payoutId)
          .is("provider_ref", null)
          .in("status", ["PROCESSING", "PENDING"]);
      }
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("❌ NOTIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});

router.post("/payout-verify", async (req, res) => {
  req.url = "/verify";
  return router.handle(req, res);
});

export default router;
