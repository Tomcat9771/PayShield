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
        payload
      });
    } catch (e) {
      console.error("Webhook log failed:", e.message);
    }

    /* ======================================
       EXTRACT PAYLOAD
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

    console.log("Webhook Status:", Status);
    console.log("Webhook TransactionReference:", TransactionReference);
    console.log("Webhook TransactionId:", TransactionId);
    console.log("Webhook Amount:", Amount);

    /* ======================================
       HASH VALIDATION
    ====================================== */

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

    const paymentReference = TransactionReference;
    const gross = Number(Amount);

    if (!paymentReference || !TransactionId || isNaN(gross)) {
      console.error("Invalid required fields");
      return res.status(200).send("Ignored");
    }

    /* ======================================
       NORMALISE STATUS
    ====================================== */

    let internalStatus = "FAILED";

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

    }

    console.log("Internal Status:", internalStatus);

    /* ======================================
       FIND EXISTING PAYMENT
    ====================================== */

    const { data: paymentRow, error: paymentFetchError } =
      await supabase
        .from("payments")
        .select("*")
        .eq("provider_reference", paymentReference)
        .single();

    if (paymentFetchError || !paymentRow) {

      console.error("Payment not found for reference:", paymentReference);

      return res.status(200).send("Payment not found");
    }

    /* ======================================
       IDEMPOTENCY CHECK
    ====================================== */

    if (paymentRow.processed) {

      console.log("🔒 Payment already processed");

      return res.status(200).send("Already processed");
    }

    /* ======================================
       VERIFY AMOUNT MATCHES
    ====================================== */

    if (Number(paymentRow.amount).toFixed(2) !== gross.toFixed(2)) {

      console.error("Amount mismatch", paymentRow.amount, gross);

      return res.status(400).send("Amount mismatch");
    }

    /* ======================================
       UPDATE PAYMENT STATUS
    ====================================== */

    await supabase
      .from("payments")
      .update({
        provider_status: internalStatus,
        ozow_transaction_id: TransactionId,
        ozow_status_message: StatusMessage,
        raw_payload: payload
      })
      .eq("id", paymentRow.id);

    const businessId = paymentRow.business_id;
    const purpose = paymentRow.purpose;

    /* ======================================
       REGISTRATION FEE LOGIC
    ====================================== */

    if (purpose === "registration_fee") {

      console.log("Registration fee payment detected");

      if (internalStatus === "COMPLETE") {

        const { error } = await supabase.rpc(
          "complete_registration_payment",
          {
            p_business_id: businessId,
            p_transaction_id: TransactionId,
            p_amount: gross
          }
        );

        if (error) {
          console.error("Activation RPC failed:", error.message);
        }

        console.log("🟢 Registration activated");
      }

    }

    /* ======================================
       QR PAYMENT LOGIC
    ====================================== */

    if (purpose === "qr_payment") {

      console.log("QR payment branch triggered");

      const { data: existing } = await supabase
        .from("transactions")
        .select("*")
        .eq("provider_ref", TransactionId)
        .maybeSingle();

      if (!existing && internalStatus === "COMPLETE") {

        const fee = await calculateFees(gross, businessId);

        await supabase.rpc("process_ozow_payment", {

          p_business_id: businessId,
          p_provider_ref: TransactionId,

          p_amount_gross: fee.amount_gross,
          p_ozow_fee: fee.ozow_fee,
          p_ozow_vat: fee.ozow_vat,

          p_platform_fee: fee.platform_fee,
          p_platform_vat: fee.platform_vat,

          p_payout_fee: fee.payout_fee,
          p_amount_net: fee.amount_net

        });

      }

    }

    /* ======================================
       MARK PAYMENT PROCESSED
    ====================================== */

    await supabase
      .from("payments")
      .update({
        processed: true,
        processed_at: new Date()
      })
      .eq("id", paymentRow.id);

    console.log("✅ Payment processed successfully");

    return res.status(200).send("OK");

  } catch (err) {

    console.error("❌ Webhook error:", err.message);

    return res.status(200).send("OK");

  }

});

export default router;