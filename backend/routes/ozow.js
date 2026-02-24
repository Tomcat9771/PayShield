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

    // ✅ Ensure business exists
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id")
      .eq("id", business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        error: "Business not found",
      });
    }

    // ✅ Get registration fee
    const { data: feeConfig, error: feeError } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", "registration_fee")
      .single();

    if (feeError || !feeConfig) {
      console.error("Fee config error:", feeError);
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

    // ✅ Create payment intent record
    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        provider: "ozow",
        provider_reference: `INIT-${business_id}-${Date.now()}`,
        business_id,
        purpose: "registration_fee",
        amount: registrationFee,
        provider_status: "INITIATED",
        processed: false,
      });

    if (insertError) {
      console.error("Payment insert error:", insertError);
      return res.status(500).json({
        error: "Failed to create payment record",
      });
    }

    // 🔐 Ozow requirements
    const transactionReference = business_id; // MUST equal business_id
    const bankReference = `PS-REG-${business_id.slice(0, 8)}`;

    // ✅ Create Ozow payment
    const ozowResponse = await createOzowPayment({
      amount: registrationFee,
      transactionReference,
      bankReference,
    });

    if (!ozowResponse?.url) {
      console.error("Invalid Ozow response:", ozowResponse);
      return res.status(500).json({
        error: "Invalid Ozow response",
      });
    }

    return res.json({
      paymentRequestId: ozowResponse.paymentRequestId,
      paymentUrl: ozowResponse.url,
    });

  } catch (err) {
    console.error("Ozow registration create error FULL:", err);
    return res.status(500).json({
      error: err.message || "Ozow payment creation failed",
    });
  }
});

export default router;
