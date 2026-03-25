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
const OZOW_MOCK_API = "https://stagingpayoutsapi.ozow.com/mock/v1";

/* ======================================================
   ✅ SUCCESS ONLY TEST (NEW - IMPORTANT)
====================================================== */
router.post("/test-success", async (req, res) => {
  try {
    const siteCode = process.env.OZOW_PAYOUT_SITE_CODE;
    const apiKey = process.env.OZOW_PAYOUT_API_KEY;
    const notifyUrl = process.env.OZOW_PAYOUT_NOTIFY_URL;
    const verifyUrl = process.env.OZOW_PAYOUT_VERIFY_URL;

    const merchantReference = `test-${Date.now()}`;
    const encryptionKey = crypto.randomBytes(16).toString("hex");

    // 🔥 INSERT FIRST
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
      VerifyUrl: verifyUrl,
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

    const response = await axios.post(
      `${OZOW_API}/requestpayout`,
      { ...payload, hashCheck },
      {
        headers: { SiteCode: siteCode, ApiKey: apiKey },
      }
    );

    console.log("🔥 OZOW SUCCESS RESPONSE:", response.data);

    const payoutId = response.data?.payoutId;

    // 🔥 LINK provider_ref
    await supabase
      .from("payouts")
      .update({ provider_ref: payoutId })
      .eq("merchant_ref", merchantReference);

    return res.json({
      success: true,
      payoutId,
      merchantReference,
    });

  } catch (err) {
    console.error("❌ SUCCESS TEST ERROR:", err.message);

    return res.status(500).json({
      error: err.message,
    });
  }
});

/* ======================================================
   ✅ RUN ALL TESTS (UNCHANGED BUT CLEANED)
====================================================== */
router.post("/run-all-tests", async (req, res) => {
  const results = [];

  const siteCode = process.env.OZOW_PAYOUT_SITE_CODE;
  const apiKey = process.env.OZOW_PAYOUT_API_KEY;
  const notifyUrl = process.env.OZOW_PAYOUT_NOTIFY_URL;
  const verifyUrl = process.env.OZOW_PAYOUT_VERIFY_URL;

  console.log("🚀 TEST RUNNER USING:");
  console.log("SITE CODE:", siteCode);
  console.log("API KEY:", apiKey ? "Loaded" : "Missing");

  async function runPayout(testName, config) {
    try {
      const merchantReference = `test-${Date.now()}`;
      const encryptionKey = crypto.randomBytes(16).toString("hex");

      const { data, error } = await supabase
        .from("payouts")
        .insert({
          id: crypto.randomUUID(),
          merchant_ref: merchantReference,
          provider_ref: null,
          encryption_key: encryptionKey,
          status: "PROCESSING",
          total_amount: config.amount,
          payout_method: "bank",
        })
        .select();

      console.log("🧪 INSERT RESULT:", data, error);

      const accountNumber = encryptAccountNumber(
        "4050338500",
        encryptionKey,
        merchantReference,
        config.amount
      );

      const payload = {
        SiteCode: siteCode,
        amount: config.amount,
        merchantReference,
        customerBankReference: "Test",
        isRtc: false,
        NotifyUrl: notifyUrl,
        VerifyUrl: verifyUrl,
        bankingDetails: {
          bankGroupId: "3284a0ad-ba78-4838-8c2b-102981286a2b",
          accountNumber,
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

      const response = await axios.post(
        `${OZOW_API}/requestpayout`,
        { ...payload, hashCheck },
        { headers: { SiteCode: siteCode, ApiKey: apiKey } }
      );

      console.log(`🔥 ${testName} RESPONSE:`, response.data);

      const payoutId = response.data?.payoutId;

      await supabase
        .from("payouts")
        .update({ provider_ref: payoutId })
        .eq("merchant_ref", merchantReference);

      results.push({ testName, success: true, payoutId });

    } catch (error) {
      results.push({
        testName,
        success: false,
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  async function runMockTest(flagName) {
    try {
      await axios.post(
        `${OZOW_MOCK_API}/settestconfiguration?siteCode=${siteCode}`,
        {
          siteCode,
          isAccountDecryptionFailed: flagName === "DECRYPT_FAIL",
          isNotVerifiedResponse: flagName === "NOT_VERIFIED",
          isAccountNumberDecryptionKeyMissing: flagName === "KEY_MISSING",
        },
        { headers: { SiteCode: siteCode, ApiKey: apiKey } }
      );

      const merchantReference = `mock-${Date.now()}`;
      const encryptionKey = crypto.randomBytes(16).toString("hex");

      await supabase.from("payouts").insert({
        id: crypto.randomUUID(),
        merchant_ref: merchantReference,
        provider_ref: null,
        encryption_key: encryptionKey,
        status: "PROCESSING",
        total_amount: 0.1,
        payout_method: "bank",
      });

      const encryptedAccount = encryptAccountNumber(
        "4050338500",
        encryptionKey,
        merchantReference,
        0.1
      );

      const payload = {
        SiteCode: siteCode,
        amount: 0.1,
        merchantReference,
        customerBankReference: "Mock",
        isRtc: false,
        NotifyUrl: notifyUrl,
        VerifyUrl: verifyUrl,
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

      const payout = await axios.post(
        `${OZOW_MOCK_API}/requestpayout`,
        { ...payload, hashCheck },
        { headers: { SiteCode: siteCode, ApiKey: apiKey } }
      );

      const payoutId = payout.data.payoutId;

      await supabase
        .from("payouts")
        .update({ provider_ref: payoutId })
        .eq("merchant_ref", merchantReference);

      results.push({ testName: `MOCK_${flagName}`, payoutId });

    } catch (error) {
      results.push({
        testName: `MOCK_${flagName}`,
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  await runPayout("SUCCESS", { amount: 10 });
  await runMockTest("KEY_MISSING");

  return res.json({ results });
});

export default router;
