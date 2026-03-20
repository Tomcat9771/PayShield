import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

// ✅ Payout webhook
router.post("/notify", async (req, res) => {
  console.log("🔥 OZOW WEBHOOK RECEIVED");
  console.log(JSON.stringify(req.body, null, 2));

  try {
    const data = req.body;

    const payoutId = data.merchantReference;

    if (!payoutId) {
      console.log("❌ Missing payout reference");
      return res.status(200).send("OK");
    }

    let newStatus = "FAILED";
    let eventType = "UNKNOWN";

    const status = data.status || data.payoutStatus?.status;

    if (
  status === "VerificationRequested" ||
  status === "Verification"
) {
  console.log("✅ Verification request received:", payoutId);

  // 🔥 Get payout from DB
  const { data: payout } = await supabase
    .from("payouts")
    .select("*")
    .eq("id", payoutId)
    .single();

  if (!payout) {
    console.log("❌ Payout not found");

    return res.json({
      PayoutId: payoutId,
      IsVerified: false,
      AccountNumberDecryptionKey: "",
      Reason: "Payout not found",
    });
  }

  // 🔥 Respond EXACTLY as Ozow expects
  return res.json({
    PayoutId: payoutId,
    IsVerified: true,
    AccountNumberDecryptionKey: payout.encryption_key,
    Reason: "",
  });
}

      // respond EXACTLY as Ozow expects
      return res.json({
        isValid: true,
      });
    }

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
