import express from "express";
import crypto from "crypto";
import { supabase } from "../../lib/supabaseClient.js";
import { calculateFees } from "../../services/feeCalculator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const rawBody = req.rawBody;

    if (!rawBody) {
      console.error("❌ Missing raw body");
      return res.status(400).send("Invalid body");
    }

    const payload = req.body;

    console.log("---- OZOW WEBHOOK RECEIVED ----");

    /* ======================================
       SAFE WEBHOOK LOG
    ====================================== */
    try {
      await supabase.from("webhook_logs").insert({
        provider: "ozow",
        payload,
      });
    } catch (e) {
      console.error("Webhook log failed:", e.message);
    }

    /* ======================================
       HASH VALIDATION
    ====================================== */

    const {
      SiteCode = "",
      TransactionId = "",
      TransactionReference = "",
      Amount = "",
      Status = "",
      Optional1 = "",
      Optional2 = "",
      Optional3 = "",
      Optional4 = "",
      Optional5 = "",
      CurrencyCode = "",
      IsTest = "",
      StatusMessage = "",
      Hash = "",
    } = payload;

    const hashString = (
      SiteCode +
      TransactionId +
      TransactionReference +
      Amount +
      Status +
      Optional1 +
      Optional2 +
      Optional3 +
      Optional4 +
      Optional5 +
      CurrencyCode +
      IsTest +
      StatusMessage +
      process.env.OZOW_PRIVATE_KEY
    ).toLowerCase();

    const calculatedHash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex")
      .replace(/^0+/, "");

    const receivedHash = Hash.toLowerCase().replace(/^0+/, "");

    if (calculatedHash !== receivedHash) {
      console.error("❌ HASH MISMATCH");
      return res.status(400).send("Invalid hash");
    }

    console.log("✅ Hash verified");

    /* ======================================
       BASIC VALIDATION
    ====================================== */

    if (CurrencyCode !== "ZAR") {
      console.error("Invalid currency");
      return res.status(400).send("Invalid currency");
    }

    const referenceId = TransactionReference;
    const gross = Number(Amount);
    const purpose = Optional1 || "qr_payment";

    if (!referenceId || !TransactionId || isNaN(gross)) {
      console.error("Invalid required fields");
      return res.status(200).send("Ignored");
    }

    /* ======================================
       NORMALISE STATUS
    ====================================== */

    let internalStatus;

    switch (Status?.toUpperCase()) {
      case "COMPLETE":
        internalStatus = "COMPLETE";
        break;
      case "PENDING":
      case "PENDINGINVESTIGATION":
        internalStatus = "PENDING";
        break;
      case "CANCELLED":
      case "ERROR":
      case "ABANDONED":
        internalStatus = "FAILED";
        break;
      default:
        internalStatus = "FAILED";
    }

    /* ======================================
       INSERT INTO PAYMENTS (IDEMPOTENT)
    ====================================== */

    const { data: paymentRow, error: paymentInsertError } =
      await supabase
        .from("payments")
        .insert({
          provider: "ozow",
          provider_reference: TransactionId,
          business_id: referenceId,
          purpose,
          amount: gross,
          provider_status: internalStatus,
          raw_payload: payload,
          processed: false,
        })
        .select()
        .single();

    if (paymentInsertError) {
      if (paymentInsertError.code === "23505") {
        console.log("🔒 Payment already processed");
        return res.status(200).send("Already processed");
      }

      console.error("Payment insert error:", paymentInsertError);
      return res.status(500).send("Insert failed");
    }

/* ======================================
   REGISTRATION FEE HANDLING
====================================== */

if (purpose === "registration_fee") {

  const { data: feeConfig, error: feeError } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "registration_fee")
    .single();

  if (feeError || !feeConfig) {
    console.error("Registration fee config missing");
    return res.status(500).send("Fee config error");
  }

  const expectedFee = Number(feeConfig.value);

  if (Math.round(gross * 100) !== Math.round(expectedFee * 100)) {
    console.error("Invalid registration fee amount");
    return res.status(400).send("Invalid amount");
  }

  if (internalStatus === "COMPLETE") {

    console.log("🔄 Processing registration completion...");

    const { error: rpcError } = await supabase.rpc(
      "complete_registration_payment",
      {
        p_business_id: referenceId,
        p_transaction_id: TransactionId,
        p_amount: gross,
      }
    );

    if (rpcError) {
      console.error("❌ Activation RPC failed:", rpcError.message);
      return res.status(500).send("Activation failed");
    }

    console.log("🟢 Registration completed & business activated safely");
  }

} else {

  /* ======================================
     QR PAYMENT LOGIC
  ====================================== */

  const { data: existing } = await supabase
    .from("transactions")
    .select("*")
    .eq("provider_ref", TransactionId)
    .maybeSingle();

  if (!existing) {

    if (internalStatus !== "COMPLETE") {

      await supabase.from("transactions").insert({
        business_id: referenceId,
        provider_ref: TransactionId,
        provider: "ozow",
        status: internalStatus,
        amount_gross: gross,
        amount_net: 0,
        ozow_fee: 0,
        ozow_vat: 0,
        platform_fee: 0,
        platform_vat: 0,
        payout_fee: 0,
      });

    } else {

      const fee = await calculateFees(gross, referenceId);

      await supabase.rpc("process_ozow_payment", {
        p_business_id: referenceId,
        p_provider_ref: TransactionId,
        p_amount_gross: fee.amount_gross,
        p_ozow_fee: fee.ozow_fee,
        p_ozow_vat: fee.ozow_vat,
        p_platform_fee: fee.platform_fee,
        p_platform_vat: fee.platform_vat,
        p_payout_fee: fee.payout_fee,
        p_amount_net: fee.amount_net,
      });
    }

  } else if (
    existing.status !== "COMPLETE" &&
    internalStatus === "COMPLETE"
  ) {

    const fee = await calculateFees(gross, referenceId);

    await supabase.rpc("process_ozow_payment", {
      p_business_id: referenceId,
      p_provider_ref: TransactionId,
      p_amount_gross: fee.amount_gross,
      p_ozow_fee: fee.ozow_fee,
      p_ozow_vat: fee.ozow_vat,
      p_platform_fee: fee.platform_fee,
      p_platform_vat: fee.platform_vat,
      p_payout_fee: fee.payout_fee,
      p_amount_net: fee.amount_net,
    });

  } else if (existing.status !== internalStatus) {

    await supabase
      .from("transactions")
      .update({ status: internalStatus })
      .eq("provider_ref", TransactionId);
  }
}

    /* ======================================
       MARK PAYMENT PROCESSED
    ====================================== */

    await supabase
      .from("payments")
      .update({
        processed: true,
        processed_at: new Date(),
      })
      .eq("id", paymentRow.id);

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(200).send("OK");
  }
});

export default router;