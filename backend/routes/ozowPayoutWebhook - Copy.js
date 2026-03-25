import express from "express";

const router = express.Router();
const ACCESS_TOKEN = process.env.OZOW_ACCESS_TOKEN;

// In-memory key store (FAST ⚡)
global.payoutKeys = global.payoutKeys || {};

// ✅ Payout webhook
router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW WEBHOOK RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));
//******************************************************************************************************************
router.post("/verify", async (req, res) => {
  console.log("🔥 OZOW VERIFICATION WEBHOOK");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const incomingToken = req.headers.accesstoken;

    if (!incomingToken || incomingToken !== process.env.OZOW_ACCESS_TOKEN) {
      return res.status(200).json({
        payoutId: "",
        isVerified: false,
        accountNumberDecryptionKey: "",
        reason: "Invalid AccessToken",
      });
    }

    const data = req.body;
    const payoutId = data.payoutId;

    const key = global.payoutKeys[payoutId];

    return res.status(200).json({
      payoutId,
      isVerified: !!key,
      accountNumberDecryptionKey: key || "",
      reason: key ? "" : "Missing encryption key",
    });

  } catch (err) {
    console.error("❌ VERIFY ERROR:", err.message);
    return res.status(200).send("OK");
  }
});
//**********************************************************************************************************************
  try {


    // 🔐 Validate AccessToken
    const incomingToken = req.headers.accesstoken;

    if (!incomingToken || incomingToken !== ACCESS_TOKEN) {
      console.log("❌ Invalid AccessToken");

      return res.status(200).json({
        payoutId: "",
        isVerified: false,
        accountNumberDecryptionKey: "",
        reason: "Invalid AccessToken",
      });
    }

    const data = req.body;
    const payoutId = data.payoutId || data.merchantReference;

    if (!payoutId) {
      console.log("❌ Missing payout reference");
      return res.status(200).send("OK");
    }

    const status = data.status || data.payoutStatus?.status;

    // ==================================================
    // 🔥 VERIFICATION HANDLER (FIXED - NO DB CALLS)
    // ==================================================
    if (data.hashCheck && data.bankingDetails?.accountNumber) {
      console.log("✅ Verification request detected:", payoutId);

      const key = global.payoutKeys[payoutId];

      return res.status(200).json({
        payoutId,
        isVerified: !!key,
        accountNumberDecryptionKey: key || "",
        reason: key ? "" : "Missing encryption key",
      });
    }

    // ==================================================
    // 🔄 NORMAL STATUS HANDLING
    // ==================================================
    let newStatus = "FAILED";
    let eventType = "UNKNOWN";

    if (status === "VerificationSuccess" || status === 3) {
      newStatus = "PROCESSING";
      eventType = "VERIFICATION_SUCCESS";
    }

    if (status === "Complete" || status === "COMPLETED" || status === 5) {
      newStatus = "COMPLETED";
      eventType = "PAYOUT_COMPLETED";
    }

    if (status === "Cancelled" || status === 99) {
      newStatus = "FAILED";
      eventType = "PAYOUT_CANCELLED";
    }

    console.log(`✅ ${eventType} → Payout ${payoutId} → ${newStatus}`);

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Payout webhook error:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;