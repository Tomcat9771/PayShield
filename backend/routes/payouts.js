import express from "express";
import axios from "axios";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { generateOzowHash } from "../utils/ozowHash.js";
import { encryptAccountNumber } from "../utils/ozowEncrypt.js";
import { assertTransition, PAYOUT_TRANSITIONS } from "../lib/stateMachine.js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const OZOW_BASE_URL = "https://stagingpayoutsapi.ozow.com/v1";

async function fetchPayoutWithTransactions(payoutId) {
  const { data: payout, error: payoutError } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", payoutId)
    .single();

  if (payoutError || !payout) {
    return { error: "Payout not found", status: 404 };
  }

  const { data: transactions, error: txError } = await supabase
    .from("transactions")
    .select("*")
    .eq("payout_id", payoutId)
    .order("created_at", { ascending: true });

  if (txError) {
    throw txError;
  }

  return {
    payout,
    transactions: transactions || [],
  };
}

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

router.get("/:id", async (req, res) => {
  try {
    const result = await fetchPayoutWithTransactions(req.params.id);

    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }

    res.json({
      ...result.payout,
      transactions: result.transactions,
    });
  } catch (err) {
    console.error("Fetch payout error:", err.message);
    res.status(500).json({ error: "Failed to fetch payout" });
  }
});

router.post("/:id/process", async (req, res) => {
  const payoutId = req.params.id;
  const idempotencyKey =
    req.headers["idempotency-key"] || req.body?.idempotencyKey || null;

  try {
    if (!process.env.OZOW_PAYOUT_API_KEY || !process.env.OZOW_PAYOUT_SITE_CODE) {
      throw new Error("Ozow credentials not configured");
    }

    const { payout, transactions } = await fetchPayoutWithTransactions(payoutId);

    if (!payout) {
      return res.status(404).json({ error: "Payout not found" });
    }

    if (payout.payout_method !== "bank") {
      return res.status(400).json({ error: "Only bank payouts supported" });
    }

    if (!["CREATED", "FAILED", "APPROVED"].includes(payout.status)) {
      return res.status(400).json({
        error: "Only CREATED, APPROVED or FAILED payouts can be processed",
      });
    }

    const activeTx = transactions.find((tx) => ["PROCESSING", "PENDING"].includes(tx.status));

    if (activeTx) {
      return res.status(409).json({
        error: "Payout already has an in-flight processing transaction",
        transactionId: activeTx.id,
      });
    }

    if (idempotencyKey) {
      const idempotentMatch = transactions.find(
        (tx) => tx.idempotency_key === idempotencyKey
      );

      if (idempotentMatch) {
        return res.json({
          success: true,
          payoutId,
          transactionId: idempotentMatch.id,
          idempotentReplay: true,
        });
      }
    }

    const latestAttempt = transactions.length
      ? transactions[transactions.length - 1]
      : null;

    const { data: bankDetails, error: bankError } = await supabase
      .from("business_bank_details")
      .select("*")
      .eq("business_id", payout.business_id)
      .single();

    if (bankError || !bankDetails) {
      return res.status(400).json({ error: "Bank details not found" });
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("transactions")
      .insert({
        business_id: payout.business_id,
        payout_id: payout.id,
        amount_net: payout.total_amount,
        status: "PROCESSING",
        retry_of: latestAttempt?.id || null,
        idempotency_key: idempotencyKey,
      })
      .select("*")
      .single();

    if (attemptError || !attempt) {
      throw new Error(`Failed to create payout transaction attempt: ${attemptError?.message || "Unknown error"}`);
    }

    const attemptCount = (payout.attempt_count || 0) + 1;

    const encryptionKey = crypto.randomBytes(16).toString("hex");
    const encryptedAccount = encryptAccountNumber(
      bankDetails.account_number,
      encryptionKey,
      payout.id,
      payout.total_amount
    );

    if (payout.status === "CREATED") {
      assertTransition("CREATED", "APPROVED", PAYOUT_TRANSITIONS);
    } else if (payout.status === "FAILED") {
      assertTransition("FAILED", "APPROVED", PAYOUT_TRANSITIONS);
    }

    assertTransition("APPROVED", "PROCESSING", PAYOUT_TRANSITIONS);

    await supabase
      .from("payouts")
      .update({
        status: "PROCESSING",
        attempt_count: attemptCount,
        last_error: null,
        encryption_key: encryptionKey,
        merchant_ref: payout.id,
      })
      .eq("id", payoutId);

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

    const requestBody = {
      SiteCode: process.env.OZOW_PAYOUT_SITE_CODE,
      amount: payout.total_amount,
      merchantReference: payout.id,
      customerBankReference: "PayShield",
      isRtc: false,
      NotifyUrl: process.env.OZOW_PAYOUT_NOTIFY_URL,
      VerifyUrl: process.env.OZOW_PAYOUT_VERIFY_URL,
      bankingDetails: {
        bankGroupId: bankDetails.bank_group_id,
        accountNumber: encryptedAccount,
        branchCode: bankDetails.branch_code,
      },
      hashCheck: hash,
    };

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

    await supabase
      .from("payouts")
      .update({
        provider_ref: response.data.payoutId,
      })
      .eq("id", payoutId);

    await supabase
      .from("transactions")
      .update({
        provider_ref: response.data.payoutId,
        status: "PAID_OUT",
      })
      .eq("id", attempt.id);

    res.json({
      success: true,
      payoutId,
      transactionId: attempt.id,
      ozow: response.data,
    });
  } catch (err) {
    console.error("❌ OZOW ERROR:", err.message);

    let errorMessage = err.message;

    if (err.response) {
      console.error(err.response.data);
      errorMessage = JSON.stringify(err.response.data);
    }

    await supabase
      .from("payouts")
      .update({
        status: "FAILED",
        last_error: errorMessage,
      })
      .eq("id", payoutId);

    await supabase
      .from("transactions")
      .update({ status: "FAILED" })
      .eq("payout_id", payoutId)
      .or("status.eq.PROCESSING,status.eq.PENDING");

    res.status(500).json({
      error: "Failed to process payout",
      details: errorMessage,
    });
  }
});

export default router;
