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
    console.log("Payload:", payload);

    // Always log webhook (never block processing)
    try {
  await supabase.from("webhook_logs").insert({
    provider: "ozow",
    payload,
  });
} catch (e) {
  console.error("Webhook log failed:", e.message);
}
    /* ======================================
       HASH VALIDATION (OFFICIAL OZOW ORDER)
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
       STATUS NORMALISATION
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

    const businessId = TransactionReference;
    const gross = Number(Amount);

    if (!businessId || !TransactionId || isNaN(gross)) {
      console.error("Invalid required fields");
      return res.status(200).send("Ignored");
    }

    /* ======================================
       FETCH EXISTING TRANSACTION
    ====================================== */

    const { data: existing } = await supabase
      .from("transactions")
      .select("*")
      .eq("provider_ref", TransactionId)
      .maybeSingle();

    /* ======================================
       CASE 1 — FIRST TIME WE SEE THIS TX
    ====================================== */

    if (!existing) {
      // If not complete yet → insert status only
      if (internalStatus !== "COMPLETE") {
        await supabase.from("transactions").insert({
          business_id: businessId,
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

        console.log("🟡 Inserted initial non-complete status");
        return res.status(200).send("Status recorded");
      }

      // If COMPLETE on first notification → process fully
      const fee = await calculateFees(gross, businessId);

      const { error } = await supabase.rpc(
        "process_ozow_payment",
        {
          p_business_id: businessId,
          p_provider_ref: TransactionId,
          p_amount_gross: fee.amount_gross,
          p_ozow_fee: fee.ozow_fee,
          p_ozow_vat: fee.ozow_vat,
          p_platform_fee: fee.platform_fee,
          p_platform_vat: fee.platform_vat,
          p_payout_fee: fee.payout_fee,
          p_amount_net: fee.amount_net,
        }
      );

      if (error) console.error("RPC error:", error);
      else console.log("🟢 COMPLETE processed + ledger credited");

      return res.status(200).send("Completed");
    }

    /* ======================================
       CASE 2 — DUPLICATE COMPLETE
    ====================================== */

    if (existing.status === "COMPLETE") {
      console.log("🔒 Already COMPLETE. Ignoring downgrade or duplicate.");
      return res.status(200).send("Already complete");
    }

    /* ======================================
       CASE 3 — TRANSITION TO COMPLETE
    ====================================== */

    if (internalStatus === "COMPLETE") {
      const fee = await calculateFees(gross, businessId);

      const { error } = await supabase.rpc(
        "process_ozow_payment",
        {
          p_business_id: businessId,
          p_provider_ref: TransactionId,
          p_amount_gross: fee.amount_gross,
          p_ozow_fee: fee.ozow_fee,
          p_ozow_vat: fee.ozow_vat,
          p_platform_fee: fee.platform_fee,
          p_platform_vat: fee.platform_vat,
          p_payout_fee: fee.payout_fee,
          p_amount_net: fee.amount_net,
        }
      );

      if (error) console.error("RPC error:", error);
      else console.log("🟢 Transitioned to COMPLETE + ledger credited");

      return res.status(200).send("Completed");
    }

    /* ======================================
       CASE 4 — STATUS UPDATE ONLY
    ====================================== */
if (existing.status !== internalStatus) {
  await supabase
    .from("transactions")
    .update({ status: internalStatus })
    .eq("provider_ref", TransactionId);

  console.log("🔄 Status updated to:", internalStatus);
}
     return res.status(200).send("Status updated");

  } catch (err) {
    console.error("❌ Webhook error:", err);
    return res.status(200).send("OK");
  }
});

export default router;
