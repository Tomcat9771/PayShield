import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();
const ACCESS_TOKEN = process.env.OZOW_ACCESS_TOKEN;

// ✅ Payout webhook
router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW WEBHOOK RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    // 🔐 Validate Ozow AccessToken (MUST BE INSIDE ROUTE)
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
// 🔥 VERIFICATION HANDLER (CORRECT DETECTION)
// ==================================================
if (data.hashCheck && data.accountNumber) {
  console.log("✅ Verification request detected:", payoutId);

  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", payoutId)
    .single();

  if (!payout || !payout.encryption_key) {
    console.log("❌ Missing encryption key");

    return res.status(200).json({
      payoutId: payoutId,
      isVerified: false,
      accountNumberDecryptionKey: "",
      reason: "Missing encryption key",
    });
  }

  return res.status(200).json({
    payoutId: payoutId,
    isVerified: true,
    accountNumberDecryptionKey: payout.encryption_key,
    reason: "",
  });
}


    // ==================================================
    // 🔄 NORMAL STATUS HANDLING
    // ==================================================
    let newStatus = "FAILED";
    let eventType = "UNKNOWN";

    if (status === "VerificationSuccess") {
      newStatus = "PROCESSING";
      eventType = "VERIFICATION_SUCCESS";
    }

    if (status === "Complete" || status === "COMPLETED") {
      newStatus = "COMPLETED";
      eventType = "PAYOUT_COMPLETED";
    }

    if (status === "Cancelled") {
      newStatus = "FAILED";
      eventType = "PAYOUT_CANCELLED";
    }

    await supabase
      .from("payouts")
      .update({
        status: newStatus,
        completed_at:
          newStatus === "COMPLETED"
            ? new Date().toISOString()
            : null,
        last_error: data.errorMessage || null,
      })
      .eq("id", payoutId);

    console.log(`✅ ${eventType} → Payout ${payoutId} → ${newStatus}`);

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Payout webhook error:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;
