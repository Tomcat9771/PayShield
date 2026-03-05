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
      .select("id, active, registration_id")
      .eq("code", qr_code)
      .single();

    if (qrError || !qr) {
      return res.status(404).json({ error: "QR not found" });
    }

    if (!qr.active) {
      return res.status(400).json({ error: "QR inactive" });
    }

    const { data: registration, error: regError } = await supabase
      .from("business_registrations")
      .select("business_id")
      .eq("id", qr.registration_id)
      .single();

    if (regError || !registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("business_name")
      .eq("id", registration.business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: "Business not found" });
    }

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

    if (!qr_code || isNaN(numericAmount) || !reference) {
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

    /* -------------------------
       GET QR RECORD
    ------------------------- */

    const { data: qr, error: qrError } = await supabase
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

    if (qrError || !qr || !qr.active) {
      return res.status(404).json({
        error: "QR not valid"
      });
    }

    const business_id = qr?.business_registrations?.business_id;

    if (!business_id) {
      return res.status(400).json({
        error: "QR not linked to a business"
      });
    }

    /* -------------------------
       CREATE REFERENCES
    ------------------------- */

    const transactionReference = crypto.randomUUID();

    const customerReference = reference || null;

    const bankReference =
      reference?.substring(0, 20) ||
      `PSPAY-${Date.now()}`;

    console.log("Creating QR payment:", {
      business_id,
      amount: numericAmount,
      customer_reference: customerReference
    });

    /* -------------------------
       CREATE PAYMENT RECORD
    ------------------------- */

    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        provider: "ozow",
        provider_reference: transactionReference,
        customer_reference: customerReference,
        business_id,
        purpose: "qr_payment",
        amount: numericAmount,
        provider_status: "INITIATED",
        processed: false
      });

    if (insertError) {
      console.error("Payment insert error:", insertError);

      return res.status(500).json({
        error: "Failed to create payment"
      });
    }

    /* -------------------------
       CREATE OZOW PAYMENT
    ------------------------- */

    const ozowResponse = await createOzowPayment({
      amount: numericAmount,
      transactionReference,
      bankReference,
      businessId: business_id,
      purpose: "qr_payment"
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

    console.error("QR payment error:", err);

    return res.status(500).json({
      error: "QR payment failed"
    });

  }

});
/* ===============================
   GET PAYMENT BY OZOW TRANSACTION
=============================== */

router.get("/payment/:transactionId", async (req, res) => {

  try {

    const { transactionId } = req.params;

    const { data, error } = await supabase
      .from("payments")
      .select("customer_reference")
      .eq("ozow_transaction_id", transactionId)
      .single();

    if (error || !data) {
      return res.status(404).json({
        error: "Payment not found"
      });
    }

    return res.json(data);

  } catch (err) {

    console.error("Payment lookup error:", err);

    return res.status(500).json({
      error: "Failed to load payment"
    });

  }

});

export default router;

