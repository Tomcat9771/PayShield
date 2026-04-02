// backend/routes/ozowTestRunner.js

import express from "express";
import axios from "axios";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateOzowHash } from "../utils/ozowHash.js";
import { encryptAccountNumber } from "../utils/ozowEncrypt.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OZOW_API = "https://stagingpayoutsapi.ozow.com/v1";

/* ======================================================
   ✅ SUCCESS TEST (WITH VERIFY 🔥)
====================================================== */
router.post("/test-success", async (req, res) => {
  try {
    const siteCode = process.env.OZOW_PAYOUT_SITE_CODE;
    const apiKey = process.env.OZOW_PAYOUT_API_KEY;
    const notifyUrl = process.env.OZOW_PAYOUT_NOTIFY_URL;

    const merchantReference = `test-${Date.now()}`;
    const encryptionKey = crypto.randomBytes(16).toString("hex");

    // 🔥 INSERT INTO DB FIRST
    const { data, error } = await supabase
      .from("payouts")
      .insert({
        id: crypto.randomUUID(),
        merchant_ref: merchantReference,
        provider_ref: null,
        encryption_key: encryptionKey,
        status: "PROCESSING",
        total_amount: 10,
        payout_method: "bank",
      })
      .select();

    console.log("🧪 SUCCESS INSERT:", data, error);

    const encryptedAccount = encryptAccountNumber(
      "4050338500",
      encryptionKey,
      merchantReference,
      10
    );

    const payload = {
      SiteCode: siteCode,
      amount: 10,
      merchantReference,
      customerBankReference: "Test",
      isRtc: false,
      NotifyUrl: notifyUrl,
      bankingDetails: {
        bankGroupId: "3284a0ad-ba78-4838-8c2b-102981286a2b",
        accountNumber: encryptedAccount,
        branchCode: "632005",
      },
    };

    const hashCheck = generateOzowHash({
      siteCode,
      amount: payload.amount,
      merchantReference,
      customerBankReference: payload.customerBankReference,
      isRtc: payload.isRtc,
      notifyUrl: payload.NotifyUrl,
      bankGroupId: payload.bankingDetails.bankGroupId,
      accountNumber: payload.bankingDetails.accountNumber,
      branchCode: payload.bankingDetails.branchCode,
      ApiKey: apiKey,
    });

    // 🔥 REQUEST PAYOUT ONLY (NO VERIFY CALL)
    const response = await axios.post(
      `${OZOW_API}/requestpayout`,
      { ...payload, hashCheck },
      {
        headers: { SiteCode: siteCode, ApiKey: apiKey },
      }
    );

    console.log("🔥 OZOW SUCCESS RESPONSE:", response.data);

    const payoutId = response.data?.payoutId;

    // 🔥 SAVE provider_ref
    await supabase
      .from("payouts")
      .update({ provider_ref: payoutId })
      .eq("merchant_ref", merchantReference);

    // 🚀 DONE — Ozow will now:
    // 1. Call /verify
    // 2. Call /notify

    return res.json({
      success: true,
      payoutId,
      message: "Payout created. Waiting for Ozow webhooks...",
    });

  } catch (err) {
    console.error("❌ SUCCESS TEST ERROR:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
});

export default router;