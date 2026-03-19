import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

router.post("/verify", async (req, res) => {
  try {
    const { payoutId } = req.body;

    const { data: payout } = await supabase
      .from("payouts")
      .select("*")
      .eq("ozow_payout_id", payoutId)
      .single();

    if (!payout) {
      return res.status(400).json({
        isVerified: false,
        reason: "Payout not found",
      });
    }

    return res.json({
      payoutId,
      isVerified: true,
      accountNumberDecryptionKey: payout.encryption_key,
      reason: "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ isVerified: false });
  }
});

export default router;

