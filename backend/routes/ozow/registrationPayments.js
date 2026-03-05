import express from "express";
import crypto from "crypto";
import { supabase } from "../../lib/supabaseClient.js";
import { createOzowPayment } from "../../services/ozowService.js";

const router = express.Router();

/* ================================
   CREATE REGISTRATION PAYMENT
================================ */

router.post("/create-payment", async (req, res) => {

  try {

    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({
        error: "business_id required"
      });
    }

    /* -------------------------
       GET REGISTRATION FEE
    ------------------------- */

    const { data: feeConfig, error: feeError } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "registration_fee")
      .single();

    if (feeError || !feeConfig) {
      return res.status(500).json({
        error: "Registration fee not configured"
      });
    }

    const feeAmount = Number(feeConfig.value);

    /* -------------------------
       CREATE REFERENCES
    ------------------------- */

    const transactionReference = crypto.randomUUID();
    const bankReference = `PSREG-${Date.now()}`;

    /* -------------------------
       CREATE PAYMENT RECORD
    ------------------------- */

    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        provider: "ozow",
        provider_reference: transactionReference,
        business_id,
        purpose: "registration_fee",
        amount: feeAmount,
        provider_status: "INITIATED",
        processed: false
      });

    if (insertError) {

      console.error("Payment insert error:", insertError);

      return res.status(500).json({
        error: "Failed to create payment"
      });

    }

    console.log("Creating registration payment:", {
      business_id,
      feeAmount
    });

    /* -------------------------
       CREATE OZOW PAYMENT
    ------------------------- */

    const ozowResponse = await createOzowPayment({
      amount: feeAmount,
      transactionReference,
      bankReference,
      businessId: business_id,
      purpose: "registration_fee"
    });

    if (!ozowResponse?.url) {
      return res.status(500).json({
        error: "Ozow payment creation failed"
      });
    }

    return res.json({
      paymentUrl: ozowResponse.url
    });

  } catch (err) {

    console.error("Registration payment error:", err);

    return res.status(500).json({
      error: "Registration payment failed"
    });

  }

});

export default router;