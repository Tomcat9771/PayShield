import express from "express";
import crypto from "crypto";
import { supabase } from "../../lib/supabaseClient.js";
import { createOzowPayment } from "../../services/ozowService.js";

const router = express.Router();

/* ===============================
   CREATE QR PAYMENT
=============================== */

router.post("/create", async (req, res) => {

  const { qr_code, amount, reference } = req.body;

  const numericAmount = Number(amount);

  if (!qr_code || isNaN(numericAmount)) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const transactionReference = crypto.randomUUID();

  const bankReference =
    reference?.substring(0, 20) ||
    `PSPAY-${Date.now()}`;

  const { data: qr } = await supabase
    .from("qr_codes")
    .select(`
      id,
      active,
      business_registrations (
        business_id
      )
    `)
    .eq("code", qr_code)
    .single();

  const business_id =
    qr?.business_registrations?.business_id;

  await supabase.from("payments").insert({
    provider: "ozow",
    provider_reference: transactionReference,
    business_id,
    purpose: "qr_payment",
    amount: numericAmount,
    provider_status: "INITIATED",
    processed: false,
  });

  const ozowResponse = await createOzowPayment({
    amount: numericAmount,
    transactionReference,
    bankReference,
    businessId: business_id,
    purpose: "qr_payment",
  });

  res.json({
    paymentUrl: ozowResponse.url,
  });

});

export default router;