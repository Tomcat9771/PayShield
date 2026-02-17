import express from "express";
import { createOzowPayment } from "../services/ozowService.js";

const router = express.Router();

/**
 * POST /api/ozow/create
 * Creates Ozow payment request
 * Does NOT create transaction in DB
 * Webhook will handle transaction + ledger atomically
 */
router.post("/create", async (req, res) => {
  try {
    const { business_id, amount } = req.body;

    if (!business_id || !amount) {
      return res.status(400).json({
        error: "business_id and amount are required",
      });
    }

    const numericAmount = Number(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        error: "Invalid amount",
      });
    }

    // 🔑 IMPORTANT:
    // transactionReference MUST equal business_id
    const transactionReference = business_id;

    // bankReference can be anything meaningful
    const bankReference = `PS-${business_id.slice(0, 12)}`;


    const ozowResponse = await createOzowPayment({
      amount: numericAmount,
      transactionReference,
      bankReference,
      customer: business_id,
    });

    return res.json({
      paymentRequestId: ozowResponse.paymentRequestId,
      paymentUrl: ozowResponse.url,
    });

  } catch (err) {
    console.error("Ozow create error:", err.message);
    return res.status(500).json({
      error: err.message || "Ozow payment creation failed",
    });
  }
});

export default router;
