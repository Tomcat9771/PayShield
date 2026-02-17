import express from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabaseClient.js";
import { calculateFees } from "../services/feeCalculator.js";

const router = express.Router();

/**
 * IMPORTANT:
 * Make sure in your main app.js you have:
 * app.use("/api/ozow", express.raw({ type: "*/*" }));
 */

router.post("/webhook", async (req, res) => {
  try {
    const rawBody = req.body?.toString("utf8");

    if (!rawBody) {
      return res.status(400).send("Invalid body");
    }

    const payload = JSON.parse(rawBody);

    // Normalize fields (handle casing differences safely)
    const siteCode = payload.SiteCode || payload.siteCode;
    const transactionId = payload.TransactionId || payload.transactionId;
    const transactionReference =
      payload.TransactionReference || payload.transactionReference;
    const bankReference =
      payload.BankReference || payload.bankReference;
    const status = payload.Status || payload.status;
    const hashCheck = payload.HashCheck || payload.hashCheck;
    const amount = payload.Amount || payload.amount;

    // 1️⃣ Log webhook immediately
    await supabase.from("webhook_logs").insert({
      provider: "ozow",
      payload,
    });

    // 2️⃣ Verify Hash
    const hashString = (
      siteCode +
      transactionId +
      transactionReference +
      bankReference +
      status +
      process.env.OZOW_PRIVATE_KEY
    ).toLowerCase();

    const calculatedHash = crypto
      .createHash("sha512")
      .update(hashString)
      .digest("hex")
      .toLowerCase();

    if (!hashCheck || calculatedHash !== hashCheck.toLowerCase()) {
      console.error("❌ OZOW HASH MISMATCH");
      return res.status(400).send("Invalid hash");
    }

    // 3️⃣ Only process successful payments
    if (status !== "Complete" && status !== "COMPLETE") {
      return res.status(200).send("Ignored");
    }

    if (!transactionReference || !transactionId) {
      console.error("Missing required Ozow fields");
      return res.status(200).send("OK");
    }

    const businessId = transactionReference;
    const gross = Number(amount);

    if (isNaN(gross)) {
      console.error("Invalid amount from Ozow");
      return res.status(200).send("OK");
    }

    // 4️⃣ Calculate fees
    const fee = await calculateFees(gross, businessId);

    // 5️⃣ Atomic DB write
    const { error: rpcError } = await supabase.rpc(
      "process_ozow_payment",
      {
        p_business_id: businessId,
        p_provider_ref: transactionId,
        p_amount_gross: fee.amount_gross,
        p_ozow_fee: fee.ozow_fee,
        p_ozow_vat: fee.ozow_vat,
        p_platform_fee: fee.platform_fee,
        p_platform_vat: fee.platform_vat,
        p_payout_fee: fee.payout_fee,
        p_amount_net: fee.amount_net,
      }
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
    }

    return res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("OK");
  }
});

export default router;
