import express from "express";
import { supabase } from "../lib/supabaseClient.js";
import { createOzowPayment } from "../services/ozowService.js";

const router = express.Router();

/**
 * POST /api/ozow/create-registration
 * Creates Ozow payment request for registration fee
 */
router.post("/create-registration", async (req, res) => {
  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({
        error: "business_id is required",
      });
    }

    // 1️⃣ Get registration fee from config
    const { data: feeConfig, error: feeError } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "registration_fee")
      .single();

    if (feeError || !feeConfig) {
      return res.status(500).json({
        error: "Registration fee not configured",
      });
    }

    const registrationFee = Number(feeConfig.value);

    if (isNaN(registrationFee) || registrationFee <= 0) {
      return res.status(500).json({
        error: "Invalid registration fee configuration",
      });
    }

    // 2️⃣ Create payment intent row
    await supabase.from("payments").insert({
      provider: "ozow",
      provider_reference: `INIT-${business_id}-${Date.now()}`,
      business_id,
      purpose: "registration_fee",
      amount: registrationFee,
      provider_status: "INITIATED",
      processed: false,
    });

    // 3️⃣ transactionReference MUST equal business_id
    const transactionReference = business_id;

    const bankReference = `PS-REG-${business_id.slice(0, 8)}`;

    // 4️⃣ Create Ozow payment
    const ozowResponse = await createOzowPayment({
      amount: registrationFee,
      transactionReference,
      bankReference,
      customer: business_id,
      optional1: "registration_fee", // 🔥 important for webhook
    });

    return res.json({
      paymentRequestId: ozowResponse.paymentRequestId,
      paymentUrl: ozowResponse.url,
    });

  } catch (err) {
    console.error("Ozow registration create error:", err.message);
    return res.status(500).json({
      error: err.message || "Ozow payment creation failed",
    });
  }
});

export default router;

