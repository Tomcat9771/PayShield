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

// 🔁 Using MOCK for now
//const OZOW_BASE_URL = "https://stagingpayoutsapi.ozow.com/mock/v1";
 const OZOW_BASE_URL = "https://stagingpayoutsapi.ozow.com/v1";

/* =====================================================
   📥 GET ALL PAYOUTS (for frontend)
===================================================== */
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Fetch payouts error:", err.message);
    res.status(500).json({ error: "Failed to fetch payouts" });
  }
});

/* =====================================================
   📥 GET SINGLE PAYOUT
===================================================== */
router.get("/:id", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Payout not found" });
    }

    res.json(data);
  } catch (err) {
    console.error("Fetch payout error:", err.message);
    res.status(500).json({ error: "Failed to fetch payout" });
  }
});

/* =====================================================
   🚀 PROCESS / RETRY PAYOUT
===================================================== */
router.post("/:id/process", async (req, res) => {
  const payoutId = req.params.id;

  try {
    if (!process.env.OZOW_API_KEY || !process.env.OZOW_SITE_CODE) {
      throw new Error("Ozow credentials not configured");
    }

    // 1️⃣ Get payout
    const { data: payout, error } = await supabase
      .from("payouts")
      .select("*")
      .eq("id", payoutId)
      .single();

    if (error || !payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    if (payout.payout_method !== "bank") {
      return res.status(400).json({
        error: "Only bank payouts supported",
      });
    }

    if (!["CREATED", "FAILED"].includes(payout.status)) {
      return res.status(400).json({
        error: "Only CREATED or FAILED payouts can be processed",
      });
    }

    // 2️⃣ Bank details
    const { data: bankDetails, error: bankError } = await supabase
      .from("business_bank_details")
      .select("*")
      .eq("business_id", payout.business_id)
      .single();

    if (bankError || !bankDetails) {
      return res.status(400).json({ error: "Bank details not found" });
    }

    // 3️⃣ Attempt count
    const attemptCount = (payout.attempt_count || 0) + 1;

    // 4️⃣ Set PROCESSING first
    const { error: updateError } = await supabase
      .from("payouts")
      .update({
        status: "PROCESSING",
        attempt_count: attemptCount,
        last_error: null,
      })
      .eq("id", payoutId);

    if (updateError) throw updateError;

    // 🔐 Encryption
    const encryptionKey = crypto.randomBytes(16).toString("hex");

    const encryptedAccount = encryptAccountNumber(
      bankDetails.account_number,
      encryptionKey,
      payout.id,
      payout.total_amount
    );

    // 🔑 Hash
    const hash = generateOzowHash({
  SiteCode: process.env.OZOW_PAYOUT_SITE_CODE,
  amount: payout.total_amount,
  merchantReference: payout.id,
  customerBankReference: "PayShield",
  isRtc: false,
  notifyUrl: process.env.OZOW_PAYOUT_NOTIFY_URL,
  bankGroupId: bankDetails.bank_group_id,
  accountNumber: encryptedAccount,
  branchCode: bankDetails.branch_code,
  ApiKey: process.env.OZOW_PAYOUT_API_KEY,
});

    console.log("🚀 Sending to Ozow:", {
      payoutId,
      attemptCount,
      amount: payout.total_amount,
    });

    const requestBody = {
      SiteCode: process.env.OZOW_PAYOUT_SITE_CODE,
      amount: payout.total_amount,
      merchantReference: payout.id,
      customerBankReference: "PayShield",
      isRtc: false,
      notifyUrl: process.env.OZOW_PAYOUT_NOTIFY_URL,
      bankingDetails: {
        bankGroupId: bankDetails.bank_group_id,
        accountNumber: encryptedAccount,
        branchCode: bankDetails.branch_code,
      },
      hashCheck: hash,
    };

    // 🚀 Call Ozow
    const response = await axios.post(
      `${OZOW_BASE_URL}/requestpayout`,
      requestBody,
      {
        headers: {
          ApiKey: process.env.OZOW_PAYOUT_API_KEY,
          SiteCode: process.env.OZOW_PAYOUT_SITE_CODE,
        },
      }
    );

    // Save provider ref
    await supabase
      .from("payouts")
      .update({
        provider_ref: response.data.payoutId,
        encryption_key: encryptionKey,
      })
      .eq("id", payoutId);

    res.json({
      success: true,
      payoutId,
      attempt: attemptCount,
      ozow: response.data,
    });

  } catch (err) {
    console.error("❌ OZOW ERROR:");

    let errorMessage = err.message;

    if (err.response) {
      console.error(err.response.data);
      errorMessage = JSON.stringify(err.response.data);
    }

    // Mark FAILED
    await supabase
      .from("payouts")
      .update({
        status: "FAILED",
        last_error: errorMessage,
      })
      .eq("id", payoutId);

    res.status(500).json({
      error: "Failed to process payout",
      details: errorMessage,
    });
  }
});

export default router;