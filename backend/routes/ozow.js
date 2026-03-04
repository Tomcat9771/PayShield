import express from "express";
import crypto from "crypto";
import { supabase } from "../lib/supabaseClient.js";
import { createOzowPayment } from "../services/ozowService.js";

const router = express.Router();

/* =========================================================
   QR LOOKUP (GET MERCHANT INFO)
========================================================= */

router.get("/qr/:qr_code", async (req, res) => {

  try {

    const { qr_code } = req.params;

    if (!qr_code.startsWith("PSQR-")) {
      return res.status(400).json({
        error: "Invalid QR code",
      });
    }

    const { data: qr, error } = await supabase
      .from("qr_codes")
      .select(`
        code,
        active,
        business_registrations (
          business_id,
          businesses (
            business_name
          )
        )
      `)
      .eq("code", qr_code)
      .single();

    if (error || !qr) {
      return res.status(404).json({
        error: "QR not found",
      });
    }

    if (!qr.active) {
      return res.status(400).json({
        error: "QR inactive",
      });
    }

    const businessName =
      qr.business_registrations.businesses.business_name;

    return res.json({
      merchant: businessName,
    });

  } catch (err) {

    console.error("QR lookup error:", err);

    return res.status(500).json({
      error: "QR lookup failed",
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

    const business_id = qr.business_registrations.business_id;

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