import express from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabaseClient.js";
import { createOzowPayment } from "../services/ozowService.js";

const router = express.Router();

/* =========================================================
   GET MERCHANT INFO FROM QR
========================================================= */

router.get("/qr/:qr_code", async (req, res) => {

  try {

    const { qr_code } = req.params;

    /* -------------------------
       FIND QR
    ------------------------- */

    const { data: qr, error: qrError } = await supabase
      .from("qr_codes")
      .select("registration_id, active")
      .eq("code", qr_code)
      .single();

    if (qrError || !qr) {
      return res.status(404).json({
        error: "QR not found"
      });
    }

    if (!qr.active) {
      return res.status(400).json({
        error: "QR inactive"
      });
    }

    /* -------------------------
       FIND REGISTRATION
    ------------------------- */

    const { data: registration, error: regError } = await supabase
      .from("business_registrations")
      .select("business_id")
      .eq("id", qr.registration_id)
      .single();

    if (regError || !registration) {
      return res.status(404).json({
        error: "Registration not found"
      });
    }

    /* -------------------------
       FIND BUSINESS
    ------------------------- */

    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("business_name")
      .eq("id", registration.business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({
        error: "Business not found"
      });
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

/* =========================================================
   QR CUSTOMER PAYMENT
========================================================= */

router.post("/create-payment", async (req, res) => {

  try {

    const { qr_code, amount, reference } = req.body;

    if (!qr_code || !amount) {
      return res.status(400).json({
        error: "qr_code and amount required",
      });
    }

    /* -------------------------
       VALIDATE AMOUNT
    ------------------------- */

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    if (numericAmount < 2) {
      return res.status(400).json({
        error: "Minimum payment is R2",
      });
    }

    if (numericAmount > 500000) {
      return res.status(400).json({
        error: "Maximum payment is R500,000",
      });
    }

    /* -------------------------
       VALIDATE QR FORMAT
    ------------------------- */

    if (!qr_code.startsWith("PSQR-")) {
      return res.status(400).json({
        error: "Invalid QR code",
      });
    }

    /* -------------------------
       GET QR RECORD
    ------------------------- */

    const { data: qr, error: qrError } = await supabase
      .from("qr_codes")
      .select(`
        id,
        code,
        active,
        registration_id,
        business_registrations (
          business_id
        )
      `)
      .eq("code", qr_code)
      .single();

    if (qrError || !qr) {
      return res.status(404).json({
        error: "QR code not found",
      });
    }

    if (!qr.active) {
      return res.status(400).json({
        error: "QR code inactive",
      });
    }

    const business_id =
      qr?.business_registrations?.business_id;

    if (!business_id) {
      return res.status(404).json({
        error: "Merchant not linked to QR"
      });
    }

    /* -------------------------
       VERIFY BUSINESS ACTIVE
    ------------------------- */

    const { data: business } = await supabase
      .from("businesses")
      .select("id, operational_status")
      .eq("id", business_id)
      .single();

    if (!business || business.operational_status !== "active") {
      return res.status(400).json({
        error: "Merchant not active",
      });
    }

    /* -------------------------
       CREATE REFERENCES
    ------------------------- */

    const transactionReference = crypto.randomUUID();

    const bankReference =
      reference?.substring(0, 20) ||
      `PSPAY-${Date.now()}`;

    /* -------------------------
       CREATE PAYMENT RECORD
    ------------------------- */

    const { error: insertError } = await supabase
      .from("payments")
      .insert({
        provider: "ozow",
        provider_reference: transactionReference,
        business_id,
        purpose: "qr_payment",
        amount: numericAmount,
        provider_status: "INITIATED",
        processed: false,
      });

    if (insertError) {

      console.error("Payment insert error:", insertError);

      return res.status(500).json({
        error: "Failed to create payment record",
      });

    }

    console.log("Creating Ozow QR payment:", {
      business_id,
      amount: numericAmount,
      reference: bankReference
    });

    /* -------------------------
       CREATE OZOW PAYMENT
    ------------------------- */

    const ozowResponse = await createOzowPayment({
  amount: numericAmount,
  transactionReference,
  bankReference,
  businessId: business_id,
  purpose: "qr_payment",
});

    if (!ozowResponse?.url) {
      return res.status(500).json({
        error: "Invalid Ozow response",
      });
    }

    return res.json({
      paymentRequestId: ozowResponse.paymentRequestId,
      paymentUrl: ozowResponse.url,
    });

  } catch (err) {

    console.error("Ozow QR payment error:", err);

    return res.status(500).json({
      error: "QR payment failed",
    });

  }

});

export default router;