import express from "express";
import crypto from "crypto";
import { supabase } from "../../lib/supabaseClient.js";
import { createOzowPayment } from "../../services/ozowService.js";

const router = express.Router();

/* ===============================
   QR MERCHANT LOOKUP
=============================== */

router.get("/:qr_code", async (req, res) => {

  try {

    const { qr_code } = req.params;

    const { data: qr, error: qrError } = await supabase
      .from("qr_codes")
      .select(`id, active, registration_id`)
      .eq("code", qr_code)
      .single();

    if (qrError || !qr) {
      return res.status(404).json({ error: "QR not found" });
    }

    if (!qr.active) {
      return res.status(400).json({ error: "QR inactive" });
    }

    const { data: registration } = await supabase
      .from("business_registrations")
      .select("business_id")
      .eq("id", qr.registration_id)
      .single();

    const { data: business } = await supabase
      .from("businesses")
      .select("business_name")
      .eq("id", registration.business_id)
      .single();

    return res.json({
      merchant: business.business_name
    });

  } catch (err) {

    console.error("QR lookup error:", err);

    return res.status(500).json({
      error: "QR lookup failed"
    });

  }

});

/* ===============================
   CREATE QR PAYMENT
=============================== */

router.post("/create", async (req, res) => {

  try {

    const { qr_code, amount, reference } = req.body;

    const numericAmount = Number(amount);

    if (!qr_code || isNaN(numericAmount)) {
      return res.status(400).json({
        error: "Invalid request"
      });
    }

    if (numericAmount < 2) {
      return res.status(400).json({
        error: "Minimum payment is R2"
      });
    }

    if (numericAmount > 500000) {
      return res.status(400).json({
        error: "Maximum payment is R500,000"
      });
    }

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

    if (!qr || !qr.active) {
      return res.status(404).json({
        error: "QR not valid"
      });
    }

    const business_id =
      qr.business_registrations.business_id;

    const transactionReference = crypto.randomUUID();

    const bankReference =
      reference?.substring(0, 20) ||
      `PSPAY-${Date.now()}`;

    await supabase.from("payments").insert({
      provider: "ozow",
      provider_reference: transactionReference,
      business_id,
      purpose: "qr_payment",
      amount: numericAmount,
      provider_status: "INITIATED",
      processed: false
    });

    const ozowResponse = await createOzowPayment({
      amount: numericAmount,
      transactionReference,
      bankReference,
      businessId: business_id,
      purpose: "qr_payment"
    });

    return res.json({
      paymentUrl: ozowResponse.url
    });

  } catch (err) {

    console.error("QR payment error:", err);

    return res.status(500).json({
      error: "QR payment failed"
    });

  }

});

export default router;

