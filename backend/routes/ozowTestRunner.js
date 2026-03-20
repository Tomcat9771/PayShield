// backend/routes/ozowTestRunner.js

import express from "express";
import axios from "axios";
import crypto from "crypto";
import { generateOzowHash } from "../utils/ozowHash.js";
import { encryptAccountNumber } from "../utils/ozowEncrypt.js";

const router = express.Router();

const OZOW_API = "https://stagingpayoutsapi.ozow.com/v1";
const OZOW_MOCK_API = "https://stagingpayoutsapi.ozow.com/mock/v1";

router.post("/run-all-tests", async (req, res) => {
  const results = [];

  const siteCode = process.env.OZOW_PAYOUT_SITE_CODE;
  const apiKey = process.env.OZOW_PAYOUT_API_KEY;
  const notifyUrl = process.env.OZOW_PAYOUT_NOTIFY_URL;

  console.log("🚀 TEST RUNNER USING:");
  console.log("SITE CODE:", siteCode);
  console.log("API KEY:", apiKey ? "Loaded" : "Missing");

  async function runPayout(testName, config) {
    try {
      const merchantReference = `test-${Date.now()}`;
      const encryptionKey = crypto.randomBytes(16).toString("hex");

      // 🔥 CDV FIX (skip encryption only for invalid account)
      const isCDVTest = config.accountNumber === "1234567890";

      const accountNumber = isCDVTest
        ? config.accountNumber
        : encryptAccountNumber(
            config.accountNumber || "4050338500",
            encryptionKey,
            merchantReference,
            config.amount
          );

      const payload = {
        siteCode,
        amount: config.amount,
        merchantReference,
        customerBankReference: "Test",
        isRtc: false,
        notifyUrl,
        bankingDetails: {
          bankGroupId: "3284a0ad-ba78-4838-8c2b-102981286a2b",
          accountNumber: accountNumber,
          branchCode: "632005",
        },
      };

      const hashCheck = generateOzowHash({
        siteCode,
        amount: payload.amount,
        merchantReference: payload.merchantReference,
        customerBankReference: payload.customerBankReference,
        isRtc: payload.isRtc,
        notifyUrl: payload.notifyUrl,
        bankGroupId: payload.bankingDetails.bankGroupId,
        accountNumber: payload.bankingDetails.accountNumber,
        branchCode: payload.bankingDetails.branchCode,
        ApiKey: apiKey,
      });

      const response = await axios.post(
        `${OZOW_API}/requestpayout`,
        { ...payload, hashCheck },
        {
          headers: {
            SiteCode: siteCode,
            ApiKey: apiKey,
          },
        }
      );

      results.push({
        testName,
        success: true,
        payoutId: response.data?.payoutId,
        response: response.data,
      });

    } catch (error) {
      results.push({
        testName,
        success: false,
        error: error.message,
        details: error.response?.data || null,
      });
    }
  }

  await runPayout("MIN_AMOUNT", { amount: 0.5 });
  await runPayout("MAX_AMOUNT", { amount: 25 });
  await runPayout("SUCCESS", { amount: 10 });

  await runPayout("CDV_ERROR", {
    amount: 10,
    accountNumber: "1234567890",
  });

  // ================= MOCK TESTS =================
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
        {
          headers: {
            SiteCode: siteCode,
            ApiKey: apiKey,
          },
        }
      );

      const merchantReference = `mock-${Date.now()}`;
      const encryptionKey = crypto.randomBytes(16).toString("hex");

      const encryptedAccount = encryptAccountNumber(
        "4050338500",
        encryptionKey,
        merchantReference,
        0.1
      );

      const payload = {
        siteCode,
        amount: 0.1,
        merchantReference,
        customerBankReference: "Mock",
        isRtc: false,
        notifyUrl,
        bankingDetails: {
          bankGroupId: "3284a0ad-ba78-4838-8c2b-102981286a2b",
          accountNumber: encryptedAccount,
          branchCode: "632005",
        },
      };

      const hashCheck = generateOzowHash({
        siteCode,
        amount: payload.amount,
        merchantReference: payload.merchantReference,
        customerBankReference: payload.customerBankReference,
        isRtc: payload.isRtc,
        notifyUrl: payload.notifyUrl,
        bankGroupId: payload.bankingDetails.bankGroupId,
        accountNumber: payload.bankingDetails.accountNumber,
        branchCode: payload.bankingDetails.branchCode,
        ApiKey: apiKey,
      });

      const payout = await axios.post(
        `${OZOW_MOCK_API}/requestpayout`,
        { ...payload, hashCheck },
        {
          headers: {
            SiteCode: siteCode,
            ApiKey: apiKey,
          },
        }
      );

      const payoutId = payout.data.payoutId;

      const result = await axios.get(
        `${OZOW_MOCK_API}/getpayout?payoutId=${payoutId}`,
        {
          headers: {
            SiteCode: siteCode,
            ApiKey: apiKey,
          },
        }
      );

      results.push({
        testName: `MOCK_${flagName}`,
        payoutId,
        response: result.data,
      });

    } catch (error) {
      results.push({
        testName: `MOCK_${flagName}`,
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  await runMockTest("DECRYPT_FAIL");
  await runMockTest("NOT_VERIFIED");
  await runMockTest("KEY_MISSING");

  return res.json({
    message: "All tests executed",
    total: results.length,
    results,
  });
});

export default router;

