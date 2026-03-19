import express from "express";
import { supabase } from "../lib/supabaseClient.js";

const router = express.Router();

// ✅ Payout webhook (mock + real)
router.post("/notify", async (req, res) => {
  try {
    const data = req.body;

    console.log("💸 PAYOUT WEBHOOK:", data);

    const payoutId = data.merchantReference;

    if (!payoutId) {
      return res.status(400).send("Missing payout reference");
    }

    // Map Ozow → internal status
    let newStatus = "FAILED";

    if (
      data.status === "Complete" ||
      data.status === "COMPLETED"
    ) {
      newStatus = "COMPLETED";
    }

    // Update payout
    await supabase
      .from("payouts")
      .update({
        status: newStatus,
        completed_at: new Date().toISOString(),
      })
      .eq("id", payoutId);

    console.log(`✅ Payout ${payoutId} → ${newStatus}`);

    return res.status(200).send("OK");

  } catch (err) {
    console.error("❌ Payout webhook error:", err.message);
    return res.status(200).send("OK");
  }
});

export default router;