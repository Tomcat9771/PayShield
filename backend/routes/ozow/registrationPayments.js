import express from "express";
import crypto from "crypto";
import { supabase } from "../../lib/supabaseClient.js";
import { createOzowPayment } from "../../services/ozowService.js";

const router = express.Router();

router.post("/create", async (req, res) => {

  const { business_id } = req.body;

  const { data: feeConfig } = await supabase
    .from("platform_config")
    .select("value")
    .eq("key", "registration_fee")
    .single();

  const feeAmount = Number(feeConfig.value);

  const transactionReference = crypto.randomUUID();

  const bankReference = `PSREG-${Date.now()}`;

  await supabase.from("payments").insert({
    provider: "ozow",
    provider_reference: transactionReference,
    business_id,
    purpose: "registration_fee",
    amount: feeAmount,
    provider_status: "INITIATED",
    processed: false,
  });

  const ozowResponse = await createOzowPayment({
    amount: feeAmount,
    transactionReference,
    bankReference,
    businessId: business_id,
    purpose: "registration_fee",
  });

  res.json({
    paymentUrl: ozowResponse.url,
  });

});

export default router;