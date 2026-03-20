// backend/routes/ozowTestRunner.js

import express from "express";
import axios from "axios";
import crypto from "crypto";

const router = express.Router();

const OZOW_API = "https://stagingpayoutsapi.ozow.com/v1";
const OZOW_MOCK_API = "https://stagingpayoutsapi.ozow.com/mock/v1";

function generateHash(payload, apiKey) {
  return crypto
    .createHmac("sha512", apiKey)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function buildPayload({ siteCode, amount, notifyUrl, accountNumber }) {
  return {
    siteCode,
    amount,
    merchantReference: `test-${Date.now()}`,
    customerBankReference: `test-${Date.now()}`,
    isRtc: false,
    notifyUrl,
    bankingDetails: {
      bankGroupId: "3284a0ad-ba78-4838-8c2b-102981286a2b",
      accountNumber,
      branchCode: "632005",
    },
  };
}

router.post("/run-all-tests", async (req, res) => {
  const results = [];

  const siteCode = process.env.OZOW_SITE_CODE;
  const apiKey = process.env.OZOW_API_KEY;
  const notifyUrl = process.env.OZOW_NOTIFY_URL;

  // 🔥 Helper to run payout
  async function runPayout(testName, config) {
    try {
      const payload = buildPayload({
        siteCode,
        amount: config.amount,
        notifyUrl,
        accountNumber: config.accountNumber || "4050338500",
      });

      const hashCheck = generateHash(payload, apiKey);

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
        request: payload,
        response: response.data,
        payoutId: response.data?.payoutId || null,
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

  // =========================
  // 🔹 STANDARD TESTS
  // =========================

  await runPayout("MIN_AMOUNT", { amount: 0.5 });
  await runPayout("MAX_AMOUNT", { amount: 25 });
  await runPayout("SUCCESS", { amount: 10 });
  await runPayout("CDV_ERROR", {
    amount: 10,
    accountNumber: "1234567890",
  });

  // =========================
  // 🔹 GET STATUS TEST
  // =========================

  try {
    const last = results.find(r => r.payoutId);

    if (last?.payoutId) {
      const statusRes = await axios.get(
        `${OZOW_API}/getpayout?payoutId=${last.payoutId}`,
        {
          headers: {
            SiteCode: siteCode,
            ApiKey: apiKey,
          },
        }
      );

      results.push({
        testName: "GET_PAYOUT_STATUS",
        payoutId: last.payoutId,
        response: statusRes.data,
      });
    }
  } catch (err) {
    results.push({
      testName: "GET_PAYOUT_STATUS",
      error: err.message,
    });
  }

  // =========================
  // 🔹 MOCK TESTS
  // =========================

  async function runMockTest(flagName) {
    try {
      // Step 1: Set config
      await axios.post(
        `${OZOW_MOCK_API}/settestconfiguration?siteCode=${siteCode}`,
        {
          siteCode,
          isAccountDecryptionFailed: flagName === "DECRYPT_FAIL",
          isNotVerifiedResponse: flagName === "NOT_VERIFIED",
          isAccountNumberDecryptionKeyMissing:
            flagName === "KEY_MISSING",
        },
        {
          headers: {
            SiteCode: siteCode,
            ApiKey: apiKey,
          },
        }
      );

      // Step 2: Request mock payout
      const payload = buildPayload({
        siteCode,
        amount: 0.1,
        notifyUrl,
        accountNumber: "4050338500",
      });

      const hashCheck = generateHash(payload, apiKey);

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

      // Step 3: Get result
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

  // =========================
  // 🔚 DONE
  // =========================

  return res.json({
    message: "All tests executed",
    total: results.length,
    results,
  });
});

export default router;